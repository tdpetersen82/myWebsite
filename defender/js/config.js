// defender/js/config.js — Game constants and configuration

const CONFIG = {
    // Canvas
    WIDTH: 800,
    HEIGHT: 600,

    // World
    WORLD_WIDTH: 4000,
    GROUND_Y: 560,

    // Colors (neon arcade style)
    COLORS: {
        BLACK: 0x000000,
        WHITE: 0xffffff,
        SHIP: 0x00ff00,
        SHIP_THRUST: 0xff8800,
        BULLET: 0xffff00,
        LANDER: 0x00ffff,
        MUTANT: 0xff00ff,
        BOMBER: 0xff4444,
        BOMBER_MINE: 0xff8888,
        POD: 0x8888ff,
        SWARMER: 0xffaa00,
        HUMANOID: 0x00ff88,
        HUMANOID_CARRIED: 0xff8800,
        TERRAIN: 0x884400,
        TERRAIN_FILL: 0x221100,
        RADAR_BG: 0x111122,
        RADAR_BORDER: 0x4444aa,
        RADAR_PLAYER: 0x00ff00,
        RADAR_ENEMY: 0xff0000,
        RADAR_HUMANOID: 0x00ff88,
        HUD_TEXT: 0xffffff,
        SMART_BOMB_ICON: 0xffff00,
        EXPLOSION: [0xffffff, 0xffff00, 0xff8800, 0xff4400, 0xff0000],
        STAR: 0xaaaacc,
        TITLE: 0x00ccff,
        MENU_TEXT: 0xffffff,
        MENU_HIGHLIGHT: 0xffff00,
        PLANET_EXPLODE_SKY: 0x440000,
    },

    // Ship
    SHIP: {
        SPEED: 300,
        THRUST_ACCEL: 600,
        DRAG: 200,
        VERTICAL_SPEED: 250,
        WIDTH: 32,
        HEIGHT: 16,
        FIRE_RATE: 120,        // ms between shots
        MAX_LIVES: 5,
        START_LIVES: 3,
        SMART_BOMBS_PER_LIFE: 3,
        HYPERSPACE_DEATH_CHANCE: 0.15,
        INVINCIBLE_TIME: 2000,
    },

    // Bullet
    BULLET: {
        SPEED: 600,
        LIFETIME: 800,        // ms
        LENGTH: 16,
        HEIGHT: 2,
    },

    // Enemies
    LANDER: {
        SPEED: 60,
        DESCENT_SPEED: 40,
        ASCENT_SPEED: 50,
        GRAB_RANGE: 20,
        WIDTH: 20,
        HEIGHT: 20,
        HP: 1,
    },

    MUTANT: {
        SPEED: 180,
        CHASE_ACCEL: 300,
        WIDTH: 20,
        HEIGHT: 20,
        HP: 1,
    },

    BOMBER: {
        SPEED: 80,
        MINE_DROP_INTERVAL: 2000,
        WIDTH: 22,
        HEIGHT: 14,
        MINE_SIZE: 6,
        MINE_LIFETIME: 6000,
        HP: 1,
    },

    POD: {
        SPEED: 50,
        WIDTH: 18,
        HEIGHT: 18,
        SWARMER_COUNT: 4,
        HP: 1,
    },

    SWARMER: {
        SPEED: 200,
        WIDTH: 8,
        HEIGHT: 8,
        HP: 1,
    },

    // Humanoid
    HUMANOID: {
        COUNT: 10,
        WIDTH: 8,
        HEIGHT: 16,
        WALK_SPEED: 15,
        FALL_SPEED: 120,
        CATCH_RANGE: 40,
    },

    // Scoring
    SCORE: {
        LANDER: 150,
        MUTANT: 150,
        BOMBER: 250,
        POD: 1000,
        SWARMER: 150,
        MINE: 25,
        HUMANOID_RESCUE: 500,       // catch falling humanoid
        HUMANOID_RETURN: 250,       // deliver to ground
        WAVE_BONUS: 1000,
        EXTRA_LIFE_AT: 10000,
    },

    // Radar / minimap
    RADAR: {
        X: 250,
        Y: 8,
        WIDTH: 300,
        HEIGHT: 30,
        BORDER: 1,
    },

    // Difficulty presets
    DIFFICULTY: {
        EASY: {
            name: 'EASY',
            enemySpeedMult: 0.7,
            enemyCountMult: 0.6,
            landerGrabDelay: 4000,
            startWaveLanders: 4,
            startWaveBombers: 1,
            startWavePods: 0,
            waveLanderIncrease: 1,
            waveBomberIncrease: 1,
            wavePodIncrease: 1,
            maxEnemiesPerWave: 12,
        },
        NORMAL: {
            name: 'NORMAL',
            enemySpeedMult: 1.0,
            enemyCountMult: 1.0,
            landerGrabDelay: 2500,
            startWaveLanders: 6,
            startWaveBombers: 2,
            startWavePods: 1,
            waveLanderIncrease: 2,
            waveBomberIncrease: 1,
            wavePodIncrease: 1,
            maxEnemiesPerWave: 20,
        },
        HARD: {
            name: 'HARD',
            enemySpeedMult: 1.4,
            enemyCountMult: 1.3,
            landerGrabDelay: 1500,
            startWaveLanders: 8,
            startWaveBombers: 3,
            startWavePods: 2,
            waveLanderIncrease: 3,
            waveBomberIncrease: 1,
            wavePodIncrease: 1,
            maxEnemiesPerWave: 30,
        },
    },

    // Terrain
    TERRAIN: {
        SEGMENTS: 80,
        MIN_HEIGHT: 20,
        MAX_HEIGHT: 100,
        COLOR: 0x884400,
    },

    // Stars
    STAR_COUNT: 120,
};
