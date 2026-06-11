// Verifies bj-strategy.js against the canonical 6-deck S17 DAS late-surrender
// basic strategy chart, cell by cell. Run: node tools/test-bj-strategy.mjs
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const S = require('../blackjack/bj-strategy.js');

const UP = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'A'];

// Canonical chart. H=hit S=stand D=double(else hit) Ds=double(else stand)
// P=split R=surrender(else hit). Source: standard 6-deck S17 DAS LS chart
// (Wizard of Odds). Keyed by dealer upcard.
const HARD = {
  5:  'H H H H H H H H H H', 6: 'H H H H H H H H H H', 7: 'H H H H H H H H H H',
  8:  'H H H H H H H H H H',
  9:  'H D D D D H H H H H',
  10: 'D D D D D D D D H H',
  11: 'D D D D D D D D D H',
  12: 'H H S S S H H H H H',
  13: 'S S S S S H H H H H',
  14: 'S S S S S H H H H H',
  15: 'S S S S S H H H R H',
  16: 'S S S S S H H R R R',
  17: 'S S S S S S S S S S',
  18: 'S S S S S S S S S S',
  19: 'S S S S S S S S S S',
  20: 'S S S S S S S S S S',
};
const SOFT = { // player A + x
  13: 'H H H D D H H H H H',
  14: 'H H H D D H H H H H',
  15: 'H H D D D H H H H H',
  16: 'H H D D D H H H H H',
  17: 'H D D D D H H H H H',
  18: 'S Ds Ds Ds Ds S S H H H', // S17: soft 18 vs 2 stands (Ds vs 2 is H17)
  19: 'S S S S S S S S S S',
  20: 'S S S S S S S S S S',
};
const PAIRS = { // by pair rank
  'A':  'P P P P P P P P P P',
  '10': 'S S S S S S S S S S',
  '9':  'P P P P P S P P S S',
  '8':  'P P P P P P P P P P',
  '7':  'P P P P P P H H H H',
  '6':  'P P P P P H H H H H',
  '5':  'D D D D D D D D H H',
  '4':  'H H H P P H H H H H',
  '3':  'P P P P P P H H H H',
  '2':  'P P P P P P H H H H',
};

function mk(rank) { return { rank }; }
// Build a 2-card non-pair hand for a hard total (no aces).
function hardHand(total) {
  for (let a = 2; a <= 10; a++) {
    const b = total - a;
    if (b >= 2 && b <= 10 && b !== a) return [mk(String(a)), mk(String(b))];
  }
  return null;
}

const FULL = { double: true, split: true, surrender: true };
let fails = 0, cells = 0;

function expectAction(code, ctx) {
  // Resolve chart code to expected action given full availability.
  switch (code) {
    case 'H': return 'Hit';
    case 'S': return 'Stand';
    case 'D': return 'Double';
    case 'Ds': return 'Double';
    case 'P': return 'Split';
    case 'R': return 'Surrender';
  }
}
function fallbackAction(code) { // expected when double/surrender unavailable
  switch (code) {
    case 'D': return 'Hit';
    case 'Ds': return 'Stand';
    case 'R': return 'Hit';
    default: return null;
  }
}

function check(cards, upRank, code, label) {
  cells++;
  const r = S.decide(cards, upRank, FULL);
  const want = expectAction(code);
  if (r.best.action !== want) {
    fails++;
    console.log(`MISMATCH ${label} vs ${upRank}: chart=${want}(${code}) engine=${r.best.action}  ` +
      r.candidates.map(c => `${c.action}:${c.ev.toFixed(4)}`).join(' '));
  }
  // Fallback check: same cell with double/split/surrender off (hit/stand only)
  const fb = fallbackAction(code);
  if (fb) {
    const r2 = S.decide(cards, upRank, { double: false, split: false, surrender: false });
    if (r2.best.action !== fb) {
      fails++;
      console.log(`FALLBACK MISMATCH ${label} vs ${upRank}: chart=${fb} engine=${r2.best.action}  ` +
        r2.candidates.map(c => `${c.action}:${c.ev.toFixed(4)}`).join(' '));
    }
  }
}

for (const [total, row] of Object.entries(HARD)) {
  const codes = row.split(/\s+/);
  const hand = hardHand(Number(total));
  if (!hand) continue; // 5..20 all representable except some; hardHand handles
  UP.forEach((up, i) => check(hand, up, codes[i], `hard ${total}`));
}
for (const [kicker, row] of Object.entries(SOFT)) {
  const codes = row.split(/\s+/);
  const x = String(Number(kicker) - 11); // A + x
  UP.forEach((up, i) => check([mk('A'), mk(x)], up, codes[i], `soft ${kicker} (A,${x})`));
}
for (const [rank, row] of Object.entries(PAIRS)) {
  const codes = row.split(/\s+/);
  UP.forEach((up, i) => check([mk(rank), mk(rank)], up, codes[i], `pair ${rank},${rank}`));
}

// Sanity: dealer bust % (no-BJ-conditioned) and known EVs
const bust = {};
for (const up of UP) {
  const d = S.dealerDist(S.cardVal(up));
  bust[up] = (d[5] * 100).toFixed(1);
}
console.log('dealer bust % (post-peek):', JSON.stringify(bust));
console.log('insurance EV per $1:', S.INSURANCE.evPer1.toFixed(4), 'pBJ:', S.INSURANCE.pDealerBJ.toFixed(4));

// 3-card 16 vs 10 must be Hit (surrender/double structurally gone)
const r3 = S.decide([mk('5'), mk('4'), mk('7')], '10', { double: false, split: false, surrender: false });
console.log('3-card 16 vs 10 →', r3.best.action, '(expect Hit)');
if (r3.best.action !== 'Hit') fails++;

// Post-split 8,8→(8,8) drew nothing: 2-card 16 pair vs 10, split rule-blocked at max hands:
const r4 = S.decide([mk('8'), mk('8')], '10', { double: true, split: false, surrender: false });
console.log('8,8 vs 10, split unavailable →', r4.best.action, '(expect Hit — 16 plays as hard 16)');

console.log(`\n${cells} cells checked, ${fails} mismatches`);
process.exit(fails ? 1 : 0);
