/* eslint-disable */
// Texas Hold'em AI decision engine.
// Personality-driven preflop range selection + equity-based postflop decisions.
// Exposed as window.TH_AI.
(function () {
  // Sklansky-ish hand ranking groups for preflop. Lower number = stronger.
  // We compute a "preflop strength" 0..1 (1 = best) from hole cards directly.
  function preflopStrength(hole) {
    if (!hole || hole.length !== 2) return 0;
    const a = TH_DECK.rankValue(hole[0]);
    const b = TH_DECK.rankValue(hole[1]);
    const hi = Math.max(a, b);
    const lo = Math.min(a, b);
    const suited = hole[0].suit === hole[1].suit;
    const pair = a === b;
    const gap = hi - lo;

    // Base strength = (high card / 14) weighted toward ace
    let s = (hi / 14) * 0.5;
    s += (lo / 14) * 0.18;
    if (pair) s += 0.32 + (hi / 14) * 0.15;
    if (suited) s += 0.06;
    // Connectedness bonus (higher for closer + lower-rank-spread)
    if (!pair) {
      if (gap === 1) s += 0.05;
      else if (gap === 2) s += 0.025;
      else if (gap === 3) s += 0.012;
      // Big gappers among low cards lose value
      else s -= 0.03;
    }
    // Ace-rag offsuit penalty
    if (!suited && !pair && hi === 14 && lo <= 7) s -= 0.08;

    return Math.max(0, Math.min(1, s));
  }

  // Decide an action for an AI seat.
  // Inputs:
  //   ctx = {
  //     archetype,        // ARCHETYPES entry
  //     hole,             // [c1, c2]
  //     board,            // []|3|4|5
  //     phase,            // 'preflop'|'flop'|'turn'|'river'
  //     pot,              // pot total before this seat acts
  //     toCall,           // chips needed to match current bet
  //     myStack,          // chips this seat has left
  //     myCurrentBet,     // chips already in for this round
  //     currentBet,       // table's high bet for this round
  //     minRaise,         // min raise increment (raise size, not total)
  //     bigBlind,         // BB amount
  //     aliveCount,       // seats still live
  //     position,         // 0=button, 1=SB, 2=BB, 3=UTG (clockwise from button)
  //     handsThisStreet,  // number of seats already acted including raises this street
  //     iters,            // optional MC iter count
  //   }
  // Returns { action: 'fold'|'check'|'call'|'raise', amount?, reason }
  function decide(ctx) {
    const a = ctx.archetype;
    const toCall = Math.max(0, ctx.toCall);
    const canCheck = toCall === 0;

    if (ctx.phase === 'preflop') {
      return decidePreflop(ctx);
    }
    return decidePostflop(ctx);
  }

  function decidePreflop(ctx) {
    const a = ctx.archetype;
    const s = preflopStrength(ctx.hole);
    const facingRaise = ctx.toCall > ctx.bigBlind;
    const facingBigRaise = ctx.toCall >= ctx.bigBlind * 4;

    // VPIP threshold: low VPIP folds more.
    // strength threshold ≈ 1 - vpip (i.e. tom needs 0.82+, lucy 0.58+, mike 0.42+)
    const vpipThresh = 1 - a.vpip;
    const pfrThresh = 1 - a.pfr;

    // Random fudge so play isn't deterministic.
    const noise = (Math.random() - 0.5) * 0.08;
    const sN = Math.max(0, Math.min(1, s + noise));

    // Facing a 3-bet/4-bet (large raise)
    if (facingBigRaise) {
      // Need premium to continue
      if (sN >= 0.86) return { action: 'raise', amount: raiseAmount(ctx, 2.5), reason: '4-bet for value' };
      if (sN >= 0.74) return ctx.toCall <= ctx.myStack ? { action: 'call', reason: 'call to set-mine' } : { action: 'fold', reason: 'too rich' };
      // Maniac calls down even with junk sometimes
      if (Math.random() < a.bluff * 0.4 && sN >= 0.55) return { action: 'call', reason: 'speculate' };
      return { action: 'fold', reason: 'fold to big raise' };
    }

    // Facing a normal raise (someone open-raised)
    if (facingRaise) {
      if (sN >= 0.85 && Math.random() < 0.6 + a.aggression * 0.4) {
        return { action: 'raise', amount: raiseAmount(ctx, 2.5), reason: '3-bet for value' };
      }
      if (sN >= pfrThresh && Math.random() < a.aggression * 0.5) {
        return { action: 'raise', amount: raiseAmount(ctx, 2.5), reason: '3-bet (aggro)' };
      }
      if (sN >= vpipThresh - 0.05) return { action: 'call', reason: 'flat call raise' };
      // bluff 3-bet rarely
      if (Math.random() < a.bluff * 0.25) return { action: 'raise', amount: raiseAmount(ctx, 2.5), reason: 'light 3-bet' };
      return ctx.toCall === 0 ? { action: 'check', reason: 'check option' } : { action: 'fold', reason: 'fold to raise' };
    }

    // No raise yet — limped or open pot. Decide whether to open-raise/limp/fold.
    const willEnter = sN >= vpipThresh;
    if (!willEnter) {
      // small chance to mess around
      if (ctx.toCall === 0) return { action: 'check', reason: 'check the BB' };
      return { action: 'fold', reason: 'fold trash' };
    }

    // Should we raise?
    const shouldRaise = sN >= pfrThresh || Math.random() < a.aggression * 0.45;
    if (shouldRaise) {
      const mul = 2.7 + Math.random() * 0.6;
      return { action: 'raise', amount: raiseAmount(ctx, mul), reason: 'open-raise' };
    }
    if (ctx.toCall === 0) return { action: 'check', reason: 'check option' };
    return { action: 'call', reason: 'limp in' };
  }

  function decidePostflop(ctx) {
    const a = ctx.archetype;
    const canCheck = ctx.toCall <= 0;

    // Equity vs random opp range.
    const oppCount = Math.max(1, ctx.aliveCount - 1);
    const eqIters = ctx.iters || 350;
    const eq = TH_EQUITY.estimateEquity({
      playerHole: ctx.hole,
      board: ctx.board,
      oppCount,
      iters: eqIters
    }).equity;

    const potOdds = ctx.toCall > 0 ? TH_EQUITY.potOdds(ctx.toCall, ctx.pot) : 0;
    const noise = (Math.random() - 0.5) * 0.06;
    const eqAdj = Math.max(0, Math.min(1, eq + noise));

    // Strong: bet/raise for value
    const strongThresh = 0.62 - a.aggression * 0.10;
    const mediumThresh = 0.42;
    const weakThresh = 0.25;

    if (canCheck) {
      // No bet to face — bet for value, semi-bluff, or check
      if (eqAdj >= strongThresh) {
        // Value bet
        const sizeMul = 0.55 + a.aggression * 0.45;
        const betAmount = clampBet(ctx, Math.round(ctx.pot * sizeMul));
        return { action: 'raise', amount: betAmount, reason: 'value bet' };
      }
      if (eqAdj >= mediumThresh && Math.random() < a.aggression * 0.6) {
        const sizeMul = 0.45;
        return { action: 'raise', amount: clampBet(ctx, Math.round(ctx.pot * sizeMul)), reason: 'thin value' };
      }
      // Bluff
      if (Math.random() < a.bluff * (1 - eqAdj)) {
        const sizeMul = 0.55 + a.aggression * 0.4;
        return { action: 'raise', amount: clampBet(ctx, Math.round(ctx.pot * sizeMul)), reason: 'bluff' };
      }
      return { action: 'check', reason: 'check it down' };
    }

    // Facing a bet
    const requiredEq = potOdds; // fraction
    const slack = a.callDownLooseness;
    // Value-raise threshold
    if (eqAdj >= strongThresh + 0.08) {
      // Raise for value
      const newRaise = ctx.currentBet + Math.max(ctx.minRaise, Math.round(ctx.pot * (0.6 + a.aggression * 0.4)));
      return { action: 'raise', amount: clampBet(ctx, newRaise - ctx.myCurrentBet), reason: 'raise for value' };
    }
    if (eqAdj >= requiredEq * slack) {
      return { action: 'call', reason: 'pot odds call' };
    }
    // Bluff-raise
    if (Math.random() < a.bluff * 0.5 && ctx.toCall < ctx.myStack * 0.4) {
      const newRaise = ctx.currentBet + Math.max(ctx.minRaise, Math.round(ctx.pot * 0.7));
      return { action: 'raise', amount: clampBet(ctx, newRaise - ctx.myCurrentBet), reason: 'bluff-raise' };
    }
    return { action: 'fold', reason: 'fold to bet' };
  }

  // raiseAmount = total chips added this action (NOT total bet) for an open-raise multiplier of BB
  function raiseAmount(ctx, mulOfBB) {
    const target = Math.round(ctx.bigBlind * mulOfBB * (ctx.archetype.raiseSizingMul || 1));
    const newBet = Math.max(target, ctx.currentBet + ctx.minRaise);
    const add = newBet - ctx.myCurrentBet;
    return clampBet(ctx, add);
  }

  // Clamp added-chips to remaining stack.
  function clampBet(ctx, add) {
    const a = Math.max(0, Math.floor(add));
    return Math.min(a, ctx.myStack);
  }

  window.TH_AI = { decide, preflopStrength };
})();
