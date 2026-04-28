// EXODUS — Crowd Evacuation
// Central configuration. Every magic number lives here.
// See SPEC.md §5 for the full reference.

const CFG = {
    // ── Canvas / world ────────────────────────────────────
    CANVAS_W: 800,
    CANVAS_H: 600,
    PIXELS_PER_METER: 32,
    CELL_M: 0.5,                    // grid cell size in meters
    HUD_HEIGHT: 56,                 // top HUD strip in canvas pixels

    // ── Storage ───────────────────────────────────────────
    STORAGE_PREFIX: 'crowd-evac:v1:',
    HIGH_SCORE_KEY: 'crowdEvacHighScore',  // hub-convention key

    // ── Time ──────────────────────────────────────────────
    SIM_HZ: 60,
    THREAT_HZ: 10,
    MAX_DT: 0.1,

    // ── Agent ─────────────────────────────────────────────
    AGENT_RADIUS: 0.2,
    BASE_SPEED: 1.3,
    MAX_SPEED_MULT: 1.7,
    PANIC_SPEED_GAIN: 0.7,
    MOBILITY_NORMAL: 1.0,
    MOBILITY_ELDERLY: 0.6,
    MOBILITY_CHILD: 0.85,
    MOBILITY_WHEELCHAIR: 0.35,
    MOBILITY_DRUNK: 0.7,
    AWARENESS_NORMAL: 0.5,
    AWARENESS_DRUNK: 0.15,

    // ── Social Force Model ───────────────────────────────
    SFM_A: 800,                     // tuned softer than spec for browser fps
    SFM_B: 0.10,
    SFM_TAU: 0.5,
    GROUP_COHESION_K: 1.5,
    GROUP_LAG_M: 3.0,
    WALL_REPULSION_MULT: 1.4,

    // ── Vision ───────────────────────────────────────────
    VISION_NORMAL_M: 12,
    VISION_MIN_M: 1.5,
    SIGN_PERSISTENCE_S: 8,
    MARSHAL_RADIUS_M: 4,
    MARSHAL_PERSISTENCE_S: 15,
    MARSHAL_PANIC_REDUCTION: 0.12,

    // ── Panic ────────────────────────────────────────────
    PANIC_DENSITY_GAIN: 0.5,
    PANIC_THREAT_GAIN: 1.0,
    PANIC_VISION_GAIN: 0.25,
    PANIC_DECAY: 0.05,
    DENSITY_PANIC_THRESHOLD: 6,

    // ── Threat — fire ────────────────────────────────────
    FIRE_SPREAD_BASE: 0.04,
    FIRE_WIND_BIAS: 4.0,
    FIRE_FUEL_BURN_RATE: 0.04,
    FIRE_DAMAGE_RADIUS_M: 0.8,
    FIRE_INJURE_PANIC_THRESHOLD: 0.95,
    FIRE_IGNITION_DELAY_S: 4,       // seconds after alarm before fire starts

    // ── Scoring ──────────────────────────────────────────
    SCORE_EVAC_WEIGHT: 100,
    SCORE_INJURED_PENALTY: 30,
    SCORE_TIME_BONUS: 20,
    SCORE_BUDGET_BONUS: 10,
    STAR_THRESHOLDS: [60, 80, 95],

    // ── Performance ──────────────────────────────────────
    SPATIAL_HASH_CELL_M: 1.0,
    MAX_NEIGHBOR_QUERY: 20,         // cap per agent for SFM
};

// Helpers — px/meter conversion shared by all rendering code
function m2px(m) { return m * CFG.PIXELS_PER_METER; }
function px2m(px) { return px / CFG.PIXELS_PER_METER; }
