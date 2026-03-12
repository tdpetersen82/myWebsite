// defender/js/entities/Bullet.js — Player laser projectile

class Bullet {
    constructor(scene, x, y, dir) {
        this.scene = scene;
        this.x = x;
        this.y = y;
        this.dir = dir; // 1 = right, -1 = left
        this.speed = CONFIG.BULLET.SPEED;
        this.alive = true;
        this.spawnTime = scene.time.now;

        this.graphics = scene.add.graphics();
    }

    update(delta) {
        const dt = delta / 1000;
        this.x += this.speed * this.dir * dt;

        // Wrap world
        if (this.x < 0) this.x += CONFIG.WORLD_WIDTH;
        if (this.x >= CONFIG.WORLD_WIDTH) this.x -= CONFIG.WORLD_WIDTH;

        // Lifetime check
        if (this.scene.time.now - this.spawnTime > CONFIG.BULLET.LIFETIME) {
            this.alive = false;
        }
    }

    draw(screenX) {
        this.graphics.clear();
        if (!this.alive) return;
        this.graphics.fillStyle(CONFIG.COLORS.BULLET, 1);
        this.graphics.fillRect(
            screenX - (this.dir > 0 ? 0 : CONFIG.BULLET.LENGTH),
            this.y - CONFIG.BULLET.HEIGHT / 2,
            CONFIG.BULLET.LENGTH,
            CONFIG.BULLET.HEIGHT
        );
    }

    getBounds() {
        return {
            x: this.x - CONFIG.BULLET.LENGTH / 2,
            y: this.y - CONFIG.BULLET.HEIGHT / 2,
            width: CONFIG.BULLET.LENGTH,
            height: CONFIG.BULLET.HEIGHT,
        };
    }

    destroy() {
        this.graphics.destroy();
    }
}
