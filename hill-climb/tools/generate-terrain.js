/**
 * Generate terrain surface tiles and detail sprites for each biome.
 */

const { createCanvas, saveAtlas, savePNG, hexToCSS, darken, lighten } = require('./atlas-utils');

const BIOMES = [
    {
        name: 'grassland',
        ground: 0x4A7A2E,
        groundDark: 0x3A5A1E,
        dirt: 0x8B6914,
        dirtDark: 0x6B4914,
        accent: 0x5A9A3E,
        sky: [0x87CEEB, 0xB0E0FF],
        details: ['grass_tuft', 'flower', 'small_rock'],
    },
    {
        name: 'desert',
        ground: 0xD4A854,
        groundDark: 0xB48834,
        dirt: 0xC49844,
        dirtDark: 0xA47824,
        accent: 0xE4B864,
        sky: [0xFFD89B, 0xFFAA55],
        details: ['cactus', 'desert_rock', 'skull'],
    },
    {
        name: 'arctic',
        ground: 0xE8E8F0,
        groundDark: 0xC8C8E0,
        dirt: 0xB0B0C8,
        dirtDark: 0x9090A8,
        accent: 0xF0F0FF,
        sky: [0xBBDDFF, 0x8899CC],
        details: ['snowdrift', 'ice_crystal', 'frozen_rock'],
    },
    {
        name: 'volcanic',
        ground: 0x444444,
        groundDark: 0x2A2A2A,
        dirt: 0x553322,
        dirtDark: 0x331100,
        accent: 0xFF4400,
        sky: [0x442200, 0x220000],
        details: ['lava_rock', 'ember', 'charred_bone'],
    },
];

const TILE_W = 64;
const TILE_H = 96;

function drawGrassTuft(ctx, x, y, color) {
    ctx.strokeStyle = hexToCSS(color);
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    for (let i = 0; i < 5; i++) {
        const bx = x + (i - 2) * 3;
        const angle = (i - 2) * 0.15;
        ctx.beginPath();
        ctx.moveTo(bx, y);
        ctx.quadraticCurveTo(bx + Math.sin(angle) * 6, y - 8, bx + Math.sin(angle) * 4, y - 12 - Math.random() * 4);
        ctx.stroke();
    }
}

function drawFlower(ctx, x, y) {
    // Stem
    ctx.strokeStyle = hexToCSS(0x3A7A1E);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x, y - 10);
    ctx.stroke();
    // Petals
    const colors = [0xFF6688, 0xFFAA33, 0xFF44FF, 0xFFFF44];
    const c = colors[Math.floor(Math.random() * colors.length)];
    for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2;
        ctx.fillStyle = hexToCSS(c);
        ctx.beginPath();
        ctx.arc(x + Math.cos(a) * 3, y - 13 + Math.sin(a) * 3, 2.5, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.fillStyle = hexToCSS(0xFFFF00);
    ctx.beginPath();
    ctx.arc(x, y - 13, 2, 0, Math.PI * 2);
    ctx.fill();
}

function drawSmallRock(ctx, x, y, color) {
    ctx.fillStyle = hexToCSS(color);
    ctx.beginPath();
    ctx.moveTo(x - 5, y);
    ctx.lineTo(x - 4, y - 6);
    ctx.lineTo(x + 2, y - 7);
    ctx.lineTo(x + 6, y - 3);
    ctx.lineTo(x + 5, y);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = hexToCSS(lighten(color, 0.2));
    ctx.beginPath();
    ctx.moveTo(x - 3, y - 2);
    ctx.lineTo(x - 2, y - 5);
    ctx.lineTo(x + 1, y - 5);
    ctx.lineTo(x + 2, y - 3);
    ctx.closePath();
    ctx.fill();
}

function drawCactus(ctx, x, y) {
    const green = 0x2D8B2D;
    ctx.fillStyle = hexToCSS(green);
    // Main trunk
    ctx.fillRect(x - 3, y - 24, 6, 24);
    // Left arm
    ctx.fillRect(x - 10, y - 18, 7, 4);
    ctx.fillRect(x - 10, y - 24, 4, 10);
    // Right arm
    ctx.fillRect(x + 3, y - 14, 7, 4);
    ctx.fillRect(x + 7, y - 20, 4, 10);
    // Highlight
    ctx.fillStyle = hexToCSS(lighten(green, 0.15));
    ctx.fillRect(x - 1, y - 22, 2, 20);
}

function drawSkull(ctx, x, y) {
    ctx.fillStyle = hexToCSS(0xEEDDCC);
    ctx.beginPath();
    ctx.arc(x, y - 5, 5, 0, Math.PI * 2);
    ctx.fill();
    // Eye sockets
    ctx.fillStyle = hexToCSS(0x332211);
    ctx.beginPath();
    ctx.arc(x - 2, y - 6, 1.5, 0, Math.PI * 2);
    ctx.arc(x + 2, y - 6, 1.5, 0, Math.PI * 2);
    ctx.fill();
    // Jaw
    ctx.fillStyle = hexToCSS(0xDDCCBB);
    ctx.fillRect(x - 3, y - 2, 6, 3);
}

function drawSnowdrift(ctx, x, y) {
    ctx.fillStyle = hexToCSS(0xF0F0FF);
    ctx.beginPath();
    ctx.moveTo(x - 10, y);
    ctx.quadraticCurveTo(x - 5, y - 8, x, y - 6);
    ctx.quadraticCurveTo(x + 5, y - 10, x + 10, y);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'rgba(200,210,255,0.5)';
    ctx.beginPath();
    ctx.moveTo(x - 6, y - 1);
    ctx.quadraticCurveTo(x, y - 7, x + 6, y - 2);
    ctx.stroke();
}

function drawIceCrystal(ctx, x, y) {
    ctx.strokeStyle = hexToCSS(0xAADDFF);
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(x, y - 6);
        ctx.lineTo(x + Math.cos(a) * 7, y - 6 + Math.sin(a) * 7);
        ctx.stroke();
    }
}

function drawLavaRock(ctx, x, y) {
    ctx.fillStyle = hexToCSS(0x333333);
    ctx.beginPath();
    ctx.moveTo(x - 6, y);
    ctx.lineTo(x - 5, y - 8);
    ctx.lineTo(x + 1, y - 10);
    ctx.lineTo(x + 7, y - 5);
    ctx.lineTo(x + 6, y);
    ctx.closePath();
    ctx.fill();
    // Lava glow
    ctx.fillStyle = hexToCSS(0xFF4400);
    ctx.beginPath();
    ctx.moveTo(x - 2, y - 2);
    ctx.lineTo(x, y - 5);
    ctx.lineTo(x + 3, y - 3);
    ctx.closePath();
    ctx.fill();
}

function drawEmber(ctx, x, y) {
    const grd = ctx.createRadialGradient(x, y - 4, 0, x, y - 4, 5);
    grd.addColorStop(0, 'rgba(255,200,0,0.9)');
    grd.addColorStop(0.5, 'rgba(255,100,0,0.5)');
    grd.addColorStop(1, 'rgba(255,50,0,0)');
    ctx.fillStyle = grd;
    ctx.beginPath();
    ctx.arc(x, y - 4, 5, 0, Math.PI * 2);
    ctx.fill();
}

const DETAIL_DRAWERS = {
    grass_tuft: (ctx, x, y) => drawGrassTuft(ctx, x, y, 0x4A8A2E),
    flower: drawFlower,
    small_rock: (ctx, x, y) => drawSmallRock(ctx, x, y, 0x888888),
    cactus: drawCactus,
    desert_rock: (ctx, x, y) => drawSmallRock(ctx, x, y, 0xAA8855),
    skull: drawSkull,
    snowdrift: drawSnowdrift,
    ice_crystal: drawIceCrystal,
    frozen_rock: (ctx, x, y) => drawSmallRock(ctx, x, y, 0x9999BB),
    lava_rock: drawLavaRock,
    ember: drawEmber,
    charred_bone: (ctx, x, y) => drawSkull(ctx, x, y), // reuse skull
};

function generate() {
    console.log('Generating terrain sprites...');

    BIOMES.forEach(biome => {
        const canvas = createCanvas(256, 256);
        const ctx = canvas.getContext('2d');
        const frames = [];

        // --- Surface tile ---
        const tx = 0, ty = 0;
        // Dirt/ground base
        const grd = ctx.createLinearGradient(tx, ty, tx, ty + TILE_H);
        grd.addColorStop(0, hexToCSS(biome.ground));
        grd.addColorStop(0.15, hexToCSS(biome.ground));
        grd.addColorStop(0.4, hexToCSS(biome.groundDark));
        grd.addColorStop(0.6, hexToCSS(biome.dirt));
        grd.addColorStop(1, hexToCSS(biome.dirtDark));
        ctx.fillStyle = grd;
        ctx.fillRect(tx, ty, TILE_W, TILE_H);

        // Surface grass/texture line
        ctx.strokeStyle = hexToCSS(biome.accent);
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(tx, ty + 2);
        for (let px = 0; px < TILE_W; px += 4) {
            ctx.lineTo(tx + px, ty + 1 + Math.sin(px * 0.5) * 1.5);
        }
        ctx.stroke();

        // Texture noise dots
        for (let i = 0; i < 30; i++) {
            const dx = tx + Math.random() * TILE_W;
            const dy = ty + 6 + Math.random() * (TILE_H - 10);
            const size = 1 + Math.random() * 2;
            ctx.fillStyle = hexToCSS(darken(biome.dirt, Math.random() * 0.3));
            ctx.fillRect(dx, dy, size, size);
        }

        frames.push({ name: 'surface', x: tx, y: ty, w: TILE_W, h: TILE_H });

        // --- Detail sprites ---
        biome.details.forEach((detail, i) => {
            const dx = TILE_W + 10 + i * 40;
            const dy = 60;
            const drawer = DETAIL_DRAWERS[detail];
            if (drawer) {
                drawer(ctx, dx + 15, dy);
            }
            frames.push({ name: detail, x: dx, y: dy - 30, w: 32, h: 32 });
        });

        saveAtlas(canvas, 'terrain', `terrain_${biome.name}`, frames);
    });

    console.log('  Terrain sprites complete!');
}

generate();
