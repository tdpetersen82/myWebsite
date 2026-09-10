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
export function drawMachines(ctx,w,line,text,time=0,reduced=false){
  const m=w.machines;ctx.save();ctx.lineCap='round';
  ctx.shadowColor='#000b';ctx.shadowBlur=7;ctx.shadowOffsetY=4;line(orbitPath,'#101b1b',9);ctx.shadowColor='transparent';
  line(orbitPath,'#536660',5);line(orbitPath,'#c9d0ad',1.5);
  if(w.transport?.type==='launch')line(w.transport.path,'#edc776',3,[5,5]);
  ctx.shadowColor='#000c';ctx.shadowBlur=12;ctx.shadowOffsetY=7;line(rampPath,'#172525',34);ctx.shadowColor='transparent';
  line(rampPath,metal(ctx,460,410,75,['#dccb92','#5f7269','#182f31']),30);
  line(rampPath,'#12272a',23);
  ctx.lineDashOffset=-(w.transport?.type==='ramp'?time*70:0);line(rampPath,'#60746a',17,[2,8]);ctx.lineDashOffset=0;
  line(rampPath,'#d9c27a',1.2,[2,12]);
  for(const [x,y] of [[432,340],[490,250],[502,545]]){disk(ctx,x,y,6,metal(ctx,x,y,6));disk(ctx,x,y,2,'#253c3d');}
  for(const x of [403,462]){line([[x,450],[x,420]],'#403826',8);line([[x-1,450],[x-1,420]],'#c5a45b',4);glow(ctx,x,420,15,'#eec26555');disk(ctx,x,420,3,'#ffe1a0');}
  line([[405,450],[460,450]],'#e6c577',4,[5,5]);
  text('CONVEYOR',432,479,12,'#f0dbaa');
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
    const c=bumpers[i],flash=!reduced&&m.bumperFlash[i]>0;
    if(flash)glow(ctx,c.x,c.y,58,'#f1ba6166');
    ctx.shadowColor='#000c';ctx.shadowBlur=9;ctx.shadowOffsetY=6;
    disk(ctx,c.x,c.y,c.r+5,'#14282c');ctx.shadowColor='transparent';
    disk(ctx,c.x,c.y,c.r,metal(ctx,c.x,c.y,c.r,['#e8d49d','#8d784c','#362f25']));
    disk(ctx,c.x,c.y,c.r-4,'#263c3c');disk(ctx,c.x,c.y,c.r-7,metal(ctx,c.x,c.y,c.r,['#dce2ca','#8a9a88','#3b5351']));
    for(let k=0;k<10;k++){const a=k*Math.PI/5+(flash?time*10:0);line([[c.x+Math.cos(a)*7,c.y+Math.sin(a)*7],[c.x+Math.cos(a)*15,c.y+Math.sin(a)*15]],'#30494a',3);}
    disk(ctx,c.x,c.y,8,metal(ctx,c.x,c.y,8));disk(ctx,c.x,c.y,3,flash?'#fff0b9':'#c4ac6b');
    for(let k=0;k<4;k++){const a=k*Math.PI/2;disk(ctx,c.x+Math.cos(a)*21,c.y+Math.sin(a)*21,1.6,'#fff0c4');}
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
