// Decorative layers are separate from table geometry and scoring.
export class QuarryEffects {
  constructor(){this.time=0;this.particles=[];this.departure=0;}
  reset(){this.particles=[];this.departure=0;}
  hit(type,x,y,reduced){
    if(reduced)return;
    if(type==='shipment'){this.departure=3.5;return;}
    const count=type==='rock'?10:5;
    for(let i=0;i<count;i++){const a=i*2.4+this.time;this.particles.push({x,y,vx:Math.cos(a)*55,vy:-35-Math.abs(Math.sin(a))*65,life:.5+i*.025,max:.5+i*.025});}
    this.particles=this.particles.slice(-80);
  }
  tick(dt,reduced){
    if(reduced){this.particles=[];this.departure=0;return;}
    this.time+=dt;this.departure=Math.max(0,this.departure-dt);
    for(const p of this.particles){p.life-=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=100*dt;}
    this.particles=this.particles.filter(p=>p.life>0);
  }
  draw(ctx){for(const p of this.particles){ctx.globalAlpha=Math.max(0,p.life/p.max)*.65;ctx.fillStyle='#e4d4ad';ctx.fillRect(p.x,p.y,3,3);}ctx.globalAlpha=1;}
}

function polygon(ctx,points,color){ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();ctx.fillStyle=color;ctx.fill();}

export function drawQuarry(ctx,w,shift,fx,reduced,line,text){
  ctx.fillStyle='#b5a17d';ctx.fillRect(0,0,600,900);
  // Sawn limestone around the cabinet, with offset joints and mineral flecks.
  for(let y=0;y<900;y+=38){line([[0,y],[600,y]],'#756c55',2);for(let x=(y/38%2)*45;x<600;x+=90)line([[x,y],[x,y+38]],'#8d8166',1);}
  for(let i=0;i<150;i++){const x=(i*137.3)%600,y=(i*71.7)%900;ctx.fillStyle=i%2?'#d8c7a340':'#695f4e30';ctx.fillRect(x,y,2+i%4,1);}
  polygon(ctx,[[44,840],[34,200],[54,108],[110,53],[466,53],[521,94],[566,155],[566,880],[445,899],[156,899]],'#223c3c');
  // Quarry benches cut into the left wall. These are painted scenery, not obstacles.
  for(let i=0;i<5;i++)polygon(ctx,[[55+i*12,220+i*20],[84+i*15,230+i*20],[101+i*15,340+i*10],[99+i*15,472-i*3],[61+i*12,515-i*4]],['#526059','#626b5e','#75806a','#899078','#aaa487'][i]);
  for(let i=0;i<4;i++)line([[85+i*15,285+i*15],[91+i*15,340],[88+i*15,453]],'#ddd0a855',1);
  // A broad dark floor keeps the ball legible beneath the machinery.
  polygon(ctx,[[185,320],[391,318],[463,525],[411,737],[200,737],[172,532]],'#294443');
  for(let i=0;i<65;i++){ctx.fillStyle='#b5ba9720';ctx.fillRect(195+(i*47)%207,345+(i*73)%360,2,1);}
  ctx.beginPath();ctx.ellipse(352,595,47,66,-.35,0,Math.PI*2);ctx.fillStyle='#142f34';ctx.fill();ctx.strokeStyle='#768570';ctx.lineWidth=5;ctx.stroke();
  for(let i=0;i<3;i++){ctx.beginPath();ctx.ellipse(352,595,23+i*6,34+i*8,-.35,0,Math.PI*2);ctx.strokeStyle='#4f8b862d';ctx.lineWidth=1;ctx.stroke();}
  text('SETTLING POND',350,675,8,'#93aaa0');
  line([[196,462],[375,462]],'#9a8765',2);line([[196,475],[375,475]],'#9a8765',2);
  for(let x=200;x<375;x+=13)line([[x,459],[x,478]],'#796b50',3);
  const wagon=(x,y,loaded)=>{
    ctx.fillStyle='#162b2c';ctx.fillRect(x-2,y+3,39,22);ctx.fillStyle=loaded?'#b29b69':'#656e58';ctx.fillRect(x,y,35,20);
    for(let k=5;k<35;k+=10)line([[x+k,y+2],[x+k,y+17]],'#6b6047',2);
    if(loaded)polygon(ctx,[[x+2,y],[x+7,y-7],[x+14,y-3],[x+22,y-8],[x+31,y-3],[x+33,y]],'#d1c3a2');
    for(const k of [7,28]){ctx.beginPath();ctx.arc(x+k,y+22,4,0,Math.PI*2);ctx.fillStyle='#0f2528';ctx.fill();}
  };
  if(fx.departure>0&&!reduced){wagon(205+(3.5-fx.departure)*110,447,true);text('SHIPMENT DISPATCHED',285,432,10,'#eac67d');}
  else for(let i=0;i<Math.min(4,Math.max(1,shift.shipments));i++)wagon(205+i*42,447,shift.shipments>i);
  text('FREIGHT / '+shift.shipments+' DISPATCHED',285,504,9,'#a1b09b');
  // Work lights and worn fasteners around the cabinet edge.
  for(const [x,y] of [[24,215],[22,550],[580,215],[580,550]]){ctx.fillStyle='#485047';ctx.fillRect(x-5,y-9,10,18);ctx.fillStyle='#e4bd70';ctx.fillRect(x-3,y-6,6,12);}
  text('LIMESTONE',300,22,15,'#354640');text('QUARRY NO. 01',300,887,10,'#cfbf98');
}
