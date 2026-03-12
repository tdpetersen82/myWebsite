// Dig Dug - Game Configuration Constants

const CONFIG = {
    // Display
    WIDTH: 800,
    HEIGHT: 600,

    // Grid
    GRID_COLS: 20,
    GRID_ROWS: 15,
    CELL_WIDTH: 40,   // 800 / 20
    CELL_HEIGHT: 40,   // 600 / 15

    // Top area (sky/surface) - first row is above ground
    SKY_ROWS: 1,

    // Colors
    COLORS: {
        SKY: 0x87CEEB,
        DIRT: 0x8B4513,
        DIRT_LIGHT: 0xA0522D,
        DIRT_DARK: 0x654321,
        TUNNEL: 0x000000,
        PLAYER: 0xFFFFFF,
        PLAYER_SUIT: 0x4169E1,
        PLAYER_VISOR: 0x00BFFF,
        POOKA: 0xFF4444,
        POOKA_GOGGLE: 0xFFFF00,
        FYGAR: 0x00CC00,
        FYGAR_WING: 0xFFAA00,
        FYGAR_FIRE: 0xFF6600,
        ROCK: 0x888888,
        ROCK_DARK: 0x666666,
        PUMP_HOSE: 0xFFFFFF,
        INFLATED_1: 0xFF6666,
        INFLATED_2: 0xFF8888,
        INFLATED_3: 0xFFAAAA,
        VEGGIE: 0xFF8800,
        HUD_TEXT: 0xFFFFFF,
        FLOWER: 0xFF69B4,
        STEM: 0x228B22
    },

    // Player
    PLAYER_SPEED: 120,
    PUMP_RANGE: 3,         // cells the pump can reach
    PUMP_INFLATE_TIME: 400, // ms between inflation stages
    PUMP_DEFLATE_TIME: 1200, // ms before enemy deflates one stage
    MAX_INFLATE: 4,        // pumps to pop

    // Enemies
    POOKA_SPEED: 60,
    FYGAR_SPEED: 55,
    GHOST_SPEED: 30,
    GHOST_CHANCE: 0.005,    // chance per frame to start ghosting
    GHOST_DURATION: 3000,   // ms ghosting lasts
    FIRE_RANGE: 3,          // cells fire extends
    FIRE_DURATION: 800,     // ms fire lasts
    FIRE_COOLDOWN: 3000,    // ms between fire attacks
    FLEE_SPEED_MULT: 1.5,

    // Rocks
    ROCK_FALL_DELAY: 500,   // ms before rock starts falling
    ROCK_FALL_SPEED: 200,   // pixels per second
    ROCK_WOBBLE_TIME: 500,  // ms of wobble before falling

    // Scoring
    SCORE: {
        PUMP_KILL_LAYER1: 200,  // kill in top quarter
        PUMP_KILL_LAYER2: 300,
        PUMP_KILL_LAYER3: 400,
        PUMP_KILL_LAYER4: 500,  // kill in bottom quarter
        ROCK_KILL_1: 1000,
        ROCK_KILL_2: 2500,
        ROCK_KILL_3: 4000,
        ROCK_KILL_4: 6000,
        ROCK_KILL_5: 8000,
        VEGGIE_BASE: 400,
        FYGAR_HORIZONTAL_BONUS: 2  // multiplier for killing Fygar from side
    },

    // Vegetables (appear after 2 rocks dropped)
    VEGETABLES: ['carrot', 'turnip', 'mushroom', 'cucumber', 'eggplant', 'pepper', 'tomato', 'garlic'],
    VEGGIE_SCORES: [400, 600, 800, 1000, 2000, 3000, 4000, 5000],
    VEGGIE_DURATION: 8000,  // ms before veggie disappears

    // Difficulty per level
    LEVELS: {
        getEnemyCount: function(level) {
            return Math.min(3 + level, 8);
        },
        getPookaCount: function(level) {
            if (level < 3) return this.getEnemyCount(level);
            return Math.max(2, this.getEnemyCount(level) - Math.floor((level - 1) / 2));
        },
        getFygarCount: function(level) {
            if (level < 3) return 0;
            return this.getEnemyCount(level) - this.getPookaCount(level);
        },
        getSpeedMult: function(level) {
            return 1 + (level - 1) * 0.08;
        },
        getRockCount: function(level) {
            return Math.min(2 + Math.floor(level / 2), 6);
        }
    },

    // Lives
    STARTING_LIVES: 3,

    // LocalStorage
    STORAGE_KEY: 'digDugHighScore'
};
