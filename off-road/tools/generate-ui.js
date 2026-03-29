#!/usr/bin/env node
/**
 * Generate UI / HUD sprite atlas for Super Off Road.
 *
 * Output: assets/ui/ui.png + ui.json (Phaser 3 atlas)
 *
 * Sprites packed:
 *   nitro_bar_frame (200x24), nitro_bar_fill (192x18),
 *   position_badge_1..3 (40x40), minimap_frame (168x118),
 *   powerup_slot (48x48), countdown_3/2/1/go (128x128),
 *   checkered_flag (256x64), wrong_way_arrow (64x32),
 *   speed_gauge_bg (80x80)
 */

const {
    createCanvas, saveAtlas, hexToRGBA, hexToCSS, darken, lighten,
} = require('./atlas-utils');

// ─── Layout plan ────────────────────────────────────────────────────
// Row 0 (y=0):   nitro_bar_frame 200x24, nitro_bar_fill 192x18
// Row 1 (y=26):  position badges 3x40x40, powerup_slot 48x48, speed_gauge 80x80
// Row 2 (y=76):  minimap_frame 168x118, wrong_way_arrow 64x32
// Row 3 (y=196): countdown x4 (128x128 each) = 512 wide
// Row 4 (y=326): checkered_flag 256x64
// Atlas size: 512 x 392

const ATLAS_W = 512;
const ATLAS_H = 392;

const canvas = createCanvas(ATLAS_W, ATLAS_H);
const ctx = canvas.getContext('2d');

const frames = [];

function addFrame(name, x, y, w, h) {
    frames.push({ name, x, y, w: w, h: h });
}

// ─── Helper: rounded rect path ─────────────────────────────────────
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

// ═══════════════════════════════════════════════════════════════════
// 1. NITRO BAR FRAME (200x24)
// ═══════════════════════════════════════════════════════════════════
{
    const x = 0, y = 0, w = 200, h = 24;
    addFrame('nitro_bar_frame', x, y, w, h);

    // Dark background
    roundRect(ctx, x, y, w, h, h / 2);
    ctx.fillStyle = hexToCSS(0x111122);
    ctx.fill();

    // Metallic border gradient
    const grad = ctx.createLinearGradient(x, y, x, y + h);
    grad.addColorStop(0, hexToCSS(0x444466));
    grad.addColorStop(0.5, hexToCSS(0x555577));
    grad.addColorStop(1, hexToCSS(0x222244));
    roundRect(ctx, x, y, w, h, h / 2);
    ctx.lineWidth = 2;
    ctx.strokeStyle = grad;
    ctx.stroke();

    // Inner track (slightly inset)
    roundRect(ctx, x + 4, y + 3, w - 8, h - 6, (h - 6) / 2);
    ctx.fillStyle = hexToRGBA(0x000011, 0.6);
    ctx.fill();
}

// ═══════════════════════════════════════════════════════════════════
// 2. NITRO BAR FILL (192x18)
// ═══════════════════════════════════════════════════════════════════
{
    const x = 202, y = 0, w = 192, h = 18;
    addFrame('nitro_bar_fill', x, y, w, h);

    // Green -> Yellow -> Red-orange gradient
    const grad = ctx.createLinearGradient(x, y, x + w, y);
    grad.addColorStop(0.0, hexToCSS(0x00FF44));
    grad.addColorStop(0.5, hexToCSS(0xFFFF00));
    grad.addColorStop(1.0, hexToCSS(0xFF4400));

    roundRect(ctx, x, y, w, h, h / 2);
    ctx.fillStyle = grad;
    ctx.fill();

    // Glossy white highlight along top
    const hlGrad = ctx.createLinearGradient(x, y, x, y + h * 0.5);
    hlGrad.addColorStop(0, 'rgba(255,255,255,0.55)');
    hlGrad.addColorStop(1, 'rgba(255,255,255,0)');
    roundRect(ctx, x + 2, y + 1, w - 4, h * 0.45, h * 0.2);
    ctx.fillStyle = hlGrad;
    ctx.fill();
}

// ═══════════════════════════════════════════════════════════════════
// 3. POSITION BADGES 1-3 (40x40 each)
// ═══════════════════════════════════════════════════════════════════
{
    const badges = [
        { num: '1', color: 0xFFCC00, border: 0xAA8800, name: 'position_badge_1' },
        { num: '2', color: 0xCCCCCC, border: 0x888888, name: 'position_badge_2' },
        { num: '3', color: 0xCD7F32, border: 0x8B5A1B, name: 'position_badge_3' },
    ];

    badges.forEach((b, i) => {
        const bx = i * 44, by = 26, sz = 40;
        addFrame(b.name, bx, by, sz, sz);

        const cx = bx + sz / 2, cy = by + sz / 2, r = sz / 2 - 1;

        // Outer circle (border)
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fillStyle = hexToCSS(b.border);
        ctx.fill();

        // Inner circle with metallic gradient
        const grad = ctx.createRadialGradient(cx - 4, cy - 4, 2, cx, cy, r - 2);
        grad.addColorStop(0, hexToCSS(lighten(b.color, 0.3)));
        grad.addColorStop(0.6, hexToCSS(b.color));
        grad.addColorStop(1, hexToCSS(darken(b.color, 0.3)));
        ctx.beginPath();
        ctx.arc(cx, cy, r - 2, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();

        // Number in dark text
        ctx.fillStyle = hexToCSS(0x111111);
        ctx.font = 'bold 22px Arial, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(b.num, cx, cy + 1);
    });
}

// ═══════════════════════════════════════════════════════════════════
// 4. MINIMAP FRAME (168x118)
// ═══════════════════════════════════════════════════════════════════
{
    const x = 0, y = 76, w = 168, h = 118;
    addFrame('minimap_frame', x, y, w, h);

    // Dark panel background
    roundRect(ctx, x, y, w, h, 6);
    ctx.fillStyle = hexToRGBA(0x0D0D1A, 0.85);
    ctx.fill();

    // Subtle blue border
    roundRect(ctx, x, y, w, h, 6);
    ctx.lineWidth = 1;
    ctx.strokeStyle = hexToRGBA(0x3388FF, 0.8);
    ctx.stroke();
}

// ═══════════════════════════════════════════════════════════════════
// 5. POWERUP SLOT (48x48)
// ═══════════════════════════════════════════════════════════════════
{
    const x = 134, y = 26, w = 48, h = 48;
    addFrame('powerup_slot', x, y, w, h);

    const cx = x + w / 2, cy = y + h / 2;

    // Rounded rect frame
    roundRect(ctx, x + 2, y + 2, w - 4, h - 4, 8);
    ctx.fillStyle = hexToRGBA(0x0A0A18, 0.9);
    ctx.fill();

    // Glowing orange border
    ctx.shadowColor = hexToCSS(0xFF6600);
    ctx.shadowBlur = 6;
    roundRect(ctx, x + 2, y + 2, w - 4, h - 4, 8);
    ctx.lineWidth = 2;
    ctx.strokeStyle = hexToCSS(0xFF6600);
    ctx.stroke();
    ctx.shadowBlur = 0;
}

// ═══════════════════════════════════════════════════════════════════
// 6. COUNTDOWN 3, 2, 1, GO! (128x128 each)
// ═══════════════════════════════════════════════════════════════════
{
    const items = [
        { text: '3', color: '#FFFFFF', outline: '#FF6600', name: 'countdown_3' },
        { text: '2', color: '#FFFFFF', outline: '#FF6600', name: 'countdown_2' },
        { text: '1', color: '#FFFFFF', outline: '#FF6600', name: 'countdown_1' },
        { text: 'GO!', color: '#00FF44', outline: '#FFFFFF', name: 'countdown_go' },
    ];

    items.forEach((item, i) => {
        const ix = i * 128, iy = 196, sz = 128;
        addFrame(item.name, ix, iy, sz, sz);

        const cx = ix + sz / 2, cy = iy + sz / 2;

        // Glow behind text
        ctx.save();
        ctx.shadowColor = item.outline;
        ctx.shadowBlur = 12;

        ctx.font = 'bold 80px Arial, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Outline (draw stroke multiple times for thickness)
        ctx.lineWidth = 6;
        ctx.strokeStyle = item.outline;
        ctx.strokeText(item.text, cx, cy);

        // Fill
        ctx.fillStyle = item.color;
        ctx.fillText(item.text, cx, cy);

        ctx.restore();
    });
}

// ═══════════════════════════════════════════════════════════════════
// 7. CHECKERED FLAG (256x64)
// ═══════════════════════════════════════════════════════════════════
{
    const x = 0, y = 326, w = 256, h = 64;
    addFrame('checkered_flag', x, y, w, h);

    const sqSize = 8;
    const cols = Math.ceil(w / sqSize);
    const rows = Math.ceil(h / sqSize);

    for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
            // Slight wave effect: offset row based on column
            const waveOffset = Math.sin(col * 0.25) * 2;
            const drawY = y + row * sqSize + waveOffset;

            const isBlack = (row + col) % 2 === 0;
            ctx.fillStyle = isBlack ? '#000000' : '#FFFFFF';
            ctx.fillRect(x + col * sqSize, drawY, sqSize, sqSize);
        }
    }

    // Subtle perspective: darken right side
    const fadeGrad = ctx.createLinearGradient(x, y, x + w, y);
    fadeGrad.addColorStop(0, 'rgba(0,0,0,0)');
    fadeGrad.addColorStop(0.7, 'rgba(0,0,0,0)');
    fadeGrad.addColorStop(1, 'rgba(0,0,0,0.25)');
    ctx.fillStyle = fadeGrad;
    ctx.fillRect(x, y, w, h);
}

// ═══════════════════════════════════════════════════════════════════
// 8. WRONG WAY ARROW (64x32)
// ═══════════════════════════════════════════════════════════════════
{
    const x = 170, y = 76, w = 64, h = 32;
    addFrame('wrong_way_arrow', x, y, w, h);

    const cx = x + w / 2, cy = y + h / 2;

    // Arrow pointing left
    ctx.save();

    // White outline
    ctx.beginPath();
    ctx.moveTo(x + 6, cy);             // left tip
    ctx.lineTo(x + 24, y + 3);         // top-left of head
    ctx.lineTo(x + 24, y + 9);         // inner top
    ctx.lineTo(x + w - 4, y + 9);      // top-right shaft
    ctx.lineTo(x + w - 4, y + h - 9);  // bottom-right shaft
    ctx.lineTo(x + 24, y + h - 9);     // inner bottom
    ctx.lineTo(x + 24, y + h - 3);     // bottom-left of head
    ctx.closePath();
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#FFFFFF';
    ctx.stroke();

    // Red fill
    ctx.fillStyle = hexToCSS(0xFF0000);
    ctx.fill();

    ctx.restore();
}

// ═══════════════════════════════════════════════════════════════════
// 9. SPEED GAUGE BACKGROUND (80x80)
// ═══════════════════════════════════════════════════════════════════
{
    const x = 186, y = 26, sz = 80;
    addFrame('speed_gauge_bg', x, y, sz, sz);

    const cx = x + sz / 2, cy = y + sz / 2, r = sz / 2 - 2;

    // Dark circular face
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    const faceGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    faceGrad.addColorStop(0, hexToCSS(0x1A1A2E));
    faceGrad.addColorStop(1, hexToCSS(0x0A0A14));
    ctx.fillStyle = faceGrad;
    ctx.fill();

    // Outer ring
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.lineWidth = 2;
    ctx.strokeStyle = hexToCSS(0x444466);
    ctx.stroke();

    // Tick marks (arc from 135deg to 405deg = 270 degree sweep, bottom-up)
    const startAngle = (135 * Math.PI) / 180;
    const endAngle = (405 * Math.PI) / 180;
    const totalSweep = endAngle - startAngle;
    const majorTicks = 6;  // 0, 20, 40, 60, 80, 100
    const minorPerMajor = 4;

    for (let i = 0; i <= majorTicks * minorPerMajor; i++) {
        const frac = i / (majorTicks * minorPerMajor);
        const angle = startAngle + frac * totalSweep;
        const isMajor = i % minorPerMajor === 0;
        const innerR = isMajor ? r - 12 : r - 7;
        const outerR = r - 3;

        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(angle) * innerR, cy + Math.sin(angle) * innerR);
        ctx.lineTo(cx + Math.cos(angle) * outerR, cy + Math.sin(angle) * outerR);
        ctx.lineWidth = isMajor ? 2 : 1;
        ctx.strokeStyle = isMajor ? '#CCCCCC' : '#666666';
        ctx.stroke();

        // Numbers at major ticks
        if (isMajor) {
            const num = Math.round(frac * 100);
            const numR = r - 19;
            ctx.fillStyle = '#AAAAAA';
            ctx.font = 'bold 8px Arial, sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(String(num), cx + Math.cos(angle) * numR, cy + Math.sin(angle) * numR);
        }
    }

    // Center dot
    ctx.beginPath();
    ctx.arc(cx, cy, 3, 0, Math.PI * 2);
    ctx.fillStyle = '#FF4444';
    ctx.fill();
}

// ═══════════════════════════════════════════════════════════════════
// Save atlas
// ═══════════════════════════════════════════════════════════════════
console.log('Generating UI atlas...');
saveAtlas(canvas, 'ui', 'ui', frames);
console.log(`  ${frames.length} frames packed into ${ATLAS_W}x${ATLAS_H}`);
console.log('Done.');
