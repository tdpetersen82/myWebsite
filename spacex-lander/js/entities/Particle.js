// SpaceX Lander - VFX Manager (Phaser Native Particle Emitters)

class VFXManager {
    constructor(scene) {
        this.scene = scene;
        this._generateTextures();
        this._createEmitters();
    }

    _generateTextures() {
        const scene = this.scene;

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

        if (!scene.textures.exists('vfx_rect')) {
            const g = scene.make.graphics({ add: false });
            g.fillStyle(0xffffff, 1);
            g.fillRect(0, 0, 8, 4);
            g.generateTexture('vfx_rect', 8, 4);
            g.destroy();
        }

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

        // --- ENTRY BURN: 3-layer exhaust (wide, orange) ---
        this.entryCore = scene.add.particles(0, 0, 'vfx_circle', {
            speed: { min: vfx.ENTRY_CORE.speed[0], max: vfx.ENTRY_CORE.speed[1] },
            lifespan: vfx.ENTRY_CORE.life,
            scale: { start: vfx.ENTRY_CORE.scale[0], end: vfx.ENTRY_CORE.scale[1] },
            alpha: { start: 1, end: 0 },
            tint: vfx.ENTRY_CORE.tint,
            blendMode: Phaser.BlendModes.ADD,
            frequency: 1000 / vfx.ENTRY_CORE.rate,
            gravityY: 15,
            emitting: false,
            angle: { min: 80, max: 100 }
        }).setDepth(6);

        this.entryFlame = scene.add.particles(0, 0, 'vfx_circle', {
            speed: { min: vfx.ENTRY_FLAME.speed[0], max: vfx.ENTRY_FLAME.speed[1] },
            lifespan: vfx.ENTRY_FLAME.life,
            scale: { start: vfx.ENTRY_FLAME.scale[0], end: vfx.ENTRY_FLAME.scale[1] },
            alpha: { start: 0.9, end: 0 },
            tint: vfx.ENTRY_FLAME.tint,
            blendMode: Phaser.BlendModes.ADD,
            frequency: 1000 / vfx.ENTRY_FLAME.rate,
            gravityY: 10,
            emitting: false,
            angle: { min: 65, max: 115 }
        }).setDepth(5);

        this.entrySmoke = scene.add.particles(0, 0, 'vfx_soft', {
            speed: { min: vfx.ENTRY_SMOKE.speed[0], max: vfx.ENTRY_SMOKE.speed[1] },
            lifespan: vfx.ENTRY_SMOKE.life,
            scale: { start: vfx.ENTRY_SMOKE.scale[0], end: vfx.ENTRY_SMOKE.scale[1] },
            alpha: { start: vfx.ENTRY_SMOKE.alpha[0], end: vfx.ENTRY_SMOKE.alpha[1] },
            tint: vfx.ENTRY_SMOKE.tint,
            blendMode: Phaser.BlendModes.NORMAL,
            frequency: 1000 / vfx.ENTRY_SMOKE.rate,
            gravityY: -8,
            emitting: false,
            angle: { min: 55, max: 125 }
        }).setDepth(4);

        // --- LANDING BURN: 3-layer exhaust (narrow, blue-white) ---
        this.landCore = scene.add.particles(0, 0, 'vfx_circle', {
            speed: { min: vfx.LAND_CORE.speed[0], max: vfx.LAND_CORE.speed[1] },
            lifespan: vfx.LAND_CORE.life,
            scale: { start: vfx.LAND_CORE.scale[0], end: vfx.LAND_CORE.scale[1] },
            alpha: { start: 1, end: 0 },
            tint: vfx.LAND_CORE.tint,
            blendMode: Phaser.BlendModes.ADD,
            frequency: 1000 / vfx.LAND_CORE.rate,
            gravityY: 10,
            emitting: false,
            angle: { min: 82, max: 98 }
        }).setDepth(6);

        this.landFlame = scene.add.particles(0, 0, 'vfx_circle', {
            speed: { min: vfx.LAND_FLAME.speed[0], max: vfx.LAND_FLAME.speed[1] },
            lifespan: vfx.LAND_FLAME.life,
            scale: { start: vfx.LAND_FLAME.scale[0], end: vfx.LAND_FLAME.scale[1] },
            alpha: { start: 0.8, end: 0 },
            tint: vfx.LAND_FLAME.tint,
            blendMode: Phaser.BlendModes.ADD,
            frequency: 1000 / vfx.LAND_FLAME.rate,
            gravityY: 8,
            emitting: false,
            angle: { min: 75, max: 105 }
        }).setDepth(5);

        this.landSmoke = scene.add.particles(0, 0, 'vfx_soft', {
            speed: { min: vfx.LAND_SMOKE.speed[0], max: vfx.LAND_SMOKE.speed[1] },
            lifespan: vfx.LAND_SMOKE.life,
            scale: { start: vfx.LAND_SMOKE.scale[0], end: vfx.LAND_SMOKE.scale[1] },
            alpha: { start: vfx.LAND_SMOKE.alpha[0], end: vfx.LAND_SMOKE.alpha[1] },
            tint: vfx.LAND_SMOKE.tint,
            blendMode: Phaser.BlendModes.NORMAL,
            frequency: 1000 / vfx.LAND_SMOKE.rate,
            gravityY: -5,
            emitting: false,
            angle: { min: 65, max: 115 }
        }).setDepth(4);

        // --- RE-ENTRY GLOW ---
        this.reentryGlow = scene.add.particles(0, 0, 'vfx_soft', {
            speed: { min: vfx.REENTRY_GLOW_SPEED[0], max: vfx.REENTRY_GLOW_SPEED[1] },
            lifespan: vfx.REENTRY_GLOW_LIFE,
            scale: { start: 1.5, end: 0 },
            alpha: { start: 0.6, end: 0 },
            tint: CONFIG.COLORS.REENTRY_GLOW,
            blendMode: Phaser.BlendModes.ADD,
            frequency: 1000 / vfx.REENTRY_GLOW_RATE,
            emitting: false,
            angle: { min: -100, max: -80 }
        }).setDepth(3);

        // --- GRID FIN PUFFS ---
        this.finPuff = scene.add.particles(0, 0, 'vfx_circle', {
            speed: { min: vfx.FIN_PUFF_SPEED[0], max: vfx.FIN_PUFF_SPEED[1] },
            lifespan: vfx.FIN_PUFF_LIFE,
            scale: { start: 0.3, end: 0 },
            alpha: { start: 0.5, end: 0 },
            tint: 0xaaddff,
            blendMode: Phaser.BlendModes.ADD,
            frequency: -1,
            quantity: vfx.FIN_PUFF_QUANTITY,
            angle: { min: 0, max: 360 }
        }).setDepth(5);

        // --- EXPLOSION ---
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
        }).setDepth(7);

        this.explosionFlash = scene.add.particles(0, 0, 'vfx_flash', {
            speed: 0,
            lifespan: vfx.EXPLOSION_FLASH_LIFE,
            scale: { start: 4, end: 0 },
            alpha: { start: 1, end: 0 },
            tint: 0xffffff,
            blendMode: Phaser.BlendModes.ADD,
            frequency: -1,
            quantity: 1
        }).setDepth(8);

        this.explosionDebris = scene.add.particles(0, 0, 'vfx_rect', {
            speed: { min: vfx.EXPLOSION_DEBRIS_SPEED[0], max: vfx.EXPLOSION_DEBRIS_SPEED[1] },
            lifespan: vfx.EXPLOSION_DEBRIS_LIFE,
            scale: { start: 1, end: 0.3 },
            alpha: { start: 1, end: 0 },
            tint: [0xaaaaaa, 0x888888, 0xcccccc, 0xeeeeee],
            rotate: { min: 0, max: 360 },
            blendMode: Phaser.BlendModes.NORMAL,
            frequency: -1,
            quantity: vfx.EXPLOSION_DEBRIS_COUNT,
            gravityY: 60,
            angle: { min: 0, max: 360 }
        }).setDepth(6);

        // --- OCEAN SPRAY ---
        this.oceanSpray = scene.add.particles(0, 0, 'vfx_soft', {
            speed: { min: vfx.SPRAY_SPEED[0], max: vfx.SPRAY_SPEED[1] },
            lifespan: vfx.SPRAY_LIFE,
            scale: { start: 0.6, end: 1.5 },
            alpha: { start: 0.4, end: 0 },
            tint: [0xaaccee, 0xbbddff, 0xffffff],
            blendMode: Phaser.BlendModes.NORMAL,
            frequency: -1,
            quantity: vfx.SPRAY_COUNT,
            gravityY: 25,
            angle: { min: -160, max: -20 }
        }).setDepth(5);

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
        }).setDepth(7);
    }

    // --- THRUST CONTROL ---
    startEntryBurn(x, y, angleDeg) {
        const emitAngle = angleDeg + 90;
        [this.entryCore, this.entryFlame].forEach(e => {
            e.setPosition(x, y);
            e.ops.angle.start = emitAngle - 20;
            e.ops.angle.end = emitAngle + 20;
            if (!e.emitting) e.start();
        });
        this.entrySmoke.setPosition(x, y);
        this.entrySmoke.ops.angle.start = emitAngle - 35;
        this.entrySmoke.ops.angle.end = emitAngle + 35;
        if (!this.entrySmoke.emitting) this.entrySmoke.start();
    }

    stopEntryBurn() {
        [this.entryCore, this.entryFlame, this.entrySmoke].forEach(e => {
            if (e.emitting) e.stop();
        });
    }

    startLandingBurn(x, y, angleDeg) {
        const emitAngle = angleDeg + 90;
        [this.landCore, this.landFlame].forEach(e => {
            e.setPosition(x, y);
            e.ops.angle.start = emitAngle - 10;
            e.ops.angle.end = emitAngle + 10;
            if (!e.emitting) e.start();
        });
        this.landSmoke.setPosition(x, y);
        this.landSmoke.ops.angle.start = emitAngle - 25;
        this.landSmoke.ops.angle.end = emitAngle + 25;
        if (!this.landSmoke.emitting) this.landSmoke.start();
    }

    stopLandingBurn() {
        [this.landCore, this.landFlame, this.landSmoke].forEach(e => {
            if (e.emitting) e.stop();
        });
    }

    stopAllThrust() {
        this.stopEntryBurn();
        this.stopLandingBurn();
    }

    // --- RE-ENTRY GLOW ---
    startReentryGlow(x, y, angleDeg) {
        const emitAngle = angleDeg - 90; // Trail behind (upward from rocket perspective)
        this.reentryGlow.setPosition(x, y);
        this.reentryGlow.ops.angle.start = emitAngle - 15;
        this.reentryGlow.ops.angle.end = emitAngle + 15;
        if (!this.reentryGlow.emitting) this.reentryGlow.start();
    }

    stopReentryGlow() {
        if (this.reentryGlow.emitting) this.reentryGlow.stop();
    }

    // --- FIN PUFFS ---
    emitFinPuff(x, y) {
        this.finPuff.emitParticleAt(x, y, CONFIG.VFX.FIN_PUFF_QUANTITY);
    }

    // --- EXPLOSION (multi-stage) ---
    emitExplosion(x, y) {
        // Primary blast
        this.explosionFlash.emitParticleAt(x, y, 2);
        this.explosionFireball.emitParticleAt(x, y, CONFIG.VFX.EXPLOSION_FIREBALL_COUNT);
        this.explosionDebris.emitParticleAt(x, y, CONFIG.VFX.EXPLOSION_DEBRIS_COUNT);
        this._createShockwave(x, y);

        // Secondary explosions at offset positions
        this.scene.time.delayedCall(150, () => {
            const ox = x + (Math.random() - 0.5) * 60;
            const oy = y + (Math.random() - 0.5) * 30;
            this.explosionFireball.emitParticleAt(ox, oy, 20);
            this.explosionFlash.emitParticleAt(ox, oy, 1);
            this._createShockwave(ox, oy);
        });

        this.scene.time.delayedCall(350, () => {
            const ox = x + (Math.random() - 0.5) * 80;
            const oy = y + (Math.random() - 0.5) * 40;
            this.explosionFireball.emitParticleAt(ox, oy, 15);
            this.explosionDebris.emitParticleAt(ox, oy, 10);
        });

        // Rising smoke column
        this._createSmokeColumn(x, y);
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
            alpha: 0,
            duration: vfx.EXPLOSION_SHOCKWAVE_DURATION,
            ease: 'Quad.easeOut',
            onUpdate: () => ring.setStrokeStyle(3 * (1 - ring.alpha * 0.7), 0xffffff, ring.alpha * 0.8),
            onComplete: () => ring.destroy()
        });

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
            onUpdate: () => ring2.setStrokeStyle(2 * (1 - ring2.alpha), 0xff8800, ring2.alpha * 0.5),
            onComplete: () => ring2.destroy()
        });
    }

    // --- OCEAN SPRAY ---
    emitOceanSpray(x, y) {
        this.oceanSpray.emitParticleAt(x, y, CONFIG.VFX.SPRAY_COUNT);
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

    // --- SMOKE COLUMN (post-explosion) ---
    _createSmokeColumn(x, y) {
        for (let i = 0; i < 8; i++) {
            this.scene.time.delayedCall(i * 80, () => {
                const sx = x + (Math.random() - 0.5) * 30;
                this.entrySmoke.emitParticleAt(sx, y, 3);
            });
        }
    }

    // --- DECK BLAST (exhaust hitting ship surface) ---
    emitDeckBlast(x, y, intensity) {
        const count = Math.ceil(intensity * 4);
        for (let i = 0; i < count; i++) {
            const px = x + (Math.random() - 0.5) * 40;
            // Emit sideways using the smoke emitter for a quick spray
            this.landSmoke.emitParticleAt(px, y - 2, 1);
        }
        // Additional bright spray particles
        if (intensity > 0.3) {
            this.oceanSpray.emitParticleAt(x, y, Math.ceil(intensity * 3));
        }
    }

    // --- SONIC BOOM (Mach cone visual) ---
    emitSonicBoom(x, y) {
        const vfx = CONFIG.VFX;

        // Mach cone — expanding V-shape using two angled lines
        const cone = this.scene.add.graphics().setDepth(9);
        cone.lineStyle(3, 0xffffff, 0.7);

        let progress = 0;
        const duration = vfx.SONIC_BOOM_DURATION;
        const radius = vfx.SONIC_BOOM_RADIUS;

        const timer = this.scene.time.addEvent({
            delay: 16,
            repeat: Math.floor(duration / 16),
            callback: () => {
                progress += 16 / duration;
                const r = radius * progress;
                const alpha = 0.7 * (1 - progress);

                cone.clear();
                cone.lineStyle(3 * (1 - progress * 0.5), 0xffffff, alpha);
                cone.beginPath();
                cone.moveTo(x - r * 0.7, y - r * 0.5);
                cone.lineTo(x, y);
                cone.lineTo(x + r * 0.7, y - r * 0.5);
                cone.strokePath();

                // Inner cone
                cone.lineStyle(2 * (1 - progress), 0xaaddff, alpha * 0.5);
                cone.beginPath();
                cone.moveTo(x - r * 0.4, y - r * 0.3);
                cone.lineTo(x, y);
                cone.lineTo(x + r * 0.4, y - r * 0.3);
                cone.strokePath();

                if (progress >= 1) {
                    cone.destroy();
                }
            }
        });

        // Also emit a burst of white particles
        this.explosionFlash.emitParticleAt(x, y, 1);
    }

    // --- CLEANUP ---
    clear() {
        const all = [
            this.entryCore, this.entryFlame, this.entrySmoke,
            this.landCore, this.landFlame, this.landSmoke,
            this.reentryGlow, this.finPuff,
            this.explosionFireball, this.explosionFlash, this.explosionDebris,
            this.oceanSpray, this.fireworks
        ];
        all.forEach(e => { if (e) { e.stop(); e.killAll(); } });
    }

    destroy() {
        const all = [
            this.entryCore, this.entryFlame, this.entrySmoke,
            this.landCore, this.landFlame, this.landSmoke,
            this.reentryGlow, this.finPuff,
            this.explosionFireball, this.explosionFlash, this.explosionDebris,
            this.oceanSpray, this.fireworks
        ];
        all.forEach(e => { if (e) e.destroy(); });
    }
}
