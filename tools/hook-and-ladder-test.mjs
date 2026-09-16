#!/usr/bin/env node
// Headless rules test for /hook-and-ladder/ (engine.mjs). Run after any engine edit:
//   node tools/hook-and-ladder-test.mjs
// Proves the rules are correct (layout, articulated kinematics, tiller effect,
// collisions, dispatch fairness, ladder flow, lives). It says nothing about feel.
import {
  truckBodies, createGame, startGame, step, drainEvents, buildWorld, mulberry32, tileAt, truckCollides,
  streetDistance, canRaiseLadder, serviceZones, roofPoint, aimDistance, rescueBlocked, turntable, wrapAngle, burnTimeFor,
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
  g.truck.x = W / 2; g.truck.y = H / 4;
  run(g, 1.2, { gas: true, steer: 1 });
  const art = wrapAngle(g.truck.h1 - g.truck.h2);
  check('right turn raises heading', g.truck.h1 > 0.3, deg(g.truck.h1).toFixed(1));
  check('trailer lags inside the turn', art > 0.15, deg(art).toFixed(1));
  check('articulation clamped', Math.abs(art) <= RULES.maxArticulation + 1e-9);
  run(g, 5, { gas: true });
  check('trailer realigns on the straight', Math.abs(wrapAngle(g.truck.h1 - g.truck.h2)) < 2 * Math.PI / 180, deg(wrapAngle(g.truck.h1 - g.truck.h2)).toFixed(2));
}
{
  // Jackknife attempt: reverse with full lock for a long time never exceeds the clamp.
  const g = playing(); g.world = openWorld(); g.nextFireIn = 1e9;
  g.truck.x = W / 2; g.truck.y = H / 2;
  let maxArt = 0;
  run(g, 8, s => { maxArt = Math.max(maxArt, Math.abs(wrapAngle(s.truck.h1 - s.truck.h2))); return { brake: true, steer: 1 }; });
  check('reverse full-lock never exceeds max articulation', maxArt <= RULES.maxArticulation + 1e-6, deg(maxArt).toFixed(1));
  check('reverse assist avoids a full jackknife', maxArt < RULES.maxArticulation - .01);
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
  check('passive trailer cuts inside the corner', passive < 35, passive.toFixed(1));
  check('automatic corner assist matches a coordinated tillerman', counter >= passive - 3, `${passive.toFixed(1)} → ${counter.toFixed(1)}`);
}

// Backing must stay controllable with either player steering, including at
// very low speed and after an actual collision in the city.
console.log('reverse handling');
{
  const g = playing(); g.world = openWorld(); g.nextFireIn = 1e9;
  g.truck.x = 600; g.truck.v = 120;
  run(g, .25, { brake: true });
  check('opposite throttle stops before changing direction', g.truck.v === 0);
  run(g, .1, { brake: true });
  check('gear change has a deliberate neutral pause', g.truck.v === 0);
  run(g, .5, { brake: true });
  check('holding S engages reverse after the pause', g.truck.v < -40);
  run(g, .7, { gas: true, brake: true });
  check('conflicting throttle keys stop instead of reversing', g.truck.v === 0);
}
for (const steer of [-1, 0, 1]) for (const tiller of [-1, 0, 1]) {
  const g = playing(); g.world = openWorld(); g.nextFireIn = 1e9;
  g.truck.x = 650; g.truck.y = 340;
  let maxArt = 0;
  run(g, 2, state => {
    maxArt = Math.max(maxArt, Math.abs(wrapAngle(state.truck.h1 - state.truck.h2)));
    return { brake: true, steer, tiller };
  });
  check(`reverse remains stable with both controls ${steer}/${tiller}`, maxArt < 30 * Math.PI / 180, deg(maxArt));
  check(`reverse test actually moves without hitting bounds ${steer}/${tiller}`, g.crashes === 0 && g.truck.v === -RULES.reverseSpeed);
  if (steer) check('reverse steering follows wheel direction', Math.sign(g.truck.h1) === -steer);
  run(g, .5, { handbrake: true });
  const stopped = { ...g.truck };
  run(g, .5, { steer: -1, tiller: 1 });
  check('steering at rest cannot rotate either body', g.truck.h1 === stopped.h1 && g.truck.h2 === stopped.h2);
}
{
  const g = playing(); g.world = openWorld(); g.nextFireIn = 1e9;
  g.truck.x = 600; g.truck.h2 = .4; g.truck.v = -.5;
  run(g, DT, { brake: true });
  check('creeping backward does not whip a bent trailer around', Math.abs(g.truck.h2 - .4) < .002);
  run(g, 1.5, { brake: true, tiller: 1 });
  const bent = Math.abs(wrapAngle(g.truck.h1 - g.truck.h2));
  run(g, 1.5, { brake: true });
  check('releasing P2 straightens the trailer while backing', Math.abs(wrapAngle(g.truck.h1 - g.truck.h2)) < bent * .15);
}
for (const steer of [-1, 1]) {
  const g = playing(3); g.nextFireIn = 1e9; g.truck.x = 440;
  run(g, 3, { gas: true, steer });
  const stuck = { ...g.truck };
  check('back-out scenario starts at a real collision', g.crashes > 0 && g.truck.v === 0);
  run(g, 2, { brake: true });
  check('S backs out of a blocked turn without recovery', Math.hypot(g.truck.x - stuck.x, g.truck.y - stuck.y) > 35 && g.truck.v < -60);
  check('backing out preserves collision clearance', truckCollides(g.world, g.truck) === null);
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
  // If reversing still leaves the crew wedged, recovery gives a safe road pose.
  run(g, 1.5, { brake: true });
  run(g, DT, { recover: true });
  check('recovery frees a wedged truck', truckCollides(g.world, g.truck) === null && g.truck.v === 0);
  check('recovery gives a straight trailer', g.truck.h1 === g.truck.h2);
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

// A crew can make the same city corner with a useful margin for turn timing.
for (const turnAt of [265, 275, 285]) {
  const g = playing(3); g.nextFireIn = 1e9;
  let phase = 0;
  for (let i = 0; i < 650 && g.truck.y < 560 && !g.crashes; i++) {
    if (phase === 0 && g.truck.x >= turnAt) phase = 1;
    if (phase === 1 && g.truck.h1 >= Math.PI / 2 - .09) phase = 2;
    step(g, 1 / 120, phase === 0 ? { gas: true } : phase === 1
      ? { gas: true, steer: 1, tiller: -1 }
      : { gas: true, tiller: g.truck.h2 < 1.1 ? -.6 : 0 });
  }
  check('coordinated 90-degree city turn, start x=' + turnAt, g.truck.y >= 560 && g.crashes === 0);
}

// Arcade handling regressions: controllable straights, brakes and wall contact.
{
  const g = playing(21); g.nextFireIn = 1e9; g.world = openWorld();
  g.truck.h1 = g.truck.h2 = .18;
  run(g, .8, { gas: true });
  check('releasing steering straightens a nearly aligned cab', Math.abs(g.truck.h1) < .005);
  run(g, 1, { handbrake: true });
  check('handbrake stops without reversing', g.truck.v === 0);
  g.truck.h1 = g.truck.h2 = .5;
  run(g, .2, { gas: true });
  check('straightening does not hijack intentional diagonal driving', Math.abs(g.truck.h1 - .5) < 1e-8);
}
{
  const g = playing(22); g.nextFireIn = 1e9; g.world.cars = [];
  g.truck.x = 450; g.truck.y = 388.5; g.truck.v = 150;
  const x = g.truck.x;
  run(g, .15, { gas: true, steer: 1 });
  check('glancing contact slides along a wall', g.truck.x > x + 8 && g.truck.v > 0);
  check('sliding never penetrates the wall', truckCollides(g.world, g.truck) === null);
}
{
  const g = playing(23); g.world = openWorld();
  g.world.cars = [{ x: g.truck.x - 25, y: g.truck.y - 5, w: 10, h: 10 }];
  check('a car underneath the middle of the trailer is detected', truckCollides(g.world, g.truck) === 'trailer');
}

// ---------------------------------------------------------------- response and crew work
console.log('response and crew work');
function deploy(g) {
  run(g, 1);
  const z = g.fire.building.zones[0];
  const horizontal = z.side === 'n' || z.side === 's';
  g.truck.h1 = g.truck.h2 = horizontal ? 0 : Math.PI / 2;
  g.truck.x = z.x + z.w / 2 + (horizontal ? RULES.turntable : 0);
  g.truck.y = z.y + z.h / 2 + (horizontal ? 0 : RULES.turntable);
  g.truck.v = 0;
  // Isolate crew work from geometry; driving geometry has its own tests above.
  g.world.cars = []; g.world.grid.fill(STREET);
  step(g, DT, { ladder: true }); drainEvents(g);
}
function crewInput(g) {
  const L = g.ladder, f = g.fire;
  if (!L || !f) return {};
  const person = f.targets.find(t => t.kind === 'person' && t.hp > 0);
  const fire = person && rescueBlocked(person) ? person.guard : f.targets.find(t => t.kind === 'fire' && t.hp > 0);
  const hose = fire ? roofPoint(fire.at) : L.hose;
  const basket = person ? roofPoint(person.at) : L.basket;
  const axis = (to, from) => Math.abs(to - from) > .025 ? Math.sign(to - from) : 0;
  return {
    hoseX: axis(hose.u, L.hose.u), hoseY: axis(hose.v, L.hose.v),
    rescueX: axis(basket.u, L.basket.u), rescueY: axis(basket.v, L.basket.v),
    spray: !!fire && aimDistance(hose, L.hose) < .12 && !L.dry,
    rescue: !!person && aimDistance(basket, L.basket) < .12,
  };
}
function finishCall(g) {
  return run(g, 28, s => {
    if (!s.fire || !s.ladder || s.ladder.retract) { s.nextFireIn = 1e9; return {}; }
    return crewInput(s);
  });
}
{
  const g = playing(7); run(g, 1);
  check('first call is near the crew', g.fire.dist <= 9, String(g.fire.dist));
  check('first call includes fires and a rescue', g.fire.targets.filter(t => t.kind === 'fire').length === 3 && g.fire.targets.some(t => t.kind === 'person'));
  check('cannot deploy across the city', !canRaiseLadder(g));
  for (const z of serviceZones(g.fire.building)) check('dispatch clears parked cars from service area', !g.world.cars.some(c => c.x < z.x + z.w && c.x + c.w > z.x && c.y < z.y + z.h && c.y + c.h > z.y));
  const z = serviceZones(g.fire.building)[0];
  g.truck.x = z.x + z.w / 2; g.truck.y = z.y + z.h / 2;
  g.truck.h1 = g.truck.h2 = 0; g.truck.v = 80;
  check('high-speed deployment refused', !canRaiseLadder(g));
  g.truck.v = 20;
  check('cab in broad service area at low speed is enough', canRaiseLadder(g));
  step(g, DT, { ladder: true, gas: true });
  check('deploy stops the truck immediately', g.truck.v === 0 && !!g.ladder);
}
{
  const g = playing(8); deploy(g);
  const before = g.fire.t, x = g.truck.x, y = g.truck.y;
  run(g, 3, { gas: true, ladder: true });
  check('old pump key cannot clear fires automatically', g.fire.targets.every(t => t.hp === 1));
  check('emergency clock continues while deployed', g.fire.t < before - 2.9);
  check('driving controls cannot move a deployed truck', g.truck.x === x && g.truck.y === y);
  const person = g.fire.targets.find(t => t.kind === 'person');
  g.ladder.basket = roofPoint(person.at);
  run(g, 2, { rescue: true });
  check('nearby flames prevent an unsafe rescue', person.hp === 1 && rescueBlocked(person));
  g.ladder.hose = roofPoint(person.guard.at);
  run(g, 1.6, { spray: true, rescue: true });
  check('hose clears the fire under its cursor', person.guard.hp === 0);
  check('a rescue can progress while P1 sprays', person.hp < 1);
  const ev = finishCall(g), ex = ev.find(e => e.type === 'extinguished');
  check('both players can finish the whole call', !!ex && g.firesOut === 1);
  check('rescue counted', g.rescued === 1);
  check('score includes rescue and clean bonus', ex && ex.gained === 150 + ex.bonus + 50 + 100 && g.score === ex.gained);
  check('ladder retracts after completion', !g.ladder);
  g.nextFireIn = 0; run(g, DT);
  check('next dispatch is a different building', g.fire && ex && g.fire.building !== ex.building);
}
{
  const g = playing(24); deploy(g);
  const person = g.fire.targets.find(t => t.kind === 'person');
  person.guard.hp = 0; g.ladder.basket = roofPoint(person.at);
  run(g, 3, { rescue: true });
  check('rescues bank points immediately', g.score === 100 && g.rescued === 1);
  g.fire.t = .1; run(g, .2);
  check('a missed call cannot take back rescued-person points', g.score === 100 && g.lives === 2);
}
{
  const g = playing(19); deploy(g);
  g.ladder.hose = { u: .03, v: .04 };
  run(g, 7, { spray: true });
  check('spraying consumes pressure', g.ladder.dry && g.ladder.pressure === 0);
  check('missing the flames does not damage targets', g.fire.targets.every(t => t.hp === 1));
  run(g, 1, { spray: true });
  check('holding an empty hose cannot refill it', g.ladder.pressure === 0);
  run(g, 2, {});
  check('release rebuilds hose pressure', !g.ladder.dry && g.ladder.pressure > .9);
  const oldHose = { ...g.ladder.hose }, oldBasket = { ...g.ladder.basket };
  run(g, .2, { hoseX: 1, rescueY: -1 });
  check('hose and ladder move independently', g.ladder.hose.u > oldHose.u && g.ladder.hose.v === oldHose.v && g.ladder.basket.u === oldBasket.u && g.ladder.basket.v < oldBasket.v);
}
{
  const g = playing(10); deploy(g);
  g.fire.clean = false;
  const ev = finishCall(g), ex = ev.find(e => e.type === 'extinguished');
  check('crash forfeits clean bonus', ex && !ex.clean && ex.gained === 150 + ex.bonus + 100);
}
{
  const g = playing(18); g.firesOut = 2; deploy(g);
  check('later calls add a second rescue', g.fire.targets.filter(t => t.kind === 'person').length === 2);
  const ev = finishCall(g), ex = ev.find(e => e.type === 'extinguished');
  check('later call can be completed with both people rescued', !!ex && g.rescued === 2 && g.firesOut === 3);
}
{
  const g = playing(11); deploy(g);
  g.fire.t = .1; run(g, .2, { gas: true });
  check('time can expire during crew work', !g.fire && !g.ladder && g.lives === 2);
}
{
  const g = playing(9);
  const ev = run(g, 300);
  check('three missed calls end shift', ev.filter(e => e.type === 'burnout').length === 3 && g.status === 'over' && g.lives === 0);
  check('no call after game over', !g.fire);
}
{
  const g = playing(14); run(g, 1);
  const before = g.fire.t;
  run(g, .5, { recover: true });
  check('holding recovery charges only once', Math.abs(g.fire.t - (before - 5.5)) < .001);
  check('recovery is collision-free', truckCollides(g.world, g.truck) === null);
  check('recovery costs clean bonus', !g.fire.clean);
}
{
  const g = playing(15); g.world = openWorld(); g.nextFireIn = 1e9;
  g.truck.x = W / 2; g.truck.y = H / 2; g.truck.v = RULES.maxSpeed;
  let maxYaw = 0;
  run(g, .7, { gas: true, steer: 1 });
  check('arcade turns keep useful forward speed', g.truck.v >= 150 && g.truck.v < RULES.maxSpeed);
  // Inspect successive engine frames instead of just the final heading.
  for (let i = 0; i < 30; i++) { const h = g.truck.h1; step(g, DT, { gas: true, steer: 1 }); maxYaw = Math.max(maxYaw, Math.abs(wrapAngle(g.truck.h1 - h)) / DT); }
  check('steering yaw is capped at 123 degrees/s', maxYaw <= 2.15 + 1e-8);
  check('difficulty ramps but has a time floor', burnTimeFor(20, 0) > burnTimeFor(20, 10) && burnTimeFor(20, 40) === burnTimeFor(20, 60));
}
{
  // Play the entire opening call on the real city, with no teleports or cleared collision grid.
  for (let seed = 1; seed <= 100; seed++) {
    const g = playing(seed);
    for (let i = 0; i < 3600 && !g.firesOut; i++) {
      let input = {};
      if (g.fire && !g.ladder) {
        const z = g.fire.building.zones.find(z => z.side === 's' && z.y === 280);
        if (z) input = g.truck.x < z.x + 5 ? { gas: true } : { brake: true, ladder: true };
      } else if (g.fire && g.ladder) {
        input = crewInput(g);
      }
      step(g, 1 / 120, input);
    }
    check('opening call can be driven and completed without collision, seed ' + seed, g.firesOut === 1 && g.crashes === 0 && g.rescued === 1);
  }
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
