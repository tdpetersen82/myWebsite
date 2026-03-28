const CONFIG = {
    WIDTH: 1200,
    HEIGHT: 800,
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
        NITRO_DRAIN: 40,       // per second
        NITRO_RECHARGE: 6,     // per second (passive)
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

    POWERUP_SPAWN_COOLDOWN: 15,   // seconds after collection before respawn
    POWERUP_BOB_SPEED: 2.5,
    POWERUP_BOB_AMOUNT: 4,
    POWERUP_COLLECT_RADIUS: 22,

    // Projectiles
    MISSILE_SPEED: 500,
    MISSILE_MAX_DIST: 600,
    MISSILE_TURN_RATE: 4.0,
    OIL_SLICK_RADIUS: 20,
    OIL_SLICK_DURATION: 8,

    // Network
    NETWORK: {
        SYNC_RATE: 20,           // Hz
        INPUT_SEND_RATE: 60,     // Hz
        INTERP_DELAY: 100,       // ms
        RECONNECT_WINDOW: 10,    // seconds
        PING_INTERVAL: 2000,     // ms
        LOBBY_HEARTBEAT: 5000,   // ms
        ROOM_CODE_LENGTH: 6,
        HOST_INPUT_DELAY: 50,    // ms (fairness equalization)
        MAX_RETRIES: 3,
        RETRY_BASE_DELAY: 1000,  // ms (exponential backoff)
        SNAP_THRESHOLD: 80,      // pixels - snap instead of lerp if beyond
        LERP_RATE: 0.15,
    },

    // Visual
    COLORS: {
        BG: 0x1a1a2e,
        TRACK_EDGE: 0xFFFFFF,
        TRACK_EDGE_ALT: 0xFF0000,
        CHECKPOINT: 0xFFFF00,
        FINISH_LINE: 0xFFFFFF,
        HUD_BG: 0x000000,
        HUD_TEXT: 0xFFFFFF,
        HUD_ACCENT: 0xFF6600,
        MINIMAP_BG: 0x111111,
        MINIMAP_TRACK: 0x444444,
    },

    // Particles
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

    // Camera
    CAMERA: {
        LERP: 0.08,
        LOOKAHEAD: 0.4,
        ZOOM: 1.0,
    },

    // Race settings
    RACE: {
        COUNTDOWN_SECS: 3,
        DEFAULT_LAPS: 3,
        FINISH_TIMEOUT: 60,     // seconds after winner finishes
        MAX_PLAYERS: 8,
    },

    // === TRACK DATA ===
    TRACKS: [
        {
            name: 'Desert Canyon',
            laps: 3,
            theme: {
                ground: 0xC4A265,
                trackSurface: 0x9E8B6E,
                trackEdge: 0xFFFFFF,
                skyColor: 0xE8D5A3,
                ambient: 0xFFE4B5,
            },
            trackWidth: 160,
            // Control points define the center line (closed loop)
            // Format: {x, y} - we'll use Catmull-Rom interpolation
            centerLine: [
                { x: 600, y: 720 },   // Start/finish (bottom center)
                { x: 300, y: 680 },   // Left bottom
                { x: 100, y: 550 },   // Far left
                { x: 80,  y: 350 },   // Left side climb
                { x: 150, y: 180 },   // Top left
                { x: 350, y: 100 },   // Top
                { x: 550, y: 80 },    // Top center
                { x: 750, y: 120 },   // Top right approach
                { x: 950, y: 180 },   // Top right
                { x: 1080, y: 320 },  // Right side
                { x: 1100, y: 500 },  // Right mid
                { x: 1000, y: 650 },  // Right bottom
                { x: 850, y: 720 },   // Bottom right
            ],
            terrainZones: [
                // Mud pit shortcut (cuts the top-left corner)
                { type: 'MUD', center: { x: 250, y: 140 }, radius: 70 },
                // Water crossing on the right
                { type: 'WATER', center: { x: 1090, y: 410 }, radius: 55 },
                // Jump ramp on the straight
                { type: 'RAMP', center: { x: 600, y: 720 }, radius: 30, direction: -Math.PI / 2 },
            ],
            checkpoints: [
                { x: 600, y: 720, angle: 0 },         // 0: start/finish
                { x: 80,  y: 350, angle: Math.PI/2 },  // 1: left side
                { x: 550, y: 80,  angle: 0 },           // 2: top
                { x: 1100, y: 500, angle: Math.PI/2 }, // 3: right side
            ],
            startPositions: [
                { x: 570, y: 740, angle: -Math.PI * 0.15 },
                { x: 630, y: 740, angle: -Math.PI * 0.15 },
                { x: 560, y: 760, angle: -Math.PI * 0.15 },
                { x: 640, y: 760, angle: -Math.PI * 0.15 },
                { x: 550, y: 780, angle: -Math.PI * 0.15 },
                { x: 650, y: 780, angle: -Math.PI * 0.15 },
                { x: 540, y: 800, angle: -Math.PI * 0.15 },
                { x: 660, y: 800, angle: -Math.PI * 0.15 },
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
                { type: 'cactus', x: 450, y: 200 },
                { type: 'cactus', x: 700, y: 250 },
                { type: 'cactus', x: 350, y: 350 },
                { type: 'cactus', x: 850, y: 300 },
                { type: 'rock', x: 200, y: 450 },
                { type: 'rock', x: 900, y: 400 },
                { type: 'rock', x: 500, y: 400 },
                { type: 'rock', x: 700, y: 500 },
                { type: 'rock', x: 350, y: 550 },
                { type: 'tireStack', x: 480, y: 680 },
                { type: 'tireStack', x: 720, y: 680 },
                { type: 'tireStack', x: 150, y: 620 },
                { type: 'tireStack', x: 1000, y: 320 },
                { type: 'spectatorStand', x: 600, y: 640, width: 200 },
                { type: 'spectatorStand', x: 200, y: 250, width: 100 },
                { type: 'bush', x: 550, y: 500 },
                { type: 'bush', x: 650, y: 450 },
                { type: 'bush', x: 400, y: 480 },
            ],
        },
        {
            name: 'Arctic Circuit',
            laps: 3,
            theme: {
                ground: 0xD6EAF8,
                trackSurface: 0x85929E,
                trackEdge: 0xE74C3C,
                skyColor: 0xAED6F1,
                ambient: 0xD4E6F1,
            },
            trackWidth: 140,
            centerLine: [
                { x: 600, y: 720 },
                { x: 400, y: 700 },
                { x: 200, y: 600 },
                { x: 120, y: 450 },
                { x: 200, y: 300 },
                { x: 350, y: 200 },
                { x: 300, y: 100 },
                { x: 500, y: 80 },
                { x: 700, y: 100 },
                { x: 800, y: 200 },
                { x: 900, y: 100 },
                { x: 1050, y: 200 },
                { x: 1080, y: 400 },
                { x: 1000, y: 550 },
                { x: 900, y: 650 },
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
                { x: 600, y: 720, angle: 0 },
                { x: 120, y: 450, angle: Math.PI/2 },
                { x: 500, y: 80, angle: 0 },
                { x: 1080, y: 400, angle: Math.PI/2 },
            ],
            startPositions: [
                { x: 570, y: 735, angle: -Math.PI * 0.1 },
                { x: 630, y: 735, angle: -Math.PI * 0.1 },
                { x: 560, y: 755, angle: -Math.PI * 0.1 },
                { x: 640, y: 755, angle: -Math.PI * 0.1 },
                { x: 550, y: 775, angle: -Math.PI * 0.1 },
                { x: 650, y: 775, angle: -Math.PI * 0.1 },
                { x: 540, y: 795, angle: -Math.PI * 0.1 },
                { x: 660, y: 795, angle: -Math.PI * 0.1 },
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
                { type: 'pine', x: 450, y: 300 },
                { type: 'pine', x: 650, y: 350 },
                { type: 'pine', x: 500, y: 500 },
                { type: 'snowman', x: 350, y: 400 },
                { type: 'rock', x: 700, y: 500 },
                { type: 'spectatorStand', x: 600, y: 650, width: 160 },
            ],
        },
        {
            name: 'Jungle Rally',
            laps: 3,
            theme: {
                ground: 0x2D5F2D,
                trackSurface: 0x6B4423,
                trackEdge: 0xFFFF00,
                skyColor: 0x4A7C3F,
                ambient: 0x7CCD7C,
            },
            trackWidth: 130,
            centerLine: [
                { x: 600, y: 720 },
                { x: 350, y: 700 },
                { x: 150, y: 620 },
                { x: 80,  y: 480 },
                { x: 150, y: 350 },
                { x: 280, y: 250 },
                { x: 200, y: 140 },
                { x: 380, y: 80 },
                { x: 550, y: 140 },
                { x: 650, y: 250 },
                { x: 800, y: 180 },
                { x: 950, y: 100 },
                { x: 1080, y: 200 },
                { x: 1100, y: 380 },
                { x: 1020, y: 520 },
                { x: 900, y: 600 },
                { x: 1000, y: 700 },
                { x: 850, y: 740 },
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
                { x: 600, y: 720, angle: 0 },
                { x: 80, y: 480, angle: Math.PI/2 },
                { x: 380, y: 80, angle: 0 },
                { x: 1080, y: 200, angle: Math.PI * 0.75 },
            ],
            startPositions: [
                { x: 575, y: 735, angle: -Math.PI * 0.05 },
                { x: 625, y: 735, angle: -Math.PI * 0.05 },
                { x: 565, y: 755, angle: -Math.PI * 0.05 },
                { x: 635, y: 755, angle: -Math.PI * 0.05 },
                { x: 555, y: 775, angle: -Math.PI * 0.05 },
                { x: 645, y: 775, angle: -Math.PI * 0.05 },
                { x: 545, y: 795, angle: -Math.PI * 0.05 },
                { x: 655, y: 795, angle: -Math.PI * 0.05 },
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
                { type: 'palm', x: 400, y: 400 },
                { type: 'palm', x: 700, y: 450 },
                { type: 'palm', x: 500, y: 550 },
                { type: 'bush', x: 300, y: 500 },
                { type: 'bush', x: 800, y: 400 },
                { type: 'rock', x: 600, y: 350 },
                { type: 'spectatorStand', x: 600, y: 650, width: 140 },
            ],
        },
    ],
};
