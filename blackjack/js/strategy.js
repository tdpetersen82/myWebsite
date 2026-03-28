const Strategy = (() => {
    // Basic strategy tables
    // Key: player total or pair rank, Value: action per dealer upcard (2-A)
    // H=Hit, S=Stand, D=Double(hit if not allowed), P=Split, Ds=Double(stand if not), Rh=Surrender(hit if not), Rs=Surrender(stand if not)

    // Hard totals: [2, 3, 4, 5, 6, 7, 8, 9, 10, A]
    const HARD = {
        5:  'HHHHHHHHHH',
        6:  'HHHHHHHHHH',
        7:  'HHHHHHHHHH',
        8:  'HHHHHHHHHH',
        9:  'HHDDDHHHHH',
        10: 'DDDDDDDDHH',
        11: 'DDDDDDDDDD',
        12: 'HHSSSHHHHH',
        13: 'SSSSSHHHHH',
        14: 'SSSSSHHHHH',
        15: 'SSSSSHHHRH',
        16: 'SSSSSHHRRR',
        17: 'SSSSSSSSSS',
        18: 'SSSSSSSSSS',
        19: 'SSSSSSSSSS',
        20: 'SSSSSSSSSS',
        21: 'SSSSSSSSSS',
    };

    // Soft totals (Ace + X): [2, 3, 4, 5, 6, 7, 8, 9, 10, A]
    const SOFT = {
        13: 'HHDDDHHHHH', // A,2
        14: 'HHDDDHHHHH', // A,3
        15: 'HHDDDHHHHH', // A,4
        16: 'HHDDDHHHHH', // A,5
        17: 'HDDDDHHHHH', // A,6
        18: 'SDDDDSSHHS', // A,7
        19: 'SSSSDSSSSS', // A,8
        20: 'SSSSSSSSSS', // A,9
        21: 'SSSSSSSSSS', // A,10
    };

    // Pairs: [2, 3, 4, 5, 6, 7, 8, 9, 10, A]
    const PAIRS = {
        'A': 'PPPPPPPPPP',
        '2': 'PPPPPPHHHH',
        '3': 'PPPPPPHHHH',
        '4': 'HHHPPHHHHH',
        '5': 'DDDDDDDDHH',
        '6': 'PPPPPHHHHH',
        '7': 'PPPPPPHHHH',
        '8': 'PPPPPPPPPP',
        '9': 'PPPPPSPPSS',
        '10':'SSSSSSSSSS',
    };

    const DEALER_INDEX = { '2':0,'3':1,'4':2,'5':3,'6':4,'7':5,'8':6,'9':7,'10':8,'A':9 };

    const ACTION_MAP = {
        'H': 'HIT',
        'S': 'STAND',
        'D': 'DOUBLE',
        'P': 'SPLIT',
        'R': 'SURRENDER',
    };

    // Probability of busting if you hit on a hard total
    const BUST_IF_HIT = {
        12: 31, 13: 39, 14: 56, 15: 58, 16: 62, 17: 69, 18: 77, 19: 85, 20: 92, 21: 100,
    };

    // Dealer bust probability by upcard
    const DEALER_BUST = {
        '2': 35, '3': 37, '4': 40, '5': 42, '6': 44,
        '7': 26, '8': 24, '9': 23, '10': 23, 'A': 17,
    };

    // Approximate player advantage (positive = player-favored) per situation
    // Used to derive a "confidence" or "win rate" label
    // Format: { action: win% for recommended action }
    // Based on expected value from basic strategy simulations
    const EV_TABLE = {
        HIT: {
            low:  { win: 58, label: 'Win rate ≈58%' },   // low totals, hitting is clearly good
            mid:  { win: 42, label: 'Win rate ≈42%' },   // mid totals vs strong dealer
            high: { win: 35, label: 'Win rate ≈35%' },   // high totals, risky but better than standing
        },
        STAND: {
            low:  { win: 58, label: 'Dealer busts ≈{bust}%' },  // standing on low total, relying on dealer bust
            mid:  { win: 52, label: 'Win rate ≈52%' },
            high: { win: 65, label: 'Win rate ≈65%' },
        },
        DOUBLE: {
            default: { win: 62, label: 'Win rate ≈62%' },
            soft:    { win: 56, label: 'Win rate ≈56%' },
        },
        SPLIT: {
            aces:    { win: 64, label: 'Win rate ≈64%' },
            eights:  { win: 48, label: 'Win rate ≈48%' },
            default: { win: 52, label: 'Win rate ≈52%' },
        },
        SURRENDER: {
            default: { win: 25, label: 'Win rate ≈25%' },
        },
    };

    const EXPLANATIONS = {
        HIT: {
            low: 'Your total is low enough that hitting gives you a strong chance to improve without busting.',
            mid: 'The dealer is likely to make a strong hand, so you need to try to improve yours.',
            high: 'Even with bust risk, standing on this total against the dealer\'s strong upcard has worse expected value.',
        },
        STAND: {
            low: 'The dealer has a weak upcard and is likely to bust. No need to risk your hand.',
            mid: 'Your hand is strong enough to win if the dealer doesn\'t improve significantly.',
            high: 'You have a very strong total. Standing is always correct here.',
        },
        DOUBLE: {
            default: 'You\'re in a strong position to win this hand. Doubling maximizes your profit on a favorable situation.',
            soft: 'With a soft hand, you can\'t bust on one card, and the dealer is weak. Doubling is optimal.',
        },
        SPLIT: {
            aces: 'Always split aces \u2014 two chances at making 21 is far better than a soft 12.',
            eights: 'Always split 8s \u2014 16 is the worst hand in blackjack, but two 8s give you a fresh start.',
            default: 'Splitting gives you two hands with better expected value than playing the pair as one.',
        },
        SURRENDER: {
            default: 'This is a losing hand against a strong dealer upcard. Surrendering saves half your bet.',
        },
    };

    // Detailed beginner explanations for the "Learn More" section
    const DETAILED = {
        HIT: {
            low: 'With a total of {pv}, you have plenty of room to improve. The risk of busting is very low because most cards (2–9) will give you a better hand. Even a 10-value card won\'t bust you. Hitting here is almost always the right call regardless of what the dealer shows.',
            mid: 'The dealer is showing a {dupc}, which is a strong upcard — they\'re likely to end up with 17–21. Your current total of {pv} probably won\'t beat that, so you need to try to improve. Yes, there\'s a {bust}% chance of busting, but standing would lose more often in the long run.',
            high: 'This is a tough spot. Your total of {pv} has a {bust}% bust risk if you hit. However, the dealer\'s {dupc} is strong enough that standing loses even more often statistically. Basic strategy says the "less bad" play here is to hit. This is why the house has an edge — sometimes there\'s no great option.',
        },
        STAND: {
            low: 'The dealer is showing a {dupc}, which is considered a "weak" upcard. Dealers with 2–6 showing bust roughly {bust}% of the time because they must hit until reaching 17+. Your job here is to avoid busting yourself and let the dealer take the risk.',
            mid: 'Your total of {pv} is decent but not unbeatable. The dealer\'s {dupc} gives them a moderate chance of beating you, but hitting would risk busting at {bustIfHit}%. The math says standing wins slightly more often in this situation.',
            high: 'With {pv}, you have a very strong hand. Only a few totals can beat you (if any). Hitting would risk busting at {bustIfHit}% with almost no upside since you\'re already likely to win. Standing is clearly correct.',
        },
        DOUBLE: {
            default: 'Doubling down means you bet an extra equal amount but only receive ONE more card. You do this when the math strongly favors you — your total of {pv} is likely to improve with one card, and the dealer\'s {dupc} is weak. By doubling, you\'re maximizing profit in a favorable situation.',
            soft: 'A "soft" hand means you have an Ace counted as 11. The beauty of soft hands is you CANNOT bust with one more card — if you go over 21, the Ace drops to 1. Combined with the dealer\'s weak {dupc}, this is a great spot to double your bet risk-free.',
        },
        SPLIT: {
            aces: 'Aces are the most powerful card in blackjack. A pair of Aces gives you soft 12 (a weak hand), but splitting them gives you two separate chances to hit 21 with a 10-value card. The probability of getting at least one strong hand is much higher when you split.',
            eights: 'A pair of 8s gives you 16, which is the worst hand in blackjack — too high to hit safely (62% bust risk) but too low to stand confidently. By splitting, each 8 becomes the start of a new hand. An 8 is a reasonable starting card that can become 18 (a solid hand) with a 10-value card.',
            default: 'Splitting pairs creates two separate hands, each with its own bet. You do this when the individual cards have a better expected outcome played separately than as a combined total. The dealer\'s {dupc} is weak enough that two moderate hands are better than one combined hand.',
        },
        SURRENDER: {
            default: 'Surrendering gives back half your bet and ends the hand immediately. It sounds bad, but against the dealer\'s {dupc} with your total of {pv}, you\'d lose MORE than 50% of the time playing it out. Getting back 50 cents on the dollar is actually better than the expected ~{lossRate}% loss rate if you play the hand.',
        },
    };

    function dealerUpcardIndex(dealerCard) {
        const r = dealerCard.rank === 'J' || dealerCard.rank === 'Q' || dealerCard.rank === 'K' ? '10' : dealerCard.rank;
        return DEALER_INDEX[r];
    }

    function dealerUpcardLabel(dealerCard) {
        return dealerCard.rank === 'J' || dealerCard.rank === 'Q' || dealerCard.rank === 'K' ? '10' : dealerCard.rank;
    }

    function getRecommendation(playerCards, dealerUpcard, canSplitHand, canDoubleDown, canSurrender) {
        const di = dealerUpcardIndex(dealerUpcard);
        const pv = Hand.value(playerCards);
        const soft = Hand.isSoft(playerCards);
        const pair = Hand.isPair(playerCards);
        let action;

        // Check pairs first
        if (pair && canSplitHand) {
            const pairRank = playerCards[0].rank === 'J' || playerCards[0].rank === 'Q' || playerCards[0].rank === 'K' ? '10' : playerCards[0].rank;
            const code = PAIRS[pairRank]?.[di];
            if (code === 'P') {
                action = 'SPLIT';
            }
        }

        // Soft totals
        if (!action && soft && SOFT[pv]) {
            const code = SOFT[pv][di];
            action = ACTION_MAP[code] || 'HIT';
        }

        // Hard totals
        if (!action) {
            const total = Math.min(Math.max(pv, 5), 21);
            const code = HARD[total]?.[di] || 'H';
            action = ACTION_MAP[code] || 'HIT';
        }

        // Fallback if action not available
        if (action === 'DOUBLE' && !canDoubleDown) action = (pv >= 17) ? 'STAND' : 'HIT';
        if (action === 'SPLIT' && !canSplitHand) action = (pv >= 17) ? 'STAND' : 'HIT';
        if (action === 'SURRENDER' && !canSurrender) action = (pv >= 17) ? 'STAND' : 'HIT';

        const dupc = dealerUpcardLabel(dealerUpcard);
        return {
            action,
            explanation: buildExplanation(action, playerCards, dealerUpcard, pv, soft, pair),
            riskLabel: buildRiskLabel(action, pv, soft, pair, playerCards, dupc),
            riskClass: buildRiskClass(action, pv, soft, pair, playerCards, dupc),
            detailedExplanation: buildDetailedExplanation(action, playerCards, dealerUpcard, pv, soft, pair),
        };
    }

    function buildRiskLabel(action, pv, soft, pair, playerCards, dupc) {
        const bust = BUST_IF_HIT[pv] || 0;
        const dealerBust = DEALER_BUST[dupc] || 25;

        switch (action) {
            case 'HIT':
                if (pv <= 11) return 'Bust risk: 0%';
                return 'Bust risk: ' + bust + '%';
            case 'STAND':
                return 'Dealer busts: ' + dealerBust + '%';
            case 'DOUBLE':
                if (soft) return EV_TABLE.DOUBLE.soft.label;
                return EV_TABLE.DOUBLE.default.label;
            case 'SPLIT':
                if (playerCards[0].rank === 'A') return EV_TABLE.SPLIT.aces.label;
                if (playerCards[0].rank === '8') return EV_TABLE.SPLIT.eights.label;
                return EV_TABLE.SPLIT.default.label;
            case 'SURRENDER':
                return EV_TABLE.SURRENDER.default.label;
            default:
                return '';
        }
    }

    function buildRiskClass(action, pv, soft, pair, playerCards, dupc) {
        // Return risk-good (green), risk-ok (yellow), or risk-bad (red)
        switch (action) {
            case 'HIT': {
                const bust = BUST_IF_HIT[pv] || 0;
                if (bust <= 35) return 'risk-good';
                if (bust <= 60) return 'risk-ok';
                return 'risk-bad';
            }
            case 'STAND': {
                const db = DEALER_BUST[dupc] || 25;
                if (db >= 40) return 'risk-good';
                if (db >= 30) return 'risk-ok';
                return 'risk-bad';
            }
            case 'DOUBLE':
                return 'risk-good';
            case 'SPLIT':
                if (playerCards[0].rank === 'A') return 'risk-good';
                if (playerCards[0].rank === '8') return 'risk-ok';
                return 'risk-ok';
            case 'SURRENDER':
                return 'risk-bad';
            default:
                return 'risk-ok';
        }
    }

    function buildExplanation(action, playerCards, dealerUpcard, pv, soft, pair) {
        const dv = Deck.cardValue(dealerUpcard);
        const dealerWeak = dv >= 2 && dv <= 6;

        switch (action) {
            case 'HIT':
                if (pv <= 11) return EXPLANATIONS.HIT.low;
                if (dealerWeak) return EXPLANATIONS.HIT.mid;
                return EXPLANATIONS.HIT.high;
            case 'STAND':
                if (pv >= 19) return EXPLANATIONS.STAND.high;
                if (dealerWeak) return EXPLANATIONS.STAND.low;
                return EXPLANATIONS.STAND.mid;
            case 'DOUBLE':
                if (soft) return EXPLANATIONS.DOUBLE.soft;
                return EXPLANATIONS.DOUBLE.default;
            case 'SPLIT':
                if (playerCards[0].rank === 'A') return EXPLANATIONS.SPLIT.aces;
                if (playerCards[0].rank === '8') return EXPLANATIONS.SPLIT.eights;
                return EXPLANATIONS.SPLIT.default;
            case 'SURRENDER':
                return EXPLANATIONS.SURRENDER.default;
            default:
                return '';
        }
    }

    function buildDetailedExplanation(action, playerCards, dealerUpcard, pv, soft, pair) {
        const dupc = dealerUpcardLabel(dealerUpcard);
        const bust = BUST_IF_HIT[pv] || 0;
        const dealerBust = DEALER_BUST[dupc] || 25;
        const dv = Deck.cardValue(dealerUpcard);
        const dealerWeak = dv >= 2 && dv <= 6;

        function fill(template) {
            return template
                .replace(/\{pv\}/g, pv)
                .replace(/\{dupc\}/g, dupc)
                .replace(/\{bust\}/g, bust)
                .replace(/\{bustIfHit\}/g, bust)
                .replace(/\{dealerBust\}/g, dealerBust)
                .replace(/\{lossRate\}/g, 75);
        }

        switch (action) {
            case 'HIT':
                if (pv <= 11) return fill(DETAILED.HIT.low);
                if (dealerWeak) return fill(DETAILED.HIT.mid);
                return fill(DETAILED.HIT.high);
            case 'STAND':
                if (pv >= 19) return fill(DETAILED.STAND.high);
                if (dealerWeak) return fill(DETAILED.STAND.low);
                return fill(DETAILED.STAND.mid);
            case 'DOUBLE':
                if (soft) return fill(DETAILED.DOUBLE.soft);
                return fill(DETAILED.DOUBLE.default);
            case 'SPLIT':
                if (playerCards[0].rank === 'A') return fill(DETAILED.SPLIT.aces);
                if (playerCards[0].rank === '8') return fill(DETAILED.SPLIT.eights);
                return fill(DETAILED.SPLIT.default);
            case 'SURRENDER':
                return fill(DETAILED.SURRENDER.default);
            default:
                return '';
        }
    }

    return { getRecommendation };
})();
