const CONFIG = {
    // Board
    ROWS: 9,
    COLS: 9,
    CELL_SIZE: 2.0,
    WALL_HEIGHT: 0.6,
    WALL_THICKNESS: 0.2,
    BOARD_THICKNESS: 0.3,
    RIM_HEIGHT: 0.8,

    // Ball
    BALL_RADIUS: 0.35,
    BALL_MASS: 1,
    BALL_DAMPING: 0.08,
    BALL_FRICTION: 0.4,
    BALL_RESTITUTION: 0.3,

    // Holes
    HOLE_RADIUS: 0.45,

    // Physics
    GRAVITY: 14,
    MAX_TILT: 0.22,
    TILT_SPEED: 0.003,
    TILT_DECAY: 0.88,
    TILT_LERP: 0.14,
    VISUAL_TILT_MULT: 8,

    // Game
    LIVES: 3,
    FALL_DURATION: 600,

    // Camera
    CAMERA_HEIGHT: 28,
    CAMERA_OFFSET_Z: 10,
    CAMERA_FOV: 45,

    // localStorage
    LS_PREFIX: 'labyrinth3d_babylonjs_',

    // Colors
    BOARD_COLOR: 0xC4913B,
    BOARD_DARK: 0x8B6914,
    WALL_COLOR: 0x5C4033,
    RIM_COLOR: 0x6B4226,
    BALL_COLOR: 0xCCCCCC,
    HOLE_COLOR: 0x111111,
    START_COLOR: 0x44AA44,
    GOAL_COLOR: 0xFFD700,
    FLOOR_COLOR: 0x2A1506,
};
