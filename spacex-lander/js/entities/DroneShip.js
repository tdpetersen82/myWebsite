// SpaceX Lander - Drone Ship Entity (ASDS Barge)

class DroneShip {
    constructor(scene, level) {
        this.scene = scene;
        this.level = level;

        const lvl = CONFIG.LEVEL;
        const shrink = Math.pow(lvl.SHIP_SHRINK_FACTOR, level - 1);
        this.width = CONFIG.DRONE_SHIP.WIDTH * shrink;
        this.height = CONFIG.DRONE_SHIP.HEIGHT;
        this.targetZoneWidth = this.width * CONFIG.DRONE_SHIP.TARGET_ZONE_RATIO;

        // Position — center of screen, sitting on water
        this.x = CONFIG.WIDTH / 2;
        this.baseY = CONFIG.OCEAN.WATER_LEVEL - this.height / 2;
        this.y = this.baseY;

        // Rocking
        this.rockAngle = 0; // degrees
        this.maxRockAngle = 0;
        if (level >= lvl.ROCK_START_LEVEL) {
            this.maxRockAngle = Math.min(
                (level - lvl.ROCK_START_LEVEL + 1) * lvl.ROCK_ANGLE_PER_LEVEL,
                lvl.ROCK_ANGLE_MAX
            );
        }
        this.rockFreq = lvl.ROCK_FREQ_BASE;
        this.rockTime = Math.random() * Math.PI * 2;

        // Horizontal drift
        this.driftVx = 0;
        if (level >= lvl.DRIFT_START_LEVEL) {
            this.driftVx = Math.min(
                (level - lvl.DRIFT_START_LEVEL + 1) * lvl.DRIFT_SPEED_PER_LEVEL,
                lvl.DRIFT_SPEED_MAX
            );
            if (Math.random() > 0.5) this.driftVx *= -1;
        }

        // Beacon pulse
        this.beaconPhase = 0;

        // Guide light proximity
        this.guideIntensity = 0;
    }

    update(delta, ocean) {
        const dt = delta / 1000;

        // Rocking
        this.rockTime += dt;
        this.rockAngle = Math.sin(this.rockTime * this.rockFreq * Math.PI * 2) * this.maxRockAngle
            + Math.sin(this.rockTime * this.rockFreq * 0.37 * Math.PI * 2) * this.maxRockAngle * 0.3;

        // Vertical bob — follow ocean surface at ship center
        const waterY = ocean.getHeightAt(this.x);
        this.y += (waterY - this.height / 2 - this.y) * 0.1;

        // Horizontal drift
        if (this.driftVx !== 0) {
            this.x += this.driftVx * dt;
            const margin = this.width / 2 + 30;
            if (this.x < margin) { this.x = margin; this.driftVx = Math.abs(this.driftVx); }
            if (this.x > CONFIG.WIDTH - margin) { this.x = CONFIG.WIDTH - margin; this.driftVx = -Math.abs(this.driftVx); }
        }

        // Beacon pulse
        this.beaconPhase = (this.beaconPhase + delta) % CONFIG.DRONE_SHIP.BEACON_PULSE_DURATION;
    }

    updateProximity(altitude) {
        // Guide lights get brighter as rocket approaches
        this.guideIntensity = Math.max(0, 1 - altitude / 500);
    }

    getHeightAt(x) {
        // Deck height accounting for rocking
        const dx = x - this.x;
        const rad = Phaser.Math.DegToRad(this.rockAngle);
        return (this.y - this.height / 2) - Math.sin(rad) * dx;
    }

    containsX(x) {
        return x >= this.x - this.width / 2 && x <= this.x + this.width / 2;
    }

    isOnTarget(x) {
        return x >= this.x - this.targetZoneWidth / 2 && x <= this.x + this.targetZoneWidth / 2;
    }

    getPrecisionScore(x) {
        const dist = Math.abs(x - this.x);
        const maxDist = this.targetZoneWidth / 2;
        if (dist >= maxDist) return 0;
        return Math.floor((1 - dist / maxDist) * CONFIG.PRECISION_BONUS_MAX);
    }

    draw(graphics) {
        const cx = this.x;
        const cy = this.y;
        const hw = this.width / 2;
        const hh = this.height / 2;
        const rad = Phaser.Math.DegToRad(this.rockAngle);
        const cos = Math.cos(rad);
        const sin = Math.sin(rad);

        const rotate = (px, py) => ({
            x: cx + px * cos - py * sin,
            y: cy + px * sin + py * cos
        });

        // Hull (slightly trapezoid shape)
        const tl = rotate(-hw, -hh);
        const tr = rotate(hw, -hh);
        const br = rotate(hw * 1.05, hh);
        const bl = rotate(-hw * 1.05, hh);

        // Hull fill
        graphics.fillStyle(CONFIG.COLORS.SHIP_HULL, 1);
        graphics.beginPath();
        graphics.moveTo(tl.x, tl.y);
        graphics.lineTo(tr.x, tr.y);
        graphics.lineTo(br.x, br.y);
        graphics.lineTo(bl.x, bl.y);
        graphics.closePath();
        graphics.fillPath();

        // Deck surface (lighter)
        const dtl = rotate(-hw + 2, -hh);
        const dtr = rotate(hw - 2, -hh);
        const dbr = rotate(hw - 2, -hh + 4);
        const dbl = rotate(-hw + 2, -hh + 4);

        graphics.fillStyle(CONFIG.COLORS.SHIP_DECK, 1);
        graphics.beginPath();
        graphics.moveTo(dtl.x, dtl.y);
        graphics.lineTo(dtr.x, dtr.y);
        graphics.lineTo(dbr.x, dbr.y);
        graphics.lineTo(dbl.x, dbl.y);
        graphics.closePath();
        graphics.fillPath();

        // Hull outline
        graphics.lineStyle(1, 0x888888, 0.8);
        graphics.beginPath();
        graphics.moveTo(tl.x, tl.y);
        graphics.lineTo(tr.x, tr.y);
        graphics.lineTo(br.x, br.y);
        graphics.lineTo(bl.x, bl.y);
        graphics.closePath();
        graphics.strokePath();

        // "X" markings on deck
        const xSize = this.targetZoneWidth * 0.35;
        const markY = -hh + 2;
        const x1a = rotate(-xSize, markY - xSize * 0.5);
        const x1b = rotate(xSize, markY + xSize * 0.5);
        const x2a = rotate(xSize, markY - xSize * 0.5);
        const x2b = rotate(-xSize, markY + xSize * 0.5);

        graphics.lineStyle(2, CONFIG.COLORS.SHIP_MARKING, 0.8);
        graphics.beginPath();
        graphics.moveTo(x1a.x, x1a.y);
        graphics.lineTo(x1b.x, x1b.y);
        graphics.moveTo(x2a.x, x2a.y);
        graphics.lineTo(x2b.x, x2b.y);
        graphics.strokePath();

        // Edge barriers (hazard stripes)
        const barrierH = 6;
        const bleft = rotate(-hw + 3, -hh - barrierH);
        const bleftB = rotate(-hw + 3, -hh);
        const bright = rotate(hw - 3, -hh - barrierH);
        const brightB = rotate(hw - 3, -hh);

        graphics.lineStyle(3, CONFIG.COLORS.SHIP_BARRIER, 0.7);
        graphics.beginPath();
        graphics.moveTo(bleft.x, bleft.y);
        graphics.lineTo(bleftB.x, bleftB.y);
        graphics.moveTo(bright.x, bright.y);
        graphics.lineTo(brightB.x, brightB.y);
        graphics.strokePath();

        // Beacons at edges
        const beaconAlpha = 0.3 + 0.7 * Math.sin(this.beaconPhase / CONFIG.DRONE_SHIP.BEACON_PULSE_DURATION * Math.PI * 2);
        const bLeft = rotate(-hw, -hh - 4);
        const bRight = rotate(hw, -hh - 4);

        graphics.fillStyle(CONFIG.COLORS.SHIP_BEACON, beaconAlpha);
        graphics.fillCircle(bLeft.x, bLeft.y, 3);
        graphics.fillCircle(bRight.x, bRight.y, 3);

        // Beacon glow
        graphics.fillStyle(CONFIG.COLORS.SHIP_BEACON, beaconAlpha * 0.2);
        graphics.fillCircle(bLeft.x, bLeft.y, 7);
        graphics.fillCircle(bRight.x, bRight.y, 7);

        // Guide lights above ship
        if (this.guideIntensity > 0.05) {
            const glHeight = CONFIG.DRONE_SHIP.GUIDE_LIGHT_HEIGHT;
            const segments = 6;
            const segH = glHeight / segments;

            for (let i = 0; i < segments; i++) {
                const gy = -hh - 8 - i * segH;
                const alpha = this.guideIntensity * (1 - i / segments) * 0.15;
                const left = rotate(-2, gy);
                const right = rotate(2, gy);

                graphics.fillStyle(CONFIG.COLORS.SHIP_BEACON, alpha);
                graphics.fillRect(left.x - 1, left.y, 2, segH * 0.6);
                graphics.fillRect(right.x - 1, right.y, 2, segH * 0.6);
            }
        }
    }
}
