// defender/js/entities/Humanoid.js — Humans on the ground that Landers try to abduct

class Humanoid {
    constructor(scene, x) {
        this.scene = scene;
        this.x = x;
        this.y = CONFIG.GROUND_Y - CONFIG.HUMANOID.HEIGHT / 2;
        this.alive = true;
        this.grabbed = false;
        this.grabber = null;
        this.falling = false;
        this.carried = false; // carried by player
        this.walkDir = Math.random() > 0.5 ? 1 : -1;
        this.walkTimer = 0;

        this.graphics = scene.add.graphics();
    }

    update(delta) {
        const dt = delta / 1000;

        if (this.grabbed || this.carried) {
            // Position handled by grabber or ship
            return;
        }

        if (this.falling) {
            this.y += CONFIG.HUMANOID.FALL_SPEED * dt;
            // Hit ground?
            if (this.y >= CONFIG.GROUND_Y - CONFIG.HUMANOID.HEIGHT / 2) {
                this.y = CONFIG.GROUND_Y - CONFIG.HUMANOID.HEIGHT / 2;
                this.falling = false;
                // Survive if close to ground when released
            }
            // Fell off screen? Die
            if (this.y > CONFIG.HEIGHT + 20) {
                this.alive = false;
            }
            return;
        }

        // Walking
        this.walkTimer -= delta;
        if (this.walkTimer <= 0) {
            this.walkDir = Math.random() > 0.5 ? 1 : -1;
            this.walkTimer = 1000 + Math.random() * 3000;
        }
        this.x += this.walkDir * CONFIG.HUMANOID.WALK_SPEED * dt;

        // Wrap
        if (this.x < 0) this.x += CONFIG.WORLD_WIDTH;
        if (this.x >= CONFIG.WORLD_WIDTH) this.x -= CONFIG.WORLD_WIDTH;
    }

    draw(screenX) {
        this.graphics.clear();
        if (!this.alive) return;
        const w = CONFIG.HUMANOID.WIDTH;
        const h = CONFIG.HUMANOID.HEIGHT;
        const color = this.grabbed ? CONFIG.COLORS.HUMANOID_CARRIED : CONFIG.COLORS.HUMANOID;

        this.graphics.fillStyle(color, 1);
        // Head
        this.graphics.fillCircle(screenX, this.y - h / 2 + 3, 3);
        // Body
        this.graphics.fillRect(screenX - w / 4, this.y - h / 2 + 6, w / 2, h / 2);
        // Legs
        this.graphics.lineStyle(1.5, color, 1);
        this.graphics.lineBetween(screenX - 2, this.y + 2, screenX - 3, this.y + h / 2);
        this.graphics.lineBetween(screenX + 2, this.y + 2, screenX + 3, this.y + h / 2);
    }

    getBounds() {
        return {
            x: this.x - CONFIG.HUMANOID.WIDTH / 2,
            y: this.y - CONFIG.HUMANOID.HEIGHT / 2,
            width: CONFIG.HUMANOID.WIDTH,
            height: CONFIG.HUMANOID.HEIGHT,
        };
    }

    destroy() {
        this.graphics.destroy();
    }
}
