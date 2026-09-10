// Decorative layers are separate from table geometry and scoring.
export class QuarryEffects {
  constructor(){this.time=0;this.particles=[];this.departure=0;this.rings=[];}
  reset(){this.particles=[];this.departure=0;this.rings=[];}
  hit(type,x,y,reduced){
    if(reduced)return;
    if(type==='shipment'){this.departure=3.5;return;}
    if(type==='crusher'||type==='sling')this.rings.push({x,y,life:.3});
    this.rings=this.rings.slice(-12);
    const count=type==='rock'?10:5;
    for(let i=0;i<count;i++){const a=i*2.4+this.time;this.particles.push({x,y,vx:Math.cos(a)*55,vy:-35-Math.abs(Math.sin(a))*65,life:.5+i*.025,max:.5+i*.025});}
    this.particles=this.particles.slice(-80);
  }
  tick(dt,reduced){
    if(reduced){this.particles=[];this.rings=[];this.departure=0;return;}
    for(const ring of this.rings)ring.life-=dt;this.rings=this.rings.filter(r=>r.life>0);
    this.time+=dt;this.departure=Math.max(0,this.departure-dt);
    for(const p of this.particles){p.life-=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=100*dt;}
    this.particles=this.particles.filter(p=>p.life>0);
  }
  draw(ctx){for(const r of this.rings){ctx.beginPath();ctx.arc(r.x,r.y,12+(1-r.life/.3)*25,0,Math.PI*2);ctx.strokeStyle=`rgba(255,211,133,${r.life})`;ctx.lineWidth=2;ctx.stroke();}for(const p of this.particles){ctx.globalAlpha=Math.max(0,p.life/p.max)*.65;ctx.fillStyle='#e4d4ad';ctx.fillRect(p.x,p.y,3,3);}ctx.globalAlpha=1;}
}

const backdrop=typeof Image==='undefined'?null:new Image();
if(backdrop){backdrop.src=new URL('./assets/quarry-playfield-v2.jpg',import.meta.url).href;backdrop.decode?.().catch(()=>{});}
export function drawQuarry(ctx,w,shift,fx,reduced,line,text){
  ctx.fillStyle='#203438';ctx.fillRect(0,0,600,900);
  if(backdrop?.complete&&backdrop.naturalWidth)ctx.drawImage(backdrop,0,0,600,900);
  // A thin tint keeps real collision surfaces and the steel ball readable.
  ctx.fillStyle='#071d231c';ctx.fillRect(0,0,600,900);
  const vignette=ctx.createRadialGradient(300,400,140,300,450,580);
  vignette.addColorStop(0,'#06151b00');vignette.addColorStop(1,'#020c1b80');ctx.fillStyle=vignette;ctx.fillRect(0,0,600,900);
  if(fx.departure>0&&!reduced){
    const x=170+(3.5-fx.departure)*145,y=347+(x-170)*.13;
    ctx.save();ctx.translate(x,y);ctx.rotate(.13);ctx.shadowColor='#000b';ctx.shadowBlur=8;ctx.shadowOffsetY=4;
    ctx.fillStyle='#513e2c';ctx.fillRect(0,0,48,20);ctx.fillStyle='#af986a';ctx.fillRect(1,-2,46,16);
    for(let k=3;k<46;k+=6){ctx.fillStyle=k%2?'#d6c8a2':'#a29173';ctx.fillRect(k,-5+(k%3),6,7);}
    for(const k of [8,38]){ctx.beginPath();ctx.arc(k,22,5,0,Math.PI*2);ctx.fillStyle='#101c20';ctx.fill();}
    ctx.restore();
  }
  ctx.fillStyle='#102a30d9';ctx.fillRect(211,493,179,31);ctx.strokeStyle='#ad936050';ctx.lineWidth=1;ctx.strokeRect(211,493,179,31);
  text('FREIGHT / '+shift.shipments+' DISPATCHED',300,513,10,'#e4c998');
}
