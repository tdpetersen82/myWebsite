// defender/js/entities/Pod.js — Enemy that splits into Swarmers when destroyed

class Pod {
    constructor(scene, x, y, difficulty) {
        this.scene = scene;
        this.x = x;
        this.y = y;
        this.difficulty = difficulty;
        this.speedMult = difficulty.enemySpeedMult;
        this.alive = true;
        this.hp = CONFIG.POD.HP;
        this.vx = (Math.random() - 0.5) * CONFIG.POD.SPEED * this.speedMult * 2;
        this.vy = (Math.random() - 0.5) * CONFIG.POD.SPEED * this.speedMult;

        this.graphics = scene.add.graphics();
        this.animPhase = Math.random() * Math.PI * 2;
        this.rotation = 0;
    }

    update(delta) {
        const dt = delta / 1000;
        this.animPhase += dt * 2;
        this.rotation += dt * 2;

        // Drift and bounce off vertical bounds
        this.x += this.vx * dt;
        this.y += this.vy * dt;

        if (this.y < 60 || this.y > CONFIG.GROUND_Y - 40) {
            this.vy = -this.vy;
        }

        // Wrap world
        if (this.x < 0) this.x += CONFIG.WORLD_WIDTH;
        if (this.x >= CONFIG.WORLD_WIDTH) this.x -= CONFIG.WORLD_WIDTH;

        this.y = Phaser.Math.Clamp(this.y, 50, CONFIG.GROUND_Y - 30);
    }

    draw(screenX) {
        this.graphics.clear();
        if (!this.alive) return;
        const s = CONFIG.POD.WIDTH / 2;
        const pulse = 0.7 + 0.3 * Math.sin(this.animPhase);

        this.graphics.lineStyle(2, CONFIG.COLORS.POD, pulse);
        this.graphics.fillStyle(CONFIG.COLORS.POD, 0.15);

        // Rotating square
        const cos = Math.cos(this.rotation);
        const sin = Math.sin(this.rotation);
        const pts = [
            { x: -s, y: -s },
            { x: s, y: -s },
            { x: s, y: s },
            { x: -s, y: s },
        ];

        this.graphics.beginPath();
        pts.forEach((p, i) => {
            const rx = screenX + p.x * cos - p.y * sin;
            const ry = this.y + p.x * sin + p.y * cos;
            if (i === 0) this.graphics.moveTo(rx, ry);
            else this.graphics.lineTo(rx, ry);
        });
        this.graphics.closePath();
        this.graphics.fillPath();
        this.graphics.strokePath();
    }

    getBounds() {
        return {
            x: this.x - CONFIG.POD.WIDTH / 2,
            y: this.y - CONFIG.POD.HEIGHT / 2,
            width: CONFIG.POD.WIDTH,
            height: CONFIG.POD.HEIGHT,
        };
    }

    destroy() {
        this.graphics.destroy();
    }
}

// Swarmer — small fast enemy spawned from Pod
class Swarmer {
    constructor(scene, x, y, difficulty) {
        this.scene = scene;
        this.x = x;
        this.y = y;
        this.difficulty = difficulty;
        this.speedMult = difficulty.enemySpeedMult;
        this.alive = true;
        this.hp = CONFIG.SWARMER.HP;

        const angle = Math.random() * Math.PI * 2;
        const speed = CONFIG.SWARMER.SPEED * this.speedMult;
        this.vx = Math.cos(angle) * speed;
        this.vy = Math.sin(angle) * speed;

        this.graphics = scene.add.graphics();
        this.animPhase = Math.random() * Math.PI * 2;
    }

    update(delta, shipX, shipY) {
        const dt = delta / 1000;
        this.animPhase += dt * 8;

        // Slightly home toward player
        const dx = this._worldDist(shipX, this.x);
        const dy = shipY - this.y;
        this.vx += Math.sign(dx) * 80 * dt;
        this.vy += Math.sign(dy) * 60 * dt;

        const maxSpd = CONFIG.SWARMER.SPEED * this.speedMult;
        const mag = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
        if (mag > maxSpd) {
            this.vx = (this.vx / mag) * maxSpd;
            this.vy = (this.vy / mag) * maxSpd;
        }

        this.x += this.vx * dt;
        this.y += this.vy * dt;

        // Wrap world
        if (this.x < 0) this.x += CONFIG.WORLD_WIDTH;
        if (this.x >= CONFIG.WORLD_WIDTH) this.x -= CONFIG.WORLD_WIDTH;

        this.y = Phaser.Math.Clamp(this.y, 45, CONFIG.GROUND_Y - 10);
    }

    _worldDist(ax, bx) {
        let d = ax - bx;
        if (d > CONFIG.WORLD_WIDTH / 2) d -= CONFIG.WORLD_WIDTH;
        if (d < -CONFIG.WORLD_WIDTH / 2) d += CONFIG.WORLD_WIDTH;
        return d;
    }

    draw(screenX) {
        this.graphics.clear();
        if (!this.alive) return;
        const s = CONFIG.SWARMER.WIDTH / 2;
        const pulse = 0.6 + 0.4 * Math.sin(this.animPhase);

        this.graphics.lineStyle(1.5, CONFIG.COLORS.SWARMER, pulse);
        // Small triangle
        this.graphics.beginPath();
        this.graphics.moveTo(screenX, this.y - s);
        this.graphics.lineTo(screenX + s, this.y + s);
        this.graphics.lineTo(screenX - s, this.y + s);
        this.graphics.closePath();
        this.graphics.strokePath();
    }

    getBounds() {
        return {
            x: this.x - CONFIG.SWARMER.WIDTH / 2,
            y: this.y - CONFIG.SWARMER.HEIGHT / 2,
            width: CONFIG.SWARMER.WIDTH,
            height: CONFIG.SWARMER.HEIGHT,
        };
    }

    destroy() {
        this.graphics.destroy();
    }
}
