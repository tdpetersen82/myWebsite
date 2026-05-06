/* eslint-disable */
// 52-card deck — shuffle/deal helpers, exposed as window.VP_DECK
(function () {
  const SUITS = ['hearts', 'diamonds', 'clubs', 'spades'];
  const RANKS = ['2','3','4','5','6','7','8','9','10','J','Q','K','A'];
  const SUIT_SYMBOLS = { hearts: '♥', diamonds: '♦', clubs: '♣', spades: '♠' };

  let cards = [];

  function build() {
    cards = [];
    for (const suit of SUITS) {
      for (const rank of RANKS) {
        cards.push({ rank, suit, symbol: SUIT_SYMBOLS[suit], id: `${rank}-${suit}-${Math.random().toString(36).slice(2,7)}` });
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
    for (let i = 0; i < count; i++) hand.push(deal());
    return hand;
  }

  function rankValue(card) {
    return RANKS.indexOf(card.rank) + 2;
  }

  function isRed(card) {
    return card.suit === 'hearts' || card.suit === 'diamonds';
  }

  window.VP_DECK = { build, deal, dealHand, rankValue, isRed, SUITS, RANKS, SUIT_SYMBOLS };
})();
