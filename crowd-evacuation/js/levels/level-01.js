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
};

// Build a GridMap from a level config
function buildGridFromLevel(level) {
    const g = new GridMap(level.grid.w, level.grid.h);
    const exitCells = [];
    for (let y = 0; y < level.grid.h; y++) {
        const row = level.tiles[y];
        for (let x = 0; x < level.grid.w; x++) {
            const ch = row.charAt(x);
            if (ch === '#') g.setTile(x, y, Tile.WALL);
            else if (ch === 'E') exitCells.push({ x, y });
            else g.setTile(x, y, Tile.FLOOR);
        }
    }
    if (exitCells.length > 0) g.addExit('main', exitCells);
    return g;
}

// Spawn agents per spec
function spawnAgentsForLevel(level) {
    const agents = [];
    const cs = CFG.CELL_M;
    const sp = level.spawn;
    const types = level.spawn.demographics;
    const typeKeys = Object.keys(types);
    let groupId = 0;
    let id = 0;
    let placed = 0;

    function pickType() {
        const r = Math.random();
        let acc = 0;
        for (const k of typeKeys) {
            acc += types[k];
            if (r <= acc) return k;
        }
        return 'normal';
    }

    while (placed < sp.count) {
        const groupSize = Math.min(
            sp.count - placed,
            sp.groupSizeRange[0] +
                Math.floor(Math.random() * (sp.groupSizeRange[1] - sp.groupSizeRange[0] + 1))
        );
        // group centroid in meters
        const ccx = (sp.rect.x0 + Math.random() * (sp.rect.x1 - sp.rect.x0)) * cs;
        const ccy = (sp.rect.y0 + Math.random() * (sp.rect.y1 - sp.rect.y0)) * cs;
        const gid = groupSize > 1 ? groupId++ : -1;
        for (let i = 0; i < groupSize; i++) {
            const offX = (Math.random() - 0.5) * 1.0;
            const offY = (Math.random() - 0.5) * 1.0;
            const t = pickType();
            agents.push(new Agent(id++, ccx + offX, ccy + offY, t, gid));
            placed++;
        }
    }

    return agents;
}
