/* eslint-disable */
// Craps rules — pure constants and lookup tables. No state, no DOM.
// All callers read via window.CR_RULES.

(function () {
  const STARTING_BANKROLL = 1000;
  const MIN_BET = 5;

  const POINT_NUMBERS = [4, 5, 6, 8, 9, 10];
  const FIELD_NUMBERS = [2, 3, 4, 9, 10, 11, 12];

  // Field bet payout multiplier (winnings per unit staked, paid IN ADDITION to the stake).
  // 2 pays 2:1, 12 pays 3:1, the rest pay 1:1; non-field totals lose the stake.
  const FIELD_PAYOUTS = { 2: 2, 3: 1, 4: 1, 9: 1, 10: 1, 11: 1, 12: 3 };

  // Pass-line / come true odds (winnings:stake).
  const ODDS_PAYOUTS = {
    4:  { num: 2, den: 1 },
    5:  { num: 3, den: 2 },
    6:  { num: 6, den: 5 },
    8:  { num: 6, den: 5 },
    9:  { num: 3, den: 2 },
    10: { num: 2, den: 1 }
  };

  // Don't-pass / don't-come lay odds (winnings:stake).
  const DONT_ODDS_PAYOUTS = {
    4:  { num: 1, den: 2 },
    5:  { num: 2, den: 3 },
    6:  { num: 5, den: 6 },
    8:  { num: 5, den: 6 },
    9:  { num: 2, den: 3 },
    10: { num: 1, den: 2 }
  };

  // Place-bet payouts (winnings:stake). 4 and 10 pay 9:5, 5 and 9 pay 7:5, 6 and 8 pay 7:6.
  const PLACE_PAYOUTS = {
    4:  { num: 9, den: 5 },
    5:  { num: 7, den: 5 },
    6:  { num: 7, den: 6 },
    8:  { num: 7, den: 6 },
    9:  { num: 7, den: 5 },
    10: { num: 9, den: 5 }
  };

  // Bet metadata used by hover tooltips and the hint panel.
  const BET_INFO = {
    pass:         { name: 'Pass Line',        payout: '1:1',                                edge: 1.41 },
    dontPass:     { name: "Don't Pass",       payout: '1:1 (Bar 12)',                       edge: 1.36 },
    passOdds:     { name: 'Pass Odds',        payout: 'true odds (2:1, 3:2, 6:5)',          edge: 0.00 },
    dontPassOdds: { name: "Don't Pass Odds",  payout: 'lay odds (1:2, 2:3, 5:6)',           edge: 0.00 },
    field:        { name: 'Field',            payout: '1:1 · 2 pays 2:1 · 12 pays 3:1',     edge: 5.56 },
    come:         { name: 'Come',             payout: '1:1',                                edge: 1.41 },
    dontCome:     { name: "Don't Come",       payout: '1:1 (Bar 12)',                       edge: 1.36 },
    comeOdds:     { name: 'Come Odds',        payout: 'true odds',                          edge: 0.00 },
    dontComeOdds: { name: "Don't Come Odds",  payout: 'lay odds',                           edge: 0.00 },
    place4:       { name: 'Place 4',          payout: '9:5',                                edge: 6.67 },
    place5:       { name: 'Place 5',          payout: '7:5',                                edge: 4.00 },
    place6:       { name: 'Place 6',          payout: '7:6',                                edge: 1.52 },
    place8:       { name: 'Place 8',          payout: '7:6',                                edge: 1.52 },
    place9:       { name: 'Place 9',          payout: '7:5',                                edge: 4.00 },
    place10:      { name: 'Place 10',         payout: '9:5',                                edge: 6.67 }
  };

  // Chip denominations used by ChipRack and ChipBadge. Matches the JSX casino
  // family ($5 red, $25 green, $100 blue, $500 purple, $1000 black).
  const CHIP_DEFS = [
    { value: 5,    color: '#c0392b', edge: '#7a1f15', label: '$5'   },
    { value: 25,   color: '#2e7d4f', edge: '#194530', label: '$25'  },
    { value: 100,  color: '#1f3a6a', edge: '#0e1f3d', label: '$100' },
    { value: 500,  color: '#5b2a7a', edge: '#321444', label: '$500' },
    { value: 1000, color: '#1a1410', edge: '#000',    label: '$1K'  }
  ];

  // Helper used in many places — returns winnings (NOT including stake) for a
  // payout descriptor and stake. Always rounds DOWN so the house keeps the
  // fractional cent (real-table convention).
  function payout(stake, ratio) {
    return Math.floor(stake * ratio.num / ratio.den);
  }

  function dieRoll() {
    return 1 + Math.floor(Math.random() * 6);
  }

  function isPointNumber(n) { return n === 4 || n === 5 || n === 6 || n === 8 || n === 9 || n === 10; }

  function emptyBets() {
    return {
      pass: 0, passOdds: 0,
      dontPass: 0, dontPassOdds: 0,
      field: 0,
      come: 0, dontCome: 0,
      comePoints:     { 4:0, 5:0, 6:0, 8:0, 9:0, 10:0 },
      comeOdds:       { 4:0, 5:0, 6:0, 8:0, 9:0, 10:0 },
      dontComePoints: { 4:0, 5:0, 6:0, 8:0, 9:0, 10:0 },
      dontComeOdds:   { 4:0, 5:0, 6:0, 8:0, 9:0, 10:0 },
      place:          { 4:0, 5:0, 6:0, 8:0, 9:0, 10:0 }
    };
  }

  function cloneBets(b) {
    return {
      pass: b.pass, passOdds: b.passOdds,
      dontPass: b.dontPass, dontPassOdds: b.dontPassOdds,
      field: b.field,
      come: b.come, dontCome: b.dontCome,
      comePoints:     Object.assign({}, b.comePoints),
      comeOdds:       Object.assign({}, b.comeOdds),
      dontComePoints: Object.assign({}, b.dontComePoints),
      dontComeOdds:   Object.assign({}, b.dontComeOdds),
      place:          Object.assign({}, b.place)
    };
  }

  function totalAtRisk(b) {
    let t = b.pass + b.passOdds + b.dontPass + b.dontPassOdds + b.field + b.come + b.dontCome;
    for (const n of POINT_NUMBERS) {
      t += b.comePoints[n] + b.comeOdds[n] + b.dontComePoints[n] + b.dontComeOdds[n] + b.place[n];
    }
    return t;
  }

  // Aggregates the chips visible inside a single PlaceNumberCell so that cell
  // renders correctly with all overlapping bets at once.
  function cellTotals(b, n) {
    return {
      place:        b.place[n],
      comePoint:    b.comePoints[n],
      comeOdds:     b.comeOdds[n],
      dontPoint:    b.dontComePoints[n],
      dontOdds:     b.dontComeOdds[n]
    };
  }

  // Resolution: takes (a, b, bets, phase, point) → returns
  //   { winnings, newBets, newPhase, newPoint, bannerKind, sfxKey, messages }
  // where:
  //   - winnings is the gross amount returned to bankroll (stakes + profits for
  //     wins, stake-only for pushes; losses are NOT subtracted because the stake
  //     was already deducted at placement time)
  //   - bannerKind is one of: 'natural','craps','point_set','point_made',
  //     'seven_out','win','lose','push',null
  //   - messages is an array of short strings to display per-bet (e.g.
  //     'Pass +$50', 'Place 6 +$35', 'Field loses')
  function resolveRoll(a, b, bets, phase, point) {
    const total = a + b;
    const next = cloneBets(bets);
    const messages = [];
    let winnings = 0;
    let bannerKind = null;
    let sfxKey = null;
    let newPhase = phase;
    let newPoint = point;

    // ── 1) Field bet (one-roll) ──
    if (next.field > 0) {
      const mult = FIELD_PAYOUTS[total];
      if (mult != null) {
        const win = next.field * mult;
        winnings += next.field + win;
        messages.push('Field +$' + win);
      } else {
        messages.push('Field -$' + next.field);
      }
      next.field = 0;
    }

    if (phase === 'comeOut') {
      // ── 2) Come-out phase ──
      if (total === 7 || total === 11) {
        if (next.pass > 0)     { winnings += next.pass * 2;    messages.push('Pass +$' + next.pass);   next.pass = 0; }
        if (next.dontPass > 0) {                                messages.push("Don't Pass -$" + next.dontPass); next.dontPass = 0; }
        bannerKind = 'natural';
        sfxKey = 'natural';
      } else if (total === 2 || total === 3) {
        if (next.pass > 0)     {                                messages.push('Pass -$' + next.pass);   next.pass = 0; }
        if (next.dontPass > 0) { winnings += next.dontPass * 2; messages.push("Don't Pass +$" + next.dontPass); next.dontPass = 0; }
        bannerKind = 'craps';
        sfxKey = 'craps';
      } else if (total === 12) {
        if (next.pass > 0)     {                                messages.push('Pass -$' + next.pass);   next.pass = 0; }
        if (next.dontPass > 0) { winnings += next.dontPass;     messages.push("Don't Pass push"); next.dontPass = 0; }
        bannerKind = 'craps';
        sfxKey = 'craps';
      } else {
        // Point established
        newPoint = total;
        newPhase = 'point';
        bannerKind = 'point_set';
        sfxKey = 'pointSet';
        messages.push('Point is ' + total);
      }
      return { winnings, newBets: next, newPhase, newPoint, bannerKind, sfxKey, messages };
    }

    // ── 3) Point phase ──

    // 3a) Place bets resolve first (so a 7 sweeps them). Place bet STAYS up
    // after a win — only the winnings are paid, stake remains on the table.
    if (total === 7) {
      for (const n of POINT_NUMBERS) {
        if (next.place[n] > 0) {
          messages.push('Place ' + n + ' -$' + next.place[n]);
          next.place[n] = 0;
        }
      }
    } else if (isPointNumber(total) && next.place[total] > 0) {
      const win = payout(next.place[total], PLACE_PAYOUTS[total]);
      winnings += win;
      messages.push('Place ' + total + ' +$' + win);
    }

    // 3c) Established come-points and don't-come-points — read from `bets`
    // (the PRE-roll snapshot) so transient come/dontCome bets that move into
    // the same number on this roll don't get paid out immediately.
    if (total === 7) {
      for (const n of POINT_NUMBERS) {
        if (bets.comePoints[n] > 0) {
          messages.push('Come ' + n + ' -$' + bets.comePoints[n]);
          next.comePoints[n] = 0;
        }
        if (bets.comeOdds[n] > 0) {
          messages.push('Come ' + n + ' Odds -$' + bets.comeOdds[n]);
          next.comeOdds[n] = 0;
        }
        if (bets.dontComePoints[n] > 0) {
          winnings += bets.dontComePoints[n] * 2;
          messages.push("Don't Come " + n + ' +$' + bets.dontComePoints[n]);
          next.dontComePoints[n] = 0;
        }
        if (bets.dontComeOdds[n] > 0) {
          const win = payout(bets.dontComeOdds[n], DONT_ODDS_PAYOUTS[n]);
          winnings += bets.dontComeOdds[n] + win;
          messages.push("Don't Come " + n + ' Odds +$' + win);
          next.dontComeOdds[n] = 0;
        }
      }
    } else if (isPointNumber(total)) {
      if (bets.comePoints[total] > 0) {
        winnings += bets.comePoints[total] * 2;
        messages.push('Come ' + total + ' +$' + bets.comePoints[total]);
        next.comePoints[total] = 0;
      }
      if (bets.comeOdds[total] > 0) {
        const win = payout(bets.comeOdds[total], ODDS_PAYOUTS[total]);
        winnings += bets.comeOdds[total] + win;
        messages.push('Come ' + total + ' Odds +$' + win);
        next.comeOdds[total] = 0;
      }
      if (bets.dontComePoints[total] > 0) {
        messages.push("Don't Come " + total + ' -$' + bets.dontComePoints[total]);
        next.dontComePoints[total] = 0;
      }
      if (bets.dontComeOdds[total] > 0) {
        messages.push("Don't Come " + total + ' Odds -$' + bets.dontComeOdds[total]);
        next.dontComeOdds[total] = 0;
      }
    }

    // 3b) Transient come / don't-come (in the come box) — runs AFTER 3c so
    // a come bet placed this roll doesn't collide with the established check.
    if (next.come > 0 || next.dontCome > 0) {
      if (total === 7 || total === 11) {
        if (next.come > 0)     { winnings += next.come * 2;     messages.push('Come +$' + next.come);     next.come = 0; }
        if (next.dontCome > 0) {                                 messages.push("Don't Come -$" + next.dontCome); next.dontCome = 0; }
      } else if (total === 2 || total === 3) {
        if (next.come > 0)     {                                 messages.push('Come -$' + next.come);     next.come = 0; }
        if (next.dontCome > 0) { winnings += next.dontCome * 2;  messages.push("Don't Come +$" + next.dontCome); next.dontCome = 0; }
      } else if (total === 12) {
        if (next.come > 0)     {                                 messages.push('Come -$' + next.come);     next.come = 0; }
        if (next.dontCome > 0) { winnings += next.dontCome;      messages.push("Don't Come push"); next.dontCome = 0; }
      } else if (isPointNumber(total)) {
        if (next.come > 0)     { next.comePoints[total]     += next.come;     next.come = 0;     messages.push('Come moves to ' + total); }
        if (next.dontCome > 0) { next.dontComePoints[total] += next.dontCome; next.dontCome = 0; messages.push("Don't Come moves to " + total); }
      }
    }

    // 3d) Pass / dontPass + their odds
    if (total === point) {
      if (next.pass > 0) {
        winnings += next.pass * 2;
        messages.push('Pass +$' + next.pass);
        next.pass = 0;
      }
      if (next.passOdds > 0) {
        const win = payout(next.passOdds, ODDS_PAYOUTS[point]);
        winnings += next.passOdds + win;
        messages.push('Pass Odds +$' + win);
        next.passOdds = 0;
      }
      if (next.dontPass > 0) {
        messages.push("Don't Pass -$" + next.dontPass);
        next.dontPass = 0;
      }
      if (next.dontPassOdds > 0) {
        messages.push("Don't Pass Odds -$" + next.dontPassOdds);
        next.dontPassOdds = 0;
      }
      newPoint = 0;
      newPhase = 'comeOut';
      bannerKind = 'point_made';
      sfxKey = 'pointMade';
    } else if (total === 7) {
      if (next.pass > 0) {
        messages.push('Pass -$' + next.pass);
        next.pass = 0;
      }
      if (next.passOdds > 0) {
        messages.push('Pass Odds -$' + next.passOdds);
        next.passOdds = 0;
      }
      if (next.dontPass > 0) {
        winnings += next.dontPass * 2;
        messages.push("Don't Pass +$" + next.dontPass);
        next.dontPass = 0;
      }
      if (next.dontPassOdds > 0) {
        const win = payout(next.dontPassOdds, DONT_ODDS_PAYOUTS[point]);
        winnings += next.dontPassOdds + win;
        messages.push("Don't Pass Odds +$" + win);
        next.dontPassOdds = 0;
      }
      newPoint = 0;
      newPhase = 'comeOut';
      bannerKind = 'seven_out';
      sfxKey = 'sevenOut';
    } else {
      // Neutral point-phase roll — keep the same banner kind for whichever
      // intermediate event happened (place hit, come moved, etc.).
      if (bannerKind == null) {
        if (messages.some(m => m.startsWith('+') || m.includes(' +$'))) { bannerKind = 'win'; sfxKey = 'win'; }
        else if (messages.length) { bannerKind = null; sfxKey = null; }
      }
    }

    return { winnings, newBets: next, newPhase, newPoint, bannerKind, sfxKey, messages };
  }

  window.CR_RULES = {
    STARTING_BANKROLL, MIN_BET,
    POINT_NUMBERS, FIELD_NUMBERS,
    FIELD_PAYOUTS, ODDS_PAYOUTS, DONT_ODDS_PAYOUTS, PLACE_PAYOUTS,
    BET_INFO, CHIP_DEFS,
    payout, dieRoll, isPointNumber,
    emptyBets, cloneBets, totalAtRisk, cellTotals,
    resolveRoll
  };
})();
