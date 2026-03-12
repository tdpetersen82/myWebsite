// Tron Light Cycles - Game Configuration
const TRON_CONFIG = {
    // Canvas / world dimensions
    WIDTH: 800,
    HEIGHT: 600,

    // Grid
    GRID_SIZE: 10, // pixels per cell
    get GRID_COLS() { return this.WIDTH / this.GRID_SIZE; },
    get GRID_ROWS() { return this.HEIGHT / this.GRID_SIZE; },

    // Colors (hex numbers for Phaser)
    COLORS: {
        PLAYER: 0x00d4ff,      // neon blue
        PLAYER_GLOW: 0x0066ff,
        AI: 0xff6600,           // neon orange
        AI_GLOW: 0xff3300,
        WALL: 0x333366,
        WALL_GLOW: 0x6666cc,
        GRID_LINE: 0x112233,
        BACKGROUND: 0x000811,
        BOOST: 0x00ff88,
        BOOST_GLOW: 0x00cc66,
        TEXT: '#00d4ff',
        TEXT_ORANGE: '#ff6600',
        TEXT_WHITE: '#ffffff',
        TEXT_GREEN: '#00ff88',
    },

    // CSS color strings for text
    CSS_PLAYER: '#00d4ff',
    CSS_AI: '#ff6600',

    // Directions
    DIR: {
        UP:    { x:  0, y: -1 },
        DOWN:  { x:  0, y:  1 },
        LEFT:  { x: -1, y:  0 },
        RIGHT: { x:  1, y:  0 },
    },

    // Gameplay
    BASE_MOVE_INTERVAL: 60,   // ms between moves at normal speed
    BOOST_MOVE_INTERVAL: 35,  // ms between moves when boosted
    BOOST_DURATION: 3000,     // ms a speed boost lasts
    BOOST_SPAWN_MIN: 4000,    // min ms before a boost spawns
    BOOST_SPAWN_MAX: 10000,   // max ms before a boost spawns
    ROUNDS_TO_WIN: 3,         // best-of-5 (first to 3)
    TOTAL_ROUNDS: 5,

    // Arena shrink per round (pixels removed from each side)
    ARENA_SHRINK_PER_ROUND: 10, // 1 grid cell per side per round

    // Difficulty presets
    DIFFICULTY: {
        EASY: {
            label: 'Easy',
            lookAhead: 1,       // cells to look ahead
            aggressiveness: 0,  // 0 = pure avoidance
            randomness: 0.3,    // chance of random safe move
        },
        NORMAL: {
            label: 'Normal',
            lookAhead: 5,
            aggressiveness: 0.3,
            randomness: 0.1,
        },
        HARD: {
            label: 'Hard',
            lookAhead: 12,
            aggressiveness: 0.7,
            randomness: 0.02,
        },
    },

    // LocalStorage key
    STORAGE_KEY: 'tronHighScore',

    // Starting positions (grid coords) - will be adjusted for arena bounds
    PLAYER_START_COL_FRACTION: 0.25,
    AI_START_COL_FRACTION: 0.75,
    START_ROW_FRACTION: 0.5,
};
