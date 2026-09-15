// Dynamine — pure game logic. No DOM, no timers, no rendering.
// The page (game.mjs) drives it with step(state, dt, inputs) and draws state;
// tools/dynamine-test.mjs drives it headlessly. Keep it that way.

import { OPENING_LEVELS } from './opening-levels.mjs?v=20260915i';

import { JARS, PASSWORDS, FEATURE_HINTS, featureActive } from './classic-content.mjs?v=20260915i';
export { JARS, PASSWORDS, featureActive };

export const FLOOR = 0, WALL = 1, BRICK = 2;
export const W = 13, H = 11;

export const DIRS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
const DIR_NAMES = ['up', 'down', 'left', 'right'];
const OPPOSITE = { up: 'down', down: 'up', left: 'right', right: 'left' };

export const ITEM = { BOMB: 'bomb', FIRE: 'fire', SPEED: 'speed', SHIELD: 'shield', FIREBALL: 'fireball', IGNITOR: 'ignitor', HEART:'heart', MAX:'max', RADIATION:'radiation', FIREBALL4:'fireball4', ELECTRIC:'electric', ELECTRIC4:'electric4', TELEPORT:'teleport', TELEPORT4:'teleport4', WIND:'wind', WIND4:'wind4' };
// bat: flutters about. knocker: mine goblin, chases on sight. spider: fast and
// erratic. spark: ignited gas that hunts you down once the clock runs out.
export const ENEMY = {
  bat:     { speed: 1.6, score: 100, style: 'wander' },
  knocker: { speed: 2.4, score: 200, style: 'hunter' },
  spider:  { speed: 3.4, score: 400, style: 'erratic' },
  spark:   { speed: 4.2, score: 500, style: 'chaser' },
};

export const RULES = {
  radiationDuration: 10, stunDuration: 2,
  powerDuration: 40, fireballCooldown: 0.45, projectileSpeed: 8,
  bombFuse: 2.0,        // seconds from placement to blast
  fireTime: 0.45,       // seconds a blast cell stays lethal
  baseSpeed: 3.0,       // player tiles per second
  speedStep: 0.6,       // per speed item
  maxBombs: 6, maxRange: 6, maxSpeedItems: 3,
  hitbox: 0.38,         // half-width of a miner, in tiles
  respawnDelay: 1.6,    // seconds the corpse lingers before respawn
  invulnTime: 2.2,      // seconds of protection after respawn
  spawnGrace: 6,        // …and protection holds until the miner first moves, up to this long
  levelTime: 180,       // adventure timer; sparks arrive at zero
  battleTime: 120,      // battle round length; walls start closing at 45 s left
  suddenDeathAt: 45,
  suddenDeathStep: 0.45,
  extraLifeAt: [10000, 25000, 50000, 100000],
  brickScore: 10, itemScore: 50, levelBonus: 1000, timeBonus: 5,
  battleWinsNeeded: 3,
};

// ---------------------------------------------------------------- helpers
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const key = (x, y) => y * W + x;
export const tileOf = v => Math.floor(v);
export const centre = i => Math.floor(i) + 0.5;

export function tileAt(state, x, y) {
  if (x < 0 || y < 0 || x >= W || y >= H) return WALL;
  return state.grid[key(x, y)];
}
export function bombAt(state, x, y) {
  return state.bombs.find(b => b.x === x && b.y === y && !b.exploded) || null;
}
export function fireAt(state, x, y) {
  const f = state.fires.get(key(x, y));
  return f != null && f > state.time;
}

// The four corners each get an L of clear floor so miners can move at once.
const CORNERS = [
  { x: 1, y: 1 }, { x: W - 2, y: H - 2 }, { x: W - 2, y: 1 }, { x: 1, y: H - 2 },
];
function nearSpawn(x, y) {
  return CORNERS.some(c => Math.abs(c.x - x) + Math.abs(c.y - y) <= 1);
}

// ---------------------------------------------------------------- layout
export function buildGrid(rng, brickDensity, corners) {
  const grid = new Uint8Array(W * H);
  const cells = [];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (x === 0 || y === 0 || x === W - 1 || y === H - 1 || (x % 2 === 0 && y % 2 === 0)) {
      grid[key(x, y)] = WALL;
    } else if (!corners.some(c => Math.abs(c.x - x) + Math.abs(c.y - y) <= 1)) {
      cells.push([x, y]);
    }
  }
  // Fisher–Yates then take the first density share as bricks.
  for (let i = cells.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [cells[i], cells[j]] = [cells[j], cells[i]];
  }
  const count = Math.round(cells.length * brickDensity);
  for (let i = 0; i < count; i++) grid[key(cells[i][0], cells[i][1])] = BRICK;
  return { grid, bricks: cells.slice(0, count) };
}

function makePlayer(id, corner, opts = {}) {
  return {
    id, x: corner.x + 0.5, y: corner.y + 0.5, spawn: { ...corner }, lives:3,
    dir: 'down', moving: false, facing: 'down',
    speedItems: 0, maxBombs: 1, range: 1, shield: false,
    power: null, powerUntil: 0, powerReady: 0,
    alive: true, deadAt: -1, invulnUntil: 0, graceUntil: 0, movedSinceSpawn: false,
    cpu: !!opts.cpu, name: opts.name || 'Miner', color: opts.color || 'blue',
    wins: 0, ai: null, bombCooldown: 0, walkPhase: 0, decideAtCentre: !!opts.cpu, atNode: false,
  };
}

function makeEnemy(type, x, y, rng) {
  return {
    type, x: x + 0.5, y: y + 0.5, dir: DIR_NAMES[Math.floor(rng() * 4)],
    alive: true, deadAt: -1, walkPhase: 0, moving: true,
    speed: ENEMY[type].speed, decideAtCentre: true, atNode: false,
  };
}

function levelSpec(level) {
  const enemies = [];
  const n = Math.min(2 + level, 9);
  for (let i = 0; i < n; i++) {
    let type = 'bat';
    if (level >= 3 && i % 3 === 1) type = 'knocker';
    if (level >= 5 && i % 3 === 2) type = 'knocker';
    if (level >= 6 && i % 4 === 3) type = 'spider';
    if (level >= 9 && i % 2 === 0) type = 'spider';
    enemies.push(type);
  }
  return {
    enemies,
    density: Math.min(0.5 + level * 0.03, 0.66),
    items: 4 + Math.min(level, 4),
  };
}

// ---------------------------------------------------------------- state
export function createGame(opts = {}) {
  const mode = opts.mode || 'adventure';            // 'adventure' | 'battle'
  const seed = opts.seed == null ? (Date.now() & 0x7fffffff) : opts.seed;
  const state = {
    mode, seed, rng: mulberry32(seed),
    features: new Map(), effects: [], elapsed:0, grid: null, projectiles: [], projectileHits: new Set(), bombs: [], fires: new Map(), items: new Map(), door: null, shafts: [],
    players: [], enemies: [], particles: [],
    time: 0, timer: 0, level: 0, score: 0, lives: 3, extraLifeIdx: 0,
    status: 'intro', statusUntil: 0, events: [], round: 0, roundWinner: null,
    suddenDeath: null, cpuLevel: opts.cpuLevel || 1,
  };
  if (mode === 'adventure') {
    const count=Math.max(1,Math.min(4,Number(opts.players)||1));
    state.players=Array.from({length:count},(_,id)=>makePlayer(id,CORNERS[id],{name:count===1?'You':['Blue','Red','Gold','Purple'][id],color:['blue','red','gold','purple'][id]}));
    startLevel(state, PASSWORDS[String(opts.password || '').trim().toUpperCase()] || 1);
  } else {
    state.players = [
      makePlayer(0, CORNERS[0], { name: opts.p1Name || 'Blue', color: 'blue' }),
      makePlayer(1, CORNERS[1], { name: opts.p2Name || (opts.cpu ? 'The computer' : 'Red'), color: 'red', cpu: !!opts.cpu }),
    ];
    for(let id=2;id<Math.min(4,Number(opts.players)||2);id++)state.players.push(makePlayer(id,CORNERS[id],{name:['Blue','Red','Gold','Purple'][id],color:['blue','red','gold','purple'][id]}));
    startRound(state);
  }
  return state;
}

function resetPlayer(p, keepPowers) {
  p.x = p.spawn.x + 0.5; p.y = p.spawn.y + 0.5;
  p.power = null; p.powerUntil = 0; p.powerReady = 0; p.stunnedUntil = 0;
  p.dir = 'down'; p.facing = 'down'; p.moving = false;
  p.alive = true; p.deadAt = -1; p.invulnUntil = 0; p.graceUntil = 0; p.movedSinceSpawn = false; p.ai = null; p.bombCooldown = 0;
  if (!keepPowers) { p.speedItems = 0; p.maxBombs = 1; p.range = 1; p.shield = false; }
}

export function startLevel(state, level) {
  const lesson = OPENING_LEVELS[level - 1];
  const spec = levelSpec(level);
  state.level = level;
  const { grid, bricks } = lesson ? {grid:new Uint8Array(W * H), bricks:[]} : buildGrid(state.rng, spec.density, state.players.map(p=>p.spawn));
  state.grid = grid;
  state.projectiles = []; state.projectileHits = new Set(); state.features = new Map(); state.effects = []; state.elapsed = 0;
  state.bombs = []; state.fires = new Map(); state.items = new Map(); state.particles = [];
  state.enemies = [];
  state.timer = RULES.levelTime; state.hurry = false;
  state.suddenDeath = null;
  state.lesson = lesson ? {name:lesson.name, hint:lesson.hint} : null;
  if (lesson) {
    state.shafts = [];
    for (let y=0; y<H; y++) for (let x=0; x<W; x++) {
      const cell = lesson.rows[y][x];
      grid[key(x,y)] = cell === '#' ? WALL : cell === '*' ? BRICK : FLOOR;
      if (cell === 'S') state.shafts.push({x,y});
      if (cell === 'E') state.door = {x,y,revealed:false,open:false};
      if (cell === 'b' || cell === 'k') state.enemies.push(makeEnemy(cell === 'b' ? 'bat' : 'knocker',x,y,state.rng));
      const pickup = {f:ITEM.FIREBALL,i:ITEM.IGNITOR,'+':ITEM.BOMB}[cell];
      if (pickup) state.items.set(key(x,y),{type:pickup,hidden:false});
    }
    for (const {x,y,type} of lesson.rewards) state.items.set(key(x,y),{type,hidden:true});
    finishLevelSetup(state,level);
    return;
  }
  // Keep one connected shaft directly reachable from the starting corridor.
  grid[key(3,1)] = FLOOR;
  // The exit is visible from the start, away from the spawn corridor.
  const shuffled = bricks.slice();
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(state.rng() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  const far = shuffled.filter(([x, y]) => x + y >= 8);
  const doorCell = far[0] || shuffled[0];
  state.door = { x: doorCell[0], y: doorCell[1], revealed: false, open: false };
  grid[key(doorCell[0], doorCell[1])] = FLOOR;
  const powerCycle = Object.keys(JARS);
  const pool = [powerCycle[(level-6)%powerCycle.length], ITEM.BOMB, ITEM.FIRE, ITEM.HEART, ITEM.RADIATION, powerCycle[(level-3)%powerCycle.length], ITEM.MAX, ITEM.SPEED];
  let placed = 0;
  for (const [x, y] of shuffled) {
    if (placed >= spec.items) break;
    if ((x === doorCell[0] && y === doorCell[1]) || (x === 3 && y === 1)) continue;
    state.items.set(key(x, y), { type: pool[placed % pool.length], hidden: true });
    placed++;
  }
  // A visible fireball flask teaches the second action immediately.
  state.items.set(key(1,2), {type: ITEM.FIREBALL, hidden:false});
  // Enemies spawn on floor cells far from the miner, and only in open
  // regions (6+ connected floor tiles) so none start sealed in a pocket.
  const region = new Int16Array(W * H).fill(-1);
  const sizes = [];
  for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
    if (grid[key(x, y)] !== FLOOR || region[key(x, y)] !== -1) continue;
    const id = sizes.length; sizes.push(0);
    const q = [key(x, y)]; region[q[0]] = id;
    while (q.length) {
      const k = q.pop(); sizes[id]++;
      const kx = k % W, ky = (k - kx) / W;
      for (const d of DIR_NAMES) {
        const nk = key(kx + DIRS[d][0], ky + DIRS[d][1]);
        if (grid[nk] === FLOOR && region[nk] === -1) { region[nk] = id; q.push(nk); }
      }
    }
  }
  const used = new Set();
  const candidates = minSize => {
    const out = [];
    for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
      const k = key(x, y);
      if (grid[k] === FLOOR && x + y >= 7 && !used.has(k) && sizes[region[k]] >= minSize) out.push([x, y]);
    }
    return out;
  };
  // Dense levels may not have enough open floor: fall back to smaller
  // pockets, then carve a brick (never one hiding an item or the door).
  const carve = () => {
    const out = [];
    for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
      const k = key(x, y);
      if (grid[k] !== BRICK || x + y < 7 || state.items.has(k) || (state.door.x === x && state.door.y === y)) continue;
      const open = DIR_NAMES.filter(d => grid[key(x + DIRS[d][0], y + DIRS[d][1])] === FLOOR).length;
      out.push([x, y, open]);
    }
    out.sort((p, q) => q[2] - p[2]);
    return out.slice(0, Math.max(1, out.filter(c => c[2] === out[0]?.[2]).length)).map(c => [c[0], c[1]]);
  };
  for (const type of spec.enemies) {
    let pool = candidates(6);
    if (!pool.length) pool = candidates(3);
    if (!pool.length) pool = candidates(1);
    let carved = false;
    if (!pool.length) { pool = carve(); carved = true; }
    if (!pool.length) break;
    const [x, y] = pool[Math.floor(state.rng() * pool.length)];
    if (carved) grid[key(x, y)] = FLOOR;
    used.add(key(x, y));
    state.enemies.push(makeEnemy(type, x, y, state.rng));
  }
  // Walkable, connected mine vents: a bomb ON any vent blasts every vent.
  state.shafts = [{x:3,y:1}, ...shuffled.filter(([x,y]) => grid[key(x,y)] === BRICK &&
    !state.items.has(key(x,y)) && x + y >= 6).slice(0, Math.min(3 + Math.floor(level / 4), 4) - 1)
    .map(([x,y]) => ({ x, y }))];
  for (const shaft of state.shafts) grid[key(shaft.x,shaft.y)] = FLOOR;
  finishLevelSetup(state,level);
}

function finishLevelSetup(state,level) {
  installFeatures(state);
  for (const e of state.enemies) {
    e.speed *= 1 + Math.min(.4, Math.max(0,level-3)*.025);
    e.bombPass = e.type === 'spider';
  }
  for(const p of state.players) {
    resetPlayer(p, level > 1);
    if(state.players.length>1) {
      for(const [dx,dy] of [[0,0],[1,0],[-1,0],[0,1],[0,-1]]) {
        const x=p.spawn.x+dx,y=p.spawn.y+dy;
        if(x>0&&y>0&&x<W-1&&y<H-1) {state.grid[key(x,y)]=FLOOR;const item=state.items.get(key(x,y));if(item)item.hidden=false;}
      }
      p.invulnUntil=state.time+RULES.invulnTime;p.graceUntil=state.time+RULES.spawnGrace;
    }
    if(p.lives<=0){p.alive=false;p.deadAt=state.time-RULES.respawnDelay-1;}
  }
  state.status = 'intro'; state.statusUntil = state.time + 1.6;
  state.events.push({ type: 'level', level });
}

export function startRound(state) {
  state.round += 1;
  const { grid, bricks } = buildGrid(state.rng, 0.62, state.players.map(p=>p.spawn));
  state.grid = grid;
  state.projectiles = []; state.projectileHits = new Set(); state.features = new Map(); state.effects = []; state.elapsed = 0;
  state.bombs = []; state.fires = new Map(); state.items = new Map(); state.particles = [];
  state.enemies = []; state.shafts = []; state.door = null; state.roundWinner = null;
  state.timer = RULES.battleTime;
  state.suddenDeath = null;
  const shuffled = bricks.slice();
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(state.rng() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  const pool = [ITEM.FIRE, ITEM.BOMB, ITEM.FIRE, ITEM.BOMB, ITEM.SPEED, ITEM.FIRE, ITEM.BOMB, ITEM.RADIATION, ITEM.SPEED, ITEM.FIRE, ITEM.FIREBALL, ITEM.IGNITOR, ITEM.ELECTRIC, ITEM.TELEPORT, ITEM.WIND, ITEM.FIREBALL4, ITEM.ELECTRIC4, ITEM.TELEPORT4, ITEM.WIND4, ITEM.MAX, ITEM.HEART];
  shuffled.slice(0, pool.length).forEach(([x, y], i) => state.items.set(key(x, y), { type: pool[i], hidden: true }));
  state.shafts = shuffled.filter(([x,y]) => !state.items.has(key(x,y))).slice(0,3).map(([x,y]) => ({x,y}));
  for (const shaft of state.shafts) grid[key(shaft.x,shaft.y)] = FLOOR;
  state.players.forEach(p => resetPlayer(p, false));
  state.status = 'intro'; state.statusUntil = state.time + 1.6;
  state.events.push({ type: 'round', round: state.round });
}

// ---------------------------------------------------------------- movement
function blockedFor(state, ent, tx, ty) {
  const t = tileAt(state, tx, ty);
  if (t === WALL) return true;
  if (t === BRICK) return true;
  if (featureBlocks(state,tileOf(ent.x),tileOf(ent.y),tx,ty)) return true;
  const b = bombAt(state, tx, ty);
  if (b && !ent.bombPass && !(tileOf(ent.x) === tx && tileOf(ent.y) === ty)) return true;
  return false;
}

// Lane mover: entities travel along tile rows/columns and may only turn at a
// tile centre. Pressing a perpendicular direction pre-turns: the entity keeps
// sliding toward the nearest centre where that turn is open, then turns —
// the same corner assist Pac-Man and Bomberman use.
function moveEntity(state, ent, want, speed, dt) {
  ent.moving = false; ent.atNode = false; ent.leaning = false;
  if (!want) return;
  let dist = speed * dt;
  let guard = 4;
  while (dist > 1e-6 && guard-- > 0) {
    const [dx, dy] = DIRS[want];
    const cx = centre(ent.x), cy = centre(ent.y);
    const offX = ent.x - cx, offY = ent.y - cy;
    const horizontal = dx !== 0;
    const alignedOff = horizontal ? offY : offX;        // must be ~0 to move
    if (Math.abs(alignedOff) > 1e-6) {
      // Need to slide to the lane centre first, but only if the turn is open there.
      const tx = tileOf(cx) + dx, ty = tileOf(cy) + dy;
      if (blockedFor(state, ent, tx, ty)) return;
      const slide = Math.min(dist, Math.abs(alignedOff));
      if (horizontal) ent.y -= Math.sign(alignedOff) * slide; else ent.x -= Math.sign(alignedOff) * slide;
      if (Math.abs(alignedOff) <= dist + 1e-9) { if (horizontal) ent.y = cy; else ent.x = cx; }
      dist -= slide;
      ent.moving = true; ent.dir = want; ent.facing = want;
      continue;
    }
    // Aligned: advance along the lane until the next tile edge.
    const nextTx = tileOf(ent.x) + dx, nextTy = tileOf(ent.y) + dy;
    const along = horizontal ? offX : offY;             // -0.5..0.5 within tile
    const ahead = horizontal ? dx : dy;
    const toCentre = -along * ahead;                    // >0 if centre is ahead
    if (toCentre > 1e-9) {
      const m = Math.min(dist, toCentre);
      if (horizontal) ent.x += dx * m; else ent.y += dy * m;
      dist -= m; ent.moving = true; ent.dir = want; ent.facing = want;
      if (m >= toCentre - 1e-9) {
        if (horizontal) ent.x = cx; else ent.y = cy;
        ent.atNode = true;
        if (ent.decideAtCentre) return;
      }
      continue;
    }
    if (blockedFor(state, ent, nextTx, nextTy)) {
      // Let the miner lean into the wall up to (0.5 - hitbox) for feel, then stop.
      const limit = 0.5 - RULES.hitbox;
      const cur = Math.abs(along);
      if (cur >= limit - 1e-9) { ent.facing = want; return; }
      const m = Math.min(dist, limit - cur);
      if (horizontal) ent.x += dx * m; else ent.y += dy * m;
      ent.moving = true; ent.leaning = true; ent.dir = want; ent.facing = want;
      return;
    }
    // Free: run to the next tile's centre (or as far as dist allows).
    const toNext = 1 - Math.abs(along);
    const m = Math.min(dist, toNext);
    if (horizontal) ent.x += dx * m; else ent.y += dy * m;
    dist -= m; ent.moving = true; ent.dir = want; ent.facing = want;
    if (m >= toNext - 1e-9) {
      if (horizontal) ent.x = centre(ent.x); else ent.y = centre(ent.y);
      ent.atNode = true;
      // AI entities decide at every tile centre, so stop here and let the
      // next frame's plan spend the (sub-frame) leftover distance.
      if (ent.decideAtCentre) return;
    }
  }
}

function playerSpeed(p) { return RULES.baseSpeed + p.speedItems * RULES.speedStep; }

// Choose which held direction to use: the most recent that can make progress.
function pickDirection(state, p, held) {
  for (const d of held) {
    if (!DIRS[d]) continue;
    const probe = { ...p, decideAtCentre: false };
    moveEntity(state, probe, d, 1, 0.05);
    if (probe.moving && !probe.leaning) return d;
  }
  return held.find(d => DIRS[d]) || null;
}

// ---------------------------------------------------------------- bombs
export function placeBomb(state, p) {
  if (!p.alive || state.status !== 'playing') return false;
  const x = tileOf(p.x), y = tileOf(p.y);
  if (bombAt(state, x, y)) return false;
  if (state.grid[key(x, y)] !== FLOOR) return false;
  const mine = state.bombs.filter(b => b.owner === p.id && !b.exploded).length;
  if (mine >= p.maxBombs) return false;
  state.bombs.push({ x, y, owner: p.id, range: p.range, at: state.time, fuse: RULES.bombFuse, exploded: false });
  state.events.push({ type: 'bomb', x, y, owner: p.id });
  return true;
}

// Cells a bomb would cover: rays stop at walls and on the first brick.
function localBlastCells(state, x, y, range) {
  const cells = [[x, y, 'centre']];
  for (const d of DIR_NAMES) {
    const [dx, dy] = DIRS[d];
    for (let i = 1; i <= range; i++) {
      const tx = x + dx * i, ty = y + dy * i;
      const t = tileAt(state, tx, ty);
      if (t === WALL || barrierAt(state,tx,ty)) break;
      cells.push([tx, ty, i === range || tileAt(state, tx + dx, ty + dy) === WALL ? 'end' : 'ray', d]);
      if (t === BRICK || state.features.get(key(tx,ty))?.type === 'gate') break;
    }
  }
  return cells;
}

// Share the same footprint with damage, chain reactions, and CPU danger prediction.
// Only a bomb placed on a vent uses the network; a passing ray is a normal blast.
export function blastCells(state, x, y, range) {
  const vents = state.shafts.filter(s => tileAt(state,s.x,s.y) === FLOOR);
  if (!vents.some(s => s.x === x && s.y === y)) return localBlastCells(state,x,y,range);
  const cells = new Map();
  for (const vent of vents) for (const cell of localBlastCells(state,vent.x,vent.y,1)) {
    const k = key(cell[0],cell[1]);
    if (!cells.has(k) || cell[2] === 'centre') cells.set(k,cell);
  }
  return [...cells.values()];
}

function explode(state, bomb) {
  if (bomb.exploded) return;
  bomb.exploded = true;
  if (bomb.effect) {
    const cells = spellBlastCells(state,bomb);
    applyWave(state,cells,bomb.effect,bomb.owner);
    return;
  }
  const cells = blastCells(state, bomb.x, bomb.y, bomb.range);
  const owner = state.players[bomb.owner];
  const until = state.time + RULES.fireTime;
  const blast = { x: bomb.x, y: bomb.y, cells, at: state.time, owner: bomb.owner };
  state.events.push({ type: 'explode', ...blast });
  for (const [cx, cy] of cells) {
    const k = key(cx, cy);
    flipGate(state,cx,cy);
    if (state.grid[k] === BRICK) {
      state.grid[k] = FLOOR;
      state.events.push({ type: 'brick', x: cx, y: cy });
      if (owner && state.mode === 'adventure') addScore(state, RULES.brickScore);
      const it = state.items.get(k);
      if (it) it.hidden = false;
      if (state.door && state.door.x === cx && state.door.y === cy) {
        // The exit stays hidden until the last creature is defeated.
        state.events.push({ type: 'door', x: cx, y: cy });
      }
      continue;                       // bricks shield what's behind them
    }
    state.fires.set(k, Math.max(state.fires.get(k) || 0, until));
    const other = bombAt(state, cx, cy);
    if (other && other !== bomb) explode(state, other);   // chain reaction
  }
}

function addScore(state, n) {
  state.score += n;
  const at = RULES.extraLifeAt[state.extraLifeIdx];
  if (at != null && state.score >= at) {
    state.extraLifeIdx++; state.lives++;state.players.forEach(p=>p.lives++);
    state.events.push({ type: 'extraLife' });
  }
}

// ---------------------------------------------------------------- mine machinery and spell effects
function barrierAt(state,x,y) {
  const f=state.features.get(key(x,y));
  return f?.type==='barrier'&&featureActive(state,f);
}
function lethalFeature(state,x,y) {
  const f=state.features.get(key(x,y));
  return f?.type==='spikes'&&featureActive(state,f);
}
const gateEdges=[['up','right'],['right','down'],['down','left'],['left','up']];
function featureBlocks(state,x,y,nx,ny) {
  const dir=nx>x?'right':nx<x?'left':ny>y?'down':'up';
  if(barrierAt(state,nx,ny))return true;
  for(const [tx,ty,edge] of [[x,y,dir],[nx,ny,OPPOSITE[dir]]]) {
    const f=state.features.get(key(tx,ty));
    if(f?.type==='oneway'&&dir!==f.dir)return true;
    if(f?.type==='gate'&&!gateEdges[f.turn||0].includes(edge))return true;
  }
  return false;
}
function flipGate(state,x,y) {
  const f=state.features.get(key(x,y));
  if(f?.type!=='gate')return false;
  f.turn=((f.turn||0)+1)%4;
  state.events.push({type:'gate',x,y});
  return true;
}
function installFeatures(state) {
  if(state.level<6)return;
  const types=['spikes','barrier','conveyor','oneway','gate'];
  const count=Math.min(state.level-5,5);
  const cells=[];
  for(let y=1;y<H-1;y++)for(let x=1;x<W-1;x++) {
    if(state.enemies.some(e=>tileOf(e.x)===x&&tileOf(e.y)===y)||state.players.some(p=>Math.abs(p.spawn.x-x)+Math.abs(p.spawn.y-y)<3)||x+y<7||tileAt(state,x,y)===WALL||state.items.has(key(x,y))||state.shafts.some(v=>v.x===x&&v.y===y)||state.door.x===x&&state.door.y===y)continue;
    // Junctions have alternate routes after rock is cleared. Never put a
    // one-way device in a dead end or block the starting escape corridor.
    if(DIR_NAMES.filter(d=>tileAt(state,x+DIRS[d][0],y+DIRS[d][1])!==WALL).length<2)continue;
    cells.push([x,y]);
  }
  for(let i=0;i<count&&cells.length;i++) {
    if(types[i]!=='spikes' && cells.every(([x,y])=>DIR_NAMES.filter(d=>tileAt(state,x+DIRS[d][0],y+DIRS[d][1])!==WALL).length<3))continue;
    const junctions=cells.filter(([x,y])=>DIR_NAMES.filter(d=>tileAt(state,x+DIRS[d][0],y+DIRS[d][1])!==WALL).length>=3);
    const mounted=types[i]==='spikes'?cells.filter(([x,y])=>DIR_NAMES.some(d=>tileAt(state,x+DIRS[d][0],y+DIRS[d][1])===WALL)):[];
    const chosen=mounted.length?mounted[Math.floor(state.rng()*mounted.length)]:junctions[Math.floor(state.rng()*junctions.length)]||cells[0];
    const [x,y]=cells.splice(cells.indexOf(chosen),1)[0];
    const dir=DIR_NAMES.find(d=>tileAt(state,x+DIRS[d][0],y+DIRS[d][1])===FLOOR)||'right';
    state.grid[key(x,y)]=FLOOR;
    state.features.set(key(x,y),{type:types[i],dir,turn:0,phase:i*.65,relocates:types[i]==='barrier',cycle:Math.floor((state.time+i*.65)/4)});
  }
  const taught=types[Math.min(state.level-6,4)];
  state.lesson={name:state.level<=10?['Spike Gallery','Power Grid','Moving Floor','One-way Mine','Flip-door Works'][state.level-6]:'Depth '+state.level,hint:FEATURE_HINTS[taught]};
}
function pushBomb(state,b,dir) {
  const [dx,dy]=DIRS[dir],x=b.x+dx,y=b.y+dy;
  if(tileAt(state,x,y)!==FLOOR||bombAt(state,x,y)||featureBlocks(state,b.x,b.y,x,y))return false;
  b.x=x;b.y=y;return true;
}
function pushEntity(state,e,dir,speed,dt) {
  const facing=e.facing,heading=e.dir;
  moveEntity(state,e,dir,speed,dt);
  e.facing=facing;e.dir=heading;
}
function tickFeatures(state,dt) {
  for(const [k,f] of [...state.features])if(f.relocates) {
    const cycle=Math.floor((state.time+(f.phase||0))/4);
    if(cycle!==f.cycle) {
      f.cycle=cycle;
      const spots=[];
      for(let y=1;y<H-1;y++)for(let x=1;x<W-1;x++) {
        const n=key(x,y);
        if(tileAt(state,x,y)!==FLOOR||state.features.has(n)||state.items.has(n)||bombAt(state,x,y)||state.shafts.some(v=>v.x===x&&v.y===y)||state.door?.x===x&&state.door?.y===y)continue;
        if([...state.players,...state.enemies].some(e=>e.alive&&Math.abs(e.x-x-.5)+Math.abs(e.y-y-.5)<2))continue;
        spots.push(n);
      }
      if(spots.length){state.features.delete(k);state.features.set(spots[Math.floor(state.rng()*spots.length)],f);}
    }
  }
  for(const e of [...state.players,...state.enemies]) {
    if(!e.alive)continue;
    const f=state.features.get(key(tileOf(e.x),tileOf(e.y)));
    if(f?.type==='conveyor')pushEntity(state,e,f.dir,1.8,dt);
  }
  for(const b of state.bombs) {
    const f=state.features.get(key(b.x,b.y));
    if(f?.type==='conveyor'&&state.time>=(b.carriedAt||0)+.55) {
      pushBomb(state,b,f.dir);b.carriedAt=state.time;
    }
  }
}
function teleportEntity(state,e) {
  const spots=[];
  for(let y=1;y<H-1;y++)for(let x=1;x<W-1;x++) {
    if(tileAt(state,x,y)!==FLOOR||bombAt(state,x,y)||fireAt(state,x,y)||barrierAt(state,x,y)||lethalFeature(state,x,y))continue;
    if(tileOf(e.x)===x&&tileOf(e.y)===y)continue;
    if([...state.players,...state.enemies].some(o=>o!==e&&o.alive&&Math.abs(o.x-x-.5)<.9&&Math.abs(o.y-y-.5)<.9))continue;
    spots.push([x,y]);
  }
  if(!spots.length)return;
  const from={x:e.x,y:e.y},[x,y]=spots[Math.floor(state.rng()*spots.length)];
  e.x=x+.5;e.y=y+.5;e.atNode=true;e.ai=null;e.moving=false;
  state.effects.push({effect:'teleport',cells:[[tileOf(from.x),tileOf(from.y)],[x,y]],until:state.time+.5});
}
function affectEntity(state,e,effect) {
  if(e.id!=null&&state.time<e.invulnUntil)return;
  if(effect==='electric')e.stunnedUntil=state.time+RULES.stunDuration;
  else if(effect==='teleport')teleportEntity(state,e);
  else state.projectileHits.add(e);
}
function spellBlastCells(state,bomb) {
  if(state.shafts.some(v=>v.x===bomb.x&&v.y===bomb.y))return blastCells(state,bomb.x,bomb.y,1).filter(([x,y])=>tileAt(state,x,y)===FLOOR);
  return spellCells(state,bomb.x,bomb.y,bomb.effect==='electric'?Math.max(W,H):bomb.range);
}
function spellCells(state,x,y,range) {
  return localBlastCells(state,x,y,range).filter(([cx,cy])=>tileAt(state,cx,cy)===FLOOR);
}
function applyWave(state,cells,effect,owner) {
  state.effects.push({effect,cells,until:state.time+.45});
  for(const [x,y] of cells)flipGate(state,x,y);
  const targets=[...state.enemies,...state.players];
  for(const e of targets)if(e.alive&&cells.some(([x,y])=>tileOf(e.x)===x&&tileOf(e.y)===y))affectEntity(state,e,effect);
}
function windWave(state,p,dir) {
  const [dx,dy]=DIRS[dir],cells=[];
  for(let i=1;i<=p.range;i++) {
    const x=tileOf(p.x)+dx*i,y=tileOf(p.y)+dy*i;
    if(tileAt(state,x,y)!==FLOOR||barrierAt(state,x,y))break;
    cells.push([x,y]);
    if(flipGate(state,x,y))break;
  }
  // Push farthest first so a line of bombs can move without overlapping.
  const hit=e=>cells.some(([x,y])=>tileOf(e.x)===x&&tileOf(e.y)===y);
  for(const b of [...state.bombs].sort((a,b)=>(b.x-a.x)*dx+(b.y-a.y)*dy))if(cells.some(([x,y])=>b.x===x&&b.y===y))pushBomb(state,b,dir);
  for(const e of [...state.enemies,...state.players])if(e.alive&&e!==p&&hit(e))pushEntity(state,e,dir,1,1);
  for(const shot of state.projectiles)if(hit(shot)) {shot.dx=dx;shot.dy=dy;shot.owner=p.id;}
  state.effects.push({effect:'wind',cells,dir,until:state.time+.25});
}

// ---------------------------------------------------------------- temporary powers
export function usePower(state,p,backward=false) {
  if (!p.alive || state.status !== 'playing' || !p.power || state.time >= p.powerUntil || state.time < p.powerReady) return false;
  if (p.power === ITEM.IGNITOR) {
    const bomb = state.bombs.find(b => b.owner === p.id && !b.exploded);
    if (!bomb) return false;
    explode(state,bomb); // Includes connected shafts and ordinary chain reactions.
    p.powerReady = state.time + .2;
  } else if (JARS[p.power]) {
    const jar=JARS[p.power];
    const direction=backward ? OPPOSITE[p.facing] : p.facing;
    const directions=jar.form==='stone' ? DIR_NAMES : [direction || 'down'];
    if(jar.bomb) {
      if(!placeBomb(state,p)) return false;
      state.bombs[state.bombs.length-1].effect=jar.effect;
    } else if(jar.effect==='wind') {
      for(const dir of directions) windWave(state,p,dir);
    } else for(const dir of directions) {
      const [dx,dy]=DIRS[dir];
      state.projectiles.push({x:p.x,y:p.y,dx,dy,owner:p.id,life:1.6,effect:jar.effect});
    }
    p.powerReady = state.time + RULES.fireballCooldown;
  } else return false;
  p.movedSinceSpawn = true;
  state.events.push({type:'power',power:p.power,player:p.id,x:p.x,y:p.y});
  return true;
}

function tickProjectiles(state,dt) {
  for (const shot of state.projectiles) {
    shot.life -= dt;
    const distance = RULES.projectileSpeed * dt;
    const samples = Math.max(1,Math.ceil(distance/.08));
    for(let i=0;i<samples && shot.life>0;i++) {
      shot.x += shot.dx * distance/samples; shot.y += shot.dy * distance/samples;
      const x=tileOf(shot.x),y=tileOf(shot.y);
      if(tileAt(state,x,y)!==FLOOR || barrierAt(state,x,y)) { shot.life=0; break; }
      if(flipGate(state,x,y)) {shot.life=0;break;}
      const bomb=bombAt(state,x,y);
      if(bomb) {if(!shot.effect||shot.effect==='fire')explode(state,bomb);shot.life=0;break;}
      const target=[...state.enemies,...state.players.filter(p=>p.id!==shot.owner)]
        .find(e=>e.alive && !state.projectileHits.has(e) && Math.abs(e.x-shot.x)<.42 && Math.abs(e.y-shot.y)<.42);
      if(target) {affectEntity(state,target,shot.effect||'fire');shot.life=0;break;}
    }
  }
  state.projectiles=state.projectiles.filter(s=>s.life>0);
}

function cpuUsePower(state,p) {
  const foe=state.players.find(o=>o.id!==p.id&&o.alive);
  if(!foe) return;
  if(p.power===ITEM.IGNITOR) {
    const first=state.bombs.find(b=>b.owner===p.id&&!b.exploded);
    if(!first) return;
    const projected=dangerMap(state);
    const ownCell=key(tileOf(p.x),tileOf(p.y));
    const cells=blastCells(state,first.x,first.y,first.range);
    // Only pull the trigger after escaping every current bomb footprint.
    if(projected[ownCell]===Infinity && cells.some(([x,y])=>tileAt(state,x,y)===BRICK || (x===tileOf(foe.x)&&y===tileOf(foe.y)))) usePower(state,p);
  } else if(JARS[p.power]?.form==='glass') {
    const [dx,dy]=DIRS[p.facing];
    // Never shoot down a lane containing a bomb; the resulting blast could
    // undo an otherwise safe escape plan.
    let seesFoe=false;
    for(let i=0;i<Math.max(W,H);i++) {
      const x=tileOf(p.x)+dx*i,y=tileOf(p.y)+dy*i;
      if(tileAt(state,x,y)!==FLOOR) break;
      if(bombAt(state,x,y)) return;
      if(x===tileOf(foe.x)&&y===tileOf(foe.y)) seesFoe=true;
    }
    if(!seesFoe) return;
    if((dx && Math.abs(foe.y-p.y)<.35 && (foe.x-p.x)*dx>0) || (dy && Math.abs(foe.x-p.x)<.35 && (foe.y-p.y)*dy>0)) usePower(state,p);
  }
}

// ---------------------------------------------------------------- danger map (AI)
// Seconds until each tile becomes lethal (Infinity = safe). Chain reactions
// are folded in: a bomb caught in another's blast inherits the shorter fuse.
export function dangerMap(state, extraBomb) {
  const danger = new Float64Array(W * H).fill(Infinity);
  const bombs = state.bombs.filter(b => !b.exploded).map(b => ({ x: b.x, y: b.y, range: b.range, effect:b.effect, t: b.at + b.fuse - state.time }));
  if (extraBomb) bombs.push({ ...extraBomb, t: RULES.bombFuse });
  for(const shot of state.projectiles) {
    const length=shot.life*RULES.projectileSpeed;
    for(let distance=0;distance<=length;distance+=.1) {
      const x=tileOf(shot.x+shot.dx*distance),y=tileOf(shot.y+shot.dy*distance),k=key(x,y);
      if(tileAt(state,x,y)!==FLOOR||barrierAt(state,x,y)) break;
      const arrival=distance/RULES.projectileSpeed;
      danger[k]=Math.min(danger[k],arrival);
      const bomb=bombs.find(b=>b.x===x&&b.y===y);
      if(bomb) {if(!shot.effect||shot.effect==='fire')bomb.t=Math.min(bomb.t,arrival);break;}
      if(state.features.get(k)?.type==='gate')break;
    }
  }
  // Relax fuses through chains.
  let changed = true;
  while (changed) {
    changed = false;
    for (const b of bombs) {
      for (const [cx, cy] of (b.effect?spellBlastCells(state,b):blastCells(state, b.x, b.y, b.range))) {
        const o = bombs.find(q => q.x === cx && q.y === cy);
        if (!b.effect && o && o.t > b.t) { o.t = b.t; changed = true; }
      }
    }
  }
  for (const b of bombs) {
    for (const [cx, cy] of (b.effect?spellBlastCells(state,b):blastCells(state, b.x, b.y, b.range))) {
      const k = key(cx, cy);
      if (state.grid[k] === BRICK) continue;
      danger[k] = Math.min(danger[k], Math.max(0, b.t));
    }
  }
  for (const [k, until] of state.fires) if (until > state.time) danger[k] = 0;
  for(const [k,f] of state.features) if(f.type==='spikes') {const phase=(state.time+(f.phase||0))%4;danger[k]=Math.min(danger[k],phase>=2?0:2-phase);}
  return danger;
}

// BFS over walkable tiles. `ok(x, y, steps)` filters entry; returns
// { dist: Int16Array, prev: Int16Array } from the start tile.
function bfs(state, sx, sy, ent, ok) {
  const dist = new Int16Array(W * H).fill(-1);
  const prev = new Int16Array(W * H).fill(-1);
  const q = [key(sx, sy)];
  dist[q[0]] = 0;
  for (let i = 0; i < q.length; i++) {
    const k = q[i], x = k % W, y = (k - x) / W;
    for (const d of DIR_NAMES) {
      const nx = x + DIRS[d][0], ny = y + DIRS[d][1], nk = key(nx, ny);
      if (dist[nk] !== -1) continue;
      if (tileAt(state, nx, ny) !== FLOOR) continue;
      const b = bombAt(state, nx, ny);
      if (b && !ent.bombPass) continue;
      if (featureBlocks(state,x,y,nx,ny)) continue;
      if (ok && !ok(nx, ny, dist[k] + 1)) continue;
      dist[nk] = dist[k] + 1; prev[nk] = k; q.push(nk);
    }
  }
  return { dist, prev };
}

function firstStep(prev, from, to) {
  let k = to;
  while (prev[k] !== -1 && prev[k] !== from) k = prev[k];
  if (prev[k] !== from) return null;
  const fx = from % W, fy = (from - fx) / W, x = k % W, y = (k - x) / W;
  if (x > fx) return 'right'; if (x < fx) return 'left'; if (y > fy) return 'down'; return 'up';
}

// The computer miner. Decides at tile centres only; between centres it
// keeps its current plan so motion stays committed and readable.
function cpuThink(state, p) {
  const px = tileOf(p.x), py = tileOf(p.y), here = key(px, py);
  const speed = playerSpeed(p);
  const stepTime = 1 / speed;
  const danger = dangerMap(state);
  const safeEntry = (x, y, steps) => danger[key(x, y)] > steps * stepTime + 0.35;
  const foe = state.players.find(o => o !== p && o.alive);
  const plan = { dir: null, bomb: false };

  // 1. Standing in danger: run to the nearest tile that is safe in time.
  if (danger[here] < Infinity) {
    const { dist, prev } = bfs(state, px, py, p, safeEntry);
    let best = -1, bestD = 1e9;
    for (let k = 0; k < W * H; k++) {
      if (dist[k] < 0 || danger[k] < Infinity) continue;
      if (dist[k] < bestD) { bestD = dist[k]; best = k; }
    }
    if (best === -1) {
      // No fully safe tile in reach — take the tile with the longest fuse.
      for (let k = 0; k < W * H; k++) {
        if (dist[k] < 0) continue;
        const margin = danger[k] - dist[k] * stepTime;
        if (best === -1 || margin > bestD) { bestD = margin; best = k; }
      }
    }
    if (best !== -1 && best !== here) plan.dir = firstStep(prev, here, best);
    return plan;
  }

  // 2. Consider dropping a bomb here: worth it if it hits the foe or a brick,
  //    and we can still reach a safe tile afterwards.
  const cells = blastCells(state, px, py, p.range);
  let hitsFoe = false, hitsBrick = 0;
  for (const [cx, cy] of cells) {
    if (state.grid[key(cx, cy)] === BRICK) hitsBrick++;
    if (foe && tileOf(foe.x) === cx && tileOf(foe.y) === cy) hitsFoe = true;
  }
  const mine = state.bombs.filter(b => b.owner === p.id && !b.exploded).length;
  const canBomb = !state.projectiles.some(s=>s.owner===p.id) && mine === 0 && !bombAt(state, px, py) && p.bombCooldown <= 0;
  if (canBomb && (hitsFoe || (hitsBrick && state.rng() < 0.85))) {
    const after = dangerMap(state, { x: px, y: py, range: p.range });
    const okAfter = (x, y, steps) => after[key(x, y)] > steps * stepTime + 0.35 && !(x === px && y === py);
    const { dist } = bfs(state, px, py, p, okAfter);
    let escape = false;
    for (let k = 0; k < W * H && !escape; k++) if (dist[k] > 0 && after[k] === Infinity) escape = true;
    if (escape) { plan.bomb = true; return plan; }
  }

  // 3. Otherwise walk somewhere useful: an item, then the foe, then a brick.
  const { dist, prev } = bfs(state, px, py, p, safeEntry);
  let target = -1, bestD = 1e9;
  for (const [k, it] of state.items) {
    if (it.hidden || dist[k] < 0 || danger[k] < Infinity) continue;
    if (dist[k] < bestD) { bestD = dist[k]; target = k; }
  }
  if (target === -1 && foe) {
    const fk = key(tileOf(foe.x), tileOf(foe.y));
    if (dist[fk] > 0) {
      // Stop one tile short in line with the foe rather than hugging them.
      target = fk; bestD = dist[fk];
    }
  }
  if (target === -1) {
    for (let k = 0; k < W * H; k++) {
      if (dist[k] <= 0 || danger[k] < Infinity) continue;
      const x = k % W, y = (k - x) / W;
      const nearBrick = DIR_NAMES.some(d => tileAt(state, x + DIRS[d][0], y + DIRS[d][1]) === BRICK);
      if (nearBrick && dist[k] < bestD) { bestD = dist[k]; target = k; }
    }
  }
  if (target !== -1) plan.dir = firstStep(prev, here, target);
  else {
    // Nothing reachable: wander to any safe neighbour.
    const opts = DIR_NAMES.filter(d => {
      const nx = px + DIRS[d][0], ny = py + DIRS[d][1];
      return tileAt(state, nx, ny) === FLOOR && !bombAt(state, nx, ny) && danger[key(nx, ny)] === Infinity;
    });
    if (opts.length) plan.dir = opts[Math.floor(state.rng() * opts.length)];
  }
  return plan;
}

export function atCentre(e) {
  return Math.abs(e.x - centre(e.x)) < 1e-6 && Math.abs(e.y - centre(e.y)) < 1e-6;
}

// ---------------------------------------------------------------- enemies
function enemyThink(state, e, danger = null) {
  const spec = ENEMY[e.type];
  const ex = tileOf(e.x), ey = tileOf(e.y);
  let open = DIR_NAMES.filter(d => {
    const nx = ex + DIRS[d][0], ny = ey + DIRS[d][1];
    return !blockedFor(state,e,nx,ny) && !fireAt(state, nx, ny);
  });
  if (!open.length) return null;
  const here = key(ex,ey);
  if(danger) {
    const arrival = 1 / Math.max(e.speed,.1);
    const safeStep = (x,y,steps) => danger[key(x,y)] > steps * arrival + .18;
    // Veteran enemies escape the complete predicted blast, including linked
    // shafts and fireball-triggered chains, instead of just avoiding live fire.
    if(danger[here] < Infinity) {
      const {dist,prev}=bfs(state,ex,ey,e,safeStep);
      let safest=-1;
      for(let k=0;k<W*H;k++) if(dist[k]>0&&danger[k]===Infinity&&(safest<0||dist[k]<dist[safest])) safest=k;
      if(safest>=0) return firstStep(prev,here,safest);
    }
    const safe=open.filter(d=>safeStep(ex+DIRS[d][0],ey+DIRS[d][1],1));
    if(safe.length) open=safe;
    else if(danger[here]===Infinity) return null; // Wait instead of entering a blast.
    else return open.reduce((best,d)=>danger[key(ex+DIRS[d][0],ey+DIRS[d][1])]>danger[key(ex+DIRS[best][0],ey+DIRS[best][1])]?d:best);
  }
  const target = state.players.filter(p=>p.alive).sort((a,b)=>Math.abs(a.x-e.x)+Math.abs(a.y-e.y)-Math.abs(b.x-e.x)-Math.abs(b.y-e.y))[0] || null;
  const forward = open.filter(d => d !== OPPOSITE[e.dir]);
  const pick = arr => arr[Math.floor(state.rng() * arr.length)];

  if ((spec.style === 'chaser' || state.level >= 8) && target) {
    let tx=tileOf(target.x),ty=tileOf(target.y);
    // At deep levels, half the enemies aim a tile ahead of a moving miner.
    if(state.level>=10 && target.moving && (ex+ey)%2===0) {
      const [dx,dy]=DIRS[target.facing] || [0,0];
      if(tileAt(state,tx+dx,ty+dy)===FLOOR&&!bombAt(state,tx+dx,ty+dy)){tx+=dx;ty+=dy;}
    }
    const route = bfs(state,ex,ey,e,(x,y,steps)=>!fireAt(state,x,y)&&(!danger||danger[key(x,y)]>steps/Math.max(e.speed,.1)+.18));
    let destination=key(tx,ty);
    if(route.dist[destination]<0) destination=key(tileOf(target.x),tileOf(target.y));
    if(route.dist[destination]>0){const d=firstStep(route.prev,here,destination);if(d&&open.includes(d))return d;}
  }
  if ((spec.style === 'hunter' || state.level >= 3) && target && state.rng() < (state.level >= 3 ? .9 : .8)) {
    // Line of sight along a row or column → give chase.
    const tx = tileOf(target.x), ty = tileOf(target.y);
    for (const d of open) {
      const [dx, dy] = DIRS[d];
      let x = ex + dx, y = ey + dy, seen = false;
      while (tileAt(state, x, y) === FLOOR && !bombAt(state, x, y)) {
        if (x === tx && y === ty) { seen = true; break; }
        x += dx; y += dy;
      }
      if (seen) return d;
    }
  }
  if (spec.style === 'erratic') {
    if (state.rng() < 0.25) return pick(open);
    if (open.includes(e.dir) && state.rng() < 0.5) return e.dir;
    return pick(forward.length ? forward : open);
  }
  // Wander: keep going when possible, turn at junctions sometimes, never
  // reverse unless it is the only way.
  if (open.includes(e.dir) && forward.length > 1 && state.rng() < 0.6) return e.dir;
  if (open.includes(e.dir) && forward.length === 1) return e.dir;
  return pick(forward.length ? forward : open);
}

// ---------------------------------------------------------------- step
// inputs: array indexed by player id, each { held: ['up','left',...] most
// recent first, bomb: true when the bomb key was pressed this frame }.
export function step(state, dt, inputs = []) {
  dt = Math.min(dt, 0.05);
  state.time += dt;
  for (const p of state.players) p.bombCooldown = Math.max(0, p.bombCooldown - dt);

  if (state.status === 'intro' || state.status === 'cleared' || state.status === 'roundEnd') {
    if (state.time >= state.statusUntil) {
      if (state.status === 'intro') { state.status = 'playing'; state.events.push({ type: 'go' }); }
      else if (state.status === 'cleared') startLevel(state, state.level + 1);
      else if (state.status === 'roundEnd') {
        const champ = state.players.find(p => p.wins >= RULES.battleWinsNeeded);
        if (champ) { state.status = 'over'; state.events.push({ type: 'matchOver', winner: champ.id }); }
        else startRound(state);
      }
    }
    // Bombs and fires keep ticking so a level-clear still lets blasts finish.
    tickBombs(state, dt);
    return state;
  }
  if (state.status === 'over') return state;

  state.projectileHits.clear();
  state.elapsed += dt;
  state.effects = state.effects.filter(e=>e.until>state.time);
  if(state.mode==='battle') state.timer = Math.max(0, state.timer - dt);
  if (state.mode === 'battle') tickSuddenDeath(state, dt);

  // Players
  for (const p of state.players) {
    if (!p.alive) {
      if (state.mode === 'adventure' && state.time >= p.deadAt + RULES.respawnDelay) {
        if ((state.players.length===1?state.lives:p.lives) > 0) {
          resetPlayer(p, true); p.shield = false;
          p.invulnUntil = state.time + RULES.invulnTime;
          p.graceUntil = state.time + RULES.spawnGrace;
          state.events.push({ type: 'respawn' });
        }
      }
      continue;
    }
    let held = [], bomb = false, power = false, backward = false;
    if (p.cpu) {
      if (p.atNode || !p.ai || !p.ai.dir || !p.moving) p.ai = cpuThink(state, p);
      held = p.ai.dir ? [p.ai.dir] : [];
      bomb = p.ai.bomb;
      if (bomb) p.ai = { dir: null, bomb: false };
    } else {
      const inp = inputs[p.id] || {};
      held = inp.held || [];
      bomb = !!inp.bomb; power = !!inp.power; backward=!!inp.bombHeld;
    }
    if(state.time < (p.stunnedUntil||0)) {p.moving=false;continue;}
    if (bomb && !power) { if (placeBomb(state, p)) p.bombCooldown = 0.25; }
    const want = held.length ? pickDirection(state, p, held) : null;
    if (want || bomb) p.movedSinceSpawn = true;
    moveEntity(state, p, want, playerSpeed(p), dt);
    if (p.moving) p.walkPhase += dt * playerSpeed(p) * 2.2;
    if(p.cpu) cpuUsePower(state,p); else if(power) usePower(state,p,backward);
    // Pick up items
    const k = key(tileOf(p.x), tileOf(p.y));
    const it = state.items.get(k);
    if (it && !it.hidden) {
      state.items.delete(k);
      applyItem(state, p, it.type);
      state.events.push({ type: 'item', item: it.type, x: k % W, y: Math.floor(k / W), player: p.id });
    }
    // Entering any part of an open exit completes the level. Exact centre
    // checks miss crossings at fractional movement speeds and frame steps.
    if (state.door && state.door.open && tileOf(p.x) === state.door.x && tileOf(p.y) === state.door.y) {
      const bonus = RULES.levelBonus;
      addScore(state, bonus);
      state.status = 'cleared'; state.statusUntil = state.time + 2.4;
      state.events.push({ type: 'levelClear', level: state.level, bonus });
      return state;
    }
  }

  // Share hazard prediction between enemies that reconsider during this step.
  let enemyDanger = null;
  const cautious = state.level >= 5 && (state.bombs.length || state.projectiles.length || state.fires.size || state.features.size);
  // Enemies
  for (const e of state.enemies) {
    if (!e.alive) continue;
    if(state.time < (e.stunnedUntil||0)) {e.moving=false;continue;}
    if (e.atNode || !e.moving || (cautious && state.time >= (e.rethinkAt || 0))) {
      if(cautious && !enemyDanger) enemyDanger = dangerMap(state);
      e.dir = enemyThink(state,e,enemyDanger);
      e.rethinkAt = state.time + Math.max(.12,.35-(state.level-5)*.035);
    }
    moveEntity(state, e, e.dir, e.speed, dt);
    e.walkPhase += dt * 3;
  }

  tickFeatures(state,dt);
  tickProjectiles(state,dt);
  tickBombs(state, dt);
  resolveHits(state);
  return state;
}

function tickBombs(state, dt) {
  for (const b of state.bombs) {
    if (!b.exploded && state.time >= b.at + b.fuse) explode(state, b);
  }
  state.bombs = state.bombs.filter(b => !b.exploded);
  for (const [k, until] of state.fires) if (until <= state.time) state.fires.delete(k);
  // Door opens once every enemy is gone.
  if (state.door && !state.door.open && state.enemies.every(e => !e.alive)) {
    state.door.revealed = true;
    state.door.open = true;
    state.door.openedAt = state.time;
    state.events.push({ type: 'doorOpen' });
  }
}

function resolveHits(state) {
  // Enemies in fire
  for (const e of state.enemies) {
    if (!e.alive) continue;
    if (fireAt(state, tileOf(e.x), tileOf(e.y)) || lethalFeature(state,tileOf(e.x),tileOf(e.y)) || state.projectileHits.has(e)) {
      e.alive = false; e.deadAt = state.time;
      addScore(state, ENEMY[e.type].score);
      state.events.push({ type: 'kill', enemy: e.type, x: e.x, y: e.y, score: ENEMY[e.type].score });
    }
  }
  if (state.door && !state.door.open && state.enemies.every(e => !e.alive)) {
    state.door.revealed = true;
    state.door.open = true;
    state.door.openedAt = state.time;
    state.events.push({ type: 'doorOpen' });
  }
  // Players in fire, touched by enemies, or crushed by the closing walls
  for (const p of state.players) {
    if (!p.alive) continue;
    const px = tileOf(p.x), py = tileOf(p.y);
    let hit = null;
    if (fireAt(state, px, py)) hit = 'fire';
    if(lethalFeature(state,px,py)) hit='spikes';
    if (state.projectileHits.has(p)) hit = 'fireball';
    if (!hit && state.grid[key(px, py)] === WALL) hit = 'crushed';
    if (!hit) {
      for (const e of state.enemies) {
        if (!e.alive) continue;
        if (Math.abs(e.x - p.x) < 0.6 && Math.abs(e.y - p.y) < 0.6) { hit = e.type; break; }
      }
    }
    if (!hit) continue;
    if (state.time < p.invulnUntil && hit !== 'crushed') continue;
    // Spawn camping guard: a respawned miner who hasn't moved yet can't be
    // picked off by a critter parked on the corner.
    if (!p.movedSinceSpawn && state.time < p.graceUntil && hit !== 'crushed' && hit !== 'fire') continue;
    if (p.shield && hit !== 'crushed') {
      p.shield = false; p.invulnUntil = state.time + 1.2;
      state.events.push({ type: 'shieldPop', player: p.id });
      continue;
    }
    p.alive = false; p.deadAt = state.time; p.moving = false;
    state.events.push({ type: 'death', player: p.id, cause: hit, x: p.x, y: p.y });
    if (state.mode === 'adventure') {
      if(state.players.length===1)p.lives=state.lives;
      p.lives -= 1;state.lives=state.players[0].lives;
      if (state.players.every(player=>player.lives<=0)) {
        state.status = 'over';
        state.events.push({ type: 'gameOver', score: state.score, level: state.level });
      }
    }
  }
  if (state.mode === 'battle' && state.status === 'playing') {
    const alive = state.players.filter(p => p.alive);
    if (alive.length <= 1) {
      const winner = alive[0] || null;
      if (winner) winner.wins += 1;
      state.roundWinner = winner ? winner.id : null;
      state.status = 'roundEnd'; state.statusUntil = state.time + 2.6;
      state.events.push({ type: 'roundEnd', winner: state.roundWinner, wins: state.players.map(p => p.wins) });
    }
  }
}

function applyItem(state, p, type) {
  if (type === ITEM.BOMB) p.maxBombs = Math.min(RULES.maxBombs, p.maxBombs + 1);
  else if (type === ITEM.FIRE) p.range = Math.min(RULES.maxRange, p.range + 1);
  else if (type === ITEM.SPEED) p.speedItems = Math.min(RULES.maxSpeedItems, p.speedItems + 1);
  else if (type === ITEM.RADIATION) p.invulnUntil = state.time + RULES.radiationDuration;
  else if(type===ITEM.HEART) {p.lives++;if(p.id===0)state.lives=p.lives;state.events.push({type:'extraLife'});}
  else if(type===ITEM.MAX) {p.maxBombs=RULES.maxBombs;p.range=RULES.maxRange;}
  else if(JARS[type] || type===ITEM.IGNITOR) {p.power=type;p.powerUntil=state.time+RULES.powerDuration;p.powerReady=state.time;}
  if (state.mode === 'adventure') addScore(state, RULES.itemScore);
}

// Battle sudden death: with 45 s left, walls drop in a spiral from the
// outside in, one every 0.45 s, until only the centre cross remains.
function spiralOrder() {
  const cells = [];
  let x0 = 1, y0 = 1, x1 = W - 2, y1 = H - 2;
  while (x0 <= x1 && y0 <= y1) {
    for (let x = x0; x <= x1; x++) cells.push([x, y0]);
    for (let y = y0 + 1; y <= y1; y++) cells.push([x1, y]);
    for (let x = x1 - 1; x >= x0; x--) cells.push([x, y1]);
    for (let y = y1 - 1; y > y0; y--) cells.push([x0, y]);
    x0++; y0++; x1--; y1--;
  }
  return cells.filter(([x, y]) => !(x === Math.floor(W / 2) && y === Math.floor(H / 2)));
}
const SPIRAL = spiralOrder();

function tickSuddenDeath(state, dt) {
  if (state.timer > RULES.suddenDeathAt) return;
  if (!state.suddenDeath) {
    state.suddenDeath = { next: 0, clock: 0, warn: null };
    state.events.push({ type: 'suddenDeath' });
  }
  const sd = state.suddenDeath;
  sd.clock += dt;
  sd.warn = sd.next < SPIRAL.length ? SPIRAL[sd.next] : null;
  while (sd.clock >= RULES.suddenDeathStep && sd.next < SPIRAL.length) {
    sd.clock -= RULES.suddenDeathStep;
    const [x, y] = SPIRAL[sd.next++];
    const k = key(x, y);
    state.grid[k] = WALL;
    state.items.delete(k);
    state.fires.delete(k);
    for (const b of state.bombs) if (b.x === x && b.y === y && !b.exploded) explode(state, b);
    for (const e of state.enemies) if (e.alive && tileOf(e.x) === x && tileOf(e.y) === y) { e.alive = false; e.deadAt = state.time; }
    state.events.push({ type: 'wallDrop', x, y });
    sd.warn = sd.next < SPIRAL.length ? SPIRAL[sd.next] : null;
  }
}

// ---------------------------------------------------------------- queries for the renderer
// Events accumulate until the driver drains them (after each step).
export function drainEvents(state) {
  const ev = state.events.slice();
  state.events.length = 0;
  return ev;
}
export function summary(state) {
  return {
    mode: state.mode, status: state.status, level: state.level, score: state.score,
    lives: state.lives, timer: state.timer, round: state.round,
    wins: state.players.map(p => p.wins), roundWinner: state.roundWinner,
    enemiesLeft: state.enemies.filter(e => e.alive).length,
  };
}
