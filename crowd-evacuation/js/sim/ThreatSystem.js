// Threat system: fire (and basic smoke) cellular automaton on the grid.
// Tick rate: CFG.THREAT_HZ. See SPEC.md §4.4.
// v0.1: single ignition source, slow spread, basic smoke. No wind variability yet.

class ThreatSystem {
    constructor(grid, opts = {}) {
        this.grid = grid;
        this.w = grid.w;
        this.h = grid.h;
        // per-cell state
        this.fire = new Float32Array(this.w * this.h);   // 0..1 intensity
        this.fuel = new Float32Array(this.w * this.h);   // 0..1, walkable cells only
        this.smoke = new Float32Array(this.w * this.h);  // 0..1
        for (let i = 0; i < this.fuel.length; i++) this.fuel[i] = 1;

        // wind: unit vector
        const angle = (opts.windAngle != null) ? opts.windAngle : Math.random() * Math.PI * 2;
        this.windX = Math.cos(angle);
        this.windY = Math.sin(angle);

        this.ignitionPoint = opts.ignitionPoint || null;   // {x, y} cell coords
        this.ignitionDelay = opts.ignitionDelay != null ? opts.ignitionDelay : CFG.FIRE_IGNITION_DELAY_S;
        this.elapsed = 0;
        this.ignited = false;

        // expose smoke array on grid for flow-field cost
        grid.smoke = this.smoke;
    }

    _idx(x, y) { return y * this.w + x; }

    ignite(x, y) {
        if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
        const i = this._idx(x, y);
        this.fire[i] = Math.max(this.fire[i], 0.6);
        this.ignited = true;
    }

    fireAt(xMeters, yMeters) {
        const cs = CFG.CELL_M;
        const cx = Math.floor(xMeters / cs);
        const cy = Math.floor(yMeters / cs);
        if (cx < 0 || cy < 0 || cx >= this.w || cy >= this.h) return 0;
        return this.fire[this._idx(cx, cy)];
    }

    distanceToFireMeters(xMeters, yMeters) {
        // Cheap approximation: scan a small window for fire cells.
        const cs = CFG.CELL_M;
        const cx = Math.floor(xMeters / cs);
        const cy = Math.floor(yMeters / cs);
        const R = 8;
        let best = Infinity;
        for (let dy = -R; dy <= R; dy++) {
            for (let dx = -R; dx <= R; dx++) {
                const nx = cx + dx, ny = cy + dy;
                if (nx < 0 || ny < 0 || nx >= this.w || ny >= this.h) continue;
                if (this.fire[this._idx(nx, ny)] > 0.05) {
                    const d = Math.hypot(dx, dy) * cs;
                    if (d < best) best = d;
                }
            }
        }
        return best;
    }

    smokeAt(xMeters, yMeters) {
        const cs = CFG.CELL_M;
        const cx = Math.floor(xMeters / cs);
        const cy = Math.floor(yMeters / cs);
        if (cx < 0 || cy < 0 || cx >= this.w || cy >= this.h) return 0;
        return this.smoke[this._idx(cx, cy)];
    }

    // Returns true if topology changed (cells became impassable).
    tick(dt) {
        this.elapsed += dt;
        if (!this.ignited && this.ignitionPoint && this.elapsed >= this.ignitionDelay) {
            this.ignite(this.ignitionPoint.x, this.ignitionPoint.y);
        }
        if (!this.ignited) return false;

        let topologyChanged = false;
        const w = this.w, h = this.h;
        const next = new Float32Array(this.fire.length);
        next.set(this.fire);
        const fuelBurn = CFG.FIRE_FUEL_BURN_RATE * dt;
        const baseSpread = CFG.FIRE_SPREAD_BASE;
        const windBias = CFG.FIRE_WIND_BIAS;
        const smokeGen = CFG.SMOKE_GEN_RATE != null ? CFG.SMOKE_GEN_RATE : 0.4;
        const smokeDecay = CFG.SMOKE_DECAY != null ? CFG.SMOKE_DECAY : 0.995;

        for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
                const i = this._idx(x, y);
                if (this.fire[i] <= 0) continue;

                // burn fuel
                this.fuel[i] = Math.max(0, this.fuel[i] - fuelBurn);
                if (this.fuel[i] <= 0) {
                    next[i] = 0;
                    continue;
                }

                // emit smoke
                this.smoke[i] = Math.min(1, this.smoke[i] + smokeGen * dt);

                // spread to neighbors
                for (let dy = -1; dy <= 1; dy++) {
                    for (let dx = -1; dx <= 1; dx++) {
                        if (dx === 0 && dy === 0) continue;
                        const nx = x + dx, ny = y + dy;
                        if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
                        const ni = this._idx(nx, ny);
                        if (!this.grid.walkable(nx, ny)) continue;
                        if (next[ni] > 0.05) continue;
                        if (this.fuel[ni] <= 0) continue;
                        // wind alignment: dot of (dx,dy) with wind vector
                        const len = Math.hypot(dx, dy);
                        const align = Math.max(0, (dx * this.windX + dy * this.windY) / len);
                        const prob = (baseSpread + windBias * align) * this.fuel[ni] * dt;
                        if (Math.random() < prob) {
                            next[ni] = 0.3;
                            // fire blocks the cell — flow field needs recompute
                            this.grid.setBurning(nx, ny, true);
                            topologyChanged = true;
                        }
                    }
                }
            }
        }

        // smoke decay + tiny advection (cheap: just decay; real wind advect is overkill for v0.1)
        for (let i = 0; i < this.smoke.length; i++) {
            this.smoke[i] *= smokeDecay;
        }

        this.fire = next;
        return topologyChanged;
    }
}

// Fill in defaults that weren't worth cluttering CFG with
CFG.SMOKE_GEN_RATE = 0.4;
CFG.SMOKE_DECAY = 0.995;
CFG.SMOKE_FLOWFIELD_PENALTY = 5;
