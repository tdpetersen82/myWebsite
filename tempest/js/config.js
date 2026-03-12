// ============================================================
// Tempest — Game Configuration & Constants
// ============================================================

const CONFIG = {
    WIDTH: 800,
    HEIGHT: 600,
    CENTER_X: 400,
    CENTER_Y: 300,

    // Tube rendering
    TUBE_OUTER_RADIUS: 260,
    TUBE_INNER_RADIUS: 40,
    TUBE_DEPTH_STEPS: 8,

    // Player
    PLAYER_SIZE: 14,
    BULLET_SPEED: 12,
    MAX_BULLETS: 4,
    SHOOT_COOLDOWN: 120,

    // Enemies
    ENEMY_BASE_SPEED: 0.003,
    FLIPPER_FLIP_CHANCE: 0.008,
    SPIKER_RETREAT_CHANCE: 0.01,
    FUSEBALL_SPEED: 0.02,

    // Scoring
    SCORE_FLIPPER: 150,
    SCORE_TANKER: 250,
    SCORE_SPIKER: 50,
    SCORE_FUSEBALL: 750,
    SCORE_SPIKE: 25,

    // Super Zapper
    ZAPPER_FLASH_DURATION: 300,

    // Colors (vector style)
    COLOR_TUBE: 0x0044ff,
    COLOR_TUBE_ACTIVE: 0x00aaff,
    COLOR_PLAYER: 0xffff00,
    COLOR_BULLET: 0xffff00,
    COLOR_FLIPPER: 0xff0000,
    COLOR_TANKER: 0xff00ff,
    COLOR_SPIKER: 0x00ff00,
    COLOR_SPIKE_TRAIL: 0x00aa00,
    COLOR_FUSEBALL: 0xff8800,
    COLOR_ZAPPER: 0xffffff,
    COLOR_TEXT: 0xffff00,
    COLOR_RIM_GLOW: 0x4488ff,

    // Warp
    WARP_SPEED: 0.02,
    WARP_DURATION: 2000,

    // Lives
    STARTING_LIVES: 3,
    EXTRA_LIFE_SCORE: 20000,

    // localStorage
    HIGH_SCORE_KEY: 'tempestHighScore',
};

// 16 tube shape definitions
// Each defines lane endpoints as angles or coordinates
// type: 'circle' | 'polygon' | 'open'
// lanes: number of lanes
// open: whether the tube is open-ended (flat/V-shape)
const TUBE_DEFS = [
    // Level 1: Circle (16 lanes)
    { type: 'circle', lanes: 16, open: false, label: 'Circle' },
    // Level 2: Square (16 lanes)
    { type: 'polygon', sides: 4, lanes: 16, open: false, label: 'Square' },
    // Level 3: Plus/Cross (16 lanes)
    { type: 'plus', lanes: 16, open: false, label: 'Plus' },
    // Level 4: Triangle (15 lanes)
    { type: 'polygon', sides: 3, lanes: 15, open: false, label: 'Triangle' },
    // Level 5: Pentagon (15 lanes)
    { type: 'polygon', sides: 5, lanes: 15, open: false, label: 'Pentagon' },
    // Level 6: Flat line (16 lanes, open)
    { type: 'flat', lanes: 16, open: true, label: 'Flat' },
    // Level 7: V-shape (14 lanes, open)
    { type: 'vshape', lanes: 14, open: true, label: 'V-Shape' },
    // Level 8: Star (16 lanes)
    { type: 'star', points: 8, lanes: 16, open: false, label: 'Star' },
    // Level 9: Heart shape (16 lanes)
    { type: 'polygon', sides: 6, lanes: 16, open: false, label: 'Hexagon' },
    // Level 10: W-shape (16 lanes, open)
    { type: 'wshape', lanes: 16, open: true, label: 'W-Shape' },
    // Level 11: Infinity/Figure-8 (16 lanes)
    { type: 'figure8', lanes: 16, open: false, label: 'Figure-8' },
    // Level 12: Octagon (16 lanes)
    { type: 'polygon', sides: 8, lanes: 16, open: false, label: 'Octagon' },
    // Level 13: Cross (12 lanes)
    { type: 'cross', lanes: 12, open: false, label: 'Cross' },
    // Level 14: U-shape (14 lanes, open)
    { type: 'ushape', lanes: 14, open: true, label: 'U-Shape' },
    // Level 15: Clover (16 lanes)
    { type: 'clover', lanes: 16, open: false, label: 'Clover' },
    // Level 16: Diamond (16 lanes)
    { type: 'polygon', sides: 4, lanes: 16, open: false, rotation: Math.PI / 4, label: 'Diamond' },
];

// Difficulty scaling per level
function getLevelConfig(level) {
    const idx = (level - 1) % TUBE_DEFS.length;
    const cycle = Math.floor((level - 1) / TUBE_DEFS.length);
    const diff = 1 + cycle * 0.5;
    return {
        tubeDef: TUBE_DEFS[idx],
        enemySpeed: CONFIG.ENEMY_BASE_SPEED * (1 + level * 0.08) * diff,
        flipperCount: Math.min(3 + Math.floor(level * 1.2), 20),
        tankerCount: Math.min(Math.floor(level * 0.4), 8),
        spikerCount: Math.min(Math.floor(level * 0.3), 6),
        fuseBallCount: level >= 3 ? Math.min(Math.floor((level - 2) * 0.3), 4) : 0,
        spawnInterval: Math.max(2000 - level * 80, 600),
        flipChance: CONFIG.FLIPPER_FLIP_CHANCE * (1 + level * 0.05),
        tubeColor: LEVEL_COLORS[idx % LEVEL_COLORS.length],
    };
}

const LEVEL_COLORS = [
    0x0088ff, // blue
    0xff0044, // red
    0x00ff88, // green
    0xff8800, // orange
    0x8800ff, // purple
    0xff00ff, // magenta
    0x00ffff, // cyan
    0xffff00, // yellow
    0xff4488, // pink
    0x44ff88, // mint
    0x8844ff, // violet
    0xff8844, // coral
    0x44ffff, // sky
    0xffff44, // gold
    0xff44ff, // fuchsia
    0x88ff44, // lime
];
