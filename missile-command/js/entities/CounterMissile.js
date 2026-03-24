// ============================================================
// Missile Command — Counter-Missile (Player Projectile)
// ============================================================

class CounterMissile {
    constructor(startX, startY, targetX, targetY, speed) {
        this.startX = startX;
        this.startY = startY;
        this.x = startX;
        this.y = startY;
        this.targetX = targetX;
        this.targetY = targetY;
        this.speed = speed || CONFIG.COUNTER_MISSILE_SPEED;
        this.dead = false;
        this.detonated = false;

        const dist = Helpers.distance(startX, startY, targetX, targetY);
        this.dx = (targetX - startX) / dist;
        this.dy = (targetY - startY) / dist;

        // Trail history
        this.trail = [{ x: startX, y: startY }];
        this.trailTimer = 0;

        // Exhaust flame animation
        this.flamePhase = Math.random() * Math.PI * 2;
    }

    update(dt, particleSystem) {
        if (this.dead) return;

        this.x += this.dx * this.speed * dt;
        this.y += this.dy * this.speed * dt;
        this.flamePhase += dt * 20;

        // Trail
        this.trailTimer += dt * 1000;
        if (this.trailTimer > 15) {
            this.trail.push({ x: this.x, y: this.y });
            if (this.trail.length > 35) this.trail.shift();
            this.trailTimer = 0;
        }

        // Smoke particles
        if (particleSystem && Math.random() < 0.35) {
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

        // Trail glow (outer, wider)
        for (let i = 1; i < this.trail.length; i++) {
            const alpha = (i / this.trail.length) * 0.15;
            graphics.lineStyle(6, 0x2266cc, alpha);
            graphics.lineBetween(
                this.trail[i - 1].x, this.trail[i - 1].y,
                this.trail[i].x, this.trail[i].y
            );
        }

        // Trail core (inner, bright)
        for (let i = 1; i < this.trail.length; i++) {
            const alpha = (i / this.trail.length) * 0.7;
            const width = 1 + (i / this.trail.length) * 1.5;
            graphics.lineStyle(width, 0x4488ff, alpha);
            graphics.lineBetween(
                this.trail[i - 1].x, this.trail[i - 1].y,
                this.trail[i].x, this.trail[i].y
            );
        }

        // Current position to missile head
        if (this.trail.length > 0) {
            const last = this.trail[this.trail.length - 1];
            graphics.lineStyle(2.5, 0x66aaff, 0.9);
            graphics.lineBetween(last.x, last.y, this.x, this.y);
        }

        // Exhaust flame at tail
        const flameDx = -this.dx;
        const flameDy = -this.dy;
        const flameLen = 6 + Math.sin(this.flamePhase) * 2;
        const fx = this.x + flameDx * flameLen;
        const fy = this.y + flameDy * flameLen;

        // Outer flame
        graphics.fillStyle(0xff8844, 0.5 + Math.sin(this.flamePhase) * 0.2);
        graphics.fillCircle(
            this.x + flameDx * 3,
            this.y + flameDy * 3,
            3
        );
        // Inner flame
        graphics.fillStyle(0xffcc44, 0.4);
        graphics.fillCircle(
            this.x + flameDx * 2,
            this.y + flameDy * 2,
            2
        );

        // Missile head - brighter glow
        graphics.fillStyle(0x88bbff, 0.3);
        graphics.fillCircle(this.x, this.y, 5);
        graphics.fillStyle(0xaaccff, 1);
        graphics.fillCircle(this.x, this.y, 3);
        graphics.fillStyle(0xffffff, 0.9);
        graphics.fillCircle(this.x, this.y, 1.5);

        // Target crosshair
        const ch = 7;
        const crossAlpha = 0.4 + Math.sin(Date.now() * 0.005) * 0.1;
        graphics.lineStyle(1, 0x4488ff, crossAlpha);
        graphics.lineBetween(this.targetX - ch, this.targetY, this.targetX + ch, this.targetY);
        graphics.lineBetween(this.targetX, this.targetY - ch, this.targetX, this.targetY + ch);
        // Crosshair circle
        graphics.lineStyle(0.5, 0x4488ff, crossAlpha * 0.6);
        graphics.strokeCircle(this.targetX, this.targetY, ch * 0.8);
    }
}
