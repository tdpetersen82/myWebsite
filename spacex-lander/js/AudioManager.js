// SpaceX Lander - Audio Manager (Web Audio API synthesized sounds)

class AudioManager {
    constructor() {
        this.ctx = null;
        this.muted = false;
        this.thrustNode = null;
        this.thrustGain = null;
        this.lowFuelNode = null;
        this.lowFuelGain = null;
        this.reentryNode = null;
        this.reentryGain = null;
        this._initialized = false;
    }

    init() {
        if (this._initialized) return;
        try {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
            this._initialized = true;
        } catch (e) {
            console.warn('Web Audio API not available');
        }
    }

    _ensureContext() {
        if (!this.ctx) this.init();
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
        return this.ctx != null;
    }

    toggleMute() {
        this.muted = !this.muted;
        if (this.muted) {
            this.stopThrust();
            this.stopLowFuelWarning();
            this.stopReentryWhoosh();
        }
        return this.muted;
    }

    // Deep Merlin engine roar — entry burn (multi-engine, beefy)
    startThrust(mode) {
        if (this.muted || !this._ensureContext() || this.thrustNode) return;

        const ctx = this.ctx;
        this.thrustGain = ctx.createGain();
        this.thrustGain.gain.setValueAtTime(mode === 'entry' ? 0.10 : 0.07, ctx.currentTime);
        this.thrustGain.connect(ctx.destination);

        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(mode === 'entry' ? 250 : 180, ctx.currentTime);
        filter.connect(this.thrustGain);

        const oscs = [];

        if (mode === 'entry') {
            // Deep multi-engine roar
            const osc1 = ctx.createOscillator();
            osc1.type = 'sawtooth';
            osc1.frequency.setValueAtTime(38, ctx.currentTime);
            osc1.connect(filter);
            oscs.push(osc1);

            const osc2 = ctx.createOscillator();
            osc2.type = 'square';
            osc2.frequency.setValueAtTime(45, ctx.currentTime);
            osc2.connect(filter);
            oscs.push(osc2);

            const osc3 = ctx.createOscillator();
            osc3.type = 'sawtooth';
            osc3.frequency.setValueAtTime(76, ctx.currentTime);
            osc3.connect(filter);
            oscs.push(osc3);

            const osc4 = ctx.createOscillator();
            osc4.type = 'triangle';
            osc4.frequency.setValueAtTime(120, ctx.currentTime);
            osc4.connect(filter);
            oscs.push(osc4);
        } else {
            // Single engine — cleaner
            const osc1 = ctx.createOscillator();
            osc1.type = 'sawtooth';
            osc1.frequency.setValueAtTime(42, ctx.currentTime);
            osc1.connect(filter);
            oscs.push(osc1);

            const osc2 = ctx.createOscillator();
            osc2.type = 'triangle';
            osc2.frequency.setValueAtTime(84, ctx.currentTime);
            osc2.connect(filter);
            oscs.push(osc2);
        }

        oscs.forEach(o => o.start());
        this.thrustNode = { oscs, filter };
    }

    stopThrust() {
        if (this.thrustNode) {
            this.thrustNode.oscs.forEach(o => { try { o.stop(); } catch (e) {} });
            this.thrustNode = null;
        }
        if (this.thrustGain) {
            this.thrustGain.disconnect();
            this.thrustGain = null;
        }
    }

    // Atmospheric re-entry whoosh
    startReentryWhoosh() {
        if (this.muted || !this._ensureContext() || this.reentryNode) return;

        const ctx = this.ctx;
        this.reentryGain = ctx.createGain();
        this.reentryGain.gain.setValueAtTime(0.06, ctx.currentTime);
        this.reentryGain.connect(ctx.destination);

        const filter = ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(800, ctx.currentTime);
        filter.Q.setValueAtTime(2, ctx.currentTime);
        filter.connect(this.reentryGain);

        // White noise via oscillators
        const osc1 = ctx.createOscillator();
        osc1.type = 'sawtooth';
        osc1.frequency.setValueAtTime(440, ctx.currentTime);
        osc1.connect(filter);

        const osc2 = ctx.createOscillator();
        osc2.type = 'sawtooth';
        osc2.frequency.setValueAtTime(443, ctx.currentTime);
        osc2.connect(filter);

        osc1.start();
        osc2.start();
        this.reentryNode = { oscs: [osc1, osc2], filter };
    }

    stopReentryWhoosh() {
        if (this.reentryNode) {
            this.reentryNode.oscs.forEach(o => { try { o.stop(); } catch (e) {} });
            this.reentryNode = null;
        }
        if (this.reentryGain) {
            this.reentryGain.disconnect();
            this.reentryGain = null;
        }
    }

    // Crash explosion + water splash
    playCrash() {
        if (this.muted || !this._ensureContext()) return;
        const ctx = this.ctx;
        const now = ctx.currentTime;

        // Low boom
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.35, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 1.0);
        gain.connect(ctx.destination);

        const osc1 = ctx.createOscillator();
        osc1.type = 'sawtooth';
        osc1.frequency.setValueAtTime(100, now);
        osc1.frequency.exponentialRampToValueAtTime(18, now + 0.8);
        osc1.connect(gain);
        osc1.start(now);
        osc1.stop(now + 1.0);

        // Crackle
        const osc2 = ctx.createOscillator();
        osc2.type = 'square';
        osc2.frequency.setValueAtTime(900, now);
        osc2.frequency.exponentialRampToValueAtTime(30, now + 0.5);
        const g2 = ctx.createGain();
        g2.gain.setValueAtTime(0.12, now);
        g2.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
        osc2.connect(g2);
        g2.connect(ctx.destination);
        osc2.start(now);
        osc2.stop(now + 0.6);

        // Water splash (high frequency burst)
        const osc3 = ctx.createOscillator();
        osc3.type = 'triangle';
        osc3.frequency.setValueAtTime(3000, now + 0.1);
        osc3.frequency.exponentialRampToValueAtTime(200, now + 0.6);
        const g3 = ctx.createGain();
        g3.gain.setValueAtTime(0.08, now + 0.1);
        g3.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
        osc3.connect(g3);
        g3.connect(ctx.destination);
        osc3.start(now + 0.1);
        osc3.stop(now + 0.7);
    }

    // Landing success — triumphant fanfare
    playLanding() {
        if (this.muted || !this._ensureContext()) return;
        const ctx = this.ctx;
        const now = ctx.currentTime;

        // Epic ascending chord
        const notes = [262, 330, 392, 523, 659]; // C4, E4, G4, C5, E5
        notes.forEach((freq, i) => {
            const osc = ctx.createOscillator();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, now);
            const gain = ctx.createGain();
            gain.gain.setValueAtTime(0, now + i * 0.1);
            gain.gain.linearRampToValueAtTime(0.12, now + i * 0.1 + 0.03);
            gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.1 + 0.6);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now + i * 0.1);
            osc.stop(now + i * 0.1 + 0.7);
        });
    }

    // Grid fin deployment click
    playGridFinClick() {
        if (this.muted || !this._ensureContext()) return;
        const ctx = this.ctx;
        const now = ctx.currentTime;

        const osc = ctx.createOscillator();
        osc.type = 'square';
        osc.frequency.setValueAtTime(2000, now);
        osc.frequency.exponentialRampToValueAtTime(500, now + 0.03);
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.06);
    }

    // Landing leg deployment clunk
    playLegDeploy() {
        if (this.muted || !this._ensureContext()) return;
        const ctx = this.ctx;
        const now = ctx.currentTime;

        // Heavy clunk
        const osc = ctx.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(200, now);
        osc.frequency.exponentialRampToValueAtTime(60, now + 0.15);
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.25);

        // Hydraulic hiss
        const osc2 = ctx.createOscillator();
        osc2.type = 'sawtooth';
        osc2.frequency.setValueAtTime(4000, now + 0.05);
        osc2.frequency.exponentialRampToValueAtTime(800, now + 0.3);
        const g2 = ctx.createGain();
        g2.gain.setValueAtTime(0.04, now + 0.05);
        g2.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
        const f2 = ctx.createBiquadFilter();
        f2.type = 'highpass';
        f2.frequency.setValueAtTime(1000, now);
        osc2.connect(f2);
        f2.connect(g2);
        g2.connect(ctx.destination);
        osc2.start(now + 0.05);
        osc2.stop(now + 0.35);
    }

    // Phase transition ascending tone
    playPhaseTransition() {
        if (this.muted || !this._ensureContext()) return;
        const ctx = this.ctx;
        const now = ctx.currentTime;

        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(400, now);
        osc.frequency.linearRampToValueAtTime(800, now + 0.2);
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.35);
    }

    // Countdown beep
    playCountdownBeep(high) {
        if (this.muted || !this._ensureContext()) return;
        const ctx = this.ctx;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.value = high ? 880 : 660;
        gain.gain.setValueAtTime(0.12, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
        osc.start();
        osc.stop(ctx.currentTime + 0.2);
    }

    // Launch ignition roar (short burst)
    playIgnition() {
        if (this.muted || !this._ensureContext()) return;
        const ctx = this.ctx;
        const now = ctx.currentTime;

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.01, now);
        gain.gain.linearRampToValueAtTime(0.15, now + 0.3);
        gain.gain.setValueAtTime(0.15, now + 1.5);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 2.5);
        gain.connect(ctx.destination);

        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(150, now);
        filter.frequency.linearRampToValueAtTime(300, now + 1.0);
        filter.connect(gain);

        for (const freq of [35, 42, 70, 105]) {
            const osc = ctx.createOscillator();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(freq, now);
            osc.connect(filter);
            osc.start(now);
            osc.stop(now + 2.5);
        }
    }

    // Stage separation thunk
    playSeparation() {
        if (this.muted || !this._ensureContext()) return;
        const ctx = this.ctx;
        const now = ctx.currentTime;

        const osc = ctx.createOscillator();
        osc.type = 'square';
        osc.frequency.setValueAtTime(300, now);
        osc.frequency.exponentialRampToValueAtTime(40, now + 0.1);
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.25, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.2);
    }

    // Low fuel warning beep (continuous)
    startLowFuelWarning() {
        if (this.muted || !this._ensureContext() || this.lowFuelNode) return;
        const ctx = this.ctx;

        this.lowFuelGain = ctx.createGain();
        this.lowFuelGain.gain.setValueAtTime(0.08, ctx.currentTime);
        this.lowFuelGain.connect(ctx.destination);

        const osc = ctx.createOscillator();
        osc.type = 'square';
        osc.frequency.setValueAtTime(880, ctx.currentTime);

        const lfo = ctx.createOscillator();
        lfo.type = 'square';
        lfo.frequency.setValueAtTime(3, ctx.currentTime);
        const lfoGain = ctx.createGain();
        lfoGain.gain.setValueAtTime(0.08, ctx.currentTime);
        lfo.connect(lfoGain);
        lfoGain.connect(this.lowFuelGain.gain);

        osc.connect(this.lowFuelGain);
        osc.start();
        lfo.start();

        this.lowFuelNode = { osc, lfo };
    }

    stopLowFuelWarning() {
        if (this.lowFuelNode) {
            try { this.lowFuelNode.osc.stop(); } catch (e) {}
            try { this.lowFuelNode.lfo.stop(); } catch (e) {}
            this.lowFuelNode = null;
        }
        if (this.lowFuelGain) {
            this.lowFuelGain.disconnect();
            this.lowFuelGain = null;
        }
    }

    // Single beep (UI)
    playBeep(freq = 440, duration = 0.1) {
        if (this.muted || !this._ensureContext()) return;
        const ctx = this.ctx;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'square';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
        osc.start();
        osc.stop(ctx.currentTime + duration);
    }

    destroy() {
        this.stopThrust();
        this.stopLowFuelWarning();
        this.stopReentryWhoosh();
        if (this.ctx) {
            this.ctx.close();
            this.ctx = null;
            this._initialized = false;
        }
    }
}
