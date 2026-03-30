/**
 * Generate parallax background layers for each biome.
 * 3 layers per biome: far mountains, mid hills, near foliage.
 */

const { createCanvas, savePNG, hexToCSS, darken, lighten } = require('./atlas-utils');

const BG_W = 800;
const BG_H = 400;

const BIOMES = [
    {
        name: 'grassland',
        sky: [0x87CEEB, 0xB0E0FF],
        far: { color: 0x6B8E5A, peaks: [0.3, 0.5, 0.35, 0.55, 0.4, 0.6, 0.3] },
        mid: { color: 0x4A7A3E, peaks: [0.5, 0.65, 0.55, 0.7, 0.45, 0.6, 0.5] },
        near: { color: 0x3A6A2E, treeColor: 0x2A5A1E },
    },
    {
        name: 'desert',
        sky: [0xFFD89B, 0xFF9955],
        far: { color: 0xD4A060, peaks: [0.35, 0.45, 0.4, 0.5, 0.35, 0.42, 0.38] },
        mid: { color: 0xC49040, peaks: [0.5, 0.6, 0.55, 0.65, 0.5, 0.58, 0.52] },
        near: { color: 0xB48030, treeColor: 0x2D8B2D },
    },
    {
        name: 'arctic',
        sky: [0xBBDDFF, 0x8899CC],
        far: { color: 0xCCDDEE, peaks: [0.25, 0.5, 0.3, 0.6, 0.35, 0.55, 0.3] },
        mid: { color: 0xAABBDD, peaks: [0.45, 0.6, 0.5, 0.7, 0.4, 0.55, 0.48] },
        near: { color: 0x99AACC, treeColor: 0x225544 },
    },
    {
        name: 'volcanic',
        sky: [0x442200, 0x110000],
        far: { color: 0x333333, peaks: [0.3, 0.55, 0.35, 0.65, 0.4, 0.5, 0.3] },
        mid: { color: 0x2A2A2A, peaks: [0.5, 0.65, 0.55, 0.75, 0.5, 0.6, 0.5] },
        near: { color: 0x222222, treeColor: 0x111111 },
    },
];

function drawMountainLayer(ctx, w, h, peaks, color, startY) {
    ctx.fillStyle = hexToCSS(color);
    ctx.beginPath();
    ctx.moveTo(0, h);

    const segments = peaks.length - 1;
    const segW = w / segments;

    for (let i = 0; i <= segments; i++) {
        const x = i * segW;
        const y = startY + (1 - peaks[i % peaks.length]) * (h - startY) * 0.6;
        if (i === 0) {
            ctx.lineTo(x, y);
        } else {
            const prevX = (i - 1) * segW;
            const prevY = startY + (1 - peaks[(i - 1) % peaks.length]) * (h - startY) * 0.6;
            const cpx = (prevX + x) / 2;
            ctx.quadraticCurveTo(cpx, Math.min(prevY, y) - 10, x, y);
        }
    }

    ctx.lineTo(w, h);
    ctx.closePath();
    ctx.fill();
}

function drawTrees(ctx, w, h, baseY, color, count) {
    for (let i = 0; i < count; i++) {
        const x = (i / count) * w + Math.random() * 30 - 15;
        const ty = baseY + Math.random() * 20;
        const size = 15 + Math.random() * 20;

        // Trunk
        ctx.fillStyle = hexToCSS(darken(color, 0.3));
        ctx.fillRect(x - 2, ty, 4, size * 0.4);

        // Canopy
        ctx.fillStyle = hexToCSS(color);
        ctx.beginPath();
        ctx.moveTo(x, ty - size * 0.6);
        ctx.lineTo(x - size * 0.35, ty);
        ctx.lineTo(x + size * 0.35, ty);
        ctx.closePath();
        ctx.fill();

        // Second layer
        ctx.fillStyle = hexToCSS(lighten(color, 0.1));
        ctx.beginPath();
        ctx.moveTo(x, ty - size * 0.4);
        ctx.lineTo(x - size * 0.25, ty - size * 0.05);
        ctx.lineTo(x + size * 0.25, ty - size * 0.05);
        ctx.closePath();
        ctx.fill();
    }
}

function drawCacti(ctx, w, h, baseY, count) {
    for (let i = 0; i < count; i++) {
        const x = (i / count) * w + Math.random() * 40;
        const cy = baseY + Math.random() * 15;
        const sz = 10 + Math.random() * 15;

        ctx.fillStyle = hexToCSS(0x2D7B2D);
        ctx.fillRect(x - 2, cy - sz, 4, sz);
        if (Math.random() > 0.4) {
            ctx.fillRect(x - 8, cy - sz * 0.7, 6, 3);
            ctx.fillRect(x - 8, cy - sz * 0.9, 3, sz * 0.25);
        }
        if (Math.random() > 0.4) {
            ctx.fillRect(x + 2, cy - sz * 0.5, 6, 3);
            ctx.fillRect(x + 5, cy - sz * 0.7, 3, sz * 0.25);
        }
    }
}

function generate() {
    console.log('Generating background layers...');

    BIOMES.forEach(biome => {
        // Layer 0: Far mountains
        const c0 = createCanvas(BG_W, BG_H);
        const ctx0 = c0.getContext('2d');

        // Sky gradient
        const skyGrd = ctx0.createLinearGradient(0, 0, 0, BG_H);
        skyGrd.addColorStop(0, hexToCSS(biome.sky[0]));
        skyGrd.addColorStop(1, hexToCSS(biome.sky[1]));
        ctx0.fillStyle = skyGrd;
        ctx0.fillRect(0, 0, BG_W, BG_H);

        // Clouds (only for non-volcanic)
        if (biome.name !== 'volcanic') {
            ctx0.fillStyle = 'rgba(255,255,255,0.4)';
            for (let i = 0; i < 5; i++) {
                const cx = Math.random() * BG_W;
                const cy = 30 + Math.random() * 80;
                ctx0.beginPath();
                ctx0.ellipse(cx, cy, 40 + Math.random() * 30, 15 + Math.random() * 10, 0, 0, Math.PI * 2);
                ctx0.fill();
            }
        } else {
            // Volcanic: lava glow in sky
            const lavaGrd = ctx0.createRadialGradient(BG_W * 0.3, BG_H * 0.2, 0, BG_W * 0.3, BG_H * 0.2, 200);
            lavaGrd.addColorStop(0, 'rgba(255,100,0,0.15)');
            lavaGrd.addColorStop(1, 'rgba(255,50,0,0)');
            ctx0.fillStyle = lavaGrd;
            ctx0.fillRect(0, 0, BG_W, BG_H);
        }

        drawMountainLayer(ctx0, BG_W, BG_H, biome.far.peaks, biome.far.color, BG_H * 0.3);

        // Snow caps for arctic
        if (biome.name === 'arctic') {
            ctx0.fillStyle = 'rgba(255,255,255,0.6)';
            biome.far.peaks.forEach((p, i) => {
                const x = (i / (biome.far.peaks.length - 1)) * BG_W;
                const y = BG_H * 0.3 + (1 - p) * BG_H * 0.42;
                ctx0.beginPath();
                ctx0.moveTo(x - 20, y + 15);
                ctx0.lineTo(x, y);
                ctx0.lineTo(x + 20, y + 15);
                ctx0.closePath();
                ctx0.fill();
            });
        }

        savePNG(c0, 'backgrounds', `${biome.name}_layer0.png`);

        // Layer 1: Mid hills
        const c1 = createCanvas(BG_W, BG_H);
        const ctx1 = c1.getContext('2d');
        drawMountainLayer(ctx1, BG_W, BG_H, biome.mid.peaks, biome.mid.color, BG_H * 0.45);
        // Add some detail variation
        drawMountainLayer(ctx1, BG_W, BG_H, biome.mid.peaks.map(p => p * 0.9 + 0.05),
            darken(biome.mid.color, 0.15), BG_H * 0.55);

        savePNG(c1, 'backgrounds', `${biome.name}_layer1.png`);

        // Layer 2: Near foliage
        const c2 = createCanvas(BG_W, BG_H);
        const ctx2 = c2.getContext('2d');
        const nearBaseY = BG_H * 0.65;

        // Ground fill
        ctx2.fillStyle = hexToCSS(biome.near.color);
        ctx2.fillRect(0, nearBaseY, BG_W, BG_H - nearBaseY);

        if (biome.name === 'desert') {
            drawCacti(ctx2, BG_W, BG_H, nearBaseY, 8);
        } else if (biome.name !== 'volcanic') {
            drawTrees(ctx2, BG_W, BG_H, nearBaseY - 20, biome.near.treeColor, 12);
        } else {
            // Volcanic: dead trees
            for (let i = 0; i < 8; i++) {
                const tx = Math.random() * BG_W;
                const ty = nearBaseY + Math.random() * 10;
                ctx2.strokeStyle = hexToCSS(0x333333);
                ctx2.lineWidth = 2;
                ctx2.beginPath();
                ctx2.moveTo(tx, ty);
                ctx2.lineTo(tx - 3, ty - 20 - Math.random() * 10);
                ctx2.moveTo(tx, ty - 15);
                ctx2.lineTo(tx + 8, ty - 22);
                ctx2.moveTo(tx, ty - 10);
                ctx2.lineTo(tx - 7, ty - 18);
                ctx2.stroke();
            }
        }

        savePNG(c2, 'backgrounds', `${biome.name}_layer2.png`);
    });

    console.log('  Background layers complete!');
}

generate();
