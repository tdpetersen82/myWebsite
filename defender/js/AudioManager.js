// defender/js/AudioManager.js — Web Audio API synthesized sounds

class AudioManager {
    constructor() {
        this.ctx = null;
        this.muted = false;
        this.masterVolume = 0.3;
    }

    _ensureContext() {
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

    _playTone(freq, type, duration, volume, rampEnd) {
        if (this.muted) return;
        const ctx = this._ensureContext();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = type;
        osc.frequency.value = freq;
        const vol = volume * this.masterVolume;
        gain.gain.setValueAtTime(vol, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(rampEnd || 0.001, ctx.currentTime + duration);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + duration);
    }

    _playNoise(duration, volume) {
        if (this.muted) return;
        const ctx = this._ensureContext();
        const bufferSize = ctx.sampleRate * duration;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1);
        }
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        const gain = ctx.createGain();
        source.connect(gain);
        gain.connect(ctx.destination);
        const vol = volume * this.masterVolume;
        gain.gain.setValueAtTime(vol, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
        source.start(ctx.currentTime);
        source.stop(ctx.currentTime + duration);
    }

    shoot() {
        this._playTone(880, 'square', 0.06, 0.3);
        this._playTone(660, 'square', 0.04, 0.15);
    }

    explosion() {
        this._playNoise(0.3, 0.4);
        this._playTone(80, 'sawtooth', 0.3, 0.3);
    }

    thrust() {
        this._playNoise(0.05, 0.08);
    }

    rescueHumanoid() {
        if (this.muted) return;
        const ctx = this._ensureContext();
        const freqs = [523, 659, 784, 1047];
        freqs.forEach((f, i) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.type = 'sine';
            osc.frequency.value = f;
            const vol = 0.25 * this.masterVolume;
            gain.gain.setValueAtTime(0.001, ctx.currentTime + i * 0.08);
            gain.gain.linearRampToValueAtTime(vol, ctx.currentTime + i * 0.08 + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.08 + 0.12);
            osc.start(ctx.currentTime + i * 0.08);
            osc.stop(ctx.currentTime + i * 0.08 + 0.12);
        });
    }

    mutantSpawn() {
        this._playTone(200, 'sawtooth', 0.2, 0.3);
        this._playTone(150, 'square', 0.3, 0.2);
    }

    smartBomb() {
        if (this.muted) return;
        const ctx = this._ensureContext();
        this._playNoise(0.5, 0.5);
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(400, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(50, ctx.currentTime + 0.5);
        gain.gain.setValueAtTime(0.4 * this.masterVolume, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.5);
    }

    hyperspace() {
        if (this.muted) return;
        const ctx = this._ensureContext();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(200, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(2000, ctx.currentTime + 0.15);
        osc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.3);
        gain.gain.setValueAtTime(0.3 * this.masterVolume, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.3);
    }

    menuClick() {
        this._playTone(600, 'sine', 0.05, 0.2);
    }

    humanoidFall() {
        this._playTone(300, 'triangle', 0.15, 0.2);
        this._playTone(200, 'triangle', 0.15, 0.15);
    }

    waveComplete() {
        if (this.muted) return;
        const ctx = this._ensureContext();
        const freqs = [440, 554, 659, 880];
        freqs.forEach((f, i) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.type = 'square';
            osc.frequency.value = f;
            const vol = 0.2 * this.masterVolume;
            gain.gain.setValueAtTime(vol, ctx.currentTime + i * 0.12);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.12 + 0.2);
            osc.start(ctx.currentTime + i * 0.12);
            osc.stop(ctx.currentTime + i * 0.12 + 0.2);
        });
    }

    extraLife() {
        if (this.muted) return;
        const freqs = [523, 659, 784, 1047, 784, 1047];
        freqs.forEach((f, i) => {
            setTimeout(() => this._playTone(f, 'sine', 0.1, 0.25), i * 60);
        });
    }
}

const audioManager = new AudioManager();
