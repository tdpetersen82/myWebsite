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
    MAX_BET: 500,
    STARTING_BANKROLL: 1000,

    // Odds
    MAX_ODDS_MULTIPLE: 3,

    // Payouts
    ODDS_PAYOUTS: {
        4:  { pays: 2, for: 1 },   // 2:1
        10: { pays: 2, for: 1 },
        5:  { pays: 3, for: 2 },   // 3:2
        9:  { pays: 3, for: 2 },
        6:  { pays: 6, for: 5 },   // 6:5
        8:  { pays: 6, for: 5 },
    },

    DONT_ODDS_PAYOUTS: {
        4:  { pays: 1, for: 2 },   // 1:2
        10: { pays: 1, for: 2 },
        5:  { pays: 2, for: 3 },   // 2:3
        9:  { pays: 2, for: 3 },
        6:  { pays: 5, for: 6 },   // 5:6
        8:  { pays: 5, for: 6 },
    },

    PLACE_PAYOUTS: {
        6: { pays: 7, for: 6 },    // 7:6
        8: { pays: 7, for: 6 },
    },

    FIELD_PAYOUTS: {
        2:  3,  // pays 2:1 (return 3x)
        12: 4,  // pays 3:1 (return 4x)
        default: 2,  // pays 1:1 (return 2x)
    },

    FIELD_NUMBERS: [2, 3, 4, 9, 10, 11, 12],

    POINT_NUMBERS: [4, 5, 6, 8, 9, 10],

    // House edges for hints
    HOUSE_EDGES: {
        pass:     1.41,
        dontPass: 1.36,
        odds:     0,
        field:    5.56,
        place6:   1.52,
        place8:   1.52,
    },

    // localStorage
    STORAGE_KEY: 'crapsStats',
    HINT_KEY: 'crapsHintsOn',

    // Animation durations (ms)
    ROLL_DURATION: 800,
    RESULT_DELAY: 600,
};
