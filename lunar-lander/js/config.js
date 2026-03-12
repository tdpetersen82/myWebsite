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

    // Particles
    THRUST_PARTICLE_COUNT: 3,
    EXPLOSION_PARTICLE_COUNT: 30,
    PARTICLE_LIFETIME: 800,  // ms

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
        TERRAIN_STROKE: 0x999999,
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
        WIND_ARROW: 0x4488ff
    },

    // LocalStorage
    HIGH_SCORE_KEY: 'lunarLanderHighScore'
};
