// Dirt Jumper — Bike physics (the heart of Phase 1).
//
// One generic vehicle. Reads EVERY tunable from `this.stats` (CONFIG.STATS) so
// Phase 2's vehicle/upgrade system just swaps that object.
//
// Driven entirely through update(deltaMs, terrain, input) — no global keyboard
// reads — so the mandatory hand-stepped verification sim can step it with a
// fixed dt and a scripted input and read exact state. input = {pump,left,right}.
//
// Units: px, seconds, degrees. Down is +y. Grounded state variable is the
// scalar tangential speed `speed`; airborne state is (vx, vy).

function djNormDeg(a) {
    while (a > 180) a -= 360;
    while (a < -180) a += 360;
    return a;
}

class Bike {
    constructor(scene, stats, startX) {
        this.scene = scene;
        this.stats = stats;
        this.reset(startX);
    }

    reset(startX) {
        this.x = startX;
        this.y = 0;                 // snapped to terrain on first update
        this.speed = 220;           // gentle drop-in roll speed
        this.vx = 0;
        this.vy = 0;
        this.angle = 0;             // degrees, 0 = level
        this.airborne = false;
        this.crashed = false;

        this.startX = startX;
        this.distance = 0;          // world-px progressed (score basis)
        this.score = 0;             // banked distance*flow score (monotonic)
        this.flow = 0;              // consecutive-good-pumps + clean-landings feel hook

        this.compress = 0;          // -1 extended .. +1 squashed (pump visual)
        this._pumpedThisDown = false;

        // one-frame event flags the scene reads & clears (SFX / shake / stamps)
        this.justGoodPump = false;
        this.justPop = false;
        this.lastLanding = null;    // {grade, hardness, x, y}
        this.airTime = 0;
    }

    get stateName() { return this.crashed ? 'crashed' : (this.airborne ? 'air' : 'ground'); }

    // ---- main entry ----
    update(deltaMs, terrain, input) {
        if (this.crashed) return;
        // clamp dt: a lag spike (or RAF-throttled preview) must never fling the
        // bike. 33ms = 2 frames. The verification steps at 8/16ms, under the clamp.
        const dt = Math.min(Math.max(deltaMs, 1), 33) / 1000;
        input = input || {};

        this.justGoodPump = false;
        this.justPop = false;
        this.lastLanding = null;

        if (this.airborne) this._updateAir(dt, terrain, input, false);
        else this._updateGround(dt, terrain, input);

        // ease the squash/stretch visual toward its target every frame
        const target = this.airborne ? -0.35 : (input.pump ? 0.6 : 0);
        this.compress += (target - this.compress) * Math.min(1, dt * 12);
    }

    _topSpeed() {
        return this.stats.topSpeed + this.flow * CONFIG.FLOW_TOPSPEED_BONUS;
    }

    // ====================================================================
    _updateGround(dt, terrain, input) {
        const s = this.stats;
        const slope = terrain.slopeAt(this.x);
        const inv = 1 / Math.sqrt(1 + slope * slope);
        const sinT = slope * inv;       // sin(theta)
        const cosT = inv;               // cos(theta)
        const g = s.gravity;

        const pump = !!input.pump;

        // --- tangential acceleration ---
        let a = g * sinT;                                   // gravity along slope
        a -= s.rollDragConst + s.rollDragK2 * this.speed * this.speed;  // rolling + air drag

        // --- PUMP work ---
        const down = sinT > s.pumpDownThresh;       // descending face (crest->trough)
        const up = sinT < -s.pumpDownThresh;        // climbing face
        if (pump) {
            if (down) {
                const sf = Phaser.Math.Clamp(1 - this.speed / this._topSpeed(), 0, 1);
                a += s.kPump * sinT * sf;
                // register ONE good pump per descending face (not per frame)
                if (!this._pumpedThisDown && sf > 0.05) {
                    this._pumpedThisDown = true;
                    this.flow = Math.min(CONFIG.FLOW_MAX, this.flow + CONFIG.FLOW_PER_GOODPUMP);
                    this.justGoodPump = true;
                }
            } else if (up) {
                a -= s.kPumpBleed;                  // pumping the up-phase pays nothing + bleeds
            }
        }
        if (!down) this._pumpedThisDown = false;    // re-arm for the next roller

        // integrate speed
        this.speed += a * dt;
        if (this.speed < s.speedFloor) this.speed = s.speedFloor;       // never fully stall
        const top = this._topSpeed();
        if (this.speed > top) this.speed = top;

        // velocity components for takeoff test
        const vx0 = this.speed * cosT;
        const vy0 = this.speed * sinT;

        // --- LAUNCH: ONLY off a jump lip ---
        // A pump track flows because you stay connected to the ground — you don't
        // randomly fly off rollers at speed. So launch fires only when the bike
        // crosses a tagged jump takeoff lip; everywhere else the wheels stay glued.
        // The lip delivers its designed kicker impulse (`boost`) for height; your
        // SPEED (built by pumping the rollers) carries the distance. So pumping a
        // section well lets you clear bigger gaps and jump farther/faster.
        const yNow = terrain.heightAt(this.x);
        const boost = terrain.lipBoostAt(this.x, vx0 * dt);
        if (this.speed > s.minAirSpeed && boost > 0) {
            this.airborne = true;
            this.airTime = 0;
            this.vx = vx0;
            this.vy = vy0 - boost;          // up = -y
            this.justPop = true;
            this.y = yNow;
            this._updateAir(dt, terrain, input, true);
            return;
        }

        // --- stay grounded: ride the surface ---
        this.x += vx0 * dt;
        const gy = terrain.heightAt(this.x);
        this.y = gy;
        const slopeDeg = Math.atan(terrain.slopeAt(this.x)) * 180 / Math.PI;
        this.angle += djNormDeg(slopeDeg - this.angle) * Math.min(1, dt * 14);
        this.angle = djNormDeg(this.angle);

        this._accrueDistance();
    }

    // ====================================================================
    _updateAir(dt, terrain, input, takeoffFrame) {
        const s = this.stats;
        const g = s.gravity;

        // rotation to set landing angle (symmetric; none when no key held)
        let rot = 0;
        if (input.left) rot -= 1;
        if (input.right) rot += 1;
        this.angle = djNormDeg(this.angle + rot * s.flipRate * dt);

        // projectile integration (semi-implicit Euler)
        this.vy += g * dt;
        this.vx -= this.vx * s.airDrag * dt;
        const nx = this.x + this.vx * dt;
        const ny = this.y + this.vy * dt;
        this.airTime += dt;

        // swept collision against the heightfield so a fast bike can't skip a thin
        // lip or punch through a landing. Sample sub-points along the step.
        if (!takeoffFrame) {
            const dist = Math.hypot(nx - this.x, ny - this.y);
            const steps = Math.max(1, Math.ceil(dist / 3));   // <=3px sub-steps
            for (let k = 1; k <= steps; k++) {
                const f = k / steps;
                const sx = this.x + (nx - this.x) * f;
                const sy = this.y + (ny - this.y) * f;
                const gy = terrain.heightAt(sx);
                if (sy >= gy) {
                    this._land(terrain, sx, gy);
                    return;
                }
            }
        }

        this.x = nx;
        this.y = ny;
        // Launch/takeoff grace frame: NEVER end inside the hill. If a pop can't
        // clear rising terrain ahead this frame (fast launch into a steepening
        // climb), sit exactly on the surface — the next frame's swept test
        // resolves it (clears into the air, or resumes rolling). This guarantees
        // the bike never ends a step below terrain.
        if (takeoffFrame) {
            const gy = terrain.heightAt(this.x);
            if (this.y > gy) this.y = gy;
        }
        this._accrueDistance();
    }

    // ====================================================================
    _land(terrain, sx, gy) {
        const s = this.stats;
        this.x = sx;
        this.y = gy;

        const slope = terrain.slopeAt(sx);
        const theta = Math.atan(slope);
        const cosT = Math.cos(theta), sinT = Math.sin(theta);
        const slopeDeg = theta * 180 / Math.PI;

        const diff = Math.abs(djNormDeg(this.angle - slopeDeg));
        const along = this.vx * cosT + this.vy * sinT;       // tangential (downhill+)
        const intoSurface = this.vy * cosT - this.vx * sinT; // normal component, + = slamming in

        const lt = s.landTolerance;
        let grade;
        if (intoSurface > s.caseBailSpeed) grade = 'bail';   // cased / smacked a face too hard
        else if (diff <= lt.perfect) grade = 'perfect';
        else if (diff <= lt.clean) grade = 'clean';
        else if (diff <= lt.sketchy) grade = 'sketchy';
        else grade = 'bail';

        this.airborne = false;
        this.lastLanding = { grade, hardness: Math.max(0, intoSurface), x: sx, y: gy, airTime: this.airTime };

        if (grade === 'bail') {
            this.crashed = true;
            this.speed = 0;
            this.flow = 0;
            return;
        }

        let keep = Math.max(0, along);
        if (grade === 'clean') keep *= s.cleanScrub;
        else if (grade === 'sketchy') keep *= s.sketchyScrub;
        this.speed = Math.max(s.speedFloor, keep);
        this.angle = slopeDeg;                               // stomp level with the landing
        this._pumpedThisDown = false;

        if (grade === 'perfect' || grade === 'clean') {
            this.flow = Math.min(CONFIG.FLOW_MAX, this.flow + CONFIG.FLOW_PER_CLEAN);
        }
        this._accrueDistance();
    }

    _accrueDistance() {
        const d = this.x - this.startX;
        if (d > this.distance) {
            const gained = d - this.distance;
            this.distance = d;
            // Bank score as it's earned, weighted by the CURRENT flow. Pumping (high
            // flow) banks faster, and a later crash (which zeroes flow) can never
            // retroactively erase the flow bonus already earned on earlier ground.
            this.score += gained * CONFIG.SCORE_PER_PX * (1 + this.flow * CONFIG.FLOW_SCORE_MULT);
        }
    }

    // banked distance + flow score, as a plain int (monotonic across a run)
    scoreValue() { return Math.floor(this.score); }

    // ---- Draw ----
    draw(g) {
        const rad = this.angle * Math.PI / 180;
        const cos = Math.cos(rad), sin = Math.sin(rad);
        // local -> world (origin = contact point, +localX forward, -localY up)
        const tx = (px, py) => ({ x: this.x + px * cos - py * sin, y: this.y + px * sin + py * cos });

        const wb = 30;                  // wheelbase / 2
        const r = 11;                   // wheel radius
        const squash = this.compress;   // + squashed, - stretched
        const bodyH = -24 * (1 - squash * 0.28);   // frame height above contact (up = -)
        const lift = squash < 0 ? squash * 6 : 0;  // wheels splay slightly when extended

        const wheelR = tx(wb, -r);
        const wheelF = tx(-wb, -r);

        // wheels
        g.fillStyle(CONFIG.COLORS.WHEEL, 1);
        g.fillCircle(wheelR.x, wheelR.y, r);
        g.fillCircle(wheelF.x, wheelF.y, r);
        g.lineStyle(2.5, 0x2a2f3a, 1);
        g.strokeCircle(wheelR.x, wheelR.y, r);
        g.strokeCircle(wheelF.x, wheelF.y, r);
        // hubs
        g.fillStyle(0x70787f, 1);
        g.fillCircle(wheelR.x, wheelR.y, 2.4);
        g.fillCircle(wheelF.x, wheelF.y, 2.4);

        // frame (triangle from hubs up to a seat/bar node)
        const node = tx(0, bodyH);
        const hubR = tx(wb, -r), hubF = tx(-wb, -r);
        g.lineStyle(4, CONFIG.COLORS.BIKE, 1);
        g.beginPath();
        g.moveTo(hubR.x, hubR.y); g.lineTo(node.x, node.y); g.lineTo(hubF.x, hubF.y);
        g.moveTo(node.x, node.y); g.lineTo((hubR.x + hubF.x) / 2, (hubR.y + hubF.y) / 2);
        g.strokePath();

        // bars / fork accent
        const bar = tx(-wb - 2, bodyH + 4);
        g.lineStyle(3, CONFIG.COLORS.BIKE_ACCENT, 1);
        g.beginPath();
        g.moveTo(node.x, node.y); g.lineTo(bar.x, bar.y);
        g.strokePath();

        // rider blob
        const hip = tx(2, bodyH - 2 + lift);
        const head = tx(-4, bodyH - 16 + lift);
        g.lineStyle(7, CONFIG.COLORS.RIDER, 1);
        g.beginPath();
        g.moveTo(hip.x, hip.y); g.lineTo(head.x, head.y);
        g.strokePath();
        g.fillStyle(CONFIG.COLORS.RIDER, 1);
        g.fillCircle(head.x, head.y, 5);
    }

    // contact + body points for camera framing
    bodyPoint() {
        const rad = this.angle * Math.PI / 180;
        return { x: this.x, y: this.y - 18 };
    }
}
