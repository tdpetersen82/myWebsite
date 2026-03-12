// ============================================================
// Q*bert — Audio Manager (Web Audio API synthesized sounds)
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

    _playTone(freq, type, duration, volume = 0.3, delay = 0) {
        if (this.muted) return;
        try {
            const ctx = this.getContext();
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
            // Silently ignore audio errors
        }
    }

    _playNoise(duration, volume = 0.2, delay = 0) {
        if (this.muted) return;
        try {
            const ctx = this.getContext();
            const bufferSize = ctx.sampleRate * duration;
            const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
            const data = buffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) {
                data[i] = Math.random() * 2 - 1;
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
            source.stop(startTime + duration);
        } catch (e) {
            // Silently ignore
        }
    }

    // Q*bert jumping sound - quick rising chirp
    playJump() {
        if (this.muted) return;
        try {
            const ctx = this.getContext();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.type = 'square';
            osc.frequency.setValueAtTime(200, ctx.currentTime);
            osc.frequency.linearRampToValueAtTime(600, ctx.currentTime + 0.1);
            gain.gain.setValueAtTime(0.2, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
            osc.start();
            osc.stop(ctx.currentTime + 0.15);
        } catch (e) {}
    }

    // Landing on a cube
    playLand() {
        this._playTone(150, 'triangle', 0.08, 0.25);
    }

    // Color change - pleasant ding
    playColorChange() {
        this._playTone(880, 'sine', 0.15, 0.2);
        this._playTone(1100, 'sine', 0.15, 0.15, 0.05);
    }

    // Enemy spawn - ominous low tone
    playEnemySpawn() {
        this._playTone(120, 'sawtooth', 0.3, 0.2);
        this._playTone(80, 'sawtooth', 0.3, 0.15, 0.1);
    }

    // Fall off pyramid - descending wah
    playFallOff() {
        if (this.muted) return;
        try {
            const ctx = this.getContext();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.type = 'square';
            osc.frequency.setValueAtTime(500, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.6);
            gain.gain.setValueAtTime(0.3, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
            osc.start();
            osc.stop(ctx.currentTime + 0.6);
        } catch (e) {}
    }

    // Coily bounce sound
    playCoilyBounce() {
        this._playTone(200, 'square', 0.1, 0.15);
        this._playTone(160, 'square', 0.1, 0.15, 0.1);
    }

    // Coily death - satisfying descending screech
    playCoilyDeath() {
        if (this.muted) return;
        try {
            const ctx = this.getContext();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(800, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(60, ctx.currentTime + 0.8);
            gain.gain.setValueAtTime(0.3, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);
            osc.start();
            osc.stop(ctx.currentTime + 0.8);
        } catch (e) {}
    }

    // Flying disc ride - whooshing upward
    playDiscRide() {
        if (this.muted) return;
        try {
            const ctx = this.getContext();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.type = 'sine';
            osc.frequency.setValueAtTime(300, ctx.currentTime);
            osc.frequency.linearRampToValueAtTime(1200, ctx.currentTime + 0.6);
            gain.gain.setValueAtTime(0.2, ctx.currentTime);
            gain.gain.setValueAtTime(0.2, ctx.currentTime + 0.4);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.7);
            osc.start();
            osc.stop(ctx.currentTime + 0.7);
        } catch (e) {}
    }

    // Level complete - victory jingle
    playLevelComplete() {
        const notes = [523, 659, 784, 1047];
        notes.forEach((freq, i) => {
            this._playTone(freq, 'square', 0.2, 0.2, i * 0.15);
        });
    }

    // Game over - sad descending tones
    playGameOver() {
        const notes = [440, 370, 311, 262];
        notes.forEach((freq, i) => {
            this._playTone(freq, 'triangle', 0.3, 0.2, i * 0.25);
        });
    }

    // Slick/Sam revert color - annoying bloop
    playRevertColor() {
        this._playTone(400, 'square', 0.1, 0.15);
        this._playTone(300, 'square', 0.1, 0.15, 0.08);
    }

    // Menu select
    playMenuSelect() {
        this._playTone(660, 'square', 0.1, 0.15);
    }
}
