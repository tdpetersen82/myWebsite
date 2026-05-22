// Chess sounds — synthesized with the Web Audio API. No asset files, no dependencies.

(function (global) {
  'use strict';

  let ctx = null;
  let enabled = true;
  let master = null;

  function ac() {
    if (!ctx) {
      try {
        ctx = new (window.AudioContext || window.webkitAudioContext)();
        master = ctx.createGain();
        master.gain.value = 0.9;
        master.connect(ctx.destination);
      } catch (e) { ctx = null; }
    }
    return ctx;
  }

  // Short pitched body (sine/triangle) with a fast percussive envelope.
  function blip(c, t, freq, dur, peak, type, glideTo) {
    const o = c.createOscillator(), g = c.createGain();
    o.type = type || 'sine';
    o.frequency.setValueAtTime(freq, t);
    if (glideTo) o.frequency.exponentialRampToValueAtTime(glideTo, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(master);
    o.start(t); o.stop(t + dur + 0.02);
  }

  // Filtered noise burst — the "click" of wood on wood.
  function click(c, t, freq, dur, peak, q) {
    const len = Math.max(1, Math.ceil(c.sampleRate * dur));
    const buf = c.createBuffer(1, len, c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2);
    const src = c.createBufferSource(); src.buffer = buf;
    const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = freq; bp.Q.value = q || 0.8;
    const g = c.createGain(); g.gain.value = peak;
    src.connect(bp).connect(g).connect(master);
    src.start(t); src.stop(t + dur);
  }

  function play(type) {
    if (!enabled) return;
    const c = ac();
    if (!c) return;
    if (c.state === 'suspended') c.resume();
    const t = c.currentTime + 0.001;
    switch (type) {
      case 'move':
        click(c, t, 1700, 0.045, 0.16, 0.9); blip(c, t, 180, 0.07, 0.10, 'sine'); break;
      case 'capture':
        click(c, t, 2500, 0.06, 0.30, 0.6); blip(c, t, 150, 0.10, 0.18, 'triangle'); break;
      case 'castle':
        click(c, t, 1700, 0.045, 0.16, 0.9); click(c, t + 0.085, 1700, 0.045, 0.16, 0.9); break;
      case 'promote':
        blip(c, t, 520, 0.20, 0.18, 'triangle', 1040); break;
      case 'check':
        blip(c, t, 880, 0.10, 0.15, 'square'); blip(c, t + 0.10, 1175, 0.13, 0.15, 'square'); break;
      case 'win':
        [523, 659, 784, 1047].forEach((f, i) => blip(c, t + i * 0.10, f, 0.18, 0.16, 'triangle')); break;
      case 'lose':
        [440, 349, 262].forEach((f, i) => blip(c, t + i * 0.13, f, 0.22, 0.15, 'sine')); break;
      case 'draw':
        blip(c, t, 440, 0.16, 0.14, 'sine'); blip(c, t + 0.16, 440, 0.18, 0.12, 'sine'); break;
    }
  }

  function setEnabled(v) { enabled = !!v; if (enabled) { const c = ac(); if (c && c.state === 'suspended') c.resume(); } }
  function isEnabled() { return enabled; }

  global.ChessSound = { play, setEnabled, isEnabled };
})(window);
