// Lunar Lander - Landing Pad Entity

class LandingPad {
    constructor(scene, x, y, width, multiplier) {
        this.scene = scene;
        this.x = x;
        this.y = y;
        this.width = width;
        this.multiplier = multiplier;
        this.graphics = null;

        this.color = multiplier === 1 ? CONFIG.COLORS.PAD_1X :
                     multiplier === 2 ? CONFIG.COLORS.PAD_2X :
                     CONFIG.COLORS.PAD_3X;
    }

    draw(graphics) {
        // Draw the pad surface
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

        // Draw multiplier label
        const label = `${this.multiplier}X`;
        // Create text if not yet created
        if (!this.label) {
            this.label = this.scene.add.text(this.x, this.y + 14, label, {
                fontSize: '11px',
                fontFamily: 'Courier New, monospace',
                color: Phaser.Display.Color.IntegerToColor(this.color).rgba,
                align: 'center'
            }).setOrigin(0.5, 0);
            this.label.setDepth(3);
        }

        // Blinking indicators on pad edges
        const blink = Math.sin(Date.now() / 300) > 0;
        if (blink) {
            graphics.fillStyle(this.color, 0.9);
            graphics.fillCircle(this.x - this.width / 2, this.y, 2);
            graphics.fillCircle(this.x + this.width / 2, this.y, 2);
        }
    }

    // Check if a point is within the pad horizontally
    containsX(x) {
        return x >= this.x - this.width / 2 && x <= this.x + this.width / 2;
    }

    destroy() {
        if (this.label) {
            this.label.destroy();
            this.label = null;
        }
    }
}
