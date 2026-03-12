// ============================================================
// Tempest — Tanker Enemy
// Climbs up lane, splits into 2 Flippers when destroyed
// ============================================================

class Tanker {
    constructor(lane, tube, speed, flipChance) {
        this.lane = lane;
        this.tube = tube;
        this.depth = 0;
        this.speed = speed * 0.7; // Slower than flippers
        this.flipChance = flipChance;
        this.active = true;
        this.type = 'tanker';
        this.score = CONFIG.SCORE_TANKER;
    }

    update(deltaMs) {
        if (!this.active) return;
        this.depth += this.speed * deltaMs;
        if (this.depth >= 1.0) {
            this.depth = 1.0;
        }
    }

    getPosition() {
        return this.tube.getLanePosition(this.lane, this.depth);
    }

    // Returns array of 2 Flippers to spawn when destroyed
    split() {
        const flippers = [];
        const lane1 = this.lane;
        const lane2 = this.tube.getAdjacentLane(this.lane, Math.random() < 0.5 ? 1 : -1);

        const f1 = new Flipper(lane1, this.tube, this.speed * 1.8, this.flipChance);
        f1.depth = this.depth;
        const f2 = new Flipper(lane2, this.tube, this.speed * 1.8, this.flipChance);
        f2.depth = this.depth;

        return [f1, f2];
    }

    draw(graphics) {
        if (!this.active) return;
        const pos = this.getPosition();
        const size = 10 + this.depth * 6;
        const angle = this.tube.getLaneAngle(this.lane);

        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        const px = -sin;
        const py = cos;

        // Draw tanker as a larger diamond with inner cross
        graphics.lineStyle(2, CONFIG.COLOR_TANKER, 1);
        graphics.beginPath();
        graphics.moveTo(pos.x + cos * size, pos.y + sin * size);
        graphics.lineTo(pos.x + px * size, pos.y + py * size);
        graphics.lineTo(pos.x - cos * size, pos.y - sin * size);
        graphics.lineTo(pos.x - px * size, pos.y - py * size);
        graphics.closePath();
        graphics.strokePath();

        // Inner cross
        graphics.lineStyle(1, CONFIG.COLOR_TANKER, 0.6);
        graphics.beginPath();
        graphics.moveTo(pos.x + cos * size * 0.5, pos.y + sin * size * 0.5);
        graphics.lineTo(pos.x - cos * size * 0.5, pos.y - sin * size * 0.5);
        graphics.moveTo(pos.x + px * size * 0.5, pos.y + py * size * 0.5);
        graphics.lineTo(pos.x - px * size * 0.5, pos.y - py * size * 0.5);
        graphics.strokePath();
    }
}
