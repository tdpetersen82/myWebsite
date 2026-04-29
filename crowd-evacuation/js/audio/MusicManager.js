// MusicManager: procedural ambient music in three intensity layers.
// All synth via Web Audio. No assets.
//
// Layers:
//   1. Bass — slow root-note arpeggio, sine through lowpass at 240Hz
//   2. Pad — long-held minor chord, two oscillators, slow detune drift
//   3. Pulse — 16th-note hi-hat-ish filtered noise, only audible at high intensity
//
// Each layer has its own gain bus tied to setIntensity(0..1):
//   - bass:  always audible, scales 0.04 → 0.10 across intensity
//   - pad:   always audible, scales 0.05 → 0.12
//   - pulse: ducks below intensity 0.4, scales up steeply

class MusicManager {
    constructor() {
        this.ctx = null;
        this.masterGain = null;     // shared with AudioManager via window.exodusAudio.masterGain
        this.bass = null;
        this.pad = null;
        this.pulse = null;
        this.tempo = 60;             // beats per minute
        this.intensityTarget = 0;
        this.intensity = 0;
        this.beatInterval = null;
        this.rootHz = 110;           // A2
    }

    _ensureCtx() {
        // Reuse the same AudioContext as AudioManager so volume settings unify.
        const am = window.exodusAudio;
        if (!am) return null;
        am._ensureCtx();             // forces creation if not yet
        this.ctx = am.ctx;
        this.musicGain = this.ctx.createGain();
        this.musicGain.gain.value = 0.7;
        this.musicGain.connect(am.masterGain);
        return this.ctx;
    }

    start() {
        const ctx = this._ensureCtx();
        if (!ctx) return;
        if (this.bass) return;       // already running

        // BASS — sine through lowpass
        {
            const osc = ctx.createOscillator();
            osc.type = 'sine';
            osc.frequency.value = this.rootHz;
            const lp = ctx.createBiquadFilter();
            lp.type = 'lowpass';
            lp.frequency.value = 240;
            const out = ctx.createGain();
            out.gain.value = 0;
            osc.connect(lp); lp.connect(out); out.connect(this.musicGain);
            osc.start();
            this.bass = { osc, out };
        }

        // PAD — two detuned oscillators forming a minor third
        {
            const osc1 = ctx.createOscillator(); osc1.type = 'sawtooth'; osc1.frequency.value = this.rootHz * 2;
            const osc2 = ctx.createOscillator(); osc2.type = 'sawtooth'; osc2.frequency.value = this.rootHz * 2 * Math.pow(2, 3 / 12); // minor 3rd
            const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 600;
            const out = ctx.createGain(); out.gain.value = 0;
            osc1.connect(lp); osc2.connect(lp); lp.connect(out); out.connect(this.musicGain);
            // slow detune drift
            const lfo = ctx.createOscillator(); lfo.type = 'sine'; lfo.frequency.value = 0.07;
            const lfoGain = ctx.createGain(); lfoGain.gain.value = 4;
            lfo.connect(lfoGain); lfoGain.connect(osc2.detune);
            osc1.start(); osc2.start(); lfo.start();
            this.pad = { osc1, osc2, lfo, out };
        }

        // PULSE — looped noise through bandpass, gated by tempo
        {
            const buf = ctx.createBuffer(1, ctx.sampleRate * 1, ctx.sampleRate);
            const d = buf.getChannelData(0);
            for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1);
            const src = ctx.createBufferSource();
            src.buffer = buf;
            src.loop = true;
            const bp = ctx.createBiquadFilter();
            bp.type = 'bandpass';
            bp.frequency.value = 6000;
            bp.Q.value = 4;
            const env = ctx.createGain();
            env.gain.value = 0;
            const out = ctx.createGain();
            out.gain.value = 0;
            src.connect(bp); bp.connect(env); env.connect(out); out.connect(this.musicGain);
            src.start();
            this.pulse = { src, env, out };
        }

        // Beat scheduler — pulses + bass arpeggio
        this._scheduleBeats();
    }

    _scheduleBeats() {
        const ctx = this.ctx;
        if (!ctx || !this.bass) return;
        const beatSec = 60 / this.tempo;
        // Schedule the next 8 beats. Use lookahead pattern.
        const startAt = ctx.currentTime + 0.05;
        for (let i = 0; i < 8; i++) {
            const t = startAt + i * beatSec;

            // Bass arpeggio — root, 5th, octave, 5th, every quarter note
            const stepIdx = i % 4;
            const ratios = [1, 1.5, 2, 1.5];
            this.bass.osc.frequency.setValueAtTime(this.rootHz * ratios[stepIdx], t);

            // Pulse trigger every half-beat (8th note feel)
            const pulseAtMs = beatSec * 0.5;
            for (let p = 0; p < 2; p++) {
                const pt = t + p * pulseAtMs;
                this.pulse.env.gain.setValueAtTime(0, pt);
                this.pulse.env.gain.linearRampToValueAtTime(0.5, pt + 0.005);
                this.pulse.env.gain.exponentialRampToValueAtTime(0.0001, pt + 0.08);
            }
        }
        // Re-schedule before we run out
        const lookahead = 8 * beatSec * 1000;
        clearTimeout(this._beatTimer);
        this._beatTimer = setTimeout(() => this._scheduleBeats(), lookahead - 800);
    }

    setIntensity(v) {
        this.intensityTarget = Math.max(0, Math.min(1, v));
    }

    // Called periodically (e.g., from SimScene update) to glide intensity & gains.
    tick(dt = 0.016) {
        if (!this.bass) return;
        // Smooth glide
        const k = 1 - Math.exp(-dt * 1.2);
        this.intensity += (this.intensityTarget - this.intensity) * k;

        const t = this.ctx.currentTime;
        const v = this.intensity;

        // Bass: 0.04..0.10
        const bassG = 0.04 + 0.06 * v;
        this.bass.out.gain.setTargetAtTime(bassG, t, 0.2);

        // Pad: 0.05..0.12
        const padG = 0.05 + 0.07 * v;
        this.pad.out.gain.setTargetAtTime(padG, t, 0.2);

        // Pulse: ducked below 0.4, scales up
        const pulseG = v > 0.4 ? Math.min(0.20, (v - 0.4) * 0.34) : 0;
        this.pulse.out.gain.setTargetAtTime(pulseG, t, 0.15);
    }

    stop() {
        if (!this.bass) return;
        const t = this.ctx.currentTime;
        for (const layer of [this.bass, this.pad, this.pulse]) {
            layer.out.gain.cancelScheduledValues(t);
            layer.out.gain.linearRampToValueAtTime(0, t + 0.4);
        }
        clearTimeout(this._beatTimer);
        setTimeout(() => {
            try {
                this.bass.osc.stop();
                this.pad.osc1.stop(); this.pad.osc2.stop(); this.pad.lfo.stop();
                this.pulse.src.stop();
            } catch (_) {}
            this.bass = null; this.pad = null; this.pulse = null;
        }, 500);
    }
}

window.exodusMusic = new MusicManager();
