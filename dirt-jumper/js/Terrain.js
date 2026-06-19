// Dirt Jumper — Terrain heightfield.
//
// Continuous C^1 height profile T(x) built from streamed parametric features
// (rollers / whoops / tabletop / gap), stitched at matching height AND slope.
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
        this.rng = djRng((seed >>> 0) || 1);
        this.featureCount = 0;
        this._minX = 0;

        // Seed the track: a flat run-in so the bike settles before the first feature.
        const T = CONFIG.TERRAIN;
        this._push(0, 0);
        this._push(T.startFlat * 0.5, 4);    // tiny initial pitch
        this._push(T.startFlat, 18);
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

    // PUMP ROLLERS — flowy sine hills you pump for speed. length ≈ 8-11x height
    // (the "10:1" rule → ~17-21° faces, rounded & rollable, NOT launchy). Height
    // AND spacing vary per roller so it reads like a real pump track, not whoops.
    genPumpRollers(count, d) {
        const P = CONFIG.TERRAIN.pump;
        for (let i = 0; i < count; i++) {
            const h = (P.minH + this.rng() * (P.maxH - P.minH)) * (1 + d * 0.3);
            const ratio = P.minRatio + this.rng() * (P.maxRatio - P.minRatio);
            const wl = h * ratio;
            this._rel(wl * 0.5, P.drop * 0.5 - h * 0.5);   // crest (up)
            this._rel(wl * 0.5, P.drop * 0.5 + h * 0.5);   // trough (down)
        }
    }

    // WHOOPS — the tight, uniform, jerky tech section (ratio ~2.6 → ~45° bumps).
    // Deliberately distinct from pump rollers: small, close, rough to skim/pump.
    genWhoops(count, d) {
        const W = CONFIG.TERRAIN.whoops;
        const h = W.h + d * 5;
        const wl = h * W.ratio;
        for (let i = 0; i < count; i++) {
            this._rel(wl * 0.5, W.drop * 0.5 - h * 0.5);
            this._rel(wl * 0.5, W.drop * 0.5 + h * 0.5);
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
        // curved kicker: gentle base steepening to a ~38-42° lip
        this._rel(kickLen * 0.55, -kickH * 0.38);
        this._rel(kickLen * 0.45, -kickH * 0.62);   // the lip (launch point)

        if (kind === 'gap') {
            const gap = J.gapMin + J.gapPerD * d;
            const voidD = kickH * J.voidRatio;
            this._rel(gap * 0.5, kickH + voidD);    // drop into the pit floor (below baseline)
            this._rel(gap * 0.5, -voidD);           // up to far edge (~baseline) = landing lip
            const landDrop = kickH;                 // land on a downslope, net descent = kickH
            this._rel(landDrop / J.landRatio, landDrop);
        } else {
            this._rel(J.tableLen, J.tableDrop);     // flat-ish table top (roll or send it)
            const landDrop = kickH - J.tableDrop + 20;
            this._rel(landDrop / J.landRatio, landDrop);   // matched downslope landing
        }
    }

    // A JUMP LINE: 1-3 jumps in rhythm, the landing of one flowing into the
    // short run-up of the next. Gaps only appear once you're warmed up.
    genJumpLine(d, allowGap) {
        const J = CONFIG.TERRAIN.jump;
        const count = 1 + Math.floor(d * 1.4 + this.rng() * 0.7);   // 1..3
        for (let i = 0; i < count; i++) {
            const useGap = allowGap && (i > 0 || d > 0.4) && this.rng() < (0.30 + d * 0.35);
            this.genJump(useGap ? 'gap' : 'table', d);
            if (i < count - 1) this._rel(J.runUp, 12);   // run-up to the next kicker
        }
    }

    // Track layout: warm up, then alternate a PUMP section (build speed) with a
    // "spend it" feature (a jump line, occasionally whoops). Connectors descend
    // gently so the track always flows — no flat dead spots.
    nextFeature() {
        const T = CONFIG.TERRAIN;
        const d = CONFIG.difficultyAt(this.endX);
        const n = this.featureCount++;
        // the prior endpoint becomes interior now → retangent it (and all new knots).
        const prevLast = this.knots.length - 1;

        if (n === 0) {
            this.genPumpRollers(this._rint(T.pump.minCount, T.pump.maxCount), d * 0.4);
        } else if (n % 2 === 1) {
            this.genPumpRollers(this._rint(T.pump.minCount, T.pump.maxCount), d);
        } else {
            const pick = (n / 2) % 3;
            if (pick === 2) this.genWhoops(this._rint(T.whoops.minCount, T.whoops.maxCount), d);
            else this.genJumpLine(d, n > 2);    // first jump line is tables-only
        }

        // gentle descending connector (never dead-flat → keeps pump flow)
        this._rel(90 + this.rng() * 70, T.baseDrop);
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
        return h00 * k[i].y + h10 * h * k[i].m + h01 * k[i + 1].y + h11 * h * k[i + 1].m;
    }

    // analytic d(height)/dx (continuous -> C^1)
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
        return (dh00 * k[i].y + dh01 * k[i + 1].y) / h + dh10 * k[i].m + dh11 * k[i + 1].m;
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
            + (d2h10 * k[i].m + d2h11 * k[i + 1].m) / h;
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

        // dirt body
        g.fillStyle(CONFIG.COLORS.DIRT_FILL, 1);
        g.beginPath();
        g.moveTo(top[0].x, camBottom + 80);
        for (const p of top) g.lineTo(p.x, p.y);
        g.lineTo(top[top.length - 1].x, camBottom + 80);
        g.closePath();
        g.fillPath();

        // sunlit top band (offset fill just under the surface)
        g.fillStyle(CONFIG.COLORS.DIRT_TOP, 1);
        g.beginPath();
        g.moveTo(top[0].x, top[0].y);
        for (const p of top) g.lineTo(p.x, p.y);
        for (let i = top.length - 1; i >= 0; i--) g.lineTo(top[i].x, top[i].y + 9);
        g.closePath();
        g.fillPath();

        // surface outline
        g.lineStyle(2, CONFIG.COLORS.DIRT_LINE, 0.9);
        g.beginPath();
        g.moveTo(top[0].x, top[0].y);
        for (const p of top) g.lineTo(p.x, p.y);
        g.strokePath();
    }
}
