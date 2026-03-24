// ============================================================
// Missile Command — Tracking Missile (Homing Counter-Missile)
// ============================================================

class TrackingMissile {
    constructor(startX, startY, targetX, targetY, speed, trackingLevel) {
        this.startX = startX;
        this.startY = startY;
        this.x = startX;
        this.y = startY;
        this.targetX = targetX;
        this.targetY = targetY;
        this.speed = speed || CONFIG.COUNTER_MISSILE_SPEED;
        this.dead = false;
        this.detonated = false;
        this.trackingLevel = trackingLevel;

        const dist = Helpers.distance(startX, startY, targetX, targetY);
        this.dx = (targetX - startX) / dist;
        this.dy = (targetY - startY) / dist;

        // Tracking parameters from config
        const cfg = CONFIG.TRACKING.LEVELS[trackingLevel - 1];
        this.turnRate = cfg.turnRate;
        this.detectRadius = cfg.detectRadius;
        this.trailColor = cfg.trailColor;

        // Current angle of travel
        this.angle = Math.atan2(this.dy, this.dx);

        // Trail history
        this.trail = [{ x: startX, y: startY }];
        this.trailTimer = 0;

        // Lock-on state
        this.lockedTarget = null;
        this.lockOnTimer = 0;

        // Visual
        this.flamePhase = Math.random() * Math.PI * 2;
        this.seekerPulse = 0;
    }

    update(dt, particleSystem, enemyMissiles) {
        if (this.dead) return;

        this.flamePhase += dt * 20;
        this.seekerPulse += dt * 10;

        // Find nearest enemy to track
        let nearestEnemy = null;
        let nearestDist = this.detectRadius;

        if (enemyMissiles) {
            for (const em of enemyMissiles) {
                if (em.dead) continue;
                const d = Helpers.distance(this.x, this.y, em.x, em.y);
                if (d < nearestDist) {
                    nearestDist = d;
                    nearestEnemy = em;
                }
            }
        }

        this.lockedTarget = nearestEnemy;

        // Adjust angle toward target
        if (nearestEnemy) {
            const targetAngle = Math.atan2(nearestEnemy.y - this.y, nearestEnemy.x - this.x);
            let angleDiff = targetAngle - this.angle;

            // Normalize to [-PI, PI]
            while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
            while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

            // Apply turn rate
            const maxTurn = this.turnRate * dt;
            if (Math.abs(angleDiff) < maxTurn) {
                this.angle = targetAngle;
            } else {
                this.angle += Math.sign(angleDiff) * maxTurn;
            }
        } else {
            // Head toward original target
            const targetAngle = Math.atan2(this.targetY - this.y, this.targetX - this.x);
            let angleDiff = targetAngle - this.angle;
            while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
            while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
            const maxTurn = this.turnRate * 0.3 * dt; // Slower correction to click target
            this.angle += Helpers.clamp(angleDiff, -maxTurn, maxTurn);
        }

        this.dx = Math.cos(this.angle);
        this.dy = Math.sin(this.angle);

        this.x += this.dx * this.speed * dt;
        this.y += this.dy * this.speed * dt;

        // Trail
        this.trailTimer += dt * 1000;
        if (this.trailTimer > 12) {
            this.trail.push({ x: this.x, y: this.y });
            if (this.trail.length > 40) this.trail.shift();
            this.trailTimer = 0;
        }

        // Smoke particles
        if (particleSystem && Math.random() < 0.3) {
            particleSystem.emitTrail(this.x, this.y, this.trailColor);
        }

        // Detonate when reaching target area or hitting enemy proximity
        const distToTarget = Helpers.distance(this.x, this.y, this.targetX, this.targetY);
        const distToEnemy = nearestEnemy ? Helpers.distance(this.x, this.y, nearestEnemy.x, nearestEnemy.y) : Infinity;

        if (distToTarget < this.speed * dt + 8 || distToEnemy < 15) {
            this.detonated = true;
            this.dead = true;
        }

        // Out of bounds
        if (this.y < -30 || this.y > CONFIG.HEIGHT + 30 ||
            this.x < -30 || this.x > CONFIG.WIDTH + 30) {
            this.dead = true;
        }
    }

    draw(graphics) {
        if (this.dead) return;

        // Trail glow (outer)
        for (let i = 1; i < this.trail.length; i++) {
            const alpha = (i / this.trail.length) * 0.15;
            graphics.lineStyle(6, this.trailColor, alpha);
            graphics.lineBetween(
                this.trail[i - 1].x, this.trail[i - 1].y,
                this.trail[i].x, this.trail[i].y
            );
        }

        // Trail core
        for (let i = 1; i < this.trail.length; i++) {
            const alpha = (i / this.trail.length) * 0.7;
            const width = 1.5 + (i / this.trail.length);
            graphics.lineStyle(width, this.trailColor, alpha);
            graphics.lineBetween(
                this.trail[i - 1].x, this.trail[i - 1].y,
                this.trail[i].x, this.trail[i].y
            );
        }

        // Current segment
        if (this.trail.length > 0) {
            const last = this.trail[this.trail.length - 1];
            graphics.lineStyle(2.5, this.trailColor, 0.9);
            graphics.lineBetween(last.x, last.y, this.x, this.y);
        }

        // Exhaust flame
        const flameDx = -this.dx;
        const flameDy = -this.dy;
        graphics.fillStyle(0x44ffaa, 0.4 + Math.sin(this.flamePhase) * 0.2);
        graphics.fillCircle(this.x + flameDx * 3, this.y + flameDy * 3, 3);
        graphics.fillStyle(0xaaffdd, 0.3);
        graphics.fillCircle(this.x + flameDx * 2, this.y + flameDy * 2, 2);

        // Seeker head glow
        const seekerSize = 5 + Math.sin(this.seekerPulse) * 1;
        graphics.fillStyle(this.trailColor, 0.25);
        graphics.fillCircle(this.x, this.y, seekerSize);

        // Missile head
        graphics.fillStyle(0xccffee, 1);
        graphics.fillCircle(this.x, this.y, 3);
        graphics.fillStyle(0xffffff, 0.9);
        graphics.fillCircle(this.x, this.y, 1.5);

        // Lock-on indicator when tracking
        if (this.lockedTarget) {
            graphics.lineStyle(0.5, this.trailColor, 0.3);
            graphics.lineBetween(this.x, this.y, this.lockedTarget.x, this.lockedTarget.y);
            // Small diamond at locked target
            const tx = this.lockedTarget.x;
            const ty = this.lockedTarget.y;
            const d = 5;
            graphics.lineStyle(0.5, this.trailColor, 0.4 + Math.sin(this.seekerPulse) * 0.2);
            graphics.beginPath();
            graphics.moveTo(tx, ty - d);
            graphics.lineTo(tx + d, ty);
            graphics.lineTo(tx, ty + d);
            graphics.lineTo(tx - d, ty);
            graphics.closePath();
            graphics.strokePath();
        }

        // Target crosshair
        const ch = 6;
        graphics.lineStyle(0.5, this.trailColor, 0.3);
        graphics.lineBetween(this.targetX - ch, this.targetY, this.targetX + ch, this.targetY);
        graphics.lineBetween(this.targetX, this.targetY - ch, this.targetX, this.targetY + ch);
    }
}
