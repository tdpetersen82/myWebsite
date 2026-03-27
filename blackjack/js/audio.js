const Audio = (() => {
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
        const bufferSize = c.sampleRate * duration;
        const buffer = c.createBuffer(1, bufferSize, c.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }
        const source = c.createBufferSource();
        source.buffer = buffer;
        const gain = c.createGain();
        gain.gain.setValueAtTime(volume, c.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + duration);
        source.connect(gain);
        gain.connect(c.destination);
        source.start();
    }

    return {
        cardDeal() { noise(0.08, 0.12); },
        cardFlip() { tone(800, 0.05, 'square', 0.15); },
        chipPlace() { tone(1200, 0.06, 'triangle', 0.2); },
        win() {
            const c = getCtx();
            [523, 659, 784].forEach((f, i) => {
                setTimeout(() => tone(f, 0.15, 'sine', 0.25), i * 100);
            });
        },
        lose() {
            tone(400, 0.2, 'sawtooth', 0.2);
            setTimeout(() => tone(200, 0.25, 'sawtooth', 0.15), 100);
        },
        blackjack() {
            [523, 659, 784, 1047].forEach((f, i) => {
                setTimeout(() => tone(f, 0.2, 'sine', 0.3), i * 120);
            });
        },
    };
})();
