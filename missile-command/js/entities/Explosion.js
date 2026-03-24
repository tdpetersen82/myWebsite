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

        // Shockwave
        this.shockwaveRadius = 0;
        this.shockwaveAlpha = 0.6;
        this.shockwaveActive = true;

        // Turbulence
        this.turbulenceOffset = Math.random() * 100;

        // Smoke trail
        this.smokeParticles = [];

        // Ground scorch position
        this.scorchY = CONFIG.GROUND_Y;
        this.scorchRadius = maxRadius * 0.6;
    }

    update(dt, particleSystem) {
        const dtMs = dt * 1000;

        // Shockwave expands faster than fireball
        if (this.shockwaveActive) {
            this.shockwaveRadius += CONFIG.EXPLOSION.EXPAND_SPEED * dt * 2.5;
            this.shockwaveAlpha -= dt * 2;
            if (this.shockwaveAlpha <= 0) {
                this.shockwaveActive = false;
            }
        }

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
                // Spawn lingering smoke
                if (Math.random() < 0.15) {
                    this.smokeParticles.push({
                        x: this.x + Helpers.randomRange(-this.maxRadius * 0.3, this.maxRadius * 0.3),
                        y: this.y + Helpers.randomRange(-this.maxRadius * 0.3, this.maxRadius * 0.3),
                        radius: Helpers.randomRange(3, 8),
                        alpha: 0.15,
                        vy: -Helpers.randomRange(5, 15),
                    });
                }
                if (this.radius <= 0) {
                    this.radius = 0;
                    this.dead = true;
                }
                break;
        }

        // Update smoke particles
        for (let i = this.smokeParticles.length - 1; i >= 0; i--) {
            const s = this.smokeParticles[i];
            s.alpha -= dt * 0.15;
            s.y += s.vy * dt;
            s.radius += dt * 2;
            if (s.alpha <= 0) this.smokeParticles.splice(i, 1);
        }
    }

    draw(graphics) {
        if (this.dead && this.smokeParticles.length === 0) return;

        const t = this.maxRadius > 0 ? this.radius / this.maxRadius : 0;
        const [r, g, b] = this.baseColor;
        const time = Date.now() * 0.01 + this.turbulenceOffset;

        // Shockwave ring
        if (this.shockwaveActive && this.shockwaveRadius > 0) {
            graphics.lineStyle(2, 0xffffff, this.shockwaveAlpha * 0.4);
            graphics.strokeCircle(this.x, this.y, this.shockwaveRadius);
            graphics.lineStyle(1, Helpers.colorToHex(r, g, b), this.shockwaveAlpha * 0.2);
            graphics.strokeCircle(this.x, this.y, this.shockwaveRadius * 0.9);
        }

        if (this.radius > 0) {
            // Outer glow
            const glowRadius = this.radius * 1.6;
            graphics.fillStyle(Helpers.colorToHex(
                Math.min(255, r),
                Math.min(255, Math.floor(g * 0.4)),
                Math.min(255, Math.floor(b * 0.2))
            ), 0.12 * t);
            graphics.fillCircle(this.x, this.y, glowRadius);

            // Main fireball with turbulent edge
            const segments = 16;
            graphics.fillStyle(Helpers.colorToHex(r, g, b), 0.7);
            graphics.beginPath();
            for (let i = 0; i <= segments; i++) {
                const angle = (i / segments) * Math.PI * 2;
                const turbulence = 1 + Math.sin(time + angle * 3) * 0.12 + Math.cos(time * 1.3 + angle * 5) * 0.06;
                const rad = this.radius * turbulence;
                const px = this.x + Math.cos(angle) * rad;
                const py = this.y + Math.sin(angle) * rad;
                if (i === 0) {
                    graphics.moveTo(px, py);
                } else {
                    graphics.lineTo(px, py);
                }
            }
            graphics.closePath();
            graphics.fillPath();

            // Middle layer - brighter
            graphics.fillStyle(Helpers.colorToHex(
                Math.min(255, r + 60),
                Math.min(255, g + 60),
                Math.min(255, b + 30)
            ), 0.5 * t);
            graphics.fillCircle(this.x, this.y, this.radius * 0.65);

            // Inner bright core
            const coreRadius = this.radius * 0.4;
            graphics.fillStyle(0xffffff, 0.55 * t);
            graphics.fillCircle(this.x, this.y, coreRadius);

            // Hot center
            if (this.phase !== 'shrink') {
                graphics.fillStyle(0xffffee, 0.7);
                graphics.fillCircle(this.x, this.y, this.radius * 0.15);
            }

            // Ring edge highlight
            graphics.lineStyle(1.5, Helpers.colorToHex(
                Math.min(255, r + 60),
                Math.min(255, g + 60),
                Math.min(255, b + 60)
            ), 0.25 * t);
            graphics.strokeCircle(this.x, this.y, this.radius);

            // Ground scorch mark (if explosion is near ground)
            if (this.y > CONFIG.GROUND_Y - this.maxRadius) {
                graphics.fillStyle(0x0a0a0a, 0.2 * t);
                graphics.fillEllipse(this.x, CONFIG.GROUND_Y + 1, this.scorchRadius * 2, 4);
            }
        }

        // Lingering smoke
        for (const s of this.smokeParticles) {
            graphics.fillStyle(0x333333, s.alpha);
            graphics.fillCircle(s.x, s.y, s.radius);
        }
    }

    // Check if a point is within the explosion radius
    contains(x, y) {
        if (this.dead || this.radius <= 0) return false;
        return Helpers.distance(this.x, this.y, x, y) <= this.radius;
    }
}
