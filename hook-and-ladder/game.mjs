// Hook & Ladder — rendering, input, sound and page wiring. Rules live in engine.mjs.
import {
  createGame, startGame, step, drainEvents, canRaiseLadder, parkedInZone, truckBodies, turntable,
  W, H, TILE, COLS, ROWS, STREET, BUILDING, PARK, RULES, isStreetCol, isStreetRow, PITCH, STREET_W, BLOCKS_X, BLOCKS_Y, blockAt,
} from './engine.mjs';

const HS_KEY = 'hookAndLadderHighScore';
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const hiEl = document.getElementById('highScore');
const firesEl = document.getElementById('fires');
const menu = document.getElementById('menu');
const menuSub = document.getElementById('menu-sub');
const missionEl = document.getElementById('mission');
const gtagEvent = (name, params) => { if (typeof window.gtag === 'function') window.gtag('event', name, params); };

let highScore = 0;
try { highScore = parseInt(localStorage.getItem(HS_KEY) || '0', 10) || 0; } catch (e) {}
hiEl.textContent = highScore;

let game = createGame({ mode: 'duo' });
let mode = 'duo';
let muted = false;
let scale = 1;
let hud = 1;             // HUD magnification for small displays (1 on desktop, up to 2.2 on phones)
let cityLayer = null;
let particles = [];
let floaters = [];
let banner = null;       // { text, sub, t, dur, color }
let lightPhase = 0;
let shake = 0;
let lastTs = 0;

// ---------------------------------------------------------------- sizing
function resize() {
  const box = canvas.parentElement.getBoundingClientRect();
  const cssW = Math.max(1, box.width);
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const bw = Math.round(cssW * dpr), bh = Math.round(cssW * dpr * H / W);
  if (bw === canvas.width && bh === canvas.height) return;
  canvas.width = bw; canvas.height = bh;
  scale = bw / W;
  hud = Math.min(2.2, Math.max(1, 820 / cssW));
  cityLayer = null;
}
new ResizeObserver(resize).observe(canvas.parentElement);
resize();

// ---------------------------------------------------------------- input
const held = new Set();
const GAME_KEYS = new Set(['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' ', 'w', 'a', 's', 'd', 'enter', 'p']);
window.addEventListener('keydown', e => {
  const k = e.key.length === 1 ? e.key.toLowerCase() : e.key.toLowerCase();
  if (!GAME_KEYS.has(k)) return;
  if (e.target && /^(input|textarea|select|button)$/i.test(e.target.tagName) && k !== 'p') return;
  e.preventDefault();
  if (k === 'p' && !e.repeat) { togglePause(); return; }
  held.add(k);
});
window.addEventListener('keyup', e => held.delete(e.key.length === 1 ? e.key.toLowerCase() : e.key.toLowerCase()));
window.addEventListener('blur', () => held.clear());

function readInput() {
  const h = held;
  if (mode === 'solo') {
    return {
      gas: h.has('w') || h.has('arrowup'),
      brake: h.has('s') || h.has('arrowdown'),
      steer: (h.has('d') || h.has('arrowright') ? 1 : 0) - (h.has('a') || h.has('arrowleft') ? 1 : 0),
      tiller: 0,
      ladder: h.has(' ') || h.has('enter'),
    };
  }
  return {
    gas: h.has('w'),
    brake: h.has('s'),
    steer: (h.has('d') ? 1 : 0) - (h.has('a') ? 1 : 0),
    tiller: (h.has('arrowright') ? 1 : 0) - (h.has('arrowleft') ? 1 : 0),
    ladder: h.has('arrowup') || h.has('enter') || h.has(' '),
  };
}

// ---------------------------------------------------------------- sound
let audio = null;
function ac() {
  if (!audio) { try { audio = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return null; } }
  if (audio.state === 'suspended') audio.resume();
  return audio;
}
['pointerdown', 'keydown', 'touchstart'].forEach(ev => window.addEventListener(ev, () => ac(), { passive: true }));
function tone(freq, dur, type = 'sine', vol = 0.15, when = 0, slideTo = null) {
  const a = ac(); if (!a || muted) return;
  const o = a.createOscillator(), g = a.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, a.currentTime + when);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, a.currentTime + when + dur);
  g.gain.setValueAtTime(0.0001, a.currentTime + when);
  g.gain.exponentialRampToValueAtTime(vol, a.currentTime + when + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + when + dur);
  o.connect(g); g.connect(a.destination);
  o.start(a.currentTime + when); o.stop(a.currentTime + when + dur + 0.05);
}
function noise(dur, vol = 0.25) {
  const a = ac(); if (!a || muted) return;
  const buf = a.createBuffer(1, a.sampleRate * dur, a.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
  const s = a.createBufferSource(), g = a.createGain(), f = a.createBiquadFilter();
  f.type = 'lowpass'; f.frequency.value = 900;
  s.buffer = buf; g.gain.value = vol;
  s.connect(f); f.connect(g); g.connect(a.destination); s.start();
}
const SFX = {
  siren() { for (let i = 0; i < 4; i++) tone(i % 2 ? 880 : 660, 0.32, 'sawtooth', 0.06, i * 0.34); },
  crash() { noise(0.22, 0.3); tone(90, 0.25, 'square', 0.12); },
  ladder() { tone(220, 1.3, 'triangle', 0.12, 0, 640); },
  saved() { [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.22, 'triangle', 0.14, i * 0.11)); },
  burnout() { tone(300, 0.5, 'sawtooth', 0.12, 0, 90); tone(150, 0.7, 'square', 0.08, 0.2, 60); },
  over() { [392, 330, 262, 196].forEach((f, i) => tone(f, 0.35, 'triangle', 0.14, i * 0.22)); },
};

// ---------------------------------------------------------------- flow
function startMode(m) {
  mode = m;
  game = createGame({ mode: m });
  startGame(game);
  particles = []; floaters = []; banner = null; shake = 0;
  scoreEl.textContent = '0'; firesEl.textContent = '0';
  menu.hidden = true;
  if (window.ArcadeGameOver) window.ArcadeGameOver.hide();
  const bezel = document.querySelector('.ch-bezel');
  if (bezel) { bezel.classList.remove('ch-paused'); bezel.classList.add('ch-started'); }
  setMission(m === 'duo' ? 'P1 drives (W/S · A/D). P2 steers the tail (◀ ▶) and raises the ladder (▲).' : 'W/S gas · A/D steer · Space raises the ladder when parked in the marked lane.');
  canvas.focus({ preventScroll: true });
  gtagEvent('hook_and_ladder_start', { mode: m });
}
function setMission(text, ready) {
  if (!missionEl) return;
  missionEl.textContent = text;
  missionEl.dataset.ready = ready ? 'true' : 'false';
}
function togglePause() {
  if (game.status !== 'playing') return;
  const btn = document.querySelector('.ch-btn[data-act="pause"]');
  if (btn) btn.click(); else window.gameAPI.pause();
}
function showMenu(sub) {
  menuSub.textContent = sub || '';
  menu.hidden = false;
}
menu.querySelectorAll('button[data-mode]').forEach(b => b.addEventListener('click', () => startMode(b.dataset.mode)));

window.gameAPI = {
  start() { if (game.status !== 'playing') startMode(mode); },
  restart() { startMode(mode); },
  pause() {
    if (game.status !== 'playing') return;
    game.paused = !game.paused;
    const bezel = document.querySelector('.ch-bezel');
    if (bezel) bezel.classList.toggle('ch-paused', game.paused);
  },
  mute() { muted = !muted; },
};

// ---------------------------------------------------------------- events
function onEvent(e) {
  switch (e.type) {
    case 'dispatch': {
      SFX.siren();
      banner = { text: 'FIRE!', sub: 'Park the ladder in the marked lane', t: 0, dur: 2.4, color: '#ffb347' };
      setMission('🔥 Fire! Pull the ladder up alongside the burning building, then ' + (mode === 'duo' ? 'P2 presses ▲.' : 'press Space.'));
      break;
    }
    case 'crash': {
      SFX.crash(); shake = 0.35;
      for (let i = 0; i < 10; i++) particles.push({ x: e.x, y: e.y, vx: (Math.random() - 0.5) * 160, vy: (Math.random() - 0.5) * 160, life: 0, max: 0.4 + Math.random() * 0.3, r: 2, color: '#ffd166', kind: 'spark' });
      break;
    }
    case 'deploy': SFX.ladder(); break;
    case 'extinguished': {
      SFX.saved();
      const parts = ['+' + e.gained];
      if (e.clean) parts.push('clean run');
      banner = { text: 'SAVED', sub: parts.join(' · '), t: 0, dur: 1.8, color: '#7dffb0' };
      floaters.push({ x: e.building.cx, y: e.building.cy, text: '+' + e.gained, t: 0, dur: 1.4, color: '#7dffb0' });
      scoreEl.textContent = game.score; firesEl.textContent = game.firesOut;
      if (game.score > highScore) { highScore = game.score; hiEl.textContent = highScore; try { localStorage.setItem(HS_KEY, String(highScore)); } catch (er) {} }
      setMission('Saved. Listen for the next alarm.', true);
      break;
    }
    case 'burnout': {
      SFX.burnout(); shake = 0.5;
      banner = { text: 'BURNED DOWN', sub: game.lives + (game.lives === 1 ? ' building left' : ' buildings left'), t: 0, dur: 2.2, color: '#ff6b6b' };
      setMission('Lost one. ' + game.lives + ' more and the shift is over.');
      break;
    }
    case 'gameover': {
      SFX.over();
      gtagEvent('game_over', { score: e.score, fires: e.fires, mode });
      setMission('Shift over. ' + e.fires + (e.fires === 1 ? ' fire' : ' fires') + ' put out.');
      setTimeout(() => {
        showMenu('Shift over · ' + e.fires + ' saved · ' + e.score + ' points');
        if (window.ArcadeGameOver) window.ArcadeGameOver.show({ score: e.score, best: highScore, restart: () => { gtagEvent('play_again', { from: 'hook-and-ladder' }); startMode(mode); } });
      }, 900);
      break;
    }
  }
}

// ---------------------------------------------------------------- city layer
function roundRect(c, x, y, w, h, r) {
  c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
}
function buildCityLayer() {
  const off = document.createElement('canvas');
  off.width = canvas.width; off.height = canvas.height;
  const c = off.getContext('2d');
  c.setTransform(scale, 0, 0, scale, 0, 0);
  const w = game.world;
  // asphalt
  c.fillStyle = '#34363c'; c.fillRect(0, 0, W, H);
  // subtle asphalt grain
  c.fillStyle = 'rgba(255,255,255,0.025)';
  for (let i = 0; i < 400; i++) c.fillRect((i * 7919) % W, (i * 104729) % H, 3, 3);
  // Lane markings: a solid white line marks the curb lane on each side, a
  // dashed yellow centre line splits the two through lanes. None inside intersections.
  const hRuns = [], vRuns = [];
  for (let r = 0; r < ROWS; r += PITCH) for (let cc = 0; cc < COLS; cc++) if (!isStreetCol(cc)) hRuns.push([cc * TILE, (cc + 1) * TILE, r]);
  for (let cc = 0; cc < COLS; cc += PITCH) for (let r = 0; r < ROWS; r++) if (!isStreetRow(r)) vRuns.push([r * TILE, (r + 1) * TILE, cc]);
  c.lineWidth = 2;
  c.strokeStyle = 'rgba(255,255,255,0.38)'; c.setLineDash([]);
  for (const [a, b, r] of hRuns) for (const k of [1, 2]) { c.beginPath(); c.moveTo(a, (r + k) * TILE); c.lineTo(b, (r + k) * TILE); c.stroke(); }
  for (const [a, b, cc] of vRuns) for (const k of [1, 2]) { c.beginPath(); c.moveTo((cc + k) * TILE, a); c.lineTo((cc + k) * TILE, b); c.stroke(); }
  c.strokeStyle = '#d9b64a'; c.setLineDash([14, 12]);
  for (const [a, b, r] of hRuns) { c.beginPath(); c.moveTo(a, (r + 1.5) * TILE); c.lineTo(b, (r + 1.5) * TILE); c.stroke(); }
  for (const [a, b, cc] of vRuns) { c.beginPath(); c.moveTo((cc + 1.5) * TILE, a); c.lineTo((cc + 1.5) * TILE, b); c.stroke(); }
  c.setLineDash([]);
  // corner curb bumps: a small white stop line where each block face meets an intersection
  c.fillStyle = 'rgba(255,255,255,0.5)';
  for (let by = 0; by < BLOCKS_Y; by++) for (let bx = 0; bx < BLOCKS_X; bx++) {
    const b = blockAt(bx, by), x = b.col * TILE, y = b.row * TILE, s4 = 4 * TILE;
    c.fillRect(x - TILE * STREET_W + 4, y - 8, TILE * STREET_W - 8, 3); c.fillRect(x - TILE * STREET_W + 4, y + s4 + 5, TILE * STREET_W - 8, 3);
    c.fillRect(x - 8, y - TILE * STREET_W + 4, 3, TILE * STREET_W - 8); c.fillRect(x + s4 + 5, y - TILE * STREET_W + 4, 3, TILE * STREET_W - 8);
  }
  // sidewalks around each block
  for (let by = 0; by < BLOCKS_Y; by++) for (let bx = 0; bx < BLOCKS_X; bx++) {
    const b = blockAt(bx, by), x = b.col * TILE, y = b.row * TILE;
    c.fillStyle = '#8f9096'; c.fillRect(x, y, 4 * TILE, 4 * TILE);
    c.strokeStyle = 'rgba(0,0,0,0.18)'; c.lineWidth = 1;
    for (let k = 1; k < 8; k++) { c.beginPath(); c.moveTo(x + k * 20, y); c.lineTo(x + k * 20, y + 4 * TILE); c.stroke(); c.beginPath(); c.moveTo(x, y + k * 20); c.lineTo(x + 4 * TILE, y + k * 20); c.stroke(); }
    c.strokeStyle = '#b9bac0'; c.lineWidth = 2; c.strokeRect(x + 1, y + 1, 4 * TILE - 2, 4 * TILE - 2);
  }
  // parks
  for (const p of w.parks) {
    const x = p.col * TILE + 6, y = p.row * TILE + 6, s = 4 * TILE - 12;
    c.fillStyle = '#4d8b4b'; roundRect(c, x, y, s, s, 10); c.fill();
    c.fillStyle = 'rgba(0,0,0,0.08)';
    for (let i = 0; i < 12; i++) { c.beginPath(); c.arc(x + 12 + ((i * 53) % (s - 24)), y + 12 + ((i * 97) % (s - 24)), 8 + (i % 3) * 4, 0, Math.PI * 2); c.fill(); }
    c.strokeStyle = '#cbb27a'; c.lineWidth = 6; c.beginPath(); c.moveTo(x + 8, y + s / 2); c.quadraticCurveTo(x + s / 2, y + s / 2 - 30, x + s - 8, y + s / 2); c.stroke();
  }
  for (const t of w.trees) {
    c.fillStyle = 'rgba(0,0,0,0.3)'; c.beginPath(); c.arc(t.x + 3, t.y + 4, t.r, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#2f6b33'; c.beginPath(); c.arc(t.x, t.y, t.r, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#4c9a4a'; c.beginPath(); c.arc(t.x - t.r * 0.25, t.y - t.r * 0.25, t.r * 0.55, 0, Math.PI * 2); c.fill();
  }
  // buildings
  for (const b of w.buildings) drawBuildingBase(c, b);
  // parked cars
  for (const car of w.cars) {
    c.fillStyle = 'rgba(0,0,0,0.35)'; roundRect(c, car.x + 2, car.y + 3, car.w, car.h, 4); c.fill();
    c.fillStyle = car.color; roundRect(c, car.x, car.y, car.w, car.h, 4); c.fill();
    c.fillStyle = 'rgba(20,30,45,0.85)';
    if (car.dir === 'h') { c.fillRect(car.x + 7, car.y + 3, 6, car.h - 6); c.fillRect(car.x + car.w - 11, car.y + 3, 4, car.h - 6); }
    else { c.fillRect(car.x + 3, car.y + 7, car.w - 6, 6); c.fillRect(car.x + 3, car.y + car.h - 11, car.w - 6, 4); }
    c.strokeStyle = 'rgba(255,255,255,0.25)'; c.lineWidth = 1; roundRect(c, car.x + 0.5, car.y + 0.5, car.w - 1, car.h - 1, 4); c.stroke();
  }
  return off;
}
function drawBuildingBase(c, b) {
  const x = b.col * TILE + 7, y = b.row * TILE + 7, w = b.w * TILE - 14, h = b.h * TILE - 14;
  c.fillStyle = 'rgba(0,0,0,0.38)'; c.fillRect(x + 5, y + 6, w, h);
  c.fillStyle = b.roof; c.fillRect(x, y, w, h);
  c.fillStyle = 'rgba(255,255,255,0.14)'; c.fillRect(x, y, w, 3); c.fillRect(x, y, 3, h);
  c.fillStyle = 'rgba(0,0,0,0.22)'; c.fillRect(x, y + h - 3, w, 3); c.fillRect(x + w - 3, y, 3, h);
  c.strokeStyle = 'rgba(0,0,0,0.28)'; c.lineWidth = 1; c.strokeRect(x + 6.5, y + 6.5, w - 13, h - 13);
  // roof furniture, seeded by id
  const r = (n) => ((b.id * 9301 + n * 49297) % 233280) / 233280;
  const units = 1 + Math.floor(r(1) * 3);
  for (let i = 0; i < units; i++) {
    const ux = x + 12 + r(2 + i) * (w - 34), uy = y + 12 + r(9 + i) * (h - 34);
    c.fillStyle = '#5b5f66'; c.fillRect(ux, uy, 14, 10);
    c.fillStyle = '#8a8f97'; c.fillRect(ux + 2, uy + 2, 10, 6);
  }
  if (b.floors >= 5) {
    const tx = x + w - 22, ty = y + 12;
    c.fillStyle = 'rgba(0,0,0,0.3)'; c.beginPath(); c.arc(tx + 2, ty + 2, 9, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#6e5a48'; c.beginPath(); c.arc(tx, ty, 9, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#8c7561'; c.beginPath(); c.arc(tx, ty, 5, 0, Math.PI * 2); c.fill();
  }
}

// ---------------------------------------------------------------- dynamic drawing
function drawZones(t) {
  const f = game.fire; if (!f) return;
  const parked = parkedInZone(game);
  const pulse = 0.55 + 0.45 * Math.sin(t * 5);
  for (const z of f.building.zones) {
    const ready = parked === z && Math.abs(game.truck.v) < RULES.parkSpeed;
    ctx.fillStyle = ready ? 'rgba(90,230,140,0.30)' : `rgba(255,190,60,${0.14 + 0.12 * pulse})`;
    ctx.fillRect(z.x, z.y, z.w, z.h);
    ctx.setLineDash([8, 6]); ctx.lineDashOffset = -t * 40;
    ctx.strokeStyle = ready ? '#7dffb0' : `rgba(255,205,90,${0.6 + 0.4 * pulse})`; ctx.lineWidth = 2;
    ctx.strokeRect(z.x + 1, z.y + 1, z.w - 2, z.h - 2);
    ctx.setLineDash([]);
    // hydrant-style marker in the lane
    ctx.fillStyle = ready ? '#7dffb0' : '#ffcf5a';
    ctx.font = `bold ${Math.round(13 * Math.min(hud, 1.5))}px Inter, system-ui, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.save(); ctx.translate(z.x + z.w / 2, z.y + z.h / 2);
    if (z.h > z.w) ctx.rotate(-Math.PI / 2);   // vertical lane: run the label along it
    ctx.fillText('LADDER', 0, 0); ctx.restore();
  }
}
function drawBurning(b, t) {
  const x = b.col * TILE + 7, y = b.row * TILE + 7, w = b.w * TILE - 14, h = b.h * TILE - 14;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const glow = ctx.createRadialGradient(b.cx, b.cy, 10, b.cx, b.cy, Math.max(w, h) * 0.9);
  glow.addColorStop(0, `rgba(255,140,40,${0.5 + 0.15 * Math.sin(t * 9)})`); glow.addColorStop(1, 'rgba(255,60,0,0)');
  ctx.fillStyle = glow; ctx.fillRect(x - 40, y - 40, w + 80, h + 80);
  const n = 6;
  for (let i = 0; i < n; i++) {
    const fx = x + w * (0.2 + 0.6 * ((i * 0.37 + 0.13) % 1)), fy = y + h * (0.2 + 0.6 * ((i * 0.61 + 0.29) % 1));
    const flick = 0.75 + 0.35 * Math.sin(t * (11 + i) + i * 1.7);
    const rr = (10 + (i % 3) * 4) * flick;
    ctx.fillStyle = 'rgba(255,80,20,0.75)'; ctx.beginPath(); ctx.ellipse(fx, fy, rr, rr * 1.35, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,170,40,0.85)'; ctx.beginPath(); ctx.ellipse(fx, fy + 2, rr * 0.6, rr * 0.95, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,240,180,0.9)'; ctx.beginPath(); ctx.ellipse(fx, fy + 4, rr * 0.25, rr * 0.45, 0, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}
function drawRuined(b) {
  const x = b.col * TILE + 7, y = b.row * TILE + 7, w = b.w * TILE - 14, h = b.h * TILE - 14;
  ctx.fillStyle = '#26221f'; ctx.fillRect(x, y, w, h);
  ctx.fillStyle = '#3b3531';
  for (let i = 0; i < 5; i++) ctx.fillRect(x + 8 + ((i * 37) % (w - 30)), y + 8 + ((i * 53) % (h - 30)), 14, 9);
  ctx.strokeStyle = 'rgba(0,0,0,0.6)'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(x + w * 0.2, y); ctx.lineTo(x + w * 0.45, y + h * 0.5); ctx.lineTo(x + w * 0.3, y + h); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x + w, y + h * 0.3); ctx.lineTo(x + w * 0.6, y + h * 0.55); ctx.stroke();
}
function drawSaved(b) {
  const x = b.col * TILE + 7, y = b.row * TILE + 7, w = b.w * TILE - 14, h = b.h * TILE - 14;
  ctx.fillStyle = 'rgba(80,140,200,0.18)'; ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = 'rgba(125,255,176,0.8)'; ctx.lineWidth = 2; ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);
}

function wheel(x, y, angle, len = 12, wid = 6) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(angle);
  ctx.fillStyle = '#111'; roundRect(ctx, -len / 2, -wid / 2, len, wid, 2); ctx.fill();
  ctx.fillStyle = '#444'; ctx.fillRect(-1, -wid / 2, 2, wid);
  ctx.restore();
}
function drawTruck(t) {
  const tr = game.truck, R = RULES, hw = R.width / 2;
  const alarm = !!game.fire || !!game.ladder;
  // ---- trailer
  ctx.save(); ctx.translate(tr.x, tr.y); ctx.rotate(tr.h2);
  ctx.fillStyle = 'rgba(0,0,0,0.35)'; roundRect(ctx, -(R.L2 + R.trailerBack) + 3, -hw + 4, R.L2 + R.trailerBack + R.trailerFront, R.width, 4); ctx.fill();
  wheel(-R.L2, -hw + 2, tr.tiller); wheel(-R.L2, hw - 2, tr.tiller);
  wheel(-R.L2 + 14, -hw + 2, 0); wheel(-R.L2 + 14, hw - 2, 0);
  ctx.fillStyle = '#c4202a'; roundRect(ctx, -(R.L2 + R.trailerBack), -hw, R.L2 + R.trailerBack + R.trailerFront, R.width, 4); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.75)'; ctx.fillRect(-(R.L2 + R.trailerBack) + 2, -hw + 1, R.L2 + R.trailerBack + R.trailerFront - 4, 2); ctx.fillRect(-(R.L2 + R.trailerBack) + 2, hw - 3, R.L2 + R.trailerBack + R.trailerFront - 4, 2);
  // tillerman's cab at the very back
  ctx.fillStyle = '#8c1a22'; ctx.fillRect(-(R.L2 + R.trailerBack), -hw + 3, 14, R.width - 6);
  ctx.fillStyle = '#1b2733'; ctx.fillRect(-(R.L2 + R.trailerBack) + 2, -hw + 5, 4, R.width - 10);
  // stowed ladder
  if (!game.ladder) {
    ctx.strokeStyle = '#f2f2f2'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(-R.L2 + 2, -5); ctx.lineTo(R.trailerFront - 3, -5); ctx.moveTo(-R.L2 + 2, 5); ctx.lineTo(R.trailerFront - 3, 5); ctx.stroke();
    ctx.lineWidth = 1.5;
    for (let s = -R.L2 + 6; s < R.trailerFront - 3; s += 7) { ctx.beginPath(); ctx.moveTo(s, -5); ctx.lineTo(s, 5); ctx.stroke(); }
  }
  // turntable
  ctx.fillStyle = '#6d6f75'; ctx.beginPath(); ctx.arc(-R.turntable, 0, 8, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#a9abb1'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(-R.turntable, 0, 5, 0, Math.PI * 2); ctx.stroke();
  ctx.restore();
  // ---- tractor
  ctx.save(); ctx.translate(tr.x, tr.y); ctx.rotate(tr.h1);
  ctx.fillStyle = 'rgba(0,0,0,0.35)'; roundRect(ctx, -R.tractorBack + 3, -hw + 4, R.tractorLen, R.width, 5); ctx.fill();
  wheel(0, -hw + 2, 0); wheel(0, hw - 2, 0);
  wheel(R.L1, -hw + 2, tr.steer); wheel(R.L1, hw - 2, tr.steer);
  const nose = R.tractorLen - R.tractorBack;
  ctx.fillStyle = '#d0232e'; roundRect(ctx, -R.tractorBack, -hw, R.tractorLen, R.width, 5); ctx.fill();
  ctx.fillStyle = '#e63946'; roundRect(ctx, 3, -hw + 2, nose - 16, R.width - 4, 3); ctx.fill();   // cab roof
  ctx.fillStyle = '#1b2733'; ctx.fillRect(nose - 13, -hw + 3, 8, R.width - 6);                     // windshield
  ctx.fillStyle = '#f6f6f6'; ctx.fillRect(nose - 5, -hw + 4, 4, R.width - 8);                      // grille / bumper
  ctx.fillStyle = '#ffe08a'; ctx.fillRect(nose - 3, -hw + 2, 3, 4); ctx.fillRect(nose - 3, hw - 6, 3, 4);   // headlights
  ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.fillRect(-R.tractorBack + 2, -hw + 1, R.tractorLen - 4, 2); ctx.fillRect(-R.tractorBack + 2, hw - 3, R.tractorLen - 4, 2);
  // light bar
  const flashRed = Math.floor(t * 8) % 2 === 0;
  ctx.fillStyle = alarm ? (flashRed ? '#ff2f2f' : '#8a1010') : '#5a1a1a'; ctx.fillRect(8, -hw + 3, 5, hw - 4);
  ctx.fillStyle = alarm ? (flashRed ? '#102a8a' : '#2f6bff') : '#1a2a5a'; ctx.fillRect(8, 1, 5, hw - 4);
  ctx.restore();
  if (alarm && game.status === 'playing') {
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createRadialGradient(tr.x, tr.y, 4, tr.x, tr.y, 70);
    g.addColorStop(0, flashRed ? 'rgba(255,40,40,0.22)' : 'rgba(60,110,255,0.22)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.fillRect(tr.x - 70, tr.y - 70, 140, 140);
    ctx.restore();
  }
  // ---- extended ladder
  const L = game.ladder;
  if (L) {
    const tt = turntable(tr);
    const ease = x => 1 - Math.pow(1 - x, 3);
    const p = L.retract ? 1 - Math.min(1, L.t / RULES.retractTime) : ease(Math.min(1, L.t / RULES.ladderTime));
    const ang = Math.atan2(L.y1 - tt.y, L.x1 - tt.x);
    const len = 20 + (Math.hypot(L.x1 - tt.x, L.y1 - tt.y) - 20) * p;
    ctx.save(); ctx.translate(tt.x, tt.y); ctx.rotate(ang);
    ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(0, -7 + 5, len, 14);
    ctx.strokeStyle = '#f4f4f4'; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(0, -6); ctx.lineTo(len, -5); ctx.moveTo(0, 6); ctx.lineTo(len, 5); ctx.stroke();
    ctx.lineWidth = 1.5;
    for (let s = 6; s < len; s += 8) { ctx.beginPath(); ctx.moveTo(s, -6); ctx.lineTo(s, 6); ctx.stroke(); }
    ctx.fillStyle = '#c4202a'; ctx.fillRect(len - 8, -8, 8, 16);
    ctx.restore();
    ctx.fillStyle = '#6d6f75'; ctx.beginPath(); ctx.arc(tt.x, tt.y, 9, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#d9dbe0'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(tt.x, tt.y, 6, 0, Math.PI * 2); ctx.stroke();
    if (!L.retract && p > 0.8) {
      const tipX = tt.x + Math.cos(ang) * len, tipY = tt.y + Math.sin(ang) * len;
      for (let i = 0; i < 3; i++) particles.push({ x: tipX, y: tipY, vx: Math.cos(ang) * 90 + (Math.random() - 0.5) * 60, vy: Math.sin(ang) * 90 + (Math.random() - 0.5) * 60, life: 0, max: 0.5 + Math.random() * 0.3, r: 2.5, color: '#7fd0ff', kind: 'water' });
    }
  }
}

function drawParticles(dt) {
  for (const p of particles) {
    p.life += dt; p.x += p.vx * dt; p.y += p.vy * dt;
    if (p.kind === 'smoke') { p.vx *= 0.98; p.r += 14 * dt; }
    if (p.kind === 'water') p.vy += 60 * dt;
  }
  particles = particles.filter(p => p.life < p.max);
  if (particles.length > 600) particles.splice(0, particles.length - 600);
  for (const p of particles) {
    const a = 1 - p.life / p.max;
    ctx.globalAlpha = p.kind === 'smoke' ? a * 0.32 : a;
    ctx.fillStyle = p.color;
    ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;
}
function spawnSmoke(b, dt) {
  if (Math.random() < dt * 22) {
    particles.push({ x: b.cx + (Math.random() - 0.5) * b.w * TILE * 0.6, y: b.cy + (Math.random() - 0.5) * b.h * TILE * 0.5, vx: 18 + Math.random() * 12, vy: -34 - Math.random() * 20, life: 0, max: 2.2 + Math.random() * 1.2, r: 6 + Math.random() * 5, color: '#4a4a52', kind: 'smoke' });
  }
}

function hudBox(x, y, w, h, align = 'left') {
  ctx.fillStyle = 'rgba(8,10,16,0.72)'; roundRect(ctx, x, y, w, h, 8); ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.12)'; ctx.lineWidth = 1; roundRect(ctx, x + 0.5, y + 0.5, w - 1, h - 1, 8); ctx.stroke();
}
function drawHUD(t) {
  // The HUD is laid out in a (W/hud × H/hud) frame and magnified, so it stays legible on phones.
  ctx.save(); ctx.scale(hud, hud);
  drawHUDIn(t, W / hud, H / hud);
  ctx.restore();
}
function drawHUDIn(t, W, H) {
  const f = game.fire;
  // Alarm clock, top centre
  if (f) {
    const w = Math.min(300, W - 350), x = W / 2 - w / 2, y = 10;   // never overlap the corner boxes on phones
    hudBox(x, y, w, 40);
    const frac = f.t / f.total;
    const urgent = f.t < 8;
    ctx.fillStyle = 'rgba(255,255,255,0.12)'; roundRect(ctx, x + 12, y + 24, w - 24, 8, 4); ctx.fill();
    ctx.fillStyle = urgent ? (Math.floor(t * 6) % 2 ? '#ff5252' : '#ffb3b3') : frac < 0.4 ? '#ffb347' : '#7dffb0';
    roundRect(ctx, x + 12, y + 24, Math.max(8, (w - 24) * frac), 8, 4); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.font = 'bold 13px Inter, system-ui, sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.fillText('ALARM', x + 12, y + 13);
    ctx.textAlign = 'right'; ctx.fillStyle = urgent ? '#ff6b6b' : '#ffd166';
    ctx.font = 'bold 15px "JetBrains Mono", monospace';
    ctx.fillText(Math.ceil(f.t) + 's', x + w - 12, y + 13);
  } else if (game.status === 'playing') {
    const w = Math.min(220, W - 350), x = W / 2 - w / 2, y = 10;
    hudBox(x, y, w, 30);
    ctx.fillStyle = '#c9ccd4'; ctx.font = '600 12px Inter, system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(w < 220 ? 'STANDING BY' : 'STANDING BY · listen for the alarm', x + w / 2, y + 15);
  }
  // score + fires, top left
  hudBox(10, 10, 150, 40);
  ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  ctx.fillStyle = '#9aa0ad'; ctx.font = '600 10px Inter, system-ui, sans-serif'; ctx.fillText('SCORE', 20, 21);
  ctx.fillStyle = '#fff'; ctx.font = 'bold 16px "JetBrains Mono", monospace'; ctx.fillText(String(game.score), 20, 37);
  ctx.fillStyle = '#9aa0ad'; ctx.font = '600 10px Inter, system-ui, sans-serif'; ctx.fillText('SAVED', 100, 21);
  ctx.fillStyle = '#7dffb0'; ctx.font = 'bold 16px "JetBrains Mono", monospace'; ctx.fillText(String(game.firesOut), 100, 37);
  // buildings left, top right
  hudBox(W - 160, 10, 150, 40);
  ctx.fillStyle = '#9aa0ad'; ctx.font = '600 10px Inter, system-ui, sans-serif'; ctx.fillText('BUILDINGS', W - 150, 21);
  for (let i = 0; i < RULES.lives; i++) {
    const x = W - 150 + i * 22, y = 30;
    const alive = i < game.lives;
    ctx.fillStyle = alive ? '#ffd166' : 'rgba(255,255,255,0.15)';
    ctx.fillRect(x, y, 14, 12);
    ctx.fillStyle = alive ? '#5a3d00' : 'rgba(0,0,0,0.3)';
    ctx.fillRect(x + 3, y + 3, 3, 3); ctx.fillRect(x + 8, y + 3, 3, 3); ctx.fillRect(x + 3, y + 8, 3, 3); ctx.fillRect(x + 8, y + 8, 3, 3);
  }
  // role labels along the bottom
  const labelY = H - 26;
  const p1 = mode === 'duo' ? 'P1 DRIVER   W/S gas · A/D steer' : 'DRIVER   W/S gas · A/D steer · Space ladder';
  const p2 = 'P2 TILLER   ◀ ▶ rear wheels · ▲ ladder';
  ctx.font = '600 12px Inter, system-ui, sans-serif'; ctx.textBaseline = 'middle';
  hudBox(10, labelY - 14, ctx.measureText(p1).width + 24, 28);
  ctx.fillStyle = '#ffd166'; ctx.textAlign = 'left'; ctx.fillText(p1, 22, labelY);
  if (mode === 'duo') {
    const w2 = ctx.measureText(p2).width + 24;
    hudBox(W - 10 - w2, labelY - 14, w2, 28);
    ctx.fillStyle = '#7fd0ff'; ctx.textAlign = 'right'; ctx.fillText(p2, W - 22, labelY);
  }
  // raise-ladder prompt (truck coordinates are in the unscaled frame)
  if (canRaiseLadder(game)) {
    const tr = { x: game.truck.x / hud, y: game.truck.y / hud };
    const txt = mode === 'duo' ? '▲  P2: RAISE LADDER' : 'SPACE: RAISE LADDER';
    ctx.font = 'bold 15px Inter, system-ui, sans-serif'; ctx.textAlign = 'center';
    const w = ctx.measureText(txt).width + 26;
    const bx = Math.min(W - w - 10, Math.max(10, tr.x - w / 2)), by = Math.min(H - 70, Math.max(60, tr.y - 70));
    const pulse = 0.7 + 0.3 * Math.sin(t * 8);
    ctx.fillStyle = `rgba(20,90,50,${0.85 * pulse})`; roundRect(ctx, bx, by, w, 32, 8); ctx.fill();
    ctx.strokeStyle = '#7dffb0'; ctx.lineWidth = 2; roundRect(ctx, bx, by, w, 32, 8); ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.fillText(txt, bx + w / 2, by + 16);
  } else if (f && parkedInZone(game) && Math.abs(game.truck.v) >= RULES.parkSpeed && !game.ladder) {
    const tr = { x: game.truck.x / hud, y: game.truck.y / hud };
    ctx.font = 'bold 13px Inter, system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = '#ffd166';
    ctx.fillText('STOP THE TRUCK', tr.x, Math.max(60, tr.y - 60));
  }
  // onboarding labels near the truck for the first seconds
  if (game.status === 'playing' && game.t < 9 && mode === 'duo') {
    const a = Math.min(1, (9 - game.t) / 1.5);
    const tr = game.truck;
    const cab = { x: (tr.x + Math.cos(tr.h1) * 30) / hud, y: (tr.y + Math.sin(tr.h1) * 30) / hud };
    const tail = { x: (tr.x - Math.cos(tr.h2) * RULES.L2) / hud, y: (tr.y - Math.sin(tr.h2) * RULES.L2) / hud };
    ctx.globalAlpha = a;
    ctx.font = 'bold 12px Inter, system-ui, sans-serif'; ctx.textAlign = 'center';
    ctx.strokeStyle = '#ffd166'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(cab.x, cab.y - 16); ctx.lineTo(cab.x, cab.y - 34); ctx.stroke();
    ctx.fillStyle = '#ffd166'; ctx.fillText('P1 DRIVER', cab.x, cab.y - 42);
    ctx.strokeStyle = '#7fd0ff'; ctx.beginPath(); ctx.moveTo(tail.x, tail.y + 16); ctx.lineTo(tail.x, tail.y + 34); ctx.stroke();
    ctx.fillStyle = '#7fd0ff'; ctx.fillText('P2 TILLER', tail.x, tail.y + 46);
    ctx.globalAlpha = 1;
  }
}
function drawBanner(dt) {
  if (!banner) return;
  banner.t += dt;
  if (banner.t > banner.dur) { banner = null; return; }
  const a = Math.min(1, banner.t / 0.15, (banner.dur - banner.t) / 0.4);
  const pop = 1 + 0.08 * Math.max(0, 1 - banner.t / 0.25);
  ctx.save(); ctx.globalAlpha = a; ctx.translate(W / 2, H * 0.42); ctx.scale(pop * Math.min(hud, 1.6), pop * Math.min(hud, 1.6));
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = 'bold 56px "Bricolage Grotesque", Inter, system-ui, sans-serif';
  ctx.lineWidth = 8; ctx.strokeStyle = 'rgba(0,0,0,0.75)'; ctx.strokeText(banner.text, 0, 0);
  ctx.fillStyle = banner.color; ctx.fillText(banner.text, 0, 0);
  if (banner.sub) {
    ctx.font = '600 18px Inter, system-ui, sans-serif';
    ctx.lineWidth = 5; ctx.strokeText(banner.sub, 0, 44); ctx.fillStyle = '#fff'; ctx.fillText(banner.sub, 0, 44);
  }
  ctx.restore();
}
function drawFloaters(dt) {
  for (const f of floaters) f.t += dt;
  floaters = floaters.filter(f => f.t < f.dur);
  for (const f of floaters) {
    ctx.globalAlpha = 1 - f.t / f.dur;
    ctx.font = `bold ${Math.round(20 * hud)}px "JetBrains Mono", monospace`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(0,0,0,0.7)'; ctx.strokeText(f.text, f.x, f.y - f.t * 30);
    ctx.fillStyle = f.color; ctx.fillText(f.text, f.x, f.y - f.t * 30);
  }
  ctx.globalAlpha = 1;
}

// ---------------------------------------------------------------- loop
function render(dt, t) {
  if (!cityLayer || cityLayer.width !== canvas.width) cityLayer = buildCityLayer();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.drawImage(cityLayer, 0, 0);
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  if (shake > 0) { shake = Math.max(0, shake - dt); const s = shake * 8; ctx.translate((Math.random() - 0.5) * s, (Math.random() - 0.5) * s); }
  for (const b of game.world.buildings) {
    if (b.state === 'ruined') drawRuined(b);
    else if (b.state === 'saved') drawSaved(b);
  }
  drawZones(t);
  if (game.fire) { drawBurning(game.fire.building, t); spawnSmoke(game.fire.building, dt); }
  drawTruck(t);
  drawParticles(dt);
  drawFloaters(dt);
  if (game.status !== 'menu') drawHUD(t);
  drawBanner(dt);
}
function frame(ts) {
  const dt = Math.min(1 / 20, lastTs ? (ts - lastTs) / 1000 : 1 / 60);
  lastTs = ts;
  lightPhase += dt;
  if (game.status === 'playing' && !game.paused) {
    step(game, dt, readInput());
    for (const e of drainEvents(game)) onEvent(e);
  }
  render(game.paused ? 0 : dt, lightPhase);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
showMenu('');
// Debug/verification handle (read-only use; tools/VERIFICATION.md drives the game through it).
window.__hookLadder = () => ({ game, mode, held, particles });
