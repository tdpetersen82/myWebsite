// Level 01 — "Riverside Café"
// 30 cells wide × 20 cells tall, 0.5m cells = 15m × 10m
// One exit on south wall. Single fire ignites near NW after 4s.
// Player has 3 marshals to place anywhere walkable.

const LEVEL_01 = {
    id: '01-cafe',
    displayName: 'Riverside Café',
    grid: { w: 30, h: 20 },
    // tile string (per row, top to bottom)
    // # = wall, . = floor, E = exit
    tiles: [
        '##############################', // 0
        '#............................#', // 1
        '#............................#', // 2
        '#............................#', // 3
        '#............................#', // 4
        '#............................#', // 5
        '#............................#', // 6
        '#............................#', // 7
        '#.....#######.....######.....#', // 8  partial dividers (counters with gaps)
        '#............................#', // 9
        '#............................#', // 10
        '#............................#', // 11
        '#............................#', // 12
        '#............................#', // 13
        '#......######.......#####....#', // 14 second counters (different gaps)
        '#............................#', // 15
        '#............................#', // 16
        '#............................#', // 17
        '#............................#', // 18
        '##########EEEEEEEE############', // 19 — wider exit (8 cells, 4m)
    ],
    spawn: {
        // spawn region in cells (away from fire ignition NE corner)
        rect: { x0: 2, y0: 2, x1: 22, y1: 7 },
        count: 40,
        groupSizeRange: [1, 3],
        demographics: {
            normal: 0.7, elderly: 0.1, child: 0.1, wheelchair: 0.05, drunk: 0.05,
        },
    },
    threat: {
        ignitionPoint: { x: 26, y: 3 },        // NE corner — far from spawn
        ignitionDelay: 8,                       // give the player a window
        windAngle: null,                        // random direction
    },
    budget: {
        marshals: 3,
        barrier_units: 12,        // total cells of barrier wall
        signs: 4,
        pa: 2,
    },
    timeLimit: 120,
    ambient: { tint: 0x0c0e1a, alpha: 0.14 },     // bright daylight café
};

LEVELS.push(LEVEL_01);
