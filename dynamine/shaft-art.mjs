// Mine structures share rough stone, weathered timber, and copper hardware.
// Geometry stays inside a walkable tile; mist is a separate foreground pass.
function shape(ctx,points,color){ctx.fillStyle=color;ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();ctx.fill();}
function timber(ctx,x,y,w,h){
 const wood=ctx.createLinearGradient(x,y,x+w,y+h);wood.addColorStop(0,'#d0a371');wood.addColorStop(.35,'#947044');wood.addColorStop(1,'#4a3528');
 ctx.fillStyle=wood;ctx.fillRect(x,y,w,h);ctx.fillStyle='rgba(255,219,149,.35)';ctx.fillRect(x,y,w,1);
 ctx.strokeStyle='rgba(46,27,16,.45)';ctx.lineWidth=.7;
 for(let i=0;i<3;i++){ctx.beginPath();ctx.moveTo(x+2,y+2+i*(h-3)/3);ctx.lineTo(x+w-2,y+1+i*(h-3)/3);ctx.stroke();}
}
function bolt(ctx,x,y){ctx.fillStyle='#302c2a';ctx.beginPath();ctx.arc(x,y,1.7,0,Math.PI*2);ctx.fill();ctx.fillStyle='#c0bca4';ctx.fillRect(x-.8,y-1,.9,.9);}

export function drawVent(ctx,x,y,{time=0,armed=false}={}){
 ctx.save();ctx.translate(x*56,y*56);
 ctx.fillStyle='rgba(0,0,0,.4)';ctx.beginPath();ctx.ellipse(29,43,25,10,0,0,Math.PI*2);ctx.fill();
 // Uneven cut limestone around a square, sunken opening.
 shape(ctx,[[3,17],[9,7],[43,5],[53,15],[51,45],[42,52],[9,50],[2,40]],'#414b48');
 shape(ctx,[[4,16],[10,8],[43,6],[51,15],[43,19],[13,20]],'#9f9f84');
 shape(ctx,[[3,19],[12,21],[12,43],[8,48],[3,39]],'#727a6a');
 shape(ctx,[[44,19],[52,16],[50,43],[43,49],[41,42]],'#343e3c');
 shape(ctx,[[9,43],[44,42],[43,50],[10,49]],'#8b886b');
 ctx.fillStyle='#050d11';ctx.fillRect(12,18,31,26);
 // Receding masonry gives the hole depth without a grate sealing its mouth.
 shape(ctx,[[12,18],[43,18],[37,26],[18,26]],'#263634');
 shape(ctx,[[12,18],[18,26],[20,40],[12,44]],'#384842');
 ctx.strokeStyle='#576154';ctx.lineWidth=1;
 for(let i=0;i<3;i++){ctx.beginPath();ctx.moveTo(12,24+i*6);ctx.lineTo(18+i,29+i*4);ctx.stroke();}
 // Ladder descends along the back wall; the center is visibly open.
 ctx.strokeStyle='#a88656';ctx.lineWidth=1.5;
 for(const xx of [29,37]){ctx.beginPath();ctx.moveTo(xx,17);ctx.lineTo(xx-3,36);ctx.stroke();}
 for(let i=0;i<4;i++){ctx.beginPath();ctx.moveTo(29-i*.8,20+i*4);ctx.lineTo(37-i*.8,20+i*4);ctx.stroke();}
 timber(ctx,6,12,44,6);timber(ctx,7,42,42,6);
 for(const bx of [10,46]){bolt(ctx,bx,15);bolt(ctx,bx,45);}
 // Copper conduit and turquoise paint identify the linked blast network.
 ctx.strokeStyle='#ad7850';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(49,24);ctx.lineTo(53,24);ctx.lineTo(53,38);ctx.lineTo(48,38);ctx.stroke();
 ctx.strokeStyle='#e2b77e';ctx.lineWidth=.8;ctx.beginPath();ctx.moveTo(49,23);ctx.lineTo(54,23);ctx.lineTo(54,37);ctx.stroke();
 const lamp=armed?'#ffba60':'#86d9d0';
 if(armed){const glow=ctx.createRadialGradient(28,30,1,28,30,24);glow.addColorStop(0,`rgba(255,150,59,${.3+.15*Math.sin(time*15)})`);glow.addColorStop(1,'rgba(255,120,30,0)');ctx.fillStyle=glow;ctx.fillRect(4,6,48,48);}
 ctx.fillStyle='#25413f';ctx.fillRect(17,43,22,9);ctx.fillStyle=lamp;ctx.font='bold 7px system-ui';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('SHAFT',28,48);
 ctx.shadowColor=lamp;ctx.shadowBlur=armed?9:3;ctx.fillStyle=lamp;ctx.fillRect(7,27,3,7);ctx.fillRect(46,27,3,7);ctx.shadowBlur=0;
 ctx.restore();
}

export function drawShaft(ctx,x,y,{open=false,time=0,label='EXIT'}={}){
 ctx.save();ctx.translate(x*56,y*56);
 const light=open?'#a9ffcd':'#edaf68';
 ctx.fillStyle='rgba(0,0,0,.45)';ctx.beginPath();ctx.ellipse(28,47,27,8,0,0,Math.PI*2);ctx.fill();
 shape(ctx,[[1,49],[2,17],[10,4],[43,3],[54,18],[54,49]],'#424a43');
 shape(ctx,[[3,18],[11,6],[42,5],[52,18],[44,20],[38,12],[17,12],[11,21]],'#92917a');
 ctx.fillStyle='#050e12';ctx.beginPath();ctx.roundRect(10,12,36,39,[15,15,0,0]);ctx.fill();
 // Three arches recede toward a luminous gallery when the gate opens.
 for(let i=0;i<3;i++){ctx.strokeStyle=['#5c6250','#3e5045','#294136'][i];ctx.lineWidth=2;ctx.beginPath();ctx.roundRect(13+i*4,15+i*4,30-i*8,35-i*3,[12,12,0,0]);ctx.stroke();}
 if(open){const glow=ctx.createRadialGradient(28,34,1,28,34,26);glow.addColorStop(0,'rgba(196,255,207,.65)');glow.addColorStop(1,'rgba(67,171,119,0)');ctx.fillStyle=glow;ctx.fillRect(3,9,50,45);}
 // Rails widen toward the viewer.
 ctx.strokeStyle='#b0b7a2';ctx.lineWidth=1.5;
 for(const side of [-1,1]){ctx.beginPath();ctx.moveTo(28+side*3,30);ctx.lineTo(28+side*15,53);ctx.stroke();}
 for(let i=0;i<3;i++){ctx.fillStyle='#775b38';ctx.fillRect(22-i*4,36+i*7,12+i*8,2);}
 timber(ctx,4,14,7,37);timber(ctx,45,14,7,37);timber(ctx,2,9,52,7);
 for(const bx of [7,48])for(const by of [20,45]){ctx.fillStyle='#303c3b';ctx.fillRect(bx-3,by-2,6,5);bolt(ctx,bx,by);}
 if(!open){ctx.strokeStyle='#9b9a87';ctx.lineWidth=2;for(let xx=16;xx<=40;xx+=6){ctx.beginPath();ctx.moveTo(xx,19);ctx.lineTo(xx,47);ctx.stroke();}ctx.fillStyle='#7e6245';ctx.fillRect(14,33,28,3);}
 else {ctx.strokeStyle=light;ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(23,30);ctx.lineTo(28,35);ctx.lineTo(33,30);ctx.stroke();}
 ctx.fillStyle='#172d29';ctx.fillRect(15,4,27,12);ctx.fillStyle=light;ctx.font='bold 9px system-ui';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(label,28,10);
 for(const bx of [7,49]){ctx.fillStyle='#302c22';ctx.fillRect(bx-3,23,6,10);ctx.shadowColor=light;ctx.shadowBlur=open?12:3;ctx.fillStyle=light;ctx.fillRect(bx-1,25,2,6);ctx.shadowBlur=0;}
 if(!open){ctx.fillStyle='#251c15';ctx.fillRect(8,44,40,10);ctx.fillStyle='#edbf8a';ctx.font='bold 7px system-ui';ctx.fillText('LOCKED',28,49);}
 ctx.restore();
}

// Deterministic, time-driven steam; pause freezes it and no particles accumulate.
export function drawExitMist(ctx,x,y,{time=0,openedAt=0}={}){
 ctx.save();ctx.translate(x*56+28,y*56+34);
 const age=Math.max(0,time-openedAt);
 for(let i=0;i<10;i++){
  const phase=(age*.38+i*.107)%1;
  const radius=5+phase*14;
  const px=Math.sin(i*2.4+age*.8)*(4+phase*13),py=8-phase*62;
  const opacity=Math.sin(phase*Math.PI)*.33;
  const mist=ctx.createRadialGradient(px-radius*.25,py-radius*.2,1,px,py,radius);
  mist.addColorStop(0,`rgba(212,240,225,${opacity})`);mist.addColorStop(.5,`rgba(163,199,184,${opacity*.7})`);mist.addColorStop(1,'rgba(135,179,162,0)');
  ctx.fillStyle=mist;ctx.beginPath();ctx.ellipse(px,py,radius*1.3,radius,Math.sin(i)*.4,0,Math.PI*2);ctx.fill();
 }
 // First opening releases a broader puff, then the gentle plume takes over.
 if(age<1.2){const r=10+age*26;const burst=ctx.createRadialGradient(0,-age*18,2,0,-age*18,r);burst.addColorStop(0,`rgba(219,255,228,${.3*(1-age/1.2)})`);burst.addColorStop(1,'rgba(149,212,174,0)');ctx.fillStyle=burst;ctx.fillRect(-r,-age*18-r,r*2,r*2);}
 ctx.restore();
}
