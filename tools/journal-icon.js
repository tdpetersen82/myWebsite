#!/usr/bin/env node
// Generates the journal PWA icons.
//
//   node tools/journal-icon.js
//
// Writes journal/icon-192.png, journal/icon-512.png and
// journal/apple-touch-icon.png. Pure Node — no image libraries — so the icons
// are reproducible from source instead of being a binary blob nobody can edit.
//
// The artwork is a cream page with ruled lines and an amber bookmark on a dark
// slate field. Full-bleed background with the page well inside the middle 80%,
// so it survives both Android's maskable crop and iOS's rounded-corner mask.

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const SS = 4; // supersample factor — drawn hard-edged at 4x, box-filtered down

// --- colors -----------------------------------------------------------------

const BG_TOP = [42, 47, 61];
const BG_BOT = [20, 22, 27];
const PAGE = [245, 239, 227];
const RULE = [176, 168, 152];
const AMBER = [224, 164, 88];

// --- tiny raster --------------------------------------------------------------

function makeCanvas(size) {
  return { size, px: new Uint8Array(size * size * 3) };
}

function setPx(c, x, y, rgb) {
  const i = (y * c.size + x) * 3;
  c.px[i] = rgb[0];
  c.px[i + 1] = rgb[1];
  c.px[i + 2] = rgb[2];
}

function verticalGradient(c, top, bottom) {
  for (let y = 0; y < c.size; y++) {
    const t = c.size === 1 ? 0 : y / (c.size - 1);
    const rgb = [
      Math.round(top[0] + (bottom[0] - top[0]) * t),
      Math.round(top[1] + (bottom[1] - top[1]) * t),
      Math.round(top[2] + (bottom[2] - top[2]) * t),
    ];
    for (let x = 0; x < c.size; x++) setPx(c, x, y, rgb);
  }
}

// Rounded rect in unit coordinates (0..1 of the canvas edge).
function roundRect(c, ux, uy, uw, uh, ur, rgb) {
  const s = c.size;
  const x0 = ux * s, y0 = uy * s, w = uw * s, h = uh * s, r = Math.min(ur * s, w / 2, h / 2);
  const x1 = x0 + w, y1 = y0 + h;

  const px0 = Math.max(0, Math.floor(x0));
  const py0 = Math.max(0, Math.floor(y0));
  const px1 = Math.min(s - 1, Math.ceil(x1));
  const py1 = Math.min(s - 1, Math.ceil(y1));

  for (let y = py0; y <= py1; y++) {
    for (let x = px0; x <= px1; x++) {
      const cx = x + 0.5, cy = y + 0.5;
      if (cx < x0 || cx > x1 || cy < y0 || cy > y1) continue;
      // Clamp the sample into the inner rect; if it moved, we're in a corner
      // and the distance to that clamped point is the corner radius test.
      const nx = Math.min(Math.max(cx, x0 + r), x1 - r);
      const ny = Math.min(Math.max(cy, y0 + r), y1 - r);
      const dx = cx - nx, dy = cy - ny;
      if (dx * dx + dy * dy <= r * r) setPx(c, x, y, rgb);
    }
  }
}

function downsample(big, size) {
  const out = makeCanvas(size);
  const n = SS * SS;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let r = 0, g = 0, b = 0;
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const i = ((y * SS + sy) * big.size + (x * SS + sx)) * 3;
          r += big.px[i];
          g += big.px[i + 1];
          b += big.px[i + 2];
        }
      }
      setPx(out, x, y, [Math.round(r / n), Math.round(g / n), Math.round(b / n)]);
    }
  }
  return out;
}

// --- PNG encoding -------------------------------------------------------------

const CRC_TABLE = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();

function crc32(buf) {
  let c = -1;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function encodePng(c) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(c.size, 0);
  ihdr.writeUInt32BE(c.size, 4);
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 2;  // color type: truecolor RGB
  ihdr[10] = 0; // deflate
  ihdr[11] = 0; // adaptive filtering
  ihdr[12] = 0; // no interlace

  // Each scanline is prefixed with filter type 0 (None).
  const stride = c.size * 3;
  const raw = Buffer.alloc((stride + 1) * c.size);
  for (let y = 0; y < c.size; y++) {
    raw[y * (stride + 1)] = 0;
    Buffer.from(c.px.buffer, c.px.byteOffset + y * stride, stride)
      .copy(raw, y * (stride + 1) + 1);
  }

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// --- artwork ------------------------------------------------------------------

function drawIcon(size) {
  const c = makeCanvas(size * SS);
  verticalGradient(c, BG_TOP, BG_BOT);

  // The page.
  const px = 0.26, py = 0.19, pw = 0.48, ph = 0.62;
  roundRect(c, px, py, pw, ph, 0.045, PAGE);

  // Ruled lines: four full-width, one short, to read as writing rather than
  // as a blank card.
  const widths = [0.66, 0.78, 0.7, 0.8, 0.4];
  const lineH = 0.032;
  const gap = 0.078;
  const startY = py + 0.115;
  for (let i = 0; i < widths.length; i++) {
    roundRect(
      c,
      px + pw * 0.13,
      startY + gap * i,
      pw * widths[i],
      lineH,
      lineH / 2,
      RULE
    );
  }

  // Amber bookmark ribbon hanging over the page's top-right edge.
  roundRect(c, px + pw - 0.115, py - 0.045, 0.062, 0.30, 0.018, AMBER);

  return downsample(c, size);
}

// --- main ---------------------------------------------------------------------

const outDir = path.join(__dirname, '..', 'journal');
const targets = [
  ['icon-192.png', 192],
  ['icon-512.png', 512],
  ['apple-touch-icon.png', 180],
];

for (const [name, size] of targets) {
  const file = path.join(outDir, name);
  fs.writeFileSync(file, encodePng(drawIcon(size)));
  console.log('wrote', path.relative(process.cwd(), file), size + 'px');
}
