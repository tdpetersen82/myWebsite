const Strategy = (() => {

    /**
     * Get betting recommendation.
     * @param {string|null} currentBetType - 'player', 'banker', 'tie', or null
     * @returns recommendation object
     */
    function getRecommendation(currentBetType) {
        if (currentBetType === 'tie') {
            return {
                action: 'AVOID TIE BET',
                explanation: 'Tie bet has a 14.36% house edge \u2014 avoid this bet.',
                riskLabel: 'House edge: 14.36%',
                riskClass: 'risk-bad',
                detailedExplanation: 'The Tie bet pays 8:1, which sounds attractive, but ties only occur about 9.5% of the time. ' +
                    'The true odds should pay about 9.5:1, but the casino only pays 8:1, giving the house a massive 14.36% edge. ' +
                    'For every $100 wagered on Tie over time, you can expect to lose $14.36. ' +
                    'By comparison, the Banker bet only costs you $1.06 per $100. ' +
                    'The Tie bet is one of the worst bets in the entire casino. Professional baccarat players never touch it.',
            };
        }

        return {
            action: 'BET BANKER',
            explanation: 'Banker bet has the lowest house edge at 1.06% even after 5% commission.',
            riskLabel: 'House edge: 1.06%',
            riskClass: 'risk-good',
            detailedExplanation: 'In Punto Banco baccarat, the Banker hand wins slightly more often than the Player hand ' +
                '(about 45.86% vs 44.62%, with 9.52% ties). This is because the Banker draws last and its third-card rules ' +
                'are slightly more favorable.\n\n' +
                'To compensate, casinos charge a 5% commission on Banker wins. Even after this commission, ' +
                'the Banker bet has a house edge of only 1.06%, compared to 1.24% for the Player bet.\n\n' +
                'The third-card drawing rules are automatic in Punto Banco \u2014 neither the Player nor the Banker ' +
                'makes any decisions. The Player draws on 0-5 and stands on 6-7. The Banker\'s draw depends on ' +
                'its own total and the Player\'s third card (if drawn).\n\n' +
                'The Tie bet pays 8:1 but has a 14.36% house edge \u2014 it\'s a trap bet that should always be avoided. ' +
                'Optimal baccarat strategy is simple: always bet Banker.',
        };
    }

    return { getRecommendation };
})();
