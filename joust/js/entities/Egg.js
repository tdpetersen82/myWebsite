// ============================================================
// Joust — Egg Entity (dropped by defeated enemies)
// ============================================================

class Egg {
    constructor(scene, x, y, tierKey) {
        this.scene = scene;
        this.tierKey = tierKey;
        this.tierIndex = CONFIG.ENEMY_TIERS[tierKey].tier;
        this.x = x;
        this.y = y;
        this.velocityY = -80;
        this.velocityX = (Math.random() - 0.5) * 40;
        this.width = CONFIG.EGG_WIDTH;
        this.height = CONFIG.EGG_HEIGHT;
        this.alive = true;
        this.collected = false;
        this.onGround = false;
        this.hatchTimer = CONFIG.EGG_HATCH_TIME;
        this.hatching = false;
        this.hatchFlashTimer = 0;
        this.color = CONFIG.EGG_COLORS[this.tierIndex] || 0xFFFFFF;

        this.graphics = scene.add.graphics();

        this.bounds = new Phaser.Geom.Rectangle(
            x - this.width / 2,
            y - this.height / 2,
            this.width,
            this.height
        );
    }

    update(delta) {
        if (!this.alive || this.collected) return;

        const dt = delta / 1000;

        // Apply gravity
        this.velocityY += CONFIG.EGG_GRAVITY * dt;
        if (this.velocityY > 200) this.velocityY = 200;

        this.x += this.velocityX * dt;
        this.y += this.velocityY * dt;
        this.velocityX *= 0.98;

        // Screen wrap
        if (this.x < -10) this.x = CONFIG.WIDTH + 10;
        else if (this.x > CONFIG.WIDTH + 10) this.x = -10;

        // Platform collision
        this.onGround = false;
        if (this.scene.platforms) {
            for (const plat of this.scene.platforms) {
                if (this.velocityY >= 0 &&
                    this.x > plat.x - plat.width / 2 - this.width / 2 &&
                    this.x < plat.x + plat.width / 2 + this.width / 2 &&
                    this.y + this.height / 2 >= plat.y - CONFIG.PLATFORM_HEIGHT / 2 &&
                    this.y + this.height / 2 <= plat.y + CONFIG.PLATFORM_HEIGHT / 2 + 6) {
                    this.y = plat.y - CONFIG.PLATFORM_HEIGHT / 2 - this.height / 2;
                    this.velocityY = 0;
                    this.velocityX = 0;
                    this.onGround = true;
                    break;
                }
            }
        }

        // Update bounds
        this.bounds.x = this.x - this.width / 2;
        this.bounds.y = this.y - this.height / 2;

        // Hatch timer (only counts when on ground)
        if (this.onGround) {
            this.hatchTimer -= delta;
            if (this.hatchTimer <= 2000) {
                this.hatching = true;
                this.hatchFlashTimer += delta;
            }
            if (this.hatchTimer <= 0) {
                this.hatch();
            }
        }
    }

    collect() {
        this.collected = true;
        this.alive = false;
        this.scene.audio.playEggCollect();
    }

    hatch() {
        if (this.collected) return;
        this.alive = false;
        this.scene.audio.playEggHatch();
        // Spawn a new enemy at this location
        this.scene.spawnEnemyAt(this.x, this.y - 10, this.tierKey);
    }

    draw() {
        this.graphics.clear();
        if (!this.alive || this.collected) return;

        // Flash when about to hatch
        if (this.hatching && Math.floor(this.hatchFlashTimer / 200) % 2 === 0) {
            this.graphics.fillStyle(0xFFFFFF, 1);
        } else {
            this.graphics.fillStyle(this.color, 1);
        }

        // Egg shape (oval)
        this.graphics.fillEllipse(this.x, this.y, this.width, this.height);

        // Egg highlight
        this.graphics.fillStyle(0xFFFFFF, 0.3);
        this.graphics.fillEllipse(this.x - 2, this.y - 2, 4, 5);

        // Crack lines when hatching
        if (this.hatching) {
            this.graphics.lineStyle(1, 0x333333, 1);
            this.graphics.lineBetween(this.x - 2, this.y - 4, this.x + 1, this.y);
            this.graphics.lineBetween(this.x + 1, this.y, this.x - 1, this.y + 3);
        }
    }

    destroy() {
        if (this.graphics) {
            this.graphics.destroy();
        }
    }
}
