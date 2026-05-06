/* eslint-disable */
// Three Card Poker — hand evaluation, comparison, dealer qualification, payout
// computation. Pure functions, no DOM.
(function () {
  const RANKS = {
    HIGH_CARD: 0,
    PAIR: 1,
    FLUSH: 2,
    STRAIGHT: 3,        // straight beats flush in 3-card
    THREE_OF_A_KIND: 4,
    STRAIGHT_FLUSH: 5,
  };

  const RANK_NAMES = {
    0:'High Card', 1:'Pair', 2:'Flush', 3:'Straight',
    4:'Three of a Kind', 5:'Straight Flush'
  };

  // Bonus paid on any non-folded hand regardless of dealer outcome.
  const ANTE_BONUS = {
    STRAIGHT_FLUSH: 5,
    THREE_OF_A_KIND: 4,
    STRAIGHT: 1
  };

  // Pair-Plus side bet — independent of main game.
  const PAIR_PLUS = {
    STRAIGHT_FLUSH: 40,
    THREE_OF_A_KIND: 30,
    STRAIGHT: 6,
    FLUSH: 4,
    PAIR: 1
  };

  function rv(c) { return TCP_DECK.rankValue(c); }

  function sortCards(cards) {
    return [...cards].sort((a, b) => rv(b) - rv(a));
  }

  function isFlush(cards) {
    return cards[0].suit === cards[1].suit && cards[1].suit === cards[2].suit;
  }

  function isStraight(cards) {
    const v = sortCards(cards).map(rv);
    if (v[0] - v[1] === 1 && v[1] - v[2] === 1) return true;
    // A-2-3 wheel
    if (v[0] === 14 && v[1] === 3 && v[2] === 2) return true;
    return false;
  }

  function isThreeOfAKind(cards) {
    return cards[0].rank === cards[1].rank && cards[1].rank === cards[2].rank;
  }

  function isPair(cards) {
    const s = sortCards(cards);
    return s[0].rank === s[1].rank || s[1].rank === s[2].rank;
  }

  function evaluate(cards) {
    const s = sortCards(cards);
    const v = s.map(rv);
    const flush = isFlush(cards);
    const straight = isStraight(cards);

    function straightKickers() {
      // wheel: 3-high straight
      if (v[0] === 14 && v[1] === 3 && v[2] === 2) return [3];
      return [v[0]];
    }

    if (flush && straight) return { rank: RANKS.STRAIGHT_FLUSH, kickers: straightKickers() };
    if (isThreeOfAKind(cards)) return { rank: RANKS.THREE_OF_A_KIND, kickers: [v[0]] };
    if (straight) return { rank: RANKS.STRAIGHT, kickers: straightKickers() };
    if (flush) return { rank: RANKS.FLUSH, kickers: v };
    if (isPair(cards)) {
      if (s[0].rank === s[1].rank) return { rank: RANKS.PAIR, kickers: [v[0], v[2]] };
      return { rank: RANKS.PAIR, kickers: [v[1], v[0]] };
    }
    return { rank: RANKS.HIGH_CARD, kickers: v };
  }

  // 1 = a wins, -1 = b wins, 0 = tie
  function compare(a, b) {
    const ea = evaluate(a), eb = evaluate(b);
    if (ea.rank !== eb.rank) return ea.rank > eb.rank ? 1 : -1;
    const len = Math.max(ea.kickers.length, eb.kickers.length);
    for (let i = 0; i < len; i++) {
      const ka = ea.kickers[i] || 0;
      const kb = eb.kickers[i] || 0;
      if (ka !== kb) return ka > kb ? 1 : -1;
    }
    return 0;
  }

  function dealerQualifies(cards) {
    const ev = evaluate(cards);
    if (ev.rank > RANKS.HIGH_CARD) return true;
    return rv(sortCards(cards)[0]) >= 12; // Q-high or better
  }

  function describe(cards) {
    const ev = evaluate(cards);
    const s = sortCards(cards);
    const name = RANK_NAMES[ev.rank];
    switch (ev.rank) {
      case RANKS.STRAIGHT_FLUSH: return name;
      case RANKS.THREE_OF_A_KIND: return name + ' — ' + s[0].rank + 's';
      case RANKS.STRAIGHT: return name;
      case RANKS.FLUSH: return name + ' — ' + s[0].rank + ' high';
      case RANKS.PAIR: {
        const pairRank = s[0].rank === s[1].rank ? s[0].rank : s[1].rank;
        return 'Pair of ' + pairRank + 's';
      }
      default: return s[0].rank + ' high';
    }
  }

  function getAnteBonus(cards) {
    const ev = evaluate(cards);
    switch (ev.rank) {
      case RANKS.STRAIGHT_FLUSH: return ANTE_BONUS.STRAIGHT_FLUSH;
      case RANKS.THREE_OF_A_KIND: return ANTE_BONUS.THREE_OF_A_KIND;
      case RANKS.STRAIGHT: return ANTE_BONUS.STRAIGHT;
      default: return 0;
    }
  }

  function getPairPlusPayout(cards) {
    const ev = evaluate(cards);
    switch (ev.rank) {
      case RANKS.STRAIGHT_FLUSH: return PAIR_PLUS.STRAIGHT_FLUSH;
      case RANKS.THREE_OF_A_KIND: return PAIR_PLUS.THREE_OF_A_KIND;
      case RANKS.STRAIGHT: return PAIR_PLUS.STRAIGHT;
      case RANKS.FLUSH: return PAIR_PLUS.FLUSH;
      case RANKS.PAIR: return PAIR_PLUS.PAIR;
      default: return 0;
    }
  }

  // Pure resolution. Bets are assumed already deducted from bankroll.
  // Returns { kind, anteResult, playResult, anteBonus, pairPlus, totalReturn, net }
  //
  //   kind:           'win' | 'lose' | 'push' | 'no-qualify' | 'fold' | 'bonus-win'
  //   anteResult:     payout for ante (0 = lost, anteBet = pushed, anteBet*2 = win 1:1)
  //   playResult:     payout for play (0 = lost, playBet = pushed, playBet*2 = win 1:1)
  //   anteBonus:      bonus dollars (in addition to ante result)
  //   pairPlus:       pair-plus return (stake + bonus, or 0 if lost)
  //   totalReturn:    sum returned to bankroll
  //   net:            totalReturn - totalBets (positive = profit)
  function payouts(playerCards, dealerCards, bets, folded) {
    const { ante = 0, play = 0, pairPlus = 0 } = bets;
    const totalBets = ante + play + pairPlus;

    let anteResult = 0;
    let playResult = 0;
    let anteBonus = 0;
    let pairPlusReturn = 0;
    let kind = 'lose';

    // Pair Plus is independent of fold/qualify state — only depends on player hand.
    if (pairPlus > 0) {
      const ppMult = getPairPlusPayout(playerCards);
      if (ppMult > 0) {
        pairPlusReturn = pairPlus + pairPlus * ppMult;
      }
    }

    if (folded) {
      // Ante forfeited, no play bet, no ante bonus.
      const totalReturn = pairPlusReturn;
      const net = totalReturn - totalBets;
      kind = pairPlusReturn > 0 ? 'bonus-win' : 'fold';
      return { kind, anteResult, playResult, anteBonus, pairPlus: pairPlusReturn, totalReturn, net };
    }

    // Ante bonus pays on non-folded hand regardless of dealer outcome.
    const abMult = getAnteBonus(playerCards);
    if (abMult > 0) anteBonus = ante * abMult;

    if (!dealerQualifies(dealerCards)) {
      // Ante 1:1, Play pushes (returned).
      anteResult = ante * 2;
      playResult = play; // push
      kind = 'no-qualify';
    } else {
      const cmp = compare(playerCards, dealerCards);
      if (cmp > 0) {
        anteResult = ante * 2;
        playResult = play * 2;
        kind = 'win';
      } else if (cmp === 0) {
        anteResult = ante;
        playResult = play;
        kind = 'push';
      } else {
        kind = 'lose';
      }
    }

    let totalReturn = anteResult + playResult + anteBonus + pairPlusReturn;
    const net = totalReturn - totalBets;

    // Promote to 'bonus-win' if main game lost but bonus/PP made it a profit.
    if ((kind === 'lose' || kind === 'push') && net > 0) kind = 'bonus-win';

    return { kind, anteResult, playResult, anteBonus, pairPlus: pairPlusReturn, totalReturn, net };
  }

  window.TCP_HAND = {
    RANKS, RANK_NAMES, ANTE_BONUS, PAIR_PLUS,
    evaluate, compare, dealerQualifies, describe,
    getAnteBonus, getPairPlusPayout, payouts,
    sortCards, isFlush, isStraight, isThreeOfAKind, isPair
  };
})();
