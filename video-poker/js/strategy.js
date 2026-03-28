const Strategy = (() => {
    // Optimal Jacks or Better hold strategy (simplified but accurate priority list)
    // Returns which card indices (0-4) to hold

    function getRecommendation(cards) {
        if (!cards || cards.length !== 5) return { holdIndices: [], action: 'DEAL', explanation: '', riskLabel: '', riskClass: 'risk-ok', detailedExplanation: '' };

        const result = findBestHold(cards);
        return result;
    }

    function findBestHold(cards) {
        const vals = cards.map(c => Deck.rankValue(c));
        const suits = cards.map(c => c.suit);
        const ranks = cards.map(c => c.rank);

        // Helper: check if indices form specific patterns
        function indicesOf(predicate) {
            const idx = [];
            for (let i = 0; i < 5; i++) {
                if (predicate(cards[i], i)) idx.push(i);
            }
            return idx;
        }

        // Full hand evaluation
        const handResult = Hand.evaluate(cards);

        // 1. Royal Flush - hold all
        if (handResult.key === 'royal-flush') {
            return makeResult([0,1,2,3,4], 'Royal Flush! Hold all cards.',
                'Expected return: 100%', 'risk-good',
                'You have the best possible hand in video poker. A Royal Flush pays the maximum jackpot. Always hold all five cards.');
        }

        // 2. Straight Flush - hold all
        if (handResult.key === 'straight-flush') {
            return makeResult([0,1,2,3,4], 'Straight Flush! Hold all cards.',
                'Expected return: 100%', 'risk-good',
                'A Straight Flush is the second-best hand. Five sequential cards of the same suit. Hold them all for the guaranteed payout.');
        }

        // 3. Four of a Kind - hold 4
        if (handResult.key === 'four-of-a-kind') {
            const counts = Hand.getRankCounts(cards);
            const quadRank = Object.keys(counts).find(r => counts[r] === 4);
            const hold = indicesOf(c => c.rank === quadRank);
            return makeResult(hold, 'Four of a Kind! Hold the four matching cards.',
                'Expected return: 100%', 'risk-good',
                'Four of a Kind is a guaranteed big payout. Hold all four matching cards. The fifth card cannot improve your hand.');
        }

        // 4. Full House - hold all
        if (handResult.key === 'full-house') {
            return makeResult([0,1,2,3,4], 'Full House! Hold all cards.',
                'Expected return: 100%', 'risk-good',
                'A Full House (three of a kind plus a pair) pays 9x your bet. This is a strong guaranteed payout. Never break up a Full House.');
        }

        // 5. Flush - hold all
        if (handResult.key === 'flush') {
            return makeResult([0,1,2,3,4], 'Flush! Hold all cards.',
                'Expected return: 100%', 'risk-good',
                'A Flush (all five cards of the same suit) pays 6x your bet. Hold all five cards for the guaranteed payout.');
        }

        // 6. Straight - hold all
        if (handResult.key === 'straight') {
            return makeResult([0,1,2,3,4], 'Straight! Hold all cards.',
                'Expected return: 100%', 'risk-good',
                'A Straight (five sequential cards) pays 4x your bet. Hold all five for the guaranteed payout.');
        }

        // 7. Three of a Kind - hold 3
        if (handResult.key === 'three-of-a-kind') {
            const counts = Hand.getRankCounts(cards);
            const tripRank = Object.keys(counts).find(r => counts[r] === 3);
            const hold = indicesOf(c => c.rank === tripRank);
            return makeResult(hold, 'Three of a Kind. Hold the three matching cards.',
                'Expected return: ~98%', 'risk-good',
                'Three of a Kind pays 3x and has good chances to improve to a Full House or Four of a Kind on the draw. Hold the three matching cards and draw two new ones.');
        }

        // 8. Two Pair - hold both pairs
        if (handResult.key === 'two-pair') {
            const counts = Hand.getRankCounts(cards);
            const pairRanks = Object.keys(counts).filter(r => counts[r] === 2);
            const hold = indicesOf(c => pairRanks.includes(c.rank));
            return makeResult(hold, 'Two Pair. Hold both pairs.',
                'Expected return: ~87%', 'risk-good',
                'Two Pair pays 2x your bet. Hold all four paired cards and draw one. You have about an 8.5% chance of improving to a Full House.');
        }

        // 9. High Pair (Jacks or Better) - hold pair
        if (handResult.key === 'jacks-or-better') {
            const counts = Hand.getRankCounts(cards);
            const pairRank = Object.keys(counts).find(r => counts[r] === 2 && Hand.isHighCard(r));
            const hold = indicesOf(c => c.rank === pairRank);
            return makeResult(hold, 'High Pair. Hold the pair of ' + pairRank + 's.',
                'Expected return: ~75%', 'risk-ok',
                'A pair of Jacks or higher guarantees your bet back. Hold the pair and draw three new cards. You have chances to improve to Two Pair, Three of a Kind, Full House, or even Four of a Kind.');
        }

        // 10. 4 to Royal Flush
        const fourToRoyal = find4ToRoyal(cards);
        if (fourToRoyal) {
            return makeResult(fourToRoyal, 'Hold 4 to a Royal Flush!',
                'Expected return: ~95%', 'risk-good',
                'You have four of the five cards needed for a Royal Flush. The chance of completing it is about 1 in 47 (2.1%), but the massive payout makes this the correct play. Even if you miss, you may still make a Flush, Straight, or high pair.');
        }

        // 11. 4 to Straight Flush
        const fourToSF = find4ToStraightFlush(cards);
        if (fourToSF) {
            return makeResult(fourToSF, 'Hold 4 to a Straight Flush.',
                'Expected return: ~82%', 'risk-ok',
                'Four cards toward a Straight Flush is a strong draw. You have about a 2.1% chance of completing the Straight Flush, plus good chances for a Flush or Straight.');
        }

        // 12. 3 to Royal Flush
        const threeToRoyal = find3ToRoyal(cards);
        if (threeToRoyal) {
            return makeResult(threeToRoyal, 'Hold 3 to a Royal Flush.',
                'Expected return: ~68%', 'risk-ok',
                'Three cards toward a Royal Flush is worth pursuing. While completing the Royal is unlikely, you have reasonable chances of making a Flush, Straight, or high pair from the draw.');
        }

        // 13. 4 to Flush
        const fourToFlush = find4ToFlush(cards);
        if (fourToFlush) {
            return makeResult(fourToFlush, 'Hold 4 to a Flush.',
                'Expected return: ~63%', 'risk-ok',
                'With four cards of the same suit, you have about a 19.1% chance (9 out of 47) of completing the Flush. The 6x payout makes this a profitable draw in the long run.');
        }

        // 14. Low Pair (2-10)
        const lowPair = findLowPair(cards);
        if (lowPair) {
            const pairRank = cards[lowPair[0]].rank;
            return makeResult(lowPair, 'Hold the low pair of ' + pairRank + 's.',
                'Expected return: ~60%', 'risk-ok',
                'A low pair does not pay on its own, but holding it gives you chances to improve to Two Pair (16%), Three of a Kind (11%), Full House (1%), or Four of a Kind (0.1%). This is better than drawing to an inside straight or holding random high cards in most situations.');
        }

        // 15. 4 to Outside Straight
        const fourToStraight = find4ToOutsideStraight(cards);
        if (fourToStraight) {
            return makeResult(fourToStraight, 'Hold 4 to an open-ended Straight.',
                'Expected return: ~51%', 'risk-ok',
                'An open-ended (outside) Straight draw can be completed by a card on either end, giving you about a 17% chance (8 out of 47). The 4x Straight payout makes this a reasonable draw.');
        }

        // 16. Two high cards (J+)
        const twoHigh = findTwoHighCards(cards);
        if (twoHigh) {
            const names = twoHigh.map(i => cards[i].rank).join(' and ');
            return makeResult(twoHigh, 'Hold high cards: ' + names + '.',
                'Expected return: ~49%', 'risk-ok',
                'Holding two or more high cards (Jack through Ace) gives you a reasonable chance of pairing one of them for a Jacks or Better payout. This is preferred over drawing all five new cards.');
        }

        // 17. 3 to Straight Flush
        const threeToSF = find3ToStraightFlush(cards);
        if (threeToSF) {
            return makeResult(threeToSF, 'Hold 3 to a Straight Flush.',
                'Expected return: ~47%', 'risk-bad',
                'Three cards toward a Straight Flush provides a long-shot draw with multiple ways to make a paying hand. The combined probability of Straight Flush, Flush, or Straight makes this marginally better than discarding everything.');
        }

        // 18. One high card (J+)
        const oneHigh = findOneHighCard(cards);
        if (oneHigh) {
            return makeResult(oneHigh, 'Hold high card: ' + cards[oneHigh[0]].rank + '.',
                'Expected return: ~46%', 'risk-bad',
                'With no other draws available, holding a single high card (Jack through Ace) gives you the best chance of making at least a Jacks or Better pair. The probability is roughly 1 in 5 of pairing your high card.');
        }

        // 19. Discard all
        return makeResult([], 'Discard all. No profitable holds.',
            'Expected return: ~36%', 'risk-bad',
            'With no high cards, no pairs, no draws, and no suited or sequential combinations worth pursuing, the best play is to discard all five cards and draw a completely new hand. This gives you the best statistical chance of ending up with a paying hand.');
    }

    // ── Draw finders ─────────────────────────────────

    function find4ToRoyal(cards) {
        const royalRanks = ['10', 'J', 'Q', 'K', 'A'];
        // Check each suit
        for (const suit of Deck.SUITS) {
            const matching = [];
            for (let i = 0; i < 5; i++) {
                if (cards[i].suit === suit && royalRanks.includes(cards[i].rank)) {
                    matching.push(i);
                }
            }
            if (matching.length === 4) return matching;
        }
        return null;
    }

    function find3ToRoyal(cards) {
        const royalRanks = ['10', 'J', 'Q', 'K', 'A'];
        for (const suit of Deck.SUITS) {
            const matching = [];
            for (let i = 0; i < 5; i++) {
                if (cards[i].suit === suit && royalRanks.includes(cards[i].rank)) {
                    matching.push(i);
                }
            }
            if (matching.length === 3) return matching;
        }
        return null;
    }

    function find4ToStraightFlush(cards) {
        // For each suit, find 4 cards that could form a straight flush
        for (const suit of Deck.SUITS) {
            const suitCards = [];
            for (let i = 0; i < 5; i++) {
                if (cards[i].suit === suit) suitCards.push({ idx: i, val: Deck.rankValue(cards[i]) });
            }
            if (suitCards.length < 4) continue;
            // Try all combos of 4 from suitCards
            const combos = combinations(suitCards, 4);
            for (const combo of combos) {
                const vals = combo.map(c => c.val).sort((a, b) => a - b);
                if (isConsecutiveOrNear(vals, 1)) {
                    return combo.map(c => c.idx);
                }
            }
        }
        return null;
    }

    function find3ToStraightFlush(cards) {
        for (const suit of Deck.SUITS) {
            const suitCards = [];
            for (let i = 0; i < 5; i++) {
                if (cards[i].suit === suit) suitCards.push({ idx: i, val: Deck.rankValue(cards[i]) });
            }
            if (suitCards.length < 3) continue;
            const combos = combinations(suitCards, 3);
            for (const combo of combos) {
                const vals = combo.map(c => c.val).sort((a, b) => a - b);
                // Within a span of 5 (could complete a 5-card straight flush)
                if (vals[2] - vals[0] <= 4) {
                    return combo.map(c => c.idx);
                }
            }
        }
        return null;
    }

    function find4ToFlush(cards) {
        for (const suit of Deck.SUITS) {
            const matching = [];
            for (let i = 0; i < 5; i++) {
                if (cards[i].suit === suit) matching.push(i);
            }
            if (matching.length === 4) return matching;
        }
        return null;
    }

    function findLowPair(cards) {
        const counts = Hand.getRankCounts(cards);
        for (const rank in counts) {
            if (counts[rank] === 2 && !Hand.isHighCard(rank)) {
                const hold = [];
                for (let i = 0; i < 5; i++) {
                    if (cards[i].rank === rank) hold.push(i);
                }
                return hold;
            }
        }
        return null;
    }

    function find4ToOutsideStraight(cards) {
        // Try all combinations of 4 cards, check for outside straight draw
        const combos = combinations([0,1,2,3,4].map(i => ({ idx: i, val: Deck.rankValue(cards[i]) })), 4);
        for (const combo of combos) {
            const vals = combo.map(c => c.val).sort((a, b) => a - b);
            // Outside straight: 4 consecutive, not A-high ending at K (inside) or A-low starting at 2
            if (vals[1] === vals[0] + 1 && vals[2] === vals[1] + 1 && vals[3] === vals[2] + 1) {
                // It is outside if there is room on both ends
                // Not outside if it is A-2-3-4 (only top end) or J-Q-K-A (only bottom end)
                const low = vals[0];
                const high = vals[3];
                if (low >= 2 && high <= 13) { // room on both sides
                    return combo.map(c => c.idx);
                }
            }
        }
        return null;
    }

    function findTwoHighCards(cards) {
        const high = [];
        for (let i = 0; i < 5; i++) {
            if (Hand.isHighCard(cards[i].rank)) high.push(i);
        }
        if (high.length >= 2) {
            // Hold up to 3 high cards (prefer fewer if they are unsuited)
            return high.slice(0, Math.min(high.length, 3));
        }
        return null;
    }

    function findOneHighCard(cards) {
        for (let i = 0; i < 5; i++) {
            if (Hand.isHighCard(cards[i].rank)) return [i];
        }
        return null;
    }

    // ── Utilities ─────────────────────────────────────

    function combinations(arr, k) {
        const result = [];
        function backtrack(start, combo) {
            if (combo.length === k) { result.push([...combo]); return; }
            for (let i = start; i < arr.length; i++) {
                combo.push(arr[i]);
                backtrack(i + 1, combo);
                combo.pop();
            }
        }
        backtrack(0, []);
        return result;
    }

    function isConsecutiveOrNear(vals, maxGaps) {
        // Check if sorted values are consecutive or have at most maxGaps gaps
        let gaps = 0;
        for (let i = 1; i < vals.length; i++) {
            const diff = vals[i] - vals[i - 1];
            if (diff === 0) return false; // duplicate
            gaps += (diff - 1);
        }
        return gaps <= maxGaps;
    }

    function makeResult(holdIndices, explanation, riskLabel, riskClass, detailedExplanation) {
        const holdStr = holdIndices.length === 0
            ? 'Discard All'
            : holdIndices.length === 5
                ? 'Hold All'
                : 'HOLD: ' + holdIndices.map(i => '#' + (i + 1)).join(', ');
        return {
            holdIndices,
            action: holdStr,
            explanation,
            riskLabel: riskLabel || '',
            riskClass: riskClass || 'risk-ok',
            detailedExplanation: detailedExplanation || '',
        };
    }

    return { getRecommendation };
})();
