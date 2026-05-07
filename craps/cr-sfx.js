/* eslint-disable */
// Lightweight WebAudio sound effects — dice rattles, chip clinks, win/lose
// stings. Mirrors the shape of bj-sfx.js so call sites look the same.

let _ctx = null;
function ctx() {
  if (!_ctx) _ctx = new (window.AudioContext || window.webkitAudioContext)();
  if (_ctx.state === 'suspended') _ctx.resume();
  return _ctx;
}

function tone({ freq = 440, type = 'sine', dur = 0.12, gain = 0.18, attack = 0.005, release = 0.08, slideTo = null }) {
  const c = ctx();
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, c.currentTime);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, c.currentTime + dur);
  g.gain.setValueAtTime(0, c.currentTime);
  g.gain.linearRampToValueAtTime(gain, c.currentTime + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + dur + release);
  o.connect(g).connect(c.destination);
  o.start();
  o.stop(c.currentTime + dur + release + 0.05);
}

function noiseBurst({ dur = 0.08, gain = 0.15, filterFreq = 2000 }) {
  const c = ctx();
  const buf = c.createBuffer(1, c.sampleRate * dur, c.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
  const src = c.createBufferSource();
  src.buffer = buf;
  const filter = c.createBiquadFilter();
  filter.type = 'highpass'; filter.frequency.value = filterFreq;
  const g = c.createGain();
  g.gain.setValueAtTime(gain, c.currentTime);
  g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + dur);
  src.connect(filter).connect(g).connect(c.destination);
  src.start();
}

const CR_SFX = {
  diceShake: () => {
    for (let i = 0; i < 3; i++) {
      setTimeout(() => noiseBurst({ dur: 0.06, gain: 0.10, filterFreq: 2400 }), i * 80);
    }
  },
  diceLand: () => {
    noiseBurst({ dur: 0.12, gain: 0.18, filterFreq: 1500 });
    tone({ freq: 200, type: 'square', dur: 0.08, gain: 0.15 });
  },
  chip: () => {
    tone({ freq: 1400, type: 'triangle', dur: 0.04, gain: 0.12 });
    tone({ freq: 900, type: 'sine', dur: 0.06, gain: 0.08 });
  },
  win: () => {
    [523, 659, 784].forEach((f, i) => setTimeout(() => tone({ freq: f, type: 'sine', dur: 0.16, gain: 0.16 }), i * 90));
  },
  bigWin: () => {
    [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => tone({ freq: f, type: 'sine', dur: 0.22, gain: 0.18 }), i * 100));
  },
  lose: () => {
    tone({ freq: 380, type: 'sawtooth', dur: 0.3, gain: 0.14, slideTo: 180 });
  },
  push: () => {
    tone({ freq: 440, type: 'sine', dur: 0.12, gain: 0.10 });
  },
  pointSet: () => {
    tone({ freq: 880, type: 'sine', dur: 0.10, gain: 0.18 });
    setTimeout(() => tone({ freq: 1100, type: 'sine', dur: 0.10, gain: 0.18 }), 120);
  },
  pointMade: () => {
    [659, 784, 988, 1175].forEach((f, i) => setTimeout(() => tone({ freq: f, type: 'sine', dur: 0.14, gain: 0.18 }), i * 80));
  },
  sevenOut: () => {
    [600, 500, 400, 300].forEach((f, i) => setTimeout(() => tone({ freq: f, type: 'sawtooth', dur: 0.15, gain: 0.18 }), i * 100));
  },
  natural: () => {
    tone({ freq: 660, type: 'sine', dur: 0.20, gain: 0.18 });
    setTimeout(() => tone({ freq: 880, type: 'sine', dur: 0.16, gain: 0.16 }), 100);
  },
  craps: () => {
    tone({ freq: 250, type: 'sawtooth', dur: 0.30, gain: 0.14, slideTo: 100 });
  },
  tip: () => {
    [880, 1175].forEach((f, i) => setTimeout(() => tone({ freq: f, type: 'sine', dur: 0.12, gain: 0.12 }), i * 80));
  }
};

window.CR_SFX = CR_SFX;
