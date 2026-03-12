// ============================================================
// Joust — Player Entity (Knight on Ostrich)
// ============================================================

class Player {
    constructor(scene, x, y) {
        this.scene = scene;
        this.startX = x;
        this.startY = y;
        this.width = CONFIG.PLAYER_WIDTH;
        this.height = CONFIG.PLAYER_HEIGHT;
        this.velocityX = 0;
        this.velocityY = 0;
        this.facing = 1; // 1 = right, -1 = left
        this.alive = true;
        this.invincible = false;
        this.invincibleTimer = 0;
        this.flapFrame = 0;
        this.flapAnimTimer = 0;
        this.wingUp = false;
        this.onGround = false;

        // Create graphics object
        this.graphics = scene.add.graphics();
        this.x = x;
        this.y = y;

        // Create a physics-like bounding box for collision
        this.bounds = new Phaser.Geom.Rectangle(
            x - this.width / 2,
            y - this.height / 2,
            this.width,
            this.height
        );
    }

    flap() {
        if (!this.alive) return;
        this.velocityY = CONFIG.FLAP_FORCE;
        this.wingUp = true;
        this.flapAnimTimer = 150;
        this.onGround = false;
        this.scene.audio.playFlap();
    }

    moveLeft() {
        if (!this.alive) return;
        this.velocityX -= CONFIG.HORIZONTAL_ACCEL * (1 / 60);
        this.facing = -1;
    }

    moveRight() {
        if (!this.alive) return;
        this.velocityX += CONFIG.HORIZONTAL_ACCEL * (1 / 60);
        this.facing = 1;
    }

    update(delta) {
        if (!this.alive) return;

        const dt = delta / 1000;

        // Apply gravity
        this.velocityY += CONFIG.GRAVITY * dt;

        // Clamp vertical speed
        if (this.velocityY > CONFIG.MAX_FALL_SPEED) this.velocityY = CONFIG.MAX_FALL_SPEED;
        if (this.velocityY < CONFIG.MAX_RISE_SPEED) this.velocityY = CONFIG.MAX_RISE_SPEED;

        // Apply horizontal drag
        this.velocityX *= CONFIG.HORIZONTAL_DRAG;

        // Clamp horizontal speed
        const maxH = CONFIG.HORIZONTAL_SPEED;
        if (this.velocityX > maxH) this.velocityX = maxH;
        if (this.velocityX < -maxH) this.velocityX = -maxH;

        // Update position
        this.x += this.velocityX * dt;
        this.y += this.velocityY * dt;

        // Screen wrap horizontally
        if (this.x < -CONFIG.WRAP_MARGIN) {
            this.x = CONFIG.WIDTH + CONFIG.WRAP_MARGIN;
        } else if (this.x > CONFIG.WIDTH + CONFIG.WRAP_MARGIN) {
            this.x = -CONFIG.WRAP_MARGIN;
        }

        // Ceiling clamp
        if (this.y < 20) {
            this.y = 20;
            this.velocityY = 0;
        }

        // Update bounds
        this.bounds.x = this.x - this.width / 2;
        this.bounds.y = this.y - this.height / 2;

        // Animation timer
        if (this.flapAnimTimer > 0) {
            this.flapAnimTimer -= delta;
            if (this.flapAnimTimer <= 0) {
                this.wingUp = false;
            }
        }

        // Invincibility timer
        if (this.invincible) {
            this.invincibleTimer -= delta;
            if (this.invincibleTimer <= 0) {
                this.invincible = false;
            }
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

    getLanceY() {
        // Lance tip is at the top of the rider
        return this.y - this.height / 2;
    }

    makeInvincible() {
        this.invincible = true;
        this.invincibleTimer = CONFIG.INVINCIBLE_DURATION;
    }

    die() {
        this.alive = false;
        this.scene.audio.playDeath();
    }

    respawn() {
        this.x = this.startX;
        this.y = this.startY;
        this.velocityX = 0;
        this.velocityY = 0;
        this.alive = true;
        this.makeInvincible();
    }

    draw() {
        this.graphics.clear();
        if (!this.alive) return;

        // Flicker when invincible
        if (this.invincible && Math.floor(this.invincibleTimer / 100) % 2 === 0) {
            return;
        }

        const x = this.x;
        const y = this.y;
        const f = this.facing;

        // Ostrich body (yellow-brown)
        this.graphics.fillStyle(0xDDA520, 1);
        this.graphics.fillEllipse(x, y + 6, 22, 18);

        // Ostrich legs
        this.graphics.lineStyle(2, 0xCC8800, 1);
        if (this.onGround) {
            this.graphics.lineBetween(x - 4, y + 14, x - 6, y + 16);
            this.graphics.lineBetween(x + 4, y + 14, x + 6, y + 16);
        } else {
            // Legs trailing when flying
            this.graphics.lineBetween(x - 4, y + 14, x - 6 - f * 3, y + 18);
            this.graphics.lineBetween(x + 4, y + 14, x + 2 - f * 3, y + 18);
        }

        // Ostrich neck
        this.graphics.lineStyle(3, 0xDDA520, 1);
        this.graphics.lineBetween(x + f * 5, y, x + f * 10, y - 8);

        // Ostrich head
        this.graphics.fillStyle(0xDDA520, 1);
        this.graphics.fillCircle(x + f * 10, y - 10, 4);

        // Beak
        this.graphics.fillStyle(0xFF8800, 1);
        this.graphics.fillTriangle(
            x + f * 14, y - 10,
            x + f * 10, y - 12,
            x + f * 10, y - 8
        );

        // Eye
        this.graphics.fillStyle(0x000000, 1);
        this.graphics.fillCircle(x + f * 11, y - 11, 1.5);

        // Wings
        this.graphics.fillStyle(0xBB8820, 1);
        if (this.wingUp) {
            // Wings up (flapping)
            this.graphics.fillTriangle(
                x - f * 2, y + 2,
                x - f * 14, y - 10,
                x - f * 8, y + 4
            );
        } else {
            // Wings down
            this.graphics.fillTriangle(
                x - f * 2, y + 2,
                x - f * 14, y + 8,
                x - f * 8, y + 4
            );
        }

        // Knight body (player is bright yellow/white)
        this.graphics.fillStyle(0xFFFF44, 1);
        this.graphics.fillRect(x - 5, y - 10, 10, 10);

        // Knight helmet
        this.graphics.fillStyle(0xFFFF44, 1);
        this.graphics.fillCircle(x, y - 14, 5);

        // Helmet visor
        this.graphics.fillStyle(0x333333, 1);
        this.graphics.fillRect(x + f * 1, y - 16, f * 4, 3);

        // Lance (pointing in facing direction)
        this.graphics.lineStyle(2, 0xFFFFFF, 1);
        this.graphics.lineBetween(x + f * 6, y - 6, x + f * 18, y - 14);

        // Lance tip
        this.graphics.fillStyle(0xFFFFFF, 1);
        this.graphics.fillTriangle(
            x + f * 18, y - 16,
            x + f * 20, y - 14,
            x + f * 18, y - 12
        );
    }

    destroy() {
        if (this.graphics) {
            this.graphics.destroy();
        }
    }
}
