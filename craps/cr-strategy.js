/* eslint-disable */
// Craps strategy hints. Pure function from state to a hint descriptor.
//   state: { phase, point, bets }
//   returns: { kind, action, explanation, riskLabel, riskClass, detail } | null

(function () {
  function getBettingHint(state) {
    const { phase, point, bets } = state;

    // ── Come-out phase ────────────────────────────────────────
    if (phase === 'comeOut') {
      if (!bets.pass && !bets.dontPass) {
        return {
          kind: 'bet',
          action: 'BET PASS LINE',
          explanation: 'The Pass Line is the fundamental craps bet with a low house edge.',
          riskLabel: 'House edge: 1.41%',
          riskClass: 'risk-good',
          detail: 'The Pass Line bet wins on 7 or 11 on the come-out roll, and loses on 2, 3, or 12 ("craps"). Any other number (4, 5, 6, 8, 9, 10) sets a "point." Once a point is set, the Pass Line wins if the point is rolled again before a 7. The Don\'t Pass (betting against the shooter) has a slightly lower edge at 1.36%, but most players prefer the Pass Line for the social aspect.'
        };
      }
      return {
        kind: 'roll',
        action: 'ROLL THE DICE',
        explanation: 'Your bet is placed. Roll to begin!',
        riskLabel: 'Ready',
        riskClass: 'risk-good',
        detail: 'On the come-out roll: 7 or 11 is a "natural" and wins the Pass Line. 2, 3, or 12 is "craps" and loses the Pass Line (Don\'t Pass wins on 2 and 3, pushes on 12). Any other number becomes the point.'
      };
    }

    // ── Point phase ───────────────────────────────────────────
    if (phase === 'point') {

      // Suggest odds first — best EV move available.
      if (bets.pass > 0 && bets.passOdds === 0) {
        return {
          kind: 'odds',
          action: 'ADD ODDS BEHIND PASS',
          explanation: 'The Odds bet has zero house edge — the best bet in any casino.',
          riskLabel: 'House edge: 0%',
          riskClass: 'risk-good',
          detail: 'After the point is established, you can place an Odds bet behind your Pass Line bet. It pays at TRUE odds with NO house edge: 2:1 on 4/10, 3:2 on 5/9, and 6:5 on 6/8. Smart craps players make minimum Pass Line bets and maximum Odds bets — every dollar moved from Pass Line to Odds drops the combined house edge.'
        };
      }

      if (bets.dontPass > 0 && bets.dontPassOdds === 0) {
        return {
          kind: 'odds',
          action: "LAY ODDS BEHIND DON'T PASS",
          explanation: 'Lay odds also has zero house edge.',
          riskLabel: 'House edge: 0%',
          riskClass: 'risk-good',
          detail: 'Lay odds behind Don\'t Pass pay the inverse of pass odds: 1:2 on 4/10, 2:3 on 5/9, 5:6 on 6/8. You risk more to win less, but there\'s no house edge on this portion.'
        };
      }

      // Established come-points without odds taken
      const comePointWithoutOdds = [4, 5, 6, 8, 9, 10].find(n => bets.comePoints[n] > 0 && bets.comeOdds[n] === 0);
      if (comePointWithoutOdds) {
        return {
          kind: 'odds',
          action: 'TAKE ODDS BEHIND COME ' + comePointWithoutOdds,
          explanation: 'Same 0% edge applies behind come bets too.',
          riskLabel: 'House edge: 0%',
          riskClass: 'risk-good',
          detail: 'Odds bets work behind come points the same way they work behind the pass line. Any dollar moved from a flat come bet to come-odds reduces your overall house edge.'
        };
      }

      // No come bet yet — recommend it
      if (bets.pass > 0 && bets.come === 0 && !hasAnyComePoint(bets) && bets.dontPass === 0 && bets.dontCome === 0) {
        return {
          kind: 'come',
          action: 'ADD COME BET',
          explanation: 'Build coverage on multiple numbers at the same low edge as Pass.',
          riskLabel: 'House edge: 1.41%',
          riskClass: 'risk-good',
          detail: 'A Come bet works exactly like a Pass Line bet, but starts on the next roll. After it travels to a number, you can take odds behind it and roll for two winners on every roll. Stacking 1-2 come bets behind a pass is classic disciplined play.'
        };
      }

      // Flag high-edge place bets
      if (bets.place[4] > 0 || bets.place[10] > 0) {
        return {
          kind: 'caution',
          action: 'CAUTION: PLACE 4/10',
          explanation: '6.67% house edge — much higher than Pass + Odds.',
          riskLabel: 'House edge: 6.67%',
          riskClass: 'risk-bad',
          detail: 'Place 4 and Place 10 pay 9:5 but their true odds are 2:1 — the gap is large. You\'re much better off placing 6 or 8 (1.52% edge), or buying the 4/10 if the table allows it. Most disciplined players skip 4/10 entirely.'
        };
      }

      if (bets.place[5] > 0 || bets.place[9] > 0) {
        return {
          kind: 'note',
          action: 'OK: PLACE 5/9',
          explanation: '4.00% edge — better than the field, worse than pass.',
          riskLabel: 'House edge: 4.00%',
          riskClass: 'risk-ok',
          detail: 'Place 5 and Place 9 pay 7:5. The edge is moderate — between the pass line (1.41%) and the field (5.56%). Reasonable for adding action without being a tilt bet.'
        };
      }

      if (bets.field > 0) {
        return {
          kind: 'caution',
          action: 'CAUTION: FIELD BET',
          explanation: 'High house edge despite covering 7 of 11 numbers.',
          riskLabel: 'House edge: 5.56%',
          riskClass: 'risk-bad',
          detail: 'The Field looks tempting — 2, 3, 4, 9, 10, 11, 12 all win — but the most common totals (5, 6, 7, 8) all lose. There are 20 ways to roll a non-field number vs 16 ways for a field number. Even with the 2:1 on 2 and 3:1 on 12, the house holds 5.56%.'
        };
      }

      // Dark-side education
      if (bets.dontPass > 0 || bets.dontCome > 0 || hasAnyDontComePoint(bets)) {
        return {
          kind: 'note',
          action: 'DARK SIDE STRATEGY',
          explanation: "Betting with the house. Slightly lower edge, lay odds for 0%.",
          riskLabel: 'House edge: 1.36%',
          riskClass: 'risk-good',
          detail: 'Don\'t-side bets win when the shooter sevens-out before making the point. The flat-bet edge (1.36%) is marginally lower than the Pass Line (1.41%). The trade-off is psychological — you\'re rooting against the table. Lay odds for 0% house edge on the back end.'
        };
      }

      return {
        kind: 'roll',
        action: 'ROLL FOR THE POINT',
        explanation: 'Point is ' + point + '. Roll it before a 7!',
        riskLabel: 'Point: ' + point,
        riskClass: 'risk-ok',
        detail: 'During point phase, only two outcomes matter for the Pass Line: rolling the point wins, rolling a 7 loses. Other totals are neutral for pass/dontPass but resolve field, place, and come bets. Make-the-point probabilities: 4/10 → 33%, 5/9 → 40%, 6/8 → 45%.'
      };
    }

    return null;
  }

  function hasAnyComePoint(bets) {
    return [4, 5, 6, 8, 9, 10].some(n => bets.comePoints[n] > 0);
  }

  function hasAnyDontComePoint(bets) {
    return [4, 5, 6, 8, 9, 10].some(n => bets.dontComePoints[n] > 0);
  }

  window.CR_STRATEGY = { getBettingHint };
})();
