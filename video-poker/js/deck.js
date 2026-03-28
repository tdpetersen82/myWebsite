const Deck = (() => {
    const SUITS = ['hearts', 'diamonds', 'clubs', 'spades'];
    const RANKS = ['2','3','4','5','6','7','8','9','10','J','Q','K','A'];
    const SUIT_SYMBOLS = { hearts: '\u2665', diamonds: '\u2666', clubs: '\u2663', spades: '\u2660' };

    let cards = [];

    function build() {
        cards = [];
        for (const suit of SUITS) {
            for (const rank of RANKS) {
                cards.push({ rank, suit, symbol: SUIT_SYMBOLS[suit] });
            }
        }
        shuffle();
    }

    function shuffle() {
        for (let i = cards.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [cards[i], cards[j]] = [cards[j], cards[i]];
        }
    }

    function deal() {
        if (cards.length === 0) build();
        return cards.pop();
    }

    function dealHand(count) {
        const hand = [];
        for (let i = 0; i < count; i++) {
            hand.push(deal());
        }
        return hand;
    }

    function isRed(card) {
        return card.suit === 'hearts' || card.suit === 'diamonds';
    }

    function rankValue(card) {
        const idx = RANKS.indexOf(card.rank);
        return idx + 2; // 2=2, 3=3, ..., A=14
    }

    function displayRank(card) {
        return card.rank;
    }

    return { build, deal, dealHand, isRed, rankValue, displayRank, SUITS, RANKS, SUIT_SYMBOLS };
})();
