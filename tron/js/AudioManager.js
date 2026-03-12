// Tron Light Cycles - Audio Manager (Web Audio API synthesized sounds)
class AudioManager {
    constructor() {
        this.muted = false;
        this.ctx = null;
    }

    _getContext() {
        if (!this.ctx || this.ctx.state === 'closed') {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
        return this.ctx;
    }

    _play(freq, type, duration, volume = 0.25, rampEnd = null) {
        if (this.muted) return;
        try {
            const ctx = this._getContext();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.type = type;
            osc.frequency.value = freq;
            gain.gain.setValueAtTime(volume, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(
                0.001,
                ctx.currentTime + (rampEnd || duration)
            );
            osc.start(ctx.currentTime);
            osc.stop(ctx.currentTime + duration);
        } catch (e) {
            // Silently fail if audio isn't available
        }
    }

    playTurn() {
        this._play(880, 'sine', 0.06, 0.15);
    }

    playCrash() {
        // Noise-like crash: rapid descending tones
        const ctx = this._getContext();
        if (this.muted || !ctx) return;
        try {
            for (let i = 0; i < 5; i++) {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.type = 'sawtooth';
                osc.frequency.value = 400 - i * 60;
                const start = ctx.currentTime + i * 0.04;
                gain.gain.setValueAtTime(0.2, start);
                gain.gain.exponentialRampToValueAtTime(0.001, start + 0.15);
                osc.start(start);
                osc.stop(start + 0.15);
            }
        } catch (e) {}
    }

    playRoundWin() {
        // Ascending triumphant tones
        const notes = [523, 659, 784, 1047];
        notes.forEach((freq, i) => {
            setTimeout(() => {
                this._play(freq, 'sine', 0.2, 0.2);
            }, i * 100);
        });
    }

    playBoostPickup() {
        this._play(1200, 'sine', 0.08, 0.2);
        setTimeout(() => this._play(1600, 'sine', 0.08, 0.2), 60);
    }

    playBoostActive() {
        this._play(200, 'sawtooth', 0.1, 0.08);
    }

    playCountdown() {
        this._play(440, 'square', 0.1, 0.15);
    }

    playGo() {
        this._play(880, 'square', 0.2, 0.2);
    }

    playMenuSelect() {
        this._play(660, 'sine', 0.08, 0.15);
    }

    toggleMute() {
        this.muted = !this.muted;
        return this.muted;
    }
}

// Global audio manager instance
const audioManager = new AudioManager();
