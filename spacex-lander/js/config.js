// SpaceX Lander - Game Configuration Constants
// Endless score-chase + roguelite progression. One run = a chain of back-to-back
// landings on a single persistent fuel tank; a crash ends the run.

const CONFIG = {
    // Display
    WIDTH: 800,
    HEIGHT: 600,

    // Physics
    GRAVITY: 42,                    // px/sec^2
    LANDING_THRUST_POWER: 125,      // Full-throttle engine authority (TWR ~3x gravity — forgiving brake)
    GRID_FIN_ROTATION_RATE: 70,     // Degrees/sec at max effectiveness (aerodynamic, high speed)
    GRID_FIN_LATERAL_FORCE: 24,     // Lateral push from fins
    FIN_MAX_SPEED_REF: 120,         // Speed where fins are 100% effective
    THRUST_GIMBAL_RATE: 60,         // Rotation from thrust vectoring (deg/sec)
    RCS_ROTATION_RATE: 50,          // Cold-gas RCS rotation (deg/sec) — low-speed authority
    RCS_LATERAL_FORCE: 32,          // RCS lateral push (px/s^2) — low-speed steering
    DRAG_COEFFICIENT: 0.0018,       // Atmospheric drag — helps naturally slow descent
    MAX_VELOCITY: 400,

    // Control assists — keep throttle fully manual (agency) but make the tall
    // booster's attitude flyable with on/off keys.
    ATTITUDE_DAMP: 1.8,             // Per-sec relax-to-upright when NOT steering (RCS attitude hold)
    LOW_SPEED_LAT_DAMP: 0.9,        // Per-sec lateral-velocity bleed at low speed (cold-gas station keeping)
    ASSIST_SPEED_REF: 95,           // Assists ramp in below this airspeed

    // Fuel — ONE pool that PERSISTS across landings within a run (not refilled).
    FUEL_MAX: 100,
    LANDING_BURN_RATE: 9,           // Per-second full-throttle burn
    LOW_FUEL_THRESHOLD: 22,

    // Fuel top-up on a successful landing, by grade (rewards clean flight twice:
    // score AND survival). A GOOD-or-better landing is roughly net-positive fuel.
    FUEL_TOPUP: { perfect: 30, great: 22, good: 14, sketchy: 6 },

    // Landing survival gate — below this = crash = run ends.
    LAND_MAX_VY: 50,
    LAND_MAX_VX: 30,
    LAND_MAX_ANGLE: 15,

    // Grade tiers, evaluated by the WORST of (vy, vx, tilt) plus bullseye distance.
    // distRatio = |x - shipCenter| / (targetZoneWidth/2)  (0 = dead center, 1 = edge of zone)
    GRADES: {
        perfect: { vy: 12, vx: 8,  angle: 3,  distRatio: 0.25, mult: 3.0, chainStep: 1.0, label: 'PERFECT', color: '#44ffcc' },
        great:   { vy: 22, vx: 15, angle: 7,  distRatio: 1.0,  mult: 2.0, chainStep: 0.5, label: 'GREAT',   color: '#7cff5a' },
        good:    { vy: 35, vx: 22, angle: 11, distRatio: 99,   mult: 1.5, chainStep: 0.2, label: 'GOOD',    color: '#ffd24a' },
        sketchy: { vy: 50, vx: 30, angle: 15, distRatio: 99,   mult: 1.0, chainStep: 0.0, label: 'SKETCHY', color: '#ff8a3a' }
    },

    // Chain multiplier
    CHAIN_MAX: 8.0,

    // Scoring
    BASE_LANDING_SCORE: 200,
    PRECISION_BONUS_MAX: 150,       // reuse DroneShip.getPrecisionScore
    SOFTNESS_BONUS_MULTIPLIER: 3,   // floor((LAND_MAX_VY - vy) * this)
    CREDITS_PER_SCORE: 90,          // credits earned = floor(landingScore / this)

    // Leg auto-deploy (keeps a 3-input game)
    LEG_DEPLOY_ALTITUDE: 800,

    // Spawn / altitude
    START_Y: -1000,                 // Spawn altitude (world Y above the ocean)
    START_VY_BASE: 120,             // Base entry vertical speed at landing 1
    START_VY_CREEP: 6,              // +per landing index
    START_VY_MAX: 230,
    ALTITUDE_SCALE: 8,              // Pixel-to-altitude unit scale

    // Sound barrier (cosmetic flavor only — no scoring)
    SOUND_BARRIER: {
        MACH_1_SPEED: 43,
        COOLDOWN: 8000,
        MIN_ALTITUDE: 2200,
    },

    // Rocket dimensions
    ROCKET_WIDTH: 16,
    ROCKET_HEIGHT: 70,

    // Camera
    CAMERA: {
        ZOOM_MIN: 0.45,
        ZOOM_MAX: 1.05,
        ZOOM_ALT_REF: 4000,
        ZOOM_LERP: 0.05
    },

    // Ocean
    OCEAN: {
        WATER_LEVEL: 480,
        WAVE_FREQ: 0.02,
        WAVE_SPEED: 0.8,
        SWELL_RATIO: 0.3,
        CHOP_RATIO: 0.2,
        FOAM_THRESHOLD: 5
    },

    // Drone Ship
    DRONE_SHIP: {
        WIDTH: 120,
        HEIGHT: 18,
        TARGET_ZONE_RATIO: 0.6,
        BEACON_PULSE_DURATION: 800,
        GUIDE_LIGHT_HEIGHT: 60,
        ROCK_FREQ: 0.8
    },

    // --- ROGUELITE UPGRADES (persistent, bought with credits) ---
    // Each upgrade changes how the game PLAYS or SCORES — no invisible stats.
    UPGRADES: [
        {
            key: 'throttle', name: 'Throttle Authority', max: 3, costs: [100, 250, 550],
            blurb: 'Stronger landing engine (+8% thrust / level). Brake later and lower.',
            stat: '+8% engine thrust',
            glyph: 'engine'
        },
        {
            key: 'vernier', name: 'Vernier Trim', max: 3, costs: [120, 300, 650],
            blurb: 'Crisper low-speed steering (+15% RCS, +12% gimbal / level). Settle square for bullseyes.',
            stat: '+15% fine steering',
            glyph: 'rcs'
        },
        {
            key: 'tanks', name: 'Deep Tanks', max: 2, costs: [200, 500],
            blurb: '+20 max fuel / level. Runs go several landings deeper.',
            stat: '+20 max fuel',
            glyph: 'fuel'
        },
        {
            key: 'damping', name: 'Grid-Fin Damping', max: 2, costs: [150, 420],
            blurb: 'Calmer entries (-20% incoming tilt & sideways speed / level).',
            stat: '-20% entry chaos',
            glyph: 'fin'
        },
        {
            key: 'recovery', name: 'Recovery Bonus', max: 2, costs: [250, 600],
            blurb: '+8% landing fuel top-up & credits / level. Good runs self-sustain.',
            stat: '+8% fuel & credits',
            glyph: 'credit'
        }
    ],

    // LocalStorage keys
    HIGH_SCORE_KEY: 'spacexLanderHighScore',     // best run score (kept: chrome mirrors it)
    CREDITS_KEY: 'spacexLanderCredits',
    UPGRADES_KEY: 'spacexLanderUpgrades',
    BEST_CHAIN_KEY: 'spacexLanderBestChain',
    BEST_LANDINGS_KEY: 'spacexLanderBestLandings',

    // Colors
    COLORS: {
        // Sky/Space
        SPACE: 0x050510,
        SKY_TOP: 0x1a3a6a,
        SKY_MID: 0x4477bb,
        SKY_BOTTOM: 0x6aaae8,

        // Ocean
        OCEAN_SURFACE: 0x1a5a8a,
        OCEAN_MID: 0x0e3a5a,
        OCEAN_DEEP: 0x0a1a3a,
        OCEAN_FOAM: 0xccddee,
        OCEAN_HIGHLIGHT: 0x2288bb,

        // Rocket
        ROCKET_BODY: 0xeeeeee,
        ROCKET_INTERSTAGE: 0x222222,
        ROCKET_ENGINE: 0x888888,
        ROCKET_STROKE: 0xcccccc,
        GRID_FIN: 0x999999,
        LANDING_LEG: 0xcccccc,
        LEG_FOOT: 0xaaaaaa,

        // Drone Ship
        SHIP_HULL: 0x444444,
        SHIP_DECK: 0x666666,
        SHIP_MARKING: 0xffff00,
        SHIP_BARRIER: 0xffaa00,
        SHIP_BEACON: 0x00ff66,

        // Effects
        ENTRY_FLAME: [0xff4400, 0xff8800, 0xffcc00],
        LANDING_FLAME: [0x4488ff, 0x88bbff, 0xffffff],
        REENTRY_GLOW: [0xff2200, 0xff6600, 0xffaa00],
        EXPLOSION: [0xff4400, 0xff8800, 0xffcc00, 0xffffff],

        // HUD
        HUD_TEXT: '#44ff88',
        HUD_WARNING: '#ff4444',
        FUEL_FULL: 0x00ff00,
        FUEL_LOW: 0xff3300,
        WIND_ARROW: 0x4488ff,
        SHOCKWAVE: 0xffffff,

        // Brand / UI accent
        ACCENT: 0x0066ff,
        CREDIT: '#ffcc44'
    },

    // VFX Configuration
    VFX: {
        // Stars
        STAR_LAYERS: [
            { count: 120, sizeMin: 0.3, sizeMax: 1.0, speed: 0.02, alphaMin: 0.15, alphaMax: 0.5 },
            { count: 60, sizeMin: 0.8, sizeMax: 1.8, speed: 0.05, alphaMin: 0.3, alphaMax: 0.7 },
            { count: 25, sizeMin: 1.5, sizeMax: 2.8, speed: 0.1, alphaMin: 0.5, alphaMax: 1.0 }
        ],

        // Entry burn exhaust (multi-engine, wide) — used at high speed (cosmetic)
        ENTRY_CORE: { speed: [140, 240], life: 200, scale: [0.8, 0], tint: 0xffffff, rate: 40 },
        ENTRY_FLAME: { speed: [100, 200], life: 350, scale: [1.2, 0], tint: [0xff8800, 0xff6600, 0xffaa00], rate: 35 },
        ENTRY_SMOKE: { speed: [30, 80], life: 800, scale: [0.5, 2.0], alpha: [0.3, 0], tint: 0x555555, rate: 15 },

        // Landing burn exhaust (single engine, narrow)
        LAND_CORE: { speed: [80, 150], life: 160, scale: [0.5, 0], tint: 0xffffff, rate: 25 },
        LAND_FLAME: { speed: [50, 120], life: 250, scale: [0.8, 0], tint: [0x6699ff, 0x88bbff, 0xaaddff], rate: 20 },
        LAND_SMOKE: { speed: [15, 50], life: 600, scale: [0.3, 1.5], alpha: [0.2, 0], tint: 0x666666, rate: 10 },

        // Re-entry glow
        REENTRY_GLOW_SPEED: [20, 60],
        REENTRY_GLOW_LIFE: 500,
        REENTRY_GLOW_RATE: 30,

        // Grid fin puffs
        FIN_PUFF_SPEED: [10, 30],
        FIN_PUFF_LIFE: 150,
        FIN_PUFF_QUANTITY: 2,

        // Explosion
        EXPLOSION_FLASH_LIFE: 120,
        EXPLOSION_FIREBALL_COUNT: 40,
        EXPLOSION_FIREBALL_SPEED: [60, 250],
        EXPLOSION_FIREBALL_LIFE: 700,
        EXPLOSION_DEBRIS_COUNT: 20,
        EXPLOSION_DEBRIS_SPEED: [70, 220],
        EXPLOSION_DEBRIS_LIFE: 1500,
        EXPLOSION_SHOCKWAVE_DURATION: 500,
        EXPLOSION_SHOCKWAVE_RADIUS: 90,

        // Ocean spray (on landing)
        SPRAY_COUNT: 30,
        SPRAY_SPEED: [40, 120],
        SPRAY_LIFE: 800,

        // Fireworks (celebration)
        FIREWORK_BURSTS: 5,
        FIREWORK_PARTICLES: 50,
        FIREWORK_SPEED: [80, 200],
        FIREWORK_LIFE: 1100,
        FIREWORK_COLORS: [0xff2244, 0x22ff44, 0x4466ff, 0xffff22, 0xff44ff, 0x44ffff],

        // Sonic boom
        SONIC_BOOM_RADIUS: 120,
        SONIC_BOOM_DURATION: 600
    }
};

// ----------------------------------------------------------------------------
// Endless difficulty ramp. The landing index N within a run IS the "level".
// Reuses the per-level scaling fields the Ocean/DroneShip entities already read,
// so no new systems are needed — it just never plateaus. Signs randomize each
// landing so the same N never plays identically twice.
// ----------------------------------------------------------------------------
CONFIG.getLevelDef = function (N) {
    const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

    // Calm on-ramp: landing 1 is dead calm; each hazard enters one at a time.
    // All magnitudes are POSITIVE here — DroneShip applies its own sign to drift,
    // and RunScene picks the sign for wind and the entry offset.
    const wind = N >= 2 ? clamp(Math.floor(N / 2) * 3, 0, 25) : 0;
    const rockAngle = N >= 4 ? clamp((N - 3) * 1.0, 0, 8) : 0;
    const drift = N >= 6 ? clamp((N - 5) * 4, 0, 25) : 0;
    const entryAngle = N >= 3 ? clamp(Math.floor(N / 3) * 3, 0, 20) : 0;
    const entryVx = N >= 3 ? clamp(Math.floor(N / 3) * 10, 0, 60) : 0;
    const waveAmp = clamp(2 + N * 1.0, 2, 15);
    const shipShrink = N >= 8 ? Math.max(0.80, Math.pow(0.97, N - 7)) : 1.0;

    return {
        index: N,
        wind,
        rockAngle,
        drift,
        entryAngle,
        entryVx,
        waveAmp,
        shipShrink
    };
};

// ----------------------------------------------------------------------------
// Roguelite persistence + effective-stat helpers.
// ----------------------------------------------------------------------------
CONFIG.getCredits = function () {
    return parseInt(localStorage.getItem(CONFIG.CREDITS_KEY) || '0', 10) || 0;
};
CONFIG.setCredits = function (v) {
    localStorage.setItem(CONFIG.CREDITS_KEY, Math.max(0, Math.floor(v)).toString());
};
CONFIG.addCredits = function (v) {
    CONFIG.setCredits(CONFIG.getCredits() + v);
};
CONFIG.getUpgrades = function () {
    try { return JSON.parse(localStorage.getItem(CONFIG.UPGRADES_KEY) || '{}') || {}; }
    catch (e) { return {}; }
};
CONFIG.getUpgradeLevel = function (key) {
    const u = CONFIG.getUpgrades();
    return u[key] || 0;
};
CONFIG.setUpgradeLevel = function (key, level) {
    const u = CONFIG.getUpgrades();
    u[key] = level;
    localStorage.setItem(CONFIG.UPGRADES_KEY, JSON.stringify(u));
};
// Cost of the NEXT tier of an upgrade, or null if maxed.
CONFIG.nextUpgradeCost = function (def) {
    const lvl = CONFIG.getUpgradeLevel(def.key);
    if (lvl >= def.max) return null;
    return def.costs[lvl];
};

// Snapshot the effective stats for a run, given currently-owned upgrades.
// Read once at run start so upgrades are fixed for the run.
CONFIG.effectiveStats = function () {
    const lvl = CONFIG.getUpgradeLevel.bind(CONFIG);
    const throttle = lvl('throttle');
    const vernier = lvl('vernier');
    const tanks = lvl('tanks');
    const damping = lvl('damping');
    const recovery = lvl('recovery');
    return {
        landingThrust: CONFIG.LANDING_THRUST_POWER * (1 + 0.08 * throttle),
        rcsLateral: CONFIG.RCS_LATERAL_FORCE * (1 + 0.15 * vernier),
        gimbalRate: CONFIG.THRUST_GIMBAL_RATE * (1 + 0.12 * vernier),
        rcsRotation: CONFIG.RCS_ROTATION_RATE * (1 + 0.15 * vernier),
        fuelMax: CONFIG.FUEL_MAX + 20 * tanks,
        entryDamping: Math.max(0, 1 - 0.20 * damping),
        topupMult: 1 + 0.08 * recovery,
        creditsMult: 1 + 0.08 * recovery
    };
};
