// Level 00 — Tutorial
// 18×12 grid (9m × 6m), 8 agents, 1 marshal budget, single fire after 8s.
// Includes intro hint banner shown at scene entry.

const LEVEL_00 = {
    id: '00-tutorial',
    displayName: 'Tutorial — Coffee Stand',
    grid: { w: 18, h: 12 },
    tiles: [
        '##################',  // 0
        '#................#',  // 1
        '#................#',  // 2
        '#................#',  // 3
        '#................#',  // 4
        '#................#',  // 5
        '#......####......#',  // 6
        '#................#',  // 7
        '#................#',  // 8
        '#................#',  // 9
        '#................#',  // 10
        '########EEEE######',  // 11
    ],
    spawn: {
        rect: { x0: 4, y0: 2, x1: 14, y1: 5 },
        count: 8,
        groupSizeRange: [1, 2],
        demographics: { normal: 1.0, elderly: 0, child: 0, wheelchair: 0, drunk: 0 },
    },
    threat: {
        ignitionPoint: { x: 3, y: 3 },
        ignitionDelay: 8,
        windAngle: null,
    },
    budget: {
        marshals: 1,
        barrier_units: 0,
        signs: 1,
        pa: 0,
    },
    timeLimit: 60,
    tutorial: {
        intro: '8 people need to evacuate before fire spreads.\n\n' +
               '• Place 1 marshal — they reduce panic and pull people toward exits.\n' +
               '• Place 1 sign — it points the way (rotate with R).\n' +
               '• Press ALARM when ready.',
    },
};

LEVELS.push(LEVEL_00);
