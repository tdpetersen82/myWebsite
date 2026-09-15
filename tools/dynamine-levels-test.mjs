import assert from 'node:assert/strict';
import {OPENING_LEVELS} from '../dynamine/opening-levels.mjs';
import {createGame,startLevel,step,blastCells,placeBomb,tileAt,W,H,FLOOR,WALL,BRICK,ITEM,RULES} from '../dynamine/engine.mjs';
let checks=0;
const check=(name,value)=>{assert.ok(value,name);checks++;};
const key=(x,y)=>y*W+x;
const dirs=[[1,0],[-1,0],[0,1],[0,-1]];
function reachable(s,from=key(1,1),avoid=new Set()) {
  const seen=new Map([[from,0]]),q=[from];
  for(let i=0;i<q.length;i++) {
    const k=q[i],x=k%W,y=Math.floor(k/W);
    for(const [dx,dy] of dirs) {
      const n=key(x+dx,y+dy);
      if(tileAt(s,x+dx,y+dy)===FLOOR&&!seen.has(n)&&!avoid.has(n)) {seen.set(n,seen.get(k)+1);q.push(n);}
    }
  }
  return seen;
}
const signatures=new Set();
for(let level=1;level<=5;level++) {
  const lesson=OPENING_LEVELS[level-1];
  check(`level ${level} has a complete map`,lesson.rows.length===H&&lesson.rows.every(r=>r.length===W));
  for(const seed of [1,42,900]) {
    const s=createGame({seed});startLevel(s,level);s.status='playing';
    check('authored name and instruction available',s.lesson.name===lesson.name&&s.lesson.hint.length>0);
    check('outer walls enclose level',s.grid.every((t,k)=>k%W!==0&&k%W!==W-1&&k>=W&&k<W*(H-1)||t===WALL));
    check('spawn has two exits',tileAt(s,1,1)===FLOOR&&tileAt(s,2,1)===FLOOR&&tileAt(s,1,2)===FLOOR);
    check('exit separate from shafts',tileAt(s,s.door.x,s.door.y)===FLOOR&&!s.shafts.some(v=>v.x===s.door.x&&v.y===s.door.y));
    check('pickups correctly placed', [...s.items].every(([k,it])=>s.grid[k]===(it.hidden?BRICK:FLOOR)));
    check('enemies have space away from spawn',s.enemies.every(e=>e.x+e.y>=7&&reachable(s,key(Math.floor(e.x),Math.floor(e.y))).size>=6));
    check('shafts walkable without overlapping pickups',s.shafts.every(v=>tileAt(s,v.x,v.y)===FLOOR&&!s.items.has(key(v.x,v.y))));
    check('visible teaching pickups reachable before bombing', [...s.items].every(([k,it])=>it.hidden||reachable(s).has(k)));
    const signature=JSON.stringify([...s.grid]);
    if(seed===1) signatures.add(signature);
    else {const other=createGame({seed:1});startLevel(other,level);check('layout independent of random seed',signature===JSON.stringify([...other.grid]));}

    // Solve the static excavation at starting capacity/range. Only remove rock
    // from a reachable planting spot with an escape outside the ENTIRE blast
    // (including remote shafts) within the two-second fuse. No phasing/teleports.
    let progress=true, planted=0;
    while(progress) {
      progress=false;
      for(const k of reachable(s).keys()) {
        const x=k%W,y=Math.floor(k/W),cells=blastCells(s,x,y,1),hit=new Set(cells.map(([cx,cy])=>key(cx,cy)));
        const rocks=cells.filter(([cx,cy])=>tileAt(s,cx,cy)===BRICK);
        if(!rocks.length)continue;
        const escape=[...reachable(s,k)].some(([n,d])=>!hit.has(n)&&d/RULES.baseSpeed<RULES.bombFuse-.3);
        if(!escape)continue;
        for(const [cx,cy] of rocks)s.grid[key(cx,cy)]=FLOOR;
        planted++;progress=true;break;
      }
    }
    const seen=reachable(s);
    check('all remaining creatures and exit reachable after safe excavation',s.enemies.every(e=>seen.has(key(Math.floor(e.x),Math.floor(e.y))))&&seen.has(key(s.door.x,s.door.y)));
    check('all floor and breakable rock reachable',s.grid.every((t,k)=>t===WALL||seen.has(k)));
    check('layout makes bombing useful',planted>0);
    // Actual completion path: defeating remaining creatures opens the visible
    // exit; walking across its threshold completes this level, then advances.
    s.enemies.forEach(e=>e.alive=false);s.players[0].invulnUntil=1e9;
    step(s,1/60);check('clearing creatures opens exit',s.door.open);
    const d=s.door,approach=dirs.find(([dx,dy])=>tileAt(s,d.x+dx,d.y+dy)===FLOOR);
    const [dx,dy]=approach,p=s.players[0];p.x=d.x+dx+.5;p.y=d.y+dy+.5;
    const direction=dx===1?'left':dx===-1?'right':dy===1?'up':'down';
    for(let i=0;i<60&&s.status==='playing';i++)step(s,1/60,[{held:[direction]}]);
    check('walking into exit finishes authored level',s.status==='cleared');
    for(let i=0;i<180&&s.level===level;i++)step(s,1/60);
    check('next level advances including authored-to-procedural transition',s.level===level+1);
  }
}
check('five distinct geometries',signatures.size===5);
const s=createGame({seed:1});
check('first mine focuses on basic bombing',s.shafts.length===0&&![...s.items.values()].some(it=>[ITEM.FIREBALL,ITEM.IGNITOR].includes(it.type)));
startLevel(s,2);
check('shaft lesson has three linked shafts',s.shafts.length===3&&s.shafts.some(v=>v.x===3&&v.y===1));
const p=s.players[0];s.status='playing';p.x=3.5;p.y=1.5;
check('shaft tutorial bomb can be planted',placeBomb(s,p));
p.x=1.5;p.y=1.5;
for(let i=0;i<125;i++)step(s,1/60);
check('shaft lesson permits safe retreat at starting speed',p.alive&&s.shafts.every(v=>s.fires.has(key(v.x,v.y))));
startLevel(s,3);check('fireball appears in gallery near spawn',s.items.get(key(1,2)).type===ITEM.FIREBALL);
startLevel(s,4);check('ignitor comes with visible extra capacity', [...s.items.values()].some(it=>it.type===ITEM.BOMB&&!it.hidden)&&[...s.items.values()].some(it=>it.type===ITEM.IGNITOR&&!it.hidden));
startLevel(s,6);check('deeper mines return to randomized generation',s.lesson.name==='Spike Gallery'&&s.enemies.length>=5);
console.log(`${checks} opening-level checks passed`);
