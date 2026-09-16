const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const ctx=vm.createContext({assert,console,Phaser:{Math:{Clamp:(x,a,b)=>Math.max(a,Math.min(b,x))}}});
for(const name of ['config','Terrain','Bike'])vm.runInContext(fs.readFileSync(path.join(__dirname,'../js/'+name+'.js'),'utf8'),ctx);
vm.runInContext(`
const flat={heightAt:()=>0,slopeAt:()=>0,curvatureAt:()=>0,lipBoostAt:()=>0};
for(const dt of [8,16,33]) for(const names of [['whip'],['backflip'],['tailwhip'],['backflip','tailwhip'],['backflip','whip']]) {
 const b=new Bike(null,CONFIG.STATS,0);b.airborne=true;b.y=-500;b.vx=500;
 const input=Object.fromEntries(names.map(n=>[n,true]));
 b.update(dt,flat,input);const bank=b.score;
 for(let t=dt;t<520;t+=dt)b.update(dt,flat,input);
 assert.equal(b.activeTricks.length,0);assert.equal(b.tricks.length,names.length,'held keys must not repeat');
 assert(Math.abs(b.angle)<0.001,'flip returns to original angle');
 assert(b.score-bank<100,'trick points not banked in the air');
 b.vy=300;b._land(flat,b.x,0);assert(!b.crashed);assert(b.lastLanding.bonus>=150);assert.equal(b.lastLanding.tricks.length,names.length);
}
const late=new Bike(null,CONFIG.STATS,0);late.airborne=true;late.y=-1;late.vy=100;
late.update(16,flat,{tailwhip:true});assert(late.crashed,'unfinished trick bails');assert.equal(late.tricks.length,0);
const ground=new Bike(null,CONFIG.STATS,0);ground.update(16,flat,{backflip:true});assert.equal(ground.activeTricks.length,0);
// Real opening jump supports two simultaneous tricks and a landing correction.
for(const names of [['whip'],['backflip'],['tailwhip'],['backflip','tailwhip']]) {
 const terrain=new Terrain(null,42),b=new Bike(null,CONFIG.STATS,180);let started=false,landed=false;
 for(let i=0;i<1200&&!landed;i++) {
  const input={pump:terrain.slopeAt(b.x)>0.025};
  if(b.airborne&&!started){for(const n of names)input[n]=true;started=true;}
  if(b.airborne&&!b.activeTricks.some(t=>t.name==='backflip'))input.right=b.angle<20;
  b.update(1000/120,terrain,input);
  assert(!b.crashed,'opening trick combination lands');
  if(b.lastLanding){assert(b.lastLanding.bonus>0);landed=true;console.log(names.join(' + '),b.lastLanding.airTime.toFixed(2)+'s',b.lastLanding.bonus);}
 }
 assert(landed);
}
console.log('PASS: tricks, combinations, landing banking, late bail, input edge detection, and opening-jump airtime.');
`,ctx);
