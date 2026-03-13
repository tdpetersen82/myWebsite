// HexGrid.js — Flat-top hexagonal grid math and rendering

const SQRT3 = Math.sqrt(3);

// Axial direction vectors for flat-top hexagons
const HEX_DIRECTIONS = [
    { q: 1, r: 0 },   // E
    { q: 1, r: -1 },  // NE
    { q: 0, r: -1 },  // NW
    { q: -1, r: 0 },  // W
    { q: -1, r: 1 },  // SW
    { q: 0, r: 1 },   // SE
];

export const HEX_SIZE = 40;
export const GRID_COLS = 15;
export const GRID_ROWS = 10;
export const GRID_OFFSET_X = 180;
export const GRID_OFFSET_Y = 115;

// Convert axial (q, r) to pixel center
export function hexToPixel(q, r) {
    const x = HEX_SIZE * (3 / 2) * q + GRID_OFFSET_X;
    const y = HEX_SIZE * SQRT3 * (r + q / 2) + GRID_OFFSET_Y;
    return { x, y };
}

// Convert pixel to nearest axial coordinate
export function pixelToHex(px, py) {
    const x = px - GRID_OFFSET_X;
    const y = py - GRID_OFFSET_Y;
    const q = (2 / 3) * x / HEX_SIZE;
    const r = (-1 / 3 * x + SQRT3 / 3 * y) / HEX_SIZE;
    return hexRound(q, r);
}

// Round fractional axial coords to nearest hex
function hexRound(q, r) {
    const s = -q - r;
    let rq = Math.round(q);
    let rr = Math.round(r);
    let rs = Math.round(s);
    const dq = Math.abs(rq - q);
    const dr = Math.abs(rr - r);
    const ds = Math.abs(rs - s);
    if (dq > dr && dq > ds) {
        rq = -rr - rs;
    } else if (dr > ds) {
        rr = -rq - rs;
    }
    return { q: rq, r: rr };
}

// Hex distance (axial)
export function hexDistance(a, b) {
    return (Math.abs(a.q - b.q) + Math.abs(a.q + a.r - b.q - b.r) + Math.abs(a.r - b.r)) / 2;
}

// Get hex key string
export function hexKey(q, r) {
    return `${q},${r}`;
}

// Get flat-top hex corner points
export function hexCorners(cx, cy) {
    const corners = [];
    for (let i = 0; i < 6; i++) {
        const angle = (Math.PI / 180) * (60 * i);
        corners.push({
            x: cx + HEX_SIZE * Math.cos(angle),
            y: cy + HEX_SIZE * Math.sin(angle),
        });
    }
    return corners;
}

// Enemy path through the grid (winding S-curve)
export const ENEMY_PATH = [
    // Enter from left, row ~4
    { q: -1, r: 5 },
    { q: 0, r: 4 }, { q: 1, r: 4 }, { q: 2, r: 3 }, { q: 3, r: 3 },
    { q: 4, r: 2 }, { q: 5, r: 2 }, { q: 6, r: 1 }, { q: 7, r: 1 },
    { q: 8, r: 1 }, { q: 9, r: 1 }, { q: 10, r: 1 },
    // Turn down
    { q: 10, r: 2 }, { q: 10, r: 3 }, { q: 11, r: 3 },
    { q: 11, r: 4 }, { q: 11, r: 5 },
    // Go left
    { q: 10, r: 5 }, { q: 9, r: 6 }, { q: 8, r: 6 },
    { q: 7, r: 6 }, { q: 6, r: 7 }, { q: 5, r: 7 },
    { q: 4, r: 7 }, { q: 3, r: 8 }, { q: 2, r: 8 },
    // Turn down and exit right
    { q: 2, r: 9 }, { q: 3, r: 9 }, { q: 4, r: 8 },
    { q: 5, r: 8 }, { q: 6, r: 8 }, { q: 7, r: 8 },
    { q: 8, r: 7 }, { q: 9, r: 7 }, { q: 10, r: 7 },
    { q: 11, r: 7 }, { q: 12, r: 6 }, { q: 13, r: 6 },
    { q: 14, r: 6 }, { q: 15, r: 5 },
];

// Set of path hex keys for quick lookup
export const PATH_HEXES = new Set(ENEMY_PATH.map(h => hexKey(h.q, h.r)));

export class HexGridRenderer {
    constructor(stage) {
        this.container = new PIXI.Container();
        this.pathGraphics = new PIXI.Graphics();
        this.gridGraphics = new PIXI.Graphics();
        this.pathPulseGraphics = new PIXI.Graphics();
        this.hoverGraphics = new PIXI.Graphics();
        this.rangeGraphics = new PIXI.Graphics();

        this.container.addChild(this.pathGraphics);
        this.container.addChild(this.gridGraphics);
        this.container.addChild(this.pathPulseGraphics);
        this.container.addChild(this.rangeGraphics);
        this.container.addChild(this.hoverGraphics);
        stage.addChild(this.container);

        // Animated path pulse
        this.pathAnimTime = 0;
        this.pathSegmentLengths = [];
        this.totalPathLength = 0;

        // Grid cell states: 'empty', 'path', 'tower'
        this.cells = new Map();
        this.initGrid();
        this.drawGrid();
        this.drawPath();
        this.computePathLengths();
    }

    initGrid() {
        for (let q = 0; q < GRID_COLS; q++) {
            for (let r = 0; r < GRID_ROWS; r++) {
                const key = hexKey(q, r);
                const state = PATH_HEXES.has(key) ? 'path' : 'empty';
                this.cells.set(key, state);
            }
        }
    }

    drawHexShape(g, corners) {
        g.moveTo(corners[0].x, corners[0].y);
        for (let i = 1; i < 6; i++) {
            g.lineTo(corners[i].x, corners[i].y);
        }
        g.closePath();
    }

    drawGrid() {
        const g = this.gridGraphics;
        g.clear();

        for (let q = 0; q < GRID_COLS; q++) {
            for (let r = 0; r < GRID_ROWS; r++) {
                const { x, y } = hexToPixel(q, r);
                const corners = hexCorners(x, y);
                const key = hexKey(q, r);
                const state = this.cells.get(key);

                if (state === 'path') {
                    // Path hexes: dark teal energy conduit tiles
                    g.lineStyle(1.5, 0x00ccaa, 0.2);
                    g.beginFill(0x0a2a3a, 0.25);
                    this.drawHexShape(g, corners);
                    g.endFill();
                } else if (state === 'tower') {
                    // Tower hexes: strong contrast platform
                    g.lineStyle(1.5, 0x5599cc, 0.5);
                    g.beginFill(0x1a1a3a, 0.4);
                    this.drawHexShape(g, corners);
                    g.endFill();
                } else {
                    // Buildable hexes: slightly visible green
                    g.lineStyle(1, 0x44885a, 0.35);
                    g.beginFill(0x1a3a20, 0.15);
                    this.drawHexShape(g, corners);
                    g.endFill();
                }
            }
        }
    }

    drawPath() {
        const g = this.pathGraphics;
        g.clear();

        // Layer 1: Outer glow — wide translucent dark teal
        for (let i = 0; i < ENEMY_PATH.length - 1; i++) {
            const a = hexToPixel(ENEMY_PATH[i].q, ENEMY_PATH[i].r);
            const b = hexToPixel(ENEMY_PATH[i + 1].q, ENEMY_PATH[i + 1].r);
            g.lineStyle(28, 0x004455, 0.18);
            g.moveTo(a.x, a.y);
            g.lineTo(b.x, b.y);
        }

        // Layer 2: Main conduit surface
        for (let i = 0; i < ENEMY_PATH.length - 1; i++) {
            const a = hexToPixel(ENEMY_PATH[i].q, ENEMY_PATH[i].r);
            const b = hexToPixel(ENEMY_PATH[i + 1].q, ENEMY_PATH[i + 1].r);
            g.lineStyle(14, 0x006677, 0.3);
            g.moveTo(a.x, a.y);
            g.lineTo(b.x, b.y);
        }

        // Layer 3: Inner energy core — bright thin line
        for (let i = 0; i < ENEMY_PATH.length - 1; i++) {
            const a = hexToPixel(ENEMY_PATH[i].q, ENEMY_PATH[i].r);
            const b = hexToPixel(ENEMY_PATH[i + 1].q, ENEMY_PATH[i + 1].r);
            g.lineStyle(4, 0x00ffcc, 0.35);
            g.moveTo(a.x, a.y);
            g.lineTo(b.x, b.y);
        }

        // Joint smoothing — circles at each path node
        for (let i = 0; i < ENEMY_PATH.length; i++) {
            const p = hexToPixel(ENEMY_PATH[i].q, ENEMY_PATH[i].r);
            g.beginFill(0x006677, 0.3);
            g.drawCircle(p.x, p.y, 7);
            g.endFill();
            g.beginFill(0x00ffcc, 0.15);
            g.drawCircle(p.x, p.y, 4);
            g.endFill();
        }

        // Entry marker — green arrow with glow
        const entry = hexToPixel(ENEMY_PATH[1].q, ENEMY_PATH[1].r);
        const entryPrev = hexToPixel(ENEMY_PATH[0].q, ENEMY_PATH[0].r);
        const entryAngle = Math.atan2(entry.y - entryPrev.y, entry.x - entryPrev.x);
        const entryX = entryPrev.x;
        const entryY = entryPrev.y;

        // Glow behind arrow
        g.beginFill(0x00ff88, 0.12);
        g.drawCircle(entryX, entryY, 20);
        g.endFill();
        // Arrow
        g.lineStyle(3.5, 0x00ff88, 0.9);
        g.moveTo(
            entryX - Math.cos(entryAngle - 0.5) * 14,
            entryY - Math.sin(entryAngle - 0.5) * 14
        );
        g.lineTo(entryX + Math.cos(entryAngle) * 8, entryY + Math.sin(entryAngle) * 8);
        g.lineTo(
            entryX - Math.cos(entryAngle + 0.5) * 14,
            entryY - Math.sin(entryAngle + 0.5) * 14
        );

        // Exit marker — red X with glow
        const exit = hexToPixel(
            ENEMY_PATH[ENEMY_PATH.length - 1].q,
            ENEMY_PATH[ENEMY_PATH.length - 1].r
        );
        g.beginFill(0xff3355, 0.12);
        g.drawCircle(exit.x, exit.y, 20);
        g.endFill();
        g.lineStyle(3.5, 0xff3355, 0.9);
        g.moveTo(exit.x - 8, exit.y - 8);
        g.lineTo(exit.x + 8, exit.y + 8);
        g.moveTo(exit.x + 8, exit.y - 8);
        g.lineTo(exit.x - 8, exit.y + 8);
    }

    computePathLengths() {
        this.pathSegmentLengths = [];
        this.totalPathLength = 0;
        for (let i = 0; i < ENEMY_PATH.length - 1; i++) {
            const a = hexToPixel(ENEMY_PATH[i].q, ENEMY_PATH[i].r);
            const b = hexToPixel(ENEMY_PATH[i + 1].q, ENEMY_PATH[i + 1].r);
            const dx = b.x - a.x;
            const dy = b.y - a.y;
            const len = Math.sqrt(dx * dx + dy * dy);
            this.pathSegmentLengths.push(len);
            this.totalPathLength += len;
        }
    }

    getPointAlongPath(distance) {
        let remaining = distance % this.totalPathLength;
        for (let i = 0; i < this.pathSegmentLengths.length; i++) {
            if (remaining <= this.pathSegmentLengths[i]) {
                const t = remaining / this.pathSegmentLengths[i];
                const a = hexToPixel(ENEMY_PATH[i].q, ENEMY_PATH[i].r);
                const b = hexToPixel(ENEMY_PATH[i + 1].q, ENEMY_PATH[i + 1].r);
                return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
            }
            remaining -= this.pathSegmentLengths[i];
        }
        const last = ENEMY_PATH[ENEMY_PATH.length - 1];
        return hexToPixel(last.q, last.r);
    }

    updatePathAnim(dt) {
        this.pathAnimTime += dt * 60; // pixels per second
        const g = this.pathPulseGraphics;
        g.clear();

        const dotCount = 5;
        const spacing = this.totalPathLength / dotCount;

        for (let i = 0; i < dotCount; i++) {
            const dist = (this.pathAnimTime + i * spacing) % this.totalPathLength;
            const pt = this.getPointAlongPath(dist);
            // Outer glow
            g.beginFill(0x00ffcc, 0.15);
            g.drawCircle(pt.x, pt.y, 8);
            g.endFill();
            // Core dot
            g.beginFill(0x00ffcc, 0.6);
            g.drawCircle(pt.x, pt.y, 3.5);
            g.endFill();
        }
    }

    showHover(q, r, canBuild) {
        const g = this.hoverGraphics;
        g.clear();

        if (q < 0 || q >= GRID_COLS || r < 0 || r >= GRID_ROWS) return;

        const { x, y } = hexToPixel(q, r);
        const corners = hexCorners(x, y);

        if (canBuild) {
            // Green buildable highlight
            g.lineStyle(2.5, 0x44ff88, 0.8);
            g.beginFill(0x44ff88, 0.2);
            this.drawHexShape(g, corners);
            g.endFill();

            // Small + sign in center
            g.lineStyle(2, 0x44ff88, 0.5);
            g.moveTo(x - 5, y);
            g.lineTo(x + 5, y);
            g.moveTo(x, y - 5);
            g.lineTo(x, y + 5);
        } else {
            // Red non-buildable highlight
            g.lineStyle(2, 0xff4466, 0.6);
            g.beginFill(0xff4466, 0.1);
            this.drawHexShape(g, corners);
            g.endFill();

            // Small X in center
            g.lineStyle(2, 0xff4466, 0.5);
            g.moveTo(x - 4, y - 4);
            g.lineTo(x + 4, y + 4);
            g.moveTo(x + 4, y - 4);
            g.lineTo(x - 4, y + 4);
        }
    }

    clearHover() {
        this.hoverGraphics.clear();
    }

    showRange(q, r, range) {
        const g = this.rangeGraphics;
        g.clear();

        for (let cq = 0; cq < GRID_COLS; cq++) {
            for (let cr = 0; cr < GRID_ROWS; cr++) {
                if (hexDistance({ q, r }, { q: cq, r: cr }) <= range) {
                    const { x, y } = hexToPixel(cq, cr);
                    const corners = hexCorners(x, y);

                    g.lineStyle(1, 0x667eea, 0.2);
                    g.beginFill(0x667eea, 0.1);
                    this.drawHexShape(g, corners);
                    g.endFill();
                }
            }
        }
    }

    clearRange() {
        this.rangeGraphics.clear();
    }

    canBuild(q, r) {
        const key = hexKey(q, r);
        return this.cells.has(key) && this.cells.get(key) === 'empty';
    }

    placeTower(q, r) {
        this.cells.set(hexKey(q, r), 'tower');
    }

    removeTower(q, r) {
        this.cells.set(hexKey(q, r), 'empty');
    }
}
