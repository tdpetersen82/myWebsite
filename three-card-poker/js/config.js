const CONFIG = {
    // Layout
    WIDTH: 960,
    HEIGHT: 640,

    // Colors
    FELT: { from: '#2ecc71', to: '#27ae60' },
    CARD_BACK: { from: '#ff6b6b', to: '#ee5a24' },
    SUITS: { red: '#e74c3c', black: '#2c3e50' },

    CHIP_COLORS: {
        5:   { bg: '#e74c3c', border: '#c0392b', label: '$5' },
        25:  { bg: '#27ae60', border: '#1e8449', label: '$25' },
        100: { bg: '#2980b9', border: '#1f6fa5', label: '$100' },
        500: { bg: '#8e44ad', border: '#6c3483', label: '$500' },
    },

    HINT_BG: '#ebf5fb',
    HINT_BORDER: '#3498db',

    // Betting
    CHIPS: [5, 25, 100, 500],
    MIN_BET: 5,
    MAX_BET: 500,
    STARTING_BANKROLL: 1000,

    // Payouts - Ante Bonus (paid regardless of dealer hand)
    ANTE_BONUS: {
        STRAIGHT_FLUSH: 5,
        THREE_OF_A_KIND: 4,
        STRAIGHT: 1,
    },

    // Payouts - Pair Plus
    PAIR_PLUS: {
        STRAIGHT_FLUSH: 40,
        THREE_OF_A_KIND: 30,
        STRAIGHT: 6,
        FLUSH: 4,
        PAIR: 1,
    },

    // localStorage
    STORAGE_KEY: 'threeCardPokerStats',
    HINT_KEY: 'threeCardPokerHintsOn',

    // Animation durations (seconds)
    DEAL_DURATION: 0.4,
    FLIP_DURATION: 0.4,
    CHIP_DURATION: 0.3,
    RESULT_DELAY: 0.6,
};
