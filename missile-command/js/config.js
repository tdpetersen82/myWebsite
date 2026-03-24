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
        SKY_TOP: '#050520',
        SKY_MID: '#0a0a3e',
        SKY_HORIZON: '#1a1050',
        HORIZON_GLOW: '#2a1848',
        GROUND: '#1a472a',
        GROUND_DARK: '#0d2e1a',
        GROUND_DEEP: '#0a1f12',
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
        STARTING_UNLOCKED: [1], // Only center base (index 1) starts unlocked
    },

    // City settings
    CITY: {
        POSITIONS: [175, 250, 325, 475, 550, 625],
        Y: 560,
        WIDTH: 50,
        BUILDING_COUNT_MIN: 3,
        BUILDING_COUNT_MAX: 6,
        MAX_BUILDINGS: 10,
        BASE_INCOME: 15,         // Income per building per wave
        GROWTH_CHANCE: 0.7,      // Chance to grow a building between waves
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

    // Tracking missile settings
    TRACKING: {
        LEVELS: [
            { turnRate: 1.5, detectRadius: 150, trailColor: 0x44ffaa },  // Level 1
            { turnRate: 3.0, detectRadius: 250, trailColor: 0x44ffcc },  // Level 2
            { turnRate: 5.0, detectRadius: 400, trailColor: 0x00ffdd },  // Level 3
        ],
    },

    // Point Defense settings
    POINT_DEFENSE: {
        LEVELS: [
            { fireRate: 3000, range: 120, accuracy: 0.6, projectileSpeed: 600, damage: 15 },
            { fireRate: 2000, range: 160, accuracy: 0.75, projectileSpeed: 700, damage: 15 },
            { fireRate: 1500, range: 200, accuracy: 0.9, projectileSpeed: 800, damage: 20 },
        ],
        TURRETS_PER_LEVEL: [1, 2, 3],
        PROJECTILE_RADIUS: 15,
    },

    // Shield settings
    SHIELD: {
        LEVELS: [
            { maxHP: 1, regenWaves: 3 },
            { maxHP: 2, regenWaves: 2 },
            { maxHP: 3, regenWaves: 1 },
        ],
    },

    // Upgrade settings
    UPGRADE: {
        NEW_CITY_POSITIONS: [50, 362, 750],
        CITY_REBUILD_COST: 500,
        BASE_REPAIR_COST: 500,
        TYPES: {
            // COMMAND category
            UNLOCK_LEFT_BASE: {
                name: 'West Battery',
                description: 'Unlock the left missile base',
                costs: [1500],
                maxLevel: 1,
                category: 'COMMAND',
            },
            UNLOCK_RIGHT_BASE: {
                name: 'East Battery',
                description: 'Unlock the right missile base',
                costs: [1500],
                maxLevel: 1,
                category: 'COMMAND',
            },

            // WEAPONS category
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
            TRACKING: {
                name: 'Tracking Missiles',
                description: 'Missiles home toward enemies',
                costs: [800, 1400, 2200],
                maxLevel: 3,
                category: 'WEAPONS',
            },

            // DEFENSE category
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
            POINT_DEFENSE: {
                name: 'Point Defense',
                description: 'Auto-turrets protect cities',
                costs: [1000, 1800, 3000],
                maxLevel: 3,
                category: 'DEFENSE',
            },
            SHIELD: {
                name: 'Shield Generator',
                description: 'Energy shields for cities',
                costs: [1200, 2000, 3500],
                maxLevel: 3,
                category: 'DEFENSE',
            },
        },
        MONEY: {
            PER_CITY_SURVIVING: 50,  // Base rate, modified by city income
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
        COUNT: 200,
        FLICKER_SPEED: 0.003,
    },

    // Mountains (horizon silhouettes)
    MOUNTAINS: [
        { x: 0, peaks: [{ x: 40, h: 35 }, { x: 100, h: 55 }, { x: 160, h: 30 }] },
        { x: 200, peaks: [{ x: 60, h: 40 }, { x: 120, h: 65 }, { x: 180, h: 45 }, { x: 230, h: 25 }] },
        { x: 500, peaks: [{ x: 50, h: 50 }, { x: 110, h: 70 }, { x: 170, h: 35 }] },
        { x: 680, peaks: [{ x: 40, h: 30 }, { x: 90, h: 45 }, { x: 140, h: 55 }] },
    ],

    // Keyboard
    KEYS: {
        PAUSE: 'P',
        BASE_1: '1',
        BASE_2: '2',
        BASE_3: '3',
        MUTE: 'M',
    },
};
