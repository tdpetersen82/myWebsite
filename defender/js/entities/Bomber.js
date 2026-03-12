// defender/js/entities/Bomber.js — Enemy that drops mines

class Bomber {
    constructor(scene, x, y, difficulty) {
        this.scene = scene;
        this.x = x;
        this.y = y;
        this.difficulty = difficulty;
        this.speedMult = difficulty.enemySpeedMult;
        this.alive = true;
        this.hp = CONFIG.BOMBER.HP;
        this.vx = (Math.random() > 0.5 ? 1 : -1) * CONFIG.BOMBER.SPEED * this.speedMult;
        this.vy = 0;
        this.lastMineDrop = 0;
        this.mines = [];

        this.graphics = scene.add.graphics();
        this.animPhase = Math.random() * Math.PI * 2;
    }

    update(delta, time) {
        const dt = delta / 1000;
        this.animPhase += dt * 3;

        // Gentle wave motion
        this.vy = Math.sin(this.animPhase) * 40;

        this.x += this.vx * dt;
        this.y += this.vy * dt;

        // Wrap world
        if (this.x < 0) this.x += CONFIG.WORLD_WIDTH;
        if (this.x >= CONFIG.WORLD_WIDTH) this.x -= CONFIG.WORLD_WIDTH;

        this.y = Phaser.Math.Clamp(this.y, 80, CONFIG.GROUND_Y - 60);

        // Drop mines
        if (time - this.lastMineDrop > CONFIG.BOMBER.MINE_DROP_INTERVAL) {
            this.lastMineDrop = time;
            this.mines.push({
                x: this.x,
                y: this.y + CONFIG.BOMBER.HEIGHT / 2,
                spawnTime: time,
                alive: true,
                animPhase: 0,
            });
        }

        // Update mines
        for (const mine of this.mines) {
            mine.animPhase += dt * 5;
            if (time - mine.spawnTime > CONFIG.BOMBER.MINE_LIFETIME) {
                mine.alive = false;
            }
        }
        this.mines = this.mines.filter(m => m.alive);
    }

    draw(screenX, cameraX) {
        this.graphics.clear();
        if (!this.alive) return;

        const w = CONFIG.BOMBER.WIDTH;
        const h = CONFIG.BOMBER.HEIGHT;
        const pulse = 0.7 + 0.3 * Math.sin(this.animPhase);

        this.graphics.lineStyle(2, CONFIG.COLORS.BOMBER, pulse);
        this.graphics.fillStyle(CONFIG.COLORS.BOMBER, 0.2);

        // Rectangular saucer shape
        this.graphics.beginPath();
        this.graphics.moveTo(screenX - w / 2, this.y);
        this.graphics.lineTo(screenX - w / 4, this.y - h / 2);
        this.graphics.lineTo(screenX + w / 4, this.y - h / 2);
        this.graphics.lineTo(screenX + w / 2, this.y);
        this.graphics.lineTo(screenX + w / 4, this.y + h / 2);
        this.graphics.lineTo(screenX - w / 4, this.y + h / 2);
        this.graphics.closePath();
        this.graphics.fillPath();
        this.graphics.strokePath();

        // Draw mines
        for (const mine of this.mines) {
            const mx = this._toScreen(mine.x, cameraX);
            if (mx < -20 || mx > CONFIG.WIDTH + 20) continue;
            const mPulse = 0.5 + 0.5 * Math.sin(mine.animPhase);
            this.graphics.fillStyle(CONFIG.COLORS.BOMBER_MINE, mPulse);
            const s = CONFIG.BOMBER.MINE_SIZE;
            // Draw mine as small diamond
            this.graphics.beginPath();
            this.graphics.moveTo(mx, mine.y - s);
            this.graphics.lineTo(mx + s, mine.y);
            this.graphics.lineTo(mx, mine.y + s);
            this.graphics.lineTo(mx - s, mine.y);
            this.graphics.closePath();
            this.graphics.fillPath();
        }
    }

    _toScreen(worldX, cameraX) {
        let sx = worldX - cameraX;
        if (sx < -CONFIG.WORLD_WIDTH / 2) sx += CONFIG.WORLD_WIDTH;
        if (sx > CONFIG.WORLD_WIDTH / 2) sx -= CONFIG.WORLD_WIDTH;
        return sx + CONFIG.WIDTH / 2;
    }

    getMineBounds() {
        return this.mines.filter(m => m.alive).map(m => ({
            x: m.x - CONFIG.BOMBER.MINE_SIZE,
            y: m.y - CONFIG.BOMBER.MINE_SIZE,
            width: CONFIG.BOMBER.MINE_SIZE * 2,
            height: CONFIG.BOMBER.MINE_SIZE * 2,
            mine: m,
        }));
    }

    getBounds() {
        return {
            x: this.x - CONFIG.BOMBER.WIDTH / 2,
            y: this.y - CONFIG.BOMBER.HEIGHT / 2,
            width: CONFIG.BOMBER.WIDTH,
            height: CONFIG.BOMBER.HEIGHT,
        };
    }

    destroy() {
        this.graphics.destroy();
    }
}
