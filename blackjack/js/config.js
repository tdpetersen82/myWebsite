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

    BUTTON_COLORS: {
        hit:       { from: '#3498db', to: '#2980b9' },
        stand:     { from: '#f39c12', to: '#e67e22' },
        double:    { from: '#2ecc71', to: '#27ae60' },
        split:     { from: '#9b59b6', to: '#8e44ad' },
        insurance: { from: '#1abc9c', to: '#16a085' },
        surrender: { from: '#95a5a6', to: '#7f8c8d' },
    },

    HINT_BG: '#ebf5fb',
    HINT_BORDER: '#3498db',

    // Betting
    CHIPS: [5, 25, 100, 500],
    MIN_BET: 5,
    MAX_BET: 500,
    STARTING_BANKROLL: 1000,

    // Rules
    DECK_COUNT: 6,
    RESHUFFLE_PENETRATION: 0.75,
    MAX_SPLITS: 3, // up to 4 hands

    // localStorage
    STORAGE_KEY: 'blackjackStats',
    HINT_KEY: 'blackjackHintsOn',

    // Animation durations (seconds)
    DEAL_DURATION: 0.4,
    FLIP_DURATION: 0.4,
    CHIP_DURATION: 0.3,
    RESULT_DELAY: 0.6,
};
