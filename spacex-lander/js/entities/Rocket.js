// SpaceX Lander - Rocket Entity (Falcon 9 First Stage)
// Manual throttle (no auto-pilot): the player owns every braking decision.

class Rocket {
    constructor(scene, x, y) {
        this.scene = scene;
        this.x = x;
        this.y = y;
        this.vx = 0;
        this.vy = CONFIG.START_VY_BASE;
        this.angle = 0;         // degrees, 0 = upright
        this.fuel = CONFIG.FUEL_MAX;
        this.alive = true;
        this.landed = false;
        this.width = CONFIG.ROCKET_WIDTH;
        this.height = CONFIG.ROCKET_HEIGHT;

        this.engineMode = 'single'; // 'entry' (fast/wide) or 'single' (slow/precise) — cosmetic
        this.thrusting = false;     // full throttle this frame
        this.thrustLevel = 0;       // 0..1
        this.idleEmber = false;     // cosmetic idle glow

        // Grid fins
        this.gridFinAngle = 0;   // -1 to 1
        this.finsDeployed = true;

        // Landing legs
        this.legsDeployed = false;
        this.legDeployProgress = 0; // 0 to 1 animation

        // Re-entry heat
        this.reentryHeat = 0; // 0 to 1

        // RCS (cold-gas thrusters)
        this.rcsActive = false;

        // Steering input tracking
        this.steeringLeft = false;
        this.steeringRight = false;
    }

    update(delta, gravity, wind) {
        if (!this.alive || this.landed) return;

        const dt = delta / 1000;
        const eff = this.scene.eff || {};
        const landingThrust = eff.landingThrust || CONFIG.LANDING_THRUST_POWER;
        const gimbalRate = eff.gimbalRate || CONFIG.THRUST_GIMBAL_RATE;
        const rcsLateral = eff.rcsLateral || CONFIG.RCS_LATERAL_FORCE;
        const rcsRotation = eff.rcsRotation || CONFIG.RCS_ROTATION_RATE;

        const cursors = this.scene.cursors;
        const wasd = this.scene.wasd;

        // Input — live from frame 1 (no handover)
        const leftPressed = cursors.left.isDown || (wasd && wasd.left.isDown);
        const rightPressed = cursors.right.isDown || (wasd && wasd.right.isDown);
        const thrustPressed = cursors.up.isDown || (wasd && wasd.up.isDown);

        this.steeringLeft = leftPressed;
        this.steeringRight = rightPressed;

        // Grid fin steering target
        let targetFinAngle = 0;
        if (leftPressed) targetFinAngle = -1;
        if (rightPressed) targetFinAngle = 1;
        this.gridFinAngle += (targetFinAngle - this.gridFinAngle) * Math.min(1, dt * 8);
        if (Math.abs(this.gridFinAngle) < 0.01) this.gridFinAngle = 0;

        // Fin effectiveness scales with airspeed (aerodynamic)
        const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
        const finEffectiveness = Math.min(1, speed / CONFIG.FIN_MAX_SPEED_REF);

        // Rotation + lateral force from grid fins
        this.angle += this.gridFinAngle * CONFIG.GRID_FIN_ROTATION_RATE * finEffectiveness * dt;
        this.vx += this.gridFinAngle * CONFIG.GRID_FIN_LATERAL_FORCE * finEffectiveness * dt;

        // Thrust — engine fires only on held input (manual throttle = agency)
        const fullThrust = thrustPressed && this.fuel > 0;
        this.thrusting = fullThrust;
        this.thrustLevel = fullThrust ? 1.0 : 0;
        // Cosmetic idle ember while falling with fuel left (no force, no fuel cost)
        this.idleEmber = !fullThrust && this.fuel > 0 && this.vy > 0;

        // RCS cold-gas thrusters — steering authority at low speed when not gimballing
        this.rcsActive = false;
        const gimbalCovers = fullThrust;
        if (Math.abs(this.gridFinAngle) > 0.05 && !gimbalCovers) {
            const rcsEffectiveness = Math.max(0, 1 - finEffectiveness);
            if (rcsEffectiveness > 0.05) {
                this.rcsActive = true;
                this.angle += this.gridFinAngle * rcsRotation * rcsEffectiveness * dt;
                this.vx += this.gridFinAngle * rcsLateral * rcsEffectiveness * dt;
            }
        }

        if (fullThrust) {
            // Cosmetic engine mode by airspeed: wide orange entry burn when fast,
            // narrow blue precision burn when slow near the deck.
            this.engineMode = speed > 150 ? 'entry' : 'single';

            // Gimbal offset: tilt exhaust direction when steering
            const gimbalOffset = this.gridFinAngle * 15;
            const thrustAngle = Phaser.Math.DegToRad(this.angle - 90 + gimbalOffset);
            this.vx += Math.cos(thrustAngle) * landingThrust * dt;
            this.vy += Math.sin(thrustAngle) * landingThrust * dt;
            this.fuel = Math.max(0, this.fuel - CONFIG.LANDING_BURN_RATE * dt);

            // Thrust vectoring helps rotation at low speed (fins weak)
            const gimbalRotation = this.gridFinAngle * gimbalRate * (1 - finEffectiveness) * dt;
            this.angle += gimbalRotation;
        } else {
            this.engineMode = 'single';
        }

        // Gravity
        this.vy += gravity * dt;

        // Atmospheric drag (increases with speed)
        const dragForce = CONFIG.DRAG_COEFFICIENT * speed * speed;
        if (speed > 0) {
            this.vx -= (this.vx / speed) * dragForce * dt;
            this.vy -= (this.vy / speed) * dragForce * dt;
        }

        // Wind
        if (wind) this.vx += wind * dt;

        // --- CONTROL ASSISTS ---
        // Attitude hold: when the player isn't steering, the booster relaxes
        // toward upright (RCS auto-stabilize). It never fights active input.
        if (!leftPressed && !rightPressed && Math.abs(this.angle) > 0.05) {
            this.angle += (0 - this.angle) * Math.min(1, dt * CONFIG.ATTITUDE_DAMP);
        }
        // Low-speed lateral damping (cold-gas station keeping) — ramps in as the
        // booster slows, so residual drift can be nulled near the deck.
        const lowFactor = Phaser.Math.Clamp(1 - speed / CONFIG.ASSIST_SPEED_REF, 0, 1);
        if (lowFactor > 0) {
            this.vx -= this.vx * Math.min(1, dt * CONFIG.LOW_SPEED_LAT_DAMP * lowFactor);
        }

        // Normalize angle
        while (this.angle > 180) this.angle -= 360;
        while (this.angle < -180) this.angle += 360;

        // Clamp velocity to the current (post-integration) magnitude
        const curSpeed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
        if (curSpeed > CONFIG.MAX_VELOCITY) {
            const scale = CONFIG.MAX_VELOCITY / curSpeed;
            this.vx *= scale;
            this.vy *= scale;
        }

        // Update position
        this.x += this.vx * dt;
        this.y += this.vy * dt;

        // Wrap horizontally
        if (this.x < -30) this.x = CONFIG.WIDTH + 30;
        if (this.x > CONFIG.WIDTH + 30) this.x = -30;

        // Ceiling
        const ceiling = CONFIG.START_Y - 200;
        if (this.y < ceiling) {
            this.y = ceiling;
            this.vy = Math.abs(this.vy) * 0.2;
        }

        // Re-entry heat (cosmetic)
        const heatThreshold = 150;
        if (speed > heatThreshold && this.vy > 0) {
            this.reentryHeat = Math.min(1, (speed - heatThreshold) / 150);
        } else {
            this.reentryHeat = Math.max(0, this.reentryHeat - dt * 2);
        }

        // Leg deployment animation
        if (this.legsDeployed && this.legDeployProgress < 1) {
            this.legDeployProgress = Math.min(1, this.legDeployProgress + dt * 3);
        }
    }

    deployLegs() {
        if (!this.legsDeployed) {
            this.legsDeployed = true;
            this.legDeployProgress = 0;
        }
    }

    draw(graphics) {
        if (!this.alive) return;

        const rad = Phaser.Math.DegToRad(this.angle);
        const cos = Math.cos(rad);
        const sin = Math.sin(rad);
        const w = this.width;
        const h = this.height;

        const rotate = (px, py) => ({
            x: this.x + px * cos - py * sin,
            y: this.y + px * sin + py * cos
        });

        // --- LANDING LEGS (behind body) ---
        if (this.legsDeployed || this.legDeployProgress > 0) {
            this._drawLegs(graphics, rotate, w, h);
        }

        // --- RE-ENTRY GLOW ---
        if (this.reentryHeat > 0.1) {
            this._drawReentryGlow(graphics, rotate, w, h);
        }

        // --- INTERSTAGE (top, dark) ---
        const intH = h * 0.12;
        const itl = rotate(-w / 2 - 1, -h / 2);
        const itr = rotate(w / 2 + 1, -h / 2);
        const ibr = rotate(w / 2, -h / 2 + intH);
        const ibl = rotate(-w / 2, -h / 2 + intH);

        graphics.fillStyle(CONFIG.COLORS.ROCKET_INTERSTAGE, 1);
        graphics.beginPath();
        graphics.moveTo(itl.x, itl.y);
        graphics.lineTo(itr.x, itr.y);
        graphics.lineTo(ibr.x, ibr.y);
        graphics.lineTo(ibl.x, ibl.y);
        graphics.closePath();
        graphics.fillPath();

        // --- MAIN BODY (white cylinder) ---
        const bodyTop = -h / 2 + intH;
        const bodyBot = h / 2 - h * 0.12;
        const btl = rotate(-w / 2, bodyTop);
        const btr = rotate(w / 2, bodyTop);
        const bbr = rotate(w / 2, bodyBot);
        const bbl = rotate(-w / 2, bodyBot);

        graphics.fillStyle(CONFIG.COLORS.ROCKET_BODY, 1);
        graphics.beginPath();
        graphics.moveTo(btl.x, btl.y);
        graphics.lineTo(btr.x, btr.y);
        graphics.lineTo(bbr.x, bbr.y);
        graphics.lineTo(bbl.x, bbl.y);
        graphics.closePath();
        graphics.fillPath();

        // Body shadow (right 30% for cylindrical 3D look)
        const shR = w * 0.2;
        const shtl = rotate(w / 2 - shR, bodyTop);
        const shtr = rotate(w / 2, bodyTop);
        const shbr = rotate(w / 2, bodyBot);
        const shbl = rotate(w / 2 - shR, bodyBot);
        graphics.fillStyle(0x000000, 0.12);
        graphics.beginPath();
        graphics.moveTo(shtl.x, shtl.y);
        graphics.lineTo(shtr.x, shtr.y);
        graphics.lineTo(shbr.x, shbr.y);
        graphics.lineTo(shbl.x, shbl.y);
        graphics.closePath();
        graphics.fillPath();

        // Panel lines
        graphics.lineStyle(0.5, 0xcccccc, 0.25);
        for (let i = 1; i <= 3; i++) {
            const py = bodyTop + (bodyBot - bodyTop) * (i / 4);
            const pl = rotate(-w / 2, py);
            const pr = rotate(w / 2, py);
            graphics.beginPath();
            graphics.moveTo(pl.x, pl.y);
            graphics.lineTo(pr.x, pr.y);
            graphics.strokePath();
        }

        // SpaceX-inspired chevron
        const chevY = bodyTop + (bodyBot - bodyTop) * 0.4;
        const cv1 = rotate(-w / 2, chevY - 3);
        const cv2 = rotate(0, chevY + 3);
        const cv3 = rotate(w / 2, chevY - 3);
        graphics.lineStyle(1.5, 0xcc2222, 0.5);
        graphics.beginPath();
        graphics.moveTo(cv1.x, cv1.y);
        graphics.lineTo(cv2.x, cv2.y);
        graphics.lineTo(cv3.x, cv3.y);
        graphics.strokePath();

        // Specular highlight (left edge)
        graphics.lineStyle(1, 0xffffff, 0.3);
        graphics.beginPath();
        graphics.moveTo(btl.x, btl.y);
        graphics.lineTo(bbl.x, bbl.y);
        graphics.strokePath();

        // --- ENGINE SECTION ---
        const engTop = bodyBot;
        const engBot = h / 2;
        const etl = rotate(-w / 2 - 1, engTop);
        const etr = rotate(w / 2 + 1, engTop);
        const ebr = rotate(w / 2 + 2, engBot);
        const ebl = rotate(-w / 2 - 2, engBot);

        graphics.fillStyle(CONFIG.COLORS.ROCKET_ENGINE, 1);
        graphics.beginPath();
        graphics.moveTo(etl.x, etl.y);
        graphics.lineTo(etr.x, etr.y);
        graphics.lineTo(ebr.x, ebr.y);
        graphics.lineTo(ebl.x, ebl.y);
        graphics.closePath();
        graphics.fillPath();

        // Engine bells + glow — full glow when thrusting, faint ember when idle
        const gimbalPx = this.gridFinAngle * 3;
        const nozzle = rotate(gimbalPx, engBot + 2);
        const thrustAlpha = this.thrustLevel || 0;
        const emberAlpha = this.idleEmber ? (0.12 + Math.sin(Date.now() / 80) * 0.05) : 0;

        if (this.thrusting && this.engineMode === 'entry') {
            for (const ox of [-4, 0, 4]) {
                const np = rotate(ox + gimbalPx, engBot + 2);
                graphics.fillStyle(0x444444, 1);
                graphics.fillCircle(np.x, np.y, 2.5);
                const glow = (0.3 + thrustAlpha * 0.4) + Math.sin(Date.now() / 40) * 0.2;
                graphics.fillStyle(0xff8800, glow);
                graphics.fillCircle(np.x, np.y, 3 + thrustAlpha * 2);
            }
        } else {
            graphics.fillStyle(0x444444, 1);
            graphics.fillCircle(nozzle.x, nozzle.y, 3);
            if (this.thrusting) {
                const glow = (0.2 + thrustAlpha * 0.4) + Math.sin(Date.now() / 50) * 0.15;
                graphics.fillStyle(0x6699ff, glow);
                graphics.fillCircle(nozzle.x, nozzle.y, 3 + thrustAlpha * 3);
                graphics.fillStyle(0xaaddff, thrustAlpha * 0.2);
                graphics.fillCircle(nozzle.x, nozzle.y, 5 + thrustAlpha * 4);
            } else if (emberAlpha > 0) {
                graphics.fillStyle(0x6699ff, emberAlpha);
                graphics.fillCircle(nozzle.x, nozzle.y, 2.5);
                graphics.fillStyle(0xaaddff, emberAlpha * 0.5);
                graphics.fillCircle(nozzle.x, nozzle.y, 4);
            }
        }

        // --- GRID FINS ---
        this._drawGridFins(graphics, rotate, w, h);

        // --- RCS COLD-GAS PUFFS ---
        if (this.rcsActive) {
            this._drawRcsPuffs(graphics, rotate, w, h);
        }

        // --- BODY OUTLINE ---
        graphics.lineStyle(1, CONFIG.COLORS.ROCKET_STROKE, 0.6);
        graphics.beginPath();
        graphics.moveTo(itl.x, itl.y);
        graphics.lineTo(itr.x, itr.y);
        graphics.lineTo(ebr.x, ebr.y);
        graphics.lineTo(ebl.x, ebl.y);
        graphics.closePath();
        graphics.strokePath();
    }

    _drawGridFins(graphics, rotate, w, h) {
        const finY = -h / 2 + h * 0.18;
        const finW = 5;
        const finH = 3;
        const finAngle = this.gridFinAngle * 25;

        for (const side of [-1, 1]) {
            const fx = side * (w / 2 + finW / 2 + 1);

            const finRad = Phaser.Math.DegToRad(finAngle * side);
            const fcos = Math.cos(finRad);
            const fsin = Math.sin(finRad);

            const points = [
                { px: -finW / 2, py: -finH / 2 },
                { px: finW / 2, py: -finH / 2 },
                { px: finW / 2, py: finH / 2 },
                { px: -finW / 2, py: finH / 2 }
            ].map(p => {
                const rx = p.px * fcos - p.py * fsin;
                const ry = p.px * fsin + p.py * fcos;
                return rotate(fx + rx, finY + ry);
            });

            graphics.fillStyle(CONFIG.COLORS.GRID_FIN, 1);
            graphics.beginPath();
            graphics.moveTo(points[0].x, points[0].y);
            for (let i = 1; i < points.length; i++) {
                graphics.lineTo(points[i].x, points[i].y);
            }
            graphics.closePath();
            graphics.fillPath();

            graphics.lineStyle(0.5, 0x666666, 0.5);
            graphics.beginPath();
            graphics.moveTo(points[0].x, points[0].y);
            graphics.lineTo(points[1].x, points[1].y);
            graphics.strokePath();
        }
    }

    _drawRcsPuffs(graphics, rotate, w, h) {
        const side = -Math.sign(this.gridFinAngle);
        if (side === 0) return;

        const puffX = side * (w / 2 + 3);
        const flicker = 0.3 + Math.sin(Date.now() / 30) * 0.15;

        const p = rotate(puffX, 0);
        graphics.fillStyle(0xccddff, 0.15 * flicker);
        graphics.fillCircle(p.x, p.y, 2);
    }

    _drawLegs(graphics, rotate, w, h) {
        const deploy = this.legDeployProgress;
        const legAttachY = h * 0.25;

        const foldedAngle = 5;
        const deployedAngle = 40;
        const legAngleDeg = foldedAngle + (deployedAngle - foldedAngle) * deploy;

        const legLength = h * 0.35;
        const footWidth = 4;

        for (const side of [-1, 1]) {
            const attachX = side * (w / 2);
            const attach = rotate(attachX, legAttachY);

            const legRad = Phaser.Math.DegToRad(legAngleDeg * side);
            const localFootX = attachX + Math.sin(legRad) * legLength;
            const localFootY = legAttachY + Math.cos(legRad) * legLength;
            const foot = rotate(localFootX, localFootY);

            graphics.lineStyle(1.5, CONFIG.COLORS.LANDING_LEG, 0.9);
            graphics.beginPath();
            graphics.moveTo(attach.x, attach.y);
            graphics.lineTo(foot.x, foot.y);
            graphics.strokePath();

            if (deploy > 0.5) {
                const footAlpha = (deploy - 0.5) * 2;
                const dx = foot.x - attach.x;
                const dy = foot.y - attach.y;
                const len = Math.sqrt(dx * dx + dy * dy) || 1;
                const perpX = -dy / len * footWidth;
                const perpY = dx / len * footWidth;

                graphics.lineStyle(2, CONFIG.COLORS.LEG_FOOT, footAlpha);
                graphics.beginPath();
                graphics.moveTo(foot.x - perpX, foot.y - perpY);
                graphics.lineTo(foot.x + perpX, foot.y + perpY);
                graphics.strokePath();
            }
        }
    }

    _drawReentryGlow(graphics, rotate, w, h) {
        const intensity = this.reentryHeat;
        const glowColors = CONFIG.COLORS.REENTRY_GLOW;

        const bottom = rotate(0, h / 2 + 5);

        graphics.fillStyle(glowColors[0], intensity * 0.15);
        graphics.fillCircle(bottom.x, bottom.y, 25 + intensity * 15);
        graphics.fillStyle(glowColors[1], intensity * 0.2);
        graphics.fillCircle(bottom.x, bottom.y, 15 + intensity * 10);
        graphics.fillStyle(glowColors[2], intensity * 0.25);
        graphics.fillCircle(bottom.x, bottom.y, 8 + intensity * 5);

        const leftGlow = rotate(-w / 2 - 3, 0);
        const rightGlow = rotate(w / 2 + 3, 0);
        graphics.fillStyle(glowColors[1], intensity * 0.08);
        graphics.fillEllipse(leftGlow.x, leftGlow.y, 6, h * 0.6);
        graphics.fillEllipse(rightGlow.x, rightGlow.y, 6, h * 0.6);
    }

    getBottomY() {
        const rad = Phaser.Math.DegToRad(this.angle);
        const cos = Math.cos(rad);
        const sin = Math.sin(rad);
        const h = this.height;
        const w = this.width;

        const points = [{ px: 0, py: h / 2 + 2 }];

        if (this.legsDeployed && this.legDeployProgress > 0.5) {
            const deploy = this.legDeployProgress;
            const legAttachY = h * 0.25;
            const legAngleDeg = 5 + 35 * deploy;
            const legLength = h * 0.35;

            for (const side of [-1, 1]) {
                const attachPx = side * (w / 2);
                const legRad = Phaser.Math.DegToRad(legAngleDeg * side);
                const fpx = attachPx + Math.sin(legRad) * legLength;
                const fpy = legAttachY + Math.cos(legRad) * legLength;
                points.push({ px: fpx, py: fpy });
            }
        }

        let maxY = -Infinity;
        for (const p of points) {
            const ry = this.y + p.px * sin + p.py * cos;
            if (ry > maxY) maxY = ry;
        }
        return maxY;
    }

    getCollisionPoints() {
        const rad = Phaser.Math.DegToRad(this.angle);
        const cos = Math.cos(rad);
        const sin = Math.sin(rad);
        const h = this.height;
        const w = this.width;

        const rotate = (px, py) => ({
            x: this.x + px * cos - py * sin,
            y: this.y + px * sin + py * cos
        });

        const points = [
            rotate(0, -h / 2),
            rotate(-w / 2, 0),
            rotate(w / 2, 0),
            rotate(0, h / 2 + 2),
        ];

        if (this.legsDeployed && this.legDeployProgress > 0.5) {
            const deploy = this.legDeployProgress;
            const legAttachY = h * 0.25;
            const legAngleDeg = 5 + 35 * deploy;
            const legLength = h * 0.35;

            for (const side of [-1, 1]) {
                const attachPx = side * (w / 2);
                const legRad = Phaser.Math.DegToRad(legAngleDeg * side);
                const fpx = attachPx + Math.sin(legRad) * legLength;
                const fpy = legAttachY + Math.cos(legRad) * legLength;
                points.push(rotate(fpx, fpy));
            }
        }

        return points;
    }

    getNozzlePosition() {
        const rad = Phaser.Math.DegToRad(this.angle);
        return {
            x: this.x - (this.height / 2 + 2) * Math.sin(rad),
            y: this.y + (this.height / 2 + 2) * Math.cos(rad)
        };
    }

    getNozzlePositions() {
        const rad = Phaser.Math.DegToRad(this.angle);
        const cos = Math.cos(rad);
        const sin = Math.sin(rad);
        const h = this.height;
        const gimbalPx = this.gridFinAngle * 3;

        const rotate = (px, py) => ({
            x: this.x + px * cos - py * sin,
            y: this.y + px * sin + py * cos
        });

        if (this.engineMode === 'entry') {
            return [
                rotate(-4 + gimbalPx, h / 2 + 3),
                rotate(gimbalPx, h / 2 + 3),
                rotate(4 + gimbalPx, h / 2 + 3)
            ];
        }
        return [rotate(gimbalPx, h / 2 + 3)];
    }

    getAltitude(ocean, droneShip) {
        const bottomY = this.getBottomY();
        if (droneShip && droneShip.containsX(this.x)) {
            return (droneShip.getHeightAt(this.x) - bottomY) * CONFIG.ALTITUDE_SCALE;
        }
        return (ocean.getHeightAt(this.x) - bottomY) * CONFIG.ALTITUDE_SCALE;
    }

    // Re-arm the same rocket for the next landing in a run. Fuel PERSISTS (passed in).
    respawn(x, y, vy, angle, vx, fuel) {
        this.x = x;
        this.y = y;
        this.vx = vx || 0;
        this.vy = vy;
        this.angle = angle || 0;
        this.fuel = fuel;
        this.alive = true;
        this.landed = false;
        this.thrusting = false;
        this.thrustLevel = 0;
        this.idleEmber = false;
        this.engineMode = 'single';
        this.gridFinAngle = 0;
        this.legsDeployed = false;
        this.legDeployProgress = 0;
        this.rcsActive = false;
        this.reentryHeat = 0;
        this.steeringLeft = false;
        this.steeringRight = false;
    }
}
