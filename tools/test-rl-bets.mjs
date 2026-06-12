#!/usr/bin/env node
// Verifies roulette betting math against the canonical European single-zero
// table: payout rates, zone geometry (every split/corner/street/six-line is a
// legal layout adjacency), settlement arithmetic, and the golden invariant
// that every bet returns exactly 36/coverage on a hit (house edge 1/37).
//
//   node tools/test-rl-bets.mjs

import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const RL = require('../roulette/rl-bets.js');

const { PAYOUTS, buildCells, buildInsideZones, settleBets, computeOutcomes } = RL;

let passed = 0, failed = 0;
function check(name, cond, detail = '') {
  if (cond) { passed++; }
  else { failed++; console.error(`✗ ${name}${detail ? ' — ' + detail : ''}`); }
}

// ── 1. Canonical payout table ──────────────────────────
const CANON = { straight: 35, split: 17, street: 11, corner: 8, sixline: 5,
  dozen: 2, column: 2, red: 1, black: 1, odd: 1, even: 1, low: 1, high: 1 };
for (const [type, pay] of Object.entries(CANON)) {
  check(`payout ${type} = ${pay}:1`, PAYOUTS[type] === pay, `got ${PAYOUTS[type]}`);
}

// ── 2. Cell definitions ────────────────────────────────
const cells = buildCells();
const RED = new Set([1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36]);

const byId = {};
cells.forEach(c => { check(`cell id unique: ${c.id}`, !byId[c.id]); byId[c.id] = c; });
check('37 straight cells', cells.filter(c => c.type === 'straight').length === 37);
for (let n = 0; n <= 36; n++) {
  const c = byId[n === 0 ? '0' : 'n' + n];
  check(`straight cell for ${n}`, !!c && c.numbers.length === 1 && c.numbers[0] === n);
  if (n > 0) check(`cell ${n} color`, c.isRed === RED.has(n));
}
check('red cell = canonical reds', byId.red.numbers.length === 18 && byId.red.numbers.every(n => RED.has(n)));
check('black cell = canonical blacks', byId.black.numbers.length === 18 && byId.black.numbers.every(n => !RED.has(n) && n >= 1));
check('low = 1..18', byId.low.numbers.join() === Array.from({length:18},(_,i)=>i+1).join());
check('high = 19..36', byId.high.numbers.join() === Array.from({length:18},(_,i)=>i+19).join());
check('even cell', byId.even.numbers.length === 18 && byId.even.numbers.every(n => n % 2 === 0 && n > 0));
check('odd cell', byId.odd.numbers.length === 18 && byId.odd.numbers.every(n => n % 2 === 1));
for (let d = 1; d <= 3; d++) {
  const c = byId['dz' + d];
  check(`dozen ${d}`, c.numbers.length === 12 && c.numbers[0] === (d-1)*12+1 && c.numbers[11] === d*12);
}
for (let col = 1; col <= 3; col++) {
  const c = byId['col' + col];
  check(`column ${col}`, c.numbers.length === 12 && c.numbers.every(n => n % 3 === col % 3));
}

// ── 3. Inside-zone geometry ────────────────────────────
const zones = buildInsideZones();
const zoneIds = new Set();
zones.forEach(z => { check(`zone id unique: ${z.id}`, !zoneIds.has(z.id)); zoneIds.add(z.id); });

const splits = zones.filter(z => z.type === 'split');
const corners = zones.filter(z => z.type === 'corner');
const streets = zones.filter(z => z.type === 'street');
const sixlines = zones.filter(z => z.type === 'sixline');

check('60 splits (24 in-street + 33 cross-street + 3 zero)', splits.length === 60, `got ${splits.length}`);
check('23 corners (22 + first-four)', corners.length === 23, `got ${corners.length}`);
check('12 streets', streets.length === 12, `got ${streets.length}`);
check('11 six lines', sixlines.length === 11, `got ${sixlines.length}`);

// every split is a legal adjacency on the layout
splits.forEach(z => {
  const [a, b] = [...z.numbers].sort((x, y) => x - y);
  const legal = (a === 0 && b >= 1 && b <= 3)            // zero splits
    || (b === a + 1 && a % 3 !== 0 && a >= 1)            // within a street
    || (b === a + 3 && a >= 1 && b <= 36);               // across streets
  check(`split ${z.id} legal adjacency`, legal, `${a},${b}`);
});
corners.forEach(z => {
  const s = [...z.numbers].sort((x, y) => x - y);
  const legal = (s.join() === '0,1,2,3')
    || (s[1] === s[0] + 1 && s[2] === s[0] + 3 && s[3] === s[0] + 4 && s[0] % 3 !== 0 && s[0] >= 1 && s[3] <= 36);
  check(`corner ${z.id} legal block`, legal, s.join());
});
streets.forEach(z => {
  const s = [...z.numbers].sort((x, y) => x - y);
  check(`street ${z.id} = full row`, s.length === 3 && s[0] % 3 === 1 && s[1] === s[0] + 1 && s[2] === s[0] + 2, s.join());
});
sixlines.forEach(z => {
  const s = [...z.numbers].sort((x, y) => x - y);
  const consec = s.every((n, i) => i === 0 || n === s[i-1] + 1);
  check(`six line ${z.id} = two adjacent streets`, s.length === 6 && s[0] % 3 === 1 && consec && s[5] <= 36, s.join());
});

// hosts must be real number cells, positions known
const POS = new Set(['top', 'left', 'tl', 'bottom', 'bl']);
zones.forEach(z => {
  ['land', 'port'].forEach(o => {
    check(`zone ${z.id} ${o} host valid`, z[o].host >= 1 && z[o].host <= 36 && POS.has(z[o].pos),
      `${z[o].host}/${z[o].pos}`);
  });
  // no two zones share an anchor spot in either orientation
});
['land', 'port'].forEach(o => {
  const seen = new Set();
  zones.forEach(z => {
    const key = `${z[o].host}:${z[o].pos}`;
    check(`${o} anchor ${key} not shared (${z.id})`, !seen.has(key));
    seen.add(key);
  });
});

// ── 4. Golden invariant: every bet returns 36/coverage on a hit ──
const allBets = [...cells.filter(c => c.kind !== 'zero' || true), ...zones];
allBets.forEach(b => {
  const ret = (PAYOUTS[b.type] + 1) * b.numbers.length;
  check(`36-return invariant: ${b.id}`, ret === 36, `(${PAYOUTS[b.type]}+1)×${b.numbers.length}=${ret}`);
});

// ── 5. Settlement arithmetic over all 37 outcomes ──────
allBets.forEach(b => {
  const bet = [{ id: b.id, type: b.type, numbers: b.numbers, amount: 10 }];
  let net = 0;
  for (let n = 0; n <= 36; n++) {
    const r = settleBets(bet, n);
    const hit = b.numbers.includes(n);
    check(`settle ${b.id} on ${n}`, r.winnings === (hit ? 10 * (PAYOUTS[b.type] + 1) : 0));
    net += r.profit;
  }
  // total over the full wheel: 36×stake returned minus 37×stake wagered
  check(`EV ${b.id} = -stake`, net === -10, `net ${net}`);
});

// multi-bet: $10 red + $10 black pushes on any non-zero, loses both on zero
{
  const red = byId.red, black = byId.black;
  const bets = [
    { id: 'red', type: 'red', numbers: red.numbers, amount: 10 },
    { id: 'black', type: 'black', numbers: black.numbers, amount: 10 }
  ];
  const r17 = settleBets(bets, 17);
  check('red+black on 17 pushes', r17.profit === 0 && r17.winnings === 20);
  const r0 = settleBets(bets, 0);
  check('red+black on 0 loses both', r0.profit === -20 && r0.winnings === 0);
  const out = computeOutcomes(bets);
  check('red+black outcomes', out.pushP === 36/37 && out.loseP === 1/37 && out.winP === 0);
}

// straight bet distribution
{
  const bets = [{ id: 'n17', type: 'straight', numbers: [17], amount: 10 }];
  const out = computeOutcomes(bets);
  check('straight win prob 1/37', out.winP === 1/37);
  check('straight EV = -10/37', Math.abs(out.ev - (-10/37)) < 1e-12, `ev ${out.ev}`);
  check('straight best profit 350', out.bestProfit === 350);
}

console.log(failed === 0
  ? `✓ all ${passed} checks passed (${allBets.length} bet definitions × 37 outcomes verified)`
  : `${failed} FAILED, ${passed} passed`);
process.exit(failed ? 1 : 0);
