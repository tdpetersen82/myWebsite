// Level 02 — Nightclub
// 30×20 grid (15m × 10m), 60 agents, drunk-heavy crowd, narrow 1m exit.
// Harder than level-01: nearly double the crowd, half the exit width, faster fire,
// half the crowd is drunk (low sign-reading awareness).

const LEVEL_02 = {
    id: '02-nightclub',
    displayName: 'Bassline Club',
    grid: { w: 30, h: 20 },
    // Layout: bar along north wall (sectioned), pillars in two rows
    // create dance-floor pockets, single narrow exit on south wall.
    tiles: [
        '##############################', // 0
        '#............................#', // 1
        '#.######.######....######....#', // 2  bar sections
        '#............................#', // 3
        '#............................#', // 4
        '#....##........##........##..#', // 5  upper pillars
        '#............................#', // 6
        '#............................#', // 7
        '#............................#', // 8
        '#............................#', // 9
        '#............................#', // 10
        '#............................#', // 11
        '#....##........##........##..#', // 12 lower pillars
        '#............................#', // 13
        '#............................#', // 14
        '#............................#', // 15
        '#............................#', // 16
        '#............................#', // 17
        '#............................#', // 18
        '#############EE###############', // 19 — 1m exit (intentionally narrow)
    ],
    spawn: {
        rect: { x0: 3, y0: 6, x1: 26, y1: 14 },
        count: 60,
        groupSizeRange: [2, 4],
        demographics: {
            normal: 0.45,
            elderly: 0.0,
            child: 0.0,
            wheelchair: 0.05,
            drunk: 0.5,                    // half the crowd is drunk
        },
    },
    threat: {
        ignitionPoint: { x: 5, y: 3 },
        ignitionDelay: 5,
        windAngle: null,
    },
    budget: {
        marshals: 4,
        barrier_units: 16,
        signs: 6,
        pa: 3,
    },
    timeLimit: 100,
};

LEVELS.push(LEVEL_02);
