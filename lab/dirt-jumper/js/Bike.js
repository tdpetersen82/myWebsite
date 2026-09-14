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
        this.leanVelocity = 0;     // eased angular speed; release stops immediately
        this.angle = 0;             // degrees, 0 = level
        this.airborne = false;
        this.crashed = false;

        this.startX = startX;
        this.distance = 0;          // world-px progressed (score basis)
        this.score = 0;             // banked distance*flow score (monotonic)
        this.flow = 0;              // consecutive-good-pumps + clean-landings feel hook

        this.forkCompression = 0.5;
        this.forkVelocity = 0;
        this.bodyVelocity = 0;
        this.bodyShift = 0;
        this.compress = 0;          // -1 extended .. +1 squashed (pump visual)
        this._pumpedThisDown = false;
        this.pumpCharge = 0;
        this.releasePower = 0;
        this._releasedThisUp = false;
        this.justGoodRelease = false;

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
        this.justGoodRelease = false;
        this.justPop = false;
        this.lastLanding = null;

        const previousSpeed = this.speed;
        if (this.airborne) this._updateAir(dt, terrain, input, false);
        else this._updateGround(dt, terrain, input);

        this._updateBody(dt, terrain, input, previousSpeed);
    }

    _updateBody(dt, terrain, input, previousSpeed = this.speed) {
        const s = this.stats;
        const curve = terrain.curvatureAt ? terrain.curvatureAt(this.x) : 0;
        const load = this.airborne ? 0 : Phaser.Math.Clamp(-curve * this.speed * this.speed / s.gravity, 0, 1.5);
        const squatTarget = this.airborne ? -0.18 : input.pump ? 0.85 : this.releasePower > 0 ? -0.2 : load * 0.15;
        const forkTarget = this.airborne ? 0 : Math.min(s.forkTravel, 0.5 + load * 2.2 + (input.pump ? 1.7 : 0));
        if (this.lastLanding) {
            const impact = Math.min(1, this.lastLanding.hardness / 650);
            this.forkVelocity += impact * 38;
            this.bodyVelocity += impact * 9;
        }
        // Small spring substeps prevent a long display frame from producing jitter.
        const steps = Math.ceil(dt * 120), h = dt / steps;
        for (let i = 0; i < steps; i++) {
            this.forkVelocity += ((forkTarget - this.forkCompression) * s.forkSpring - this.forkVelocity * s.forkDamping) * h;
            this.forkCompression += this.forkVelocity * h;
            if (this.forkCompression < 0 || this.forkCompression > s.forkTravel) {
                this.forkCompression = Phaser.Math.Clamp(this.forkCompression, 0, s.forkTravel);
                this.forkVelocity = 0;
            }
            this.bodyVelocity += ((squatTarget - this.compress) * s.riderSpring - this.bodyVelocity * s.riderDamping) * h;
            this.compress = Phaser.Math.Clamp(this.compress + this.bodyVelocity * h, -0.3, 1.15);
        }
        const shiftTarget = Phaser.Math.Clamp((previousSpeed - this.speed) / Math.max(dt,0.001) / 1100, -1, 1);
        this.bodyShift += (shiftTarget - this.bodyShift) * (1 - Math.exp(-dt * 6));
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
        const sf = Phaser.Math.Clamp(1 - this.speed / this._topSpeed(), 0, 1);
        if (down) {
            this._releasedThisUp = false;
            this.releasePower = 0;
        }
        if (pump && down) {
            a += s.kPump * sinT * sf;
            this.pumpCharge = Math.min(1, this.pumpCharge + dt * s.pumpChargeRate);
            if (!this._pumpedThisDown && sf > 0.05) {
                this._pumpedThisDown = true;
                this.flow = Math.min(CONFIG.FLOW_MAX, this.flow + CONFIG.FLOW_PER_GOODPUMP);
                this.justGoodPump = true;
            }
        } else {
            // A short neutral trough does not eat the charge. Holding uphill does.
            const drain = pump && up ? s.pumpHeldUpDecay : s.pumpChargeDecay;
            this.pumpCharge = Math.max(0, this.pumpCharge - dt * drain);
        }
        if (up) {
            if (pump) {
                a -= s.kPumpBleed;
                this.releasePower = 0;
            } else {
                // Extend once per climb using effort stored on the previous descent.
                // This works when released just before the trough, not only on one frame.
                if (!this._releasedThisUp && this.pumpCharge >= s.pumpChargeMin) {
                    this.releasePower = this.pumpCharge;
                    this.pumpCharge = 0;
                    this._releasedThisUp = true;
                    this.justGoodRelease = true;
                    this.flow = Math.min(CONFIG.FLOW_MAX, this.flow + CONFIG.FLOW_PER_GOODPUMP);
                }
                // Unweighting lets the bike climb beneath you without losing as much speed.
                a += -g * sinT * s.releaseGravityRelief * this.releasePower;
                this.releasePower = Math.max(0, this.releasePower - dt * s.releaseDrain);
            }
        }
        if (!down) this._pumpedThisDown = false;

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
            this.vy = vy0 - boost - (!pump ? s.releasePop * this.releasePower : 0);          // up = -y
            this.pumpCharge = 0;
            this.releasePower = 0;
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
        if (rot) {
            // Exact exponential integration keeps short taps gentle at any FPS.
            const target = rot * s.flipRate;
            const tau = s.leanResponse;
            const decay = Math.exp(-dt / tau);
            const turn = target * dt + (this.leanVelocity - target) * tau * (1 - decay);
            this.leanVelocity = target + (this.leanVelocity - target) * decay;
            this.angle = djNormDeg(this.angle + turn);
        } else {
            this.leanVelocity = 0;
        }

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
        this.leanVelocity = 0;
        this.pumpCharge = 0;
        this.releasePower = 0;
        this._releasedThisUp = false;
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
        // Fork travel pitches the single rigid frame about the rear axle.
        // Wheel centers remain on their contact line; no rear suspension is invented.
        const pitch = this.forkCompression / 64;
        const pc = Math.cos(pitch), ps = Math.sin(pitch);
        let chassis = true;
        const point = ([x, y]) => {
            if (chassis) {
                const px = x + 32, py = y + 16;
                x = -32 + px * pc - py * ps;
                y = -16 + px * ps + py * pc;
            }
            return { x: this.x + x * cos - y * sin, y: this.y + x * sin + y * cos };
        };
        const circle = (p, r, color, alpha = 1) => {
            const q = point(p); g.fillStyle(color, alpha); g.fillCircle(q.x, q.y, r);
        };
        const line = (points, width, color, alpha = 1) => {
            g.lineStyle(width, color, alpha); g.beginPath();
            points.forEach((p, i) => { const q = point(p); if (i) g.lineTo(q.x, q.y); else g.moveTo(q.x, q.y); });
            g.strokePath();
        };
        const shape = (points, color) => {
            g.fillStyle(color, 1); g.beginPath();
            points.forEach((p, i) => { const q = point(p); if (i) g.lineTo(q.x, q.y); else g.moveTo(q.x, q.y); });
            g.closePath(); g.fillPath();
        };
        const softShape = (points, color) => {
            const outline = [];
            for (let i = 0; i < points.length; i++) {
                const prev = points[(i + points.length - 1) % points.length];
                const p = points[i], next = points[(i + 1) % points.length];
                const a = [(prev[0]+p[0])/2,(prev[1]+p[1])/2];
                const b = [(next[0]+p[0])/2,(next[1]+p[1])/2];
                for (let j = 0; j <= 5; j++) {
                    const t = j/5, u = 1-t;
                    outline.push([u*u*a[0]+2*u*t*p[0]+t*t*b[0],u*u*a[1]+2*u*t*p[1]+t*t*b[1]]);
                }
            }
            shape(outline,color);
        };
        const limb = (a, b, width, color) => {
            line([a, b], width, color); circle(a, width / 2, color); circle(b, width / 2, color);
        };
        // Two-bone IK keeps hands on grips and shoes on pedals in every pose.
        const joint = (a, b, length, bend) => {
            const dx = b[0] - a[0], dy = b[1] - a[1];
            const d = Math.max(0.001, Math.hypot(dx, dy));
            const h = Math.sqrt(Math.max(0, length * length - d * d / 4));
            return [(a[0] + b[0]) / 2 - dy / d * h * bend,
                (a[1] + b[1]) / 2 + dx / d * h * bend];
        };
        const crouch = Math.max(-0.3, Math.min(1.15, this.compress));
        const hip = [-14 - crouch * 5 + this.bodyShift * 4, -50 + crouch * 11];
        const shoulder = [3 + crouch * 5 + this.bodyShift * 3, -70 + crouch * 14];
        const grip = [22, -45];
        const foot = [-2, -17], farFoot = [-10, -21];
        const knee = joint(hip, foot, 21, -1);
        const elbow = joint(shoulder, grip, 17, 1);
        const farHip = [hip[0] - 3, hip[1]];
        const farKnee = joint(farHip, farFoot, 20, -1);
        // Far limbs sit behind the frame; they do not merge into one stick leg.
        limb(farHip, farKnee, 7, 0x203038);
        limb(farKnee, farFoot, 5, 0x17272e);
        const farShoulder = [shoulder[0]-3, shoulder[1]+2];
        const farElbow = joint(farShoulder, grip, 17, 1);
        limb(farShoulder, farElbow, 5, 0xa95638);
        limb(farElbow, grip, 4, 0x26373b);
        shape([[-15,-24],[-8,-24],[-4,-20],[-4,-18],[-15,-18]], 0x18272d);

        // Hardtail dirt-jump geometry: short rear triangle, low standover, low saddle.
        // Only the front fork has suspension; the rear has no linkage or shock. Pumping moves the rider,
        // not the frame tubes or wheelbase.
        chassis = false;
        for (const wx of [-32, 32]) {
            const center = point([wx, -16]);
            g.lineStyle(4, 0x14262a, 1); g.strokeCircle(center.x, center.y, 14);
            g.lineStyle(1.3, 0x748b8d, 1); g.strokeCircle(center.x, center.y, 11.6);
            g.lineStyle(0.65, 0xb5c5be, 0.75);
            const spin = this.distance / 16;
            for (let i = 0; i < 12; i++) {
                const a = spin + i * Math.PI / 6;
                const end = point([wx + Math.cos(a) * 11, -16 + Math.sin(a) * 11]);
                g.lineBetween(center.x, center.y, end.x, end.y);
            }
            for (let i = 0; i < 16; i++) {
                const a = spin + i * Math.PI / 8;
                line([[wx + Math.cos(a) * 15, -16 + Math.sin(a) * 15],
                    [wx + Math.cos(a + 0.07) * 15.8, -16 + Math.sin(a + 0.07) * 15.8]], 1, 0x44595b);
            }
            circle([wx, -16], 2.2, 0xe6dcc5);
        }
        chassis = true;
        // Chain, rear triangle, sloping top tube and oversized down tube.
        line([[-32,-15],[-4,-21],[-4,-15],[-32,-15]], 1, 0x9baba2);
        line([[-32,-16],[-12,-29],[-4,-19],[-32,-16]], 3, 0x147f81);
        line([[-12,-29],[19,-36]], 4, 0x39b7b4);
        line([[19,-36],[-4,-19]], 4.8, 0x269d9f);
        line([[-12,-29],[-4,-19]], 3.4, 0x46bfba);
        line([[-10,-28],[15,-35]], 0.9, 0xa5e0d0);
        line([[14,-31],[2,-24]], 1.2, 0xe3efe1);
        circle([-4,-19], 4, 0x243d41);
        circle([-4,-19], 1.5, 0xbed2c9);
        // Front suspension fork: exposed stanchion, dust seal and chunky lower.
        // A rigid rear triangle stays connected to the back axle.
        const frontAxle = [-32 + 64 * pc, -16 - 64 * ps];
        const crown = [19,-38];
        const forkLength = Math.hypot(crown[0]-frontAxle[0], crown[1]-frontAxle[1]);
        const seal = [frontAxle[0] + (crown[0]-frontAxle[0]) * 14 / forkLength,
            frontAxle[1] + (crown[1]-frontAxle[1]) * 14 / forkLength];
        line([crown,seal], 3, 0xe4d0a0);
        line([seal,frontAxle], 4.8, 0x263e44);
        circle(seal, 2.8, 0x10282d);
        line([[18,-37],[22,-36]], 3, 0x234048);
        line([[19,-36],[16,-44],[22,-46],[27,-46]], 2.6, 0x193137);
        line([[22,-46],[28,-46]], 3.4, 0x0f242a);
        line([[-12,-29],[-14,-34]], 2.4, 0x203c40);
        shape([[-22,-36],[-12,-37],[-8,-35],[-9,-33],[-20,-33]], 0x183137);
        line([[-4,-19],foot], 2.4, 0xb6c9c3);
        line([[-7,-16],[4,-16]], 2.4, 0x142a30);

        // Near leg: riding shorts, knee pad, trouser/shin and flat pedal shoe.
        limb(hip, knee, 8, 0x253c49);
        limb(knee, foot, 5.8, 0x3a5057);
        limb(hip, [hip[0] + (knee[0]-hip[0])*0.68, hip[1] + (knee[1]-hip[1])*0.68], 9, 0x2d4552);
        circle(knee, 4.2, 0x172c36);
        line([[knee[0]+1,knee[1]+4],[foot[0]+1,foot[1]-3]], 1.2, 0x738784);
        shape([[foot[0]-4,foot[1]-4],[foot[0]+2,foot[1]-4],[foot[0]+7,foot[1]-1],
            [foot[0]+7,foot[1]+2],[foot[0]-4,foot[1]+2]], 0xd8e3d5);
        line([[foot[0]-4,foot[1]+2],[foot[0]+7,foot[1]+2]], 1.6, 0x182e34);
        // Fitted jersey silhouette with hem, shoulder panel and shaded back.
        softShape([[hip[0]-5,hip[1]+2],[hip[0]-7,hip[1]-7],
            [shoulder[0]-5,shoulder[1]-4],[shoulder[0]+3,shoulder[1]-4],
            [shoulder[0]+7,shoulder[1]+3],[hip[0]+5,hip[1]+4]], 0xe98942);
        softShape([[hip[0]-5,hip[1]+2],[hip[0]-7,hip[1]-7],
            [shoulder[0]-5,shoulder[1]-4],[shoulder[0]-2,shoulder[1]+1],
            [hip[0]-1,hip[1]+2]], 0xb95735);
        line([[hip[0]-5,hip[1]+2],[hip[0]+4,hip[1]+4]], 2, 0x713e31);
        limb(shoulder, elbow, 6.5, 0xf1a458);
        limb(elbow, grip, 4.4, 0x2a434a);
        circle(grip, 3.1, 0x142b32);
        line([[shoulder[0]-2,shoulder[1]-2],[shoulder[0]+4,shoulder[1]+2]], 2, 0xffd18b);
        // Full-face helmet: shell, dark goggle opening, peak and chin guard.
        const hx = shoulder[0] + 7 - this.bodyShift * 2, hy = shoulder[1] - 10 - crouch;
        limb([shoulder[0]+1,shoulder[1]], [hx-2,hy+3], 5, 0xc99268);
        const helmet = pts => pts.map(([x,y]) => [hx+x,hy+y]);
        shape(helmet([[-7,-3],[-5,-8],[1,-9],[6,-6],[7,-1],[5,4],[1,7],[-5,4],[-7,0]]), 0x173139);
        shape(helmet([[-6,-3],[-4,-7],[1,-8],[5,-5],[6,-2],[0,-1],[-2,4],[-5,2]]), 0xf2eee0);
        shape(helmet([[0,-2],[7,-2],[8,1],[3,3],[0,2]]), 0x192e36);
        line(helmet([[1,-1],[6,-1]]), 1.3, 0x91bfbd);
        shape(helmet([[2,3],[7,2],[8,5],[2,7],[-1,5]]), 0xe0e6d9);
        shape(helmet([[-1,-5],[9,-4],[11,-2],[4,-2]]), 0xf4a454);
        line(helmet([[-5,-4],[-2,-5]]), 1.5, 0x4d6463);
    }

    // contact + body points for camera framing
    bodyPoint() {
        const rad = this.angle * Math.PI / 180;
        return { x: this.x, y: this.y - 18 };
    }
}
