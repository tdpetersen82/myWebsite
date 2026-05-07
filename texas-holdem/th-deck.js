/* eslint-disable */
// Texas Hold'em deck — 52 cards, Fisher-Yates shuffle, deal helpers.
// Exposed as window.TH_DECK.
(function () {
  const SUITS = ['hearts', 'diamonds', 'clubs', 'spades'];
  const RANKS = ['2','3','4','5','6','7','8','9','10','J','Q','K','A'];
  const SUIT_SYMBOLS = { hearts: '♥', diamonds: '♦', clubs: '♣', spades: '♠' };

  function buildDeck() {
    const cards = [];
    for (const suit of SUITS) {
      for (const rank of RANKS) {
        cards.push({
          rank, suit,
          symbol: SUIT_SYMBOLS[suit],
          id: `${rank}-${suit}-${Math.random().toString(36).slice(2,7)}`
        });
      }
    }
    return shuffle(cards);
  }

  function shuffle(cards) {
    for (let i = cards.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [cards[i], cards[j]] = [cards[j], cards[i]];
    }
    return cards;
  }

  function rankValue(card) {
    return RANKS.indexOf(card.rank) + 2;
  }

  function isRed(card) {
    return card.suit === 'hearts' || card.suit === 'diamonds';
  }

  // Deal n cards from the top of the deck (mutates deck).
  function deal(deck, n) {
    const out = [];
    for (let i = 0; i < n; i++) out.push(deck.pop());
    return out;
  }

  window.TH_DECK = { buildDeck, shuffle, deal, rankValue, isRed, SUITS, RANKS, SUIT_SYMBOLS };
})();
