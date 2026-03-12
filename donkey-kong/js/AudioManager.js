// ============================================================
// Donkey Kong — Audio Manager (Web Audio API, synthesized)
// ============================================================

class AudioManager {
    constructor() {
        this.muted = false;
        this.ctx = null;
    }

    _getCtx() {
        if (!this.ctx || this.ctx.state === 'closed') {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
        return this.ctx;
    }

    _play(freq, type, duration, volume = 0.25) {
        if (this.muted) return;
        try {
            const ctx = this._getCtx();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.type = type;
            osc.frequency.value = freq;
            gain.gain.setValueAtTime(volume, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
            osc.start(ctx.currentTime);
            osc.stop(ctx.currentTime + duration);
        } catch (e) {
            // Silently ignore audio errors
        }
    }

    _playSequence(notes, type = 'square') {
        if (this.muted) return;
        try {
            const ctx = this._getCtx();
            let t = ctx.currentTime;
            notes.forEach(([freq, dur, vol]) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.type = type;
                osc.frequency.value = freq;
                gain.gain.setValueAtTime(vol || 0.2, t);
                gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
                osc.start(t);
                osc.stop(t + dur);
                t += dur * 0.8;
            });
        } catch (e) {}
    }

    jump() {
        this._play(350, 'square', 0.08, 0.2);
        setTimeout(() => this._play(500, 'square', 0.08, 0.15), 40);
    }

    walk() {
        this._play(100, 'triangle', 0.05, 0.08);
    }

    barrelRoll() {
        this._play(80, 'sawtooth', 0.15, 0.1);
    }

    barrelJump() {
        this._playSequence([
            [600, 0.06, 0.2],
            [800, 0.06, 0.2],
            [1000, 0.08, 0.15],
        ]);
    }

    hammerHit() {
        this._play(200, 'sawtooth', 0.15, 0.3);
        setTimeout(() => this._play(150, 'square', 0.1, 0.2), 60);
    }

    hammerPickup() {
        this._playSequence([
            [400, 0.08, 0.25],
            [600, 0.08, 0.25],
            [800, 0.08, 0.25],
            [1000, 0.12, 0.2],
        ]);
    }

    death() {
        this._playSequence([
            [400, 0.15, 0.3],
            [300, 0.15, 0.3],
            [200, 0.2, 0.25],
            [150, 0.3, 0.2],
        ], 'sawtooth');
    }

    levelComplete() {
        this._playSequence([
            [523, 0.1, 0.25],
            [659, 0.1, 0.25],
            [784, 0.1, 0.25],
            [1047, 0.2, 0.3],
            [784, 0.1, 0.2],
            [1047, 0.3, 0.3],
        ]);
    }

    fireSpawn() {
        this._play(120, 'sawtooth', 0.3, 0.15);
    }

    menuSelect() {
        this._play(600, 'square', 0.08, 0.15);
    }

    toggleMute() {
        this.muted = !this.muted;
        return this.muted;
    }
}

// Global singleton
window.audioManager = new AudioManager();
