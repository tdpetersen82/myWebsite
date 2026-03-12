// ============================================================
// Q*bert — Coily Enemy Entity
// Purple snake: starts as red ball falling down, transforms at
// bottom row, then chases Q*bert
// ============================================================

class Coily {
    constructor(scene, pyramid) {
        this.scene = scene;
        this.pyramid = pyramid;
        this.graphics = scene.add.graphics();

        // Grid position
        this.row = -1;
        this.col = 0;

        // Screen position
        this.x = 0;
        this.y = 0;

        // State
        this.active = false;
        this.isBall = true;       // starts as ball, transforms at bottom
        this.isJumping = false;
        this.jumpArc = 0;
        this.chaseTimer = null;
    }

    spawn() {
        this.active = true;
        this.isBall = true;
        this.isJumping = false;
        this.row = 0;
        this.col = 0;
        this.jumpArc = 0;

        const pos = this.pyramid.getCubeTopCenter(0, 0);
        this.x = pos.x;
        this.y = pos.y - 60; // start above

        // Animate dropping onto first cube
        this.isJumping = true;
        this.scene.tweens.add({
            targets: this,
            y: pos.y,
            duration: 400,
            ease: 'Bounce.easeOut',
            onComplete: () => {
                this.isJumping = false;
                this._startBallDescent();
            }
        });
    }

    _startBallDescent() {
        // Ball phase: bounce down randomly
        this._scheduleBallJump();
    }

    _scheduleBallJump() {
        if (!this.active || !this.isBall) return;

        this.chaseTimer = this.scene.time.delayedCall(800, () => {
            if (!this.active || !this.isBall) return;
            this._ballJump();
        });
    }

    _ballJump() {
        if (!this.active || this.isJumping) return;

        // Move down-left or down-right randomly
        const dCol = Math.random() < 0.5 ? 0 : 1;
        const newRow = this.row + 1;
        const newCol = this.col + dCol;

        if (!this.pyramid.isValidPosition(newRow, newCol)) {
            // Try the other direction
            const altCol = dCol === 0 ? 1 : 0;
            const altNewCol = this.col + altCol;
            if (this.pyramid.isValidPosition(newRow, altNewCol)) {
                this._animateJump(newRow, altNewCol, () => {
                    this._checkTransform();
                });
            }
            return;
        }

        this._animateJump(newRow, newCol, () => {
            this._checkTransform();
        });
    }

    _checkTransform() {
        if (this.row >= this.pyramid.rows - 1) {
            // Transform into snake!
            this.isBall = false;
            this._startChasing();
        } else {
            this._scheduleBallJump();
        }
    }

    _startChasing() {
        this._scheduleChaseJump();
    }

    _scheduleChaseJump() {
        if (!this.active || this.isBall) return;

        const interval = this.scene.levelConfig ? this.scene.levelConfig.coilySpeed : CONFIG.COILY_CHASE_INTERVAL;
        this.chaseTimer = this.scene.time.delayedCall(interval, () => {
            if (!this.active) return;
            this._chaseJump();
        });
    }

    _chaseJump() {
        if (!this.active || this.isJumping) return;

        const qbert = this.scene.qbert;
        if (!qbert || !qbert.isAlive) {
            this._scheduleChaseJump();
            return;
        }

        // Determine direction toward Q*bert
        let dRow = 0;
        let dCol = 0;

        if (qbert.row < this.row) {
            // Move up
            dRow = -1;
            dCol = (qbert.col <= this.col) ? -1 : 0;
        } else if (qbert.row > this.row) {
            // Move down
            dRow = 1;
            dCol = (qbert.col > this.col) ? 1 : 0;
        } else {
            // Same row, move toward
            if (qbert.col < this.col) {
                dRow = -1; dCol = -1;
            } else if (qbert.col > this.col) {
                dRow = 1; dCol = 1;
            } else {
                // Same position, small random move
                dRow = Math.random() < 0.5 ? 1 : -1;
                dCol = dRow === 1 ? (Math.random() < 0.5 ? 0 : 1) : (Math.random() < 0.5 ? 0 : -1);
            }
        }

        const newRow = this.row + dRow;
        const newCol = this.col + dCol;

        // If invalid, Coily falls off (can happen if lured to edge)
        if (!this.pyramid.isValidPosition(newRow, newCol)) {
            this._fallOff(dRow, dCol);
            return;
        }

        if (this.scene.audio) this.scene.audio.playCoilyBounce();

        this._animateJump(newRow, newCol, () => {
            this._scheduleChaseJump();
        });
    }

    _animateJump(targetRow, targetCol, callback) {
        if (this.isJumping) return;
        this.isJumping = true;

        const endPos = this.pyramid.getCubeTopCenter(targetRow, targetCol);

        this.scene.tweens.add({
            targets: this,
            x: endPos.x,
            y: endPos.y,
            duration: CONFIG.ENEMY_JUMP_DURATION,
            ease: 'Quad.easeInOut',
            onUpdate: (tween) => {
                this.jumpArc = Math.sin(tween.progress * Math.PI) * -30;
            },
            onComplete: () => {
                this.row = targetRow;
                this.col = targetCol;
                this.isJumping = false;
                this.jumpArc = 0;
                if (callback) callback();
            }
        });
    }

    _fallOff(dRow, dCol) {
        this.isJumping = true;
        const targetX = this.x + dCol * CONFIG.CUBE_WIDTH;
        const targetY = this.y + 300;

        if (this.scene.audio) this.scene.audio.playCoilyDeath();

        this.scene.tweens.add({
            targets: this,
            x: targetX,
            y: targetY,
            duration: 600,
            ease: 'Quad.easeIn',
            onComplete: () => {
                this.kill();
                if (this.scene.onCoilyDeath) this.scene.onCoilyDeath();
            }
        });
    }

    // Check collision with Q*bert
    checkCollision(qbert) {
        if (!this.active || this.isJumping || qbert.isJumping) return false;
        return this.row === qbert.row && this.col === qbert.col;
    }

    kill() {
        this.active = false;
        if (this.chaseTimer) {
            this.chaseTimer.remove(false);
            this.chaseTimer = null;
        }
    }

    draw() {
        this.graphics.clear();
        if (!this.active) return;

        const drawY = this.y + (this.jumpArc || 0);
        const g = this.graphics;

        if (this.isBall) {
            // Red ball form
            g.fillStyle(0xff0000, 1);
            g.fillCircle(this.x, drawY - 6, 10);
            // Highlight
            g.fillStyle(0xff6666, 1);
            g.fillCircle(this.x - 3, drawY - 10, 3);
        } else {
            // Snake form - purple coiled snake
            // Body coils
            g.fillStyle(0x9900cc, 1);
            g.fillCircle(this.x, drawY + 4, 8);
            g.fillCircle(this.x, drawY - 4, 10);

            // Head
            g.fillStyle(0xbb33ff, 1);
            g.fillCircle(this.x, drawY - 14, 8);

            // Eyes
            g.fillStyle(0xffffff, 1);
            g.fillCircle(this.x - 4, drawY - 16, 3);
            g.fillCircle(this.x + 4, drawY - 16, 3);

            // Pupils (red/angry)
            g.fillStyle(0xff0000, 1);
            g.fillCircle(this.x - 3, drawY - 16, 1.5);
            g.fillCircle(this.x + 5, drawY - 16, 1.5);

            // Tongue
            g.lineStyle(1.5, 0xff0000, 1);
            g.beginPath();
            g.moveTo(this.x, drawY - 8);
            g.lineTo(this.x + 4, drawY - 4);
            g.moveTo(this.x + 4, drawY - 4);
            g.lineTo(this.x + 2, drawY - 2);
            g.moveTo(this.x + 4, drawY - 4);
            g.lineTo(this.x + 6, drawY - 2);
            g.strokePath();
        }
    }

    destroy() {
        this.kill();
        if (this.graphics) this.graphics.destroy();
    }
}
