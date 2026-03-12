// AudioManager.js — Web Audio API synthesized sounds

export class AudioManager {
    constructor() {
        this.ctx = null;
        this.enabled = true;
    }

    getCtx() {
        if (!this.ctx || this.ctx.state === 'closed') {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
        return this.ctx;
    }

    play(freq, type = 'square', duration = 0.1, volume = 0.15) {
        if (!this.enabled) return;
        try {
            const ctx = this.getCtx();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.type = type;
            osc.frequency.value = freq;
            gain.gain.setValueAtTime(volume, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
            osc.start();
            osc.stop(ctx.currentTime + duration);
        } catch (e) { /* silent fail */ }
    }

    towerShoot(towerType) {
        switch (towerType) {
            case 'laser':
                this.play(880, 'sawtooth', 0.05, 0.08);
                break;
            case 'pulse':
                this.play(220, 'sine', 0.2, 0.1);
                break;
            case 'sniper':
                this.play(1200, 'square', 0.08, 0.12);
                setTimeout(() => this.play(600, 'square', 0.06, 0.06), 30);
                break;
            case 'slow':
                this.play(300, 'sine', 0.15, 0.05);
                break;
        }
    }

    enemyHit() {
        this.play(400, 'square', 0.04, 0.06);
    }

    enemyDeath() {
        this.play(200, 'sawtooth', 0.15, 0.1);
        setTimeout(() => this.play(150, 'sawtooth', 0.1, 0.08), 50);
    }

    enemyReachEnd() {
        this.play(120, 'sine', 0.3, 0.15);
        setTimeout(() => this.play(80, 'sine', 0.3, 0.1), 100);
    }

    placeTower() {
        this.play(600, 'sine', 0.08, 0.12);
        setTimeout(() => this.play(800, 'sine', 0.06, 0.1), 60);
    }

    sellTower() {
        this.play(400, 'sine', 0.08, 0.1);
        setTimeout(() => this.play(300, 'sine', 0.06, 0.08), 60);
    }

    upgradeTower() {
        this.play(600, 'sine', 0.06, 0.1);
        setTimeout(() => this.play(800, 'sine', 0.06, 0.1), 60);
        setTimeout(() => this.play(1000, 'sine', 0.08, 0.12), 120);
    }

    waveStart() {
        this.play(440, 'square', 0.12, 0.12);
        setTimeout(() => this.play(550, 'square', 0.12, 0.12), 120);
        setTimeout(() => this.play(660, 'square', 0.15, 0.14), 240);
    }

    waveComplete() {
        this.play(660, 'sine', 0.12, 0.12);
        setTimeout(() => this.play(880, 'sine', 0.12, 0.12), 100);
        setTimeout(() => this.play(1100, 'sine', 0.2, 0.14), 200);
    }

    gameOver() {
        this.play(440, 'sawtooth', 0.3, 0.12);
        setTimeout(() => this.play(330, 'sawtooth', 0.3, 0.1), 200);
        setTimeout(() => this.play(220, 'sawtooth', 0.5, 0.08), 400);
    }

    victory() {
        const notes = [523, 659, 784, 1047];
        notes.forEach((freq, i) => {
            setTimeout(() => this.play(freq, 'sine', 0.2, 0.12), i * 150);
        });
    }

    buttonClick() {
        this.play(700, 'sine', 0.04, 0.08);
    }
}
