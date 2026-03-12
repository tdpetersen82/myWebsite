// ============================================================
// Joust — Pterodactyl Entity (indestructible time-pressure enemy)
// ============================================================

class Pterodactyl {
    constructor(scene, targetPlayer) {
        this.scene = scene;
        this.target = targetPlayer;
        this.width = CONFIG.PTERO_WIDTH;
        this.height = CONFIG.PTERO_HEIGHT;
        this.alive = true;
        this.speed = CONFIG.PTERO_SPEED;

        // Spawn from random side
        const fromLeft = Math.random() > 0.5;
        this.x = fromLeft ? -40 : CONFIG.WIDTH + 40;
        this.y = 100 + Math.random() * 200;
        this.velocityX = fromLeft ? this.speed : -this.speed;
        this.velocityY = 0;
        this.facing = fromLeft ? 1 : -1;

        this.wingPhase = 0;
        this.mouthOpen = false;
        this.mouthTimer = 0;

        this.graphics = scene.add.graphics();

        this.bounds = new Phaser.Geom.Rectangle(
            this.x - this.width / 2,
            this.y - this.height / 2,
            this.width,
            this.height
        );

        // Mouth hitbox (the only vulnerable point)
        this.mouthBounds = new Phaser.Geom.Rectangle(0, 0, CONFIG.PTERO_MOUTH_HITBOX, CONFIG.PTERO_MOUTH_HITBOX);

        scene.audio.playPterodactylScreech();
    }

    update(delta) {
        if (!this.alive) return;

        const dt = delta / 1000;

        // Chase the player
        if (this.target && this.target.alive) {
            const dx = this.target.x - this.x;
            const dy = this.target.y - this.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist > 0) {
                this.velocityX = (dx / dist) * this.speed;
                this.velocityY = (dy / dist) * this.speed;
            }

            this.facing = dx > 0 ? 1 : -1;

            // Open mouth when close to player
            this.mouthOpen = dist < 80;
        } else {
            // Patrol if no target
            this.velocityY = Math.sin(Date.now() / 500) * 50;
        }

        this.x += this.velocityX * dt;
        this.y += this.velocityY * dt;

        // Keep on screen (pterodactyl doesn't wrap, it chases)
        if (this.y < 30) this.y = 30;
        if (this.y > CONFIG.LAVA_Y - 30) this.y = CONFIG.LAVA_Y - 30;

        // Screen wrap
        if (this.x < -60) this.x = CONFIG.WIDTH + 60;
        if (this.x > CONFIG.WIDTH + 60) this.x = -60;

        // Update bounds
        this.bounds.x = this.x - this.width / 2;
        this.bounds.y = this.y - this.height / 2;

        // Update mouth hitbox position
        this.mouthBounds.x = this.x + this.facing * (this.width / 2) - CONFIG.PTERO_MOUTH_HITBOX / 2;
        this.mouthBounds.y = this.y - CONFIG.PTERO_MOUTH_HITBOX / 2;

        // Wing animation
        this.wingPhase += delta * 0.008;
    }

    // Pterodactyl can only be killed by hitting its open mouth
    checkMouthHit(playerBounds) {
        if (!this.mouthOpen) return false;
        return Phaser.Geom.Rectangle.Overlaps(this.mouthBounds, playerBounds);
    }

    kill() {
        this.alive = false;
        this.scene.audio.playLanceHit();
    }

    draw() {
        this.graphics.clear();
        if (!this.alive) return;

        const x = this.x;
        const y = this.y;
        const f = this.facing;
        const wingAngle = Math.sin(this.wingPhase) * 0.8;

        // Body
        this.graphics.fillStyle(CONFIG.PTERO_COLOR, 1);
        this.graphics.fillEllipse(x, y, 36, 16);

        // Tail
        this.graphics.fillStyle(CONFIG.PTERO_COLOR, 1);
        this.graphics.fillTriangle(
            x - f * 18, y,
            x - f * 32, y - 4,
            x - f * 28, y + 4
        );

        // Wings
        const wingY = y - 4 + wingAngle * 15;
        this.graphics.fillStyle(0x9966AA, 1);
        // Top wing
        this.graphics.fillTriangle(
            x - f * 5, y - 4,
            x + f * 5, y - 4,
            x, wingY - 18
        );
        // Wing membrane
        this.graphics.fillStyle(0x775588, 0.7);
        this.graphics.fillTriangle(
            x - f * 10, y - 2,
            x + f * 10, y - 2,
            x, wingY - 14
        );

        // Head
        this.graphics.fillStyle(CONFIG.PTERO_COLOR, 1);
        this.graphics.fillCircle(x + f * 20, y - 2, 8);

        // Crest
        this.graphics.fillStyle(0xAA55BB, 1);
        this.graphics.fillTriangle(
            x + f * 18, y - 8,
            x + f * 12, y - 14,
            x + f * 22, y - 10
        );

        // Beak / Mouth
        if (this.mouthOpen) {
            // Open mouth (dangerous)
            this.graphics.fillStyle(0xFF0000, 1);
            this.graphics.fillTriangle(
                x + f * 26, y - 4,
                x + f * 34, y - 2,
                x + f * 26, y + 2
            );
            // Lower jaw
            this.graphics.fillTriangle(
                x + f * 26, y + 2,
                x + f * 32, y + 4,
                x + f * 26, y + 6
            );
        } else {
            // Closed beak
            this.graphics.fillStyle(0xBB77CC, 1);
            this.graphics.fillTriangle(
                x + f * 26, y - 3,
                x + f * 34, y - 1,
                x + f * 26, y + 1
            );
        }

        // Eye
        this.graphics.fillStyle(0xFF0000, 1);
        this.graphics.fillCircle(x + f * 22, y - 4, 2.5);
        this.graphics.fillStyle(0x000000, 1);
        this.graphics.fillCircle(x + f * 22, y - 4, 1);
    }

    destroy() {
        if (this.graphics) {
            this.graphics.destroy();
        }
    }
}
