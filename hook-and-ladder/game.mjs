// Hook & Ladder — rendering, input, sound and page wiring. Rules live in engine.mjs.
import {
  createGame, startGame, step, drainEvents, readyToPark, parkedInZone,
  serviceZones, callZones, routeToCall, turntable, roofPoint, W as WORLD_W, H as WORLD_H, TILE, RULES,
} from './engine.mjs?v=20260916m';

import { paintCity, drawWorldFire, drawCars, person } from './art.mjs?v=20260916m';

const W = 1240, H = 680; // Fixed camera viewport; the world can grow independently.
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

const GARAGE_KEY='hookAndLadderGarage';
const PRICES={engine:100,armor:100,equipment:100};
let garage={credits:0,upgrades:{}};
try { const saved=JSON.parse(localStorage.getItem(GARAGE_KEY)||'null'); if(saved)garage={credits:Math.max(0,Math.floor(Number(saved.credits)||0)),upgrades:saved.upgrades||{}}; } catch(e) {}
function saveGarage(){try{localStorage.setItem(GARAGE_KEY,JSON.stringify(garage));}catch(e){}}
function updateGarage(){
  document.getElementById('credits').textContent=garage.credits;
  for(const button of document.querySelectorAll('[data-upgrade]')){
    const id=button.dataset.upgrade,owned=!!garage.upgrades[id];
    button.disabled=owned||garage.credits<PRICES[id];
    button.querySelector('small').textContent=owned?'Installed':PRICES[id]+' credits';
  }
}
for(const button of document.querySelectorAll('[data-upgrade]'))button.addEventListener('click',()=>{
  const id=button.dataset.upgrade;if(garage.upgrades[id]||garage.credits<PRICES[id])return;
  garage.credits-=PRICES[id];garage.upgrades[id]=true;game.upgrades[id]=true;saveGarage();updateGarage();
});
updateGarage();
const requestedSeed=new URLSearchParams(location.search).get('seed');
const seedOption=requestedSeed!==null && /^\d+$/.test(requestedSeed)?{seed:Number(requestedSeed)>>>0}:{};
let game = createGame({...seedOption,upgrades:garage.upgrades});
let muted = false;
let scale = 1;
let hud = 1;             // HUD magnification for small displays (1 on desktop, up to 2.2 on phones)
let cityLayer = null;
let particles = [];
let floaters = [];
let banner = null;       // { text, sub, t, dur, color }
let lightPhase = 0;
let shake = 0, impactFlash=0, navKey='', navPath=[], lastUrgent=-1, lastDamageAlarm=-1;
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
const GAME_KEYS = new Set(['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' ', 'w', 'a', 's', 'd', 'enter', 'p', 'r', 'e']);
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
    leave: h.has('e'), ladderX:hx, ladderY:Number(h.has('s'))-Number(h.has('w')),
    hoseX:Number(h.has('arrowright'))-Number(h.has('arrowleft')), hoseY:Number(h.has('arrowdown'))-Number(h.has('arrowup')),
    grab:h.has(' '), spray:h.has('enter'),
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
  game = createGame({...seedOption,upgrades:garage.upgrades});
  startGame(game);
  camera.zoom = 1.48; camera.x = Math.max(W / camera.zoom / 2, game.truck.x); camera.y = H / 2;
  particles = []; floaters = []; banner = null; shake = 0; impactFlash=0;navKey='';navPath=[];lastUrgent=-1;lastDamageAlarm=-1;
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
  document.getElementById('resume-shift').hidden=game.status!=='playing';
  menu.hidden = false;
}
menu.querySelector('[data-start]').addEventListener('click', startShift);

document.getElementById('open-garage').addEventListener('click',()=>{
  if(game.status==='playing'&&!game.paused)window.gameAPI.pause();
  if(window.ArcadeGameOver)window.ArcadeGameOver.hide();
  showMenu(game.status==='playing'?'Shift paused · upgrade or resume':'Choose upgrades for your next shift');
});
document.getElementById('resume-shift').addEventListener('click',()=>{
  menu.hidden=true;if(game.paused)window.gameAPI.pause();canvas.focus({preventScroll:true});
});
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
      impactFlash=.45;
      if (e.scrape) noise(.08, .05); else SFX.crash(); shake = e.scrape ? .10 : .3;
      for (let i = 0; i < 10; i++) particles.push({ x: e.x, y: e.y, vx: (Math.random() - 0.5) * 160, vy: (Math.random() - 0.5) * 160, life: 0, max: 0.4 + Math.random() * 0.3, r: 2, color: '#ffd166', kind: 'spark' });
      break;
    }
    case 'recover':
      banner = { text: 'BACK ON THE ROAD', sub: 'Recovery · 5 seconds lost', t: 0, dur: 1.5, color: '#ffd166' }; break;
    case 'extinguished': {
      garage.credits+=50;saveGarage();updateGarage();
      SFX.saved();
      const parts = ['+' + e.gained, '+50 credits'];
      if (e.clean) parts.push('clean run');
      banner = { text: 'CALL COMPLETE', sub: parts.join(' · '), t: 0, dur: 1.8, color: '#7dffb0' };
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
      const title=e.reason==='Truck disabled'?'Truck wrecked':'Three calls missed';
      const explanation=e.reason==='Truck disabled'?'Truck damage reached 100%. Slow down before corners and avoid hitting traffic.':'Three buildings were lost before you completed the rescue and firefighting. Both jobs must finish before the call timer runs out.';
      const summary=e.fires+' calls completed · '+game.crashes+' collisions · '+game.damage+'% damage';
      gtagEvent('game_over', { score: e.score, fires: e.fires, mode: 'driving' });
      setMission((e.reason || 'Shift over') + '. ' + e.fires + (e.fires === 1 ? ' fire' : ' fires') + ' put out.');
      const finishedRun = runId;
      setTimeout(() => {
        if (runId !== finishedRun || game.status !== 'over') return;
        showMenu(title+' · '+summary);
        if (window.ArcadeGameOver) window.ArcadeGameOver.show({ title, message: explanation + ' ' + summary, score: e.score, best: highScore, restart: () => { gtagEvent('play_again', { from: 'hook-and-ladder' }); startShift(); } });
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
  off.width = Math.round(WORLD_W * detail); off.height = Math.round(WORLD_H * detail);
  const c = off.getContext('2d'); c.scale(detail, detail);
  paintCity(c, game.world);
  return off;
}

// ---------------------------------------------------------------- dynamic drawing
function drawZones(t) {
  const f = game.fire; if (!f || f.crew) return;
  const parked = parkedInZone(game);
  const pulse = 0.55 + 0.45 * Math.sin(t * 5);
  for (const z of callZones(game)) {
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
function drawCrew(t) {
  const f=game.fire;if(!f?.crew)return;
  const base=turntable(game.truck),b=f.building;
  const point=p=>({x:(b.col+p.u*b.w)*TILE,y:(b.row+p.v*b.h)*TILE});
  const rescued=f.targets.find(target=>target.kind==='person'&&target.hp===0&&game.t-target.doneAt<.9);
  let tip=point(f.crew.ladder);const hose=point(f.crew.hose);
  if(rescued){const start=point(rescued.pickup);const progress=Math.min(1,(game.t-rescued.doneAt)/.9),ease=progress*progress*(3-2*progress);tip={x:start.x+(base.x-start.x)*ease,y:start.y+(base.y-start.y)*ease};}
  ctx.save();
  const angle=Math.atan2(tip.y-base.y,tip.x-base.x),length=Math.hypot(tip.x-base.x,tip.y-base.y);
  ctx.translate(base.x,base.y);ctx.rotate(angle);
  ctx.shadowColor='rgba(0,0,0,.6)';ctx.shadowBlur=5;ctx.shadowOffsetY=5;
  ctx.fillStyle='#14242e';ctx.fillRect(0,-6,length,12);ctx.shadowBlur=0;ctx.shadowOffsetY=0;
  const steel=ctx.createLinearGradient(0,-6,0,6);steel.addColorStop(0,'#fcf8da');steel.addColorStop(.4,'#9aabb7');steel.addColorStop(1,'#d8e6eb');
  ctx.strokeStyle=steel;ctx.lineWidth=2.5;ctx.beginPath();ctx.moveTo(0,-5);ctx.lineTo(length,-5);ctx.moveTo(0,5);ctx.lineTo(length,5);
  for(let x=4;x<length;x+=8){ctx.moveTo(x,-5);ctx.lineTo(x,5);}ctx.stroke();ctx.restore();
  ctx.save();ctx.translate(tip.x,tip.y);
  if(rescued) {ctx.save();ctx.scale(.55,.55);person(ctx,0,-8,t);ctx.restore();}
  ctx.fillStyle='#203843';ctx.fillRect(-10,-3,20,10);ctx.strokeStyle='#ffe09c';ctx.lineWidth=2;ctx.strokeRect(-10,-7,20,14);
  ctx.strokeStyle='#b8c8cb';ctx.beginPath();ctx.moveTo(-4,-7);ctx.lineTo(-4,7);ctx.moveTo(4,-7);ctx.lineTo(4,7);ctx.stroke();ctx.restore();
  if(f.crew.spray){
    const bend={x:(base.x+hose.x)/2,y:(base.y+hose.y)/2-24};
    ctx.save();ctx.lineCap='round';ctx.beginPath();ctx.moveTo(base.x,base.y);ctx.quadraticCurveTo(bend.x,bend.y,hose.x,hose.y);
    ctx.strokeStyle='rgba(55,173,234,.25)';ctx.lineWidth=9;ctx.stroke();ctx.strokeStyle='#72ccf3';ctx.lineWidth=4;ctx.stroke();ctx.strokeStyle='#e7fbff';ctx.lineWidth=1.5;ctx.stroke();
    for(let i=0;i<16;i++){const q=(t*1.7+i/16)%1,x=(1-q)**2*base.x+2*(1-q)*q*bend.x+q*q*hose.x,y=(1-q)**2*base.y+2*(1-q)*q*bend.y+q*q*hose.y;ctx.fillStyle='#e6fcff';ctx.beginPath();ctx.arc(x,y,1.4,0,Math.PI*2);ctx.fill();}
    for(let i=0;i<14;i++){const q=(t*2+i*.071)%1,a=i*2.4;ctx.globalAlpha=1-q;ctx.fillStyle='#b0e8fa';ctx.beginPath();ctx.arc(hose.x+Math.cos(a)*q*21,hose.y+Math.sin(a)*q*13-q*5,1+q*2,0,Math.PI*2);ctx.fill();}ctx.restore();
  }
  ctx.save();ctx.strokeStyle='#8de3ff';ctx.lineWidth=1.5;
  ctx.beginPath();ctx.arc(hose.x,hose.y,13,0,Math.PI*2);ctx.moveTo(hose.x-18,hose.y);ctx.lineTo(hose.x-8,hose.y);ctx.moveTo(hose.x+8,hose.y);ctx.lineTo(hose.x+18,hose.y);ctx.stroke();
  ctx.font='bold 9px system-ui';ctx.textAlign='center';ctx.fillStyle='#101f29';ctx.fillRect(tip.x-60,tip.y+12,52,14);ctx.fillRect(hose.x+8,hose.y+12,52,14);ctx.fillStyle='#ffe09c';ctx.fillText(rescued?'SAFE':'P1 GRAB',tip.x-34,tip.y+22);ctx.fillStyle='#a5eaff';ctx.fillText('P2 HOSE',hose.x+34,hose.y+22);
  for(const target of f.targets){
    if(target.hp<=0)continue;
    const p=point(roofPoint(target.at));ctx.fillStyle='#142530';ctx.fillRect(p.x-16,p.y+18,32,5);ctx.fillStyle=target.kind==='person'?'#ffda87':'#75dcff';ctx.fillRect(p.x-16,p.y+18,32*(1-target.hp),5);
  }ctx.restore();
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
function updateNavigation() {
  const key=game.fire?game.fire.number+':'+Math.floor(game.truck.x/TILE)+':'+Math.floor(game.truck.y/TILE):'';
  if(key!==navKey){navKey=key;navPath=routeToCall(game);}
}
function drawRoute() {
  if(game.fire?.crew||navPath.length<2)return;
  ctx.save();ctx.strokeStyle='rgba(85,213,235,.45)';ctx.lineWidth=3;ctx.lineJoin='round';
  ctx.beginPath();navPath.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.stroke();
  for(let i=1;i<navPath.length;i+=2){const p=navPath[i],a=navPath[i-1];ctx.save();ctx.translate(p.x,p.y);ctx.rotate(Math.atan2(p.y-a.y,p.x-a.x));ctx.strokeStyle='#97e8f3';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(-5,-4);ctx.lineTo(0,0);ctx.lineTo(-5,4);ctx.stroke();ctx.restore();}ctx.restore();
}
function warningAudio(){
  if(game.paused||game.status!=='playing')return;
  const remaining=Math.ceil(game.fire?.t||0),urgent=!!game.fire&&game.fire.targets.some(t=>t.hp>0)&&remaining<=10;
  if(urgent&&remaining!==lastUrgent){lastUrgent=remaining;if(!muted)tone(remaining<=3?1100:820,.12,'square',.06);}
  const beat=Math.floor(game.t/3);
  if(game.damage>=75&&beat!==lastDamageAlarm){lastDamageAlarm=beat;if(!urgent&&!muted){tone(240,.15,'triangle',.12);tone(180,.2,'triangle',.1,.18);}}
  if(!urgent)lastUrgent=-1;
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
  ctx.fillStyle = '#98abb5'; ctx.font = '10px system-ui'; ctx.fillText('♥ '.repeat(game.lives) + '  DAMAGE ' + game.damage + '%', sw / 2, 49);
  {
    const mx=sw-157,my=12,mw=145,mh=80;
    hudBox(mx-4,my-4,mw+8,mh+8);ctx.fillStyle='#192e3a';ctx.fillRect(mx,my,mw,mh);
    for(const b of game.world.buildings){ctx.fillStyle=b===f?.building?'#ffae6a':b.state==='saved'?'#467e70':'#526b78';ctx.fillRect(mx+b.col*TILE/WORLD_W*mw,my+b.row*TILE/WORLD_H*mh,b.w*TILE/WORLD_W*mw,b.h*TILE/WORLD_H*mh);}
    ctx.strokeStyle='#94bccb';ctx.lineWidth=1;ctx.strokeRect(mx+(camera.x-W/camera.zoom/2)/WORLD_W*mw,my+(camera.y-H/camera.zoom/2)/WORLD_H*mh,mw*W/WORLD_W/camera.zoom,mh*H/WORLD_H/camera.zoom);
    if(navPath.length){ctx.strokeStyle='#8be8f1';ctx.beginPath();navPath.forEach((p,i)=>i?ctx.lineTo(mx+p.x/WORLD_W*mw,my+p.y/WORLD_H*mh):ctx.moveTo(mx+p.x/WORLD_W*mw,my+p.y/WORLD_H*mh));ctx.stroke();}
    ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(mx+game.truck.x/WORLD_W*mw,my+game.truck.y/WORLD_H*mh,3,0,Math.PI*2);ctx.fill();
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
  const urgent=f&&f.t<=10&&f.targets.some(target=>target.hp>0);
  const critical=game.damage>=75;
  ctx.textAlign='center';ctx.font='bold 12px system-ui';ctx.fillStyle=critical?'#ff927f':'#bdd5dd';
  ctx.fillText(critical?'TRUCK CRITICAL · AVOID COLLISIONS':'TRUCK DAMAGE '+game.damage+'%',sw/2,76);
  ctx.fillStyle='#243943';ctx.fillRect(sw/2-85,86,170,6);ctx.fillStyle=critical?'#ff785e':'#e3b064';ctx.fillRect(sw/2-85,86,170*game.damage/100,6);
  if(urgent){ctx.fillStyle=Math.sin(t*7)>0?'#ffad92':'#ffe7da';ctx.font='bold 17px system-ui';ctx.fillText(Math.ceil(f.t)+' SECONDS · FINISH BOTH JOBS',sw/2,115);}
  else if(f&&!f.crew){
    const distance=Math.round(Math.max(0,(navPath.length-1)*TILE)*.08);ctx.fillStyle='#9de5ed';ctx.font='bold 12px monospace';
    let instruction='FOLLOW BLUE ARROWS';
    if(navPath.length<3)instruction='PARK IN THE GOLD ZONE';
    else{const a=navPath[1],b=navPath[2],angle=Math.atan2(b.y-a.y,b.x-a.x),relative=Math.atan2(Math.sin(angle-game.truck.h1),Math.cos(angle-game.truck.h1));if(Math.abs(relative)>2.4)instruction='TURN AROUND WHEN CLEAR';else if(relative>.6)instruction='BEAR RIGHT';else if(relative<-.6)instruction='BEAR LEFT';}
    ctx.fillText(instruction+' · '+distance+' m',sw/2,115);
  }
  const panelW = (sw - 36) / 2, py = sh - 65;
  for (const [x, color, title, detail] of [
    [12, '#8cddff', game.fire?.crew ? 'P1 · LADDER' : 'P1 · DRIVER', game.fire?.crew ? 'WASD move · Space grab · E drive' : 'W/S gas/reverse · A/D steer · Space brake'],
    [24 + panelW, '#ffcb7b', game.fire?.crew ? 'P2 · HOSE' : 'P2 · TILLERMAN', game.fire?.crew ? 'Arrows aim · Enter spray' : '← → adjust · release holds angle'],
  ]) {
    hudBox(x, py, panelW, 53); ctx.textAlign = 'left'; ctx.fillStyle = color; ctx.font = 'bold 12px system-ui'; ctx.fillText(title, x + 10, py + 16);
    ctx.fillStyle = '#d5e0e7'; ctx.font = '11px system-ui'; ctx.fillText(detail, x + 10, py + 36);
  }
  if (f && parkedInZone(game)) {
    ctx.textAlign = 'center'; ctx.fillStyle = '#a1ffd0'; ctx.font = 'bold 13px system-ui';
    ctx.fillText(readyToPark(game) ? game.fire?.crew ? 'RESCUE + EXTINGUISH · EITHER ORDER' : 'HOLD STILL · SETTING UP' : 'STOP BOTH AXLES IN THE ZONE · ALIGN WITH CURB', sw / 2, sh - 90);
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
  updateNavigation();
  const active = game.status !== 'menu', zoom = active ? (hud > 1.5 ? 1.8 : 1.48) : 1;
  camera.zoom = zoom;
  const tr = game.truck;
  const focal = { x: tr.x - Math.cos(tr.h2) * 25 + Math.cos(tr.h1) * tr.v * .35, y: tr.y - Math.sin(tr.h2) * 25 + Math.sin(tr.h1) * tr.v * .35 };
  const tx = active ? Math.max(W / zoom / 2, Math.min(WORLD_W - W / zoom / 2, focal.x)) : W / 2;
  const ty = active ? Math.max(H / zoom / 2, Math.min(WORLD_H - H / zoom / 2, focal.y)) : H / 2;
  const ease = 1 - Math.exp(-dt * 5);
  camera.x += (tx - camera.x) * ease; camera.y += (ty - camera.y) * ease;
  ctx.setTransform(scale, 0, 0, scale, 0, 0); ctx.clearRect(0, 0, W, H);
  ctx.save(); ctx.translate(W / 2, H / 2); ctx.scale(zoom, zoom); ctx.translate(-camera.x, -camera.y);
  ctx.drawImage(cityLayer, 0, 0, WORLD_W, WORLD_H);
  drawCars(ctx, [...game.world.cars, ...game.world.traffic]);
  if (shake > 0) { shake = Math.max(0, shake - dt); const s = shake * 5; ctx.translate((Math.random() - .5) * s, (Math.random() - .5) * s); }
  for (const b of game.world.buildings) {
    if (b.state === 'ruined') drawRuined(b);
    else if (b.state === 'saved') drawSaved(b);
  }
  drawRoute();
  drawZones(t);
  drawTruck(t);
  if (game.fire) { drawWorldFire(ctx, game.fire, game.t); if (dt && game.fire.targets.some(target=>target.kind==='fire'&&target.hp>0)) spawnSmoke(game.fire.building, dt); }
  drawCrew(t);
  drawParticles(dt); drawFloaters(dt);
  ctx.restore();
  if (active) drawHUD(t);
  if(impactFlash>0){impactFlash=Math.max(0,impactFlash-dt);ctx.save();ctx.strokeStyle='rgba(255,75,45,'+impactFlash+')';ctx.lineWidth=18;ctx.strokeRect(9,9,W-18,H-18);ctx.restore();}
  drawBanner(dt);
  if (game.status === 'playing' && game.fire) {
    setMission(game.fire.crew ? 'P1: WASD ladder + Space grab · P2: arrows hose + Enter spray · Either order · E to drive' : readyToPark(game) ? 'HOLD STILL · Setting up…' : game.fire.title+' · Follow blue route. '+(game.fire.approach?'Use the '+({n:'north',s:'south',e:'east',w:'west'}[game.fire.approach])+' side. ':'')+(game.fire.tight?'Tight bay: P2 guide the tail. ':'')+'Park both axles in gold. Space brakes.', readyToPark(game));
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
  updateEngineAudio();warningAudio();
  render(game.paused ? 0 : dt, lightPhase);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
showMenu('');
// Debug/verification handle (read-only use; tools/VERIFICATION.md drives the game through it).
window.__hookLadder = () => ({ game, held, particles });
