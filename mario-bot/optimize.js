#!/usr/bin/env node
// Mario Speedrun Optimizer — Chunked Beam Search (Speed-Optimized)
// Builds the optimal run 200px at a time, maintaining 3 diverse beams.
// Each chunk starts from the actual game state — no clock shift.
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
const STALL_LIMIT = 120;
const MIN_VIABLE_DISTANCE = 300;
const LEVEL_WIDTH = 3200;
const CHECKPOINTS = [800, 1600, 2400];
const CHECKPOINT_BONUS_WEIGHT = 10;
const STUCK_PENALTY = 50;
const NUM_WORKERS = Math.max(1, os.cpus().length - 1);

// Segment generation
const MIN_SEGMENT_DURATION = 3;
const MAX_SEGMENT_DURATION = 240;

// Chunked beam search
const CHUNK_SIZE_PX = 200;
const CHUNK_SIMS_PER_BEAM = 5000;    // sims per beam in thorough mode
const NUM_BEAMS = 3;
const FRAMES_PER_CHUNK = 200;
const CHUNK_RETRY_SIMS = 100000;
const MIN_CHUNK_SIZE_PX = 50;

// Hall of fame
const GOLDEN_DIVERSITY_THRESHOLD = 30;
const HOF_SIZE = 10;

// ==================== BUTTON CONSTANTS ====================

const CBTNS = { A: 0, B: 1, SELECT: 2, START: 3, UP: 4, DOWN: 5, LEFT: 6, RIGHT: 7 };

// Bitmask encoding: 1 byte per frame
const BIT = { A: 1, B: 2, SELECT: 4, START: 8, UP: 16, DOWN: 32, LEFT: 64, RIGHT: 128 };

const BIT_TO_JSNES = [CBTNS.A, CBTNS.B, CBTNS.SELECT, CBTNS.START, CBTNS.UP, CBTNS.DOWN, CBTNS.LEFT, CBTNS.RIGHT];
const JSNES_TO_BOT = { 0: 8, 1: 0, 2: 2, 3: 3, 4: 4, 5: 5, 6: 6, 7: 7 };

const BUTTON_WEIGHTS = [
    { bit: BIT.RIGHT, weight: 0.92 },
    { bit: BIT.B,     weight: 0.80 },
    { bit: BIT.A,     weight: 0.35 },
    { bit: BIT.LEFT,  weight: 0.03 },
    { bit: BIT.DOWN,  weight: 0.03 },
    { bit: BIT.UP,    weight: 0.02 },
];

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

    // ---- Full simulate (used for legacy messages and main-thread replay) ----
    function simulate(inputBuf, targetX) {
        nes.fromJSON(fastCloneState(saveState));

        const startX = nes.cpu.mem[0x006D] * 256 + nes.cpu.mem[0x0086];
        let bestX = startX;
        let lastProgressFrame = 0;
        let completed = false;
        let completionFrame = 0;
        let frame = 0;
        let reason = 'timeout';
        let velocityFrames = 0;
        let stuckFrames = 0;
        let prevX = startX;
        const checkpoints = new Array(CHECKPOINTS.length).fill(null);

        // Per-frame state trace — only collect Y for beam diversity selection
        // Full traces are expensive to build and transfer; skip X/vel for chunk mode
        const traceY = [];
        const skipFullTrace = !!targetX; // chunk mode: only need traceY for diversity
        const traceX = skipFullTrace ? null : [];
        const traceVelX = skipFullTrace ? null : [];
        const traceVelY = skipFullTrace ? null : [];

        // Chunk-aware stall limit: much tighter when targeting a nearby X
        const chunkStallLimit = targetX ? 40 : STALL_LIMIT;

        let prevBitmask = 0;
        const maxFrame = Math.min(inputBuf.length, MAX_FRAMES);

        for (frame = 0; frame < maxFrame; frame++) {
            const bitmask = inputBuf[frame] || 0;
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

            const mem = nes.cpu.mem;
            const x = mem[0x006D] * 256 + mem[0x0086];
            const y = mem[0x00CE];
            const velX = mem[0x0057];
            const velY = mem[0x009F];

            traceY.push(y);
            if (!skipFullTrace) { traceX.push(x); traceVelX.push(velX); traceVelY.push(velY); }

            if (x > bestX) { bestX = x; lastProgressFrame = frame; }

            for (let ci = 0; ci < CHECKPOINTS.length; ci++) {
                if (checkpoints[ci] === null && x >= CHECKPOINTS[ci]) checkpoints[ci] = frame;
            }

            if (velX > 0 && velX < 128) velocityFrames++;

            const isAscending = (velY !== 0 && velY < 128);
            if (x === prevX && frame > 0 && !isAscending) stuckFrames++;
            prevX = x;

            if (mem[0x001D] === 3 || mem[0x075F] > 0 || mem[0x0760] > 0) {
                completed = true; completionFrame = frame; reason = 'completed'; break;
            }
            const ps = mem[0x000E];
            if (ps === 0x0B || ps === 0x06 || mem[0x00CE] > 240 || mem[0x0770] === 3) {
                reason = 'dead'; break;
            }
            if (frame > 60 && x < startX) { reason = 'backwards'; break; }
            // Chunk-aware early kill: if targeting 200px away and haven't moved 25% by frame 100, give up
            if (targetX && frame === 100 && bestX < startX + (targetX - startX) * 0.25) { reason = 'too_slow'; break; }
            if (!targetX && frame === 600 && bestX < MIN_VIABLE_DISTANCE) { reason = 'too_slow'; break; }
            if (frame - lastProgressFrame > chunkStallLimit) { reason = 'stalled'; break; }
            if (targetX && x >= targetX) { reason = 'reached_target'; break; }
        }

        return {
            bestX, completed, completionFrame, frame, reason,
            velocityFrames, stuckFrames, checkpoints,
            traceX, traceY, traceVelX, traceVelY
        };
    }

    // ---- simulateLite: bare minimum simulation for packed chunk mode ----
    // Returns null for dead runs (zero overhead), small object for survivors.
    // Aggressive early kill: most bad runs die within 15-20 frames.
    function simulateLite(inputBuf, targetX) {
        nes.fromJSONLite(fastCloneState(saveState));
        const startX = nes.cpu.mem[0x006D] * 256 + nes.cpu.mem[0x0086];
        let bestX = startX;
        let lastProgressFrame = 0;
        let frame = 0;
        let ySum = 0;
        let prevBitmask = 0;
        const maxFrame = Math.min(inputBuf.length, MAX_FRAMES);
        // Minimum expected speed: ~1 px/frame. If not meeting this, bail early.
        const chunkDist = targetX - startX;

        for (frame = 0; frame < maxFrame; frame++) {
            const bitmask = inputBuf[frame] || 0;
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
            const mem = nes.cpu.mem;
            const x = mem[0x006D] * 256 + mem[0x0086];
            ySum += mem[0x00CE];
            if (x > bestX) { bestX = x; lastProgressFrame = frame; }

            // Target reached — success!
            if (x >= targetX) {
                return { survived: true, frame: frame + 1, completed: false, avgY: Math.round(ySum / (frame + 1)) };
            }
            // Level complete
            if (mem[0x001D] === 3 || mem[0x075F] > 0 || mem[0x0760] > 0) {
                return { survived: true, frame: frame + 1, completed: true, avgY: Math.round(ySum / (frame + 1)) };
            }
            // Dead — return IMMEDIATELY
            const ps = mem[0x000E];
            if (ps === 0x0B || ps === 0x06 || mem[0x00CE] > 240 || mem[0x0770] === 3) return null;
            // Going backwards
            if (frame > 15 && x < startX) return null;
            // Stalled for 20 frames (was 40)
            if (frame - lastProgressFrame > 20) return null;
            // Progress checks every 20 frames: must be covering ground
            if (frame > 0 && frame % 20 === 0) {
                const expectedProgress = chunkDist * (frame / maxFrame) * 0.3; // 30% of linear pace
                if (bestX - startX < expectedProgress) return null;
            }
        }
        return null; // timeout = dead
    }

    parentPort.on('message', (msg) => {
        if (msg.type === 'setSaveState') {
            saveState = JSON.parse(msg.saveStateStr);
            parentPort.postMessage('ack');
            return;
        }
        if (msg.type === 'simulate_packed') {
            const { inputBuf, numSims, framesPerSim, targetX } = msg;
            const buf = Buffer.isBuffer(inputBuf) ? inputBuf : Buffer.from(inputBuf);
            // Results: for each sim, either null (dead) or {survived, frame, completed, avgY}
            const survivors = [];
            for (let i = 0; i < numSims; i++) {
                const offset = i * framesPerSim;
                const slice = new Uint8Array(buf.buffer, buf.byteOffset + offset, framesPerSim);
                const r = simulateLite(slice, targetX);
                if (r) survivors.push({ simIndex: i, ...r });
            }
            parentPort.postMessage(survivors);
            return;
        }
        if (msg.type === 'simulate') {
            const results = [];
            for (const inputArr of msg.inputs) {
                const buf = inputArr instanceof Uint8Array ? inputArr : new Uint8Array(inputArr);
                results.push(simulate(buf, msg.targetX));
            }
            parentPort.postMessage(results);
            return;
        }
        // Legacy: plain array batch (backwards compat)
        const results = [];
        for (const inputArr of msg) {
            const buf = inputArr instanceof Uint8Array ? inputArr : new Uint8Array(inputArr);
            results.push(simulate(buf));
        }
        parentPort.postMessage(results);
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

// ==================== INPUT GENERATION ====================

function randomBitmask() {
    let mask = 0;
    for (const { bit, weight } of BUTTON_WEIGHTS) {
        if (Math.random() < weight) mask |= bit;
    }
    if (!(mask & BIT.RIGHT) && Math.random() < 0.85) mask |= BIT.RIGHT;
    if ((mask & BIT.LEFT) && (mask & BIT.RIGHT)) mask &= ~BIT.LEFT;
    if ((mask & BIT.UP) && (mask & BIT.DOWN)) mask &= ~BIT.DOWN;
    return mask;
}

function randomDuration() {
    return MIN_SEGMENT_DURATION + Math.floor(Math.random() * (MAX_SEGMENT_DURATION - MIN_SEGMENT_DURATION));
}

function generateRandomInputs(maxFrames) {
    const inputs = new Uint8Array(maxFrames);
    let bitmask = randomBitmask();
    let hold = randomDuration();
    let elapsed = 0;
    for (let f = 0; f < maxFrames; f++) {
        inputs[f] = bitmask;
        elapsed++;
        if (elapsed >= hold) {
            bitmask = randomBitmask();
            hold = randomDuration();
            elapsed = 0;
        }
    }
    return inputs;
}

function generatePackedInputs(numSims, framesPerSim) {
    const buf = Buffer.alloc(numSims * framesPerSim);
    for (let i = 0; i < numSims; i++) {
        const offset = i * framesPerSim;
        let bitmask = randomBitmask();
        let hold = randomDuration();
        let elapsed = 0;
        for (let f = 0; f < framesPerSim; f++) {
            buf[offset + f] = bitmask;
            elapsed++;
            if (elapsed >= hold) {
                bitmask = randomBitmask();
                hold = randomDuration();
                elapsed = 0;
            }
        }
    }
    return buf;
}

// ==================== FITNESS ====================

function checkpointBonus(result) {
    let bonus = 0;
    if (result.checkpoints) {
        for (const cpFrame of result.checkpoints) {
            if (cpFrame !== null) bonus += (MAX_FRAMES - cpFrame) * CHECKPOINT_BONUS_WEIGHT;
        }
    }
    return bonus;
}

function fitness(result) {
    const cpBonus = checkpointBonus(result);
    const speed = result.bestX / Math.max(result.frame, 1);
    if (result.completed) {
        return 10000000 + (MAX_FRAMES - result.completionFrame) * 10 + cpBonus;
    }
    if (result.bestX < MIN_VIABLE_DISTANCE) return result.bestX;
    const stuckPen = (result.stuckFrames || 0) * STUCK_PENALTY;
    return speed * 10000 + result.bestX * 10 - stuckPen + cpBonus;
}

function rateResult(result) {
    if (result.completed) return 'S';
    const pct = result.bestX / LEVEL_WIDTH;
    const speed = result.bestX / Math.max(result.frame, 1);
    if (pct > 0.8 && speed > 1.5) return 'A';
    if (pct > 0.6 && speed > 1.2) return 'B';
    if (pct > 0.4 || speed > 1.0) return 'C';
    if (pct > 0.2) return 'D';
    return 'F';
}

function formatCheckpointSplits(result) {
    if (!result.checkpoints) return 'none';
    const parts = [];
    let prev = 0;
    for (let i = 0; i < CHECKPOINTS.length; i++) {
        if (result.checkpoints[i] !== null) {
            const section = result.checkpoints[i] - prev;
            parts.push(`${CHECKPOINTS[i]}@${result.checkpoints[i]}f(+${section})`);
            prev = result.checkpoints[i];
        }
    }
    return parts.length > 0 ? parts.join(' -> ') : 'none reached';
}

// ==================== RUN DATABASE (SQLite) ====================

class RunDatabase {
    constructor(dbPath) {
        this.db = new Database(dbPath);
        this.db.pragma('journal_mode = WAL');
        this.db.pragma('synchronous = NORMAL');

        this.db.exec(`
            CREATE TABLE IF NOT EXISTS runs(
                id INTEGER PRIMARY KEY,
                inputs BLOB,
                fitness REAL,
                bestX INTEGER,
                completed INTEGER,
                completionFrame INTEGER,
                totalFrames INTEGER,
                reason TEXT,
                checkpoints TEXT,
                stuckFrames INTEGER,
                traceX BLOB,
                traceY BLOB,
                traceVelX BLOB,
                traceVelY BLOB,
                source TEXT,
                isGolden INTEGER DEFAULT 0,
                createdAt TEXT
            )
        `);

        this.db.exec(`
            CREATE TABLE IF NOT EXISTS beam_chunks(
                chunkIndex INTEGER,
                beamIndex INTEGER,
                targetX INTEGER,
                frames INTEGER,
                inputs BLOB,
                saveStateStr TEXT,
                avgY REAL,
                createdAt TEXT,
                PRIMARY KEY(chunkIndex, beamIndex)
            )
        `);

        // Prepare statements
        this._insertRun = this.db.prepare(`
            INSERT INTO runs(inputs, fitness, bestX, completed, completionFrame, totalFrames, reason, checkpoints, stuckFrames, traceX, traceY, traceVelX, traceVelY, source, isGolden, createdAt)
            VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)
        `);

        this._getRunById = this.db.prepare(`SELECT * FROM runs WHERE id = ?`);
        this._getTopRuns = this.db.prepare(`SELECT * FROM runs ORDER BY fitness DESC LIMIT ?`);
        this._getTopRunsByX = this.db.prepare(`SELECT * FROM runs ORDER BY bestX DESC LIMIT ?`);
        this._getGoldenRuns = this.db.prepare(`SELECT * FROM runs WHERE isGolden = 1`);
        this._markGolden = this.db.prepare(`UPDATE runs SET isGolden = 1 WHERE id = ?`);
        this._getRecentRuns = this.db.prepare(`SELECT * FROM runs ORDER BY id DESC LIMIT ?`);
        this._countRuns = this.db.prepare(`SELECT COUNT(*) as cnt, SUM(completed) as comps, MAX(bestX) as maxX FROM runs`);

        // Beam chunks statements
        this._insertBeamChunk = this.db.prepare(`
            INSERT OR REPLACE INTO beam_chunks(chunkIndex, beamIndex, targetX, frames, inputs, saveStateStr, avgY, createdAt)
            VALUES(?, ?, ?, ?, ?, ?, ?, ?)
        `);
        this._getBeamChunks = this.db.prepare(`SELECT * FROM beam_chunks WHERE chunkIndex = ? ORDER BY beamIndex ASC`);
        this._getLastCompletedChunk = this.db.prepare(`SELECT MAX(chunkIndex) as maxChunk FROM beam_chunks`);
        this._getBeam0Chunks = this.db.prepare(`SELECT * FROM beam_chunks WHERE beamIndex = 0 ORDER BY chunkIndex ASC`);

        // LRU cache for deserialized runs
        this._cache = new Map();
        this._cacheMax = 200;

        // Transaction state
        this._inBatch = false;
    }

    addRun(inputs, result, source) {
        if (result.bestX < MIN_VIABLE_DISTANCE) return null;
        if (!result.traceX || result.traceX.length === 0) return null;

        const trimmedInputs = new Uint8Array(inputs.slice(0, result.frame + 1));
        const traceXArr = new Uint16Array(result.traceX);
        const traceYArr = new Uint8Array(result.traceY);
        const traceVelXArr = new Uint8Array(result.traceVelX);
        const traceVelYArr = new Uint8Array(result.traceVelY);
        const fit = fitness(result);

        const info = this._insertRun.run(
            Buffer.from(trimmedInputs.buffer, trimmedInputs.byteOffset, trimmedInputs.byteLength),
            fit,
            result.bestX,
            result.completed ? 1 : 0,
            result.completionFrame || 0,
            result.frame,
            result.reason,
            JSON.stringify(result.checkpoints),
            result.stuckFrames || 0,
            Buffer.from(traceXArr.buffer, traceXArr.byteOffset, traceXArr.byteLength),
            Buffer.from(traceYArr.buffer, traceYArr.byteOffset, traceYArr.byteLength),
            Buffer.from(traceVelXArr.buffer, traceVelXArr.byteOffset, traceVelXArr.byteLength),
            Buffer.from(traceVelYArr.buffer, traceVelYArr.byteOffset, traceVelYArr.byteLength),
            source || 'unknown',
            new Date().toISOString()
        );

        return Number(info.lastInsertRowid);
    }

    getRunById(id) {
        if (this._cache.has(id)) {
            const val = this._cache.get(id);
            this._cache.delete(id);
            this._cache.set(id, val);
            return val;
        }
        const row = this._getRunById.get(id);
        if (!row) return null;
        const run = this._deserializeRun(row);
        if (this._cache.size >= this._cacheMax) {
            const firstKey = this._cache.keys().next().value;
            this._cache.delete(firstKey);
        }
        this._cache.set(id, run);
        return run;
    }

    _deserializeRun(row) {
        const traceX = new Uint16Array(new Uint8Array(row.traceX).buffer.slice(0));
        const traceY = new Uint8Array(row.traceY);
        const traceVelX = new Uint8Array(row.traceVelX);
        const traceVelY = new Uint8Array(row.traceVelY);
        const inputs = new Uint8Array(row.inputs);

        let checkpoints;
        try { checkpoints = JSON.parse(row.checkpoints); } catch { checkpoints = []; }

        return {
            runId: row.id,
            inputs,
            fitness: row.fitness,
            bestX: row.bestX,
            completed: !!row.completed,
            completionFrame: row.completionFrame,
            totalFrames: row.totalFrames,
            reason: row.reason,
            checkpoints,
            stuckFrames: row.stuckFrames,
            traceX,
            traceY,
            traceVelX,
            traceVelY,
            isGolden: !!row.isGolden,
        };
    }

    getTopRuns(n, orderBy = 'fitness') {
        const rows = orderBy === 'bestX'
            ? this._getTopRunsByX.all(n)
            : this._getTopRuns.all(n);
        return rows.map(r => this._deserializeRun(r));
    }

    getGoldenRuns() {
        const rows = this._getGoldenRuns.all();
        return rows.map(r => this._deserializeRun(r));
    }

    markGolden(runId) {
        this._markGolden.run(runId);
        if (this._cache.has(runId)) {
            const run = this._cache.get(runId);
            run.isGolden = true;
        }
    }

    getRecentRuns(n) {
        const rows = this._getRecentRuns.all(n);
        return rows.map(r => this._deserializeRun(r));
    }

    stats() {
        const row = this._countRuns.get();
        return {
            totalRuns: row.cnt || 0,
            completions: row.comps || 0,
            maxX: row.maxX || 0,
        };
    }

    beginBatch() {
        if (!this._inBatch) {
            this.db.exec('BEGIN');
            this._inBatch = true;
        }
    }

    endBatch() {
        if (this._inBatch) {
            this.db.exec('COMMIT');
            this._inBatch = false;
        }
    }

    // Beam chunk operations
    saveBeamChunk(chunkIndex, beamIndex, data) {
        this._insertBeamChunk.run(
            chunkIndex, beamIndex, data.targetX, data.frames,
            Buffer.from(data.inputs.buffer, data.inputs.byteOffset, data.inputs.byteLength),
            data.saveStateStr, data.avgY || 0,
            new Date().toISOString()
        );
    }

    getBeamChunks(chunkIndex) {
        return this._getBeamChunks.all(chunkIndex);
    }

    getLastCompletedChunk() {
        const row = this._getLastCompletedChunk.get();
        return (row && row.maxChunk !== null) ? row.maxChunk : -1;
    }

    assembleFullRun() {
        const rows = this._getBeam0Chunks.all();
        if (rows.length === 0) return null;
        // The last beam0 chunk has the full concatenated inputs
        const lastRow = rows[rows.length - 1];
        return new Uint8Array(lastRow.inputs);
    }
}

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

// Get inputs from a HoF/donor entry (handles both old events-only and new inputs format)
function getInputsFromEntry(entry) {
    if (entry.inputs && entry.inputs.length > 0) {
        return new Uint8Array(entry.inputs);
    }
    if (entry.events && entry.events.length > 0) {
        return eventsToInputs(entry.events, entry.frame ? entry.frame + 1 : MAX_FRAMES);
    }
    return null;
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

// Compute checkpoint-based "strategy distance" between two entries.
// Large distance = different paths through the level.
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
        events, fitness: fitness(result),
        inputs: Array.from(inputs),
        bestX: result.bestX,
        speed: parseFloat((result.bestX / Math.max(result.frame, 1)).toFixed(2)),
        completed: result.completed, completionFrame: result.completionFrame,
        frame: result.frame, reason: result.reason,
        checkpoints: result.checkpoints, stuckFrames: result.stuckFrames || 0,
        rating: rateResult(result), addedAt: new Date().toISOString(),
    };

    // Diversity check: find the most similar existing entry
    let mostSimilarIdx = -1;
    let minDist = Infinity;
    for (let i = 0; i < hof.length; i++) {
        const d = checkpointDistance(entry, hof[i]);
        if (d < minDist) { minDist = d; mostSimilarIdx = i; }
    }

    let added = false;

    // If too similar to an existing entry, only replace if strictly faster
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

let currentPhase = 'beam-search';
let currentRound = 0;

function saveBest(inputs, result) {
    const events = inputsToEvents(inputs);
    const speed = result.bestX / Math.max(result.frame, 1);
    const id = `${currentPhase}-R${currentRound}-${result.bestX}px-${speed.toFixed(2)}pf`;
    fs.writeFileSync(bestPath, JSON.stringify({
        id, rating: rateResult(result),
        phase: currentPhase, round: currentRound,
        events, fitness: fitness(result),
        completed: result.completed, completionFrame: result.completionFrame,
        bestX: result.bestX, speed: parseFloat(speed.toFixed(2)),
        reason: result.reason, totalFrames: result.frame,
        stuckFrames: result.stuckFrames || 0,
        checkpoints: result.checkpoints, checkpointSplits: formatCheckpointSplits(result),
        timeSeconds: result.completed ? (result.completionFrame / 60.098).toFixed(2) : null,
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

// ==================== BEAM SEARCH FUNCTIONS ====================

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

function evaluateChunkBatch(workers, packedInputs, numSims, framesPerSim, targetX) {
    return new Promise((resolve) => {
        const allSurvivors = [];
        const simsPerWorker = Math.ceil(numSims / workers.length);
        let completed = 0;

        workers.forEach((worker, wi) => {
            const start = wi * simsPerWorker;
            const end = Math.min(start + simsPerWorker, numSims);
            if (start >= numSims) {
                completed++;
                if (completed === workers.length) resolve(allSurvivors);
                return;
            }

            const byteStart = start * framesPerSim;
            const byteEnd = end * framesPerSim;
            const chunk = packedInputs.slice(byteStart, byteEnd);

            worker.once('message', (survivors) => {
                // Adjust simIndex to global index
                for (const s of survivors) {
                    s.simIndex += start;
                }
                allSurvivors.push(...survivors);
                completed++;
                if (completed === workers.length) resolve(allSurvivors);
            });
            worker.postMessage({ type: 'simulate_packed', inputBuf: chunk, numSims: end - start, framesPerSim, targetX });
        });
    });
}

function selectDiverseBeams(survivors, numBeams, packedInputs, framesPerSim) {
    // survivors: array of { simIndex, survived, frame, completed, avgY }
    if (survivors.length === 0) return [];

    // Sort by frames ascending (fastest first)
    survivors.sort((a, b) => a.frame - b.frame);

    const winners = [];

    // Beam 1: fastest (fewest frames)
    winners.push(survivors[0]);

    if (numBeams >= 2 && survivors.length > 1) {
        // Beam 2: most different avg Y from beam 1
        const beam1AvgY = survivors[0].avgY;
        let bestYDiff = -1;
        let beam2Idx = -1;
        for (let i = 1; i < survivors.length; i++) {
            const diff = Math.abs(survivors[i].avgY - beam1AvgY);
            if (diff > bestYDiff) {
                bestYDiff = diff;
                beam2Idx = i;
            }
        }
        if (beam2Idx >= 0) {
            winners.push(survivors[beam2Idx]);
        }
    }

    if (numBeams >= 3 && survivors.length > 2) {
        // Beam 3: second fastest with >=5 frame difference from beam 1
        const beam1Frames = survivors[0].frame;
        for (let i = 1; i < survivors.length; i++) {
            if (winners.includes(survivors[i])) continue;
            if (Math.abs(survivors[i].frame - beam1Frames) >= 5) {
                winners.push(survivors[i]);
                break;
            }
        }
        // If no candidate with 5-frame difference, just take the next fastest not already chosen
        if (winners.length < 3) {
            for (let i = 1; i < survivors.length; i++) {
                if (!winners.includes(survivors[i])) {
                    winners.push(survivors[i]);
                    break;
                }
            }
        }
    }

    // Extract inputs from packed buffer for each winner
    return winners.slice(0, numBeams).map(w => ({
        survivor: w,
        inputs: new Uint8Array(packedInputs.buffer, packedInputs.byteOffset + w.simIndex * framesPerSim, framesPerSim),
    }));
}

function captureBeamSaveState(nes, beam, romString) {
    // beam.parentSaveStateStr is a lite JSON string
    const parentState = JSON.parse(beam.parentSaveStateStr);
    nes.fromJSONLite(parentState);

    let prevBitmask = 0;
    const framesToReplay = beam.frame;
    const inputBuf = beam.inputs;

    for (let frame = 0; frame < framesToReplay; frame++) {
        const bitmask = inputBuf[frame] || 0;
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
    }

    return JSON.stringify(nes.toJSONLite());
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
    console.log(`${C.cyan}\u2551  MARIO SPEEDRUN \u2014 Chunked Beam Search Optimizer       \u2551${C.reset}`);
    console.log(`${C.cyan}\u2551  Build optimal run 200px at a time, 3 diverse beams   \u2551${C.reset}`);
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
    let currentBroadcastState = null; // track what save state workers have
    async function processWorkerOps() {
        for (const op of pendingWorkerOps) {
            if (op === '+') {
                const w = await spawnWorker(romString, saveStateStr);
                // Send current chunk's save state to the new worker
                if (currentBroadcastState) {
                    w.postMessage({ type: 'setSaveState', saveStateStr: currentBroadcastState });
                    await new Promise(r => w.once('message', r));
                }
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

    const dbStats = db.stats();
    console.log(`${C.green}DB: ${dbStats.totalRuns} runs, ${dbStats.completions} completions, maxX ${dbStats.maxX}${C.reset}`);
    console.log();

    // Graceful shutdown
    let sigCount = 0;
    let globalBestInputs = null;
    let globalBestResult = null;

    process.on('SIGINT', () => {
        sigCount++; if (sigCount > 1) process.exit(1);
        console.log('\n\nInterrupted! Saving...');
        try { db.endBatch(); } catch {}
        if (globalBestInputs) {
            saveBest(globalBestInputs, globalBestResult);
            const speed = (globalBestResult.bestX / Math.max(globalBestResult.frame, 1)).toFixed(2);
            console.log(`Saved: ${globalBestResult.bestX}px ${speed}px/f ${globalBestResult.reason}`);
        }
        for (const w of workers) w.terminate();
        if (process.stdin.isTTY) process.stdin.setRawMode(false);
        setTimeout(() => process.exit(0), 200);
    });

    // ==================== CHUNKED BEAM SEARCH ====================

    const CHUNK_START_X = 40; // Mario's starting X
    const totalChunks = Math.ceil((LEVEL_WIDTH - CHUNK_START_X) / CHUNK_SIZE_PX);

    // ==================== INTERACTIVE STARTUP ====================
    // Ask mode
    let mode;
    if (process.argv.includes('--fast')) {
        mode = 'fast';
    } else if (process.argv.includes('--thorough')) {
        mode = 'thorough';
    } else {
        const modeAnswer = await ask(`${C.cyan}Mode?${C.reset} [${C.green}f${C.reset}]ast (first survivor) or [${C.yellow}t${C.reset}]horough (best of ${CHUNK_SIMS_PER_BEAM}): `);
        mode = (modeAnswer === 't' || modeAnswer === 'thorough') ? 'thorough' : 'fast';
    }
    console.log(`  Mode: ${mode === 'fast' ? C.green + 'FAST' : C.yellow + 'THOROUGH'}${C.reset}\n`);

    // Check for existing progress
    const lastChunk = db.getLastCompletedChunk();
    let startChunkIndex = 0;
    let beams = [];

    if (lastChunk >= 0) {
        const savedBeams = db.getBeamChunks(lastChunk);
        const lastX = savedBeams[0]?.targetX || '?';
        const lastFrames = savedBeams[0]?.frames || '?';
        console.log(`${C.yellow}Found existing progress: chunk ${lastChunk + 1}/${totalChunks} (X=${lastX}, ${lastFrames}f)${C.reset}`);

        let resumeAnswer;
        if (process.argv.includes('--continue')) {
            resumeAnswer = 'c';
        } else if (process.argv.includes('--new')) {
            resumeAnswer = 'n';
        } else {
            resumeAnswer = await ask(`${C.cyan}Continue${C.reset} from chunk ${lastChunk + 2} or ${C.cyan}start new${C.reset}? [${C.green}c${C.reset}]ontinue / [${C.red}n${C.reset}]ew: `);
        }

        if (resumeAnswer === 'n' || resumeAnswer === 'new') {
            console.log(`  ${C.red}Starting fresh — clearing saved chunks${C.reset}\n`);
            db.db.exec('DELETE FROM beam_chunks');
            beams = [{
                inputs: new Uint8Array(0),
                saveStateStr: trainingSaveStateStr,
                frames: 0,
                targetX: CHUNK_START_X,
            }];
        } else {
            beams = savedBeams.map(b => ({
                inputs: new Uint8Array(b.inputs),
                saveStateStr: b.saveStateStr,
                frames: b.frames,
                targetX: b.targetX,
            }));
            startChunkIndex = lastChunk + 1;
            console.log(`  ${C.green}Resuming from chunk ${lastChunk + 2}${C.reset}\n`);
        }
    } else {
        // Fresh start: single beam from initial save state
        beams = [{
            inputs: new Uint8Array(0),
            saveStateStr: trainingSaveStateStr,
            frames: 0,
            targetX: CHUNK_START_X,
        }];
    }

    let totalFrames = beams[0]?.frames || 0;
    let levelCompleted = false;
    const startTime = Date.now();

    console.log(`${C.cyan}=== CHUNKED BEAM SEARCH (${mode.toUpperCase()}) ===${C.reset}`);
    const modeDesc = mode === 'fast' ? 'stop on first survivor per chunk' : `${CHUNK_SIMS_PER_BEAM} sims/beam, ${NUM_BEAMS} beams`;
    console.log(`${C.dim}${totalChunks} chunks of ${CHUNK_SIZE_PX}px | ${modeDesc}${C.reset}\n`);

    for (let ci = startChunkIndex; ci < totalChunks + 5 && !levelCompleted; ci++) {
        const chunkStart = Date.now();
        await processWorkerOps();
        currentRound = ci;

        const targetX = CHUNK_START_X + (ci + 1) * CHUNK_SIZE_PX;
        let chunkSims = mode === 'fast' ? 500 : CHUNK_SIMS_PER_BEAM; // fast: small batches
        let currentChunkSize = CHUNK_SIZE_PX;
        let allSurvivors = [];
        let totalSimsThisChunk = 0;
        let foundSurvivor = false;

        if (mode === 'fast') {
            // FAST MODE: 1 beam, send batches of 500, stop on first survivor
            const beam = beams[0]; // only use the best beam
            currentBroadcastState = beam.saveStateStr; await broadcastSaveState(workers, beam.saveStateStr);

            const FAST_BATCH = 500;
            const FAST_MAX_ATTEMPTS = 100; // up to 50,000 total if needed
            for (let attempt = 0; attempt < FAST_MAX_ATTEMPTS && !foundSurvivor; attempt++) {
                await processWorkerOps(); // pick up +/- worker changes mid-chunk
                const packedInputs = generatePackedInputs(FAST_BATCH, FRAMES_PER_CHUNK);
                totalSimsThisChunk += FAST_BATCH;

                const survivors = await evaluateChunkBatch(workers, packedInputs, FAST_BATCH, FRAMES_PER_CHUNK, targetX);
                for (const s of survivors) {
                    s.beamIndex = 0;
                    s.packedInputs = packedInputs;
                    s.parentSaveStateStr = beam.saveStateStr;
                    s.parentFrames = beam.frames;
                    s.parentInputs = beam.inputs;
                }
                if (survivors.length > 0) {
                    allSurvivors.push(...survivors);
                    foundSurvivor = true;
                    if (survivors.some(s => s.completed)) levelCompleted = true;
                }
                // Progress feedback
                if ((attempt + 1) % 5 === 0) {
                    const elapsed = (Date.now() - chunkStart) / 1000;
                    const rate = Math.round(totalSimsThisChunk / elapsed);
                    process.stdout.write(`  ${C.dim}Chunk ${ci+1} X:${targetX-CHUNK_SIZE_PX}->${targetX} | ${totalSimsThisChunk} tried | ${rate}/s | ${workers.length} workers | ${elapsed.toFixed(0)}s elapsed | searching...${C.reset}\r`);
                }
            }
            if (foundSurvivor) process.stdout.write('\x1b[2K'); // clear progress line
        } else {
            // THOROUGH MODE: all beams, full sim count
            for (let bi = 0; bi < beams.length; bi++) {
                const beam = beams[bi];
                currentBroadcastState = beam.saveStateStr; await broadcastSaveState(workers, beam.saveStateStr);

                const packedInputs = generatePackedInputs(chunkSims, FRAMES_PER_CHUNK);
                totalSimsThisChunk += chunkSims;

                const survivors = await evaluateChunkBatch(workers, packedInputs, chunkSims, FRAMES_PER_CHUNK, targetX);
                for (const s of survivors) {
                    s.beamIndex = bi;
                    s.packedInputs = packedInputs;
                    s.parentSaveStateStr = beam.saveStateStr;
                    s.parentFrames = beam.frames;
                    s.parentInputs = beam.inputs;
                }
                allSurvivors.push(...survivors);
                if (survivors.some(s => s.completed)) levelCompleted = true;
            }
        }

        // Select beams from survivors
        const numBeamsToSelect = mode === 'fast' ? 1 : NUM_BEAMS;
        let winners = selectDiverseFromAllSurvivors(allSurvivors, numBeamsToSelect);

        // Adaptive: if no survivors, retry with more sims or smaller chunks
        if (winners.length === 0) {
            const retryBeams = mode === 'fast' ? [beams[0]] : beams;
            const retrySims = mode === 'fast' ? 500 : CHUNK_RETRY_SIMS;
            const retryAttempts = mode === 'fast' ? 200 : 1; // fast: 200 batches of 500 = 100k total, stop on first
            console.log(`  ${C.yellow}No survivors for chunk ${ci + 1}. Retrying (${mode === 'fast' ? 'batches of 500' : retrySims + ' sims'})...${C.reset}`);
            allSurvivors = [];
            let retryFound = false;
            for (let bi = 0; bi < retryBeams.length && !retryFound; bi++) {
                const beam = retryBeams[bi];
                currentBroadcastState = beam.saveStateStr; await broadcastSaveState(workers, beam.saveStateStr);

                for (let ra = 0; ra < retryAttempts && !retryFound; ra++) {
                    await processWorkerOps();
                    const packedInputs = generatePackedInputs(retrySims, FRAMES_PER_CHUNK);
                    totalSimsThisChunk += retrySims;

                    const survivors = await evaluateChunkBatch(workers, packedInputs, retrySims, FRAMES_PER_CHUNK, targetX);
                    for (const s of survivors) {
                        s.beamIndex = bi;
                        s.packedInputs = packedInputs;
                        s.parentSaveStateStr = beam.saveStateStr;
                        s.parentFrames = beam.frames;
                        s.parentInputs = beam.inputs;
                    }
                    allSurvivors.push(...survivors);
                    if (survivors.some(s => s.completed)) levelCompleted = true;
                    if (survivors.length > 0 && mode === 'fast') retryFound = true;
                    if ((ra + 1) % 5 === 0 && !retryFound) {
                        const elapsed = (Date.now() - chunkStart) / 1000;
                        const rate = Math.round(totalSimsThisChunk / elapsed);
                        process.stdout.write(`  ${C.dim}Chunk ${ci+1} X:${targetX-currentChunkSize}->${targetX} | ${totalSimsThisChunk} tried | ${rate}/s | ${workers.length} workers | ${elapsed.toFixed(0)}s elapsed | searching...${C.reset}\r`);
                    }
                }
                if (retryFound) process.stdout.write('\x1b[2K');
            }
            winners = selectDiverseFromAllSurvivors(allSurvivors, numBeamsToSelect);
        }

        // Retry 2: halve chunk size repeatedly
        let reducedTargetX = targetX;
        while (winners.length === 0 && currentChunkSize > MIN_CHUNK_SIZE_PX) {
            currentChunkSize = Math.max(MIN_CHUNK_SIZE_PX, Math.floor(currentChunkSize / 2));
            reducedTargetX = (targetX - CHUNK_SIZE_PX) + currentChunkSize;
            console.log(`  ${C.yellow}Still no survivors. Reducing chunk to ${currentChunkSize}px (target X:${reducedTargetX})...${C.reset}`);

            allSurvivors = [];
            const retryBeams2 = mode === 'fast' ? [beams[0]] : beams;
            for (let bi = 0; bi < retryBeams2.length; bi++) {
                const beam = retryBeams2[bi];
                currentBroadcastState = beam.saveStateStr; await broadcastSaveState(workers, beam.saveStateStr);

                const packedInputs = generatePackedInputs(CHUNK_RETRY_SIMS, FRAMES_PER_CHUNK);
                totalSimsThisChunk += CHUNK_RETRY_SIMS;

                const survivors = await evaluateChunkBatch(workers, packedInputs, CHUNK_RETRY_SIMS, FRAMES_PER_CHUNK, reducedTargetX);
                for (const s of survivors) {
                    s.beamIndex = bi;
                    s.packedInputs = packedInputs;
                    s.parentSaveStateStr = beam.saveStateStr;
                    s.parentFrames = beam.frames;
                    s.parentInputs = beam.inputs;
                }
                allSurvivors.push(...survivors);
                if (survivors.some(s => s.completed)) levelCompleted = true;
            }
            winners = selectDiverseFromAllSurvivors(allSurvivors, numBeamsToSelect);
        }

        if (winners.length === 0) {
            console.log(`${C.red}No survivors for chunk ${ci + 1}. Stopping.${C.reset}`);
            break;
        }

        // The actual targetX used (may be reduced)
        const actualTargetX = winners[0].survivor.completed ? LEVEL_WIDTH : (currentChunkSize < CHUNK_SIZE_PX ? reducedTargetX : targetX);

        // Capture save states for winners on main thread
        const newBeams = [];
        for (let wi = 0; wi < winners.length; wi++) {
            const w = winners[wi];
            const chunkFrames = w.survivor.frame;

            // captureBeamSaveState needs: parentSaveStateStr, inputs (chunk only), frame count
            const ss = captureBeamSaveState(nes, {
                parentSaveStateStr: w.survivor.parentSaveStateStr,
                inputs: w.inputs,
                frame: chunkFrames,
            }, romString);

            // Concatenate parent inputs + this chunk's inputs (trimmed to actual frames used)
            const parentInputs = w.survivor.parentInputs;
            const fullInputs = new Uint8Array(parentInputs.length + chunkFrames);
            fullInputs.set(parentInputs, 0);
            fullInputs.set(w.inputs.slice(0, chunkFrames), parentInputs.length);

            const beamFrames = w.survivor.parentFrames + chunkFrames;

            newBeams.push({
                inputs: fullInputs,
                saveStateStr: ss,
                frames: beamFrames,
                targetX: actualTargetX,
            });

            // Save to DB — only store saveStateStr for beam 0
            db.saveBeamChunk(ci, wi, {
                targetX: actualTargetX,
                frames: beamFrames,
                inputs: fullInputs,
                saveStateStr: wi === 0 ? ss : '',
                avgY: w.survivor.avgY,
            });
        }

        beams = newBeams;
        totalFrames = beams[0].frames;

        // Update global best
        globalBestInputs = beams[0].inputs;
        globalBestResult = {
            bestX: actualTargetX,
            completed: levelCompleted,
            completionFrame: levelCompleted ? totalFrames : 0,
            frame: totalFrames,
            reason: levelCompleted ? 'completed' : 'in_progress',
            checkpoints: [null, null, null],
            stuckFrames: 0,
        };

        // Log progress
        const survived = allSurvivors.length;
        const chunkTime = (Date.now() - chunkStart) / 1000;
        const simsPerSec = Math.round(totalSimsThisChunk / chunkTime);
        const displayTargetX = actualTargetX;
        const displayStartX = currentChunkSize < CHUNK_SIZE_PX ? (displayTargetX - currentChunkSize) : (targetX - CHUNK_SIZE_PX);
        const pct = Math.round(Math.min(displayTargetX, LEVEL_WIDTH) / LEVEL_WIDTH * 100);
        const bar = makeProgressBar(Math.min(displayTargetX, LEVEL_WIDTH), LEVEL_WIDTH, 25);

        const gameTime = (totalFrames / 60.098).toFixed(1);
        const speed = (displayTargetX / totalFrames * 60.098).toFixed(0);
        console.log(`Chunk ${String(ci + 1).padStart(2)}/${totalChunks} | X:${displayStartX}-${displayTargetX} | ${totalSimsThisChunk} attempts | ${survived} survived | ${gameTime}s game time | ${speed} px/s | took ${chunkTime.toFixed(0)}s`);
        console.log(`  ${bar} ${pct}% | Mario at ${displayTargetX}/${LEVEL_WIDTH}px (${gameTime}s)`);

        // Save best sequence so far
        saveBest(beams[0].inputs, globalBestResult);

        if (levelCompleted) {
            console.log(`\n${C.green}LEVEL COMPLETE in ${(totalFrames / 60.098).toFixed(1)}s!${C.reset}`);
            tryAddToHallOfFame(hallOfFame, beams[0].inputs, {
                completed: true, completionFrame: totalFrames, frame: totalFrames,
                bestX: LEVEL_WIDTH, reason: 'completed',
                checkpoints: [null, null, null],
                stuckFrames: 0,
            });
            break;
        }
    }

    // Final summary
    const elapsed = (Date.now() - startTime) / 1000;
    console.log();
    console.log(`${C.cyan}==========================================${C.reset}`);
    console.log(`${C.bold}OPTIMIZATION COMPLETE${C.reset}`);
    console.log(`Best run: ${(totalFrames / 60.098).toFixed(1)}s (${totalFrames} frames) | ${beams[0]?.targetX || 0}px`);
    if (levelCompleted) {
        console.log(`${C.green}Level completed!${C.reset}`);
    } else {
        console.log(`Reached X=${beams[0]?.targetX || '?'} of ${LEVEL_WIDTH}`);
    }
    console.log(`Elapsed: ${formatTime(elapsed)}`);
    console.log(`Saved to: ${bestPath}`);
    workers.forEach(w => w.terminate());
    if (process.stdin.isTTY) process.stdin.setRawMode(false);
}

// Helper: select diverse beams from survivors that may come from different beams/packed buffers
function selectDiverseFromAllSurvivors(survivors, numBeams) {
    if (survivors.length === 0) return [];

    // Sort by frames ascending (fastest first)
    survivors.sort((a, b) => a.frame - b.frame);

    const winners = [];

    // Beam 1: fastest (fewest frames)
    winners.push(survivors[0]);

    if (numBeams >= 2 && survivors.length > 1) {
        // Beam 2: most different avg Y from beam 1
        const beam1AvgY = survivors[0].avgY;
        let bestYDiff = -1;
        let beam2Idx = -1;
        for (let i = 1; i < survivors.length; i++) {
            const diff = Math.abs(survivors[i].avgY - beam1AvgY);
            if (diff > bestYDiff) {
                bestYDiff = diff;
                beam2Idx = i;
            }
        }
        if (beam2Idx >= 0) {
            winners.push(survivors[beam2Idx]);
        }
    }

    if (numBeams >= 3 && survivors.length > 2) {
        // Beam 3: second fastest with >=5 frame difference from beam 1
        const beam1Frames = survivors[0].frame;
        for (let i = 1; i < survivors.length; i++) {
            if (winners.includes(survivors[i])) continue;
            if (Math.abs(survivors[i].frame - beam1Frames) >= 5) {
                winners.push(survivors[i]);
                break;
            }
        }
        if (winners.length < 3) {
            for (let i = 1; i < survivors.length; i++) {
                if (!winners.includes(survivors[i])) {
                    winners.push(survivors[i]);
                    break;
                }
            }
        }
    }

    // Extract inputs from packed buffer for each winner
    return winners.slice(0, numBeams).map(w => {
        const inputs = new Uint8Array(FRAMES_PER_CHUNK);
        const src = new Uint8Array(w.packedInputs.buffer, w.packedInputs.byteOffset + w.simIndex * FRAMES_PER_CHUNK, FRAMES_PER_CHUNK);
        inputs.set(src);
        return { survivor: w, inputs };
    });
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });

} // end isMainThread
