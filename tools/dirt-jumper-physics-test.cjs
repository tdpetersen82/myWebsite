// Run with: node tools/dirt-jumper-physics-test.cjs
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const context = vm.createContext({
    assert, console,
    Phaser: { Math: { Clamp: (v, lo, hi) => Math.max(lo, Math.min(hi, v)) } }
});
for (const file of ['config', 'Terrain', 'Bike']) {
    vm.runInContext(fs.readFileSync(path.join(__dirname, '../dirt-jumper/js', file + '.js'), 'utf8'), context);
}
vm.runInContext(`
const flat = {heightAt: () => 0, slopeAt: () => 0, lipBoostAt: () => 0};
const free = {heightAt: () => 1e9, slopeAt: () => 0, lipBoostAt: () => 0};
const makeAir = () => {
    const b = new Bike(null, CONFIG.STATS, 0);
    b.airborne = true; b.vx = 300; return b;
};
function turn(ms, step, input) {
    const b = makeAir();
    for (let t = 0; t < ms; t += step) b.update(Math.min(step, ms - t), free, input);
    return b;
}
const tap = turn(100, 10, {right: true});
assert(tap.angle > 3 && tap.angle < 4, '100 ms tap is a small correction');
const hold = turn(500, 10, {right: true});
assert(hold.angle > 43 && hold.angle < 45, 'long hold can match a downslope');
assert(Math.abs(hold.angle + turn(500, 10, {left: true}).angle) < 1e-9, 'lean is symmetric');
assert(Math.abs(turn(500, 8, {right:true}).angle - turn(500, 16, {right:true}).angle) < 1e-8, 'lean is frame independent');
const beforeRelease = hold.angle;
for (let i = 0; i < 50; i++) hold.update(16, free, {});
assert.equal(hold.angle, beforeRelease, 'release stops rotation without drift');
assert.equal(hold.leanVelocity, 0);
const falling = turn(1000, 10, {});
assert(Math.abs(falling.vy - CONFIG.STATS.gravity) < 1e-7);
assert(Math.abs(falling.y - CONFIG.STATS.gravity / 2) < 9, 'free-fall parabola');
for (const [angle, grade] of [[8,'perfect'],[8.01,'clean'],[22,'clean'],[22.01,'sketchy'],[40,'sketchy'],[40.01,'bail']]) {
    const b = makeAir(); b.angle = angle; b.vy = 200; b._land(flat, 10, 0);
    assert.equal(b.lastLanding.grade, grade); assert.equal(b.leanVelocity, 0);
}
for (const slope of [-0.2, 0.2]) {
    const terrain = {heightAt:x=>x*slope,slopeAt:()=>slope,lipBoostAt:()=>0};
    const coast = new Bike(null,CONFIG.STATS,0), pump = new Bike(null,CONFIG.STATS,0);
    coast.update(16,terrain,{}); pump.update(16,terrain,{pump:true});
    assert(slope > 0 ? pump.speed > coast.speed : pump.speed < coast.speed);
}

// Isolate the two halves on equal-duration slopes so different speeds cannot
// change the amount of time spent on each face.
function pumpCycle(mode, dt = 10) {
    const b = new Bike(null,CONFIG.STATS,0); b.speed = 350;
    let slope = 0.22, releases = 0;
    const terrain = {heightAt:x=>x*slope,slopeAt:()=>slope,lipBoostAt:()=>0};
    for (let t=0;t<500;t+=dt) b.update(Math.min(dt,500-t),terrain,{pump:mode!=='coast'});
    const bottom = b.speed;
    slope = -0.22;
    for (let t=0;t<400;t+=dt) {
        b.update(Math.min(dt,400-t),terrain,{pump:mode==='hold'});
        if (b.justGoodRelease) releases++;
    }
    return {speed:b.speed,bottom,releases};
}
const rhythm=pumpCycle('rhythm'), held=pumpCycle('hold'), coasted=pumpCycle('coast');
assert(rhythm.bottom > coasted.bottom + 50, 'holding down gives meaningful acceleration');
assert(rhythm.speed > held.speed + 70, 'release on up preserves meaningful momentum');
assert(rhythm.speed > coasted.speed + 80, 'complete rhythm beats passive coasting');
assert.equal(rhythm.releases,1); assert.equal(held.releases,0); assert.equal(coasted.releases,0);
assert(Math.abs(pumpCycle('rhythm',8).speed - pumpCycle('rhythm',16).speed)<3,'pump cycle stable across frame rates');
const up={heightAt:x=>-x*0.2,slopeAt:()=>-0.2,lipBoostAt:()=>0};
const spam=new Bike(null,CONFIG.STATS,0); spam.pumpCharge=1;
let spamRewards=0;
for(let i=0;i<60;i++) {
    spam.update(16,up,{pump:i%2===1});
    if(spam.justGoodRelease) spamRewards++;
}
assert.equal(spamRewards,1,'tapping cannot farm release rewards on one climb');
const passive=new Bike(null,CONFIG.STATS,0);
for(let i=0;i<20;i++) passive.update(16,up,{});
assert.equal(passive.releasePower,0,'no free uphill boost without prior pump effort');
// Compare identical takeoff speeds to isolate the extension impulse.
const lip={heightAt:x=>-x*0.2,slopeAt:()=>-0.2,lipBoostAt:()=>150};
const loaded=new Bike(null,CONFIG.STATS,0), unloaded=new Bike(null,CONFIG.STATS,0);
loaded.releasePower=0.8; loaded._releasedThisUp=true;
loaded.update(16,lip,{}); unloaded.update(16,lip,{});
assert(loaded.airborne && unloaded.airborne);
assert(loaded.vy < unloaded.vy-50,'charged uphill release adds real pop');
assert.equal(loaded.releasePower,0,'takeoff consumes the extension');
console.log('Pump cycle:',JSON.stringify({rhythm,held,coasted}));
// Suspension compresses under load, rebounds in air, and absorbs a touchdown.
const rig = new Bike(null,CONFIG.STATS,0);
for(let i=0;i<60;i++) rig._updateBody(1/60,flat,{pump:true});
assert(rig.forkCompression>2 && rig.compress>0.75,'rider and fork settle into a pump');
rig.airborne=true;
for(let i=0;i<60;i++) rig._updateBody(1/60,flat,{});
assert(rig.forkCompression<0.05 && rig.compress<0,'fork extends and rider rises in air');
rig.airborne=false;rig.lastLanding={hardness:600};
rig._updateBody(1/60,flat,{});rig.lastLanding=null;
for(let i=0;i<5;i++) rig._updateBody(1/60,flat,{});
assert(rig.forkCompression>0.5 && rig.bodyVelocity>0,'landing loads fork and rider springs');
for(let i=0;i<180;i++) rig._updateBody(1/60,flat,{});
assert(Math.abs(rig.forkCompression-0.5)<0.02 && Math.abs(rig.compress)<0.02,'springs settle without perpetual bouncing');
let totalFrames=0, launches=0, landings=0;
for (const seed of [1,42,12345,98765]) for (const dt of [8,16,33]) {
    const terrain = new Terrain(null,seed);
    let b = new Bike(null,CONFIG.STATS,270), score = 0;
    for (let elapsed=0; elapsed<120000; elapsed+=dt) {
        // Reset after a bail to cover multiple starts and track sections.
        if (b.crashed) { b = new Bike(null,CONFIG.STATS,b.x+90); score=0; }
        const target = Math.atan(terrain.slopeAt(b.x + b.vx * 0.15)) * 180 / Math.PI;
        const error = djNormDeg(target-b.angle);
        b.update(dt,terrain,{pump:terrain.slopeAt(b.x)>0.025,left:b.airborne&&error < -3,right:b.airborne&&error>3});
        for (const value of [b.x,b.y,b.vx,b.vy,b.angle,b.speed,b.forkCompression,b.forkVelocity,b.compress,b.bodyVelocity]) assert(Number.isFinite(value));
        assert(b.y <= terrain.heightAt(b.x)+0.001,'no terrain tunneling');
        assert(b.scoreValue() >= score, 'score is monotonic'); score=b.scoreValue();
        assert(b.speed >= 0 && b.speed < 1800);
        if (b.justPop) launches++;
        if (b.lastLanding) landings++;
        terrain.cull(b.x-300);
        assert(terrain.knots.length < 500,'terrain stays bounded');
        totalFrames++;
    }
}
assert(launches>50 && landings>50,'exercise actual jumps and landings');
console.log(JSON.stringify({tapDegrees:tap.angle,holdDegrees:turn(500,10,{right:true}).angle,totalFrames,launches,landings}));
console.log('PASS: lean response, release, symmetry, frame independence, gravity, landing thresholds, pump/release cycle, fork/rider springs, streamed terrain and score');
`, context);
