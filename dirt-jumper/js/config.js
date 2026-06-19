// Dirt Jumper — Phase 1 configuration & tunables.
// Single hardcoded vehicle. The whole point of Phase 1 is to feel the
// pump -> pop -> land loop, so EVERY physics number lives here and the Bike
// reads them through one `stats` object (CONFIG.STATS). Phase 2's vehicles /
// upgrades just swap what fills `stats` — the Bike code never changes.

const CONFIG = {
    // ---- Display (16:9) ----
    WIDTH: 960,
    HEIGHT: 540,

    // localStorage
    BEST_KEY: 'dirtJumperBest',     // plain int (distance + flow score)

    // ---- The single vehicle's stats (Phase 2 swaps this object) ----
    // All accelerations are px/s^2, speeds px/s, angles in degrees.
    STATS: {
        gravity: 1500,              // global down accel (also used in air)

        // Rolling on terrain
        rollDragConst: 24,          // constant rolling resistance (px/s^2)
        rollDragK2: 0.00050,        // quadratic (air) drag -> terminal speed
        topSpeed: 1050,             // soft ceiling; pump speedFactor fades to 0 here
        speedFloor: 26,             // never fully stall on the descent

        // Pump (the signature mechanic)
        kPump: 1650,                // down-phase work scale (x downhillSteepness x speedFactor)
        kPumpBleed: 100,            // up-phase penalty while still holding pump (px/s^2)
        pumpDownThresh: 0.025,      // |sin(slope)| above this counts as a real down/up face
        preloadTime: 0.34,         // seconds of held pump to fully charge a pop

        // Pop (timed jump off a lip)
        kPop: 360,                  // max upward vy added by a perfectly-timed pop
        popWindow: 110,             // px ahead to look for the lip/crest when releasing

        // Air
        flipRate: 514,              // deg/sec rotation from <- / ->
        airDrag: 0.04,              // gentle horizontal air drag (per sec)
        minAirSpeed: 70,            // below this you don't launch off small convexities

        // Landing grade thresholds — |bikeAngle - landingSlope| in degrees.
        // Phase 2 wheel upgrades widen these.
        landTolerance: { perfect: 8, clean: 22, sketchy: 40 },
        cleanScrub: 0.93,           // speed kept on a CLEAN landing
        sketchyScrub: 0.62,         // speed kept on a SKETCHY landing
        caseBailSpeed: 720          // slamming into a surface harder than this = bail
    },

    // ---- Terrain feature parameters (parametric; Phase 2 scales/adds) ----
    // Lengths in px, heights in px (down is +). `drop` = net downhill descent
    // a feature adds (keeps the track net-downhill).
    // Built on real pump-track + dirt-jump geometry (~1ft ≈ 10px at this scale):
    //   * PUMP rollers = flowy SINE wave, length ≈ 8-11x height (the "10:1" rule)
    //     → ~17-21° faces. Rounded & ROLLABLE: you pump them for speed, you don't
    //     launch. Heights/spacing are VARIED (uniform spacing reads as whoops).
    //   * WHOOPS  = the tight, uniform, jerky (~45°) tech section — a distinct
    //     feature, not the bread-and-butter rollers.
    //   * JUMPS   = a curved kicker up to a steep LIP (≈35° → real pop, since
    //     vy=speed·sin(lip)) then a TABLE (roll-or-jump) or a GAP (pit), each
    //     with a matched downslope LANDING. Chained 1-3 into a jump LINE.
    // Layout alternates pump-to-build-speed → jump-line-to-spend-it.
    TERRAIN: {
        startFlat: 540,             // gentle run-in before the first feature
        baseDrop: 26,               // gentle descent on connectors (keeps flow, no flat spots)
        // Flowy pump rollers (the pumpable hills) — varied height/length.
        pump: { minH: 16, maxH: 36, minRatio: 8, maxRatio: 11, minCount: 3, maxCount: 6, drop: 12 },
        // Tight jerky whoops (tech section).
        whoops: { h: 13, ratio: 2.6, minCount: 5, maxCount: 8, drop: 8 },
        // Dirt jumps: steep kicker lip (pop) + matched downslope landing.
        jump: {
            kickH: 26, kickHPerD: 26,   // kicker height (scales with difficulty d)
            kickRatio: 1.6,             // kickLen = kickH*ratio → steeper = more pop
            tableLen: 95, tableDrop: 8, // tabletop flat top
            landRatio: 0.62,            // landing downslope = landLen*ratio (≈32°)
            gapMin: 70, gapPerD: 150,   // pit width to clear (punishing scales with d)
            voidRatio: 0.7,             // pit depth = kickH*ratio below baseline
            runUp: 70                   // run-up between jumps in a line
        },
        // streaming
        lookahead: 1700,            // px to keep generated ahead of the bike
        cullBehind: 1100            // px behind the camera to drop (draw/memory only)
    },

    // gentle difficulty creep: difficulty d ramps with distance travelled.
    DIFF: {
        rampDist: 9000,             // px over which d climbs from 0 -> 1
        max: 1.6                    // d caps here (features never get unfair)
    },

    // ---- Scoring ----
    SCORE_PER_PX: 0.10,             // distance points per world-px travelled
    FLOW_MAX: 8,                    // flow units cap
    FLOW_PER_GOODPUMP: 0.34,        // flow gained per good pump cycle
    FLOW_PER_CLEAN: 1.0,            // flow gained per clean/perfect landing
    FLOW_SCORE_MULT: 0.06,         // each flow unit adds this fraction to score rate
    FLOW_TOPSPEED_BONUS: 12,        // px/s top-speed nudge per flow unit

    // ---- Colors ----
    COLORS: {
        SKY_TOP: 0x2a4a66,
        SKY_BOT: 0x6f93a8,
        HILL_FAR: 0x4a6276,
        DIRT_TOP: 0x9c6b3f,         // sunlit dirt face
        DIRT_FILL: 0x6f4a28,        // dirt body
        DIRT_DARK: 0x4e3320,        // shaded dirt
        DIRT_LINE: 0x3a2616         // outline
    }
};

CONFIG.COLORS.BIKE = 0x1d2230;
CONFIG.COLORS.BIKE_ACCENT = 0xff8a3a;
CONFIG.COLORS.RIDER = 0x222831;
CONFIG.COLORS.WHEEL = 0x111418;
CONFIG.COLORS.DUST = 0xc9a06a;
CONFIG.COLORS.HUD = '#f3e9dd';
CONFIG.COLORS.HUD_DIM = '#b9a98f';
CONFIG.COLORS.ACCENT = '#ff8a3a';
CONFIG.COLORS.PERFECT = '#46e6a0';
CONFIG.COLORS.CLEAN = '#9be36b';
CONFIG.COLORS.SKETCHY = '#ffcf5a';
CONFIG.COLORS.BAIL = '#ff6a5a';

// difficulty 0..max for a given distance travelled (px)
CONFIG.difficultyAt = function (dist) {
    const d = Math.min(CONFIG.DIFF.max, dist / CONFIG.DIFF.rampDist);
    return Math.max(0, d);
};
