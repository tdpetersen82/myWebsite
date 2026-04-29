// AudioManager: synthesizes all SFX via Web Audio. No asset files required.
// Volumes from Storage settings; lazy AudioContext init on first user gesture.

class AudioManager {
    constructor() {
        this.ctx = null;
        this.masterGain = null;
        this.sfxGain = null;
        this.alarmNodes = null;     // stop handle for the alarm loop
        this.muted = false;
        this._reload();
    }

    _reload() {
        const s = Storage.getSettings();
        this.master = s.master != null ? s.master : 1.0;
        this.sfx    = s.sfx    != null ? s.sfx    : 0.8;
        if (this.masterGain) this.masterGain.gain.value = this.master;
        if (this.sfxGain)    this.sfxGain.gain.value    = this.sfx;
    }

    settingsChanged() { this._reload(); }

    _ensureCtx() {
        if (this.ctx) return this.ctx;
        const Ctor = window.AudioContext || window.webkitAudioContext;
        if (!Ctor) return null;
        this.ctx = new Ctor();
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.value = this.master;
        this.masterGain.connect(this.ctx.destination);
        this.sfxGain = this.ctx.createGain();
        this.sfxGain.gain.value = this.sfx;
        this.sfxGain.connect(this.masterGain);
        return this.ctx;
    }

    // ── Building blocks ────────────────────────────────────

    _envelope(node, peak, attack, decay, hold = 0) {
        const t = this.ctx.currentTime;
        node.gain.cancelScheduledValues(t);
        node.gain.setValueAtTime(0, t);
        node.gain.linearRampToValueAtTime(peak, t + attack);
        node.gain.setValueAtTime(peak, t + attack + hold);
        node.gain.exponentialRampToValueAtTime(0.0001, t + attack + hold + decay);
    }

    _tone({ freq = 440, type = 'sine', peak = 0.4, attack = 0.005, decay = 0.15, hold = 0, freqEndAt = null }) {
        const ctx = this._ensureCtx(); if (!ctx) return;
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = type;
        osc.frequency.value = freq;
        if (freqEndAt != null) {
            osc.frequency.exponentialRampToValueAtTime(freqEndAt, ctx.currentTime + attack + hold + decay);
        }
        osc.connect(g);
        g.connect(this.sfxGain);
        this._envelope(g, peak, attack, decay, hold);
        osc.start();
        osc.stop(ctx.currentTime + attack + hold + decay + 0.05);
    }

    _arpeggio(freqs, { stepDur = 0.10, type = 'triangle', peak = 0.3 } = {}) {
        const ctx = this._ensureCtx(); if (!ctx) return;
        freqs.forEach((f, i) => {
            setTimeout(() => this._tone({ freq: f, type, peak, attack: 0.005, decay: stepDur * 0.9 }),
                i * stepDur * 1000);
        });
    }

    _noiseBurst(duration = 0.15, peak = 0.2, lowpassHz = 4000) {
        const ctx = this._ensureCtx(); if (!ctx) return;
        const buf = ctx.createBuffer(1, ctx.sampleRate * duration, ctx.sampleRate);
        const d = buf.getChannelData(0);
        for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1);
        const src = ctx.createBufferSource();
        src.buffer = buf;
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = lowpassHz;
        const g = ctx.createGain();
        src.connect(filter); filter.connect(g); g.connect(this.sfxGain);
        this._envelope(g, peak, 0.005, duration);
        src.start();
        src.stop(ctx.currentTime + duration + 0.05);
    }

    // ── One-shots ──────────────────────────────────────────

    click()    { this._tone({ freq: 1800, type: 'square',   peak: 0.10, decay: 0.04 }); }
    place()    { this._tone({ freq: 700,  type: 'triangle', peak: 0.20, decay: 0.10, freqEndAt: 1100 }); }
    remove()   { this._tone({ freq: 900,  type: 'triangle', peak: 0.18, decay: 0.10, freqEndAt: 500 }); }
    error()    { this._tone({ freq: 220,  type: 'square',   peak: 0.20, decay: 0.18 }); }
    whistle()  { this._tone({ freq: 2800, type: 'sine',     peak: 0.25, attack: 0.01, decay: 0.20 }); }
    paChime()  { this._arpeggio([523, 659, 784], { stepDur: 0.10, peak: 0.25 }); }   // C-E-G
    success()  { this._arpeggio([523, 659, 784, 1047], { stepDur: 0.12, peak: 0.30 }); }
    failure()  { this._arpeggio([392, 311, 233], { stepDur: 0.18, peak: 0.30, type: 'sawtooth' }); }
    fireWhoosh() { this._noiseBurst(0.40, 0.18, 1500); }

    // ── Alarm loop (FM-synthesized industrial alarm) ───────

    startAlarm() {
        const ctx = this._ensureCtx(); if (!ctx) return;
        if (this.alarmNodes) return;

        // Two carriers in interval (perfect 5th) for a fuller chord-alarm sound
        const c1 = ctx.createOscillator();
        const c2 = ctx.createOscillator();
        const mod = ctx.createOscillator();
        const modGain = ctx.createGain();
        const lfo = ctx.createOscillator();
        const lfoGain = ctx.createGain();
        const tremolo = ctx.createOscillator();
        const tremoloGain = ctx.createGain();
        const out = ctx.createGain();

        c1.type = 'sine';   c1.frequency.value = 740;
        c2.type = 'sine';   c2.frequency.value = 1110;   // 740 × 1.5

        // FM modulator at audio rate adds harmonics → buzz
        mod.type = 'sine';  mod.frequency.value = 38;
        modGain.gain.value = 65;
        mod.connect(modGain);
        modGain.connect(c1.frequency);
        modGain.connect(c2.frequency);

        // LFO wails the pitch up and down (siren effect)
        lfo.type = 'sine';  lfo.frequency.value = 2.6;
        lfoGain.gain.value = 130;
        lfo.connect(lfoGain);
        lfoGain.connect(c1.frequency);
        lfoGain.connect(c2.frequency);

        // Tremolo on amplitude for pulsing intensity
        tremolo.type = 'sine'; tremolo.frequency.value = 5.2;
        tremoloGain.gain.value = 0.025;     // depth in linear gain
        tremolo.connect(tremoloGain);
        tremoloGain.connect(out.gain);

        out.gain.value = 0.055;
        c1.connect(out);
        c2.connect(out);
        out.connect(this.sfxGain);
        c1.start(); c2.start(); mod.start(); lfo.start(); tremolo.start();
        this.alarmNodes = { c1, c2, mod, lfo, tremolo, out };
    }

    stopAlarm() {
        if (!this.alarmNodes) return;
        const { c1, c2, mod, lfo, tremolo, out } = this.alarmNodes;
        const t = this.ctx.currentTime;
        out.gain.cancelScheduledValues(t);
        out.gain.linearRampToValueAtTime(0, t + 0.3);
        c1.stop(t + 0.35); c2.stop(t + 0.35);
        mod.stop(t + 0.35); lfo.stop(t + 0.35); tremolo.stop(t + 0.35);
        this.alarmNodes = null;
    }

    // ── Continuous loops ──────────────────────────────────

    // Panic swell: low-frequency growl modulated by a slow tremolo, intensity-driven gain.
    startPanicSwell() {
        const ctx = this._ensureCtx(); if (!ctx) return;
        if (this.panicNodes) return;
        const osc = ctx.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.value = 70;
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 320;
        const tremolo = ctx.createOscillator();
        tremolo.type = 'sine';
        tremolo.frequency.value = 4.0;
        const tremoloGain = ctx.createGain();
        tremoloGain.gain.value = 0.4;
        const out = ctx.createGain();
        out.gain.value = 0;        // start silent; updateIntensity ramps up
        osc.connect(filter); filter.connect(out); out.connect(this.sfxGain);
        tremolo.connect(tremoloGain); tremoloGain.connect(out.gain);
        osc.start(); tremolo.start();
        this.panicNodes = { osc, tremolo, out };
    }

    updatePanicIntensity(v) {
        if (!this.panicNodes) return;
        const target = Math.max(0, Math.min(0.18, v * 0.18));   // cap at 0.18 — atmospheric not annoying
        const t = this.ctx.currentTime;
        this.panicNodes.out.gain.cancelScheduledValues(t);
        this.panicNodes.out.gain.linearRampToValueAtTime(target, t + 0.2);
    }

    stopPanicSwell() {
        if (!this.panicNodes) return;
        const { osc, tremolo, out } = this.panicNodes;
        const t = this.ctx.currentTime;
        out.gain.cancelScheduledValues(t);
        out.gain.linearRampToValueAtTime(0, t + 0.4);
        osc.stop(t + 0.5);
        tremolo.stop(t + 0.5);
        this.panicNodes = null;
    }

    // Fire crackle: bandpass-filtered white noise, intensity-driven gain.
    startFireCrackle() {
        const ctx = this._ensureCtx(); if (!ctx) return;
        if (this.fireNodes) return;
        // Long buffer of pre-baked noise — we reuse via loop=true.
        const buf = ctx.createBuffer(1, ctx.sampleRate * 4, ctx.sampleRate);
        const d = buf.getChannelData(0);
        for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1);
        const src = ctx.createBufferSource();
        src.buffer = buf;
        src.loop = true;
        const filter = ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.value = 1800;
        filter.Q.value = 0.7;
        const out = ctx.createGain();
        out.gain.value = 0;
        src.connect(filter); filter.connect(out); out.connect(this.sfxGain);
        src.start();
        this.fireNodes = { src, out };
    }

    updateFireIntensity(v) {
        if (!this.fireNodes) return;
        const target = Math.max(0, Math.min(0.22, v * 0.22));
        const t = this.ctx.currentTime;
        this.fireNodes.out.gain.cancelScheduledValues(t);
        this.fireNodes.out.gain.linearRampToValueAtTime(target, t + 0.2);
    }

    stopFireCrackle() {
        if (!this.fireNodes) return;
        const { src, out } = this.fireNodes;
        const t = this.ctx.currentTime;
        out.gain.cancelScheduledValues(t);
        out.gain.linearRampToValueAtTime(0, t + 0.3);
        src.stop(t + 0.4);
        this.fireNodes = null;
    }

    stopAll() {
        this.stopAlarm();
        this.stopPanicSwell();
        this.stopFireCrackle();
    }
}

// Global singleton — lazy-init on first use
window.exodusAudio = new AudioManager();
