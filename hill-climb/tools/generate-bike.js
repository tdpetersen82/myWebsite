/**
 * Generate dirt bike sprites: chassis with rider, wheels, crash frame.
 * Larger, cleaner sprites with proper proportions.
 */

const { createCanvas, saveAtlas, hexToCSS, darken, lighten } = require('./atlas-utils');

const SHEET_W = 512;
const SHEET_H = 512;

// Palette
const FRAME_RED = 0xCC2222;
const FRAME_RED_HI = 0xFF5544;
const FRAME_RED_DK = 0x881111;
const TANK_RED = 0xDD3333;
const METAL = 0x999999;
const METAL_DK = 0x666666;
const METAL_VDK = 0x444444;
const TIRE = 0x2A2A2A;
const TIRE_HI = 0x3A3A3A;
const RIM = 0x888888;
const RIM_HI = 0xBBBBBB;
const SPOKE = 0xAAAAAA;
const HUB = 0x777777;
const SEAT = 0x1A1A1A;
const RIDER_JERSEY = 0x2266DD;
const RIDER_JERSEY_HI = 0x4488FF;
const RIDER_PANTS = 0x2A3344;
const RIDER_BOOT = 0x1A1A1A;
const RIDER_SKIN = 0xDDAA77;
const HELMET = 0xDD3333;
const HELMET_HI = 0xFF6655;
const VISOR = 0x44CCFF;
const VISOR_HI = 0xAAEEFF;
const GLOVE = 0x1A1A1A;
const EXHAUST = 0x777777;
const EXHAUST_DK = 0x555555;

function drawWheel(ctx, cx, cy, r) {
    // Outer tire
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = hexToCSS(TIRE);
    ctx.fill();

    // Tread pattern - knobby dirt bike tire
    ctx.strokeStyle = hexToCSS(TIRE_HI);
    ctx.lineWidth = 2;
    for (let i = 0; i < 16; i++) {
        const a = (i / 16) * Math.PI * 2;
        const inner = r - 4;
        const outer = r - 1;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(a) * inner, cy + Math.sin(a) * inner);
        ctx.lineTo(cx + Math.cos(a + 0.08) * outer, cy + Math.sin(a + 0.08) * outer);
        ctx.stroke();
    }

    // Rim
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.58, 0, Math.PI * 2);
    ctx.fillStyle = hexToCSS(METAL_DK);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.52, 0, Math.PI * 2);
    ctx.fillStyle = hexToCSS(RIM);
    ctx.fill();

    // Spokes
    ctx.strokeStyle = hexToCSS(SPOKE);
    ctx.lineWidth = 1.2;
    for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(a) * 5, cy + Math.sin(a) * 5);
        ctx.lineTo(cx + Math.cos(a) * (r * 0.5), cy + Math.sin(a) * (r * 0.5));
        ctx.stroke();
    }

    // Hub
    ctx.beginPath();
    ctx.arc(cx, cy, 5, 0, Math.PI * 2);
    ctx.fillStyle = hexToCSS(HUB);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx, cy, 2.5, 0, Math.PI * 2);
    ctx.fillStyle = hexToCSS(RIM_HI);
    ctx.fill();
}

function drawBikeWithRider(ctx, ox, oy, lean) {
    // lean: -1=back, 0=neutral, 1=forward
    // Bike frame center reference point
    const bx = ox;
    const by = oy;

    // --- REAR SUSPENSION / SWINGARM ---
    ctx.strokeStyle = hexToCSS(METAL_DK);
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(bx - 5, by + 8);
    ctx.lineTo(bx - 32, by + 18);
    ctx.stroke();

    // Rear shock
    ctx.strokeStyle = hexToCSS(METAL);
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(bx - 10, by - 5);
    ctx.lineTo(bx - 22, by + 14);
    ctx.stroke();
    // Shock spring coils
    ctx.strokeStyle = hexToCSS(0xCCCC44);
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 4; i++) {
        const t = 0.2 + i * 0.2;
        const sx = bx - 10 + (-22 - -10) * t * 0.6;
        const sy = by - 5 + (14 - -5) * t * 0.5;
        ctx.beginPath();
        ctx.moveTo(sx - 3, sy);
        ctx.lineTo(sx + 3, sy + 2);
        ctx.stroke();
    }

    // --- FRONT FORK ---
    // Fork legs (double tube)
    ctx.strokeStyle = hexToCSS(METAL);
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.moveTo(bx + 34, by - 8);
    ctx.lineTo(bx + 38, by + 18);
    ctx.stroke();
    // Inner fork tube (chrome)
    ctx.strokeStyle = hexToCSS(RIM_HI);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(bx + 33, by - 12);
    ctx.lineTo(bx + 35, by + 2);
    ctx.stroke();

    // --- MAIN FRAME ---
    ctx.strokeStyle = hexToCSS(FRAME_RED);
    ctx.lineWidth = 5;
    ctx.lineJoin = 'round';

    // Down tube
    ctx.beginPath();
    ctx.moveTo(bx + 32, by - 10);
    ctx.lineTo(bx + 5, by + 10);
    ctx.stroke();
    // Top tube
    ctx.beginPath();
    ctx.moveTo(bx - 8, by - 15);
    ctx.lineTo(bx + 32, by - 12);
    ctx.stroke();
    // Seat tube
    ctx.beginPath();
    ctx.moveTo(bx + 5, by + 10);
    ctx.lineTo(bx - 8, by - 15);
    ctx.stroke();

    // Frame highlight
    ctx.strokeStyle = hexToCSS(FRAME_RED_HI);
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(bx + 30, by - 11);
    ctx.lineTo(bx + 7, by + 7);
    ctx.stroke();

    // --- ENGINE ---
    // Engine block
    ctx.fillStyle = hexToCSS(METAL_VDK);
    const ex = bx + 2, ey = by + 1;
    ctx.beginPath();
    ctx.moveTo(ex, ey);
    ctx.lineTo(ex + 22, ey - 2);
    ctx.lineTo(ex + 24, ey + 14);
    ctx.lineTo(ex - 2, ey + 14);
    ctx.closePath();
    ctx.fill();

    // Engine detail - cylinder head fins
    ctx.fillStyle = hexToCSS(METAL);
    for (let i = 0; i < 5; i++) {
        ctx.fillRect(ex + 1, ey + 1 + i * 2.8, 20, 1.5);
    }

    // Engine highlight
    ctx.fillStyle = hexToCSS(METAL_DK);
    ctx.fillRect(ex + 18, ey + 2, 5, 10);

    // --- EXHAUST ---
    ctx.strokeStyle = hexToCSS(EXHAUST);
    ctx.lineWidth = 4.5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(bx + 22, by + 12);
    ctx.quadraticCurveTo(bx + 32, by + 18, bx + 42, by + 20);
    ctx.stroke();
    // Exhaust highlight
    ctx.strokeStyle = hexToCSS(EXHAUST_DK);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(bx + 23, by + 13);
    ctx.quadraticCurveTo(bx + 32, by + 19, bx + 42, by + 21);
    ctx.stroke();
    // Exhaust tip
    ctx.fillStyle = hexToCSS(METAL_VDK);
    ctx.beginPath();
    ctx.ellipse(bx + 43, by + 20, 4, 3, 0.2, 0, Math.PI * 2);
    ctx.fill();

    // --- GAS TANK ---
    const tx = bx + 12, ty = by - 18;
    const tankGrd = ctx.createLinearGradient(tx, ty - 6, tx + 24, ty + 8);
    tankGrd.addColorStop(0, hexToCSS(FRAME_RED_HI));
    tankGrd.addColorStop(0.4, hexToCSS(TANK_RED));
    tankGrd.addColorStop(0.8, hexToCSS(FRAME_RED_DK));
    ctx.fillStyle = tankGrd;
    ctx.beginPath();
    ctx.moveTo(tx, ty);
    ctx.quadraticCurveTo(tx + 12, ty - 8, tx + 24, ty - 2);
    ctx.lineTo(tx + 24, ty + 6);
    ctx.quadraticCurveTo(tx + 12, ty + 10, tx, ty + 4);
    ctx.closePath();
    ctx.fill();
    // Tank cap
    ctx.fillStyle = hexToCSS(METAL);
    ctx.beginPath();
    ctx.arc(tx + 12, ty - 3, 3, 0, Math.PI * 2);
    ctx.fill();
    // Tank shine
    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(tx + 4, ty - 2);
    ctx.quadraticCurveTo(tx + 12, ty - 6, tx + 20, ty - 2);
    ctx.stroke();

    // --- SEAT ---
    ctx.fillStyle = hexToCSS(SEAT);
    ctx.beginPath();
    ctx.moveTo(bx - 12, by - 16);
    ctx.lineTo(bx + 12, by - 16);
    ctx.quadraticCurveTo(bx + 14, by - 14, bx + 12, by - 12);
    ctx.lineTo(bx - 14, by - 12);
    ctx.quadraticCurveTo(bx - 16, by - 14, bx - 12, by - 16);
    ctx.fill();
    // Seat stitch line
    ctx.strokeStyle = hexToCSS(0x333333);
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(bx - 10, by - 14);
    ctx.lineTo(bx + 10, by - 14);
    ctx.stroke();

    // --- HANDLEBARS ---
    ctx.strokeStyle = hexToCSS(METAL_VDK);
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(bx + 32, by - 12);
    ctx.lineTo(bx + 38, by - 24);
    ctx.stroke();
    // Crossbar
    ctx.strokeStyle = hexToCSS(METAL_DK);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(bx + 35, by - 22);
    ctx.lineTo(bx + 42, by - 24);
    ctx.stroke();
    // Grips
    ctx.fillStyle = hexToCSS(GLOVE);
    ctx.fillRect(bx + 40, by - 26, 5, 5);

    // --- FENDERS ---
    ctx.strokeStyle = hexToCSS(FRAME_RED);
    ctx.lineWidth = 3;
    // Front fender
    ctx.beginPath();
    ctx.arc(bx + 38, by + 18, 22, -Math.PI * 0.85, -Math.PI * 0.15);
    ctx.stroke();
    // Rear fender
    ctx.beginPath();
    ctx.arc(bx - 32, by + 18, 22, -Math.PI * 0.85, -Math.PI * 0.15);
    ctx.stroke();

    // --- NUMBER PLATE ---
    ctx.fillStyle = hexToCSS(0xFFFFFF);
    ctx.beginPath();
    ctx.ellipse(bx + 38, by - 4, 7, 9, 0.15, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = hexToCSS(FRAME_RED);
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = hexToCSS(0x222222);
    ctx.font = 'bold 10px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('7', bx + 38, by - 3);

    // ========== RIDER ==========
    const leanX = lean * 6;
    const leanAngle = lean * 0.12;
    const rx = bx + 2 + leanX * 0.3;
    const ry = by - 16;

    ctx.save();
    ctx.translate(rx, ry);
    ctx.rotate(leanAngle);

    // --- LEGS ---
    ctx.strokeStyle = hexToCSS(RIDER_PANTS);
    ctx.lineWidth = 7;
    ctx.lineCap = 'round';
    // Rear leg (to rear peg)
    ctx.beginPath();
    ctx.moveTo(-2, 12);
    ctx.quadraticCurveTo(-12, 22, -18 + lean * 3, 28);
    ctx.stroke();
    // Front leg (to front peg)
    ctx.beginPath();
    ctx.moveTo(2, 12);
    ctx.quadraticCurveTo(12, 22, 16 + lean * 2, 28);
    ctx.stroke();

    // Boots
    ctx.fillStyle = hexToCSS(RIDER_BOOT);
    // Rear boot
    ctx.beginPath();
    ctx.ellipse(-18 + lean * 3, 30, 6, 4, -0.2, 0, Math.PI * 2);
    ctx.fill();
    // Front boot
    ctx.beginPath();
    ctx.ellipse(16 + lean * 2, 30, 6, 4, 0.2, 0, Math.PI * 2);
    ctx.fill();

    // --- TORSO ---
    const jerseyGrd = ctx.createLinearGradient(-8, -14, 8, 14);
    jerseyGrd.addColorStop(0, hexToCSS(RIDER_JERSEY_HI));
    jerseyGrd.addColorStop(0.5, hexToCSS(RIDER_JERSEY));
    jerseyGrd.addColorStop(1, hexToCSS(darken(RIDER_JERSEY, 0.3)));
    ctx.fillStyle = jerseyGrd;
    ctx.beginPath();
    ctx.moveTo(-9, -10);
    ctx.lineTo(9, -10);
    ctx.lineTo(7, 14);
    ctx.lineTo(-7, 14);
    ctx.closePath();
    ctx.fill();

    // Jersey stripe
    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    ctx.fillRect(-1.5, -10, 3, 24);

    // Jersey number on back
    ctx.fillStyle = hexToCSS(0xFFFFFF);
    ctx.font = 'bold 8px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('7', 0, 4);

    // --- ARMS ---
    ctx.strokeStyle = hexToCSS(RIDER_JERSEY);
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    // Arms reaching to handlebars
    const handleX = 36 + leanX * 0.5 - rx + bx;
    const handleY = -24 - ry + by + 8;
    ctx.beginPath();
    ctx.moveTo(7, -6);
    ctx.quadraticCurveTo(16 + leanX * 0.3, -12, handleX * 0.7, handleY * 0.6);
    ctx.stroke();
    // Forearm (skin color at wrist)
    ctx.strokeStyle = hexToCSS(RIDER_SKIN);
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(handleX * 0.55, handleY * 0.45);
    ctx.lineTo(handleX * 0.7, handleY * 0.6);
    ctx.stroke();
    // Glove on handlebar
    ctx.fillStyle = hexToCSS(GLOVE);
    ctx.beginPath();
    ctx.arc(handleX * 0.7, handleY * 0.6, 4, 0, Math.PI * 2);
    ctx.fill();

    // --- HELMET ---
    const hx = 0 + leanX * 0.15;
    const hy = -20;

    // Main helmet shape
    const helmetGrd = ctx.createRadialGradient(hx - 2, hy - 3, 2, hx, hy, 14);
    helmetGrd.addColorStop(0, hexToCSS(HELMET_HI));
    helmetGrd.addColorStop(0.6, hexToCSS(HELMET));
    helmetGrd.addColorStop(1, hexToCSS(darken(HELMET, 0.3)));
    ctx.fillStyle = helmetGrd;
    ctx.beginPath();
    ctx.ellipse(hx, hy, 12, 13, 0, 0, Math.PI * 2);
    ctx.fill();

    // Helmet chin guard
    ctx.fillStyle = hexToCSS(darken(HELMET, 0.2));
    ctx.beginPath();
    ctx.moveTo(hx + 6, hy + 4);
    ctx.quadraticCurveTo(hx + 14, hy + 6, hx + 12, hy + 12);
    ctx.quadraticCurveTo(hx + 8, hy + 14, hx + 4, hy + 10);
    ctx.closePath();
    ctx.fill();

    // Helmet racing stripe
    ctx.strokeStyle = hexToCSS(0xFFFFFF);
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(hx, hy, 11, -Math.PI * 0.75, -Math.PI * 0.25);
    ctx.stroke();

    // Visor
    ctx.fillStyle = hexToCSS(VISOR);
    ctx.beginPath();
    ctx.moveTo(hx + 5, hy - 5);
    ctx.lineTo(hx + 13, hy - 1);
    ctx.lineTo(hx + 12, hy + 5);
    ctx.lineTo(hx + 5, hy + 3);
    ctx.closePath();
    ctx.fill();
    // Visor glare
    ctx.fillStyle = hexToCSS(VISOR_HI);
    ctx.globalAlpha = 0.5;
    ctx.beginPath();
    ctx.moveTo(hx + 6, hy - 3);
    ctx.lineTo(hx + 10, hy - 2);
    ctx.lineTo(hx + 9, hy + 1);
    ctx.lineTo(hx + 6, hy);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 1;

    // Helmet edge
    ctx.strokeStyle = hexToCSS(darken(HELMET, 0.4));
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.ellipse(hx, hy, 12, 13, 0, 0, Math.PI * 2);
    ctx.stroke();

    ctx.restore();
}

function generate() {
    console.log('Generating bike sprites...');

    const canvas = createCanvas(SHEET_W, SHEET_H);
    const ctx = canvas.getContext('2d');
    const frames = [];

    const BIKE_W = 120;
    const BIKE_H = 90;

    // --- Bike + rider in 3 lean states ---
    const leanStates = [
        { name: 'bike_lean_back', lean: -1 },
        { name: 'bike_neutral', lean: 0 },
        { name: 'bike_lean_forward', lean: 1 },
    ];

    leanStates.forEach((state, i) => {
        const ox = 5 + i * (BIKE_W + 5);
        const oy = 5;

        ctx.save();
        ctx.translate(ox, oy);
        drawBikeWithRider(ctx, BIKE_W / 2, BIKE_H / 2 + 5, state.lean);
        ctx.restore();

        frames.push({ name: state.name, x: ox, y: oy, w: BIKE_W, h: BIKE_H });
    });

    // --- Standalone wheel ---
    const WHEEL_R = 20;
    const WHEEL_SIZE = WHEEL_R * 2 + 4;
    for (let i = 0; i < 4; i++) {
        const wx = 5 + i * (WHEEL_SIZE + 4);
        const wy = 100;

        ctx.save();
        ctx.translate(wx, wy);
        // Rotate canvas for spoke variation
        ctx.translate(WHEEL_SIZE / 2, WHEEL_SIZE / 2);
        ctx.rotate((i / 4) * Math.PI * 2);
        ctx.translate(-WHEEL_SIZE / 2, -WHEEL_SIZE / 2);
        drawWheel(ctx, WHEEL_SIZE / 2, WHEEL_SIZE / 2, WHEEL_R);
        ctx.restore();

        frames.push({ name: `wheel_${i}`, x: wx, y: wy, w: WHEEL_SIZE, h: WHEEL_SIZE });
    }

    // --- Crash frame ---
    const CX = 5, CY = 150, CW = 140, CH = 90;
    ctx.save();
    ctx.translate(CX, CY);

    // Scattered bike frame pieces
    ctx.strokeStyle = hexToCSS(FRAME_RED);
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(20, 30);
    ctx.lineTo(50, 20);
    ctx.lineTo(40, 45);
    ctx.stroke();

    // Detached exhaust
    ctx.strokeStyle = hexToCSS(EXHAUST);
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(70, 15);
    ctx.lineTo(100, 10);
    ctx.stroke();

    // Wheel bouncing away
    drawWheel(ctx, 110, 55, 16);

    // Gas tank
    ctx.fillStyle = hexToCSS(TANK_RED);
    ctx.beginPath();
    ctx.ellipse(55, 55, 12, 7, 0.4, 0, Math.PI * 2);
    ctx.fill();

    // Rider tumbling
    ctx.fillStyle = hexToCSS(HELMET);
    ctx.beginPath();
    ctx.arc(30, 55, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = hexToCSS(VISOR);
    ctx.beginPath();
    ctx.moveTo(35, 50);
    ctx.lineTo(40, 53);
    ctx.lineTo(38, 57);
    ctx.lineTo(34, 55);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = hexToCSS(RIDER_JERSEY);
    ctx.fillRect(22, 64, 16, 20);
    // Arms/legs
    ctx.strokeStyle = hexToCSS(RIDER_PANTS);
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(25, 80);
    ctx.lineTo(15, 88);
    ctx.moveTo(35, 80);
    ctx.lineTo(42, 88);
    ctx.stroke();

    // Spark particles
    ctx.fillStyle = hexToCSS(0xFFDD00);
    for (let i = 0; i < 6; i++) {
        const sx = 40 + Math.random() * 60;
        const sy = 25 + Math.random() * 30;
        ctx.beginPath();
        ctx.arc(sx, sy, 1.5 + Math.random() * 2, 0, Math.PI * 2);
        ctx.fill();
    }

    ctx.restore();
    frames.push({ name: 'bike_crash', x: CX, y: CY, w: CW, h: CH });

    saveAtlas(canvas, 'bike', 'bike', frames);
    console.log('  Bike sprites complete!');
}

generate();
