// Lunar Lander - Game Configuration Constants

const CONFIG = {
    // Display
    WIDTH: 800,
    HEIGHT: 600,

    // Physics
    GRAVITY: 30,            // pixels/sec^2 (lunar gravity ~1.6 m/s^2 feel)
    THRUST_POWER: 80,       // pixels/sec^2 upward when thrusting
    ROTATION_SPEED: 120,    // degrees per second
    MAX_VELOCITY: 300,      // terminal velocity cap

    // Fuel
    FUEL_MAX: 1000,
    FUEL_BURN_RATE: 1.2,    // fuel units per frame at 60fps equivalent
    LOW_FUEL_THRESHOLD: 200,

    // Landing thresholds
    LAND_MAX_VY: 40,        // max vertical speed for safe landing
    LAND_MAX_VX: 20,        // max horizontal speed for safe landing
    LAND_MAX_ANGLE: 15,     // max degrees from vertical for safe landing

    // Scoring
    FUEL_BONUS_MULTIPLIER: 2,
    BASE_LANDING_SCORE: 100,

    // Lives
    STARTING_LIVES: 3,

    // Terrain generation
    TERRAIN_SEGMENTS: 60,
    TERRAIN_MIN_HEIGHT: 100,  // min height from bottom
    TERRAIN_MAX_HEIGHT: 400,  // max height from bottom
    TERRAIN_ROUGHNESS: 0.6,

    // Landing pads
    PAD_SIZES: {
        LARGE: 80,    // 1x multiplier
        MEDIUM: 55,   // 2x multiplier
        SMALL: 35     // 3x multiplier
    },

    // Wind
    WIND_MAX_FORCE: 15,     // max wind force pixels/sec^2

    // Lander dimensions
    LANDER_WIDTH: 20,
    LANDER_HEIGHT: 24,

    // Difficulty scaling per level
    DIFFICULTY: {
        terrainRoughnessIncrease: 0.08,
        padShrinkFactor: 0.92,
        windStartLevel: 3,
        windIncreasePerLevel: 4,
        extraSegmentsPerLevel: 5
    },

    // Colors
    COLORS: {
        SKY: 0x000011,
        TERRAIN: 0x666666,
        TERRAIN_DARK: 0x333333,
        TERRAIN_LIGHT: 0x888888,
        TERRAIN_STROKE: 0x999999,
        TERRAIN_EDGE_GLOW: 0x888888,
        LANDER_BODY: 0xcccccc,
        LANDER_STROKE: 0xffffff,
        THRUST_FLAME: 0xff6600,
        PAD_1X: 0x00ff00,
        PAD_2X: 0xffff00,
        PAD_3X: 0xff4444,
        HUD_TEXT: '#00ff00',
        FUEL_FULL: 0x00ff00,
        FUEL_LOW: 0xff3300,
        STAR: 0xffffff,
        EXPLOSION: [0xff4400, 0xff8800, 0xffcc00, 0xffffff],
        WIND_ARROW: 0x4488ff,
        EARTH: 0x4488cc,
        EARTH_GLOW: 0x2266aa,
        EARTH_LAND: 0x228844,
        NEBULA: [0x330066, 0x220044, 0x110055, 0x001144],
        LANDER_WINDOW_GLOW: 0x66bbff,
        SHOCKWAVE: 0xffffff,
        RCS_PUFF: 0xaaddff
    },

    // VFX Configuration
    VFX: {
        // Stars
        STAR_LAYERS: [
            { count: 120, sizeMin: 0.3, sizeMax: 1.0, speed: 0.02, alphaMin: 0.15, alphaMax: 0.5 },
            { count: 60, sizeMin: 0.8, sizeMax: 1.8, speed: 0.05, alphaMin: 0.3, alphaMax: 0.7 },
            { count: 25, sizeMin: 1.5, sizeMax: 2.8, speed: 0.1, alphaMin: 0.5, alphaMax: 1.0 }
        ],
        STAR_TWINKLE_MIN: 1000,
        STAR_TWINKLE_MAX: 4000,
        NEBULA_COUNT: 4,

        // Thrust particles
        THRUST_CORE: { speed: [100, 180], life: 180, scale: [0.6, 0], tint: 0xffffff, rate: 30 },
        THRUST_FLAME: { speed: [70, 150], life: 300, scale: [1.0, 0], tint: [0xff8800, 0xff6600, 0xffaa00], rate: 25 },
        THRUST_SMOKE: { speed: [20, 60], life: 700, scale: [0.4, 1.8], alpha: [0.25, 0], tint: 0x555555, rate: 12 },

        // RCS puffs
        RCS_SPEED: [15, 35],
        RCS_LIFE: 180,
        RCS_SCALE: [0.3, 0],
        RCS_RATE: 0,
        RCS_QUANTITY: 2,

        // Explosion
        EXPLOSION_FLASH_LIFE: 120,
        EXPLOSION_FIREBALL_COUNT: 35,
        EXPLOSION_FIREBALL_SPEED: [50, 220],
        EXPLOSION_FIREBALL_LIFE: 600,
        EXPLOSION_DEBRIS_COUNT: 15,
        EXPLOSION_DEBRIS_SPEED: [60, 200],
        EXPLOSION_DEBRIS_LIFE: 1400,
        EXPLOSION_SHOCKWAVE_DURATION: 450,
        EXPLOSION_SHOCKWAVE_RADIUS: 80,
        EXPLOSION_SHAKE_INTENSITY: 0.025,
        EXPLOSION_SHAKE_DURATION: 600,

        // Landing
        LANDING_DUST_COUNT: 25,
        LANDING_DUST_SPEED: [30, 90],
        LANDING_DUST_LIFE: 900,

        // Fireworks
        FIREWORK_BURSTS: 5,
        FIREWORK_PARTICLES: 50,
        FIREWORK_SPEED: [80, 200],
        FIREWORK_LIFE: 1100,
        FIREWORK_COLORS: [0xff2244, 0x22ff44, 0x4466ff, 0xffff22, 0xff44ff, 0x44ffff],

        // Camera FX
        VIGNETTE_STRENGTH: 0.5,
        BLOOM_STRENGTH: 0.6,
        BLOOM_BLUR: 1.5,
        BLOOM_STEPS: 4,
        DESCENT_ZOOM_MAX: 0.12,

        // Terrain
        CRATER_COUNT: 8,
        REGOLITH_DOT_COUNT: 70,
        STRATA_LINES: 3,

        // Landing pad
        BEACON_PULSE_DURATION: 800,
        GUIDE_LIGHT_HEIGHT: 50,
        GUIDE_LIGHT_SEGMENTS: 6,

        // Atmosphere
        DUST_MOTE_COUNT: 12,
        SHOOTING_STAR_MIN_INTERVAL: 6000,
        SHOOTING_STAR_MAX_INTERVAL: 18000,

        // Earth
        EARTH_RADIUS: 35,
        EARTH_X: 680,
        EARTH_Y: 55
    },

    // LocalStorage
    HIGH_SCORE_KEY: 'lunarLanderHighScore'
};
