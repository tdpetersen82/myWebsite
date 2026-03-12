// ============================================================
// Missile Command — Counter-Missile (Player Projectile)
// ============================================================

class CounterMissile {
    constructor(startX, startY, targetX, targetY) {
        this.startX = startX;
        this.startY = startY;
        this.x = startX;
        this.y = startY;
        this.targetX = targetX;
        this.targetY = targetY;
        this.speed = CONFIG.COUNTER_MISSILE_SPEED;
        this.dead = false;
        this.detonated = false;

        const dist = Helpers.distance(startX, startY, targetX, targetY);
        this.dx = (targetX - startX) / dist;
        this.dy = (targetY - startY) / dist;

        // Trail history
        this.trail = [{ x: startX, y: startY }];
        this.trailTimer = 0;
    }

    update(dt, particleSystem) {
        if (this.dead) return;

        this.x += this.dx * this.speed * dt;
        this.y += this.dy * this.speed * dt;

        // Trail
        this.trailTimer += dt * 1000;
        if (this.trailTimer > 20) {
            this.trail.push({ x: this.x, y: this.y });
            if (this.trail.length > 30) this.trail.shift();
            this.trailTimer = 0;
        }

        // Smoke particles
        if (particleSystem && Math.random() < 0.3) {
            particleSystem.emitTrail(this.x, this.y, 0x4488ff);
        }

        // Check if reached target
        const distToTarget = Helpers.distance(this.x, this.y, this.targetX, this.targetY);
        if (distToTarget < this.speed * dt + 5) {
            this.x = this.targetX;
            this.y = this.targetY;
            this.detonated = true;
            this.dead = true;
        }

        // Out of bounds
        if (this.y < -20 || this.y > CONFIG.HEIGHT + 20 ||
            this.x < -20 || this.x > CONFIG.WIDTH + 20) {
            this.dead = true;
        }
    }

    draw(graphics) {
        if (this.dead) return;

        // Trail
        for (let i = 1; i < this.trail.length; i++) {
            const alpha = i / this.trail.length;
            graphics.lineStyle(2 * alpha, 0x4488ff, alpha * 0.6);
            graphics.lineBetween(
                this.trail[i - 1].x, this.trail[i - 1].y,
                this.trail[i].x, this.trail[i].y
            );
        }

        // Current position to missile head
        if (this.trail.length > 0) {
            graphics.lineStyle(2, 0x66aaff, 0.8);
            const last = this.trail[this.trail.length - 1];
            graphics.lineBetween(last.x, last.y, this.x, this.y);
        }

        // Missile head
        graphics.fillStyle(0xaaccff, 1);
        graphics.fillCircle(this.x, this.y, 3);
        graphics.fillStyle(0xffffff, 0.8);
        graphics.fillCircle(this.x, this.y, 1.5);

        // Target crosshair
        const ch = 6;
        graphics.lineStyle(1, 0x4488ff, 0.5);
        graphics.lineBetween(this.targetX - ch, this.targetY, this.targetX + ch, this.targetY);
        graphics.lineBetween(this.targetX, this.targetY - ch, this.targetX, this.targetY + ch);
    }
}
