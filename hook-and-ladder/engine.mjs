// Hook & Ladder — pure rules. No DOM, no timers, no rendering.
// A tillered aerial ladder truck: the driver steers the tractor's front
// wheels, the tillerman steers the trailer's rear wheels. Fires break out
// around a city grid; pull alongside, aim the hose and ladder, and rescue
// stranded people before the building burns down. Headless-tested by tools/hook-and-ladder-test.mjs.

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
  maxSpeed: 210,        // px/s forward
  reverseSpeed: 85,
  accel: 340,
  brake: 520,
  coast: 145,
  maxSteer: 38 * DEG,   // tractor front wheels
  steerRate: 340 * DEG,
  steerReturn: 540 * DEG,
  maxTiller: 35 * DEG,  // trailer rear wheels
  tillerRate: 150 * DEG,
  tillerReturn: 220 * DEG,
  maxArticulation: 58 * DEG,
  L1: 32,               // tractor wheelbase (rear axle → front axle)
  tractorLen: 52,       // body: 10 behind the rear axle, 42 ahead of it
  tractorBack: 10,
  L2: 68,               // hitch (tractor rear axle) → trailer rear axle
  trailerFront: 6,      // body ahead of the hitch
  trailerBack: 12,      // body behind the rear axle
  width: 25,
  turntable: 40,        // distance behind the hitch, centre of the ladder base
  stunTime: 0,
  parkSpeed: 65,        // slow enough for the crew to stop and deploy
  ladderTime: 0.65,
  retractTime: 1.2,
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
export function truckBodies(tr, margin = 0) {
  const c1 = Math.cos(tr.h1), s1 = Math.sin(tr.h1);
  const c2 = Math.cos(tr.h2), s2 = Math.sin(tr.h2);
  const hw = RULES.width / 2 - margin;
  const rect = (ox, oy, c, s, a, b) => {
    a += margin; b -= margin;
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
function overlapsRect(poly, x, y, w, h) {
  const box = [[x,y],[x+w,y],[x+w,y+h],[x,y+h]];
  const axes = [[1,0],[0,1], [poly[1][0]-poly[0][0],poly[1][1]-poly[0][1]], [poly[2][0]-poly[1][0],poly[2][1]-poly[1][1]]];
  for (const [ax,ay] of axes) {
    const a = poly.map(([px,py]) => px*ax+py*ay), b = box.map(([px,py]) => px*ax+py*ay);
    if (Math.max(...a) <= Math.min(...b) || Math.max(...b) <= Math.min(...a)) return false;
  }
  return true;
}
export function truckCollides(world, tr) {
  // A small body inset forgives paint-to-curb contact. Exact rectangle overlap
  // catches parked cars anywhere under a trailer, not just at sampled corners.
  for (const [name,poly] of Object.entries(truckBodies(tr, 2))) {
    const xs=poly.map(p=>p[0]),ys=poly.map(p=>p[1]);
    const left=Math.min(...xs),right=Math.max(...xs),top=Math.min(...ys),bottom=Math.max(...ys);
    if(left<0||right>W||top<0||bottom>H)return name;
    for(let r=tileOf(top);r<=tileOf(bottom);r++)for(let c=tileOf(left);c<=tileOf(right);c++){
      if(tileAt(world,c,r)!==STREET&&overlapsRect(poly,c*TILE,r*TILE,TILE,TILE))return name;
    }
    for(const car of world.cars){
      if(car.x>right||car.x+car.w<left||car.y>bottom||car.y+car.h<top)continue;
      if(overlapsRect(poly,car.x,car.y,car.w,car.h))return name;
    }
  }
  return null;
}

// Arcade steering: a fast rack, stable straights and a following rear axle.
// P2 can deliberately swing the tail; an unsteered tail gets corner assistance.
export function stepTruck(state, inp, dt) {
  const tr = state.truck, R = RULES;
  state.scraping = false;
  if (state.ladder) { tr.v = 0; return null; }
  const steering = Math.max(-1, Math.min(1, inp.steer || 0));
  const steerT = steering * R.maxSteer;
  tr.steer = approach(tr.steer, steerT, (steerT ? R.steerRate : R.steerReturn) * dt);
  const manual = state.mode === 'solo' ? 0 : (inp.tiller || 0);
  const assist = tr.v >= 0 && !manual ? -steering * .65 : 0;
  tr.tiller = approach(tr.tiller, (manual || assist) * R.maxTiller, R.tillerRate * dt);
  if (inp.handbrake) tr.v = approach(tr.v, 0, R.brake * 1.5 * dt);
  else if (inp.brake) tr.v = approach(tr.v, -R.reverseSpeed, (tr.v > 0 ? R.brake : R.accel * .6) * dt);
  else if (inp.gas) tr.v = approach(tr.v, R.maxSpeed - Math.abs(steering) * 55, (tr.v < 0 ? R.brake : R.accel) * dt);
  else tr.v = approach(tr.v, 0, R.coast * dt);
  if (Math.abs(tr.v) < .1) { tr.v = 0; return null; }

  const prev = { x: tr.x, y: tr.y, h1: tr.h1, h2: tr.h2 };
  const yaw = tr.v / R.L1 * Math.tan(tr.steer);
  tr.h1 += Math.max(-2.15, Math.min(2.15, yaw)) * dt;
  // Releasing near a cardinal heading settles onto that street, instead of
  // leaving a tiny angle that drifts the rig into a wall two blocks later.
  if (!steering && tr.v > 0) {
    const straight = Math.round(tr.h1 / (Math.PI / 2)) * Math.PI / 2;
    const delta = wrapAngle(straight - tr.h1);
    if (Math.abs(delta) < 15 * DEG) tr.h1 += delta * (1 - Math.exp(-9 * dt));
  }
  tr.x += Math.cos(tr.h1) * tr.v * dt;
  tr.y += Math.sin(tr.h1) * tr.v * dt;
  let trailerYaw = tr.v * Math.sin(tr.h1 - tr.h2 - tr.tiller) / (R.L2 * Math.cos(tr.tiller));
  // Reverse stabilisation prevents the rear becoming an uncontrollable hinge.
  if (tr.v < 0 && !manual) trailerYaw = wrapAngle(tr.h1 - tr.h2) * 3;
  tr.h2 += trailerYaw * dt;
  const art = wrapAngle(tr.h1 - tr.h2);
  if (Math.abs(art) > R.maxArticulation) tr.h2 = tr.h1 - Math.sign(art) * R.maxArticulation;
  tr.h1 = wrapAngle(tr.h1); tr.h2 = wrapAngle(tr.h2);

  const hit = truckCollides(state.world, tr);
  if (!hit) return null;
  const desired = { x: tr.x, y: tr.y, h1: tr.h1, h2: tr.h2 };
  // A glancing scrape should slide, not repeatedly freeze the entire truck.
  const trials = [
    { ...desired, h2: prev.h2 },
    { ...prev, x: desired.x },
    { ...prev, y: desired.y },
  ].sort((a, b) => Math.hypot(b.x - prev.x, b.y - prev.y) - Math.hypot(a.x - prev.x, a.y - prev.y));
  for (const pose of trials) {
    if (Math.hypot(pose.x - prev.x, pose.y - prev.y) < Math.abs(tr.v) * dt * .15) continue;
    Object.assign(tr, pose);
    if (!truckCollides(state.world, tr)) { state.scraping = true; return hit; }
  }
  Object.assign(tr, prev);
  return hit;
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
  return Math.min(85, Math.max(38, (45 + dist * 1.15) * diff));
}

export function dispatchFire(state) {
  const { world, truck } = state;
  const cands = world.buildings.filter(b => b.state !== 'ruined' && b !== state.lastBuilding && b.zones.length);
  const scored = cands.map(b => ({ b, d: streetDistance(world, truck.x, truck.y, b.zones) })).filter(o => o.d >= RULES.minDispatchTiles);
  const pool = scored.length ? scored : cands.map(b => ({ b, d: Math.max(1, streetDistance(world, truck.x, truck.y, b.zones)) }));
  // A nearby first call teaches the job before asking for a cross-city drive.
  const intro = cands.filter(b => b.cx >= truck.x && b.cx <= truck.x + 360 && b.zones.some(z => z.side === 's' && z.y === PITCH * TILE));
  const pick = state.firesOut === 0 && state.lives === RULES.lives && intro.length
    ? { b: intro[0], d: streetDistance(world, truck.x, truck.y, intro[0].zones) }
    : pool[Math.floor(state.rng() * pool.length)];
  pick.b.state = 'burning';
  const total = burnTimeFor(pick.d, state.firesOut);
  const types = ['APARTMENT RESCUE', 'MARKET FIRE', 'ROOFTOP EVACUATION'];
  const incident = state.firesOut % types.length;
  const count = incident === 2 ? 6 : incident === 1 ? 5 : 4;
  const targets = Array.from({ length: count }, (_, i) => ({
    at: 0.12 + i * 0.76 / (count - 1),
    kind: i === 1 || (incident === 2 && i === 4) ? 'person' : 'fire',
    hp: 1,
  }));
  for (const person of targets.filter(t => t.kind === 'person')) {
    person.guard = targets.filter(t => t.kind === 'fire').sort((a,b) => Math.abs(a.at-person.at)-Math.abs(b.at-person.at))[0];
  }
  state.fire = { building: pick.b, number: state.firesOut + 1, title: types[incident], t: total, total, dist: pick.d, clean: true, rescuePoints: 0, targets };
  // Clear the service frontage so a mission never asks players to park on a car.
  const zones = serviceZones(pick.b);
  world.cars = world.cars.filter(c => !zones.some(z => c.x < z.x + z.w && c.x + c.w > z.x && c.y < z.y + z.h && c.y + c.h > z.y));
  state.lastBuilding = pick.b;
  state.events.push({ type: 'dispatch', building: pick.b, time: total });
}

export function serviceZones(building) {
  return building.zones.map(z => {
    const horizontal = z.side === 'n' || z.side === 's';
    return { ...z,
      x: z.x - (horizontal ? 18 : z.side === 'w' ? 40 : 0),
      y: z.y - (!horizontal ? 18 : z.side === 'n' ? 40 : 0),
      w: z.w + (horizontal ? 36 : 40), h: z.h + (horizontal ? 40 : 36),
    };
  });
}
export function parkedInZone(state) {
  if (!state.fire) return null;
  const points = [turntable(state.truck), state.truck];
  return serviceZones(state.fire.building).find(z => points.some(p =>
    p.x >= z.x && p.x <= z.x + z.w && p.y >= z.y && p.y <= z.y + z.h)) || null;
}
export function roofPoint(at) {
  const angle = -Math.PI / 2 + at * Math.PI * 2;
  return { u: .5 + Math.cos(angle) * .32, v: .5 + Math.sin(angle) * .30 };
}
export function targetPoint(building, at) {
  const p = roofPoint(at);
  return { x: (building.col + p.u * building.w) * TILE, y: (building.row + p.v * building.h) * TILE };
}
export function aimDistance(a, b) { return Math.hypot((a.u - b.u) * 1.8, a.v - b.v); }
export function rescueBlocked(person) { return person.guard && person.guard.hp > .25; }

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
    stun: 0, scraping: false, crashCooldown: 0, recovered: false, crashes: 0, rescued: 0, score: 0, firesOut: 0, lives: RULES.lives,
    events: [],
  };
}
export function startGame(state) { state.status = 'playing'; state.t = 0; }

export function step(state, dt, inp = {}) {
  if (state.status !== 'playing' || state.paused) return;
  state.t += dt;
  state.stun = Math.max(0, state.stun - dt);
  state.crashCooldown = Math.max(0, state.crashCooldown - dt);

  // Recovery is explicit, costs clock time, and only triggers once per press.
  if (inp.recover && !state.recovered && !state.ladder) {
    const poses = [];
    for (let r = 1.5; r < ROWS; r += PITCH) for (let c = 1.5; c < COLS; c += PITCH) {
      for (const h of [0, Math.PI / 2, Math.PI, -Math.PI / 2]) {
        const pose = { ...spawnTruck(), x: c * TILE, y: r * TILE, h1: h, h2: h };
        if (!truckCollides(state.world, pose)) poses.push(pose);
      }
    }
    poses.sort((a, b) => Math.hypot(a.x - state.truck.x, a.y - state.truck.y) - Math.hypot(b.x - state.truck.x, b.y - state.truck.y));
    if (poses.length) {
      state.truck = poses[0]; state.stun = 0;
      if (state.fire) { state.fire.t = Math.max(0, state.fire.t - 5); state.fire.clean = false; }
      state.events.push({ type: 'recover' });
    }
  }
  state.recovered = !!inp.recover;

  if (inp.ladder && canRaiseLadder(state)) {
    const tt = turntable(state.truck), p = targetPoint(state.fire.building, 0.12);
    state.truck.v = 0;
    state.ladder = { t: 0, retract: false, hose: { u: .5, v: .5 }, basket: { u: .5, v: .88 }, pressure: 1, dry: false, spraying: false, rescuing: false, x0: tt.x, y0: tt.y, x1: p.x, y1: p.y };
    state.events.push({ type: 'deploy' });
  }
  const hit = stepTruck(state, inp, dt);
  if (hit) {
    state.stun = RULES.stunTime;
    if (!state.scraping) state.truck.v = 0;
    else state.truck.v = Math.sign(state.truck.v) * Math.min(Math.abs(state.truck.v), 115);
    if (state.crashCooldown === 0) {
      state.crashes++; state.crashCooldown = 1;
      if (state.fire) state.fire.clean = false;
      state.events.push({ type: 'crash', scrape: state.scraping, part: hit, x: state.truck.x, y: state.truck.y });
    }
  }

  const L = state.ladder;
  if (L) {
    L.t += dt;
    if (L.retract) {
      if (L.t >= RULES.retractTime) state.ladder = null;
    } else {
      for (const [cursor, dx, dy] of [
        [L.hose, inp.hoseX || 0, inp.hoseY || 0],
        [L.basket, inp.rescueX || 0, inp.rescueY || 0],
      ]) {
        const diagonal = Math.hypot(dx, dy) > 1 ? Math.SQRT1_2 : 1;
        cursor.u = Math.max(.03, Math.min(.97, cursor.u + dx * dt * .52 * diagonal));
        cursor.v = Math.max(.04, Math.min(.96, cursor.v + dy * dt * .88 * diagonal));
      }
      if (state.mode === 'solo') L.basket = { ...L.hose };
      L.x1 = (state.fire.building.col + L.basket.u * state.fire.building.w) * TILE;
      L.y1 = (state.fire.building.row + L.basket.v * state.fire.building.h) * TILE;
      L.spraying = !!inp.spray && !L.dry && L.t >= RULES.ladderTime;
      L.pressure = Math.max(0, Math.min(1, L.pressure + dt * (L.spraying ? -.20 : inp.spray ? 0 : .48)));
      if (L.pressure === 0) { L.dry = true; L.spraying = false; }
      if (L.pressure > .3) L.dry = false;
      L.rescuing = !!inp.rescue && L.t >= RULES.ladderTime;
      for (const target of state.fire.targets) {
        if (target.hp <= 0) continue;
        const pos = roofPoint(target.at);
        if (target.kind === 'fire') {
          if (L.spraying && aimDistance(L.hose, pos) < .16) target.hp = Math.max(0, target.hp - dt * .85);
          else target.hp = Math.min(1, target.hp + dt * .035);
        } else if (L.rescuing && !rescueBlocked(target) && aimDistance(L.basket, pos) < .15) {
          target.hp = Math.max(0, target.hp - dt * .55);
        }
        if (target.hp === 0) {
          target.doneAt = state.t;
          if (target.kind === 'person') { state.rescued++; state.score += 100; state.fire.rescuePoints += 100; }
          state.events.push({ type: 'target', gained: target.kind === 'person' ? 100 : 0, kind: target.kind, ...targetPoint(state.fire.building, target.at) });
        }
      }
      if (state.fire.targets.every(t => t.hp === 0)) {
        const f = state.fire, bonus = Math.round(f.t) * 5, clean = f.clean ? 50 : 0;
        const gained = 150 + bonus + clean + f.targets.filter(t => t.kind === 'person').length * 100;
        state.score += gained - f.rescuePoints; state.firesOut++; f.building.state = 'saved';
        state.events.push({ type: 'extinguished', building: f.building, gained, bonus, clean: f.clean });
        state.fire = null; state.nextFireIn = RULES.betweenFires;
        L.incident = f; L.retract = true; L.t = 0; L.spraying = false; L.rescuing = false;
      }
    }
  }
  // The emergency stays live while working: aim and teamwork still matter.
  if (state.fire) {
    state.fire.t = Math.max(0, state.fire.t - dt);
    if (state.fire.t === 0) {
      const b = state.fire.building; b.state = 'ruined'; state.lives--;
      state.events.push({ type: 'burnout', building: b });
      state.fire = null; state.ladder = null;
      if (state.lives <= 0) {
        state.status = 'over';
        state.events.push({ type: 'gameover', score: state.score, fires: state.firesOut });
      } else state.nextFireIn = RULES.betweenFires + 0.6;
    }
  } else if (!state.ladder) {
    state.nextFireIn -= dt;
    if (state.nextFireIn <= 0 && state.status === 'playing') dispatchFire(state);
  }
}

export function drainEvents(state) { const e = state.events; state.events = []; return e; }
