// ============================================================
// Donkey Kong — Player (Mario / Jumpman) Entity
// ============================================================

class Player {
    constructor(scene) {
        this.scene = scene;
        this.x = DK_CONFIG.PLAYER_START.x;
        this.y = DK_CONFIG.PLAYER_START.y;
        this.width = 20;
        this.height = 28;
        this.velocityX = 0;
        this.velocityY = 0;
        this.onGround = false;
        this.isClimbing = false;
        this.currentLadder = null;
        this.facingRight = true;
        this.isJumping = false;
        this.hasHammer = false;
        this.hammerTimer = 0;
        this.hammerSwing = 0;     // animation frame
        this.walkFrame = 0;
        this.walkTimer = 0;
        this.alive = true;
        this.currentPlatform = 0; // platform index player is on
        this.invincibleTimer = 0;

        // Create physics body
        this.sprite = scene.add.rectangle(this.x, this.y, this.width, this.height, DK_CONFIG.COLOR_PLAYER);
        scene.physics.add.existing(this.sprite);
        this.sprite.body.setCollideWorldBounds(true);
        this.sprite.body.setGravityY(DK_CONFIG.GRAVITY);
        this.sprite.body.setSize(this.width, this.height);
        this.sprite.setVisible(false); // We draw manually
    }

    reset() {
        this.x = DK_CONFIG.PLAYER_START.x;
        this.y = DK_CONFIG.PLAYER_START.y;
        this.velocityX = 0;
        this.velocityY = 0;
        this.onGround = false;
        this.isClimbing = false;
        this.currentLadder = null;
        this.isJumping = false;
        this.hasHammer = false;
        this.hammerTimer = 0;
        this.alive = true;
        this.invincibleTimer = 0;
        this.sprite.body.setVelocity(0, 0);
        this.sprite.setPosition(this.x, this.y);
        this.sprite.body.setGravityY(DK_CONFIG.GRAVITY);
    }

    update(dt, cursors, platformManager, ladderManager) {
        if (!this.alive) return;

        const cfg = DK_CONFIG;
        const body = this.sprite.body;

        this.x = this.sprite.x;
        this.y = this.sprite.y;

        // Update invincibility timer
        if (this.invincibleTimer > 0) {
            this.invincibleTimer -= dt;
        }

        // Update hammer timer (timer is in ms, dt is in seconds)
        if (this.hasHammer) {
            this.hammerTimer -= dt * 1000;
            this.hammerSwing += dt * 10;
            if (this.hammerTimer <= 0) {
                this.hasHammer = false;
            }
        }

        // Check ground status
        this.onGround = body.blocked.down || body.touching.down;

        // Determine current platform
        if (this.onGround) {
            const pi = platformManager.findPlatformAt(this.x, this.y + this.height / 2 + 5, 20);
            if (pi >= 0) this.currentPlatform = pi;
            this.isJumping = false;
        }

        // Ladder detection
        const ladder = ladderManager.getLadderAt(this.x, this.y, 18);

        if (this.isClimbing) {
            body.setGravityY(0);
            body.setVelocityX(0);

            if (cursors.up.isDown) {
                body.setVelocityY(-cfg.CLIMB_SPEED);
            } else if (cursors.down.isDown) {
                body.setVelocityY(cfg.CLIMB_SPEED);
            } else {
                body.setVelocityY(0);
            }

            // Check if we've left the ladder
            if (this.currentLadder) {
                if (this.y < this.currentLadder.yTop - 5) {
                    // Reached top of ladder
                    this.isClimbing = false;
                    this.currentLadder = null;
                    body.setGravityY(cfg.GRAVITY);
                    body.setVelocityY(0);
                } else if (this.y > this.currentLadder.yBottom + 5) {
                    // Reached bottom of ladder
                    this.isClimbing = false;
                    this.currentLadder = null;
                    body.setGravityY(cfg.GRAVITY);
                }
            }

            // Allow stepping off ladder horizontally
            if (cursors.left.isDown || cursors.right.isDown) {
                if (this.onGround) {
                    this.isClimbing = false;
                    this.currentLadder = null;
                    body.setGravityY(cfg.GRAVITY);
                }
            }

        } else {
            // Normal movement
            body.setGravityY(cfg.GRAVITY);

            // Horizontal movement
            if (cursors.left.isDown) {
                body.setVelocityX(-cfg.PLAYER_SPEED);
                this.facingRight = false;
                this.walkTimer += dt;
                if (this.walkTimer > 0.12) {
                    this.walkFrame = (this.walkFrame + 1) % 2;
                    this.walkTimer = 0;
                    if (this.onGround) window.audioManager.walk();
                }
            } else if (cursors.right.isDown) {
                body.setVelocityX(cfg.PLAYER_SPEED);
                this.facingRight = true;
                this.walkTimer += dt;
                if (this.walkTimer > 0.12) {
                    this.walkFrame = (this.walkFrame + 1) % 2;
                    this.walkTimer = 0;
                    if (this.onGround) window.audioManager.walk();
                }
            } else {
                body.setVelocityX(0);
                this.walkFrame = 0;
            }

            // Start climbing
            if ((cursors.up.isDown || cursors.down.isDown) && ladder) {
                // Only climb if: pressing up and not at top, or pressing down and not at bottom
                const canClimbUp = cursors.up.isDown && this.y > ladder.yTop;
                const canClimbDown = cursors.down.isDown && this.y < ladder.yBottom;
                if (canClimbUp || canClimbDown) {
                    this.isClimbing = true;
                    this.currentLadder = ladder;
                    this.sprite.x = ladder.centerX;
                    body.setVelocityX(0);
                    body.setGravityY(0);
                }
            }

            // Jumping
            if (cursors.space.isDown && this.onGround && !this.isJumping) {
                body.setVelocityY(cfg.PLAYER_JUMP_FORCE);
                this.isJumping = true;
                window.audioManager.jump();
            }
        }

        // Keep in bounds
        if (this.sprite.x < 10) this.sprite.x = 10;
        if (this.sprite.x > cfg.WIDTH - 10) this.sprite.x = cfg.WIDTH - 10;
    }

    giveHammer() {
        this.hasHammer = true;
        this.hammerTimer = DK_CONFIG.HAMMER_DURATION;
        this.hammerSwing = 0;
        window.audioManager.hammerPickup();
    }

    die() {
        this.alive = false;
        window.audioManager.death();
    }

    /**
     * Get the bounding box for collision (including hammer reach)
     */
    getHammerBounds() {
        if (!this.hasHammer) return null;
        const hx = this.facingRight ? this.x + 20 : this.x - 30;
        return { x: hx, y: this.y - 20, width: 24, height: 24 };
    }

    draw(graphics) {
        if (!this.alive) return;

        const x = this.sprite.x;
        const y = this.sprite.y;
        const cfg = DK_CONFIG;

        // Flicker when invincible
        if (this.invincibleTimer > 0 && Math.floor(this.invincibleTimer * 10) % 2 === 0) {
            return;
        }

        // Body (red overalls)
        graphics.fillStyle(cfg.COLOR_PLAYER, 1);
        graphics.fillRect(x - 8, y - 6, 16, 16);

        // Head (skin color)
        graphics.fillStyle(cfg.COLOR_PLAYER_SKIN, 1);
        graphics.fillCircle(x, y - 14, 7);

        // Cap (red)
        graphics.fillStyle(cfg.COLOR_PLAYER, 1);
        const capDir = this.facingRight ? 1 : -1;
        graphics.fillRect(x - 7, y - 20, 14, 4);
        graphics.fillRect(x + capDir * 2, y - 22, 8 * capDir, 3);

        // Eyes
        graphics.fillStyle(0x000000, 1);
        graphics.fillCircle(x + capDir * 3, y - 14, 1.5);

        // Legs
        const legOffset = this.walkFrame === 1 ? 3 : 0;
        graphics.fillStyle(0x4444cc, 1);
        graphics.fillRect(x - 6, y + 10, 5, 8 - legOffset);
        graphics.fillRect(x + 1, y + 10, 5, 8 + legOffset - 3);

        // Arms
        graphics.fillStyle(cfg.COLOR_PLAYER_SKIN, 1);
        if (this.isClimbing) {
            // Arms reaching up
            graphics.fillRect(x - 12, y - 10, 4, 12);
            graphics.fillRect(x + 8, y - 10, 4, 12);
        } else {
            graphics.fillRect(x - 12, y - 4, 4, 10);
            graphics.fillRect(x + 8, y - 4, 4, 10);
        }

        // Hammer
        if (this.hasHammer) {
            const swingAngle = Math.sin(this.hammerSwing * 3);
            const hx = this.facingRight ? x + 14 : x - 20;
            const hy = y - 16 + swingAngle * 10;

            // Handle
            graphics.fillStyle(cfg.COLOR_HAMMER, 1);
            graphics.fillRect(hx, hy, 4, 18);

            // Head
            graphics.fillStyle(cfg.COLOR_HAMMER_HEAD, 1);
            graphics.fillRect(hx - 4, hy - 6, 12, 8);

            // Flash effect
            if (this.hammerTimer < 3000 && Math.floor(this.hammerTimer / DK_CONFIG.HAMMER_FLASH_INTERVAL) % 2 === 0) {
                graphics.fillStyle(0xffffff, 0.4);
                graphics.fillRect(hx - 4, hy - 6, 12, 8);
            }
        }
    }
}
