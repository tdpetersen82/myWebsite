/* eslint-disable */
// Crash — the math. Pure functions, no DOM, so tools/crash-test.mjs can load
// this file in node and pin the house edge, the curve, and bet settlement.
//
// Round model (the Bustabit standard that Aviator, JetX and the rest copied):
//   * A 32-byte seed is drawn before the round. Its SHA-256 is shown while
//     the round runs (the commitment); the seed itself is shown after the
//     bust, so a player can check hash(seed) matches and that the bust
//     multiplier really came from that seed.
//   * The seed's first 52 bits become a uniform r in [0, 1). The bust
//     multiplier is 0.99 / (1 - r), floored to cents, with a hard floor of
//     1.00x and a ceiling of MAX_MULT.
//     Cashing out at any target x pays x with probability 0.99 / x, so every
//     strategy returns 99 cents on the dollar: a 1% house edge, and the
//     "0.99" in the formula is exactly that edge. For that to hold on a
//     cents grid, a cash-out AT the bust value must pay: the round stays live
//     while the display shows the bust value and ends when it would tick
//     past it (timeToBust), and settle() treats a tie as a win.
//   * The multiplier climbs as e^(GROWTH * ms): 2x at ~11.6 s, 10x at ~38 s.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.CRASH_ENGINE = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  var GROWTH = 0.00006;        // per millisecond
  var HOUSE_EDGE = 0.01;
  var MAX_MULT = 1000;
  var MIN_BET = 5;
  var MAX_BET = 500;
  var MIN_AUTO = 1.01;

  // First 52 bits of the seed → uniform in [0, 1). 52 bits fit a double
  // exactly, so there is no rounding bias at either end.
  function bytesToUniform(bytes) {
    var hi = 0, lo = 0;
    // bits 0..19 → hi (20 bits), bits 20..51 → lo (32 bits)
    hi = ((bytes[0] << 12) | (bytes[1] << 4) | (bytes[2] >> 4)) >>> 0;
    lo = (((bytes[2] & 0x0f) << 28) | (bytes[3] << 20) | (bytes[4] << 12) | (bytes[5] << 4) | (bytes[6] >> 4)) >>> 0;
    return (hi * 4294967296 + lo) / 4503599627370496; // 2^52
  }

  // Uniform r → bust multiplier, floored to cents.
  function crashPointFromUniform(r) {
    if (!(r >= 0 && r < 1)) r = 0;
    var m = (1 - HOUSE_EDGE) / (1 - r);
    m = Math.floor(m * 100) / 100;
    if (m < 1) m = 1;
    if (m > MAX_MULT) m = MAX_MULT;
    return m;
  }

  function crashPointFromBytes(bytes) {
    return crashPointFromUniform(bytesToUniform(bytes));
  }

  // The curve and its inverse.
  function multiplierAt(ms) {
    if (ms <= 0) return 1;
    return Math.exp(GROWTH * ms);
  }
  function timeToMultiplier(m) {
    if (m <= 1) return 0;
    return Math.log(m) / GROWTH;
  }

  // Displayed multiplier: floored to cents so the shown number never exceeds
  // what a cash-out at that instant actually pays.
  function displayMultiplier(ms) {
    return Math.floor(multiplierAt(ms) * 100) / 100;
  }
  // Round length: the display must reach the bust value and hold it until
  // the next cent would show, so P(display reaches x) = P(crash >= x) = 0.99/x.
  function timeToBust(crash) {
    return timeToMultiplier(Math.round(crash * 100 + 1) / 100);
  }

  // Settle one bet against a finished round.
  //   bet      stake in dollars
  //   auto     auto cash-out target or null
  //   crash    the round's bust multiplier
  //   cashedAt manual cash-out multiplier or null (the UI only allows it
  //            while the round is live, so it is always <= crash)
  // Returns { won, at, payout, profit } — payout is the full amount returned
  // to the bankroll (0 on a bust), profit is payout - bet.
  function settle(opts) {
    var bet = Math.max(0, Number(opts.bet) || 0);
    var crash = Number(opts.crash) || 1;
    var auto = opts.auto != null ? Number(opts.auto) : null;
    var manual = opts.cashedAt != null ? Number(opts.cashedAt) : null;
    var at = null;
    if (manual != null && manual <= crash + 1e-9) at = manual;
    if (auto != null && auto >= MIN_AUTO && auto <= crash + 1e-9 && (at == null || auto < at)) at = auto;
    // A target equal to the bust value pays: the display shows that value
    // while the round is still live (see timeToBust).
    if (at == null) return { won: false, at: null, payout: 0, profit: -bet };
    var payout = Math.floor(bet * at);
    return { won: true, at: at, payout: payout, profit: payout - bet };
  }

  // Computer players at the table. Targets follow the mix real crash lobbies
  // show: most bail under 2x, a few ride into double digits.
  var BOT_NAMES = ['Marcus', 'Priya', 'Dario', 'Lena', 'Tomas', 'Aisha', 'Kenji', 'Noor', 'Felix', 'Ingrid', 'Rafael', 'Mei', 'Oscar', 'Zara', 'Hugo', 'Sana', 'Liam', 'Elif', 'Bruno', 'Yara'];
  function botTarget(rand) {
    var u = rand();
    if (u < 0.35) return 1.1 + rand() * 0.6;      // 1.10 – 1.70
    if (u < 0.70) return 1.7 + rand() * 1.3;      // 1.70 – 3.00
    if (u < 0.92) return 3 + rand() * 5;          // 3 – 8
    return 8 + Math.pow(rand(), 0.5) * 40;        // 8 – 48
  }
  function makeBots(rand, count) {
    rand = rand || Math.random;
    count = count || 7 + Math.floor(rand() * 4);
    var pool = BOT_NAMES.slice();
    var bots = [];
    for (var i = 0; i < count && pool.length; i++) {
      var name = pool.splice(Math.floor(rand() * pool.length), 1)[0];
      var stakes = [5, 10, 10, 20, 25, 25, 50, 50, 100, 100, 200, 250];
      var bet = stakes[Math.floor(rand() * stakes.length)];
      var target = Math.round(botTarget(rand) * 100) / 100;
      // ~15% of the table plays with no plan and "panics" at a random moment
      // instead of holding a target — modelled as a slightly lower target.
      bots.push({ name: name, bet: bet, target: target, cashedAt: null, done: false });
    }
    // Sort by target so the feed reads in the order they'll cash out.
    bots.sort(function (a, b) { return a.target - b.target; });
    return bots;
  }

  function hex(bytes) {
    var s = '';
    for (var i = 0; i < bytes.length; i++) s += (bytes[i] < 16 ? '0' : '') + bytes[i].toString(16);
    return s;
  }

  return {
    GROWTH: GROWTH,
    HOUSE_EDGE: HOUSE_EDGE,
    MAX_MULT: MAX_MULT,
    MIN_BET: MIN_BET,
    MAX_BET: MAX_BET,
    MIN_AUTO: MIN_AUTO,
    bytesToUniform: bytesToUniform,
    crashPointFromUniform: crashPointFromUniform,
    crashPointFromBytes: crashPointFromBytes,
    multiplierAt: multiplierAt,
    timeToMultiplier: timeToMultiplier,
    displayMultiplier: displayMultiplier,
    timeToBust: timeToBust,
    settle: settle,
    makeBots: makeBots,
    hex: hex,
  };
});
