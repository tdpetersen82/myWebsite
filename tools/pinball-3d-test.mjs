import assert from 'node:assert/strict';
import {QuarryPhysics} from '../pinball/study/physics.mjs';
const tick=(g,n,left=false,right=false)=>{for(let i=0;i<n;i++)g.step(1/240,left,right);};
const g=new QuarryPhysics();g.launch();tick(g,400);assert.equal(g.mode,'live');assert.ok(Math.abs(g.x)<6.6&&g.z>-3.1,'launch enters playfield');
g.mode='live';g.x=-2.4;g.z=1.7;g.vz=-8;g.vx=0;tick(g,12);assert.ok(g.score>=500,'bumper scores');assert.ok(g.vz>0,'bumper kicks outward');
g.mode='live';g.x=-1.7;g.z=10.5;g.vx=0;g.vz=8;tick(g,20,true);assert.ok(g.vz<0,'active left flipper returns ball uphill');
g.mode='live';g.x=1.7;g.z=10.5;g.vx=0;g.vz=8;tick(g,20,false,true);assert.ok(g.vz<0,'active right flipper returns ball uphill');
g.mode='live';g.x=4.5;g.z=4.8;g.vz=-8;g.vx=0;tick(g,1);assert.equal(g.mode,'ramp');tick(g,601);assert.equal(g.mode,'live');assert.ok(g.score>=3000,'ramp awards points');
g.mode='live';g.age=1;g.z=12.8;tick(g,1);assert.equal(g.mode,'ready');assert.equal(g.ballNumber,1,'early ball save');
const saved=new QuarryPhysics();saved.mode='live';saved.age=1;saved.z=13;tick(saved,1);assert.equal(saved.ballNumber,1);saved.mode='live';saved.age=1;saved.z=13;tick(saved,1);assert.equal(saved.ballNumber,2,'save can only be used once per ball');
for(let i=1;i<=3;i++){g.mode='live';g.age=10;g.z=12.8;tick(g,1);assert.equal(g.mode,i<3?'ready':'over');}
g.launch();assert.equal(g.score,0);assert.equal(g.ballNumber,1);assert.equal(g.mode,'launch');
for(let run=0;run<30;run++){const q=new QuarryPhysics();q.launch();for(let i=0;i<240*45;i++){q.step(1/240,Math.sin(i*.031+run)>0,Math.cos(i*.027+run)>0);assert.ok(Number.isFinite(q.x+q.z+q.vx+q.vz));if(q.mode==='live')assert.ok(Math.abs(q.x)<6.7,'side containment');if(q.mode==='ready')q.launch();}}
console.log('3D physics: launch, bumpers, flippers, ramp, saves, three-ball lifecycle and containment passed.');
