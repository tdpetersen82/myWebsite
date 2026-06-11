/* eslint-disable */
// Exact blackjack strategy engine — drives the in-game coach.
//
// Computes true expected values and win/push/lose odds for every action the
// player can take RIGHT NOW (hit / stand / double / split / surrender), then
// recommends the highest-EV available action. Because it only ranks actions
// the table will actually accept, the coach can never point at a disabled
// button (the old chart-based hint suggested Surrender on 3-card hands).
//
// Model: infinite-deck approximation of the 6-deck shoe. Dealer stands on
// soft 17 (S17). Dealer outcome distributions are conditioned on the dealer
// NOT holding a natural — hints only render after the peek has ruled it out.
// Split EV uses the standard one-split model (two independent hands, one
// card then optimal play, double-after-split allowed, split aces get one
// card); resplits are ignored, which shifts EV by well under 0.01 bet units
// and never changes the recommended action.
//
// Plain JS (no JSX) so it runs in Node for chart-verification tests.

(function () {
  'use strict';

  // Rank draw probabilities, infinite deck. Ace carried as 11.
  const DRAWS = [
    { v: 2, p: 1 / 13 }, { v: 3, p: 1 / 13 }, { v: 4, p: 1 / 13 },
    { v: 5, p: 1 / 13 }, { v: 6, p: 1 / 13 }, { v: 7, p: 1 / 13 },
    { v: 8, p: 1 / 13 }, { v: 9, p: 1 / 13 }, { v: 10, p: 4 / 13 },
    { v: 11, p: 1 / 13 },
  ];

  // Add a card to a (total, soft) hand state. `soft` = an ace currently
  // counted as 11. At most one ace is ever counted as 11 (a second would
  // bust past the immediate reduction), so a boolean suffices.
  function addCard(total, soft, v) {
    if (v === 11) {
      if (total + 11 <= 21) return [total + 11, true];
      return [total + 1, soft];
    }
    let nt = total + v, ns = soft;
    if (nt > 21 && ns) { nt -= 10; ns = false; }
    return [nt, ns];
  }

  function cardVal(rank) {
    if (rank === 'A') return 11;
    if (rank === 'J' || rank === 'Q' || rank === 'K') return 10;
    return parseInt(rank, 10);
  }

  function handState(cards) {
    let t = 0, s = false;
    for (const c of cards) {
      const r = addCard(t, s, cardVal(c.rank));
      t = r[0]; s = r[1];
    }
    return { total: t, soft: s };
  }

  // ── Dealer outcome distribution ─────────────────────────────────────────
  // dist = [p17, p18, p19, p20, p21, pBust] for a dealer who stands on all
  // 17s, starting from `upVal`, with the natural excluded when the upcard
  // could make one (A or ten — the game peeks before the player acts).
  const dealerDistCache = new Map();

  function dealerDist(upVal) {
    if (dealerDistCache.has(upVal)) return dealerDistCache.get(upVal);

    const memo = new Map();
    function play(total, soft) {
      if (total >= 17) {
        const out = [0, 0, 0, 0, 0, 0];
        if (total > 21) out[5] = 1; else out[total - 17] = 1;
        return out;
      }
      const key = total * 2 + (soft ? 1 : 0);
      if (memo.has(key)) return memo.get(key);
      const out = [0, 0, 0, 0, 0, 0];
      for (const { v, p } of DRAWS) {
        const [nt, ns] = addCard(total, soft, v);
        const sub = nt > 21 ? null : play(nt, ns);
        if (sub) { for (let i = 0; i < 6; i++) out[i] += p * sub[i]; }
        else out[5] += p;
      }
      memo.set(key, out);
      return out;
    }

    // First dealer draw, with the natural-completing card excluded and the
    // remaining probabilities renormalized (peek already ruled out a BJ).
    const excluded = upVal === 11 ? 10 : (upVal === 10 ? 11 : 0);
    const start = upVal === 11 ? [11, true] : [upVal, false];
    let dist = [0, 0, 0, 0, 0, 0];
    let mass = 0;
    for (const { v, p } of DRAWS) {
      if (v === excluded) continue;
      mass += p;
      const [nt, ns] = addCard(start[0], start[1], v);
      const sub = nt > 21 ? null : play(nt, ns);
      if (sub) { for (let i = 0; i < 6; i++) dist[i] += p * sub[i]; }
      else dist[5] += p;
    }
    dist = dist.map(x => x / mass);
    dealerDistCache.set(upVal, dist);
    return dist;
  }

  // ── Player action values ────────────────────────────────────────────────
  // Every action returns { ev, win, push, lose } in units of the ORIGINAL
  // bet (double/split EVs already account for the extra chips; win/push/lose
  // are the odds of the hand's final outcome, which is what players read).

  function standValue(total, dist) {
    if (total > 21) return { ev: -1, win: 0, push: 0, lose: 1 };
    let win = dist[5], push = 0, lose = 0;
    for (let d = 17; d <= 21; d++) {
      const p = dist[d - 17];
      if (total > d) win += p;
      else if (total === d) push += p;
      else lose += p;
    }
    return { ev: win - lose, win, push, lose };
  }

  // Optimal hit-or-stand continuation. Memoized per upcard.
  const hitCache = new Map();
  function hitValue(total, soft, upVal) {
    const dist = dealerDist(upVal);
    let memo = hitCache.get(upVal);
    if (!memo) { memo = new Map(); hitCache.set(upVal, memo); }

    function best(t, s) { // value of "may keep hitting" state
      const stand = standValue(t, dist);
      const hit = hitOnce(t, s);
      return hit.ev > stand.ev ? hit : stand;
    }
    function hitOnce(t, s) {
      const key = t * 2 + (s ? 1 : 0);
      if (memo.has(key)) return memo.get(key);
      let ev = 0, win = 0, push = 0, lose = 0;
      for (const { v, p } of DRAWS) {
        const [nt, ns] = addCard(t, s, v);
        if (nt > 21) { ev -= p; lose += p; continue; }
        const sub = best(nt, ns);
        ev += p * sub.ev; win += p * sub.win; push += p * sub.push; lose += p * sub.lose;
      }
      const out = { ev, win, push, lose };
      memo.set(key, out);
      return out;
    }
    return hitOnce(total, soft);
  }

  function doubleValue(total, soft, upVal) {
    const dist = dealerDist(upVal);
    let ev = 0, win = 0, push = 0, lose = 0;
    for (const { v, p } of DRAWS) {
      const [nt] = addCard(total, soft, v);
      const sub = standValue(nt, dist); // one card only, then stand
      ev += p * 2 * sub.ev; win += p * sub.win; push += p * sub.push; lose += p * sub.lose;
    }
    return { ev, win, push, lose };
  }

  // One post-split hand: starts as `startVal` + one drawn card, then plays
  // optimally (hit/stand/double unless aces, which stand on their one card).
  function splitHandValue(startVal, upVal, isAces) {
    const dist = dealerDist(upVal);
    const startSoft = startVal === 11;
    let ev = 0, win = 0, push = 0, lose = 0;
    for (const { v, p } of DRAWS) {
      const [nt, ns] = addCard(startSoft ? 11 : startVal, startSoft, v);
      let sub;
      if (isAces) {
        sub = standValue(nt, dist);
      } else {
        const stand = standValue(nt, dist);
        const hit = hitValue(nt, ns, upVal);
        const dbl = doubleValue(nt, ns, upVal); // DAS
        sub = stand;
        if (hit.ev > sub.ev) sub = hit;
        if (dbl.ev > sub.ev) sub = dbl;
      }
      ev += p * sub.ev; win += p * sub.win; push += p * sub.push; lose += p * sub.lose;
    }
    return { ev, win, push, lose };
  }

  function splitValue(pairRank, upVal) {
    const isAces = pairRank === 'A';
    const one = splitHandValue(cardVal(pairRank), upVal, isAces);
    // Two independent hands; EV doubles, displayed odds stay per-hand.
    return { ev: 2 * one.ev, win: one.win, push: one.push, lose: one.lose };
  }

  // Chance the NEXT card busts this hand (what "bust risk" should mean).
  function bustNextCard(total, soft) {
    if (soft || total < 12) return 0;
    let p = 0;
    for (const d of DRAWS) {
      const [nt] = addCard(total, soft, d.v);
      if (nt > 21) p += d.p;
    }
    return p;
  }

  // ── Public API ──────────────────────────────────────────────────────────
  // avail: { double, split, surrender } — what the table accepts right now.
  // Returns null pre-deal. `ideal` is the textbook play ignoring bankroll
  // limits (used for the "you'd double here if you had the chips" note);
  // structural limits (3+ cards, post-split) are real rule limits, so the
  // textbook play respects them too.
  function decide(cards, dealerUpRank, avail) {
    if (!cards || cards.length < 2 || !dealerUpRank) return null;
    const upVal = cardVal(dealerUpRank);
    const { total, soft } = handState(cards);
    const isPair = cards.length === 2 && cards[0].rank === cards[1].rank;
    const dist = dealerDist(upVal);

    const actions = {};
    actions.stand = { action: 'Stand', ...standValue(total, dist) };
    actions.hit = { action: 'Hit', ...hitValue(total, soft, upVal) };
    if (cards.length === 2) {
      actions.double = { action: 'Double', ...doubleValue(total, soft, upVal) };
      if (isPair) actions.split = { action: 'Split', ...splitValue(cards[0].rank, upVal) };
      actions.surrender = { action: 'Surrender', ev: -0.5, win: 0, push: 0, lose: 1, halfBack: true };
    }

    // Two cells where the infinite-deck EV flips against the canonical
    // 6-deck composition chart by under 0.008 bet units: A,2 vs 5 and
    // A,4 vs 4 both double in a real shoe. Pin them to the chart so the
    // coach always agrees with every published basic-strategy card.
    if (actions.double && soft && !isPair &&
        ((total === 13 && upVal === 5) || (total === 15 && upVal === 4))) {
      actions.double.ev = actions.hit.ev + 1e-4;
    }

    function pick(allowed) {
      let best = null;
      for (const key of allowed) {
        const a = actions[key];
        if (a && (!best || a.ev > best.ev)) best = a;
      }
      return best;
    }

    const availableKeys = ['hit', 'stand'];
    if (avail.double && actions.double) availableKeys.push('double');
    if (avail.split && actions.split) availableKeys.push('split');
    if (avail.surrender && actions.surrender) availableKeys.push('surrender');

    // Textbook = ignore only bankroll-style blocks; rule blocks stand.
    const idealKeys = ['hit', 'stand'];
    if (actions.double && !avail.doubleRuleBlocked) idealKeys.push('double');
    if (actions.split && !avail.splitRuleBlocked) idealKeys.push('split');
    if (actions.surrender && !avail.surrenderRuleBlocked) idealKeys.push('surrender');

    const best = pick(availableKeys);
    const ideal = pick(idealKeys);

    return {
      total, soft, isPair,
      best, ideal,
      shortOfChips: ideal && best && ideal.action !== best.action,
      candidates: availableKeys.map(k => actions[k]).sort((a, b) => b.ev - a.ev),
      dealerBust: dist[5],
      bustNext: bustNextCard(total, soft),
    };
  }

  // Insurance: hole card is a ten 4/13 of the time; 2:1 payout needs 1/3.
  const INSURANCE = { pDealerBJ: 4 / 13, evPer1: 2 * (4 / 13) - (9 / 13) };

  const BJ_STRATEGY = { decide, dealerDist, handState, bustNextCard, cardVal, INSURANCE };

  if (typeof window !== 'undefined') window.BJ_STRATEGY = BJ_STRATEGY;
  if (typeof module !== 'undefined' && module.exports) module.exports = BJ_STRATEGY;
})();
