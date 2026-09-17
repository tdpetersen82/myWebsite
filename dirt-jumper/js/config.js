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
    METERS_PER_PIXEL: 1.05 / 64, // 1.05 m wheelbase spans 64 world pixels
    BEST_KEY: 'dirtJumperBest',     // plain int (distance + flow score)

    // ---- The single vehicle's stats (Phase 2 swaps this object) ----
    // All accelerations are px/s^2, speeds px/s, angles in degrees.
    STATS: {
        airGravity: 850,             // longer, readable jump arcs
        gravity: 1500,              // global down accel (also used in air)

        // Rolling on terrain
        rollDragConst: 24,          // constant rolling resistance (px/s^2)
        rollDragK2: 0.00050,        // quadratic (air) drag -> terminal speed
        topSpeed: 700,              // soft ceiling; pump speedFactor fades to 0 here
        speedFloor: 26,             // never fully stall on the descent

        // Pump (the signature mechanic)
        kPump: 2100,                // down-phase work scale (x downhillSteepness x speedFactor)
        kPumpBleed: 100,            // up-phase penalty while still holding pump (px/s^2)
        pumpChargeRate: 1.8,        // charge per second on a useful downslope
        pumpChargeMin: 0.12,        // ignore accidental single-frame taps
        pumpChargeDecay: 0.45,      // early release is forgiving, but charge expires
        pumpHeldUpDecay: 1.2,       // staying compressed uphill wastes stored effort
        releaseGravityRelief: 0.75, // charged extension reduces uphill speed loss
        releaseDrain: 0.45,         // charge spent per second of climbing
        releasePop: 75,             // extra upward speed from an extended jump takeoff
        pumpDownThresh: 0.025,      // |sin(slope)| above this counts as a real down/up face

        // Front fork and rider springs (visual response; rear triangle stays rigid).
        forkTravel: 5.2,
        forkSpring: 170,
        forkDamping: 19,
        riderSpring: 105,
        riderDamping: 15,

        // Air
        flipRate: 420,              // hold arrows for flips; short taps adjust landing pitch
        leanResponse: 0.12,         // seconds to ease into a held lean
        airDrag: 0.04,              // gentle horizontal air drag (per sec)
        minAirSpeed: 70,            // below this a jump lip won't launch you

        // Landing grade thresholds — |bikeAngle - landingSlope| in degrees.
        // Phase 2 wheel upgrades widen these.
        landTolerance: { perfect: 8, clean: 22, sketchy: 40 },
        cleanScrub: 0.93,           // speed kept on a CLEAN landing
        sketchyScrub: 0.62,         // speed kept on a SKETCHY landing
        caseBailSpeed: 720          // slamming into a surface harder than this = bail
    },

    // Composed downhill phrases: three warm-up rollers, one tabletop, then
    // alternating pump sections and two-jump lines with generous run-outs.
    TERRAIN: {
        startFlat: 360,
        pump: { minH: 23, maxH: 29, minRatio: 10.5, maxRatio: 11.5, drop: 18 },
        jump: {
            kickH: 34, kickHPerD: 12,
            kickRatio: 2.8,
            lipBoost: 220, lipBoostPerH: 1.2,
            tableLen: 360, tableDrop: 5,
            landRatio: 0.22,
            landingLen: 600, landingLenPerD: 90,
            gapMin: 320, gapPerD: 25,
            runUp: 250
        },
        lookahead: 1700,
        cullBehind: 1100
    },

    // gentle difficulty creep: difficulty d ramps with distance travelled.
    DIFF: {
        rampDist: 16000,             // px over which d climbs from 0 -> 1
        max: 1.6                    // d caps here (features never get unfair)
    },

    // ---- Scoring ----
    SCORE_PER_PX: 0.10,             // distance points per world-px travelled
    FLOW_MAX: 8,                    // flow units cap
    FLOW_PER_GOODPUMP: 0.34,        // flow gained per good pump cycle
    FLOW_PER_CLEAN: 1.0,            // flow gained per clean/perfect landing
    FLOW_SCORE_MULT: 0.06,         // each flow unit adds this fraction to score rate
    FLOW_TOPSPEED_BONUS: 5,        // px/s top-speed nudge per flow unit

    // ---- Colors ----
    COLORS: {
        SKY_TOP: 0x719a9b,
        SKY_BOT: 0xf2d5a3,
        HILL_FAR: 0x4a6276,
        DIRT_TOP: 0xd8a265,         // sunlit dirt face
        DIRT_FILL: 0x694a36,        // dirt body
        DIRT_DARK: 0x4e3320,        // shaded dirt
        DIRT_LINE: 0xf3c88a         // outline
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
