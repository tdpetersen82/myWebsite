// Bomberman Audio Manager - Web Audio API synthesized sounds
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

    _playTone(freq, type, duration, volume = 0.3, delay = 0) {
        if (this.muted) return;
        try {
            const ctx = this._getContext();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.type = type;
            osc.frequency.value = freq;
            const startTime = ctx.currentTime + delay;
            gain.gain.setValueAtTime(volume, startTime);
            gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
            osc.start(startTime);
            osc.stop(startTime + duration);
        } catch (e) {
            // Silently fail if audio context not available
        }
    }

    _playNoise(duration, volume = 0.2, delay = 0) {
        if (this.muted) return;
        try {
            const ctx = this._getContext();
            const bufferSize = ctx.sampleRate * duration;
            const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
            const data = buffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) {
                data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 2);
            }
            const source = ctx.createBufferSource();
            source.buffer = buffer;
            const gain = ctx.createGain();
            source.connect(gain);
            gain.connect(ctx.destination);
            const startTime = ctx.currentTime + delay;
            gain.gain.setValueAtTime(volume, startTime);
            gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
            source.start(startTime);
        } catch (e) {
            // Silently fail
        }
    }

    placeBomb() {
        this._playTone(80, 'sine', 0.15, 0.3);
        this._playTone(60, 'sine', 0.1, 0.2, 0.05);
    }

    explosion() {
        this._playNoise(0.4, 0.3);
        this._playTone(60, 'sawtooth', 0.3, 0.2);
        this._playTone(40, 'square', 0.2, 0.15, 0.1);
    }

    pickup() {
        this._playTone(523, 'sine', 0.1, 0.25);
        this._playTone(659, 'sine', 0.1, 0.25, 0.08);
        this._playTone(784, 'sine', 0.15, 0.25, 0.16);
    }

    death() {
        this._playTone(440, 'square', 0.15, 0.25);
        this._playTone(330, 'square', 0.15, 0.25, 0.15);
        this._playTone(220, 'square', 0.15, 0.25, 0.3);
        this._playTone(110, 'sawtooth', 0.4, 0.2, 0.45);
    }

    doorOpen() {
        this._playTone(392, 'sine', 0.12, 0.2);
        this._playTone(494, 'sine', 0.12, 0.2, 0.1);
        this._playTone(587, 'sine', 0.12, 0.2, 0.2);
        this._playTone(784, 'sine', 0.25, 0.25, 0.3);
    }

    levelClear() {
        const notes = [523, 587, 659, 784, 880, 1047];
        notes.forEach((freq, i) => {
            this._playTone(freq, 'sine', 0.15, 0.25, i * 0.1);
        });
    }

    enemyKill() {
        this._playTone(600, 'square', 0.08, 0.2);
        this._playTone(800, 'square', 0.12, 0.2, 0.06);
    }

    menuSelect() {
        this._playTone(440, 'sine', 0.08, 0.2);
        this._playTone(660, 'sine', 0.1, 0.2, 0.06);
    }

    toggleMute() {
        this.muted = !this.muted;
        return this.muted;
    }
}
