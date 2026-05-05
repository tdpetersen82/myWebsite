/* eslint-disable */
// Lightweight WebAudio sound effects — chip clinks, card snaps, win/lose stings.
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
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i/d.length);
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

const SFX = {
  chip:    () => { tone({ freq: 1400, type:'triangle', dur:.04, gain:.12 }); tone({ freq: 900, type:'sine', dur:.06, gain:.08 }); },
  card:    () => { noiseBurst({ dur:.06, gain:.12, filterFreq: 3000 }); },
  flip:    () => { tone({ freq: 800, type:'square', dur:.04, gain:.06 }); },
  deal:    () => { noiseBurst({ dur:.1, gain:.1, filterFreq: 2400 }); },
  win:     () => { [523, 659, 784].forEach((f,i)=>setTimeout(()=>tone({freq:f,type:'sine',dur:.18,gain:.16}), i*90)); },
  bj:      () => { [523, 659, 784, 1047].forEach((f,i)=>setTimeout(()=>tone({freq:f,type:'sine',dur:.22,gain:.18}), i*100)); },
  lose:    () => { tone({ freq: 380, type:'sawtooth', dur:.3, gain:.12, slideTo: 180 }); },
  push:    () => { tone({ freq: 440, type:'sine', dur:.12, gain:.1 }); },
  bust:    () => { tone({ freq: 220, type:'sawtooth', dur:.4, gain:.16, slideTo: 90 }); },
  tip:     () => { [880, 1175].forEach((f,i)=>setTimeout(()=>tone({freq:f,type:'sine',dur:.12,gain:.12}), i*80)); }
};

window.SFX = SFX;
