// Daily Orbit — the puzzle logic, shared by the page's Web Worker and tools/daily-orbit-test.mjs.
// Runs on a createSolarCore() instance (solar-system/ss-core.js): the same N-body physics as
// the Solar System sim. Everything here is deterministic — the calendar date is the only seed.
(function (root) {
  'use strict';
  const EPOCH = { y: 2026, m: 9, d: 9 };                       // puzzle #1
  const ORDER = ['Mars', 'Venus', 'Jupiter', 'Saturn', 'Mercury'];
  const OUTER = { Jupiter: true, Saturn: true };
  const SPAN = { inner: [0.35, 2.2], outer: [0.5, 2.4] };      // time-of-flight scan, in Hohmann times
  const NSCAN = { inner: 56, outer: 48 };
  const MAXT = { inner: 2.6, outer: 2.8 };                     // how long a launch is followed, in Hohmann times
  const TOPK = { inner: 8, outer: 5 };                         // two-body candidates re-flown in the N-body sim for par
  const OPEN = 1.6;                                            // the page's "window open/fair/closed" chip: ≤ 1.6× the Hohmann ideal reads as fair
  // Which targets are playable today. Measured (tools/daily-orbit-test.mjs + a 800-day survey, 2026-09-11):
  // Mars and Venus stay fair however closed the window; the giants' UNFAIR days are the slow transfers
  // well past the Hohmann time (a 0.5° aim error then misses by more than the correction envelope), so
  // they're gated on the scan's best time of flight, not on cost. Mercury is always reachable — it's
  // capped so it doesn't hog the rotation.
  const LIMIT = { Mars: 2.3, Venus: 2.3, Jupiter: 2.25, Saturn: 2.25, Mercury: 1.75 };   // ratio to the Hohmann ideal
  const TOFMAX = { Jupiter: 2.0, Saturn: 1.06 };                                          // best time of flight, in Hohmann times
  const ROBUST = { aim: 0.2, speed: 0.02 };                     // par is judged on this neighbourhood of the dials, so ★★★ doesn't need a knife-edge
  const FAIR = 0.5;                                            // degrees of aim error a fair par must survive (with the correction tank)
  const FINALISTS = 3;                                         // arrivals that get the full robust treatment
  const ENVELOPE = { inner: 0.35, outer: 1.2 };                // AU: a miss inside this gets a mid-course correction attempt
  const TANK = 1.5;                                            // km/s the craft carries for that one correction — more than that and it's a miss
  const CORR_AT = 0.3;                                         // when the correction burns: this fraction of the way to the uncorrected miss (earlier is cheaper)
  const ASSIST = 0.5;                                          // AU: par may not lean on a pass this close to Jupiter or Saturn (a player may!)
  const STEP = { speed: 0.01, aim: 0.1 };                      // the dials' resolution (km/s, degrees)
  const STARS = [1.05, 1.25];                                  // fuel ≤ 105% of par → ★★★, ≤ 125% → ★★, arrived → ★

  function OrbitEngine(api) {
    const { SUN, EARTH, planets, G, DT, KMS } = api;
    const byName = n => planets.find(p => p.name === n);
    const epochJD = api.julianDay(EPOCH.y, EPOCH.m, EPOCH.d);
    const epochDay = Math.floor(Date.UTC(EPOCH.y, EPOCH.m - 1, EPOCH.d) / 864e5);
    const dayIndexFor = utcMs => Math.floor(utcMs / 864e5) - epochDay;      // 0 on launch day → puzzle #1
    const jdForDay = day => epochJD + day;
    const dateForDay = day => new Date((epochDay + day) * 864e5);           // UTC midnight
    const distSun = b => Math.hypot(b.x - SUN.x, b.y - SUN.y);
    const mu = G * SUN.m;
    const hohmannT = (r1, r2) => { const at = (r1 + r2) / 2; return Math.PI * Math.sqrt(at * at * at / mu); };
    const hohmannKms = (r1, r2) => (Math.sqrt(mu / r1) * Math.abs(Math.sqrt(2 * r2 / (r1 + r2)) - 1) + Math.sqrt(mu / r2) * Math.abs(1 - Math.sqrt(2 * r1 / (r1 + r2)))) * KMS;
    const arrRadius = tgt => Math.max(0.05, 0.4 * distSun(tgt) * Math.pow(tgt.m, 0.4));   // the sim page's rule: a slice of the sphere of influence
    const lonOf = (x, y) => Math.atan2(y - SUN.y, x - SUN.x);
    const wrapDeg = d => ((d % 360) + 540) % 360 - 180;
    const kindOf = tgt => OUTER[tgt.name] ? 'outer' : 'inner';
    const snap = (v, s) => Math.round(v / s) * s;

    function arrange(day) { api.arrangeForDate(jdForDay(day)); api.clearSpecks(); api.clearProbes(); }

    // Launch frame at Earth: u = prograde (Earth's direction of travel), r = outward from the Sun.
    function frame() {
      const ux = EARTH.vx - SUN.vx, uy = EARTH.vy - SUN.vy, ul = Math.hypot(ux, uy) || 1;
      const rx = EARTH.x - SUN.x, ry = EARTH.y - SUN.y, rl = Math.hypot(rx, ry) || 1;
      return { ux: ux / ul, uy: uy / ul, rx: rx / rl, ry: ry / rl };
    }
    // The two dials for a heliocentric departure velocity v1: speed over Earth (km/s) and aim (° off prograde, + = outward).
    function dialsFor(v1) {
      const f = frame(), bx = v1[0] - (EARTH.vx - SUN.vx), by = v1[1] - (EARTH.vy - SUN.vy);
      return { speed: Math.hypot(bx, by) * KMS, aim: Math.atan2(bx * f.rx + by * f.ry, bx * f.ux + by * f.uy) * 180 / Math.PI };
    }
    function launchState(speedKms, aimDeg) {
      const f = frame(), s = speedKms / KMS, a = aimDeg * Math.PI / 180;
      return { x: EARTH.x + f.ux * 0.012, y: EARTH.y + f.uy * 0.012,               // just off Earth, like the sim's own launches
               vx: EARTH.vx + s * (Math.cos(a) * f.ux + Math.sin(a) * f.rx), vy: EARTH.vy + s * (Math.cos(a) * f.uy + Math.sin(a) * f.ry) };
    }

    // One pass through the N-body sim from launch state st (board already arranged).
    // correctAt: sim time (from launch) of a single mid-course correction burn, or null.
    function pass(st, target, maxT, samples, correctAt, keepWorld, remaining) {
      const arrR = arrRadius(target), t0 = api.state().t;
      const pr = api.addProbe({ x: st.x, y: st.y, vx: st.vx, vy: st.vy, trail: [], t0, closest: Infinity, arrived: false, done: false, arrR, target,
                                jMin: Infinity, boosted: false, flyby: {}, hit: {}, k: 0 });
      const stepsTotal = Math.ceil(maxT / DT), sub = Math.max(1, Math.ceil(stepsTotal / samples));
      const path = [], world = keepWorld ? [] : null, rC = [], rT = [], lonC = [], lonT = [], tt = [];
      let corr = null, corrIdx = -1;
      const rec = () => {
        path.push(pr.x - SUN.x, pr.y - SUN.y); rC.push(distSun(pr)); rT.push(distSun(target));
        lonC.push(lonOf(pr.x, pr.y)); lonT.push(lonOf(target.x, target.y)); tt.push(api.state().t - t0);
        if (world) for (const b of planets) world.push(b.x - SUN.x, b.y - SUN.y);
      };
      rec();
      for (let steps = 0; steps < stepsTotal;) {
        api.advance(sub, 1); steps += sub; rec();
        if (pr.done) break;                                                  // flew into a planet
        if (correctAt !== null && !corr && api.state().t - t0 >= correctAt) {
          const vx0 = pr.vx, vy0 = pr.vy;
          const c = api.probeCorrection(pr, target, 0, remaining);          // Lambert re-aim from here toward the natural arrival time, verified two-body, applied
          const kms = c ? c.dv * KMS : null, over = !c || kms > TANK;
          if (over) { pr.vx = vx0; pr.vy = vy0; }                            // can't afford it: the burn is undone and the shot flies on as it was
          corr = { kms, days: (api.state().t - t0) * 365.25, over, applied: !over };
          corrIdx = tt.length - 1;
          if (!over) { pr.closest = Infinity; pr.arrived = false; }          // judge the corrected arc on its own
        }
        if (pr.arrived && api.state().t - pr.tClose > 0.03) break;          // arrived, now receding
      }
      // The facts describe the OUTBOUND LEG only — up to the first turn of the probe's distance from the
      // Sun — so a probe that loops round and meets the orbit years later isn't credited with a "crossing".
      const outward = rT[0] > rC[0];
      let iExt = rC.length - 1;
      for (let i = 1; i < rC.length - 1; i++) { if (outward ? rC[i + 1] < rC[i] : rC[i + 1] > rC[i]) { iExt = i; break; } }
      let cross = null; const s0 = Math.sign(rC[0] - rT[0]);
      for (let i = 1; i <= iExt; i++) {
        const si = Math.sign(rC[i] - rT[i]);
        if (si !== 0 && si !== s0) { cross = { days: tt[i] * 365.25, lead: wrapDeg((lonT[i] - lonC[i]) * 180 / Math.PI) }; break; }
      }
      const out = { arrived: !!pr.arrived, crashed: pr.crashed || null, closestAU: pr.closest, closestDays: (pr.tClose - t0) * 365.25,
                    capKms: pr.arrived ? pr.vArr * KMS : null, arrDays: pr.arrived ? (pr.tArr - t0) * 365.25 : null,   // capture cost: speed relative to the planet on entering its capture radius
                    flybys: Object.fromEntries(Object.entries(pr.minD || {}).filter(([n, d]) => n !== target.name && n !== 'Earth' && d < 0.5).map(([n, d]) => [n, d])),
                    corr, corrIdx, cross, outward,
                    rExtreme: rC[iExt], legDays: tt[iExt] * 365.25, arrR,
                    daysFlown: tt[tt.length - 1] * 365.25, path, world, times: tt, planetOrder: planets.map(p => p.name) };
      pr.done = true; api.clearProbes();
      return out;
    }

    // A launch as the player experiences it: fly it straight; if it misses inside the correction
    // envelope, fly it again with one Voyager-style mid-course burn halfway to the miss point.
    function flyState(day, st, target, keepWorld) {
      const kind = kindOf(target), H = hohmannT(distSun(EARTH), distSun(target)), maxT = MAXT[kind] * H;
      arrange(day);
      const first = pass(st, target, maxT, 360, null, keepWorld);
      if (first.arrived || first.crashed || !(first.closestAU < ENVELOPE[kind])) { first.uncorrected = null; return first; }
      arrange(day);
      const tCorr = CORR_AT * first.closestDays / 365.25;
      const second = pass(st, target, maxT, 360, tCorr, keepWorld, first.closestDays / 365.25 - tCorr);
      second.uncorrected = { closestAU: first.closestAU, closestDays: first.closestDays, cross: first.cross, rExtreme: first.rExtreme };
      if (!second.arrived) { second.cross = second.cross || first.cross; }
      return second;
    }
    function fuelOf(r) { return r.arrived ? r.depKms + (r.corr && r.corr.applied ? r.corr.kms : 0) + r.capKms : null; }
    // par candidates: a clean shot beats a corrected one, then lower fuel; a pass near a giant that isn't the target is out
    const assisted = (r, target) => Object.entries(r.flybys || {}).some(([n, d]) => (n === 'Jupiter' || n === 'Saturn') && n !== target.name && d < ASSIST);
    const better = (a, b) => !b || (!(a.r.corr && a.r.corr.applied) && (b.r.corr && b.r.corr.applied)) || ((!!(a.r.corr && a.r.corr.applied) === !!(b.r.corr && b.r.corr.applied)) && a.totalKms < b.totalKms);

    // Today's cost of every target: the cheapest verified two-body arc vs the Hohmann ideal.
    function windows(day) {
      arrange(day);
      const rE = distSun(EARTH);
      return ORDER.map(name => {
        const t = byName(name), kind = kindOf(t), c = api.transferScan(t, SPAN[kind], NSCAN[kind]);
        const total = c.length ? (c[0].dv + c[0].vArr) * KMS : Infinity, ideal = hohmannKms(rE, distSun(t)), H = hohmannT(rE, distSun(t));
        const tofH = c.length ? c[0].dt / H : null;
        return { name, total, ideal, ratio: total / ideal, tofDays: c.length ? c[0].dt * 365.25 : null, hohmannDays: H * 365.25, tofH,
                 eligible: total / ideal <= LIMIT[name] && (!TOFMAX[name] || tofH <= TOFMAX[name]) };
      });
    }
    // Target of the day. The playable planets rotate in ORDER (Mercury last, as filler); a day whose
    // rotation would repeat yesterday's pick moves one along. Returns the day's preference order —
    // setup() takes the first whose par is fair. Nothing playable: cheapest first.
    // Mercury is reachable almost every day; it stays in the pool as the filler that keeps the target
    // changing through the long stretches when only one other planet is playable (about a third of
    // days over two years — throttling it further trades that for same-target runs).
    const eligible = w => ORDER.filter(n => w.find(x => x.name === n).eligible);
    const rawPick = (day, w) => { const el = eligible(w); return el.length ? el[((day % el.length) + el.length) % el.length] : null; };
    function chooseOrder(day, w) {
      const el = eligible(w), pool = el.length ? el : w.slice().sort((a, b) => a.ratio - b.ratio).map(x => x.name);
      let i = ((day % pool.length) + pool.length) % pool.length;
      if (pool.length > 1 && rawPick(day - 1, windows(day - 1)) === pool[i]) i = (i + 1) % pool.length;
      return pool.slice(i).concat(pool.slice(0, i));
    }

    // Par: the cheapest transfer for the day that the N-body physics actually completes, expressed
    // ON THE DIALS (so a player can reproduce it exactly). Lambert candidates cheapest-first, each
    // re-flown; the best few arrivals are then judged on a small neighbourhood of the dials — par's
    // fuel is the WORST of that neighbourhood, so three stars never need a knife-edge — and the
    // winner must survive a ±FAIR° aim error (with the correction tank) to count as fair.
    function flyDials(day, target, sp, am) {
      arrange(day);                                                // the launch frame is today's Earth, not wherever the last flight left it
      const r = flyState(day, launchState(sp, am), target, false); r.depKms = sp; r.aim = am; r.totalKms = fuelOf(r);
      return r;
    }
    function par(day, target) {
      arrange(day);
      const kind = kindOf(target), cands = api.transferScan(target, SPAN[kind], NSCAN[kind]);
      const arrivals = []; let tried = 0;
      for (const c of cands) {
        const d = dialsFor((arrange(day), c.v1)), sp = +snap(d.speed, STEP.speed).toFixed(2), am = +snap(d.aim, STEP.aim).toFixed(1);
        if (arrivals.some(a => a.speed === sp && a.aim === am)) continue;
        const r = flyDials(day, target, sp, am); tried++;
        if (r.arrived && !assisted(r, target)) arrivals.push({ speed: sp, aim: am, totalKms: r.totalKms, r });
        if (arrivals.length >= TOPK[kind] || tried >= 3 * TOPK[kind]) break;
      }
      if (!arrivals.length) return { best: null, strip: [], tried, candidates: cands.length };
      arrivals.sort((a, b) => (better(a, b) ? -1 : 1));
      let win = null;
      for (const f of arrivals.slice(0, FINALISTS)) {
        const around = [[f.speed, f.aim + ROBUST.aim], [f.speed, f.aim - ROBUST.aim], [f.speed + ROBUST.speed, f.aim], [f.speed - ROBUST.speed, f.aim]]
          .map(([sp, am]) => flyDials(day, target, +sp.toFixed(2), +am.toFixed(1)));
        const fragile = around.some(r => !r.arrived || assisted(r, target));
        const robust = fragile ? Infinity : Math.max(f.totalKms, Math.max.apply(null, around.map(r => r.totalKms)));
        const cand = { speed: f.speed, aim: f.aim, ownKms: f.totalKms, totalKms: robust, fragile, r: f.r };
        if (!win || cand.totalKms < win.totalKms || (cand.fragile && win.fragile && cand.ownKms < win.ownKms)) win = cand;
      }
      if (win.fragile) win.totalKms = win.ownKms;                  // every finalist is a knife-edge: report it honestly (the board is flagged unfair)
      const fair = !win.fragile && [FAIR, -FAIR].every(d => { const r = flyDials(day, target, win.speed, +(win.aim + d).toFixed(1)); return r.arrived; });
      const r = win.r;
      const strip = cands.map(c => ({ days: c.dt * 365.25, dep: c.dv * KMS, cap: c.vArr * KMS })).sort((a, b) => a.days - b.days);
      return { best: { speed: win.speed, aim: win.aim, onGrid: true, fair, fragile: win.fragile, depKms: win.speed, corrKms: r.corr && r.corr.applied ? r.corr.kms : 0, capKms: r.capKms,
                       ownKms: win.ownKms, totalKms: win.totalKms, tofDays: r.arrDays, closestAU: r.closestAU, flybys: r.flybys, path: r.path, times: r.times }, strip, tried, candidates: cands.length };
    }

    let last = null;   // the board the worker is currently serving
    function setup(day, force) {                                  // force: a target name, for tools that survey every planet
      const w = windows(day), rE = (arrange(day), distSun(EARTH));
      const order = force ? [force] : chooseOrder(day, w);
      let target = null, res = null, fallbacks = -1, first = null;
      for (const name of order) {                                  // the first target whose par is fair wins; else the best we saw
        fallbacks++; target = byName(name); res = par(day, target);
        if (res.best && res.best.fair) break;
        if (res.best && !first) first = { target, res, fallbacks };
        res = null;
      }
      if (!res) { if (!first) throw new Error('no flyable par on day ' + day); target = first.target; res = first.res; fallbacks = first.fallbacks; }
      arrange(day);
      const jd = jdForDay(day), H = hohmannT(rE, distSun(target));
      const board = { day, number: day + 1, jd, dateISO: dateForDay(day).toISOString().slice(0, 10),
                      planets: planets.map(p => { const el = api.elementsAt(p, jd); return { name: p.name, x: p.x - SUN.x, y: p.y - SUN.y, vx: p.vx - SUN.vx, vy: p.vy - SUN.vy, a: p.a, e: p.e, w: el ? el.w : 0, R: p.R, color: p.color, size: p.size }; }),
                      target: target.name, kind: kindOf(target), arrR: arrRadius(target), envelope: ENVELOPE[kindOf(target)], hohmannDays: H * 365.25, maxDays: MAXT[kindOf(target)] * H * 365.25,
                      windows: w.map(x => ({ name: x.name, total: isFinite(x.total) ? x.total : null, ideal: x.ideal, ratio: isFinite(x.ratio) ? x.ratio : null, open: x.ratio <= OPEN, eligible: x.eligible, tofH: x.tofH })),
                      par: res.best, fair: !!(res.best && res.best.fair), strip: res.strip, fallbacks, step: STEP };
      last = board;
      return board;
    }
    function fly(day, speedKms, aimDeg) {
      if (!last || last.day !== day) setup(day);
      arrange(day);
      const target = byName(last.target);
      const r = flyState(day, launchState(speedKms, aimDeg), target, true);
      r.depKms = speedKms; r.totalKms = fuelOf(r);
      r.ratio = r.totalKms && last.par ? r.totalKms / last.par.totalKms : null;
      r.stars = r.arrived ? (r.ratio <= STARS[0] ? 3 : r.ratio <= STARS[1] ? 2 : 1) : 0;
      r.nearMiss = !r.arrived && !r.crashed && r.closestAU < 3 * r.arrR;
      return r;
    }
    return { EPOCH, ORDER, STARS, STEP, OPEN, TANK, LIMIT, TOFMAX, ROBUST, FAIR, dayIndexFor, jdForDay, dateForDay, setup, fly, windows, chooseOrder, dialsFor };
  }
  root.OrbitEngine = OrbitEngine;
  if (typeof module !== 'undefined' && module.exports) module.exports = OrbitEngine;
})(typeof self !== 'undefined' ? self : globalThis);
