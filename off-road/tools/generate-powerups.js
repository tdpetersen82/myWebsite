#!/usr/bin/env node
/**
 * Generate power-up animation atlas for Super Off Road.
 *
 * 6 power-up types x 4 animation frames = 24 frames at 48x48 each.
 * Laid out in a 4-column x 6-row grid.
 *
 * Output: assets/powerups/powerups.png + powerups.json
 */

const { createCanvas, saveAtlas, hexToRGBA, darken, lighten } = require('./atlas-utils');

const FRAME_SIZE = 48;
const COLS = 4;   // 4 animation frames per type
const ROWS = 6;   // 6 power-up types

const POWERUPS = [
    { name: 'nitro',       color: 0xFF6600, icon: 'flame' },
    { name: 'missile',     color: 0xFF0000, icon: 'crosshair' },
    { name: 'oil_slick',   color: 0x333333, icon: 'drop' },
    { name: 'shield',      color: 0x33CCFF, icon: 'hexagon' },
    { name: 'speed_boost', color: 0xFFFF00, icon: 'lightning' },
    { name: 'cash',        color: 0xFFCC00, icon: 'coin' },
];

// ── Drawing helpers ──────────────────────────────────────────────────

function drawGlowHalo(ctx, cx, cy, color, brightness) {
    // 3 concentric glow circles
    const radii = [20, 15, 10];
    const alphas = [0.1, 0.15, 0.25];
    for (let i = 0; i < 3; i++) {
        const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, radii[i] * brightness);
        grad.addColorStop(0, hexToRGBA(color, alphas[i] * brightness));
        grad.addColorStop(1, hexToRGBA(color, 0));
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(cx, cy, radii[i] * brightness, 0, Math.PI * 2);
        ctx.fill();
    }
}

function drawSparkle(ctx, x, y, size) {
    // 4-pointed star sparkle
    ctx.fillStyle = hexToRGBA(0xFFFFFF, 0.9);
    ctx.beginPath();
    ctx.moveTo(x, y - size);
    ctx.lineTo(x + size * 0.25, y - size * 0.25);
    ctx.lineTo(x + size, y);
    ctx.lineTo(x + size * 0.25, y + size * 0.25);
    ctx.lineTo(x, y + size);
    ctx.lineTo(x - size * 0.25, y + size * 0.25);
    ctx.lineTo(x - size, y);
    ctx.lineTo(x - size * 0.25, y - size * 0.25);
    ctx.closePath();
    ctx.fill();

    // Bright center dot
    ctx.fillStyle = hexToRGBA(0xFFFFFF, 1.0);
    ctx.beginPath();
    ctx.arc(x, y, size * 0.2, 0, Math.PI * 2);
    ctx.fill();
}

// ── Icon drawing functions ───────────────────────────────────────────

function drawFlameIcon(ctx, cx, cy, color) {
    const light = lighten(color, 0.3);
    const dark = darken(color, 0.2);

    // Outer flame shape
    ctx.fillStyle = hexToRGBA(color, 0.9);
    ctx.beginPath();
    ctx.moveTo(cx, cy - 12);
    ctx.quadraticCurveTo(cx + 7, cy - 6, cx + 6, cy + 2);
    ctx.quadraticCurveTo(cx + 5, cy + 8, cx, cy + 10);
    ctx.quadraticCurveTo(cx - 5, cy + 8, cx - 6, cy + 2);
    ctx.quadraticCurveTo(cx - 7, cy - 6, cx, cy - 12);
    ctx.fill();

    // Inner bright flame
    ctx.fillStyle = hexToRGBA(light, 0.9);
    ctx.beginPath();
    ctx.moveTo(cx, cy - 7);
    ctx.quadraticCurveTo(cx + 4, cy - 2, cx + 3, cy + 3);
    ctx.quadraticCurveTo(cx + 2, cy + 7, cx, cy + 8);
    ctx.quadraticCurveTo(cx - 2, cy + 7, cx - 3, cy + 3);
    ctx.quadraticCurveTo(cx - 4, cy - 2, cx, cy - 7);
    ctx.fill();

    // Bright yellow core
    ctx.fillStyle = hexToRGBA(0xFFFF88, 0.8);
    ctx.beginPath();
    ctx.ellipse(cx, cy + 2, 2, 4, 0, 0, Math.PI * 2);
    ctx.fill();
}

function drawCrosshairIcon(ctx, cx, cy, color) {
    const radius = 9;

    // Outer circle
    ctx.strokeStyle = hexToRGBA(color, 0.9);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.stroke();

    // Cross lines
    ctx.beginPath();
    ctx.moveTo(cx - radius - 2, cy);
    ctx.lineTo(cx - 3, cy);
    ctx.moveTo(cx + 3, cy);
    ctx.lineTo(cx + radius + 2, cy);
    ctx.moveTo(cx, cy - radius - 2);
    ctx.lineTo(cx, cy - 3);
    ctx.moveTo(cx, cy + 3);
    ctx.lineTo(cx, cy + radius + 2);
    ctx.stroke();

    // Center dot
    ctx.fillStyle = hexToRGBA(color, 1.0);
    ctx.beginPath();
    ctx.arc(cx, cy, 2.5, 0, Math.PI * 2);
    ctx.fill();
}

function drawDropIcon(ctx, cx, cy, color) {
    const light = lighten(color, 0.4);

    // Teardrop shape
    ctx.fillStyle = hexToRGBA(color, 0.9);
    ctx.beginPath();
    ctx.moveTo(cx, cy - 12);
    ctx.quadraticCurveTo(cx + 9, cy, cx + 8, cy + 5);
    ctx.quadraticCurveTo(cx + 6, cy + 11, cx, cy + 11);
    ctx.quadraticCurveTo(cx - 6, cy + 11, cx - 8, cy + 5);
    ctx.quadraticCurveTo(cx - 9, cy, cx, cy - 12);
    ctx.fill();

    // Highlight
    ctx.fillStyle = hexToRGBA(light, 0.5);
    ctx.beginPath();
    ctx.ellipse(cx - 2, cy + 1, 3, 5, -0.3, 0, Math.PI * 2);
    ctx.fill();
}

function drawHexagonIcon(ctx, cx, cy, color) {
    const light = lighten(color, 0.2);
    const radius = 10;

    // Filled hexagon
    ctx.fillStyle = hexToRGBA(color, 0.3);
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
        const angle = (i / 6) * Math.PI * 2 - Math.PI / 2;
        const x = cx + Math.cos(angle) * radius;
        const y = cy + Math.sin(angle) * radius;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();

    // Hexagon outline
    ctx.strokeStyle = hexToRGBA(color, 0.9);
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
        const angle = (i / 6) * Math.PI * 2 - Math.PI / 2;
        const x = cx + Math.cos(angle) * radius;
        const y = cy + Math.sin(angle) * radius;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.stroke();

    // Inner glow
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius * 0.7);
    grad.addColorStop(0, hexToRGBA(light, 0.4));
    grad.addColorStop(1, hexToRGBA(color, 0));
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, cy, radius * 0.7, 0, Math.PI * 2);
    ctx.fill();
}

function drawLightningIcon(ctx, cx, cy, color) {
    const dark = darken(color, 0.2);

    // Classic zigzag lightning bolt
    ctx.fillStyle = hexToRGBA(color, 1.0);
    ctx.beginPath();
    ctx.moveTo(cx + 1, cy - 13);
    ctx.lineTo(cx + 5, cy - 13);
    ctx.lineTo(cx + 1, cy - 2);
    ctx.lineTo(cx + 6, cy - 2);
    ctx.lineTo(cx - 2, cy + 13);
    ctx.lineTo(cx, cy + 3);
    ctx.lineTo(cx - 5, cy + 3);
    ctx.closePath();
    ctx.fill();

    // Dark outline for definition
    ctx.strokeStyle = hexToRGBA(dark, 0.6);
    ctx.lineWidth = 1;
    ctx.stroke();

    // Bright highlight stripe
    ctx.fillStyle = hexToRGBA(0xFFFFFF, 0.4);
    ctx.beginPath();
    ctx.moveTo(cx + 2, cy - 12);
    ctx.lineTo(cx + 4, cy - 12);
    ctx.lineTo(cx + 1, cy - 3);
    ctx.lineTo(cx + 3, cy - 3);
    ctx.lineTo(cx - 1, cy + 6);
    ctx.lineTo(cx, cy + 2);
    ctx.lineTo(cx - 2, cy + 2);
    ctx.closePath();
    ctx.fill();
}

function drawCoinIcon(ctx, cx, cy, color) {
    const light = lighten(color, 0.3);
    const dark = darken(color, 0.3);

    // Outer circle (coin body)
    ctx.fillStyle = hexToRGBA(color, 1.0);
    ctx.beginPath();
    ctx.arc(cx, cy, 10, 0, Math.PI * 2);
    ctx.fill();

    // Edge ring
    ctx.strokeStyle = hexToRGBA(dark, 0.7);
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(cx, cy, 10, 0, Math.PI * 2);
    ctx.stroke();

    // Inner circle
    ctx.strokeStyle = hexToRGBA(dark, 0.5);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(cx, cy, 7, 0, Math.PI * 2);
    ctx.stroke();

    // $ symbol
    ctx.fillStyle = hexToRGBA(dark, 0.8);
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('$', cx, cy + 1);

    // Highlight arc
    ctx.strokeStyle = hexToRGBA(light, 0.5);
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(cx, cy, 8, -2.2, -0.8);
    ctx.stroke();
}

const ICON_DRAWERS = {
    flame: drawFlameIcon,
    crosshair: drawCrosshairIcon,
    drop: drawDropIcon,
    hexagon: drawHexagonIcon,
    lightning: drawLightningIcon,
    coin: drawCoinIcon,
};

// ── Frame rendering ──────────────────────────────────────────────────

function drawPowerupFrame(ctx, cx, cy, powerup, frameIndex) {
    const { color, icon } = powerup;
    const drawIcon = ICON_DRAWERS[icon];

    // Determine glow brightness based on frame
    // Frame 0: base glow, Frame 1: sparkle top-right, Frame 2: brighter, Frame 3: sparkle bottom-left
    const brightness = frameIndex === 2 ? 1.3 : 1.0;

    // Background glow halo
    drawGlowHalo(ctx, cx, cy, color, brightness);

    // Glow ring
    ctx.strokeStyle = hexToRGBA(color, 0.25 * brightness);
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(cx, cy, 18 * brightness, 0, Math.PI * 2);
    ctx.stroke();

    // Draw the icon
    drawIcon(ctx, cx, cy, color);

    // Sparkle effects based on frame
    if (frameIndex === 1) {
        drawSparkle(ctx, cx + 12, cy - 12, 4);
    } else if (frameIndex === 3) {
        drawSparkle(ctx, cx - 11, cy + 11, 3.5);
    }
}

// ── Main ─────────────────────────────────────────────────────────────

function generate() {
    console.log('Generating power-up atlas...');

    const sheetW = COLS * FRAME_SIZE;
    const sheetH = ROWS * FRAME_SIZE;
    const canvas = createCanvas(sheetW, sheetH);
    const ctx = canvas.getContext('2d');
    const frames = [];

    for (let row = 0; row < ROWS; row++) {
        const powerup = POWERUPS[row];
        for (let col = 0; col < COLS; col++) {
            const fx = col * FRAME_SIZE;
            const fy = row * FRAME_SIZE;
            const cx = fx + FRAME_SIZE / 2;
            const cy = fy + FRAME_SIZE / 2;

            ctx.save();
            drawPowerupFrame(ctx, cx, cy, powerup, col);
            ctx.restore();

            frames.push({
                name: `${powerup.name}_${col}`,
                x: fx, y: fy,
                w: FRAME_SIZE, h: FRAME_SIZE,
            });
        }
    }

    saveAtlas(canvas, 'powerups', 'powerups', frames);
    console.log(`Done! Generated ${frames.length} power-up frames.`);
}

generate();
