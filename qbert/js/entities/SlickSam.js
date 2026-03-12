// ============================================================
// Q*bert — Slick & Sam Entities
// Green (Slick) and purple (Sam) enemies that descend the
// pyramid reverting cube colors
// ============================================================

class SlickSam {
    constructor(scene, pyramid, type) {
        this.scene = scene;
        this.pyramid = pyramid;
        this.graphics = scene.add.graphics();
        this.type = type; // 'slick' or 'sam'

        // Grid position
        this.row = 0;
        this.col = 0;

        // Screen position
        this.x = 0;
        this.y = 0;

        // State
        this.active = false;
        this.isJumping = false;
        this.jumpArc = 0;
        this.moveTimer = null;
    }

    spawn() {
        this.active = true;
        this.isJumping = false;
        this.jumpArc = 0;
        this.row = 0;
        this.col = 0;

        const pos = this.pyramid.getCubeTopCenter(0, 0);
        this.x = pos.x;
        this.y = pos.y - 60;

        // Animate dropping onto first cube
        this.isJumping = true;
        this.scene.tweens.add({
            targets: this,
            y: pos.y,
            duration: 400,
            ease: 'Bounce.easeOut',
            onComplete: () => {
                this.isJumping = false;
                this._scheduleMove();
            }
        });
    }

    _scheduleMove() {
        if (!this.active) return;

        const interval = this.scene.levelConfig ?
            this.scene.levelConfig.slickSamSpeed : CONFIG.SLICK_SAM_JUMP_INTERVAL;

        this.moveTimer = this.scene.time.delayedCall(interval, () => {
            if (!this.active) return;
            this._move();
        });
    }

    _move() {
        if (!this.active || this.isJumping) return;

        // Always move down; Slick prefers down-left, Sam prefers down-right
        let dCol;
        if (this.type === 'slick') {
            dCol = Math.random() < 0.7 ? 0 : 1;
        } else {
            dCol = Math.random() < 0.7 ? 1 : 0;
        }

        const newRow = this.row + 1;
        const newCol = this.col + dCol;

        // If off the bottom, disappear
        if (newRow >= this.pyramid.rows) {
            this.kill();
            return;
        }

        if (!this.pyramid.isValidPosition(newRow, newCol)) {
            // Try other direction
            const altCol = dCol === 0 ? 1 : 0;
            if (this.pyramid.isValidPosition(newRow, this.col + altCol)) {
                this._animateJump(newRow, this.col + altCol);
            } else {
                this.kill();
            }
            return;
        }

        this._animateJump(newRow, newCol);
    }

    _animateJump(targetRow, targetCol) {
        this.isJumping = true;
        const endPos = this.pyramid.getCubeTopCenter(targetRow, targetCol);

        this.scene.tweens.add({
            targets: this,
            x: endPos.x,
            y: endPos.y,
            duration: CONFIG.ENEMY_JUMP_DURATION,
            ease: 'Quad.easeInOut',
            onUpdate: (tween) => {
                this.jumpArc = Math.sin(tween.progress * Math.PI) * -25;
            },
            onComplete: () => {
                this.row = targetRow;
                this.col = targetCol;
                this.isJumping = false;
                this.jumpArc = 0;

                // Revert the cube color
                const reverted = this.pyramid.revertCube(this.row, this.col);
                if (reverted && this.scene.audio) {
                    this.scene.audio.playRevertColor();
                }

                // Check if fell off bottom
                if (this.row >= this.pyramid.rows - 1) {
                    // Will disappear on next move
                }

                this._scheduleMove();
            }
        });
    }

    // Check if Q*bert caught this enemy (scores points)
    checkCollision(qbert) {
        if (!this.active || this.isJumping || qbert.isJumping) return false;
        return this.row === qbert.row && this.col === qbert.col;
    }

    kill() {
        this.active = false;
        if (this.moveTimer) {
            this.moveTimer.remove(false);
            this.moveTimer = null;
        }
    }

    draw() {
        this.graphics.clear();
        if (!this.active) return;

        const drawY = this.y + (this.jumpArc || 0);
        const g = this.graphics;

        const bodyColor = this.type === 'slick' ? 0x00cc44 : 0xcc44ff;
        const hatColor = this.type === 'slick' ? 0x008833 : 0x9922cc;

        // Body
        g.fillStyle(bodyColor, 1);
        g.fillEllipse(this.x, drawY - 2, 16, 20);

        // Sunglasses / cool look
        g.fillStyle(0x000000, 1);
        g.fillRect(this.x - 9, drawY - 10, 18, 5);

        // Highlight on glasses
        g.fillStyle(0x4444ff, 0.5);
        g.fillRect(this.x - 7, drawY - 9, 5, 3);
        g.fillRect(this.x + 2, drawY - 9, 5, 3);

        // Small hat/tuft
        g.fillStyle(hatColor, 1);
        g.fillTriangle(
            this.x - 5, drawY - 14,
            this.x + 5, drawY - 14,
            this.x, drawY - 22
        );

        // Feet
        g.fillStyle(bodyColor, 1);
        g.fillCircle(this.x - 5, drawY + 8, 4);
        g.fillCircle(this.x + 5, drawY + 8, 4);
    }

    destroy() {
        this.kill();
        if (this.graphics) this.graphics.destroy();
    }
}
