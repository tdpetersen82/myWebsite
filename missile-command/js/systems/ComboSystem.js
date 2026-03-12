// ============================================================
// Missile Command — Combo System
// ============================================================

class ComboSystem {
    constructor() {
        this.count = 0;
        this.multiplier = 1;
        this.timer = 0;
        this.totalBonusPoints = 0;
        this.highestCombo = 0;
        this.displayTimer = 0;
        this.displayText = '';
        this.displayX = 0;
        this.displayY = 0;
        this.milestoneReached = false;
    }

    registerKill(x, y) {
        this.count++;
        this.timer = CONFIG.COMBO.WINDOW;
        this.displayX = x;
        this.displayY = y;

        if (this.count > this.highestCombo) {
            this.highestCombo = this.count;
        }

        // Check multiplier thresholds
        const prevMultiplier = this.multiplier;
        this.multiplier = 1;
        for (const threshold of CONFIG.COMBO.THRESHOLDS) {
            if (this.count >= threshold.count) {
                this.multiplier = threshold.multiplier;
            }
        }

        // Milestone animation
        if (this.multiplier > prevMultiplier) {
            this.milestoneReached = true;
            this.displayTimer = 1500;
            this.displayText = 'x' + this.multiplier + ' COMBO!';
        } else if (this.count > 1) {
            this.displayTimer = 800;
            this.displayText = this.count + ' HIT' + (this.count > 1 ? 'S' : '');
        }

        return this.multiplier;
    }

    getPoints(basePoints) {
        return basePoints * this.multiplier;
    }

    update(dt) {
        if (this.timer > 0) {
            this.timer -= dt * 1000;
            if (this.timer <= 0) {
                // Combo ended
                if (this.count >= 3) {
                    this.totalBonusPoints += this.count * this.multiplier * 10;
                }
                this.count = 0;
                this.multiplier = 1;
            }
        }

        if (this.displayTimer > 0) {
            this.displayTimer -= dt * 1000;
            this.displayY -= dt * 30; // Float upward
        }

        this.milestoneReached = false;
    }

    draw(graphics, scene) {
        if (this.displayTimer <= 0 || !this.displayText) return;

        const alpha = Helpers.clamp(this.displayTimer / 800, 0, 1);
        const colorIdx = Math.min(
            Math.floor(this.multiplier / 3),
            CONFIG.COLORS.COMBO_COLORS.length - 1
        );
        const colorStr = CONFIG.COLORS.COMBO_COLORS[colorIdx] || '#ffffff';

        // This will be drawn as Phaser text in the scene
        // Store the display state for the scene to render
        this.displayState = {
            text: this.displayText,
            x: this.displayX,
            y: this.displayY,
            alpha: alpha,
            color: colorStr,
            scale: this.multiplier > 1 ? 1.2 : 1.0,
        };
    }

    // HUD combo meter (drawn at fixed position)
    drawMeter(graphics, x, y, width) {
        if (this.count <= 0) return;

        // Background
        graphics.fillStyle(0x333333, 0.5);
        graphics.fillRect(x, y, width, 6);

        // Fill based on timer remaining
        const fill = this.timer / CONFIG.COMBO.WINDOW;
        const meterColor = this.multiplier >= 5 ? 0xff2d95 :
                          this.multiplier >= 3 ? 0xff9500 :
                          this.multiplier >= 2 ? 0xffdd57 : 0x44ff44;
        graphics.fillStyle(meterColor, 0.8);
        graphics.fillRect(x, y, width * fill, 6);

        // Border
        graphics.lineStyle(1, 0x666666, 0.5);
        graphics.strokeRect(x, y, width, 6);
    }

    reset() {
        this.count = 0;
        this.multiplier = 1;
        this.timer = 0;
        this.displayTimer = 0;
        this.totalBonusPoints = 0;
        this.highestCombo = 0;
    }
}
