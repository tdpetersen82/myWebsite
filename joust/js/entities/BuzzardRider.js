// ============================================================
// Joust — Buzzard Rider Entity (Enemy Knights)
// ============================================================

class BuzzardRider {
    constructor(scene, x, y, tierKey) {
        this.scene = scene;
        this.tier = CONFIG.ENEMY_TIERS[tierKey];
        this.tierKey = tierKey;
        this.width = CONFIG.ENEMY_WIDTH;
        this.height = CONFIG.ENEMY_HEIGHT;
        this.x = x;
        this.y = y;
        this.velocityX = (Math.random() > 0.5 ? 1 : -1) * this.tier.speed * (0.5 + Math.random() * 0.5);
        this.velocityY = 0;
        this.facing = this.velocityX > 0 ? 1 : -1;
        this.alive = true;
        this.flapTimer = Math.random() * this.tier.flapInterval;
        this.wingUp = false;
        this.wingTimer = 0;
        this.onGround = false;
        this.aiTargetX = Math.random() * CONFIG.WIDTH;
        this.aiRetargetTimer = 2000 + Math.random() * 3000;

        this.graphics = scene.add.graphics();

        this.bounds = new Phaser.Geom.Rectangle(
            x - this.width / 2,
            y - this.height / 2,
            this.width,
            this.height
        );
    }

    getLanceY() {
        return this.y - this.height / 2;
    }

    update(delta) {
        if (!this.alive) return;

        const dt = delta / 1000;
        const player = this.scene.player;

        // AI: retarget periodically
        this.aiRetargetTimer -= delta;
        if (this.aiRetargetTimer <= 0) {
            this.aiRetargetTimer = 1500 + Math.random() * 2500;
            if (player && player.alive) {
                // Target player with some randomness based on tier
                const aggression = this.tier.tier * 0.25 + 0.3;
                if (Math.random() < aggression) {
                    this.aiTargetX = player.x + (Math.random() - 0.5) * 100;
                } else {
                    this.aiTargetX = Math.random() * CONFIG.WIDTH;
                }
            } else {
                this.aiTargetX = Math.random() * CONFIG.WIDTH;
            }
        }

        // AI: horizontal movement toward target
        const dx = this.aiTargetX - this.x;
        if (Math.abs(dx) > 20) {
            if (dx > 0) {
                this.velocityX += CONFIG.HORIZONTAL_ACCEL * 0.6 * dt;
                this.facing = 1;
            } else {
                this.velocityX -= CONFIG.HORIZONTAL_ACCEL * 0.6 * dt;
                this.facing = -1;
            }
        }

        // AI: flap logic
        this.flapTimer -= delta;
        if (this.flapTimer <= 0) {
            this.flapTimer = this.tier.flapInterval * (0.7 + Math.random() * 0.6);

            // Smart flapping: try to get above the player
            let shouldFlap = true;
            if (player && player.alive) {
                const heightDiff = this.y - player.y;
                // If already above player, flap less
                if (heightDiff < -50 && this.tier.tier < 2) {
                    shouldFlap = Math.random() < 0.3;
                }
                // If below player, always flap
                if (heightDiff > 30) {
                    shouldFlap = true;
                }
            }

            if (shouldFlap) {
                this.velocityY = this.tier.flapForce;
                this.wingUp = true;
                this.wingTimer = 150;
                this.onGround = false;
            }
        }

        // Apply gravity
        this.velocityY += CONFIG.GRAVITY * dt;
        if (this.velocityY > CONFIG.MAX_FALL_SPEED) this.velocityY = CONFIG.MAX_FALL_SPEED;
        if (this.velocityY < CONFIG.MAX_RISE_SPEED) this.velocityY = CONFIG.MAX_RISE_SPEED;

        // Horizontal drag and speed limit
        this.velocityX *= 0.95;
        const maxSpeed = this.tier.speed;
        if (this.velocityX > maxSpeed) this.velocityX = maxSpeed;
        if (this.velocityX < -maxSpeed) this.velocityX = -maxSpeed;

        // Update position
        this.x += this.velocityX * dt;
        this.y += this.velocityY * dt;

        // Screen wrap
        if (this.x < -CONFIG.WRAP_MARGIN) {
            this.x = CONFIG.WIDTH + CONFIG.WRAP_MARGIN;
        } else if (this.x > CONFIG.WIDTH + CONFIG.WRAP_MARGIN) {
            this.x = -CONFIG.WRAP_MARGIN;
        }

        // Ceiling
        if (this.y < 20) {
            this.y = 20;
            this.velocityY = Math.abs(this.velocityY) * 0.3;
        }

        // Update bounds
        this.bounds.x = this.x - this.width / 2;
        this.bounds.y = this.y - this.height / 2;

        // Wing animation
        if (this.wingTimer > 0) {
            this.wingTimer -= delta;
            if (this.wingTimer <= 0) this.wingUp = false;
        }

        // Platform collision
        this.onGround = false;
        this.checkPlatformCollision();
    }

    checkPlatformCollision() {
        if (!this.scene.platforms) return;
        for (const plat of this.scene.platforms) {
            if (this.velocityY >= 0 &&
                this.x > plat.x - plat.width / 2 - this.width / 2 + 4 &&
                this.x < plat.x + plat.width / 2 + this.width / 2 - 4 &&
                this.y + this.height / 2 >= plat.y - CONFIG.PLATFORM_HEIGHT / 2 &&
                this.y + this.height / 2 <= plat.y + CONFIG.PLATFORM_HEIGHT / 2 + 8) {
                this.y = plat.y - CONFIG.PLATFORM_HEIGHT / 2 - this.height / 2;
                this.velocityY = 0;
                this.onGround = true;
                break;
            }
        }
    }

    draw() {
        this.graphics.clear();
        if (!this.alive) return;

        const x = this.x;
        const y = this.y;
        const f = this.facing;
        const color = this.tier.color;

        // Buzzard body (dark brown)
        this.graphics.fillStyle(0x553311, 1);
        this.graphics.fillEllipse(x, y + 6, 20, 16);

        // Buzzard legs
        this.graphics.lineStyle(2, 0x442200, 1);
        if (this.onGround) {
            this.graphics.lineBetween(x - 3, y + 13, x - 5, y + 16);
            this.graphics.lineBetween(x + 3, y + 13, x + 5, y + 16);
        } else {
            this.graphics.lineBetween(x - 3, y + 13, x - 5 - f * 3, y + 17);
            this.graphics.lineBetween(x + 3, y + 13, x + 1 - f * 3, y + 17);
        }

        // Buzzard neck
        this.graphics.lineStyle(3, 0x553311, 1);
        this.graphics.lineBetween(x + f * 4, y, x + f * 9, y - 7);

        // Buzzard head
        this.graphics.fillStyle(0x664422, 1);
        this.graphics.fillCircle(x + f * 9, y - 9, 4);

        // Beak
        this.graphics.fillStyle(0x886633, 1);
        this.graphics.fillTriangle(
            x + f * 13, y - 9,
            x + f * 9, y - 11,
            x + f * 9, y - 7
        );

        // Eye (red)
        this.graphics.fillStyle(0xFF0000, 1);
        this.graphics.fillCircle(x + f * 10, y - 10, 1.5);

        // Wings
        this.graphics.fillStyle(0x442211, 1);
        if (this.wingUp) {
            this.graphics.fillTriangle(
                x - f * 2, y + 2,
                x - f * 14, y - 10,
                x - f * 8, y + 3
            );
        } else {
            this.graphics.fillTriangle(
                x - f * 2, y + 2,
                x - f * 14, y + 8,
                x - f * 8, y + 3
            );
        }

        // Rider body (tier colored)
        this.graphics.fillStyle(color, 1);
        this.graphics.fillRect(x - 5, y - 10, 10, 10);

        // Rider helmet
        this.graphics.fillStyle(color, 1);
        this.graphics.fillCircle(x, y - 14, 5);

        // Helmet visor (dark)
        this.graphics.fillStyle(0x222222, 1);
        this.graphics.fillRect(x + f * 1, y - 16, f * 4, 3);

        // Lance
        this.graphics.lineStyle(2, 0xCCCCCC, 1);
        this.graphics.lineBetween(x + f * 6, y - 6, x + f * 16, y - 14);

        // Lance tip
        this.graphics.fillStyle(0xCCCCCC, 1);
        this.graphics.fillTriangle(
            x + f * 16, y - 16,
            x + f * 18, y - 14,
            x + f * 16, y - 12
        );
    }

    destroy() {
        if (this.graphics) {
            this.graphics.destroy();
        }
    }
}
