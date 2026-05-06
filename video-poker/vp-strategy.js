/* eslint-disable */
// Optimal Jacks-or-Better hold strategy — exposed as window.VP_STRATEGY.
// Returns { holdIndices, action, explanation, riskLabel, riskClass, detailedExplanation }.
(function () {
  function getRecommendation(cards) {
    if (!cards || cards.length !== 5) {
      return { holdIndices: [], action: 'DEAL', explanation: '', riskLabel: '', riskClass: 'risk-ok', detailedExplanation: '' };
    }
    return findBestHold(cards);
  }

  function findBestHold(cards) {
    function indicesOf(predicate) {
      const idx = [];
      for (let i = 0; i < 5; i++) if (predicate(cards[i], i)) idx.push(i);
      return idx;
    }

    const handResult = VP_HAND.evaluate(cards);

    if (handResult.key === 'royal-flush') {
      return makeResult([0,1,2,3,4], 'Royal Flush! Hold all cards.', 'Best hand', 'risk-good',
        'You have the best possible hand in video poker. A Royal Flush pays the maximum jackpot. Always hold all five cards.');
    }
    if (handResult.key === 'straight-flush') {
      return makeResult([0,1,2,3,4], 'Straight Flush! Hold all cards.', 'Guaranteed', 'risk-good',
        'Five sequential cards of the same suit. Hold them all for the guaranteed payout.');
    }
    if (handResult.key === 'four-of-a-kind') {
      const counts = VP_HAND.getRankCounts(cards);
      const quadRank = Object.keys(counts).find(r => counts[r] === 4);
      const hold = indicesOf(c => c.rank === quadRank);
      return makeResult(hold, 'Four of a Kind! Hold the four matching cards.', 'Guaranteed', 'risk-good',
        'Four of a Kind is a guaranteed big payout. Hold all four matching cards. The fifth card cannot improve your hand.');
    }
    if (handResult.key === 'full-house') {
      return makeResult([0,1,2,3,4], 'Full House! Hold all cards.', 'Guaranteed', 'risk-good',
        'A Full House pays 9x your bet. Never break it up.');
    }
    if (handResult.key === 'flush') {
      return makeResult([0,1,2,3,4], 'Flush! Hold all cards.', 'Guaranteed', 'risk-good',
        'A Flush (all five cards same suit) pays 6x. Hold them all.');
    }
    if (handResult.key === 'straight') {
      return makeResult([0,1,2,3,4], 'Straight! Hold all cards.', 'Guaranteed', 'risk-good',
        'A Straight pays 4x. Hold them all.');
    }
    if (handResult.key === 'three-of-a-kind') {
      const counts = VP_HAND.getRankCounts(cards);
      const tripRank = Object.keys(counts).find(r => counts[r] === 3);
      const hold = indicesOf(c => c.rank === tripRank);
      return makeResult(hold, 'Three of a Kind. Hold the three matching cards.', '~98% return', 'risk-good',
        'Three of a Kind pays 3x and has good chances to improve to a Full House or Four of a Kind on the draw. Hold the three matching cards and draw two new ones.');
    }
    if (handResult.key === 'two-pair') {
      const counts = VP_HAND.getRankCounts(cards);
      const pairRanks = Object.keys(counts).filter(r => counts[r] === 2);
      const hold = indicesOf(c => pairRanks.includes(c.rank));
      return makeResult(hold, 'Two Pair. Hold both pairs.', '~87% return', 'risk-good',
        'Two Pair pays 2x. Hold all four paired cards and draw one — about 8.5% chance of improving to a Full House.');
    }
    if (handResult.key === 'jacks-or-better') {
      const counts = VP_HAND.getRankCounts(cards);
      const pairRank = Object.keys(counts).find(r => counts[r] === 2 && VP_HAND.isHighCard(r));
      const hold = indicesOf(c => c.rank === pairRank);
      return makeResult(hold, 'High Pair. Hold the pair of ' + pairRank + 's.', '~75% return', 'risk-ok',
        'A pair of Jacks or higher guarantees your bet back. Hold the pair and draw three new cards.');
    }

    const fourToRoyal = find4ToRoyal(cards);
    if (fourToRoyal) {
      return makeResult(fourToRoyal, 'Hold 4 to a Royal Flush!', '~95% return', 'risk-good',
        'Four of the five cards needed for a Royal Flush. Roughly 1-in-47 chance of completing it, but the massive payout makes this the correct play.');
    }
    const fourToSF = find4ToStraightFlush(cards);
    if (fourToSF) {
      return makeResult(fourToSF, 'Hold 4 to a Straight Flush.', '~82% return', 'risk-ok',
        'Four cards toward a Straight Flush is a strong draw. Multiple ways to make a paying hand.');
    }
    const threeToRoyal = find3ToRoyal(cards);
    if (threeToRoyal) {
      return makeResult(threeToRoyal, 'Hold 3 to a Royal Flush.', '~68% return', 'risk-ok',
        'Three cards toward a Royal Flush is worth pursuing. Reasonable chances at Flush, Straight, or high pair.');
    }
    const fourToFlush = find4ToFlush(cards);
    if (fourToFlush) {
      return makeResult(fourToFlush, 'Hold 4 to a Flush.', '~63% return', 'risk-ok',
        'About 19% chance (9/47) of completing the Flush. The 6x payout makes this profitable in the long run.');
    }
    const lowPair = findLowPair(cards);
    if (lowPair) {
      const pairRank = cards[lowPair[0]].rank;
      return makeResult(lowPair, 'Hold the low pair of ' + pairRank + 's.', '~60% return', 'risk-ok',
        'A low pair does not pay on its own, but improves to Two Pair (~16%), Three of a Kind (~11%), Full House (~1%), or Four of a Kind (~0.1%).');
    }
    const fourToStraight = find4ToOutsideStraight(cards);
    if (fourToStraight) {
      return makeResult(fourToStraight, 'Hold 4 to an open-ended Straight.', '~51% return', 'risk-ok',
        'Open-ended (outside) Straight draw — completes on either end (~17% chance).');
    }
    const twoHigh = findTwoHighCards(cards);
    if (twoHigh) {
      const names = twoHigh.map(i => cards[i].rank).join(' and ');
      return makeResult(twoHigh, 'Hold high cards: ' + names + '.', '~49% return', 'risk-ok',
        'Two or more high cards (J–A) gives a reasonable chance of pairing one for a Jacks or Better payout.');
    }
    const threeToSF = find3ToStraightFlush(cards);
    if (threeToSF) {
      return makeResult(threeToSF, 'Hold 3 to a Straight Flush.', '~47% return', 'risk-bad',
        'Long-shot draw. Combined probability of Straight Flush, Flush, or Straight makes this marginally better than discarding.');
    }
    const oneHigh = findOneHighCard(cards);
    if (oneHigh) {
      return makeResult(oneHigh, 'Hold high card: ' + cards[oneHigh[0]].rank + '.', '~46% return', 'risk-bad',
        'Single high card gives the best chance of pairing into Jacks or Better (~1 in 5).');
    }

    return makeResult([], 'Discard all. No profitable holds.', '~36% return', 'risk-bad',
      'No high cards, pairs, or draws worth pursuing. Best play is to discard all five cards and draw a completely new hand.');
  }

  function find4ToRoyal(cards) {
    const royalRanks = ['10','J','Q','K','A'];
    for (const suit of VP_DECK.SUITS) {
      const matching = [];
      for (let i = 0; i < 5; i++) {
        if (cards[i].suit === suit && royalRanks.includes(cards[i].rank)) matching.push(i);
      }
      if (matching.length === 4) return matching;
    }
    return null;
  }

  function find3ToRoyal(cards) {
    const royalRanks = ['10','J','Q','K','A'];
    for (const suit of VP_DECK.SUITS) {
      const matching = [];
      for (let i = 0; i < 5; i++) {
        if (cards[i].suit === suit && royalRanks.includes(cards[i].rank)) matching.push(i);
      }
      if (matching.length === 3) return matching;
    }
    return null;
  }

  function find4ToStraightFlush(cards) {
    for (const suit of VP_DECK.SUITS) {
      const suitCards = [];
      for (let i = 0; i < 5; i++) {
        if (cards[i].suit === suit) suitCards.push({ idx: i, val: VP_DECK.rankValue(cards[i]) });
      }
      if (suitCards.length < 4) continue;
      const combos = combinations(suitCards, 4);
      for (const combo of combos) {
        const vals = combo.map(c => c.val).sort((a, b) => a - b);
        if (isConsecutiveOrNear(vals, 1)) return combo.map(c => c.idx);
      }
    }
    return null;
  }

  function find3ToStraightFlush(cards) {
    for (const suit of VP_DECK.SUITS) {
      const suitCards = [];
      for (let i = 0; i < 5; i++) {
        if (cards[i].suit === suit) suitCards.push({ idx: i, val: VP_DECK.rankValue(cards[i]) });
      }
      if (suitCards.length < 3) continue;
      const combos = combinations(suitCards, 3);
      for (const combo of combos) {
        const vals = combo.map(c => c.val).sort((a, b) => a - b);
        if (vals[2] - vals[0] <= 4) return combo.map(c => c.idx);
      }
    }
    return null;
  }

  function find4ToFlush(cards) {
    for (const suit of VP_DECK.SUITS) {
      const matching = [];
      for (let i = 0; i < 5; i++) if (cards[i].suit === suit) matching.push(i);
      if (matching.length === 4) return matching;
    }
    return null;
  }

  function findLowPair(cards) {
    const counts = VP_HAND.getRankCounts(cards);
    for (const rank in counts) {
      if (counts[rank] === 2 && !VP_HAND.isHighCard(rank)) {
        const hold = [];
        for (let i = 0; i < 5; i++) if (cards[i].rank === rank) hold.push(i);
        return hold;
      }
    }
    return null;
  }

  function find4ToOutsideStraight(cards) {
    const combos = combinations([0,1,2,3,4].map(i => ({ idx: i, val: VP_DECK.rankValue(cards[i]) })), 4);
    for (const combo of combos) {
      const vals = combo.map(c => c.val).sort((a, b) => a - b);
      if (vals[1] === vals[0] + 1 && vals[2] === vals[1] + 1 && vals[3] === vals[2] + 1) {
        const low = vals[0], high = vals[3];
        if (low >= 2 && high <= 13) return combo.map(c => c.idx);
      }
    }
    return null;
  }

  function findTwoHighCards(cards) {
    const high = [];
    for (let i = 0; i < 5; i++) if (VP_HAND.isHighCard(cards[i].rank)) high.push(i);
    if (high.length >= 2) return high.slice(0, Math.min(high.length, 3));
    return null;
  }

  function findOneHighCard(cards) {
    for (let i = 0; i < 5; i++) if (VP_HAND.isHighCard(cards[i].rank)) return [i];
    return null;
  }

  function combinations(arr, k) {
    const result = [];
    function backtrack(start, combo) {
      if (combo.length === k) { result.push([...combo]); return; }
      for (let i = start; i < arr.length; i++) {
        combo.push(arr[i]);
        backtrack(i + 1, combo);
        combo.pop();
      }
    }
    backtrack(0, []);
    return result;
  }

  function isConsecutiveOrNear(vals, maxGaps) {
    let gaps = 0;
    for (let i = 1; i < vals.length; i++) {
      const diff = vals[i] - vals[i - 1];
      if (diff === 0) return false;
      gaps += (diff - 1);
    }
    return gaps <= maxGaps;
  }

  function makeResult(holdIndices, explanation, riskLabel, riskClass, detailedExplanation) {
    const action = holdIndices.length === 0
      ? 'Discard All'
      : holdIndices.length === 5 ? 'Hold All' : 'HOLD: ' + holdIndices.map(i => '#' + (i + 1)).join(', ');
    return { holdIndices, action, explanation, riskLabel: riskLabel || '', riskClass: riskClass || 'risk-ok', detailedExplanation: detailedExplanation || '' };
  }

  window.VP_STRATEGY = { getRecommendation };
})();
