// SpaceX Lander - Game Configuration Constants

const CONFIG = {
    // Display
    WIDTH: 800,
    HEIGHT: 600,

    // Physics
    GRAVITY: 40,                    // Earth gravity (px/sec^2)
    ENTRY_THRUST_POWER: 120,        // Multi-engine entry burn
    LANDING_THRUST_POWER: 90,       // Single-engine precision
    GRID_FIN_ROTATION_RATE: 90,     // Degrees/sec at max effectiveness
    GRID_FIN_LATERAL_FORCE: 30,     // Lateral push from fins
    FIN_MAX_SPEED_REF: 200,         // Speed where fins are 100% effective
    THRUST_GIMBAL_RATE: 80,         // Rotation from thrust vectoring (deg/sec)
    RCS_ROTATION_RATE: 45,          // Cold-gas RCS rotation (deg/sec) — fills gap at low speed w/o thrust
    RCS_LATERAL_FORCE: 15,          // RCS lateral push (px/s^2)
    DRAG_COEFFICIENT: 0.001,        // Atmospheric drag (gentle)
    MAX_VELOCITY: 400,

    // Fuel (single pool)
    FUEL_MAX: 1800,
    ENTRY_BURN_RATE: 2.0,
    LANDING_BURN_RATE: 0.8,
    LOW_FUEL_THRESHOLD: 300,

    // Landing thresholds
    LAND_MAX_VY: 35,
    LAND_MAX_VX: 20,
    LAND_MAX_ANGLE: 12,

    // Phase altitude thresholds
    PHASE_2_ALTITUDE: 3500,
    PHASE_3_ALTITUDE: 800,
    LEG_DEPLOY_ALTITUDE: 600,

    // Starting conditions
    START_VY: 100,                  // Initial downward velocity (gentle re-entry, builds with gravity)
    START_Y: -900,                  // Start extremely high for long generous descent (~11,000m)
    ALTITUDE_SCALE: 8,              // Pixel-to-altitude unit scale
    STARTING_LIVES: 3,
    HANDOVER_COUNTDOWN: 2,          // Seconds of auto-descent before human control

    // Scoring
    BASE_LANDING_SCORE: 200,
    FUEL_BONUS_MULTIPLIER: 2,
    PRECISION_BONUS_MAX: 150,
    PHASE_TRANSITION_BONUS: 50,
    SPEED_BONUS_MULTIPLIER: 3,

    // Rocket dimensions
    ROCKET_WIDTH: 16,
    ROCKET_HEIGHT: 70,

    // Camera
    CAMERA: {
        ZOOM_MIN: 0.45,
        ZOOM_MAX: 1.05,
        ZOOM_ALT_REF: 8000,
        ZOOM_LERP: 0.025
    },

    // Ocean
    OCEAN: {
        WATER_LEVEL: 480,
        WAVE_FREQ: 0.02,
        WAVE_SPEED: 0.8,
        SWELL_RATIO: 0.3,
        CHOP_RATIO: 0.2,
        FOAM_THRESHOLD: 5
    },

    // Drone Ship
    DRONE_SHIP: {
        WIDTH: 120,
        HEIGHT: 18,
        TARGET_ZONE_RATIO: 0.6,
        BEACON_PULSE_DURATION: 800,
        GUIDE_LIGHT_HEIGHT: 60
    },

    // Level scaling
    LEVEL: {
        // Sea state
        WAVE_AMP_BASE: 2,
        WAVE_AMP_PER_LEVEL: 1.5,
        WAVE_AMP_MAX: 15,
        // Ship rocking
        ROCK_START_LEVEL: 3,
        ROCK_ANGLE_PER_LEVEL: 1.0,
        ROCK_ANGLE_MAX: 8,
        ROCK_FREQ_BASE: 0.8,
        // Ship drift
        DRIFT_START_LEVEL: 6,
        DRIFT_SPEED_PER_LEVEL: 5,
        DRIFT_SPEED_MAX: 25,
        // Wind
        WIND_START_LEVEL: 3,
        WIND_PER_LEVEL: 4,
        WIND_MAX: 25,
        // Fuel penalty
        FUEL_PENALTY_START_LEVEL: 3,
        FUEL_PENALTY_PER_LEVEL: 0.04,
        FUEL_PENALTY_MAX: 0.35,
        // Ship size shrink
        SHIP_SHRINK_FACTOR: 0.97,
        // Entry angle progression
        ENTRY_ANGLE_START_LEVEL: 2,
        ENTRY_ANGLE_PER_LEVEL: 3,
        ENTRY_ANGLE_MAX: 25,
        ENTRY_VX_PER_LEVEL: 8,
        ENTRY_VX_MAX: 60
    },

    // Colors
    COLORS: {
        // Sky/Space
        SPACE: 0x050510,
        SKY_TOP: 0x1a3a6a,
        SKY_MID: 0x4477bb,
        SKY_BOTTOM: 0x6aaae8,

        // Ocean
        OCEAN_SURFACE: 0x1a5a8a,
        OCEAN_MID: 0x0e3a5a,
        OCEAN_DEEP: 0x0a1a3a,
        OCEAN_FOAM: 0xccddee,
        OCEAN_HIGHLIGHT: 0x2288bb,

        // Rocket
        ROCKET_BODY: 0xeeeeee,
        ROCKET_INTERSTAGE: 0x222222,
        ROCKET_ENGINE: 0x888888,
        ROCKET_STROKE: 0xcccccc,
        GRID_FIN: 0x999999,
        LANDING_LEG: 0xcccccc,
        LEG_FOOT: 0xaaaaaa,

        // Drone Ship
        SHIP_HULL: 0x444444,
        SHIP_DECK: 0x666666,
        SHIP_MARKING: 0xffff00,
        SHIP_BARRIER: 0xffaa00,
        SHIP_BEACON: 0x00ff66,

        // Effects
        ENTRY_FLAME: [0xff4400, 0xff8800, 0xffcc00],
        LANDING_FLAME: [0x4488ff, 0x88bbff, 0xffffff],
        REENTRY_GLOW: [0xff2200, 0xff6600, 0xffaa00],
        EXPLOSION: [0xff4400, 0xff8800, 0xffcc00, 0xffffff],

        // HUD
        HUD_TEXT: '#44ff88',
        HUD_WARNING: '#ff4444',
        HUD_PHASE_1: '#ff4444',
        HUD_PHASE_2: '#ffcc44',
        HUD_PHASE_3: '#44ff88',
        FUEL_FULL: 0x00ff00,
        FUEL_LOW: 0xff3300,
        WIND_ARROW: 0x4488ff,
        SHOCKWAVE: 0xffffff
    },

    // VFX Configuration
    VFX: {
        // Stars
        STAR_LAYERS: [
            { count: 120, sizeMin: 0.3, sizeMax: 1.0, speed: 0.02, alphaMin: 0.15, alphaMax: 0.5 },
            { count: 60, sizeMin: 0.8, sizeMax: 1.8, speed: 0.05, alphaMin: 0.3, alphaMax: 0.7 },
            { count: 25, sizeMin: 1.5, sizeMax: 2.8, speed: 0.1, alphaMin: 0.5, alphaMax: 1.0 }
        ],

        // Entry burn exhaust (multi-engine, wide)
        ENTRY_CORE: { speed: [140, 240], life: 200, scale: [0.8, 0], tint: 0xffffff, rate: 40 },
        ENTRY_FLAME: { speed: [100, 200], life: 350, scale: [1.2, 0], tint: [0xff8800, 0xff6600, 0xffaa00], rate: 35 },
        ENTRY_SMOKE: { speed: [30, 80], life: 800, scale: [0.5, 2.0], alpha: [0.3, 0], tint: 0x555555, rate: 15 },

        // Landing burn exhaust (single engine, narrow)
        LAND_CORE: { speed: [80, 150], life: 160, scale: [0.5, 0], tint: 0xffffff, rate: 25 },
        LAND_FLAME: { speed: [50, 120], life: 250, scale: [0.8, 0], tint: [0x6699ff, 0x88bbff, 0xaaddff], rate: 20 },
        LAND_SMOKE: { speed: [15, 50], life: 600, scale: [0.3, 1.5], alpha: [0.2, 0], tint: 0x666666, rate: 10 },

        // Re-entry glow
        REENTRY_GLOW_SPEED: [20, 60],
        REENTRY_GLOW_LIFE: 500,
        REENTRY_GLOW_RATE: 30,

        // Grid fin puffs
        FIN_PUFF_SPEED: [10, 30],
        FIN_PUFF_LIFE: 150,
        FIN_PUFF_QUANTITY: 2,

        // Explosion
        EXPLOSION_FLASH_LIFE: 120,
        EXPLOSION_FIREBALL_COUNT: 40,
        EXPLOSION_FIREBALL_SPEED: [60, 250],
        EXPLOSION_FIREBALL_LIFE: 700,
        EXPLOSION_DEBRIS_COUNT: 20,
        EXPLOSION_DEBRIS_SPEED: [70, 220],
        EXPLOSION_DEBRIS_LIFE: 1500,
        EXPLOSION_SHOCKWAVE_DURATION: 500,
        EXPLOSION_SHOCKWAVE_RADIUS: 90,

        // Ocean spray (on landing)
        SPRAY_COUNT: 30,
        SPRAY_SPEED: [40, 120],
        SPRAY_LIFE: 800,

        // Fireworks (celebration)
        FIREWORK_BURSTS: 5,
        FIREWORK_PARTICLES: 50,
        FIREWORK_SPEED: [80, 200],
        FIREWORK_LIFE: 1100,
        FIREWORK_COLORS: [0xff2244, 0x22ff44, 0x4466ff, 0xffff22, 0xff44ff, 0x44ffff],

        // Sonic boom
        SONIC_BOOM_RADIUS: 120,
        SONIC_BOOM_DURATION: 600
    },

    // Mission names for each level
    MISSIONS: [
        'CRS-1', 'CRS-2', 'SES-8', 'Thaicom 6', 'Orbcomm OG2',
        'DSCOVR', 'TurkmenAlem', 'Jason-3', 'SES-9', 'CRS-8',
        'JCSAT-14', 'Thaicom 8', 'CRS-9', 'JCSAT-16', 'Amos-6'
    ],

    // LocalStorage
    HIGH_SCORE_KEY: 'spacexLanderHighScore'
};
