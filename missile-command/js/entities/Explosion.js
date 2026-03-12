// ============================================================
// Missile Command — Explosion Entity
// ============================================================

class Explosion {
    constructor(x, y, maxRadius, isPlayer = true) {
        this.x = x;
        this.y = y;
        this.maxRadius = maxRadius;
        this.radius = 0;
        this.isPlayer = isPlayer;
        this.phase = 'expand'; // expand, hold, shrink
        this.holdTimer = 0;
        this.dead = false;
        this.colorIdx = isPlayer ? 4 : Helpers.randomInt(0, 3);
        this.baseColor = CONFIG.EXPLOSION.COLORS[this.colorIdx];
        this.particlesEmitted = false;
    }

    update(dt, particleSystem) {
        const dtMs = dt * 1000;

        switch (this.phase) {
            case 'expand':
                this.radius += CONFIG.EXPLOSION.EXPAND_SPEED * dt;
                if (this.radius >= this.maxRadius) {
                    this.radius = this.maxRadius;
                    this.phase = 'hold';
                    this.holdTimer = CONFIG.EXPLOSION.HOLD_TIME;
                }
                // Emit particles during expansion
                if (!this.particlesEmitted && this.radius > this.maxRadius * 0.5 && particleSystem) {
                    particleSystem.emitExplosion(this.x, this.y, this.maxRadius);
                    this.particlesEmitted = true;
                }
                break;

            case 'hold':
                this.holdTimer -= dtMs;
                if (this.holdTimer <= 0) {
                    this.phase = 'shrink';
                }
                break;

            case 'shrink':
                this.radius -= CONFIG.EXPLOSION.SHRINK_SPEED * dt;
                if (this.radius <= 0) {
                    this.radius = 0;
                    this.dead = true;
                }
                break;
        }
    }

    draw(graphics) {
        if (this.dead || this.radius <= 0) return;

        const t = this.radius / this.maxRadius;
        const [r, g, b] = this.baseColor;

        // Outer glow
        const glowRadius = this.radius * 1.4;
        graphics.fillStyle(Helpers.colorToHex(
            Math.min(255, r),
            Math.min(255, Math.floor(g * 0.5)),
            Math.min(255, Math.floor(b * 0.3))
        ), 0.15);
        graphics.fillCircle(this.x, this.y, glowRadius);

        // Main body
        graphics.fillStyle(Helpers.colorToHex(r, g, b), 0.7);
        graphics.fillCircle(this.x, this.y, this.radius);

        // Inner bright core
        const coreRadius = this.radius * 0.5;
        graphics.fillStyle(0xffffff, 0.5 * t);
        graphics.fillCircle(this.x, this.y, coreRadius);

        // Hot center
        if (this.phase !== 'shrink') {
            graphics.fillStyle(0xffffcc, 0.6);
            graphics.fillCircle(this.x, this.y, this.radius * 0.2);
        }

        // Ring edge
        graphics.lineStyle(2, Helpers.colorToHex(
            Math.min(255, r + 50),
            Math.min(255, g + 50),
            Math.min(255, b + 50)
        ), 0.3);
        graphics.strokeCircle(this.x, this.y, this.radius);
    }

    // Check if a point is within the explosion radius
    contains(x, y) {
        if (this.dead || this.radius <= 0) return false;
        return Helpers.distance(this.x, this.y, x, y) <= this.radius;
    }
}
