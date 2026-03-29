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
    // yTop/yBottom adjusted to match actual sloped platform Y at each ladder's X
    LADDERS: [
        // Between bottom (flat y=568) and girder 1 (slope -0.04)
        { x: 700, yTop: 442, yBottom: 568 },   // 468+(700-40)*-0.04 = 442
        { x: 380, yTop: 454, yBottom: 568 },   // 468+(380-40)*-0.04 = 454
        // Between girder 1 (slope -0.04) and girder 2 (slope 0.04)
        { x: 120, yTop: 371, yBottom: 465 },   // top: 368+(120-40)*0.04=371, bot: 468+(120-40)*-0.04=465
        { x: 500, yTop: 386, yBottom: 450 },   // top: 368+(500-40)*0.04=386, bot: 468+(500-40)*-0.04=450
        // Between girder 2 (slope 0.04) and girder 3 (slope -0.04)
        { x: 680, yTop: 242, yBottom: 394 },   // top: 268+(680-40)*-0.04=242, bot: 368+(680-40)*0.04=394
        { x: 300, yTop: 258, yBottom: 378 },   // top: 268+(300-40)*-0.04=258, bot: 368+(300-40)*0.04=378
        // Between girder 3 (slope -0.04) and girder 4 (slope 0.04)
        { x: 140, yTop: 192, yBottom: 264 },   // top: 188+(140-40)*0.04=192, bot: 268+(140-40)*-0.04=264
        { x: 550, yTop: 208, yBottom: 248 },   // top: 188+(550-40)*0.04=208, bot: 268+(550-40)*-0.04=248
        // Between girder 4 (slope 0.04) and top platform (flat y=120)
        { x: 200, yTop: 120, yBottom: 194 },   // top: flat 120, bot: 188+(200-40)*0.04=194
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
