// Particles: emitter wrapper. Manages all particle effects in SimScene.
// Phaser 3.80 has a particle system (scene.add.particles).

class ParticleManager {
    constructor(scene) {
        this.scene = scene;
        this.smokeEmitter = null;
        this.dustEmitter = null;
        this.sparkEmitter = null;
        this.confettiEmitter = null;
        this.footstepEmitter = null;
        this._build();
    }

    _build() {
        const sc = this.scene;

        // Smoke — gray puffs rising from fire cells
        this.smokeEmitter = sc.add.particles(0, 0, 'puff', {
            speed: { min: 8, max: 22 },
            angle: { min: 250, max: 290 },          // mostly upward
            scale: { start: 1.2, end: 4.0 },
            alpha: { start: 0.55, end: 0 },
            tint: [0x666666, 0x4d4d4d, 0x808080],
            lifespan: { min: 1200, max: 2400 },
            quantity: 0,                            // emitParticleAt is called explicitly
            frequency: -1,                          // off until we trigger
        }).setDepth(15);

        // Dust — small puffs at ground level near jams
        this.dustEmitter = sc.add.particles(0, 0, 'puff', {
            speed: { min: 4, max: 10 },
            angle: { min: 0, max: 360 },
            scale: { start: 0.9, end: 0 },
            alpha: { start: 0.5, end: 0 },
            tint: 0xb09870,
            lifespan: { min: 500, max: 900 },
            frequency: -1,
        }).setDepth(8);

        // Sparks — orange specks where fire just spread
        this.sparkEmitter = sc.add.particles(0, 0, 'spark', {
            speed: { min: 20, max: 60 },
            angle: { min: 0, max: 360 },
            scale: { start: 1.5, end: 0 },
            alpha: { start: 1, end: 0 },
            tint: [0xff6b1a, 0xfff080, 0xffd066],
            lifespan: { min: 300, max: 600 },
            frequency: -1,
        }).setDepth(16);

        // Confetti — drops from the top on level clear
        this.confettiEmitter = sc.add.particles(0, 0, 'confetti', {
            speed: { min: 60, max: 140 },
            angle: { min: 70, max: 110 },           // downward fan
            scale: { start: 1, end: 1 },
            alpha: { start: 1, end: 0 },
            tint: [0x4ade80, 0xfbbf24, 0xa78bfa, 0x60a5fa, 0xef4444, 0xffffff],
            lifespan: { min: 2200, max: 3200 },
            rotate: { min: 0, max: 360 },
            gravityY: 200,
            frequency: -1,
        }).setDepth(40);

        // Footstep dust — tiny puff behind running agents
        this.footstepEmitter = sc.add.particles(0, 0, 'puff', {
            speed: { min: 1, max: 4 },
            angle: { min: 0, max: 360 },
            scale: { start: 0.4, end: 0 },
            alpha: { start: 0.3, end: 0 },
            tint: 0xa09080,
            lifespan: { min: 200, max: 350 },
            frequency: -1,
        }).setDepth(7);
    }

    emitSmokeAt(x, y, count = 1) {
        if (this.smokeEmitter) this.smokeEmitter.emitParticleAt(x, y - 4, count);
    }

    emitDustAt(x, y, count = 2) {
        if (this.dustEmitter) this.dustEmitter.emitParticleAt(x, y, count);
    }

    emitSparksAt(x, y, count = 6) {
        if (this.sparkEmitter) this.sparkEmitter.emitParticleAt(x, y, count);
    }

    emitFootstep(x, y) {
        if (this.footstepEmitter) this.footstepEmitter.emitParticleAt(x, y + 6, 1);
    }

    // Confetti rain across the canvas — call once on level clear.
    emitConfettiBurst(canvasW, canvasH) {
        if (!this.confettiEmitter) return;
        for (let i = 0; i < 80; i++) {
            const x = Math.random() * canvasW;
            this.confettiEmitter.emitParticleAt(x, -10, 1);
        }
    }

    destroy() {
        for (const e of [this.smokeEmitter, this.dustEmitter, this.sparkEmitter,
                         this.confettiEmitter, this.footstepEmitter]) {
            if (e) e.destroy();
        }
    }
}
