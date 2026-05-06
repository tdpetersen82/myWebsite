/* eslint-disable */
// Web-Audio synth for video poker — exposed as window.VP_SFX.
(function () {
  let ctx;
  function getCtx() {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    return ctx;
  }

  function tone(freq, duration, type = 'sine', volume = 0.3) {
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

  function noise(duration, volume = 0.15) {
    const c = getCtx();
    const buf = c.createBuffer(1, c.sampleRate * duration, c.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    const src = c.createBufferSource();
    src.buffer = buf;
    const gain = c.createGain();
    gain.gain.setValueAtTime(volume, c.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + duration);
    src.connect(gain);
    gain.connect(c.destination);
    src.start();
  }

  window.VP_SFX = {
    cardDeal()    { noise(0.08, 0.12); },
    holdToggle()  { tone(600, 0.05, 'square', 0.12); },
    draw()        { noise(0.1, 0.15); },
    coinSelect()  { tone(1200, 0.06, 'triangle', 0.2); },
    tip()         { [880, 1175].forEach((f, i) => setTimeout(() => tone(f, 0.18, 'sine', 0.25), i * 80)); },
    winSmall()    { [523, 659, 784].forEach((f, i) => setTimeout(() => tone(f, 0.15, 'sine', 0.25), i * 100)); },
    winMedium()   { [523, 659, 784, 880].forEach((f, i) => setTimeout(() => tone(f, 0.18, 'sine', 0.28), i * 100)); },
    winBig()      { [523, 659, 784, 1047, 1175].forEach((f, i) => setTimeout(() => tone(f, 0.2, 'sine', 0.3), i * 120)); },
    winRoyal()    { [523, 659, 784, 1047, 1319, 1568].forEach((f, i) => setTimeout(() => tone(f, 0.25, 'sine', 0.35), i * 150)); },
    lose()        { tone(400, 0.2, 'sawtooth', 0.15); setTimeout(() => tone(200, 0.25, 'sawtooth', 0.1), 100); }
  };
})();
