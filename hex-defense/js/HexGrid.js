// HexGrid.js — Flat-top hexagonal grid math and rendering (hex-shaped map)

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

export const HEX_SIZE = 32;
export const HEX_RADIUS = 7; // map radius in hex cells
export const GRID_OFFSET_X = 700;
export const GRID_OFFSET_Y = 450;

// Check if a hex coordinate is within the hexagonal map
export function isValidHex(q, r) {
    const s = -q - r;
    return Math.max(Math.abs(q), Math.abs(r), Math.abs(s)) <= HEX_RADIUS;
}

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

// Enemy path through the hex-shaped grid (winding S-curve)
export const ENEMY_PATH = [
    // Enter from left edge
    { q: -8, r: 4 },
    { q: -7, r: 4 },
    // Sweep northeast
    { q: -6, r: 3 }, { q: -5, r: 3 }, { q: -4, r: 2 }, { q: -3, r: 2 },
    { q: -2, r: 1 }, { q: -1, r: 1 }, { q: 0, r: 0 }, { q: 1, r: 0 },
    { q: 2, r: -1 }, { q: 3, r: -1 }, { q: 4, r: -2 },
    // Turn south
    { q: 4, r: -1 }, { q: 4, r: 0 }, { q: 5, r: 0 },
    { q: 5, r: 1 }, { q: 5, r: 2 },
    // Sweep southwest
    { q: 4, r: 2 }, { q: 3, r: 3 }, { q: 2, r: 3 },
    { q: 1, r: 4 }, { q: 0, r: 4 }, { q: -1, r: 4 },
    { q: -2, r: 5 }, { q: -3, r: 5 }, { q: -4, r: 6 },
    // Turn northeast toward exit
    { q: -3, r: 6 }, { q: -2, r: 5 },
    { q: -1, r: 5 }, { q: 0, r: 5 }, { q: 1, r: 4 },
    { q: 2, r: 4 }, { q: 3, r: 3 }, { q: 4, r: 3 },
    { q: 5, r: 2 }, { q: 6, r: 1 }, { q: 7, r: 0 },
    // Exit right
    { q: 8, r: -1 },
];

// Deduplicate path (remove consecutive duplicates that might occur)
function deduplicatePath(path) {
    const result = [path[0]];
    for (let i = 1; i < path.length; i++) {
        if (path[i].q !== path[i - 1].q || path[i].r !== path[i - 1].r) {
            result.push(path[i]);
        }
    }
    return result;
}

const CLEAN_PATH = deduplicatePath(ENEMY_PATH);
// Replace ENEMY_PATH contents
ENEMY_PATH.length = 0;
CLEAN_PATH.forEach(p => ENEMY_PATH.push(p));

// Set of path hex keys for quick lookup
export const PATH_HEXES = new Set(ENEMY_PATH.map(h => hexKey(h.q, h.r)));

// Iterate over all valid hexes in the map
export function forEachHex(callback) {
    for (let q = -HEX_RADIUS; q <= HEX_RADIUS; q++) {
        const r1 = Math.max(-HEX_RADIUS, -q - HEX_RADIUS);
        const r2 = Math.min(HEX_RADIUS, -q + HEX_RADIUS);
        for (let r = r1; r <= r2; r++) {
            callback(q, r);
        }
    }
}

export class HexGridRenderer {
    constructor(stage) {
        this.container = new PIXI.Container();
        this.pathGraphics = new PIXI.Graphics();
        this.gridGraphics = new PIXI.Graphics();
        this.pathPulseGraphics = new PIXI.Graphics();
        this.hoverGraphics = new PIXI.Graphics();
        this.rangeGraphics = new PIXI.Graphics();
        this.borderGraphics = new PIXI.Graphics();

        this.container.addChild(this.pathGraphics);
        this.container.addChild(this.borderGraphics);
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
        this.drawBorder();
        this.computePathLengths();
    }

    initGrid() {
        this.cells.clear();
        forEachHex((q, r) => {
            const key = hexKey(q, r);
            const state = PATH_HEXES.has(key) ? 'path' : 'empty';
            this.cells.set(key, state);
        });
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

        forEachHex((q, r) => {
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
                // Buildable hexes: slightly visible green with circuit pattern
                g.lineStyle(1, 0x44885a, 0.35);
                g.beginFill(0x1a3a20, 0.15);
                this.drawHexShape(g, corners);
                g.endFill();

                // Subtle circuit-board inner lines
                g.lineStyle(0.5, 0x44885a, 0.1);
                const innerR = HEX_SIZE * 0.5;
                const angle1 = Math.random() * Math.PI * 2;
                g.moveTo(x + innerR * 0.3 * Math.cos(angle1), y + innerR * 0.3 * Math.sin(angle1));
                g.lineTo(x + innerR * Math.cos(angle1 + 0.5), y + innerR * Math.sin(angle1 + 0.5));
            }
        });
    }

    drawBorder() {
        const g = this.borderGraphics;
        g.clear();

        // Find edge hexes and draw glowing border
        forEachHex((q, r) => {
            let isEdge = false;
            for (const dir of HEX_DIRECTIONS) {
                if (!isValidHex(q + dir.q, r + dir.r)) {
                    isEdge = true;
                    break;
                }
            }
            if (isEdge) {
                const { x, y } = hexToPixel(q, r);
                const corners = hexCorners(x, y);

                // Check each edge: if neighbor doesn't exist, draw that edge with glow
                for (let i = 0; i < 6; i++) {
                    const dir = HEX_DIRECTIONS[i];
                    if (!isValidHex(q + dir.q, r + dir.r)) {
                        const c1 = corners[i];
                        const c2 = corners[(i + 1) % 6];
                        // Outer glow
                        g.lineStyle(4, 0x00ffcc, 0.08);
                        g.moveTo(c1.x, c1.y);
                        g.lineTo(c2.x, c2.y);
                        // Inner bright edge
                        g.lineStyle(1.5, 0x00ffcc, 0.25);
                        g.moveTo(c1.x, c1.y);
                        g.lineTo(c2.x, c2.y);
                    }
                }
            }
        });
    }

    drawPath() {
        const g = this.pathGraphics;
        g.clear();

        // Layer 1: Outer glow — wide translucent dark teal
        for (let i = 0; i < ENEMY_PATH.length - 1; i++) {
            const a = hexToPixel(ENEMY_PATH[i].q, ENEMY_PATH[i].r);
            const b = hexToPixel(ENEMY_PATH[i + 1].q, ENEMY_PATH[i + 1].r);
            g.lineStyle(24, 0x004455, 0.18);
            g.moveTo(a.x, a.y);
            g.lineTo(b.x, b.y);
        }

        // Layer 2: Main conduit surface
        for (let i = 0; i < ENEMY_PATH.length - 1; i++) {
            const a = hexToPixel(ENEMY_PATH[i].q, ENEMY_PATH[i].r);
            const b = hexToPixel(ENEMY_PATH[i + 1].q, ENEMY_PATH[i + 1].r);
            g.lineStyle(12, 0x006677, 0.3);
            g.moveTo(a.x, a.y);
            g.lineTo(b.x, b.y);
        }

        // Layer 3: Inner energy core — bright thin line
        for (let i = 0; i < ENEMY_PATH.length - 1; i++) {
            const a = hexToPixel(ENEMY_PATH[i].q, ENEMY_PATH[i].r);
            const b = hexToPixel(ENEMY_PATH[i + 1].q, ENEMY_PATH[i + 1].r);
            g.lineStyle(3, 0x00ffcc, 0.35);
            g.moveTo(a.x, a.y);
            g.lineTo(b.x, b.y);
        }

        // Joint smoothing — circles at each path node
        for (let i = 0; i < ENEMY_PATH.length; i++) {
            const p = hexToPixel(ENEMY_PATH[i].q, ENEMY_PATH[i].r);
            g.beginFill(0x006677, 0.3);
            g.drawCircle(p.x, p.y, 6);
            g.endFill();
            g.beginFill(0x00ffcc, 0.15);
            g.drawCircle(p.x, p.y, 3);
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
        g.drawCircle(entryX, entryY, 18);
        g.endFill();
        // Arrow
        g.lineStyle(3, 0x00ff88, 0.9);
        g.moveTo(
            entryX - Math.cos(entryAngle - 0.5) * 12,
            entryY - Math.sin(entryAngle - 0.5) * 12
        );
        g.lineTo(entryX + Math.cos(entryAngle) * 7, entryY + Math.sin(entryAngle) * 7);
        g.lineTo(
            entryX - Math.cos(entryAngle + 0.5) * 12,
            entryY - Math.sin(entryAngle + 0.5) * 12
        );

        // Exit marker — red X with glow
        const exit = hexToPixel(
            ENEMY_PATH[ENEMY_PATH.length - 1].q,
            ENEMY_PATH[ENEMY_PATH.length - 1].r
        );
        g.beginFill(0xff3355, 0.12);
        g.drawCircle(exit.x, exit.y, 18);
        g.endFill();
        g.lineStyle(3, 0xff3355, 0.9);
        g.moveTo(exit.x - 7, exit.y - 7);
        g.lineTo(exit.x + 7, exit.y + 7);
        g.moveTo(exit.x + 7, exit.y - 7);
        g.lineTo(exit.x - 7, exit.y + 7);
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

        const dotCount = 6;
        const spacing = this.totalPathLength / dotCount;

        for (let i = 0; i < dotCount; i++) {
            const dist = (this.pathAnimTime + i * spacing) % this.totalPathLength;
            const pt = this.getPointAlongPath(dist);
            // Outer glow
            g.beginFill(0x00ffcc, 0.15);
            g.drawCircle(pt.x, pt.y, 7);
            g.endFill();
            // Core dot
            g.beginFill(0x00ffcc, 0.6);
            g.drawCircle(pt.x, pt.y, 3);
            g.endFill();
        }
    }

    showHover(q, r, canBuild) {
        const g = this.hoverGraphics;
        g.clear();

        if (!isValidHex(q, r)) return;

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

        forEachHex((cq, cr) => {
            if (hexDistance({ q, r }, { q: cq, r: cr }) <= range) {
                const { x, y } = hexToPixel(cq, cr);
                const corners = hexCorners(x, y);

                g.lineStyle(1, 0x667eea, 0.2);
                g.beginFill(0x667eea, 0.1);
                this.drawHexShape(g, corners);
                g.endFill();
            }
        });
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
