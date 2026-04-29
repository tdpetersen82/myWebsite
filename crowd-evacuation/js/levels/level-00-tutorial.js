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
        steps: [
            { text: '8 people need to evacuate. Click anywhere on the floor to place a marshal.', advance: 'place-marshal' },
            { text: 'Marshals pull nearby people toward exits and reduce their panic. Now press 3 (or click 3 Sign on the toolbar) to switch tools.', advance: 'tool-sign' },
            { text: 'Press R to rotate the sign so it points south, then click on the floor to place it. Signs guide people who are within sight.', advance: 'place-sign' },
            { text: 'Ready? Press ALARM (or Enter) to start the simulation. You can\'t edit once it fires.', advance: 'alarm' },
        ],
    },
};

LEVELS.push(LEVEL_00);
