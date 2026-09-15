#!/usr/bin/env node
// Headless rules test for /hook-and-ladder/ (engine.mjs). Run after any engine edit:
//   node tools/hook-and-ladder-test.mjs
// Proves the rules are correct (layout, articulated kinematics, tiller effect,
// collisions, dispatch fairness, ladder flow, lives). It says nothing about feel.
import {
  truckBodies, createGame, startGame, step, drainEvents, buildWorld, mulberry32, tileAt, truckCollides,
  streetDistance, canRaiseLadder, turntable, wrapAngle, burnTimeFor,
  COLS, ROWS, TILE, W, H, STREET, BUILDING, PARK, RULES, isStreetCol, isStreetRow, spawnTruck, PITCH, STREET_W,
} from '../hook-and-ladder/engine.mjs';

let passed = 0, failed = 0;
function check(name, cond, detail = '') { if (cond) { passed++; return; } failed++; console.log('  FAIL', name, detail); }
const DT = 1 / 60;
const deg = r => r * 180 / Math.PI;
function run(state, seconds, inp = {}) {
  const events = [];
  const f = typeof inp === 'function' ? inp : () => inp;
  for (let t = 0; t < seconds - 1e-9; t += DT) { step(state, DT, f(state)); events.push(...drainEvents(state)); }
  return events;
}
function openWorld() {
  // Everything is street: for pure kinematics tests.
  const w = buildWorld(mulberry32(1));
  w.grid.fill(STREET); w.cars = []; w.buildings.forEach(b => { b.zones = []; });
  return w;
}
function playing(seed = 1, mode = 'duo') { const g = createGame({ seed, mode }); startGame(g); return g; }

// ---------------------------------------------------------------- layout
console.log('layout');
for (let seed = 1; seed <= 30; seed++) {
  const w = buildWorld(mulberry32(seed));
  let ok = true, parkCount = 0;
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
    const street = isStreetCol(c) || isStreetRow(r);
    const t = tileAt(w, c, r);
    if (street && t !== STREET) ok = false;
    if (!street && t === STREET) ok = false;
    if (t === PARK) parkCount++;
  }
  check('streets on the 7-tile pitch, blocks solid (seed ' + seed + ')', ok);
  check('one park', parkCount === 16, String(parkCount));
  check('7 blocks of buildings', w.buildings.length >= 14 && w.buildings.length <= 28, String(w.buildings.length));
  for (const b of w.buildings) {
    check('building faces a street', b.zones.length >= 2, `#${b.id} ${b.zones.length}`);
    for (const z of b.zones) {
      let zoneOk = true;
      for (let y = z.y; y < z.y + z.h; y += TILE) for (let x = z.x; x < z.x + z.w; x += TILE) if (tileAt(w, x / TILE, y / TILE) !== STREET) zoneOk = false;
      check('zone lies on street tiles', zoneOk, `#${b.id} ${z.side}`);
    }
    let onBuilding = true;
    for (let r = 0; r < b.h; r++) for (let c = 0; c < b.w; c++) if (tileAt(w, b.col + c, b.row + r) !== BUILDING) onBuilding = false;
    check('building tiles solid', onBuilding);
  }
  let carsOk = true;
  for (const c of w.cars) {
    const inside = c.x >= 0 && c.y >= 0 && c.x + c.w <= W && c.y + c.h <= H;
    const corners = [[c.x, c.y], [c.x + c.w, c.y], [c.x, c.y + c.h], [c.x + c.w, c.y + c.h]];
    if (!inside || corners.some(([x, y]) => tileAt(w, Math.floor(x / TILE), Math.floor(y / TILE)) !== STREET)) carsOk = false;
    if (c.dir === 'h' ? c.h > 20 : c.w > 20) carsOk = false;
    // never at a block corner tile: the along-street tile index within the block edge is 1 or 2
    const along = c.dir === 'h' ? Math.floor((c.x + c.w / 2) / TILE) : Math.floor((c.y + c.h / 2) / TILE);
    if ((along - STREET_W) % PITCH === 0 || (along - STREET_W) % PITCH === 3) carsOk = false;
    // never on the outer ring
    if (c.x < STREET_W * TILE || c.y < STREET_W * TILE || c.x + c.w > W - STREET_W * TILE || c.y + c.h > H - STREET_W * TILE) carsOk = false;
  }
  check('parked cars sit on street tiles, hugging the curb, clear of the corners', carsOk);
  const g = createGame({ seed });
  check('spawn is collision-free', truckCollides(g.world, g.truck) === null);
  check('every building reachable from spawn', w.buildings.every(b => streetDistance(w, g.truck.x, g.truck.y, b.zones) > 0));
}

// ---------------------------------------------------------------- kinematics
console.log('kinematics');
{
  const g = playing(); g.world = openWorld(); g.nextFireIn = 1e9;
  run(g, 3, { gas: true });
  check('gas reaches top speed', Math.abs(g.truck.v - RULES.maxSpeed) < 1e-6, String(g.truck.v));
  check('drives east', g.truck.x > spawnTruck().x + 300 && Math.abs(g.truck.y - spawnTruck().y) < 1e-6);
  check('trailer stays straight', Math.abs(g.truck.h2) < 1e-9);
  run(g, 2, { brake: true });
  check('brake then reverse', g.truck.v < 0 && g.truck.v >= -RULES.reverseSpeed - 1e-9, String(g.truck.v));
  run(g, 3, {});
  check('coasts to a stop', g.truck.v === 0);
}
{
  // Steer right (positive) → heading increases (clockwise on screen); passive trailer lags then realigns.
  const g = playing(); g.world = openWorld(); g.nextFireIn = 1e9;
  g.truck.x = W / 2; g.truck.y = H / 2;
  run(g, 1.2, { gas: true, steer: 1 });
  const art = wrapAngle(g.truck.h1 - g.truck.h2);
  check('right turn raises heading', g.truck.h1 > 0.3, deg(g.truck.h1).toFixed(1));
  check('trailer lags inside the turn', art > 0.15, deg(art).toFixed(1));
  check('articulation clamped', Math.abs(art) <= RULES.maxArticulation + 1e-9);
  run(g, 4, { gas: true });
  check('trailer realigns on the straight', Math.abs(wrapAngle(g.truck.h1 - g.truck.h2)) < 2 * Math.PI / 180, deg(wrapAngle(g.truck.h1 - g.truck.h2)).toFixed(2));
}
{
  // Jackknife attempt: reverse with full lock for a long time never exceeds the clamp.
  const g = playing(); g.world = openWorld(); g.nextFireIn = 1e9;
  g.truck.x = W / 2; g.truck.y = H / 2;
  let maxArt = 0;
  run(g, 8, s => { maxArt = Math.max(maxArt, Math.abs(wrapAngle(s.truck.h1 - s.truck.h2))); return { brake: true, steer: 1 }; });
  check('reverse full-lock never exceeds max articulation', maxArt <= RULES.maxArticulation + 1e-6, deg(maxArt).toFixed(1));
  check('… and does reach it', maxArt >= RULES.maxArticulation - 1e-6);
}
{
  // Tiller right on a straight → tail swings to the truck's right (+y when heading east),
  // settling at h1 − h2 = tiller (the analytic equilibrium).
  const g = playing(); g.world = openWorld(); g.nextFireIn = 1e9;
  g.truck.x = W / 4; g.truck.y = H / 2;
  run(g, 5, { gas: true, tiller: 1 });
  const rearY = g.truck.y - Math.sin(g.truck.h2) * RULES.L2;
  check('tiller right swings the tail right', rearY > g.truck.y + 20, (rearY - g.truck.y).toFixed(1));
  check('tail settles at tiller angle', Math.abs(wrapAngle(g.truck.h1 - g.truck.h2) - RULES.maxTiller) < 1.5 * Math.PI / 180, deg(wrapAngle(g.truck.h1 - g.truck.h2)).toFixed(2));
  check('cab unaffected by the tiller', Math.abs(g.truck.h1) < 1e-9);
  check('solo mode ignores the tiller', (() => { const s = playing(2, 'solo'); s.world = openWorld(); s.nextFireIn = 1e9; run(s, 2, { gas: true, tiller: 1 }); return s.truck.tiller === 0 && Math.abs(s.truck.h2) < 1e-9; })());
}
{
  // The point of the game: through a 90° corner, counter-steering the tiller
  // (left in a right turn) keeps the trailer's inner corner clear of the apex.
  function cornerClearance(tiller) {
    const g = playing(); g.world = openWorld(); g.nextFireIn = 1e9;
    g.truck.x = W / 2; g.truck.y = H / 4;
    run(g, 2, { gas: true });
    const R = RULES.L1 / Math.tan(RULES.maxSteer);
    const cx = g.truck.x, cy = g.truck.y + R;   // apex of a right turn from heading east
    let minD = Infinity, phase = 'turn';
    run(g, 3, s => {
      if (phase === 'turn' && s.truck.h1 >= Math.PI / 2) phase = 'straight';
      for (const p of truckBodies(s.truck).trailer) minD = Math.min(minD, Math.hypot(p[0] - cx, p[1] - cy));
      return phase === 'turn' ? { gas: true, steer: 1, tiller } : { gas: true, tiller: s.t < 4.5 ? tiller : 0 };
    });
    return minD;
  }
  const passive = cornerClearance(0), counter = cornerClearance(-1);
  check('passive trailer sweeps the apex', passive < 15, passive.toFixed(1));
  check('counter-steered tiller keeps the tail clear', counter > passive + 15, `${passive.toFixed(1)} → ${counter.toFixed(1)}`);
}

// ---------------------------------------------------------------- collisions
console.log('collisions');
{
  const g = playing(3); g.nextFireIn = 1e9;
  // Hard left off the spawn street drives the cab into the block above it.
  g.truck.x = 11 * TILE;
  const ev = run(g, 3, { gas: true, steer: -1 });
  const crash = ev.find(e => e.type === 'crash');
  check('driving into a building crashes', !!crash);
  check('crash names the part', crash && (crash.part === 'tractor' || crash.part === 'trailer'));
  check('truck is restored to a free pose', truckCollides(g.world, g.truck) === null);
  check('crash stops the truck', g.truck.v <= 1e-9 && g.stun >= 0);
  check('crash is counted', g.crashes >= 1);
  // Reversing straight out is always possible.
  const yAtCrash = g.truck.y;
  const ev2 = run(g, 1.5, { brake: true });
  check('reverse frees the truck without a second crash', !ev2.some(e => e.type === 'crash'));
  check('reversed away from the wall', g.truck.y > yAtCrash + 10);
}
{
  // Drag the tail through a parked car with the tiller: trailer crash.
  const g = playing(5); g.nextFireIn = 1e9;
  g.world.cars = [{ x: g.truck.x - 60, y: g.truck.y + 26, w: 34, h: 17, dir: 'h' }];
  const ev = run(g, 4, { gas: true, tiller: 1 });
  const crash = ev.find(e => e.type === 'crash');
  check('tail swung into a parked car crashes the trailer', crash && crash.part === 'trailer', crash && crash.part);
}
{
  const g = playing(4); g.nextFireIn = 1e9;
  g.truck.x = 5; g.truck.h1 = g.truck.h2 = Math.PI;
  const ev = run(g, 1, { gas: true });
  check('map edge is solid', ev.some(e => e.type === 'crash'));
}

// ---------------------------------------------------------------- fires
console.log('fires');
{
  const g = playing(7);
  const ev = run(g, 1, {});
  const d = ev.find(e => e.type === 'dispatch');
  check('a fire is dispatched shortly after start', !!d && g.fire && g.fire.building.state === 'burning');
  check('burn time within bounds', g.fire.total >= 14 && g.fire.total <= 60, String(g.fire.total));
  check('fire is not next door', g.fire.dist >= RULES.minDispatchTiles, String(g.fire.dist));
  check('ladder refused when not parked', !canRaiseLadder(g));
  run(g, 0.5, { ladder: true });
  check('ladder key ignored away from the zone', !g.ladder);
  // Teleport the turntable into the zone, still rolling → refused; stopped → deploys.
  const z = g.fire.building.zones[0];
  const zx = z.x + z.w / 2, zy = z.y + z.h / 2;
  g.truck.h1 = g.truck.h2 = 0; g.truck.x = zx + RULES.turntable; g.truck.y = zy;
  g.truck.v = 40;
  check('rolling through the zone does not count', !canRaiseLadder(g));
  g.truck.v = 0;
  check('parked in the zone counts', canRaiseLadder(g));
  const before = g.fire.t, score0 = g.score;
  const ev2 = run(g, RULES.ladderTime + 0.1, { ladder: true, gas: true });
  check('ladder deploys', ev2.some(e => e.type === 'deploy'));
  const ex = ev2.find(e => e.type === 'extinguished');
  check('fire is put out', !!ex && g.fire === null && ex.building.state === 'saved');
  check('gas is ignored while the ladder is up', g.truck.x === zx + RULES.turntable);
  check('clock freezes while the ladder is up; score = 100 + 5/s left + clean 50', ex && ex.gained === 100 + Math.round(before) * 5 + 50, ex && `${ex.gained} vs ${100 + Math.round(before) * 5 + 50}`);
  check('score banked', g.score - score0 === (ex && ex.gained));
  check('fires-out counter', g.firesOut === 1);
  run(g, RULES.retractTime + RULES.betweenFires + 0.2, {});
  check('ladder retracts and the next alarm comes', g.ladder === null && g.fire && g.fire.building !== ex.building);
}
{
  // A crash during the call forfeits the clean bonus.
  const g = playing(8); run(g, 1, {});
  g.fire.clean = false;
  const z = g.fire.building.zones[0];
  g.truck.h1 = g.truck.h2 = 0; g.truck.x = z.x + z.w / 2 + RULES.turntable; g.truck.y = z.y + z.h / 2; g.truck.v = 0;
  const ev = run(g, RULES.ladderTime + 0.1, { ladder: true });
  const ex = ev.find(e => e.type === 'extinguished');
  check('no clean bonus after a crash', ex && ex.clean === false && ex.gained === 100 + ex.bonus);
}
{
  // Burnouts cost a building; three end the run.
  const g = playing(9);
  let overAt = null;
  const ev = run(g, 200, s => { if (s.status === 'over' && overAt === null) overAt = s.t; return {}; });
  const burn = ev.filter(e => e.type === 'burnout');
  check('three burnouts', burn.length === 3, String(burn.length));
  check('ruined buildings stay ruined', burn.every(e => e.building.state === 'ruined'));
  check('game over after the third', g.status === 'over' && g.lives === 0 && ev.some(e => e.type === 'gameover'));
  check('no fourth fire after game over', !g.fire);
  const gameover = ev.find(e => e.type === 'gameover');
  check('gameover carries the score', gameover && gameover.score === g.score && gameover.fires === 0);
}
{
  // Fairness: straight-line travel at top speed never needs more than 40% of the clock.
  let worst = 0, n = 0;
  for (let seed = 20; seed < 60; seed++) {
    const g = playing(seed); run(g, 1, {});
    const need = g.fire.dist * TILE / RULES.maxSpeed;
    worst = Math.max(worst, need / g.fire.total); n++;
  }
  check('dispatch clock is fair', worst <= 0.4, worst.toFixed(2));
  check('difficulty ramps but floors', burnTimeFor(20, 0) > burnTimeFor(20, 10) && burnTimeFor(20, 40) === burnTimeFor(20, 60));
}
{
  // Determinism: same seed, same inputs → same run.
  const a = playing(11), b = playing(11);
  const ea = run(a, 20, { gas: true, steer: 0.3 }), eb = run(b, 20, { gas: true, steer: 0.3 });
  check('deterministic for a seed', JSON.stringify(ea.map(e => [e.type, e.building && e.building.id])) === JSON.stringify(eb.map(e => [e.type, e.building && e.building.id])) && a.truck.x === b.truck.x);
}
{
  const g = createGame({ seed: 12 });
  run(g, 5, { gas: true });
  check('nothing moves before start', g.truck.x === spawnTruck().x && !g.fire);
  startGame(g); g.paused = true; run(g, 5, { gas: true });
  check('pause freezes the clock', g.t === 0 && g.truck.v === 0);
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
