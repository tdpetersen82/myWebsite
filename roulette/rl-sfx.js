// Synthesized sound effects via Web Audio API. No external files.
(function () {
  let ctx;
  let tickInterval = null;

  function getCtx() {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    return ctx;
  }

  function tone(freq, duration, type, volume) {
    type = type || 'sine';
    volume = volume == null ? 0.3 : volume;
    const c = getCtx();
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(volume, c.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + duration);
    osc.connect(gain);
    gain.connect(c.destination);
    osc.start(c.currentTime);
    osc.stop(c.currentTime + duration);
  }

  function startSpinTicks(duration) {
    let elapsed = 0;
    const baseInterval = 50;
    function tick() {
      const progress = elapsed / duration;
      const interval = baseInterval + progress * 300;
      const vol = 0.12 * (1 - progress * 0.7);
      if (vol > 0.01) {
        tone(600 + Math.random() * 200, 0.02, 'square', vol);
      }
      elapsed += interval;
      if (elapsed < duration) {
        tickInterval = setTimeout(tick, interval);
      }
    }
    tick();
  }

  function stopSpinTicks() {
    if (tickInterval) {
      clearTimeout(tickInterval);
      tickInterval = null;
    }
  }

  window.RL_SFX = {
    chipPlace() { tone(1200, 0.06, 'triangle', 0.2); },
    chipRemove() { tone(800, 0.04, 'triangle', 0.15); },
    spinStart() {
      tone(200, 0.3, 'sawtooth', 0.15);
      setTimeout(() => tone(300, 0.2, 'sawtooth', 0.1), 100);
    },
    ballDrop() {
      tone(1000, 0.05, 'square', 0.25);
      setTimeout(() => tone(800, 0.04, 'square', 0.2), 60);
      setTimeout(() => tone(600, 0.06, 'square', 0.15), 140);
    },
    win() {
      [523, 659, 784].forEach((f, i) => {
        setTimeout(() => tone(f, 0.15, 'sine', 0.25), i * 100);
      });
    },
    bigWin() {
      [523, 659, 784, 1047].forEach((f, i) => {
        setTimeout(() => tone(f, 0.2, 'sine', 0.3), i * 120);
      });
    },
    lose() {
      tone(400, 0.2, 'sawtooth', 0.2);
      setTimeout(() => tone(200, 0.25, 'sawtooth', 0.15), 100);
    },
    tip() {
      tone(880, 0.08, 'sine', 0.22);
      setTimeout(() => tone(1175, 0.12, 'sine', 0.18), 80);
    },
    startSpinTicks,
    stopSpinTicks,
  };
})();
