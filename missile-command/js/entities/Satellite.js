// ============================================================
// Missile Command — Satellite Entity
// ============================================================

class Satellite {
    constructor(wave = 8) {
        this.wave = wave;
        this.health = CONFIG.SATELLITE.HEALTH;
        this.maxHealth = CONFIG.SATELLITE.HEALTH;
        this.points = CONFIG.SATELLITE.POINTS;
        this.dead = false;

        // Orbit across the top
        this.direction = Math.random() < 0.5 ? 1 : -1;
        this.x = this.direction === 1 ? -20 : CONFIG.WIDTH + 20;
        this.y = Helpers.randomRange(25, 55);
        this.speed = CONFIG.SATELLITE.SPEED;

        this.fireTimer = CONFIG.SATELLITE.FIRE_RATE;
        this.rotAngle = 0;

        // Size for collision
        this.radius = 12;
    }

    update(dt) {
        if (this.dead) return;

        this.x += this.direction * this.speed * dt;
        this.rotAngle += dt * 2;
        this.fireTimer -= dt * 1000;

        // Off screen
        if ((this.direction === 1 && this.x > CONFIG.WIDTH + 40) ||
            (this.direction === -1 && this.x < -40)) {
            this.dead = true;
        }
    }

    shouldFire() {
        if (this.fireTimer <= 0 && this.x > 50 && this.x < CONFIG.WIDTH - 50) {
            this.fireTimer = CONFIG.SATELLITE.FIRE_RATE;
            return true;
        }
        return false;
    }

    createMissile(cities) {
        const aliveCities = cities.filter(c => c.alive);
        let tx, ty;
        if (aliveCities.length > 0) {
            const target = Helpers.randomChoice(aliveCities);
            tx = target.x;
            ty = CONFIG.GROUND_Y;
        } else {
            tx = Helpers.randomRange(80, CONFIG.WIDTH - 80);
            ty = CONFIG.GROUND_Y;
        }
        return new EnemyMissile(this.x, this.y + 10, tx, ty, 'FAST', this.wave);
    }

    hit() {
        this.health--;
        if (this.health <= 0) {
            this.dead = true;
            return true;
        }
        return false;
    }

    contains(x, y, radius) {
        return Helpers.distance(x, y, this.x, this.y) < (this.radius + radius);
    }

    draw(graphics) {
        if (this.dead) return;

        // Solar panels
        const panelW = 18;
        const panelH = 6;
        graphics.fillStyle(0x3366cc, 0.8);
        graphics.fillRect(this.x - panelW - 5, this.y - panelH / 2, panelW, panelH);
        graphics.fillRect(this.x + 5, this.y - panelH / 2, panelW, panelH);

        // Panel grid lines
        graphics.lineStyle(0.5, 0x4488ee, 0.5);
        for (let i = 0; i < 4; i++) {
            const lx = this.x - panelW - 5 + (panelW / 4) * i;
            graphics.lineBetween(lx, this.y - panelH / 2, lx, this.y + panelH / 2);
            const rx = this.x + 5 + (panelW / 4) * i;
            graphics.lineBetween(rx, this.y - panelH / 2, rx, this.y + panelH / 2);
        }

        // Body
        graphics.fillStyle(0xcccccc, 0.9);
        graphics.fillRect(this.x - 5, this.y - 5, 10, 10);

        // Antenna
        graphics.lineStyle(1, 0xdddddd, 0.7);
        graphics.lineBetween(this.x, this.y - 5, this.x, this.y - 12);
        graphics.fillStyle(0xff4444, 0.6 + Math.sin(Date.now() * 0.005) * 0.4);
        graphics.fillCircle(this.x, this.y - 12, 2);

        // Weapon glow (when about to fire)
        if (this.fireTimer < 500) {
            const glow = (500 - this.fireTimer) / 500;
            graphics.fillStyle(0xff4444, glow * 0.4);
            graphics.fillCircle(this.x, this.y + 5, 4 * glow);
        }

        // Health pips
        for (let i = 0; i < this.maxHealth; i++) {
            const px = this.x - (this.maxHealth - 1) * 3 + i * 6;
            const py = this.y + 10;
            graphics.fillStyle(i < this.health ? 0x44ff44 : 0x440000, 0.7);
            graphics.fillCircle(px, py, 2);
        }
    }
}
