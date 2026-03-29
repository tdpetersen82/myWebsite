#!/usr/bin/env node
/**
 * generate-tracks.js
 * Pre-renders track images for the Super Off Road game.
 * Output: assets/tracks/track_0.png, track_1.png, track_2.png
 *
 * Run: node generate-tracks.js
 */

const { createCanvas, savePNG, hexToRGBA, darken, lighten, hash } = require('./atlas-utils');

const WIDTH = 1400;
const HEIGHT = 950;

// ── Track data ──────────────────────────────────────────────────────────────

const TRACKS = [
    {
        name: 'Desert Canyon',
        theme: { ground: 0xC4A265, trackSurface: 0x9E8B6E, trackEdge: 0xFFFFFF, skyColor: 0xE8D5A3, ambient: 0xFFE4B5 },
        trackWidth: 160,
        centerLine: [
            { x: 600, y: 720 }, { x: 300, y: 680 }, { x: 100, y: 550 },
            { x: 80, y: 350 }, { x: 150, y: 180 }, { x: 350, y: 100 },
            { x: 550, y: 80 }, { x: 750, y: 120 }, { x: 950, y: 180 },
            { x: 1080, y: 320 }, { x: 1100, y: 500 }, { x: 1000, y: 650 },
            { x: 850, y: 720 },
        ],
        terrainZones: [
            { type: 'MUD', center: { x: 250, y: 140 }, radius: 70 },
            { type: 'WATER', center: { x: 1090, y: 410 }, radius: 55 },
            { type: 'RAMP', center: { x: 600, y: 720 }, radius: 30, direction: -Math.PI / 2 },
        ],
        checkpoints: [
            { x: 600, y: 720 }, { x: 80, y: 350 },
            { x: 550, y: 80 }, { x: 1100, y: 500 },
        ],
    },
    {
        name: 'Arctic Circuit',
        theme: { ground: 0xD6EAF8, trackSurface: 0x85929E, trackEdge: 0xE74C3C, skyColor: 0xAED6F1, ambient: 0xD4E6F1 },
        trackWidth: 140,
        centerLine: [
            { x: 600, y: 720 }, { x: 400, y: 700 }, { x: 200, y: 600 },
            { x: 120, y: 450 }, { x: 200, y: 300 }, { x: 350, y: 200 },
            { x: 300, y: 100 }, { x: 500, y: 80 }, { x: 700, y: 100 },
            { x: 800, y: 200 }, { x: 900, y: 100 }, { x: 1050, y: 200 },
            { x: 1080, y: 400 }, { x: 1000, y: 550 }, { x: 900, y: 650 },
            { x: 800, y: 720 },
        ],
        terrainZones: [
            { type: 'ICE', center: { x: 200, y: 300 }, radius: 60 },
            { type: 'ICE', center: { x: 800, y: 200 }, radius: 50 },
            { type: 'ICE', center: { x: 1050, y: 200 }, radius: 45 },
            { type: 'WATER', center: { x: 120, y: 450 }, radius: 50 },
            { type: 'RAMP', center: { x: 500, y: 80 }, radius: 25, direction: 0 },
        ],
        checkpoints: [
            { x: 600, y: 720 }, { x: 120, y: 450 },
            { x: 500, y: 80 }, { x: 1080, y: 400 },
        ],
    },
    {
        name: 'Jungle Rally',
        theme: { ground: 0x2D5F2D, trackSurface: 0x6B4423, trackEdge: 0xFFFF00, skyColor: 0x4A7C3F, ambient: 0x7CCD7C },
        trackWidth: 130,
        centerLine: [
            { x: 600, y: 720 }, { x: 350, y: 700 }, { x: 150, y: 620 },
            { x: 80, y: 480 }, { x: 150, y: 350 }, { x: 280, y: 250 },
            { x: 200, y: 140 }, { x: 380, y: 80 }, { x: 550, y: 140 },
            { x: 650, y: 250 }, { x: 800, y: 180 }, { x: 950, y: 100 },
            { x: 1080, y: 200 }, { x: 1100, y: 380 }, { x: 1020, y: 520 },
            { x: 900, y: 600 }, { x: 1000, y: 700 }, { x: 850, y: 740 },
        ],
        terrainZones: [
            { type: 'MUD', center: { x: 80, y: 480 }, radius: 55 },
            { type: 'MUD', center: { x: 650, y: 250 }, radius: 50 },
            { type: 'WATER', center: { x: 200, y: 140 }, radius: 45 },
            { type: 'WATER', center: { x: 1020, y: 520 }, radius: 50 },
            { type: 'RAMP', center: { x: 550, y: 140 }, radius: 25, direction: Math.PI / 4 },
            { type: 'RAMP', center: { x: 900, y: 600 }, radius: 25, direction: -Math.PI / 4 },
        ],
        checkpoints: [
            { x: 600, y: 720 }, { x: 80, y: 480 },
            { x: 380, y: 80 }, { x: 1080, y: 200 },
        ],
    },
];

const TERRAIN_COLORS = {
    DIRT: 0x8B7355,
    MUD: 0x5C4033,
    WATER: 0x2E86C1,
    ICE: 0xAED6F1,
    RAMP: 0xD4AC0D,
};

const TRACK_EDGE_ALT = 0xFF0000;

// ── Geometry helpers ────────────────────────────────────────────────────────

function catmullRom(p0, p1, p2, p3, t) {
    const t2 = t * t, t3 = t2 * t;
    return {
        x: 0.5 * ((2 * p1.x) + (-p0.x + p2.x) * t + (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 + (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3),
        y: 0.5 * ((2 * p1.y) + (-p0.y + p2.y) * t + (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 + (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3),
    };
}

/**
 * Build smooth spline points from the center line (closed loop).
 * 20 samples per segment.
 */
function buildSplinePoints(centerLine) {
    const pts = centerLine;
    const n = pts.length;
    const spline = [];
    const SAMPLES = 20;

    for (let i = 0; i < n; i++) {
        const p0 = pts[(i - 1 + n) % n];
        const p1 = pts[i];
        const p2 = pts[(i + 1) % n];
        const p3 = pts[(i + 2) % n];
        for (let s = 0; s < SAMPLES; s++) {
            spline.push(catmullRom(p0, p1, p2, p3, s / SAMPLES));
        }
    }
    return spline;
}

/**
 * Compute perpendicular normal at each spline point.
 */
function computeNormals(spline) {
    const n = spline.length;
    const normals = [];
    for (let i = 0; i < n; i++) {
        const prev = spline[(i - 1 + n) % n];
        const next = spline[(i + 1) % n];
        const dx = next.x - prev.x;
        const dy = next.y - prev.y;
        const len = Math.sqrt(dx * dx + dy * dy) || 1;
        normals.push({ x: -dy / len, y: dx / len });
    }
    return normals;
}

/**
 * Build left and right edge arrays offset from center by half the track width.
 */
function buildEdges(spline, normals, halfWidth) {
    const left = [];
    const right = [];
    for (let i = 0; i < spline.length; i++) {
        left.push({
            x: spline[i].x + normals[i].x * halfWidth,
            y: spline[i].y + normals[i].y * halfWidth,
        });
        right.push({
            x: spline[i].x - normals[i].x * halfWidth,
            y: spline[i].y - normals[i].y * halfWidth,
        });
    }
    return { left, right };
}

/**
 * Build a 4px-resolution boolean mask of the track for grass-tuft placement.
 */
function buildTrackMask(spline, normals, halfWidth) {
    const RES = 4;
    const cols = Math.ceil(WIDTH / RES);
    const rows = Math.ceil(HEIGHT / RES);
    const mask = new Uint8Array(cols * rows);

    // For each spline point, stamp pixels within halfWidth
    for (let i = 0; i < spline.length; i++) {
        const cx = spline[i].x;
        const cy = spline[i].y;
        const r = halfWidth + 4; // slight margin
        const x0 = Math.max(0, Math.floor((cx - r) / RES));
        const x1 = Math.min(cols - 1, Math.ceil((cx + r) / RES));
        const y0 = Math.max(0, Math.floor((cy - r) / RES));
        const y1 = Math.min(rows - 1, Math.ceil((cy + r) / RES));
        for (let gy = y0; gy <= y1; gy++) {
            for (let gx = x0; gx <= x1; gx++) {
                const px = gx * RES + RES / 2;
                const py = gy * RES + RES / 2;
                const dx = px - cx;
                const dy = py - cy;
                // project onto normal and tangent
                const projN = dx * normals[i].x + dy * normals[i].y;
                if (Math.abs(projN) <= halfWidth) {
                    mask[gy * cols + gx] = 1;
                }
            }
        }
    }
    return { mask, cols, rows, res: RES };
}

function isOnTrack(maskData, px, py) {
    const gx = Math.floor(px / maskData.res);
    const gy = Math.floor(py / maskData.res);
    if (gx < 0 || gx >= maskData.cols || gy < 0 || gy >= maskData.rows) return false;
    return maskData.mask[gy * maskData.cols + gx] === 1;
}

/**
 * Find the nearest spline index to a given point and return the tangent angle.
 */
function findNearestAngle(spline, pt) {
    let bestDist = Infinity;
    let bestIdx = 0;
    for (let i = 0; i < spline.length; i++) {
        const dx = spline[i].x - pt.x;
        const dy = spline[i].y - pt.y;
        const d = dx * dx + dy * dy;
        if (d < bestDist) {
            bestDist = d;
            bestIdx = i;
        }
    }
    const n = spline.length;
    const prev = spline[(bestIdx - 1 + n) % n];
    const next = spline[(bestIdx + 1) % n];
    return Math.atan2(next.y - prev.y, next.x - prev.x);
}

// ── Drawing helpers ─────────────────────────────────────────────────────────

function drawPolygon(ctx, points) {
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i].x, points[i].y);
    }
    ctx.closePath();
}

function drawTrackShape(ctx, left, right) {
    ctx.beginPath();
    ctx.moveTo(left[0].x, left[0].y);
    for (let i = 1; i < left.length; i++) ctx.lineTo(left[i].x, left[i].y);
    // walk right edge in reverse
    for (let i = right.length - 1; i >= 0; i--) ctx.lineTo(right[i].x, right[i].y);
    ctx.closePath();
}

// ── Rendering layers ────────────────────────────────────────────────────────

function renderTrack(trackData, trackIndex) {
    const canvas = createCanvas(WIDTH, HEIGHT);
    const ctx = canvas.getContext('2d');
    const theme = trackData.theme;
    const halfWidth = trackData.trackWidth / 2;

    // Build geometry
    const spline = buildSplinePoints(trackData.centerLine);
    const normals = computeNormals(spline);
    const { left, right } = buildEdges(spline, normals, halfWidth);
    const maskData = buildTrackMask(spline, normals, halfWidth);

    // (a) Ground base fill
    ctx.fillStyle = hexToRGBA(theme.ground);
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    // (b) Noise texture - 600 scattered dots
    for (let i = 0; i < 600; i++) {
        const x = hash(i * 7 + 1) * WIDTH;
        const y = hash(i * 13 + 3) * HEIGHT;
        const size = 1 + hash(i * 17 + 5) * 3;
        const bright = hash(i * 23 + 7) > 0.5 ? 0.08 : -0.08;
        const col = bright > 0 ? lighten(theme.ground, bright) : darken(theme.ground, -bright);
        ctx.fillStyle = hexToRGBA(col, 0.4);
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fill();
    }

    // (c) Grass tufts in non-track areas - 200 clusters
    for (let i = 0; i < 200; i++) {
        const x = hash(i * 31 + 100) * WIDTH;
        const y = hash(i * 37 + 200) * HEIGHT;
        if (isOnTrack(maskData, x, y)) continue;
        const grassColor = lighten(theme.ground, 0.1 + hash(i * 41 + 300) * 0.1);
        ctx.fillStyle = hexToRGBA(grassColor, 0.6);
        // small cluster of 3-5 blades
        const bladeCount = 3 + Math.floor(hash(i * 43 + 400) * 3);
        for (let b = 0; b < bladeCount; b++) {
            const bx = x + (hash(i * 47 + b * 53) - 0.5) * 12;
            const by = y + (hash(i * 59 + b * 61) - 0.5) * 8;
            ctx.beginPath();
            ctx.moveTo(bx, by);
            ctx.lineTo(bx - 1.5, by - 4 - hash(i * 67 + b) * 4);
            ctx.lineTo(bx + 1.5, by - 2);
            ctx.fill();
        }
    }

    // (d) Track shadow - 6px expanded, 3px offset
    const shadowExpand = 6;
    const shadowLeft = [];
    const shadowRight = [];
    for (let i = 0; i < spline.length; i++) {
        shadowLeft.push({
            x: spline[i].x + normals[i].x * (halfWidth + shadowExpand) + 3,
            y: spline[i].y + normals[i].y * (halfWidth + shadowExpand) + 3,
        });
        shadowRight.push({
            x: spline[i].x - normals[i].x * (halfWidth + shadowExpand) + 3,
            y: spline[i].y - normals[i].y * (halfWidth + shadowExpand) + 3,
        });
    }
    drawTrackShape(ctx, shadowLeft, shadowRight);
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.fill();

    // (e) Track surface
    drawTrackShape(ctx, left, right);
    ctx.fillStyle = hexToRGBA(theme.trackSurface);
    ctx.fill();

    // (f) Inner lighter strip at 75% track width
    const innerHalf = halfWidth * 0.75;
    const innerLeft = [];
    const innerRight = [];
    for (let i = 0; i < spline.length; i++) {
        innerLeft.push({
            x: spline[i].x + normals[i].x * innerHalf,
            y: spline[i].y + normals[i].y * innerHalf,
        });
        innerRight.push({
            x: spline[i].x - normals[i].x * innerHalf,
            y: spline[i].y - normals[i].y * innerHalf,
        });
    }
    drawTrackShape(ctx, innerLeft, innerRight);
    ctx.fillStyle = hexToRGBA(lighten(theme.trackSurface, 0.06), 0.5);
    ctx.fill();

    // (g) Racing line center strip at 15% track width
    const racingHalf = halfWidth * 0.15;
    const racingLeft = [];
    const racingRight = [];
    for (let i = 0; i < spline.length; i++) {
        racingLeft.push({
            x: spline[i].x + normals[i].x * racingHalf,
            y: spline[i].y + normals[i].y * racingHalf,
        });
        racingRight.push({
            x: spline[i].x - normals[i].x * racingHalf,
            y: spline[i].y - normals[i].y * racingHalf,
        });
    }
    drawTrackShape(ctx, racingLeft, racingRight);
    ctx.fillStyle = hexToRGBA(darken(theme.trackSurface, 0.08), 0.4);
    ctx.fill();

    // (h) Asphalt grain - 400 scattered specks on the track
    for (let i = 0; i < 400; i++) {
        const x = hash(i * 71 + 500) * WIDTH;
        const y = hash(i * 73 + 600) * HEIGHT;
        if (!isOnTrack(maskData, x, y)) continue;
        const bright = hash(i * 79 + 700) > 0.5;
        const col = bright ? lighten(theme.trackSurface, 0.12) : darken(theme.trackSurface, 0.12);
        ctx.fillStyle = hexToRGBA(col, 0.3);
        const sz = 0.5 + hash(i * 83 + 800) * 1.5;
        ctx.fillRect(x - sz / 2, y - sz / 2, sz, sz);
    }

    // (i) Racing line marks - two parallel dark lines at +/-6px from center
    ctx.strokeStyle = hexToRGBA(darken(theme.trackSurface, 0.2), 0.3);
    ctx.lineWidth = 1.5;
    for (const offset of [6, -6]) {
        ctx.beginPath();
        for (let i = 0; i < spline.length; i++) {
            const px = spline[i].x + normals[i].x * offset;
            const py = spline[i].y + normals[i].y * offset;
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.stroke();
    }

    // (j) Curbing - F1-style alternating kerbs on both edges, 10px wide, 14px segments
    const kerbWidth = 10;
    const segLen = 14;
    // Accumulate arc length along the spline for segment boundaries
    const arcLen = [0];
    for (let i = 1; i < spline.length; i++) {
        const dx = spline[i].x - spline[i - 1].x;
        const dy = spline[i].y - spline[i - 1].y;
        arcLen.push(arcLen[i - 1] + Math.sqrt(dx * dx + dy * dy));
    }
    const totalLen = arcLen[arcLen.length - 1];

    const edgeColor1 = theme.trackEdge;
    const edgeColor2 = TRACK_EDGE_ALT;

    for (const side of ['left', 'right']) {
        const edgePts = side === 'left' ? left : right;
        const sign = side === 'left' ? 1 : -1;

        // outer kerb edge
        const outerPts = [];
        for (let i = 0; i < spline.length; i++) {
            outerPts.push({
                x: edgePts[i].x + normals[i].x * sign * kerbWidth,
                y: edgePts[i].y + normals[i].y * sign * kerbWidth,
            });
        }

        // Draw alternating colored segments
        let segStart = 0;
        let colorIdx = 0;
        while (segStart < totalLen) {
            const segEnd = Math.min(segStart + segLen, totalLen);
            // Find index range for this segment
            let iStart = 0;
            while (iStart < arcLen.length - 1 && arcLen[iStart + 1] < segStart) iStart++;
            let iEnd = iStart;
            while (iEnd < arcLen.length - 1 && arcLen[iEnd] < segEnd) iEnd++;
            iEnd = Math.min(iEnd, spline.length - 1);

            if (iEnd > iStart) {
                const col = colorIdx % 2 === 0 ? edgeColor1 : edgeColor2;
                ctx.fillStyle = hexToRGBA(col);
                ctx.beginPath();
                ctx.moveTo(edgePts[iStart].x, edgePts[iStart].y);
                for (let i = iStart + 1; i <= iEnd; i++) ctx.lineTo(edgePts[i].x, edgePts[i].y);
                for (let i = iEnd; i >= iStart; i--) ctx.lineTo(outerPts[i].x, outerPts[i].y);
                ctx.closePath();
                ctx.fill();

                // Bevel highlight on inner edge
                ctx.strokeStyle = hexToRGBA(lighten(col, 0.3), 0.5);
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(edgePts[iStart].x, edgePts[iStart].y);
                for (let i = iStart + 1; i <= iEnd; i++) ctx.lineTo(edgePts[i].x, edgePts[i].y);
                ctx.stroke();

                // Bevel shadow on outer edge
                ctx.strokeStyle = hexToRGBA(darken(col, 0.3), 0.5);
                ctx.beginPath();
                ctx.moveTo(outerPts[iStart].x, outerPts[iStart].y);
                for (let i = iStart + 1; i <= iEnd; i++) ctx.lineTo(outerPts[i].x, outerPts[i].y);
                ctx.stroke();
            }

            segStart += segLen;
            colorIdx++;
        }
    }

    // (k) Terrain overlays
    for (const zone of trackData.terrainZones) {
        const cx = zone.center.x;
        const cy = zone.center.y;
        const r = zone.radius;
        const baseColor = TERRAIN_COLORS[zone.type];

        switch (zone.type) {
            case 'WATER': {
                // Deep blue base
                ctx.fillStyle = hexToRGBA(darken(baseColor, 0.2), 0.7);
                ctx.beginPath();
                ctx.ellipse(cx, cy, r, r * 0.7, 0, 0, Math.PI * 2);
                ctx.fill();
                // Light blue ellipse
                ctx.fillStyle = hexToRGBA(lighten(baseColor, 0.15), 0.5);
                ctx.beginPath();
                ctx.ellipse(cx - r * 0.1, cy - r * 0.1, r * 0.7, r * 0.5, 0, 0, Math.PI * 2);
                ctx.fill();
                // Highlight
                ctx.fillStyle = hexToRGBA(lighten(baseColor, 0.4), 0.4);
                ctx.beginPath();
                ctx.ellipse(cx - r * 0.2, cy - r * 0.25, r * 0.25, r * 0.15, -0.3, 0, Math.PI * 2);
                ctx.fill();
                // Ripple rings
                ctx.strokeStyle = hexToRGBA(lighten(baseColor, 0.3), 0.3);
                ctx.lineWidth = 1;
                for (let ring = 0; ring < 3; ring++) {
                    const rr = r * (0.4 + ring * 0.2);
                    ctx.beginPath();
                    ctx.ellipse(cx, cy, rr, rr * 0.6, 0, 0, Math.PI * 2);
                    ctx.stroke();
                }
                break;
            }
            case 'MUD': {
                // Brown ellipse
                ctx.fillStyle = hexToRGBA(baseColor, 0.7);
                ctx.beginPath();
                ctx.ellipse(cx, cy, r, r * 0.75, 0, 0, Math.PI * 2);
                ctx.fill();
                // Bubbles
                for (let b = 0; b < 8; b++) {
                    const bx = cx + (hash(b * 131 + trackIndex * 1000) - 0.5) * r * 1.2;
                    const by = cy + (hash(b * 137 + trackIndex * 1000) - 0.5) * r * 0.9;
                    const br = 2 + hash(b * 139 + trackIndex * 1000) * 4;
                    ctx.fillStyle = hexToRGBA(darken(baseColor, 0.15), 0.5);
                    ctx.beginPath();
                    ctx.arc(bx, by, br, 0, Math.PI * 2);
                    ctx.fill();
                    // bubble highlight
                    ctx.fillStyle = hexToRGBA(lighten(baseColor, 0.2), 0.3);
                    ctx.beginPath();
                    ctx.arc(bx - br * 0.3, by - br * 0.3, br * 0.4, 0, Math.PI * 2);
                    ctx.fill();
                }
                break;
            }
            case 'ICE': {
                // Light blue base
                ctx.fillStyle = hexToRGBA(baseColor, 0.6);
                ctx.beginPath();
                ctx.ellipse(cx, cy, r, r * 0.8, 0, 0, Math.PI * 2);
                ctx.fill();
                // White highlights
                ctx.fillStyle = hexToRGBA(0xFFFFFF, 0.35);
                ctx.beginPath();
                ctx.ellipse(cx - r * 0.15, cy - r * 0.1, r * 0.5, r * 0.3, -0.2, 0, Math.PI * 2);
                ctx.fill();
                // Fracture lines
                ctx.strokeStyle = hexToRGBA(0xFFFFFF, 0.4);
                ctx.lineWidth = 1;
                for (let f = 0; f < 4; f++) {
                    const angle = hash(f * 151 + trackIndex * 500) * Math.PI * 2;
                    const len = r * (0.3 + hash(f * 157 + trackIndex * 500) * 0.5);
                    ctx.beginPath();
                    ctx.moveTo(cx, cy);
                    ctx.lineTo(cx + Math.cos(angle) * len, cy + Math.sin(angle) * len);
                    ctx.stroke();
                }
                break;
            }
            case 'RAMP': {
                const dir = zone.direction || 0;
                // Yellow-brown base
                ctx.fillStyle = hexToRGBA(baseColor, 0.7);
                ctx.save();
                ctx.translate(cx, cy);
                ctx.rotate(dir);
                ctx.fillRect(-r, -r * 0.5, r * 2, r);
                // Plank lines
                ctx.strokeStyle = hexToRGBA(darken(baseColor, 0.25), 0.6);
                ctx.lineWidth = 1.5;
                const plankCount = 5;
                for (let p = 0; p < plankCount; p++) {
                    const px = -r + (r * 2 / plankCount) * (p + 0.5);
                    ctx.beginPath();
                    ctx.moveTo(px, -r * 0.5);
                    ctx.lineTo(px, r * 0.5);
                    ctx.stroke();
                }
                // Directional arrows
                ctx.fillStyle = hexToRGBA(0xFFFFFF, 0.6);
                for (let a = 0; a < 2; a++) {
                    const ax = -r * 0.3 + a * r * 0.6;
                    ctx.beginPath();
                    ctx.moveTo(ax + 6, 0);
                    ctx.lineTo(ax - 4, -5);
                    ctx.lineTo(ax - 4, 5);
                    ctx.closePath();
                    ctx.fill();
                }
                ctx.restore();
                break;
            }
        }
    }

    // (l) Checkpoints - dashed yellow lines (skip first, that's the finish line)
    for (let ci = 1; ci < trackData.checkpoints.length; ci++) {
        const cp = trackData.checkpoints[ci];
        const angle = findNearestAngle(spline, cp);
        const perpAngle = angle + Math.PI / 2;
        const cpHalf = halfWidth + 5;

        ctx.strokeStyle = hexToRGBA(0xFFFF00, 0.6);
        ctx.lineWidth = 3;
        ctx.setLineDash([8, 6]);
        ctx.beginPath();
        ctx.moveTo(cp.x + Math.cos(perpAngle) * cpHalf, cp.y + Math.sin(perpAngle) * cpHalf);
        ctx.lineTo(cp.x - Math.cos(perpAngle) * cpHalf, cp.y - Math.sin(perpAngle) * cpHalf);
        ctx.stroke();
        ctx.setLineDash([]);
    }

    // (m) Finish line - checkered pattern with 3D bevel at checkpoint[0]
    {
        const fp = trackData.checkpoints[0];
        const angle = findNearestAngle(spline, fp);
        const perpAngle = angle + Math.PI / 2;
        const finishHalf = halfWidth;
        const finishWidth = 20; // width along track direction
        const squareSize = 10;

        ctx.save();
        ctx.translate(fp.x, fp.y);
        ctx.rotate(perpAngle);

        // 3D bevel - dark edge
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.fillRect(-finishHalf - 2, -finishWidth / 2 - 2, finishHalf * 2 + 4, finishWidth + 4);

        // Bevel highlight
        ctx.fillStyle = 'rgba(255,255,255,0.2)';
        ctx.fillRect(-finishHalf, -finishWidth / 2, finishHalf * 2, 2);
        ctx.fillRect(-finishHalf, -finishWidth / 2, 2, finishWidth);

        // Checkerboard
        const cols = Math.ceil(finishHalf * 2 / squareSize);
        const rows = Math.ceil(finishWidth / squareSize);
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const isWhite = (r + c) % 2 === 0;
                ctx.fillStyle = isWhite ? '#FFFFFF' : '#000000';
                ctx.fillRect(
                    -finishHalf + c * squareSize,
                    -finishWidth / 2 + r * squareSize,
                    squareSize,
                    squareSize
                );
            }
        }

        // Bevel shadow bottom
        ctx.fillStyle = 'rgba(0,0,0,0.2)';
        ctx.fillRect(-finishHalf, finishWidth / 2 - 2, finishHalf * 2, 2);
        ctx.fillRect(finishHalf - 2, -finishWidth / 2, 2, finishWidth);

        ctx.restore();
    }

    // (n) Ground details - 150 pebbles near track edges
    for (let i = 0; i < 150; i++) {
        const idx = Math.floor(hash(i * 191 + 900) * spline.length);
        const side = hash(i * 193 + 901) > 0.5 ? 1 : -1;
        const dist = halfWidth + 5 + hash(i * 197 + 902) * 25;
        const px = spline[idx].x + normals[idx].x * side * dist;
        const py = spline[idx].y + normals[idx].y * side * dist;

        if (px < 0 || px > WIDTH || py < 0 || py > HEIGHT) continue;

        const pebbleSize = 1 + hash(i * 199 + 903) * 2.5;
        const shade = hash(i * 211 + 904) > 0.5 ? darken(theme.ground, 0.15) : darken(theme.ground, 0.25);
        ctx.fillStyle = hexToRGBA(shade, 0.5);
        ctx.beginPath();
        ctx.ellipse(px, py, pebbleSize, pebbleSize * 0.7, hash(i * 223) * Math.PI, 0, Math.PI * 2);
        ctx.fill();
    }

    return canvas;
}

// ── Main ────────────────────────────────────────────────────────────────────

console.log('Generating track images...');
for (let i = 0; i < TRACKS.length; i++) {
    console.log(`  Track ${i}: ${TRACKS[i].name}`);
    const canvas = renderTrack(TRACKS[i], i);
    savePNG(canvas, 'tracks', `track_${i}.png`);
}
console.log('Done.');
