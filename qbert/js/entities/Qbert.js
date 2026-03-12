// ============================================================
// Q*bert — Q*bert Player Entity
// ============================================================

class Qbert {
    constructor(scene, pyramid) {
        this.scene = scene;
        this.pyramid = pyramid;
        this.graphics = scene.add.graphics();
        this.speechBubble = null;

        // Grid position
        this.row = 0;
        this.col = 0;

        // Screen position (animated)
        this.x = 0;
        this.y = 0;

        // State
        this.isJumping = false;
        this.isAlive = true;
        this.isOnDisc = false;
        this.isInvincible = false;
        this.facing = 'down-right'; // for visual orientation

        this._updateScreenPos();
    }

    _updateScreenPos() {
        const pos = this.pyramid.getCubeTopCenter(this.row, this.col);
        this.x = pos.x;
        this.y = pos.y;
    }

    // Attempt to jump in a direction
    // Returns: 'valid', 'off-pyramid', 'disc'
    tryJump(dRow, dCol, flyingDiscs) {
        if (this.isJumping || !this.isAlive) return null;

        const newRow = this.row + dRow;
        const newCol = this.col + dCol;

        // Check for flying disc
        if (flyingDiscs) {
            for (const disc of flyingDiscs) {
                if (disc.active && disc.triggerRow === this.row && disc.triggerCol === this.col &&
                    !this.pyramid.isValidPosition(newRow, newCol)) {
                    return 'disc';
                }
            }
        }

        // Check if off pyramid
        if (!this.pyramid.isValidPosition(newRow, newCol)) {
            return 'off-pyramid';
        }

        return 'valid';
    }

    // Perform the jump animation
    jumpTo(targetRow, targetCol, callback) {
        if (this.isJumping) return;
        this.isJumping = true;

        const startX = this.x;
        const startY = this.y;

        // Determine facing direction before updating position
        if (targetRow < this.row) {
            this.facing = (targetCol < this.col) ? 'up-left' : 'up-right';
        } else {
            this.facing = (targetCol > this.col) ? 'down-right' : 'down-left';
        }

        this.row = targetRow;
        this.col = targetCol;
        const endPos = this.pyramid.getCubeTopCenter(targetRow, targetCol);

        this.scene.tweens.add({
            targets: this,
            x: endPos.x,
            y: { value: endPos.y, ease: 'Quad.easeInOut' },
            duration: CONFIG.JUMP_DURATION,
            onUpdate: (tween) => {
                // Arc effect - raise up in middle of jump
                const progress = tween.progress;
                const arc = Math.sin(progress * Math.PI) * -40;
                this.jumpArc = arc;
            },
            onComplete: () => {
                this.isJumping = false;
                this.jumpArc = 0;
                this.x = endPos.x;
                this.y = endPos.y;
                if (callback) callback();
            }
        });
    }

    // Animate falling off the pyramid
    fallOff(dRow, dCol, callback) {
        if (this.isJumping) return;
        this.isJumping = true;

        const targetX = this.x + dCol * CONFIG.CUBE_WIDTH;
        const targetY = this.y + dRow * (CONFIG.CUBE_HEIGHT + CONFIG.CUBE_DEPTH - 8) + 200;

        this.scene.tweens.add({
            targets: this,
            x: targetX,
            y: targetY,
            duration: 800,
            ease: 'Quad.easeIn',
            onComplete: () => {
                this.isJumping = false;
                this.isAlive = false;
                if (callback) callback();
            }
        });
    }

    // Ride a flying disc to the top
    rideDisc(callback) {
        this.isOnDisc = true;
        this.isJumping = true;

        const topPos = this.pyramid.getCubeTopCenter(0, 0);

        this.scene.tweens.add({
            targets: this,
            x: topPos.x,
            y: topPos.y - 60,
            duration: CONFIG.DISC_RIDE_DURATION / 2,
            ease: 'Quad.easeOut',
            onComplete: () => {
                this.scene.tweens.add({
                    targets: this,
                    y: topPos.y,
                    duration: CONFIG.DISC_RIDE_DURATION / 2,
                    ease: 'Quad.easeIn',
                    onComplete: () => {
                        this.row = 0;
                        this.col = 0;
                        this.isOnDisc = false;
                        this.isJumping = false;
                        this._updateScreenPos();
                        if (callback) callback();
                    }
                });
            }
        });
    }

    // Reset to top of pyramid
    resetPosition() {
        this.row = 0;
        this.col = 0;
        this.isAlive = true;
        this.isJumping = false;
        this.isOnDisc = false;
        this.jumpArc = 0;
        this._updateScreenPos();
    }

    // Set temporary invincibility
    setInvincible(duration) {
        this.isInvincible = true;
        this.scene.time.delayedCall(duration, () => {
            this.isInvincible = false;
        });
    }

    // Show speech bubble with @!#?@! text
    showSpeechBubble() {
        this.hideSpeechBubble();

        const expletives = ['@!#?@!', '#@$%!', '!@#$!', '*@!#?'];
        const text = Phaser.Utils.Array.GetRandom(expletives);

        this.speechBubble = this.scene.add.text(this.x, this.y - 55, text, {
            fontSize: '14px',
            fontFamily: 'monospace',
            color: '#ffffff',
            backgroundColor: '#000000',
            padding: { x: 6, y: 4 },
            align: 'center'
        }).setOrigin(0.5).setDepth(100);

        this.scene.time.delayedCall(1500, () => {
            this.hideSpeechBubble();
        });
    }

    hideSpeechBubble() {
        if (this.speechBubble) {
            this.speechBubble.destroy();
            this.speechBubble = null;
        }
    }

    draw() {
        this.graphics.clear();
        if (!this.isAlive && !this.isJumping) return;

        // Flicker when invincible
        if (this.isInvincible && Math.floor(this.scene.time.now / 100) % 2 === 0) return;

        const drawY = this.y + (this.jumpArc || 0);
        const g = this.graphics;

        // Q*bert body - orange sphere-ish character
        // Body
        g.fillStyle(0xff8800, 1);
        g.fillCircle(this.x, drawY - 8, 14);

        // Eyes
        g.fillStyle(0xffffff, 1);
        g.fillCircle(this.x - 5, drawY - 14, 5);
        g.fillCircle(this.x + 5, drawY - 14, 5);

        // Pupils
        g.fillStyle(0x000000, 1);
        g.fillCircle(this.x - 4, drawY - 14, 2.5);
        g.fillCircle(this.x + 6, drawY - 14, 2.5);

        // Nose / snout (Q*bert's distinctive trunk)
        g.fillStyle(0xff6600, 1);
        g.beginPath();
        g.moveTo(this.x, drawY - 8);
        g.lineTo(this.x + 12, drawY - 2);
        g.lineTo(this.x + 10, drawY + 2);
        g.lineTo(this.x, drawY - 4);
        g.closePath();
        g.fillPath();

        // Feet
        g.fillStyle(0xff6600, 1);
        g.fillCircle(this.x - 8, drawY + 6, 5);
        g.fillCircle(this.x + 8, drawY + 6, 5);
    }

    destroy() {
        this.hideSpeechBubble();
        if (this.graphics) this.graphics.destroy();
    }
}
