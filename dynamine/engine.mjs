// Dynamine — pure game logic. No DOM, no timers, no rendering.
// The page (game.mjs) drives it with step(state, dt, inputs) and draws state;
// tools/dynamine-test.mjs drives it headlessly. Keep it that way.

export const FLOOR = 0, WALL = 1, BRICK = 2;
export const W = 13, H = 11;

export const DIRS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
const DIR_NAMES = ['up', 'down', 'left', 'right'];
const OPPOSITE = { up: 'down', down: 'up', left: 'right', right: 'left' };

export const ITEM = { BOMB: 'bomb', FIRE: 'fire', SPEED: 'speed', SHIELD: 'shield' };
// bat: flutters about. knocker: mine goblin, chases on sight. spider: fast and
// erratic. spark: ignited gas that hunts you down once the clock runs out.
export const ENEMY = {
  bat:     { speed: 1.6, score: 100, style: 'wander' },
  knocker: { speed: 2.4, score: 200, style: 'hunter' },
  spider:  { speed: 3.4, score: 400, style: 'erratic' },
  spark:   { speed: 4.2, score: 500, style: 'chaser' },
};

export const RULES = {
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
    id, x: corner.x + 0.5, y: corner.y + 0.5, spawn: { ...corner },
    dir: 'down', moving: false, facing: 'down',
    speedItems: 0, maxBombs: 1, range: 1, shield: false,
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
    grid: null, bombs: [], fires: new Map(), items: new Map(), door: null,
    players: [], enemies: [], particles: [],
    time: 0, timer: 0, level: 0, score: 0, lives: 3, extraLifeIdx: 0,
    status: 'intro', statusUntil: 0, events: [], round: 0, roundWinner: null,
    suddenDeath: null, cpuLevel: opts.cpuLevel || 1,
  };
  if (mode === 'adventure') {
    state.players = [makePlayer(0, CORNERS[0], { name: 'You', color: 'blue' })];
    startLevel(state, 1);
  } else {
    state.players = [
      makePlayer(0, CORNERS[0], { name: opts.p1Name || 'Blue', color: 'blue' }),
      makePlayer(1, CORNERS[1], { name: opts.p2Name || (opts.cpu ? 'The computer' : 'Red'), color: 'red', cpu: !!opts.cpu }),
    ];
    startRound(state);
  }
  return state;
}

function resetPlayer(p, keepPowers) {
  p.x = p.spawn.x + 0.5; p.y = p.spawn.y + 0.5;
  p.dir = 'down'; p.facing = 'down'; p.moving = false;
  p.alive = true; p.deadAt = -1; p.invulnUntil = 0; p.graceUntil = 0; p.movedSinceSpawn = false; p.ai = null; p.bombCooldown = 0;
  if (!keepPowers) { p.speedItems = 0; p.maxBombs = 1; p.range = 1; p.shield = false; }
}

export function startLevel(state, level) {
  const spec = levelSpec(level);
  state.level = level;
  const { grid, bricks } = buildGrid(state.rng, spec.density, [CORNERS[0]]);
  state.grid = grid;
  state.bombs = []; state.fires = new Map(); state.items = new Map(); state.particles = [];
  state.enemies = [];
  state.timer = RULES.levelTime; state.hurry = false;
  state.suddenDeath = null;
  // Door + items hide under distinct bricks, door never in the spawn column/row corridor.
  const shuffled = bricks.slice();
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(state.rng() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  const far = shuffled.filter(([x, y]) => x + y >= 8);
  const doorCell = far[0] || shuffled[0];
  state.door = { x: doorCell[0], y: doorCell[1], revealed: false, open: false };
  const pool = [ITEM.BOMB, ITEM.FIRE, ITEM.BOMB, ITEM.FIRE, ITEM.SPEED, ITEM.SHIELD, ITEM.BOMB, ITEM.FIRE];
  let placed = 0;
  for (const [x, y] of shuffled) {
    if (placed >= spec.items) break;
    if (x === doorCell[0] && y === doorCell[1]) continue;
    state.items.set(key(x, y), { type: pool[placed % pool.length], hidden: true });
    placed++;
  }
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
  const p = state.players[0];
  resetPlayer(p, level > 1);
  state.status = 'intro'; state.statusUntil = state.time + 1.6;
  state.events.push({ type: 'level', level });
}

export function startRound(state) {
  state.round += 1;
  const { grid, bricks } = buildGrid(state.rng, 0.62, [CORNERS[0], CORNERS[1]]);
  state.grid = grid;
  state.bombs = []; state.fires = new Map(); state.items = new Map(); state.particles = [];
  state.enemies = []; state.door = null; state.roundWinner = null;
  state.timer = RULES.battleTime;
  state.suddenDeath = null;
  const shuffled = bricks.slice();
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(state.rng() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  const pool = [ITEM.FIRE, ITEM.BOMB, ITEM.FIRE, ITEM.BOMB, ITEM.SPEED, ITEM.FIRE, ITEM.BOMB, ITEM.SHIELD, ITEM.SPEED, ITEM.FIRE, ITEM.BOMB, ITEM.SPEED];
  shuffled.slice(0, pool.length).forEach(([x, y], i) => state.items.set(key(x, y), { type: pool[i], hidden: true }));
  state.players.forEach(p => resetPlayer(p, false));
  state.status = 'intro'; state.statusUntil = state.time + 1.6;
  state.events.push({ type: 'round', round: state.round });
}

// ---------------------------------------------------------------- movement
function blockedFor(state, ent, tx, ty) {
  const t = tileAt(state, tx, ty);
  if (t === WALL) return true;
  if (t === BRICK) return true;
  const b = bombAt(state, tx, ty);
  if (b && !(tileOf(ent.x) === tx && tileOf(ent.y) === ty)) return true;
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
export function blastCells(state, x, y, range) {
  const cells = [[x, y, 'centre']];
  for (const d of DIR_NAMES) {
    const [dx, dy] = DIRS[d];
    for (let i = 1; i <= range; i++) {
      const tx = x + dx * i, ty = y + dy * i;
      const t = tileAt(state, tx, ty);
      if (t === WALL) break;
      cells.push([tx, ty, i === range || tileAt(state, tx + dx, ty + dy) === WALL ? 'end' : 'ray', d]);
      if (t === BRICK) break;
    }
  }
  return cells;
}

function explode(state, bomb) {
  if (bomb.exploded) return;
  bomb.exploded = true;
  const cells = blastCells(state, bomb.x, bomb.y, bomb.range);
  const owner = state.players[bomb.owner];
  const until = state.time + RULES.fireTime;
  const blast = { x: bomb.x, y: bomb.y, cells, at: state.time, owner: bomb.owner };
  state.events.push({ type: 'explode', ...blast });
  for (const [cx, cy] of cells) {
    const k = key(cx, cy);
    if (state.grid[k] === BRICK) {
      state.grid[k] = FLOOR;
      state.events.push({ type: 'brick', x: cx, y: cy });
      if (owner && state.mode === 'adventure') addScore(state, RULES.brickScore);
      const it = state.items.get(k);
      if (it) it.hidden = false;
      if (state.door && state.door.x === cx && state.door.y === cy) {
        state.door.revealed = true;
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
    state.extraLifeIdx++; state.lives++;
    state.events.push({ type: 'extraLife' });
  }
}

// ---------------------------------------------------------------- danger map (AI)
// Seconds until each tile becomes lethal (Infinity = safe). Chain reactions
// are folded in: a bomb caught in another's blast inherits the shorter fuse.
export function dangerMap(state, extraBomb) {
  const danger = new Float64Array(W * H).fill(Infinity);
  const bombs = state.bombs.filter(b => !b.exploded).map(b => ({ x: b.x, y: b.y, range: b.range, t: b.at + b.fuse - state.time }));
  if (extraBomb) bombs.push({ ...extraBomb, t: RULES.bombFuse });
  // Relax fuses through chains.
  let changed = true;
  while (changed) {
    changed = false;
    for (const b of bombs) {
      for (const [cx, cy] of blastCells(state, b.x, b.y, b.range)) {
        const o = bombs.find(q => q.x === cx && q.y === cy);
        if (o && o.t > b.t) { o.t = b.t; changed = true; }
      }
    }
  }
  for (const b of bombs) {
    for (const [cx, cy] of blastCells(state, b.x, b.y, b.range)) {
      const k = key(cx, cy);
      if (state.grid[k] === BRICK) continue;
      danger[k] = Math.min(danger[k], Math.max(0, b.t));
    }
  }
  for (const [k, until] of state.fires) if (until > state.time) danger[k] = 0;
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
      if (b) continue;
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
  const canBomb = mine < p.maxBombs && !bombAt(state, px, py) && p.bombCooldown <= 0;
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
function enemyThink(state, e) {
  const spec = ENEMY[e.type];
  const ex = tileOf(e.x), ey = tileOf(e.y);
  const open = DIR_NAMES.filter(d => {
    const nx = ex + DIRS[d][0], ny = ey + DIRS[d][1];
    return tileAt(state, nx, ny) === FLOOR && !bombAt(state, nx, ny) && !fireAt(state, nx, ny);
  });
  if (!open.length) return e.dir;
  const p = state.players[0];
  const target = p && p.alive ? p : null;
  const forward = open.filter(d => d !== OPPOSITE[e.dir]);
  const pick = arr => arr[Math.floor(state.rng() * arr.length)];

  if (spec.style === 'chaser' && target) {
    const { dist, prev } = bfs(state, ex, ey, e, (x, y) => !fireAt(state, x, y));
    const tk = key(tileOf(target.x), tileOf(target.y));
    if (dist[tk] > 0) { const d = firstStep(prev, key(ex, ey), tk); if (d && open.includes(d)) return d; }
  }
  if (spec.style === 'hunter' && target && state.rng() < 0.8) {
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

  // Timer
  state.timer = Math.max(0, state.timer - dt);
  if (state.mode === 'adventure' && state.timer <= 0 && !state.hurry) {
    state.hurry = true;
    spawnSparks(state);
    state.events.push({ type: 'hurry' });
  }
  if (state.mode === 'battle') tickSuddenDeath(state, dt);

  // Players
  for (const p of state.players) {
    if (!p.alive) {
      if (state.mode === 'adventure' && state.time >= p.deadAt + RULES.respawnDelay) {
        if (state.lives > 0) {
          resetPlayer(p, true); p.shield = false;
          p.invulnUntil = state.time + RULES.invulnTime;
          p.graceUntil = state.time + RULES.spawnGrace;
          state.events.push({ type: 'respawn' });
        }
      }
      continue;
    }
    let held = [], bomb = false;
    if (p.cpu) {
      if (p.atNode || !p.ai || !p.ai.dir || !p.moving) p.ai = cpuThink(state, p);
      held = p.ai.dir ? [p.ai.dir] : [];
      bomb = p.ai.bomb;
      if (bomb) p.ai = { dir: null, bomb: false };
    } else {
      const inp = inputs[p.id] || {};
      held = inp.held || [];
      bomb = !!inp.bomb;
    }
    if (bomb) { if (placeBomb(state, p)) p.bombCooldown = 0.25; }
    const want = held.length ? pickDirection(state, p, held) : null;
    if (want || bomb) p.movedSinceSpawn = true;
    moveEntity(state, p, want, playerSpeed(p), dt);
    if (p.moving) p.walkPhase += dt * playerSpeed(p) * 2.2;
    // Pick up items
    const k = key(tileOf(p.x), tileOf(p.y));
    const it = state.items.get(k);
    if (it && !it.hidden) {
      state.items.delete(k);
      applyItem(state, p, it.type);
      state.events.push({ type: 'item', item: it.type, x: k % W, y: Math.floor(k / W), player: p.id });
    }
    // Door
    if (state.door && state.door.open && tileOf(p.x) === state.door.x && tileOf(p.y) === state.door.y && atCentre(p)) {
      const bonus = RULES.levelBonus + Math.floor(state.timer) * RULES.timeBonus;
      addScore(state, bonus);
      state.status = 'cleared'; state.statusUntil = state.time + 2.4;
      state.events.push({ type: 'levelClear', level: state.level, bonus });
      return state;
    }
  }

  // Enemies
  for (const e of state.enemies) {
    if (!e.alive) continue;
    if (e.atNode || !e.moving) e.dir = enemyThink(state, e);
    moveEntity(state, e, e.dir, e.speed, dt);
    e.walkPhase += dt * 3;
  }

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
  if (state.door && state.door.revealed && !state.door.open && state.enemies.every(e => !e.alive)) {
    state.door.open = true;
    state.events.push({ type: 'doorOpen' });
  }
}

function resolveHits(state) {
  // Enemies in fire
  for (const e of state.enemies) {
    if (!e.alive) continue;
    if (fireAt(state, tileOf(e.x), tileOf(e.y))) {
      e.alive = false; e.deadAt = state.time;
      addScore(state, ENEMY[e.type].score);
      state.events.push({ type: 'kill', enemy: e.type, x: e.x, y: e.y, score: ENEMY[e.type].score });
    }
  }
  if (state.door && state.door.revealed && !state.door.open && state.enemies.every(e => !e.alive)) {
    state.door.open = true;
    state.events.push({ type: 'doorOpen' });
  }
  // Players in fire, touched by enemies, or crushed by the closing walls
  for (const p of state.players) {
    if (!p.alive) continue;
    const px = tileOf(p.x), py = tileOf(p.y);
    let hit = null;
    if (fireAt(state, px, py)) hit = 'fire';
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
      state.lives -= 1;
      if (state.lives <= 0) {
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
  else if (type === ITEM.SHIELD) p.shield = true;
  if (state.mode === 'adventure') addScore(state, RULES.itemScore);
}

function spawnSparks(state) {
  const p = state.players[0];
  const spots = [[W - 2, H - 2], [W - 2, 1], [1, H - 2], [Math.floor(W / 2), Math.floor(H / 2)]];
  for (const [x, y] of spots) {
    const k = key(x, y);
    if (state.grid[k] === BRICK) {
      state.grid[k] = FLOOR;
      const it = state.items.get(k); if (it) it.hidden = false;
      if (state.door && state.door.x === x && state.door.y === y) state.door.revealed = true;
    }
    if (p && Math.abs(p.x - x - 0.5) < 2 && Math.abs(p.y - y - 0.5) < 2) continue;
    state.enemies.push(makeEnemy('spark', x, y, state.rng));
  }
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
