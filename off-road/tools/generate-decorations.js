#!/usr/bin/env node
/**
 * Generate decoration sprite atlases for Super Off Road.
 *
 * Produces 3 atlas PNGs (one per track theme), each containing
 * all decoration types for that theme arranged in a single row.
 *
 * Output: assets/decorations/{desert,arctic,jungle}.{png,json}
 */

const { createCanvas, saveAtlas, hexToRGBA, darken, lighten, hash } = require('./atlas-utils');

// --- Shared drawing helpers ---

function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.arcTo(x + w, y, x + w, y + r, r);
    ctx.lineTo(x + w, y + h - r);
    ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
    ctx.lineTo(x + r, y + h);
    ctx.arcTo(x, y + h, x, y + h - r, r);
    ctx.lineTo(x, y + r);
    ctx.arcTo(x, y, x + r, y, r);
    ctx.closePath();
}

function drawEllipse(ctx, cx, cy, w, h, strokeOnly) {
    ctx.beginPath();
    ctx.ellipse(cx, cy, w / 2, h / 2, 0, 0, Math.PI * 2);
    if (strokeOnly) ctx.stroke();
    else ctx.fill();
}

// --- Spectator colors ---
const SPECTATOR_COLORS = [0xFF3333, 0x3388FF, 0x33CC33, 0xFFCC00, 0xFF66AA, 0xFFFFFF, 0xFF8833, 0x9933FF];

// --- Decoration draw functions ---

function drawCactus(ctx, cx, cy) {
    // Shadow
    ctx.fillStyle = hexToRGBA(0x000000, 0.2);
    ctx.beginPath();
    ctx.ellipse(cx, cy + 28, 18, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    const trunkDark = 0x1B6B1B;
    const trunkLight = 0x2D8B2D;

    // Main trunk
    ctx.fillStyle = hexToRGBA(trunkDark);
    roundRect(ctx, cx - 6, cy - 20, 12, 44, 4);
    ctx.fill();

    // Lighter trunk fill (inset)
    ctx.fillStyle = hexToRGBA(trunkLight);
    roundRect(ctx, cx - 4, cy - 18, 8, 40, 3);
    ctx.fill();

    // Left arm (branches at top-left)
    ctx.fillStyle = hexToRGBA(trunkDark);
    roundRect(ctx, cx - 22, cy - 16, 18, 8, 3);
    ctx.fill();
    // Left arm vertical part going up
    roundRect(ctx, cx - 22, cy - 28, 8, 16, 3);
    ctx.fill();

    // Left arm lighter fill
    ctx.fillStyle = hexToRGBA(trunkLight);
    roundRect(ctx, cx - 20, cy - 14, 14, 5, 2);
    ctx.fill();
    roundRect(ctx, cx - 20, cy - 26, 5, 14, 2);
    ctx.fill();

    // Right arm (branches at mid-right)
    ctx.fillStyle = hexToRGBA(trunkDark);
    roundRect(ctx, cx + 4, cy - 4, 16, 8, 3);
    ctx.fill();
    // Right arm vertical going up
    roundRect(ctx, cx + 14, cy - 18, 8, 18, 3);
    ctx.fill();

    // Right arm lighter fill
    ctx.fillStyle = hexToRGBA(trunkLight);
    roundRect(ctx, cx + 6, cy - 2, 12, 5, 2);
    ctx.fill();
    roundRect(ctx, cx + 16, cy - 16, 5, 14, 2);
    ctx.fill();

    // Highlight stripe down center of trunk
    ctx.fillStyle = hexToRGBA(0x44AA44, 0.5);
    ctx.fillRect(cx - 1, cy - 16, 2, 36);
}

function drawRock(ctx, cx, cy) {
    // Shadow underneath
    ctx.fillStyle = hexToRGBA(0x000000, 0.2);
    ctx.beginPath();
    ctx.ellipse(cx, cy + 18, 20, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    // Base layer (darkest)
    ctx.fillStyle = hexToRGBA(0x5C5C5C);
    ctx.beginPath();
    ctx.ellipse(cx + 1, cy + 4, 20, 14, 0, 0, Math.PI * 2);
    ctx.fill();

    // Middle layer
    ctx.fillStyle = hexToRGBA(0x707070);
    ctx.beginPath();
    ctx.ellipse(cx - 1, cy + 1, 17, 12, 0, 0, Math.PI * 2);
    ctx.fill();

    // Light layer (toward top-left)
    ctx.fillStyle = hexToRGBA(0x858585);
    ctx.beginPath();
    ctx.ellipse(cx - 3, cy - 2, 13, 9, -0.2, 0, Math.PI * 2);
    ctx.fill();

    // Highlight (top-left)
    ctx.fillStyle = hexToRGBA(0x9A9A9A);
    ctx.beginPath();
    ctx.ellipse(cx - 5, cy - 4, 8, 5, -0.3, 0, Math.PI * 2);
    ctx.fill();

    // Crack line detail
    ctx.strokeStyle = hexToRGBA(0x4A4A4A, 0.7);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx - 6, cy - 2);
    ctx.lineTo(cx + 2, cy + 3);
    ctx.lineTo(cx + 8, cy + 1);
    ctx.stroke();
}

function drawTireStack(ctx, cx, cy) {
    // Draw 3 overlapping tires
    const offsets = [
        { x: -8, y: 6 },
        { x: 8, y: 6 },
        { x: 0, y: -4 },
    ];

    for (const off of offsets) {
        const tx = cx + off.x;
        const ty = cy + off.y;
        const outerR = 10;
        const innerR = 7;
        const hubR = 3;

        // Outer tire (dark)
        ctx.fillStyle = hexToRGBA(0x1A1A1A);
        ctx.beginPath();
        ctx.arc(tx, ty, outerR, 0, Math.PI * 2);
        ctx.fill();

        // Slightly lighter ring
        ctx.fillStyle = hexToRGBA(0x2A2A2A);
        ctx.beginPath();
        ctx.arc(tx, ty, innerR, 0, Math.PI * 2);
        ctx.fill();

        // Hub
        ctx.fillStyle = hexToRGBA(0x444444);
        ctx.beginPath();
        ctx.arc(tx, ty, hubR, 0, Math.PI * 2);
        ctx.fill();

        // 6 tread lines radiating from center
        ctx.strokeStyle = hexToRGBA(0x333333);
        ctx.lineWidth = 1;
        for (let i = 0; i < 6; i++) {
            const angle = (i / 6) * Math.PI * 2;
            ctx.beginPath();
            ctx.moveTo(tx + Math.cos(angle) * hubR, ty + Math.sin(angle) * hubR);
            ctx.lineTo(tx + Math.cos(angle) * outerR, ty + Math.sin(angle) * outerR);
            ctx.stroke();
        }
    }
}

function drawSpectatorStand(ctx, cx, cy, width) {
    const h = 48;
    const platformY = cy - 4;
    const platformH = 6;
    const legH = 16;

    // Support legs
    ctx.fillStyle = hexToRGBA(darken(0x5D4037, 0.2));
    const numLegs = Math.floor(width / 30) + 1;
    for (let i = 0; i < numLegs; i++) {
        const lx = cx - width / 2 + 8 + i * ((width - 16) / (numLegs - 1));
        ctx.fillRect(lx - 2, platformY + platformH, 4, legH);
    }

    // Platform
    ctx.fillStyle = hexToRGBA(0x5D4037);
    roundRect(ctx, cx - width / 2, platformY, width, platformH, 2);
    ctx.fill();

    // Roof
    ctx.fillStyle = hexToRGBA(0x2A2A2A);
    roundRect(ctx, cx - width / 2 - 4, cy - h / 2 + 2, width + 8, 5, 2);
    ctx.fill();

    // Spectators seated on platform
    const numSpectators = Math.floor(width / 16);
    const spacing = (width - 12) / numSpectators;
    for (let i = 0; i < numSpectators; i++) {
        const sx = cx - width / 2 + 8 + i * spacing;
        const sy = platformY - 2;
        const shirtColor = SPECTATOR_COLORS[i % SPECTATOR_COLORS.length];

        // Body / shirt
        ctx.fillStyle = hexToRGBA(shirtColor);
        roundRect(ctx, sx - 4, sy - 10, 8, 10, 2);
        ctx.fill();

        // Head (skin tone)
        ctx.fillStyle = hexToRGBA(0xDEB887);
        ctx.beginPath();
        ctx.arc(sx, sy - 14, 4, 0, Math.PI * 2);
        ctx.fill();
    }
}

function drawBush(ctx, cx, cy) {
    const greens = [0x1B5E20, 0x2E7D32, 0x388E3C, 0x43A047];
    const highlight = 0x66BB6A;

    // Multiple overlapping ellipses
    const layers = [
        { dx: -4, dy: 3, rx: 10, ry: 7 },
        { dx: 5, dy: 2, rx: 9, ry: 8 },
        { dx: 0, dy: -1, rx: 11, ry: 8 },
        { dx: -2, dy: -3, rx: 8, ry: 6 },
    ];

    for (let i = 0; i < layers.length; i++) {
        const l = layers[i];
        ctx.fillStyle = hexToRGBA(greens[i]);
        ctx.beginPath();
        ctx.ellipse(cx + l.dx, cy + l.dy, l.rx, l.ry, 0, 0, Math.PI * 2);
        ctx.fill();
    }

    // Highlight spot
    ctx.fillStyle = hexToRGBA(highlight, 0.6);
    ctx.beginPath();
    ctx.ellipse(cx - 3, cy - 4, 5, 3, -0.3, 0, 0, Math.PI * 2);
    ctx.fill();
}

function drawPine(ctx, cx, cy) {
    // Brown trunk
    ctx.fillStyle = hexToRGBA(0x4E342E);
    roundRect(ctx, cx - 3, cy + 10, 6, 20, 2);
    ctx.fill();

    // 4 layered triangular canopy sections (bottom to top, getting smaller)
    const sections = [
        { y: cy + 10, halfW: 20, h: 18 },
        { y: cy, halfW: 16, h: 16 },
        { y: cy - 10, halfW: 12, h: 14 },
        { y: cy - 18, halfW: 8, h: 12 },
    ];

    for (const s of sections) {
        // Dark green fill
        ctx.fillStyle = hexToRGBA(0x1B5E20);
        ctx.beginPath();
        ctx.moveTo(cx, s.y - s.h);
        ctx.lineTo(cx - s.halfW, s.y);
        ctx.lineTo(cx + s.halfW, s.y);
        ctx.closePath();
        ctx.fill();

        // Lighter edges
        ctx.strokeStyle = hexToRGBA(0x2E7D32);
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(cx, s.y - s.h);
        ctx.lineTo(cx - s.halfW, s.y);
        ctx.moveTo(cx, s.y - s.h);
        ctx.lineTo(cx + s.halfW, s.y);
        ctx.stroke();
    }

    // White snow cap on top
    ctx.fillStyle = hexToRGBA(0xFFFFFF, 0.9);
    ctx.beginPath();
    ctx.moveTo(cx, cy - 30);
    ctx.lineTo(cx - 6, cy - 22);
    ctx.lineTo(cx + 6, cy - 22);
    ctx.closePath();
    ctx.fill();

    // Extra snow patches
    ctx.fillStyle = hexToRGBA(0xFFFFFF, 0.6);
    ctx.beginPath();
    ctx.ellipse(cx - 8, cy - 8, 5, 3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(cx + 6, cy, 4, 2.5, 0, 0, Math.PI * 2);
    ctx.fill();
}

function drawSnowman(ctx, cx, cy) {
    // Bottom body
    ctx.fillStyle = hexToRGBA(0xF5F5F5);
    ctx.beginPath();
    ctx.arc(cx, cy + 16, 14, 0, Math.PI * 2);
    ctx.fill();
    // Outline
    ctx.strokeStyle = hexToRGBA(0xCCCCCC);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(cx, cy + 16, 14, 0, Math.PI * 2);
    ctx.stroke();

    // Middle body
    ctx.fillStyle = hexToRGBA(0xF5F5F5);
    ctx.beginPath();
    ctx.arc(cx, cy, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = hexToRGBA(0xCCCCCC);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(cx, cy, 10, 0, Math.PI * 2);
    ctx.stroke();

    // Head
    ctx.fillStyle = hexToRGBA(0xF5F5F5);
    ctx.beginPath();
    ctx.arc(cx, cy - 14, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = hexToRGBA(0xCCCCCC);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(cx, cy - 14, 7, 0, Math.PI * 2);
    ctx.stroke();

    // Coal eyes
    ctx.fillStyle = hexToRGBA(0x212121);
    ctx.beginPath();
    ctx.arc(cx - 3, cy - 16, 1.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx + 3, cy - 16, 1.5, 0, Math.PI * 2);
    ctx.fill();

    // Carrot nose (triangle pointing right)
    ctx.fillStyle = hexToRGBA(0xFF7043);
    ctx.beginPath();
    ctx.moveTo(cx + 1, cy - 14);
    ctx.lineTo(cx + 9, cy - 13);
    ctx.lineTo(cx + 1, cy - 12);
    ctx.closePath();
    ctx.fill();

    // Red scarf
    ctx.fillStyle = hexToRGBA(0xE53935);
    ctx.fillRect(cx - 8, cy - 8, 16, 4);
    // Scarf tail
    ctx.fillRect(cx + 4, cy - 8, 4, 10);

    // Coal buttons (on middle)
    ctx.fillStyle = hexToRGBA(0x212121);
    ctx.beginPath();
    ctx.arc(cx, cy - 3, 1.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx, cy + 3, 1.5, 0, Math.PI * 2);
    ctx.fill();

    // Hat (on top of head)
    ctx.fillStyle = hexToRGBA(0x1A1A1A);
    // Brim
    ctx.fillRect(cx - 8, cy - 21, 16, 3);
    // Top
    ctx.fillRect(cx - 5, cy - 31, 10, 12);
}

function drawPalm(ctx, cx, cy) {
    // Curved brown trunk with ring lines
    ctx.strokeStyle = hexToRGBA(0x6D4C41);
    ctx.lineWidth = 8;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(cx, cy + 28);
    ctx.quadraticCurveTo(cx - 8, cy + 10, cx - 4, cy - 10);
    ctx.stroke();

    // Trunk ring lines
    ctx.strokeStyle = hexToRGBA(darken(0x6D4C41, 0.2));
    ctx.lineWidth = 1;
    for (let i = 0; i < 6; i++) {
        const t = 0.15 + i * 0.13;
        // Approximate point along the curve
        const px = cx + (1-t)*(1-t)*0 + 2*(1-t)*t*(-8) + t*t*(-4);
        const py = cy + (1-t)*(1-t)*28 + 2*(1-t)*t*10 + t*t*(-10);
        ctx.beginPath();
        ctx.moveTo(px - 4, py);
        ctx.lineTo(px + 4, py);
        ctx.stroke();
    }

    // Top of trunk (frond origin)
    const topX = cx - 4;
    const topY = cy - 10;

    // 7 fronds radiating from top
    const frondColors = [0x1B5E20, 0x2E7D32, 0x388E3C, 0x43A047, 0x2E7D32, 0x388E3C, 0x1B5E20];
    const frondAngles = [-2.6, -2.0, -1.2, -0.4, 0.3, 1.0, 1.8];

    for (let i = 0; i < 7; i++) {
        const angle = frondAngles[i];
        const len = 22 + (i % 3) * 4;
        const endX = topX + Math.cos(angle) * len;
        const endY = topY + Math.sin(angle) * len;

        ctx.strokeStyle = hexToRGBA(frondColors[i]);
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(topX, topY);
        ctx.quadraticCurveTo(
            topX + Math.cos(angle) * len * 0.5,
            topY + Math.sin(angle) * len * 0.5 - 4,
            endX, endY
        );
        ctx.stroke();

        // Leaf frills along the frond
        ctx.strokeStyle = hexToRGBA(frondColors[i], 0.7);
        ctx.lineWidth = 1.5;
        for (let j = 0.3; j <= 0.9; j += 0.2) {
            const mx = topX + (endX - topX) * j;
            const my = topY + (endY - topY) * j - 4 * (1 - j);
            const perpAngle = angle + Math.PI / 2;
            ctx.beginPath();
            ctx.moveTo(mx, my);
            ctx.lineTo(mx + Math.cos(perpAngle) * 5, my + Math.sin(perpAngle) * 5);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(mx, my);
            ctx.lineTo(mx - Math.cos(perpAngle) * 5, my - Math.sin(perpAngle) * 5);
            ctx.stroke();
        }
    }

    // 2 coconuts
    ctx.fillStyle = hexToRGBA(0x5D4037);
    ctx.beginPath();
    ctx.arc(topX + 3, topY + 3, 3.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(topX - 4, topY + 4, 3, 0, Math.PI * 2);
    ctx.fill();
}

// --- Theme definitions ---

const THEMES = {
    desert: {
        decorations: [
            { name: 'cactus', w: 64, h: 64, draw: drawCactus },
            { name: 'rock', w: 48, h: 48, draw: drawRock },
            { name: 'tireStack', w: 48, h: 48, draw: drawTireStack },
            { name: 'spectatorStand', w: 200, h: 48, draw: (ctx, cx, cy) => drawSpectatorStand(ctx, cx, cy, 200) },
            { name: 'bush', w: 32, h: 32, draw: drawBush },
        ],
    },
    arctic: {
        decorations: [
            { name: 'pine', w: 48, h: 64, draw: drawPine },
            { name: 'snowman', w: 32, h: 64, draw: drawSnowman },
            { name: 'rock', w: 48, h: 48, draw: drawRock },
            { name: 'tireStack', w: 48, h: 48, draw: drawTireStack },
            { name: 'spectatorStand', w: 160, h: 48, draw: (ctx, cx, cy) => drawSpectatorStand(ctx, cx, cy, 160) },
        ],
    },
    jungle: {
        decorations: [
            { name: 'palm', w: 64, h: 64, draw: drawPalm },
            { name: 'bush', w: 32, h: 32, draw: drawBush },
            { name: 'rock', w: 48, h: 48, draw: drawRock },
            { name: 'tireStack', w: 48, h: 48, draw: drawTireStack },
            { name: 'spectatorStand', w: 140, h: 48, draw: (ctx, cx, cy) => drawSpectatorStand(ctx, cx, cy, 140) },
        ],
    },
};

// --- Atlas generation ---

function generateThemeAtlas(themeName, theme) {
    const decos = theme.decorations;

    // Calculate sheet size: all frames in a single row
    const sheetW = decos.reduce((sum, d) => sum + d.w, 0);
    const sheetH = Math.max(...decos.map(d => d.h));

    const canvas = createCanvas(sheetW, sheetH);
    const ctx = canvas.getContext('2d');
    const frames = [];

    let offsetX = 0;
    for (const deco of decos) {
        // Center of the frame for drawing
        const cx = offsetX + deco.w / 2;
        const cy = sheetH / 2;

        // Draw the decoration
        ctx.save();
        deco.draw(ctx, cx, cy);
        ctx.restore();

        frames.push({
            name: deco.name,
            x: offsetX,
            y: 0,
            w: deco.w,
            h: sheetH,
        });

        offsetX += deco.w;
    }

    saveAtlas(canvas, 'decorations', themeName, frames);
}

// --- Main ---
console.log('Generating decoration atlases...');
for (const [name, theme] of Object.entries(THEMES)) {
    console.log(`  Theme: ${name}`);
    generateThemeAtlas(name, theme);
}
console.log('Done! Generated 3 decoration atlases.');
