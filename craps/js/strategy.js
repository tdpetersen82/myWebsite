const Strategy = (() => {

    function getBettingHint(state) {
        // state: { phase, point, bets }
        // bets: { pass, dontPass, odds, field, place6, place8 }

        if (state.phase === 'COME_OUT') {
            if (!state.bets.pass && !state.bets.dontPass) {
                return {
                    action: 'BET PASS LINE',
                    explanation: 'The Pass Line is the fundamental craps bet with a low house edge.',
                    riskLabel: 'House edge: 1.41%',
                    riskClass: 'risk-good',
                    detail: 'The Pass Line bet wins on 7 or 11 on the come-out roll, and loses on 2, 3, or 12 (called "craps"). Any other number (4, 5, 6, 8, 9, 10) sets a "point." Once a point is set, the Pass Line wins if the point is rolled again before a 7. The house edge of 1.41% makes this one of the best bets in the casino. The Don\'t Pass (betting against the shooter) has a slightly lower edge at 1.36%, but most players prefer Pass Line for the social aspect.'
                };
            }
            if (state.bets.pass || state.bets.dontPass) {
                return {
                    action: 'ROLL THE DICE',
                    explanation: 'Your bet is placed. Roll to begin!',
                    riskLabel: 'Ready',
                    riskClass: 'risk-good',
                    detail: 'On the come-out roll: 7 or 11 is a "natural" and wins the Pass Line. 2, 3, or 12 is "craps" and loses the Pass Line (Don\'t Pass wins on 2 and 3, pushes on 12). Any other number becomes the point, and the game enters the point phase.'
                };
            }
        }

        if (state.phase === 'POINT') {
            // Recommend odds bet if not placed
            if (state.bets.pass && !state.bets.odds) {
                return {
                    action: 'ADD ODDS BET',
                    explanation: 'The Odds bet has zero house edge - the best bet in any casino!',
                    riskLabel: 'House edge: 0%',
                    riskClass: 'risk-good',
                    detail: 'The Odds bet is placed behind your Pass Line bet after a point is established. It pays at true odds with NO house edge: 2:1 on 4/10, 3:2 on 5/9, and 6:5 on 6/8. This is literally the only bet in a casino with zero house edge. You can bet up to 3x your Pass Line bet on odds. The more you put on odds relative to your Pass Line bet, the lower the overall house edge on your combined wager. Smart craps players make minimum Pass Line bets and maximum Odds bets.'
                };
            }
            if (state.bets.dontPass && !state.bets.odds) {
                return {
                    action: 'ADD ODDS BET',
                    explanation: 'Lay odds behind Don\'t Pass for zero house edge.',
                    riskLabel: 'House edge: 0%',
                    riskClass: 'risk-good',
                    detail: 'Laying odds behind Don\'t Pass also has zero house edge. The payouts are the reverse of Pass odds: 1:2 on 4/10, 2:3 on 5/9, and 5:6 on 6/8. Since you\'re betting with the house (that 7 comes before the point), you need to risk more to win less - but there\'s no house edge at all on this portion of your bet.'
                };
            }
            if (state.bets.field) {
                return {
                    action: 'CAUTION: FIELD BET',
                    explanation: 'The Field bet has a high house edge. Consider sticking to Pass/Odds.',
                    riskLabel: 'House edge: 5.56%',
                    riskClass: 'risk-bad',
                    detail: 'The Field bet wins on 2, 3, 4, 9, 10, 11, or 12 - which looks like a lot of numbers. However, the most commonly rolled numbers (5, 6, 7, 8) are NOT field numbers. There are 20 ways to roll a non-field number vs 16 ways to roll a field number. Even with the 2:1 payout on 2 and 3:1 on 12, the house still holds a 5.56% edge. Compare that to the Pass Line (1.41%) or Odds (0%).'
                };
            }
            return {
                action: 'ROLL FOR THE POINT',
                explanation: 'Point is ' + state.point + '. Roll it before a 7!',
                riskLabel: 'Point: ' + state.point,
                riskClass: 'risk-ok',
                detail: 'During the point phase, only two outcomes matter for the Pass Line: rolling the point number wins, rolling a 7 loses ("seven out"). All other numbers are neutral for Pass/Don\'t Pass (but may affect Field and Place bets). The probability of making the point varies: 4/10 have a 33.3% chance, 5/9 have 40%, and 6/8 have 45.5%.'
            };
        }

        return null;
    }

    return { getBettingHint };
})();
