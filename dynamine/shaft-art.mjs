// Mine structures share rough stone, weathered timber, and copper hardware.
// Geometry stays inside a walkable tile; mist is a separate foreground pass.
function shape(ctx, points, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  points.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.closePath();
  ctx.fill();
}
function timber(ctx, x, y, w, h) {
  const wood = ctx.createLinearGradient(x, y, x + w, y + h);
  wood.addColorStop(0, '#d0a371');
  wood.addColorStop(0.35, '#947044');
  wood.addColorStop(1, '#4a3528');
  ctx.fillStyle = wood;
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = 'rgba(255,219,149,.35)';
  ctx.fillRect(x, y, w, 1);
  ctx.strokeStyle = 'rgba(46,27,16,.45)';
  ctx.lineWidth = 0.7;
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.moveTo(x + 2, y + 2 + (i * (h - 3)) / 3);
    ctx.lineTo(x + w - 2, y + 1 + (i * (h - 3)) / 3);
    ctx.stroke();
  }
}
function bolt(ctx, x, y) {
  ctx.fillStyle = '#302c2a';
  ctx.beginPath();
  ctx.arc(x, y, 1.7, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#c0bca4';
  ctx.fillRect(x - 0.8, y - 1, 0.9, 0.9);
}

export function drawVent(ctx, x, y, { time = 0, armed = false } = {}) {
  ctx.save();
  ctx.translate(x * 56, y * 56);
  const accent = armed ? '#ffc16b' : '#83ded3';
  const rim = [
    [4, 14],
    [13, 5],
    [43, 5],
    [52, 14],
    [52, 43],
    [43, 51],
    [13, 51],
    [4, 43],
  ];
  ctx.fillStyle = 'rgba(0,0,0,.5)';
  ctx.beginPath();
  ctx.ellipse(29, 46, 26, 9, 0, 0, Math.PI * 2);
  ctx.fill();
  shape(ctx, rim, '#303b3b');
  // Broad cut-stone rim, lit from above; the mouth remains completely open.
  const stone = ctx.createLinearGradient(0, 5, 0, 51);
  stone.addColorStop(0, '#c4bba0');
  stone.addColorStop(0.45, '#818775');
  stone.addColorStop(1, '#4e5b52');
  shape(
    ctx,
    [
      [5, 14],
      [13, 6],
      [43, 6],
      [51, 14],
      [51, 42],
      [43, 49],
      [13, 49],
      [5, 42],
    ],
    stone,
  );
  shape(
    ctx,
    [
      [11, 17],
      [17, 12],
      [39, 12],
      [45, 17],
      [45, 40],
      [39, 45],
      [17, 45],
      [11, 40],
    ],
    '#111f24',
  );
  // Perspective wall courses descend into a black shaft.
  shape(
    ctx,
    [
      [12, 17],
      [18, 13],
      [38, 13],
      [44, 17],
      [38, 25],
      [20, 25],
    ],
    '#55625a',
  );
  shape(
    ctx,
    [
      [12, 17],
      [20, 25],
      [22, 41],
      [12, 39],
    ],
    '#354942',
  );
  shape(
    ctx,
    [
      [44, 17],
      [38, 25],
      [35, 41],
      [44, 39],
    ],
    '#213430',
  );
  const depth = ctx.createLinearGradient(0, 22, 0, 44);
  depth.addColorStop(0, '#14272a');
  depth.addColorStop(1, '#020709');
  shape(
    ctx,
    [
      [20, 24],
      [38, 24],
      [36, 43],
      [21, 43],
    ],
    depth,
  );
  ctx.strokeStyle = 'rgba(192,208,175,.25)';
  ctx.lineWidth = 1;
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.moveTo(12, 23 + i * 6);
    ctx.lineTo(20 + i, 28 + i * 4);
    ctx.stroke();
  }
  // Brass ladder tapers and darkens into the depth on the right-hand wall.
  for (let i = 0; i < 5; i++) {
    const yy = 16 + i * 5,
      left = 29 + i * 0.65,
      right = 40 - i * 0.4;
    ctx.strokeStyle = `rgba(222,181,112,${1 - i * 0.16})`;
    ctx.lineWidth = 1.7 - i * 0.15;
    ctx.beginPath();
    ctx.moveTo(left, yy);
    ctx.lineTo(right, yy);
    ctx.stroke();
    if (i < 4) {
      ctx.beginPath();
      ctx.moveTo(left, yy - 1);
      ctx.lineTo(left + 0.65, yy + 5);
      ctx.moveTo(right, yy - 1);
      ctx.lineTo(right - 0.4, yy + 5);
      ctx.stroke();
    }
  }
  // Reinforced corners and chipped limestone distinguish this from a floor tile.
  for (const [bx, by] of [
    [10, 12],
    [46, 12],
    [10, 43],
    [46, 43],
  ]) {
    ctx.fillStyle = '#394846';
    ctx.fillRect(bx - 3, by - 3, 6, 6);
    bolt(ctx, bx, by);
  }
  ctx.strokeStyle = '#eee0b8';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(16, 7);
  ctx.lineTo(40, 7);
  ctx.moveTo(6, 17);
  ctx.lineTo(6, 35);
  ctx.stroke();
  // Matching cyan conduits make every opening part of the same blast network.
  ctx.strokeStyle = '#71563c';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(49, 22);
  ctx.lineTo(54, 22);
  ctx.lineTo(54, 36);
  ctx.lineTo(49, 36);
  ctx.stroke();
  ctx.strokeStyle = accent;
  ctx.lineWidth = 1.4;
  ctx.stroke();
  const pulse = 0.2 + 0.12 * Math.sin(time * (armed ? 12 : 2.5));
  const glow = ctx.createRadialGradient(25, 30, 2, 25, 30, 22);
  glow.addColorStop(0, armed ? `rgba(255,146,45,${pulse + 0.2})` : `rgba(75,197,184,${pulse})`);
  glow.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(7, 10, 42, 37);
  for (const lx of [8, 48]) {
    ctx.fillStyle = '#142a2b';
    ctx.fillRect(lx - 2, 23, 4, 12);
    ctx.shadowColor = accent;
    ctx.shadowBlur = armed ? 10 : 5;
    ctx.fillStyle = accent;
    ctx.fillRect(lx - 1, 25, 2, 7);
    ctx.shadowBlur = 0;
  }
  // A linked-ring emblem stays legible at game scale without tiny lettering.
  ctx.fillStyle = '#223633';
  ctx.fillRect(21, 44, 15, 7);
  ctx.strokeStyle = accent;
  ctx.lineWidth = 1.2;
  for (const cx of [26, 31]) {
    ctx.beginPath();
    ctx.ellipse(cx, 47.5, 3, 1.8, -0.4, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
}

export function drawShaft(ctx, x, y, { open = false, time = 0, label = 'EXIT' } = {}) {
  ctx.save();
  ctx.translate(x * 56, y * 56);
  const light = open ? '#a9ffcd' : '#edaf68';
  ctx.fillStyle = 'rgba(0,0,0,.45)';
  ctx.beginPath();
  ctx.ellipse(28, 47, 27, 8, 0, 0, Math.PI * 2);
  ctx.fill();
  shape(
    ctx,
    [
      [1, 49],
      [2, 17],
      [10, 4],
      [43, 3],
      [54, 18],
      [54, 49],
    ],
    '#424a43',
  );
  shape(
    ctx,
    [
      [3, 18],
      [11, 6],
      [42, 5],
      [52, 18],
      [44, 20],
      [38, 12],
      [17, 12],
      [11, 21],
    ],
    '#92917a',
  );
  ctx.fillStyle = '#050e12';
  ctx.beginPath();
  ctx.roundRect(10, 12, 36, 39, [15, 15, 0, 0]);
  ctx.fill();
  // Three arches recede toward a luminous gallery when the gate opens.
  for (let i = 0; i < 3; i++) {
    ctx.strokeStyle = ['#5c6250', '#3e5045', '#294136'][i];
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(13 + i * 4, 15 + i * 4, 30 - i * 8, 35 - i * 3, [12, 12, 0, 0]);
    ctx.stroke();
  }
  if (open) {
    const glow = ctx.createRadialGradient(28, 34, 1, 28, 34, 26);
    glow.addColorStop(0, 'rgba(196,255,207,.65)');
    glow.addColorStop(1, 'rgba(67,171,119,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(3, 9, 50, 45);
  }
  // Rails widen toward the viewer.
  ctx.strokeStyle = '#b0b7a2';
  ctx.lineWidth = 1.5;
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(28 + side * 3, 30);
    ctx.lineTo(28 + side * 15, 53);
    ctx.stroke();
  }
  for (let i = 0; i < 3; i++) {
    ctx.fillStyle = '#775b38';
    ctx.fillRect(22 - i * 4, 36 + i * 7, 12 + i * 8, 2);
  }
  timber(ctx, 4, 14, 7, 37);
  timber(ctx, 45, 14, 7, 37);
  timber(ctx, 2, 9, 52, 7);
  for (const bx of [7, 48])
    for (const by of [20, 45]) {
      ctx.fillStyle = '#303c3b';
      ctx.fillRect(bx - 3, by - 2, 6, 5);
      bolt(ctx, bx, by);
    }
  if (!open) {
    ctx.strokeStyle = '#9b9a87';
    ctx.lineWidth = 2;
    for (let xx = 16; xx <= 40; xx += 6) {
      ctx.beginPath();
      ctx.moveTo(xx, 19);
      ctx.lineTo(xx, 47);
      ctx.stroke();
    }
    ctx.fillStyle = '#7e6245';
    ctx.fillRect(14, 33, 28, 3);
  } else {
    ctx.strokeStyle = light;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(23, 30);
    ctx.lineTo(28, 35);
    ctx.lineTo(33, 30);
    ctx.stroke();
  }
  ctx.fillStyle = '#172d29';
  ctx.fillRect(15, 4, 27, 12);
  ctx.fillStyle = light;
  ctx.font = 'bold 9px system-ui';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, 28, 10);
  for (const bx of [7, 49]) {
    ctx.fillStyle = '#302c22';
    ctx.fillRect(bx - 3, 23, 6, 10);
    ctx.shadowColor = light;
    ctx.shadowBlur = open ? 12 : 3;
    ctx.fillStyle = light;
    ctx.fillRect(bx - 1, 25, 2, 6);
    ctx.shadowBlur = 0;
  }
  if (!open) {
    ctx.fillStyle = '#251c15';
    ctx.fillRect(8, 44, 40, 10);
    ctx.fillStyle = '#edbf8a';
    ctx.font = 'bold 7px system-ui';
    ctx.fillText('LOCKED', 28, 49);
  }
  ctx.restore();
}

// Deterministic, time-driven steam; pause freezes it and no particles accumulate.
export function drawExitMist(ctx, x, y, { time = 0, openedAt = 0 } = {}) {
  ctx.save();
  ctx.translate(x * 56 + 28, y * 56 + 34);
  const age = Math.max(0, time - openedAt);
  for (let i = 0; i < 10; i++) {
    const phase = (age * 0.38 + i * 0.107) % 1;
    const radius = 5 + phase * 14;
    const px = Math.sin(i * 2.4 + age * 0.8) * (4 + phase * 13),
      py = 8 - phase * 62;
    const opacity = Math.sin(phase * Math.PI) * 0.33;
    const mist = ctx.createRadialGradient(px - radius * 0.25, py - radius * 0.2, 1, px, py, radius);
    mist.addColorStop(0, `rgba(212,240,225,${opacity})`);
    mist.addColorStop(0.5, `rgba(163,199,184,${opacity * 0.7})`);
    mist.addColorStop(1, 'rgba(135,179,162,0)');
    ctx.fillStyle = mist;
    ctx.beginPath();
    ctx.ellipse(px, py, radius * 1.3, radius, Math.sin(i) * 0.4, 0, Math.PI * 2);
    ctx.fill();
  }
  // First opening releases a broader puff, then the gentle plume takes over.
  if (age < 1.2) {
    const r = 10 + age * 26;
    const burst = ctx.createRadialGradient(0, -age * 18, 2, 0, -age * 18, r);
    burst.addColorStop(0, `rgba(219,255,228,${0.3 * (1 - age / 1.2)})`);
    burst.addColorStop(1, 'rgba(149,212,174,0)');
    ctx.fillStyle = burst;
    ctx.fillRect(-r, -age * 18 - r, r * 2, r * 2);
  }
  ctx.restore();
}
