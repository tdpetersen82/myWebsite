// ============================================================
// Donkey Kong — Game Configuration & Constants
// ============================================================

const DK_CONFIG = {
    // Canvas / world
    WIDTH: 800,
    HEIGHT: 600,

    // Physics
    GRAVITY: 900,
    PLAYER_SPEED: 160,
    PLAYER_JUMP_FORCE: -340,
    CLIMB_SPEED: 120,

    // Barrel behaviour
    BARREL_SPEED_BASE: 100,
    BARREL_SPEED_INCREMENT: 10,       // per level
    BARREL_SPAWN_INTERVAL_BASE: 2500, // ms
    BARREL_SPAWN_INTERVAL_MIN: 800,
    BARREL_SPAWN_INTERVAL_DECREMENT: 200, // per level
    BARREL_LADDER_CHANCE: 0.30,       // 30 % chance a barrel takes a ladder

    // Fire enemy
    FIRE_ENEMY_SPEED: 60,
    FIRE_ENEMY_LADDER_CHANCE: 0.5,

    // Hammer
    HAMMER_DURATION: 10000,           // ms
    HAMMER_FLASH_INTERVAL: 150,       // ms

    // Scoring
    SCORE_BARREL_JUMP: 100,
    SCORE_BARREL_JUMP_MULTI: 300,     // 2+ barrels at once
    SCORE_BARREL_SMASH: 300,
    SCORE_LEVEL_COMPLETE: 1000,

    // Lives
    STARTING_LIVES: 3,

    // Colours
    COLOR_BG: 0x000000,
    COLOR_GIRDER: 0xcc3333,           // red girders
    COLOR_GIRDER_EDGE: 0x3355cc,      // blue accent
    COLOR_LADDER: 0x8B6914,           // brown ladders
    COLOR_PLAYER: 0xdd2222,           // Mario red
    COLOR_PLAYER_SKIN: 0xffccaa,
    COLOR_DK: 0x8B4513,              // brown
    COLOR_DK_DARK: 0x5C2E00,
    COLOR_BARREL: 0x8B4513,
    COLOR_BARREL_BAND: 0xCD853F,
    COLOR_HAMMER: 0x888888,
    COLOR_HAMMER_HEAD: 0xcccc00,
    COLOR_FIRE: 0xff4400,
    COLOR_OIL_DRUM: 0x444488,
    COLOR_PAULINE: 0xff69b4,
    COLOR_TEXT: '#ffffff',
    COLOR_TITLE: '#ff4444',

    // Platform layout — each platform is { y, x1, x2, slope }
    // slope: pixels drop per unit x (positive = slopes right-to-left going down)
    // Classic DK has 6 girders (including top & bottom)
    PLATFORMS: [
        // Bottom platform (flat ground)
        { y: 568, x1: 0, x2: 800, slope: 0 },
        // Girder 1 — slopes left
        { y: 468, x1: 40, x2: 760, slope: -0.04 },
        // Girder 2 — slopes right
        { y: 368, x1: 40, x2: 760, slope: 0.04 },
        // Girder 3 — slopes left
        { y: 268, x1: 40, x2: 760, slope: -0.04 },
        // Girder 4 — slopes right
        { y: 188, x1: 40, x2: 760, slope: 0.04 },
        // Top platform (DK / Pauline) — short
        { y: 120, x1: 100, x2: 450, slope: 0 },
    ],

    // Ladders — each is { x, yTop, yBottom }
    LADDERS: [
        // Between bottom and girder 1
        { x: 700, yTop: 468, yBottom: 568 },
        { x: 380, yTop: 468, yBottom: 568 },
        // Between girder 1 and girder 2
        { x: 120, yTop: 368, yBottom: 468 },
        { x: 500, yTop: 368, yBottom: 468 },
        // Between girder 2 and girder 3
        { x: 680, yTop: 268, yBottom: 368 },
        { x: 300, yTop: 268, yBottom: 368 },
        // Between girder 3 and girder 4
        { x: 140, yTop: 188, yBottom: 268 },
        { x: 550, yTop: 188, yBottom: 268 },
        // Between girder 4 and top platform
        { x: 200, yTop: 120, yBottom: 188 },
    ],

    // Hammer pickup positions (platform index, x)
    HAMMERS: [
        { x: 120, y: 440 },
        { x: 660, y: 240 },
    ],

    // Oil drum position (bottom left area)
    OIL_DRUM: { x: 80, y: 538, width: 40, height: 50 },

    // Pauline position
    PAULINE: { x: 260, y: 88 },

    // DK position
    DK_POSITION: { x: 160, y: 70 },

    // Player start
    PLAYER_START: { x: 100, y: 540 },

    // localStorage key
    HIGH_SCORE_KEY: 'donkeyKongHighScore',

    // Difficulty scaling
    MAX_LEVEL: 10,
    FIRE_BARREL_START_LEVEL: 2, // fire barrels begin at level 2
};
