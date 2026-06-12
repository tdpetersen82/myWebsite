/* eslint-disable */
// Pure betting logic for roulette — cell/zone definitions, settlement math,
// exact outcome odds. No DOM, no React: this file is loaded in the page AND
// imported by tools/test-rl-bets.mjs, so keep it plain JS.

(function () {
  const PAYOUTS = {
    straight: 35, split: 17, street: 11, corner: 8, sixline: 5,
    dozen: 2, column: 2, red: 1, black: 1, odd: 1, even: 1, low: 1, high: 1
  };

  const BET_INFO = {
    straight: { name: 'Straight Up', payout: '35:1' },
    split:    { name: 'Split',       payout: '17:1' },
    street:   { name: 'Street',      payout: '11:1' },
    corner:   { name: 'Corner',      payout: '8:1'  },
    sixline:  { name: 'Six Line',    payout: '5:1'  },
    dozen:    { name: 'Dozen',       payout: '2:1'  },
    column:   { name: 'Column',      payout: '2:1'  },
    red:      { name: 'Red',         payout: '1:1'  },
    black:    { name: 'Black',       payout: '1:1'  },
    odd:      { name: 'Odd',         payout: '1:1'  },
    even:     { name: 'Even',        payout: '1:1'  },
    low:      { name: 'Low (1-18)',  payout: '1:1'  },
    high:     { name: 'High (19-36)',payout: '1:1'  }
  };

  const RED_NUMBERS_SET = [1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36];
  const RED_LOOKUP = new Set(RED_NUMBERS_SET);

  function range(a, b) { const r = []; for (let i = a; i <= b; i++) r.push(i); return r; }
  function rangeFilter(a, b, fn) { return range(a, b).filter(fn); }

  // ── Board cells (clickable faces) ──────────────────────
  function buildCells() {
    const cells = [];
    cells.push({ id: '0', type: 'straight', numbers: [0], label: '0', kind: 'zero' });

    // Landscape: 12 cols × 3 rows; top row is 3,6,…,36.
    for (let col = 0; col < 12; col++) {
      for (let row = 0; row < 3; row++) {
        const n = col * 3 + (3 - row);
        cells.push({
          id: 'n' + n, type: 'straight', numbers: [n], label: String(n),
          kind: 'number', isRed: RED_LOOKUP.has(n), gridCol: col + 1, gridRow: row
        });
      }
    }

    for (let row = 0; row < 3; row++) {
      const colNumbers = [];
      for (let col = 0; col < 12; col++) colNumbers.push(col * 3 + (3 - row));
      cells.push({ id: 'col' + (3 - row), type: 'column', numbers: colNumbers, label: '2:1', kind: 'col' });
    }

    cells.push({ id: 'dz1', type: 'dozen', numbers: range(1, 12),  label: '1st 12', kind: 'dozen' });
    cells.push({ id: 'dz2', type: 'dozen', numbers: range(13, 24), label: '2nd 12', kind: 'dozen' });
    cells.push({ id: 'dz3', type: 'dozen', numbers: range(25, 36), label: '3rd 12', kind: 'dozen' });

    cells.push({ id: 'low',   type: 'low',   numbers: range(1, 18), label: '1-18', kind: 'even' });
    cells.push({ id: 'even',  type: 'even',  numbers: rangeFilter(2, 36, n => n % 2 === 0), label: 'EVEN', kind: 'even' });
    cells.push({ id: 'red',   type: 'red',   numbers: RED_NUMBERS_SET.slice(), label: '◆ RED', kind: 'even', forceColor: 'red' });
    cells.push({ id: 'black', type: 'black', numbers: rangeFilter(1, 36, n => !RED_LOOKUP.has(n)), label: '◆ BLK', kind: 'even', forceColor: 'black' });
    cells.push({ id: 'odd',   type: 'odd',   numbers: rangeFilter(1, 36, n => n % 2 === 1), label: 'ODD', kind: 'even' });
    cells.push({ id: 'high',  type: 'high',  numbers: range(19, 36), label: '19-36', kind: 'even' });

    return cells;
  }

  // ── Inside-bet zones (splits, streets, corners, six lines) ──
  //
  // Each zone carries an anchor for both board orientations:
  //   land: landscape board (zero left, streets run left→right, top row 3,6,…)
  //   port: portrait board (zero top, streets run top→bottom, left col 1,4,…)
  // host = the number cell the hit-spot is positioned inside;
  // pos  = which edge/vertex of that cell ('top'|'left'|'tl'|'bottom'|'bl').
  function buildInsideZones() {
    const zones = [];
    const add = (id, type, numbers, land, port) => zones.push({ id, type, numbers, land, port });

    // Vertical splits (within a street): n & n+1. Landscape: n+1 sits above n.
    // Portrait: n+1 sits to the right of n.
    for (let n = 1; n <= 35; n++) {
      if (n % 3 === 0) continue;
      add(`sp${n}-${n + 1}`, 'split', [n, n + 1],
        { host: n, pos: 'top' },
        { host: n + 1, pos: 'left' });
    }
    // Horizontal splits (across streets): n & n+3. Landscape: n+3 to the right.
    // Portrait: n+3 below.
    for (let n = 1; n <= 33; n++) {
      add(`sp${n}-${n + 3}`, 'split', [n, n + 3],
        { host: n + 3, pos: 'left' },
        { host: n + 3, pos: 'top' });
    }
    // Zero splits: 0 borders 1, 2, 3.
    for (let k = 1; k <= 3; k++) {
      add(`sp0-${k}`, 'split', [0, k],
        { host: k, pos: 'left' },
        { host: k, pos: 'top' });
    }
    // Corners: vertex of n, n+1, n+3, n+4.
    for (let n = 1; n <= 32; n++) {
      if (n % 3 === 0) continue;
      add(`co${n}`, 'corner', [n, n + 1, n + 3, n + 4],
        { host: n + 3, pos: 'tl' },
        { host: n + 4, pos: 'tl' });
    }
    // First four: 0-1-2-3 basket at the zero boundary. Pays as a corner.
    add('first4', 'corner', [0, 1, 2, 3],
      { host: 1, pos: 'bl' },
      { host: 1, pos: 'tl' });
    // Streets: each column of three, zone on the outer edge of the 1-row.
    for (let c = 0; c < 12; c++) {
      const f = c * 3 + 1;
      add(`st${f}`, 'street', [f, f + 1, f + 2],
        { host: f, pos: 'bottom' },
        { host: f, pos: 'left' });
    }
    // Six lines: two adjacent streets.
    for (let c = 0; c < 11; c++) {
      const f = c * 3 + 1;
      add(`sl${f}`, 'sixline', [f, f + 1, f + 2, f + 3, f + 4, f + 5],
        { host: f + 3, pos: 'bl' },
        { host: f + 3, pos: 'tl' });
    }
    return zones;
  }

  function zoneTitle(zone) {
    const info = BET_INFO[zone.type];
    const nums = zone.numbers.join('·');
    return `${info.name} ${nums} — pays ${info.payout}`;
  }

  // ── Settlement ─────────────────────────────────────────
  // Returns gross winnings (stake + profit) for the winning bets.
  function settleBets(bets, num) {
    let winnings = 0;
    let bestPayout = 0;
    let hadStraight = false;
    const winners = [];
    bets.forEach(b => {
      if (b.numbers.indexOf(num) >= 0) {
        const payout = PAYOUTS[b.type];
        winnings += b.amount * payout + b.amount;
        bestPayout = Math.max(bestPayout, payout);
        if (b.type === 'straight') hadStraight = true;
        winners.push(b.id);
      }
    });
    const totalBet = bets.reduce((s, b) => s + b.amount, 0);
    return { winnings, totalBet, profit: winnings - totalBet, bestPayout, hadStraight, winners };
  }

  // ── Exact outcome distribution over the 37 pockets ─────
  function computeOutcomes(bets) {
    const totalBet = bets.reduce((s, b) => s + b.amount, 0);
    if (!totalBet) return null;
    let win = 0, push = 0, lose = 0, evSum = 0, best = 0;
    const covered = new Set();
    bets.forEach(b => b.numbers.forEach(n => covered.add(n)));
    for (let n = 0; n <= 36; n++) {
      const r = settleBets(bets, n);
      evSum += r.profit;
      best = Math.max(best, r.profit);
      if (r.profit > 0) win++;
      else if (r.profit === 0 && r.winnings > 0) push++;
      else lose++;
    }
    return {
      totalBet,
      winP: win / 37, pushP: push / 37, loseP: lose / 37,
      ev: evSum / 37,                 // expected net per spin (always ≈ -2.70% of stake)
      bestProfit: best,
      covered: covered.size,
      hasZero: covered.has(0)
    };
  }

  const api = { PAYOUTS, BET_INFO, RED_NUMBERS_SET, buildCells, buildInsideZones, zoneTitle, settleBets, computeOutcomes };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') Object.assign(window, {
    PAYOUTS, BET_INFO, buildCells, buildInsideZones, zoneTitle, settleBets, computeOutcomes
  });
})();
