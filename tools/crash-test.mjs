#!/usr/bin/env node
// Headless checks for crash/crash-engine.js: the house edge, the curve, and
// bet settlement. Run after any engine edit:  node tools/crash-test.mjs
import { createRequire } from 'node:module';
import { createHash, randomBytes } from 'node:crypto';
const require = createRequire(import.meta.url);
const E = require('../crash/crash-engine.js');

let fails = 0;
function check(name, ok, detail) {
  console.log((ok ? 'ok   ' : 'FAIL ') + name + (detail ? '  ' + detail : ''));
  if (!ok) fails++;
}
function near(a, b, tol) { return Math.abs(a - b) <= tol; }

// 1. uniform mapping covers [0, 1) and is monotone in the seed.
check('all-zero seed → r = 0', E.bytesToUniform(new Uint8Array(32)) === 0);
const ones = new Uint8Array(32).fill(0xff);
check('all-one seed → r < 1', E.bytesToUniform(ones) < 1 && E.bytesToUniform(ones) > 0.9999999);
{
  const a = new Uint8Array(32); a[6] = 0x10; // lowest used bit
  check('lowest of the 52 bits moves r by 2^-52', E.bytesToUniform(a) === Math.pow(2, -52));
  const b = new Uint8Array(32); b[6] = 0x08; // bit 53: must be ignored
  check('bit 53 is ignored', E.bytesToUniform(b) === 0);
}

// 2. crash point: floor 1.00, cap, cents, monotone.
check('r = 0 → 1.00 (instant bust)', E.crashPointFromUniform(0) === 1);
check('r = 0.005 → 1.00 (still under the edge)', E.crashPointFromUniform(0.005) === 1);
check('r = 0.01 → 1.00 exactly', E.crashPointFromUniform(0.01) === 1);
check('r = 0.505 → 2.00', E.crashPointFromUniform(0.505) === 2, String(E.crashPointFromUniform(0.505)));
check('r = 0.9999999 → capped at MAX_MULT', E.crashPointFromUniform(0.9999999) === E.MAX_MULT);
check('bad r → 1.00', E.crashPointFromUniform(NaN) === 1 && E.crashPointFromUniform(1.5) === 1);
{
  let mono = true, cents = true, prev = 0;
  for (let r = 0; r < 1; r += 0.00037) {
    const m = E.crashPointFromUniform(r);
    if (m < prev) mono = false;
    if (Math.abs(m * 100 - Math.round(m * 100)) > 1e-6) cents = false;
    prev = m;
  }
  check('crash point is monotone in r', mono);
  check('crash point is whole cents', cents);
}

// 3. house edge: cashing at any target x returns 0.99 per dollar, settled
// through settle() itself (auto AND manual paths) so the tie rule is what's
// measured. Analytic over a fine grid of r (no sampling noise), then random.
{
  const N = 400000;
  for (const x of [1.01, 1.1, 1.25, 1.5, 2, 3, 5, 10, 50]) {
    let sumAuto = 0, sumManual = 0;
    for (let i = 0; i < N; i++) {
      const r = (i + 0.5) / N;
      const c = E.crashPointFromUniform(r);
      sumAuto += E.settle({ bet: 100, auto: x, crash: c, cashedAt: null }).payout / 100;
      // manual: the player presses when the display shows x, which it does iff c >= x
      sumManual += c >= x ? E.settle({ bet: 100, auto: null, crash: c, cashedAt: x }).payout / 100 : 0;
    }
    const evA = sumAuto / N, evM = sumManual / N;
    check(`EV of auto cash-out at ${x}x = 0.99`, near(evA, 0.99, 0.0015), evA.toFixed(4));
    check(`EV of manual cash-out at ${x}x = 0.99`, near(evM, 0.99, 0.0015), evM.toFixed(4));
  }
  check('display reaches the bust value before the round ends',
    // ±0.05 ms: at 1000x a cent lasts only ~0.17 ms
    [1, 1.25, 2, 9.99, 1000].every(c => E.displayMultiplier(E.timeToBust(c) - 0.05) === c && E.displayMultiplier(E.timeToBust(c) + 0.05) > c));
  let sum = 0, n = 200000;
  for (let i = 0; i < n; i++) sum += E.crashPointFromBytes(randomBytes(32)) >= 2 ? 2 : 0;
  check('random seeds: EV at 2x ≈ 0.99 (±0.02)', near(sum / n, 0.99, 0.02), (sum / n).toFixed(4));
}

// 4. curve and inverse.
check('multiplier at t=0 is 1', E.multiplierAt(0) === 1 && E.multiplierAt(-5) === 1);
check('2x lands near 11.55 s', near(E.timeToMultiplier(2) / 1000, 11.55, 0.02), (E.timeToMultiplier(2) / 1000).toFixed(3));
check('10x lands near 38.4 s', near(E.timeToMultiplier(10) / 1000, 38.38, 0.05));
{
  let ok = true;
  for (const m of [1.01, 1.5, 2.37, 7, 99.99, 1000]) if (!near(E.multiplierAt(E.timeToMultiplier(m)), m, 1e-9)) ok = false;
  check('multiplierAt ∘ timeToMultiplier is identity', ok);
  ok = true;
  for (let ms = 0; ms < 60000; ms += 97) if (E.displayMultiplier(ms) > E.multiplierAt(ms) + 1e-12) ok = false;
  check('displayed multiplier never exceeds the true one', ok);
}

// 5. settlement.
{
  let s = E.settle({ bet: 100, auto: null, crash: 2.5, cashedAt: null });
  check('no cash-out → bust, lose stake', !s.won && s.payout === 0 && s.profit === -100);
  s = E.settle({ bet: 100, auto: null, crash: 2.5, cashedAt: 1.8 });
  check('manual 1.80 before 2.50 → pays 180', s.won && s.at === 1.8 && s.payout === 180 && s.profit === 80);
  s = E.settle({ bet: 100, auto: 2, crash: 2.5, cashedAt: null });
  check('auto 2.00 before 2.50 → pays 200', s.won && s.at === 2 && s.payout === 200);
  s = E.settle({ bet: 100, auto: 2.5, crash: 2.5, cashedAt: null });
  check('auto equal to the bust value → pays (tie to the player)', s.won && s.payout === 250);
  s = E.settle({ bet: 100, auto: 3, crash: 2.5, cashedAt: null });
  check('auto above the bust point → bust', !s.won);
  s = E.settle({ bet: 100, auto: 3, crash: 2.5, cashedAt: 1.5 });
  check('manual beats a later auto', s.won && s.at === 1.5 && s.payout === 150);
  s = E.settle({ bet: 100, auto: 1.3, crash: 2.5, cashedAt: 1.5 });
  check('earlier auto beats a later manual', s.won && s.at === 1.3 && s.payout === 130);
  s = E.settle({ bet: 100, auto: null, crash: 2.5, cashedAt: 2.5 });
  check('manual at the bust value pays', s.won && s.payout === 250);
  s = E.settle({ bet: 100, auto: null, crash: 2.5, cashedAt: 2.51 });
  check('manual above the bust value is impossible and pays nothing', !s.won);
  s = E.settle({ bet: 7, auto: null, crash: 9, cashedAt: 1.33 });
  check('payout is floored to whole dollars', s.payout === 9, String(s.payout));
  s = E.settle({ bet: 100, auto: 1.0, crash: 5, cashedAt: null });
  check('auto below MIN_AUTO is ignored', !s.won);
}

// 6. bots.
{
  let seedN = 1;
  const rand = () => { seedN = (seedN * 1103515245 + 12345) % 2147483648; return seedN / 2147483648; };
  const bots = E.makeBots(rand, 9);
  check('bots: requested count', bots.length === 9);
  check('bots: unique names', new Set(bots.map(b => b.name)).size === 9);
  check('bots: targets sorted ascending', bots.every((b, i) => i === 0 || b.target >= bots[i - 1].target));
  check('bots: sane targets and stakes', bots.every(b => b.target >= 1.1 && b.target <= 48 && b.bet >= 5 && b.bet <= 250));
  let lo = 0, n = 0;
  for (let k = 0; k < 300; k++) for (const b of E.makeBots(rand)) { n++; if (b.target < 2) lo++; }
  check('bots: roughly half bail under 2x', lo / n > 0.4 && lo / n < 0.6, (lo / n).toFixed(2));
}

// 7. the commitment scheme: sha256(seed) is what the page shows before a
// round, and the seed alone reproduces the bust point.
{
  const seed = randomBytes(32);
  const commit = createHash('sha256').update(seed).digest('hex');
  check('hex() matches node', E.hex(seed) === seed.toString('hex'));
  check('commitment is 64 hex chars', /^[0-9a-f]{64}$/.test(commit));
  check('seed reproduces the bust point', E.crashPointFromBytes(seed) === E.crashPointFromBytes(new Uint8Array(seed)));
}

console.log(fails ? `\n${fails} check(s) FAILED` : '\nall checks passed');
process.exit(fails ? 1 : 0);
