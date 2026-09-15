// A tile-sized mine entrance. State colors and silhouettes work at phone sizes.
export function drawShaft(ctx, x, y, { open = false, time = 0, label = 'EXIT' } = {}) {
  ctx.save(); ctx.translate(x * 56, y * 56);
  const accent = open ? '#80ffbb' : '#ff977b';
  ctx.shadowColor = accent; ctx.shadowBlur = open ? 16 : 6;
  ctx.fillStyle = '#0a1017'; ctx.beginPath(); ctx.roundRect(3, 3, 50, 51, 8); ctx.fill(); ctx.shadowBlur = 0;
  // Receding tunnel arches give the entrance a visibly hollow interior.
  for (let i = 0; i < 3; i++) {
    ctx.strokeStyle = ['#52717b', '#31434f', '#1d2935'][i]; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.roundRect(12 + i * 4, 12 + i * 3, 32 - i * 8, 40 - i * 5, [12,12,0,0]); ctx.stroke();
  }
  ctx.strokeStyle = '#94b7b2'; ctx.lineWidth = 2;
  for (const side of [-1,1]) { ctx.beginPath(); ctx.moveTo(28 + side * 5, 32); ctx.lineTo(28 + side * 16, 54); ctx.stroke(); }
  for (let i = 0; i < 3; i++) { ctx.fillStyle = '#766142'; ctx.fillRect(17-i*2, 39+i*6, 22+i*4, 2); }
  const wood = ctx.createLinearGradient(0,0,12,0);
  wood.addColorStop(0,'#624126'); wood.addColorStop(.45,'#ce9b55'); wood.addColorStop(1,'#76502e');
  ctx.fillStyle = wood; ctx.fillRect(3, 10, 8, 44); ctx.fillRect(45, 10, 8, 44);
  ctx.fillStyle = '#a57b45'; ctx.fillRect(1, 3, 54, 10);
  ctx.fillStyle = '#f1c882'; ctx.fillRect(2, 3, 52, 2);
  for (const bx of [5,47]) for (const by of [17,44]) {
    ctx.fillStyle = '#303b43'; ctx.fillRect(bx-2,by,8,5);
    ctx.fillStyle = '#c8d1cd'; ctx.fillRect(bx+1,by+1,2,2);
  }
  if (open) {
    ctx.globalAlpha = .7 + Math.sin(time * 5) * .3;
    ctx.strokeStyle = accent; ctx.lineWidth = 3;
    ctx.beginPath();ctx.moveTo(21,29);ctx.lineTo(28,35);ctx.lineTo(35,29);ctx.stroke();ctx.globalAlpha = 1;
  } else {
    ctx.strokeStyle = '#b0a38c'; ctx.lineWidth = 2;
    for (let bx = 16; bx <= 40; bx += 6) { ctx.beginPath();ctx.moveTo(bx,20);ctx.lineTo(bx,48);ctx.stroke(); }
  }
  ctx.fillStyle = '#15262b';ctx.fillRect(12,1,32,12);
  ctx.fillStyle = accent;ctx.font = 'bold 9px system-ui';ctx.textAlign = 'center';ctx.textBaseline = 'middle';ctx.fillText(label,28,7);
  ctx.restore();
}

// Connected floor vents: walkable steel grilles with a shared cyan identity.
export function drawVent(ctx,x,y,{time=0,armed=false}={}) {
  ctx.save();ctx.translate(x*56+28,y*56+28);
  const color = armed ? '#ffc16e' : '#64e7ef';
  const pulse = armed ? .6 + .4 * Math.sin(time*14) : .75;
  ctx.fillStyle = '#07141d';ctx.beginPath();ctx.ellipse(0,6,24,20,0,0,Math.PI*2);ctx.fill();
  const metal = ctx.createLinearGradient(-22,-22,22,22);
  metal.addColorStop(0,'#b4d9cf');metal.addColorStop(.35,'#4c858c');metal.addColorStop(.7,'#24434e');metal.addColorStop(1,'#82afb1');
  ctx.fillStyle=metal;ctx.beginPath();ctx.roundRect(-24,-23,48,46,8);ctx.fill();
  ctx.fillStyle='#071920';ctx.beginPath();ctx.roundRect(-18,-17,36,32,6);ctx.fill();
  ctx.shadowColor=color;ctx.shadowBlur=armed?14:7;ctx.strokeStyle=color;ctx.lineWidth=2;
  ctx.globalAlpha=pulse;ctx.beginPath();ctx.roundRect(-21,-20,42,40,7);ctx.stroke();ctx.shadowBlur=0;ctx.globalAlpha=1;
  for(let i=-12;i<=12;i+=8) {
    ctx.fillStyle='#35535e';ctx.fillRect(i-2,-15,4,29);
    ctx.fillStyle='#7caaaa';ctx.fillRect(i-2,-15,1,29);
  }
  for(const dx of [-19,19]) for(const dy of [-18,17]) {ctx.fillStyle='#dbebda';ctx.beginPath();ctx.arc(dx,dy,1.5,0,Math.PI*2);ctx.fill();}
  // Matching arrows suggest flow into the underground connection.
  ctx.strokeStyle=color;ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(-6,-8);ctx.lineTo(0,-2);ctx.lineTo(6,-8);ctx.moveTo(-6,0);ctx.lineTo(0,6);ctx.lineTo(6,0);ctx.stroke();
  ctx.fillStyle='#152d36';ctx.fillRect(-18,16,36,10);ctx.fillStyle=color;ctx.font='bold 8px system-ui';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('LINK',0,21);
  ctx.restore();
}
