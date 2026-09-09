// SpaceX Lander - Drone Ship Entity (ASDS Barge)

class DroneShip {
    constructor(scene, level) {
        this.scene = scene;
        this.level = level;

        // Difficulty for this landing index
        const def = CONFIG.getLevelDef(level);

        const shrink = def.shipShrink || 1.0;
        this.width = CONFIG.DRONE_SHIP.WIDTH * shrink;
        this.height = CONFIG.DRONE_SHIP.HEIGHT;
        this.targetZoneWidth = this.width * CONFIG.DRONE_SHIP.TARGET_ZONE_RATIO;

        // Position — center of screen, sitting on water
        this.x = CONFIG.WIDTH / 2;
        this.baseY = CONFIG.OCEAN.WATER_LEVEL - this.height / 2;
        this.y = this.baseY;

        // Rocking
        this.rockAngle = 0;
        this.maxRockAngle = def.rockAngle || 0;
        this.rockFreq = CONFIG.DRONE_SHIP.ROCK_FREQ;
        this.rockTime = Math.random() * Math.PI * 2;

        // Horizontal drift (def.drift is a positive magnitude; pick a sign here)
        this.driftVx = def.drift > 0 ? def.drift * (Math.random() > 0.5 ? 1 : -1) : 0;

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
        // Account for rocking angle — effective width narrows as ship tilts
        const rad = Phaser.Math.DegToRad(this.rockAngle);
        const effectiveHalfW = (this.width / 2) * Math.cos(rad);
        return x >= this.x - effectiveHalfW && x <= this.x + effectiveHalfW;
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

        // --- WAKE (V-shaped water disturbance behind ship) ---
        graphics.lineStyle(1, 0x88bbdd, 0.15);
        for (let i = 1; i <= 3; i++) {
            const wakeY = hh + 4 + i * 6;
            const wakeSpread = i * 8;
            const wl = rotate(-wakeSpread, wakeY);
            const wc = rotate(0, hh + 2);
            const wr = rotate(wakeSpread, wakeY);
            graphics.beginPath();
            graphics.moveTo(wl.x, wl.y);
            graphics.lineTo(wc.x, wc.y);
            graphics.lineTo(wr.x, wr.y);
            graphics.strokePath();
        }

        // --- HULL (trapezoid) ---
        const tl = rotate(-hw, -hh);
        const tr = rotate(hw, -hh);
        const br = rotate(hw * 1.05, hh);
        const bl = rotate(-hw * 1.05, hh);

        graphics.fillStyle(CONFIG.COLORS.SHIP_HULL, 1);
        graphics.beginPath();
        graphics.moveTo(tl.x, tl.y);
        graphics.lineTo(tr.x, tr.y);
        graphics.lineTo(br.x, br.y);
        graphics.lineTo(bl.x, bl.y);
        graphics.closePath();
        graphics.fillPath();

        const hullLine = (x1,y1,x2,y2,color,width=1,alpha=1) => {
            const a=rotate(x1,y1),b=rotate(x2,y2);
            graphics.lineStyle(width,color,alpha);graphics.lineBetween(a.x,a.y,b.x,b.y);
        };
        // Painted waterline, welded hull plates and rubber fenders.
        hullLine(-hw,hh-2,hw,hh-2,0x9b4b36,3,.9);
        hullLine(-hw,-hh+6,hw,-hh+6,0x8295a0,1,.7);
        for(let x=-hw+6;x<hw-3;x+=12) {
            hullLine(x,-hh+7,x,hh-3,0x0b1520,1,.7);
            const bolt=rotate(x+2,-hh+8);
            graphics.fillStyle(0xa8b8c0,.6);graphics.fillCircle(bolt.x,bolt.y,.65);
            hullLine(x,hh-4,x+4,hh-4,0x08121b,3);
        }

        // --- DECK SURFACE ---
        const deckInset = 2;
        const dtl = rotate(-hw + deckInset, -hh);
        const dtr = rotate(hw - deckInset, -hh);
        const dbr = rotate(hw - deckInset, -hh + 5);
        const dbl = rotate(-hw + deckInset, -hh + 5);

        graphics.fillStyle(CONFIG.COLORS.SHIP_DECK, 1);
        graphics.beginPath();
        graphics.moveTo(dtl.x, dtl.y);
        graphics.lineTo(dtr.x, dtr.y);
        graphics.lineTo(dbr.x, dbr.y);
        graphics.lineTo(dbl.x, dbl.y);
        graphics.closePath();
        graphics.fillPath();

        // Deck plate grid lines
        graphics.lineStyle(0.5, 0x555555, 0.3);
        for (let gx = -hw + 10; gx < hw; gx += 12) {
            const gt = rotate(gx, -hh);
            const gb = rotate(gx, -hh + 5);
            graphics.beginPath();
            graphics.moveTo(gt.x, gt.y);
            graphics.lineTo(gb.x, gb.y);
            graphics.strokePath();
        }

        // --- CONTROL TOWER (small bridge structure on one side) ---
        const towerX = hw - 8;
        const twrBL = rotate(towerX, -hh - 1);
        const twrBR = rotate(towerX + 6, -hh - 1);
        const twrTR = rotate(towerX + 6, -hh - 8);
        const twrTL = rotate(towerX, -hh - 8);
        graphics.fillStyle(0x555566, 1);
        graphics.beginPath();
        graphics.moveTo(twrBL.x, twrBL.y);
        graphics.lineTo(twrBR.x, twrBR.y);
        graphics.lineTo(twrTR.x, twrTR.y);
        graphics.lineTo(twrTL.x, twrTL.y);
        graphics.closePath();
        graphics.fillPath();
        // Tower window
        const twrW = rotate(towerX + 2, -hh - 6);
        graphics.fillStyle(0x88aacc, 0.6);
        graphics.fillRect(twrW.x, twrW.y, 3, 2);

        // --- EQUIPMENT BOXES on edges ---
        for (const side of [-1, 1]) {
            const bx = side * (hw - 6);
            const eqBL = rotate(bx, hh - 6);
            const eqBR = rotate(bx + 4, hh - 6);
            const eqTR = rotate(bx + 4, hh - 2);
            const eqTL = rotate(bx, hh - 2);
            graphics.fillStyle(0x3a3a4a, 1);
            graphics.beginPath();
            graphics.moveTo(eqBL.x, eqBL.y);
            graphics.lineTo(eqBR.x, eqBR.y);
            graphics.lineTo(eqTR.x, eqTR.y);
            graphics.lineTo(eqTL.x, eqTL.y);
            graphics.closePath();
            graphics.fillPath();
        }

        // Hull outline
        graphics.lineStyle(1, 0x888888, 0.8);
        graphics.beginPath();
        graphics.moveTo(tl.x, tl.y);
        graphics.lineTo(tr.x, tr.y);
        graphics.lineTo(br.x, br.y);
        graphics.lineTo(bl.x, bl.y);
        graphics.closePath();
        graphics.strokePath();

        // A foreshortened deck marking stays on the deck rather than floating above it.
        const targetR = this.targetZoneWidth * .4;
        for(const scale of [1,.5]) {
            graphics.lineStyle(.8,CONFIG.COLORS.SHIP_MARKING,.85);
            graphics.beginPath();
            for(let i=0;i<=32;i++) {
                const t=i/32*Math.PI*2;
                const p=rotate(Math.cos(t)*targetR*scale,-hh+2.5+Math.sin(t)*2*scale);
                if(i) graphics.lineTo(p.x,p.y);else graphics.moveTo(p.x,p.y);
            }
            graphics.strokePath();
        }
        hullLine(-targetR,-hh+1,targetR,-hh+4,0xf3d783,1);
        hullLine(targetR,-hh+1,-targetR,-hh+4,0xf3d783,1);
        // Deck perimeter lamps and communications mast.
        for(let x=-hw+12;x<hw-8;x+=16) {
            const lamp=rotate(x,-hh);
            graphics.fillStyle(0xa2edff,.18);graphics.fillCircle(lamp.x,lamp.y,3);
            graphics.fillStyle(0xd5f8ff,.95);graphics.fillCircle(lamp.x,lamp.y,.8);
        }
        hullLine(hw-5,-hh-8,hw-5,-hh-18,0xb4c5cd,.8);
        hullLine(hw-9,-hh-14,hw-1,-hh-14,0xb4c5cd,.8);

        // --- DIAGONAL WARNING STRIPES near deck edges ---
        graphics.lineStyle(0.5, CONFIG.COLORS.SHIP_BARRIER, 0.25);
        for (const side of [-1, 1]) {
            const stripeX = side * (hw - 10);
            for (let s = 0; s < 3; s++) {
                const sy = -hh + 1 + s * 2;
                const s1 = rotate(stripeX - 1.5, sy);
                const s2 = rotate(stripeX + 1.5, sy + 2);
                graphics.beginPath();
                graphics.moveTo(s1.x, s1.y);
                graphics.lineTo(s2.x, s2.y);
                graphics.strokePath();
            }
        }

        // --- EDGE BARRIERS (hazard stripes) ---
        const barrierH = 7;
        for (const side of [-1, 1]) {
            const bx = side * (hw - 3);
            const bt = rotate(bx, -hh - barrierH);
            const bb = rotate(bx, -hh);
            graphics.lineStyle(3, CONFIG.COLORS.SHIP_BARRIER, 0.7);
            graphics.beginPath();
            graphics.moveTo(bt.x, bt.y);
            graphics.lineTo(bb.x, bb.y);
            graphics.strokePath();
        }

        // --- NAVIGATION LIGHTS (port=red, starboard=green) ---
        const navLeft = rotate(-hw - 1, 0);
        const navRight = rotate(hw + 1, 0);
        graphics.fillStyle(0xff2222, 0.7);
        graphics.fillCircle(navLeft.x, navLeft.y, 1.5);
        graphics.fillStyle(0x22ff22, 0.7);
        graphics.fillCircle(navRight.x, navRight.y, 1.5);

        // --- BEACONS (larger, with strong glow) ---
        const beaconAlpha = 0.65 + 0.35 * Math.sin(this.beaconPhase / CONFIG.DRONE_SHIP.BEACON_PULSE_DURATION * Math.PI * 2);
        const bLeft = rotate(-hw, -hh - 5);
        const bRight = rotate(hw, -hh - 5);

        // Glow halos (large)
        graphics.fillStyle(CONFIG.COLORS.SHIP_BEACON, beaconAlpha * 0.08);
        graphics.fillCircle(bLeft.x, bLeft.y, 14);
        graphics.fillCircle(bRight.x, bRight.y, 14);
        graphics.fillStyle(CONFIG.COLORS.SHIP_BEACON, beaconAlpha * 0.15);
        graphics.fillCircle(bLeft.x, bLeft.y, 8);
        graphics.fillCircle(bRight.x, bRight.y, 8);
        // Core
        graphics.fillStyle(CONFIG.COLORS.SHIP_BEACON, beaconAlpha);
        graphics.fillCircle(bLeft.x, bLeft.y, 3.5);
        graphics.fillCircle(bRight.x, bRight.y, 3.5);

        // --- EXHAUST SMOKE from ship engines ---
        const exhaustPos = rotate(hw * 0.7, hh);
        graphics.fillStyle(0x666677, 0.15 + Math.sin(Date.now() / 200) * 0.05);
        graphics.fillCircle(exhaustPos.x, exhaustPos.y + 3, 3);
        graphics.fillCircle(exhaustPos.x + 2, exhaustPos.y + 6, 2);

        // --- GUIDE LIGHTS above ship ---
        if (this.guideIntensity > 0.05) {
            const glHeight = CONFIG.DRONE_SHIP.GUIDE_LIGHT_HEIGHT;
            const segments = 8;
            const segH = glHeight / segments;

            for (let i = 0; i < segments; i++) {
                const gy = -hh - 10 - i * segH;
                const alpha = this.guideIntensity * (1 - i / segments) * 0.2;
                const left = rotate(-3, gy);
                const right = rotate(3, gy);

                graphics.fillStyle(CONFIG.COLORS.SHIP_BEACON, alpha);
                graphics.fillRect(left.x - 1, left.y, 2, segH * 0.5);
                graphics.fillRect(right.x - 1, right.y, 2, segH * 0.5);
            }

            // Central guide beam
            const beamAlpha = this.guideIntensity * 0.06;
            graphics.fillStyle(0x44ff88, beamAlpha);
            const beamTop = rotate(0, -hh - glHeight);
            graphics.fillRect(beamTop.x - 1, beamTop.y, 2, glHeight);
        }
    }
}
