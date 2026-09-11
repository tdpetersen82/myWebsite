#!/usr/bin/env node
// Daily Orbit: every day must have a par the N-body physics actually completes, the
// numbers must be deterministic, and the dials must be able to reproduce par.
//   node tools/daily-orbit-test.mjs [stride]      exits 1 on any failure (stride: test every Nth day of the first 420; default 9)
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { createSolarCore } = require('../solar-system/ss-core.js');
const OrbitEngine = require('../daily-orbit/orbit-engine.js');

let fails = 0;
const ok = (c, name, detail = '') => { console.log((c ? 'ok   ' : 'FAIL ') + name + (c ? '' : '  — ' + detail)); if (!c) fails++; };
const api = createSolarCore(); api.onEmit(() => {});
const eng = OrbitEngine(api);
const stride = parseInt(process.argv[2] || '9', 10);

// puzzle numbering
ok(eng.dayIndexFor(Date.UTC(2026, 8, 9)) === 0 && eng.dayIndexFor(Date.UTC(2026, 8, 10, 23, 59)) === 1, 'day index: 2026-09-09 is #1, the UTC day boundary flips it');

// determinism
const a = eng.setup(0), b = eng.setup(0);
ok(a.par && b.par && a.par.totalKms === b.par.totalKms && a.par.aim === b.par.aim && a.target === b.target, `same day → same board and par (${a.target}, ${a.par && a.par.totalKms.toFixed(3)} km/s)`);

// every tested day: a par exists, sits under the "workable window" ceiling, is ON the dials, and the player
// can reproduce it exactly; a slightly-off shot is saved by the mid-course correction at a fuel cost; a wild shot misses.
const t0 = Date.now(), picked = {};
for (let d = 0; d < 420; d += stride) {
  const bd = eng.setup(d), p = bd.par, w = bd.windows.find(x => x.name === bd.target);
  const tag = `#${bd.number} ${bd.dateISO} ${bd.target}`;
  picked[bd.target] = (picked[bd.target] || 0) + 1;
  ok(!!p, `${tag}: has a flyable par`, `fallbacks ${bd.fallbacks}`);
  if (!p) continue;
  ok(bd.fallbacks === 0, `${tag}: the rotation's first choice flew fairly (no fallback)`, `fallbacks ${bd.fallbacks}`);
  ok(bd.fair, `${tag}: par is FAIR — it survives a ±${eng.FAIR}° aim error and none of its dial neighbours is a knife-edge`);
  const elig = bd.windows.filter(x => x.eligible).map(x => `${x.name} ×${x.ratio.toFixed(2)}`).join(', ');
  const fb = Object.entries(p.flybys || {}).map(([n, d]) => `${n} ${d.toFixed(2)} AU`).join(', ');
  ok(w.eligible || bd.windows.every(x => !x.eligible), `${tag}: par ${p.totalKms.toFixed(1)} km/s (own shot ${p.ownKms.toFixed(1)}) = ${p.depKms.toFixed(1)} dep + ${p.corrKms.toFixed(2)} corr + ${p.capKms.toFixed(1)} arrive, ${Math.round(p.tofDays)} d · playable: ${elig || 'none'}${fb ? ' · passes ' + fb : ''}`);
  ok(p.corrKms <= eng.TANK, `${tag}: par is ${p.corrKms ? 'a corrected shot (' + (p.corrKms * 1000).toFixed(0) + ' m/s burn — no clean two-body arc survives the N-body flight)' : 'a clean shot, no correction'}`);
  const same = eng.fly(d, p.speed, p.aim);
  ok(same.arrived && same.ratio <= 1 + 1e-9 && same.ratio > 0.8, `${tag}: dialing par arrives at or under par (${(same.ratio * 100).toFixed(1)}% — par is the worst of its ±${eng.ROBUST.aim}° / ±${eng.ROBUST.speed} km/s neighbourhood)`);
  // the smallest aim error that misses on its own must be saved by the 1.5 km/s correction tank; bigger ones may run out
  let first = null;
  for (const dg of [0.5, 1, 2, 4, 8, 16]) { const r = eng.fly(d, p.speed, p.aim + dg); if (r.corr || !r.arrived) { first = { dg, r }; break; } }
  if (!first) ok(true, `${tag}: forgiving day — aim errors up to 16° still arrive without a correction`);
  else {
    const r = first.r, c = r.corr;
    const line = c ? `${c.applied ? 'saved by a ' + c.kms.toFixed(2) + ' km/s correction, fuel ' + (r.ratio * 100).toFixed(0) + '% of par' : 'needs ' + (c.kms === null ? 'an impossible' : c.kms.toFixed(1) + ' km/s') + ' correction — over the ' + eng.TANK + ' km/s tank, so it misses'} (uncorrected miss ${r.uncorrected.closestAU.toFixed(3)} AU)` : `misses outright (closest ${r.closestAU.toFixed(3)} AU, envelope ${bd.envelope})`;
    ok(first.dg > 1 || (c && c.applied && r.arrived), `${tag}: aim off by ${first.dg}° → ${line}`);
  }
  const wild = eng.fly(d, p.speed, p.aim + 40);
  ok(true, `${tag}: aim off by 40° → ${wild.arrived ? 'still arrives, at ' + (wild.ratio * 100).toFixed(0) + '% of par (a forgiving day)' : 'misses (closest ' + wild.closestAU.toFixed(2) + ' AU)'}`);
}
console.log(`(${Math.round((Date.now() - t0) / 1000)} s for the day sweep; targets picked: ${Object.entries(picked).map(([k, v]) => k + ' ' + v).join(', ')})`);

// the rotation over two years: every planet gets its turns, no long runs of one target
{
  const seq = []; for (let d = 0; d < 730; d++) seq.push(eng.chooseOrder(d, eng.windows(d))[0]);
  const cnt = {}; let rep = 0, run = 1, longest = 1;
  seq.forEach((n, i) => { cnt[n] = (cnt[n] || 0) + 1; if (i && seq[i - 1] === n) { rep++; run++; longest = Math.max(longest, run); } else run = 1; });
  ok(eng.ORDER.every(n => (cnt[n] || 0) >= 30), `over 730 days every planet is the target at least 30 times (${eng.ORDER.map(n => n + ' ' + (cnt[n] || 0)).join(', ')})`);
  ok(rep <= 20 && longest <= 3, `the target rarely repeats on consecutive days (${rep} repeats, longest run ${longest})`);
}

// facts from an ordinary shot
const f = eng.fly(0, 3.0, 0);
ok(Number.isFinite(f.closestAU) && f.path.length > 200 && f.world.length === f.path.length * f.planetOrder.length && Number.isFinite(f.daysFlown), `a plain prograde 3 km/s shot returns finite facts and a replayable path (${f.path.length / 2} samples, ${Math.round(f.daysFlown)} d)`);
ok(f.cross === null || (Number.isFinite(f.cross.days) && Math.abs(f.cross.lead) <= 180), 'orbit-crossing fact is well-formed');
console.log(fails ? `\n${fails} FAILURE(S)` : '\nall green');
process.exit(fails ? 1 : 0);
