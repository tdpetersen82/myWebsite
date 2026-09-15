import {JARS,featureActive} from './classic-content.mjs?v=20260915i';
export const EFFECT_COLORS={fire:'#ff853e',electric:'#d8f9ff',teleport:'#ba8aff',wind:'#72cfff'};
export function drawClassicPickup(ctx,type) {
  const jar=JARS[type];
  if(jar) {
    ctx.fillStyle=jar.form==='stone'?'rgba(200,225,255,.22)':jar.color;
    ctx.strokeStyle=jar.color;ctx.lineWidth=2;
    ctx.beginPath();ctx.roundRect(-12,-9,24,26,7);ctx.fill();ctx.stroke();
    ctx.fillStyle=jar.color;ctx.fillRect(-9,3,18,10);
    ctx.fillStyle='#e6dbc9';ctx.fillRect(-6,-17,12,8);
    ctx.fillStyle='#14242d';ctx.font='bold 17px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';
    if(jar.effect==='wind') {ctx.strokeStyle='#14242d';ctx.lineWidth=1.5;for(const y of [0,4,8]){ctx.beginPath();ctx.moveTo(-7,y);ctx.quadraticCurveTo(0,y-4,7,y);ctx.stroke();}}
    else ctx.fillText({fire:'✦',electric:'ϟ',teleport:'◎'}[jar.effect],0,4);
    if(jar.form==='stone') {ctx.fillStyle='#fff';ctx.font='bold 10px sans-serif';ctx.fillText('4',15,-12);}
    return true;
  }
  if(type==='bomb'||type==='fire') {
    ctx.fillStyle=type==='bomb'?'#64e789':'#bd83ff';ctx.strokeStyle='#f3fff2';ctx.lineWidth=1;
    ctx.beginPath();ctx.moveTo(0,-17);ctx.lineTo(13,-3);ctx.lineTo(8,12);ctx.lineTo(0,17);ctx.lineTo(-8,12);ctx.lineTo(-13,-3);ctx.closePath();ctx.fill();ctx.stroke();
    ctx.fillStyle='rgba(255,255,255,.4)';ctx.beginPath();ctx.moveTo(0,-15);ctx.lineTo(5,-2);ctx.lineTo(0,12);ctx.lineTo(-5,-2);ctx.fill();return true;
  }
  const labels={heart:['♥','#ff687e'],max:['MAX','#ffe285'],radiation:['☢','#c7ff5e']};
  if(!labels[type])return false;
  ctx.fillStyle=labels[type][1];ctx.font=`bold ${type==='max'?15:30}px sans-serif`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(labels[type][0],0,1);return true;
}
export function drawFeatures(ctx,g,tile) {
  for(const [k,f] of g.features) {
    const x=(k%13+.5)*tile,y=(Math.floor(k/13)+.5)*tile,active=featureActive(g,f);
    ctx.save();ctx.translate(x,y);ctx.lineWidth=3;
    ctx.fillStyle='#172126';ctx.fillRect(-23,-23,46,46);
    if(f.type==='spikes') {
      const warn=(g.time+(f.phase||0))%4>1.4;
      ctx.strokeStyle=active?'#ff694d':warn?'#ffcd76':'#687477';ctx.strokeRect(-22,-22,44,44);
      ctx.fillStyle=active?'#ffe1c0':'#59646a';
      for(const a of [0,Math.PI/2,Math.PI,Math.PI*1.5]) {
        ctx.save();ctx.rotate(a);for(const d of [-12,0,12]) {ctx.beginPath();ctx.moveTo(d-4,-20);ctx.lineTo(d+4,-20);ctx.lineTo(d,active?4:-13);ctx.fill();}ctx.restore();
      }
    } else if(f.type==='barrier') {
      ctx.fillStyle='#8cabb4';ctx.fillRect(-24,-24,7,48);ctx.fillRect(17,-24,7,48);
      ctx.strokeStyle=active?'#a4ecff':'#46616a';ctx.shadowColor='#65cfff';ctx.shadowBlur=active?12:0;
      for(let row=-14;row<=14;row+=14) {ctx.beginPath();ctx.moveTo(-18,row);for(let i=0;i<6;i++)ctx.lineTo(-12+i*6,row+(active?Math.sin(g.time*22+i+row)*6:0));ctx.stroke();}
    } else if(f.type==='gate') {
      ctx.rotate((f.turn||0)*Math.PI/2);ctx.strokeStyle='#e1b267';ctx.lineWidth=6;
      // Closed lower and left edges; the inside of this L opens up/right.
      ctx.beginPath();ctx.moveTo(-22,-22);ctx.lineTo(-22,22);ctx.lineTo(22,22);ctx.stroke();
      ctx.fillStyle='#fff0bf';ctx.beginPath();ctx.arc(-22,22,5,0,Math.PI*2);ctx.fill();
    } else {
      ctx.rotate({up:-Math.PI/2,right:0,down:Math.PI/2,left:Math.PI}[f.dir]);
      ctx.strokeStyle=f.type==='conveyor'?'#89ceba':'#ffd77a';
      if(f.type==='conveyor') {ctx.strokeRect(-24,-22,48,44);for(let i=0;i<5;i++) {const x=-22+(i*10+g.time*25)%46;ctx.beginPath();ctx.moveTo(x,-20);ctx.lineTo(x,20);ctx.stroke();}}
      ctx.fillStyle=f.type==='conveyor'?'#b2fff0':'#ffd77a';ctx.beginPath();ctx.moveTo(-13,-5);ctx.lineTo(1,-5);ctx.lineTo(1,-13);ctx.lineTo(16,0);ctx.lineTo(1,13);ctx.lineTo(1,5);ctx.lineTo(-13,5);ctx.closePath();ctx.fill();
    }
    ctx.restore();
  }
}
export function drawSpellEffects(ctx,g,tile) {
  for(const wave of g.effects)for(const [x,y] of wave.cells) {
    ctx.save();ctx.translate((x+.5)*tile,(y+.5)*tile);ctx.strokeStyle=EFFECT_COLORS[wave.effect];ctx.fillStyle=EFFECT_COLORS[wave.effect];ctx.globalAlpha=.2;ctx.fillRect(-tile/2,-tile/2,tile,tile);ctx.globalAlpha=.9;ctx.lineWidth=3;
    if(wave.effect==='electric') {ctx.beginPath();ctx.moveTo(-22,0);for(let i=0;i<7;i++)ctx.lineTo(-21+i*7,(i%2?1:-1)*10);ctx.stroke();}
    else {ctx.beginPath();ctx.ellipse(0,0,18,12,g.time*5,0,Math.PI*2);ctx.stroke();}ctx.restore();
  }
  for(const e of [...g.players,...g.enemies])if(e.alive&&(e.stunnedUntil||0)>g.time) {
    ctx.save();ctx.strokeStyle='#d7faff';ctx.lineWidth=2;ctx.beginPath();ctx.arc(e.x*tile,e.y*tile,25,0,Math.PI*2);ctx.stroke();ctx.font='bold 20px sans-serif';ctx.fillStyle='#fff';ctx.fillText('ϟ',e.x*tile-5,e.y*tile-24);ctx.restore();
  }
}
