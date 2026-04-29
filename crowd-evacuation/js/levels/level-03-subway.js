// Level 03 — Subway Platform
// 30×14 grid (15m × 7m). Two exits (stair tops at far ends of platform).
// Long thin space, structural pillars, dense rush-hour crowd.
// Two exits force a routing decision: closest exit isn't always best
// once the chokepoint jams.

const LEVEL_03 = {
    id: '03-subway',
    displayName: 'Platform 7 — Westgate',
    grid: { w: 30, h: 14 },
    tiles: [
        '##############################', // 0  north tracks (wall)
        '##############################', // 1
        'EE..........................EE', // 2  west + east stair exits
        'EE..........................EE', // 3
        '#............................#', // 4
        '#...##........##........##...#', // 5  pillars
        '#............................#', // 6
        '#............................#', // 7
        '#............................#', // 8
        '#...##........##........##...#', // 9  pillars
        '#............................#', // 10
        '##############################', // 11
        '##############################', // 12 south tracks (wall)
        '##############################', // 13
    ],
    spawn: {
        rect: { x0: 4, y0: 4, x1: 26, y1: 11 },
        count: 80,
        groupSizeRange: [1, 3],            // commuters tend solo or small groups
        demographics: {
            normal: 0.7,
            elderly: 0.15,
            child: 0.05,
            wheelchair: 0.10,
            drunk: 0,
        },
    },
    threat: {
        ignitionPoint: { x: 14, y: 7 },    // mid-platform: forces split decision
        ignitionDelay: 6,
        windAngle: null,
    },
    budget: {
        marshals: 5,
        barrier_units: 16,
        signs: 8,
        pa: 3,
    },
    timeLimit: 120,
    ambient: { tint: 0x06121a, alpha: 0.32 },     // cool fluorescent station
};

LEVELS.push(LEVEL_03);
