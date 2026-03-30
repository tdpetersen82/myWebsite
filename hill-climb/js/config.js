const CONFIG = {
    WIDTH: 800,
    HEIGHT: 600,

    // Physics
    GRAVITY: 1.8,

    // Bike
    CHASSIS_WIDTH: 80,
    CHASSIS_HEIGHT: 24,
    CHASSIS_MASS: 12,
    WHEEL_RADIUS: 18,
    WHEEL_MASS: 5,
    WHEEL_FRICTION: 0.95,
    FRONT_WHEEL_FRICTION: 0.8,
    SUSPENSION_STIFFNESS: 0.4,
    SUSPENSION_DAMPING: 0.05,
    REAR_AXLE_OFFSET_X: -28,
    REAR_AXLE_OFFSET_Y: 22,
    FRONT_AXLE_OFFSET_X: 28,
    FRONT_AXLE_OFFSET_Y: 22,

    // Controls
    GAS_TORQUE: 0.15,
    MAX_WHEEL_ANGULAR_VEL: 0.35,
    LEAN_FORCE: 0.008,
    BRAKE_FACTOR: 0.92,

    // Terrain
    TERRAIN_SEGMENT_WIDTH: 40,
    TERRAIN_CHUNK_SEGMENTS: 30,
    TERRAIN_AHEAD: 4000,
    TERRAIN_BEHIND: 2000,
    TERRAIN_BASE_Y: 400,
    TERRAIN_DEPTH: 600,

    // Terrain generation - sine wave octaves
    TERRAIN_WAVE_1: { freq: 0.0015, amp: 120 },  // Large rolling hills
    TERRAIN_WAVE_2: { freq: 0.006, amp: 50 },     // Medium bumps
    TERRAIN_WAVE_3: { freq: 0.02, amp: 15 },      // Small ripples
    TERRAIN_DIFFICULTY_RAMP: 0.00003,              // Amplitude increase per pixel

    // Fuel
    FUEL_MAX: 100,
    FUEL_DRAIN_RATE: 3,       // per second while gas held
    FUEL_IDLE_DRAIN: 0.5,    // per second while not pressing gas
    FUEL_PICKUP_AMOUNT: 35,
    FUEL_PICKUP_INTERVAL: 800, // avg pixels between fuel cans
    FUEL_LOW_THRESHOLD: 25,

    // Pickups
    COIN_INTERVAL: 400,       // avg pixels between coins
    COIN_VALUE: 100,

    // Scoring
    DISTANCE_SCALE: 0.05,     // pixels to meters
    FLIP_BONUS: 500,
    AIR_TIME_BONUS: 50,       // per second
    WHEELIE_BONUS: 10,        // per second

    // Biomes
    BIOME_LENGTH: 20000,      // pixels per biome (~1000m)
    BIOMES: ['grassland', 'desert', 'arctic', 'volcanic'],

    // Camera
    CAM_OFFSET_X: -120,
    CAM_OFFSET_Y: -80,
    CAM_LERP: 0.08,

    // Crash detection
    CRASH_ANGLE_THRESHOLD: 2.8, // radians from upright before instant crash

    // LocalStorage key
    LS_HIGH_SCORE: 'hillClimbBestDistance',
    LS_HIGH_COINS: 'hillClimbBestCoins',
};
