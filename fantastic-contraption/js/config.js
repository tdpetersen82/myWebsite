// Fantastic Contraption — Configuration
const CONFIG = {
    // Canvas
    CANVAS_WIDTH: 1200,
    CANVAS_HEIGHT: 800,

    // Physics
    GRAVITY: { x: 0, y: 1 },
    TIME_STEP: 1000 / 60,
    POSITION_ITERATIONS: 12,
    VELOCITY_ITERATIONS: 8,
    CONSTRAINT_ITERATIONS: 4,
    MOTOR_SPEED: 0.18,
    MOTOR_TORQUE: 0.02,

    // Parts
    WHEEL_RADIUS: 22,
    ROD_THICKNESS: 8,
    ROD_MIN_LENGTH: 20,
    ROD_MAX_LENGTH: 300,
    SNAP_RADIUS: 18,

    // Part densities
    WHEEL_DENSITY: 0.002,
    ROD_DENSITY: 0.001,

    // Friction
    WHEEL_FRICTION: 0.8,
    ROD_FRICTION: 0.4,
    TERRAIN_FRICTION: 0.6,

    // Restitution (bounciness)
    WHEEL_RESTITUTION: 0.05,
    ROD_RESTITUTION: 0.02,

    // Constraint tuning
    JOINT_STIFFNESS: 0.7,
    JOINT_DAMPING: 0.3,

    // Collision categories (bitmasks)
    CAT_TERRAIN:   0x0001,
    CAT_USER_PART: 0x0002,
    CAT_WATER_ROD: 0x0004,
    CAT_PAYLOAD:   0x0008,
    CAT_GOAL_ZONE: 0x0010,
    CAT_BUILD_ZONE:0x0020,

    // Payload
    PAYLOAD_RADIUS: 18,
    PAYLOAD_DENSITY: 0.003,

    // Goal detection
    GOAL_DWELL_TIME: 500, // ms payload must stay in goal

    // Part types
    PART_CW_WHEEL:   'cw_wheel',
    PART_CCW_WHEEL:  'ccw_wheel',
    PART_FREE_WHEEL: 'free_wheel',
    PART_ROD:        'rod',
    PART_WATER_ROD:  'water_rod',

    // Colors
    COLOR_BG: '#f0ece3',
    COLOR_TERRAIN: '#5a4a3a',
    COLOR_TERRAIN_TOP: '#7a6a5a',
    COLOR_BUILD_ZONE: 'rgba(100, 150, 255, 0.12)',
    COLOR_BUILD_ZONE_BORDER: 'rgba(100, 150, 255, 0.5)',
    COLOR_GOAL_ZONE: 'rgba(255, 80, 80, 0.15)',
    COLOR_GOAL_ZONE_BORDER: 'rgba(255, 80, 80, 0.6)',
    COLOR_PAYLOAD: '#e84393',
    COLOR_PAYLOAD_GLOW: 'rgba(232, 67, 147, 0.3)',
    COLOR_CW_WHEEL: '#00b894',
    COLOR_CCW_WHEEL: '#0984e3',
    COLOR_FREE_WHEEL: '#636e72',
    COLOR_ROD: '#b8956a',
    COLOR_WATER_ROD: 'rgba(116, 185, 255, 0.6)',
    COLOR_WATER_ROD_STROKE: '#74b9ff',
    COLOR_SNAP: '#fdcb6e',
    COLOR_SNAP_GLOW: 'rgba(253, 203, 110, 0.4)',
    COLOR_GHOST: 'rgba(0, 0, 0, 0.25)',
    COLOR_JOINT: '#dfe6e9',
    COLOR_GRID_DOT: 'rgba(100, 150, 255, 0.15)',

    // UI
    GRID_SPACING: 30,

    // localStorage
    LS_PROGRESS_KEY: 'contraptionProgress',
    LS_MUTED_KEY: 'contraptionMuted',

    // Game states
    STATE_MENU: 'MENU',
    STATE_LEVEL_SELECT: 'LEVEL_SELECT',
    STATE_BUILD: 'BUILD',
    STATE_SIMULATE: 'SIMULATE',
    STATE_COMPLETE: 'COMPLETE',

    // Tools
    TOOL_NONE: 'none',
    TOOL_DELETE: 'delete'
};
