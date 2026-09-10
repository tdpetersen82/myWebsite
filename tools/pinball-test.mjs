import assert from 'node:assert/strict';
import {createWorld,launch,step,DT,MAX_SPEED,destinations} from '../pinball/physics.mjs';

function run(w,seconds,input={}){for(let i=0;i<Math.round(seconds/DT);i++)step(w,input);return w;}
function ball(x,y,vx=0,vy=0){const w=createWorld();w.state='playing';w.ball={x,y,vx,vy};return w;}

// Every legal plunger strength must clear the lane and eventually drain unattended.
for(let p=0;p<=1;p+=.05){const w=createWorld();assert(launch(w,p));let reached=false;
  for(let i=0;i<30/DT&&w.state==='playing';i++){step(w);reached ||= w.ball.x<520;}
  assert(reached,`launch ${p} exits the shooter lane`);assert.equal(w.state,'drained',`launch ${p} does not become stuck`);
}
// The middle must remain an actual drain even with the bats down.
assert.equal(run(ball(300,710,0,900),1).state,'drained');
for(const side of ['left','right']){
  const w=createWorld();run(w,.2,{[side]:true});w.state='playing';w.ball={x:side==='left'?220:380,y:715,vx:0,vy:0};
  run(w,5,{[side]:true});assert.equal(w.state,'playing');assert(w.ball.y<755);assert(Math.hypot(w.ball.vx,w.ball.vy)<3,`${side} catches a slow ball`);
  run(w,10);assert.equal(w.state,'drained',`${side} catch releases when lowered`);
}
// A rising bat must impart useful upward velocity, and a high-speed falling ball cannot tunnel through it.
for(const side of ['left','right']){
  const x=side==='left'?255:345,w=ball(x,767,0,100);run(w,.025,{[side]:true});assert(w.ball.vy<-400,`${side} strikes upward`);
  const fast=ball(x,745,0,MAX_SPEED);run(fast,.035);assert(fast.ball.vy<0,`${side} blocks a fast falling ball`);
}
for(const [x,vx] of [[55,-MAX_SPEED],[510,MAX_SPEED]]){const w=ball(x,450,vx,0);run(w,.02);assert(w.ball.x>=44&&w.ball.x<=521,'rail contains fast shot');assert(Math.sign(w.ball.vx)===-Math.sign(vx));}
// Representative flipper shots can reach each reserved machine footprint.
for(const [label,side,x] of [['CRUSHER','left',221],['CONVEYOR','left',233],['ROCK BANK','left',248],['SIDING','right',230]]){
  const d=destinations.find(d=>d.label===label),w=ball(side==='left'?x:600-x,760+(x-200)*Math.tan(.46)-21,0,50);let hit=false;
  for(let i=0;i<360&&w.state==='playing';i++){step(w,{[side]:i<30});hit ||= w.ball.x>=d.x&&w.ball.x<=d.x+d.w&&w.ball.y>=d.y&&w.ball.y<=d.y+d.h;}
  assert(hit,`${label} is reachable from a flipper`);
}
const paused=ball(300,400,50,100);paused.paused=true;const before=structuredClone(paused);run(paused,1,{left:true});assert.deepEqual(paused,before);
// Same elapsed time at different outer step rates gives the same trajectory.
const a=ball(300,400,150,-100),b=structuredClone(a);for(let i=0;i<240;i++)step(a,{},1/240);for(let i=0;i<60;i++)step(b,{},1/60);assert(Math.hypot(a.ball.x-b.ball.x,a.ball.y-b.ball.y)<.001);
// Deterministic stress runs alternate both bats; all states stay finite and in bounds until drain.
for(let seed=1;seed<=30;seed++){const w=createWorld();launch(w,seed/30);for(let n=0;n<12/DT&&w.state==='playing';n++){step(w,{left:Math.sin(n*.035+seed)>0,right:Math.cos(n*.041+seed)>0});assert(Object.values(w.ball).every(Number.isFinite));assert(Math.hypot(w.ball.vx,w.ball.vy)<=MAX_SPEED+.01);assert(w.ball.x>=25&&w.ball.x<=575);}}
console.log('Pinball physics passed: launches, drains, catches, moving flippers, fast collisions, pause, step consistency and 30 stress runs.');
