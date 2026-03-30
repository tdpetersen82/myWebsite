/**
 * Process downloaded free assets into game-ready format.
 *
 * Sources:
 *   Bike sprite: CC0 from OpenGameArt (https://opengameart.org/content/2d-bike-sprite-2)
 *   Coins: CC0 from OpenGameArt (https://opengameart.org/content/coins-asset)
 *   Parallax backgrounds: CC-BY 4.0 by Admurin (https://opengameart.org/content/parallax-backgrounds)
 */

const { createCanvas, loadImage } = require('canvas');
const fs = require('fs');
const path = require('path');

const ASSETS_DIR = path.resolve(__dirname, '..', 'assets');
const TMP = '/tmp';

function makeAtlasJSON(imageFilename, frames) {
    const out = { frames: {} };
    for (const f of frames) {
        out.frames[f.name] = {
            frame: { x: f.x, y: f.y, w: f.w, h: f.h },
            rotated: false, trimmed: false,
            spriteSourceSize: { x: 0, y: 0, w: f.w, h: f.h },
            sourceSize: { w: f.w, h: f.h },
        };
    }
    out.meta = { image: imageFilename, format: 'RGBA8888', scale: '1' };
    return out;
}

function saveAtlas(canvas, subdir, baseName, frames) {
    const dir = path.join(ASSETS_DIR, subdir);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, `${baseName}.png`), canvas.toBuffer('image/png'));
    fs.writeFileSync(path.join(dir, `${baseName}.json`), JSON.stringify(makeAtlasJSON(`${baseName}.png`, frames), null, 2));
    console.log(`  Saved ${baseName} atlas (${Math.round(fs.statSync(path.join(dir, `${baseName}.png`)).size / 1024)}KB)`);
}

// ─── BIKE ────────────────────────────────────────────────────────────

async function processBike() {
    console.log('\n=== Processing bike sprite ===');

    const bikeImg = await loadImage(path.join(TMP, 'bike_no_rider.png'));
    const riderImg = await loadImage(path.join(TMP, 'bike_with_rider.png'));

    // The bike-with-rider is 288x222, bike-only is 222x132
    // We'll use the rider version directly and create lean variants

    const FRAME_W = 160;
    const FRAME_H = 120;
    const SHEET_W = 512;
    const SHEET_H = 512;
    const WHEEL_SIZE = 48;

    const canvas = createCanvas(SHEET_W, SHEET_H);
    const ctx = canvas.getContext('2d');
    const frames = [];

    // Scale factor to fit the rider bike into our frame
    const scale = 0.5;
    const bikeW = riderImg.width * scale;
    const bikeH = riderImg.height * scale;

    const leanStates = [
        { name: 'bike_lean_back', angle: -0.12 },
        { name: 'bike_neutral', angle: 0 },
        { name: 'bike_lean_forward', angle: 0.12 },
    ];

    leanStates.forEach((state, i) => {
        const ox = 5 + i * (FRAME_W + 5);
        const oy = 5;
        const cx = ox + FRAME_W / 2;
        const cy = oy + FRAME_H / 2;

        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(state.angle);
        ctx.drawImage(riderImg, -bikeW / 2, -bikeH / 2 + 5, bikeW, bikeH);
        ctx.restore();

        frames.push({ name: state.name, x: ox, y: oy, w: FRAME_W, h: FRAME_H });
    });

    // Wheel sprites - extract from the bike image
    // The wheels in the bike sprite are roughly at known positions
    // Instead, let's draw nice wheels programmatically since the downloaded bike's
    // wheels are tiny. We draw them at WHEEL_SIZE.
    for (let i = 0; i < 4; i++) {
        const wx = 5 + i * (WHEEL_SIZE + 5);
        const wy = 140;
        const r = WHEEL_SIZE / 2 - 2;
        const cx = wx + WHEEL_SIZE / 2;
        const cy = wy + WHEEL_SIZE / 2;
        const spokeAngle = (i / 4) * Math.PI * 2;

        // Tire
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fillStyle = '#2a2a2a';
        ctx.fill();

        // Tread knobs
        ctx.strokeStyle = '#3a3a3a';
        ctx.lineWidth = 2;
        for (let k = 0; k < 16; k++) {
            const a = spokeAngle + (k / 16) * Math.PI * 2;
            ctx.beginPath();
            ctx.moveTo(cx + Math.cos(a) * (r - 3), cy + Math.sin(a) * (r - 3));
            ctx.lineTo(cx + Math.cos(a + 0.1) * r, cy + Math.sin(a + 0.1) * r);
            ctx.stroke();
        }

        // Rim
        ctx.beginPath();
        ctx.arc(cx, cy, r * 0.55, 0, Math.PI * 2);
        ctx.fillStyle = '#666666';
        ctx.fill();
        ctx.beginPath();
        ctx.arc(cx, cy, r * 0.48, 0, Math.PI * 2);
        ctx.fillStyle = '#999999';
        ctx.fill();

        // Spokes
        ctx.strokeStyle = '#bbbbbb';
        ctx.lineWidth = 1;
        for (let k = 0; k < 8; k++) {
            const a = spokeAngle + (k / 8) * Math.PI * 2;
            ctx.beginPath();
            ctx.moveTo(cx + Math.cos(a) * 4, cy + Math.sin(a) * 4);
            ctx.lineTo(cx + Math.cos(a) * (r * 0.46), cy + Math.sin(a) * (r * 0.46));
            ctx.stroke();
        }

        // Hub
        ctx.beginPath();
        ctx.arc(cx, cy, 4, 0, Math.PI * 2);
        ctx.fillStyle = '#888888';
        ctx.fill();
        ctx.beginPath();
        ctx.arc(cx, cy, 2, 0, Math.PI * 2);
        ctx.fillStyle = '#cccccc';
        ctx.fill();

        frames.push({ name: `wheel_${i}`, x: wx, y: wy, w: WHEEL_SIZE, h: WHEEL_SIZE });
    }

    // Crash frame - use rotated bike + scattered parts
    const CX = 5, CY = 200, CW = 160, CH = 110;
    ctx.save();
    ctx.translate(CX, CY);

    // Rotated bike body
    ctx.save();
    ctx.translate(50, 40);
    ctx.rotate(0.8);
    ctx.drawImage(bikeImg, -bikeImg.width * 0.25, -bikeImg.height * 0.25,
        bikeImg.width * 0.4, bikeImg.height * 0.4);
    ctx.restore();

    // Detached wheel
    const cr = 14;
    ctx.beginPath();
    ctx.arc(125, 70, cr, 0, Math.PI * 2);
    ctx.fillStyle = '#2a2a2a';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(125, 70, cr * 0.5, 0, Math.PI * 2);
    ctx.fillStyle = '#888888';
    ctx.fill();

    // Rider tumbling
    ctx.fillStyle = '#dd3333';
    ctx.beginPath();
    ctx.arc(110, 25, 9, 0, Math.PI * 2);
    ctx.fill();
    // Visor
    ctx.fillStyle = '#44ccff';
    ctx.fillRect(115, 20, 6, 5);
    // Body
    ctx.fillStyle = '#2266dd';
    ctx.save();
    ctx.translate(108, 38);
    ctx.rotate(0.3);
    ctx.fillRect(-7, -5, 14, 20);
    ctx.restore();

    // Sparks
    ctx.fillStyle = '#ffdd00';
    for (let i = 0; i < 8; i++) {
        const sx = 30 + Math.random() * 100;
        const sy = 10 + Math.random() * 60;
        ctx.beginPath();
        ctx.arc(sx, sy, 1 + Math.random() * 2.5, 0, Math.PI * 2);
        ctx.fill();
    }

    ctx.restore();
    frames.push({ name: 'bike_crash', x: CX, y: CY, w: CW, h: CH });

    saveAtlas(canvas, 'bike', 'bike', frames);
}

// ─── COINS ───────────────────────────────────────────────────────────

async function processCoins() {
    console.log('\n=== Processing coin sprites ===');

    const coinStrip = await loadImage(path.join(TMP, 'coins_pack', 'coin32.png'));

    // The coin strip is a horizontal sprite sheet, 32px per frame
    const frameSize = 32;
    const totalFrames = Math.floor(coinStrip.width / frameSize);
    console.log(`  Coin strip: ${coinStrip.width}x${coinStrip.height}, ${totalFrames} frames`);

    // We only need ~8 frames for a nice spin animation (pick evenly spaced)
    const pickFrames = 8;
    const step = Math.floor(totalFrames / pickFrames);

    // Also include fuel can from existing generated pickups
    const SHEET_W = 256;
    const SHEET_H = 128;
    const canvas = createCanvas(SHEET_W, SHEET_H);
    const ctx = canvas.getContext('2d');
    const frames = [];

    // --- Draw fuel can (keep the procedural one - it looked decent) ---
    const fx = 5, fy = 5, fw = 32, fh = 40;
    ctx.save();
    ctx.translate(fx, fy);

    // Can body with gradient
    const canGrd = ctx.createLinearGradient(4, 0, 28, 0);
    canGrd.addColorStop(0, '#cc2222');
    canGrd.addColorStop(0.3, '#ff4444');
    canGrd.addColorStop(0.7, '#cc2222');
    canGrd.addColorStop(1, '#881111');
    ctx.fillStyle = canGrd;
    ctx.beginPath();
    ctx.moveTo(7, 8);
    ctx.lineTo(25, 8);
    ctx.quadraticCurveTo(28, 8, 28, 11);
    ctx.lineTo(28, 33);
    ctx.quadraticCurveTo(28, 36, 25, 36);
    ctx.lineTo(7, 36);
    ctx.quadraticCurveTo(4, 36, 4, 33);
    ctx.lineTo(4, 11);
    ctx.quadraticCurveTo(4, 8, 7, 8);
    ctx.fill();

    // Label
    ctx.fillStyle = '#ffcc00';
    ctx.fillRect(6, 18, 20, 10);
    ctx.fillStyle = '#222';
    ctx.font = 'bold 8px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('FUEL', 16, 26);

    // Spout
    ctx.fillStyle = '#888888';
    ctx.fillRect(12, 2, 6, 8);
    ctx.fillStyle = '#666666';
    ctx.fillRect(10, 2, 10, 3);
    // Handle
    ctx.strokeStyle = '#666666';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(20, 5);
    ctx.lineTo(26, 5);
    ctx.lineTo(26, 10);
    ctx.stroke();
    // Highlight
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.fillRect(6, 10, 4, 24);

    ctx.restore();
    frames.push({ name: 'fuel', x: fx, y: fy, w: fw, h: fh });

    // --- Coin animation frames ---
    for (let i = 0; i < pickFrames; i++) {
        const srcX = i * step * frameSize;
        const destX = 45 + i * 34;
        const destY = 5;

        ctx.drawImage(coinStrip, srcX, 0, frameSize, frameSize, destX, destY, 32, 32);
        frames.push({ name: `coin_${i}`, x: destX, y: destY, w: 32, h: 32 });
    }

    // --- Star (keep procedural) ---
    const sx = 5, sy = 55, sw = 32, sh = 32;
    ctx.save();
    ctx.translate(sx + 16, sy + 16);
    const starGrd = ctx.createRadialGradient(-2, -2, 0, 0, 0, 14);
    starGrd.addColorStop(0, '#ffff88');
    starGrd.addColorStop(0.5, '#ffdd00');
    starGrd.addColorStop(1, '#ffaa00');
    ctx.fillStyle = starGrd;
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
    ctx.strokeStyle = '#cc8800';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.beginPath();
    ctx.arc(-2, -2, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    frames.push({ name: 'star', x: sx, y: sy, w: sw, h: sh });

    // Fuel glow
    const gx = 45, gy = 55, gw = 40, gh = 40;
    const glowGrd = ctx.createRadialGradient(gx + 20, gy + 20, 0, gx + 20, gy + 20, 20);
    glowGrd.addColorStop(0, 'rgba(255,0,0,0.4)');
    glowGrd.addColorStop(0.6, 'rgba(255,0,0,0.15)');
    glowGrd.addColorStop(1, 'rgba(255,0,0,0)');
    ctx.fillStyle = glowGrd;
    ctx.fillRect(gx, gy, gw, gh);
    frames.push({ name: 'fuel_glow', x: gx, y: gy, w: gw, h: gh });

    saveAtlas(canvas, 'pickups', 'pickups', frames);
}

// ─── BACKGROUNDS ─────────────────────────────────────────────────────

async function processBackgrounds() {
    console.log('\n=== Processing parallax backgrounds ===');

    const GAME_W = 800;
    const GAME_H = 600;

    // Mapping: game biome → downloaded folder, layers to use
    // Layer 0 in each set is the composed full scene (has sky)
    // Higher layers are individual transparent layers (foreground)
    const biomeMap = [
        {
            name: 'grassland',
            folder: 'Parallax_Backgrounds_Plains',
            // 0=full scene, 6=mountains, 3=far trees
            layers: [
                { file: '0.png', hasAlpha: false },
                { file: '6.png', hasAlpha: true },
                { file: '3.png', hasAlpha: true },
            ],
            skyColor: '#5b8fb9',
        },
        {
            name: 'arctic',
            folder: 'Parallax_Backgrounds_SnowyMountains',
            layers: [
                { file: '0.png', hasAlpha: false },
                { file: '3.png', hasAlpha: true },
                { file: '1.png', hasAlpha: true },
            ],
            skyColor: '#7a8a9a',
        },
        {
            name: 'desert',
            folder: 'Parallax_Backgrounds_DeadForest',
            layers: [
                { file: '0.png', hasAlpha: false },
                { file: '3.png', hasAlpha: true },
                { file: '1.png', hasAlpha: true },
            ],
            skyColor: '#8a9070',
        },
        {
            name: 'volcanic',
            folder: 'Parallax_Backgrounds_Cave',
            layers: [
                { file: '0.png', hasAlpha: false },
                { file: '3.png', hasAlpha: true },
                { file: '1.png', hasAlpha: true },
            ],
            skyColor: '#1a1a2e',
        },
    ];

    const bgDir = path.join(ASSETS_DIR, 'backgrounds');
    fs.mkdirSync(bgDir, { recursive: true });

    for (const biome of biomeMap) {
        for (let i = 0; i < biome.layers.length; i++) {
            const layer = biome.layers[i];
            const srcFolder = biome.folder.includes('Dock')
                ? path.join(TMP, 'parallax_bgs', biome.folder, 'Dock')
                : path.join(TMP, 'parallax_bgs', biome.folder);
            const srcPath = path.join(srcFolder, layer.file);

            const img = await loadImage(srcPath);

            // Scale to game size (tile 2x horizontally for seamless scrolling)
            const canvas = createCanvas(GAME_W, GAME_H);
            const ctx = canvas.getContext('2d');

            if (!layer.hasAlpha) {
                // Fill sky color first for the base layer
                ctx.fillStyle = biome.skyColor;
                ctx.fillRect(0, 0, GAME_W, GAME_H);
            }

            // Draw the image scaled to fill, tiled 2x for seamless edges
            const scaleX = GAME_W / img.width;
            const scaleY = GAME_H / img.height;
            const s = Math.max(scaleX, scaleY);
            const dw = img.width * s;
            const dh = img.height * s;
            const dy = GAME_H - dh; // align bottom

            ctx.drawImage(img, 0, dy, dw, dh);

            const outPath = path.join(bgDir, `${biome.name}_layer${i}.png`);
            fs.writeFileSync(outPath, canvas.toBuffer('image/png'));
            console.log(`  ${biome.name}_layer${i}.png (${Math.round(fs.statSync(outPath).size / 1024)}KB)`);
        }
    }
}

// ─── MAIN ────────────────────────────────────────────────────────────

async function main() {
    console.log('Processing downloaded assets...\n');

    await processBike();
    await processCoins();
    await processBackgrounds();

    console.log('\n✓ All assets processed!');
    console.log('\nCredits:');
    console.log('  Bike sprite: CC0, OpenGameArt');
    console.log('  Coin sprites: CC0, OpenGameArt');
    console.log('  Parallax backgrounds: CC-BY 4.0 by Admurin');
}

main().catch(err => {
    console.error('Error:', err);
    process.exit(1);
});
