class AudioManager {
    constructor() {
        this.ctx = null;
        this.masterGain = null;
        this.sfxGain = null;
        this.musicGain = null;
        this.engineGain = null;
        this.muted = false;

        // Audio buffer cache (WAV files decoded into AudioBuffers)
        this.buffers = {};
        this.buffersLoading = false;
        this.buffersLoaded = false;

        // Engine state (two looping sources with crossfade)
        this.engineIdleSource = null;
        this.engineHighSource = null;
        this.engineIdleGain = null;
        this.engineHighGain = null;
        this.engineRunning = false;

        // Drift screech state (looping)
        this.driftSource = null;
        this.driftGain = null;
        this.drifting = false;

        // Music state (kept as oscillator-based sequencer)
        this.musicPlaying = false;
        this.musicInterval = null;
        this.musicStep = 0;

        // Base path for WAV files
        this.audioBasePath = 'assets/audio/';

        // All WAV keys we want to load
        this.audioKeys = [
            'engine_idle', 'engine_high',
            'collision_heavy', 'collision_light',
            'nitro_boost', 'powerup_collect',
            'missile_fire', 'missile_explode',
            'oil_splat', 'shield_activate',
            'spinout', 'countdown_beep', 'countdown_go',
            'lap_complete', 'race_finish',
            'button_click', 'wrong_way',
            'jump_launch', 'jump_land',
            'drift_screech', 'tire_screech',
        ];
    }

    // ---- Lazy AudioContext init ----

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

            // Start loading WAV buffers as soon as context is created
            this._loadBuffers();
        }
        if (this.ctx.state === 'suspended') this.ctx.resume();
        return this.ctx;
    }

    // ---- WAV buffer loading ----

    async _loadBuffers() {
        if (this.buffersLoading || this.buffersLoaded) return;
        this.buffersLoading = true;

        // Try to grab decoded audio data from Phaser's cache first
        const phaserCache = this._getPhaserAudioCache();

        const loadPromises = this.audioKeys.map(async (key) => {
            try {
                // Option 1: Phaser cache has the decoded audio data
                if (phaserCache && phaserCache.has(key)) {
                    const entry = phaserCache.get(key);
                    // Phaser stores the decoded AudioBuffer directly
                    if (entry && entry instanceof AudioBuffer) {
                        this.buffers[key] = entry;
                        return;
                    }
                    // Some Phaser versions store { data: AudioBuffer }
                    if (entry && entry.data instanceof AudioBuffer) {
                        this.buffers[key] = entry.data;
                        return;
                    }
                }

                // Option 2: Fetch and decode the WAV file ourselves
                const response = await fetch(`${this.audioBasePath}${key}.wav`);
                if (!response.ok) return;
                const arrayBuffer = await response.arrayBuffer();
                const audioBuffer = await this.ctx.decodeAudioData(arrayBuffer);
                this.buffers[key] = audioBuffer;
            } catch (e) {
                // Silently skip files that fail to load
            }
        });

        await Promise.all(loadPromises);
        this.buffersLoaded = true;
        this.buffersLoading = false;
    }

    _getPhaserAudioCache() {
        try {
            if (window.game && window.game.cache && window.game.cache.audio) {
                return window.game.cache.audio;
            }
        } catch (e) {}
        return null;
    }

    // ---- One-shot WAV playback ----

    _playBuffer(key, volume, destination) {
        const ctx = this._getContext();
        const buffer = this.buffers[key];
        if (!buffer) {
            // Buffer not loaded yet; fall through silently
            return null;
        }

        const source = ctx.createBufferSource();
        source.buffer = buffer;

        const gainNode = ctx.createGain();
        gainNode.gain.value = volume !== undefined ? volume : 0.5;

        source.connect(gainNode);
        gainNode.connect(destination || this.sfxGain);
        source.start(0);
        return source;
    }

    // ---- Oscillator fallbacks for sounds without WAVs ----

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

    // ---- Public API: Mute ----

    toggleMute() {
        this.muted = !this.muted;
        if (this.masterGain) {
            this.masterGain.gain.value = this.muted ? 0 : 0.5;
        }
        return this.muted;
    }

    // ---- Public API: Engine Sound (crossfade between idle and high WAVs) ----

    startEngine() {
        const ctx = this._getContext();
        if (this.engineRunning) return;

        const idleBuf = this.buffers['engine_idle'];
        const highBuf = this.buffers['engine_high'];

        if (!idleBuf || !highBuf) {
            // WAVs not loaded yet; fall back to oscillator engine
            this._startEngineOscillator();
            return;
        }

        // Idle loop
        this.engineIdleGain = ctx.createGain();
        this.engineIdleGain.gain.value = 1.0;
        this.engineIdleGain.connect(this.engineGain);

        this.engineIdleSource = ctx.createBufferSource();
        this.engineIdleSource.buffer = idleBuf;
        this.engineIdleSource.loop = true;
        this.engineIdleSource.connect(this.engineIdleGain);
        this.engineIdleSource.start(0);

        // High-rev loop
        this.engineHighGain = ctx.createGain();
        this.engineHighGain.gain.value = 0.0;
        this.engineHighGain.connect(this.engineGain);

        this.engineHighSource = ctx.createBufferSource();
        this.engineHighSource.buffer = highBuf;
        this.engineHighSource.loop = true;
        this.engineHighSource.connect(this.engineHighGain);
        this.engineHighSource.start(0);

        this.engineGain.gain.value = 0.12;
        this.engineRunning = true;
        this._engineUsingOscillator = false;
    }

    updateEngine(speedRatio) {
        if (!this.engineRunning) return;
        const r = Math.max(0, Math.min(1, Math.abs(speedRatio)));

        if (this._engineUsingOscillator) {
            // Oscillator fallback path
            const freq = 80 + r * 120;
            if (this._engineOsc1) this._engineOsc1.frequency.value = freq;
            if (this._engineOsc2) this._engineOsc2.frequency.value = freq + 2 + r * 5;
            if (this._engineFilter) this._engineFilter.frequency.value = 200 + r * 1800;
            this.engineGain.gain.value = 0.04 + r * 0.08;
            return;
        }

        // Crossfade between idle and high based on speedRatio
        const ctx = this.ctx;
        const now = ctx.currentTime;
        const rampTime = 0.05;

        if (this.engineIdleGain) {
            this.engineIdleGain.gain.setTargetAtTime(1.0 - r, now, rampTime);
        }
        if (this.engineHighGain) {
            this.engineHighGain.gain.setTargetAtTime(r, now, rampTime);
        }

        // Slight volume boost at higher speeds
        this.engineGain.gain.setTargetAtTime(0.08 + r * 0.06, now, rampTime);
    }

    stopEngine() {
        if (!this.engineRunning) return;

        if (this._engineUsingOscillator) {
            try {
                if (this._engineOsc1) this._engineOsc1.stop();
                if (this._engineOsc2) this._engineOsc2.stop();
            } catch (e) {}
            this._engineOsc1 = null;
            this._engineOsc2 = null;
            this._engineFilter = null;
            this._engineUsingOscillator = false;
        } else {
            try {
                if (this.engineIdleSource) this.engineIdleSource.stop();
                if (this.engineHighSource) this.engineHighSource.stop();
            } catch (e) {}
            this.engineIdleSource = null;
            this.engineHighSource = null;
            this.engineIdleGain = null;
            this.engineHighGain = null;
        }

        this.engineRunning = false;
    }

    // Oscillator fallback for engine (used when WAVs not yet loaded)
    _startEngineOscillator() {
        const ctx = this._getContext();

        this._engineFilter = ctx.createBiquadFilter();
        this._engineFilter.type = 'lowpass';
        this._engineFilter.frequency.value = 200;
        this._engineFilter.Q.value = 2;
        this._engineFilter.connect(this.engineGain);

        this._engineOsc1 = ctx.createOscillator();
        this._engineOsc1.type = 'sawtooth';
        this._engineOsc1.frequency.value = 80;
        this._engineOsc1.connect(this._engineFilter);
        this._engineOsc1.start();

        this._engineOsc2 = ctx.createOscillator();
        this._engineOsc2.type = 'sawtooth';
        this._engineOsc2.frequency.value = 82;
        this._engineOsc2.connect(this._engineFilter);
        this._engineOsc2.start();

        this.engineRunning = true;
        this._engineUsingOscillator = true;
    }

    // ---- Public API: Sound Effects ----

    collision(intensity) {
        const vol = Math.min(0.8, (intensity || 1) * 0.4);
        if (this.buffers['collision_heavy']) {
            this._playBuffer('collision_heavy', vol);
        } else {
            // Oscillator fallback
            const fallbackVol = Math.min(0.5, (intensity || 1) * 0.15);
            this._playNoise(0.15, fallbackVol, 800);
            this._playTone(60, 0.1, 'sine', fallbackVol * 0.8);
        }
    }

    nitroBoost() {
        if (this.buffers['nitro_boost']) {
            this._playBuffer('nitro_boost', 0.5);
        } else {
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
    }

    powerUpCollect() {
        if (this.buffers['powerup_collect']) {
            this._playBuffer('powerup_collect', 0.5);
        } else {
            const notes = [523, 659, 784];
            notes.forEach((freq, i) => {
                setTimeout(() => this._playTone(freq, 0.15, 'sine', 0.25), i * 60);
            });
        }
    }

    missileFire() {
        if (this.buffers['missile_fire']) {
            this._playBuffer('missile_fire', 0.5);
        } else {
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
    }

    missileExplode() {
        if (this.buffers['missile_explode']) {
            this._playBuffer('missile_explode', 0.6);
        } else {
            this._playNoise(0.4, 0.3, 500);
            this._playTone(40, 0.3, 'sine', 0.4);
            this._playNoise(0.2, 0.15, 2000);
        }
    }

    oilSlickDrop() {
        if (this.buffers['oil_splat']) {
            this._playBuffer('oil_splat', 0.4);
        } else {
            this._playNoise(0.1, 0.1, 400);
        }
    }

    spinout() {
        if (this.buffers['spinout']) {
            this._playBuffer('spinout', 0.5);
        } else {
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
    }

    countdown(n) {
        if (n > 0 && this.buffers['countdown_beep']) {
            this._playBuffer('countdown_beep', 0.6);
        } else if (n === 0 && this.buffers['countdown_go']) {
            this._playBuffer('countdown_go', 0.7);
        } else {
            // Oscillator fallback
            const freq = n > 0 ? 440 : 880;
            const dur = n > 0 ? 0.1 : 0.25;
            this._playTone(freq, dur, 'sine', 0.4);
        }
    }

    lapComplete() {
        if (this.buffers['lap_complete']) {
            this._playBuffer('lap_complete', 0.5);
        } else {
            const notes = [440, 554, 659, 880];
            notes.forEach((freq, i) => {
                setTimeout(() => this._playTone(freq, 0.1, 'sine', 0.2), i * 50);
            });
        }
    }

    raceFinish() {
        if (this.buffers['race_finish']) {
            this._playBuffer('race_finish', 0.6);
        } else {
            const notes = [523, 587, 659, 698, 784, 880];
            notes.forEach((freq, i) => {
                setTimeout(() => this._playTone(freq, 0.2, 'sine', 0.3), i * 100);
            });
        }
    }

    crowdCheer() {
        // No dedicated WAV; use oscillator-based noise
        this._playNoise(2.0, 0.12, 1200);
        setTimeout(() => this._playNoise(1.5, 0.08, 1500), 200);
    }

    buttonClick() {
        if (this.buffers['button_click']) {
            this._playBuffer('button_click', 0.3);
        } else {
            this._playTone(600, 0.05, 'sine', 0.15);
        }
    }

    playerJoin() {
        // No dedicated WAV; use oscillator arpeggio
        this._playTone(440, 0.08, 'sine', 0.15);
        setTimeout(() => this._playTone(554, 0.08, 'sine', 0.15), 80);
    }

    playerLeave() {
        // No dedicated WAV; use oscillator arpeggio (descending)
        this._playTone(554, 0.08, 'sine', 0.15);
        setTimeout(() => this._playTone(440, 0.08, 'sine', 0.15), 80);
    }

    // ---- Public API: New methods ----

    jumpLaunch() {
        if (this.buffers['jump_launch']) {
            this._playBuffer('jump_launch', 0.5);
        } else {
            this._playTone(300, 0.15, 'sine', 0.2);
        }
    }

    jumpLand() {
        if (this.buffers['jump_land']) {
            this._playBuffer('jump_land', 0.5);
        } else {
            this._playTone(100, 0.2, 'sine', 0.25);
            this._playNoise(0.1, 0.15, 600);
        }
    }

    driftScreech() {
        // Start a looping drift screech; call stopDriftScreech() or just
        // call driftScreech() again (it's idempotent while drifting)
        if (this.drifting) return;
        const ctx = this._getContext();
        const buffer = this.buffers['drift_screech'];

        if (!buffer) {
            // Oscillator fallback: short tire noise
            this._playNoise(0.3, 0.1, 1500);
            return;
        }

        this.driftGain = ctx.createGain();
        this.driftGain.gain.value = 0.35;
        this.driftGain.connect(this.sfxGain);

        this.driftSource = ctx.createBufferSource();
        this.driftSource.buffer = buffer;
        this.driftSource.loop = true;
        this.driftSource.connect(this.driftGain);
        this.driftSource.start(0);
        this.drifting = true;
    }

    stopDriftScreech() {
        if (!this.drifting) return;
        try {
            if (this.driftSource) this.driftSource.stop();
        } catch (e) {}
        this.driftSource = null;
        this.driftGain = null;
        this.drifting = false;
    }

    // ---- Public API: Music (retro oscillator sequencer, kept as-is) ----

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
