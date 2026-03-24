// ============================================================
// Missile Command — Point Defense Turret Entity
// ============================================================

class PointDefense {
    constructor(x, y, level) {
        this.x = x;
        this.y = y - 5; // Sits slightly above ground
        this.level = level;
        this.alive = true;

        const cfg = CONFIG.POINT_DEFENSE.LEVELS[level - 1];
        this.fireRate = cfg.fireRate;
        this.range = cfg.range;
        this.accuracy = cfg.accuracy;
        this.projectileSpeed = cfg.projectileSpeed;
        this.damage = cfg.damage;

        this.fireTimer = this.fireRate * Math.random(); // Stagger initial fire
        this.aimAngle = -Math.PI / 2;
        this.target = null;
        this.flashTimer = 0;

        // Projectiles fired by this turret
        this.projectiles = [];

        // Visual
        this.rotSpeed = 0;
        this.baseAngle = -Math.PI / 2;
    }

    update(dt, enemyMissiles) {
        if (!this.alive) return;

        this.fireTimer -= dt * 1000;
        this.flashTimer = Math.max(0, this.flashTimer - dt * 1000);

        // Find best target
        this.target = null;
        let bestDist = this.range;
        let bestPriority = 0;

        for (const em of enemyMissiles) {
            if (em.dead) continue;
            const d = Helpers.distance(this.x, this.y, em.x, em.y);
            if (d > this.range) continue;

            // Priority: MIRV > ARMORED > FAST > BASIC
            let priority = 1;
            if (em.type === 'MIRV' && !em.mirvSplit) priority = 4;
            else if (em.type === 'ARMORED') priority = 3;
            else if (em.type === 'FAST') priority = 2;

            if (priority > bestPriority || (priority === bestPriority && d < bestDist)) {
                bestPriority = priority;
                bestDist = d;
                this.target = em;
            }
        }

        // Aim at target
        if (this.target) {
            const targetAngle = Helpers.angle(this.x, this.y, this.target.x, this.target.y);
            let diff = targetAngle - this.aimAngle;
            while (diff > Math.PI) diff -= Math.PI * 2;
            while (diff < -Math.PI) diff += Math.PI * 2;
            this.aimAngle += Helpers.clamp(diff, -dt * 8, dt * 8);
        } else {
            // Slowly rotate when idle
            this.aimAngle += Math.sin(Date.now() * 0.001) * dt * 0.5;
        }

        // Fire
        if (this.target && this.fireTimer <= 0) {
            if (Math.random() < this.accuracy) {
                // Aimed shot with slight inaccuracy
                const inaccuracy = (1 - this.accuracy) * 0.5;
                const aimX = this.target.x + Helpers.randomRange(-20, 20) * inaccuracy;
                const aimY = this.target.y + Helpers.randomRange(-20, 20) * inaccuracy;
                const dist = Helpers.distance(this.x, this.y, aimX, aimY);
                const pdx = (aimX - this.x) / dist;
                const pdy = (aimY - this.y) / dist;

                this.projectiles.push({
                    x: this.x, y: this.y,
                    dx: pdx, dy: pdy,
                    speed: this.projectileSpeed,
                    life: 800, // ms
                    trail: [],
                });
            }
            this.fireTimer = this.fireRate;
            this.flashTimer = 80;
        }

        // Update projectiles
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const p = this.projectiles[i];
            p.x += p.dx * p.speed * dt;
            p.y += p.dy * p.speed * dt;
            p.life -= dt * 1000;

            p.trail.push({ x: p.x, y: p.y });
            if (p.trail.length > 8) p.trail.shift();

            if (p.life <= 0 || p.x < 0 || p.x > CONFIG.WIDTH || p.y < 0 || p.y > CONFIG.HEIGHT) {
                this.projectiles.splice(i, 1);
            }
        }
    }

    checkHits(enemyMissiles) {
        const hits = [];
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const p = this.projectiles[i];
            for (const em of enemyMissiles) {
                if (em.dead) continue;
                if (Helpers.distance(p.x, p.y, em.x, em.y) < CONFIG.POINT_DEFENSE.PROJECTILE_RADIUS) {
                    hits.push(em);
                    this.projectiles.splice(i, 1);
                    break;
                }
            }
        }
        return hits;
    }

    draw(graphics) {
        if (!this.alive) return;

        // Range indicator (very subtle)
        graphics.lineStyle(0.5, 0x44aaff, 0.04);
        graphics.strokeCircle(this.x, this.y, this.range);

        // Turret base
        graphics.fillStyle(0x445566, 0.8);
        graphics.fillRect(this.x - 4, this.y - 2, 8, 5);
        graphics.fillStyle(0x556677, 0.9);
        graphics.fillCircle(this.x, this.y - 2, 4);

        // Barrel
        const barrelLen = 8;
        const bx = this.x + Math.cos(this.aimAngle) * barrelLen;
        const by = this.y + Math.sin(this.aimAngle) * barrelLen;
        const barrelColor = this.flashTimer > 0 ? 0xffff88 : 0x778899;
        graphics.lineStyle(2, barrelColor, 0.9);
        graphics.lineBetween(this.x, this.y - 2, bx, by - 2);

        // Flash
        if (this.flashTimer > 0) {
            graphics.fillStyle(0xffff88, this.flashTimer / 80 * 0.6);
            graphics.fillCircle(bx, by - 2, 3);
        }

        // Projectiles
        for (const p of this.projectiles) {
            // Trail
            for (let i = 1; i < p.trail.length; i++) {
                const alpha = (i / p.trail.length) * 0.4;
                graphics.lineStyle(1, 0x88ccff, alpha);
                graphics.lineBetween(p.trail[i - 1].x, p.trail[i - 1].y, p.trail[i].x, p.trail[i].y);
            }
            // Projectile head
            graphics.fillStyle(0xaaddff, 0.9);
            graphics.fillCircle(p.x, p.y, 1.5);
            graphics.fillStyle(0xffffff, 0.6);
            graphics.fillCircle(p.x, p.y, 0.8);
        }

        // Level indicator dots
        for (let i = 0; i < this.level; i++) {
            graphics.fillStyle(0x44aaff, 0.5);
            graphics.fillCircle(this.x - (this.level - 1) * 2.5 + i * 5, this.y + 6, 1);
        }
    }
}
