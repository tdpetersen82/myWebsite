const CONFIG = {
    WIDTH: 1200,
    HEIGHT: 800,
    WORLD_WIDTH: 1400,
    WORLD_HEIGHT: 950,
    WORLD_PAD: 100,   // padding around track data
    STORAGE_KEY: 'superOffRoadBestTimes',
    SETTINGS_KEY: 'superOffRoadSettings',

    // Physics (fixed 60Hz timestep)
    PHYSICS: {
        TIMESTEP: 1 / 60,
        VEHICLE_WIDTH: 28,
        VEHICLE_LENGTH: 44,
        MAX_SPEED: 320,
        ACCELERATION: 480,
        BRAKE_DECEL: 600,
        REVERSE_MAX: -100,
        TURN_RATE: 3.2,
        STEER_SMOOTHING: 10,
        DRIFT_TRACTION_MULT: 0.45,
        DRIFT_TURN_MULT: 1.6,
        DRIFT_MIN_SPEED_RATIO: 0.35,
        NITRO_MULT: 2.5,
        NITRO_MAX: 100,
        NITRO_DRAIN: 40,
        NITRO_RECHARGE: 6,
        SPINOUT_DURATION: 1.5,
        SPINOUT_SPIN_RATE: 12,
        JUMP_DURATION: 0.8,
        JUMP_SPEED_BOOST: 1.15,
        WALL_BOUNCE: 0.35,
        WALL_SPEED_LOSS: 0.30,
        VEHICLE_COLLISION_ELASTICITY: 0.6,
        VEHICLE_PUSH_FORCE: 200,
        OFF_TRACK_SPEED_CAP: 0.4,
        CHECKPOINT_RADIUS: 60,
    },

    // AI settings
    AI: {
        COUNT: 5,                  // number of AI bots in practice mode
        SPEED_BASE: 0.7,          // fraction of max speed (varies per bot)
        SPEED_VARIANCE: 0.2,      // random variance per bot
        STEER_LOOKAHEAD: 80,      // how far ahead on track to steer toward
        STEER_NOISE: 0.15,        // random steering jitter
        NITRO_CHANCE: 0.003,      // chance per frame to use nitro
        DRIFT_CHANCE: 0.002,      // chance per frame to drift
        POWERUP_USE_DELAY: 3,     // seconds before using a collected power-up
        NAMES: ['Racer', 'Speedy', 'Turbo', 'Flash', 'Blaze', 'Nitro', 'Drift'],
    },

    // Terrain friction and traction
    TERRAIN: {
        DIRT:  { friction: 0.975, traction: 1.0,  color: 0x8B7355, name: 'dirt' },
        MUD:   { friction: 0.940, traction: 0.55, color: 0x5C4033, name: 'mud' },
        WATER: { friction: 0.955, traction: 0.45, color: 0x2E86C1, name: 'water' },
        ICE:   { friction: 0.992, traction: 0.25, color: 0xAED6F1, name: 'ice' },
        GRASS: { friction: 0.920, traction: 0.65, color: 0x4A7C3F, name: 'grass' },
        RAMP:  { friction: 0.975, traction: 1.0,  color: 0xD4AC0D, name: 'ramp' },
        ASPHALT: { friction: 0.982, traction: 1.0, color: 0x555555, name: 'asphalt' },
    },

    // Vehicle presets (8 colors for 8 players)
    VEHICLES: [
        { name: 'Red Fury',       color: 0xFF3333, stripe: 0xFFFF00, accent: 0xCC0000 },
        { name: 'Blue Thunder',   color: 0x3388FF, stripe: 0xFFFFFF, accent: 0x0044CC },
        { name: 'Green Machine',  color: 0x33CC33, stripe: 0xFFFF00, accent: 0x009900 },
        { name: 'Purple Haze',    color: 0xAA33FF, stripe: 0xFF66FF, accent: 0x7700CC },
        { name: 'Orange Blaze',   color: 0xFF8833, stripe: 0xFFFFFF, accent: 0xCC5500 },
        { name: 'Cyan Storm',     color: 0x33CCCC, stripe: 0xFFFFFF, accent: 0x009999 },
        { name: 'Yellow Bolt',    color: 0xFFCC00, stripe: 0xFF3333, accent: 0xCC9900 },
        { name: 'Pink Panther',   color: 0xFF66AA, stripe: 0xFFFFFF, accent: 0xCC3377 },
    ],

    // Power-up types
    POWERUPS: {
        NITRO:       { icon: 'flame',     color: 0xFF6600, duration: 0,  label: 'NITRO' },
        MISSILE:     { icon: 'crosshair', color: 0xFF0000, duration: 0,  label: 'MISSILE' },
        OIL_SLICK:   { icon: 'drop',      color: 0x333333, duration: 8,  label: 'OIL' },
        SHIELD:      { icon: 'hexagon',   color: 0x33CCFF, duration: 10, label: 'SHIELD' },
        SPEED_BOOST: { icon: 'lightning',  color: 0xFFFF00, duration: 5,  label: 'SPEED' },
        CASH:        { icon: 'coin',       color: 0xFFCC00, duration: 0,  label: '$$$' },
    },

    POWERUP_SPAWN_COOLDOWN: 15,
    POWERUP_BOB_SPEED: 2.5,
    POWERUP_BOB_AMOUNT: 4,
    POWERUP_COLLECT_RADIUS: 22,

    MISSILE_SPEED: 500,
    MISSILE_MAX_DIST: 600,
    MISSILE_TURN_RATE: 4.0,
    OIL_SLICK_RADIUS: 20,
    OIL_SLICK_DURATION: 8,

    // Network
    NETWORK: {
        SYNC_RATE: 20, INPUT_SEND_RATE: 60, INTERP_DELAY: 100,
        RECONNECT_WINDOW: 10, PING_INTERVAL: 2000, LOBBY_HEARTBEAT: 5000,
        ROOM_CODE_LENGTH: 6, HOST_INPUT_DELAY: 50, MAX_RETRIES: 3,
        RETRY_BASE_DELAY: 1000, SNAP_THRESHOLD: 80, LERP_RATE: 0.15,
    },

    COLORS: {
        BG: 0x1a1a2e, TRACK_EDGE: 0xFFFFFF, TRACK_EDGE_ALT: 0xFF0000,
        CHECKPOINT: 0xFFFF00, FINISH_LINE: 0xFFFFFF,
        HUD_BG: 0x000000, HUD_TEXT: 0xFFFFFF, HUD_ACCENT: 0xFF6600,
        MINIMAP_BG: 0x111111, MINIMAP_TRACK: 0x444444,
    },

    PARTICLES: {
        MAX_COUNT: 300,
        DIRT: { count: 4, life: 0.35, speed: 80, size: 3, gravity: 200, color: 0x8B7355 },
        MUD_SPLASH: { count: 5, life: 0.4, speed: 100, size: 4, gravity: 250, color: 0x5C4033 },
        SMOKE: { count: 3, life: 0.7, speed: 30, size: 6, gravity: -20, color: 0x888888 },
        NITRO_FLAME: { count: 5, life: 0.3, speed: 60, size: 5, gravity: 0, color: 0xFF6600 },
        SPARKS: { count: 10, life: 0.15, speed: 250, size: 2, gravity: 0, color: 0xFFFF66 },
        EXPLOSION: { count: 20, life: 0.5, speed: 200, size: 4, gravity: 100, color: 0xFF4400 },
        WATER_SPLASH: { count: 4, life: 0.5, speed: 90, size: 3, gravity: 300, color: 0x4FC3F7 },
        CONFETTI: { count: 40, life: 2.0, speed: 150, size: 5, gravity: 80 },
    },

    SCREEN_SHAKE: {
        COLLISION: { intensity: 6, duration: 250 },
        NITRO: { intensity: 3, duration: 150 },
        EXPLOSION: { intensity: 10, duration: 400 },
        COUNTDOWN: { intensity: 4, duration: 200 },
    },

    // Camera — zoomed in so the car is big and you feel speed
    CAMERA: {
        LERP: 0.07,
        LOOKAHEAD: 0.35,
        ZOOM: 1.8,
    },

    RACE: {
        COUNTDOWN_SECS: 3,
        DEFAULT_LAPS: 3,
        FINISH_TIMEOUT: 60,
        MAX_PLAYERS: 8,
    },

    // === TRACK DATA ===
    // All coordinates are in world space (WORLD_PAD offset applied by TrackRenderer)
    TRACKS: [
        {
            name: 'Desert Canyon',
            laps: 3,
            theme: {
                ground: 0xC4A265, trackSurface: 0x9E8B6E, trackEdge: 0xFFFFFF,
                skyColor: 0xE8D5A3, ambient: 0xFFE4B5,
            },
            trackWidth: 160,
            centerLine: [
                { x: 600, y: 720 }, { x: 300, y: 680 }, { x: 100, y: 550 },
                { x: 80,  y: 350 }, { x: 150, y: 180 }, { x: 350, y: 100 },
                { x: 550, y: 80 },  { x: 750, y: 120 }, { x: 950, y: 180 },
                { x: 1080, y: 320 },{ x: 1100, y: 500 },{ x: 1000, y: 650 },
                { x: 850, y: 720 },
            ],
            terrainZones: [
                { type: 'MUD', center: { x: 250, y: 140 }, radius: 70 },
                { type: 'WATER', center: { x: 1090, y: 410 }, radius: 55 },
                { type: 'RAMP', center: { x: 600, y: 720 }, radius: 30, direction: -Math.PI / 2 },
            ],
            checkpoints: [
                { x: 600, y: 720 }, { x: 80,  y: 350 },
                { x: 550, y: 80 },  { x: 1100, y: 500 },
            ],
            startPositions: [
                { x: 570, y: 740 }, { x: 630, y: 740 },
                { x: 560, y: 760 }, { x: 640, y: 760 },
                { x: 550, y: 780 }, { x: 650, y: 780 },
                { x: 540, y: 800 }, { x: 660, y: 800 },
            ],
            powerUpSpawns: [
                { x: 200, y: 600, types: ['NITRO', 'SHIELD', 'SPEED_BOOST'] },
                { x: 120, y: 270, types: ['MISSILE', 'OIL_SLICK', 'NITRO'] },
                { x: 450, y: 90,  types: ['SPEED_BOOST', 'SHIELD', 'CASH'] },
                { x: 900, y: 150, types: ['MISSILE', 'NITRO', 'OIL_SLICK'] },
                { x: 1050, y: 580, types: ['NITRO', 'SPEED_BOOST', 'SHIELD'] },
                { x: 750, y: 700, types: ['MISSILE', 'CASH', 'NITRO'] },
            ],
            decorations: [
                { type: 'cactus', x: 450, y: 200 }, { type: 'cactus', x: 700, y: 250 },
                { type: 'cactus', x: 350, y: 350 }, { type: 'cactus', x: 850, y: 300 },
                { type: 'cactus', x: 250, y: 500 },
                { type: 'rock', x: 200, y: 450 }, { type: 'rock', x: 900, y: 400 },
                { type: 'rock', x: 500, y: 400 }, { type: 'rock', x: 700, y: 500 },
                { type: 'rock', x: 350, y: 550 }, { type: 'rock', x: 600, y: 300 },
                { type: 'tireStack', x: 480, y: 680 }, { type: 'tireStack', x: 720, y: 680 },
                { type: 'tireStack', x: 150, y: 620 }, { type: 'tireStack', x: 1000, y: 320 },
                { type: 'spectatorStand', x: 600, y: 640, width: 200 },
                { type: 'spectatorStand', x: 200, y: 250, width: 100 },
                { type: 'bush', x: 550, y: 500 }, { type: 'bush', x: 650, y: 450 },
                { type: 'bush', x: 400, y: 480 },
            ],
        },
        {
            name: 'Arctic Circuit',
            laps: 3,
            theme: {
                ground: 0xD6EAF8, trackSurface: 0x85929E, trackEdge: 0xE74C3C,
                skyColor: 0xAED6F1, ambient: 0xD4E6F1,
            },
            trackWidth: 140,
            centerLine: [
                { x: 600, y: 720 }, { x: 400, y: 700 }, { x: 200, y: 600 },
                { x: 120, y: 450 }, { x: 200, y: 300 }, { x: 350, y: 200 },
                { x: 300, y: 100 }, { x: 500, y: 80 },  { x: 700, y: 100 },
                { x: 800, y: 200 }, { x: 900, y: 100 }, { x: 1050, y: 200 },
                { x: 1080, y: 400 },{ x: 1000, y: 550 },{ x: 900, y: 650 },
                { x: 800, y: 720 },
            ],
            terrainZones: [
                { type: 'ICE', center: { x: 200, y: 300 }, radius: 60 },
                { type: 'ICE', center: { x: 800, y: 200 }, radius: 50 },
                { type: 'ICE', center: { x: 1050, y: 200 }, radius: 45 },
                { type: 'WATER', center: { x: 120, y: 450 }, radius: 50 },
                { type: 'RAMP', center: { x: 500, y: 80 }, radius: 25, direction: 0 },
            ],
            checkpoints: [
                { x: 600, y: 720 }, { x: 120, y: 450 },
                { x: 500, y: 80 },  { x: 1080, y: 400 },
            ],
            startPositions: [
                { x: 570, y: 735 }, { x: 630, y: 735 },
                { x: 560, y: 755 }, { x: 640, y: 755 },
                { x: 550, y: 775 }, { x: 650, y: 775 },
                { x: 540, y: 795 }, { x: 660, y: 795 },
            ],
            powerUpSpawns: [
                { x: 160, y: 530, types: ['NITRO', 'SHIELD', 'SPEED_BOOST'] },
                { x: 280, y: 150, types: ['MISSILE', 'NITRO', 'OIL_SLICK'] },
                { x: 600, y: 90, types: ['SPEED_BOOST', 'CASH', 'SHIELD'] },
                { x: 950, y: 130, types: ['MISSILE', 'NITRO', 'OIL_SLICK'] },
                { x: 1040, y: 480, types: ['NITRO', 'SPEED_BOOST', 'SHIELD'] },
                { x: 850, y: 690, types: ['MISSILE', 'CASH', 'NITRO'] },
            ],
            decorations: [
                { type: 'pine', x: 450, y: 300 }, { type: 'pine', x: 650, y: 350 },
                { type: 'pine', x: 500, y: 500 }, { type: 'pine', x: 350, y: 550 },
                { type: 'pine', x: 750, y: 450 }, { type: 'pine', x: 900, y: 350 },
                { type: 'pine', x: 250, y: 180 }, { type: 'pine', x: 850, y: 500 },
                { type: 'snowman', x: 350, y: 400 }, { type: 'snowman', x: 550, y: 350 },
                { type: 'snowman', x: 700, y: 550 },
                { type: 'rock', x: 700, y: 500 }, { type: 'rock', x: 400, y: 450 },
                { type: 'rock', x: 950, y: 500 }, { type: 'rock', x: 300, y: 650 },
                { type: 'tireStack', x: 500, y: 680 }, { type: 'tireStack', x: 750, y: 680 },
                { type: 'tireStack', x: 150, y: 350 },
                { type: 'spectatorStand', x: 600, y: 650, width: 160 },
                { type: 'spectatorStand', x: 400, y: 150, width: 80 },
            ],
        },
        {
            name: 'Jungle Rally',
            laps: 3,
            theme: {
                ground: 0x2D5F2D, trackSurface: 0x6B4423, trackEdge: 0xFFFF00,
                skyColor: 0x4A7C3F, ambient: 0x7CCD7C,
            },
            trackWidth: 130,
            centerLine: [
                { x: 600, y: 720 }, { x: 350, y: 700 }, { x: 150, y: 620 },
                { x: 80,  y: 480 }, { x: 150, y: 350 }, { x: 280, y: 250 },
                { x: 200, y: 140 }, { x: 380, y: 80 },  { x: 550, y: 140 },
                { x: 650, y: 250 }, { x: 800, y: 180 }, { x: 950, y: 100 },
                { x: 1080, y: 200 },{ x: 1100, y: 380 },{ x: 1020, y: 520 },
                { x: 900, y: 600 }, { x: 1000, y: 700 },{ x: 850, y: 740 },
            ],
            terrainZones: [
                { type: 'MUD', center: { x: 80, y: 480 }, radius: 55 },
                { type: 'MUD', center: { x: 650, y: 250 }, radius: 50 },
                { type: 'WATER', center: { x: 200, y: 140 }, radius: 45 },
                { type: 'WATER', center: { x: 1020, y: 520 }, radius: 50 },
                { type: 'RAMP', center: { x: 550, y: 140 }, radius: 25, direction: Math.PI/4 },
                { type: 'RAMP', center: { x: 900, y: 600 }, radius: 25, direction: -Math.PI/4 },
            ],
            checkpoints: [
                { x: 600, y: 720 }, { x: 80, y: 480 },
                { x: 380, y: 80 },  { x: 1080, y: 200 },
            ],
            startPositions: [
                { x: 575, y: 735 }, { x: 625, y: 735 },
                { x: 565, y: 755 }, { x: 635, y: 755 },
                { x: 555, y: 775 }, { x: 645, y: 775 },
                { x: 545, y: 795 }, { x: 655, y: 795 },
            ],
            powerUpSpawns: [
                { x: 250, y: 650, types: ['NITRO', 'SHIELD', 'SPEED_BOOST'] },
                { x: 130, y: 400, types: ['MISSILE', 'OIL_SLICK', 'NITRO'] },
                { x: 300, y: 170, types: ['SPEED_BOOST', 'CASH', 'SHIELD'] },
                { x: 730, y: 210, types: ['MISSILE', 'NITRO', 'OIL_SLICK'] },
                { x: 1060, y: 300, types: ['NITRO', 'SPEED_BOOST', 'SHIELD'] },
                { x: 950, y: 650, types: ['MISSILE', 'CASH', 'NITRO'] },
            ],
            decorations: [
                { type: 'palm', x: 400, y: 400 }, { type: 'palm', x: 700, y: 450 },
                { type: 'palm', x: 500, y: 550 }, { type: 'palm', x: 300, y: 300 },
                { type: 'palm', x: 850, y: 350 }, { type: 'palm', x: 200, y: 500 },
                { type: 'palm', x: 950, y: 450 }, { type: 'palm', x: 750, y: 600 },
                { type: 'bush', x: 300, y: 500 }, { type: 'bush', x: 800, y: 400 },
                { type: 'bush', x: 450, y: 300 }, { type: 'bush', x: 650, y: 550 },
                { type: 'bush', x: 550, y: 450 }, { type: 'bush', x: 900, y: 300 },
                { type: 'rock', x: 600, y: 350 }, { type: 'rock', x: 400, y: 600 },
                { type: 'rock', x: 750, y: 300 }, { type: 'rock', x: 1000, y: 400 },
                { type: 'tireStack', x: 500, y: 680 }, { type: 'tireStack', x: 800, y: 700 },
                { type: 'tireStack', x: 130, y: 550 },
                { type: 'spectatorStand', x: 600, y: 650, width: 140 },
                { type: 'spectatorStand', x: 850, y: 150, width: 100 },
            ],
        },
    ],
};
