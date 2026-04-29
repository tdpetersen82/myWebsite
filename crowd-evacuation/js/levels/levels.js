// Level registry + shared builders.
// Each level file pushes itself to LEVELS at load time.

const LEVELS = [];

// Build a GridMap from a level config.
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

// Spawn agents per the level's spawn config.
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

function getLevelById(id) {
    return LEVELS.find(L => L.id === id);
}
