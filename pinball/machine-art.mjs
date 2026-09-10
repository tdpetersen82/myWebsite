import {rocks,bumpers,scoop,rollovers,rampPath,laneDividers,orbitPath} from './machines.mjs';

function metal(ctx,x,y,r,colors=['#fff1c3','#bfa978','#514736']){
  const g=ctx.createLinearGradient(x-r,y-r,x+r,y+r);colors.forEach((c,i)=>g.addColorStop(i/(colors.length-1),c));return g;
}
function disk(ctx,x,y,r,fill){ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fillStyle=fill;ctx.fill();}
export function glow(ctx,x,y,r,color){const g=ctx.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,color);g.addColorStop(1,'#efb44b00');disk(ctx,x,y,r,g);}
export function drawFlipper(ctx,f,t,line){
  ctx.save();ctx.shadowColor='#000b';ctx.shadowBlur=9;ctx.shadowOffsetY=5;
  line([[f.x,f.y],[t.x,t.y]],'#142022',25);ctx.shadowColor='transparent';
  line([[f.x,f.y],[t.x,t.y]],metal(ctx,f.x,f.y,20,['#fff1b2','#d5ad54','#6a522f']),20);
  line([[f.x,f.y+5],[t.x,t.y+5]],'#463724',3);
  line([[f.x,f.y-5],[t.x,t.y-5]],'#ffedb4',2);
  disk(ctx,f.x,f.y,8,metal(ctx,f.x,f.y,8,['#dae5dc','#687d77','#1b3033']));
  disk(ctx,f.x,f.y,3,'#233b3c');ctx.restore();
}
export function raisedRail(ctx,points,line,width=7){
  ctx.save();ctx.lineCap='round';ctx.lineJoin='round';
  line(points.map(([x,y])=>[x+4,y+8]),'#020d13a0',width+7);
  line(points,'#111c25',width+4);line(points,'#718995',width);
  line(points.map(([x,y])=>[x-1,y-1]),'#ecf6e9',Math.max(1.5,width*.27));
  ctx.restore();
}
function offsetPath(points,d){return points.map(([x,y],i)=>{const a=points[Math.max(0,i-1)],b=points[Math.min(points.length-1,i+1)],dx=b[0]-a[0],dy=b[1]-a[1],l=Math.hypot(dx,dy)||1;return [x-dy/l*d,y+dx/l*d];});}
function wireRamp(ctx,w,line,text,time){
  const left=offsetPath(rampPath,19),right=offsetPath(rampPath,-19);
  line(rampPath.map(([x,y])=>[x+9,y+13]),'#020c1490',49);
  line(rampPath,'#1d3744c0',40);
  // Cross braces show a real raised channel; the ball runs between its steel rails.
  for(let i=1;i<rampPath.length;i++){
    const a=rampPath[i-1],b=rampPath[i],dx=b[0]-a[0],dy=b[1]-a[1],len=Math.hypot(dx,dy),nx=-dy/len,ny=dx/len;
    for(let d=8;d<len;d+=17){const x=a[0]+dx*d/len,y=a[1]+dy*d/len;line([[x-nx*18,y-ny*18],[x+nx*18,y+ny*18]],'#819797',3);}
  }
  for(const side of [left,right])raisedRail(ctx,side,line,6);
  for(const [x,y] of [[432,340],[490,250],[502,545]]){
    line([[x+19,y],[x+28,y+26]],'#4b5e64',7);disk(ctx,x+28,y+26,6,'#0d1d24');disk(ctx,x+19,y,4,'#e7dab4');
  }
  for(const x of [403,462]){line([[x,455],[x,420]],'#303746',12);line([[x-1,455],[x-1,420]],'#e0ac42',7);glow(ctx,x,421,20,'#ffae5955');disk(ctx,x,421,4,'#ffe4a1');}
  const active=w.transport?.type==='ramp';
  if(active){ctx.lineDashOffset=-time*80;line(rampPath,'#ffd274',2,[3,22]);ctx.lineDashOffset=0;}
  text('LOAD RAMP',429,484,13,'#fff0bf');
}
export function drawMachines(ctx,w,line,text,time=0,reduced=false){
  const m=w.machines;ctx.save();ctx.lineCap='round';
  raisedRail(ctx,orbitPath,line,7);
  if(w.transport?.type==='launch')line(w.transport.path,'#edc776',3,[5,5]);
  wireRamp(ctx,w,line,text,time);
  for(let i=0;i<rocks.length;i++){
    const [ax,ay,bx,by]=rocks[i];line([[ax-5,ay+5],[bx+5,by+5]],'#101e21',18);
    if(m.down[i]){line([[ax,ay+6],[bx,by+6]],'#546359',3);continue;}
    ctx.shadowColor='#000b';ctx.shadowBlur=6;ctx.shadowOffsetY=4;
    line([[ax,ay],[bx,by]],metal(ctx,ax,ay,16,['#fff0cb','#c3b28f','#76664e']),14);ctx.shadowColor='transparent';
    line([[ax,ay-5],[bx,by-5]],'#f4e9c7',2);
    line([[ax+11,ay-5],[ax+17,ay],[ax+12,ay+5],[ax+20,ay+7]],'#615b4c',1.6);
    for(let k=0;k<8;k++){ctx.fillStyle='#81776180';ctx.fillRect(ax+3+k*4,ay+Math.sin(k*2)*3,1.5,1);}
    text(String(i+1),ax-16,ay+3,11,'#efcc82');
  }
  text('ROCK BANK',134,499,12,'#f0dbaa');
  for(let i=0;i<bumpers.length;i++){
    const c=bumpers[i],flash=!reduced&&m.bumperFlash[i]>0,compression=flash?4:0,cy=c.y-7+compression;
    if(flash)glow(ctx,c.x,c.y,76,'#ffac5777');
    disk(ctx,c.x+4,c.y+9,c.r+8,'#000b');
    disk(ctx,c.x,c.y+3,c.r+5,metal(ctx,c.x,c.y,c.r,['#b3c5c7','#516976','#101e2a']));
    disk(ctx,c.x,c.y+1,c.r,'#08151d');
    ctx.beginPath();ctx.arc(c.x,c.y,c.r-3,0,Math.PI*2);ctx.strokeStyle=flash?'#fff4bc':'#dfbd6a';ctx.lineWidth=4;ctx.stroke();
    const cap=ctx.createRadialGradient(c.x-10,cy-12,2,c.x,cy,c.r);
    cap.addColorStop(0,flash?'#fff6d4':'#ffdf87');cap.addColorStop(.4,'#edb545');cap.addColorStop(.8,'#b45b23');cap.addColorStop(1,'#593321');
    disk(ctx,c.x,cy,c.r-5,cap);
    ctx.beginPath();ctx.arc(c.x,cy,c.r-10,Math.PI*1.1,Math.PI*1.85);ctx.strokeStyle='#fff4c4b0';ctx.lineWidth=3;ctx.stroke();
    disk(ctx,c.x,cy,14,'#1a303de6');text('100',c.x,cy+4,11,'#ffe4aa');
    for(const side of [-1,1]){disk(ctx,c.x+side*(c.r+1),c.y+3,3,'#e4e5d0');disk(ctx,c.x+side*(c.r+1),c.y+3,1,'#21313b');}
  }
  text('CRUSHER',282,321,12,'#f0dbaa');
  glow(ctx,scoop.x,scoop.y,39,'#ebbf5140');
  disk(ctx,scoop.x,scoop.y,scoop.r+7,metal(ctx,scoop.x,scoop.y,26));
  const pit=ctx.createRadialGradient(scoop.x,scoop.y+8,1,scoop.x,scoop.y,20);pit.addColorStop(0,'#02090c');pit.addColorStop(.8,'#07191f');pit.addColorStop(1,'#506255');disk(ctx,scoop.x,scoop.y,scoop.r,pit);
  line([[scoop.x-12,scoop.y+27],[scoop.x+14,scoop.y+44]],'#8c9a83',4);text('SIDING',scoop.x,scoop.y-35,11,'#f0dbaa');
  for(let i=0;i<rollovers.length;i++){const x=rollovers[i];if(m.lanes[i])glow(ctx,x,125,23,'#e8bb5955');disk(ctx,x,125,10,metal(ctx,x,125,10));disk(ctx,x,125,7,m.lanes[i]?'#ffe2a0':'#1e393b');text(String(i+1),x,129,10,m.lanes[i]?'#614729':'#a6b9a6');}
  for(const [ax,ay,bx,by] of laneDividers){line([[ax,ay],[bx,by]],'#172a2e',6);line([[ax-1,ay],[bx-1,by]],'#b7c1a7',2);}
  ctx.restore();
}
