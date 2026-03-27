// Lunar Lander - Landing Pad Entity (Enhanced with animated beacons and glow)

class LandingPad {
    constructor(scene, x, y, width, multiplier) {
        this.scene = scene;
        this.x = x;
        this.y = y;
        this.width = width;
        this.multiplier = multiplier;
        this.graphics = null;
        this._gameObjects = [];

        this.color = multiplier === 1 ? CONFIG.COLORS.PAD_1X :
                     multiplier === 2 ? CONFIG.COLORS.PAD_2X :
                     CONFIG.COLORS.PAD_3X;

        this._proximityIntensity = 0;
        this._lastGlowSize = -1;
        this._lastGuideAlpha = -1;
        this._createBeacons();
    }

    _createBeacons() {
        const scene = this.scene;
        const vfx = CONFIG.VFX;
        const leftX = this.x - this.width / 2;
        const rightX = this.x + this.width / 2;

        // Beacon circles at pad edges
        this.beaconLeft = scene.add.circle(leftX, this.y - 2, 3, this.color, 0.9);
        this.beaconLeft.setDepth(3);
        this.beaconLeft.setBlendMode(Phaser.BlendModes.ADD);
        this._gameObjects.push(this.beaconLeft);

        this.beaconRight = scene.add.circle(rightX, this.y - 2, 3, this.color, 0.9);
        this.beaconRight.setDepth(3);
        this.beaconRight.setBlendMode(Phaser.BlendModes.ADD);
        this._gameObjects.push(this.beaconRight);

        // Soft glow circles behind beacons (no postFX)
        const glowL = scene.add.circle(leftX, this.y - 2, 8, this.color, 0.15);
        glowL.setDepth(2).setBlendMode(Phaser.BlendModes.ADD);
        this._gameObjects.push(glowL);
        const glowR = scene.add.circle(rightX, this.y - 2, 8, this.color, 0.15);
        glowR.setDepth(2).setBlendMode(Phaser.BlendModes.ADD);
        this._gameObjects.push(glowR);

        // Pulsing tween on beacons
        scene.tweens.add({
            targets: [this.beaconLeft, this.beaconRight],
            alpha: { from: 0.9, to: 0.2 },
            scale: { from: 1.0, to: 0.6 },
            duration: vfx.BEACON_PULSE_DURATION,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });

        // Guide light columns above each beacon
        this.guideLightsGraphics = scene.add.graphics();
        this.guideLightsGraphics.setDepth(2);
        this.guideLightsGraphics.setBlendMode(Phaser.BlendModes.ADD);
        this._gameObjects.push(this.guideLightsGraphics);
        this._drawGuideLights(0.3);

        // Multiplier label with glow
        const label = `${this.multiplier}X`;
        this.label = scene.add.text(this.x, this.y + 14, label, {
            fontSize: '11px',
            fontFamily: 'Courier New, monospace',
            color: Phaser.Display.Color.IntegerToColor(this.color).rgba,
            align: 'center'
        }).setOrigin(0.5, 0).setDepth(3);
        this._gameObjects.push(this.label);

    }

    _drawGuideLights(alpha) {
        const g = this.guideLightsGraphics;
        g.clear();

        const vfx = CONFIG.VFX;
        const leftX = this.x - this.width / 2;
        const rightX = this.x + this.width / 2;
        const segHeight = vfx.GUIDE_LIGHT_HEIGHT / vfx.GUIDE_LIGHT_SEGMENTS;

        for (let i = 0; i < vfx.GUIDE_LIGHT_SEGMENTS; i++) {
            const segAlpha = alpha * (1 - i / vfx.GUIDE_LIGHT_SEGMENTS) * 0.5;
            const y1 = this.y - 4 - i * segHeight;
            const y2 = y1 - segHeight * 0.5;

            g.lineStyle(1.5, this.color, segAlpha);
            g.beginPath();
            g.moveTo(leftX, y1);
            g.lineTo(leftX, y2);
            g.moveTo(rightX, y1);
            g.lineTo(rightX, y2);
            g.strokePath();
        }
    }

    draw(graphics) {
        // Draw the pad surface with glow effect
        // Wider glow stroke underneath
        graphics.lineStyle(6, this.color, 0.12);
        graphics.beginPath();
        graphics.moveTo(this.x - this.width / 2, this.y);
        graphics.lineTo(this.x + this.width / 2, this.y);
        graphics.strokePath();

        // Main pad surface
        graphics.lineStyle(3, this.color, 1);
        graphics.beginPath();
        graphics.moveTo(this.x - this.width / 2, this.y);
        graphics.lineTo(this.x + this.width / 2, this.y);
        graphics.strokePath();

        // Draw support legs
        graphics.lineStyle(1, this.color, 0.6);
        graphics.beginPath();
        graphics.moveTo(this.x - this.width / 2 + 4, this.y);
        graphics.lineTo(this.x - this.width / 2 + 8, this.y + 6);
        graphics.moveTo(this.x + this.width / 2 - 4, this.y);
        graphics.lineTo(this.x + this.width / 2 - 8, this.y + 6);
        graphics.strokePath();
    }

    // Update proximity intensity based on lander altitude
    updateProximity(altitude) {
        // Intensity increases as lander gets closer (0 at 300+, 1 at 0)
        this._proximityIntensity = Phaser.Math.Clamp(1 - altitude / 300, 0, 1);

        // Scale guide light alpha with proximity — only redraw if meaningfully changed
        const baseAlpha = 0.3 + this._proximityIntensity * 0.5;
        const quantizedAlpha = Math.round(baseAlpha * 10) / 10;
        if (quantizedAlpha !== this._lastGuideAlpha) {
            this._lastGuideAlpha = quantizedAlpha;
            this._drawGuideLights(baseAlpha);
        }

        // Beacon glow is set once in _createBeacons — no dynamic updates needed
    }

    containsX(x) {
        return x >= this.x - this.width / 2 && x <= this.x + this.width / 2;
    }

    destroy() {
        for (const obj of this._gameObjects) {
            if (obj && obj.destroy) obj.destroy();
        }
        this._gameObjects = [];
        if (this.label) {
            this.label.destroy();
            this.label = null;
        }
    }
}
