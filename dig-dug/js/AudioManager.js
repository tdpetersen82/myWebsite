// Dig Dug - Audio Manager (Web Audio API synthesized sounds)

class AudioManager {
    constructor() {
        this.muted = false;
        this.ctx = null;
    }

    getContext() {
        if (!this.ctx || this.ctx.state === 'closed') {
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

    playTone(freq, type, duration, volume = 0.3, delay = 0) {
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
            // Audio context may not be available
        }
    }

    playNoise(duration, volume = 0.2, delay = 0) {
        if (this.muted) return;
        try {
            const ctx = this.getContext();
            const bufferSize = ctx.sampleRate * duration;
            const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
            const data = buffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) {
                data[i] = (Math.random() * 2 - 1) * 0.5;
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
        } catch (e) {}
    }

    // Digging through dirt - short crunchy sound
    playDig() {
        this.playTone(180, 'square', 0.06, 0.15);
        this.playNoise(0.05, 0.1);
    }

    // Pump action - whoosh sound
    playPump() {
        this.playTone(300, 'sine', 0.15, 0.25);
        this.playTone(500, 'sine', 0.1, 0.15, 0.05);
    }

    // Enemy inflating
    playInflate() {
        this.playTone(400, 'sine', 0.2, 0.2);
        this.playTone(600, 'sine', 0.15, 0.15, 0.1);
    }

    // Enemy popping
    playPop() {
        this.playNoise(0.15, 0.3);
        this.playTone(800, 'square', 0.05, 0.3);
        this.playTone(400, 'square', 0.1, 0.2, 0.05);
    }

    // Rock starting to fall (wobble)
    playRockWobble() {
        this.playTone(100, 'triangle', 0.3, 0.15);
        this.playTone(120, 'triangle', 0.3, 0.15, 0.15);
    }

    // Rock crushing
    playRockCrush() {
        this.playNoise(0.3, 0.35);
        this.playTone(80, 'sawtooth', 0.3, 0.25);
        this.playTone(50, 'sawtooth', 0.2, 0.2, 0.1);
    }

    // Bonus vegetable collected
    playBonus() {
        this.playTone(523, 'sine', 0.1, 0.25);
        this.playTone(659, 'sine', 0.1, 0.25, 0.1);
        this.playTone(784, 'sine', 0.15, 0.25, 0.2);
    }

    // Player death
    playDeath() {
        this.playTone(400, 'sawtooth', 0.15, 0.3);
        this.playTone(300, 'sawtooth', 0.15, 0.25, 0.15);
        this.playTone(200, 'sawtooth', 0.2, 0.2, 0.3);
        this.playTone(100, 'sawtooth', 0.3, 0.15, 0.5);
    }

    // Level complete jingle
    playLevelComplete() {
        const notes = [523, 587, 659, 784, 880, 1047];
        notes.forEach((freq, i) => {
            this.playTone(freq, 'sine', 0.15, 0.2, i * 0.1);
        });
    }

    // Fygar fire breath
    playFire() {
        this.playNoise(0.4, 0.2);
        this.playTone(150, 'sawtooth', 0.4, 0.15);
    }

    // Walking/movement (subtle)
    playStep() {
        this.playTone(200, 'square', 0.03, 0.05);
    }

    // Menu select
    playSelect() {
        this.playTone(440, 'sine', 0.1, 0.2);
        this.playTone(880, 'sine', 0.15, 0.2, 0.1);
    }
}
