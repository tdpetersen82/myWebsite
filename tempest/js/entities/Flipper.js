// ============================================================
// Tempest — Flipper Enemy
// Climbs up lane, flips between adjacent lanes at rim
// ============================================================

class Flipper {
    constructor(lane, tube, speed, flipChance) {
        this.lane = lane;
        this.tube = tube;
        this.depth = 0; // 0 = center, 1 = rim
        this.speed = speed;
        this.flipChance = flipChance;
        this.active = true;
        this.atRim = false;
        this.flipCooldown = 0;
        this.type = 'flipper';
        this.score = CONFIG.SCORE_FLIPPER;
        this.flipDir = 0;
        this.flipProgress = 0;
        this.sourceLane = lane;
    }

    update(deltaMs) {
        if (!this.active) return;

        if (this.flipProgress > 0) {
            this.flipProgress -= deltaMs * 0.003;
            if (this.flipProgress <= 0) {
                this.flipProgress = 0;
                this.sourceLane = this.lane;
            }
            return;
        }

        if (!this.atRim) {
            this.depth += this.speed * deltaMs;
            if (this.depth >= 1.0) {
                this.depth = 1.0;
                this.atRim = true;
            }
        } else {
            // At rim: try to flip to adjacent lane
            this.flipCooldown -= deltaMs;
            if (this.flipCooldown <= 0 && Math.random() < this.flipChance) {
                const dir = Math.random() < 0.5 ? -1 : 1;
                const newLane = this.tube.getAdjacentLane(this.lane, dir);
                if (newLane !== this.lane) {
                    this.sourceLane = this.lane;
                    this.lane = newLane;
                    this.flipDir = dir;
                    this.flipProgress = 1.0;
                    this.flipCooldown = 300;
                }
            }
        }
    }

    getPosition() {
        if (this.flipProgress > 0) {
            const posNew = this.tube.getLanePosition(this.lane, this.depth);
            const posOld = this.tube.getLanePosition(this.sourceLane, this.depth);
            const t = 1 - this.flipProgress;
            return {
                x: posOld.x + (posNew.x - posOld.x) * t,
                y: posOld.y + (posNew.y - posOld.y) * t
            };
        }
        return this.tube.getLanePosition(this.lane, this.depth);
    }

    draw(graphics) {
        if (!this.active) return;
        const pos = this.getPosition();
        const size = 8 + this.depth * 6;
        const angle = this.tube.getLaneAngle(this.lane);

        // Draw flipper as a diamond/bow-tie shape
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        const px = -sin;
        const py = cos;

        graphics.lineStyle(2, CONFIG.COLOR_FLIPPER, 1);
        graphics.beginPath();
        // Bow-tie shape
        graphics.moveTo(pos.x + px * size, pos.y + py * size);
        graphics.lineTo(pos.x + cos * size * 0.6, pos.y + sin * size * 0.6);
        graphics.lineTo(pos.x - px * size, pos.y - py * size);
        graphics.lineTo(pos.x - cos * size * 0.6, pos.y - sin * size * 0.6);
        graphics.lineTo(pos.x + px * size, pos.y + py * size);
        graphics.strokePath();
    }
}
