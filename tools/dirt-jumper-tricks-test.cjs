const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const ctx=vm.createContext({assert,console,Phaser:{Math:{Clamp:(x,a,b)=>Math.max(a,Math.min(b,x))}}});
for(const name of ['config','Terrain','Bike'])vm.runInContext(fs.readFileSync(path.join(__dirname,'../dirt-jumper/js/'+name+'.js'),'utf8'),ctx);
vm.runInContext(`
const flat={heightAt:()=>0,slopeAt:()=>0,curvatureAt:()=>0,lipBoostAt:()=>0};
const air=()=>{const b=new Bike(null,CONFIG.STATS,0);b.airborne=true;b.y=-5000;b.vx=500;return b;};
const step=(b,ms,input,dt=8)=>{for(let t=0;t<ms;t+=dt)b.update(Math.min(dt,ms-t),flat,input);};
let angles=[];
for(const dt of [8,16,33]) {
 const b=air();step(b,900,{backflip:true},dt);const angle=b.angle,rate=b.flipVelocity;
 assert(rate < -400,'tuck builds pitch momentum');
 step(b,40,{},dt);assert(b.angle!==angle,'release does not freeze rotation');
 assert(Math.abs(b.flipVelocity)<Math.abs(rate),'opening out slows rotation');
 step(b,400,{},dt);assert(b.tricks.includes('backflip'),'full revolution counted');angles.push(b.angle);
 assert(b.score<100,'rotation bonus stays unbanked in flight');
 const whip=air();step(whip,450,{whip:true},dt);
 assert(whip.whipYaw>.8 && whip.whipYaw<1.2,'held whip stays sideways');
 step(whip,650,{},dt);assert(Math.abs(whip.whipYaw)<.15,'release returns yaw');
 assert.deepEqual(whip.tricks,['whip']);
 const late=air();step(late,450,{whip:true},dt);late.vy=200;late._land(flat,late.x,0);assert(late.crashed,'sideways landing bails');
}
assert(Math.max(...angles)-Math.min(...angles)<.1,'flip momentum is frame independent');
const short=air();step(short,120,{backflip:true});step(short,700,{});
assert(!short.tricks.includes('backflip'),'tap cannot auto-complete a flip');assert(Math.abs(short.angle)>20,'no automatic snap back');
for(const mode of ['whip','backflip','combo','tailwhip']) {
 const terrain=new Terrain(null,42),b=new Bike(null,CONFIG.STATS,180);let landed=false,tailSent=false;
 for(let i=0;i<1200&&!landed;i++) {
  const base=djNormDeg(b.angle+b.flipRotation);
  const input={pump:terrain.slopeAt(b.x)>.025,right:b.airborne&&base<20,left:b.airborne&&base>24};
  if(b.airborne) {
   input.backflip=(mode==='backflip'||mode==='combo')&&b.airTime<.94;
   input.whip=(mode==='whip'||mode==='combo')&&b.airTime>.12&&b.airTime<.58;
   if(mode==='tailwhip'&&!tailSent){input.tailwhip=true;tailSent=true;}
  }
  b.update(1000/120,terrain,input);
  assert(!b.crashed,mode+' should land with controlled release: '+JSON.stringify({angle:b.angle,rate:b.flipVelocity,yaw:b.whipYaw}));
  if(b.lastLanding){assert(b.lastLanding.bonus>0,mode+' banks');landed=true;console.log(mode,b.lastLanding.airTime.toFixed(2),b.lastLanding.bonus);}
 }
 assert(landed);
}
const terrain=new Terrain(null,42);terrain.heightAt(3000);
for(const lip of terrain.lips){assert(terrain.slopeAt(lip.x-.001)<-.49,'face stays steep to lip');assert(terrain.slopeAt(lip.x+.001)>-.01,'edge breaks immediately');}
console.log('PASS: controllable flip momentum, sprung whip, release recovery, sideways bail, real-course trick landings and sharp lips.');
`,ctx);
