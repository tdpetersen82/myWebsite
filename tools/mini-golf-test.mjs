import assert from 'node:assert/strict';
import {HOLES,createBall,shoot,step,simulate,speed,DT} from '../mini-golf/physics.mjs';
const h=HOLES[0];
let b=createBall(h);assert(shoot(b,-Math.PI/2,.3));assert(!shoot(b,0,.5));for(let i=0;i<3000&&speed(b);i++)step(b,h,i*DT);assert.equal(speed(b),0);assert(b.y<h.start.y);
b={...createBall(h),x:38,y:400,vx:-400,vy:0};step(b,h,0);assert(b.x>=37);assert(b.vx>0);
b={...createBall(h),x:h.cup.x,y:h.cup.y+9,vx:0,vy:-30};assert.equal(step(b,h,0),'sunk');assert(b.sunk);
b={...createBall(HOLES[5]),x:100,y:290,vx:0,vy:-50};assert.equal(step(b,HOLES[5],0),'water');
b={...createBall(HOLES[5]),x:300,y:400,vx:0,vy:-450};assert.equal(step(b,HOLES[5],0),'jump');assert(b.air>0);
const sand=simulate(HOLES[3],{...createBall(h),x:300,y:390},-Math.PI/2,.3);const grass=simulate(h,{...createBall(h),x:300,y:390},-Math.PI/2,.3);assert(sand.ball.y>grass.ball.y);
assert.equal(HOLES.reduce((s,a)=>s+a.par,0),29);
// Search actual simulated shots, retaining spatially distinct stopping positions.
// This catches inaccessible cups and obstacle arrangements that trap the ball.
for(const [i,hole] of HOLES.entries()){
 let frontier=[{ball:createBall(hole),shots:[]}],solution=null;const seen=new Set();
 for(let depth=0;depth<6&&!solution;depth++){
  const next=[];
  outer:for(const entry of frontier){const direct=Math.atan2(hole.cup.y-entry.ball.y,hole.cup.x-entry.ball.x);const dist=Math.hypot(hole.cup.x-entry.ball.x,hole.cup.y-entry.ball.y);const ideal=Math.sqrt(144*dist)/560;
   const angles=[direct,...Array.from({length:48},(_,k)=>k*Math.PI/24)];const powers=[ideal*.94,ideal,ideal*1.05,.15,.25,.4,.6,.8,1].filter(p=>p>0&&p<=1);
   for(const a of angles)for(const p of powers){const r=simulate(hole,entry.ball,a,p,0);const shots=[...entry.shots,[a,p]];if(r.ball.sunk){solution=shots;break outer;}if(r.event==='water')continue;const key=Math.round(r.ball.x/22)+','+Math.round(r.ball.y/22);if(seen.has(key))continue;seen.add(key);next.push({ball:r.ball,shots});}
  }
  frontier=next.sort((a,b)=>Math.hypot(a.ball.x-hole.cup.x,a.ball.y-hole.cup.y)-Math.hypot(b.ball.x-hole.cup.x,b.ball.y-hole.cup.y)).slice(0,65);
 }
 assert(solution,`Hole ${i+1} has no route within six shots`);console.log(`Hole ${i+1} (${hole.name}): verified ${solution.length}-shot route`);
}
console.log('Physics and course checks passed');
