// Fantastic Contraption — Audio Manager (Web Audio API synth)
class AudioManager {
    constructor() {
        this.ctx = null;
        this.muted = localStorage.getItem(CONFIG.LS_MUTED_KEY) === 'true';
    }

    _ensureContext() {
        if (!this.ctx) {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    toggleMute() {
        this.muted = !this.muted;
        localStorage.setItem(CONFIG.LS_MUTED_KEY, this.muted);
        return this.muted;
    }

    _playTone(freq, duration, type, volume) {
        if (this.muted) return;
        this._ensureContext();
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = type || 'sine';
        osc.frequency.value = freq;
        gain.gain.value = volume || 0.15;
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(this.ctx.currentTime + duration);
    }

    playPlace() {
        this._playTone(600, 0.1, 'sine', 0.12);
    }

    playSnap() {
        this._playTone(800, 0.08, 'sine', 0.15);
        setTimeout(() => this._playTone(1000, 0.08, 'sine', 0.1), 40);
    }

    playDelete() {
        this._playTone(300, 0.15, 'sawtooth', 0.08);
    }

    playStart() {
        this._playTone(440, 0.15, 'triangle', 0.12);
        setTimeout(() => this._playTone(550, 0.15, 'triangle', 0.12), 100);
        setTimeout(() => this._playTone(660, 0.2, 'triangle', 0.12), 200);
    }

    playStop() {
        this._playTone(660, 0.15, 'triangle', 0.1);
        setTimeout(() => this._playTone(440, 0.2, 'triangle', 0.1), 100);
    }

    playComplete() {
        const notes = [523, 659, 784, 1047];
        notes.forEach((freq, i) => {
            setTimeout(() => this._playTone(freq, 0.3, 'sine', 0.15), i * 120);
        });
    }

    playClick() {
        this._playTone(500, 0.05, 'square', 0.06);
    }
}
