// ============================================================
// Simon — Game Configuration & Constants
// ============================================================

const SIMON_CONFIG = {
    // Canvas dimensions
    WIDTH: 800,
    HEIGHT: 600,

    // Pad colors (normal and lit states)
    PADS: {
        GREEN:  { index: 0, key: '1', normal: 0x00a74a, lit: 0x33ff77, label: '1' },
        RED:    { index: 1, key: '2', normal: 0xcc0000, lit: 0xff4444, label: '2' },
        YELLOW: { index: 2, key: '3', normal: 0xcccc00, lit: 0xffff55, label: '3' },
        BLUE:   { index: 3, key: '4', normal: 0x0044cc, lit: 0x4488ff, label: '4' },
    },

    // Pad layout
    PAD_RADIUS: 160,         // outer radius of each quadrant arc
    PAD_INNER_RADIUS: 50,    // inner radius (center gap)
    CENTER_X: 400,
    CENTER_Y: 310,
    PAD_GAP: 0.05,           // radians gap between pads

    // Audio frequencies for each pad (classic Simon tones)
    TONES: {
        0: 329.63,  // E4 — green
        1: 261.63,  // C4 — red
        2: 392.00,  // G4 — yellow
        3: 523.25,  // C5 — blue
    },

    // Difficulty presets
    DIFFICULTY: {
        EASY: {
            label: 'Easy',
            startDelay: 800,     // ms between pad flashes at start
            minDelay: 300,       // fastest speed
            speedRamp: 20,       // ms faster per round
            flashDuration: 500,  // how long a pad stays lit
        },
        NORMAL: {
            label: 'Normal',
            startDelay: 600,
            minDelay: 200,
            speedRamp: 25,
            flashDuration: 400,
        },
        HARD: {
            label: 'Hard',
            startDelay: 400,
            minDelay: 120,
            speedRamp: 30,
            flashDuration: 300,
        },
    },

    // Timing
    SEQUENCE_START_DELAY: 1000,  // ms before computer starts showing sequence
    PLAYER_TIMEOUT: 5000,        // ms before player times out (0 = no timeout)

    // Storage
    HIGH_SCORE_KEY: 'simonHighScore',

    // Colors
    BG_COLOR: 0x1a1a2e,
    CENTER_COLOR: 0x222244,
    TEXT_COLOR: '#ffffff',
    ACCENT_COLOR: '#667eea',
};
