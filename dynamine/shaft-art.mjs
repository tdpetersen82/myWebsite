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
  if (!open) { ctx.fillStyle='#251512';ctx.fillRect(7,43,42,11);ctx.fillStyle='#ffc29a';ctx.font='bold 8px system-ui';ctx.fillText('LOCKED',28,49); }
  ctx.restore();
}

// Open, walkable pipe mouths. The empty center makes the shaft visibly usable.
export function drawVent(ctx,x,y,{time=0,armed=false}={}) {
  ctx.save();ctx.translate(x*56+28,y*56+28);
  const color=armed?'#ffc16e':'#64e7ef';
  ctx.fillStyle='#111c23';ctx.beginPath();ctx.ellipse(0,8,25,19,0,0,Math.PI*2);ctx.fill();
  const metal=ctx.createLinearGradient(-24,-24,24,24);
  metal.addColorStop(0,'#b0e5de');metal.addColorStop(.4,'#467f89');metal.addColorStop(1,'#163842');
  ctx.fillStyle=metal;ctx.beginPath();ctx.ellipse(0,0,24,21,0,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#020b13';ctx.beginPath();ctx.ellipse(0,0,17,15,0,0,Math.PI*2);ctx.fill();
  // Receding rings and a ladder on one side, leaving the mouth unobstructed.
  for(let i=0;i<3;i++) {
    ctx.strokeStyle=['#356573','#244b5a','#183643'][i];ctx.lineWidth=1.5;
    ctx.beginPath();ctx.ellipse(0,3+i*3,14-i*3,10-i*2,0,0,Math.PI);ctx.stroke();
  }
  ctx.strokeStyle='#64857c';ctx.lineWidth=1.5;
  for(let i=0;i<3;i++){ctx.beginPath();ctx.moveTo(7-i,1+i*4);ctx.lineTo(12-i,1+i*4);ctx.stroke();}
  ctx.strokeStyle=color;ctx.lineWidth=2.5;ctx.shadowColor=color;ctx.shadowBlur=armed?16:6;
  ctx.globalAlpha=armed?.65+.35*Math.sin(time*14):.9;
  ctx.beginPath();ctx.ellipse(0,-1,21,18,0,0,Math.PI*2);ctx.stroke();ctx.globalAlpha=1;ctx.shadowBlur=0;
  for(const dx of [-20,20]){ctx.fillStyle='#d3e7ca';ctx.beginPath();ctx.arc(dx,0,1.5,0,Math.PI*2);ctx.fill();}
  ctx.fillStyle='#142c32';ctx.fillRect(-19,17,38,11);ctx.fillStyle=color;
  ctx.font='bold 8px system-ui';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('SHAFT',0,23);
  ctx.restore();
}
