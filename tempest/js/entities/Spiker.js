// ============================================================
// Tempest — Spiker Enemy
// Leaves spike trail in lane, retreats, dangerous during warp
// ============================================================

class Spiker {
    constructor(lane, tube, speed) {
        this.lane = lane;
        this.tube = tube;
        this.depth = 0;
        this.speed = speed * 0.6;
        this.active = true;
        this.type = 'spiker';
        this.score = CONFIG.SCORE_SPIKER;
        this.retreating = false;
        this.maxDepth = 0;
        this.spikeTrail = []; // array of depth values where spikes exist
        this.spikeDepth = 0;  // how far spikes extend (0..1)
    }

    update(deltaMs) {
        if (!this.active) return;

        if (!this.retreating) {
            this.depth += this.speed * deltaMs;
            if (this.depth > this.maxDepth) {
                this.maxDepth = this.depth;
                // Leave spike trail
                if (this.depth > 0.1) {
                    this.spikeDepth = Math.max(this.spikeDepth, this.depth);
                }
            }
            // After reaching ~60-80% depth, start retreating
            if (this.depth >= 0.5 + Math.random() * 0.3) {
                this.retreating = true;
            }
        } else {
            this.depth -= this.speed * deltaMs * 1.5;
            if (this.depth <= 0) {
                this.depth = 0;
                this.active = false;
            }
        }
    }

    getPosition() {
        return this.tube.getLanePosition(this.lane, this.depth);
    }

    draw(graphics) {
        if (!this.active && this.spikeDepth <= 0) return;

        // Draw spike trail
        if (this.spikeDepth > 0.1) {
            const rimPos = this.tube.getLaneRimPos(this.lane);
            const centerPos = this.tube.getLaneCenterPos(this.lane);
            const steps = 6;
            graphics.lineStyle(1, CONFIG.COLOR_SPIKE_TRAIL, 0.7);
            graphics.beginPath();
            for (let i = 0; i <= steps; i++) {
                const d = (i / steps) * this.spikeDepth;
                const p = this.tube.getLanePosition(this.lane, d);
                // Zigzag pattern for spikes
                const offset = (i % 2 === 0 ? 3 : -3);
                const angle = this.tube.getLaneAngle(this.lane);
                const px = -Math.sin(angle) * offset;
                const py = Math.cos(angle) * offset;
                if (i === 0) {
                    graphics.moveTo(p.x + px, p.y + py);
                } else {
                    graphics.lineTo(p.x + px, p.y + py);
                }
            }
            graphics.strokePath();
        }

        // Draw spiker itself
        if (this.active) {
            const pos = this.getPosition();
            const size = 6 + this.depth * 4;
            const angle = this.tube.getLaneAngle(this.lane);
            const cos = Math.cos(angle);
            const sin = Math.sin(angle);

            graphics.lineStyle(2, CONFIG.COLOR_SPIKER, 1);
            graphics.beginPath();
            // Simple spike/arrow shape
            graphics.moveTo(pos.x + cos * size, pos.y + sin * size);
            graphics.lineTo(pos.x - cos * size * 0.3 + sin * size * 0.6, pos.y - sin * size * 0.3 - cos * size * 0.6);
            graphics.lineTo(pos.x - cos * size * 0.3 - sin * size * 0.6, pos.y - sin * size * 0.3 + cos * size * 0.6);
            graphics.closePath();
            graphics.strokePath();
        }
    }
}
