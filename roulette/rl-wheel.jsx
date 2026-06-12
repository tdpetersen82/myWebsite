/* eslint-disable */
// Brass-rimmed European roulette wheel (canvas, single-zero).

const WHEEL_ORDER = [
  0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36,
  11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9,
  22, 18, 29, 7, 28, 12, 35, 3, 26
];
const RED_NUMBERS = [1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36];

function isRed(n) { return RED_NUMBERS.includes(n); }
function pocketColor(n) {
  if (n === 0) return '#0e6e3a';
  return isRed(n) ? '#a52a2a' : '#1a1410';
}

const SPIN_DURATION = 4000;
const PAD = 44; // extra canvas bleed so the brass rim and pointer triangle aren't clipped

function Wheel({ size = 280, target, onLanded, spinning, onTickStart, onTickStop, onSpinStart, onBallDrop }) {
  const canvasRef = React.useRef(null);
  // Start at -pocketAngle/2 so pocket 0 sits centered under the pointer with
  // the resting ball in it.
  const angleRef = React.useRef(-Math.PI / WHEEL_ORDER.length);
  const rafRef = React.useRef(null);
  const numPockets = WHEEL_ORDER.length;
  const pocketAngle = (2 * Math.PI) / numPockets;

  // ball: { angle, radius } in wheel coordinates, or null for no ball
  function draw(ctx, currentAngle, ball) {
    const W = size + PAD * 2, H = size + PAD * 2;
    const cx = W / 2, cy = H / 2;
    const outerR = size * 0.46;
    const innerR = size * 0.30;
    const textR = size * 0.385;

    ctx.clearRect(0, 0, W, H);

    // outer brass rim (deeper)
    ctx.beginPath();
    ctx.arc(cx, cy, outerR + 18, 0, Math.PI * 2);
    const grad = ctx.createRadialGradient(cx - 8, cy - 8, outerR + 4, cx, cy, outerR + 22);
    grad.addColorStop(0, '#e6c590');
    grad.addColorStop(0.55, '#c9a26a');
    grad.addColorStop(1, '#5d4626');
    ctx.fillStyle = grad;
    ctx.fill();

    // inner brass bevel
    ctx.beginPath();
    ctx.arc(cx, cy, outerR + 4, 0, Math.PI * 2);
    ctx.fillStyle = '#3a2418';
    ctx.fill();

    // Pockets
    for (let i = 0; i < numPockets; i++) {
      const startAngle = currentAngle + i * pocketAngle - Math.PI / 2;
      const endAngle = startAngle + pocketAngle;
      const num = WHEEL_ORDER[i];
      ctx.beginPath();
      ctx.moveTo(cx + innerR * Math.cos(startAngle), cy + innerR * Math.sin(startAngle));
      ctx.arc(cx, cy, outerR, startAngle, endAngle);
      ctx.arc(cx, cy, innerR, endAngle, startAngle, true);
      ctx.closePath();
      ctx.fillStyle = pocketColor(num);
      ctx.fill();
      ctx.strokeStyle = 'rgba(201,162,106,.55)';
      ctx.lineWidth = 0.6;
      ctx.stroke();

      const midAngle = startAngle + pocketAngle / 2;
      ctx.save();
      ctx.translate(cx + textR * Math.cos(midAngle), cy + textR * Math.sin(midAngle));
      ctx.rotate(midAngle + Math.PI / 2);
      ctx.fillStyle = num === 0 ? '#f4ecd8' : '#f4ecd8';
      ctx.font = `bold ${Math.max(10, size * 0.04)}px 'JetBrains Mono', monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(num.toString(), 0, 0);
      ctx.restore();
    }

    // inner felt circle
    ctx.beginPath();
    ctx.arc(cx, cy, innerR, 0, Math.PI * 2);
    const ig = ctx.createRadialGradient(cx, cy - innerR * 0.3, innerR * 0.2, cx, cy, innerR);
    ig.addColorStop(0, '#1a4f3a');
    ig.addColorStop(1, '#0a2a21');
    ctx.fillStyle = ig;
    ctx.fill();
    ctx.strokeStyle = '#c9a26a';
    ctx.lineWidth = 2;
    ctx.stroke();

    // center medallion
    ctx.beginPath();
    ctx.arc(cx, cy, size * 0.11, 0, Math.PI * 2);
    const cg = ctx.createRadialGradient(cx - 4, cy - 4, 2, cx, cy, size * 0.11);
    cg.addColorStop(0, '#f5d896');
    cg.addColorStop(1, '#8c6a3f');
    ctx.fillStyle = cg;
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx, cy, size * 0.07, 0, Math.PI * 2);
    ctx.fillStyle = '#0c1611';
    ctx.fill();

    // L monogram
    ctx.fillStyle = 'rgba(230,197,144,.7)';
    ctx.font = `italic 700 ${size * 0.06}px 'Playfair Display', serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('L', cx, cy);

    // Pointer / indicator at top
    ctx.beginPath();
    ctx.moveTo(cx, cy - outerR - 22);
    ctx.lineTo(cx - 10, cy - outerR - 36);
    ctx.lineTo(cx + 10, cy - outerR - 36);
    ctx.closePath();
    ctx.fillStyle = '#e6c590';
    ctx.fill();
    ctx.strokeStyle = '#5d4626';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Ball
    if (ball != null) {
      const bx = cx + ball.radius * Math.cos(ball.angle);
      const by = cy + ball.radius * Math.sin(ball.angle);
      ctx.beginPath();
      ctx.arc(bx, by, 6, 0, Math.PI * 2);
      ctx.fillStyle = '#f4ecd8';
      ctx.fill();
      ctx.strokeStyle = '#8c6a3f';
      ctx.lineWidth = 1.2;
      ctx.stroke();
      // highlight
      ctx.beginPath();
      ctx.arc(bx - 1.5, by - 1.5, 2, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,255,255,.7)';
      ctx.fill();
    }
  }

  function restingBall() {
    const outerR = size * 0.46, innerR = size * 0.30;
    return { angle: -Math.PI / 2, radius: outerR - (outerR - innerR) * 0.5 };
  }

  // Initial draw + redraw on size change
  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const canvasW = size + PAD * 2;
    canvas.width = canvasW * dpr;
    canvas.height = canvasW * dpr;
    canvas.style.width = canvasW + 'px';
    canvas.style.height = canvasW + 'px';
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    draw(ctx, angleRef.current, restingBall());
  }, [size]);

  // Spin trigger — a chained setTimeout stepper with wall-clock t. Hidden
  // tabs throttle setTimeout (rAF stops entirely), but because t comes from
  // performance.now() the spin still completes and lands correctly on the
  // next available tick after the player returns.
  React.useEffect(() => {
    if (!spinning || target == null) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    // Normalize the accumulated angle into (-2π, 0] before computing the end
    // angle — computing it from absolute zero made every spin after the
    // first travel a near-random distance, often backward.
    let startAngle = angleRef.current % (2 * Math.PI);
    if (startAngle > 0) startAngle -= 2 * Math.PI;
    angleRef.current = startAngle;

    const targetIndex = WHEEL_ORDER.indexOf(target);
    const finalAngle = -(targetIndex * pocketAngle + pocketAngle / 2);
    let delta = finalAngle - startAngle;            // forward (negative) remainder
    if (delta > 0) delta -= 2 * Math.PI;
    const fullRotations = 5 + Math.floor(Math.random() * 3);
    const endAngle = startAngle + delta - fullRotations * 2 * Math.PI;

    // The ball orbits the rim the opposite way, then drops and rides the
    // winning pocket to the top.
    const outerR = size * 0.46, innerR = size * 0.30;
    const trackR = outerR + 9;
    const pocketR = outerR - (outerR - innerR) * 0.5;
    const DROP_T = 0.62;                            // when the ball leaves the rim
    const ballStart = -Math.PI / 2;
    const ballEnd = ballStart + (3.25 + Math.random()) * 2 * Math.PI;
    const lockAngle = (wheelA) => wheelA + targetIndex * pocketAngle + pocketAngle / 2 - Math.PI / 2;
    let dropOffset = null;
    let dropFired = false;

    const startTime = performance.now();
    let cancelled = false;
    let landed = false;

    onSpinStart && onSpinStart();
    onTickStart && onTickStart(SPIN_DURATION);

    function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }
    function easeOutQuart(t) { return 1 - Math.pow(1 - t, 4); }

    function step() {
      if (cancelled) return;
      const elapsed = performance.now() - startTime;
      const t = Math.min(elapsed / SPIN_DURATION, 1);
      angleRef.current = startAngle + (endAngle - startAngle) * easeOutCubic(t);

      let ball;
      if (t < DROP_T) {
        ball = { angle: ballStart + (ballEnd - ballStart) * easeOutQuart(t), radius: trackR };
      } else {
        if (dropOffset == null) {
          const freeA = ballStart + (ballEnd - ballStart) * easeOutQuart(t);
          // forward remainder relative to the pocket, < one revolution
          dropOffset = ((freeA - lockAngle(angleRef.current)) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI);
        }
        if (!dropFired) { dropFired = true; onBallDrop && onBallDrop(); }
        const u = Math.min((t - DROP_T) / (1 - DROP_T), 1);
        const angle = lockAngle(angleRef.current) + dropOffset * (1 - easeOutCubic(u));
        const bounce = Math.abs(Math.sin(u * Math.PI * 3)) * 5 * Math.max(0, 1 - u * 1.25);
        const radius = pocketR + (trackR - pocketR) * Math.pow(1 - u, 2) + bounce;
        ball = { angle, radius };
      }
      draw(ctx, angleRef.current, ball);

      if (t < 1) {
        rafRef.current = setTimeout(step, 16);
      } else if (!landed) {
        landed = true;
        onTickStop && onTickStop();
        onLanded && onLanded(target);
      }
    }
    rafRef.current = setTimeout(step, 16);
    return () => {
      cancelled = true;
      if (rafRef.current) clearTimeout(rafRef.current);
    };
  }, [spinning, target]);

  return (
    <div style={{ width: size, height: size, position: 'relative', flexShrink: 0 }}>
      <canvas
        ref={canvasRef}
        style={{
          position: 'absolute',
          left: -PAD,
          top: -PAD,
          display: 'block',
          filter: 'drop-shadow(0 12px 22px rgba(0,0,0,.55))'
        }}
      />
    </div>
  );
}

Object.assign(window, { Wheel, WHEEL_ORDER, RED_NUMBERS, isRed: isRed });
