const Audio = (() => {
    let ctx;

    function getCtx() {
        if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
        return ctx;
    }

    function tone(freq, duration, type, volume) {
        type = type || 'sine';
        volume = volume || 0.3;
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

    function noise(duration, volume) {
        volume = volume || 0.15;
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

    // Spinning wheel tick sound
    let tickInterval = null;

    function startSpinTicks(duration) {
        let elapsed = 0;
        const baseInterval = 50;
        function tick() {
            const progress = elapsed / duration;
            // Ticks slow down as spin decelerates
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

    return {
        chipPlace() { tone(1200, 0.06, 'triangle', 0.2); },
        chipRemove() { tone(800, 0.04, 'triangle', 0.15); },
        spinStart() {
            // Whoosh
            tone(200, 0.3, 'sawtooth', 0.15);
            setTimeout(function() { tone(300, 0.2, 'sawtooth', 0.1); }, 100);
        },
        ballDrop() {
            // Ball landing click
            tone(1000, 0.05, 'square', 0.25);
            setTimeout(function() { tone(800, 0.04, 'square', 0.2); }, 60);
            setTimeout(function() { tone(600, 0.06, 'square', 0.15); }, 140);
        },
        win() {
            [523, 659, 784].forEach(function(f, i) {
                setTimeout(function() { tone(f, 0.15, 'sine', 0.25); }, i * 100);
            });
        },
        bigWin() {
            [523, 659, 784, 1047].forEach(function(f, i) {
                setTimeout(function() { tone(f, 0.2, 'sine', 0.3); }, i * 120);
            });
        },
        lose() {
            tone(400, 0.2, 'sawtooth', 0.2);
            setTimeout(function() { tone(200, 0.25, 'sawtooth', 0.15); }, 100);
        },
        startSpinTicks: startSpinTicks,
        stopSpinTicks: stopSpinTicks,
    };
})();
