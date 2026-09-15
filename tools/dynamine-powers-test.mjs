// Regression checks for the temporary fireball/ignitor powers and their input path.
import assert from 'node:assert/strict';
import {createGame,step,drainEvents,placeBomb,usePower,startLevel,FLOOR,W,H,ITEM,RULES,fireAt,dangerMap} from '../dynamine/engine.mjs';
let passed=0;
function check(name,condition){assert.ok(condition,name);passed++;}
function fixture(mode='adventure'){
 const s=createGame({seed:8,mode});s.status='playing';s.enemies=[];s.items.clear();s.shafts=[];s.door=null;
 for(let y=1;y<H-1;y++)for(let x=1;x<W-1;x++)s.grid[y*W+x]=FLOOR;
 s.players.forEach(p=>{p.invulnUntil=1e9;p.graceUntil=0;p.facing='right';});
 return s;
}
function run(s,seconds,input=[]){for(let t=0;t<seconds;t+=1/120)step(s,1/120,input);}
function pickup(s,type,p=s.players[0]){
 s.items.set(Math.floor(p.y)*W+Math.floor(p.x),{type,hidden:false});step(s,1/120);
}
function enemy(s,x,y){const e={type:'bat',x,y,alive:true,moving:false,dir:'up',speed:0,walkPhase:0,decideAtCentre:true};s.enemies.push(e);return e;}
{
 const s=fixture(),p=s.players[0];pickup(s,ITEM.FIREBALL);
 check('pickup equips fireball for 40 seconds',p.power===ITEM.FIREBALL&&Math.abs(p.powerUntil-s.time-40)<.001);
 const target=enemy(s,5.5,1.5);const score=s.score;
 step(s,1/120,[{power:true}]);
 check('second-action input launches a forward shot',s.projectiles.length===1&&s.projectiles[0].dx===1&&s.projectiles[0].dy===0);
 check('cooldown prevents repeated instant shots',!usePower(s,p));
 run(s,.6);
 check('fireball kills target and scores',!target.alive&&s.score>score);
 check('own fireball does not hurt shooter',p.alive);
 check('power can shoot again after cooldown',usePower(s,p));
 run(s,2);check('projectiles do not persist outside the board',s.projectiles.length===0);
 p.powerUntil=s.time;check('expired power cannot fire',!usePower(s,p));
}
for(const obstacle of [1,2]){
 const s=fixture();pickup(s,ITEM.FIREBALL);s.grid[W+3]=obstacle;const target=enemy(s,4.5,1.5);
 step(s,.05,[{power:true}]);run(s,.8);
 check(`obstacle ${obstacle} stops fireballs without being destroyed`,target.alive&&s.grid[W+3]===obstacle&&s.projectiles.length===0);
}
{
 const s=fixture(),p=s.players[0];p.maxBombs=2;
 s.shafts=[{x:3,y:1},{x:7,y:5}];
 p.x=3.5;placeBomb(s,p);p.x=1.5;placeBomb(s,p);
 pickup(s,ITEM.IGNITOR);p.x=1.5;p.y=3.5;
 step(s,1/120,[{power:true}]);
 check('ignitor detonates the oldest owned bomb through all shafts',fireAt(s,3,1)&&fireAt(s,7,5));
 check('ignitor leaves the later bomb on its normal fuse',s.bombs.length===1&&s.bombs[0].x===1&&s.bombs[0].y===1);
 check('manual detonation happens before the normal fuse',s.time<RULES.bombFuse);
}
{
 const s=fixture('battle'),p=s.players[0],q=s.players[1];q.x=7.5;q.y=7.5;placeBomb(s,q);
 pickup(s,ITEM.IGNITOR);
 check('ignitor cannot detonate opponent bombs',!usePower(s,p)&&s.bombs.length===1);
}
{
 const s=fixture(),p=s.players[0];p.x=5.5;placeBomb(s,p);p.x=1.5;pickup(s,ITEM.FIREBALL);
 step(s,1/120,[{power:true}]);
 const danger=dangerMap(s);
 check('AI predicts an approaching fireball',danger[W+3]<.3);
 check('AI predicts bombs ignited by a projectile',danger[2*W+5]<.6);
 run(s,.6);
 check('fireball chain-detonates a bomb early',s.bombs.length===0&&fireAt(s,5,1));
}
{
 const s=fixture('battle'),p=s.players[0],q=s.players[1];q.x=4.5;q.y=1.5;q.invulnUntil=0;q.movedSinceSpawn=true;q.shield=true;
 pickup(s,ITEM.FIREBALL);step(s,1/120,[{power:true}]);run(s,.4);
 check('helmet absorbs one enemy fireball',q.alive&&!q.shield);
 run(s,1.3);step(s,1/120,[{power:true}]);run(s,.4);
 check('fireballs can win a battle round',!q.alive&&s.status==='roundEnd'&&p.wins===1);
}
{
 const s=fixture(),p=s.players[0];pickup(s,ITEM.FIREBALL);pickup(s,ITEM.IGNITOR);
 check('new temporary power replaces the previous one',p.power===ITEM.IGNITOR);
 startLevel(s,2);check('new level clears temporary powers and projectiles',p.power===null&&s.projectiles.length===0);
}
{
 const s=fixture(),p=s.players[0];pickup(s,ITEM.FIREBALL);p.alive=false;p.deadAt=s.time;s.lives=2;
 run(s,RULES.respawnDelay+.1);check('respawning clears temporary power',p.alive&&p.power===null);
 const time=s.time;s.status='over';step(s,.05,[{power:true}]);
 check('game-over input cannot fire',s.projectiles.length===0);
}
console.log(`${passed} power checks passed`);
