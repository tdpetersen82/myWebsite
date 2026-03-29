#!/usr/bin/env node
/**
 * Generate vehicle spritesheets for Super Off Road.
 *
 * Output per vehicle: 64x64px frames, 24 rotation angles (15deg increments),
 * 4 state rows (normal, nitro, shield, spinout) = 96 frames per sheet.
 * 8 vehicles = 8 PNG spritesheets + 8 atlas JSONs.
 * Also generates a shadow sprite.
 */

const { createCanvas, saveAtlas, savePNG, hexToRGBA, darken, lighten } = require('./atlas-utils');

// Vehicle configs from config.js
const VEHICLES = [
    { name: 'Red Fury',       color: 0xFF3333, stripe: 0xFFFF00, accent: 0xCC0000 },
    { name: 'Blue Thunder',   color: 0x3388FF, stripe: 0xFFFFFF, accent: 0x0044CC },
    { name: 'Green Machine',  color: 0x33CC33, stripe: 0xFFFF00, accent: 0x009900 },
    { name: 'Purple Haze',    color: 0xAA33FF, stripe: 0xFF66FF, accent: 0x7700CC },
    { name: 'Orange Blaze',   color: 0xFF8833, stripe: 0xFFFFFF, accent: 0xCC5500 },
    { name: 'Cyan Storm',     color: 0x33CCCC, stripe: 0xFFFFFF, accent: 0x009999 },
    { name: 'Yellow Bolt',    color: 0xFFCC00, stripe: 0xFF3333, accent: 0xCC9900 },
    { name: 'Pink Panther',   color: 0xFF66AA, stripe: 0xFFFFFF, accent: 0xCC3377 },
];

const FRAME_SIZE = 64;
const NUM_ANGLES = 24;
const STATES = ['normal', 'nitro', 'shield', 'spinout'];
const SCALE = 1.35; // Scale factor for the vehicle drawing (bigger within 64x64 frame)

// Physics dimensions (original) - we draw at SCALE
const W = 28;  // VEHICLE_WIDTH
const L = 44;  // VEHICLE_LENGTH
const hw = W / 2;
const hl = L / 2;

/**
 * Draw a single vehicle frame onto the given context at center (cx, cy).
 * The vehicle is drawn pointing RIGHT (angle=0) and the canvas is pre-rotated.
 */
function drawVehicleBody(ctx, config, state) {
    const color = config.color;
    const stripe = config.stripe;
    const dark = darken(color, 0.3);
    const light = lighten(color, 0.2);

    ctx.save();
    ctx.scale(SCALE, SCALE);

    // === CAR BODY (tapered front) ===
    // Dark outline layer
    ctx.fillStyle = hexToRGBA(dark);
    ctx.beginPath();
    ctx.moveTo(-hl, -hw + 2);
    ctx.lineTo(-hl, hw - 2);
    ctx.lineTo(hl - 8, hw - 1);
    ctx.lineTo(hl - 2, hw * 0.6);
    ctx.lineTo(hl, 0);
    ctx.lineTo(hl - 2, -hw * 0.6);
    ctx.lineTo(hl - 8, -hw + 1);
    ctx.closePath();
    ctx.fill();

    // Main body fill (inset)
    ctx.fillStyle = hexToRGBA(color);
    ctx.beginPath();
    ctx.moveTo(-hl + 1, -hw + 3);
    ctx.lineTo(-hl + 1, hw - 3);
    ctx.lineTo(hl - 9, hw - 2);
    ctx.lineTo(hl - 3, hw * 0.55);
    ctx.lineTo(hl - 1, 0);
    ctx.lineTo(hl - 3, -hw * 0.55);
    ctx.lineTo(hl - 9, -hw + 2);
    ctx.closePath();
    ctx.fill();

    // Hood gradient (lighter upper half)
    ctx.fillStyle = hexToRGBA(light, 0.4);
    ctx.beginPath();
    ctx.moveTo(-hl + 6, -hw + 4);
    ctx.lineTo(hl - 10, -hw + 3);
    ctx.lineTo(hl - 4, -hw * 0.3);
    ctx.lineTo(hl - 4, 0);
    ctx.lineTo(-hl + 6, 0);
    ctx.closePath();
    ctx.fill();

    // Panel lines
    ctx.strokeStyle = hexToRGBA(dark, 0.5);
    ctx.lineWidth = 1;
    // Door line
    ctx.beginPath(); ctx.moveTo(-4, -hw + 3); ctx.lineTo(-4, hw - 3); ctx.stroke();
    // Hood/windshield line
    ctx.beginPath(); ctx.moveTo(hl - 16, -hw + 3); ctx.lineTo(hl - 16, hw - 3); ctx.stroke();
    // Trunk line
    ctx.beginPath(); ctx.moveTo(-hl + 8, -hw + 3); ctx.lineTo(-hl + 8, hw - 3); ctx.stroke();

    // Racing stripes
    ctx.fillStyle = hexToRGBA(stripe, 0.8);
    ctx.fillRect(-hl + 3, -3, L - 10, 2);
    ctx.fillRect(-hl + 3, 1, L - 10, 2);

    // Windshield
    ctx.fillStyle = hexToRGBA(0x1A3A5C, 0.85);
    ctx.beginPath();
    ctx.moveTo(hl - 16, -hw + 4);
    ctx.lineTo(hl - 10, -hw + 3);
    ctx.lineTo(hl - 6, -hw * 0.5);
    ctx.lineTo(hl - 6, hw * 0.5);
    ctx.lineTo(hl - 10, hw - 3);
    ctx.lineTo(hl - 16, hw - 4);
    ctx.closePath();
    ctx.fill();
    // Windshield reflection
    ctx.fillStyle = hexToRGBA(0x88CCEE, 0.25);
    ctx.beginPath();
    ctx.moveTo(hl - 15, -hw + 5);
    ctx.lineTo(hl - 11, -hw + 4);
    ctx.lineTo(hl - 9, -hw * 0.4);
    ctx.lineTo(hl - 13, 0);
    ctx.lineTo(hl - 15, 0);
    ctx.closePath();
    ctx.fill();

    // Rear window
    ctx.fillStyle = hexToRGBA(0x1A3A5C, 0.7);
    roundRect(ctx, -hl + 9, -hw + 5, 8, W - 10, 2);
    ctx.fill();

    // Driver silhouette
    ctx.fillStyle = hexToRGBA(0x0D1B2A, 0.6);
    ctx.beginPath(); ctx.arc(-8, 0, 4, 0, Math.PI * 2); ctx.fill();
    roundRect(ctx, -10, -3, 5, 6, 1);
    ctx.fill();

    // === WHEELS ===
    const wheelW = 9, wheelH = 5;
    const drawWheel = (wx, wy) => {
        ctx.fillStyle = hexToRGBA(0x111111);
        roundRect(ctx, wx - wheelW/2, wy - wheelH/2, wheelW, wheelH, 1.5);
        ctx.fill();
        ctx.fillStyle = hexToRGBA(0x333333);
        roundRect(ctx, wx - wheelW/2 + 1, wy - wheelH/2 + 0.5, wheelW - 2, wheelH - 1, 1);
        ctx.fill();
        // Hub cap
        ctx.fillStyle = hexToRGBA(0x555555);
        ctx.beginPath(); ctx.arc(wx, wy, 1.5, 0, Math.PI * 2); ctx.fill();
    };
    drawWheel(-hl + 8, -hw - 1.5);
    drawWheel(-hl + 8, hw + 1.5);
    drawWheel(hl - 13, -hw - 1.5);
    drawWheel(hl - 13, hw + 1.5);

    // === HEADLIGHTS ===
    ctx.fillStyle = hexToRGBA(0xFFFF99, 0.9);
    drawEllipse(ctx, hl - 3, -hw * 0.45, 4, 3);
    drawEllipse(ctx, hl - 3, hw * 0.45, 4, 3);
    // Headlight glow
    ctx.fillStyle = hexToRGBA(0xFFFF66, 0.15);
    drawEllipse(ctx, hl + 2, -hw * 0.45, 10, 6);
    drawEllipse(ctx, hl + 2, hw * 0.45, 10, 6);

    // === TAILLIGHTS ===
    ctx.fillStyle = hexToRGBA(0xFF0000);
    roundRect(ctx, -hl, -hw + 3, 3, 4, 1); ctx.fill();
    roundRect(ctx, -hl, hw - 7, 3, 4, 1); ctx.fill();
    // Taillight glow
    ctx.fillStyle = hexToRGBA(0xFF0000, 0.15);
    ctx.beginPath(); ctx.arc(-hl - 2, -hw + 5, 4, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(-hl - 2, hw - 5, 4, 0, Math.PI * 2); ctx.fill();

    // === CHROME BUMPER ===
    ctx.strokeStyle = hexToRGBA(0xCCCCCC, 0.7);
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(hl - 7, -hw + 2);
    ctx.lineTo(hl - 2, -hw * 0.55);
    ctx.lineTo(hl, 0);
    ctx.lineTo(hl - 2, hw * 0.55);
    ctx.lineTo(hl - 7, hw - 2);
    ctx.stroke();

    // === SIDE MIRRORS ===
    ctx.fillStyle = hexToRGBA(dark);
    ctx.beginPath(); ctx.arc(hl - 14, -hw - 2, 2, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(hl - 14, hw + 2, 2, 0, Math.PI * 2); ctx.fill();

    // === NUMBER ON ROOF ===
    ctx.fillStyle = hexToRGBA(0xFFFFFF, 0.7);
    ctx.beginPath(); ctx.arc(-2, 0, 5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = hexToRGBA(dark, 0.9);
    ctx.beginPath(); ctx.arc(-2, 0, 3.5, 0, Math.PI * 2); ctx.fill();

    // === EXHAUST PIPES ===
    ctx.fillStyle = hexToRGBA(0x444444);
    ctx.beginPath(); ctx.arc(-hl - 1, -hw * 0.3, 2, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(-hl - 1, hw * 0.3, 2, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = hexToRGBA(0x666666);
    ctx.beginPath(); ctx.arc(-hl - 1, -hw * 0.3, 1.2, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(-hl - 1, hw * 0.3, 1.2, 0, Math.PI * 2); ctx.fill();

    // === STATE-SPECIFIC OVERLAYS ===
    if (state === 'nitro') {
        // Orange/yellow exhaust glow behind car
        ctx.fillStyle = hexToRGBA(0xFF4400, 0.12);
        ctx.beginPath(); ctx.arc(-hl - 8, 0, 25, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = hexToRGBA(0xFF6600, 0.18);
        ctx.beginPath(); ctx.arc(-hl - 5, 0, 18, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = hexToRGBA(0xFF8800, 0.25);
        ctx.beginPath(); ctx.arc(-hl - 3, 0, 12, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = hexToRGBA(0xFFAA00, 0.35);
        ctx.beginPath(); ctx.arc(-hl - 1, 0, 6, 0, Math.PI * 2); ctx.fill();
        // Flame tongues
        ctx.fillStyle = hexToRGBA(0xFFCC00, 0.5);
        ctx.beginPath(); ctx.arc(-hl - 10, -2, 4, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(-hl - 12, 2, 3, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = hexToRGBA(0xFF6600, 0.4);
        ctx.beginPath(); ctx.arc(-hl - 14, 0, 5, 0, Math.PI * 2); ctx.fill();
    } else if (state === 'shield') {
        // Cyan shield bubble
        const r = hl + 8;
        ctx.strokeStyle = hexToRGBA(0x33CCFF, 0.5);
        ctx.lineWidth = 2 / SCALE;
        drawEllipse(ctx, 0, 0, r * 2, r * 1.4, true);
        ctx.strokeStyle = hexToRGBA(0x66DDFF, 0.3);
        ctx.lineWidth = 1 / SCALE;
        drawEllipse(ctx, 0, 0, r * 2.2, r * 1.55, true);
        ctx.fillStyle = hexToRGBA(0x33CCFF, 0.08);
        drawEllipse(ctx, 0, 0, r * 2, r * 1.4);
        // Hex lines
        for (let i = 0; i < 6; i++) {
            const a = (i / 6) * Math.PI * 2;
            ctx.strokeStyle = hexToRGBA(0x33CCFF, 0.2);
            ctx.lineWidth = 1 / SCALE;
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r * 0.7);
            ctx.stroke();
        }
    } else if (state === 'spinout') {
        // Red damage flash overlay
        ctx.fillStyle = hexToRGBA(0xFF0000, 0.15);
        ctx.beginPath();
        ctx.moveTo(-hl, -hw + 2);
        ctx.lineTo(-hl, hw - 2);
        ctx.lineTo(hl - 8, hw - 1);
        ctx.lineTo(hl - 2, hw * 0.6);
        ctx.lineTo(hl, 0);
        ctx.lineTo(hl - 2, -hw * 0.6);
        ctx.lineTo(hl - 8, -hw + 1);
        ctx.closePath();
        ctx.fill();
        // Spark marks
        ctx.fillStyle = hexToRGBA(0xFFFF00, 0.4);
        ctx.beginPath(); ctx.arc(hl - 5, -hw, 3, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(-hl + 3, hw - 1, 2.5, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = hexToRGBA(0xFFFFFF, 0.6);
        ctx.beginPath(); ctx.arc(hl - 5, -hw, 1.5, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(-hl + 3, hw - 1, 1.2, 0, Math.PI * 2); ctx.fill();
    }

    ctx.restore();
}

// Canvas helper: rounded rectangle
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

// Canvas helper: ellipse (fill or stroke)
function drawEllipse(ctx, cx, cy, w, h, strokeOnly) {
    ctx.beginPath();
    ctx.ellipse(cx, cy, w / 2, h / 2, 0, 0, Math.PI * 2);
    if (strokeOnly) ctx.stroke();
    else ctx.fill();
}

function generateVehicleSpritesheet(vehicleIndex, config) {
    const cols = NUM_ANGLES; // 24
    const rows = STATES.length; // 4
    const sheetW = cols * FRAME_SIZE;
    const sheetH = rows * FRAME_SIZE;
    const canvas = createCanvas(sheetW, sheetH);
    const ctx = canvas.getContext('2d');
    const frames = [];

    for (let row = 0; row < rows; row++) {
        const state = STATES[row];
        for (let col = 0; col < cols; col++) {
            const angle = (col / NUM_ANGLES) * Math.PI * 2;
            const fx = col * FRAME_SIZE;
            const fy = row * FRAME_SIZE;
            const cx = fx + FRAME_SIZE / 2;
            const cy = fy + FRAME_SIZE / 2;

            ctx.save();
            ctx.translate(cx, cy);
            ctx.rotate(angle);
            drawVehicleBody(ctx, config, state);
            ctx.restore();

            frames.push({
                name: `${state}_${col}`,
                x: fx, y: fy,
                w: FRAME_SIZE, h: FRAME_SIZE,
            });
        }
    }

    saveAtlas(canvas, 'vehicles', `vehicle_${vehicleIndex}`, frames);
}

function generateShadow() {
    const canvas = createCanvas(64, 64);
    const ctx = canvas.getContext('2d');
    // Draw shadow ellipse matching vehicle proportions
    ctx.fillStyle = hexToRGBA(0x000000, 0.2);
    ctx.beginPath();
    ctx.ellipse(32, 32, L * SCALE * 0.42, W * SCALE * 0.35, 0, 0, Math.PI * 2);
    ctx.fill();
    savePNG(canvas, 'vehicles', 'shadow.png');
}

// --- Main ---
console.log('Generating vehicle spritesheets...');
for (let i = 0; i < VEHICLES.length; i++) {
    console.log(`  Vehicle ${i}: ${VEHICLES[i].name}`);
    generateVehicleSpritesheet(i, VEHICLES[i]);
}
generateShadow();
console.log('Done! Generated 8 vehicle sheets + shadow.');
