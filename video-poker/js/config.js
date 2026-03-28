const CONFIG = {
    // Layout
    WIDTH: 960,
    HEIGHT: 640,

    // Colors
    FELT: { from: '#2ecc71', to: '#27ae60' },
    CARD_BACK: { from: '#ff6b6b', to: '#ee5a24' },
    SUITS: { red: '#e74c3c', black: '#2c3e50' },

    // Betting
    MAX_COINS: 5,
    DEFAULT_COINS: 1,
    COIN_VALUE: 1, // each coin = $1
    STARTING_BANKROLL: 1000,

    // Paytable (per 1 coin bet)
    PAYTABLE: {
        'royal-flush':      { name: 'Royal Flush',      pay: [250, 500, 750, 1000, 4000] },
        'straight-flush':   { name: 'Straight Flush',   pay: [50, 100, 150, 200, 250] },
        'four-of-a-kind':   { name: 'Four of a Kind',   pay: [25, 50, 75, 100, 125] },
        'full-house':       { name: 'Full House',       pay: [9, 18, 27, 36, 45] },
        'flush':            { name: 'Flush',            pay: [6, 12, 18, 24, 30] },
        'straight':         { name: 'Straight',         pay: [4, 8, 12, 16, 20] },
        'three-of-a-kind':  { name: 'Three of a Kind',  pay: [3, 6, 9, 12, 15] },
        'two-pair':         { name: 'Two Pair',         pay: [2, 4, 6, 8, 10] },
        'jacks-or-better':  { name: 'Jacks or Better',  pay: [1, 2, 3, 4, 5] },
    },

    // localStorage
    STORAGE_KEY: 'videoPokerStats',
    HINT_KEY: 'videoPokerHintsOn',

    // Animation durations (ms)
    DEAL_DELAY: 150,
    DRAW_DELAY: 200,
    RESULT_DISPLAY: 1800,
};
