const Hand = (() => {
    // Evaluate a 5-card poker hand and return the hand rank key and name

    const HIGH_CARDS = ['J', 'Q', 'K', 'A']; // Jacks or Better

    function getRankCounts(cards) {
        const counts = {};
        for (const c of cards) {
            counts[c.rank] = (counts[c.rank] || 0) + 1;
        }
        return counts;
    }

    function getSortedValues(cards) {
        return cards.map(c => Deck.rankValue(c)).sort((a, b) => a - b);
    }

    function isFlush(cards) {
        return cards.every(c => c.suit === cards[0].suit);
    }

    function isStraight(cards) {
        const vals = getSortedValues(cards);
        // Normal straight
        let straight = true;
        for (let i = 1; i < vals.length; i++) {
            if (vals[i] !== vals[i - 1] + 1) { straight = false; break; }
        }
        if (straight) return true;
        // Ace-low straight (A-2-3-4-5)
        if (vals[0] === 2 && vals[1] === 3 && vals[2] === 4 && vals[3] === 5 && vals[4] === 14) {
            return true;
        }
        return false;
    }

    function isRoyal(cards) {
        const vals = getSortedValues(cards);
        return vals[0] === 10 && vals[1] === 11 && vals[2] === 12 && vals[3] === 13 && vals[4] === 14;
    }

    function evaluate(cards) {
        if (!cards || cards.length !== 5) return { key: null, name: 'Incomplete Hand', payout: 0 };

        const flush = isFlush(cards);
        const straight = isStraight(cards);
        const royal = isRoyal(cards);
        const counts = getRankCounts(cards);
        const countValues = Object.values(counts).sort((a, b) => b - a);

        // Royal Flush
        if (flush && royal) {
            return { key: 'royal-flush', name: 'Royal Flush' };
        }

        // Straight Flush
        if (flush && straight) {
            return { key: 'straight-flush', name: 'Straight Flush' };
        }

        // Four of a Kind
        if (countValues[0] === 4) {
            return { key: 'four-of-a-kind', name: 'Four of a Kind' };
        }

        // Full House
        if (countValues[0] === 3 && countValues[1] === 2) {
            return { key: 'full-house', name: 'Full House' };
        }

        // Flush
        if (flush) {
            return { key: 'flush', name: 'Flush' };
        }

        // Straight
        if (straight) {
            return { key: 'straight', name: 'Straight' };
        }

        // Three of a Kind
        if (countValues[0] === 3) {
            return { key: 'three-of-a-kind', name: 'Three of a Kind' };
        }

        // Two Pair
        if (countValues[0] === 2 && countValues[1] === 2) {
            return { key: 'two-pair', name: 'Two Pair' };
        }

        // Jacks or Better (pair of J, Q, K, or A)
        if (countValues[0] === 2) {
            for (const rank in counts) {
                if (counts[rank] === 2 && HIGH_CARDS.includes(rank)) {
                    return { key: 'jacks-or-better', name: 'Jacks or Better' };
                }
            }
        }

        // No winning hand
        return { key: null, name: 'No Win' };
    }

    function getPayout(handKey, coinsBet) {
        if (!handKey || !CONFIG.PAYTABLE[handKey]) return 0;
        const idx = Math.min(Math.max(coinsBet, 1), 5) - 1;
        return CONFIG.PAYTABLE[handKey].pay[idx];
    }

    function isHighCard(rank) {
        return HIGH_CARDS.includes(rank);
    }

    return { evaluate, getPayout, isFlush, isStraight, isRoyal, getRankCounts, getSortedValues, isHighCard, HIGH_CARDS };
})();
