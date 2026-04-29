// Level 04 — Stadium Concourse
// 30×20 grid (15m × 10m). 100 spectators, 3 exit gates on south wall (each 2m wide),
// concession kiosks along the north, structural pillars in three rows.
// The hardest level: high agent count + multiple exits to coordinate.

const LEVEL_04 = {
    id: '04-stadium',
    displayName: 'Section 119 Concourse',
    grid: { w: 30, h: 20 },
    tiles: [
        '##############################',  // 0
        '##############################',  // 1
        '#............................#',  // 2
        '#......#####....##....#####..#',  // 3  concession kiosks
        '#............................#',  // 4
        '#............................#',  // 5
        '#....##........##........##..#',  // 6  pillars row 1
        '#............................#',  // 7
        '#............................#',  // 8
        '#............................#',  // 9
        '#....##........##........##..#',  // 10 pillars row 2
        '#............................#',  // 11
        '#............................#',  // 12
        '#............................#',  // 13
        '#....##........##........##..#',  // 14 pillars row 3
        '#............................#',  // 15
        '#............................#',  // 16
        '#............................#',  // 17
        '#............................#',  // 18
        '#######EEEE####EEEE####EEEE###',  // 19 three south gates, 4 cells each
    ],
    spawn: {
        rect: { x0: 3, y0: 4, x1: 27, y1: 18 },
        count: 100,
        groupSizeRange: [2, 5],            // families and friend groups
        demographics: {
            normal: 0.65,
            elderly: 0.15,
            child: 0.15,
            wheelchair: 0.05,
            drunk: 0,
        },
    },
    threat: {
        ignitionPoint: { x: 8, y: 3 },     // NW concession stand
        ignitionDelay: 6,
        windAngle: null,
    },
    budget: {
        marshals: 6,
        barrier_units: 24,
        signs: 10,
        pa: 4,
    },
    timeLimit: 130,
    ambient: { tint: 0x101424, alpha: 0.22 },     // stadium evening glare
};

LEVELS.push(LEVEL_04);
