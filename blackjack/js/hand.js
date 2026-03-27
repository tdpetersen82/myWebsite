const Hand = (() => {
    function value(cards) {
        let total = 0;
        let aces = 0;
        for (const c of cards) {
            const v = Deck.cardValue(c);
            total += v;
            if (c.rank === 'A') aces++;
        }
        while (total > 21 && aces > 0) {
            total -= 10;
            aces--;
        }
        return total;
    }

    function isSoft(cards) {
        let total = 0;
        let aces = 0;
        for (const c of cards) {
            total += Deck.cardValue(c);
            if (c.rank === 'A') aces++;
        }
        // Soft if at least one ace is still counted as 11
        while (total > 21 && aces > 0) {
            total -= 10;
            aces--;
        }
        return aces > 0 && total <= 21;
    }

    function isBlackjack(cards) {
        return cards.length === 2 && value(cards) === 21;
    }

    function isBust(cards) {
        return value(cards) > 21;
    }

    function isPair(cards) {
        return cards.length === 2 && cards[0].rank === cards[1].rank;
    }

    function canSplit(cards, splitCount) {
        return isPair(cards) && splitCount < CONFIG.MAX_SPLITS;
    }

    function canDouble(cards) {
        return cards.length === 2;
    }

    // Compare player hand vs dealer hand, return multiplier
    // Positive = player wins, negative = player loses, 0 = push
    function compare(playerCards, dealerCards, isPlayerBlackjack, isDealerBlackjack) {
        if (isPlayerBlackjack && isDealerBlackjack) return 0; // push
        if (isPlayerBlackjack) return 1.5; // 3:2
        if (isDealerBlackjack) return -1;

        const pv = value(playerCards);
        const dv = value(dealerCards);

        if (isBust(playerCards)) return -1;
        if (isBust(dealerCards)) return 1;
        if (pv > dv) return 1;
        if (pv < dv) return -1;
        return 0;
    }

    return { value, isSoft, isBlackjack, isBust, isPair, canSplit, canDouble, compare };
})();
