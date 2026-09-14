// Run with: node lab/dirt-jumper/tests/physics.cjs
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const context = vm.createContext({
    assert, console,
    Phaser: { Math: { Clamp: (v, lo, hi) => Math.max(lo, Math.min(hi, v)) } }
});
for (const file of ['config', 'Terrain', 'Bike']) {
    vm.runInContext(fs.readFileSync(path.join(__dirname, '../js', file + '.js'), 'utf8'), context);
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
        for (const value of [b.x,b.y,b.vx,b.vy,b.angle,b.speed]) assert(Number.isFinite(value));
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
console.log('PASS: lean response, release, symmetry, frame independence, gravity, landing thresholds, pumping, streamed terrain and score');
`, context);
