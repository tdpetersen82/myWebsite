/* eslint-disable */
// Hand evaluator — exposed as window.VP_HAND
(function () {
  const HIGH_CARDS = ['J', 'Q', 'K', 'A'];

  // 9/6 Jacks-or-Better paytable, indexed by coin count (1..5).
  const PAYTABLE = {
    'royal-flush':      { name: 'Royal Flush',      pay: [250, 500, 750, 1000, 4000] },
    'straight-flush':   { name: 'Straight Flush',   pay: [50, 100, 150, 200, 250] },
    'four-of-a-kind':   { name: 'Four of a Kind',   pay: [25, 50, 75, 100, 125] },
    'full-house':       { name: 'Full House',       pay: [9, 18, 27, 36, 45] },
    'flush':            { name: 'Flush',            pay: [6, 12, 18, 24, 30] },
    'straight':         { name: 'Straight',         pay: [4, 8, 12, 16, 20] },
    'three-of-a-kind':  { name: 'Three of a Kind',  pay: [3, 6, 9, 12, 15] },
    'two-pair':         { name: 'Two Pair',         pay: [2, 4, 6, 8, 10] },
    'jacks-or-better':  { name: 'Jacks or Better',  pay: [1, 2, 3, 4, 5] }
  };

  function getRankCounts(cards) {
    const counts = {};
    for (const c of cards) counts[c.rank] = (counts[c.rank] || 0) + 1;
    return counts;
  }

  function getSortedValues(cards) {
    return cards.map(c => VP_DECK.rankValue(c)).sort((a, b) => a - b);
  }

  function isFlush(cards) {
    return cards.every(c => c.suit === cards[0].suit);
  }

  function isStraight(cards) {
    const vals = getSortedValues(cards);
    let straight = true;
    for (let i = 1; i < vals.length; i++) {
      if (vals[i] !== vals[i - 1] + 1) { straight = false; break; }
    }
    if (straight) return true;
    // Ace-low (A,2,3,4,5)
    if (vals[0] === 2 && vals[1] === 3 && vals[2] === 4 && vals[3] === 5 && vals[4] === 14) return true;
    return false;
  }

  function isRoyal(cards) {
    const vals = getSortedValues(cards);
    return vals[0] === 10 && vals[1] === 11 && vals[2] === 12 && vals[3] === 13 && vals[4] === 14;
  }

  function evaluate(cards) {
    if (!cards || cards.length !== 5) return { key: null, name: 'Incomplete' };
    const flush = isFlush(cards);
    const straight = isStraight(cards);
    const royal = isRoyal(cards);
    const counts = getRankCounts(cards);
    const countValues = Object.values(counts).sort((a, b) => b - a);

    if (flush && royal)        return { key: 'royal-flush',     name: 'Royal Flush' };
    if (flush && straight)     return { key: 'straight-flush',  name: 'Straight Flush' };
    if (countValues[0] === 4)  return { key: 'four-of-a-kind',  name: 'Four of a Kind' };
    if (countValues[0] === 3 && countValues[1] === 2) return { key: 'full-house', name: 'Full House' };
    if (flush)                 return { key: 'flush',           name: 'Flush' };
    if (straight)              return { key: 'straight',        name: 'Straight' };
    if (countValues[0] === 3)  return { key: 'three-of-a-kind', name: 'Three of a Kind' };
    if (countValues[0] === 2 && countValues[1] === 2) return { key: 'two-pair', name: 'Two Pair' };
    if (countValues[0] === 2) {
      for (const rank in counts) {
        if (counts[rank] === 2 && HIGH_CARDS.includes(rank)) {
          return { key: 'jacks-or-better', name: 'Jacks or Better' };
        }
      }
    }
    return { key: null, name: 'No Win' };
  }

  function getPayout(handKey, coinsBet) {
    if (!handKey || !PAYTABLE[handKey]) return 0;
    const idx = Math.min(Math.max(coinsBet, 1), 5) - 1;
    return PAYTABLE[handKey].pay[idx];
  }

  function isHighCard(rank) { return HIGH_CARDS.includes(rank); }

  window.VP_HAND = { evaluate, getPayout, isFlush, isStraight, isRoyal, getRankCounts, getSortedValues, isHighCard, HIGH_CARDS, PAYTABLE };
})();
