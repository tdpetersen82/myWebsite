// ============================================================
// Tempest — FuseBall Enemy
// Bounces along the rim, must be avoided
// ============================================================

class FuseBall {
    constructor(lane, tube, speed) {
        this.lane = lane;
        this.tube = tube;
        this.depth = 0;
        this.climbSpeed = speed * 0.5;
        this.rimSpeed = CONFIG.FUSEBALL_SPEED;
        this.active = true;
        this.type = 'fuseball';
        this.score = CONFIG.SCORE_FUSEBALL;
        this.atRim = false;
        this.direction = Math.random() < 0.5 ? 1 : -1;
        this.moveCooldown = 0;
        this.pulsePhase = 0;
    }

    update(deltaMs) {
        if (!this.active) return;

        this.pulsePhase += deltaMs * 0.008;

        if (!this.atRim) {
            this.depth += this.climbSpeed * deltaMs;
            if (this.depth >= 1.0) {
                this.depth = 1.0;
                this.atRim = true;
            }
        } else {
            // Move along rim
            this.moveCooldown -= deltaMs;
            if (this.moveCooldown <= 0) {
                const newLane = this.tube.getAdjacentLane(this.lane, this.direction);
                if (newLane === this.lane) {
                    // Hit end of open tube, reverse
                    this.direction *= -1;
                }
                this.lane = this.tube.getAdjacentLane(this.lane, this.direction);
                this.moveCooldown = 150;
            }
        }
    }

    getPosition() {
        return this.tube.getLanePosition(this.lane, this.depth);
    }

    draw(graphics) {
        if (!this.active) return;
        const pos = this.getPosition();
        const pulse = 1 + Math.sin(this.pulsePhase) * 0.3;
        const size = (6 + this.depth * 5) * pulse;

        // Draw as a pulsing spiky circle
        const spikes = 8;
        graphics.lineStyle(2, CONFIG.COLOR_FUSEBALL, 1);
        graphics.beginPath();
        for (let i = 0; i <= spikes; i++) {
            const a = (i / spikes) * Math.PI * 2;
            const r = i % 2 === 0 ? size : size * 0.5;
            const px = pos.x + Math.cos(a) * r;
            const py = pos.y + Math.sin(a) * r;
            if (i === 0) graphics.moveTo(px, py);
            else graphics.lineTo(px, py);
        }
        graphics.closePath();
        graphics.strokePath();
    }
}
