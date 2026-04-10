#!/usr/bin/env node
// Mario Speedrun Optimizer — Neuroevolution
// Small neural networks learn to play Mario through natural selection.
// Usage: node optimize.js
// Press +/- to add/remove worker threads on the fly.

import fs from 'fs';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';
import { Worker, isMainThread, parentPort, workerData } from 'worker_threads';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ==================== CONFIG ====================

const MAX_FRAMES = 8000;
const STALL_FRAMES = 300;
const LEVEL_WIDTH = 3200;
const NUM_WORKERS = Math.max(1, os.cpus().length - 1);
const POPULATION_SIZE = 200;
const NUM_INPUTS = 16;  // 5 mario + 3 gap/wall/ceiling + 4 enemies (2×2) + 3 ground profile + 1 time
const NUM_HIDDEN1 = 8;  // first hidden layer
const NUM_HIDDEN2 = 6;  // second hidden layer
const NUM_OUTPUTS = 6;
const TOTAL_WEIGHTS = (NUM_INPUTS * NUM_HIDDEN1) + (NUM_HIDDEN1 * NUM_HIDDEN2) + (NUM_HIDDEN2 * NUM_OUTPUTS) + NUM_HIDDEN1 + NUM_HIDDEN2 + NUM_OUTPUTS; // 232
const ELITE_COUNT = 20;           // top 10%
const MUTATION_RATE = 0.05;       // % of weights mutated per child (~12 weights at 232 total)
const MUTATION_STRENGTH = 0.3;    // magnitude of weight perturbation
const TOURNAMENT_SIZE = 5;
const STAGNATION_THRESHOLD = 50;  // gens without improvement before boosting mutation
const DIVERSITY_INJECTION_THRESHOLD = 200; // gens without improvement before mass reset

// Hall of fame
const GOLDEN_DIVERSITY_THRESHOLD = 30;
const HOF_SIZE = 10;

// ==================== BUTTON CONSTANTS ====================

const CBTNS = { A: 0, B: 1, SELECT: 2, START: 3, UP: 4, DOWN: 5, LEFT: 6, RIGHT: 7 };

// Bitmask encoding: 1 byte per frame
const BIT = { A: 1, B: 2, SELECT: 4, START: 8, UP: 16, DOWN: 32, LEFT: 64, RIGHT: 128 };

const BIT_TO_JSNES = [CBTNS.A, CBTNS.B, CBTNS.SELECT, CBTNS.START, CBTNS.UP, CBTNS.DOWN, CBTNS.LEFT, CBTNS.RIGHT];
const JSNES_TO_BOT = { 0: 8, 1: 0, 2: 2, 3: 3, 4: 4, 5: 5, 6: 6, 7: 7 };

// ================================================================
//  Monkey-patch jsnes for lite save states (shared by both threads)
// ================================================================
function patchJsnesLite(jsnes) {
    const origNEStoJSON = jsnes.NES.prototype.toJSON;
    const origNESfromJSON = jsnes.NES.prototype.fromJSON;

    jsnes.NES.prototype.toJSONLite = function() {
        const state = origNEStoJSON.call(this);
        delete state.romData;  // 101KB — already loaded
        if (state.ppu) {
            delete state.ppu.buffer;       // 473KB — rendering only
            delete state.ppu.bgbuffer;     // 350KB — rendering only
            delete state.ppu.pixrendered;  // 196KB — rendering only
        }
        return state;
    };

    jsnes.NES.prototype.fromJSONLite = function(state) {
        // Temporarily add empty arrays for the fields fromJSON expects
        if (state.ppu) {
            if (!state.ppu.buffer) state.ppu.buffer = new Array(256 * 240).fill(0);
            if (!state.ppu.bgbuffer) state.ppu.bgbuffer = new Array(256 * 240).fill(0);
            if (!state.ppu.pixrendered) state.ppu.pixrendered = new Array(256 * 240).fill(0);
        }
        if (!state.romData) state.romData = this.rom?.data || [];
        origNESfromJSON.call(this, state);
    };
}

// ================================================================
//  Neural Network — shared inference (used by both threads)
// ================================================================

function networkInfer(inputs, weights) {
    // Two hidden layers: 16 → 8 → 6 → 6
    // Layout: [I→H1 (16×8)] [H1→H2 (8×6)] [H2→O (6×6)] [H1 bias (8)] [H2 bias (6)] [O bias (6)]
    const ih1End = NUM_INPUTS * NUM_HIDDEN1;                    // 128
    const h1h2End = ih1End + NUM_HIDDEN1 * NUM_HIDDEN2;         // 176
    const h2oEnd = h1h2End + NUM_HIDDEN2 * NUM_OUTPUTS;         // 212
    const h1bEnd = h2oEnd + NUM_HIDDEN1;                        // 220
    const h2bEnd = h1bEnd + NUM_HIDDEN2;                        // 226
    // obEnd = h2bEnd + NUM_OUTPUTS = 232

    // Hidden layer 1: compress inputs into features (ReLU activation)
    const hidden1 = new Float32Array(NUM_HIDDEN1);
    for (let h = 0; h < NUM_HIDDEN1; h++) {
        let sum = weights[h2oEnd + h]; // H1 bias
        for (let i = 0; i < NUM_INPUTS; i++) {
            sum += inputs[i] * weights[i * NUM_HIDDEN1 + h];
        }
        hidden1[h] = sum > 0 ? sum : sum * 0.01; // Leaky ReLU — neurons never fully die
    }

    // Hidden layer 2: combine features (Leaky ReLU activation)
    const hidden2 = new Float32Array(NUM_HIDDEN2);
    for (let h = 0; h < NUM_HIDDEN2; h++) {
        let sum = weights[h1bEnd + h]; // H2 bias
        for (let h1 = 0; h1 < NUM_HIDDEN1; h1++) {
            sum += hidden1[h1] * weights[ih1End + h1 * NUM_HIDDEN2 + h];
        }
        hidden2[h] = sum > 0 ? sum : sum * 0.01; // Leaky ReLU
    }

    // Output layer
    const outputs = new Float32Array(NUM_OUTPUTS);
    for (let o = 0; o < NUM_OUTPUTS; o++) {
        let sum = weights[h2bEnd + o]; // O bias
        for (let h = 0; h < NUM_HIDDEN2; h++) {
            sum += hidden2[h] * weights[h1h2End + h * NUM_OUTPUTS + o];
        }
        outputs[o] = 1 / (1 + Math.exp(-Math.max(-10, Math.min(10, sum))));
    }

    return outputs;
}

function readNetworkInputs(nes, frame, maxFrames) {
    const mem = nes.cpu.mem;
    const inputs = new Float32Array(NUM_INPUTS);
    const EMPTY_TILE = 0x24;

    // === Mario state (5) ===
    const marioX = mem[0x006D] * 256 + mem[0x0086];
    const marioY = mem[0x00CE];
    let velX = mem[0x0057]; if (velX > 127) velX -= 256;
    let velY = mem[0x009F]; if (velY > 127) velY -= 256;

    inputs[0] = marioY / 240;                                    // Y position
    inputs[1] = Math.max(0, Math.min(1, (velX + 40) / 80));      // horizontal velocity
    inputs[2] = Math.max(0, Math.min(1, (velY + 40) / 80));      // vertical velocity
    inputs[3] = (mem[0x009F] === 0 && marioY >= 160) ? 1 : 0;    // on ground?
    inputs[4] = mem[0x0756] > 0 ? 1 : 0;                         // is big?

    // === Summarized terrain ahead (3) ===
    // Scan tiles at Mario's foot level and head level for the next 4 columns (64px ahead)
    function getTile(worldX, tileRow) {
        const page = Math.floor(worldX / 256);
        const localX = worldX % 256;
        const tileCol = Math.floor(localX / 8);
        const nt = nes.ppu.nameTable[(page % 2) * 2];
        return nt ? nt.tile[tileRow * 32 + tileCol] : 0;
    }

    const marioTileRow = Math.floor(marioY / 8);
    const groundRow = 26; // ground level tile row

    // Gap ahead: is there a gap in the ground within 64px?
    let gapAhead = 0;
    for (let col = 1; col <= 4; col++) {
        const wx = marioX + col * 16;
        if (getTile(wx, groundRow) === EMPTY_TILE && getTile(wx, groundRow - 2) === EMPTY_TILE) {
            gapAhead = 1 - (col - 1) / 4; // closer gap = higher value
            break;
        }
    }
    inputs[5] = gapAhead;

    // Wall ahead: solid tile at Mario's height within 48px?
    let wallAhead = 0;
    for (let col = 1; col <= 3; col++) {
        const wx = marioX + col * 16;
        const row = Math.min(29, Math.max(0, marioTileRow));
        if (getTile(wx, row) !== EMPTY_TILE) {
            wallAhead = 1 - (col - 1) / 3;
            break;
        }
    }
    inputs[6] = wallAhead;

    // Ceiling above: solid tile above Mario within 32px?
    let ceilingAbove = 0;
    for (let row = marioTileRow - 1; row >= Math.max(0, marioTileRow - 4); row--) {
        if (getTile(marioX, row) !== EMPTY_TILE) {
            ceilingAbove = 1;
            break;
        }
    }
    inputs[7] = ceilingAbove;

    // === 2 nearest enemies ahead (4) ===
    const enemies = [];
    const ENEMY_SCREEN_X = [0x0087, 0x008B, 0x008F, 0x0093, 0x0097];
    for (let e = 0; e < 5; e++) {
        if (mem[0x000F + e] !== 0) {
            const eX = mem[0x006E + e] * 256 + mem[ENEMY_SCREEN_X[e]];
            const eY = mem[0x00CF + e];
            if (eY <= 240) {
                const relX = eX - marioX;
                if (relX > -16 && relX < 256) {
                    enemies.push({ relX, relY: eY - marioY });
                }
            }
        }
    }
    enemies.sort((a, b) => a.relX - b.relX);

    for (let e = 0; e < 2; e++) {
        const baseIdx = 8 + e * 2;
        if (e < enemies.length) {
            inputs[baseIdx] = Math.max(0, Math.min(1, enemies[e].relX / 256));
            inputs[baseIdx + 1] = Math.max(0, Math.min(1, (enemies[e].relY + 120) / 240));
        } else {
            inputs[baseIdx] = 1.0;
            inputs[baseIdx + 1] = 0.5;
        }
    }

    // === Ground profile ahead (3) ===
    // Height of ground at 32px, 64px, 96px ahead (normalized)
    for (let i = 0; i < 3; i++) {
        const wx = marioX + (i + 1) * 32;
        let groundHeight = 0;
        for (let row = 28; row >= 10; row--) {
            if (getTile(wx, row) !== EMPTY_TILE) {
                groundHeight = (28 - row) / 18; // 0 = ground level, 1 = high platform
                break;
            }
        }
        inputs[12 + i] = groundHeight;
    }

    // === Time pressure (1) ===
    inputs[15] = Math.min(1, frame / maxFrames);

    // Sanitize
    for (let i = 0; i < NUM_INPUTS; i++) {
        if (!isFinite(inputs[i])) inputs[i] = 0;
    }

    return inputs;
}

function outputsToBitmask(outputs) {
    let mask = 0;
    if (outputs[0] > 0.5) mask |= BIT.RIGHT;
    if (outputs[1] > 0.5) mask |= BIT.LEFT;
    if (outputs[2] > 0.5) mask |= BIT.A;
    if (outputs[3] > 0.5) mask |= BIT.B;
    if (outputs[4] > 0.5) mask |= BIT.UP;
    if (outputs[5] > 0.5) mask |= BIT.DOWN;
    // Resolve LEFT+RIGHT conflict
    if ((mask & BIT.LEFT) && (mask & BIT.RIGHT)) mask &= ~BIT.LEFT;
    return mask;
}

// ================================================================
//  WORKER THREAD
// ================================================================
if (!isMainThread) {
    const { createRequire } = await import('module');
    const require = createRequire(import.meta.url);
    const jsnes = require('jsnes');
    const { NES, Controller } = jsnes;
    const { romString, saveStateStr } = workerData;

    // Apply lite save state monkey-patch
    patchJsnesLite(jsnes);

    let saveState = JSON.parse(saveStateStr);
    const nes = new NES({ onFrame: () => {}, onAudioSample: () => {}, emulateSound: false });
    nes.loadROM(romString);

    // ---- Fast clone: deep-clone lite save state using .slice() on all arrays ----
    function fastCloneState(s) {
        const cpu = Object.assign({}, s.cpu);
        cpu.mem = s.cpu.mem.slice();

        const ppu = Object.assign({}, s.ppu);
        ppu.vramMem = s.ppu.vramMem.slice();
        ppu.vramMirrorTable = s.ppu.vramMirrorTable.slice();
        ppu.spriteMem = s.ppu.spriteMem.slice();
        ppu.sprPalette = s.ppu.sprPalette.slice();
        ppu.imgPalette = s.ppu.imgPalette.slice();
        ppu.ntable1 = s.ppu.ntable1.slice();
        ppu.scantile = s.ppu.scantile.slice();
        if (s.ppu.buffer) ppu.buffer = s.ppu.buffer.slice();
        if (s.ppu.bgbuffer) ppu.bgbuffer = s.ppu.bgbuffer.slice();
        if (s.ppu.pixrendered) ppu.pixrendered = s.ppu.pixrendered.slice();
        ppu.nameTable = s.ppu.nameTable.map(nt => ({
            tile: nt.tile.slice(),
            attrib: nt.attrib.slice(),
        }));
        ppu.ptTile = s.ppu.ptTile.map(t => ({
            opaque: t.opaque.slice(),
            pix: t.pix.slice(),
        }));

        return { romData: s.romData, cpu, mmap: Object.assign({}, s.mmap), ppu };
    }

    // ---- Neural network simulation ----
    function simulateNeural(weights, maxFrames) {
        nes.fromJSONLite(fastCloneState(saveState));
        const startX = nes.cpu.mem[0x006D] * 256 + nes.cpu.mem[0x0086];
        let bestX = startX;
        let lastProgressFrame = 0;
        let prevBitmask = 0;

        for (let frame = 0; frame < maxFrames; frame++) {
            // Read game state -> network inference -> apply buttons
            const inputs = readNetworkInputs(nes, frame, maxFrames);
            const outputs = networkInfer(inputs, weights);
            const bitmask = outputsToBitmask(outputs);

            // Apply button changes
            if (bitmask !== prevBitmask) {
                const changed = bitmask ^ prevBitmask;
                for (let bit = 0; bit < 8; bit++) {
                    if (changed & (1 << bit)) {
                        if (bitmask & (1 << bit)) nes.buttonDown(1, BIT_TO_JSNES[bit]);
                        else nes.buttonUp(1, BIT_TO_JSNES[bit]);
                    }
                }
                prevBitmask = bitmask;
            }

            nes.frame();

            // Read position and velocity
            const mem = nes.cpu.mem;
            const x = mem[0x006D] * 256 + mem[0x0086];
            if (x > bestX) { bestX = x; lastProgressFrame = frame; }

            // Read game timer (BCD: hundreds, tens, ones)
            const timer = ((mem[0x07F8] >> 4) * 10 + (mem[0x07F8] & 0xF)) * 100
                        + ((mem[0x07F9] >> 4) * 10 + (mem[0x07F9] & 0xF)) * 10
                        + ((mem[0x07FA] >> 4) * 10 + (mem[0x07FA] & 0xF));

            // Death check FIRST
            const ps = mem[0x000E];
            if (ps === 0x0B || ps === 0x06 || mem[0x00CE] > 240 || mem[0x0770] === 3) {
                return { bestX, frame: frame + 1, completed: false, reason: 'dead', timer };
            }
            // Completion
            if (mem[0x001D] === 3 || mem[0x075F] > 0 || mem[0x0760] > 0) {
                return { bestX, frame: frame + 1, completed: true, reason: 'completed', timer };
            }
            // Backwards
            if (frame > 60 && x < startX) {
                return { bestX, frame: frame + 1, completed: false, reason: 'backwards', timer };
            }
            // Stalled
            if (frame - lastProgressFrame > STALL_FRAMES) {
                return { bestX, frame: frame + 1, completed: false, reason: 'stalled', timer };
            }
        }
        return { bestX, frame: maxFrames, completed: false, reason: 'timeout', timer: 0 };
    }

    // Message handler
    parentPort.on('message', (msg) => {
        if (msg.type === 'setSaveState') {
            saveState = JSON.parse(msg.saveStateStr);
            parentPort.postMessage('ack');
            return;
        }
        if (msg.type === 'evaluate') {
            // msg.weightsBuf: ArrayBuffer with all networks packed
            // msg.numNetworks: count
            // msg.maxFrames: max simulation length
            const buf = new Float32Array(msg.weightsBuf);
            const results = [];
            for (let i = 0; i < msg.numNetworks; i++) {
                const weights = buf.subarray(i * TOTAL_WEIGHTS, (i + 1) * TOTAL_WEIGHTS);
                results.push(simulateNeural(weights, msg.maxFrames));
            }
            parentPort.postMessage(results);
            return;
        }
    });
    parentPort.postMessage('ready');
}

// ================================================================
//  MAIN THREAD
// ================================================================
if (isMainThread) {

const { createRequire } = await import('module');
const require = createRequire(import.meta.url);
const Database = require('better-sqlite3');
const jsnes = require('jsnes');

// Apply lite save state monkey-patch on main thread
patchJsnesLite(jsnes);

const romPath = path.join(__dirname, 'super-mario-bros-1.nes');
if (!fs.existsSync(romPath)) { console.error('ROM not found at', romPath); process.exit(1); }
const romData = fs.readFileSync(romPath);
const romString = Array.from(new Uint8Array(romData)).map(b => String.fromCharCode(b)).join('');

// ==================== EVENTS <-> INPUTS CONVERSION ====================

function inputsToEvents(inputs) {
    const events = [];
    let prevBitmask = 0;
    for (let frame = 0; frame < inputs.length; frame++) {
        const cur = inputs[frame];
        const changed = cur ^ prevBitmask;
        if (changed === 0) continue;
        for (let bit = 0; bit < 8; bit++) {
            if (changed & (1 << bit)) {
                const pressed = (cur & (1 << bit)) ? 1 : 0;
                const jsnesBtn = BIT_TO_JSNES[bit];
                events.push([frame, JSNES_TO_BOT[jsnesBtn], pressed]);
            }
        }
        prevBitmask = cur;
    }
    for (let bit = 0; bit < 8; bit++) {
        if (prevBitmask & (1 << bit)) {
            const jsnesBtn = BIT_TO_JSNES[bit];
            events.push([inputs.length, JSNES_TO_BOT[jsnesBtn], 0]);
        }
    }
    return events;
}

const BOT_TO_BIT = { 8: 0, 0: 1, 2: 2, 3: 3, 4: 4, 5: 5, 6: 6, 7: 7 }; // bot button -> bit position

function eventsToInputs(events, totalFrames) {
    const inputs = new Uint8Array(totalFrames || MAX_FRAMES);
    let bitmask = 0;
    let eventIdx = 0;
    for (let f = 0; f < inputs.length; f++) {
        while (eventIdx < events.length && events[eventIdx][0] <= f) {
            const [, botBtn, state] = events[eventIdx];
            const bitPos = BOT_TO_BIT[botBtn];
            if (bitPos !== undefined) {
                if (state) bitmask |= (1 << bitPos);
                else bitmask &= ~(1 << bitPos);
            }
            eventIdx++;
        }
        inputs[f] = bitmask;
    }
    return inputs;
}

// ==================== DISPLAY HELPERS ====================

function makeProgressBar(x, maxX, w) {
    const r = Math.min(x / maxX, 1);
    const f = Math.round(r * w);
    return '[' + '\u2588'.repeat(Math.max(0, f - 1)) + (f > 0 ? '\u2592' : '') + '\u2591'.repeat(w - f) + ']';
}

function formatTime(s) {
    if (s < 60) return `${s.toFixed(0)}s`;
    return `${Math.floor(s / 60)}m ${Math.round(s % 60)}s`;
}

// ==================== RUN DATABASE (SQLite) ====================

class RunDatabase {
    constructor(dbPath) {
        this.db = new Database(dbPath);
        this.db.pragma('journal_mode = WAL');
        this.db.pragma('synchronous = NORMAL');

        this.db.exec(`CREATE TABLE IF NOT EXISTS networks (
            id INTEGER PRIMARY KEY, generation INTEGER, rank INTEGER,
            weights BLOB, fitness REAL, bestX INTEGER, frame INTEGER,
            completed INTEGER, createdAt TEXT
        )`);

        this.db.exec(`CREATE TABLE IF NOT EXISTS evolution_stats (
            generation INTEGER PRIMARY KEY, bestFitness REAL, avgFitness REAL,
            bestX INTEGER, avgX INTEGER, completions INTEGER,
            wallInfo TEXT, mutationRate REAL, elapsed REAL
        )`);

        // Prepare statements
        this._insertNetwork = this.db.prepare(`INSERT INTO networks (generation, rank, weights, fitness, bestX, frame, completed, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);
        this._insertStats = this.db.prepare(`INSERT OR REPLACE INTO evolution_stats VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`);
        this._getLastGeneration = this.db.prepare(`SELECT MAX(generation) as gen FROM evolution_stats`);
        this._getTopNetworks = this.db.prepare(`SELECT * FROM networks WHERE generation = ? ORDER BY rank ASC LIMIT ?`);
        this._getBestNetwork = this.db.prepare(`SELECT * FROM networks ORDER BY fitness DESC LIMIT 1`);
    }

    saveNetwork(gen, rank, weights, fitness, bestX, frame, completed) {
        this._insertNetwork.run(gen, rank, Buffer.from(weights.buffer, weights.byteOffset, weights.byteLength), fitness, bestX, frame, completed ? 1 : 0, new Date().toISOString());
    }

    saveEvolutionStats(gen, bestFit, avgFit, bestX, avgX, comps, wallInfo, mutRate, elapsed) {
        this._insertStats.run(gen, bestFit, avgFit, bestX, avgX, comps, wallInfo, mutRate, elapsed);
    }

    getLastGeneration() {
        const row = this._getLastGeneration.get();
        return row?.gen ?? -1;
    }

    getTopNetworks(generation, limit) {
        return this._getTopNetworks.all(generation, limit);
    }

    getBestNetwork() {
        return this._getBestNetwork.get();
    }
}

// ==================== NEURAL NETWORK CLASS ====================

class NeuralNetwork {
    constructor(weights) {
        this.weights = weights || NeuralNetwork.randomWeights();
    }

    static randomWeights() {
        const w = new Float32Array(TOTAL_WEIGHTS);
        const scale = Math.sqrt(2 / NUM_INPUTS);
        for (let i = 0; i < TOTAL_WEIGHTS; i++) {
            w[i] = (Math.random() * 2 - 1) * scale;
        }
        return w;
    }

    clone() {
        return new NeuralNetwork(new Float32Array(this.weights));
    }

    mutate(rate, strength) {
        for (let i = 0; i < TOTAL_WEIGHTS; i++) {
            if (Math.random() < rate) {
                this.weights[i] += (Math.random() * 2 - 1) * strength;
            }
        }
        return this;
    }

    static crossover(a, b) {
        const child = new Float32Array(TOTAL_WEIGHTS);
        for (let i = 0; i < TOTAL_WEIGHTS; i++) {
            child[i] = Math.random() < 0.5 ? a.weights[i] : b.weights[i];
        }
        return new NeuralNetwork(child);
    }

    static tournamentSelect(population, fitnesses, k) {
        let bestIdx = Math.floor(Math.random() * population.length);
        for (let i = 1; i < k; i++) {
            const idx = Math.floor(Math.random() * population.length);
            if (fitnesses[idx] > fitnesses[bestIdx]) bestIdx = idx;
        }
        return population[bestIdx];
    }
}

// ==================== OUTPUT ====================

const bestPath = path.join(__dirname, 'best-sequence.json');
const saveStatePath = path.join(__dirname, 'save-state.json');
const hofPath = path.join(__dirname, 'hall-of-fame.json');
let trainingSaveStateStr = null;

function loadHallOfFame() {
    try {
        if (fs.existsSync(hofPath)) {
            const data = JSON.parse(fs.readFileSync(hofPath, 'utf8'));
            if (Array.isArray(data) && data.length > 0) return data;
        }
    } catch (e) {}
    return [];
}

function saveHallOfFame(hof) {
    fs.writeFileSync(hofPath, JSON.stringify(hof, null, 2));
}

function checkpointDistance(a, b) {
    const cpsA = a.checkpoints || [];
    const cpsB = b.checkpoints || [];
    let dist = 0;
    for (let i = 0; i < Math.max(cpsA.length, cpsB.length); i++) {
        const fa = cpsA[i] ?? null;
        const fb = cpsB[i] ?? null;
        if (fa === null && fb === null) continue;
        if (fa === null || fb === null) { dist += 200; continue; }
        dist += Math.abs(fa - fb);
    }
    return dist;
}

function tryAddToHallOfFame(hof, inputs, result) {
    if (!result.completed) return false;
    const events = inputsToEvents(inputs);
    const entry = {
        events, fitness: result.bestX * 1000 + (result.timer || 0),
        inputs: Array.from(inputs),
        bestX: result.bestX,
        speed: parseFloat((result.bestX / Math.max(result.frame, 1)).toFixed(2)),
        completed: result.completed, completionFrame: result.frame,
        frame: result.frame, reason: result.reason,
        checkpoints: [], stuckFrames: 0,
        rating: result.completed ? 'S' : 'F',
        addedAt: new Date().toISOString(),
    };

    let mostSimilarIdx = -1;
    let minDist = Infinity;
    for (let i = 0; i < hof.length; i++) {
        const d = checkpointDistance(entry, hof[i]);
        if (d < minDist) { minDist = d; mostSimilarIdx = i; }
    }

    let added = false;

    if (minDist < GOLDEN_DIVERSITY_THRESHOLD && mostSimilarIdx >= 0) {
        if (entry.fitness > hof[mostSimilarIdx].fitness) {
            hof[mostSimilarIdx] = entry;
            hof.sort((a, b) => b.fitness - a.fitness);
            saveHallOfFame(hof);
            added = true;
        }
    } else if (hof.length < HOF_SIZE) {
        hof.push(entry);
        hof.sort((a, b) => b.fitness - a.fitness);
        saveHallOfFame(hof);
        added = true;
    } else if (entry.fitness > hof[hof.length - 1].fitness) {
        hof.pop();
        hof.push(entry);
        hof.sort((a, b) => b.fitness - a.fitness);
        saveHallOfFame(hof);
        added = true;
    }

    return added;
}

let currentPhase = 'neuroevolution';
let currentGeneration = 0;

function saveBest(inputs, result) {
    const events = inputsToEvents(inputs);
    const speed = result.bestX / Math.max(result.frame, 1);
    const id = `${currentPhase}-G${currentGeneration}-${result.bestX}px-${speed.toFixed(2)}pf`;
    fs.writeFileSync(bestPath, JSON.stringify({
        id, rating: result.completed ? 'S' : (result.bestX > LEVEL_WIDTH * 0.8 ? 'A' : 'C'),
        phase: currentPhase, generation: currentGeneration,
        events, fitness: result.bestX * 1000 + (result.timer || 0),
        completed: result.completed, completionFrame: result.completed ? result.frame : undefined,
        bestX: result.bestX, speed: parseFloat(speed.toFixed(2)),
        reason: result.reason, totalFrames: result.frame,
        stuckFrames: 0,
        checkpoints: [], checkpointSplits: 'none',
        timeSeconds: result.completed ? (result.frame / 60.098).toFixed(2) : null,
    }, null, 2));
    fs.writeFileSync(saveStatePath, trainingSaveStateStr);
}

// ==================== WORKER POOL ====================

const thisFile = fileURLToPath(import.meta.url);

async function spawnWorker(romString, saveStateStr) {
    const w = new Worker(thisFile, { workerData: { romString, saveStateStr } });
    await new Promise(r => { w.once('message', m => { if (m === 'ready') r(); }); });
    return w;
}

async function createWorkerPool(romString, saveStateStr, count) {
    const w = [];
    for (let i = 0; i < count; i++) w.push(await spawnWorker(romString, saveStateStr));
    return w;
}

function broadcastSaveState(workers, saveStateStr) {
    return new Promise((resolve) => {
        let ackCount = 0;
        for (const worker of workers) {
            worker.once('message', () => {
                ackCount++;
                if (ackCount === workers.length) resolve();
            });
            worker.postMessage({ type: 'setSaveState', saveStateStr });
        }
    });
}

// ==================== EVALUATE POPULATION ====================

async function evaluatePopulation(workers, population, maxFrames) {
    return new Promise((resolve) => {
        const numNetworks = population.length;
        const totalFloats = numNetworks * TOTAL_WEIGHTS;
        const weightsBuf = new Float32Array(totalFloats);

        // Pack all weights
        for (let i = 0; i < numNetworks; i++) {
            weightsBuf.set(population[i].weights, i * TOTAL_WEIGHTS);
        }

        // Distribute across workers
        const perWorker = Math.ceil(numNetworks / workers.length);
        const allResults = new Array(numNetworks);
        let completed = 0;

        workers.forEach((worker, wi) => {
            const start = wi * perWorker;
            const end = Math.min(start + perWorker, numNetworks);
            if (start >= numNetworks) {
                completed++;
                if (completed === workers.length) resolve(allResults);
                return;
            }

            const chunk = weightsBuf.slice(start * TOTAL_WEIGHTS, end * TOTAL_WEIGHTS);
            worker.once('message', (results) => {
                for (let i = 0; i < results.length; i++) {
                    allResults[start + i] = results[i];
                }
                completed++;
                if (completed === workers.length) resolve(allResults);
            });
            worker.postMessage({
                type: 'evaluate',
                weightsBuf: chunk.buffer,
                numNetworks: end - start,
                maxFrames,
            });
        });
    });
}

// ==================== REPLAY BEST NETWORK ====================

function replayBestNetwork(nes, network, saveStateStr) {
    const state = JSON.parse(saveStateStr);
    nes.fromJSONLite(state);

    const inputsRecord = [];
    let prevBitmask = 0;

    for (let frame = 0; frame < MAX_FRAMES; frame++) {
        const netInputs = readNetworkInputs(nes, frame, MAX_FRAMES);
        const outputs = networkInfer(netInputs, network.weights);
        const bitmask = outputsToBitmask(outputs);
        inputsRecord.push(bitmask);

        // Apply buttons
        if (bitmask !== prevBitmask) {
            const changed = bitmask ^ prevBitmask;
            for (let bit = 0; bit < 8; bit++) {
                if (changed & (1 << bit)) {
                    if (bitmask & (1 << bit)) nes.buttonDown(1, BIT_TO_JSNES[bit]);
                    else nes.buttonUp(1, BIT_TO_JSNES[bit]);
                }
            }
            prevBitmask = bitmask;
        }
        nes.frame();

        // Check termination
        const mem = nes.cpu.mem;
        const ps = mem[0x000E];
        if (ps === 0x0B || ps === 0x06 || mem[0x00CE] > 240) break;
        if (mem[0x001D] === 3 || mem[0x075F] > 0 || mem[0x0760] > 0) break;
    }

    return new Uint8Array(inputsRecord);
}

// ==================== MAIN ====================

function ask(question) {
    return new Promise(resolve => {
        process.stdout.write(question);
        process.stdin.setRawMode(false);
        process.stdin.resume();
        process.stdin.setEncoding('utf8');
        process.stdin.once('data', data => {
            process.stdin.pause();
            resolve(data.toString().trim().toLowerCase());
        });
    });
}

async function main() {
    const C = {
        reset: '\x1b[0m', dim: '\x1b[2m', bold: '\x1b[1m',
        red: '\x1b[31m', green: '\x1b[32m', yellow: '\x1b[33m',
        blue: '\x1b[34m', magenta: '\x1b[35m', cyan: '\x1b[36m',
    };

    console.log(`${C.cyan}\u2554\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2557${C.reset}`);
    console.log(`${C.cyan}\u2551  MARIO SPEEDRUN \u2014 Neuroevolution Optimizer              \u2551${C.reset}`);
    console.log(`${C.cyan}\u2551  Neural networks learn to play through natural selection \u2551${C.reset}`);
    console.log(`${C.cyan}\u255A\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u255D${C.reset}`);
    console.log();

    console.log('Creating title screen save state...');
    const { NES, Controller } = jsnes;
    const nes = new NES({ onFrame: () => {}, onAudioSample: () => {}, emulateSound: false });
    nes.loadROM(romString);
    for (let i = 0; i < 90; i++) nes.frame();
    nes.buttonDown(1, Controller.BUTTON_START);
    for (let i = 0; i < 2; i++) nes.frame();
    nes.buttonUp(1, Controller.BUTTON_START);
    for (let i = 0; i < 200; i++) nes.frame();
    // Use lite save state for smaller serialization
    const saveStateStr = JSON.stringify(nes.toJSONLite());
    trainingSaveStateStr = saveStateStr;
    console.log(`  Mario at X=${nes.cpu.mem[0x006D] * 256 + nes.cpu.mem[0x0086]}, Y=${nes.cpu.mem[0x00CE]}`);
    console.log(`  Save state size: ${(saveStateStr.length / 1024).toFixed(0)}KB (lite)`);
    console.log();

    // Save training save state for replay compatibility
    fs.writeFileSync(saveStatePath, trainingSaveStateStr);

    console.log(`Spawning ${NUM_WORKERS} worker threads...`);
    const workers = await createWorkerPool(romString, saveStateStr, NUM_WORKERS);
    console.log(`  ${workers.length} workers ready\n`);

    // Dynamic worker scaling
    let pendingWorkerOps = [];
    if (process.stdin.isTTY) {
        process.stdin.setRawMode(true); process.stdin.resume(); process.stdin.setEncoding('utf8');
        process.stdin.on('data', (key) => {
            if (key === '\x03') { process.emit('SIGINT'); return; }
            if (key === '+' || key === '=') pendingWorkerOps.push('+');
            if (key === '-' || key === '_') pendingWorkerOps.push('-');
        });
    }
    async function processWorkerOps() {
        for (const op of pendingWorkerOps) {
            if (op === '+') {
                const w = await spawnWorker(romString, saveStateStr);
                // Send current save state to the new worker
                w.postMessage({ type: 'setSaveState', saveStateStr: trainingSaveStateStr });
                await new Promise(r => w.once('message', r));
                workers.push(w);
                console.log(`\n  ${C.green}+ Worker added${C.reset} (now ${workers.length})`);
            } else if (op === '-' && workers.length > 1) {
                workers.pop().terminate();
                console.log(`\n  ${C.red}- Worker removed${C.reset} (now ${workers.length})`);
            }
        }
        pendingWorkerOps = [];
    }

    // Load hall of fame
    const hallOfFame = loadHallOfFame();
    if (hallOfFame.length > 0) {
        console.log(`${C.green}Loaded ${hallOfFame.length} hall of fame entries${C.reset}`);
        for (const h of hallOfFame) {
            console.log(`  ${C.dim}${h.bestX}px ${h.speed}px/f ${h.completed ? 'COMPLETE ' + h.completionFrame + 'f' : h.reason}${C.reset}`);
        }
    }

    // Open/create SQLite database
    const dbPath = path.join(__dirname, 'runs.db');
    const db = new RunDatabase(dbPath);
    console.log(`${C.green}SQLite database: ${dbPath}${C.reset}`);
    console.log();

    // Graceful shutdown
    let sigCount = 0;
    let bestEverNetwork = null;
    let bestEverResult = null;

    process.on('SIGINT', () => {
        sigCount++; if (sigCount > 1) process.exit(1);
        console.log('\n\nInterrupted! Saving best network...');
        try {
            if (bestEverNetwork) {
                // Save best network weights to DB
                const fit = bestEverResult ? bestEverResult.bestX * 1000 + (bestEverResult.timer || 0) : 0;
                db.saveNetwork(currentGeneration, 0, bestEverNetwork.weights, fit,
                    bestEverResult?.bestX || 0, bestEverResult?.frame || 0, bestEverResult?.completed || false);

                // Replay best network to capture inputs
                const replayInputs = replayBestNetwork(nes, bestEverNetwork, trainingSaveStateStr);
                const replayResult = bestEverResult || { bestX: 0, frame: replayInputs.length, completed: false, reason: 'interrupted' };
                saveBest(replayInputs, replayResult);
                tryAddToHallOfFame(hallOfFame, replayInputs, replayResult);

                const speed = (replayResult.bestX / Math.max(replayResult.frame, 1)).toFixed(2);
                console.log(`Saved: ${replayResult.bestX}px ${speed}px/f ${replayResult.reason}`);
                console.log(`Network weights saved to DB (gen ${currentGeneration})`);
            }
        } catch (e) {
            console.error('Error saving:', e.message);
        }
        for (const w of workers) w.terminate();
        if (process.stdin.isTTY) process.stdin.setRawMode(false);
        setTimeout(() => process.exit(0), 200);
    });

    // ==================== INTERACTIVE STARTUP ====================

    const lastGen = db.getLastGeneration();
    let population;
    let generation = 0;
    let bestEverFitness = -1;
    let bestEverX = 0;
    let stagnationCount = 0;
    let mutationRate = MUTATION_RATE;

    if (lastGen >= 0) {
        console.log(`${C.yellow}Found existing progress: generation ${lastGen}${C.reset}`);
        let resumeAnswer;
        if (process.argv.includes('--continue')) {
            resumeAnswer = 'r';
        } else if (process.argv.includes('--new')) {
            resumeAnswer = 'n';
        } else {
            resumeAnswer = await ask(`${C.cyan}Resume${C.reset} from generation ${lastGen} or ${C.cyan}start new${C.reset}? [${C.green}r${C.reset}]esume / [${C.red}n${C.reset}]ew: `);
        }

        if (resumeAnswer === 'n' || resumeAnswer === 'new') {
            console.log(`  ${C.red}Starting fresh — clearing saved networks${C.reset}\n`);
            db.db.exec('DELETE FROM networks');
            db.db.exec('DELETE FROM evolution_stats');
            db.db.exec('VACUUM');
            population = Array.from({ length: POPULATION_SIZE }, () => new NeuralNetwork());
        } else {
            console.log(`  ${C.green}Resuming from generation ${lastGen}${C.reset}`);
            generation = lastGen;

            // Load top networks from the last generation
            const savedNetworks = db.getTopNetworks(lastGen, ELITE_COUNT);
            population = [];

            for (const row of savedNetworks) {
                const weightsBuf = new Float32Array(new Uint8Array(row.weights).buffer);
                population.push(new NeuralNetwork(new Float32Array(weightsBuf)));
            }

            console.log(`  Loaded ${population.length} elite networks from DB`);

            // Fill rest with mutations of loaded networks + fresh random
            const loaded = population.length;
            // Mutated copies of loaded networks
            while (population.length < POPULATION_SIZE * 0.7 && loaded > 0) {
                const parent = population[population.length % loaded].clone();
                parent.mutate(MUTATION_RATE, MUTATION_STRENGTH);
                population.push(parent);
            }
            // Fresh random for diversity
            while (population.length < POPULATION_SIZE) {
                population.push(new NeuralNetwork());
            }

            // Restore best ever from DB
            const bestRow = db.getBestNetwork();
            if (bestRow) {
                bestEverFitness = bestRow.fitness;
                bestEverX = bestRow.bestX;
                const weightsBuf = new Float32Array(new Uint8Array(bestRow.weights).buffer);
                bestEverNetwork = new NeuralNetwork(new Float32Array(weightsBuf));
                bestEverResult = { bestX: bestRow.bestX, frame: bestRow.frame, completed: !!bestRow.completed, reason: bestRow.completed ? 'completed' : 'unknown' };
                console.log(`  Best ever: ${bestEverX}px (fitness ${bestEverFitness.toFixed(0)})`);
            }

            console.log();
        }
    } else {
        population = Array.from({ length: POPULATION_SIZE }, () => new NeuralNetwork());
    }

    // Broadcast save state to all workers
    await broadcastSaveState(workers, trainingSaveStateStr);

    console.log(`${C.cyan}=== NEUROEVOLUTION ===${C.reset}`);
    console.log(`${C.dim}Population: ${POPULATION_SIZE} | Inputs: ${NUM_INPUTS} | Hidden: ${NUM_HIDDEN1}+${NUM_HIDDEN2} | Outputs: ${NUM_OUTPUTS} | Weights: ${TOTAL_WEIGHTS}${C.reset}`);
    console.log(`${C.dim}Elite: ${ELITE_COUNT} | Mutation-only (no crossover) | Rate: ${(MUTATION_RATE*100).toFixed(0)}% @ ${MUTATION_STRENGTH} | Tournament: ${TOURNAMENT_SIZE}${C.reset}`);
    console.log(`${C.dim}Stagnation boost: ${STAGNATION_THRESHOLD} gens | Diversity injection: ${DIVERSITY_INJECTION_THRESHOLD} gens${C.reset}`);
    console.log();

    const startTime = Date.now();

    // ==================== EVOLUTION LOOP ====================

    while (true) {
        const genStart = Date.now();
        await processWorkerOps();
        generation++;
        currentGeneration = generation;

        // Evaluate all networks
        const results = await evaluatePopulation(workers, population, MAX_FRAMES);

        // Fitness: how far + how much time left on the clock
        // Distance is primary (further = better), timer is secondary (faster = better)
        // This is exactly how the game scores: progress through the level quickly
        const fitnesses = results.map(r => r.bestX * 1000 + (r.timer || 0));

        // Sort population by fitness
        const indices = fitnesses.map((f, i) => i).sort((a, b) => fitnesses[b] - fitnesses[a]);
        population = indices.map(i => population[i]);
        const sortedResults = indices.map(i => results[i]);
        const sortedFitnesses = indices.map(i => fitnesses[i]);

        // Stats
        const bestResult = sortedResults[0];
        const bestFitness = sortedFitnesses[0];
        const avgX = Math.round(results.reduce((s, r) => s + r.bestX, 0) / results.length);
        const bestX = bestResult.bestX;
        const genTime = (Date.now() - genStart) / 1000;

        // Check for improvement
        if (bestFitness > bestEverFitness) {
            bestEverFitness = bestFitness;
            bestEverX = bestX;
            bestEverNetwork = population[0].clone();
            bestEverResult = bestResult;
            stagnationCount = 0;
            mutationRate = MUTATION_RATE; // reset mutation on improvement
        } else {
            stagnationCount++;
        }

        // Wall detection: where do most networks die?
        const deathXs = results.filter(r => !r.completed).map(r => r.bestX);
        const wallBuckets = {};
        for (const x of deathXs) {
            const bucket = Math.floor(x / 20) * 20;
            wallBuckets[bucket] = (wallBuckets[bucket] || 0) + 1;
        }
        const topWall = Object.entries(wallBuckets).sort((a, b) => b[1] - a[1])[0];
        const wallStr = topWall ? `wall: X=${topWall[0]}(${Math.round(topWall[1]/POPULATION_SIZE*100)}%)` : '';

        // Stagnation handling
        if (stagnationCount > 0 && stagnationCount >= STAGNATION_THRESHOLD && stagnationCount % STAGNATION_THRESHOLD === 0) {
            mutationRate = Math.min(0.5, mutationRate * 2);
            console.log(`  ${C.yellow}STAGNATION: boosting mutation to ${(mutationRate*100).toFixed(0)}%${C.reset}`);
        }
        if (stagnationCount >= DIVERSITY_INJECTION_THRESHOLD) {
            // Replace bottom 50% with fresh random
            for (let i = Math.floor(POPULATION_SIZE / 2); i < POPULATION_SIZE; i++) {
                population[i] = new NeuralNetwork();
            }
            stagnationCount = 0;
            mutationRate = MUTATION_RATE;
            console.log(`  ${C.magenta}DIVERSITY INJECTION: 50% fresh random${C.reset}`);
        }

        // Log every generation
        const completions = results.filter(r => r.completed).length;
        const bestTime = (bestResult.frame / 60.098).toFixed(1);
        const elapsed = (Date.now() - startTime) / 1000;

        console.log(
            `Gen ${String(generation).padStart(4)} | ` +
            `best: ${bestX}px (${bestTime}s) ${bestResult.completed ? C.green + 'COMPLETE!' + C.reset : bestResult.reason} | ` +
            `avg: ${avgX}px | ${wallStr} | ` +
            `mut: ${(mutationRate*100).toFixed(0)}% | stag: ${stagnationCount} | ` +
            `${genTime.toFixed(1)}s/gen` +
            (completions > 0 ? ` | ${C.green}${completions} completions!${C.reset}` : '')
        );

        if (generation % 10 === 0) {
            const bar = makeProgressBar(bestEverX, LEVEL_WIDTH, 20);
            console.log(`  ${bar} ${Math.round(bestEverX/LEVEL_WIDTH*100)}% | best ever: ${bestEverX}px | elapsed: ${formatTime(elapsed)}`);
        }

        // Save best to replay every 50 generations or on completion
        if (generation % 50 === 0 || bestResult.completed) {
            const replayInputs = replayBestNetwork(nes, population[0], trainingSaveStateStr);
            saveBest(replayInputs, bestResult);
            if (bestResult.completed) {
                tryAddToHallOfFame(hallOfFame, replayInputs, bestResult);
                console.log(`  ${C.green}${C.bold}LEVEL COMPLETE! Saved to hall of fame.${C.reset}`);
            }
        }

        // Save to DB every 50 generations
        if (generation % 50 === 0) {
            // Save top ELITE_COUNT networks for resume capability
            for (let i = 0; i < Math.min(ELITE_COUNT, population.length); i++) {
                db.saveNetwork(generation, i, population[i].weights, sortedFitnesses[i],
                    sortedResults[i].bestX, sortedResults[i].frame, sortedResults[i].completed);
            }
            db.saveEvolutionStats(generation, bestFitness,
                sortedFitnesses.reduce((a,b)=>a+b,0)/sortedFitnesses.length,
                bestX, avgX, completions, wallStr, mutationRate, genTime);
            console.log(`  ${C.dim}DB checkpoint saved (gen ${generation})${C.reset}`);
        }

        // ==================== REPRODUCE ====================
        const nextPop = [];

        // Elite (top 10%) — copied unchanged
        for (let i = 0; i < ELITE_COUNT; i++) {
            nextPop.push(population[i].clone());
        }

        // Mutated elite — light mutations on top performers (45%)
        const numMutatedElite = Math.floor(POPULATION_SIZE * 0.45);
        for (let i = 0; i < numMutatedElite; i++) {
            const parent = population[i % ELITE_COUNT].clone();
            parent.mutate(mutationRate, MUTATION_STRENGTH);
            nextPop.push(parent);
        }

        // Tournament mutants — pick good networks from broader population, mutate (40%)
        const numTournamentMutants = Math.floor(POPULATION_SIZE * 0.40);
        for (let i = 0; i < numTournamentMutants; i++) {
            const parent = NeuralNetwork.tournamentSelect(population, sortedFitnesses, TOURNAMENT_SIZE).clone();
            parent.mutate(mutationRate, MUTATION_STRENGTH);
            nextPop.push(parent);
        }

        // Fresh random (fill remaining ~5%)
        while (nextPop.length < POPULATION_SIZE) {
            nextPop.push(new NeuralNetwork());
        }

        population = nextPop;
    }
}

main().catch(e => { console.error(e); process.exit(1); });

} // end isMainThread
