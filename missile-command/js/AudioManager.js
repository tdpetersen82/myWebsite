// ============================================================
// Missile Command — Audio Manager (Web Audio API)
// ============================================================

class AudioManager {
    constructor() {
        this.ctx = null;
        this.muted = false;
        this.musicGain = null;
        this.musicPlaying = false;
        this.masterVolume = 0.4;
        this._musicNodes = [];
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

    _playTone(freq, type, duration, volume = 0.3, delay = 0) {
        if (this.muted) return;
        const ctx = this._ensureContext();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = type;
        osc.frequency.value = freq;
        const startTime = ctx.currentTime + delay;
        gain.gain.setValueAtTime(volume * this.masterVolume, startTime);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
        osc.start(startTime);
        osc.stop(startTime + duration);
    }

    _playNoise(duration, volume = 0.2, delay = 0) {
        if (this.muted) return;
        const ctx = this._ensureContext();
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
        gain.gain.setValueAtTime(volume * this.masterVolume, startTime);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
        source.start(startTime);
    }

    // Sound effects
    playLaunch() {
        this._playTone(200, 'sawtooth', 0.15, 0.25);
        this._playTone(400, 'sine', 0.1, 0.15, 0.05);
    }

    playExplosion(size = 'medium') {
        const vol = size === 'large' ? 0.4 : size === 'small' ? 0.15 : 0.25;
        const dur = size === 'large' ? 0.6 : size === 'small' ? 0.2 : 0.35;
        this._playNoise(dur, vol);
        this._playTone(80, 'sine', dur, vol * 0.8);
        this._playTone(60, 'sine', dur * 0.8, vol * 0.5, 0.05);
    }

    playCityHit() {
        this._playNoise(0.5, 0.35);
        this._playTone(50, 'sawtooth', 0.4, 0.3);
        this._playTone(30, 'sine', 0.6, 0.25, 0.1);
    }

    playBaseHit() {
        this._playNoise(0.4, 0.3);
        this._playTone(100, 'square', 0.3, 0.2);
    }

    playBomberDestroyed() {
        this._playNoise(0.4, 0.3);
        this._playTone(150, 'sawtooth', 0.3, 0.3);
        this._playTone(100, 'sawtooth', 0.2, 0.2, 0.1);
    }

    playPowerUpCollect() {
        this._playTone(523, 'sine', 0.1, 0.25);
        this._playTone(659, 'sine', 0.1, 0.25, 0.08);
        this._playTone(784, 'sine', 0.15, 0.3, 0.16);
    }

    playComboMilestone() {
        this._playTone(440, 'square', 0.08, 0.2);
        this._playTone(554, 'square', 0.08, 0.2, 0.06);
        this._playTone(659, 'square', 0.08, 0.2, 0.12);
        this._playTone(880, 'square', 0.12, 0.25, 0.18);
    }

    playWarning() {
        this._playTone(800, 'square', 0.15, 0.2);
        this._playTone(600, 'square', 0.15, 0.2, 0.2);
        this._playTone(800, 'square', 0.15, 0.2, 0.4);
    }

    playMenuSelect() {
        this._playTone(440, 'sine', 0.08, 0.2);
        this._playTone(660, 'sine', 0.1, 0.2, 0.06);
    }

    playWaveComplete() {
        for (let i = 0; i < 5; i++) {
            this._playTone(300 + i * 100, 'sine', 0.15, 0.2, i * 0.1);
        }
    }

    playEMP() {
        this._playNoise(0.8, 0.4);
        this._playTone(2000, 'sine', 0.5, 0.15);
        this._playTone(100, 'sine', 0.8, 0.3);
    }

    playMIRVSplit() {
        this._playTone(600, 'sawtooth', 0.15, 0.15);
        this._playTone(300, 'sawtooth', 0.1, 0.1, 0.05);
    }

    playBaseRepair() {
        this._playTone(330, 'sine', 0.1, 0.15);
        this._playTone(440, 'sine', 0.1, 0.15, 0.1);
        this._playTone(550, 'sine', 0.15, 0.2, 0.2);
    }

    playGameOver() {
        for (let i = 0; i < 4; i++) {
            this._playTone(300 - i * 50, 'sawtooth', 0.3, 0.2, i * 0.25);
        }
        this._playNoise(1.0, 0.15, 0.3);
    }

    // Background music - ambient drone with arpeggios
    startMusic() {
        if (this.muted || this.musicPlaying) return;
        const ctx = this._ensureContext();
        this.musicPlaying = true;

        this.musicGain = ctx.createGain();
        this.musicGain.connect(ctx.destination);
        this.musicGain.gain.value = 0.06 * this.masterVolume;

        // Drone bass
        const drone = ctx.createOscillator();
        drone.type = 'sine';
        drone.frequency.value = 55;
        const droneGain = ctx.createGain();
        droneGain.gain.value = 0.5;
        drone.connect(droneGain);
        droneGain.connect(this.musicGain);
        drone.start();
        this._musicNodes.push(drone);

        // Second harmonic
        const drone2 = ctx.createOscillator();
        drone2.type = 'sine';
        drone2.frequency.value = 82.5;
        const drone2Gain = ctx.createGain();
        drone2Gain.gain.value = 0.3;
        drone2.connect(drone2Gain);
        drone2Gain.connect(this.musicGain);
        drone2.start();
        this._musicNodes.push(drone2);

        // Slow LFO on drone
        const lfo = ctx.createOscillator();
        lfo.type = 'sine';
        lfo.frequency.value = 0.15;
        const lfoGain = ctx.createGain();
        lfoGain.gain.value = 10;
        lfo.connect(lfoGain);
        lfoGain.connect(drone.frequency);
        lfo.start();
        this._musicNodes.push(lfo);

        // Arpeggio layer
        this._startArpeggio(ctx);
    }

    _startArpeggio(ctx) {
        const notes = [110, 131, 165, 196, 220, 196, 165, 131];
        let noteIndex = 0;

        const playNote = () => {
            if (!this.musicPlaying || this.muted) return;
            const osc = ctx.createOscillator();
            osc.type = 'triangle';
            osc.frequency.value = notes[noteIndex % notes.length];
            const gain = ctx.createGain();
            gain.gain.setValueAtTime(0.15, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);
            osc.connect(gain);
            gain.connect(this.musicGain);
            osc.start();
            osc.stop(ctx.currentTime + 0.8);
            noteIndex++;
            this._arpTimer = setTimeout(playNote, 800);
        };
        this._arpTimer = setTimeout(playNote, 2000);
    }

    stopMusic() {
        this.musicPlaying = false;
        if (this._arpTimer) clearTimeout(this._arpTimer);
        this._musicNodes.forEach(node => {
            try { node.stop(); } catch (e) {}
        });
        this._musicNodes = [];
        if (this.musicGain) {
            try { this.musicGain.disconnect(); } catch (e) {}
            this.musicGain = null;
        }
    }

    toggleMute() {
        this.muted = !this.muted;
        if (this.muted) {
            this.stopMusic();
        }
        return this.muted;
    }
}

const audioManager = new AudioManager();
