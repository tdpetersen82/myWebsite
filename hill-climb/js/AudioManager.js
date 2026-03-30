class AudioManager {
    constructor(scene) {
        this.scene = scene;
        this.muted = false;
        this.sounds = {};
        this.engineSound = null;
        this.engineRevSound = null;
        this.isRevving = false;
    }

    init() {
        try { this._doInit(); } catch (e) {
            console.warn('AudioManager: init failed, running without sound', e.message);
        }
    }

    _doInit() {
        const cache = this.scene.cache.audio;
        const keys = ['coin', 'fuel_pickup', 'crash', 'flip_bonus', 'land', 'low_fuel', 'click', 'game_over'];
        keys.forEach(key => {
            if (cache.exists(key)) {
                this.sounds[key] = this.scene.sound.add(key, { volume: 0.5 });
            }
        });
        if (cache.exists('engine_idle')) {
            this.engineSound = this.scene.sound.add('engine_idle', { volume: 0.2, loop: true });
        }
        if (cache.exists('engine_rev')) {
            this.engineRevSound = this.scene.sound.add('engine_rev', { volume: 0.3, loop: true });
        }
    }

    play(key) {
        if (this.muted || !this.sounds[key]) return;
        try { this.sounds[key].play(); } catch (e) {}
    }

    startEngine() {
        if (this.muted || !this.engineSound) return;
        try { if (!this.engineSound.isPlaying) this.engineSound.play(); } catch (e) {}
    }

    setRevving(revving) {
        this.isRevving = revving;
        if (this.muted || !this.engineSound) return;
        try {
            if (revving) {
                this.engineSound.setVolume(0.08);
                if (this.engineRevSound && !this.engineRevSound.isPlaying) this.engineRevSound.play();
            } else {
                this.engineSound.setVolume(0.2);
                if (this.engineRevSound) this.engineRevSound.stop();
            }
        } catch (e) {}
    }

    stopEngine() {
        try {
            if (this.engineSound && this.engineSound.isPlaying) this.engineSound.stop();
            if (this.engineRevSound && this.engineRevSound.isPlaying) this.engineRevSound.stop();
        } catch (e) {}
    }

    toggleMute() {
        this.muted = !this.muted;
        this.scene.sound.mute = this.muted;
        return this.muted;
    }
}
