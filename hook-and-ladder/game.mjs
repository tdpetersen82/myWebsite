// Hook & Ladder — rendering, input, sound and page wiring. Rules live in engine.mjs.
import {
  createGame, startGame, step, drainEvents, readyToPark, parkedInZone,
  serviceZones, W, H, TILE, RULES,
} from './engine.mjs?v=20260916b';

import { paintCity, drawWorldFire } from './art.mjs?v=20260916b';

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

let game = createGame();
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
let runId = 0;
const camera = { x: W / 2, y: H / 2, zoom: 1 };
function screenPoint(x, y) { return { x: (x - camera.x) * camera.zoom + W / 2, y: (y - camera.y) * camera.zoom + H / 2 }; }

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
const tapped = new Set();
const GAME_KEYS = new Set(['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' ', 'w', 'a', 's', 'd', 'enter', 'p', 'r']);
window.addEventListener('keydown', e => {
  const k = e.key.length === 1 ? e.key.toLowerCase() : e.key.toLowerCase();
  if (!GAME_KEYS.has(k)) return;
  if (e.target && /^(input|textarea|select|button)$/i.test(e.target.tagName) && k !== 'p') return;
  e.preventDefault();
  if (k === 'p' && !e.repeat) { togglePause(); return; }
  held.add(k); if (!e.repeat) tapped.add(k);
});
window.addEventListener('keyup', e => held.delete(e.key.length === 1 ? e.key.toLowerCase() : e.key.toLowerCase()));
window.addEventListener('blur', () => { held.clear(); tapped.clear(); if (game.status === 'playing' && !game.paused) window.gameAPI.pause(); });
document.addEventListener('visibilitychange', () => { if (document.hidden) { held.clear(); tapped.clear(); if (game.status === 'playing' && !game.paused) window.gameAPI.pause(); } });

function readInput() {
  const h = { has: key => held.has(key) || tapped.has(key) };
  const hx = Number(h.has('d')) - Number(h.has('a'));
  return {
    recover: h.has('r'), gas: h.has('w'), brake: h.has('s'),
    handbrake: h.has(' '), steer: hx,
    tiller: Number(h.has('arrowright')) - Number(h.has('arrowleft')),
  };
}

// ---------------------------------------------------------------- sound
let audio = null;
let engineTone = null;
function ac() {
  if (!audio) { try { audio = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return null; } }
  if (audio.state === 'suspended') audio.resume();
  return audio;
}
function updateEngineAudio() {
  if (!audio) return;
  if (!engineTone) {
    const oscillator=audio.createOscillator(), gain=audio.createGain();
    oscillator.type='triangle';gain.gain.value=0;oscillator.connect(gain);gain.connect(audio.destination);oscillator.start();engineTone={oscillator,gain};
  }
  const running=game.status==='playing'&&!game.paused&&!muted;
  const speed=Math.abs(game.truck.v)/RULES.maxSpeed;
  engineTone.oscillator.frequency.setTargetAtTime(38+speed*66,audio.currentTime,.08);
  engineTone.gain.gain.setTargetAtTime(running ? .014+speed*.018 : 0,audio.currentTime,.05);
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
  saved() { [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.22, 'triangle', 0.14, i * 0.11)); },
  burnout() { tone(300, 0.5, 'sawtooth', 0.12, 0, 90); tone(150, 0.7, 'square', 0.08, 0.2, 60); },
  over() { [392, 330, 262, 196].forEach((f, i) => tone(f, 0.35, 'triangle', 0.14, i * 0.22)); },
};

// ---------------------------------------------------------------- flow
function startShift() {
  runId++; held.clear(); tapped.clear(); cityLayer = null;
  game = createGame();
  startGame(game);
  camera.zoom = 1.65; camera.x = Math.max(W / camera.zoom / 2, game.truck.x); camera.y = H / 2;
  particles = []; floaters = []; banner = null; shake = 0;
  scoreEl.textContent = '0'; firesEl.textContent = '0';
  menu.hidden = true;
  if (window.ArcadeGameOver) window.ArcadeGameOver.hide();
  const bezel = document.querySelector('.ch-bezel');
  if (bezel) { bezel.classList.remove('ch-paused'); bezel.classList.add('ch-started'); }
  setMission('Follow the alarm. Park the whole truck parallel to the curb in the marked area.');
  canvas.focus({ preventScroll: true });
  gtagEvent('hook_and_ladder_start', { mode: 'driving' });
}
function setMission(text, ready) {
  if (!missionEl) return;
  if (missionEl.textContent !== text) missionEl.textContent = text;
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
menu.querySelector('[data-start]').addEventListener('click', startShift);

window.gameAPI = {
  start() { if (game.status !== 'playing') startShift(); },
  restart() { startShift(); },
  pause() {
    if (game.status !== 'playing') return;
    game.paused = !game.paused; held.clear(); tapped.clear(); updateEngineAudio();
    const bezel = document.querySelector('.ch-bezel');
    if (bezel) bezel.classList.toggle('ch-paused', game.paused);
  },
  mute() { muted = !muted; updateEngineAudio(); },
};

function syncScore() {
  scoreEl.textContent = game.score; firesEl.textContent = game.firesOut;
  if (game.score > highScore) {
    highScore = game.score; hiEl.textContent = highScore;
    try { localStorage.setItem(HS_KEY, String(highScore)); } catch (e) {}
  }
}

// ---------------------------------------------------------------- events
function onEvent(e) {
  switch (e.type) {
    case 'dispatch': {
      SFX.siren(); cityLayer = null;
      banner = { text: 'CALL ' + String(game.firesOut + 1).padStart(2, '0'), sub: game.fire.title + ' · Drive & park', t: 0, dur: 2.0, color: '#ffb347' };
      setMission('Respond to the alarm. Stop both axles inside the marked area, parallel to the curb.');
      break;
    }
    case 'crash': {
      if (e.scrape) noise(.08, .05); else SFX.crash(); shake = e.scrape ? .10 : .3;
      for (let i = 0; i < 10; i++) particles.push({ x: e.x, y: e.y, vx: (Math.random() - 0.5) * 160, vy: (Math.random() - 0.5) * 160, life: 0, max: 0.4 + Math.random() * 0.3, r: 2, color: '#ffd166', kind: 'spark' });
      break;
    }
    case 'recover':
      banner = { text: 'BACK ON THE ROAD', sub: 'Recovery · 5 seconds lost', t: 0, dur: 1.5, color: '#ffd166' }; break;
    case 'extinguished': {
      SFX.saved();
      const parts = ['+' + e.gained];
      if (e.clean) parts.push('clean run');
      banner = { text: 'ARRIVED', sub: parts.join(' · '), t: 0, dur: 1.8, color: '#7dffb0' };
      floaters.push({ x: e.building.cx, y: e.building.cy, text: '+' + e.gained, t: 0, dur: 1.4, color: '#7dffb0' });
      syncScore();
      setMission('Crew delivered. Get ready for the next call.', true);
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
      gtagEvent('game_over', { score: e.score, fires: e.fires, mode: 'driving' });
      setMission('Shift over. ' + e.fires + (e.fires === 1 ? ' fire' : ' fires') + ' put out.');
      const finishedRun = runId;
      setTimeout(() => {
        if (runId !== finishedRun || game.status !== 'over') return;
        showMenu('Shift over · ' + e.fires + ' saved · ' + e.score + ' points');
        if (window.ArcadeGameOver) window.ArcadeGameOver.show({ score: e.score, best: highScore, restart: () => { gtagEvent('play_again', { from: 'hook-and-ladder' }); startShift(); } });
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
  const detail = Math.max(2, Math.min(4, scale * 2));
  off.width = Math.round(W * detail); off.height = Math.round(H * detail);
  const c = off.getContext('2d'); c.scale(detail, detail);
  paintCity(c, game.world);
  return off;
}

// ---------------------------------------------------------------- dynamic drawing
function drawZones(t) {
  const f = game.fire; if (!f) return;
  const parked = parkedInZone(game);
  const pulse = 0.55 + 0.45 * Math.sin(t * 5);
  for (const z of serviceZones(f.building)) {
    const ready = parked?.side === z.side && readyToPark(game);
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
    ctx.fillText('PARK BOTH AXLES', 0, 0); ctx.restore();
  }
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
  const alarm = !!game.fire;
  // Headlight cones and a low chassis shadow make the cab direction readable.
  ctx.save(); ctx.translate(tr.x, tr.y); ctx.rotate(tr.h1);
  const beam = ctx.createLinearGradient(35, 0, 170, 0); beam.addColorStop(0, 'rgba(255,239,183,.2)'); beam.addColorStop(1, 'rgba(255,239,183,0)');
  ctx.fillStyle = beam; ctx.beginPath(); ctx.moveTo(36,-9); ctx.lineTo(175,-52); ctx.lineTo(175,52); ctx.lineTo(36,9); ctx.closePath(); ctx.fill(); ctx.restore();
  // ---- trailer
  ctx.save(); ctx.translate(tr.x, tr.y); ctx.rotate(tr.h2);
  ctx.fillStyle = 'rgba(0,0,0,0.35)'; roundRect(ctx, -(R.L2 + R.trailerBack) + 3, -hw + 4, R.L2 + R.trailerBack + R.trailerFront, R.width, 4); ctx.fill();
  wheel(-R.L2, -hw + 2, tr.tiller); wheel(-R.L2, hw - 2, tr.tiller);
  wheel(-R.L2 + 14, -hw + 2, 0); wheel(-R.L2 + 14, hw - 2, 0);
  const enamel = ctx.createLinearGradient(0, -hw, 0, hw); enamel.addColorStop(0, '#f05d49'); enamel.addColorStop(.45, '#c82d32'); enamel.addColorStop(1, '#791e2c');
  ctx.fillStyle = enamel; roundRect(ctx, -(R.L2 + R.trailerBack), -hw, R.L2 + R.trailerBack + R.trailerFront, R.width, 4); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.75)'; ctx.fillRect(-(R.L2 + R.trailerBack) + 2, -hw + 1, R.L2 + R.trailerBack + R.trailerFront - 4, 2); ctx.fillRect(-(R.L2 + R.trailerBack) + 2, hw - 3, R.L2 + R.trailerBack + R.trailerFront - 4, 2);
  // Equipment lockers and reflective side strip.
  ctx.fillStyle = '#d4dee0';
  for (let x = -R.L2 + 18; x < -10; x += 14) { ctx.fillRect(x, -hw + 3, 10, 4); ctx.fillRect(x, hw - 7, 10, 4); }
  // tillerman's cab at the very back
  ctx.fillStyle = '#8c1a22'; ctx.fillRect(-(R.L2 + R.trailerBack), -hw + 3, 14, R.width - 6);
  ctx.fillStyle = '#1b2733'; ctx.fillRect(-(R.L2 + R.trailerBack) + 2, -hw + 5, 4, R.width - 10);
  // stowed ladder
  {
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
  ctx.fillStyle = '#273d48'; ctx.fillRect(-R.tractorBack, -hw + 3, 16, R.width - 6);
  ctx.fillStyle = '#d0232e'; roundRect(ctx, 4, -hw, R.tractorLen - R.tractorBack - 4, R.width, 5); ctx.fill();
  ctx.fillStyle = '#a2b2b8'; ctx.beginPath(); ctx.arc(0,0,5,0,Math.PI*2); ctx.fill();
  ctx.fillStyle = '#e8ebdf'; roundRect(ctx, 3, -hw + 2, nose - 16, R.width - 4, 3); ctx.fill();   // cab roof
  ctx.fillStyle = '#214753'; ctx.fillRect(nose - 13, -hw + 3, 8, R.width - 6);                     // windshield
  ctx.fillStyle = '#f6f6f6'; ctx.fillRect(nose - 5, -hw + 4, 4, R.width - 8);                      // grille / bumper
  ctx.fillStyle = '#ffe08a'; ctx.fillRect(nose - 3, -hw + 2, 3, 4); ctx.fillRect(nose - 3, hw - 6, 3, 4);   // headlights
  ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.fillRect(-R.tractorBack + 2, -hw + 1, R.tractorLen - 4, 2); ctx.fillRect(-R.tractorBack + 2, hw - 3, R.tractorLen - 4, 2);
  ctx.fillStyle = '#872b31'; ctx.font = 'bold 9px monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('07', 22, 0);
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
  ctx.save(); ctx.scale(hud, hud);
  const sw = W / hud, sh = H / hud, f = game.fire;
  ctx.textBaseline = 'middle';
  hudBox(12, 12, 150, 48);
  ctx.textAlign = 'left'; ctx.fillStyle = '#91a4b3'; ctx.font = 'bold 10px system-ui'; ctx.fillText('SCORE / CALLS', 23, 26);
  ctx.fillStyle = '#fff'; ctx.font = 'bold 18px monospace'; ctx.fillText(game.score + ' / ' + game.firesOut, 23, 46);
  const clockW = Math.min(260, sw - 350), clockX = (sw - clockW) / 2;
  hudBox(clockX, 12, clockW, 48);
  ctx.textAlign = 'center'; ctx.fillStyle = f && f.t < 12 ? '#ff7e6e' : '#ffe3a8'; ctx.font = 'bold 17px monospace';
  ctx.fillText(f ? Math.ceil(f.t) + 's · CALL ' + f.number : 'STANDING BY', sw / 2, 30);
  ctx.fillStyle = '#98abb5'; ctx.font = '10px system-ui'; ctx.fillText('♥ '.repeat(game.lives) + '  ' + game.crashes + ' SCRAPES', sw / 2, 49);
  {
    const mx=sw-157,my=12,mw=145,mh=80;
    hudBox(mx-4,my-4,mw+8,mh+8);ctx.fillStyle='#192e3a';ctx.fillRect(mx,my,mw,mh);
    for(const b of game.world.buildings){ctx.fillStyle=b===f?.building?'#ffae6a':b.state==='saved'?'#467e70':'#526b78';ctx.fillRect(mx+b.col*TILE/W*mw,my+b.row*TILE/H*mh,b.w*TILE/W*mw,b.h*TILE/H*mh);}
    ctx.strokeStyle='#94bccb';ctx.lineWidth=1;ctx.strokeRect(mx+(camera.x-W/camera.zoom/2)/W*mw,my+(camera.y-H/camera.zoom/2)/H*mh,mw/camera.zoom,mh/camera.zoom);
    ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(mx+game.truck.x/W*mw,my+game.truck.y/H*mh,3,0,Math.PI*2);ctx.fill();
  }
  if (f) {
    const p = screenPoint(f.building.cx, f.building.cy);
    if (p.x < 40 || p.x > W - 40 || p.y < 100 || p.y > H - 100) {
      const x = Math.max(30, Math.min(sw - 30, p.x / hud)), y = Math.max(112, Math.min(sh - 110, p.y / hud));
      ctx.save(); ctx.translate(x, y); ctx.rotate(Math.atan2(p.y - H / 2, p.x - W / 2));
      ctx.fillStyle = '#ffbd68'; ctx.beginPath(); ctx.moveTo(14, 0); ctx.lineTo(-9, -9); ctx.lineTo(-9, 9); ctx.closePath(); ctx.fill(); ctx.restore();
      ctx.fillStyle = '#ffe4bb'; ctx.font = 'bold 10px system-ui'; ctx.textAlign = 'center'; ctx.fillText('FIRE', x, y + 23);
    }
  }
  const panelW = (sw - 36) / 2, py = sh - 65;
  for (const [x, color, title, detail] of [
    [12, '#8cddff', 'P1 · DRIVER', 'W/S gas/reverse · A/D steer · Space brake'],
    [24 + panelW, '#ffcb7b', 'P2 · TILLERMAN', '← → steer rear wheels'],
  ]) {
    hudBox(x, py, panelW, 53); ctx.textAlign = 'left'; ctx.fillStyle = color; ctx.font = 'bold 12px system-ui'; ctx.fillText(title, x + 10, py + 16);
    ctx.fillStyle = '#d5e0e7'; ctx.font = '11px system-ui'; ctx.fillText(detail, x + 10, py + 36);
  }
  if (f && parkedInZone(game)) {
    ctx.textAlign = 'center'; ctx.fillStyle = '#a1ffd0'; ctx.font = 'bold 13px system-ui';
    ctx.fillText(readyToPark(game) ? 'HOLD STILL · CREW ARRIVING' : 'STOP BOTH AXLES IN THE ZONE · ALIGN WITH CURB', sw / 2, sh - 90);
  }
  if (game.status === 'playing') {
    const x = 22, y = py - 18;
    ctx.fillStyle = '#203b48'; ctx.fillRect(x,y,panelW-20,5);
    ctx.fillStyle = '#84d9e8'; ctx.fillRect(x,y,(panelW-20)*Math.abs(game.truck.v)/RULES.maxSpeed,5);
    ctx.font = 'bold 10px monospace'; ctx.textAlign = 'left'; ctx.fillStyle = '#acced8';
    ctx.fillText(Math.round(Math.abs(game.truck.v)*.28) + (game.truck.v < -1 ? '  REVERSE' : '  KM/H'), x, y-8);
    const cx = 24 + panelW + (panelW / 2);
    ctx.strokeStyle = '#3c5260'; ctx.lineWidth = 3; ctx.beginPath();ctx.moveTo(cx-45,y);ctx.lineTo(cx+45,y);ctx.stroke();
    ctx.fillStyle = '#ffcb7b';ctx.beginPath();ctx.arc(cx + game.truck.tiller / RULES.maxTiller * 40,y,4,0,Math.PI*2);ctx.fill();
  }
  ctx.restore();
}
function drawBanner(dt) {
  if (!banner) return;
  banner.t += dt;
  if (banner.t > banner.dur) { banner = null; return; }
  const a = Math.min(1, banner.t / 0.15, (banner.dur - banner.t) / 0.4);
  const pop = 1 + 0.08 * Math.max(0, 1 - banner.t / 0.25);
  ctx.save(); ctx.globalAlpha = a; ctx.translate(W / 2, H * 0.23); ctx.scale(pop * Math.min(hud, 1.6), pop * Math.min(hud, 1.6));
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = 'bold 32px "Bricolage Grotesque", Inter, system-ui, sans-serif';
  ctx.lineWidth = 8; ctx.strokeStyle = 'rgba(0,0,0,0.75)'; ctx.strokeText(banner.text, 0, 0);
  ctx.fillStyle = banner.color; ctx.fillText(banner.text, 0, 0);
  if (banner.sub) {
    ctx.font = '600 13px Inter, system-ui, sans-serif';
    ctx.lineWidth = 5; ctx.strokeText(banner.sub, 0, 28); ctx.fillStyle = '#fff'; ctx.fillText(banner.sub, 0, 28);
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
  if (!cityLayer) cityLayer = buildCityLayer();
  const active = game.status !== 'menu', zoom = active ? (hud > 1.5 ? 2 : 1.65) : 1;
  camera.zoom = zoom;
  const tr = game.truck;
  const focal = { x: tr.x - Math.cos(tr.h2) * 25 + Math.cos(tr.h1) * tr.v * .35, y: tr.y - Math.sin(tr.h2) * 25 + Math.sin(tr.h1) * tr.v * .35 };
  const tx = active ? Math.max(W / zoom / 2, Math.min(W - W / zoom / 2, focal.x)) : W / 2;
  const ty = active ? Math.max(H / zoom / 2, Math.min(H - H / zoom / 2, focal.y)) : H / 2;
  const ease = 1 - Math.exp(-dt * 5);
  camera.x += (tx - camera.x) * ease; camera.y += (ty - camera.y) * ease;
  ctx.setTransform(scale, 0, 0, scale, 0, 0); ctx.clearRect(0, 0, W, H);
  ctx.save(); ctx.translate(W / 2, H / 2); ctx.scale(zoom, zoom); ctx.translate(-camera.x, -camera.y);
  ctx.drawImage(cityLayer, 0, 0, W, H);
  if (shake > 0) { shake = Math.max(0, shake - dt); const s = shake * 5; ctx.translate((Math.random() - .5) * s, (Math.random() - .5) * s); }
  for (const b of game.world.buildings) {
    if (b.state === 'ruined') drawRuined(b);
    else if (b.state === 'saved') drawSaved(b);
  }
  drawZones(t);
  drawTruck(t);
  if (game.fire) { drawWorldFire(ctx, game.fire, t); if (dt) spawnSmoke(game.fire.building, dt); }
  drawParticles(dt); drawFloaters(dt);
  ctx.restore();
  if (active) drawHUD(t);
  drawBanner(dt);
  if (game.status === 'playing' && game.fire) {
    setMission(readyToPark(game) ? 'HOLD STILL · Delivering the crew…' : 'DRIVE TO THE ALARM · Park both axles in the marked area, parallel to the curb. Space brakes. R recovers (−5s).', readyToPark(game));
  }
}
function frame(ts) {
  const dt = Math.min(1 / 20, lastTs ? (ts - lastTs) / 1000 : 1 / 60);
  lastTs = ts;
  lightPhase += dt;
  if (game.status === 'playing' && !game.paused) {
    const input = readInput(); tapped.clear();
    const steps = Math.ceil(dt / (1 / 120));
    for (let i = 0; i < steps; i++) step(game, dt / steps, input);
    for (const e of drainEvents(game)) onEvent(e);
  }
  updateEngineAudio();
  render(game.paused ? 0 : dt, lightPhase);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
showMenu('');
// Debug/verification handle (read-only use; tools/VERIFICATION.md drives the game through it).
window.__hookLadder = () => ({ game, held, particles });
