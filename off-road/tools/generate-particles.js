#!/usr/bin/env node
/**
 * Generate particle texture atlas for Super Off Road.
 *
 * Produces a single spritesheet with smoke, flame, spark, dust, water,
 * mud, confetti, oil_slick, missile, and explosion frames.
 *
 * Output: assets/particles/particles.png + particles.json
 */

const { createCanvas, saveAtlas, hexToRGBA, darken, lighten } = require('./atlas-utils');

// ── Drawing helpers ──────────────────────────────────────────────────

function drawRadialGlow(ctx, cx, cy, radius, color, alpha) {
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
    grad.addColorStop(0, hexToRGBA(color, alpha));
    grad.addColorStop(1, hexToRGBA(color, 0));
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fill();
}

// ── Frame generators ─────────────────────────────────────────────────

function drawSmoke(ctx, cx, cy, frame) {
    // frame 0 = small dense, frame 3 = large faded
    const t = frame / 3;
    const baseRadius = 6 + t * 8;
    const baseAlpha = 0.6 - t * 0.4;
    const color = 0x888888;

    // Concentric circles with radial gradients
    for (let i = 3; i >= 0; i--) {
        const r = baseRadius * (0.4 + i * 0.2);
        const a = baseAlpha * (1 - i * 0.2);
        drawRadialGlow(ctx, cx + (i - 1.5) * 1.5, cy + (i - 1.5) * 0.8, r, color, a);
    }
}

function drawFlame(ctx, cx, cy, frame) {
    const t = frame / 3;
    const size = 8 + t * 4;

    // Outer red layer
    drawRadialGlow(ctx, cx, cy + 2, size, 0xFF2200, 0.5 - t * 0.15);
    // Mid orange layer
    drawRadialGlow(ctx, cx - 1, cy, size * 0.75, 0xFF8800, 0.6 - t * 0.1);
    drawRadialGlow(ctx, cx + 2, cy - 1, size * 0.65, 0xFF6600, 0.5 - t * 0.1);
    // Bright yellow-white core
    drawRadialGlow(ctx, cx, cy - 1, size * 0.4, 0xFFFF00, 0.7 - t * 0.15);
    drawRadialGlow(ctx, cx, cy - 2, size * 0.25, 0xFFFFCC, 0.8 - t * 0.15);

    // Irregular flame tips using overlapping circles
    const offsets = [
        { x: -3, y: -size * 0.5, r: size * 0.35 },
        { x: 2, y: -size * 0.6, r: size * 0.3 },
        { x: -1, y: -size * 0.3, r: size * 0.4 },
    ];
    for (const o of offsets) {
        drawRadialGlow(ctx, cx + o.x, cy + o.y + t * 2, o.r, 0xFF6600, 0.4 - t * 0.1);
    }
}

function drawSpark(ctx, cx, cy, frame) {
    const bright = frame === 0 ? 1.0 : 0.7;

    // Trailing streak
    ctx.strokeStyle = hexToRGBA(0xFFFF88, 0.5 * bright);
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(cx - 6, cy + 3);
    ctx.lineTo(cx, cy);
    ctx.stroke();

    // Bright core
    drawRadialGlow(ctx, cx, cy, 4, 0xFFFFFF, 0.9 * bright);
    drawRadialGlow(ctx, cx, cy, 2.5, 0xFFFF44, 1.0 * bright);

    // Center dot
    ctx.fillStyle = hexToRGBA(0xFFFFFF, bright);
    ctx.beginPath();
    ctx.arc(cx, cy, 1.2, 0, Math.PI * 2);
    ctx.fill();
}

function drawDust(ctx, cx, cy, frame) {
    const t = frame / 3;
    const baseRadius = 4 + t * 6;
    const baseAlpha = 0.5 - t * 0.3;
    const color = 0x8B7355;

    for (let i = 3; i >= 0; i--) {
        const r = baseRadius * (0.4 + i * 0.2);
        const a = baseAlpha * (1 - i * 0.15);
        drawRadialGlow(ctx, cx + (i - 1.5) * 1.2, cy + (i - 1.5) * 0.6, r, color, a);
    }
}

function drawWater(ctx, cx, cy, frame) {
    const t = frame / 3;
    const color = 0x4FC3F7;

    // Central splash base
    drawRadialGlow(ctx, cx, cy + 4, 5 - t * 1.5, color, 0.4 - t * 0.15);

    // Upward-moving droplets
    const droplets = [
        { x: 0, y: -4 - t * 4, r: 2.5 - t * 0.4 },
        { x: -3, y: -2 - t * 3, r: 2 - t * 0.3 },
        { x: 3, y: -3 - t * 3.5, r: 1.8 - t * 0.3 },
        { x: -1, y: -6 - t * 5, r: 1.5 - t * 0.3 },
        { x: 2, y: -5 - t * 4, r: 1.3 - t * 0.2 },
    ];

    for (const d of droplets) {
        if (d.r <= 0) continue;
        const alpha = 0.6 - t * 0.2;
        // Teardrop shape: circle + triangle bottom
        ctx.fillStyle = hexToRGBA(color, alpha);
        ctx.beginPath();
        ctx.arc(cx + d.x, cy + d.y, d.r, 0, Math.PI * 2);
        ctx.fill();
        // Highlight
        ctx.fillStyle = hexToRGBA(0xFFFFFF, alpha * 0.5);
        ctx.beginPath();
        ctx.arc(cx + d.x - d.r * 0.3, cy + d.y - d.r * 0.3, d.r * 0.4, 0, Math.PI * 2);
        ctx.fill();
    }
}

function drawMud(ctx, cx, cy, frame) {
    const t = frame / 3;
    const color = 0x5C4033;
    const alpha = 0.7 - t * 0.25;

    // Irregular blobby shapes via overlapping circles
    const blobs = [
        { x: 0, y: 0, r: 5 + t * 2 },
        { x: -3 - t, y: -2, r: 3.5 + t * 1.5 },
        { x: 3 + t * 0.5, y: 1, r: 4 + t * 1.5 },
        { x: -1, y: 3 + t, r: 3 + t },
        { x: 2, y: -3 - t * 0.5, r: 2.5 + t },
    ];

    for (const b of blobs) {
        ctx.fillStyle = hexToRGBA(color, alpha);
        ctx.beginPath();
        ctx.arc(cx + b.x, cy + b.y, b.r, 0, Math.PI * 2);
        ctx.fill();
    }
    // Darker center
    ctx.fillStyle = hexToRGBA(darken(color, 0.3), alpha * 0.6);
    ctx.beginPath();
    ctx.arc(cx, cy, 3 + t, 0, Math.PI * 2);
    ctx.fill();
}

function drawConfetti(ctx, cx, cy) {
    // Simple white square (tinted at runtime)
    ctx.fillStyle = hexToRGBA(0xFFFFFF, 1.0);
    ctx.fillRect(cx - 3, cy - 3, 6, 6);
}

function drawOilSlick(ctx, cx, cy) {
    // Dark gray base puddle
    drawRadialGlow(ctx, cx, cy, 20, 0x222222, 0.7);
    drawRadialGlow(ctx, cx, cy, 16, 0x333333, 0.5);

    // Iridescent sheen overlays
    ctx.globalCompositeOperation = 'screen';
    drawRadialGlow(ctx, cx - 4, cy - 3, 12, 0x004466, 0.25);
    drawRadialGlow(ctx, cx + 3, cy + 2, 10, 0x226644, 0.2);
    drawRadialGlow(ctx, cx - 2, cy + 4, 8, 0x443366, 0.15);
    // Blue-green highlight arc
    ctx.strokeStyle = hexToRGBA(0x33AAAA, 0.2);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx - 2, cy - 1, 10, -0.8, 0.8);
    ctx.stroke();
    ctx.globalCompositeOperation = 'source-over';

    // Subtle edge
    ctx.strokeStyle = hexToRGBA(0x111111, 0.3);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.ellipse(cx, cy, 19, 16, 0, 0, Math.PI * 2);
    ctx.stroke();
}

function drawMissile(ctx, cx, cy) {
    // Missile body (red, pointing right)
    const bx = cx - 12;
    const by = cy - 4;

    // Main body
    ctx.fillStyle = hexToRGBA(0xCC0000, 1.0);
    ctx.beginPath();
    ctx.moveTo(bx + 4, by);
    ctx.lineTo(bx + 18, by);
    ctx.lineTo(bx + 24, by + 4); // pointed nose
    ctx.lineTo(bx + 18, by + 8);
    ctx.lineTo(bx + 4, by + 8);
    ctx.closePath();
    ctx.fill();

    // Darker red band
    ctx.fillStyle = hexToRGBA(0x990000, 1.0);
    ctx.fillRect(bx + 10, by, 4, 8);

    // Nose tip highlight
    ctx.fillStyle = hexToRGBA(0xFF3333, 1.0);
    ctx.beginPath();
    ctx.moveTo(bx + 20, by + 1);
    ctx.lineTo(bx + 24, by + 4);
    ctx.lineTo(bx + 20, by + 7);
    ctx.closePath();
    ctx.fill();

    // Fins
    ctx.fillStyle = hexToRGBA(0x880000, 1.0);
    // Top fin
    ctx.beginPath();
    ctx.moveTo(bx + 2, by);
    ctx.lineTo(bx + 6, by);
    ctx.lineTo(bx + 4, by - 3);
    ctx.closePath();
    ctx.fill();
    // Bottom fin
    ctx.beginPath();
    ctx.moveTo(bx + 2, by + 8);
    ctx.lineTo(bx + 6, by + 8);
    ctx.lineTo(bx + 4, by + 11);
    ctx.closePath();
    ctx.fill();

    // Exhaust glow
    drawRadialGlow(ctx, bx + 1, by + 4, 5, 0xFF8800, 0.6);
    drawRadialGlow(ctx, bx - 2, by + 4, 3, 0xFFCC00, 0.8);
}

function drawExplosion(ctx, cx, cy, frame) {
    const t = frame / 3;
    const outerR = 10 + t * 12;
    const alpha = 0.9 - t * 0.35;

    // Outer orange-red expanding ring
    drawRadialGlow(ctx, cx, cy, outerR, 0xFF4400, alpha * 0.5);

    if (frame < 3) {
        // Mid orange layer
        drawRadialGlow(ctx, cx, cy, outerR * 0.7, 0xFF8800, alpha * 0.6);
    }

    if (frame < 2) {
        // Bright yellow-white center
        drawRadialGlow(ctx, cx, cy, outerR * 0.4, 0xFFFF00, alpha * 0.8);
        drawRadialGlow(ctx, cx, cy, outerR * 0.2, 0xFFFFFF, alpha * 0.9);
    }

    // Debris particles (more spread out in later frames)
    const debris = [
        { x: 5 + t * 8, y: -3 - t * 5, r: 2 - t * 0.4 },
        { x: -6 - t * 6, y: -4 - t * 4, r: 1.8 - t * 0.3 },
        { x: 3 + t * 5, y: 5 + t * 6, r: 2.2 - t * 0.5 },
        { x: -4 - t * 7, y: 3 + t * 5, r: 1.5 - t * 0.3 },
        { x: 0, y: -6 - t * 8, r: 1.8 - t * 0.4 },
        { x: 7 + t * 4, y: 0, r: 1.6 - t * 0.3 },
    ];

    for (const d of debris) {
        if (d.r <= 0) continue;
        const color = frame < 2 ? 0xFFCC00 : 0xFF6600;
        ctx.fillStyle = hexToRGBA(color, alpha * 0.7);
        ctx.beginPath();
        ctx.arc(cx + d.x, cy + d.y, d.r, 0, Math.PI * 2);
        ctx.fill();
    }
}

// ── Layout & packing ─────────────────────────────────────────────────

// Define all frame groups with their sizes
const FRAME_GROUPS = [
    // { name prefix, count, width, height, drawFn(ctx, cx, cy, frameIndex) }
    { prefix: 'smoke',     count: 4, w: 32, h: 32, draw: drawSmoke },
    { prefix: 'flame',     count: 4, w: 32, h: 32, draw: drawFlame },
    { prefix: 'spark',     count: 2, w: 16, h: 16, draw: drawSpark },
    { prefix: 'dust',      count: 4, w: 24, h: 24, draw: drawDust },
    { prefix: 'water',     count: 4, w: 24, h: 24, draw: drawWater },
    { prefix: 'mud',       count: 4, w: 24, h: 24, draw: drawMud },
    { prefix: 'confetti',  count: 1, w: 8,  h: 8,  draw: (ctx, cx, cy) => drawConfetti(ctx, cx, cy) },
    { prefix: 'oil_slick', count: 1, w: 48, h: 48, draw: (ctx, cx, cy) => drawOilSlick(ctx, cx, cy) },
    { prefix: 'missile',   count: 1, w: 24, h: 12, draw: (ctx, cx, cy) => drawMissile(ctx, cx, cy) },
    { prefix: 'explosion', count: 4, w: 48, h: 48, draw: drawExplosion },
];

function packFrames() {
    // Pack each group into its own row
    const rows = [];
    let totalHeight = 0;
    let maxWidth = 0;

    for (const group of FRAME_GROUPS) {
        const rowWidth = group.count * group.w;
        rows.push({
            ...group,
            y: totalHeight,
            rowWidth,
        });
        totalHeight += group.h;
        if (rowWidth > maxWidth) maxWidth = rowWidth;
    }

    return { rows, totalWidth: maxWidth, totalHeight };
}

// ── Main ─────────────────────────────────────────────────────────────

function generate() {
    console.log('Generating particle atlas...');

    const { rows, totalWidth, totalHeight } = packFrames();
    const canvas = createCanvas(totalWidth, totalHeight);
    const ctx = canvas.getContext('2d');
    const frames = [];

    for (const row of rows) {
        for (let i = 0; i < row.count; i++) {
            const fx = i * row.w;
            const fy = row.y;
            const cx = fx + row.w / 2;
            const cy = fy + row.h / 2;

            ctx.save();
            row.draw(ctx, cx, cy, i);
            ctx.restore();

            const name = row.count === 1
                ? row.prefix
                : `${row.prefix}_${i}`;

            frames.push({ name, x: fx, y: fy, w: row.w, h: row.h });
        }
    }

    saveAtlas(canvas, 'particles', 'particles', frames);
    console.log(`Done! Generated ${frames.length} particle frames.`);
}

generate();
