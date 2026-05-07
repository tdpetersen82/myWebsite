/* eslint-disable */
// Monte Carlo equity simulator for Texas Hold'em.
// Exposed as window.TH_EQUITY.
(function () {
  const SUITS = ['hearts','diamonds','clubs','spades'];
  const RANKS = ['2','3','4','5','6','7','8','9','10','J','Q','K','A'];

  // Build a deck of {rank,suit,id} objects (TH_HAND.evaluate5 only reads rank/suit).
  function freshDeck() {
    const d = [];
    for (const s of SUITS) for (const r of RANKS) d.push({ rank: r, suit: s, id: `${r}-${s}` });
    return d;
  }

  function cardKey(c) { return `${c.rank}-${c.suit}`; }

  function removeCards(deck, exclude) {
    const ban = new Set(exclude.map(cardKey));
    return deck.filter(c => !ban.has(cardKey(c)));
  }

  function shuffleInPlace(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  // Estimate equity with Monte Carlo simulation.
  // - playerHole: 2 cards
  // - board: 0..5 community cards
  // - oppCount: number of opponents to simulate (random hands from remaining deck)
  // - iters: simulation count
  // Returns { win, tie, lose } as fractions in [0,1].
  function estimateEquity({ playerHole, board = [], oppCount = 1, iters = 1500 }) {
    if (!playerHole || playerHole.length !== 2) return { win: 0, tie: 0, lose: 1 };
    const baseDeck = removeCards(freshDeck(), [...playerHole, ...board]);
    if (baseDeck.length < 2 * oppCount + (5 - board.length)) {
      return { win: 0, tie: 0, lose: 1 };
    }

    let wins = 0, ties = 0, losses = 0;
    const evalBest = TH_HAND.evalBest5From7;
    const cmp = TH_HAND.compareEval;
    const boardCardsNeeded = 5 - board.length;

    for (let it = 0; it < iters; it++) {
      // Shuffle a copy for this iteration. Inline shuffle for speed.
      const deck = baseDeck.slice();
      shuffleInPlace(deck);

      const opps = [];
      let p = 0;
      for (let o = 0; o < oppCount; o++) {
        opps.push([deck[p++], deck[p++]]);
      }
      const fullBoard = board.slice();
      for (let b = 0; b < boardCardsNeeded; b++) fullBoard.push(deck[p++]);

      const playerEv = evalBest([...playerHole, ...fullBoard]);
      let bestOpp = null;
      for (const o of opps) {
        const ev = evalBest([...o, ...fullBoard]);
        if (!bestOpp || cmp(ev, bestOpp) > 0) bestOpp = ev;
      }
      const c = cmp(playerEv, bestOpp);
      if (c > 0) wins++;
      else if (c === 0) ties++;
      else losses++;
    }

    const total = wins + ties + losses;
    return {
      win: wins / total,
      tie: ties / total,
      lose: losses / total,
      equity: (wins + ties / 2) / total
    };
  }

  // Pot odds: required-equity threshold for a call given price.
  // toCall = amount you must add to call. potBefore = pot size BEFORE you act.
  // Required equity = toCall / (potBefore + toCall)
  function potOdds(toCall, potBefore) {
    if (toCall <= 0) return 0;
    return toCall / (potBefore + toCall);
  }

  window.TH_EQUITY = { estimateEquity, potOdds };
})();
