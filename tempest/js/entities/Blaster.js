// ============================================================
// Tempest — Blaster (Player Ship)
// Moves along tube rim, shoots down lanes
// ============================================================

class Blaster {
    constructor(tube) {
        this.tube = tube;
        this.lane = 0;
        this.alive = true;
        this.moveDelay = 80; // ms between moves
        this.lastMoveTime = 0;
        this.shootCooldown = CONFIG.SHOOT_COOLDOWN;
        this.lastShootTime = 0;
        this.superZapperUsed = 0; // 0 = unused, 1 = one use, 2 = both used
        this.invincible = false;
        this.invincibleTimer = 0;
        this.flashVisible = true;
    }

    moveLeft(time) {
        if (time - this.lastMoveTime < this.moveDelay) return;
        this.lastMoveTime = time;
        this.lane = this.tube.getAdjacentLane(this.lane, -1);
    }

    moveRight(time) {
        if (time - this.lastMoveTime < this.moveDelay) return;
        this.lastMoveTime = time;
        this.lane = this.tube.getAdjacentLane(this.lane, 1);
    }

    canShoot(time) {
        return time - this.lastShootTime >= this.shootCooldown;
    }

    shoot(time) {
        if (!this.canShoot(time)) return null;
        this.lastShootTime = time;
        return {
            lane: this.lane,
            depth: 1.0,
            speed: CONFIG.BULLET_SPEED * 0.015,
            active: true
        };
    }

    getPosition() {
        return this.tube.getLaneRimPos(this.lane);
    }

    getAngle() {
        return this.tube.getLaneAngle(this.lane);
    }

    draw(graphics, time, color) {
        if (!this.alive) return;
        if (this.invincible) {
            this.flashVisible = Math.floor(time / 80) % 2 === 0;
            if (!this.flashVisible) return;
        }

        const pos = this.getPosition();
        const angle = this.getAngle();
        const size = CONFIG.PLAYER_SIZE;

        // Draw claw/blaster shape (like original Tempest)
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);

        // Perpendicular
        const px = -sin;
        const py = cos;

        const tip = { x: pos.x + cos * size, y: pos.y + sin * size };
        const left = { x: pos.x - cos * size * 0.5 + px * size * 0.8, y: pos.y - sin * size * 0.5 + py * size * 0.8 };
        const right = { x: pos.x - cos * size * 0.5 - px * size * 0.8, y: pos.y - sin * size * 0.5 - py * size * 0.8 };
        const innerLeft = { x: pos.x + px * size * 0.3, y: pos.y + py * size * 0.3 };
        const innerRight = { x: pos.x - px * size * 0.3, y: pos.y - py * size * 0.3 };

        graphics.lineStyle(2, color || CONFIG.COLOR_PLAYER, 1);
        graphics.beginPath();
        graphics.moveTo(tip.x, tip.y);
        graphics.lineTo(left.x, left.y);
        graphics.lineTo(innerLeft.x, innerLeft.y);
        graphics.lineTo(innerRight.x, innerRight.y);
        graphics.lineTo(right.x, right.y);
        graphics.lineTo(tip.x, tip.y);
        graphics.strokePath();
    }
}
