/* eslint-disable */
// Three Card Poker — single-deck builder. Cards use suit symbols (matches BJ/VP).
(function () {
  const SUITS = ['♠','♥','♦','♣'];
  const RANKS = ['2','3','4','5','6','7','8','9','10','J','Q','K','A'];
  const RANK_VALUES = {
    '2':2,'3':3,'4':4,'5':5,'6':6,'7':7,'8':8,'9':9,'10':10,'J':11,'Q':12,'K':13,'A':14
  };

  function build() {
    const deck = [];
    for (const suit of SUITS) {
      for (const rank of RANKS) {
        deck.push({
          rank,
          suit,
          id: `${suit}-${rank}-${Math.random().toString(36).slice(2,8)}`
        });
      }
    }
    return deck;
  }

  function shuffle(deck) {
    const a = [...deck];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function deal(deck, n = 1) {
    const taken = deck.slice(-n);
    return [taken, deck.slice(0, deck.length - n)];
  }

  function rankValue(card) { return RANK_VALUES[card.rank]; }
  function isRed(card) { return card.suit === '♥' || card.suit === '♦'; }

  window.TCP_DECK = { build, shuffle, deal, rankValue, isRed, SUITS, RANKS, RANK_VALUES };
})();
