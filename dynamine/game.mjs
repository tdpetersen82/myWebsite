// Dynamine — page driver: rendering, input, sound, menu. Rules live in engine.mjs.
// Theme: a limestone mine. Miners, dynamite, rock, bats and knockers, a lift.
import {
  createGame, step, drainEvents, W, H, FLOOR, WALL, BRICK, RULES, ITEM, ENEMY, tileOf, atCentre,
} from './engine.mjs?v=20260914a';

const TILE = 56, HUD = 48;
const BW = W * TILE, BH = H * TILE;
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
canvas.width = BW; canvas.height = BH + HUD;
const menu = document.getElementById('menu');
const menuSub = document.getElementById('menu-sub');
const scoreEl = document.getElementById('score');
const hiEl = document.getElementById('highScore');
const HS_KEY = 'dynamineHighScore';
let highScore = parseInt(localStorage.getItem(HS_KEY) || '0', 10) || 0;
hiEl.textContent = highScore;

const gtagEvent = (name, params) => { if (typeof window.gtag === 'function') window.gtag('event', name, params); };

// ---------------------------------------------------------------- sound
const Sound = (() => {
  let ac = null, muted = false;
  const ctxGet = () => {
    if (!ac) { try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { ac = null; } }
    if (ac && ac.state === 'suspended') ac.resume().catch(() => {});
    return ac;
  };
  ['pointerdown', 'keydown', 'touchstart'].forEach(ev => window.addEventListener(ev, () => ctxGet(), { passive: true }));
  function tone(freq, dur, { type = 'sine', gain = 0.18, slide = null, delay = 0 } = {}) {
    const a = ctxGet(); if (!a || muted) return;
    const t0 = a.currentTime + delay;
    const o = a.createOscillator(), g = a.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t0);
    if (slide) o.frequency.exponentialRampToValueAtTime(slide, t0 + dur);
    g.gain.setValueAtTime(gain, t0); g.gain.exponentialRampToValueAtTime(0.0008, t0 + dur);
    o.connect(g).connect(a.destination); o.start(t0); o.stop(t0 + dur + 0.02);
  }
  function noise(dur, { from = 1200, to = 200, gain = 0.35, delay = 0 } = {}) {
    const a = ctxGet(); if (!a || muted) return;
    const t0 = a.currentTime + delay;
    const buf = a.createBuffer(1, Math.ceil(a.sampleRate * dur), a.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
    const src = a.createBufferSource(); src.buffer = buf;
    const f = a.createBiquadFilter(); f.type = 'lowpass';
    f.frequency.setValueAtTime(from, t0); f.frequency.exponentialRampToValueAtTime(to, t0 + dur);
    const g = a.createGain(); g.gain.setValueAtTime(gain, t0); g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    src.connect(f).connect(g).connect(a.destination); src.start(t0);
  }
  return {
    toggle() { muted = !muted; return muted; },
    place() { tone(150, 0.09, { type: 'sine', slide: 70, gain: 0.2 }); },
    explode() { noise(0.42, { from: 1400, to: 160, gain: 0.4 }); tone(60, 0.35, { type: 'sine', slide: 30, gain: 0.3 }); },
    brick() { noise(0.12, { from: 2600, to: 500, gain: 0.12 }); },
    pickup() { tone(660, 0.09, { type: 'square', gain: 0.08 }); tone(990, 0.14, { type: 'square', gain: 0.08, delay: 0.08 }); },
    kill() { tone(320, 0.12, { type: 'triangle', slide: 720, gain: 0.16 }); },
    death() { tone(420, 0.55, { type: 'sawtooth', slide: 70, gain: 0.14 }); noise(0.3, { from: 900, to: 100, gain: 0.12, delay: 0.05 }); },
    door() { [523, 659, 784].forEach((f, i) => tone(f, 0.35, { type: 'triangle', gain: 0.1, delay: i * 0.07 })); },
    clear() { [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.28, { type: 'square', gain: 0.07, delay: i * 0.11 })); },
    hurry() { [880, 660, 880, 660].forEach((f, i) => tone(f, 0.16, { type: 'square', gain: 0.08, delay: i * 0.17 })); },
    thud() { noise(0.16, { from: 400, to: 80, gain: 0.25 }); tone(70, 0.18, { type: 'sine', slide: 40, gain: 0.2 }); },
    shield() { tone(1200, 0.2, { type: 'sine', slide: 300, gain: 0.12 }); },
    round() { [392, 523, 659].forEach((f, i) => tone(f, 0.3, { type: 'triangle', gain: 0.1, delay: i * 0.09 })); },
    life() { [784, 988, 1175, 1568].forEach((f, i) => tone(f, 0.2, { type: 'sine', gain: 0.1, delay: i * 0.06 })); },
  };
})();

// ---------------------------------------------------------------- input
// Per-player "held" lists, most recent key first, plus an edge-triggered bomb.
const held = [[], []];
const bombQueued = [false, false];
let mode = null;          // 'adventure' | 'cpu' | 'duel'
const KEYMAP = {
  arrows: { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right' },
  wasd: { w: 'up', s: 'down', a: 'left', d: 'right', W: 'up', S: 'down', A: 'left', D: 'right' },
};
function routeKey(e) {
  const k = e.key;
  const arrows = KEYMAP.arrows[k], wasd = KEYMAP.wasd[k];
  if (mode === 'duel') {
    if (wasd) return { p: 0, dir: wasd };
    if (arrows) return { p: 1, dir: arrows };
    if (k === ' ' || k === 'q' || k === 'Q' || k === 'e' || k === 'E') return { p: 0, bomb: true };
    if (k === 'Enter' || k === '/' || k === 'Shift' && e.location === 2) return { p: 1, bomb: true };
    return null;
  }
  if (arrows || wasd) return { p: 0, dir: arrows || wasd };
  if (k === ' ' || k === 'Enter' || k === 'z' || k === 'Z' || k === 'x' || k === 'X' || k === 'e' || k === 'E') return { p: 0, bomb: true };
  return null;
}
document.addEventListener('keydown', e => {
  if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'BUTTON' && menu.contains(e.target))) return;
  if (!game) return;
  const r = routeKey(e);
  if (!r) return;
  e.preventDefault();
  if (r.dir) {
    const h = held[r.p];
    const i = h.indexOf(r.dir); if (i >= 0) h.splice(i, 1);
    h.unshift(r.dir);
  } else if (r.bomb && !e.repeat) bombQueued[r.p] = true;
});
document.addEventListener('keyup', e => {
  const r = routeKey(e);
  if (!r || !r.dir) return;
  const h = held[r.p];
  const i = h.indexOf(r.dir); if (i >= 0) h.splice(i, 1);
});
window.addEventListener('blur', () => { held[0].length = 0; held[1].length = 0; });

// ---------------------------------------------------------------- game state
let game = null, paused = false, lastFrame = 0, acc = 0;
const FIXED = 1 / 120;
let blasts = [], particles = [], popups = [], corpses = [], banner = null, flashUntil = 0;
let shake = 0;
let runStartBest = 0;
let overShown = false;

function startMode(m) {
  mode = m;
  held[0].length = 0; held[1].length = 0; bombQueued[0] = bombQueued[1] = false;
  blasts = []; particles = []; popups = []; corpses = []; banner = null; shake = 0;
  overShown = false; paused = false;
  const bezel = document.querySelector('.ch-bezel');
  if (bezel) { bezel.classList.remove('ch-paused'); bezel.classList.add('ch-started'); }   // hides the chrome's INSERT COIN
  if (m === 'adventure') game = createGame({ mode: 'adventure' });
  else game = createGame({ mode: 'battle', cpu: m === 'cpu', p1Name: 'Blue', p2Name: m === 'cpu' ? 'The computer' : 'Red' });
  runStartBest = highScore;
  scoreEl.textContent = m === 'adventure' ? '0' : '0–0';
  menu.hidden = true;
  canvas.focus({ preventScroll: true });
  drainEvents(game).forEach(handleEvent);
  gtagEvent('dynamine_start', { mode: m });
}
function showMenu(sub) {
  game = null; mode = null;
  menuSub.textContent = sub || '';
  menu.hidden = false;
  scoreEl.textContent = '0';
}

// ---------------------------------------------------------------- events → presentation
function handleEvent(e) {
  const g = game;
  switch (e.type) {
    case 'level': banner = { text: 'LEVEL ' + e.level, sub: 'Blast the rock. Find the lift.', until: g.time + 1.6, style: 'level' }; break;
    case 'round': banner = { text: 'ROUND ' + e.round, sub: firstTo(), until: g.time + 1.6, style: 'level' }; break;
    case 'go': banner = { text: 'GO!', until: g.time + 0.5, style: 'go' }; break;
    case 'bomb': Sound.place(); break;
    case 'explode':
      Sound.explode(); shake = Math.max(shake, 5);
      blasts.push({ cells: e.cells, at: g.time });
      break;
    case 'brick':
      Sound.brick();
      for (let i = 0; i < 7; i++) particles.push({
        x: e.x + 0.5, y: e.y + 0.5, vx: (Math.random() - 0.5) * 6, vy: -Math.random() * 6 - 1,
        life: 0.55 + Math.random() * 0.3, size: 4 + Math.random() * 5, color: i % 3 === 0 ? '#e2d8be' : '#b8ab8c',
      });
      if (g.mode === 'adventure') popups.push({ x: e.x + 0.5, y: e.y + 0.5, text: '+' + RULES.brickScore, until: g.time + 0.7, small: true });
      break;
    case 'item': Sound.pickup(); popups.push({ x: e.x + 0.5, y: e.y + 0.5, text: ITEM_LABEL[e.item], until: g.time + 1.0 }); break;
    case 'kill':
      Sound.kill(); popups.push({ x: e.x, y: e.y, text: '+' + e.score, until: g.time + 1.0 });
      corpses.push({ x: e.x, y: e.y, type: e.enemy, at: g.time });
      break;
    case 'death':
      Sound.death(); shake = Math.max(shake, 8);
      if (g.mode === 'adventure' && g.lives > 0) banner = { text: g.lives + (g.lives === 1 ? ' LIFE LEFT' : ' LIVES LEFT'), until: g.time + 1.4, style: 'warn' };
      break;
    case 'shieldPop': Sound.shield(); popups.push({ x: g.players[e.player].x, y: g.players[e.player].y, text: 'HELMET!', until: g.time + 0.9 }); break;
    case 'respawn': break;
    case 'door': popups.push({ x: e.x + 0.5, y: e.y + 0.5, text: 'THE LIFT', until: g.time + 1.2 }); break;
    case 'doorOpen': Sound.door(); banner = { text: 'LIFT OPEN', sub: 'Get to the lift.', until: g.time + 1.5, style: 'good' }; break;
    case 'levelClear': Sound.clear(); banner = { text: 'LEVEL ' + e.level + ' CLEAR', sub: '+' + e.bonus.toLocaleString() + ' bonus', until: g.time + 2.4, style: 'good' }; break;
    case 'hurry': Sound.hurry(); banner = { text: 'HURRY!', sub: 'The gas has caught.', until: g.time + 1.6, style: 'warn' }; flashUntil = g.time + 0.6; break;
    case 'extraLife': Sound.life(); banner = { text: 'EXTRA LIFE', until: g.time + 1.4, style: 'good' }; break;
    case 'suddenDeath': Sound.hurry(); banner = { text: 'CAVE-IN', sub: 'The roof is coming down from the edges.', until: g.time + 1.8, style: 'warn' }; break;
    case 'wallDrop': Sound.thud(); shake = Math.max(shake, 3); break;
    case 'roundEnd': {
      Sound.round();
      const name = e.winner == null ? null : g.players[e.winner].name;
      banner = { text: name ? name.toUpperCase() + ' WINS THE ROUND' : 'DRAW', sub: e.wins[0] + ' – ' + e.wins[1], until: g.time + 2.6, style: name ? 'good' : 'warn' };
      scoreEl.textContent = e.wins[0] + '–' + e.wins[1];
      break;
    }
    case 'matchOver': {
      const wn = g.players[e.winner];
      const line = wn.name + ' wins the match ' + g.players[0].wins + '–' + g.players[1].wins;
      banner = { text: wn.name.toUpperCase() + ' WINS', sub: 'Match ' + g.players[0].wins + '–' + g.players[1].wins, until: g.time + 3.0, style: 'good' };
      gtagEvent('game_over', { score: g.players[0].wins, mode });
      setTimeout(() => { if (game === g) showMenu(line + '. Rematch?'); }, 3000);
      break;
    }
    case 'gameOver': {
      gtagEvent('game_over', { score: e.score, level: e.level });
      banner = { text: 'GAME OVER', sub: 'Level ' + e.level, until: g.time + 2.0, style: 'warn' };
      setTimeout(() => {
        if (game !== g || overShown) return;
        overShown = true;
        if (window.ArcadeGameOver) {
          window.ArcadeGameOver.show({ score: e.score, best: highScore, restart: () => { gtagEvent('play_again', { from: 'dynamine' }); startMode('adventure'); } });
        } else showMenu('Game over. Score ' + e.score.toLocaleString());
      }, 1600);
      break;
    }
  }
  if (banner && banner.shownAt == null) banner.shownAt = g.time;
}
const ITEM_LABEL = { bomb: '+DYNAMITE', fire: '+BLAST', speed: '+BOOTS', shield: 'HELMET' };
function firstTo() { return 'First to ' + RULES.battleWinsNeeded + ' rounds wins'; }

// ---------------------------------------------------------------- loop
function frame(now) {
  requestAnimationFrame(frame);
  const dtReal = Math.min(0.1, (now - lastFrame) / 1000 || 0);
  lastFrame = now;
  if (game && !paused && !window.__dynamine?.frozen) {
    acc += dtReal;
    while (acc >= FIXED) {
      const inputs = [
        { held: held[0], bomb: bombQueued[0] },
        { held: held[1], bomb: bombQueued[1] },
      ];
      bombQueued[0] = bombQueued[1] = false;
      step(game, FIXED, inputs);
      drainEvents(game).forEach(handleEvent);
      acc -= FIXED;
    }
    syncScore();
  }
  draw(dtReal);
}
// Mirror the score into the page (the chrome copies it to its topbar) and
// persist a new best the moment it happens, not only at game over.
function syncScore() {
  if (!game || game.mode !== 'adventure') return;
  scoreEl.textContent = game.score;
  if (game.score > highScore) { highScore = game.score; hiEl.textContent = highScore; localStorage.setItem(HS_KEY, String(highScore)); }
}
requestAnimationFrame(t => { lastFrame = t; frame(t); });

// ---------------------------------------------------------------- drawing
// Limestone mine: dark earth floor, timber-braced bedrock pillars, pale
// limestone boulders you blast with dynamite, and a lift cage for the exit.
const COL = {
  floorA: '#2b241f', floorB: '#27211c', floorLine: 'rgba(0,0,0,0.28)',
  rockTop: '#e2d8be', rockMid: '#c9bc9c', rockDark: '#8f8267', rockCrack: 'rgba(70,58,40,0.6)',
  bedrock: '#3f3d49', bedrockTop: '#5c5968',
};
const hash = (x, y) => ((x * 73856093) ^ (y * 19349663)) >>> 0;

function draw(dtReal) {
  const g = game;
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (!g) { drawIdleBoard(); ctx.restore(); return; }

  drawHud(g);
  ctx.translate(0, HUD);
  if (shake > 0) {
    ctx.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake);
    shake = Math.max(0, shake - dtReal * 24);
  }
  drawFloor(g);
  drawItems(g);
  drawLift(g);
  drawFires(g);
  drawBombs(g);
  drawRocksAndPillars(g);
  drawCorpses(g);
  drawEnemies(g);
  drawPlayers(g);
  drawParticles(g, dtReal);
  drawPopups(g);
  if (g.time < flashUntil) { ctx.fillStyle = 'rgba(255,120,60,' + (0.35 * (flashUntil - g.time) / 0.6) + ')'; ctx.fillRect(0, 0, BW, BH); }
  drawBanner(g);
  if (paused) {
    ctx.fillStyle = 'rgba(0,0,0,0.45)'; ctx.fillRect(0, 0, BW, BH);
    label('PAUSED', BW / 2, BH / 2, 44, '#fff', 'Bricolage Grotesque');
  }
  ctx.restore();
}

function drawIdleBoard() {
  ctx.fillStyle = '#1a1512'; ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.translate(0, HUD);
  ctx.globalAlpha = 0.5;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const wall = x === 0 || y === 0 || x === W - 1 || y === H - 1 || (x % 2 === 0 && y % 2 === 0);
    if (wall) drawPillar(x, y); else { ctx.fillStyle = (x + y) % 2 ? COL.floorA : COL.floorB; ctx.fillRect(x * TILE, y * TILE, TILE, TILE); }
  }
  ctx.globalAlpha = 1;
}

function drawFloor(g) {
  const sd = g.suddenDeath;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    ctx.fillStyle = (x + y) % 2 ? COL.floorA : COL.floorB;
    ctx.fillRect(x * TILE, y * TILE, TILE, TILE);
    const h = hash(x + g.seed, y);
    if (h % 4 === 0) { ctx.fillStyle = 'rgba(255,240,200,0.045)'; ctx.fillRect(x * TILE + 8 + h % 20, y * TILE + 26 + (h >> 3) % 18, 9, 3); }
    if (h % 7 === 0) { ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(x * TILE + 30 - h % 12, y * TILE + 12 + (h >> 5) % 20, 5, 5); }
  }
  ctx.strokeStyle = COL.floorLine; ctx.lineWidth = 1;
  for (let x = 0; x <= W; x++) { ctx.beginPath(); ctx.moveTo(x * TILE + 0.5, 0); ctx.lineTo(x * TILE + 0.5, BH); ctx.stroke(); }
  for (let y = 0; y <= H; y++) { ctx.beginPath(); ctx.moveTo(0, y * TILE + 0.5); ctx.lineTo(BW, y * TILE + 0.5); ctx.stroke(); }
  if (sd && sd.warn) {
    const [wx, wy] = sd.warn;
    const a = 0.25 + 0.35 * Math.abs(Math.sin(g.time * 14));
    ctx.fillStyle = 'rgba(255,90,44,' + a + ')';
    ctx.fillRect(wx * TILE, wy * TILE, TILE, TILE);
  }
}

// Bedrock pillar: a solid, bevelled block of dark stone. Reads as
// "unbreakable" next to the pale limestone you can blast.
function drawPillar(x, y) {
  const px = x * TILE, py = y * TILE;
  ctx.fillStyle = '#2c2a33'; ctx.fillRect(px, py, TILE, TILE);
  // front face
  ctx.fillStyle = COL.bedrock; ctx.fillRect(px + 2, py + 12, TILE - 4, TILE - 14);
  // top face (lighter) with a bevel
  ctx.fillStyle = COL.bedrockTop;
  ctx.beginPath(); ctx.moveTo(px + 2, py + 12); ctx.lineTo(px + 7, py + 3); ctx.lineTo(px + TILE - 7, py + 3); ctx.lineTo(px + TILE - 2, py + 12); ctx.closePath(); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.10)'; ctx.fillRect(px + 7, py + 3, TILE - 14, 3);
  // side shading + base shadow
  ctx.fillStyle = 'rgba(0,0,0,0.22)'; ctx.fillRect(px + TILE - 8, py + 12, 6, TILE - 14);
  ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.fillRect(px + 2, py + TILE - 5, TILE - 4, 3);
  // cracks and chips
  const h = hash(x * 5 + 11, y * 7 + 3);
  ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(px + 12 + h % 9, py + 18); ctx.lineTo(px + 20 + h % 9, py + 30); ctx.lineTo(px + 16 + h % 9, py + 42); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(px + 34, py + 22 + (h >> 4) % 8); ctx.lineTo(px + 44, py + 34 + (h >> 4) % 8); ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.06)'; ctx.fillRect(px + 10, py + 20, 5, 2); ctx.fillRect(px + 36, py + 40, 6, 2);
}

// Limestone boulder: pale, faceted, cracked. Facet layout varies per tile.
function drawRock(x, y, seed) {
  const px = x * TILE, py = y * TILE;
  const h = hash(x + seed, y * 3);
  const v = h % 3;
  ctx.save(); ctx.translate(px + TILE / 2, py + TILE / 2);
  ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.beginPath(); ctx.ellipse(2, 20, 24, 7, 0, 0, Math.PI * 2); ctx.fill();
  const pts = v === 0 ? [[-24, -6], [-14, -22], [8, -24], [24, -10], [22, 14], [6, 22], [-16, 18]]
    : v === 1 ? [[-22, -14], [0, -24], [22, -14], [24, 8], [10, 22], [-12, 22], [-24, 6]]
    : [[-24, 0], [-18, -20], [12, -22], [24, -4], [18, 18], [-6, 24], [-20, 16]];
  const gr = ctx.createLinearGradient(-20, -24, 16, 24);
  gr.addColorStop(0, COL.rockTop); gr.addColorStop(0.55, COL.rockMid); gr.addColorStop(1, COL.rockDark);
  ctx.fillStyle = gr;
  ctx.beginPath(); pts.forEach(([a, b], i) => i ? ctx.lineTo(a, b) : ctx.moveTo(a, b)); ctx.closePath(); ctx.fill();
  // top facet highlight
  ctx.fillStyle = 'rgba(255,250,235,0.35)';
  ctx.beginPath(); ctx.moveTo(pts[0][0] + 4, pts[0][1] + 2); ctx.lineTo(pts[1][0] + 2, pts[1][1] + 4); ctx.lineTo(pts[2][0] - 2, pts[2][1] + 5); ctx.lineTo(-2, -4); ctx.closePath(); ctx.fill();
  // cracks + specks
  ctx.strokeStyle = COL.rockCrack; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(-6, -2); ctx.lineTo(2, 6); ctx.lineTo(-2, 14); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(10, -10 + v * 3); ctx.lineTo(16, 2); ctx.stroke();
  ctx.fillStyle = 'rgba(90,75,50,0.35)';
  ctx.beginPath(); ctx.arc(-12 + v * 4, 8, 2, 0, Math.PI * 2); ctx.arc(8, 12 - v * 2, 1.6, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

function drawRocksAndPillars(g) {
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const t = g.grid[y * W + x];
    if (t === WALL) drawPillar(x, y);
    else if (t === BRICK) drawRock(x, y, g.seed);
  }
}

// The lift: an iron cage set into the floor. Lamp glows when it's open.
function drawLift(g) {
  const d = g.door;
  if (!d || !d.revealed) return;
  const px = d.x * TILE, py = d.y * TILE;
  ctx.fillStyle = '#1a1614'; ctx.fillRect(px + 5, py + 4, TILE - 10, TILE - 8);
  if (d.open) {
    const gl = ctx.createRadialGradient(px + TILE / 2, py + TILE / 2, 4, px + TILE / 2, py + TILE / 2, 30);
    gl.addColorStop(0, 'rgba(255,214,120,' + (0.8 + 0.2 * Math.sin(g.time * 6)) + ')'); gl.addColorStop(1, 'rgba(255,190,90,0)');
    ctx.fillStyle = gl; ctx.fillRect(px, py, TILE, TILE);
  }
  ctx.strokeStyle = d.open ? '#c9a15a' : '#7a7480'; ctx.lineWidth = 3;
  ctx.strokeRect(px + 6.5, py + 5.5, TILE - 13, TILE - 11);
  ctx.lineWidth = 2;
  for (let i = 1; i < 4; i++) { const x = px + 6 + i * (TILE - 12) / 4; ctx.beginPath(); ctx.moveTo(x, py + 6); ctx.lineTo(x, py + TILE - 6); ctx.stroke(); }
  ctx.beginPath(); ctx.moveTo(px + 6, py + TILE / 2); ctx.lineTo(px + TILE - 6, py + TILE / 2); ctx.stroke();
  // cable + wheel above
  ctx.fillStyle = '#7a7480'; ctx.fillRect(px + TILE / 2 - 1, py + 1, 2, 5);
  ctx.beginPath(); ctx.arc(px + TILE / 2, py + 3, 3, 0, Math.PI * 2); ctx.fill();
}

const ITEM_COL = { bomb: '#ff6a5a', fire: '#ffb347', speed: '#c9ff5c', shield: '#ffd93d' };
function drawItems(g) {
  for (const [k, it] of g.items) {
    if (it.hidden) continue;
    const x = k % W, y = (k - x) / W;
    const px = x * TILE, py = y * TILE;
    const bob = Math.sin(g.time * 5 + x) * 2;
    ctx.fillStyle = 'rgba(255,255,255,0.08)'; roundRect(px + 8, py + 8, TILE - 16, TILE - 16, 8); ctx.fill();
    ctx.strokeStyle = ITEM_COL[it.type]; ctx.lineWidth = 2; roundRectPath(px + 8, py + 8, TILE - 16, TILE - 16, 8, false); ctx.stroke();
    ctx.save(); ctx.translate(px + TILE / 2, py + TILE / 2 + bob);
    drawItemIcon(it.type, 1);
    ctx.restore();
  }
}
function drawItemIcon(type, s) {
  ctx.save(); ctx.scale(s, s);
  if (type === ITEM.BOMB) {
    // one stick of dynamite
    ctx.rotate(-0.5);
    ctx.fillStyle = '#c8322b'; roundRect(-6, -14, 12, 28, 3); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.fillRect(-4, -12, 3, 24);
    ctx.fillStyle = '#e8d9b0'; ctx.fillRect(-6, -6, 12, 3); ctx.fillRect(-6, 4, 12, 3);
    ctx.strokeStyle = '#caa06a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, -14); ctx.quadraticCurveTo(4, -20, 8, -18); ctx.stroke();
    ctx.fillStyle = '#ffd36b'; ctx.beginPath(); ctx.arc(8, -18, 2.5, 0, Math.PI * 2); ctx.fill();
  } else if (type === ITEM.FIRE) {
    // blast: a starburst
    ctx.fillStyle = '#ff7a2f'; star(0, 0, 14, 8, 0.5); ctx.fillStyle = '#ffd36b'; star(0, 0, 7, 8, 0.5);
  } else if (type === ITEM.SPEED) {
    // boot
    ctx.fillStyle = '#c9ff5c';
    ctx.beginPath(); ctx.moveTo(-8, -14); ctx.lineTo(2, -14); ctx.lineTo(2, 2); ctx.lineTo(12, 6); ctx.lineTo(12, 12); ctx.lineTo(-8, 12); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#5c7a1c'; ctx.fillRect(-8, 8, 20, 4); ctx.fillRect(-8, -14, 10, 3);
  } else {
    // hard hat
    ctx.fillStyle = '#ffd93d'; ctx.beginPath(); ctx.arc(0, 2, 13, Math.PI, 0); ctx.closePath(); ctx.fill();
    ctx.fillRect(-16, 1, 32, 5);
    ctx.fillStyle = '#b08a12'; ctx.fillRect(-3, -12, 6, 10);
    ctx.fillStyle = '#fff5c2'; ctx.beginPath(); ctx.arc(0, -1, 3.5, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}
function flame(cx, cy, r) {
  ctx.beginPath();
  ctx.moveTo(cx, cy - r * 1.5);
  ctx.quadraticCurveTo(cx + r * 1.1, cy - r * 0.4, cx + r * 0.7, cy + r * 0.5);
  ctx.quadraticCurveTo(cx + r * 0.3, cy + r * 1.05, cx, cy + r);
  ctx.quadraticCurveTo(cx - r * 0.3, cy + r * 1.05, cx - r * 0.7, cy + r * 0.5);
  ctx.quadraticCurveTo(cx - r * 1.1, cy - r * 0.4, cx, cy - r * 1.5);
  ctx.fill();
}

// Dynamite bundle: three sticks, one fuse, sparking faster as it runs out.
function drawBombs(g) {
  for (const b of g.bombs) {
    const left = b.at + b.fuse - g.time;
    const pulse = 1 + 0.06 * Math.sin(g.time * (left < 0.7 ? 28 : 10));
    const px = b.x * TILE + TILE / 2, py = b.y * TILE + TILE / 2 + 2;
    ctx.save(); ctx.translate(px, py); ctx.scale(pulse, pulse);
    ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.beginPath(); ctx.ellipse(0, 18, 18, 6, 0, 0, Math.PI * 2); ctx.fill();
    ctx.rotate(-0.25);
    for (const dx of [-9, 0, 9]) {
      const gr = ctx.createLinearGradient(dx - 5, 0, dx + 5, 0);
      gr.addColorStop(0, '#7f1d18'); gr.addColorStop(0.4, '#d63a30'); gr.addColorStop(1, '#8e221b');
      ctx.fillStyle = gr; roundRect(dx - 5, -16, 10, 32, 3); ctx.fill();
    }
    ctx.fillStyle = '#e8d9b0'; ctx.fillRect(-15, -6, 30, 4); ctx.fillRect(-15, 5, 30, 4);
    ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(-15, -2, 30, 1); ctx.fillRect(-15, 9, 30, 1);
    ctx.strokeStyle = '#caa06a'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(0, -16); ctx.quadraticCurveTo(6, -26, 14, -24); ctx.stroke();
    const sp = 3 + 2 * Math.sin(g.time * 40);
    ctx.fillStyle = '#ffd36b'; ctx.beginPath(); ctx.arc(14, -24, sp, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(14, -24, sp * 0.45, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
}

function drawFires(g) {
  blasts = blasts.filter(b => g.time - b.at < RULES.fireTime);
  for (const b of blasts) {
    const age = (g.time - b.at) / RULES.fireTime;
    const grow = Math.min(1, age * 4);
    const fade = age < 0.7 ? 1 : 1 - (age - 0.7) / 0.3;
    const flick = 0.85 + 0.15 * Math.sin(g.time * 60);
    for (const [cx, cy, kind, dir] of b.cells) {
      const px = cx * TILE + TILE / 2, py = cy * TILE + TILE / 2;
      ctx.save(); ctx.translate(px, py); ctx.globalAlpha = fade;
      if (kind === 'centre') {
        const r = 26 * grow;
        const gr = ctx.createRadialGradient(0, 0, 2, 0, 0, r);
        gr.addColorStop(0, '#fff8d8'); gr.addColorStop(0.45, '#ffb347'); gr.addColorStop(1, 'rgba(255,90,44,0.15)');
        ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
      } else {
        const horiz = dir === 'left' || dir === 'right';
        if (!horiz) ctx.rotate(Math.PI / 2);
        const len = TILE * grow, thick = 34 * flick * (kind === 'end' ? 0.8 : 1);
        const gr = ctx.createLinearGradient(0, -thick / 2, 0, thick / 2);
        gr.addColorStop(0, 'rgba(255,90,44,0.35)'); gr.addColorStop(0.5, '#fff1c4'); gr.addColorStop(1, 'rgba(255,90,44,0.35)');
        ctx.fillStyle = gr;
        roundRect(-len / 2, -thick / 2, len, thick, kind === 'end' ? thick / 2 : 6); ctx.fill();
        ctx.fillStyle = 'rgba(255,179,71,0.9)'; roundRect(-len / 2, -thick / 4, len, thick / 2, 4); ctx.fill();
      }
      ctx.restore();
    }
  }
}

// ---- critters
function drawCritter(type, px, py, phase, alpha = 1, scale = 1, facing = 'down') {
  ctx.save(); ctx.translate(px, py); ctx.globalAlpha = alpha; ctx.scale(scale, scale);
  const ex = facing === 'left' ? -3 : facing === 'right' ? 3 : 0;
  if (type === 'bat') {
    const flap = Math.sin(phase * 5);
    ctx.fillStyle = 'rgba(40,20,60,0.4)'; ctx.beginPath(); ctx.ellipse(0, 18, 16, 5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.translate(0, Math.sin(phase * 2.5) * 3 - 6);
    ctx.fillStyle = '#4a2c6e';
    for (const s of [-1, 1]) {
      ctx.beginPath(); ctx.moveTo(s * 6, 0);
      ctx.quadraticCurveTo(s * 16, -10 - flap * 8, s * 26, -2 - flap * 10);
      ctx.quadraticCurveTo(s * 20, 4 - flap * 4, s * 16, 6 - flap * 2);
      ctx.quadraticCurveTo(s * 10, 4, s * 6, 8); ctx.closePath(); ctx.fill();
    }
    ctx.fillStyle = '#5d3a85'; ctx.beginPath(); ctx.ellipse(0, 2, 8, 10, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#4a2c6e'; ctx.beginPath(); ctx.moveTo(-6, -6); ctx.lineTo(-3, -14); ctx.lineTo(0, -6); ctx.moveTo(6, -6); ctx.lineTo(3, -14); ctx.lineTo(0, -6); ctx.fill();
    ctx.fillStyle = '#ffe36b'; ctx.beginPath(); ctx.arc(-3 + ex * 0.4, -2, 2, 0, Math.PI * 2); ctx.arc(3 + ex * 0.4, -2, 2, 0, Math.PI * 2); ctx.fill();
  } else if (type === 'knocker') {
    const bob = Math.abs(Math.sin(phase * 3)) * 3;
    ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.beginPath(); ctx.ellipse(0, 20, 15, 5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.translate(0, -bob);
    ctx.fillStyle = '#5f8f4a'; ctx.beginPath(); ctx.moveTo(-11, 20); ctx.lineTo(-9, 0); ctx.lineTo(9, 0); ctx.lineTo(11, 20); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#3f6a30'; ctx.fillRect(-11, 12, 22, 4);
    ctx.fillStyle = '#7fb45f'; ctx.beginPath(); ctx.arc(0, -6, 12, 0, Math.PI * 2); ctx.fill();
    // big ears
    ctx.beginPath(); ctx.moveTo(-10, -8); ctx.lineTo(-22, -16); ctx.lineTo(-11, -2); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(10, -8); ctx.lineTo(22, -16); ctx.lineTo(11, -2); ctx.closePath(); ctx.fill();
    // glowing eyes
    ctx.fillStyle = '#fff36b'; ctx.beginPath(); ctx.arc(-5 + ex, -7, 3.5, 0, Math.PI * 2); ctx.arc(5 + ex, -7, 3.5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#2b3a10'; ctx.beginPath(); ctx.arc(-5 + ex * 1.3, -7, 1.6, 0, Math.PI * 2); ctx.arc(5 + ex * 1.3, -7, 1.6, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#2b3a10'; ctx.fillRect(-4, 0, 8, 2);
    // little pick
    ctx.strokeStyle = '#7a5230'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(13, 16); ctx.lineTo(17, -4); ctx.stroke();
    ctx.strokeStyle = '#b9bcc6'; ctx.beginPath(); ctx.moveTo(11, -5); ctx.quadraticCurveTo(17, -10, 23, -5); ctx.stroke();
  } else if (type === 'spider') {
    const wig = Math.sin(phase * 12) * 3;
    ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.beginPath(); ctx.ellipse(0, 14, 18, 5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#1f1a24'; ctx.lineWidth = 3;
    for (let i = 0; i < 4; i++) {
      const y0 = -6 + i * 5, sgn = i % 2 ? 1 : -1;
      for (const s of [-1, 1]) {
        ctx.beginPath(); ctx.moveTo(s * 6, y0); ctx.lineTo(s * 18, y0 - 6 + sgn * wig); ctx.lineTo(s * 24, y0 + 6 + sgn * wig); ctx.stroke();
      }
    }
    ctx.fillStyle = '#2a2230'; ctx.beginPath(); ctx.ellipse(0, 4, 12, 10, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#3b2f42'; ctx.beginPath(); ctx.arc(0, -8, 7, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ff4a3d'; ctx.beginPath(); ctx.arc(-3 + ex * 0.5, -9, 1.8, 0, Math.PI * 2); ctx.arc(3 + ex * 0.5, -9, 1.8, 0, Math.PI * 2); ctx.arc(-6, -6, 1.2, 0, Math.PI * 2); ctx.arc(6, -6, 1.2, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.beginPath(); ctx.ellipse(-3, 0, 4, 3, 0, 0, Math.PI * 2); ctx.fill();
  } else {
    // spark: ignited gas, a fireball with a trailing tail
    ctx.fillStyle = 'rgba(255,140,60,0.35)'; ctx.beginPath(); ctx.arc(0, 0, 24, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ff6a3d'; flame(0, 4, 14 + Math.sin(phase * 9) * 2);
    ctx.fillStyle = '#ffb347'; flame(0, 6, 9);
    ctx.fillStyle = '#fff2c4'; flame(0, 8, 4.5);
    ctx.fillStyle = '#3a0a00'; ctx.beginPath(); ctx.arc(-4 + ex * 0.6, 4, 2, 0, Math.PI * 2); ctx.arc(4 + ex * 0.6, 4, 2, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}
function drawEnemies(g) {
  for (const e of g.enemies) {
    if (!e.alive) continue;
    drawCritter(e.type, e.x * TILE, e.y * TILE, e.walkPhase, 1, 1, e.dir);
  }
}
function drawCorpses(g) {
  corpses = corpses.filter(c => g.time - c.at < 0.45);
  for (const c of corpses) {
    const k = (g.time - c.at) / 0.45;
    drawCritter(c.type, c.x * TILE, c.y * TILE - k * 20, 0, 1 - k, 1 + k * 0.6);
  }
}

// ---- the miner
const OVERALLS = { blue: ['#4f7cff', '#243f9e'], red: ['#ff5a5a', '#8e1f2a'] };
function drawMiner(p, g) {
  const px = p.x * TILE, py = p.y * TILE;
  const [c1, c2] = OVERALLS[p.color] || OVERALLS.blue;
  const dead = !p.alive;
  const k = dead ? Math.min(1, (g.time - p.deadAt) / RULES.respawnDelay) : 0;
  const blink = p.invulnUntil > g.time && Math.floor(g.time * 12) % 2 === 0;
  const side = p.facing === 'left' ? -1 : 1;
  const bob = p.moving ? Math.abs(Math.sin(p.walkPhase)) * 3 : 0;
  ctx.save(); ctx.translate(px, py + 4);
  // headlamp beam on the floor, in the facing direction
  if (!dead) {
    const [bx, by] = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }[p.facing] || [0, 1];
    const gl = ctx.createRadialGradient(bx * 30, by * 30 - 4, 4, bx * 30, by * 30 - 4, 40);
    gl.addColorStop(0, 'rgba(255,236,170,0.22)'); gl.addColorStop(1, 'rgba(255,236,170,0)');
    ctx.fillStyle = gl; ctx.beginPath(); ctx.arc(bx * 30, by * 30 - 4, 40, 0, Math.PI * 2); ctx.fill();
  }
  if (dead) { ctx.globalAlpha = 1 - k; ctx.rotate(k * Math.PI * 2); ctx.scale(1 - k * 0.5, 1 - k * 0.5); }
  else if (blink) ctx.globalAlpha = 0.45;
  ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.beginPath(); ctx.ellipse(0, 20, 15, 5, 0, 0, Math.PI * 2); ctx.fill();
  ctx.translate(0, -bob);
  if (p.shield) { ctx.strokeStyle = 'rgba(255,217,61,' + (0.6 + 0.3 * Math.sin(g.time * 8)) + ')'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, -2, 26, 0, Math.PI * 2); ctx.stroke(); }
  // pickaxe over the shoulder
  ctx.strokeStyle = '#7a5230'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(13 * side, 16); ctx.lineTo(17 * side, -16); ctx.stroke();
  ctx.strokeStyle = '#c3c6cf'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(8 * side, -14); ctx.quadraticCurveTo(17 * side, -24, 26 * side, -14); ctx.stroke();
  // body: shirt + overalls
  ctx.fillStyle = '#d9c7a8'; ctx.fillRect(-9, -6, 18, 10);
  const rg = ctx.createLinearGradient(-12, 0, 12, 20); rg.addColorStop(0, c1); rg.addColorStop(1, c2);
  ctx.fillStyle = rg; ctx.beginPath(); ctx.moveTo(-10, 0); ctx.lineTo(10, 0); ctx.lineTo(13, 20); ctx.lineTo(-13, 20); ctx.closePath(); ctx.fill();
  ctx.fillStyle = c1; ctx.fillRect(-7, -6, 3, 8); ctx.fillRect(4, -6, 3, 8);
  ctx.fillStyle = '#c9a15a'; ctx.fillRect(-4, 4, 8, 6);
  // boots
  ctx.fillStyle = '#3a2a20';
  const stepK = p.moving ? Math.sin(p.walkPhase) * 4 : 0;
  ctx.fillRect(-11 + stepK, 18, 9, 5); ctx.fillRect(2 - stepK, 18, 9, 5);
  // face + beard
  ctx.fillStyle = '#f2cfa8'; ctx.beginPath(); ctx.arc(0, -11, 8, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#6b4a2a'; ctx.beginPath(); ctx.moveTo(-7, -9); ctx.lineTo(7, -9); ctx.lineTo(0, 0); ctx.closePath(); ctx.fill();
  const ex = p.facing === 'left' ? -2 : p.facing === 'right' ? 2 : 0;
  if (p.facing !== 'up') { ctx.fillStyle = '#1b1b24'; ctx.fillRect(-4 + ex, -14, 2, 3); ctx.fillRect(2 + ex, -14, 2, 3); }
  // hard hat + lamp
  ctx.fillStyle = '#ffd93d'; ctx.beginPath(); ctx.arc(0, -16, 11, Math.PI, 0); ctx.closePath(); ctx.fill();
  ctx.fillRect(-14, -17, 28, 4);
  ctx.fillStyle = '#d9b21c'; ctx.fillRect(-3, -27, 6, 8);
  ctx.fillStyle = '#fff5c2'; ctx.beginPath(); ctx.arc(0 + ex * 1.5, -21, 3.2, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = 'rgba(255,245,194,0.5)'; ctx.beginPath(); ctx.arc(0 + ex * 1.5, -21, 5.5, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}
function drawPlayers(g) {
  for (const p of g.players) {
    if (!p.alive && g.time - p.deadAt > RULES.respawnDelay) continue;
    drawMiner(p, g);
  }
}
function star(cx, cy, r, n = 5, inner = 0.45) {
  ctx.beginPath();
  for (let i = 0; i < n * 2; i++) {
    const a = -Math.PI / 2 + i * Math.PI / n, rr = i % 2 ? r * inner : r;
    ctx.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr);
  }
  ctx.closePath(); ctx.fill();
}

function drawParticles(g, dt) {
  particles = particles.filter(p => p.life > 0);
  for (const p of particles) {
    p.life -= dt; p.vy += 18 * dt; p.x += p.vx * dt; p.y += p.vy * dt;
    ctx.globalAlpha = Math.max(0, Math.min(1, p.life * 2));
    ctx.fillStyle = p.color; ctx.fillRect(p.x * TILE - p.size / 2, p.y * TILE - p.size / 2, p.size, p.size);
  }
  ctx.globalAlpha = 1;
}
function drawPopups(g) {
  popups = popups.filter(p => p.until > g.time);
  for (const p of popups) {
    const k = 1 - (p.until - g.time) / (p.small ? 0.7 : 1.0);
    ctx.globalAlpha = k < 0.7 ? 1 : 1 - (k - 0.7) / 0.3;
    label(p.text, p.x * TILE, p.y * TILE - 22 - k * 18, p.small ? 13 : 16, p.small ? '#f4e6d2' : '#ffd36b', 'JetBrains Mono', true);
  }
  ctx.globalAlpha = 1;
}
function drawBanner(g) {
  if (!banner || g.time > banner.until) { banner = null; return; }
  const age = Math.min(1, (g.time - banner.shownAt) / 0.25);
  const col = banner.style === 'warn' ? '#ff6a3d' : banner.style === 'good' ? '#8dffb0' : '#ffd36b';
  ctx.save();
  ctx.globalAlpha = Math.min(1, age * 1.2);
  ctx.fillStyle = 'rgba(8,6,12,0.72)';
  const h = banner.sub ? 96 : 68;
  ctx.fillRect(0, BH / 2 - h / 2, BW, h);
  ctx.fillStyle = col; ctx.fillRect(0, BH / 2 - h / 2, BW, 2); ctx.fillRect(0, BH / 2 + h / 2 - 2, BW, 2);
  label(banner.text, BW / 2, BH / 2 - (banner.sub ? 12 : 0), 40, col, 'Bricolage Grotesque');
  if (banner.sub) label(banner.sub, BW / 2, BH / 2 + 26, 15, '#f4e6d2', 'Inter');
  ctx.restore();
}

function drawHud(g) {
  ctx.fillStyle = '#14100d'; ctx.fillRect(0, 0, BW, HUD);
  ctx.fillStyle = 'rgba(216,156,86,0.25)'; ctx.fillRect(0, HUD - 1, BW, 1);
  const mono = 'JetBrains Mono';
  if (g.mode === 'adventure') {
    const p = g.players[0];
    labelLeft('LEVEL ' + g.level, 16, 30, 17, '#ffc34d', 'Bricolage Grotesque');
    for (let i = 0; i < g.lives; i++) hatIcon(150 + i * 24, 30);
    const t = Math.ceil(g.timer);
    const low = g.hurry || t <= 30;
    const tcol = g.hurry ? '#ff5a2c' : low ? '#ffb347' : '#f4e6d2';
    label(g.hurry ? 'HURRY' : mmss(t), BW / 2, 31, 20, tcol, mono);
    const left = g.enemies.filter(e => e.alive).length;
    labelRight(left + ' LEFT', BW - 200, 30, 13, '#c7b196', mono);
    let x = BW - 16;
    const chips = [['🧨', p.maxBombs], ['💥', p.range], ['👢', p.speedItems > 0 ? p.speedItems : null], ['⛑', p.shield ? '' : null]];
    for (const [icon, val] of chips.reverse()) {
      if (val === null) continue;
      const txt = icon + (val === '' ? '' : ' ' + val);
      ctx.font = '600 14px ' + mono; const w = ctx.measureText(txt).width + 14;
      x -= w;
      ctx.fillStyle = 'rgba(255,255,255,0.06)'; roundRect(x, 12, w, 24, 8); ctx.fill();
      ctx.fillStyle = '#f4e6d2'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillText(txt, x + 7, 25);
      x -= 6;
    }
  } else {
    const [a, b] = g.players;
    const drawSide = (p, right) => {
      const col = p.color === 'blue' ? '#7fa2ff' : '#ff7a7a';
      const x = right ? BW - 16 : 16;
      (right ? labelRight : labelLeft)(p.name.toUpperCase(), x, 20, 13, col, mono);
      for (let i = 0; i < RULES.battleWinsNeeded; i++) {
        const cx = right ? BW - 22 - i * 16 : 22 + i * 16;
        ctx.beginPath(); ctx.arc(cx, 36, 5, 0, Math.PI * 2);
        ctx.fillStyle = i < p.wins ? col : 'rgba(255,255,255,0.12)'; ctx.fill();
      }
    };
    drawSide(a, false); drawSide(b, true);
    const t = Math.ceil(g.timer);
    const sd = g.suddenDeath;
    label(sd ? 'CAVE-IN' : mmss(t), BW / 2, 31, sd ? 18 : 20, sd ? '#ff5a2c' : t <= RULES.suddenDeathAt + 10 ? '#ffb347' : '#f4e6d2', mono);
    label('ROUND ' + g.round, BW / 2, 12, 10, '#8e7a60', mono);
  }
}
function hatIcon(x, y) {
  ctx.fillStyle = '#ffd93d'; ctx.beginPath(); ctx.arc(x, y + 1, 8, Math.PI, 0); ctx.closePath(); ctx.fill();
  ctx.fillRect(x - 11, y, 22, 3);
  ctx.fillStyle = '#fff5c2'; ctx.beginPath(); ctx.arc(x, y - 3, 2, 0, Math.PI * 2); ctx.fill();
}
function mmss(t) { return Math.floor(t / 60) + ':' + String(t % 60).padStart(2, '0'); }

function label(text, x, y, size, color, font, stroke) {
  ctx.font = '700 ' + size + 'px ' + font + ', system-ui, sans-serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  if (stroke) { ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(0,0,0,0.7)'; ctx.strokeText(text, x, y); }
  ctx.fillStyle = color; ctx.fillText(text, x, y);
}
function labelLeft(text, x, y, size, color, font) {
  ctx.font = '700 ' + size + 'px ' + font + ', system-ui, sans-serif';
  ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillStyle = color; ctx.fillText(text, x, y);
}
function labelRight(text, x, y, size, color, font) {
  ctx.font = '700 ' + size + 'px ' + font + ', system-ui, sans-serif';
  ctx.textAlign = 'right'; ctx.textBaseline = 'middle'; ctx.fillStyle = color; ctx.fillText(text, x, y);
}
function roundRectPath(x, y, w, h, r, fill) {
  ctx.beginPath();
  ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y); ctx.closePath();
  if (fill) ctx.fill();
}
function roundRect(x, y, w, h, r) { roundRectPath(x, y, w, h, Math.min(r, w / 2, h / 2), false); }

// ---------------------------------------------------------------- menu + chrome hooks
menu.addEventListener('click', e => {
  const btn = e.target.closest('button[data-mode]');
  if (!btn) return;
  startMode(btn.dataset.mode);
});
window.gameAPI = {
  pause() {
    // The chrome toggles its .ch-paused class itself before calling us.
    if (!game || game.status === 'over') return;
    paused = !paused;
  },
  restart() {
    if (window.ArcadeGameOver) window.ArcadeGameOver.hide();
    if (mode) startMode(mode); else showMenu('');
  },
  mute() { Sound.toggle(); },
};
// Space is the chrome's pause fallback only when gameAPI.pause is absent; we
// own pause, so P / Escape toggle it from the keyboard.
document.addEventListener('keydown', e => {
  if ((e.key === 'p' || e.key === 'P' || e.key === 'Escape') && game && game.status !== 'over') {
    e.preventDefault();
    // Go through the chrome's button when it exists so its own paused flag
    // and the dimmed-bezel class stay in step with ours.
    const btn = document.querySelector('.ch-btn[data-act="pause"]');
    if (btn) btn.click(); else window.gameAPI.pause();
  }
});
showMenu('');

// Debug handle for headless/browser verification (tools/VERIFICATION.md):
// pump(seconds) advances the simulation with the current held keys, then draws.
window.__dynamine = {
  frozen: false,            // true = the live loop stops stepping; pump() drives time
  get state() { return game; },
  get mode() { return mode; },
  held, bombQueued,
  pump(seconds) {
    if (!game) return null;
    let n = Math.round(seconds / FIXED);
    while (n-- > 0) {
      const inputs = [{ held: held[0], bomb: bombQueued[0] }, { held: held[1], bomb: bombQueued[1] }];
      bombQueued[0] = bombQueued[1] = false;
      step(game, FIXED, inputs);
      drainEvents(game).forEach(handleEvent);
    }
    syncScore();
    draw(FIXED);
    return game.status;
  },
};
