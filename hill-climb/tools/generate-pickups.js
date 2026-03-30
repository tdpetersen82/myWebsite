/**
 * Generate pickup sprites: fuel cans, coins, score stars.
 */

const { createCanvas, saveAtlas, hexToCSS, darken, lighten } = require('./atlas-utils');

function generate() {
    console.log('Generating pickup sprites...');

    const canvas = createCanvas(256, 128);
    const ctx = canvas.getContext('2d');
    const frames = [];

    // --- Fuel can ---
    const fx = 10, fy = 10, fw = 32, fh = 40;
    ctx.save();
    ctx.translate(fx, fy);

    // Can body
    const canGrd = ctx.createLinearGradient(4, 0, 28, 0);
    canGrd.addColorStop(0, hexToCSS(0xCC2222));
    canGrd.addColorStop(0.3, hexToCSS(0xFF4444));
    canGrd.addColorStop(0.7, hexToCSS(0xCC2222));
    canGrd.addColorStop(1, hexToCSS(0x881111));
    ctx.fillStyle = canGrd;

    // Rounded rectangle body
    const bx = 4, by = 8, bw = 24, bh = 28;
    const r = 3;
    ctx.beginPath();
    ctx.moveTo(bx + r, by);
    ctx.lineTo(bx + bw - r, by);
    ctx.quadraticCurveTo(bx + bw, by, bx + bw, by + r);
    ctx.lineTo(bx + bw, by + bh - r);
    ctx.quadraticCurveTo(bx + bw, by + bh, bx + bw - r, by + bh);
    ctx.lineTo(bx + r, by + bh);
    ctx.quadraticCurveTo(bx, by + bh, bx, by + bh - r);
    ctx.lineTo(bx, by + r);
    ctx.quadraticCurveTo(bx, by, bx + r, by);
    ctx.closePath();
    ctx.fill();

    // Label band
    ctx.fillStyle = hexToCSS(0xFFCC00);
    ctx.fillRect(bx + 2, by + 10, bw - 4, 10);

    // "F" on label
    ctx.fillStyle = hexToCSS(0x222222);
    ctx.font = 'bold 9px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('FUEL', bx + bw / 2, by + 18);

    // Spout
    ctx.fillStyle = hexToCSS(0x888888);
    ctx.fillRect(12, 2, 6, 8);
    ctx.fillStyle = hexToCSS(0x666666);
    ctx.fillRect(10, 2, 10, 3);

    // Handle
    ctx.strokeStyle = hexToCSS(0x666666);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(20, 5);
    ctx.lineTo(26, 5);
    ctx.lineTo(26, 10);
    ctx.stroke();

    // Highlight
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.fillRect(bx + 3, by + 2, 4, bh - 4);

    ctx.restore();
    frames.push({ name: 'fuel', x: fx, y: fy, w: fw, h: fh });

    // --- Coin (3 animation frames) ---
    for (let i = 0; i < 3; i++) {
        const cx = 60 + i * 36, cy = 10, cw = 32, ch = 32;
        const centerX = cx + 16;
        const centerY = cy + 16;
        const scaleX = [1, 0.7, 0.4][i];

        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.scale(scaleX, 1);

        // Outer ring
        const coinGrd = ctx.createRadialGradient(-3, -3, 0, 0, 0, 14);
        coinGrd.addColorStop(0, hexToCSS(0xFFDD44));
        coinGrd.addColorStop(0.7, hexToCSS(0xFFAA00));
        coinGrd.addColorStop(1, hexToCSS(0xCC8800));
        ctx.fillStyle = coinGrd;
        ctx.beginPath();
        ctx.arc(0, 0, 13, 0, Math.PI * 2);
        ctx.fill();

        // Inner circle
        ctx.strokeStyle = hexToCSS(0xEE9900);
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(0, 0, 10, 0, Math.PI * 2);
        ctx.stroke();

        // Dollar sign
        if (scaleX > 0.5) {
            ctx.fillStyle = hexToCSS(0xCC8800);
            ctx.font = 'bold 12px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('$', 0, 0);
        }

        // Shine
        ctx.fillStyle = 'rgba(255,255,255,0.35)';
        ctx.beginPath();
        ctx.arc(-3, -4, 5, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
        frames.push({ name: `coin_${i}`, x: cx, y: cy, w: cw, h: ch });
    }

    // --- Score star ---
    const sx = 170, sy = 10, sw = 32, sh = 32;
    ctx.save();
    ctx.translate(sx + 16, sy + 16);

    const starGrd = ctx.createRadialGradient(-2, -2, 0, 0, 0, 14);
    starGrd.addColorStop(0, hexToCSS(0xFFFF88));
    starGrd.addColorStop(0.5, hexToCSS(0xFFDD00));
    starGrd.addColorStop(1, hexToCSS(0xFFAA00));
    ctx.fillStyle = starGrd;

    // 5-point star
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
        const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
        const rad = i % 2 === 0 ? 13 : 6;
        const px = Math.cos(a) * rad;
        const py = Math.sin(a) * rad;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();

    // Star outline
    ctx.strokeStyle = hexToCSS(0xCC8800);
    ctx.lineWidth = 1;
    ctx.stroke();

    // Center shine
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.beginPath();
    ctx.arc(-2, -2, 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
    frames.push({ name: 'star', x: sx, y: sy, w: sw, h: sh });

    // --- Fuel glow (for low fuel warning pulse) ---
    const gx = 10, gy = 60, gw = 40, gh = 40;
    const glowGrd = ctx.createRadialGradient(gx + 20, gy + 20, 0, gx + 20, gy + 20, 20);
    glowGrd.addColorStop(0, 'rgba(255,0,0,0.4)');
    glowGrd.addColorStop(0.6, 'rgba(255,0,0,0.15)');
    glowGrd.addColorStop(1, 'rgba(255,0,0,0)');
    ctx.fillStyle = glowGrd;
    ctx.fillRect(gx, gy, gw, gh);
    frames.push({ name: 'fuel_glow', x: gx, y: gy, w: gw, h: gh });

    saveAtlas(canvas, 'pickups', 'pickups', frames);
    console.log('  Pickup sprites complete!');
}

generate();
