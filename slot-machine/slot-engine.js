/* eslint-disable */
// Slot mechanics — shared across all three themes.
// Symbol indices: 0=low3, 1=low2, 2=low1, 3=mid, 4=high, 5=wild.
// Each reel is a 30-stop weighted strip; spinning picks a uniform stop. The
// strip is hand-arranged so high-value symbols are spread across the reel for
// visual variety on idle.
//
// Paytable (single payline, 3 reels):
//   3× wild  → 750× bet (jackpot)
//   3× same  → PAYOUTS[symbol] × bet   (wilds substitute for any non-wild)
//   anything else → no payout
//
// Strip weights: low3:9 low2:8 low1:6 mid:4 high:2 wild:1 (totals 30).
// Theoretical RTP ≈ 93.6%.
(function () {
  const REEL_STRIP = [
    0, 1, 2, 0, 1, 3, 0, 2, 1, 0,
    4, 1, 2, 0, 3, 1, 0, 2, 5, 0,
    1, 3, 2, 0, 1, 4, 2, 0, 1, 3
  ];
  const PAYOUTS = [4, 8, 15, 50, 130, 750]; // by symbol index
  const WILD = 5;

  function spinReel() {
    return Math.floor(Math.random() * REEL_STRIP.length);
  }

  function reelSymbol(stopIdx) {
    const n = REEL_STRIP.length;
    return REEL_STRIP[((stopIdx % n) + n) % n];
  }

  function visibleSymbols(stopIdx) {
    const n = REEL_STRIP.length;
    const c = ((stopIdx % n) + n) % n;
    return [
      REEL_STRIP[(c - 1 + n) % n],
      REEL_STRIP[c],
      REEL_STRIP[(c + 1) % n]
    ];
  }

  function evaluatePayout(stops, bet) {
    const symbols = stops.map(reelSymbol);
    const counts = [0, 0, 0, 0, 0, 0];
    symbols.forEach(function (s) { counts[s]++; });

    if (counts[WILD] === 3) {
      return { win: bet * PAYOUTS[WILD], symbol: WILD, kind: 'jackpot', symbols: symbols };
    }
    let nonWild = -1;
    let multi = false;
    for (let i = 0; i < WILD; i++) {
      if (counts[i] > 0) {
        if (nonWild === -1) nonWild = i;
        else multi = true;
      }
    }
    if (!multi && nonWild !== -1 && counts[nonWild] + counts[WILD] === 3) {
      return {
        win: bet * PAYOUTS[nonWild],
        symbol: nonWild,
        kind: counts[WILD] > 0 ? 'sub' : 'plain',
        symbols: symbols
      };
    }
    return { win: 0, kind: 'none', symbols: symbols };
  }

  window.SLOT_ENGINE = {
    REEL_STRIP: REEL_STRIP,
    PAYOUTS: PAYOUTS,
    WILD: WILD,
    spinReel: spinReel,
    reelSymbol: reelSymbol,
    visibleSymbols: visibleSymbols,
    evaluatePayout: evaluatePayout
  };
})();
