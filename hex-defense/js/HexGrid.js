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

export const HEX_SIZE = 30;
export const GRID_COLS = 15;
export const GRID_ROWS = 10;
export const GRID_OFFSET_X = 128;
export const GRID_OFFSET_Y = 68;

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
        this.hoverGraphics = new PIXI.Graphics();
        this.rangeGraphics = new PIXI.Graphics();

        this.container.addChild(this.pathGraphics);
        this.container.addChild(this.gridGraphics);
        this.container.addChild(this.rangeGraphics);
        this.container.addChild(this.hoverGraphics);
        stage.addChild(this.container);

        // Grid cell states: 'empty', 'path', 'tower'
        this.cells = new Map();
        this.initGrid();
        this.drawGrid();
        this.drawPath();
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
                    // Path hexes: warm brown road tiles
                    g.lineStyle(1.5, 0x8B7355, 0.25);
                    g.beginFill(0x5C4A32, 0.18);
                    this.drawHexShape(g, corners);
                    g.endFill();
                } else if (state === 'tower') {
                    // Tower hexes: dark platform
                    g.lineStyle(1.5, 0x4488aa, 0.4);
                    g.beginFill(0x1a2a3a, 0.3);
                    this.drawHexShape(g, corners);
                    g.endFill();
                } else {
                    // Buildable hexes: green-tinted grassland
                    g.lineStyle(1, 0x3a7744, 0.3);
                    g.beginFill(0x2a5530, 0.12);
                    this.drawHexShape(g, corners);
                    g.endFill();
                }
            }
        }
    }

    drawPath() {
        const g = this.pathGraphics;
        g.clear();

        // 1. Draw thick road surface along center line
        const roadWidth = 18;
        for (let i = 0; i < ENEMY_PATH.length - 1; i++) {
            const a = hexToPixel(ENEMY_PATH[i].q, ENEMY_PATH[i].r);
            const b = hexToPixel(ENEMY_PATH[i + 1].q, ENEMY_PATH[i + 1].r);

            // Road fill - warm brown
            g.lineStyle(roadWidth, 0x6B5B45, 0.35);
            g.moveTo(a.x, a.y);
            g.lineTo(b.x, b.y);
        }

        // 2. Draw road edge lines for definition
        for (let i = 0; i < ENEMY_PATH.length - 1; i++) {
            const a = hexToPixel(ENEMY_PATH[i].q, ENEMY_PATH[i].r);
            const b = hexToPixel(ENEMY_PATH[i + 1].q, ENEMY_PATH[i + 1].r);

            const dx = b.x - a.x;
            const dy = b.y - a.y;
            const len = Math.sqrt(dx * dx + dy * dy);
            const nx = (-dy / len) * (roadWidth / 2);
            const ny = (dx / len) * (roadWidth / 2);

            g.lineStyle(1, 0x9B8B6B, 0.3);
            g.moveTo(a.x + nx, a.y + ny);
            g.lineTo(b.x + nx, b.y + ny);
            g.moveTo(a.x - nx, a.y - ny);
            g.lineTo(b.x - nx, b.y - ny);
        }

        // 3. Draw center dashes (direction indicators)
        g.lineStyle(1.5, 0xAA9970, 0.25);
        for (let i = 0; i < ENEMY_PATH.length - 1; i++) {
            const a = hexToPixel(ENEMY_PATH[i].q, ENEMY_PATH[i].r);
            const b = hexToPixel(ENEMY_PATH[i + 1].q, ENEMY_PATH[i + 1].r);
            // Draw a short dash in the middle third
            const mx1 = a.x + (b.x - a.x) * 0.35;
            const my1 = a.y + (b.y - a.y) * 0.35;
            const mx2 = a.x + (b.x - a.x) * 0.65;
            const my2 = a.y + (b.y - a.y) * 0.65;
            g.moveTo(mx1, my1);
            g.lineTo(mx2, my2);
        }

        // 4. Draw directional chevrons every 3 path segments
        for (let i = 2; i < ENEMY_PATH.length - 1; i += 3) {
            const a = hexToPixel(ENEMY_PATH[i].q, ENEMY_PATH[i].r);
            const b = hexToPixel(ENEMY_PATH[i + 1].q, ENEMY_PATH[i + 1].r);
            const mx = (a.x + b.x) / 2;
            const my = (a.y + b.y) / 2;
            const dx = b.x - a.x;
            const dy = b.y - a.y;
            const angle = Math.atan2(dy, dx);
            const chevSize = 6;

            g.lineStyle(2, 0xCCBB88, 0.35);
            g.moveTo(
                mx - Math.cos(angle - 0.6) * chevSize,
                my - Math.sin(angle - 0.6) * chevSize
            );
            g.lineTo(mx, my);
            g.lineTo(
                mx - Math.cos(angle + 0.6) * chevSize,
                my - Math.sin(angle + 0.6) * chevSize
            );
        }

        // 5. Entry marker (left side - green arrow)
        const entry = hexToPixel(ENEMY_PATH[1].q, ENEMY_PATH[1].r);
        const entryPrev = hexToPixel(ENEMY_PATH[0].q, ENEMY_PATH[0].r);
        const entryAngle = Math.atan2(entry.y - entryPrev.y, entry.x - entryPrev.x);
        const entryX = entryPrev.x;
        const entryY = entryPrev.y;

        // Green arrow
        g.lineStyle(3, 0x44ff88, 0.7);
        g.moveTo(
            entryX - Math.cos(entryAngle - 0.5) * 12,
            entryY - Math.sin(entryAngle - 0.5) * 12
        );
        g.lineTo(entryX + Math.cos(entryAngle) * 6, entryY + Math.sin(entryAngle) * 6);
        g.lineTo(
            entryX - Math.cos(entryAngle + 0.5) * 12,
            entryY - Math.sin(entryAngle + 0.5) * 12
        );

        // 6. Exit marker (right side - red X)
        const exit = hexToPixel(
            ENEMY_PATH[ENEMY_PATH.length - 1].q,
            ENEMY_PATH[ENEMY_PATH.length - 1].r
        );
        g.lineStyle(3, 0xff4466, 0.7);
        g.moveTo(exit.x - 6, exit.y - 6);
        g.lineTo(exit.x + 6, exit.y + 6);
        g.moveTo(exit.x + 6, exit.y - 6);
        g.lineTo(exit.x - 6, exit.y + 6);
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
