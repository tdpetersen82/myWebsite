// Fantastic Contraption — Level Definitions
// Canvas: 1200 x 800. Ground at y=700 typically.
const LEVELS = [
    {
        id: 1,
        name: 'First Steps',
        hint: 'Attach a powered wheel to a rod, then connect the payload.',
        terrain: [
            { type: 'rect', x: 0, y: 720, w: 1200, h: 100 }
        ],
        buildZone: { x: 100, y: 400, w: 400, h: 320 },
        goalZone:  { x: 700, y: 620, w: 150, h: 100 },
        payload:   { x: 250, y: 695 }
    },
    {
        id: 2,
        name: 'Small Gap',
        hint: 'Build a vehicle wide enough to cross the gap.',
        terrain: [
            { type: 'rect', x: 0, y: 720, w: 500, h: 100 },
            { type: 'rect', x: 600, y: 720, w: 600, h: 100 }
        ],
        buildZone: { x: 50, y: 400, w: 400, h: 320 },
        goalZone:  { x: 800, y: 620, w: 150, h: 100 },
        payload:   { x: 200, y: 695 }
    },
    {
        id: 3,
        name: 'Gentle Hill',
        hint: 'Powered wheels with good grip will climb the slope.',
        terrain: [
            { type: 'rect', x: 0, y: 720, w: 500, h: 100 },
            { type: 'poly', vertices: [
                { x: 500, y: 720 }, { x: 800, y: 580 },
                { x: 800, y: 820 }, { x: 500, y: 820 }
            ]},
            { type: 'rect', x: 800, y: 580, w: 400, h: 240 }
        ],
        buildZone: { x: 50, y: 400, w: 400, h: 320 },
        goalZone:  { x: 950, y: 480, w: 150, h: 100 },
        payload:   { x: 200, y: 695 }
    },
    {
        id: 4,
        name: 'The Bridge',
        hint: 'A wider gap needs a longer vehicle or a clever launcher.',
        terrain: [
            { type: 'rect', x: 0, y: 720, w: 400, h: 100 },
            { type: 'rect', x: 700, y: 720, w: 500, h: 100 }
        ],
        buildZone: { x: 50, y: 350, w: 350, h: 370 },
        goalZone:  { x: 850, y: 620, w: 150, h: 100 },
        payload:   { x: 200, y: 695 }
    },
    {
        id: 5,
        name: 'Over the Wall',
        hint: 'Build tall or build a launcher to get over the wall.',
        terrain: [
            { type: 'rect', x: 0, y: 720, w: 1200, h: 100 },
            { type: 'rect', x: 550, y: 560, w: 40, h: 160 }
        ],
        buildZone: { x: 50, y: 350, w: 450, h: 370 },
        goalZone:  { x: 800, y: 620, w: 150, h: 100 },
        payload:   { x: 200, y: 695 }
    },
    {
        id: 6,
        name: 'Downhill Run',
        hint: 'Gravity is your friend, but control your descent.',
        terrain: [
            { type: 'rect', x: 0, y: 400, w: 400, h: 420 },
            { type: 'poly', vertices: [
                { x: 400, y: 400 }, { x: 700, y: 720 },
                { x: 700, y: 820 }, { x: 400, y: 820 }
            ]},
            { type: 'rect', x: 700, y: 720, w: 500, h: 100 }
        ],
        buildZone: { x: 50, y: 100, w: 350, h: 300 },
        goalZone:  { x: 950, y: 620, w: 150, h: 100 },
        payload:   { x: 200, y: 375 }
    },
    {
        id: 7,
        name: 'The Cliff',
        hint: 'You need to climb straight up. Multiple wheels help.',
        terrain: [
            { type: 'rect', x: 0, y: 720, w: 500, h: 100 },
            { type: 'rect', x: 500, y: 350, w: 40, h: 370 },
            { type: 'rect', x: 500, y: 350, w: 700, h: 40 },
            { type: 'rect', x: 540, y: 390, w: 660, h: 430 }
        ],
        buildZone: { x: 50, y: 350, w: 400, h: 370 },
        goalZone:  { x: 750, y: 250, w: 150, h: 100 },
        payload:   { x: 200, y: 695 }
    },
    {
        id: 8,
        name: 'Water Works',
        hint: 'Water rods pass through each other — useful for complex builds.',
        terrain: [
            { type: 'rect', x: 0, y: 720, w: 450, h: 100 },
            { type: 'rect', x: 450, y: 550, w: 40, h: 170 },
            { type: 'rect', x: 490, y: 550, w: 40, h: 170 },
            { type: 'rect', x: 530, y: 720, w: 670, h: 100 }
        ],
        buildZone: { x: 50, y: 350, w: 380, h: 370 },
        goalZone:  { x: 850, y: 620, w: 150, h: 100 },
        payload:   { x: 200, y: 695 }
    },
    {
        id: 9,
        name: 'The Staircase',
        hint: 'Step by step. Big wheels handle stairs better.',
        terrain: [
            { type: 'rect', x: 0, y: 720, w: 300, h: 100 },
            { type: 'rect', x: 300, y: 660, w: 200, h: 160 },
            { type: 'rect', x: 500, y: 600, w: 200, h: 220 },
            { type: 'rect', x: 700, y: 540, w: 200, h: 280 },
            { type: 'rect', x: 900, y: 480, w: 300, h: 340 }
        ],
        buildZone: { x: 20, y: 350, w: 280, h: 370 },
        goalZone:  { x: 1000, y: 380, w: 150, h: 100 },
        payload:   { x: 140, y: 695 }
    },
    {
        id: 10,
        name: 'Launch Pad',
        hint: 'The goal is way up high. Build a ramp or catapult!',
        terrain: [
            { type: 'rect', x: 0, y: 720, w: 800, h: 100 },
            { type: 'rect', x: 900, y: 300, w: 60, h: 520 },
            { type: 'rect', x: 900, y: 300, w: 300, h: 40 }
        ],
        buildZone: { x: 50, y: 300, w: 500, h: 420 },
        goalZone:  { x: 980, y: 200, w: 150, h: 100 },
        payload:   { x: 200, y: 695 }
    },
    {
        id: 11,
        name: 'Tight Squeeze',
        hint: 'Small and nimble wins the race through tight corridors.',
        terrain: [
            { type: 'rect', x: 0, y: 720, w: 1200, h: 100 },
            { type: 'rect', x: 400, y: 500, w: 40, h: 220 },
            { type: 'rect', x: 400, y: 500, w: 300, h: 40 },
            { type: 'rect', x: 700, y: 500, w: 40, h: 260 },
            // Ceiling to force low profile
            { type: 'rect', x: 400, y: 430, w: 340, h: 30 }
        ],
        buildZone: { x: 50, y: 400, w: 320, h: 320 },
        goalZone:  { x: 900, y: 620, w: 150, h: 100 },
        payload:   { x: 200, y: 695 }
    },
    {
        id: 12,
        name: 'The Gauntlet',
        hint: 'Everything at once. Good luck!',
        terrain: [
            { type: 'rect', x: 0, y: 720, w: 300, h: 100 },
            // Gap
            { type: 'rect', x: 400, y: 720, w: 200, h: 100 },
            // Wall
            { type: 'rect', x: 600, y: 580, w: 30, h: 140 },
            // Platform after wall
            { type: 'rect', x: 600, y: 720, w: 250, h: 100 },
            // Slope up
            { type: 'poly', vertices: [
                { x: 850, y: 720 }, { x: 1050, y: 520 },
                { x: 1050, y: 820 }, { x: 850, y: 820 }
            ]},
            { type: 'rect', x: 1050, y: 520, w: 200, h: 300 }
        ],
        buildZone: { x: 20, y: 300, w: 280, h: 420 },
        goalZone:  { x: 1070, y: 420, w: 130, h: 100 },
        payload:   { x: 140, y: 695 }
    }
];
