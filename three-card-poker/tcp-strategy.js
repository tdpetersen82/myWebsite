/* eslint-disable */
// Three Card Poker optimal strategy: Play with Q-6-4 or better, otherwise Fold.
// Returns hint objects shaped like blackjack's basicStrategy() so the shared
// HintPanel can render them.
(function () {
  function rv(c) { return TCP_DECK.rankValue(c); }
  function sorted(cards) { return TCP_HAND.sortCards(cards); }

  function shouldPlay(cards) {
    const ev = TCP_HAND.evaluate(cards);
    if (ev.rank >= TCP_HAND.RANKS.PAIR) return true;
    const v = sorted(cards).map(rv);
    if (v[0] < 12) return false;     // below Q
    if (v[0] > 12) return true;      // K or A high
    if (v[1] < 6)  return false;     // Q-5 or lower second card
    if (v[1] > 6)  return true;      // Q-7 or higher
    if (v[2] < 4)  return false;     // Q-6-3 or worse
    return true;                     // Q-6-4+
  }

  function estimateWinRate(cards) {
    const ev = TCP_HAND.evaluate(cards);
    const high = rv(sorted(cards)[0]);
    switch (ev.rank) {
      case TCP_HAND.RANKS.STRAIGHT_FLUSH: return 99;
      case TCP_HAND.RANKS.THREE_OF_A_KIND: return 96;
      case TCP_HAND.RANKS.STRAIGHT: return 80;
      case TCP_HAND.RANKS.FLUSH: return 72;
      case TCP_HAND.RANKS.PAIR:
        if (high >= 12) return 68;
        if (high >= 8)  return 62;
        return 58;
      default:
        if (high >= 14) return 52;
        if (high >= 13) return 48;
        if (high >= 12) return 44;
        return 35;
    }
  }

  function getRecommendation(cards) {
    const play = shouldPlay(cards);
    const winRate = estimateWinRate(cards);
    const desc = TCP_HAND.describe(cards);
    const ev = TCP_HAND.evaluate(cards);
    const action = play ? 'Play' : 'Fold';
    const riskClass = play ? 'risk-good' : 'risk-bad';
    const riskLabel = `Win rate ≈${winRate}%`;

    let explanation;
    if (play) {
      if (ev.rank >= TCP_HAND.RANKS.STRAIGHT) {
        explanation = `${desc} — strong hand. You'll also collect an Ante Bonus regardless of how the dealer finishes.`;
      } else if (ev.rank >= TCP_HAND.RANKS.PAIR) {
        explanation = `${desc} — any pair or better is always a Play. The expected value beats folding by a clear margin.`;
      } else {
        explanation = `${desc} — at or above Q-6-4. The expected loss from folding exceeds the expected loss from playing here.`;
      }
    } else {
      explanation = `${desc} — below Q-6-4. Folding loses only your Ante; playing on this hand loses the Ante and the Play bet too often.`;
    }

    return {
      kind: 'strategy',
      action,
      explanation,
      odds: { winRate },
      riskLabel,
      riskClass
    };
  }

  function bettingHint(bankroll) {
    if (bankroll <= 0) return null;
    const suggested = Math.max(5, Math.min(100, Math.round(bankroll * 0.025 / 5) * 5));
    return {
      kind: 'bet',
      action: `$${suggested}`,
      explanation: 'About 2.5% of your bankroll on the Ante. Pair Plus is optional — its house edge is ~7% vs ~3% for the main game.'
    };
  }

  window.TCP_STRATEGY = { shouldPlay, estimateWinRate, getRecommendation, bettingHint };
})();
