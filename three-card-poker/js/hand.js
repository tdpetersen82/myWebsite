const Hand = (() => {
    // Hand ranking constants (higher = better)
    const RANKS = {
        HIGH_CARD: 0,
        PAIR: 1,
        FLUSH: 2,
        STRAIGHT: 3,       // In 3-card poker, straight > flush
        THREE_OF_A_KIND: 4,
        STRAIGHT_FLUSH: 5,
    };

    const RANK_NAMES = {
        0: 'High Card',
        1: 'Pair',
        2: 'Flush',
        3: 'Straight',
        4: 'Three of a Kind',
        5: 'Straight Flush',
    };

    // Sort cards by rank value descending
    function sortCards(cards) {
        return [...cards].sort((a, b) => Deck.rankValue(b) - Deck.rankValue(a));
    }

    function isFlush(cards) {
        return cards[0].suit === cards[1].suit && cards[1].suit === cards[2].suit;
    }

    function isStraight(cards) {
        const sorted = sortCards(cards);
        const vals = sorted.map(c => Deck.rankValue(c));

        // Normal straight: consecutive values
        if (vals[0] - vals[1] === 1 && vals[1] - vals[2] === 1) return true;

        // Ace-low straight: A-2-3
        if (vals[0] === 14 && vals[1] === 3 && vals[2] === 2) return true;

        return false;
    }

    function isThreeOfAKind(cards) {
        return cards[0].rank === cards[1].rank && cards[1].rank === cards[2].rank;
    }

    function isPair(cards) {
        const sorted = sortCards(cards);
        return (sorted[0].rank === sorted[1].rank) || (sorted[1].rank === sorted[2].rank);
    }

    // Evaluate a 3-card hand and return { rank, kickers }
    // kickers is an array of card values used for tiebreaking, highest first
    function evaluate(cards) {
        const flush = isFlush(cards);
        const straight = isStraight(cards);
        const trips = isThreeOfAKind(cards);
        const pair = isPair(cards);
        const sorted = sortCards(cards);
        const vals = sorted.map(c => Deck.rankValue(c));

        // For A-2-3 straight, Ace is low
        function straightKickers() {
            if (vals[0] === 14 && vals[1] === 3 && vals[2] === 2) {
                return [3]; // 3-high straight (A is low)
            }
            return [vals[0]]; // highest card of the straight
        }

        if (flush && straight) {
            return { rank: RANKS.STRAIGHT_FLUSH, kickers: straightKickers() };
        }
        if (trips) {
            return { rank: RANKS.THREE_OF_A_KIND, kickers: [vals[0]] };
        }
        if (straight) {
            return { rank: RANKS.STRAIGHT, kickers: straightKickers() };
        }
        if (flush) {
            return { rank: RANKS.FLUSH, kickers: vals };
        }
        if (pair) {
            // Put pair value first, then kicker
            if (sorted[0].rank === sorted[1].rank) {
                return { rank: RANKS.PAIR, kickers: [vals[0], vals[2]] };
            } else {
                return { rank: RANKS.PAIR, kickers: [vals[1], vals[0]] };
            }
        }
        return { rank: RANKS.HIGH_CARD, kickers: vals };
    }

    // Compare two evaluated hands. Return: 1 if a wins, -1 if b wins, 0 if tie
    function compare(cardsA, cardsB) {
        const a = evaluate(cardsA);
        const b = evaluate(cardsB);

        if (a.rank !== b.rank) return a.rank > b.rank ? 1 : -1;

        // Same rank, compare kickers
        const len = Math.max(a.kickers.length, b.kickers.length);
        for (let i = 0; i < len; i++) {
            const ka = a.kickers[i] || 0;
            const kb = b.kickers[i] || 0;
            if (ka !== kb) return ka > kb ? 1 : -1;
        }
        return 0;
    }

    // Check if dealer qualifies (Queen-high or better)
    function dealerQualifies(cards) {
        const ev = evaluate(cards);
        if (ev.rank > RANKS.HIGH_CARD) return true; // any pair or better qualifies
        // High card: need Queen (12) or better as highest card
        const sorted = sortCards(cards);
        return Deck.rankValue(sorted[0]) >= 12; // Q=12
    }

    // Get human-readable hand description
    function describe(cards) {
        const ev = evaluate(cards);
        const sorted = sortCards(cards);
        const name = RANK_NAMES[ev.rank];

        switch (ev.rank) {
            case RANKS.STRAIGHT_FLUSH:
                return name;
            case RANKS.THREE_OF_A_KIND:
                return name + ' (' + sorted[0].rank + 's)';
            case RANKS.STRAIGHT:
                return name;
            case RANKS.FLUSH:
                return name;
            case RANKS.PAIR: {
                if (sorted[0].rank === sorted[1].rank) {
                    return 'Pair of ' + sorted[0].rank + 's';
                } else {
                    return 'Pair of ' + sorted[1].rank + 's';
                }
            }
            default: {
                return sorted[0].rank + '-high';
            }
        }
    }

    // Get the ante bonus multiplier (0 if none)
    function getAnteBonus(cards) {
        const ev = evaluate(cards);
        switch (ev.rank) {
            case RANKS.STRAIGHT_FLUSH: return CONFIG.ANTE_BONUS.STRAIGHT_FLUSH;
            case RANKS.THREE_OF_A_KIND: return CONFIG.ANTE_BONUS.THREE_OF_A_KIND;
            case RANKS.STRAIGHT: return CONFIG.ANTE_BONUS.STRAIGHT;
            default: return 0;
        }
    }

    // Get the pair plus multiplier (0 if none)
    function getPairPlusPayout(cards) {
        const ev = evaluate(cards);
        switch (ev.rank) {
            case RANKS.STRAIGHT_FLUSH: return CONFIG.PAIR_PLUS.STRAIGHT_FLUSH;
            case RANKS.THREE_OF_A_KIND: return CONFIG.PAIR_PLUS.THREE_OF_A_KIND;
            case RANKS.STRAIGHT: return CONFIG.PAIR_PLUS.STRAIGHT;
            case RANKS.FLUSH: return CONFIG.PAIR_PLUS.FLUSH;
            case RANKS.PAIR: return CONFIG.PAIR_PLUS.PAIR;
            default: return 0;
        }
    }

    return {
        RANKS, RANK_NAMES,
        evaluate, compare, dealerQualifies,
        describe, getAnteBonus, getPairPlusPayout,
        sortCards, isFlush, isStraight, isThreeOfAKind, isPair,
    };
})();
