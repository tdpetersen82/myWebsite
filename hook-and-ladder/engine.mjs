// Hook & Ladder — pure rules. No DOM, no timers, no rendering.
// A tillered aerial ladder truck: the driver steers the tractor's front
// wheels, the tillerman steers the trailer's rear wheels. Fires break out
// around a city grid; park the ladder in the marked lane before the building
// burns down. Headless-tested by tools/hook-and-ladder-test.mjs.

export const TILE = 40;
export const COLS = 31;
export const ROWS = 17;
export const PITCH = 7;       // street (3 tiles) + block (4 tiles)
export const STREET_W = 3;
export const W = COLS * TILE;
export const H = ROWS * TILE;

export const STREET = 0, BUILDING = 1, PARK = 2;

const DEG = Math.PI / 180;
export const RULES = {
  maxSpeed: 165,        // px/s forward
  reverseSpeed: 70,
  accel: 140,
  brake: 300,
  coast: 110,
  maxSteer: 40 * DEG,   // tractor front wheels
  steerRate: 300 * DEG,
  steerReturn: 360 * DEG,
  maxTiller: 35 * DEG,  // trailer rear wheels
  tillerRate: 150 * DEG,
  tillerReturn: 220 * DEG,
  maxArticulation: 70 * DEG,
  L1: 32,               // tractor wheelbase (rear axle → front axle)
  tractorLen: 52,       // body: 10 behind the rear axle, 42 ahead of it
  tractorBack: 10,
  L2: 84,               // hitch (tractor rear axle) → trailer rear axle
  trailerFront: 6,      // body ahead of the hitch
  trailerBack: 12,      // body behind the rear axle
  width: 22,
  turntable: 50,        // distance behind the hitch, centre of the ladder base
  stunTime: 0.7,
  parkSpeed: 8,         // |v| below this counts as stopped
  ladderTime: 1.6,
  retractTime: 0.6,
  betweenFires: 1.6,
  lives: 3,
  minDispatchTiles: 9,
};

// ---------------------------------------------------------------- utils
export function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export function wrapAngle(a) {
  while (a > Math.PI) a -= 2 * Math.PI;
  while (a < -Math.PI) a += 2 * Math.PI;
  return a;
}
function approach(v, target, rate) {
  if (v < target) return Math.min(target, v + rate);
  if (v > target) return Math.max(target, v - rate);
  return v;
}
export function tileOf(px) { return Math.floor(px / TILE); }

// ---------------------------------------------------------------- world
// Streets are three tiles wide (two lanes plus a curb lane) on a 7-tile pitch:
// cols 0-2, 7-9, 14-16, 21-23, 28-30 and rows 0-2, 7-9, 14-16. The 4×4 blocks
// between hold buildings or a park. Street centre lines sit at tile 1.5 of each street.
export function isStreetCol(c) { return c % PITCH < STREET_W; }
export function isStreetRow(r) { return r % PITCH < STREET_W; }
export const BLOCKS_X = 4, BLOCKS_Y = 2;
export function blockAt(bx, by) { return { bx, by, col: STREET_W + bx * PITCH, row: STREET_W + by * PITCH }; }

const ROOFS = ['#b5654a', '#c9a27a', '#8f9aa8', '#a97c5b', '#7f8c8d', '#c4b09a', '#9c6f5e', '#b8b1a6', '#8a7f74', '#a5866b'];

export function buildWorld(rng) {
  const grid = new Uint8Array(COLS * ROWS);
  const buildings = [];
  const parks = [];
  const trees = [];
  const cars = [];
  const blocks = [];
  for (let by = 0; by < BLOCKS_Y; by++) for (let bx = 0; bx < BLOCKS_X; bx++) blocks.push(blockAt(bx, by));

  // One park.
  const parkIdx = new Set([Math.floor(rng() * blocks.length)]);

  let id = 0;
  blocks.forEach((b, i) => {
    if (parkIdx.has(i)) {
      parks.push({ col: b.col, row: b.row, w: 4, h: 4 });
      for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) grid[(b.row + r) * COLS + b.col + c] = PARK;
      for (let k = 0; k < 7; k++) trees.push({ x: (b.col + 0.5 + rng() * 3) * TILE, y: (b.row + 0.5 + rng() * 3) * TILE, r: 10 + rng() * 6 });
      return;
    }
    const style = rng();
    let rects;
    if (style < 0.18) rects = [[0, 0, 4, 2], [0, 2, 4, 2]];        // two wide buildings
    else if (style < 0.36) rects = [[0, 0, 2, 4], [2, 0, 2, 4]];   // two tall buildings
    else if (style < 0.5) rects = [[0, 0, 4, 2], [0, 2, 2, 2], [2, 2, 2, 2]];
    else rects = [[0, 0, 2, 2], [2, 0, 2, 2], [0, 2, 2, 2], [2, 2, 2, 2]];
    for (const [dc, dr, w, h] of rects) {
      const col = b.col + dc, row = b.row + dr;
      for (let r = 0; r < h; r++) for (let c = 0; c < w; c++) grid[(row + r) * COLS + col + c] = BUILDING;
      const bld = { id: id++, col, row, w, h, roof: ROOFS[Math.floor(rng() * ROOFS.length)], floors: 2 + Math.floor(rng() * 5), state: 'ok', zones: [] };
      // A parking zone along every street-facing side: the near lane, one tile deep.
      if (isStreetRow(row - 1)) bld.zones.push({ x: col * TILE, y: (row - 1) * TILE, w: w * TILE, h: TILE, side: 'n' });
      if (isStreetRow(row + h)) bld.zones.push({ x: col * TILE, y: (row + h) * TILE, w: w * TILE, h: TILE, side: 's' });
      if (isStreetCol(col - 1)) bld.zones.push({ x: (col - 1) * TILE, y: row * TILE, w: TILE, h: h * TILE, side: 'w' });
      if (isStreetCol(col + w)) bld.zones.push({ x: (col + w) * TILE, y: row * TILE, w: TILE, h: h * TILE, side: 'e' });
      bld.cx = (col + w / 2) * TILE; bld.cy = (row + h / 2) * TILE;
      buildings.push(bld);
    }
  });

  // Parked cars hug the curb of the inner streets (never the outer ring, which
  // is the run-up around the map) and only along the middle two tiles of a block
  // edge, so the corners stay clear for the tail to swing through.
  const CAR_L = 34, CAR_W = 17, GAP = 3;
  for (const b of blocks) {
    for (let k = 1; k < 3; k++) {
      // north edge (street row above the block), south edge, west, east
      if (b.row > STREET_W && rng() < 0.32) cars.push({ x: (b.col + k) * TILE + (TILE - CAR_L) / 2, y: b.row * TILE - GAP - CAR_W, w: CAR_L, h: CAR_W, dir: 'h' });
      if (b.row + 4 < ROWS - STREET_W && rng() < 0.32) cars.push({ x: (b.col + k) * TILE + (TILE - CAR_L) / 2, y: (b.row + 4) * TILE + GAP, w: CAR_L, h: CAR_W, dir: 'h' });
      if (b.col > STREET_W && rng() < 0.32) cars.push({ x: b.col * TILE - GAP - CAR_W, y: (b.row + k) * TILE + (TILE - CAR_L) / 2, w: CAR_W, h: CAR_L, dir: 'v' });
      if (b.col + 4 < COLS - STREET_W && rng() < 0.32) cars.push({ x: (b.col + 4) * TILE + GAP, y: (b.row + k) * TILE + (TILE - CAR_L) / 2, w: CAR_W, h: CAR_L, dir: 'v' });
    }
  }
  const CAR_COLORS = ['#e8e4dc', '#3d5a80', '#6b7b8c', '#c0392b', '#2c3e50', '#d9c27a', '#7f8c8d', '#2e7d5b'];
  for (const c of cars) c.color = CAR_COLORS[Math.floor(rng() * CAR_COLORS.length)];

  return { grid, buildings, parks, trees, cars };
}

export function tileAt(world, c, r) {
  if (c < 0 || r < 0 || c >= COLS || r >= ROWS) return BUILDING;
  return world.grid[r * COLS + c];
}
export function pointSolid(world, x, y) {
  if (x < 0 || y < 0 || x >= W || y >= H) return true;
  if (world.grid[tileOf(y) * COLS + tileOf(x)] !== STREET) return true;
  for (const c of world.cars) if (x >= c.x && x <= c.x + c.w && y >= c.y && y <= c.y + c.h) return true;
  return false;
}

// ---------------------------------------------------------------- truck
export function spawnTruck() {
  // On the middle horizontal street's centre line, heading east, trailer straight.
  return { x: 5 * TILE, y: (PITCH + 1.5) * TILE, h1: 0, h2: 0, v: 0, steer: 0, tiller: 0 };
}

// Oriented rectangles for the tractor and the trailer, as corner lists.
export function truckBodies(tr) {
  const c1 = Math.cos(tr.h1), s1 = Math.sin(tr.h1);
  const c2 = Math.cos(tr.h2), s2 = Math.sin(tr.h2);
  const hw = RULES.width / 2;
  const rect = (ox, oy, c, s, a, b) => {
    // segment from a to b along heading (c,s) through (ox,oy); returns corners
    const px = -s * hw, py = c * hw;
    return [
      [ox + c * a + px, oy + s * a + py], [ox + c * b + px, oy + s * b + py],
      [ox + c * b - px, oy + s * b - py], [ox + c * a - px, oy + s * a - py],
    ];
  };
  return {
    tractor: rect(tr.x, tr.y, c1, s1, -RULES.tractorBack, RULES.L1 + (RULES.tractorLen - RULES.tractorBack - RULES.L1)),
    trailer: rect(tr.x, tr.y, c2, s2, -(RULES.L2 + RULES.trailerBack), RULES.trailerFront),
  };
}
export function turntable(tr) {
  return { x: tr.x - Math.cos(tr.h2) * RULES.turntable, y: tr.y - Math.sin(tr.h2) * RULES.turntable };
}
function samplePoints(corners) {
  const pts = corners.slice();
  for (let i = 0; i < 4; i++) {
    const a = corners[i], b = corners[(i + 1) % 4];
    pts.push([(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]);
  }
  return pts;
}
export function truckCollides(world, tr) {
  const b = truckBodies(tr);
  for (const p of samplePoints(b.tractor)) if (pointSolid(world, p[0], p[1])) return 'tractor';
  for (const p of samplePoints(b.trailer)) if (pointSolid(world, p[0], p[1])) return 'trailer';
  return null;
}

// Articulated kinematics. Hitch sits on the tractor's rear axle; the trailer's
// rear axle rolls in the direction its (tillered) wheels point, so
//   dh2/dt = v · sin(h1 − h2 − tiller) / (L2 · cos tiller)
// which settles at h2 = h1 − tiller: steering the tiller swings the tail out.
export function stepTruck(state, inp, dt) {
  const tr = state.truck, R = RULES;
  const steerT = (inp.steer || 0) * R.maxSteer;
  tr.steer = approach(tr.steer, steerT, (steerT ? R.steerRate : R.steerReturn) * dt);
  const tillerT = state.mode === 'solo' ? 0 : (inp.tiller || 0) * R.maxTiller;
  tr.tiller = approach(tr.tiller, tillerT, (tillerT ? R.tillerRate : R.tillerReturn) * dt);

  const locked = state.stun > 0 || state.ladder;
  if (locked) tr.v = approach(tr.v, 0, R.brake * 2 * dt);
  else if (inp.gas && !inp.brake) tr.v = tr.v < 0 ? approach(tr.v, 0, R.brake * dt) : Math.min(R.maxSpeed, tr.v + R.accel * dt);
  else if (inp.brake) tr.v = tr.v > 0 ? approach(tr.v, 0, R.brake * dt) : Math.max(-R.reverseSpeed, tr.v - R.accel * 0.7 * dt);
  else tr.v = approach(tr.v, 0, R.coast * dt);
  if (Math.abs(tr.v) < 0.01) { tr.v = 0; return null; }

  const prev = { x: tr.x, y: tr.y, h1: tr.h1, h2: tr.h2 };
  tr.h1 += tr.v / R.L1 * Math.tan(tr.steer) * dt;
  tr.x += Math.cos(tr.h1) * tr.v * dt;
  tr.y += Math.sin(tr.h1) * tr.v * dt;
  tr.h2 += tr.v * Math.sin(tr.h1 - tr.h2 - tr.tiller) / (R.L2 * Math.cos(tr.tiller)) * dt;
  const art = wrapAngle(tr.h1 - tr.h2);
  if (Math.abs(art) > R.maxArticulation) tr.h2 = tr.h1 - Math.sign(art) * R.maxArticulation;
  tr.h1 = wrapAngle(tr.h1); tr.h2 = wrapAngle(tr.h2);

  const hit = truckCollides(state.world, tr);
  if (hit) {
    Object.assign(tr, prev);
    return hit;
  }
  return null;
}

// ---------------------------------------------------------------- fires
export function streetDistance(world, fromX, fromY, zones) {
  const start = tileOf(fromY) * COLS + tileOf(fromX);
  const goal = new Set();
  for (const z of zones) {
    for (let r = tileOf(z.y); r < tileOf(z.y + z.h - 1) + 1; r++)
      for (let c = tileOf(z.x); c < tileOf(z.x + z.w - 1) + 1; c++) goal.add(r * COLS + c);
  }
  const dist = new Int16Array(COLS * ROWS).fill(-1);
  const q = [start]; dist[start] = 0;
  for (let qi = 0; qi < q.length; qi++) {
    const cur = q[qi];
    if (goal.has(cur)) return dist[cur];
    const c = cur % COLS, r = (cur - c) / COLS;
    for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nc = c + dc, nr = r + dr;
      if (nc < 0 || nr < 0 || nc >= COLS || nr >= ROWS) continue;
      const n = nr * COLS + nc;
      if (dist[n] >= 0 || world.grid[n] !== STREET) continue;
      dist[n] = dist[cur] + 1; q.push(n);
    }
  }
  return -1;
}

export function burnTimeFor(dist, firesOut) {
  const diff = Math.max(0.55, 1 - firesOut * 0.035);
  return Math.min(60, Math.max(14, (15 + dist * 1.05) * diff));
}

export function dispatchFire(state) {
  const { world, truck } = state;
  const cands = world.buildings.filter(b => b.state !== 'ruined' && b !== state.lastBuilding && b.zones.length);
  const scored = cands.map(b => ({ b, d: streetDistance(world, truck.x, truck.y, b.zones) })).filter(o => o.d >= RULES.minDispatchTiles);
  const pool = scored.length ? scored : cands.map(b => ({ b, d: Math.max(1, streetDistance(world, truck.x, truck.y, b.zones)) }));
  const pick = pool[Math.floor(state.rng() * pool.length)];
  pick.b.state = 'burning';
  const total = burnTimeFor(pick.d, state.firesOut);
  state.fire = { building: pick.b, t: total, total, dist: pick.d, clean: true };
  state.lastBuilding = pick.b;
  state.events.push({ type: 'dispatch', building: pick.b, time: total });
}

export function parkedInZone(state) {
  const f = state.fire;
  if (!f) return null;
  const p = turntable(state.truck);
  for (const z of f.building.zones) if (p.x >= z.x && p.x <= z.x + z.w && p.y >= z.y && p.y <= z.y + z.h) return z;
  return null;
}
export function canRaiseLadder(state) {
  return !!(state.status === 'playing' && state.fire && !state.ladder && Math.abs(state.truck.v) < RULES.parkSpeed && parkedInZone(state));
}

// ---------------------------------------------------------------- game
export function createGame({ seed = (Date.now() % 1e9) >>> 0, mode = 'duo' } = {}) {
  const rng = mulberry32(seed);
  const world = buildWorld(rng);
  const truck = spawnTruck();
  // Keep the run-up around the spawn clear of parked cars.
  world.cars = world.cars.filter(c => Math.hypot(c.x + c.w / 2 - truck.x, c.y + c.h / 2 - truck.y) > 6 * TILE);
  return {
    seed, rng, mode, world, truck,
    status: 'menu', t: 0, paused: false,
    fire: null, ladder: null, nextFireIn: 0.8, lastBuilding: null,
    stun: 0, crashes: 0, score: 0, firesOut: 0, lives: RULES.lives,
    events: [],
  };
}
export function startGame(state) { state.status = 'playing'; state.t = 0; }

export function step(state, dt, inp = {}) {
  if (state.status !== 'playing' || state.paused) return;
  state.t += dt;
  if (state.stun > 0) state.stun = Math.max(0, state.stun - dt);

  // Raising the ladder locks the truck before it can creep this frame.
  if (state.fire && !state.ladder && inp.ladder && canRaiseLadder(state)) {
    const tt = turntable(state.truck);
    state.ladder = { t: 0, retract: false, x0: tt.x, y0: tt.y, x1: state.fire.building.cx, y1: state.fire.building.cy };
    state.events.push({ type: 'deploy' });
  }

  const hit = stepTruck(state, inp, dt);
  if (hit) {
    state.stun = RULES.stunTime;
    state.truck.v = 0;
    state.crashes++;
    if (state.fire) state.fire.clean = false;
    state.events.push({ type: 'crash', part: hit, x: state.truck.x, y: state.truck.y });
  }

  if (state.ladder) {
    const L = state.ladder;
    L.t += dt;
    if (!L.retract && L.t >= RULES.ladderTime) {
      const f = state.fire;
      const bonus = Math.round(f.t) * 5;
      const clean = f.clean ? 50 : 0;
      const gained = 100 + bonus + clean;
      state.score += gained;
      state.firesOut++;
      f.building.state = 'saved';
      state.events.push({ type: 'extinguished', building: f.building, gained, bonus, clean: f.clean });
      state.fire = null;
      state.nextFireIn = RULES.betweenFires;
      L.retract = true; L.t = 0;
    } else if (L.retract && L.t >= RULES.retractTime) {
      state.ladder = null;
    }
  } else if (state.fire) {
    const f = state.fire;
    f.t -= dt;
    if (f.t <= 0) {
      f.t = 0;
      f.building.state = 'ruined';
      state.lives--;
      state.events.push({ type: 'burnout', building: f.building });
      state.fire = null;
      if (state.lives <= 0) {
        state.status = 'over';
        state.events.push({ type: 'gameover', score: state.score, fires: state.firesOut });
      } else state.nextFireIn = RULES.betweenFires + 0.6;
    }
  } else {
    state.nextFireIn -= dt;
    if (state.nextFireIn <= 0) dispatchFire(state);
  }
}

export function drainEvents(state) { const e = state.events; state.events = []; return e; }
