// Bomberman Game Configuration
const CONFIG = {
    // Display
    WIDTH: 800,
    HEIGHT: 600,

    // Grid
    GRID_COLS: 15,
    GRID_ROWS: 13,
    TILE_SIZE: 0, // computed at runtime

    // Offsets (computed at runtime to center the grid)
    OFFSET_X: 0,
    OFFSET_Y: 0,

    // Colors
    COLORS: {
        FLOOR_A: 0x4CAF50,
        FLOOR_B: 0x388E3C,
        HARD_WALL: 0x757575,
        HARD_WALL_LIGHT: 0x9E9E9E,
        SOFT_BLOCK: 0x8D6E63,
        SOFT_BLOCK_LIGHT: 0xA1887F,
        PLAYER: 0xFFFFFF,
        PLAYER_VISOR: 0x2196F3,
        BOMB_BODY: 0x212121,
        BOMB_FUSE: 0xFF9800,
        EXPLOSION: 0xFF5722,
        EXPLOSION_CENTER: 0xFFEB3B,
        DOOR: 0xFFD54F,
        // Enemy colors
        BALLOM: 0xFF6600,
        ONEAL: 0x2196F3,
        DAHL: 0x9C27B0,
        // Power-up colors
        PU_BOMB: 0xFF5722,
        PU_RANGE: 0xF44336,
        PU_SPEED: 0x2196F3,
        PU_WALLPASS: 0x9C27B0,
        PU_BOMBPASS: 0x4CAF50,
        // UI
        BG: 0x1a1a2e,
        TEXT: '#FFFFFF',
        ACCENT: '#FFD54F',
        HUD_BG: 0x0f0f23,
    },

    // Grid cell types
    CELL: {
        EMPTY: 0,
        HARD_WALL: 1,
        SOFT_BLOCK: 2,
        DOOR: 3,
    },

    // Power-up types
    POWERUP: {
        EXTRA_BOMB: 'extra_bomb',
        BLAST_RANGE: 'blast_range',
        SPEED_UP: 'speed_up',
        WALL_PASS: 'wall_pass',
        BOMB_PASS: 'bomb_pass',
    },

    // Enemy types
    ENEMY_TYPE: {
        BALLOM: 'ballom',
        ONEAL: 'oneal',
        DAHL: 'dahl',
    },

    // Player defaults
    PLAYER: {
        START_LIVES: 3,
        DEFAULT_SPEED: 3,       // tiles per second
        DEFAULT_BOMBS: 1,
        DEFAULT_RANGE: 1,
        MOVE_COOLDOWN: 150,     // ms between moves
    },

    // Bomb
    BOMB: {
        FUSE_TIME: 3000,        // 3 seconds
    },

    // Explosion
    EXPLOSION: {
        DURATION: 500,          // ms
    },

    // Enemy speeds (tiles per second)
    ENEMY: {
        BALLOM_SPEED: 1.5,
        ONEAL_SPEED: 2.0,
        DAHL_SPEED: 3.0,
        MOVE_INTERVAL_BASE: 400, // ms
        CHASE_PROBABILITY: 0.6,
    },

    // Scoring
    SCORE: {
        BALLOM: 100,
        ONEAL: 200,
        DAHL: 400,
        SOFT_BLOCK: 10,
        LEVEL_CLEAR: 1000,
    },

    // Difficulty scaling per level
    DIFFICULTY: {
        BASE_SOFT_BLOCKS: 40,
        BASE_ENEMIES: { ballom: 3, oneal: 1, dahl: 0 },
        ENEMY_INCREMENT: { ballom: 1, oneal: 1, dahl: 0.5 },
        SPEED_MULTIPLIER_PER_LEVEL: 0.05,
        MAX_SOFT_BLOCK_RATIO: 0.55,
    },

    // Power-up distribution (probability weights)
    POWERUP_WEIGHTS: {
        extra_bomb: 30,
        blast_range: 30,
        speed_up: 20,
        wall_pass: 10,
        bomb_pass: 10,
    },

    // Number of power-ups per level
    POWERUPS_PER_LEVEL: 4,

    // Local storage key
    STORAGE_KEY: 'bombermanHighScore',
};

// Compute tile size and offsets at load time
(function computeLayout() {
    // Reserve 40px at top for HUD
    const HUD_HEIGHT = 40;
    const playAreaHeight = CONFIG.HEIGHT - HUD_HEIGHT;
    const tileW = Math.floor(CONFIG.WIDTH / CONFIG.GRID_COLS);
    const tileH = Math.floor(playAreaHeight / CONFIG.GRID_ROWS);
    CONFIG.TILE_SIZE = Math.min(tileW, tileH);
    CONFIG.OFFSET_X = Math.floor((CONFIG.WIDTH - CONFIG.GRID_COLS * CONFIG.TILE_SIZE) / 2);
    CONFIG.OFFSET_Y = HUD_HEIGHT + Math.floor((playAreaHeight - CONFIG.GRID_ROWS * CONFIG.TILE_SIZE) / 2);
    CONFIG.HUD_HEIGHT = HUD_HEIGHT;
})();
