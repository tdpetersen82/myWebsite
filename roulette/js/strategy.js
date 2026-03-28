const Strategy = (() => {

    // Bet type info for hints
    const BET_INFO = {
        straight: {
            name: 'Straight Up',
            payout: '35:1',
            probability: '2.7%',
            coverage: '1 number',
            risk: 'high',
        },
        split: {
            name: 'Split',
            payout: '17:1',
            probability: '5.4%',
            coverage: '2 numbers',
            risk: 'high',
        },
        street: {
            name: 'Street',
            payout: '11:1',
            probability: '8.1%',
            coverage: '3 numbers',
            risk: 'high',
        },
        corner: {
            name: 'Corner',
            payout: '8:1',
            probability: '10.8%',
            coverage: '4 numbers',
            risk: 'medium',
        },
        sixline: {
            name: 'Six Line',
            payout: '5:1',
            probability: '16.2%',
            coverage: '6 numbers',
            risk: 'medium',
        },
        dozen: {
            name: 'Dozen',
            payout: '2:1',
            probability: '32.4%',
            coverage: '12 numbers',
            risk: 'low',
        },
        column: {
            name: 'Column',
            payout: '2:1',
            probability: '32.4%',
            coverage: '12 numbers',
            risk: 'low',
        },
        red: {
            name: 'Red',
            payout: '1:1',
            probability: '48.6%',
            coverage: '18 numbers',
            risk: 'low',
        },
        black: {
            name: 'Black',
            payout: '1:1',
            probability: '48.6%',
            coverage: '18 numbers',
            risk: 'low',
        },
        odd: {
            name: 'Odd',
            payout: '1:1',
            probability: '48.6%',
            coverage: '18 numbers',
            risk: 'low',
        },
        even: {
            name: 'Even',
            payout: '1:1',
            probability: '48.6%',
            coverage: '18 numbers',
            risk: 'low',
        },
        low: {
            name: 'Low (1-18)',
            payout: '1:1',
            probability: '48.6%',
            coverage: '18 numbers',
            risk: 'low',
        },
        high: {
            name: 'High (19-36)',
            payout: '1:1',
            probability: '48.6%',
            coverage: '18 numbers',
            risk: 'low',
        },
    };

    const RISK_CLASS = {
        low: 'risk-good',
        medium: 'risk-ok',
        high: 'risk-bad',
    };

    function getHint(bets) {
        if (!bets || bets.length === 0) {
            return {
                action: 'PLACE A BET',
                explanation: 'Click on the betting table to place chips. Outside bets (Red/Black, Odd/Even) have the best win frequency.',
                riskLabel: 'House edge: 2.7%',
                riskClass: 'risk-ok',
                detailedExplanation: 'In European Roulette, every bet has the same house edge of 2.7% because there is only one zero pocket. This means for every $100 wagered, you can expect to lose $2.70 on average over time. Compare this to American Roulette (double zero) which has a 5.26% house edge. Outside bets (Red/Black, Odd/Even, High/Low) win almost half the time and are great for beginners. Inside bets (Straight, Split, Street) pay more but hit less often.',
            };
        }

        // Analyze current bets
        let totalBet = 0;
        let coverageSet = new Set();
        let betTypes = {};

        bets.forEach(b => {
            totalBet += b.amount;
            b.numbers.forEach(n => coverageSet.add(n));
            betTypes[b.type] = (betTypes[b.type] || 0) + b.amount;
        });

        const coverage = coverageSet.size;
        const coveragePct = ((coverage / 37) * 100).toFixed(1);
        const hasZero = coverageSet.has(0);

        // Determine primary bet type for info display
        let primaryType = null;
        let maxAmount = 0;
        for (const type in betTypes) {
            if (betTypes[type] > maxAmount) {
                maxAmount = betTypes[type];
                primaryType = type;
            }
        }

        const info = BET_INFO[primaryType] || BET_INFO.straight;

        // Build action text
        let action;
        if (coverage >= 25) {
            action = 'HIGH COVERAGE';
        } else if (coverage >= 13) {
            action = 'MODERATE COVERAGE';
        } else {
            action = 'LOW COVERAGE';
        }

        // Build explanation
        let explanation;
        if (bets.length === 1) {
            explanation = info.name + ' bet \u2014 pays ' + info.payout + ' with ' + info.probability + ' chance of winning.';
        } else {
            explanation = bets.length + ' bets covering ' + coverage + ' of 37 numbers (' + coveragePct + '%). Total wagered: $' + totalBet + '.';
        }

        // Risk label
        const riskLabel = 'Win prob: ' + coveragePct + '% | Payout: ' + info.payout;
        const riskClass = coverage >= 18 ? 'risk-good' : (coverage >= 7 ? 'risk-ok' : 'risk-bad');

        // Detailed explanation
        let detailed = 'You are covering ' + coverage + ' out of 37 numbers (' + coveragePct + '% of the wheel). ';
        if (!hasZero && coverage > 0) {
            detailed += 'Note: You have NOT covered zero (0). The green zero is what gives the house its edge. ';
        }
        detailed += 'Every bet in European Roulette has the same 2.7% house edge regardless of type. ';
        detailed += 'The difference between bet types is volatility: inside bets (Straight, Split) pay big but rarely hit, while outside bets (Red/Black, Dozens) hit more often but pay less. ';
        detailed += 'No betting strategy can overcome the house edge in the long run, but managing your bankroll and sticking to outside bets extends your playing time.';

        return { action, explanation, riskLabel, riskClass, detailedExplanation: detailed };
    }

    function getResultHint(result, bets, totalWinnings) {
        const isRed = CONFIG.RED_NUMBERS.includes(result);
        const color = result === 0 ? 'green' : (isRed ? 'red' : 'black');
        const isOdd = result > 0 && result % 2 === 1;
        const isLow = result >= 1 && result <= 18;
        const dozen = result === 0 ? 'none' : (result <= 12 ? '1st' : (result <= 24 ? '2nd' : '3rd'));

        let action, explanation, riskLabel, riskClass;

        if (totalWinnings > 0) {
            action = 'WIN! +$' + totalWinnings;
            riskClass = 'risk-good';
        } else {
            action = 'NO WIN';
            riskClass = 'risk-bad';
        }

        explanation = 'Ball landed on ' + result + ' (' + color + '). ';
        if (result > 0) {
            explanation += (isOdd ? 'Odd' : 'Even') + ', ' + (isLow ? 'Low (1-18)' : 'High (19-36)') + ', ' + dozen + ' dozen.';
        } else {
            explanation += 'Zero loses all outside bets.';
        }

        riskLabel = 'House edge: 2.7%';

        const detailed = 'The result ' + result + ' is ' + color + '. ' +
            'In European Roulette, zero is the only green number and is what creates the house edge. ' +
            'When 0 comes up, all outside bets (Red/Black, Odd/Even, High/Low, Dozens, Columns) lose. ' +
            'Only bets that specifically include 0 win. This happens roughly once every 37 spins (2.7% of the time). ' +
            'Over many spins, this single zero pocket is responsible for the casino\'s profit.';

        return { action, explanation, riskLabel, riskClass, detailedExplanation: detailed };
    }

    return { getHint, getResultHint };
})();
