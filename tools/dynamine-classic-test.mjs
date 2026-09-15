import assert from 'node:assert/strict';
import {createGame,startLevel,step,usePower,placeBomb,blastCells,tileAt,drainEvents,ITEM,JARS,PASSWORDS,RULES,W,H,FLOOR,WALL} from '../dynamine/engine.mjs';
let checks=0;const check=(name,value)=>{assert.ok(value,name);checks++;};
const k=(x,y)=>y*W+x;
function fixture() {
  const s=createGame({seed:15});s.status='playing';s.enemies=[];s.shafts=[];s.door=null;s.items.clear();s.features.clear();
  for(let y=1;y<H-1;y++)for(let x=1;x<W-1;x++)s.grid[k(x,y)]=FLOOR;
  const p=s.players[0];p.x=3.5;p.y=3.5;p.facing='right';p.invulnUntil=0;
  return {s,p};
}
function run(s,seconds,inputs=[]) {for(let n=0;n<Math.ceil(seconds*120);n++)step(s,1/120,inputs);}
function equip(s,p,type) {p.power=type;p.powerUntil=s.time+40;p.powerReady=s.time;}
function enemy(s,x,y) {const e={type:'bat',x:x+.5,y:y+.5,dir:'up',alive:true,speed:0,moving:false,walkPhase:0};s.enemies.push(e);return e;}
for(const [code,level] of Object.entries(PASSWORDS))check(`password ${code} enters level ${level}`,createGame({password:code.toLowerCase()}).level===level);
for(const [type,jar] of Object.entries(JARS)) {
  const {s,p}=fixture();equip(s,p,type);check(`${type} activates`,usePower(s,p));
  if(jar.bomb) {check('spell uses a bomb slot',s.bombs.length===1&&s.bombs[0].effect===jar.effect);p.powerReady=s.time;check('spell refused when capacity is full',!usePower(s,p));}
  else if(jar.effect!=='wind')check('glass forward / stone four directions',s.projectiles.length===(jar.form==='stone'?4:1));
  check('all jars keep their 40-second reusable power',p.power===type&&p.powerUntil===40);
}
{
  const {s,p}=fixture();equip(s,p,ITEM.ELECTRIC);usePower(s,p,true);check('holding bomb fires glass jar backward',s.projectiles[0].dx===-1);
  const e=enemy(s,1,3);run(s,.3);check('electricity stuns without killing',e.alive&&e.stunnedUntil>s.time);run(s,2.1);check('electric stun wears off',e.stunnedUntil<s.time);
}
{
  const {s,p}=fixture(),e=enemy(s,5,3);equip(s,p,ITEM.TELEPORT);usePower(s,p);run(s,.3);
  check('teleport relocates a living target',e.alive&&(e.x!==5.5||e.y!==3.5));check('teleport lands on clear floor',tileAt(s,Math.floor(e.x),Math.floor(e.y))===FLOOR);
}
for(const type of [ITEM.ELECTRIC4,ITEM.TELEPORT4]) {
  const {s,p}=fixture();p.range=1;const e=enemy(s,8,3);equip(s,p,type);usePower(s,p);p.x=1.5;p.y=1.5;run(s,2.1);
  check('spell bomb does not create lethal fire',s.fires.size===0&&e.alive);
  check('electric reaches wall, teleport respects stored bomb range',type===ITEM.ELECTRIC4?e.stunnedUntil>s.time:e.x===8.5&&e.y===3.5);
}
{
  const {s,p}=fixture();p.range=3;p.x=5.5;placeBomb(s,p);p.x=3.5;equip(s,p,ITEM.WIND);
  const e=enemy(s,4,3);s.projectiles.push({x:5.2,y:3.5,dx:-1,dy:0,owner:1,life:1,effect:'fire'});usePower(s,p);
  check('wind pushes bombs',s.bombs[0].x===6);check('wind pushes creatures',e.x>4.5);check('wind redirects fireball toward former shooter',s.projectiles[0].dx===1&&s.projectiles[0].owner===0);
}
{
  const {s,p}=fixture();for(const type of [ITEM.HEART,ITEM.MAX,ITEM.RADIATION]) {s.items.set(k(3,3),{type,hidden:false});step(s,1/120);}
  check('heart grants life',s.lives===4);check('max pickup fills bomb and range',p.maxBombs===RULES.maxBombs&&p.range===RULES.maxRange);
  s.fires.set(k(3,3),s.time+11);run(s,.2);check('radiation survives repeated hits',p.alive&&p.invulnUntil>s.time);
  run(s,10);check('radiation wears off',!p.alive);
}
{
  const {s,p}=fixture();s.features.set(k(4,3),{type:'barrier',phase:0});s.time=2.2;
  check('active barrier stops blast',!blastCells(s,3,3,5).some(([x,y])=>x===4&&y===3));run(s,.35,[{held:['right']}]);check('active barrier stops movement',p.x<4);
  s.time=4.1;run(s,.35,[{held:['right']}]);check('inactive barrier allows movement',p.x>4);
}
{
  const {s,p}=fixture();s.features.set(k(3,3),{type:'oneway',dir:'right'});run(s,.4,[{held:['left']}]);check('one-way floor rejects reverse movement',p.x>=3.38);run(s,.5,[{held:['right']}]);check('one-way floor allows arrow direction',p.x>4);
}
{
  const {s,p}=fixture();s.features.set(k(3,3),{type:'gate',turn:0});run(s,.3,[{held:['down']}]);check('L door blocks closed edge',p.y<4);
  p.x=4.5;p.y=3.5;p.range=1;placeBomb(s,p);p.x=7.5;p.y=7.5;run(s,2.1);check('blast flips L door',s.features.get(k(3,3)).turn===1);
  p.x=3.5;p.y=5.5;p.facing='up';equip(s,p,ITEM.FIREBALL);usePower(s,p);run(s,.3);check('projectile flips L door',s.features.get(k(3,3)).turn===2);
}
{
  const {s,p}=fixture();s.features.set(k(3,3),{type:'conveyor',dir:'right'});placeBomb(s,p);run(s,.6);check('moving platform carries bomb',s.bombs[0].x===4);check('moving platform carries miner',p.x>3.5);
}
{
  const {s,p}=fixture();s.features.set(k(3,3),{type:'spikes',phase:0});run(s,.2);check('retracted spikes are safe',p.alive);s.time=2.1;step(s,1/120);check('extended spikes are lethal',!p.alive);
}
{
  const s=createGame({seed:42});check('exit initially invisible',!s.door.revealed);s.status='playing';s.enemies.forEach(e=>e.alive=false);step(s,1/120);check('last enemy reveals and opens exit',s.door.revealed&&s.door.open);
  startLevel(s,10);check('later levels contain all machinery',new Set([...s.features.values()].map(f=>f.type)).size===5);
  const spider=s.enemies.find(e=>e.type==='spider');check('some creatures may pass bombs',spider?.bombPass===true);check('later enemies move faster',spider.speed>3.4);
}
for(const mode of ['adventure','battle']) {
  const s=createGame({mode,players:4,seed:7});s.status='playing';
  check('four distinct local players supported in '+mode,s.players.length===4&&new Set(s.players.map(p=>p.x+','+p.y)).size===4);
  check('four spawn cells are walkable',s.players.every(p=>tileAt(s,Math.floor(p.x),Math.floor(p.y))===FLOOR));
  const p=s.players[3],before=p.x;run(s,.2,[{},{},{},{held:['right']}]);check('fourth player accepts independent input',p.x>before);
}
{
  const s=createGame({players:2,seed:4});s.status='playing';const [a,b]=s.players;
  a.lives=0;a.alive=false;a.deadAt=-10;s.lives=0;b.invulnUntil=0;b.graceUntil=0;
  run(s,.1);check('one exhausted player does not end co-op',s.status==='playing'&&!a.alive&&b.alive);
  b.lives=1;s.fires.set(k(Math.floor(b.x),Math.floor(b.y)),s.time+1);run(s,.1);check('co-op ends when all players exhaust lives',s.status==='over'&&b.lives===0);
}
{
  const {s,p}=fixture();s.features.set(k(3,3),{type:'barrier',phase:0,relocates:true,cycle:0});s.time=4.1;step(s,1/120);
  check('barriers relocate between cycles',!s.features.has(k(3,3))&&s.features.size===1);
}
{
  const {s,p}=fixture();s.shafts=[{x:3,y:3},{x:8,y:7}];const e=enemy(s,8,7);equip(s,p,ITEM.ELECTRIC4);usePower(s,p);p.x=1.5;p.y=1.5;run(s,2.1);
  check('spell bombs also travel through linked shafts',e.stunnedUntil>s.time&&e.alive);
}
{
  const {s,p}=fixture();p.maxBombs=2;p.range=3;p.x=5.5;placeBomb(s,p);p.x=4.5;placeBomb(s,p);p.x=3.5;equip(s,p,ITEM.WIND);usePower(s,p);
  check('wind pushes a line of bombs farthest first independent of placement order',s.bombs[0].x===6&&s.bombs[1].x===5);
}
console.log(`${checks} classic-rule checks passed`);
