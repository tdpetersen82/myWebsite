// Dirt Jumper — Terrain heightfield.
//
// C^1 height profile T(x), with deliberate sharp takeoff edges, built from streamed features
// (rollers / tabletop / gap), stitched at matching height AND slope.
//
// Implementation: a list of control knots {x, y} interpolated with MONOTONE
// cubic Hermite tangents (PCHIP / Fritsch-Carlson). Why this and not raw
// Catmull-Rom or hand-set slopes:
//   * C^1 by construction (value AND first derivative continuous at every knot).
//   * tangent = 0 at every local max/min -> crests & troughs are naturally
//     rounded and convex, which is exactly what gives clean takeoff lips.
//   * shape-preserving (no overshoot) -> the curve never wanders outside the
//     control envelope, so no surprise bumps that cause false crashes/tunneling.
// Down is +y (screen convention). Net-downhill = features drift +y over +x.

// Deterministic RNG (mulberry32) so a given seed reproduces the same track —
// required for the frame-rate-independence test (both runs see one terrain).
function djRng(seed) {
    let s = seed >>> 0;
    return function () {
        s |= 0; s = (s + 0x6D2B79F5) | 0;
        let t = Math.imul(s ^ (s >>> 15), 1 | s);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

class Terrain {
    constructor(scene, seed) {
        this.scene = scene;
        this.knots = [];            // sorted ascending by x: {x, y, m}
        this.lips = [];             // x of each jump takeoff (the ONLY natural-launch points)
        this.rng = djRng((seed >>> 0) || 1);
        this.featureCount = 0;
        this._minX = 0;

        // Seed the track: a flat run-in so the bike settles before the first feature.
        const T = CONFIG.TERRAIN;
        this._push(0, 0);
        this._push(T.startFlat * 0.5, 4);    // tiny initial pitch
        this._push(T.startFlat, 34);
        this._recomputeTail();
    }

    // last generated x (generation cursor)
    get endX() { return this.knots[this.knots.length - 1].x; }

    _last() { return this.knots[this.knots.length - 1]; }

    _push(x, y) {
        this.knots.push({ x, y, m: 0 });
    }

    // append a knot relative to the current last knot
    _rel(dx, dy) {
        const last = this._last();
        this._push(last.x + dx, last.y + dy);
    }

    // ---- PCHIP (monotone cubic) tangents ----------------------------------
    // Recompute tangents from `fromIdx` (default: the last 4) to the end. A knot's
    // tangent depends only on its immediate neighbours, but a knot first tangented
    // as an endpoint (one-sided estimate) becomes INTERIOR once the next feature is
    // appended and must be re-tangented two-sided — nextFeature() passes a wide
    // enough `fromIdx` to cover that transition (otherwise seam knots keep a stale
    // ~few-degree tangent where a rounded extremum should read flat).
    _recomputeTail(fromIdx) {
        const k = this.knots;
        const n = k.length;
        const from = (fromIdx == null) ? Math.max(0, n - 4) : Math.max(0, fromIdx);
        for (let i = from; i < n; i++) this._tangentAt(i);
    }

    _tangentAt(i) {
        const k = this.knots;
        const n = k.length;
        if (n === 1) { k[0].m = 0; return; }

        const slope = (a, b) => (k[b].y - k[a].y) / (k[b].x - k[a].x);

        if (i === 0) {
            // one-sided endpoint, shape-preserving clamp
            const d0 = slope(0, 1);
            let m = d0;
            if (n >= 3) {
                const d1 = slope(1, 2);
                const h0 = k[1].x - k[0].x, h1 = k[2].x - k[1].x;
                m = ((2 * h0 + h1) * d0 - h0 * d1) / (h0 + h1);
                if (m * d0 <= 0) m = 0;
                else if (d0 * d1 <= 0 && Math.abs(m) > 3 * Math.abs(d0)) m = 3 * d0;
            }
            k[0].m = m;
            return;
        }
        if (i === n - 1) {
            const dN = slope(n - 2, n - 1);
            let m = dN;
            if (n >= 3) {
                const dM = slope(n - 3, n - 2);
                const hN = k[n - 1].x - k[n - 2].x, hM = k[n - 2].x - k[n - 3].x;
                m = ((2 * hN + hM) * dN - hN * dM) / (hN + hM);
                if (m * dN <= 0) m = 0;
                else if (dN * dM <= 0 && Math.abs(m) > 3 * Math.abs(dN)) m = 3 * dN;
            }
            k[n - 1].m = m;
            return;
        }
        // interior knot
        const hPrev = k[i].x - k[i - 1].x;
        const hNext = k[i + 1].x - k[i].x;
        const dPrev = (k[i].y - k[i - 1].y) / hPrev;
        const dNext = (k[i + 1].y - k[i].y) / hNext;
        if (dPrev * dNext <= 0) {
            k[i].m = 0;                       // local extremum -> flat (rounded crest/trough)
        } else {
            const w1 = 2 * hNext + hPrev;
            const w2 = hNext + 2 * hPrev;
            k[i].m = (w1 + w2) / (w1 / dPrev + w2 / dNext);
        }
    }

    // ---- Feature generators (parametric) ----------------------------------
    // Each starts from the current last knot. d = difficulty 0..~1.6.

    _rint(lo, hi) { return lo + Math.floor(this.rng() * (hi - lo + 1)); }

    // Rounded, evenly paced rollers: push through the trough, extend on the climb.
    genPumpRollers(count, d) {
        const P = CONFIG.TERRAIN.pump;
        // A section shares one tempo with a small, repeating height variation.
        const baseH = (P.minH + (P.maxH - P.minH) * 0.5) * (1 + d * 0.12);
        const ratio = (P.minRatio + P.maxRatio) * 0.5;
        for (let i = 0; i < count; i++) {
            const h = baseH * (1 + Math.sin(i * 1.7) * 0.04);
            const wl = baseH * ratio;
            this._rel(wl * 0.45, -h);
            this._rel(wl * 0.55, h + P.drop);
        }
    }

    // A single dirt JUMP: a curved kicker steepening to a poppy lip (the bike
    // launches carrying up-velocity = speed·sin(lip)), then either a TABLE
    // (roll-or-jump, forgiving) or a GAP (a pit you must clear), each finished
    // with a matched downslope LANDING you can come down onto cleanly.
    genJump(kind, d) {
        const J = CONFIG.TERRAIN.jump;
        const kickH = J.kickH + J.kickHPerD * d;
        const kickLen = kickH * J.kickRatio;
        const prevLast = this.knots.length - 1;
        this._rel(kickLen * 0.55, -kickH * 0.38);
        this._rel(kickLen * 0.45, -kickH * 0.62);
        const lipX = this._last().x;
        this._registerLip(lipX, J.lipBoost + kickH * J.lipBoostPerH);
        // A sharp edge has separate incoming and outgoing tangents. The
        // final face keeps climbing right to the lip, then breaks onto the deck.
        this._last().inSlope = -0.50;
        this._last().outSlope = 0;
        this._rel(14, 5);
        this._last().inSlope = 0;
        this._last().outSlope = 0;
        const deck = J.tableLen + d * 30;
        if (kind === 'gap') {
            const gap = J.gapMin + J.gapPerD * d;
            this._rel(gap * 0.5, kickH * 0.85);
            this._rel(gap * 0.5, -kickH * 0.85);
            this._rel(35, 5);
        } else {
            this._rel(deck, J.tableDrop);
        }
        // Broad landing catch zone accommodates different approach speeds.
        // Its run-out is protected: no next kicker hides under the flight arc.
        const landingStart = this._last().x;
        const landLen = J.landingLen + d * J.landingLenPerD;
        this._rel(landLen * 0.22, landLen * J.landRatio * 0.15);
        this._rel(landLen * 0.56, landLen * J.landRatio * 0.70);
        this._rel(landLen * 0.22, landLen * J.landRatio * 0.15);
        const landingEnd = this._last().x;
        this._rel(J.runUp + d * 35, 18);
        this.lips[this.lips.length - 1].landingStart = landingStart;
        this.lips[this.lips.length - 1].landingEnd = landingEnd;
        this._recomputeTail(Math.max(0, prevLast - 1));
    }

    genJumpLine(d, allowGap, count = 2) {
        for (let i = 0; i < count; i++) {
            this.genJump(allowGap && i === count - 1 ? 'gap' : 'table', d);
        }
    }

    // Composed phrases replace random feature piles: build, send, recover.
    // Every run opens on the same three rollers and a forgiving tabletop.
    nextFeature() {
        const n = this.featureCount++;
        const d = CONFIG.difficultyAt(this.endX);
        const prevLast = this.knots.length - 1;
        if (n === 0) {
            this.genPumpRollers(3, 0);
            this._rel(120, 12);
        } else if (n === 1) {
            this.genJumpLine(0, false, 1);
        } else {
            const phrase = (n - 2) % 4;
            if (phrase === 0 || phrase === 2) {
                this.genPumpRollers(phrase === 0 ? 2 : 3, d);
                this._rel(110, 12);
            } else {
                // First build confidence with tables. Later, one short gap closes
                // a two-jump phrase; landings never shrink with difficulty.
                this.genJumpLine(d, n >= 9 && phrase === 3, 2);
            }
        }
        this._recomputeTail(Math.max(0, prevLast - 1));
    }

    // Generate until the track covers up to x + lookahead.
    _ensure(x) {
        const target = x + CONFIG.TERRAIN.lookahead;
        let guard = 0;
        while (this.endX < target && guard++ < 400) this.nextFeature();
    }

    // Drop knots well behind the camera (draw/memory only; the bike only moves
    // forward so this never affects heightAt ahead of _minX).
    cull(cameraLeftX) {
        const cut = cameraLeftX - CONFIG.TERRAIN.cullBehind;
        let drop = 0;
        while (this.knots.length - drop > 4 && this.knots[drop + 1].x < cut) drop++;
        if (drop > 0) {
            this.knots.splice(0, drop);
            this._minX = this.knots[0].x;
            this._tangentAt(0);
        }
        // prune lips well behind the camera too
        if (this.lips.length) this.lips = this.lips.filter(L => L.x >= cut - 200);
    }

    // ---- Jump-lip launch points -------------------------------------------
    _registerLip(x, boost) { this.lips.push({ x, boost }); }

    // The launch boost of a jump lip in the bike's step (x .. x+step], or 0 if
    // none. Pump rollers register no lip → the bike stays glued and flows; only a
    // jump lip launches you, with its designed kicker impulse.
    lipAt(x, step) { return this.lips.find(lip => lip.x >= x && lip.x <= x + step) || null; }

    lipBoostAt(x, step) {
        const lo = x - 2, hi = x + step + 4;
        for (let i = 0; i < this.lips.length; i++) {
            if (this.lips[i].x >= lo && this.lips[i].x <= hi) return this.lips[i].boost;
        }
        return 0;
    }

    // binary search: index i such that knots[i].x <= x < knots[i+1].x
    _seg(x) {
        const k = this.knots;
        let lo = 0, hi = k.length - 1;
        if (x <= k[0].x) return 0;
        if (x >= k[hi].x) return hi - 1;
        while (lo < hi) {
            const mid = (lo + hi + 1) >> 1;
            if (k[mid].x <= x) lo = mid; else hi = mid - 1;
        }
        return lo;
    }

    // Hermite-evaluate height at x (auto-extends the track ahead as needed).
    heightAt(x) {
        this._ensure(x);
        const k = this.knots;
        if (x <= k[0].x) return k[0].y;
        const i = this._seg(x);
        const x0 = k[i].x, x1 = k[i + 1].x;
        const h = x1 - x0;
        const t = (x - x0) / h;
        const t2 = t * t, t3 = t2 * t;
        const h00 = 2 * t3 - 3 * t2 + 1;
        const h10 = t3 - 2 * t2 + t;
        const h01 = -2 * t3 + 3 * t2;
        const h11 = t3 - t2;
        return h00 * k[i].y + h10 * h * (k[i].outSlope ?? k[i].m) + h01 * k[i + 1].y + h11 * h * (k[i + 1].inSlope ?? k[i + 1].m);
    }

    // Analytic slope; launch edges deliberately have different one-sided slopes.
    slopeAt(x) {
        this._ensure(x);
        const k = this.knots;
        if (x <= k[0].x) return k[0].m;
        const i = this._seg(x);
        const x0 = k[i].x, x1 = k[i + 1].x;
        const h = x1 - x0;
        const t = (x - x0) / h;
        const t2 = t * t;
        const dh00 = 6 * t2 - 6 * t;
        const dh10 = 3 * t2 - 4 * t + 1;
        const dh01 = -6 * t2 + 6 * t;
        const dh11 = 3 * t2 - 2 * t;
        return (dh00 * k[i].y + dh01 * k[i + 1].y) / h + dh10 * (k[i].outSlope ?? k[i].m) + dh11 * (k[i + 1].inSlope ?? k[i + 1].m);
    }

    // second derivative (not continuous across knots; used only as a hint)
    curvatureAt(x) {
        this._ensure(x);
        const k = this.knots;
        if (x <= k[0].x) return 0;
        const i = this._seg(x);
        const x0 = k[i].x, x1 = k[i + 1].x;
        const h = x1 - x0;
        const t = (x - x0) / h;
        const d2h00 = 12 * t - 6;
        const d2h10 = 6 * t - 4;
        const d2h01 = -12 * t + 6;
        const d2h11 = 6 * t - 2;
        return (d2h00 * k[i].y + d2h01 * k[i + 1].y) / (h * h)
            + (d2h10 * (k[i].outSlope ?? k[i].m) + d2h11 * (k[i + 1].inSlope ?? k[i + 1].m)) / h;
    }

    // ---- Draw ----
    // Sample the visible x-range and fill the dirt body down to the camera floor.
    draw(g, camLeft, camRight, camBottom) {
        this._ensure(camRight);
        g.clear();
        const step = 6;
        const top = [];
        for (let x = camLeft - step; x <= camRight + step; x += step) {
            top.push({ x, y: this.heightAt(x) });
        }

        // Include exact corners so render sampling cannot round a launch edge.
        for (const knot of this.knots) if (knot.inSlope !== undefined && knot.x >= camLeft-step && knot.x <= camRight+step)
            top.push({x:knot.x,y:knot.y});
        top.sort((a,b)=>a.x-b.x);

        // dirt body
        g.fillStyle(CONFIG.COLORS.DIRT_FILL, 1);
        g.beginPath();
        g.moveTo(top[0].x, camBottom + 80);
        for (const p of top) g.lineTo(p.x, p.y);
        g.lineTo(top[top.length - 1].x, camBottom + 80);
        g.closePath();
        g.fillPath();

        // Layered packed earth. Every mark stays anchored to the terrain.
        for (const [depth, color] of [[29, 0x976344], [12, CONFIG.COLORS.DIRT_TOP]]) {
            g.fillStyle(color, 1);
            g.beginPath();
            g.moveTo(top[0].x, top[0].y);
            for (const p of top) g.lineTo(p.x, p.y);
            for (let i = top.length - 1; i >= 0; i--) {
                const p = top[i];
                g.lineTo(p.x, p.y + depth + Math.sin(p.x * 0.025) * depth * 0.12);
            }
            g.closePath(); g.fillPath();
        }
        // Shale seams soften the otherwise empty solid dirt cross-section.
        for (let row = 0; row < 4; row++) {
            g.lineStyle(1.5, row % 2 ? 0xb28359 : 0x483e32, 0.22);
            g.beginPath();
            for (let i = 0; i < top.length; i++) {
                const p = top[i], y = p.y + 60 + row * 53 + Math.sin(p.x * 0.012 + row) * 12;
                if (!i) g.moveTo(p.x, y); else g.lineTo(p.x, y);
            }
            g.strokePath();
        }
        for (let n = Math.floor(camLeft / 27); n <= camRight / 27; n++) {
            const x = n * 27 + Math.sin(n * 4.1) * 7;
            const ground = this.heightAt(x);
            for (let row = 0; row < 5; row++) {
                const hash = Math.abs(Math.sin(n * 12.9898 + row * 78.233));
                const y = ground + 19 + row * 45 + hash * 28;
                g.fillStyle(row % 2 ? 0xd0aa77 : 0x302f29, 0.18);
                g.fillEllipse(x + row * 3, y, 2 + hash * 5, 1 + hash * 2);
            }
        }
        // A bright, continuous riding line makes the actual collision surface clear.
        g.lineStyle(2.5, CONFIG.COLORS.DIRT_LINE, 1);
        g.beginPath(); g.moveTo(top[0].x, top[0].y);
        for (const p of top) g.lineTo(p.x, p.y);
        g.strokePath();

        // Sparse scrub and rocks along the trail's far edge.
        for (let n = Math.floor(camLeft / 123); n <= camRight / 123; n++) {
            const x = n * 123 + Math.sin(n * 3.1) * 18;
            if (Math.abs(this.slopeAt(x)) > 0.35) continue;
            const y = this.heightAt(x);
            g.lineStyle(2, 0x526347, 0.85);
            for (let j = -2; j <= 2; j++) g.lineBetween(x, y - 1, x + j * 4, y - 6 - Math.abs(Math.sin(n + j)) * 8);
            if (n % 3 === 0) {
                g.fillStyle(0x8d8b6d, 1);
                g.fillTriangle(x + 15, y, x + 21, y - 6, x + 29, y);
            }
        }
        // Orange flags mark takeoffs; teal flags mark the start of each landing.
        for (const lip of this.lips) {
            if (lip.landingStart >= camLeft - 30 && lip.landingStart <= camRight + 30) {
                const lx=lip.landingStart,ly=this.heightAt(lx);
                g.lineStyle(2,0xf7e1b6,1);g.lineBetween(lx,ly-1,lx,ly-30);
                g.fillStyle(0x67c7af,1);g.fillTriangle(lx,ly-30,lx+18,ly-25,lx,ly-19);
            }
            if (lip.x < camLeft - 30 || lip.x > camRight + 30) continue;
            const x = lip.x - 12, y = this.heightAt(x);
            g.lineStyle(2, 0xf7e1b6, 1); g.lineBetween(x, y - 1, x, y - 38);
            g.fillStyle(0xee8d49, 1); g.fillTriangle(x, y - 38, x + 22, y - 32, x, y - 24);
        }
    }
}
