import assert from 'node:assert/strict';
import {createGame,step,drainEvents,FLOOR,WALL,W,H,placeBomb,tileAt,startLevel} from '../dynamine/engine.mjs';
let count=0;
function check(name,value){assert.ok(value,name);count++;}
function fixture(level){
 const s=createGame({seed:12});s.level=level;s.status='playing';s.rng=()=>0;s.door=null;s.items.clear();s.shafts=[];
 for(let y=1;y<H-1;y++)for(let x=1;x<W-1;x++)s.grid[y*W+x]=FLOOR;
 const e={...s.enemies[0],type:'bat',x:3.5,y:3.5,dir:'up',speed:1.6,alive:true,moving:false,atNode:true};s.enemies=[e];
 const p=s.players[0];p.x=7.5;p.y=3.5;p.invulnUntil=1e9;
 return {s,e,p};
}
{
 const early=fixture(1),alert=fixture(3);
 step(early.s,1/120);step(alert.s,1/120);
 check('early bats retain their wandering behavior',early.e.dir==='up');
 check('level 3 bats spot a player down a corridor',alert.e.dir==='right');
}
{
 const early=fixture(3),hunter=fixture(8);
 for(const f of [early,hunter]){f.p.x=5.5;f.s.grid[3*W+4]=WALL;f.e.dir='down';step(f.s,1/120);}
 check('early enemy does not track through the wall',early.e.dir==='down');
 check('level 8 enemy finds a route around the wall',hunter.e.dir==='up');
}
{
 const hunter=fixture(8),interceptor=fixture(10);
 for(const f of [hunter,interceptor]){f.p.x=6.5;f.p.facing='down';step(f.s,1/120,[{held:['down']}]);}
 check('level 8 hunter aims at current position',hunter.e.dir==='right');
 check('level 10 enemy aims ahead of a moving player',interceptor.e.dir==='down');
}
{
 const early=fixture(1),veteran=fixture(5);
 for(const f of [early,veteran]){
  f.e.x=8.5;f.e.y=3.5;f.e.dir='left';f.p.x=3.5;f.p.y=1.5;
  f.s.shafts=[{x:3,y:1},{x:7,y:3}];placeBomb(f.s,f.p);f.p.x=1.5;
  step(f.s,1/120);
 }
 check('early enemy does not predict a remote shaft blast',early.e.dir==='left');
 check('veteran escapes the remote blast before it fires',veteran.e.dir==='up');
}
{
 const f=fixture(5);f.e.x=5.5;f.e.y=3.5;f.e.dir='left';f.p.x=1.5;f.p.y=1.5;
 f.s.projectiles=[{x:2.5,y:3.5,dx:1,dy:0,life:1.6,owner:0}];step(f.s,1/120);
 check('veteran dodges an incoming fireball lane',f.e.dir==='up');
}
{
 const f=fixture(10);f.e.x=3.5;f.e.y=3.5;f.e.dir='right';f.p.x=8.5;f.p.y=8.5;
 for(const [x,y] of [[3,2],[3,4],[2,3],[4,3]])f.s.grid[y*W+x]=WALL;
 step(f.s,1/120);check('trapped enemy waits instead of entering a wall',f.e.x===3.5&&f.e.y===3.5&&!f.e.moving);
}
// Exercise later-level navigation on the actual generated rock/pillar layouts.
for(const level of [3,5,8,10,15]){
 const s=createGame({seed:19});startLevel(s,level);s.status='playing';s.players[0].invulnUntil=1e9;
 let staysOnFloor=true;
 for(let i=0;i<1200;i++){
  step(s,1/120);drainEvents(s);
  staysOnFloor &&= s.enemies.every(e=>!e.alive||tileAt(s,Math.floor(e.x),Math.floor(e.y))===FLOOR);
 }
 check(`enemies navigate generated level ${level} without crossing obstacles`,staysOnFloor);
}
console.log(`${count} enemy checks passed`);
