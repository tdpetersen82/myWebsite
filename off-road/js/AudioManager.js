class AudioManager {
    constructor() {
        this.ctx = null;
        this.masterGain = null;
        this.sfxGain = null;
        this.musicGain = null;
        this.engineGain = null;
        this.muted = false;

        // Engine oscillators (persistent)
        this.engineOsc1 = null;
        this.engineOsc2 = null;
        this.engineFilter = null;
        this.engineRunning = false;

        // Music state
        this.musicPlaying = false;
        this.musicInterval = null;
        this.musicStep = 0;
    }

    _getContext() {
        if (!this.ctx) {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
            this.masterGain = this.ctx.createGain();
            this.masterGain.gain.value = 0.5;
            this.masterGain.connect(this.ctx.destination);

            this.sfxGain = this.ctx.createGain();
            this.sfxGain.gain.value = 0.6;
            this.sfxGain.connect(this.masterGain);

            this.musicGain = this.ctx.createGain();
            this.musicGain.gain.value = 0.15;
            this.musicGain.connect(this.masterGain);

            this.engineGain = this.ctx.createGain();
            this.engineGain.gain.value = 0.08;
            this.engineGain.connect(this.masterGain);
        }
        if (this.ctx.state === 'suspended') this.ctx.resume();
        return this.ctx;
    }

    toggleMute() {
        this.muted = !this.muted;
        if (this.masterGain) {
            this.masterGain.gain.value = this.muted ? 0 : 0.5;
        }
        return this.muted;
    }

    // === ENGINE SOUND (persistent oscillators) ===

    startEngine() {
        const ctx = this._getContext();
        if (this.engineRunning) return;

        this.engineFilter = ctx.createBiquadFilter();
        this.engineFilter.type = 'lowpass';
        this.engineFilter.frequency.value = 200;
        this.engineFilter.Q.value = 2;
        this.engineFilter.connect(this.engineGain);

        // Two detuned sawtooth oscillators for rich engine sound
        this.engineOsc1 = ctx.createOscillator();
        this.engineOsc1.type = 'sawtooth';
        this.engineOsc1.frequency.value = 80;
        this.engineOsc1.connect(this.engineFilter);
        this.engineOsc1.start();

        this.engineOsc2 = ctx.createOscillator();
        this.engineOsc2.type = 'sawtooth';
        this.engineOsc2.frequency.value = 82;
        this.engineOsc2.connect(this.engineFilter);
        this.engineOsc2.start();

        this.engineRunning = true;
    }

    updateEngine(speedRatio) {
        if (!this.engineRunning) return;
        const r = Math.abs(speedRatio);

        // Frequency: 80Hz at idle → 200Hz at max
        const freq = 80 + r * 120;
        this.engineOsc1.frequency.value = freq;
        this.engineOsc2.frequency.value = freq + 2 + r * 5;

        // Filter cutoff: 200Hz at idle → 2000Hz at max
        this.engineFilter.frequency.value = 200 + r * 1800;

        // Volume: quiet at idle, louder at speed
        this.engineGain.gain.value = 0.04 + r * 0.08;
    }

    stopEngine() {
        if (!this.engineRunning) return;
        try {
            this.engineOsc1.stop();
            this.engineOsc2.stop();
        } catch (e) {}
        this.engineRunning = false;
    }

    // === SOUND EFFECTS ===

    _playTone(freq, duration, type, gain, dest) {
        const ctx = this._getContext();
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = type || 'sine';
        osc.frequency.value = freq;
        g.gain.setValueAtTime(gain || 0.3, ctx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
        osc.connect(g);
        g.connect(dest || this.sfxGain);
        osc.start();
        osc.stop(ctx.currentTime + duration);
    }

    _playNoise(duration, gain, filterFreq, dest) {
        const ctx = this._getContext();
        const bufferSize = ctx.sampleRate * duration;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }
        const source = ctx.createBufferSource();
        source.buffer = buffer;

        const filter = ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.value = filterFreq || 1000;

        const g = ctx.createGain();
        g.gain.setValueAtTime(gain || 0.2, ctx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

        source.connect(filter);
        filter.connect(g);
        g.connect(dest || this.sfxGain);
        source.start();
    }

    collision(intensity) {
        const vol = Math.min(0.5, intensity * 0.15);
        this._playNoise(0.15, vol, 800);
        this._playTone(60, 0.1, 'sine', vol * 0.8);
    }

    nitroBoost() {
        const ctx = this._getContext();
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(200, ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(800, ctx.currentTime + 0.3);
        g.gain.setValueAtTime(0.15, ctx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
        osc.connect(g);
        g.connect(this.sfxGain);
        osc.start();
        osc.stop(ctx.currentTime + 0.4);
        this._playNoise(0.3, 0.1, 2000);
    }

    powerUpCollect() {
        const ctx = this._getContext();
        const notes = [523, 659, 784]; // C5, E5, G5
        notes.forEach((freq, i) => {
            setTimeout(() => this._playTone(freq, 0.15, 'sine', 0.25), i * 60);
        });
    }

    missileFire() {
        const ctx = this._getContext();
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(1000, ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(200, ctx.currentTime + 0.2);
        g.gain.setValueAtTime(0.2, ctx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
        osc.connect(g);
        g.connect(this.sfxGain);
        osc.start();
        osc.stop(ctx.currentTime + 0.25);
    }

    missileExplode() {
        this._playNoise(0.4, 0.3, 500);
        this._playTone(40, 0.3, 'sine', 0.4);
        this._playNoise(0.2, 0.15, 2000);
    }

    oilSlickDrop() {
        this._playNoise(0.1, 0.1, 400);
    }

    spinout() {
        const ctx = this._getContext();
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(2000, ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(500, ctx.currentTime + 0.4);
        g.gain.setValueAtTime(0.15, ctx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
        osc.connect(g);
        g.connect(this.sfxGain);
        osc.start();
        osc.stop(ctx.currentTime + 0.5);
        this._playNoise(0.3, 0.1, 1500);
    }

    countdown(n) {
        // 3,2,1 = 440Hz beep, GO = 880Hz
        const freq = n > 0 ? 440 : 880;
        const dur = n > 0 ? 0.1 : 0.25;
        this._playTone(freq, dur, 'sine', 0.4);
    }

    lapComplete() {
        const notes = [440, 554, 659, 880];
        notes.forEach((freq, i) => {
            setTimeout(() => this._playTone(freq, 0.1, 'sine', 0.2), i * 50);
        });
    }

    raceFinish() {
        const notes = [523, 587, 659, 698, 784, 880];
        notes.forEach((freq, i) => {
            setTimeout(() => this._playTone(freq, 0.2, 'sine', 0.3), i * 100);
        });
    }

    crowdCheer() {
        this._playNoise(2.0, 0.12, 1200);
        setTimeout(() => this._playNoise(1.5, 0.08, 1500), 200);
    }

    buttonClick() {
        this._playTone(600, 0.05, 'sine', 0.15);
    }

    playerJoin() {
        this._playTone(440, 0.08, 'sine', 0.15);
        setTimeout(() => this._playTone(554, 0.08, 'sine', 0.15), 80);
    }

    playerLeave() {
        this._playTone(554, 0.08, 'sine', 0.15);
        setTimeout(() => this._playTone(440, 0.08, 'sine', 0.15), 80);
    }

    // === MUSIC ===

    startMusic() {
        if (this.musicPlaying) return;
        this._getContext();
        this.musicPlaying = true;
        this.musicStep = 0;

        const BPM = 140;
        const stepMs = (60 / BPM) * 1000 / 2; // 8th notes

        // Bass line pattern (16 steps)
        const bassPattern = [1,0,0,1, 0,0,1,0, 1,0,0,1, 0,1,0,0];
        const bassNotes =   [65,65,65,82, 65,65,73,73, 65,65,65,98, 65,82,65,65];

        // Hi-hat pattern
        const hihatPattern = [1,0,1,0, 1,0,1,0, 1,0,1,0, 1,0,1,0];

        // Melody (32 steps, plays every 2 loops)
        const melodyPattern = [1,0,0,0, 1,0,0,1, 0,0,1,0, 0,0,0,0, 1,0,0,1, 0,0,1,0, 0,0,0,0, 1,0,0,0];
        const melodyNotes =   [523,0,0,0, 587,0,0,659, 0,0,784,0, 0,0,0,0, 659,0,0,523, 0,0,587,0, 0,0,0,0, 440,0,0,0];

        this.musicInterval = setInterval(() => {
            if (this.muted) return;
            const step = this.musicStep % 16;
            const step32 = this.musicStep % 32;

            if (bassPattern[step]) {
                this._playTone(bassNotes[step], 0.12, 'triangle', 0.15, this.musicGain);
            }
            if (hihatPattern[step]) {
                this._playNoise(0.03, 0.06, 8000, this.musicGain);
            }
            if (melodyPattern[step32] && melodyNotes[step32]) {
                this._playTone(melodyNotes[step32], 0.15, 'square', 0.08, this.musicGain);
            }

            this.musicStep++;
        }, stepMs);
    }

    stopMusic() {
        if (this.musicInterval) {
            clearInterval(this.musicInterval);
            this.musicInterval = null;
        }
        this.musicPlaying = false;
    }
}
