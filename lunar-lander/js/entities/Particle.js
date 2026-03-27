// Lunar Lander - VFX Manager (Phaser Native Particle Emitters)
// Replaces the old manual ParticleSystem with full Phaser 3.80 particle capabilities

class VFXManager {
    constructor(scene) {
        this.scene = scene;
        this._generateTextures();
        this._createEmitters();
        this.shockwaves = [];
    }

    _generateTextures() {
        const scene = this.scene;

        // Circle particle texture (bright center, soft edge)
        if (!scene.textures.exists('vfx_circle')) {
            const g = scene.make.graphics({ add: false });
            g.fillStyle(0xffffff, 1);
            g.fillCircle(6, 6, 6);
            g.fillStyle(0xffffff, 0.5);
            g.fillCircle(6, 6, 4);
            g.fillStyle(0xffffff, 1);
            g.fillCircle(6, 6, 2);
            g.generateTexture('vfx_circle', 12, 12);
            g.destroy();
        }

        // Soft glow texture (for smoke and dust)
        if (!scene.textures.exists('vfx_soft')) {
            const g = scene.make.graphics({ add: false });
            g.fillStyle(0xffffff, 0.15);
            g.fillCircle(12, 12, 12);
            g.fillStyle(0xffffff, 0.25);
            g.fillCircle(12, 12, 8);
            g.fillStyle(0xffffff, 0.4);
            g.fillCircle(12, 12, 4);
            g.generateTexture('vfx_soft', 24, 24);
            g.destroy();
        }

        // Rectangle debris texture
        if (!scene.textures.exists('vfx_rect')) {
            const g = scene.make.graphics({ add: false });
            g.fillStyle(0xffffff, 1);
            g.fillRect(0, 0, 8, 4);
            g.generateTexture('vfx_rect', 8, 4);
            g.destroy();
        }

        // Large flash texture
        if (!scene.textures.exists('vfx_flash')) {
            const g = scene.make.graphics({ add: false });
            g.fillStyle(0xffffff, 0.3);
            g.fillCircle(24, 24, 24);
            g.fillStyle(0xffffff, 0.5);
            g.fillCircle(24, 24, 16);
            g.fillStyle(0xffffff, 0.8);
            g.fillCircle(24, 24, 8);
            g.fillStyle(0xffffff, 1);
            g.fillCircle(24, 24, 3);
            g.generateTexture('vfx_flash', 48, 48);
            g.destroy();
        }
    }

    _createEmitters() {
        const scene = this.scene;
        const vfx = CONFIG.VFX;

        // --- THRUST: 3-layer system ---
        // Core (white-hot center)
        this.thrustCore = scene.add.particles(0, 0, 'vfx_circle', {
            speed: { min: vfx.THRUST_CORE.speed[0], max: vfx.THRUST_CORE.speed[1] },
            lifespan: vfx.THRUST_CORE.life,
            scale: { start: vfx.THRUST_CORE.scale[0], end: vfx.THRUST_CORE.scale[1] },
            alpha: { start: 1, end: 0 },
            tint: vfx.THRUST_CORE.tint,
            blendMode: Phaser.BlendModes.ADD,
            frequency: 1000 / vfx.THRUST_CORE.rate,
            gravityY: 15,
            emitting: false,
            angle: { min: 80, max: 100 }
        });
        this.thrustCore.setDepth(6);

        // Flame (orange glow)
        this.thrustFlame = scene.add.particles(0, 0, 'vfx_circle', {
            speed: { min: vfx.THRUST_FLAME.speed[0], max: vfx.THRUST_FLAME.speed[1] },
            lifespan: vfx.THRUST_FLAME.life,
            scale: { start: vfx.THRUST_FLAME.scale[0], end: vfx.THRUST_FLAME.scale[1] },
            alpha: { start: 0.9, end: 0 },
            tint: vfx.THRUST_FLAME.tint,
            blendMode: Phaser.BlendModes.ADD,
            frequency: 1000 / vfx.THRUST_FLAME.rate,
            gravityY: 10,
            emitting: false,
            angle: { min: 70, max: 110 }
        });
        this.thrustFlame.setDepth(5);

        // Smoke trail
        this.thrustSmoke = scene.add.particles(0, 0, 'vfx_soft', {
            speed: { min: vfx.THRUST_SMOKE.speed[0], max: vfx.THRUST_SMOKE.speed[1] },
            lifespan: vfx.THRUST_SMOKE.life,
            scale: { start: vfx.THRUST_SMOKE.scale[0], end: vfx.THRUST_SMOKE.scale[1] },
            alpha: { start: vfx.THRUST_SMOKE.alpha[0], end: vfx.THRUST_SMOKE.alpha[1] },
            tint: vfx.THRUST_SMOKE.tint,
            blendMode: Phaser.BlendModes.NORMAL,
            frequency: 1000 / vfx.THRUST_SMOKE.rate,
            gravityY: -8,
            emitting: false,
            angle: { min: 60, max: 120 }
        });
        this.thrustSmoke.setDepth(4);

        // --- RCS PUFFS ---
        this.rcsLeft = scene.add.particles(0, 0, 'vfx_circle', {
            speed: { min: vfx.RCS_SPEED[0], max: vfx.RCS_SPEED[1] },
            lifespan: vfx.RCS_LIFE,
            scale: { start: vfx.RCS_SCALE[0], end: vfx.RCS_SCALE[1] },
            alpha: { start: 0.7, end: 0 },
            tint: CONFIG.COLORS.RCS_PUFF,
            blendMode: Phaser.BlendModes.ADD,
            frequency: -1,
            quantity: vfx.RCS_QUANTITY,
            angle: { min: 0, max: 360 }
        });
        this.rcsLeft.setDepth(5);

        this.rcsRight = scene.add.particles(0, 0, 'vfx_circle', {
            speed: { min: vfx.RCS_SPEED[0], max: vfx.RCS_SPEED[1] },
            lifespan: vfx.RCS_LIFE,
            scale: { start: vfx.RCS_SCALE[0], end: vfx.RCS_SCALE[1] },
            alpha: { start: 0.7, end: 0 },
            tint: CONFIG.COLORS.RCS_PUFF,
            blendMode: Phaser.BlendModes.ADD,
            frequency: -1,
            quantity: vfx.RCS_QUANTITY,
            angle: { min: 0, max: 360 }
        });
        this.rcsRight.setDepth(5);

        // --- EXPLOSION FIREBALL ---
        this.explosionFireball = scene.add.particles(0, 0, 'vfx_circle', {
            speed: { min: vfx.EXPLOSION_FIREBALL_SPEED[0], max: vfx.EXPLOSION_FIREBALL_SPEED[1] },
            lifespan: vfx.EXPLOSION_FIREBALL_LIFE,
            scale: { start: 1.8, end: 0 },
            alpha: { start: 1, end: 0 },
            tint: CONFIG.COLORS.EXPLOSION,
            blendMode: Phaser.BlendModes.ADD,
            frequency: -1,
            quantity: vfx.EXPLOSION_FIREBALL_COUNT,
            gravityY: 40,
            angle: { min: 0, max: 360 }
        });
        this.explosionFireball.setDepth(7);

        // --- EXPLOSION FLASH ---
        this.explosionFlash = scene.add.particles(0, 0, 'vfx_flash', {
            speed: 0,
            lifespan: vfx.EXPLOSION_FLASH_LIFE,
            scale: { start: 4, end: 0 },
            alpha: { start: 1, end: 0 },
            tint: 0xffffff,
            blendMode: Phaser.BlendModes.ADD,
            frequency: -1,
            quantity: 1
        });
        this.explosionFlash.setDepth(8);

        // --- EXPLOSION DEBRIS ---
        this.explosionDebris = scene.add.particles(0, 0, 'vfx_rect', {
            speed: { min: vfx.EXPLOSION_DEBRIS_SPEED[0], max: vfx.EXPLOSION_DEBRIS_SPEED[1] },
            lifespan: vfx.EXPLOSION_DEBRIS_LIFE,
            scale: { start: 1, end: 0.3 },
            alpha: { start: 1, end: 0 },
            tint: [0xaaaaaa, 0x888888, 0xcccccc],
            rotate: { min: 0, max: 360 },
            blendMode: Phaser.BlendModes.NORMAL,
            frequency: -1,
            quantity: vfx.EXPLOSION_DEBRIS_COUNT,
            gravityY: 60,
            angle: { min: 0, max: 360 }
        });
        this.explosionDebris.setDepth(6);

        // --- LANDING DUST ---
        this.landingDust = scene.add.particles(0, 0, 'vfx_soft', {
            speed: { min: vfx.LANDING_DUST_SPEED[0], max: vfx.LANDING_DUST_SPEED[1] },
            lifespan: vfx.LANDING_DUST_LIFE,
            scale: { start: 0.5, end: 1.8 },
            alpha: { start: 0.35, end: 0 },
            tint: 0x999999,
            blendMode: Phaser.BlendModes.NORMAL,
            frequency: -1,
            quantity: vfx.LANDING_DUST_COUNT,
            gravityY: 12,
            angle: { min: -170, max: -10 }
        });
        this.landingDust.setDepth(5);

        // --- FIREWORKS ---
        this.fireworks = scene.add.particles(0, 0, 'vfx_circle', {
            speed: { min: vfx.FIREWORK_SPEED[0], max: vfx.FIREWORK_SPEED[1] },
            lifespan: vfx.FIREWORK_LIFE,
            scale: { start: 0.7, end: 0 },
            alpha: { start: 1, end: 0 },
            tint: vfx.FIREWORK_COLORS,
            blendMode: Phaser.BlendModes.ADD,
            frequency: -1,
            quantity: vfx.FIREWORK_PARTICLES,
            gravityY: 35,
            angle: { min: 0, max: 360 }
        });
        this.fireworks.setDepth(7);
    }

    // --- THRUST CONTROL ---
    startThrust(x, y, angleDeg) {
        const emitAngle = angleDeg + 90; // opposite of thrust direction

        // Position all thrust emitters at nozzle and update emission angle range
        [this.thrustCore, this.thrustFlame].forEach(emitter => {
            emitter.setPosition(x, y);
            emitter.ops.angle.start = emitAngle - 15;
            emitter.ops.angle.end = emitAngle + 15;
            if (!emitter.emitting) emitter.start();
        });

        // Wider smoke spread
        this.thrustSmoke.setPosition(x, y);
        this.thrustSmoke.ops.angle.start = emitAngle - 30;
        this.thrustSmoke.ops.angle.end = emitAngle + 30;
        if (!this.thrustSmoke.emitting) this.thrustSmoke.start();
    }

    stopThrust() {
        [this.thrustCore, this.thrustFlame, this.thrustSmoke].forEach(emitter => {
            if (emitter.emitting) emitter.stop();
        });
    }

    // --- RCS PUFFS ---
    emitRCS(x, y, side) {
        const emitter = side === 'left' ? this.rcsLeft : this.rcsRight;
        emitter.emitParticleAt(x, y, CONFIG.VFX.RCS_QUANTITY);
    }

    // --- EXPLOSION ---
    emitExplosion(x, y) {
        this.explosionFlash.emitParticleAt(x, y, 1);
        this.explosionFireball.emitParticleAt(x, y, CONFIG.VFX.EXPLOSION_FIREBALL_COUNT);
        this.explosionDebris.emitParticleAt(x, y, CONFIG.VFX.EXPLOSION_DEBRIS_COUNT);
        this._createShockwave(x, y);
    }

    _createShockwave(x, y) {
        const vfx = CONFIG.VFX;
        const ring = this.scene.add.circle(x, y, 5, 0xffffff, 0);
        ring.setStrokeStyle(3, 0xffffff, 0.8);
        ring.setBlendMode(Phaser.BlendModes.ADD);
        ring.setDepth(8);

        this.scene.tweens.add({
            targets: ring,
            radius: vfx.EXPLOSION_SHOCKWAVE_RADIUS,
            scaleX: 1,
            scaleY: 1,
            alpha: 0,
            duration: vfx.EXPLOSION_SHOCKWAVE_DURATION,
            ease: 'Quad.easeOut',
            onUpdate: () => {
                ring.setStrokeStyle(3 * (1 - ring.alpha * 0.7), 0xffffff, ring.alpha * 0.8);
            },
            onComplete: () => ring.destroy()
        });

        // Secondary ring, slower
        const ring2 = this.scene.add.circle(x, y, 5, 0xff8800, 0);
        ring2.setStrokeStyle(2, 0xff8800, 0.5);
        ring2.setBlendMode(Phaser.BlendModes.ADD);
        ring2.setDepth(8);

        this.scene.tweens.add({
            targets: ring2,
            radius: vfx.EXPLOSION_SHOCKWAVE_RADIUS * 0.7,
            alpha: 0,
            duration: vfx.EXPLOSION_SHOCKWAVE_DURATION * 0.8,
            delay: 50,
            ease: 'Quad.easeOut',
            onUpdate: () => {
                ring2.setStrokeStyle(2 * (1 - ring2.alpha), 0xff8800, ring2.alpha * 0.5);
            },
            onComplete: () => ring2.destroy()
        });
    }

    // --- LANDING DUST ---
    emitLandingDust(x, y) {
        this.landingDust.emitParticleAt(x, y, CONFIG.VFX.LANDING_DUST_COUNT);
    }

    // --- FIREWORKS ---
    emitFireworks(x, y) {
        const vfx = CONFIG.VFX;
        for (let i = 0; i < vfx.FIREWORK_BURSTS; i++) {
            this.scene.time.delayedCall(i * 250, () => {
                const fx = x + (Math.random() - 0.5) * 120;
                const fy = y - 20 - Math.random() * 80;
                this.fireworks.emitParticleAt(fx, fy, vfx.FIREWORK_PARTICLES);
            });
        }
    }

    // --- CLEANUP ---
    clear() {
        [this.thrustCore, this.thrustFlame, this.thrustSmoke,
         this.rcsLeft, this.rcsRight,
         this.explosionFireball, this.explosionFlash, this.explosionDebris,
         this.landingDust, this.fireworks
        ].forEach(e => {
            if (e) { e.stop(); e.killAll(); }
        });
    }

    destroy() {
        [this.thrustCore, this.thrustFlame, this.thrustSmoke,
         this.rcsLeft, this.rcsRight,
         this.explosionFireball, this.explosionFlash, this.explosionDebris,
         this.landingDust, this.fireworks
        ].forEach(e => {
            if (e) e.destroy();
        });
    }
}

// Keep backward-compatible name for index.html script tag
const ParticleSystem = VFXManager;
