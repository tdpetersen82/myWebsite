class PowerUp {
    // Map CONFIG.POWERUPS keys to atlas frame prefixes
    static FRAME_MAP = {
        NITRO: 'nitro',
        MISSILE: 'missile',
        OIL_SLICK: 'oil_slick',
        SHIELD: 'shield',
        SPEED_BOOST: 'speed_boost',
        CASH: 'cash',
    };

    constructor(scene, id, type, x, y) {
        this.scene = scene;
        this.id = id;
        this.type = type;
        this.x = x;
        this.y = y;
        this.active = true;
        this.cooldownTimer = 0;
        this.bobOffset = Math.random() * Math.PI * 2;
        this.config = CONFIG.POWERUPS[type];

        this.useAtlas = scene.textures.exists('powerups');
        this.animFrame = 0;
        this.animTimer = 0;

        this.container = scene.add.container(x, y);
        this.container.setDepth(8);

        // Ground shadow
        this.shadowGfx = scene.add.graphics();
        this.container.add(this.shadowGfx);

        // Outer glow rings
        this.glowGfx = scene.add.graphics();
        this.container.add(this.glowGfx);

        if (this.useAtlas) {
            const framePrefix = PowerUp.FRAME_MAP[type];
            this.sprite = scene.add.sprite(0, 0, 'powerups', `${framePrefix}_0`);
            this.container.add(this.sprite);
        } else {
            // Fallback: procedural graphics
            this.gfx = scene.add.graphics();
            this.container.add(this.gfx);
        }

        // Sparkle effect
        this.sparkleGfx = scene.add.graphics();
        this.container.add(this.sparkleGfx);

        this._draw();
    }

    _darken(c, a) {
        return ((Math.max(0,((c>>16)&0xFF)*(1-a)))<<16)|((Math.max(0,((c>>8)&0xFF)*(1-a)))<<8)|Math.max(0,(c&0xFF)*(1-a));
    }
    _lighten(c, a) {
        return ((Math.min(255,((c>>16)&0xFF)+255*a))<<16)|((Math.min(255,((c>>8)&0xFF)+255*a))<<8)|Math.min(255,(c&0xFF)+255*a);
    }

    _draw() {
        this.glowGfx.clear();
        this.shadowGfx.clear();

        const color = this.config.color;
        const r = CONFIG.POWERUP_COLLECT_RADIUS;

        // Ground shadow
        this.shadowGfx.fillStyle(0x000000, 0.12);
        this.shadowGfx.fillEllipse(2, 8, r * 1.8, r * 0.8);

        // Outer glow rings (3 concentric)
        this.glowGfx.fillStyle(color, 0.04);
        this.glowGfx.fillCircle(0, 0, r + 18);
        this.glowGfx.fillStyle(color, 0.06);
        this.glowGfx.fillCircle(0, 0, r + 12);
        this.glowGfx.fillStyle(color, 0.1);
        this.glowGfx.fillCircle(0, 0, r + 6);

        if (!this.useAtlas) {
            this._drawProcedural();
        }
    }

    _drawProcedural() {
        const g = this.gfx;
        g.clear();

        const color = this.config.color;
        const r = CONFIG.POWERUP_COLLECT_RADIUS;

        // Base sphere (gradient effect - dark edge, bright center)
        g.fillStyle(this._darken(color, 0.5), 1);
        g.fillCircle(0, 0, r);
        g.fillStyle(color, 1);
        g.fillCircle(0, 0, r - 2);
        g.fillStyle(this._lighten(color, 0.15), 1);
        g.fillCircle(-1, -1, r - 4);
        // Specular highlight
        g.fillStyle(0xFFFFFF, 0.35);
        g.fillEllipse(-r * 0.25, -r * 0.3, r * 0.7, r * 0.5);

        // Border ring
        g.lineStyle(1.5, this._lighten(color, 0.3), 0.8);
        g.strokeCircle(0, 0, r);

        // Icon (with drop shadow)
        this._drawIcon(g, 1, 1, 0x000000, 0.3);  // shadow
        this._drawIcon(g, 0, 0, 0xFFFFFF, 0.95);  // main
    }

    _drawIcon(g, ox, oy, color, alpha) {
        switch (this.config.icon) {
            case 'flame':
                g.fillStyle(color === 0xFFFFFF ? 0xFFFF00 : color, alpha);
                g.fillTriangle(ox, oy - 10, ox - 6, oy + 5, ox + 6, oy + 5);
                g.fillStyle(color === 0xFFFFFF ? 0xFF6600 : color, alpha);
                g.fillTriangle(ox, oy - 5, ox - 3, oy + 5, ox + 3, oy + 5);
                break;
            case 'crosshair':
                g.lineStyle(2, color, alpha);
                g.strokeCircle(ox, oy, 7);
                g.beginPath();
                g.moveTo(ox - 10, oy); g.lineTo(ox + 10, oy);
                g.moveTo(ox, oy - 10); g.lineTo(ox, oy + 10);
                g.strokePath();
                g.fillStyle(color === 0xFFFFFF ? 0xFF3333 : color, alpha);
                g.fillCircle(ox, oy, 2);
                break;
            case 'drop':
                g.fillStyle(color === 0xFFFFFF ? 0x222222 : color, alpha);
                g.fillTriangle(ox, oy - 9, ox - 6, oy + 2, ox + 6, oy + 2);
                g.fillCircle(ox, oy + 3, 6);
                g.fillStyle(0xFFFFFF, alpha * 0.3);
                g.fillCircle(ox - 2, oy + 1, 2);
                break;
            case 'hexagon':
                g.lineStyle(2.5, color, alpha);
                g.beginPath();
                for (let i = 0; i < 6; i++) {
                    const a = (i / 6) * Math.PI * 2 - Math.PI / 6;
                    const hx = ox + Math.cos(a) * 9, hy = oy + Math.sin(a) * 9;
                    if (i === 0) g.moveTo(hx, hy); else g.lineTo(hx, hy);
                }
                g.closePath(); g.strokePath();
                g.fillStyle(color === 0xFFFFFF ? 0x33CCFF : color, alpha * 0.3);
                g.fillCircle(ox, oy, 6);
                break;
            case 'lightning':
                g.fillStyle(color === 0xFFFFFF ? 0xFFFF00 : color, alpha);
                g.beginPath();
                g.moveTo(ox + 3, oy - 11);
                g.lineTo(ox - 3, oy - 1);
                g.lineTo(ox + 1, oy - 1);
                g.lineTo(ox - 3, oy + 11);
                g.lineTo(ox + 3, oy + 1);
                g.lineTo(ox - 1, oy + 1);
                g.closePath(); g.fillPath();
                break;
            case 'coin':
                g.fillStyle(color === 0xFFFFFF ? 0xFFCC00 : color, alpha);
                g.fillCircle(ox, oy, 9);
                g.fillStyle(color === 0xFFFFFF ? 0xFFE066 : color, alpha);
                g.fillCircle(ox - 1, oy - 1, 7);
                g.fillStyle(color === 0xFFFFFF ? 0xCC9900 : color, alpha);
                g.fillRect(ox - 2, oy - 5, 4, 10);
                g.fillStyle(0xFFFFFF, alpha * 0.3);
                g.fillEllipse(ox - 3, oy - 3, 4, 3);
                break;
        }
    }

    update(time, delta) {
        if (!this.active) {
            this.container.setVisible(false);
            this.cooldownTimer -= delta / 1000;
            return;
        }
        this.container.setVisible(true);

        // Bob
        const bob = Math.sin(time / 1000 * CONFIG.POWERUP_BOB_SPEED + this.bobOffset) * CONFIG.POWERUP_BOB_AMOUNT;
        this.container.setY(this.y + bob);

        // Atlas frame animation (cycle through 4 frames at ~8 fps)
        if (this.useAtlas) {
            this.animTimer += delta;
            if (this.animTimer >= 125) {
                this.animTimer -= 125;
                this.animFrame = (this.animFrame + 1) % 4;
                const framePrefix = PowerUp.FRAME_MAP[this.type];
                this.sprite.setFrame(`${framePrefix}_${this.animFrame}`);
            }
        }

        // Rotating sparkles
        this.sparkleGfx.clear();
        const sparkleAngle = time / 400;
        for (let i = 0; i < 5; i++) {
            const a = sparkleAngle + (i / 5) * Math.PI * 2;
            const dist = 20 + Math.sin(time / 300 + i) * 3;
            const sx = Math.cos(a) * dist, sy = Math.sin(a) * dist;
            const brightness = 0.3 + Math.sin(time / 150 + i * 1.5) * 0.3;
            this.sparkleGfx.fillStyle(0xFFFFFF, brightness);
            this.sparkleGfx.fillCircle(sx, sy, 1.5);
            // Tiny tail
            this.sparkleGfx.fillStyle(0xFFFFFF, brightness * 0.3);
            const tailA = a - 0.3;
            this.sparkleGfx.fillCircle(Math.cos(tailA) * dist, Math.sin(tailA) * dist, 1);
        }

        // Pulse glow
        const pulse = 1 + Math.sin(time / 250) * 0.06;
        this.container.setScale(pulse);

        // Light beam upward (subtle)
        this.glowGfx.clear();
        const beamAlpha = 0.03 + Math.sin(time / 500) * 0.02;
        this.glowGfx.fillStyle(this.config.color, beamAlpha);
        this.glowGfx.fillCircle(0, 0, 28);
        this.glowGfx.fillStyle(this.config.color, beamAlpha * 1.5);
        this.glowGfx.fillCircle(0, 0, 20);
        this.glowGfx.fillStyle(this.config.color, beamAlpha * 2);
        this.glowGfx.fillCircle(0, 0, 14);
    }

    collect() {
        this.active = false;
        this.cooldownTimer = CONFIG.POWERUP_SPAWN_COOLDOWN;
        this.scene.tweens.add({
            targets: this.container,
            scaleX: 2.5, scaleY: 2.5, alpha: 0,
            duration: 350, ease: 'Cubic.easeOut',
            onComplete: () => {
                this.container.setVisible(false);
                this.container.setScale(1);
                this.container.setAlpha(1);
            }
        });
    }

    respawn() {
        this.active = true;
        this.container.setVisible(true);
        this.container.setScale(0);
        this.container.setAlpha(1);
        this.scene.tweens.add({
            targets: this.container,
            scaleX: 1, scaleY: 1,
            duration: 500, ease: 'Back.easeOut',
        });
    }

    destroy() { this.container.destroy(); }
}
