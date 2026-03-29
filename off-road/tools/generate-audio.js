#!/usr/bin/env node
/**
 * Generate retro sound effects for Super Off Road.
 *
 * Produces mono 44100Hz 16-bit PCM WAV files in assets/audio/.
 * Uses raw buffer manipulation for reliable Node.js WAV generation.
 */

const fs = require('fs');
const path = require('path');

const ASSETS_DIR = path.resolve(__dirname, '..', 'assets');
const AUDIO_DIR = path.join(ASSETS_DIR, 'audio');
const SAMPLE_RATE = 44100;

// ─── WAV helpers ────────────────────────────────────────────────────

/**
 * Create a WAV file buffer from an array of float samples [-1, 1].
 * Mono, 16-bit PCM, 44100Hz.
 */
function createWAV(samples) {
    const numSamples = samples.length;
    const bitsPerSample = 16;
    const bytesPerSample = bitsPerSample / 8;
    const dataSize = numSamples * bytesPerSample;
    const bufferSize = 44 + dataSize;
    const buf = Buffer.alloc(bufferSize);

    // RIFF header
    buf.write('RIFF', 0);
    buf.writeUInt32LE(bufferSize - 8, 4);
    buf.write('WAVE', 8);

    // fmt chunk
    buf.write('fmt ', 12);
    buf.writeUInt32LE(16, 16);              // chunk size
    buf.writeUInt16LE(1, 20);               // PCM format
    buf.writeUInt16LE(1, 22);               // mono
    buf.writeUInt32LE(SAMPLE_RATE, 24);     // sample rate
    buf.writeUInt32LE(SAMPLE_RATE * bytesPerSample, 28); // byte rate
    buf.writeUInt16LE(bytesPerSample, 32);  // block align
    buf.writeUInt16LE(bitsPerSample, 34);   // bits per sample

    // data chunk
    buf.write('data', 36);
    buf.writeUInt32LE(dataSize, 40);

    for (let i = 0; i < numSamples; i++) {
        let s = Math.max(-1, Math.min(1, samples[i]));
        let val = Math.round(s * 32767);
        buf.writeInt16LE(val, 44 + i * 2);
    }

    return buf;
}

/**
 * Save float samples as a WAV file.
 */
function saveWAV(filename, samples) {
    const buf = createWAV(samples);
    const filepath = path.join(AUDIO_DIR, filename);
    fs.writeFileSync(filepath, buf);
    console.log(`  ${filename} (${samples.length} samples, ${(buf.length / 1024).toFixed(1)}KB)`);
}

// ─── Synthesis primitives ───────────────────────────────────────────

function sine(freq, t) {
    return Math.sin(2 * Math.PI * freq * t);
}

function square(freq, t) {
    return sine(freq, t) >= 0 ? 1 : -1;
}

function sawtooth(freq, t) {
    const phase = (freq * t) % 1;
    return 2 * phase - 1;
}

function noise() {
    return Math.random() * 2 - 1;
}

/** Linear envelope: attack, sustain, decay (all in seconds) */
function envelope(t, duration, attack, decay) {
    if (t < attack) return t / attack;
    if (t > duration - decay) return Math.max(0, (duration - t) / decay);
    return 1;
}

/** Quick attack-decay envelope */
function adEnvelope(t, duration, attack) {
    if (t < attack) return t / attack;
    return Math.max(0, 1 - (t - attack) / (duration - attack));
}

/** Generate N seconds of samples */
function makeSamples(duration, fn) {
    const n = Math.round(SAMPLE_RATE * duration);
    const samples = new Float64Array(n);
    for (let i = 0; i < n; i++) {
        const t = i / SAMPLE_RATE;
        samples[i] = fn(t);
    }
    return samples;
}

/** Mix multiple sample arrays (all must be same length or shorter gets zero-padded) */
function mix(...arrays) {
    const maxLen = Math.max(...arrays.map(a => a.length));
    const out = new Float64Array(maxLen);
    for (const arr of arrays) {
        for (let i = 0; i < arr.length; i++) {
            out[i] += arr[i];
        }
    }
    // Normalize if clipping
    let peak = 0;
    for (let i = 0; i < out.length; i++) peak = Math.max(peak, Math.abs(out[i]));
    if (peak > 1) {
        for (let i = 0; i < out.length; i++) out[i] /= peak;
    }
    return out;
}

/** Simple one-pole low-pass filter */
function lowPass(samples, cutoffHz) {
    const rc = 1 / (2 * Math.PI * cutoffHz);
    const dt = 1 / SAMPLE_RATE;
    const alpha = dt / (rc + dt);
    const out = new Float64Array(samples.length);
    out[0] = samples[0];
    for (let i = 1; i < samples.length; i++) {
        out[i] = out[i - 1] + alpha * (samples[i] - out[i - 1]);
    }
    return out;
}

/** Simple one-pole high-pass filter */
function highPass(samples, cutoffHz) {
    const rc = 1 / (2 * Math.PI * cutoffHz);
    const dt = 1 / SAMPLE_RATE;
    const alpha = rc / (rc + dt);
    const out = new Float64Array(samples.length);
    out[0] = samples[0];
    for (let i = 1; i < samples.length; i++) {
        out[i] = alpha * (out[i - 1] + samples[i] - samples[i - 1]);
    }
    return out;
}

/** Band-pass = high-pass then low-pass */
function bandPass(samples, lowHz, highHz) {
    return lowPass(highPass(samples, lowHz), highHz);
}

/** Apply gain */
function gain(samples, g) {
    const out = new Float64Array(samples.length);
    for (let i = 0; i < samples.length; i++) out[i] = samples[i] * g;
    return out;
}

// ═══════════════════════════════════════════════════════════════════
// Sound definitions
// ═══════════════════════════════════════════════════════════════════

const sounds = {};

// 1. engine_idle.wav (0.5s loop) - Low rumbling ~80Hz
sounds['engine_idle.wav'] = () => {
    const dur = 0.5;
    return makeSamples(dur, t => {
        const env = 0.6;
        const base = sine(80, t) * 0.5;
        const harm = sine(160, t) * 0.2 + sine(40, t) * 0.15;
        const rumble = noise() * 0.08;
        const variation = 1 + sine(6, t) * 0.1; // slight throb
        return (base + harm + rumble) * env * variation;
    });
};

// 2. engine_high.wav (0.5s loop) - Higher ~200Hz with harmonics
sounds['engine_high.wav'] = () => {
    const dur = 0.5;
    return makeSamples(dur, t => {
        const env = 0.6;
        const base = sawtooth(200, t) * 0.3;
        const harm = sine(400, t) * 0.15 + sine(600, t) * 0.08 + sine(100, t) * 0.12;
        const buzz = noise() * 0.05;
        const variation = 1 + sine(10, t) * 0.08;
        return (base + harm + buzz) * env * variation;
    });
};

// 3. tire_screech.wav (0.3s) - Filtered noise, descending pitch
sounds['tire_screech.wav'] = () => {
    const dur = 0.3;
    const raw = makeSamples(dur, t => {
        const env = adEnvelope(t, dur, 0.01);
        return noise() * env * 0.8;
    });
    // Band-pass that narrows over time - simulate with static band-pass
    return bandPass(raw, 800, 4000);
};

// 4. collision_light.wav (0.15s) - Short impact thud
sounds['collision_light.wav'] = () => {
    const dur = 0.15;
    const raw = makeSamples(dur, t => {
        const env = adEnvelope(t, dur, 0.002);
        const freq = 100 * Math.exp(-t * 20); // rapid pitch drop
        return (sine(freq, t) * 0.7 + noise() * 0.2) * env;
    });
    return lowPass(raw, 500);
};

// 5. collision_heavy.wav (0.3s) - Bigger impact, more bass
sounds['collision_heavy.wav'] = () => {
    const dur = 0.3;
    const raw = makeSamples(dur, t => {
        const env = adEnvelope(t, dur, 0.003);
        const freq = 80 * Math.exp(-t * 10);
        const body = sine(freq, t) * 0.6;
        const crack = noise() * adEnvelope(t, 0.05, 0.001) * 0.5;
        return (body + crack) * env;
    });
    return lowPass(raw, 600);
};

// 6. nitro_boost.wav (0.4s) - Rising whoosh, ascending pitch sweep
sounds['nitro_boost.wav'] = () => {
    const dur = 0.4;
    return makeSamples(dur, t => {
        const env = envelope(t, dur, 0.02, 0.15);
        const freq = 200 + t * 2000; // sweep up
        const sweep = sine(freq, t) * 0.3;
        const whoosh = noise() * 0.3 * env;
        return (sweep + whoosh) * env;
    });
};

// 7. powerup_collect.wav (0.3s) - 3-note ascending chime C5, E5, G5
sounds['powerup_collect.wav'] = () => {
    const dur = 0.3;
    const notes = [523, 659, 784];
    const noteDur = dur / 3;
    return makeSamples(dur, t => {
        const noteIdx = Math.min(2, Math.floor(t / noteDur));
        const noteT = t - noteIdx * noteDur;
        const env = adEnvelope(noteT, noteDur, 0.003);
        const freq = notes[noteIdx];
        return (sine(freq, t) * 0.6 + sine(freq * 2, t) * 0.15) * env;
    });
};

// 8. missile_fire.wav (0.2s) - Descending sweep 1000->200Hz
sounds['missile_fire.wav'] = () => {
    const dur = 0.2;
    return makeSamples(dur, t => {
        const env = adEnvelope(t, dur, 0.005);
        const freq = 1000 - t * 4000; // 1000 -> 200
        const clamped = Math.max(200, freq);
        return (sawtooth(clamped, t) * 0.4 + noise() * 0.15) * env;
    });
};

// 9. missile_explode.wav (0.4s) - Noise burst with low rumble
sounds['missile_explode.wav'] = () => {
    const dur = 0.4;
    const raw = makeSamples(dur, t => {
        const env = adEnvelope(t, dur, 0.005);
        const boom = sine(50 * Math.exp(-t * 5), t) * 0.5;
        const crack = noise() * adEnvelope(t, 0.1, 0.002) * 0.7;
        const rumble = noise() * 0.3;
        return (boom + crack + rumble) * env;
    });
    return lowPass(raw, 2000);
};

// 10. oil_splat.wav (0.15s) - Short wet splat
sounds['oil_splat.wav'] = () => {
    const dur = 0.15;
    const raw = makeSamples(dur, t => {
        const env = adEnvelope(t, dur, 0.002);
        return noise() * env * 0.7;
    });
    return bandPass(raw, 300, 2500);
};

// 11. shield_activate.wav (0.3s) - Ascending electronic tone with shimmer
sounds['shield_activate.wav'] = () => {
    const dur = 0.3;
    return makeSamples(dur, t => {
        const env = envelope(t, dur, 0.01, 0.1);
        const freq = 400 + t * 1500;
        const main = sine(freq, t) * 0.4;
        const shimmer = sine(freq * 1.5, t) * 0.2 * sine(30, t);
        const sparkle = sine(freq * 3, t) * 0.1;
        return (main + shimmer + sparkle) * env;
    });
};

// 12. spinout.wav (0.4s) - Descending sweep with noise
sounds['spinout.wav'] = () => {
    const dur = 0.4;
    const raw = makeSamples(dur, t => {
        const env = adEnvelope(t, dur, 0.01);
        const freq = 2000 * Math.exp(-t * 4);
        return (sine(freq, t) * 0.3 + noise() * 0.5) * env;
    });
    return bandPass(raw, 500, 5000);
};

// 13. countdown_beep.wav (0.15s) - Clean 440Hz sine
sounds['countdown_beep.wav'] = () => {
    const dur = 0.15;
    return makeSamples(dur, t => {
        const env = adEnvelope(t, dur, 0.005);
        return sine(440, t) * 0.6 * env;
    });
};

// 14. countdown_go.wav (0.2s) - Higher 880Hz tone
sounds['countdown_go.wav'] = () => {
    const dur = 0.2;
    return makeSamples(dur, t => {
        const env = adEnvelope(t, dur, 0.005);
        return sine(880, t) * 0.6 * env;
    });
};

// 15. lap_complete.wav (0.5s) - 4-note ascending sequence
sounds['lap_complete.wav'] = () => {
    const dur = 0.5;
    const notes = [440, 554, 659, 880];
    const noteDur = dur / 4;
    return makeSamples(dur, t => {
        const noteIdx = Math.min(3, Math.floor(t / noteDur));
        const noteT = t - noteIdx * noteDur;
        const env = adEnvelope(noteT, noteDur, 0.005);
        const freq = notes[noteIdx];
        return (sine(freq, t) * 0.5 + sine(freq * 2, t) * 0.15) * env;
    });
};

// 16. race_finish.wav (0.8s) - 6-note ascending fanfare
sounds['race_finish.wav'] = () => {
    const dur = 0.8;
    const notes = [440, 554, 659, 784, 880, 1047];
    const noteDur = dur / 6;
    return makeSamples(dur, t => {
        const noteIdx = Math.min(5, Math.floor(t / noteDur));
        const noteT = t - noteIdx * noteDur;
        const env = adEnvelope(noteT, noteDur, 0.005);
        const freq = notes[noteIdx];
        // Richer fanfare with harmonics
        return (sine(freq, t) * 0.4 + sine(freq * 2, t) * 0.15 + sine(freq * 3, t) * 0.05) * env;
    });
};

// 17. button_click.wav (0.05s) - Quick 600Hz click
sounds['button_click.wav'] = () => {
    const dur = 0.05;
    return makeSamples(dur, t => {
        const env = adEnvelope(t, dur, 0.002);
        return sine(600, t) * 0.5 * env;
    });
};

// 18. wrong_way.wav (0.3s) - Two descending tones (buzzer)
sounds['wrong_way.wav'] = () => {
    const dur = 0.3;
    return makeSamples(dur, t => {
        if (t < 0.15) {
            const env = adEnvelope(t, 0.14, 0.005);
            return square(400, t) * 0.35 * env;
        } else {
            const t2 = t - 0.15;
            const env = adEnvelope(t2, 0.14, 0.005);
            return square(300, t) * 0.35 * env;
        }
    });
};

// 19. jump_launch.wav (0.2s) - Quick ascending sweep
sounds['jump_launch.wav'] = () => {
    const dur = 0.2;
    return makeSamples(dur, t => {
        const env = adEnvelope(t, dur, 0.005);
        const freq = 200 + t * 3000;
        return sine(freq, t) * 0.5 * env;
    });
};

// 20. jump_land.wav (0.2s) - Low thud with mid content
sounds['jump_land.wav'] = () => {
    const dur = 0.2;
    const raw = makeSamples(dur, t => {
        const env = adEnvelope(t, dur, 0.003);
        const freq = 120 * Math.exp(-t * 15);
        return (sine(freq, t) * 0.6 + noise() * 0.2) * env;
    });
    return lowPass(raw, 800);
};

// 21. drift_screech.wav (0.5s loop) - Sustained tire screech
sounds['drift_screech.wav'] = () => {
    const dur = 0.5;
    const raw = makeSamples(dur, t => {
        const wobble = 1 + sine(12, t) * 0.15;
        return noise() * 0.6 * wobble;
    });
    return bandPass(raw, 1000, 5000);
};

// ═══════════════════════════════════════════════════════════════════
// Generate all sounds
// ═══════════════════════════════════════════════════════════════════

console.log('Generating audio assets...');
fs.mkdirSync(AUDIO_DIR, { recursive: true });

for (const [filename, generator] of Object.entries(sounds)) {
    const samples = generator();
    saveWAV(filename, samples);
}

console.log(`\nDone. ${Object.keys(sounds).length} audio files generated.`);
