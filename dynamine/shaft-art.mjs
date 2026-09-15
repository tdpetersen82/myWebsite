// A tile-sized mine entrance. State colors and silhouettes work at phone sizes.
export function drawShaft(ctx, x, y, { sealed = false, open = false, time = 0, label = 'EXIT' } = {}) {
  ctx.save(); ctx.translate(x * 56, y * 56);
  const accent = sealed ? '#ffc45b' : open ? '#80ffbb' : '#ff977b';
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
  if (sealed) {
    // Crossed demolition planks: unmistakably different from regular rocks.
    for (const angle of [-.5,.5]) {
      ctx.save(); ctx.translate(28,32); ctx.rotate(angle);
      ctx.fillStyle = '#533824'; ctx.fillRect(-21,-5,42,11);
      ctx.fillStyle = '#d59e54'; ctx.fillRect(-21,-5,42,7);
      ctx.fillStyle = '#ffe0a2'; ctx.fillRect(-19,-4,38,1);
      ctx.fillStyle = '#3d3430'; ctx.fillRect(-17,-2,2,2); ctx.fillRect(15,-2,2,2); ctx.restore();
    }
    ctx.fillStyle = '#df493c'; ctx.beginPath(); ctx.arc(28,32,9,0,Math.PI*2); ctx.fill();
    ctx.strokeStyle = '#fff4d1'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(24,28);ctx.lineTo(32,36);ctx.moveTo(32,28);ctx.lineTo(24,36);ctx.stroke();
  } else if (open) {
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
