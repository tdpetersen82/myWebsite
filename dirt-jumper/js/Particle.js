// Dirt Jumper — dust & dirt-spray particles (purely cosmetic).
// A small pooled field advanced by dt and drawn on its own graphics layer.
// Deliberately independent of Bike physics so verification stays clean.

class ParticleField {
    constructor() {
        this.parts = [];
        this.max = 220;
    }

    _spawn(x, y, vx, vy, life, size, color, alpha) {
        if (this.parts.length >= this.max) this.parts.shift();
        this.parts.push({ x, y, vx, vy, life, maxLife: life, size, color, alpha });
    }

    // continuous wheel dust, scaled by speed
    wheelDust(x, y, speed) {
        const n = speed > 700 ? 2 : 1;
        for (let i = 0; i < n; i++) {
            const sp = 30 + Math.random() * 60;
            const ang = Math.PI + (Math.random() - 0.5) * 1.2;   // kick backward
            this._spawn(
                x + (Math.random() - 0.5) * 8, y - 2,
                Math.cos(ang) * sp - speed * 0.05, Math.sin(ang) * sp - 20 - Math.random() * 30,
                0.35 + Math.random() * 0.3,
                3 + Math.random() * 3,
                CONFIG.COLORS.DUST,
                0.5
            );
        }
    }

    // landing / crash burst
    burst(x, y, n, color, power) {
        for (let i = 0; i < n; i++) {
            const ang = Math.PI + (Math.random() - 0.5) * Math.PI * 0.9;
            const sp = (40 + Math.random() * 120) * (power || 1);
            this._spawn(
                x, y - 2,
                Math.cos(ang) * sp, Math.sin(ang) * sp - 40,
                0.5 + Math.random() * 0.5,
                3 + Math.random() * 4,
                color || CONFIG.COLORS.DUST,
                0.75
            );
        }
    }

    update(dt) {
        const g = 420;
        for (let i = this.parts.length - 1; i >= 0; i--) {
            const p = this.parts[i];
            p.life -= dt;
            if (p.life <= 0) { this.parts.splice(i, 1); continue; }
            p.vy += g * dt;
            p.vx *= (1 - dt * 1.6);
            p.x += p.vx * dt;
            p.y += p.vy * dt;
        }
    }

    draw(g) {
        g.clear();
        for (const p of this.parts) {
            const t = p.life / p.maxLife;
            g.fillStyle(p.color, p.alpha * t);
            g.fillCircle(p.x, p.y, p.size * (0.5 + t * 0.5));
        }
    }

    clear() { this.parts.length = 0; }
}
