// Flow field: BFS gradient from all exit cells outward.
// Each walkable cell stores the unit vector to follow toward the nearest exit.
// See SPEC.md §4.3.

class FlowField {
    constructor(grid) {
        this.grid = grid;           // GridMap (see Level)
        this.w = grid.w;
        this.h = grid.h;
        this.dist = new Float32Array(this.w * this.h);
        this.fx = new Float32Array(this.w * this.h);  // flow vector x
        this.fy = new Float32Array(this.w * this.h);  // flow vector y
        this.compute();
    }

    _idx(x, y) { return y * this.w + x; }

    compute() {
        const { w, h, grid, dist, fx, fy } = this;
        const INF = Infinity;
        for (let i = 0; i < dist.length; i++) dist[i] = INF;

        // Multi-source BFS from all exit cells. Use a simple queue with cost
        // increments — sufficient since cardinal=1, diagonal=√2 and we accept
        // small heuristic suboptimality.
        const queue = [];
        for (const ex of grid.exits) {
            for (const cell of ex.cells) {
                const i = this._idx(cell.x, cell.y);
                dist[i] = 0;
                queue.push(cell.x, cell.y);
            }
        }

        // Dijkstra-style relaxation. Re-enqueue improved cells.
        const SQRT2 = Math.SQRT2;
        let head = 0;
        while (head < queue.length) {
            const x = queue[head++], y = queue[head++];
            const di = dist[this._idx(x, y)];
            for (let dy = -1; dy <= 1; dy++) {
                for (let dx = -1; dx <= 1; dx++) {
                    if (dx === 0 && dy === 0) continue;
                    const nx = x + dx, ny = y + dy;
                    if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
                    if (!grid.walkable(nx, ny)) continue;
                    const step = (dx !== 0 && dy !== 0) ? SQRT2 : 1;
                    const ndi = di + step + (grid.smoke ? grid.smoke[this._idx(nx, ny)] * CFG.SMOKE_FLOWFIELD_PENALTY : 0);
                    const ni = this._idx(nx, ny);
                    if (ndi < dist[ni]) {
                        dist[ni] = ndi;
                        queue.push(nx, ny);
                    }
                }
            }
        }

        // Compute flow vectors: each cell points to neighbor with min dist.
        for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
                const i = this._idx(x, y);
                if (!grid.walkable(x, y)) { fx[i] = 0; fy[i] = 0; continue; }
                let bestDist = dist[i];
                let bestDx = 0, bestDy = 0;
                for (let dy = -1; dy <= 1; dy++) {
                    for (let dx = -1; dx <= 1; dx++) {
                        if (dx === 0 && dy === 0) continue;
                        const nx = x + dx, ny = y + dy;
                        if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
                        if (!grid.walkable(nx, ny)) continue;
                        const nd = dist[this._idx(nx, ny)];
                        if (nd < bestDist) {
                            bestDist = nd;
                            bestDx = dx; bestDy = dy;
                        }
                    }
                }
                const mag = Math.hypot(bestDx, bestDy);
                if (mag > 0) {
                    fx[i] = bestDx / mag;
                    fy[i] = bestDy / mag;
                } else {
                    fx[i] = 0; fy[i] = 0;
                }
            }
        }
    }

    // Sample the flow field in world (meter) coordinates.
    // Returns a unit-ish vector toward exit, or (0,0) if blocked / outside.
    sampleAt(xMeters, yMeters, out = { x: 0, y: 0 }) {
        const cs = CFG.CELL_M;
        const cx = Math.floor(xMeters / cs);
        const cy = Math.floor(yMeters / cs);
        if (cx < 0 || cy < 0 || cx >= this.w || cy >= this.h) {
            out.x = 0; out.y = 0; return out;
        }
        const i = this._idx(cx, cy);
        out.x = this.fx[i];
        out.y = this.fy[i];
        return out;
    }

    distAt(xMeters, yMeters) {
        const cs = CFG.CELL_M;
        const cx = Math.floor(xMeters / cs);
        const cy = Math.floor(yMeters / cs);
        if (cx < 0 || cy < 0 || cx >= this.w || cy >= this.h) return Infinity;
        return this.dist[this._idx(cx, cy)];
    }

    // Reachability check: can (sx, sy) reach any exit?
    isReachable(sx, sy) {
        return isFinite(this.distAt(sx, sy));
    }
}
