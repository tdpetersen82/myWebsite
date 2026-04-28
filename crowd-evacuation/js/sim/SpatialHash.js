// Spatial hash for fast neighbor queries.
// Operates in meters. Cell size from CFG.SPATIAL_HASH_CELL_M.

class SpatialHash {
    constructor(cellSize = CFG.SPATIAL_HASH_CELL_M) {
        this.cellSize = cellSize;
        this.buckets = new Map();   // key -> array of agents
    }

    _key(cx, cy) { return cx * 73856093 ^ cy * 19349663; }

    clear() {
        this.buckets.clear();
    }

    insert(agent) {
        const cx = Math.floor(agent.x / this.cellSize);
        const cy = Math.floor(agent.y / this.cellSize);
        const k = this._key(cx, cy);
        let arr = this.buckets.get(k);
        if (!arr) { arr = []; this.buckets.set(k, arr); }
        arr.push(agent);
    }

    // Returns up to maxResults neighbors within radius (meters) of (x, y).
    queryRadius(x, y, radius, maxResults = CFG.MAX_NEIGHBOR_QUERY, out = []) {
        out.length = 0;
        const r2 = radius * radius;
        const cmin = Math.floor((x - radius) / this.cellSize);
        const cmax = Math.floor((x + radius) / this.cellSize);
        const rmin = Math.floor((y - radius) / this.cellSize);
        const rmax = Math.floor((y + radius) / this.cellSize);
        for (let cx = cmin; cx <= cmax; cx++) {
            for (let cy = rmin; cy <= rmax; cy++) {
                const arr = this.buckets.get(this._key(cx, cy));
                if (!arr) continue;
                for (let i = 0; i < arr.length; i++) {
                    const a = arr[i];
                    const dx = a.x - x;
                    const dy = a.y - y;
                    if (dx * dx + dy * dy <= r2) {
                        out.push(a);
                        if (out.length >= maxResults) return out;
                    }
                }
            }
        }
        return out;
    }

    rebuild(agents) {
        this.clear();
        for (let i = 0; i < agents.length; i++) {
            const a = agents[i];
            if (a.state !== 'ESCAPED') this.insert(a);
        }
    }
}
