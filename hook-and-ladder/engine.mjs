// Hook & Ladder — pure rules. No DOM, no timers, no rendering.
// A tillered aerial ladder truck: the driver steers the tractor's front
// wheels, the tillerman steers the trailer's rear wheels. Fires break out
// around a city grid; drive and park the rig before time runs out. Headless-tested by tools/hook-and-ladder-test.mjs.

export const TILE = 40;
export const COLS = 62;
export const ROWS = 17;
export const PITCH = 7;       // street (3 tiles) + block (4 tiles)
export const STREET_W = 3;
export const W = COLS * TILE;
export const H = ROWS * TILE;

export const STREET = 0, BUILDING = 1, PARK = 2;

const DEG = Math.PI / 180;
export const RULES = {
  maxSpeed: 210,        // px/s forward
  reverseSpeed: 68,
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
  L2: 78,               // hitch (tractor rear axle) → trailer rear axle
  trailerFront: 6,      // body ahead of the hitch
  trailerBack: 12,      // body behind the rear axle
  width: 25,
  turntable: 40,        // distance behind the hitch, centre of the ladder base
  stunTime: 0,
  betweenFires: 1.6,
  lives: 3,
  minDispatchTiles: 12,
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
export function isStreetCol(c) { return c >= 56 || c % PITCH < STREET_W; }
export function isStreetRow(r) { return r % PITCH < STREET_W; }
export const BLOCKS_X = 8, BLOCKS_Y = 2;
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

  // Staggered utility vans create short slaloms on selected inner streets.
  // They occupy opposing curb lanes, never the full road or an intersection.
  for(let bx=2;bx<BLOCKS_X-1;bx+=2){
    const x=(STREET_W+bx*PITCH)*TILE;
    for(let i=cars.length-1;i>=0;i--){const c=cars[i];if(c.x<x+145&&c.x+c.w>x+15&&c.y<396&&c.y+c.h>280)cars.splice(i,1);}
    cars.push({x:x+20,y:284,w:52,h:34,dir:'h',color:'#d4ae66',work:true});
    cars.push({x:x+90,y:362,w:52,h:34,dir:'h',color:'#d4ae66',work:true});
  }
  const traffic = [];
  for (const b of blocks) {
    const route = { left: (b.bx * PITCH + 1.5) * TILE + 18,
      top: (b.by * PITCH + 1.5) * TILE + 18, size: PITCH * TILE - 36 };
    const car = { route, distance: rng() * (route.size * 4), speed: 44 + rng() * 24, color: CAR_COLORS[Math.floor(rng()*CAR_COLORS.length)] };
    Object.assign(car, trafficPose(car, car.distance));
    if(!cars.some(c=>car.x<c.x+c.w&&car.x+car.w>c.x&&car.y<c.y+c.h&&car.y+car.h>c.y))traffic.push(car);
  }
  return { grid, buildings, parks, trees, cars, traffic };
}

// Closed clockwise routes use rounded corners inside intersections. The two
// sides of each street carry opposite directions, with no edge teleportation.
export function trafficPose(car, distance) {
  const { left, top, size } = car.route, radius = 26;
  const straight = size - radius * 2, quarter = Math.PI * radius / 2;
  const sideLength = straight + quarter, perimeter = sideLength * 4;
  const d = ((distance % perimeter) + perimeter) % perimeter;
  const side = Math.floor(d / sideLength), along = d % sideLength;
  let x, y, heading;
  if (along < straight) { x = radius + along; y = 0; heading = 0; }
  else {
    const a = (along-straight)/radius;
    x=size-radius+Math.sin(a)*radius; y=radius-Math.cos(a)*radius; heading=a;
  }
  for (let i=0;i<side;i++) [x,y]=[size-y,x];
  heading += side*Math.PI/2;
  const w=Math.abs(Math.cos(heading))*34+Math.abs(Math.sin(heading))*17;
  const h=Math.abs(Math.sin(heading))*34+Math.abs(Math.cos(heading))*17;
  return { x:left+x-w/2, y:top+y-h/2, w, h, heading };
}
function moveRecoil(state,car,dt) {
  car.bumpCooldown=Math.max(0,(car.bumpCooldown||0)-dt);
  let vx=car.vx||0,vy=car.vy||0;
  const anchor=car.route?trafficPose(car,car.distance):null;
  const offset=anchor?Math.hypot(anchor.x-car.x,anchor.y-car.y):0;
  if(Math.hypot(vx,vy)<.5&&offset<.05){car.vx=car.vy=0;return false;}
  // Traffic eases back into its lane after the recoil settles. Parked cars
  // remain where the impact pushed them.
  if(anchor&&Math.hypot(vx,vy)<8){vx=(anchor.x-car.x)*2;vy=(anchor.y-car.y)*2;}
  const steps=Math.max(1,Math.ceil(Math.hypot(vx,vy)*dt/2));
  const bodies=Object.values(truckBodies(state.truck,2));
  for(let i=0;i<steps;i++){
    const x=car.x+vx*dt/steps,y=car.y+vy*dt/steps;
    let blocked=x<0||y<0||x+car.w>W||y+car.h>H;
    for(let r=tileOf(y);r<=tileOf(y+car.h-.001);r++)for(let c=tileOf(x);c<=tileOf(x+car.w-.001);c++)if(tileAt(state.world,c,r)!==STREET)blocked=true;
    if(bodies.some(poly=>overlapsRect(poly,x,y,car.w,car.h)))blocked=true;
    if([...state.world.cars,...(state.world.traffic||[])].some(other=>other!==car&&x<other.x+other.w&&x+car.w>other.x&&y<other.y+other.h&&y+car.h>other.y))blocked=true;
    if(blocked){vx*=-.2;vy*=-.2;break;}
    car.x=x;car.y=y;
  }
  car.vx=vx*Math.exp(-5*dt);car.vy=vy*Math.exp(-5*dt);
  return true;
}
export function stepTraffic(state, dt) {
  const traffic=state.world.traffic || [], bodies=Object.values(truckBodies(state.truck, -5));
  for(const car of state.world.cars)moveRecoil(state,car,dt);
  for (const car of traffic) {
    if(moveRecoil(state,car,dt))continue;
    const ahead=trafficPose(car,car.distance+car.speed*dt+26);
    const next=trafficPose(car,car.distance+car.speed*dt);
    const blocked=[next,ahead].some(p=>bodies.some(poly=>overlapsRect(poly,p.x,p.y,p.w,p.h))) ||
      [...state.world.cars,...traffic].some(other=>other!==car && ahead.x<other.x+other.w+5 && ahead.x+ahead.w>other.x-5 && ahead.y<other.y+other.h+5 && ahead.y+ahead.h>other.y-5);
    if (!blocked) { car.distance+=car.speed*dt; Object.assign(car,trafficPose(car,car.distance)); }
  }
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
// Minimum separating axis points away from the obstacle toward the truck.
function contactNormal(poly,x,y,w,h) {
  const box=[[x,y],[x+w,y],[x+w,y+h],[x,y+h]];
  let depth=Infinity,normal=[0,0];
  for(const axis of [[1,0],[0,1],[poly[1][0]-poly[0][0],poly[1][1]-poly[0][1]],[poly[2][0]-poly[1][0],poly[2][1]-poly[1][1]]]){
    const length=Math.hypot(...axis),ax=axis[0]/length,ay=axis[1]/length;
    const a=poly.map(p=>p[0]*ax+p[1]*ay),b=box.map(p=>p[0]*ax+p[1]*ay);
    const positive=Math.max(...b)-Math.min(...a),negative=Math.max(...a)-Math.min(...b);
    if(Math.min(positive,negative)<depth){depth=Math.min(positive,negative);normal=positive<negative?[ax,ay]:[-ax,-ay];}
  }
  return normal;
}
export function truckCollides(world,tr){return truckContact(world,tr)?.part || null;}
function truckContact(world, tr) {
  // A small body inset forgives paint-to-curb contact. Exact rectangle overlap
  // catches parked cars anywhere under a trailer, not just at sampled corners.
  for (const [name,poly] of Object.entries(truckBodies(tr, 2))) {
    const xs=poly.map(p=>p[0]),ys=poly.map(p=>p[1]);
    const left=Math.min(...xs),right=Math.max(...xs),top=Math.min(...ys),bottom=Math.max(...ys);
    if(left<0)return {part:name,n:[1,0]};
    if(right>W)return {part:name,n:[-1,0]};
    if(top<0)return {part:name,n:[0,1]};
    if(bottom>H)return {part:name,n:[0,-1]};
    for(let r=tileOf(top);r<=tileOf(bottom);r++)for(let c=tileOf(left);c<=tileOf(right);c++){
      if(tileAt(world,c,r)!==STREET&&overlapsRect(poly,c*TILE,r*TILE,TILE,TILE))return {part:name,n:contactNormal(poly,c*TILE,r*TILE,TILE,TILE)};
    }
    for(const car of [...world.cars, ...(world.traffic || [])]){
      if(car.x>right||car.x+car.w<left||car.y>bottom||car.y+car.h<top)continue;
      if(overlapsRect(poly,car.x,car.y,car.w,car.h))return {part:name,car,n:contactNormal(poly,car.x,car.y,car.w,car.h)};
    }
  }
  return null;
}

// Sweep both bodies, including the tail's rotation, to the first contact.
// Small travel samples prevent tunnelling; bisection finds the last clear pose.
function sweepTruck(world,from,to) {
  const dh1=wrapAngle(to.h1-from.h1),dh2=wrapAngle(to.h2-from.h2);
  const distance=Math.hypot(to.x-from.x,to.y-from.y)+Math.max(Math.abs(dh1)*52,Math.abs(dh2)*(RULES.L2+RULES.trailerBack));
  const count=Math.max(1,Math.ceil(distance/2));
  const at=t=>({x:from.x+(to.x-from.x)*t,y:from.y+(to.y-from.y)*t,h1:from.h1+dh1*t,h2:from.h2+dh2*t});
  let clear=0;
  for(let i=1;i<=count;i++){
    const t=i/count,contact=truckContact(world,at(t));
    if(contact){
      let lo=clear,hi=t;
      for(let j=0;j<12;j++){const mid=(lo+hi)/2;if(truckContact(world,at(mid)))hi=mid;else lo=mid;}
      return {pose:at(lo),contact,t:lo};
    }
    clear=t;
  }
  return {pose:to,contact:null,t:1};
}

// Arcade steering: a fast rack, stable straights and a following rear axle.
// P2 can deliberately swing the tail; an unsteered tail gets corner assistance.
export function stepTruck(state, inp, dt) {
  const tr = state.truck, R = RULES;
  state.scraping = false; state.contactImpact=0;
  if (state.fire?.crew) { tr.v=0; return null; }
  const steering = Math.max(-1, Math.min(1, inp.steer || 0));
  const steerT = steering * R.maxSteer;
  tr.steer = approach(tr.steer, steerT, (steerT ? R.steerRate : R.steerReturn) * dt);
  const manual = inp.tiller || 0;
  const assist = tr.v >= 0 && !manual ? -steering * .35 : 0;
  tr.tiller = approach(tr.tiller, (manual || assist) * R.maxTiller, R.tillerRate * dt);
  // Opposite throttle first stops the truck, then engages the other direction.
  // This also makes a short tap of S a brake instead of an accidental reverse.
  tr.shiftWait = Math.max(0, (tr.shiftWait || 0) - dt);
  const direction = inp.brake ? -1 : inp.gas ? 1 : 0;
  if (inp.handbrake || (inp.brake && inp.gas)) {
    tr.v = approach(tr.v, 0, R.brake * 1.5 * dt);
    tr.shiftWait = 0;
  } else if (direction && tr.v * direction < 0) {
    tr.v = approach(tr.v, 0, R.brake * dt);
    if (tr.v === 0) tr.shiftWait = .16;
  } else if (direction && tr.shiftWait === 0) {
    const target = direction < 0 ? -R.reverseSpeed : R.maxSpeed * (state.upgrades?.engine ? 1.15 : 1) * (1 - (state.damage || 0)*.002) - Math.abs(steering) * 55;
    tr.v = approach(tr.v, target, (direction < 0 ? 150 : R.accel) * dt);
  } else tr.v = approach(tr.v, 0, R.coast * dt);
  if (Math.abs(tr.v) < .1) { tr.v = 0; return null; }

  const prev = { x: tr.x, y: tr.y, h1: tr.h1, h2: tr.h2 };
  const yaw = tr.v / (tr.v < 0 ? 72 : R.L1) * Math.tan(tr.steer);
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
  tr.h2 += trailerYaw * dt;
  const art = wrapAngle(tr.h1 - tr.h2);
  // The hitch stops further folding; never rotate the trailer into a new pose.
  if (Math.abs(art) > R.maxArticulation && Math.abs(art) > Math.abs(wrapAngle(prev.h1 - prev.h2))) {
    Object.assign(tr, prev); tr.v = 0; return null;
  }
  tr.h1 = wrapAngle(tr.h1); tr.h2 = wrapAngle(tr.h2);

  const desired={x:tr.x,y:tr.y,h1:tr.h1,h2:tr.h2};
  let result=sweepTruck(state.world,prev,desired);
  if(!result.contact)return null;
  const hit=result.contact.part,normal=result.contact.n;
  // Measure motion into the surface at the struck body, including rotation.
  const before=truckBodies(prev,2)[hit],after=truckBodies(desired,2)[hit];
  state.contactImpact=Math.max(0,...before.map((p,i)=>-((after[i][0]-p[0])*normal[0]+(after[i][1]-p[1])*normal[1])/dt));
  const car=result.contact.car;
  if(car&&state.contactImpact>8&&!(car.bumpCooldown>0)){
    const impulse=Math.min(180,state.contactImpact*.8);
    car.vx=(car.vx||0)-normal[0]*impulse;car.vy=(car.vy||0)-normal[1]*impulse;
    car.bumpCooldown=.25;
  }
  let pose=result.pose;
  for(let i=0;i<3&&result.contact;i++){
    const [nx,ny]=result.contact.n;
    const dx=desired.x-pose.x,dy=desired.y-pose.y,inward=Math.min(0,dx*nx+dy*ny);
    const slide={...pose,x:pose.x+dx-inward*nx,y:pose.y+dy-inward*ny};
    result=sweepTruck(state.world,pose,slide);pose=result.pose;
  }
  Object.assign(tr,pose);
  const wanted=Math.hypot(desired.x-prev.x,desired.y-prev.y);
  const moved=Math.hypot(tr.x-prev.x,tr.y-prev.y);
  // Keep tangential speed on a scrape. Head-on impacts settle without bounce.
  const tangent=Math.sqrt(Math.max(0,1-(Math.cos(tr.h1)*normal[0]+Math.sin(tr.h1)*normal[1])**2));
  state.scraping=moved>Math.max(.001,wanted*.15)&&tangent>.3;
  tr.v=state.scraping?tr.v*tangent:0;
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
  return Math.min(120, Math.max(38, (45 + dist * 1.15) * diff));
}

export function dispatchFire(state) {
  const { world, truck } = state;
  const cands = world.buildings.filter(b => b.state !== 'ruined' && b !== state.lastBuilding && b.zones.length);
  const scored = cands.map(b => ({ b, d: streetDistance(world, truck.x, truck.y, serviceZones(b)) })).filter(o => o.d >= RULES.minDispatchTiles);
  const pool = scored.length ? scored : cands.map(b => ({ b, d: Math.max(1, streetDistance(world, truck.x, truck.y, serviceZones(b))) }));
  const pick = pool[Math.floor(state.rng() * pool.length)];
  pick.b.state = 'burning';
  const patterns=[
    {title:'APARTMENT RESCUE',kinds:['person','fire']},
    {title:'WAREHOUSE FIRE',kinds:['fire','person','fire']},
    {title:'ROOFTOP EVACUATION',kinds:['person','fire','person']},
    {title:'TIGHT ACCESS',kinds:['fire','person'],tight:true},
  ];
  const index=state.dispatches||0,pattern=patterns[index%patterns.length];state.dispatches=index+1;
  const total=burnTimeFor(pick.d,state.firesOut)+(pattern.kinds.length-2)*12;
  const targets=pattern.kinds.map((kind,i)=>({at:index===0?(i===0?.25:.65):.10+i*.72/(pattern.kinds.length-1),kind,hp:1}));
  const approach=index===0?null:pick.b.zones[index%pick.b.zones.length].side;
  state.fire={building:pick.b,number:index+1,title:pattern.title,t:total,total,dist:pick.d,clean:true,targets,approach,tight:!!pattern.tight};
  // Clear the service frontage so a mission never asks players to park on a car.
  const zones = callZones(state);
  state.fire.dist=streetDistance(world,truck.x,truck.y,zones);
  state.fire.total=state.fire.t=burnTimeFor(state.fire.dist,state.firesOut)+(targets.length-2)*12+(pattern.tight?8:0);
  world.cars = world.cars.filter(c => !zones.some(z => c.x < z.x + z.w && c.x + c.w > z.x && c.y < z.y + z.h && c.y + c.h > z.y));
  state.lastBuilding = pick.b;
  state.events.push({ type: 'dispatch', building: pick.b, time: total });
}

export function serviceZones(building) {
  return building.zones.map(z => {
    const horizontal = z.side === 'n' || z.side === 's';
    return { ...z,
      x: z.x - (horizontal ? 50 : z.side === 'w' ? 40 : 0),
      y: z.y - (!horizontal ? 50 : z.side === 'n' ? 40 : 0),
      w: z.w + (horizontal ? 100 : 40), h: z.h + (horizontal ? 40 : 100),
    };
  });
}
export function callZones(state) {
  if(!state.fire)return [];
  return serviceZones(state.fire.building).filter(z=>!state.fire.approach||z.side===state.fire.approach).map(z=>{
    if(!state.fire.tight)return z;
    const horizontal=z.side==='n'||z.side==='s';
    return {...z,x:z.x+12,y:z.y+12,w:z.w-24,h:z.h-24};
  });
}
// Road-centre guidance avoids routing a long vehicle diagonally through blocks.
export function routeToCall(state) {
  if(!state.fire)return [];
  const world=state.world,start=tileOf(state.truck.y)*COLS+tileOf(state.truck.x);
  const zones=callZones(state),prev=new Int32Array(COLS*ROWS).fill(-1),queue=[start];prev[start]=start;
  let end=-1;
  for(let i=0;i<queue.length;i++){
    const n=queue[i],c=n%COLS,r=Math.floor(n/COLS),x=(c+.5)*TILE,y=(r+.5)*TILE;
    if(zones.some(z=>x>=z.x&&x<=z.x+z.w&&y>=z.y&&y<=z.y+z.h)){end=n;break;}
    const onCentre=c%PITCH===1||r%PITCH===1;
    const adjacent=[[1,0],[-1,0],[0,1],[0,-1]].sort((a,b)=>{
      const centre=(dc,dr)=>(c+dc)%PITCH===1||(r+dr)%PITCH===1;
      return Number(centre(...b))-Number(centre(...a));
    });
    for(const [dc,dr]of adjacent){
      const nc=c+dc,nr=r+dr,next=nr*COLS+nc;
      if(nc<0||nr<0||nc>=COLS||nr>=ROWS||prev[next]!==-1||tileAt(world,nc,nr)!==STREET)continue;
      if(onCentre&&nc%PITCH!==1&&nr%PITCH!==1)continue;
      prev[next]=n;queue.push(next);
    }
  }
  if(end===-1)return [];
  const path=[];for(let n=end;;n=prev[n]){path.push({x:(n%COLS+.5)*TILE,y:(Math.floor(n/COLS)+.5)*TILE});if(n===start)break;}
  return path.reverse();
}
export function parkedInZone(state) {
  if (!state.fire) return null;
  const points = [turntable(state.truck), state.truck];
  return callZones(state).find(z => points.some(p =>
    p.x >= z.x && p.x <= z.x + z.w && p.y >= z.y && p.y <= z.y + z.h)) || null;
}
export function readyToPark(state) {
  if (!state.fire || Math.abs(state.truck.v) > 8) return false;
  const tr = state.truck;
  const rear = { x: tr.x - Math.cos(tr.h2) * RULES.L2, y: tr.y - Math.sin(tr.h2) * RULES.L2 };
  return callZones(state).some(z => {
    const heading = z.side === 'n' || z.side === 's' ? 0 : Math.PI / 2;
    const parallel = h => Math.abs(Math.sin(h - heading)) < Math.sin(20 * DEG);
    const inside = p => p.x >= z.x && p.x <= z.x + z.w && p.y >= z.y && p.y <= z.y + z.h;
    return parallel(tr.h1) && parallel(tr.h2) && inside(tr) && inside(rear);
  });
}
export function roofPoint(at) {
  const angle = -Math.PI / 2 + at * Math.PI * 2;
  return { u: .5 + Math.cos(angle) * .32, v: .5 + Math.sin(angle) * .30 };
}
// ---------------------------------------------------------------- game
export function createGame({ seed = (Date.now() % 1e9) >>> 0, upgrades = {} } = {}) {
  const rng = mulberry32(seed);
  const world = buildWorld(rng);
  const truck = spawnTruck();
  // Keep the run-up around the spawn clear of parked cars.
  world.cars = world.cars.filter(c => Math.hypot(c.x + c.w / 2 - truck.x, c.y + c.h / 2 - truck.y) > 6 * TILE);
  world.traffic = world.traffic.filter(c => Math.hypot(c.x-truck.x,c.y-truck.y)>200);
  return {
    seed, rng, world, truck, upgrades: { engine:!!upgrades.engine, armor:!!upgrades.armor, equipment:!!upgrades.equipment },
    status: 'menu', t: 0, paused: false,
    fire: null, nextFireIn: 0.8, lastBuilding: null,
    stun: 0, scraping: false, crashCooldown: 0, recovered: false, crashes: 0, damage: 0, score: 0, firesOut: 0, lives: RULES.lives,
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
  if (inp.recover && !state.recovered) {
    if(state.fire){state.fire.crew=null;state.fire.parked=0;}
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

  if (inp.leave && state.fire) { state.fire.crew=null; state.fire.parked=0; }
  stepTraffic(state, dt);
  const hit = stepTruck(state, inp, dt);
  if (hit) {
    state.stun = RULES.stunTime;
    if (state.crashCooldown === 0 && state.contactImpact > 12) {
      state.crashes++; state.crashCooldown = 1;
      state.damage = Math.min(100, state.damage + Math.ceil(Math.max(1, Math.round((state.contactImpact - 12) * .16)) * (state.upgrades.armor ? .65 : 1)));
      if(state.damage>=100){
        state.status='over'; state.truck.v=0;
        state.events.push({type:'gameover',score:state.score,fires:state.firesOut,reason:'Truck disabled'});
      }
      if (state.fire) state.fire.clean = false;
      state.events.push({ type: 'crash', scrape: state.scraping, part: hit, x: state.truck.x, y: state.truck.y });
    }
  }

  if (state.status === 'over') return;
  // Crew tools operate on the city map with no camera or scene switch.
  if (state.fire) {
    const f=state.fire, b=f.building;
    f.parked = !inp.leave && readyToPark(state) ? (f.parked || 0) + dt : 0;
    if (f.parked>=.4 && !f.crew) {
      state.truck.v=0;
      f.crew={ladder:{u:.5,v:.85},hose:{u:.5,v:.85}};
    }
    if (f.crew) {
      for (const [cursor,dx,dy] of [[f.crew.ladder,inp.ladderX||0,inp.ladderY||0],[f.crew.hose,inp.hoseX||0,inp.hoseY||0]]) {
        const length=Math.max(1,Math.hypot(dx,dy));
        cursor.u=Math.max(.05,Math.min(.95,cursor.u+dx/length*dt*100/(b.w*TILE)));
        cursor.v=Math.max(.05,Math.min(.95,cursor.v+dy/length*dt*100/(b.h*TILE)));
      }
      f.crew.spray=!!inp.spray; f.crew.grab=!!inp.grab;
      for (const target of f.targets) {
        if(target.hp===0)continue;
        const cursor=target.kind==='person'?f.crew.ladder:f.crew.hose, p=roofPoint(target.at);
        const active=target.kind==='person'?inp.grab:inp.spray;
        if(active&&Math.hypot((p.u-cursor.u)*b.w*TILE,(p.v-cursor.v)*b.h*TILE)<25) {
          target.hp=Math.max(0,target.hp-dt*(state.upgrades.equipment?1.5:1)/(target.kind==='person'?.6:1.2));
          if(target.hp===0){target.doneAt=state.t;target.pickup={...cursor};}
        }
      }
    }
    if (f.targets.every(target=>target.hp===0&&state.t-target.doneAt>=.9)) {
      const bonus=Math.round(f.t)*5, gained=200+bonus+(f.clean?150:0);
      state.score+=gained;state.firesOut++;f.building.state='saved';
      state.events.push({type:'extinguished',building:f.building,gained,bonus,clean:f.clean});
      state.fire=null;state.nextFireIn=RULES.betweenFires;
    }
  }
  if (state.fire) {
    if(state.fire.targets.some(target=>target.hp>0))state.fire.t = Math.max(0, state.fire.t - dt);
    if (state.fire.t === 0) {
      const b = state.fire.building; b.state = 'ruined'; state.lives--;
      state.events.push({ type: 'burnout', building: b });
      state.fire = null;
      if (state.lives <= 0) {
        state.status = 'over';
        state.events.push({ type: 'gameover', score: state.score, fires: state.firesOut, reason: 'Three calls missed' });
      } else state.nextFireIn = RULES.betweenFires + 0.6;
    }
  } else {
    state.nextFireIn -= dt;
    if (state.nextFireIn <= 0 && state.status === 'playing') dispatchFire(state);
  }
}

export function drainEvents(state) { const e = state.events; state.events = []; return e; }
