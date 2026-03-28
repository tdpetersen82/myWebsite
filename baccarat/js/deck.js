const Deck = (() => {
    const SUITS = ['hearts', 'diamonds', 'clubs', 'spades'];
    const RANKS = ['2','3','4','5','6','7','8','9','10','J','Q','K','A'];
    const SUIT_SYMBOLS = { hearts: '\u2665', diamonds: '\u2666', clubs: '\u2663', spades: '\u2660' };

    let shoe = [];
    let dealt = 0;

    function buildShoe() {
        shoe = [];
        for (let d = 0; d < CONFIG.DECK_COUNT; d++) {
            for (const suit of SUITS) {
                for (const rank of RANKS) {
                    shoe.push({ rank, suit, symbol: SUIT_SYMBOLS[suit] });
                }
            }
        }
        shuffle();
        dealt = 0;
    }

    function shuffle() {
        for (let i = shoe.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shoe[i], shoe[j]] = [shoe[j], shoe[i]];
        }
    }

    function needsReshuffle() {
        const total = CONFIG.DECK_COUNT * 52;
        return dealt / total >= CONFIG.RESHUFFLE_PENETRATION;
    }

    function deal() {
        if (shoe.length === 0) buildShoe();
        dealt++;
        return shoe.pop();
    }

    function isRed(card) {
        return card.suit === 'hearts' || card.suit === 'diamonds';
    }

    /** Baccarat card value: A=1, 2-9=face value, 10/J/Q/K=0 */
    function cardValue(card) {
        if (card.rank === 'A') return 1;
        if (['K','Q','J','10'].includes(card.rank)) return 0;
        return parseInt(card.rank);
    }

    function displayRank(card) {
        return card.rank;
    }

    return { buildShoe, deal, needsReshuffle, isRed, cardValue, displayRank, SUITS, RANKS };
})();
