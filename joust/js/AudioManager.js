// ============================================================
// Joust — Audio Manager (Web Audio API synthesized sounds)
// ============================================================

class AudioManager {
    constructor() {
        this.ctx = null;
        this.muted = false;
    }

    getContext() {
        if (!this.ctx) {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
        return this.ctx;
    }

    toggleMute() {
        this.muted = !this.muted;
        return this.muted;
    }

    _playTone(freq, type, duration, volume = 0.3, ramp = true) {
        if (this.muted) return;
        try {
            const ctx = this.getContext();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.type = type;
            osc.frequency.value = freq;
            gain.gain.setValueAtTime(volume, ctx.currentTime);
            if (ramp) {
                gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
            }
            osc.start(ctx.currentTime);
            osc.stop(ctx.currentTime + duration);
        } catch (e) {
            // Silently fail if audio context is not available
        }
    }

    _playNoise(duration, volume = 0.15) {
        if (this.muted) return;
        try {
            const ctx = this.getContext();
            const bufferSize = ctx.sampleRate * duration;
            const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
            const data = buffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) {
                data[i] = (Math.random() * 2 - 1) * volume;
            }
            const source = ctx.createBufferSource();
            source.buffer = buffer;
            const gain = ctx.createGain();
            source.connect(gain);
            gain.connect(ctx.destination);
            gain.gain.setValueAtTime(volume, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
            source.start(ctx.currentTime);
            source.stop(ctx.currentTime + duration);
        } catch (e) {}
    }

    playFlap() {
        this._playTone(280, 'triangle', 0.08, 0.2);
        setTimeout(() => this._playTone(350, 'triangle', 0.06, 0.15), 40);
    }

    playLanceHit() {
        this._playTone(200, 'square', 0.15, 0.25);
        setTimeout(() => this._playTone(300, 'square', 0.1, 0.2), 60);
        setTimeout(() => this._playTone(500, 'square', 0.1, 0.15), 120);
    }

    playEggCollect() {
        this._playTone(600, 'sine', 0.08, 0.25);
        setTimeout(() => this._playTone(800, 'sine', 0.08, 0.25), 70);
        setTimeout(() => this._playTone(1000, 'sine', 0.12, 0.2), 140);
    }

    playEggHatch() {
        this._playTone(300, 'sawtooth', 0.1, 0.15);
        setTimeout(() => this._playTone(400, 'sawtooth', 0.15, 0.15), 100);
    }

    playPterodactylScreech() {
        if (this.muted) return;
        try {
            const ctx = this.getContext();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(800, ctx.currentTime);
            osc.frequency.linearRampToValueAtTime(1200, ctx.currentTime + 0.1);
            osc.frequency.linearRampToValueAtTime(600, ctx.currentTime + 0.3);
            osc.frequency.linearRampToValueAtTime(1000, ctx.currentTime + 0.4);
            gain.gain.setValueAtTime(0.2, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
            osc.start(ctx.currentTime);
            osc.stop(ctx.currentTime + 0.5);
        } catch (e) {}
    }

    playLavaBubble() {
        this._playTone(80, 'sine', 0.2, 0.1);
        setTimeout(() => this._playTone(60, 'sine', 0.15, 0.08), 100);
    }

    playLavaDeath() {
        this._playNoise(0.4, 0.2);
        this._playTone(100, 'sawtooth', 0.4, 0.2);
        setTimeout(() => this._playTone(60, 'sawtooth', 0.3, 0.15), 200);
    }

    playWaveComplete() {
        const notes = [523, 659, 784, 1047];
        notes.forEach((freq, i) => {
            setTimeout(() => this._playTone(freq, 'sine', 0.2, 0.25), i * 120);
        });
    }

    playDeath() {
        this._playTone(400, 'square', 0.1, 0.2);
        setTimeout(() => this._playTone(300, 'square', 0.1, 0.2), 100);
        setTimeout(() => this._playTone(200, 'square', 0.15, 0.2), 200);
        setTimeout(() => this._playTone(100, 'square', 0.3, 0.2), 300);
    }

    playGameOver() {
        const notes = [400, 350, 300, 250, 200];
        notes.forEach((freq, i) => {
            setTimeout(() => this._playTone(freq, 'square', 0.25, 0.2), i * 200);
        });
    }

    playMenuSelect() {
        this._playTone(440, 'sine', 0.08, 0.2);
        setTimeout(() => this._playTone(660, 'sine', 0.1, 0.2), 80);
    }
}
