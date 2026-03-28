const CONFIG = {
    // Layout
    WIDTH: 960,
    HEIGHT: 640,

    // Colors
    FELT: { from: '#2ecc71', to: '#27ae60' },

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
    STARTING_BANKROLL: 1000,

    // European roulette numbers
    // Wheel order (European single-zero)
    WHEEL_ORDER: [
        0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36,
        11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9,
        22, 18, 29, 7, 28, 12, 35, 3, 26
    ],

    // Red numbers
    RED_NUMBERS: [1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36],

    // Payouts
    PAYOUTS: {
        straight: 35,  // single number
        split: 17,     // 2 numbers
        street: 11,    // 3 numbers (row)
        corner: 8,     // 4 numbers
        sixline: 5,    // 6 numbers (two rows)
        dozen: 2,      // 12 numbers
        column: 2,     // 12 numbers
        red: 1,        // 18 numbers
        black: 1,
        odd: 1,
        even: 1,
        low: 1,        // 1-18
        high: 1,       // 19-36
    },

    HOUSE_EDGE: 2.7, // European roulette

    // localStorage
    STORAGE_KEY: 'rouletteStats',
    HINT_KEY: 'rouletteHintsOn',

    // Animation durations (ms)
    SPIN_DURATION: 4000,
    RESULT_DELAY: 600,
};
