/**
 * Shared utilities for generating Phaser 3 atlas JSON files
 * and common canvas drawing helpers.
 */

const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');

const ASSETS_DIR = path.resolve(__dirname, '..', 'assets');

function makeAtlasJSON(imageFilename, frames) {
    const out = { frames: {} };
    for (const f of frames) {
        out.frames[f.name] = {
            frame: { x: f.x, y: f.y, w: f.w, h: f.h },
            rotated: false,
            trimmed: false,
            spriteSourceSize: { x: 0, y: 0, w: f.w, h: f.h },
            sourceSize: { w: f.w, h: f.h },
        };
    }
    out.meta = {
        image: imageFilename,
        format: 'RGBA8888',
        scale: '1',
    };
    return out;
}

function saveAtlas(canvas, subdir, baseName, frames) {
    const dir = path.join(ASSETS_DIR, subdir);
    fs.mkdirSync(dir, { recursive: true });

    const pngPath = path.join(dir, `${baseName}.png`);
    fs.writeFileSync(pngPath, canvas.toBuffer('image/png'));

    const jsonPath = path.join(dir, `${baseName}.json`);
    const atlas = makeAtlasJSON(`${baseName}.png`, frames);
    fs.writeFileSync(jsonPath, JSON.stringify(atlas, null, 2));

    console.log(`  Saved ${pngPath} (${Math.round(fs.statSync(pngPath).size / 1024)}KB)`);
}

function savePNG(canvas, subdir, filename) {
    const dir = path.join(ASSETS_DIR, subdir);
    fs.mkdirSync(dir, { recursive: true });
    const pngPath = path.join(dir, filename);
    fs.writeFileSync(pngPath, canvas.toBuffer('image/png'));
    console.log(`  Saved ${pngPath} (${Math.round(fs.statSync(pngPath).size / 1024)}KB)`);
}

function hexToRGBA(hex, alpha = 1) {
    const r = (hex >> 16) & 0xFF;
    const g = (hex >> 8) & 0xFF;
    const b = hex & 0xFF;
    return `rgba(${r},${g},${b},${alpha})`;
}

function hexToCSS(hex) {
    return '#' + hex.toString(16).padStart(6, '0');
}

function darken(color, amount) {
    const r = Math.max(0, ((color >> 16) & 0xFF) * (1 - amount));
    const g = Math.max(0, ((color >> 8) & 0xFF) * (1 - amount));
    const b = Math.max(0, (color & 0xFF) * (1 - amount));
    return (Math.floor(r) << 16) | (Math.floor(g) << 8) | Math.floor(b);
}

function lighten(color, amount) {
    const r = Math.min(255, ((color >> 16) & 0xFF) + 255 * amount);
    const g = Math.min(255, ((color >> 8) & 0xFF) + 255 * amount);
    const b = Math.min(255, (color & 0xFF) + 255 * amount);
    return (Math.floor(r) << 16) | (Math.floor(g) << 8) | Math.floor(b);
}

module.exports = {
    ASSETS_DIR,
    createCanvas,
    makeAtlasJSON,
    saveAtlas,
    savePNG,
    hexToRGBA,
    hexToCSS,
    darken,
    lighten,
};
