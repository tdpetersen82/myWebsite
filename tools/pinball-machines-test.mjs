import assert from 'node:assert/strict';
import {createWorld,step,serve,DT} from '../pinball/physics.mjs';
import {rocks,bumpers,rollovers} from '../pinball/machines.mjs';

function live(x,y,vx=0,vy=0){const w=createWorld();w.state='playing';w.ball={x,y,vx,vy};return w;}
function run(w,seconds,input={}){const events=[];for(let i=0;i<Math.round(seconds/DT);i++){step(w,input);events.push(...w.events);}return events;}

const rockWorld=live(140,390,0,-300);
for(let i=0;i<rocks.length;i++) {
  rockWorld.ball={x:140,y:rocks[i][1]+28,vx:0,vy:-300};
  assert(run(rockWorld,.1).some(e=>e.type==='rock'&&e.index===i));
  assert(rockWorld.machines.down[i]);
  const total=rockWorld.machines.counts.rocks;
  rockWorld.ball={x:140,y:rocks[i][1]+28,vx:0,vy:-300};run(rockWorld,.1);
  assert.equal(rockWorld.machines.counts.rocks,total,'down targets cannot score twice');
}
assert.equal(rockWorld.machines.counts.banks,1);
rockWorld.transport={type:'scoop',elapsed:0,duration:3};run(rockWorld,1.9);
assert(rockWorld.machines.down.every(v=>!v),'cleared bank resets');

for(let i=0;i<bumpers.length;i++) {
  const c=bumpers[i],w=live(c.x,c.y+c.r+12,0,-300);
  assert(run(w,.025).some(e=>e.type==='crusher'&&e.index===i));
  assert(w.ball.vy>300,'pop bumper gives an outward kick');
}

const ramp=live(432,460,0,-900);
assert(run(ramp,.02).some(e=>e.type==='ramp'));assert.equal(ramp.transport.type,'ramp');
const held=structuredClone(ramp);ramp.paused=true;run(ramp,1);assert.deepEqual(ramp.transport,held.transport);assert.deepEqual(ramp.ball,held.ball);ramp.paused=false;
assert(run(ramp,1.9,{right:true}).some(e=>e.type==='ramp-return'));assert.equal(ramp.transport,null);
assert(ramp.ball.x>350&&ramp.ball.x<410&&ramp.ball.y<750,'ramp exits over right flipper');
run(ramp,3,{right:true});assert.equal(ramp.state,'playing','held right flipper receives safe return');
const weak=live(432,455,0,-200);assert(run(weak,.08).some(e=>e.type==='ramp-reject'));assert.equal(weak.transport,null);assert(weak.ball.vy>0);

const scoop=live(140,182,0,-300);assert(run(scoop,.06).some(e=>e.type==='scoop'));
assert.equal(scoop.transport.type,'scoop');assert.equal(scoop.ball.vx,0);assert.equal(scoop.ball.vy,0);
const capture=structuredClone(scoop.transport);scoop.paused=true;run(scoop,1);assert.deepEqual(scoop.transport,capture);scoop.paused=false;
assert(run(scoop,.85).some(e=>e.type==='scoop-release'));assert.equal(scoop.transport,null);assert(scoop.ball.vy>0);assert(scoop.machines.scoopLock>0);

const lanes=live(rollovers[0],105,0,100);
for(let i=0;i<3;i++){lanes.ball={x:rollovers[i],y:150,vx:0,vy:-220};assert(run(lanes,.18).some(e=>e.type==='rollover'&&e.index===i));}
assert.equal(lanes.machines.counts.lanes,1);lanes.transport={type:'scoop',elapsed:0,duration:3};run(lanes,1.6);assert(lanes.machines.lanes.every(v=>!v));

// Shots start on a resting flipper; these prove access through the actual populated table.
for(const [type,side,x] of [['crusher','left',220],['rock','left',221.5],['ramp','left',260],['scoop','left',239.5],['orbit','left',246]]) {
  const w=live(side==='left'?x:600-x,760+(x-200)*Math.tan(.46)-21,0,50);let reached=false;
  for(let i=0;i<1000&&w.state==='playing';i++){step(w,{[side]:i<30});reached ||= w.events.some(e=>e.type===type);}
  assert(reached,`${type} can be reached by a flipper shot`);
}

serve(ramp);assert.equal(ramp.transport,null);assert(Object.values(ramp.machines.counts).every(v=>v===0));assert(ramp.machines.down.every(v=>!v));
console.log('Quarry machinery passed: target drop/reset, bumper kicks, ramp power/return, scoop dwell/release, pause, rollover banks, orbit and real flipper shot access.');
