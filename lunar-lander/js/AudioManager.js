// Lunar Lander - Audio Manager (Web Audio API synthesized sounds)

class AudioManager {
    constructor() {
        this.ctx = null;
        this.muted = false;
        this.thrustNode = null;
        this.thrustGain = null;
        this.lowFuelNode = null;
        this.lowFuelGain = null;
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
        }
        return this.muted;
    }

    // Continuous thrust rumble sound
    startThrust() {
        if (this.muted || !this._ensureContext() || this.thrustNode) return;

        const ctx = this.ctx;
        // Create noise-like thrust using multiple detuned oscillators
        this.thrustGain = ctx.createGain();
        this.thrustGain.gain.setValueAtTime(0.08, ctx.currentTime);
        this.thrustGain.connect(ctx.destination);

        // Low rumble
        const osc1 = ctx.createOscillator();
        osc1.type = 'sawtooth';
        osc1.frequency.setValueAtTime(55, ctx.currentTime);

        const osc2 = ctx.createOscillator();
        osc2.type = 'square';
        osc2.frequency.setValueAtTime(42, ctx.currentTime);

        // Add some noise via high-freq modulation
        const osc3 = ctx.createOscillator();
        osc3.type = 'triangle';
        osc3.frequency.setValueAtTime(110, ctx.currentTime);

        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(200, ctx.currentTime);
        filter.connect(this.thrustGain);

        osc1.connect(filter);
        osc2.connect(filter);
        osc3.connect(filter);

        osc1.start();
        osc2.start();
        osc3.start();

        this.thrustNode = { oscs: [osc1, osc2, osc3], filter };
    }

    stopThrust() {
        if (this.thrustNode) {
            this.thrustNode.oscs.forEach(o => {
                try { o.stop(); } catch (e) {}
            });
            this.thrustNode = null;
        }
        if (this.thrustGain) {
            this.thrustGain.disconnect();
            this.thrustGain = null;
        }
    }

    // Crash explosion sound
    playCrash() {
        if (this.muted || !this._ensureContext()) return;
        const ctx = this.ctx;
        const now = ctx.currentTime;

        // Noise burst via rapid oscillator
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
        gain.connect(ctx.destination);

        // Low boom
        const osc1 = ctx.createOscillator();
        osc1.type = 'sawtooth';
        osc1.frequency.setValueAtTime(120, now);
        osc1.frequency.exponentialRampToValueAtTime(20, now + 0.6);
        osc1.connect(gain);
        osc1.start(now);
        osc1.stop(now + 0.8);

        // Crackle
        const osc2 = ctx.createOscillator();
        osc2.type = 'square';
        osc2.frequency.setValueAtTime(800, now);
        osc2.frequency.exponentialRampToValueAtTime(40, now + 0.4);
        const g2 = ctx.createGain();
        g2.gain.setValueAtTime(0.15, now);
        g2.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
        osc2.connect(g2);
        g2.connect(ctx.destination);
        osc2.start(now);
        osc2.stop(now + 0.5);

        // High debris sound
        const osc3 = ctx.createOscillator();
        osc3.type = 'triangle';
        osc3.frequency.setValueAtTime(2000, now);
        osc3.frequency.exponentialRampToValueAtTime(100, now + 0.3);
        const g3 = ctx.createGain();
        g3.gain.setValueAtTime(0.1, now + 0.05);
        g3.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
        osc3.connect(g3);
        g3.connect(ctx.destination);
        osc3.start(now);
        osc3.stop(now + 0.4);
    }

    // Landing success fanfare
    playLanding() {
        if (this.muted || !this._ensureContext()) return;
        const ctx = this.ctx;
        const now = ctx.currentTime;

        const notes = [523, 659, 784, 1047]; // C5, E5, G5, C6
        notes.forEach((freq, i) => {
            const osc = ctx.createOscillator();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, now);
            const gain = ctx.createGain();
            gain.gain.setValueAtTime(0, now + i * 0.12);
            gain.gain.linearRampToValueAtTime(0.15, now + i * 0.12 + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.12 + 0.4);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now + i * 0.12);
            osc.stop(now + i * 0.12 + 0.5);
        });
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

        // LFO to create beeping
        const lfo = ctx.createOscillator();
        lfo.type = 'square';
        lfo.frequency.setValueAtTime(3, ctx.currentTime); // 3 beeps per second
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

    // Single beep (for UI interactions)
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
        if (this.ctx) {
            this.ctx.close();
            this.ctx = null;
            this._initialized = false;
        }
    }
}
