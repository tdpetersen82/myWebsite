// node tools/dirt-jumper-course-test.cjs
// A simple rider pumps down, releases up, and holds a modest fixed landing angle.
// No predicted collision point or per-jump optimization is used.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const context=vm.createContext({assert,console,Phaser:{Math:{Clamp:(x,a,b)=>Math.max(a,Math.min(b,x))}}});
for(const name of ['config','Terrain','Bike'])vm.runInContext(fs.readFileSync(path.join(__dirname,'../dirt-jumper/js/'+name+'.js'),'utf8'),context);
vm.runInContext(`
const results=[];
for(const dt of [8,16,33]) for(const targetAngle of [15,20,25]) {
    const terrain=new Terrain(null,42),bike=new Bike(null,CONFIG.STATS,CONFIG.TERRAIN.startFlat/2);
    bike.y=terrain.heightAt(bike.x);
    let firstJump=null,landings=0,onRamp=0,minLandingSpeed=Infinity;
    for(let time=0;time<60000;time+=dt) {
        const error=djNormDeg(targetAngle-bike.angle);
        bike.update(dt,terrain,{pump:terrain.slopeAt(bike.x)>0.025,left:bike.airborne&&error < -2,right:bike.airborne&&error>2});
        assert(!bike.crashed,'course should accept a simple steady landing-angle strategy');
        assert(bike.y<=terrain.heightAt(bike.x)+0.001,'rider stays above the track');
        if(bike.justPop && firstJump===null) firstJump=time/1000;
        if(bike.lastLanding) {
            landings++;
            assert(bike.airTime >= 1.15 && bike.airTime <= 1.65, "usable hangtime on every jump");
            minLandingSpeed=Math.min(minLandingSpeed,bike.speed);
            if(terrain.lips.some(lip=>bike.x>=lip.landingStart&&bike.x<=lip.landingEnd))onRamp++;
        }
        terrain.cull(bike.x-350);
    }
    assert(firstJump>1.5&&firstJump<4,'short predictable opening');
    assert(landings>=15,'track regularly offers jumps');
    assert(onRamp/landings>=0.9,'flight arcs meet the broad landing ramps');
    assert(minLandingSpeed>450,'landings carry useful speed into the next section');
    results.push({dt,targetAngle,firstJump,landings,onRamp,minLandingSpeed:Math.round(minLandingSpeed),distance:Math.round(bike.distance)});
}
const openingA=new Terrain(null,1),openingB=new Terrain(null,98765);
for(let x=0;x<3000;x+=25)assert.equal(openingA.heightAt(x),openingB.heightAt(x),'opening is learnable across restarts');
console.log(JSON.stringify(results));
console.log('PASS: nine uninterrupted 60-second rides; predictable opening, frequent jumps, landing catch zones and speed retention.');
`,context);
