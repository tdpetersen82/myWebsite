const Deck = (() => {
    const SUITS = ['hearts', 'diamonds', 'clubs', 'spades'];
    const RANKS = ['2','3','4','5','6','7','8','9','10','J','Q','K','A'];
    const SUIT_SYMBOLS = { hearts: '\u2665', diamonds: '\u2666', clubs: '\u2663', spades: '\u2660' };

    // Rank numeric values for comparison (Ace high)
    const RANK_VALUES = {
        '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7,
        '8': 8, '9': 9, '10': 10, 'J': 11, 'Q': 12, 'K': 13, 'A': 14
    };

    let shoe = [];

    function buildShoe() {
        shoe = [];
        // Single deck for three card poker
        for (const suit of SUITS) {
            for (const rank of RANKS) {
                shoe.push({ rank, suit, symbol: SUIT_SYMBOLS[suit] });
            }
        }
        shuffle();
    }

    function shuffle() {
        for (let i = shoe.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shoe[i], shoe[j]] = [shoe[j], shoe[i]];
        }
    }

    function deal() {
        if (shoe.length < 10) buildShoe();
        return shoe.pop();
    }

    function isRed(card) {
        return card.suit === 'hearts' || card.suit === 'diamonds';
    }

    function rankValue(card) {
        return RANK_VALUES[card.rank];
    }

    function displayRank(card) {
        return card.rank;
    }

    return { buildShoe, deal, isRed, rankValue, displayRank, SUITS, RANKS, RANK_VALUES };
})();
