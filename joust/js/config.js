// ============================================================
// Joust — Game Configuration Constants
// ============================================================

const CONFIG = {
    // Canvas dimensions
    WIDTH: 800,
    HEIGHT: 600,

    // Physics
    GRAVITY: 600,
    FLAP_FORCE: -220,
    MAX_FALL_SPEED: 350,
    MAX_RISE_SPEED: -400,
    HORIZONTAL_SPEED: 200,
    HORIZONTAL_DRAG: 0.92,
    HORIZONTAL_ACCEL: 800,

    // Player
    PLAYER_WIDTH: 28,
    PLAYER_HEIGHT: 32,
    PLAYER_START_X: 400,
    PLAYER_START_Y: 300,
    PLAYER_LIVES: 3,
    INVINCIBLE_DURATION: 2000,

    // Platform positions: [x, y, width]
    PLATFORMS: [
        // Top row
        [200, 150, 160],
        [600, 150, 160],
        // Middle row
        [400, 280, 200],
        [80, 250, 120],
        [720, 250, 120],
        // Lower row
        [180, 410, 140],
        [620, 410, 140],
        // Ground ledges (above lava)
        [0, 520, 100],
        [700, 520, 100],
    ],
    PLATFORM_HEIGHT: 14,
    PLATFORM_COLOR: 0x8B7355,
    PLATFORM_TOP_COLOR: 0xA0926B,

    // Lava
    LAVA_Y: 565,
    LAVA_HEIGHT: 35,
    LAVA_COLOR: 0xFF4500,
    LAVA_GLOW_COLOR: 0xFF6A00,
    LAVA_HAND_CHANCE: 0.003,
    LAVA_HAND_SPEED: 80,
    LAVA_HAND_REACH: 100,

    // Enemies
    ENEMY_TIERS: {
        BOUNDER: {
            name: 'Bounder',
            color: 0xFF3333,
            speed: 80,
            flapInterval: 1200,
            flapForce: -180,
            score: 500,
            tier: 0
        },
        HUNTER: {
            name: 'Hunter',
            color: 0xAAAAAA,
            speed: 130,
            flapInterval: 800,
            flapForce: -210,
            score: 750,
            tier: 1
        },
        SHADOW_LORD: {
            name: 'Shadow Lord',
            color: 0x4488FF,
            speed: 180,
            flapInterval: 500,
            flapForce: -240,
            score: 1000,
            tier: 2
        }
    },
    ENEMY_WIDTH: 28,
    ENEMY_HEIGHT: 32,

    // Eggs
    EGG_WIDTH: 12,
    EGG_HEIGHT: 14,
    EGG_SCORE: 250,
    EGG_HATCH_TIME: 6000,
    EGG_GRAVITY: 300,
    EGG_COLORS: [0xFF6666, 0xCCCCCC, 0x6688FF],

    // Pterodactyl
    PTERO_SPAWN_DELAY: 30000,
    PTERO_SPEED: 160,
    PTERO_WIDTH: 48,
    PTERO_HEIGHT: 24,
    PTERO_COLOR: 0x884488,
    PTERO_SCORE: 1000,
    PTERO_MOUTH_HITBOX: 8,

    // Waves
    WAVES: [
        { bounders: 3, hunters: 0, shadowLords: 0 },
        { bounders: 3, hunters: 1, shadowLords: 0 },
        { bounders: 2, hunters: 2, shadowLords: 0 },
        { bounders: 2, hunters: 2, shadowLords: 1 },
        { bounders: 1, hunters: 3, shadowLords: 1 },
        { bounders: 1, hunters: 2, shadowLords: 2 },
        { bounders: 0, hunters: 3, shadowLords: 2 },
        { bounders: 0, hunters: 2, shadowLords: 3 },
    ],

    // Colors
    BG_COLOR: 0x1a0a2e,
    TEXT_COLOR: '#FFFFFF',
    SCORE_COLOR: '#FFD700',

    // Storage
    HIGH_SCORE_KEY: 'joustHighScore',

    // Screen wrap margin
    WRAP_MARGIN: 30
};
