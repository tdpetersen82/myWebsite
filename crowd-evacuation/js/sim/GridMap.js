// GridMap: tile grid storing walkability, exits, and runtime overrides (burning).
// Coordinates are in cells. World position = cell * CFG.CELL_M (cell origin).

const Tile = Object.freeze({
    FLOOR: 0,
    WALL: 1,
    EXIT: 2,
});

class GridMap {
    constructor(w, h) {
        this.w = w;
        this.h = h;
        this.tiles = new Uint8Array(w * h);          // Tile.* values
        this.burning = new Uint8Array(w * h);        // 1 if burning (impassable)
        this.exits = [];                             // [{ id, cells: [{x,y}] }]
        this.smoke = null;                           // set by ThreatSystem
    }

    _idx(x, y) { return y * this.w + x; }

    setTile(x, y, t) {
        if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
        this.tiles[this._idx(x, y)] = t;
    }

    getTile(x, y) {
        if (x < 0 || y < 0 || x >= this.w || y >= this.h) return Tile.WALL;
        return this.tiles[this._idx(x, y)];
    }

    walkable(x, y) {
        if (x < 0 || y < 0 || x >= this.w || y >= this.h) return false;
        if (this.burning[this._idx(x, y)]) return false;
        const t = this.tiles[this._idx(x, y)];
        return t === Tile.FLOOR || t === Tile.EXIT;
    }

    setBurning(x, y, b) {
        if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
        this.burning[this._idx(x, y)] = b ? 1 : 0;
    }

    addExit(id, cells) {
        for (const c of cells) {
            this.setTile(c.x, c.y, Tile.EXIT);
        }
        this.exits.push({ id, cells });
    }

    isExitAt(xMeters, yMeters) {
        const cs = CFG.CELL_M;
        const cx = Math.floor(xMeters / cs);
        const cy = Math.floor(yMeters / cs);
        return this.getTile(cx, cy) === Tile.EXIT;
    }

    // Reachability check (BFS) — used by validation.
    reachableFrom(sxMeters, syMeters) {
        const cs = CFG.CELL_M;
        const sx = Math.floor(sxMeters / cs);
        const sy = Math.floor(syMeters / cs);
        if (!this.walkable(sx, sy)) return false;
        const visited = new Uint8Array(this.w * this.h);
        const queue = [sx, sy];
        visited[this._idx(sx, sy)] = 1;
        let head = 0;
        while (head < queue.length) {
            const x = queue[head++], y = queue[head++];
            if (this.getTile(x, y) === Tile.EXIT) return true;
            for (let dy = -1; dy <= 1; dy++) {
                for (let dx = -1; dx <= 1; dx++) {
                    if (dx === 0 && dy === 0) continue;
                    const nx = x + dx, ny = y + dy;
                    if (!this.walkable(nx, ny)) continue;
                    const ni = this._idx(nx, ny);
                    if (visited[ni]) continue;
                    visited[ni] = 1;
                    queue.push(nx, ny);
                }
            }
        }
        return false;
    }
}
