import assert from 'node:assert/strict';
import {createWorld,launch,step,DT,MAX_SPEED} from '../pinball/physics.mjs';

function run(w,seconds,input={}){for(let i=0;i<Math.round(seconds/DT);i++)step(w,input);return w;}
function ball(x,y,vx=0,vy=0){const w=createWorld();w.state='playing';w.ball={x,y,vx,vy};return w;}

// Every launch must enter the central playfield, not merely exit the shooter lane.
for(let strength=0;strength<=100;strength++){
  const w=createWorld();assert(launch(w,strength/100));let reached=false;
  for(let i=0;i<30/DT&&w.state==='playing';i++){
    step(w);const b=w.ball;
    reached ||= !w.transport&&b.x>110&&b.x<475&&b.y>170&&b.y<550;
    assert(b.x>=25&&b.x<=575&&b.y>=45,'launch stays inside table bounds');
  }
  assert(reached,`launch ${strength}% reaches the playable middle before draining`);
  assert.equal(w.state,'drained',`launch ${strength}% does not become stuck`);
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
const paused=ball(300,400,50,100);paused.paused=true;const before=structuredClone(paused);run(paused,1,{left:true});assert.deepEqual(paused,before);
// Same elapsed time at different outer step rates gives the same trajectory.
const a=ball(300,400,150,-100),b=structuredClone(a);for(let i=0;i<240;i++)step(a,{},1/240);for(let i=0;i<60;i++)step(b,{},1/60);assert(Math.hypot(a.ball.x-b.ball.x,a.ball.y-b.ball.y)<.001);
// Deterministic stress runs alternate both bats; all states stay finite and in bounds until drain.
for(let seed=1;seed<=30;seed++){const w=createWorld();launch(w,seed/30);for(let n=0;n<12/DT&&w.state==='playing';n++){step(w,{left:Math.sin(n*.035+seed)>0,right:Math.cos(n*.041+seed)>0});assert(Object.values(w.ball).every(Number.isFinite));assert(Math.hypot(w.ball.vx,w.ball.vy)<=MAX_SPEED+.01);assert(w.ball.x>=25&&w.ball.x<=575);}}
console.log('Pinball physics passed: launches, drains, catches, moving flippers, fast collisions, pause, step consistency and 30 stress runs.');
