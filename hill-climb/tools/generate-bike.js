/**
 * Generate dirt bike sprite sheet from hand-crafted SVG rendered to canvas.
 * Creates a realistic-looking dirt bike with rider at game scale.
 */

const { createCanvas, saveAtlas } = require('./atlas-utils');

const SHEET_W = 560;
const SHEET_H = 360;

// Render SVG string to canvas at specified position and size
function renderSVG(ctx, svgString, x, y, w, h) {
    // We'll use the canvas 2D API to trace the SVG paths manually
    // This gives us pixel-perfect control
}

function drawWheel(ctx, cx, cy, r) {
    // Thick outer tire with tread
    ctx.save();

    // Tire body
    ctx.fillStyle = '#1a1a1a';
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();

    // Tread pattern - alternating knobs
    for (let i = 0; i < 20; i++) {
        const a = (i / 20) * Math.PI * 2;
        const kx = cx + Math.cos(a) * (r - 1.5);
        const ky = cy + Math.sin(a) * (r - 1.5);
        ctx.fillStyle = i % 2 === 0 ? '#2d2d2d' : '#1a1a1a';
        ctx.beginPath();
        ctx.arc(kx, ky, 2.5, 0, Math.PI * 2);
        ctx.fill();
    }

    // Sidewall
    ctx.strokeStyle = '#2a2a2a';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(cx, cy, r - 4, 0, Math.PI * 2);
    ctx.stroke();

    // Rim outer
    ctx.fillStyle = '#4a4a4a';
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.5, 0, Math.PI * 2);
    ctx.fill();

    // Rim inner (shiny)
    ctx.fillStyle = '#999';
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.43, 0, Math.PI * 2);
    ctx.fill();

    // Spokes - cross-laced pattern
    ctx.strokeStyle = '#bbb';
    ctx.lineWidth = 0.6;
    for (let i = 0; i < 18; i++) {
        const a = (i / 18) * Math.PI * 2;
        const offset = (i % 2 === 0) ? 0.18 : -0.18;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(a) * 3, cy + Math.sin(a) * 3);
        ctx.lineTo(cx + Math.cos(a + offset) * (r * 0.42), cy + Math.sin(a + offset) * (r * 0.42));
        ctx.stroke();
    }

    // Hub
    ctx.fillStyle = '#666';
    ctx.beginPath();
    ctx.arc(cx, cy, 3.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#aaa';
    ctx.beginPath();
    ctx.arc(cx, cy, 1.8, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
}

function drawDirtBike(ctx, ox, oy, lean) {
    ctx.save();
    ctx.translate(ox, oy);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const L = lean;

    // ============ REAR SECTION ============

    // Chain
    ctx.strokeStyle = '#444';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-6, 14);
    ctx.lineTo(-30, 24);
    ctx.stroke();

    // Swingarm
    ctx.strokeStyle = '#666';
    ctx.lineWidth = 4.5;
    ctx.beginPath();
    ctx.moveTo(-4, 12);
    ctx.lineTo(-32, 24);
    ctx.stroke();
    // Swingarm highlight
    ctx.strokeStyle = '#888';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-4, 11);
    ctx.lineTo(-30, 22.5);
    ctx.stroke();

    // Rear shock
    ctx.strokeStyle = '#999';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(-10, -2);
    ctx.lineTo(-22, 16);
    ctx.stroke();
    // Spring
    ctx.strokeStyle = '#ddcc00';
    ctx.lineWidth = 1.8;
    const springSegs = 6;
    for (let i = 0; i < springSegs; i++) {
        const t1 = (i + 0.15) / springSegs;
        const t2 = (i + 0.85) / springSegs;
        const x1 = -10 + (-22 + 10) * t1;
        const y1 = -2 + (16 + 2) * t1;
        const x2 = -10 + (-22 + 10) * t2;
        const y2 = -2 + (16 + 2) * t2;
        const offset = (i % 2 === 0) ? 3 : -3;
        ctx.beginPath();
        ctx.moveTo(x1 + offset, y1);
        ctx.lineTo(x2 - offset, y2);
        ctx.stroke();
    }

    // ============ FRONT FORK ============

    // Outer fork tubes (upside-down fork)
    ctx.strokeStyle = '#888';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(30, -4);
    ctx.lineTo(36, 24);
    ctx.stroke();
    // Inner tubes (chrome, telescoping)
    ctx.strokeStyle = '#ddd';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(29, -8);
    ctx.lineTo(31, 6);
    ctx.stroke();
    // Fork brace
    ctx.strokeStyle = '#777';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(34, 14);
    ctx.lineTo(38, 14);
    ctx.stroke();

    // ============ FRAME ============

    // Main cradle frame (thicker, more visible)
    ctx.strokeStyle = '#cc2020';
    ctx.lineWidth = 5;
    // Head tube to bottom bracket
    ctx.beginPath();
    ctx.moveTo(28, -6);
    ctx.lineTo(4, 14);
    ctx.stroke();
    // Top tube
    ctx.beginPath();
    ctx.moveTo(-10, -12);
    ctx.lineTo(28, -8);
    ctx.stroke();
    // Seat tube
    ctx.beginPath();
    ctx.moveTo(4, 14);
    ctx.lineTo(-10, -12);
    ctx.stroke();
    // Subframe
    ctx.strokeStyle = '#aa1818';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-10, -12);
    ctx.lineTo(-24, -6);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-6, 10);
    ctx.lineTo(-22, -4);
    ctx.stroke();

    // Frame highlight
    ctx.strokeStyle = '#ee4040';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(-8, -12);
    ctx.lineTo(26, -8);
    ctx.stroke();

    // ============ ENGINE ============

    // Engine cases
    ctx.fillStyle = '#2a2a2a';
    ctx.beginPath();
    ctx.moveTo(-2, 3);
    ctx.lineTo(22, 1);
    ctx.lineTo(24, 17);
    ctx.lineTo(-2, 17);
    ctx.closePath();
    ctx.fill();

    // Cylinder + head
    ctx.fillStyle = '#383838';
    ctx.beginPath();
    ctx.moveTo(16, -2);
    ctx.lineTo(26, -3);
    ctx.lineTo(27, 8);
    ctx.lineTo(16, 8);
    ctx.closePath();
    ctx.fill();

    // Cooling fins
    ctx.strokeStyle = '#555';
    ctx.lineWidth = 0.8;
    for (let i = 0; i < 7; i++) {
        const fy = -1 + i * 1.5;
        ctx.beginPath();
        ctx.moveTo(15, fy);
        ctx.lineTo(28, fy - 0.5);
        ctx.stroke();
    }

    // Clutch cover (circle on engine)
    ctx.fillStyle = '#3a3a3a';
    ctx.beginPath();
    ctx.arc(10, 10, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#4a4a4a';
    ctx.lineWidth = 0.8;
    ctx.stroke();

    // Kick starter
    ctx.strokeStyle = '#555';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(18, 16);
    ctx.lineTo(24, 22);
    ctx.stroke();

    // ============ EXHAUST ============

    // Header pipe
    ctx.strokeStyle = '#8a7a60';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.moveTo(24, 10);
    ctx.quadraticCurveTo(30, 16, 34, 20);
    ctx.stroke();

    // Expansion chamber / silencer
    ctx.fillStyle = '#777';
    ctx.beginPath();
    ctx.moveTo(34, 17);
    ctx.lineTo(54, 16);
    ctx.quadraticCurveTo(56, 20, 54, 24);
    ctx.lineTo(34, 25);
    ctx.quadraticCurveTo(32, 21, 34, 17);
    ctx.closePath();
    ctx.fill();
    // Silencer highlight
    ctx.strokeStyle = '#999';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(36, 18);
    ctx.lineTo(52, 17);
    ctx.stroke();
    // End cap
    ctx.fillStyle = '#555';
    ctx.beginPath();
    ctx.ellipse(55, 20, 2, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    // Heat shield rivets
    ctx.fillStyle = '#888';
    ctx.beginPath(); ctx.arc(40, 20, 1, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(46, 20, 1, 0, Math.PI * 2); ctx.fill();

    // ============ FUEL TANK ============

    const tgrd = ctx.createLinearGradient(6, -22, 32, -4);
    tgrd.addColorStop(0, '#ff5050');
    tgrd.addColorStop(0.3, '#dd2020');
    tgrd.addColorStop(0.7, '#bb1515');
    tgrd.addColorStop(1, '#881010');
    ctx.fillStyle = tgrd;
    ctx.beginPath();
    ctx.moveTo(6, -12);
    ctx.quadraticCurveTo(12, -22, 24, -18);
    ctx.lineTo(30, -12);
    ctx.lineTo(30, -4);
    ctx.quadraticCurveTo(18, 0, 6, -6);
    ctx.closePath();
    ctx.fill();

    // Tank knee grip panels
    ctx.fillStyle = 'rgba(0,0,0,0.15)';
    ctx.beginPath();
    ctx.moveTo(8, -10);
    ctx.lineTo(14, -14);
    ctx.lineTo(14, -6);
    ctx.lineTo(8, -4);
    ctx.closePath();
    ctx.fill();

    // Tank highlight
    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(10, -14);
    ctx.quadraticCurveTo(16, -19, 22, -16);
    ctx.stroke();

    // Filler cap
    ctx.fillStyle = '#bbb';
    ctx.beginPath();
    ctx.arc(18, -14, 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#999';
    ctx.beginPath();
    ctx.arc(18, -14, 1.2, 0, Math.PI * 2);
    ctx.fill();

    // ============ SEAT ============

    ctx.fillStyle = '#0e0e0e';
    ctx.beginPath();
    ctx.moveTo(-22, -8);
    ctx.quadraticCurveTo(-14, -14, 8, -12);
    ctx.lineTo(8, -6);
    ctx.quadraticCurveTo(-14, -4, -22, -8);
    ctx.fill();
    // Seat texture
    ctx.strokeStyle = '#222';
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(-18, -8);
    ctx.lineTo(4, -9);
    ctx.stroke();
    // Gripper seat pattern
    ctx.strokeStyle = '#1a1a1a';
    ctx.lineWidth = 0.4;
    for (let i = 0; i < 8; i++) {
        const sx = -16 + i * 3;
        ctx.beginPath();
        ctx.moveTo(sx, -10);
        ctx.lineTo(sx, -6);
        ctx.stroke();
    }

    // ============ HANDLEBARS ============

    // Steering stem
    ctx.strokeStyle = '#555';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(28, -8);
    ctx.lineTo(34, -20);
    ctx.stroke();

    // Bar pad
    ctx.fillStyle = '#dd2020';
    ctx.beginPath();
    ctx.ellipse(34, -20, 4, 2.5, 0.3, 0, Math.PI * 2);
    ctx.fill();

    // Handlebars
    ctx.strokeStyle = '#444';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(30, -20);
    ctx.lineTo(42, -24);
    ctx.stroke();

    // Grips
    ctx.fillStyle = '#333';
    ctx.beginPath();
    ctx.ellipse(42.5, -24, 4, 2.5, 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#1a1a1a';
    ctx.beginPath();
    ctx.ellipse(43, -24.5, 2.5, 1.8, 0.3, 0, Math.PI * 2);
    ctx.fill();

    // Brake lever
    ctx.strokeStyle = '#999';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(42, -22);
    ctx.lineTo(46, -18);
    ctx.stroke();

    // ============ FENDERS ============

    // Front fender
    ctx.fillStyle = '#dd2020';
    ctx.beginPath();
    ctx.arc(36, 24, 22, -Math.PI * 0.78, -Math.PI * 0.22);
    ctx.lineTo(36 + Math.cos(-Math.PI * 0.22) * 19, 24 + Math.sin(-Math.PI * 0.22) * 19);
    ctx.arc(36, 24, 19, -Math.PI * 0.22, -Math.PI * 0.78, true);
    ctx.closePath();
    ctx.fill();

    // Rear fender
    ctx.fillStyle = '#dd2020';
    ctx.beginPath();
    ctx.arc(-32, 24, 22, -Math.PI * 0.78, -Math.PI * 0.18);
    ctx.lineTo(-32 + Math.cos(-Math.PI * 0.18) * 19, 24 + Math.sin(-Math.PI * 0.18) * 19);
    ctx.arc(-32, 24, 19, -Math.PI * 0.18, -Math.PI * 0.78, true);
    ctx.closePath();
    ctx.fill();

    // Tail light
    ctx.fillStyle = '#ff0000';
    ctx.beginPath();
    ctx.ellipse(-24, -4, 3, 2, -0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ff4444';
    ctx.beginPath();
    ctx.ellipse(-24, -4, 1.5, 1, -0.3, 0, Math.PI * 2);
    ctx.fill();

    // ============ HEADLIGHT / NUMBER PLATE ============

    // Number plate
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.moveTo(32, -2);
    ctx.lineTo(44, -4);
    ctx.lineTo(45, 8);
    ctx.lineTo(33, 10);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#cc2020';
    ctx.lineWidth = 1.2;
    ctx.stroke();
    ctx.fillStyle = '#111';
    ctx.font = 'bold 10px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('7', 38.5, 3);

    // Headlight
    ctx.fillStyle = '#ffee88';
    ctx.beginPath();
    ctx.ellipse(38, -8, 3.5, 4.5, 0.15, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffcc';
    ctx.beginPath();
    ctx.ellipse(38, -8, 1.8, 2.5, 0.15, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#666';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.ellipse(38, -8, 3.5, 4.5, 0.15, 0, Math.PI * 2);
    ctx.stroke();

    // ============ FOOT PEGS ============
    ctx.fillStyle = '#888';
    ctx.fillRect(-14, 17, 7, 2.5);
    ctx.fillRect(10, 17, 7, 2.5);
    // Peg teeth
    ctx.fillStyle = '#aaa';
    for (let i = 0; i < 3; i++) {
        ctx.fillRect(-13 + i * 2.5, 17, 1, 2.5);
        ctx.fillRect(11 + i * 2.5, 17, 1, 2.5);
    }

    // ============ RIDER ============

    const lx = L * 6;
    const la = L * 0.1;

    ctx.save();
    ctx.translate(lx * 0.3, -14);
    ctx.rotate(la);

    // -- LEGS --
    // Upper legs (riding pants)
    ctx.strokeStyle = '#1a1a2e';
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.moveTo(-3, 14);
    ctx.quadraticCurveTo(-12, 24, -18 + L * 3, 30);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(3, 14);
    ctx.quadraticCurveTo(12, 24, 16 + L * 2, 30);
    ctx.stroke();

    // Knee guards
    ctx.fillStyle = '#333';
    ctx.strokeStyle = '#444';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.ellipse(-12 + L * 2, 22, 4.5, 3.5, -0.2, 0, Math.PI * 2);
    ctx.fill(); ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(11 + L * 1.5, 22, 4.5, 3.5, 0.2, 0, Math.PI * 2);
    ctx.fill(); ctx.stroke();

    // MX Boots (tall, with buckles and sole)
    ctx.fillStyle = '#111';
    [-20 + L * 3, 18 + L * 2].forEach((bx, idx) => {
        const dir = idx === 0 ? -1 : 1;
        ctx.beginPath();
        ctx.moveTo(bx - 4, 28);
        ctx.lineTo(bx + 6, 28);
        ctx.lineTo(bx + 7, 35);
        ctx.lineTo(bx - 5, 35);
        ctx.closePath();
        ctx.fill();
        // Boot sole
        ctx.fillStyle = '#2a2a2a';
        ctx.fillRect(bx - 5, 34, 12, 2);
        ctx.fillStyle = '#111';
        // Buckles
        ctx.fillStyle = '#666';
        ctx.fillRect(bx - 2, 29.5, 5, 1.2);
        ctx.fillRect(bx - 2, 31.5, 5, 1.2);
        ctx.fillStyle = '#111';
    });

    // -- TORSO --
    // Jersey
    const jgrd = ctx.createLinearGradient(-12, -14, 12, 16);
    jgrd.addColorStop(0, '#3388ff');
    jgrd.addColorStop(0.3, '#2266dd');
    jgrd.addColorStop(0.7, '#1a55bb');
    jgrd.addColorStop(1, '#113399');
    ctx.fillStyle = jgrd;
    ctx.beginPath();
    ctx.moveTo(-11, -12);
    ctx.quadraticCurveTo(0, -14, 11, -12);
    ctx.lineTo(9, 16);
    ctx.lineTo(-9, 16);
    ctx.closePath();
    ctx.fill();

    // Shoulder seams
    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(-10, -11);
    ctx.lineTo(-10, -4);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(10, -11);
    ctx.lineTo(10, -4);
    ctx.stroke();

    // Side mesh panels
    ctx.fillStyle = 'rgba(0,0,0,0.1)';
    ctx.fillRect(-11, -6, 4, 16);
    ctx.fillRect(7, -6, 4, 16);

    // Center stripe
    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    ctx.fillRect(-1.5, -12, 3, 28);

    // Number
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 11px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('7', 0, 3);

    // Chest protector
    ctx.strokeStyle = 'rgba(255,255,255,0.2)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(-8, -10);
    ctx.lineTo(0, -5);
    ctx.lineTo(8, -10);
    ctx.stroke();

    // -- ARMS --
    const hbX = 42 + lx * 0.5 - lx * 0.3;
    const hbY = -24 + 14 + 8;

    // Upper arm
    ctx.strokeStyle = '#2266dd';
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.moveTo(8, -8);
    ctx.quadraticCurveTo(16 + lx * 0.2, -14, hbX * 0.45, hbY * 0.35);
    ctx.stroke();

    // Forearm
    ctx.strokeStyle = '#3388ff';
    ctx.lineWidth = 5.5;
    ctx.beginPath();
    ctx.moveTo(hbX * 0.38, hbY * 0.28);
    ctx.lineTo(hbX * 0.62, hbY * 0.52);
    ctx.stroke();

    // Elbow guard
    ctx.fillStyle = '#2a2a2a';
    ctx.strokeStyle = '#3a3a3a';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.ellipse(hbX * 0.33, hbY * 0.24, 4.5, 3, -0.5, 0, Math.PI * 2);
    ctx.fill(); ctx.stroke();

    // Gloves
    ctx.fillStyle = '#1a1a1a';
    ctx.beginPath();
    ctx.arc(hbX * 0.62, hbY * 0.52, 4.5, 0, Math.PI * 2);
    ctx.fill();
    // Glove knuckle guard
    ctx.fillStyle = '#333';
    ctx.beginPath();
    ctx.arc(hbX * 0.62, hbY * 0.5, 2.5, 0, Math.PI * 2);
    ctx.fill();

    // -- HELMET --
    const hx = lx * 0.1;
    const hy = -24;

    // Main shell
    const hgrd = ctx.createRadialGradient(hx - 3, hy - 4, 3, hx + 1, hy + 2, 18);
    hgrd.addColorStop(0, '#ff5555');
    hgrd.addColorStop(0.4, '#dd2222');
    hgrd.addColorStop(0.8, '#aa1515');
    hgrd.addColorStop(1, '#771010');
    ctx.fillStyle = hgrd;
    ctx.beginPath();
    ctx.ellipse(hx, hy, 14, 15.5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Chin bar
    ctx.fillStyle = '#881111';
    ctx.beginPath();
    ctx.moveTo(hx + 8, hy + 4);
    ctx.quadraticCurveTo(hx + 17, hy + 8, hx + 15, hy + 16);
    ctx.quadraticCurveTo(hx + 10, hy + 18, hx + 6, hy + 12);
    ctx.closePath();
    ctx.fill();

    // Mouth vent
    ctx.fillStyle = '#333';
    ctx.beginPath();
    ctx.ellipse(hx + 12, hy + 14, 3, 2, 0.2, 0, Math.PI * 2);
    ctx.fill();

    // Peak/visor brim
    ctx.fillStyle = '#991111';
    ctx.beginPath();
    ctx.moveTo(hx + 2, hy - 10);
    ctx.lineTo(hx + 22, hy - 5);
    ctx.lineTo(hx + 19, hy - 1);
    ctx.lineTo(hx + 3, hy - 5);
    ctx.closePath();
    ctx.fill();
    // Peak underside shadow
    ctx.fillStyle = '#661010';
    ctx.beginPath();
    ctx.moveTo(hx + 4, hy - 5);
    ctx.lineTo(hx + 18, hy - 2);
    ctx.lineTo(hx + 17, hy);
    ctx.lineTo(hx + 5, hy - 3);
    ctx.closePath();
    ctx.fill();

    // Racing stripes on shell
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.arc(hx, hy, 12.5, -Math.PI * 0.78, -Math.PI * 0.32);
    ctx.stroke();

    ctx.strokeStyle = '#2266dd';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(hx, hy, 10.5, -Math.PI * 0.72, -Math.PI * 0.38);
    ctx.stroke();

    // Goggles frame
    ctx.fillStyle = '#222';
    ctx.beginPath();
    ctx.moveTo(hx + 4, hy - 7);
    ctx.lineTo(hx + 17, hy - 3);
    ctx.lineTo(hx + 16, hy + 6);
    ctx.lineTo(hx + 4, hy + 4);
    ctx.closePath();
    ctx.fill();

    // Goggle lens
    ctx.fillStyle = '#22aadd';
    ctx.beginPath();
    ctx.moveTo(hx + 5.5, hy - 5.5);
    ctx.lineTo(hx + 15.5, hy - 2);
    ctx.lineTo(hx + 14.5, hy + 4.5);
    ctx.lineTo(hx + 5.5, hy + 2.5);
    ctx.closePath();
    ctx.fill();

    // Lens reflection
    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    ctx.beginPath();
    ctx.moveTo(hx + 6.5, hy - 4);
    ctx.lineTo(hx + 11, hy - 2.5);
    ctx.lineTo(hx + 10, hy + 0.5);
    ctx.lineTo(hx + 6.5, hy - 0.5);
    ctx.closePath();
    ctx.fill();

    // Goggle strap
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(hx, hy, 13, -Math.PI * 0.15, Math.PI * 0.25);
    ctx.stroke();

    // Helmet edge detail
    ctx.strokeStyle = '#661010';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.ellipse(hx, hy, 14, 15.5, 0, 0, Math.PI * 2);
    ctx.stroke();

    // Neck brace hint
    ctx.fillStyle = '#222';
    ctx.beginPath();
    ctx.ellipse(hx - 2, hy + 16, 8, 3, -0.1, 0, Math.PI);
    ctx.fill();

    ctx.restore(); // rider transform
    ctx.restore(); // main transform
}

function generate() {
    console.log('Generating bike sprites...');

    const canvas = createCanvas(SHEET_W, SHEET_H);
    const ctx = canvas.getContext('2d');
    const frames = [];

    const BIKE_W = 160;
    const BIKE_H = 120;

    // 3 lean states
    [
        { name: 'bike_lean_back', lean: -1 },
        { name: 'bike_neutral', lean: 0 },
        { name: 'bike_lean_forward', lean: 1 },
    ].forEach((state, i) => {
        const ox = 5 + i * (BIKE_W + 5);
        const oy = 5;
        ctx.save();
        ctx.translate(ox, oy);
        drawDirtBike(ctx, BIKE_W / 2, BIKE_H / 2 + 5, state.lean);
        ctx.restore();
        frames.push({ name: state.name, x: ox, y: oy, w: BIKE_W, h: BIKE_H });
    });

    // Wheels (4 rotation frames)
    const WHEEL_R = 22;
    const WHEEL_SIZE = WHEEL_R * 2 + 4;
    for (let i = 0; i < 4; i++) {
        const wx = 5 + i * (WHEEL_SIZE + 4);
        const wy = 130;
        ctx.save();
        ctx.translate(wx + WHEEL_SIZE / 2, wy + WHEEL_SIZE / 2);
        ctx.rotate((i / 4) * Math.PI * 2);
        ctx.translate(-WHEEL_SIZE / 2, -WHEEL_SIZE / 2);
        drawWheel(ctx, WHEEL_SIZE / 2, WHEEL_SIZE / 2, WHEEL_R);
        ctx.restore();
        frames.push({ name: `wheel_${i}`, x: wx, y: wy, w: WHEEL_SIZE, h: WHEEL_SIZE });
    }

    // Crash frame
    const CX = 5, CY = 190, CW = 160, CH = 110;
    ctx.save();
    ctx.translate(CX, CY);

    // Wrecked frame
    ctx.strokeStyle = '#cc2020';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(30, 35);
    ctx.lineTo(60, 28);
    ctx.lineTo(50, 50);
    ctx.stroke();

    // Exhaust piece
    ctx.fillStyle = '#777';
    ctx.beginPath();
    ctx.moveTo(80, 18);
    ctx.lineTo(110, 16);
    ctx.lineTo(112, 24);
    ctx.lineTo(80, 26);
    ctx.closePath();
    ctx.fill();

    // Loose wheel
    drawWheel(ctx, 130, 55, 18);

    // Tank
    ctx.fillStyle = '#dd2020';
    ctx.beginPath();
    ctx.ellipse(65, 55, 14, 8, 0.5, 0, Math.PI * 2);
    ctx.fill();

    // Tumbling rider
    ctx.fillStyle = '#cc2222';
    ctx.beginPath();
    ctx.arc(36, 55, 13, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#22aadd';
    ctx.beginPath();
    ctx.moveTo(44, 50);
    ctx.lineTo(50, 54);
    ctx.lineTo(48, 59);
    ctx.lineTo(42, 56);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#2266dd';
    ctx.fillRect(26, 68, 20, 22);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 9px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('7', 36, 80);

    ctx.strokeStyle = '#1a1a2e';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(28, 86);
    ctx.lineTo(18, 96);
    ctx.moveTo(44, 86);
    ctx.lineTo(52, 96);
    ctx.stroke();

    // Sparks
    ctx.fillStyle = '#ffdd00';
    for (let i = 0; i < 12; i++) {
        const sx = 45 + Math.random() * 75;
        const sy = 20 + Math.random() * 40;
        const sr = 1 + Math.random() * 2.5;
        ctx.beginPath();
        ctx.arc(sx, sy, sr, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.fillStyle = '#ff8800';
    for (let i = 0; i < 6; i++) {
        const sx = 50 + Math.random() * 60;
        const sy = 25 + Math.random() * 35;
        ctx.beginPath();
        ctx.arc(sx, sy, 1 + Math.random() * 1.5, 0, Math.PI * 2);
        ctx.fill();
    }

    ctx.restore();
    frames.push({ name: 'bike_crash', x: CX, y: CY, w: CW, h: CH });

    saveAtlas(canvas, 'bike', 'bike', frames);
    console.log('  Bike sprites complete!');
}

generate();
