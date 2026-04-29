// Placements: the player's design — bag of tools placed in the venue.
// Persisted across DesignScene → SimScene transition.

class Placements {
    constructor() {
        this.marshals = [];   // [{x, y}]                    - meters
        this.barriers = [];   // [{x0, y0, x1, y1}]          - cells (axis-aligned)
        this.signs = [];      // [{x, y, dir}]                - meters; dir: 'N'|'E'|'S'|'W'
        this.pas = [];        // [{x, y}]                     - meters
    }

    clone() {
        const p = new Placements();
        p.marshals = this.marshals.map(m => ({ ...m }));
        p.barriers = this.barriers.map(b => ({ ...b }));
        p.signs    = this.signs.map(s => ({ ...s }));
        p.pas      = this.pas.map(p => ({ ...p }));
        return p;
    }

    // Total budget cost grouped by tool kind. Mirrors level.budget keys.
    cost() {
        let barrierUnits = 0;
        for (const b of this.barriers) {
            barrierUnits += Math.max(Math.abs(b.x1 - b.x0), Math.abs(b.y1 - b.y0)) + 1;
        }
        return {
            marshals:      this.marshals.length,
            barrier_units: barrierUnits,
            signs:         this.signs.length,
            pa:            this.pas.length,
        };
    }

    // Apply barriers to the grid (in place). Call once before sim starts.
    applyBarriersToGrid(grid) {
        for (const b of this.barriers) {
            // axis-aligned line from (x0,y0) to (x1,y1) in cells
            const dx = Math.sign(b.x1 - b.x0);
            const dy = Math.sign(b.y1 - b.y0);
            let x = b.x0, y = b.y0;
            grid.setTile(x, y, Tile.WALL);
            while (x !== b.x1 || y !== b.y1) {
                x += dx; y += dy;
                grid.setTile(x, y, Tile.WALL);
            }
        }
    }
}

const SignDirVec = Object.freeze({
    N: { x:  0, y: -1 },
    E: { x:  1, y:  0 },
    S: { x:  0, y:  1 },
    W: { x: -1, y:  0 },
});

function rotateSignDir(dir) {
    return ({ N: 'E', E: 'S', S: 'W', W: 'N' })[dir] || 'S';
}
