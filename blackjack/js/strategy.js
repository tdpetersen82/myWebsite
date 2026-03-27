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

    function dealerUpcardIndex(dealerCard) {
        const r = dealerCard.rank === 'J' || dealerCard.rank === 'Q' || dealerCard.rank === 'K' ? '10' : dealerCard.rank;
        return DEALER_INDEX[r];
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

        return { action, explanation: buildExplanation(action, playerCards, dealerUpcard, pv, soft, pair) };
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

    return { getRecommendation };
})();
