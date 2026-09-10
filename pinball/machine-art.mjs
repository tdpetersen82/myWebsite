import {rocks,bumpers,scoop,rollovers,rampPath,laneDividers,orbitPath} from './machines.mjs';

export function drawMachines(ctx,w,line,text) {
  const m=w.machines;
  line(orbitPath,'#9cae98',3);
  if(w.transport?.type==='launch')line(w.transport.path,'#edc776',3,[5,5]);
  // A raised return hugs the right rail, leaving the middle open for shots.
  line(rampPath,'#0e2025',31);
  line(rampPath,'#78867b',27);
  line(rampPath,'#344f50',22);
  line(rampPath,'#b8c8ad',2,[5,14]);
  line([[405,450],[405,422]],'#e8bf68',4);
  line([[460,450],[460,422]],'#e8bf68',4);
  line([[405,450],[460,450]],'#d4b96b',3,[4,5]);
  text('CONVEYOR',432,476,11,'#e3c47c');
  text('↑ STRONG SHOT',432,490,8,'#adc1b0');
  for(let i=0;i<rocks.length;i++) {
    const [ax,ay,bx,by]=rocks[i];
    line([[ax-6,ay+4],[bx+6,by+4]],'#0e191b',15);
    line([[ax,ay],[bx,by]],m.down[i]?'#415150':'#ded6b8',m.down[i]?3:12);
    if(!m.down[i])line([[ax+13,ay-5],[ax+17,ay+1],[ax+12,ay+5]],'#7c8171',2);
    text(m.down[i]?'↓':String(i+1),ax-14,ay+4,11,m.down[i]?'#73968c':'#e9c775');
  }
  text('ROCK BANK',133,500,10,'#e3c47c');
  for(let i=0;i<bumpers.length;i++) {
    const c=bumpers[i],flash=m.bumperFlash[i]>0;
    ctx.beginPath();ctx.arc(c.x,c.y,c.r+5,0,Math.PI*2);ctx.fillStyle='#0e191b';ctx.fill();
    ctx.beginPath();ctx.arc(c.x,c.y,c.r,0,Math.PI*2);ctx.fillStyle=flash?'#f0d58b':'#b9bba5';ctx.fill();
    ctx.beginPath();ctx.arc(c.x,c.y,c.r-8,0,Math.PI*2);ctx.strokeStyle=flash?'#fff2c9':'#536c66';ctx.lineWidth=4;ctx.stroke();
    text('⚙',c.x,c.y+5,17,'#344d4d');
  }
  text('CRUSHER',282,322,10,'#e3c47c');
  ctx.beginPath();ctx.arc(scoop.x,scoop.y,scoop.r+6,0,Math.PI*2);ctx.fillStyle='#c5a968';ctx.fill();
  ctx.beginPath();ctx.arc(scoop.x,scoop.y,scoop.r,0,Math.PI*2);ctx.fillStyle='#071216';ctx.fill();
  line([[scoop.x-12,scoop.y+27],[scoop.x+14,scoop.y+44]],'#aec0aa',3);
  text('SIDING',scoop.x,scoop.y-36,10,'#e3c47c');
  for(let i=0;i<rollovers.length;i++) {
    const x=rollovers[i];
    ctx.beginPath();ctx.arc(x,125,9,0,Math.PI*2);ctx.fillStyle=m.lanes[i]?'#f1c568':'#425e59';ctx.fill();
    text(String(i+1),x,129,10,m.lanes[i]?'#253c3b':'#c0cbb8');
  }
  for(const [ax,ay,bx,by] of laneDividers)line([[ax,ay],[bx,by]],'#738b83',3);
}
