/* global React */
/* eslint-disable */

// SlotReel — single 3-cell reel window over a long vertical strip.
// We render the 30-stop strip 5× stacked vertically so that during a spin
// (≤ 2 rotations + 29 steps) the visible cells are always covered without
// having to reposition DOM. Idle anchors the strip in the 2nd wrap; the
// post-spin snap moves the strip back to that anchor with identical visible
// content, so there's no visible jump.
function SlotReel(props) {
  const targetStop = props.targetStop;
  const isSpinning = props.isSpinning;
  const themeRow = props.themeRow;
  const delay = props.delay || 0;
  const cellPx = props.cellPx || 160;

  const REEL_STRIP = window.SLOT_ENGINE.REEL_STRIP;
  const STRIP_LEN = REEL_STRIP.length;
  const COPIES = 5;
  const TOTAL_CELLS = STRIP_LEN * COPIES;
  const ANCHOR_WRAP = 1; // cells [STRIP_LEN .. 2*STRIP_LEN) are the "home" wrap

  const stripRef = React.useRef(null);
  const animRef = React.useRef(null);
  const currentStopRef = React.useRef(targetStop);

  function idleTy(stop) {
    return -((ANCHOR_WRAP * STRIP_LEN + stop - 1) * cellPx);
  }

  function setTransform(ty) {
    const el = stripRef.current;
    if (el) el.style.transform = 'translateY(' + ty + 'px)';
  }

  // Idle: lock to canonical anchor for the new targetStop.
  React.useEffect(function () {
    if (isSpinning) return;
    setTransform(idleTy(targetStop));
    currentStopRef.current = targetStop;
  }, [targetStop, isSpinning, cellPx]);

  // Spin animation
  React.useEffect(function () {
    if (!isSpinning) return;

    const startStop = currentStopRef.current;
    const startTy = idleTy(startStop);
    setTransform(startTy);

    const totalRotations = 2;
    const distSteps =
      totalRotations * STRIP_LEN +
      ((targetStop - startStop + STRIP_LEN) % STRIP_LEN);
    const endTy = startTy - distSteps * cellPx;
    const duration = 1100;
    const startTime = performance.now();

    function frame(now) {
      const elapsed = now - startTime - delay;
      if (elapsed < 0) {
        animRef.current = requestAnimationFrame(frame);
        return;
      }
      const p = Math.min(1, elapsed / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      const ty = startTy + (endTy - startTy) * eased;
      setTransform(ty);
      if (p < 1) {
        animRef.current = requestAnimationFrame(frame);
      } else {
        currentStopRef.current = targetStop;
        // Snap back to anchor — visible cells are identical, no flash.
        setTransform(idleTy(targetStop));
      }
    }
    animRef.current = requestAnimationFrame(frame);

    return function () {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSpinning]);

  // Render the long strip. Each cell shows one symbol from sprites.png.
  const cells = [];
  for (let i = 0; i < TOTAL_CELLS; i++) {
    const symIdx = REEL_STRIP[i % STRIP_LEN];
    cells.push(
      React.createElement('div', {
        key: i,
        className: 'slot-cell',
        style: {
          top: (i * cellPx) + 'px',
          backgroundPosition:
            (-symIdx * cellPx) + 'px ' + (-themeRow * cellPx) + 'px',
          backgroundSize: (6 * cellPx) + 'px ' + (3 * cellPx) + 'px'
        }
      })
    );
  }

  return (
    <div className="slot-reel-window" style={{ width: cellPx + 'px', height: (3 * cellPx) + 'px' }}>
      <div className="slot-reel-strip" ref={stripRef}>
        {cells}
      </div>
    </div>
  );
}
