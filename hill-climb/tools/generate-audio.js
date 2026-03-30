/**
 * Generate sound effects for Dirt Bike Hill Climb.
 * Raw synthesis - no external audio libs needed.
 */

const fs = require('fs');
const path = require('path');

const AUDIO_DIR = path.resolve(__dirname, '..', 'assets', 'audio');
const SAMPLE_RATE = 44100;

function createWAV(samples) {
    const numSamples = samples.length;
    const bytesPerSample = 2;
    const dataSize = numSamples * bytesPerSample;
    const buf = Buffer.alloc(44 + dataSize);

    buf.write('RIFF', 0);
    buf.writeUInt32LE(36 + dataSize, 4);
    buf.write('WAVE', 8);
    buf.write('fmt ', 12);
    buf.writeUInt32LE(16, 16);
    buf.writeUInt16LE(1, 20);
    buf.writeUInt16LE(1, 22);
    buf.writeUInt32LE(SAMPLE_RATE, 24);
    buf.writeUInt32LE(SAMPLE_RATE * bytesPerSample, 28);
    buf.writeUInt16LE(bytesPerSample, 32);
    buf.writeUInt16LE(16, 34);
    buf.write('data', 36);
    buf.writeUInt32LE(dataSize, 40);

    for (let i = 0; i < numSamples; i++) {
        const s = Math.max(-1, Math.min(1, samples[i]));
        buf.writeInt16LE(Math.round(s * 32767), 44 + i * 2);
    }
    return buf;
}

function saveWAV(filename, samples) {
    fs.mkdirSync(AUDIO_DIR, { recursive: true });
    const buf = createWAV(samples);
    const filepath = path.join(AUDIO_DIR, filename);
    fs.writeFileSync(filepath, buf);
    console.log(`  ${filename} (${(buf.length / 1024).toFixed(1)}KB)`);
}

function sine(freq, t) { return Math.sin(2 * Math.PI * freq * t); }
function square(freq, t) { return sine(freq, t) >= 0 ? 1 : -1; }
function noise() { return Math.random() * 2 - 1; }

function envelope(t, duration, attack, decay) {
    if (t < attack) return t / attack;
    if (t > duration - decay) return Math.max(0, (duration - t) / decay);
    return 1;
}

function makeSamples(duration, fn) {
    const n = Math.round(SAMPLE_RATE * duration);
    const out = new Float64Array(n);
    for (let i = 0; i < n; i++) {
        out[i] = fn(i / SAMPLE_RATE);
    }
    return out;
}

function generate() {
    console.log('Generating audio assets...');

    // Coin collect - bright ascending ding
    saveWAV('coin.wav', makeSamples(0.25, t => {
        const freq = 800 + t * 2000;
        return sine(freq, t) * 0.4 * envelope(t, 0.25, 0.005, 0.15);
    }));

    // Fuel pickup - deeper powerup whoosh
    saveWAV('fuel_pickup.wav', makeSamples(0.4, t => {
        const freq = 300 + t * 800;
        return (sine(freq, t) * 0.5 + sine(freq * 1.5, t) * 0.2) * envelope(t, 0.4, 0.02, 0.25);
    }));

    // Crash - heavy noise thud
    saveWAV('crash.wav', makeSamples(0.5, t => {
        const thud = sine(80 - t * 60, t) * 0.6;
        const crunch = noise() * 0.5 * Math.max(0, 1 - t * 4);
        const metal = sine(200 + noise() * 50, t) * 0.2 * Math.max(0, 1 - t * 3);
        return (thud + crunch + metal) * envelope(t, 0.5, 0.005, 0.3);
    }));

    // Flip bonus - ascending fanfare
    saveWAV('flip_bonus.wav', makeSamples(0.5, t => {
        let freq;
        if (t < 0.15) freq = 523; // C5
        else if (t < 0.3) freq = 659; // E5
        else freq = 784; // G5
        return (sine(freq, t) * 0.3 + square(freq, t) * 0.1) * envelope(t, 0.5, 0.01, 0.2);
    }));

    // Landing - soft thump
    saveWAV('land.wav', makeSamples(0.2, t => {
        return (sine(100 - t * 200, t) * 0.4 + noise() * 0.15 * Math.max(0, 1 - t * 8))
            * envelope(t, 0.2, 0.002, 0.15);
    }));

    // Low fuel warning beep
    saveWAV('low_fuel.wav', makeSamples(0.15, t => {
        return square(880, t) * 0.25 * envelope(t, 0.15, 0.005, 0.05);
    }));

    // Button click
    saveWAV('click.wav', makeSamples(0.08, t => {
        return sine(1200, t) * 0.3 * envelope(t, 0.08, 0.002, 0.06);
    }));

    // Game over - descending sad tone
    saveWAV('game_over.wav', makeSamples(1.0, t => {
        let freq;
        if (t < 0.3) freq = 440;
        else if (t < 0.6) freq = 370;
        else freq = 330;
        return (sine(freq, t) * 0.3 + sine(freq * 0.5, t) * 0.15) * envelope(t, 1.0, 0.02, 0.4);
    }));

    // Engine idle loop (short, meant to be looped)
    saveWAV('engine_idle.wav', makeSamples(0.5, t => {
        const base = sine(80, t) * 0.2;
        const rumble = sine(40, t) * 0.15;
        const chug = sine(160, t) * 0.1 * (0.5 + 0.5 * sine(8, t));
        return (base + rumble + chug) * 0.6;
    }));

    // Engine rev (higher RPM, meant to be looped)
    saveWAV('engine_rev.wav', makeSamples(0.3, t => {
        const base = sine(150, t) * 0.2;
        const harmonic = sine(300, t) * 0.15;
        const buzz = square(150, t) * 0.05;
        const throb = 0.7 + 0.3 * sine(12, t);
        return (base + harmonic + buzz) * throb * 0.6;
    }));

    console.log('  Audio assets complete!');
}

generate();
