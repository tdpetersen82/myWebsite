/**
 * Generate UI sprites: fuel gauge, buttons, icons.
 */

const { createCanvas, saveAtlas, hexToCSS, darken, lighten } = require('./atlas-utils');

function generate() {
    console.log('Generating UI sprites...');

    const canvas = createCanvas(512, 256);
    const ctx = canvas.getContext('2d');
    const frames = [];

    // --- Fuel gauge background ---
    const gx = 10, gy = 10, gw = 160, gh = 30;
    ctx.save();
    ctx.translate(gx, gy);

    // Background
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.beginPath();
    const rr = 6;
    ctx.moveTo(rr, 0);
    ctx.lineTo(gw - rr, 0);
    ctx.quadraticCurveTo(gw, 0, gw, rr);
    ctx.lineTo(gw, gh - rr);
    ctx.quadraticCurveTo(gw, gh, gw - rr, gh);
    ctx.lineTo(rr, gh);
    ctx.quadraticCurveTo(0, gh, 0, gh - rr);
    ctx.lineTo(0, rr);
    ctx.quadraticCurveTo(0, 0, rr, 0);
    ctx.closePath();
    ctx.fill();

    // Border
    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Fuel icon
    ctx.fillStyle = hexToCSS(0xFFCC00);
    ctx.font = 'bold 14px Arial';
    ctx.textBaseline = 'middle';
    ctx.fillText('\u26FD', 6, gh / 2);

    // Gauge track
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.fillRect(28, 8, 124, 14);

    ctx.restore();
    frames.push({ name: 'fuel_gauge_bg', x: gx, y: gy, w: gw, h: gh });

    // --- Fuel gauge fill (green to red gradient bar) ---
    const ffx = 10, ffy = 50, ffw = 124, ffh = 14;
    const fillGrd = ctx.createLinearGradient(ffx, 0, ffx + ffw, 0);
    fillGrd.addColorStop(0, hexToCSS(0xFF2222));
    fillGrd.addColorStop(0.3, hexToCSS(0xFFAA00));
    fillGrd.addColorStop(0.6, hexToCSS(0xFFFF00));
    fillGrd.addColorStop(1, hexToCSS(0x44FF44));
    ctx.fillStyle = fillGrd;
    ctx.fillRect(ffx, ffy, ffw, ffh);
    frames.push({ name: 'fuel_gauge_fill', x: ffx, y: ffy, w: ffw, h: ffh });

    // --- Pause button ---
    const px = 200, py = 10, ps = 36;
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.beginPath();
    ctx.arc(px + ps / 2, py + ps / 2, ps / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.4)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    // Pause bars
    ctx.fillStyle = hexToCSS(0xFFFFFF);
    ctx.fillRect(px + 12, py + 10, 4, 16);
    ctx.fillRect(px + 20, py + 10, 4, 16);
    frames.push({ name: 'btn_pause', x: px, y: py, w: ps, h: ps });

    // --- Mute button ---
    const mx = 245, my = 10, ms = 36;
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.beginPath();
    ctx.arc(mx + ms / 2, my + ms / 2, ms / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.4)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    // Speaker icon
    ctx.fillStyle = hexToCSS(0xFFFFFF);
    ctx.beginPath();
    ctx.moveTo(mx + 10, my + 14);
    ctx.lineTo(mx + 15, my + 14);
    ctx.lineTo(mx + 20, my + 9);
    ctx.lineTo(mx + 20, my + 27);
    ctx.lineTo(mx + 15, my + 22);
    ctx.lineTo(mx + 10, my + 22);
    ctx.closePath();
    ctx.fill();
    // Sound waves
    ctx.strokeStyle = hexToCSS(0xFFFFFF);
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(mx + 22, my + 18, 4, -0.5, 0.5);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(mx + 22, my + 18, 8, -0.5, 0.5);
    ctx.stroke();
    frames.push({ name: 'btn_mute', x: mx, y: my, w: ms, h: ms });

    // --- Score panel background ---
    const spx = 10, spy = 80, spw = 200, sph = 40;
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.beginPath();
    ctx.moveTo(spx + 8, spy);
    ctx.lineTo(spx + spw - 8, spy);
    ctx.quadraticCurveTo(spx + spw, spy, spx + spw, spy + 8);
    ctx.lineTo(spx + spw, spy + sph - 8);
    ctx.quadraticCurveTo(spx + spw, spy + sph, spx + spw - 8, spy + sph);
    ctx.lineTo(spx + 8, spy + sph);
    ctx.quadraticCurveTo(spx, spy + sph, spx, spy + sph - 8);
    ctx.lineTo(spx, spy + 8);
    ctx.quadraticCurveTo(spx, spy, spx + 8, spy);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.2)';
    ctx.lineWidth = 1;
    ctx.stroke();
    frames.push({ name: 'score_panel', x: spx, y: spy, w: spw, h: sph });

    // --- Trick popup background ---
    const tpx = 10, tpy = 130, tpw = 180, tph = 36;
    ctx.fillStyle = 'rgba(255,200,0,0.8)';
    ctx.beginPath();
    ctx.moveTo(tpx + 8, tpy);
    ctx.lineTo(tpx + tpw - 8, tpy);
    ctx.quadraticCurveTo(tpx + tpw, tpy, tpx + tpw, tpy + 8);
    ctx.lineTo(tpx + tpw, tpy + tph - 8);
    ctx.quadraticCurveTo(tpx + tpw, tpy + tph, tpx + tpw - 8, tpy + tph);
    ctx.lineTo(tpx + 8, tpy + tph);
    ctx.quadraticCurveTo(tpx, tpy + tph, tpx, tpy + tph - 8);
    ctx.lineTo(tpx, tpy + 8);
    ctx.quadraticCurveTo(tpx, tpy, tpx + 8, tpy);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = hexToCSS(0xCC8800);
    ctx.lineWidth = 2;
    ctx.stroke();
    frames.push({ name: 'trick_popup', x: tpx, y: tpy, w: tpw, h: tph });

    saveAtlas(canvas, 'ui', 'ui', frames);
    console.log('  UI sprites complete!');
}

generate();
