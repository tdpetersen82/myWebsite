class Projectile {
    constructor(scene, type, x, y, angle, ownerId) {
        this.scene = scene;
        this.type = type; // 'missile' or 'oilSlick'
        this.x = x;
        this.y = y;
        this.angle = angle;
        this.ownerId = ownerId;
        this.id = type + '_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4);

        this.useAtlas = scene.textures.exists('particles');

        this.container = scene.add.container(x, y);
        this.container.setDepth(9);

        if (this.useAtlas) {
            if (type === 'missile') {
                this.sprite = scene.add.sprite(0, 0, 'particles', 'missile');
                this.container.add(this.sprite);
                this.trailTimer = 0;
            } else {
                this.sprite = scene.add.sprite(0, 0, 'particles', 'oil_slick');
                this.container.add(this.sprite);
            }
        } else {
            // Fallback: procedural graphics
            this.gfx = scene.add.graphics();
            this.container.add(this.gfx);

            if (type === 'missile') {
                this._drawMissile();
                this.trailTimer = 0;
            } else {
                this._drawOilSlick();
            }
        }
    }

    _drawMissile() {
        const g = this.gfx;
        g.clear();

        // Missile body
        g.fillStyle(0xCC0000, 1);
        g.fillRect(-8, -3, 16, 6);

        // Nose
        g.fillStyle(0xFF3333, 1);
        g.fillTriangle(8, -3, 8, 3, 14, 0);

        // Fins
        g.fillStyle(0x880000, 1);
        g.fillTriangle(-8, -3, -8, -7, -4, -3);
        g.fillTriangle(-8, 3, -8, 7, -4, 3);

        // Exhaust glow
        g.fillStyle(0xFF8800, 0.6);
        g.fillCircle(-10, 0, 3);
    }

    _drawOilSlick() {
        const g = this.gfx;
        g.clear();

        // Oil puddle
        g.fillStyle(0x111111, 0.8);
        g.fillEllipse(0, 0, CONFIG.OIL_SLICK_RADIUS * 2, CONFIG.OIL_SLICK_RADIUS * 1.6);

        // Oil sheen
        g.fillStyle(0x333366, 0.3);
        g.fillEllipse(-3, -2, CONFIG.OIL_SLICK_RADIUS * 1.2, CONFIG.OIL_SLICK_RADIUS * 0.8);

        g.fillStyle(0x224422, 0.2);
        g.fillEllipse(4, 3, CONFIG.OIL_SLICK_RADIUS, CONFIG.OIL_SLICK_RADIUS * 0.6);
    }

    updatePosition(x, y, angle) {
        this.x = x;
        this.y = y;
        this.angle = angle;
        this.container.setPosition(x, y);

        if (this.type === 'missile') {
            this.container.setRotation(angle);
        }
    }

    update(time, delta) {
        this.container.setPosition(this.x, this.y);

        if (this.type === 'missile') {
            this.container.setRotation(this.angle);

            // Trail glow
            this.trailTimer += delta;
            if (this.trailTimer > 30) {
                this.trailTimer = 0;
                // Emit would be handled by the scene's particle emitter
            }
        } else {
            // Oil slick shimmer
            const shimmer = 0.7 + Math.sin(time / 300) * 0.1;
            this.container.setAlpha(shimmer);
        }
    }

    explode(particleEmitter) {
        if (particleEmitter) {
            particleEmitter.emit('EXPLOSION', this.x, this.y);
        }

        // Flash effect
        const flash = this.scene.add.graphics();
        flash.setDepth(20);
        flash.fillStyle(0xFFFFFF, 0.4);
        flash.fillCircle(this.x, this.y, 40);

        this.scene.tweens.add({
            targets: flash,
            alpha: 0,
            scaleX: 2,
            scaleY: 2,
            duration: 200,
            onComplete: () => flash.destroy(),
        });

        this.destroy();
    }

    destroy() {
        this.container.destroy();
    }
}
