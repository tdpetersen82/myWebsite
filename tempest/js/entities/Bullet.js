// ============================================================
// Tempest — Bullet (Player Projectile)
// Travels down a lane from rim toward center
// ============================================================

class Bullet {
    constructor(lane, tube) {
        this.lane = lane;
        this.tube = tube;
        this.depth = 1.0; // starts at rim
        this.speed = CONFIG.BULLET_SPEED * 0.015;
        this.active = true;
    }

    update(deltaMs) {
        if (!this.active) return;
        this.depth -= this.speed * deltaMs;
        if (this.depth <= 0) {
            this.active = false;
        }
    }

    getPosition() {
        return this.tube.getLanePosition(this.lane, Math.max(0, this.depth));
    }

    draw(graphics) {
        if (!this.active) return;
        const pos = this.getPosition();
        const size = 2 + this.depth * 3;

        graphics.lineStyle(2, CONFIG.COLOR_BULLET, 1);
        graphics.beginPath();
        // Small diamond shape
        graphics.moveTo(pos.x, pos.y - size);
        graphics.lineTo(pos.x + size * 0.5, pos.y);
        graphics.lineTo(pos.x, pos.y + size);
        graphics.lineTo(pos.x - size * 0.5, pos.y);
        graphics.closePath();
        graphics.strokePath();
    }
}
