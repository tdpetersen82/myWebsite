const Rules = (() => {

    /** Calculate baccarat hand value (sum mod 10) */
    function handValue(cards) {
        let sum = 0;
        for (const card of cards) {
            sum += Deck.cardValue(card);
        }
        return sum % 10;
    }

    /** Check if hand is a natural (8 or 9 on first two cards) */
    function isNatural(cards) {
        if (cards.length !== 2) return false;
        const v = handValue(cards);
        return v === 8 || v === 9;
    }

    /** Determine if Player draws a third card.
     *  Player draws on 0-5, stands on 6-7. */
    function playerDraws(playerCards) {
        const v = handValue(playerCards);
        return v <= 5;
    }

    /** Determine if Banker draws a third card.
     *  @param bankerCards - banker's first 2 cards
     *  @param playerThirdCard - player's third card (or null if player stood) */
    function bankerDraws(bankerCards, playerThirdCard) {
        const bv = handValue(bankerCards);

        // If player stood (no third card), banker draws on 0-5
        if (!playerThirdCard) {
            return bv <= 5;
        }

        const p3v = Deck.cardValue(playerThirdCard);

        switch (bv) {
            case 0:
            case 1:
            case 2:
                return true; // always draws
            case 3:
                return p3v !== 8; // draws unless player 3rd card was 8
            case 4:
                return p3v >= 2 && p3v <= 7; // draws if player 3rd card was 2-7
            case 5:
                return p3v >= 4 && p3v <= 7; // draws if player 3rd card was 4-7
            case 6:
                return p3v === 6 || p3v === 7; // draws if player 3rd card was 6-7
            case 7:
                return false; // always stands
            default:
                return false;
        }
    }

    /** Determine the winner: 'player', 'banker', or 'tie' */
    function determineWinner(playerCards, bankerCards) {
        const pv = handValue(playerCards);
        const bv = handValue(bankerCards);
        if (pv > bv) return 'player';
        if (bv > pv) return 'banker';
        return 'tie';
    }

    return { handValue, isNatural, playerDraws, bankerDraws, determineWinner };
})();
