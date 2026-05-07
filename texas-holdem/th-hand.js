/* eslint-disable */
// Texas Hold'em hand evaluator — 5-card eval + best-of-7 enumeration + comparator
// + made-hand label. Exposed as window.TH_HAND.
(function () {
  const HAND_RANK = {
    HIGH: 0,
    PAIR: 1,
    TWO_PAIR: 2,
    TRIPS: 3,
    STRAIGHT: 4,
    FLUSH: 5,
    FULL: 6,
    QUADS: 7,
    STRAIGHT_FLUSH: 8,
    ROYAL: 9
  };

  const HAND_NAMES = {
    0: 'High Card', 1: 'Pair', 2: 'Two Pair', 3: 'Three of a Kind',
    4: 'Straight', 5: 'Flush', 6: 'Full House', 7: 'Four of a Kind',
    8: 'Straight Flush', 9: 'Royal Flush'
  };

  const RANK_NAMES = {
    2:'2',3:'3',4:'4',5:'5',6:'6',7:'7',8:'8',9:'9',10:'10',
    11:'J',12:'Q',13:'K',14:'A'
  };

  const RANK_NAMES_LONG = {
    2:'Twos',3:'Threes',4:'Fours',5:'Fives',6:'Sixes',7:'Sevens',8:'Eights',
    9:'Nines',10:'Tens',11:'Jacks',12:'Queens',13:'Kings',14:'Aces'
  };

  function rv(c) { return TH_DECK.rankValue(c); }

  // Evaluate a 5-card hand. Returns { rank, kickers: number[] }.
  // kickers ordered for tie-break: most significant first.
  function evaluate5(cards) {
    const vals = cards.map(rv).sort((a, b) => b - a);
    const counts = {};
    for (const v of vals) counts[v] = (counts[v] || 0) + 1;
    const groups = Object.entries(counts)
      .map(([v, n]) => ({ v: Number(v), n }))
      .sort((a, b) => b.n - a.n || b.v - a.v);

    const flush = cards.every(c => c.suit === cards[0].suit);

    // Detect straight, including A-2-3-4-5 wheel.
    let straight = false;
    let straightHigh = 0;
    const uniq = [...new Set(vals)].sort((a, b) => b - a);
    if (uniq.length === 5) {
      if (uniq[0] - uniq[4] === 4) {
        straight = true;
        straightHigh = uniq[0];
      } else if (uniq[0] === 14 && uniq[1] === 5 && uniq[2] === 4 && uniq[3] === 3 && uniq[4] === 2) {
        straight = true;
        straightHigh = 5;
      }
    }

    if (straight && flush) {
      if (straightHigh === 14) return { rank: HAND_RANK.ROYAL, kickers: [14] };
      return { rank: HAND_RANK.STRAIGHT_FLUSH, kickers: [straightHigh] };
    }
    if (groups[0].n === 4) {
      return { rank: HAND_RANK.QUADS, kickers: [groups[0].v, groups[1].v] };
    }
    if (groups[0].n === 3 && groups[1] && groups[1].n === 2) {
      return { rank: HAND_RANK.FULL, kickers: [groups[0].v, groups[1].v] };
    }
    if (flush) {
      return { rank: HAND_RANK.FLUSH, kickers: vals };
    }
    if (straight) {
      return { rank: HAND_RANK.STRAIGHT, kickers: [straightHigh] };
    }
    if (groups[0].n === 3) {
      const ks = vals.filter(v => v !== groups[0].v);
      return { rank: HAND_RANK.TRIPS, kickers: [groups[0].v, ks[0], ks[1]] };
    }
    if (groups[0].n === 2 && groups[1] && groups[1].n === 2) {
      const high = Math.max(groups[0].v, groups[1].v);
      const low = Math.min(groups[0].v, groups[1].v);
      const k = vals.find(v => v !== high && v !== low);
      return { rank: HAND_RANK.TWO_PAIR, kickers: [high, low, k] };
    }
    if (groups[0].n === 2) {
      const ks = vals.filter(v => v !== groups[0].v);
      return { rank: HAND_RANK.PAIR, kickers: [groups[0].v, ks[0], ks[1], ks[2]] };
    }
    return { rank: HAND_RANK.HIGH, kickers: vals };
  }

  // Generate all C(7,5) = 21 subsets.
  const COMBO_INDICES_7_5 = (() => {
    const out = [];
    for (let a = 0; a < 3; a++)
      for (let b = a + 1; b < 4; b++)
        for (let c = b + 1; c < 5; c++)
          for (let d = c + 1; d < 6; d++)
            for (let e = d + 1; e < 7; e++)
              out.push([a, b, c, d, e]);
    return out;
  })();

  // Find the best 5-card hand from 7 cards.
  function evalBest5From7(cards) {
    if (cards.length === 5) {
      const ev = evaluate5(cards);
      return { ...ev, best5: cards };
    }
    if (cards.length < 5) {
      // Partial — used preflop. Approximate strength by hole-card heuristic.
      return null;
    }
    let best = null;
    let bestCards = null;
    for (const idx of COMBO_INDICES_7_5) {
      const five = [cards[idx[0]], cards[idx[1]], cards[idx[2]], cards[idx[3]], cards[idx[4]]];
      const ev = evaluate5(five);
      if (!best || compareEval(ev, best) > 0) {
        best = ev;
        bestCards = five;
      }
    }
    return { ...best, best5: bestCards };
  }

  function compareEval(a, b) {
    if (a.rank !== b.rank) return a.rank - b.rank;
    const len = Math.max(a.kickers.length, b.kickers.length);
    for (let i = 0; i < len; i++) {
      const ka = a.kickers[i] ?? 0;
      const kb = b.kickers[i] ?? 0;
      if (ka !== kb) return ka - kb;
    }
    return 0;
  }

  // Compare two best-of-N hands (each evaluated with evalBest5From7 or evaluate5)
  function compare(a, b) {
    const c = compareEval(a, b);
    return c < 0 ? -1 : c > 0 ? 1 : 0;
  }

  // Short label like "Top pair, A-kicker", "Flush, ace-high".
  function labelOf(ev, hole, board) {
    if (!ev) return '—';
    const name = HAND_NAMES[ev.rank];
    const k = ev.kickers || [];
    switch (ev.rank) {
      case HAND_RANK.ROYAL:
        return 'Royal Flush';
      case HAND_RANK.STRAIGHT_FLUSH:
        return `Straight Flush, ${RANK_NAMES[k[0]]}-high`;
      case HAND_RANK.QUADS:
        return `Four ${RANK_NAMES_LONG[k[0]]}`;
      case HAND_RANK.FULL:
        return `${RANK_NAMES_LONG[k[0]]} full of ${RANK_NAMES_LONG[k[1]]}`;
      case HAND_RANK.FLUSH:
        return `Flush, ${RANK_NAMES[k[0]]}-high`;
      case HAND_RANK.STRAIGHT:
        return `Straight, ${RANK_NAMES[k[0]]}-high`;
      case HAND_RANK.TRIPS:
        return `Three ${RANK_NAMES_LONG[k[0]]}`;
      case HAND_RANK.TWO_PAIR:
        return `Two Pair, ${RANK_NAMES_LONG[k[0]]} & ${RANK_NAMES_LONG[k[1]]}`;
      case HAND_RANK.PAIR: {
        // Tag top/middle/under pair if board info available.
        if (board && board.length) {
          const boardVals = board.map(rv).sort((a, b) => b - a);
          const pairVal = k[0];
          if (boardVals.includes(pairVal)) {
            const topBoard = boardVals[0];
            if (pairVal === topBoard) return `Top pair (${RANK_NAMES_LONG[pairVal]})`;
            if (pairVal === boardVals[1]) return `Middle pair (${RANK_NAMES_LONG[pairVal]})`;
            return `Bottom pair (${RANK_NAMES_LONG[pairVal]})`;
          }
          // Pocket pair from hole cards
          return `Pocket ${RANK_NAMES_LONG[pairVal]}`;
        }
        return `Pair of ${RANK_NAMES_LONG[k[0]]}`;
      }
      default:
        return `${RANK_NAMES[k[0]]}-high`;
    }
  }

  // Preflop label for hole cards alone.
  function holeLabel(hole) {
    if (!hole || hole.length !== 2) return '—';
    const a = rv(hole[0]), b = rv(hole[1]);
    const hi = Math.max(a, b), lo = Math.min(a, b);
    const suited = hole[0].suit === hole[1].suit;
    if (a === b) return `Pocket ${RANK_NAMES_LONG[hi]}`;
    return `${RANK_NAMES[hi]}${RANK_NAMES[lo]}${suited ? ' suited' : ' offsuit'}`;
  }

  window.TH_HAND = {
    HAND_RANK, HAND_NAMES, RANK_NAMES, RANK_NAMES_LONG,
    evaluate5, evalBest5From7, compare, compareEval, labelOf, holeLabel
  };
})();
