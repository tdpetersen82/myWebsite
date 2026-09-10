import assert from 'node:assert/strict';
import {createWorld} from '../pinball/physics.mjs';
import {startShift,launchShift,handleEvent,tickShift,readRecord,saveRecord} from '../pinball/rules.mjs';
const w=createWorld(),s=startShift(w);launchShift(s,w);
const hit=(type,index)=>handleEvent(s,w,{type,index});
hit('scoop');hit('ramp');hit('crusher');assert.equal(s.stage,0,'unlit shots score without advancing');
hit('rock',0);hit('rock',0);assert.equal(s.stage,0,'repeat slab is not a cleared bank');
hit('rock',1);hit('rock',2);assert.equal(s.stage,1);
for(let i=0;i<4;i++)hit('crusher');assert.equal(s.stage,1);hit('crusher');assert.equal(s.stage,2);
hit('scoop');assert.equal(s.shipments,0);hit('ramp');assert.equal(s.stage,3);
const before=s.score;hit('scoop');assert.equal(s.score-before,10500);assert.equal(s.shipments,1);assert.equal(s.stage,0);
for(let i=0;i<3;i++)hit('rock',i);for(let i=0;i<5;i++)hit('crusher');hit('ramp');const next=s.score;hit('scoop');assert.equal(s.score-next,15500);
hit('rollover',0);const skill=s.score;hit('rollover',0);assert.equal(s.score-skill,100,'skill only awarded once');
for(let i=0;i<5;i++)hit('lanes');assert.equal(s.multiplier,5,'bonus multiplier caps at five');
hit('orbit');const combo=s.score;hit('orbit');assert.equal(s.score-combo,3000);w.events=[];tickShift(s,w,9);const expired=s.score;hit('orbit');assert.equal(s.score-expired,1500);

// Partial progress survives a normal ball loss, including which slabs were cleared.
hit('rock',1);const progress=[...s.rocks];w.state='drained';hit('drain');assert.equal(s.status,'bonus');
const total=s.bonusTotal,preBonus=s.score;w.paused=true;tickShift(s,w,3);assert.equal(s.score,preBonus);w.paused=false;
tickShift(s,w,1);assert(s.bonusPaid>0&&s.bonusPaid<total);tickShift(s,w,1.1);assert.equal(s.score-preBonus,total);assert.equal(s.status,'between');
tickShift(s,w,4);assert.equal(s.score-preBonus,total,'bonus cannot pay twice');launchShift(s,w);assert.equal(s.ball,2);assert.deepEqual(s.rocks,progress);assert.deepEqual(w.machines.down,progress);assert.equal(s.multiplier,1);

// A save preserves the same ball and progress, but never awards another save or skill shot.
launchShift(s,w);hit('rock',2);w.state='drained';hit('drain');assert.equal(s.status,'ready');assert.equal(s.ball,2);assert(s.saveUsed);assert(s.rocks[2]);
launchShift(s,w);assert.equal(s.saveRemaining,0);assert.equal(s.skillAvailable,false);w.state='drained';hit('drain');assert.equal(s.status,'bonus');tickShift(s,w,2.1);launchShift(s,w);assert.equal(s.ball,3);
launchShift(s,w);w.events=[];tickShift(s,w,8);w.state='drained';hit('drain');tickShift(s,w,2.1);assert.equal(s.status,'over');assert(s.completed);
let raw='garbage';const storage={getItem:()=>raw,setItem:(_,v)=>raw=v};const empty=readRecord(storage);assert.equal(empty.best,0);
const record=saveRecord(s,empty,storage);assert.equal(record.shifts,1);assert.equal(record.best,s.score);assert.equal(readRecord(storage).best,s.score);assert(!s.completed);assert.equal(saveRecord(s,record,storage).shifts,1);
assert.doesNotThrow(()=>saveRecord(s,record,{setItem(){throw Error('storage blocked');}}));
console.log('Shift rules passed: ordered progression, escalating shipments, one-shot skill award, combos, multiplier cap, exact bonuses, carryover, one-time saves, three-ball ending and record validation.');
