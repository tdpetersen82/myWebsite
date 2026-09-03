#!/usr/bin/env node
// Deterministic physics + event-detector tests for the Solar System sim.
// Extracts the /*SS-CORE-START*/../*SS-CORE-END*/ block from the page (so the
// tested code IS the shipped code, no copy drift) and runs it headless.
//
//   node tools/solar-system-sim-test.mjs      exits 1 on any failure

import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../solar-system/index.html', import.meta.url), 'utf8');
const core = html.split('/*SS-CORE-START*/')[1]?.split('/*SS-CORE-END*/')[0];
if (!core) { console.error('SS-CORE markers not found'); process.exit(1); }

function boot(){
  const api = new Function(core + `;
    return {
      G, DT, SUN, planets, EARTH, MOON, bodies,
      reset, advance, warpFactor, aOf, mergeInto, energy, detectPass, seedBelt, keplerProp, lambertV, bestTransfer, KMS,
      state: () => ({ t, comets, belt, storm, probes, E0 }),
      onEmit: f => { EMIT = f; },
      setRate: r => { timeRate = r; },
      addComet: c => { comets.push(c); },
      addProbe: p => { probes.push(p); },
      MARS: planets.find(p => p.name === 'Mars'),
    };`)();
  api.reset();
  return api;
}
const mkComet = (o) => Object.assign({ m: 1e-12, trail: [], name: 'T', _bd: 0, _ubC: 0, _cap: false }, o);
const years = (api, yr, sub = 32) => { const n = Math.ceil(yr / (sub * api.DT)); for (let i = 0; i < n; i++) api.advance(sub, 1); };
const momentum = (api) => {
  let px = 0, py = 0;
  for (const b of api.bodies) if (!b.deleted){ px += b.m * b.vx; py += b.m * b.vy; }
  for (const c of api.state().comets) if (!c.dead){ px += c.m * c.vx; py += c.m * c.vy; }
  return [px, py];
};

let fails = 0;
const ok = (cond, name, detail = '') => {
  console.log((cond ? 'ok   ' : 'FAIL ') + name + (cond ? '' : '  — ' + detail));
  if (!cond) fails++;
};

// ── T1: 5-year stability — energy conserved, every planet stays bound ──
{
  const api = boot();
  const E0 = api.state().E0;
  years(api, 5);
  const drift = Math.abs((api.energy() - E0) / E0);
  ok(drift < 1e-3, 'energy drift < 1e-3 over 5 yr', `drift=${drift.toExponential(2)}`);
  const aE = api.aOf(api.EARTH, api.SUN);
  ok(Math.abs(aE - 1) < 0.01, 'Earth semi-major ≈ 1 AU after 5 yr', `a=${aE.toFixed(4)}`);
  ok(api.planets.every(p => api.aOf(p, api.SUN) > 0), 'all planets still bound');
  ok(Math.abs(api.state().t - 5) < 0.01, 'clock advanced 5 yr');
}

// ── T2: asteroid belt — seeded sane, and stays put for 40 yr of Jupiter stirring ──
{
  const api = boot();
  const belt0 = api.state().belt;
  ok(belt0.length === 240, 'belt seeds 240 particles', `${belt0.length}`);
  const r0 = belt0.map(c => Math.hypot(c.x - api.SUN.x, c.y - api.SUN.y));
  ok(r0.every(r => r > 1.8 && r < 3.5), 'belt radii within 1.8–3.5 AU');
  ok(belt0.every(c => api.aOf(c, api.SUN) > 0), 'belt particles all bound at seed');
  years(api, 40, 128);
  const belt1 = api.state().belt;
  const inBand = belt1.filter(c => { const r = Math.hypot(c.x - api.SUN.x, c.y - api.SUN.y); return r > 1.5 && r < 7; }).length;
  ok(inBand >= 0.85 * 240, 'belt ≥85% survives 40 yr in 1.5–7 AU', `${inBand}/240`);
}

// ── T3: merge conserves mass + momentum exactly ──
{
  const api = boot();
  const b = { m: 3e-6, vx: 1.1, vy: -0.4 }, c = { m: 5e-7, vx: -8, vy: 3 };
  const px = b.m * b.vx + c.m * c.vx, py = b.m * b.vy + c.m * c.vy, M = b.m + c.m;
  api.mergeInto(b, c);
  ok(Math.abs(b.m - M) < 1e-18 && Math.abs(b.m * b.vx - px) < 1e-15 && Math.abs(b.m * b.vy - py) < 1e-15,
    'mergeInto conserves mass and momentum');
}

// ── T4: small impactor — absorbed, one impact event, momentum conserved ──
{
  const api = boot();
  const emits = [];
  api.onEmit((type, d) => emits.push([type, d]));
  api.addComet(mkComet({ m: 1e-8, x: api.EARTH.x + 0.01, y: api.EARTH.y, vx: api.EARTH.vx - 3, vy: api.EARTH.vy }));
  const [px0, py0] = momentum(api);
  const mE0 = api.EARTH.m;
  api.advance(8, 1);
  const impacts = emits.filter(e => e[0] === 'impact');
  ok(impacts.length === 1 && impacts[0][1].target === 'Earth', 'small impactor → exactly one impact event on Earth',
    JSON.stringify(emits));
  ok(api.state().comets.length === 0, 'impactor removed after the hit');
  ok(api.EARTH.m > mE0, 'Earth gained the impactor mass');
  ok(!api.EARTH.deleted, 'Earth survives a small impact');
  const [px1, py1] = momentum(api);
  ok(Math.hypot(px1 - px0, py1 - py0) < 1e-10, 'momentum conserved through the impact');
  ok(impacts.length && impacts[0][1].kms > 5, 'impact reports a plausible km/s', impacts[0] && String(impacts[0][1].kms));
}

// ── T5: massive interloper — consumes the planet (and Earth takes the Moon with it) ──
{
  const api = boot();
  const emits = [];
  api.onEmit((type, d) => emits.push([type, d]));
  api.addComet(mkComet({ m: 1e-4, name: 'Interloper 1', x: api.EARTH.x + 0.01, y: api.EARTH.y, vx: api.EARTH.vx - 3, vy: api.EARTH.vy }));
  api.advance(8, 1);
  const consumed = emits.filter(e => e[0] === 'consumed');
  ok(consumed.length === 1 && consumed[0][1].target === 'Earth', 'interloper → one consumed event for Earth', JSON.stringify(emits));
  ok(api.EARTH.deleted && api.MOON.deleted, 'Earth and Moon both gone');
  const c = api.state().comets[0];
  ok(c && !c.dead && c.m > 1e-4, 'interloper survives, heavier', c && String(c.m));
}

// ── T6: auto-warp predicate ──
{
  const api = boot();
  api.setRate(6);
  ok(api.warpFactor() === 1, 'no comets → no warp');
  api.addComet(mkComet({ x: 22, y: 0, vx: -2, vy: 0 }));
  ok(api.warpFactor() === 8, 'far inbound comet → warp ×8');
  api.setRate(20);
  ok(api.warpFactor() === 4, 'already running fast → gentler ×4');
  api.setRate(6);
  api.state().comets[0].x = 5;
  ok(api.warpFactor() === 1, 'comet inside 8 AU → no warp');
  api.state().comets[0].x = 22; api.state().comets[0].vx = 2;
  ok(api.warpFactor() === 1, 'outbound-only → no warp');
  api.setRate(-6);
  api.state().comets[0].vx = -2;
  ok(api.warpFactor() === 1, 'reverse time → no warp');
}

// ── T7: ejection + Moon-torn detectors fire exactly once ──
{
  const api = boot();
  const emits = [];
  api.onEmit((type, d) => emits.push([type, d]));
  api.EARTH.vx *= 1.7; api.EARTH.vy *= 1.7;      // > escape speed: Earth leaves, Moon left behind
  years(api, 0.6);
  const ejects = emits.filter(e => e[0] === 'eject');
  ok(ejects.length === 1 && ejects[0][1].name === 'Earth', 'boosted Earth → exactly one eject event', JSON.stringify(ejects));
  ok(emits.filter(e => e[0] === 'moontorn').length === 1, 'Moon-torn fires exactly once');
  years(api, 0.4);
  ok(emits.filter(e => e[0] === 'eject').length === 1, 'no repeat eject while it stays unbound');
}

// ── T7b: a slingshot flickering across the bound/unbound line ejects once ──
// (regression: a rogue-star pass re-announced the same planet on every crossing)
{
  const api = boot();
  const emits = [];
  api.onEmit((type, d) => emits.push([type, d]));
  const p = api.EARTH;
  const setUnbound = () => { p.x = 3; p.y = 0; p.vx = 0; p.vy = 20; };   // a<0 vs the Sun
  const setBound   = () => { p.x = 1; p.y = 0; p.vx = 0; p.vy = 2*Math.PI; }; // ~circular, a>0
  const pass = (fn, n) => { for (let i=0;i<n;i++){ fn(); api.detectPass(); } };
  pass(setUnbound, 35);                              // → one eject
  ok(emits.filter(e => e[0] === 'eject').length === 1, 'flicker: first unbound stretch → one eject');
  pass(setBound, 10); pass(setUnbound, 35);         // brief dip back, then unbound again
  ok(emits.filter(e => e[0] === 'eject').length === 1, 'flicker: brief recross does NOT re-eject');
  pass(setBound, 70); pass(setUnbound, 35);         // sustained recapture clears the latch, then a real re-ejection
  ok(emits.filter(e => e[0] === 'eject').length === 2, 'sustained rebind then unbound → a fresh eject');
}

// ── T8: capture detector — right period, no refire ──
{
  const api = boot();
  const emits = [];
  api.onEmit((type, d) => emits.push([type, d]));
  const r = 3, v = 2 * Math.PI * Math.sqrt(api.SUN.m / r);
  api.addComet(mkComet({ x: r, y: 0, vx: 0, vy: v }));
  years(api, 0.55);
  const caps = emits.filter(e => e[0] === 'capture');
  ok(caps.length === 1, 'bound comet → one capture event', JSON.stringify(emits));
  ok(caps.length && Math.abs(caps[0][1].T - Math.sqrt(27)) < 0.3, 'capture period ≈ 5.2 yr', caps[0] && String(caps[0][1].T));
  years(api, 0.5);
  ok(emits.filter(e => e[0] === 'capture').length === 1, 'capture does not refire');
}

// ── T8b: Earth→Mars probe — Lambert-targeted transfer actually rendezvous ──
// Uses the SHIPPED targeting (keplerProp + lambertV): aim at where Mars will be
// after a Hohmann-time transfer, solve for the departure velocity, integrate the
// probe under full N-body, and require a genuine close approach across several
// launch geometries (the launch window the app waits for).
{
  const rot = (x,y,a)=>[x*Math.cos(a)-y*Math.sin(a), x*Math.sin(a)+y*Math.cos(a)];
  for (const stageDeg of [0, 44, 90, 300]){
    const api = boot();
    const E = api.EARTH, S = api.SUN, M = api.MARS, mu = api.G*S.m;
    const a = stageDeg*Math.PI/180;
    [M.x, M.y] = rot(M.x-S.x, M.y-S.y, a).map((v,i)=>v+(i?S.y:S.x));
    [M.vx, M.vy] = rot(M.vx-S.vx, M.vy-S.vy, a).map((v,i)=>v+(i?S.vy:S.vx));
    const r1 = Math.hypot(E.x-S.x, E.y-S.y), at = (r1+M.a)/2, tT = Math.PI*Math.sqrt(at*at*at/mu);
    const mFut = api.keplerProp(M, tT);
    const v1 = api.lambertV([E.x-S.x, E.y-S.y], [mFut[0]-S.x, mFut[1]-S.y], tT, mu);
    ok(!!v1, `lambert solves at ${stageDeg}°`);
    const pr = { x:E.x, y:E.y, vx:S.vx+v1[0], vy:S.vy+v1[1], trail:[], closest:Infinity, arrived:false, done:false, target:M };
    api.addProbe(pr);
    const steps = Math.ceil((tT*1.05)/(32*api.DT));
    for (let i=0;i<steps;i++) api.advance(32,1);
    ok(pr.closest < 0.05, `probe rendezvous with Mars at ${stageDeg}° (closest ${pr.closest.toFixed(3)} AU)`);
  }
  // Earth → Jupiter: a ~2.7-yr Hohmann transfer must also reach its target
  {
    const api = boot();
    const E = api.EARTH, S = api.SUN, J = api.planets.find(p => p.name === 'Jupiter'), mu = api.G*S.m;
    const r1 = Math.hypot(E.x-S.x, E.y-S.y), at = (r1+J.a)/2, tT = Math.PI*Math.sqrt(at*at*at/mu);
    const jFut = api.keplerProp(J, tT);
    const v1 = api.lambertV([E.x-S.x, E.y-S.y], [jFut[0]-S.x, jFut[1]-S.y], tT, mu);
    ok(!!v1, 'Jupiter Lambert solves');
    const pr = { x:E.x, y:E.y, vx:S.vx+v1[0], vy:S.vy+v1[1], trail:[], closest:Infinity, arrived:false, done:false, target:J };
    api.addProbe(pr);
    const steps = Math.ceil((tT*1.05)/(32*api.DT));
    for (let i=0;i<steps;i++) api.advance(32,1);
    ok(pr.closest < 0.05, `probe rendezvous with Jupiter (closest ${pr.closest.toFixed(3)} AU, ${tT.toFixed(2)} yr)`);
  }
  // Earth → Saturn: a ~6-yr Hohmann transfer must reach its target
  {
    const api = boot();
    const E = api.EARTH, S = api.SUN, SAT = api.planets.find(p => p.name === 'Saturn'), mu = api.G*S.m;
    const r1 = Math.hypot(E.x-S.x, E.y-S.y), at = (r1+SAT.a)/2, tT = Math.PI*Math.sqrt(at*at*at/mu);
    const sFut = api.keplerProp(SAT, tT);
    const v1 = api.lambertV([E.x-S.x, E.y-S.y], [sFut[0]-S.x, sFut[1]-S.y], tT, mu);
    ok(!!v1, 'Saturn Lambert solves');
    const pr = { x:E.x, y:E.y, vx:S.vx+v1[0], vy:S.vy+v1[1], trail:[], closest:Infinity, arrived:false, done:false, target:SAT };
    api.addProbe(pr);
    const steps = Math.ceil((tT*1.05)/(32*api.DT));
    for (let i=0;i<steps;i++) api.advance(32,1);
    // Saturn's SOI is ~0.36 AU, so a ~0.12 AU approach is a genuine arrival (matches the app's SOI-scaled arrival radius)
    ok(pr.closest < 0.15, `probe rendezvous with Saturn (closest ${pr.closest.toFixed(3)} AU, ${tT.toFixed(2)} yr)`);
  }
}

// ── T8d: Voyager — a close Jupiter flyby really boosts the probe's speed ──
// A trailing-side flyby (aim offset −0.2 AU perpendicular) must raise the
// heliocentric speed: a genuine gravity assist, not a scripted number.
{
  const api = boot();
  const E = api.EARTH, S = api.SUN, J = api.planets.find(p => p.name === 'Jupiter'), mu = api.G*S.m;
  const at = (1+J.a)/2, tT = Math.PI*Math.sqrt(at*at*at/mu), omJ = Math.sqrt(mu/(J.a**3));
  let alpha = Math.PI - omJ*tT; alpha = ((alpha%(2*Math.PI))+2*Math.PI)%(2*Math.PI);
  for (let g=0; g<40000; g++){
    const thE=Math.atan2(E.y-S.y,E.x-S.x), thJ=Math.atan2(J.y-S.y,J.x-S.x);
    let lead=((thJ-thE)%(2*Math.PI)+2*Math.PI)%(2*Math.PI); let d=Math.abs(lead-alpha); if(d>Math.PI)d=2*Math.PI-d;
    if (d<0.05) break; api.advance(32,1);
  }
  const jFut = api.keplerProp(J, tT), jr = Math.hypot(jFut[0]-S.x, jFut[1]-S.y);
  const aim = [jFut[0] - (jFut[1]-S.y)/jr*-0.2, jFut[1] + (jFut[0]-S.x)/jr*-0.2];
  const v1 = api.lambertV([E.x-S.x, E.y-S.y], [aim[0]-S.x, aim[1]-S.y], tT, mu);
  const pr = { x:E.x, y:E.y, vx:S.vx+v1[0], vy:S.vy+v1[1], trail:[], closest:Infinity, arrived:false, done:false, target:null };
  api.addProbe(pr);
  const vhel = () => Math.hypot(pr.vx-S.vx, pr.vy-S.vy);
  let jMin=Infinity, vBefore=0, vAfter=0, boosted=false;
  const steps = Math.ceil(20/(32*api.DT));
  for (let i=0;i<steps;i++){ const before=vhel(); api.advance(32,1);
    const dJ=Math.hypot(pr.x-J.x,pr.y-J.y); if(dJ<jMin){jMin=dJ;vBefore=before;}
    if(!boosted && jMin<8 && dJ>jMin+1.0){ vAfter=vhel(); boosted=true; } }
  ok(jMin < 0.1, `Voyager flies close past Jupiter (${jMin.toFixed(3)} AU)`);
  ok(boosted && vAfter > vBefore, `gravity assist boosts speed (${(vBefore*4.74057).toFixed(1)} → ${(vAfter*4.74057).toFixed(1)} km/s)`);
}

// ── T8c: Earth→Moon translunar injection reaches the Moon ──
// Mirrors the shipped Earth–Moon model (km, s): Earth fixed at origin with its
// real GM, the Moon on its real circular orbit, a Lambert TLI from a parking
// orbit, integrated under both gravities. Uses the shipped lambertV.
{
  const api = boot();
  const MU_E = 398600.4418, MU_M = 4902.8, D = 384400, wM = 2*Math.PI/(27.3217*86400), r0 = 6671, T = 3*86400;
  const moonAt = t => [D*Math.cos(wM*t), D*Math.sin(wM*t)];
  const p0 = [r0*Math.cos(Math.PI), r0*Math.sin(Math.PI)];      // far-side parking point (φ=180°)
  const v1 = api.lambertV(p0, moonAt(T), T, MU_E);
  ok(!!v1, 'translunar Lambert solves');
  const v0 = Math.hypot(v1[0], v1[1]);
  ok(v0 > 10.4 && v0 < 11.2, `TLI speed ≈ real ~10.8 km/s (${v0.toFixed(2)})`);
  let x=p0[0], y=p0[1], vx=v1[0], vy=v1[1], closest=Infinity;
  const acc=(x,y,t)=>{ const [mx,my]=moonAt(t); const r=Math.hypot(x,y)||1, mm=Math.hypot(x-mx,y-my)||1;
    return [ -MU_E*x/(r*r*r) - MU_M*(x-mx)/(mm*mm*mm), -MU_E*y/(r*r*r) - MU_M*(y-my)/(mm*mm*mm) ]; };
  const dt=20, n=Math.round(T/dt);
  for (let i=0;i<n;i++){ const t=i*dt; let [ax,ay]=acc(x,y,t); x+=vx*dt+0.5*ax*dt*dt; y+=vy*dt+0.5*ay*dt*dt;
    const [a2,b2]=acc(x,y,t+dt); vx+=0.5*(ax+a2)*dt; vy+=0.5*(ay+b2)*dt;
    const [mx,my]=moonAt(t+dt); closest=Math.min(closest, Math.hypot(x-mx,y-my)); }
  ok(closest < 5000, `probe reaches the Moon (closest ${Math.round(closest)} km)`);
}

// ── T9: reversibility — forward then backward returns the system home ──
{
  const api = boot();
  const x0 = api.EARTH.x, y0 = api.EARTH.y;
  for (let i = 0; i < 50; i++) api.advance(32, 1);
  for (let i = 0; i < 50; i++) api.advance(32, -1);
  ok(Math.abs(api.state().t) < 1e-9, 'clock returns to 0');
  ok(Math.hypot(api.EARTH.x - x0, api.EARTH.y - y0) < 1e-6, 'Earth returns home (Verlet reversibility)',
    String(Math.hypot(api.EARTH.x - x0, api.EARTH.y - y0)));
}

// ── T10: escape announcement ──
{
  const api = boot();
  const emits = [];
  api.onEmit((type, d) => emits.push([type, d]));
  api.addComet(mkComet({ x: 79.5, y: 0, vx: 40, vy: 0 }));
  for (let i = 0; i < 4; i++) api.advance(32, 1);   // 40 AU/yr × 4 frames ≈ 1 AU — crosses the 80 AU line
  ok(emits.filter(e => e[0] === 'escape').length === 1, 'comet crossing 80 AU → one escape event', JSON.stringify(emits));
  ok(api.state().comets.length === 0, 'escaped comet removed');
}

// ── T9: bestTransfer — the What-if lesson's window search. Scanning live geometry,
//        every launch it prices inside the rocket's budget must rendezvous, and the
//        transfer-orbit kick from outside the window must miss. ──
{
  const api = boot(), B = 3.7/api.KMS;
  const stepD = 8, sub = Math.round(stepD/365.25/api.DT);
  const fly = (vx, vy, yrs) => {
    const { SUN, EARTH, MARS } = api; let ux = EARTH.vx-SUN.vx, uy = EARTH.vy-SUN.vy; const ul = Math.hypot(ux, uy);
    const pr = { x: EARTH.x+ux/ul*0.012, y: EARTH.y+uy/ul*0.012, vx, vy, trail: [], t0: api.state().t, closest: Infinity, arrived: false, done: false, arrR: 0.05, target: MARS };
    api.addProbe(pr); const n = Math.ceil(yrs/(32*api.DT)); for (let i = 0; i < n; i++){ api.advance(32, 1); if (pr.arrived) break; } pr.done = true; return pr;
  };
  let hits = 0, launches = 0, kicked = false, kickMiss = null, nulls = 0, samples = 0;
  while (api.state().t < 5 && launches < 2){
    const bt = api.bestTransfer(api.MARS); samples++;
    if (!bt) nulls++;
    if (bt && bt.dv <= B){ const pr = fly(api.SUN.vx+bt.v1[0], api.SUN.vy+bt.v1[1], bt.dt*1.7); launches++; if (pr.arrived) hits++; }
    else if (bt && !kicked && bt.dv > 1.5*B){
      const { SUN, EARTH, MARS, G } = api, mu = G*SUN.m, r1 = Math.hypot(EARTH.x-SUN.x, EARTH.y-SUN.y), r2 = Math.hypot(MARS.x-SUN.x, MARS.y-SUN.y), at = (r1+r2)/2, vp = Math.sqrt(mu*(2/r1-1/at));
      let dvx = EARTH.vx-SUN.vx, dvy = EARTH.vy-SUN.vy; const vl = Math.hypot(dvx, dvy);
      kicked = true; kickMiss = fly(SUN.vx+dvx/vl*vp, SUN.vy+dvy/vl*vp, bt.tT*1.7).closest;
    }
    else api.advance(sub, 1);
  }
  ok(nulls === 0, 'bestTransfer always finds a verified transfer', `${nulls}/${samples} null`);
  ok(launches === 2, 'two launch windows opened within 5 yr', `${launches}`);
  ok(hits === launches, `every budgeted launch rendezvoused (${hits}/${launches})`);
  ok(kicked && kickMiss > 0.05, `transfer-orbit kick from outside the window misses (closest ${kickMiss ? kickMiss.toFixed(2) : '?'} AU)`);
}

console.log(fails ? `\n${fails} FAILURE(S)` : '\nall green');
process.exit(fails ? 1 : 0);
