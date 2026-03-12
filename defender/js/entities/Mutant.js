// defender/js/entities/Mutant.js — Fast aggressive enemy that chases the player

class Mutant {
    constructor(scene, x, y, difficulty) {
        this.scene = scene;
        this.x = x;
        this.y = y;
        this.difficulty = difficulty;
        this.speedMult = difficulty.enemySpeedMult;
        this.alive = true;
        this.hp = CONFIG.MUTANT.HP;
        this.vx = 0;
        this.vy = 0;

        this.graphics = scene.add.graphics();
        this.animPhase = Math.random() * Math.PI * 2;
    }

    update(delta, shipX, shipY) {
        const dt = delta / 1000;
        this.animPhase += dt * 6;

        // Chase player
        const dx = this._worldDist(shipX, this.x);
        const dy = shipY - this.y;

        this.vx += Math.sign(dx) * CONFIG.MUTANT.CHASE_ACCEL * this.speedMult * dt;
        this.vy += Math.sign(dy) * CONFIG.MUTANT.CHASE_ACCEL * this.speedMult * 0.6 * dt;

        // Clamp speed
        const maxSpd = CONFIG.MUTANT.SPEED * this.speedMult;
        this.vx = Phaser.Math.Clamp(this.vx, -maxSpd, maxSpd);
        this.vy = Phaser.Math.Clamp(this.vy, -maxSpd * 0.6, maxSpd * 0.6);

        // Add some erratic movement
        this.vx += (Math.random() - 0.5) * 100 * dt;
        this.vy += (Math.random() - 0.5) * 80 * dt;

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
        const w = CONFIG.MUTANT.WIDTH;
        const h = CONFIG.MUTANT.HEIGHT;
        const pulse = 0.6 + 0.4 * Math.sin(this.animPhase);

        this.graphics.lineStyle(2, CONFIG.COLORS.MUTANT, pulse);
        this.graphics.fillStyle(CONFIG.COLORS.MUTANT, 0.3);

        // Jagged spiky shape
        this.graphics.beginPath();
        this.graphics.moveTo(screenX, this.y - h / 2);
        this.graphics.lineTo(screenX + w / 3, this.y - h / 4);
        this.graphics.lineTo(screenX + w / 2, this.y);
        this.graphics.lineTo(screenX + w / 3, this.y + h / 4);
        this.graphics.lineTo(screenX, this.y + h / 2);
        this.graphics.lineTo(screenX - w / 3, this.y + h / 4);
        this.graphics.lineTo(screenX - w / 2, this.y);
        this.graphics.lineTo(screenX - w / 3, this.y - h / 4);
        this.graphics.closePath();
        this.graphics.fillPath();
        this.graphics.strokePath();
    }

    getBounds() {
        return {
            x: this.x - CONFIG.MUTANT.WIDTH / 2,
            y: this.y - CONFIG.MUTANT.HEIGHT / 2,
            width: CONFIG.MUTANT.WIDTH,
            height: CONFIG.MUTANT.HEIGHT,
        };
    }

    destroy() {
        this.graphics.destroy();
    }
}
