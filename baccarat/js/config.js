const CONFIG = {
    // Layout
    WIDTH: 960,
    HEIGHT: 640,

    // Colors
    FELT: { from: '#1a5c3a', to: '#145230' },
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

    // Rules
    DECK_COUNT: 8,
    RESHUFFLE_PENETRATION: 0.75,
    BANKER_COMMISSION: 0.05,

    // Payouts
    PLAYER_PAYOUT: 1,    // 1:1
    BANKER_PAYOUT: 0.95,  // 1:1 minus 5% commission
    TIE_PAYOUT: 8,       // 8:1

    // House edges
    HOUSE_EDGE: {
        PLAYER: 1.24,
        BANKER: 1.06,
        TIE: 14.36,
    },

    // localStorage
    STORAGE_KEY: 'baccaratStats',
    HINT_KEY: 'baccaratHintsOn',

    // Animation durations (seconds)
    DEAL_DURATION: 0.4,
    FLIP_DURATION: 0.4,
    CHIP_DURATION: 0.3,
    RESULT_DELAY: 0.6,
    DRAW_DELAY: 1000, // ms delay before third card draw
};
