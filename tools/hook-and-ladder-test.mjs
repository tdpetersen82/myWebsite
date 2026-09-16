#!/usr/bin/env node
// Headless rules test for /hook-and-ladder/ (engine.mjs). Run after any engine edit:
//   node tools/hook-and-ladder-test.mjs
// Proves the rules are correct (layout, articulated kinematics, tiller effect,
// collisions, dispatch fairness, ladder flow, lives). It says nothing about feel.
import {
  truckBodies, stepTruck, createGame, startGame, step, drainEvents, buildWorld, mulberry32, tileAt, truckCollides,
  streetDistance, readyToPark, serviceZones, callZones, routeToCall, dispatchFire, roofPoint, stepTraffic, trafficPose, turntable, wrapAngle, burnTimeFor,
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
  w.grid.fill(STREET); w.cars = []; w.traffic = []; w.buildings.forEach(b => { b.zones = []; });
  return w;
}
function playing(seed = 1, mode = 'duo') { const g = createGame({ seed, mode }); startGame(g); g.world.traffic=[]; return g; }

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
  check('15 blocks of buildings', w.buildings.length >= 30 && w.buildings.length <= 60, String(w.buildings.length));
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
    if (!c.work && (c.dir === 'h' ? c.h > 20 : c.w > 20)) carsOk = false;
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
  check('manual tiller increases corner clearance', counter > passive, `${passive.toFixed(1)} → ${counter.toFixed(1)}`);
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
  check('holding S engages reverse after the pause', g.truck.v < -20);
  run(g, .7, { gas: true, brake: true });
  check('conflicting throttle keys stop instead of reversing', g.truck.v === 0);
}
{
  const g = playing(); g.world = openWorld(); g.nextFireIn = 1e9;
  g.truck.x = 650; g.truck.h2 = .25;
  run(g, .5, { brake: true });
  check('reversing does not automatically straighten the trailer', g.truck.h2 > .25);
  const bent = g.truck.h2;
  run(g, 1, { gas: true });
  check('pulling forward straightens the trailer', g.truck.h2 < bent);
  run(g, 1, { handbrake: true });
  const h = g.truck.h2;
  run(g, .3, { tiller: 1 });
  check('rear steering at rest never rotates the trailer', g.truck.h2 === h);
}
for (const tiller of [-1, 1]) {
  const g = playing(); g.world = openWorld(); g.nextFireIn = 1e9; g.truck.x = 650;
  run(g, .7, { brake: true, tiller });
  check('rear wheels guide the tail in reverse', Math.sign(g.truck.h2) === tiller);
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
  check('wall contact slows the truck while allowing sliding', Math.abs(g.truck.v) < 50 && g.stun >= 0);
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
  g.truck.x = 80; g.truck.h1 = g.truck.h2 = Math.PI;
  const ev = run(g, 1.5, { gas: true });
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
      : { gas: true, tiller: Math.max(-1,Math.min(1,((g.truck.h2 < 1.1 ? -.6*RULES.maxTiller : 0)-g.truck.tiller)/(RULES.tillerRate/120))) });
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

// ---------------------------------------------------------------- driving calls
console.log('driving calls');
for (let seed = 1; seed <= 100; seed++) {
  const g = playing(seed); run(g, 1);
  check('opening call always requires driving ' + seed, g.fire.dist >= RULES.minDispatchTiles && !parkedInZoneForTest(g));
  run(g, 2, { ladder: true, spray: true, rescue: true });
  check('old action keys cannot finish a stationary call', g.firesOut === 0 && !g.ladder);
  const f = g.fire;
  // Find a physically clear parking pose on the actual generated map.
  let pose;
  for (const z of serviceZones(f.building)) {
    const h = z.side === 'n' || z.side === 's' ? 0 : Math.PI / 2;
    const candidate = { ...spawnTruck(), x: z.x + z.w / 2 + Math.cos(h)*34, y: z.y + z.h / 2 + Math.sin(h)*34, h1:h, h2:h };
    if (!truckCollides(g.world,candidate)) { pose=candidate; break; }
  }
  check('every destination offers clear whole-rig parking ' + seed, !!pose);
  if (!pose) continue;
  g.truck = pose;
  check('aligned parked rig qualifies', readyToPark(g));
  g.truck.v = 30;
  check('driving through cannot count as parking', !readyToPark(g));
  g.truck.v=0; g.truck.h2 += .5;
  check('bent trailer cannot count as parking', !readyToPark(g));
  g.truck.h2=pose.h1;
  run(g,.4);check('parking requires a brief stationary hold',g.firesOut===0);
  run(g,.5);check('parking sets up tools without completing the call',g.firesOut===0&&!!g.fire.crew);
  const order=seed%2?['person','fire']:['fire','person'];
  for(const kind of order){
    const target=f.targets.find(t=>t.kind===kind),p=roofPoint(target.at);
    const cursor=kind==='person'?'ladder':'hose';f.crew[cursor]={...p};
    run(g,1.3,kind==='person'?{grab:true}:{spray:true});
    check('each tool works independently in either order',target.hp===0);
  }
  run(g,1); // Let the basket return and steam finish before the next dispatch.
  check('both jobs finish the call on the map',g.firesOut===1&&g.score>0&&!g.fire);
  const score=g.score;run(g,2);
  check('next call also requires driving',g.fire?.dist>=RULES.minDispatchTiles&&g.score===score);
}
{
  check('map area doubled exactly', W*H===1240*680*2);
}
function parkedInZoneForTest(g) { return serviceZones(g.fire.building).some(z=>g.truck.x>=z.x&&g.truck.x<=z.x+z.w&&g.truck.y>=z.y&&g.truck.y<=z.y+z.h); }
{
  const g=playing();run(g,400);
  check('three missed calls end the shift',g.status==='over'&&g.lives===0);
}
console.log('traffic and damage');
{
  const g=createGame({seed:4});startGame(g);g.nextFireIn=1e9;
  const starts=g.world.traffic.map(c=>c.distance);
  for(let i=0;i<1200;i++)stepTraffic(g,1/60);
  check('traffic makes sustained progress',g.world.traffic.filter((c,i)=>c.distance-starts[i]>150).length>=8);
  let streets=true;
  for(const car of g.world.traffic)for(let d=0;d<1000;d+=5){const p=trafficPose(car,d);for(const [x,y]of[[p.x,p.y],[p.x+p.w,p.y+p.h]])if(tileAt(g.world,Math.floor(x/TILE),Math.floor(y/TILE))!==STREET)streets=false;}
  check('rounded traffic routes remain entirely on streets',streets);
  check('traffic yields without driving into stationary truck',!truckCollides(g.world,g.truck));
  g.world.cars=[];
  const car=g.world.traffic[0];g.world.traffic=[car];const p=trafficPose(car,car.distance+180);
  g.truck={...spawnTruck(),x:p.x+p.w/2,y:p.y+p.h/2,h1:p.heading,h2:p.heading};
  for(let i=0;i<300;i++)stepTraffic(g,1/60);
  check('traffic brakes for a truck occupying its route',!truckCollides(g.world,g.truck));
}
function impact(upgrades={}){
  const g=createGame({seed:3,upgrades});startGame(g);g.nextFireIn=1e9;g.world.traffic=[];
  g.truck.x=W-80;g.truck.v=180;run(g,1,{gas:true});return g;
}
{
 const normal=impact(),armored=impact({armor:true});
 check('collisions damage the truck',normal.damage>0);
 check('bodywork upgrade reduces damage',armored.damage<normal.damage);
 const g=playing();g.world=openWorld();g.nextFireIn=1e9;g.truck.x=W-42;g.damage=99;g.truck.v=180;
 run(g,.1,{gas:true});check('total damage ends the run',g.status==='over'&&g.damage===100);
 const fast=createGame({upgrades:{engine:true}});startGame(fast);fast.world=openWorld();fast.nextFireIn=1e9;run(fast,4,{gas:true});
 check('engine upgrade increases top speed',fast.truck.v>RULES.maxSpeed);
}
{
  const g=createGame({seed:83});startGame(g);run(g,1);
  const z=serviceZones(g.fire.building).find(z=>z.side==='s'&&z.y===280);
  for(let i=0;i<2400&&!g.firesOut;i++){
    let input={};const f=g.fire;
    if(!f.crew)input=g.truck.x<z.x+100?{gas:true}:{handbrake:true};
    else for(const kind of ['person','fire']){
      const target=f.targets.find(t=>t.kind===kind),p=roofPoint(target.at),cursor=kind==='person'?f.crew.ladder:f.crew.hose,prefix=kind==='person'?'ladder':'hose';
      input[prefix+'X']=Math.abs(p.u-cursor.u)>.025?Math.sign(p.u-cursor.u):0;
      input[prefix+'Y']=Math.abs(p.v-cursor.v)>.025?Math.sign(p.v-cursor.v):0;
      input[kind==='person'?'grab':'spray']=true;
    }
    step(g,1/120,input);
  }
  check('full distant drive, park, rescue and spray using controls with traffic',g.firesOut===1&&g.damage===0&&g.score>0, JSON.stringify({calls:g.firesOut,damage:g.damage,x:g.truck.x}));
  const before=g.world.traffic.map(c=>c.distance);g.paused=true;run(g,1);
  check('pause freezes traffic too',g.world.traffic.every((c,i)=>c.distance===before[i]));
}
{
  function equipmentRun(upgraded){
    const g=playing(8);run(g,1);g.upgrades.equipment=upgraded;
    const f=g.fire,target=f.targets.find(t=>t.kind==='fire');f.crew={ladder:{u:.5,v:.5},hose:roofPoint(target.at)};
    run(g,.5,{spray:true});return target.hp;
  }
  check('equipment upgrade speeds spraying by fifty percent',Math.abs((1-equipmentRun(true))/(1-equipmentRun(false))-1.5)<1e-6);
}
console.log('contact resolution');
{
  const g=playing();g.world=openWorld();g.nextFireIn=1e9;
  g.truck.x=600;g.truck.v=210;g.world.cars=[{x:720,y:325,w:4,h:30}];
  const hit=stepTruck(g,{gas:true},1);
  check('swept collision catches thin cars across a long timestep',hit==='tractor'&&g.truck.x<681);
  check('swept contact reaches the obstacle without penetrating',g.truck.x>679&&!truckCollides(g.world,g.truck));
  check('head-on contact removes forward velocity',g.truck.v===0);
  run(g,2,{brake:true});check('reverse immediately frees the truck after impact',g.truck.x<600&&!truckCollides(g.world,g.truck));
}
{
  const g=playing();g.world=openWorld();g.nextFireIn=1e9;
  g.truck.x=W-100;g.truck.v=180;
  run(g,1,{gas:true});const damage=g.damage;
  run(g,4,{gas:true});
  check('holding throttle against a wall does not repeatedly drain health',damage>0&&g.damage===damage);
  check('resting at a wall never penetrates it',!truckCollides(g.world,g.truck));
}
{
  const g=playing();g.world=openWorld();g.nextFireIn=1e9;
  g.world.cars=[{x:500,y:370,w:250,h:20}];g.truck.x=560;g.truck.y=355;g.truck.h1=g.truck.h2=.1;g.truck.v=170;
  let largestStep=0;
  for(let i=0;i<30;i++){const x=g.truck.x,y=g.truck.y;step(g,1/120,{gas:true});largestStep=Math.max(largestStep,Math.hypot(g.truck.x-x,g.truck.y-y));}
  check('glancing collision slides without a sideways teleport',largestStep<2&&g.truck.x>580&&!truckCollides(g.world,g.truck));
}
console.log('car recoil');
function bumpCar(speed){
 const g=playing();g.world=openWorld();g.nextFireIn=1e9;g.truck.x=610;g.truck.v=speed;
 const car={x:650,y:331.5,w:34,h:17};g.world.cars=[car];
 stepTruck(g,{gas:true},1/120);const impulse=car.vx;
 run(g,.5,{handbrake:true});return {g,car,impulse};
}
{
 const slow=bumpCar(40),fast=bumpCar(180);
 check('cars recoil away from the truck',slow.car.x>650&&fast.car.x>slow.car.x);
 check('harder impacts give cars a stronger shove',fast.impulse>slow.impulse);
 check('recoiling cars do not overlap truck',!truckCollides(fast.g.world,fast.g.truck));
 const g=playing();g.world=openWorld();g.nextFireIn=1e9;
 const car={x:W-35,y:100,w:34,h:17,vx:180,vy:0};g.world.cars=[car];
 run(g,1);check('recoil respects the map boundary',car.x>=0&&car.x+car.w<=W);
}
{
 const g=playing();run(g,1);const f=g.fire;
 for(const target of f.targets){target.hp=0;target.doneAt=g.t;target.pickup={u:.5,v:.5};}
 f.t=.05;run(g,.5);
 check('completion animation keeps incident visible',g.fire===f&&g.firesOut===0);
 check('finished jobs cannot burn out during their animation',f.t===.05&&g.lives===RULES.lives);
 run(g,.5);check('completion animation awards the call once',g.firesOut===1&&!g.fire);
}
console.log('routes and call variety');
const callTitles=new Set();
for(let seed=1;seed<=30;seed++)for(let variant=0;variant<4;variant++){
 const g=playing(seed);g.dispatches=variant;dispatchFire(g);callTitles.add(g.fire.title);
 const zones=callZones(g),route=routeToCall(g);
 check('every call variant has a road route',route.length>0);
 check('route never crosses a building',route.every(p=>tileAt(g.world,Math.floor(p.x/TILE),Math.floor(p.y/TILE))===STREET));
 check('route follows contiguous road cells',route.every((p,i)=>!i||Math.abs(p.x-route[i-1].x)+Math.abs(p.y-route[i-1].y)===TILE));
 check('route ends in assigned parking approach',route.length&&zones.some(z=>route.at(-1).x>=z.x&&route.at(-1).x<=z.x+z.w&&route.at(-1).y>=z.y&&route.at(-1).y<=z.y+z.h));
 let pose;
 for(const z of zones){const h=z.side==='n'||z.side==='s'?0:Math.PI/2;for(const sign of [1,-1]){const p={...spawnTruck(),x:z.x+z.w/2+Math.cos(h)*RULES.L2/2*sign,y:z.y+z.h/2+Math.sin(h)*RULES.L2/2*sign,h1:h+(sign<0?Math.PI:0),h2:h+(sign<0?Math.PI:0)};if(!truckCollides(g.world,p)){pose=p;break;}}}
 check('every variant retains a collision-free parking pose',!!pose);
 if(pose){g.truck=pose;check('whole rig fits assigned bay',readyToPark(g));}
 if(variant>0)check('later calls select a specific approach',zones.length===1);
}
check('four different call types rotate',callTitles.size===4);
{
 const g=playing(12);g.dispatches=2;dispatchFire(g);const f=g.fire;
 f.crew={ladder:{u:.5,v:.5},hose:{u:.5,v:.5}};
 for(const target of [...f.targets].reverse()){
  const key=target.kind==='person'?'ladder':'hose';f.crew[key]=roofPoint(target.at);
  run(g,1.3,target.kind==='person'?{grab:true}:{spray:true});check('multi-target call can finish each target independently',target.hp===0);
 }
 run(g,1);check('multi-person rescue completes once',g.firesOut===1);
}
console.log('consistent cars and deliberate controls');
{
 const world=buildWorld(mulberry32(2));
 check('all parked cars share the same physical size',world.cars.every(c=>c.dir==='h'?c.w===34&&c.h===17:c.w===17&&c.h===34));
 const g=playing();g.world=openWorld();g.nextFireIn=1e9;
 run(g,.1,{tiller:1});const angle=g.truck.tiller;
 run(g,.5);check('released tiller holds its angle at rest',g.truck.tiller===angle);
 run(g,.5,{gas:true,steer:-1});check('cab steering cannot override held tiller angle',g.truck.tiller===angle);
 run(g,.1,{tiller:-1});check('opposite input can straighten rear wheels',Math.abs(g.truck.tiller)<1e-6);
 const fresh=playing();fresh.world=openWorld();fresh.nextFireIn=1e9;
 run(fresh,.5,{gas:true});check('half-second throttle does not launch at full speed',Math.abs(fresh.truck.v-35)<1e-6);
 run(fresh,1,{gas:true});check('speed builds progressively halfway through acceleration',Math.abs(fresh.truck.v-105)<1e-6);
 run(fresh,1.5,{gas:true});check('standard truck takes three seconds to reach full speed',Math.abs(fresh.truck.v-RULES.maxSpeed)<1e-6);
}
console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
