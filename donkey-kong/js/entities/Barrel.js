// ============================================================
// Donkey Kong — Barrel Entity
// ============================================================

class Barrel {
    constructor(scene, x, y, isFireBarrel = false) {
        this.scene = scene;
        this.x = x;
        this.y = y;
        this.radius = 10;
        this.speed = DK_CONFIG.BARREL_SPEED_BASE;
        this.direction = 1; // 1 = right, -1 = left
        this.rotation = 0;
        this.isFireBarrel = isFireBarrel;
        this.isOnLadder = false;
        this.currentLadder = null;
        this.active = true;
        this.currentPlatform = 5; // starts at top (DK's platform)
        this.hasBeenJumped = false;
        this.fallSpeed = 0;
        this.onGround = false;

        // Physics body
        this.sprite = scene.add.circle(x, y, this.radius, DK_CONFIG.COLOR_BARREL);
        scene.physics.add.existing(this.sprite);
        this.sprite.body.setCircle(this.radius);
        this.sprite.body.setCollideWorldBounds(false);
        this.sprite.body.setBounce(0);
        this.sprite.body.setGravityY(DK_CONFIG.GRAVITY);
        this.sprite.setVisible(false); // Draw manually
    }

    setSpeed(speed) {
        this.speed = speed;
    }

    update(dt, platformManager, ladderManager) {
        if (!this.active) return;

        this.x = this.sprite.x;
        this.y = this.sprite.y;

        // Off screen? Deactivate
        if (this.y > DK_CONFIG.HEIGHT + 50) {
            this.active = false;
            return;
        }

        if (this.isOnLadder && this.currentLadder) {
            // Rolling down a ladder
            this.sprite.body.setGravityY(0);
            this.sprite.body.setVelocityX(0);
            this.sprite.body.setVelocityY(this.speed * 1.5);

            // Check if reached bottom of ladder
            if (this.y >= this.currentLadder.yBottom - 5) {
                this.isOnLadder = false;
                this.currentLadder = null;
                this.sprite.body.setGravityY(DK_CONFIG.GRAVITY);
                this.currentPlatform--;
                // Reverse direction on new platform
                this._setDirectionForPlatform();
            }
            return;
        }

        // Check if on a platform
        const body = this.sprite.body;
        this.onGround = body.blocked.down || body.touching.down;

        if (this.onGround) {
            // Determine current platform and follow its slope
            const pi = platformManager.findPlatformAt(this.x, this.y + this.radius + 5, 20);
            if (pi >= 0) {
                this.currentPlatform = pi;
            }

            const platform = platformManager.platforms[this.currentPlatform];
            if (platform) {
                // Set horizontal velocity based on slope direction
                // On a slope, barrel rolls towards the lower end
                if (platform.slope < 0) {
                    // Slopes down to left
                    this.direction = -1;
                } else if (platform.slope > 0) {
                    // Slopes down to right
                    this.direction = 1;
                }
                // If flat (bottom), default direction based on where DK threw
                if (platform.slope === 0 && this.currentPlatform === 0) {
                    // At bottom — keep rolling toward edge
                }

                body.setVelocityX(this.speed * this.direction);

                // Adjust Y for slope
                const targetY = platformManager.getYAtX(this.currentPlatform, this.x) - this.radius - 4;
                if (Math.abs(this.sprite.y - targetY) > 2) {
                    this.sprite.y = Phaser.Math.Linear(this.sprite.y, targetY, 0.3);
                }
            }

            // Check for ladders (random chance to go down)
            if (!this.isOnLadder) {
                const ladder = ladderManager.getLadderAt(this.x, this.y + this.radius + 10, 12);
                if (ladder && ladder.yTop < this.y + this.radius + 15) {
                    // Only go down ladders that are below current position
                    if (ladder.yBottom > this.y + this.radius) {
                        if (Math.random() < DK_CONFIG.BARREL_LADDER_CHANCE) {
                            this.isOnLadder = true;
                            this.currentLadder = ladder;
                            this.sprite.x = ladder.centerX;
                            return;
                        }
                    }
                }
            }

            // Edge of platform — fall off
            if (platform && (this.x < platform.x1 - 5 || this.x > platform.x2 + 5)) {
                body.setGravityY(DK_CONFIG.GRAVITY);
                // Will fall to next platform
            }
        }

        // Update rotation for visual
        this.rotation += this.direction * dt * 8;
    }

    _setDirectionForPlatform() {
        const platform = DK_CONFIG.PLATFORMS[this.currentPlatform];
        if (platform) {
            if (platform.slope < 0) this.direction = -1;
            else if (platform.slope > 0) this.direction = 1;
            // flat: keep direction
        }
    }

    destroy() {
        this.active = false;
        if (this.sprite) {
            this.sprite.destroy();
        }
    }

    draw(graphics) {
        if (!this.active) return;

        const x = this.sprite.x;
        const y = this.sprite.y;
        const r = this.radius;
        const cfg = DK_CONFIG;

        if (this.isFireBarrel) {
            // Fire barrel — orange/red
            graphics.fillStyle(cfg.COLOR_FIRE, 1);
            graphics.fillCircle(x, y, r);
            graphics.fillStyle(0xffaa00, 1);
            graphics.fillCircle(x, y, r - 3);
            // Flame flicker
            const flicker = Math.sin(Date.now() * 0.02) * 3;
            graphics.fillStyle(0xff0000, 0.7);
            graphics.fillTriangle(x - 4, y - r, x, y - r - 8 - flicker, x + 4, y - r);
        } else {
            // Regular barrel
            graphics.fillStyle(cfg.COLOR_BARREL, 1);
            graphics.fillCircle(x, y, r);

            // Metal bands
            graphics.lineStyle(2, cfg.COLOR_BARREL_BAND, 1);
            graphics.strokeCircle(x, y, r);
            graphics.strokeCircle(x, y, r - 4);

            // Cross pattern that rotates
            const cos = Math.cos(this.rotation);
            const sin = Math.sin(this.rotation);
            graphics.lineStyle(1.5, cfg.COLOR_BARREL_BAND, 0.8);
            graphics.beginPath();
            graphics.moveTo(x - r * cos, y - r * sin);
            graphics.lineTo(x + r * cos, y + r * sin);
            graphics.strokePath();
            graphics.beginPath();
            graphics.moveTo(x + r * sin, y - r * cos);
            graphics.lineTo(x - r * sin, y + r * cos);
            graphics.strokePath();
        }
    }
}


// ============================================================
// Fire Enemy — spawns from oil drum
// ============================================================
class FireEnemy {
    constructor(scene, x, y) {
        this.scene = scene;
        this.x = x;
        this.y = y;
        this.width = 16;
        this.height = 16;
        this.speed = DK_CONFIG.FIRE_ENEMY_SPEED;
        this.direction = Math.random() < 0.5 ? -1 : 1;
        this.active = true;
        this.isClimbing = false;
        this.currentLadder = null;
        this.currentPlatform = 0;
        this.flickerTimer = 0;
        this.climbDirection = -1; // up

        this.sprite = scene.add.rectangle(x, y, this.width, this.height, DK_CONFIG.COLOR_FIRE);
        scene.physics.add.existing(this.sprite);
        this.sprite.body.setCollideWorldBounds(true);
        this.sprite.body.setGravityY(DK_CONFIG.GRAVITY);
        this.sprite.setVisible(false);
    }

    update(dt, platformManager, ladderManager, playerY) {
        if (!this.active) return;

        this.x = this.sprite.x;
        this.y = this.sprite.y;
        this.flickerTimer += dt;

        if (this.isClimbing && this.currentLadder) {
            this.sprite.body.setGravityY(0);
            this.sprite.body.setVelocityX(0);
            this.sprite.body.setVelocityY(this.climbDirection * this.speed * 1.2);

            // Check if reached top or bottom
            if (this.climbDirection < 0 && this.y <= this.currentLadder.yTop) {
                this.isClimbing = false;
                this.currentLadder = null;
                this.sprite.body.setGravityY(DK_CONFIG.GRAVITY);
                this.currentPlatform++;
                this.direction = Math.random() < 0.5 ? -1 : 1;
            } else if (this.climbDirection > 0 && this.y >= this.currentLadder.yBottom) {
                this.isClimbing = false;
                this.currentLadder = null;
                this.sprite.body.setGravityY(DK_CONFIG.GRAVITY);
                this.currentPlatform--;
                this.direction = Math.random() < 0.5 ? -1 : 1;
            }
            return;
        }

        const body = this.sprite.body;
        const onGround = body.blocked.down || body.touching.down;

        if (onGround) {
            body.setVelocityX(this.speed * this.direction);

            // Try to climb ladders to pursue player
            if (Math.random() < DK_CONFIG.FIRE_ENEMY_LADDER_CHANCE * dt) {
                const wantsUp = playerY < this.y;
                const ladder = ladderManager.getLadderAt(this.x, this.y, 14);
                if (ladder) {
                    if (wantsUp && this.y > ladder.yTop + 10) {
                        this.isClimbing = true;
                        this.currentLadder = ladder;
                        this.climbDirection = -1;
                        this.sprite.x = ladder.centerX;
                        return;
                    } else if (!wantsUp && this.y < ladder.yBottom - 10) {
                        this.isClimbing = true;
                        this.currentLadder = ladder;
                        this.climbDirection = 1;
                        this.sprite.x = ladder.centerX;
                        return;
                    }
                }
            }

            // Bounce off edges
            const platform = DK_CONFIG.PLATFORMS[this.currentPlatform];
            if (platform) {
                if (this.x <= platform.x1 + 10) this.direction = 1;
                if (this.x >= platform.x2 - 10) this.direction = -1;
            }
        }
    }

    destroy() {
        this.active = false;
        if (this.sprite) this.sprite.destroy();
    }

    draw(graphics) {
        if (!this.active) return;

        const x = this.sprite.x;
        const y = this.sprite.y;
        const cfg = DK_CONFIG;

        // Flickering fire body
        const flicker = Math.sin(this.flickerTimer * 15) * 2;

        graphics.fillStyle(cfg.COLOR_FIRE, 1);
        graphics.fillRect(x - 7, y - 6, 14, 14);

        // Flame tips
        graphics.fillStyle(0xffaa00, 1);
        graphics.fillTriangle(x - 6, y - 6, x - 2, y - 14 + flicker, x + 2, y - 6);
        graphics.fillTriangle(x, y - 6, x + 4, y - 12 - flicker, x + 7, y - 6);

        // Eyes
        graphics.fillStyle(0x000000, 1);
        graphics.fillCircle(x - 3, y, 2);
        graphics.fillCircle(x + 3, y, 2);
    }
}
