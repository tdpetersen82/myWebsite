// ============================================================
// Missile Command — Game Configuration
// ============================================================

const CONFIG = {
    WIDTH: 800,
    HEIGHT: 600,
    GROUND_Y: 560,
    SKY_TOP: 40,

    // Physics
    COUNTER_MISSILE_SPEED: 500,
    GRAVITY: 200,

    // Colors
    COLORS: {
        SKY: '#0a0a2e',
        GROUND: '#1a472a',
        GROUND_DARK: '#0d2e1a',
        HUD_TEXT: '#ffffff',
        SCORE: '#ffdd57',
        COMBO_COLORS: ['#ffffff', '#ffdd57', '#ff9500', '#ff3b30', '#ff2d95'],
    },

    // Explosion settings
    EXPLOSION: {
        COUNTER_RADIUS: 50,
        ENEMY_RADIUS: 30,
        SPECIAL_RADIUS: 80,
        EXPAND_SPEED: 180,
        HOLD_TIME: 400,
        SHRINK_SPEED: 120,
        COLORS: [
            [0xff, 0x44, 0x00], // orange-red
            [0xff, 0x88, 0x00], // orange
            [0xff, 0xcc, 0x00], // yellow
            [0xff, 0x22, 0x22], // red
            [0x44, 0xaa, 0xff], // blue (player)
            [0xff, 0xff, 0xff], // white hot
        ],
    },

    // Base settings
    BASE: {
        MAX_AMMO: 10,
        POSITIONS: [100, 400, 700], // x positions of the 3 bases
        Y: 565,
        WIDTH: 40,
        HEIGHT: 20,
        REPAIR_COST: 500,
    },

    // City settings
    CITY: {
        POSITIONS: [175, 250, 325, 475, 550, 625],
        Y: 560,
        WIDTH: 50,
        BUILDING_COUNT_MIN: 3,
        BUILDING_COUNT_MAX: 6,
    },

    // Enemy types
    ENEMY: {
        BASIC: { speed: 1.0, health: 1, points: 25, color: 0xff4400, trail: 0xff2200 },
        MIRV:  { speed: 0.8, health: 1, points: 50, color: 0xff00ff, trail: 0xcc00cc, splitCount: 3 },
        FAST:  { speed: 2.0, health: 1, points: 40, color: 0xffff00, trail: 0xcccc00 },
        ARMORED: { speed: 0.7, health: 3, points: 75, color: 0x88aacc, trail: 0x6688aa },
        STEALTH: { speed: 1.2, health: 1, points: 60, color: 0x333366, trail: 0x222244 },
    },

    // Bomber settings
    BOMBER: {
        STANDARD: { speed: 80, health: 2, dropRate: 2000, points: 100 },
        HEAVY:    { speed: 50, health: 4, dropRate: 1500, points: 200, dropCount: 3 },
        FAST:     { speed: 140, health: 1, dropRate: 3000, points: 80 },
    },

    // Satellite settings
    SATELLITE: {
        SPEED: 40,
        HEALTH: 3,
        FIRE_RATE: 3000,
        POINTS: 250,
    },

    // Upgrade settings
    UPGRADE: {
        NEW_CITY_POSITIONS: [50, 362, 750],
        CITY_REBUILD_COST: 500,
        BASE_REPAIR_COST: 500,
        TYPES: {
            EXPLOSION_SIZE: {
                name: 'Bigger Warheads',
                description: '+20% explosion radius',
                costs: [400, 700, 1100],
                maxLevel: 3,
                category: 'WEAPONS',
            },
            MISSILE_SPEED: {
                name: 'Faster Missiles',
                description: '+25% missile speed',
                costs: [350, 600, 900],
                maxLevel: 3,
                category: 'WEAPONS',
            },
            AMMO: {
                name: 'Ammo Reserves',
                description: '+3 ammo per base',
                costs: [300, 500, 800, 1200],
                maxLevel: 4,
                category: 'WEAPONS',
            },
            FORTIFY: {
                name: 'Fortify Cities',
                description: '+1 city hit points',
                costs: [800, 1500, 2500],
                maxLevel: 3,
                category: 'DEFENSE',
            },
            NEW_CITY: {
                name: 'Build District',
                description: 'Expand with a new city',
                costs: [1000, 1500, 2000],
                maxLevel: 3,
                category: 'DEFENSE',
            },
        },
        MONEY: {
            PER_CITY_SURVIVING: 50,
            PER_AMMO_REMAINING: 5,
        },
    },

    // Combo settings
    COMBO: {
        WINDOW: 2000,  // ms between kills to maintain combo
        THRESHOLDS: [
            { count: 3, multiplier: 2 },
            { count: 5, multiplier: 3 },
            { count: 8, multiplier: 5 },
            { count: 12, multiplier: 10 },
        ],
    },

    // Difficulty presets
    DIFFICULTY: {
        EASY: {
            label: 'Easy',
            missileCountBase: 6,
            missileCountPerWave: 2,
            missileCountMax: 25,
            speedMultiplier: 0.7,
            baseAmmo: 15,
            bonusCityPoints: 150,
        },
        NORMAL: {
            label: 'Normal',
            missileCountBase: 8,
            missileCountPerWave: 3,
            missileCountMax: 35,
            speedMultiplier: 1.0,
            baseAmmo: 10,
            bonusCityPoints: 100,
        },
        HARD: {
            label: 'Hard',
            missileCountBase: 12,
            missileCountPerWave: 4,
            missileCountMax: 50,
            speedMultiplier: 1.4,
            baseAmmo: 8,
            bonusCityPoints: 75,
        },
    },

    // Star field
    STARS: {
        COUNT: 150,
        FLICKER_SPEED: 0.003,
    },

    // Keyboard
    KEYS: {
        PAUSE: 'P',
        BASE_1: '1',
        BASE_2: '2',
        BASE_3: '3',
        MUTE: 'M',
    },
};
