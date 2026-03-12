// ============================================================
// Simon — ColorPad Entity
// A colored quadrant arc that lights up and can be clicked.
// ============================================================

class ColorPad {
    /**
     * @param {Phaser.Scene} scene
     * @param {object} padConfig - one of SIMON_CONFIG.PADS entries
     * @param {number} startAngle - start angle in radians
     * @param {number} endAngle - end angle in radians
     */
    constructor(scene, padConfig, startAngle, endAngle) {
        this.scene = scene;
        this.config = padConfig;
        this.index = padConfig.index;
        this.normalColor = padConfig.normal;
        this.litColor = padConfig.lit;
        this.startAngle = startAngle;
        this.endAngle = endAngle;
        this.isLit = false;
        this.enabled = false;

        const cx = SIMON_CONFIG.CENTER_X;
        const cy = SIMON_CONFIG.CENTER_Y;
        const outer = SIMON_CONFIG.PAD_RADIUS;
        const inner = SIMON_CONFIG.PAD_INNER_RADIUS;

        // Create the arc shape using Phaser Graphics
        this.graphics = scene.add.graphics();
        this.draw(this.normalColor);

        // Create an invisible hit zone for click detection
        this.hitZone = scene.add.zone(cx, cy, outer * 2, outer * 2);
        this.hitZone.setInteractive(
            new Phaser.Geom.Circle(0, 0, outer),
            (hitArea, x, y) => {
                // Transform x,y relative to center
                const relX = x - outer;
                const relY = y - outer;
                const dist = Math.sqrt(relX * relX + relY * relY);
                if (dist < inner || dist > outer) return false;

                let angle = Math.atan2(relY, relX);
                if (angle < 0) angle += Math.PI * 2;

                // Handle wrap-around for angles crossing 0
                let start = this.startAngle;
                let end = this.endAngle;
                if (start < 0) start += Math.PI * 2;
                if (end < 0) end += Math.PI * 2;

                if (start < end) {
                    return angle >= start && angle <= end;
                } else {
                    return angle >= start || angle <= end;
                }
            }
        );

        this.hitZone.on('pointerdown', () => {
            if (this.enabled) {
                this.scene.events.emit('padPressed', this.index);
            }
        });

        // Draw key label on the pad
        const midAngle = (startAngle + endAngle) / 2;
        const labelRadius = (inner + outer) / 2;
        const labelX = cx + Math.cos(midAngle) * labelRadius;
        const labelY = cy + Math.sin(midAngle) * labelRadius;

        this.label = scene.add.text(labelX, labelY, padConfig.label, {
            fontFamily: 'Arial, sans-serif',
            fontSize: '28px',
            fontStyle: 'bold',
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 3,
        }).setOrigin(0.5).setAlpha(0.6).setDepth(2);
    }

    draw(color) {
        this.graphics.clear();
        this.graphics.fillStyle(color, 1);
        this.graphics.lineStyle(3, 0x111122, 1);

        const cx = SIMON_CONFIG.CENTER_X;
        const cy = SIMON_CONFIG.CENTER_Y;
        const outer = SIMON_CONFIG.PAD_RADIUS;
        const inner = SIMON_CONFIG.PAD_INNER_RADIUS;

        // Draw filled arc (quadrant)
        this.graphics.beginPath();

        // Outer arc
        this.graphics.arc(cx, cy, outer, this.startAngle, this.endAngle, false);
        // Line to inner arc end
        this.graphics.lineTo(
            cx + Math.cos(this.endAngle) * inner,
            cy + Math.sin(this.endAngle) * inner
        );
        // Inner arc (reverse)
        this.graphics.arc(cx, cy, inner, this.endAngle, this.startAngle, true);
        // Close back to outer arc start
        this.graphics.closePath();
        this.graphics.fillPath();
        this.graphics.strokePath();

        this.graphics.setDepth(1);
    }

    /**
     * Light up the pad (visual + audio).
     * @param {number} duration - ms to stay lit
     * @param {boolean} playSound - whether to play tone
     * @returns {Promise} resolves when flash completes
     */
    flash(duration = 400, playSound = true) {
        return new Promise(resolve => {
            this.isLit = true;
            this.draw(this.litColor);
            this.label.setAlpha(1);

            if (playSound) {
                audioManager.playTone(this.index, duration / 1000);
            }

            this.scene.time.delayedCall(duration, () => {
                this.isLit = false;
                this.draw(this.normalColor);
                this.label.setAlpha(0.6);
                resolve();
            });
        });
    }

    /**
     * Quick flash for player input feedback.
     */
    quickFlash() {
        this.draw(this.litColor);
        this.label.setAlpha(1);
        audioManager.playTone(this.index, 0.2);

        this.scene.time.delayedCall(200, () => {
            this.draw(this.normalColor);
            this.label.setAlpha(0.6);
        });
    }

    setEnabled(enabled) {
        this.enabled = enabled;
    }

    destroy() {
        this.graphics.destroy();
        this.hitZone.destroy();
        this.label.destroy();
    }
}
