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
const MIN_CHUNK_SIZE_PX = 100;

// Mutation-based search
const NEAR_MISS_THRESHOLD = 0.15; // return near-miss if reached 15%+ of chunk distance (was 0.3)
const TOP_NEAR_MISSES = 20;       // keep top N near-misses per chunk
const MUTATION_RATIO = 0.5;       // 50% of sims are mutations when near-misses available
const MUTATIONS_PER_PARENT = 5;   // how many children per parent input

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
    // Returns object with survived=true for survivors, survived=false+bestX for near-misses, null for junk.
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
        const chunkDist = targetX - startX;
        const nearMissMin = startX + chunkDist * NEAR_MISS_THRESHOLD;

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
            // Dead — return near-miss if got far enough, with death reason
            const ps = mem[0x000E];
            if (ps === 0x0B || ps === 0x06 || mem[0x00CE] > 240 || mem[0x0770] === 3) {
                const reason = mem[0x00CE] > 240 ? 'fell' : 'enemy';
                return bestX >= nearMissMin ? { survived: false, bestX, frame: frame + 1, reason } : { reason };
            }
            if (frame > 15 && x < startX) return { reason: 'backwards' };
            if (frame - lastProgressFrame > 35) {
                return bestX >= nearMissMin ? { survived: false, bestX, frame: frame + 1, reason: 'stalled' } : { reason: 'stalled' };
            }
            if (frame > 0 && frame % 30 === 0) {
                const expectedProgress = chunkDist * (frame / maxFrame) * 0.15; // 15% of linear pace (was 30%)
                if (bestX - startX < expectedProgress) {
                    return bestX >= nearMissMin ? { survived: false, bestX, frame: frame + 1, reason: 'too_slow' } : { reason: 'too_slow' };
                }
            }
        }
        return bestX >= nearMissMin ? { survived: false, bestX, frame, reason: 'timeout' } : { reason: 'timeout' };
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
            const survivors = [];
            const nearMisses = [];
            const deathStats = {};
            for (let i = 0; i < numSims; i++) {
                const offset = i * framesPerSim;
                if (buf.byteOffset + offset + framesPerSim > buf.buffer.byteLength) break;
                const slice = new Uint8Array(buf.buffer, buf.byteOffset + offset, framesPerSim);
                const r = simulateLite(slice, targetX);
                if (!r) continue;
                if (r.survived === true) {
                    survivors.push({ simIndex: i, ...r });
                } else if (r.survived === false && r.bestX !== undefined) {
                    // Near-miss: keep top 10 by bestX
                    nearMisses.push({ simIndex: i, bestX: r.bestX });
                    if (nearMisses.length > 10) {
                        nearMisses.sort((a, b) => b.bestX - a.bestX);
                        nearMisses.length = 10;
                    }
                    if (r.reason) deathStats[r.reason] = (deathStats[r.reason] || 0) + 1;
                } else if (r.reason) {
                    // Dead run with reason only
                    deathStats[r.reason] = (deathStats[r.reason] || 0) + 1;
                }
            }
            parentPort.postMessage({ survivors, nearMisses, deathStats });
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

// Movement mask: everything except A (jump). Held for long durations.
function randomMovementMask() {
    let mask = 0;
    if (Math.random() < 0.92) mask |= BIT.RIGHT;
    if (Math.random() < 0.80) mask |= BIT.B;
    if (Math.random() < 0.03) mask |= BIT.LEFT;
    if (Math.random() < 0.03) mask |= BIT.DOWN;
    if (Math.random() < 0.02) mask |= BIT.UP;
    if (!(mask & BIT.RIGHT) && Math.random() < 0.85) mask |= BIT.RIGHT;
    if ((mask & BIT.LEFT) && (mask & BIT.RIGHT)) mask &= ~BIT.LEFT;
    if ((mask & BIT.UP) && (mask & BIT.DOWN)) mask &= ~BIT.DOWN;
    return mask;
}

// Jump timing: realistic Mario jump durations
function randomJumpDuration() {
    const r = Math.random();
    if (r < 0.25) return 0;                                           // no jump (25%)
    if (r < 0.45) return 2 + Math.floor(Math.random() * 7);          // small hop: 2-8 frames (20%)
    if (r < 0.70) return 10 + Math.floor(Math.random() * 11);        // medium jump: 10-20 frames (25%)
    if (r < 0.90) return 20 + Math.floor(Math.random() * 15);        // big jump: 20-34 frames (20%)
    return 0;                                                          // no jump (10%)
}

// Gap between jumps: how long to wait before next jump opportunity
function randomJumpGap() {
    const r = Math.random();
    if (r < 0.3) return 5 + Math.floor(Math.random() * 16);          // short gap: 5-20 frames
    if (r < 0.7) return 20 + Math.floor(Math.random() * 31);         // medium gap: 20-50 frames
    return 50 + Math.floor(Math.random() * 80);                       // long gap: 50-129 frames
}

function randomMovementDuration() {
    return MIN_SEGMENT_DURATION + Math.floor(Math.random() * (MAX_SEGMENT_DURATION - MIN_SEGMENT_DURATION));
}

// Legacy: combined bitmask for mutation compatibility
function randomBitmask() {
    return randomMovementMask() | (Math.random() < 0.35 ? BIT.A : 0);
}

function randomDuration() {
    return randomMovementDuration();
}

function generateRandomInputs(maxFrames) {
    const inputs = new Uint8Array(maxFrames);
    // Two independent tracks: movement (long segments) + jump (short, precise)
    let moveMask = randomMovementMask();
    let moveHold = randomMovementDuration();
    let moveElapsed = 0;

    let jumpActive = false;
    let jumpFramesLeft = 0;
    let gapFramesLeft = randomJumpGap();

    for (let f = 0; f < maxFrames; f++) {
        // Movement track
        if (moveElapsed >= moveHold) {
            moveMask = randomMovementMask();
            moveHold = randomMovementDuration();
            moveElapsed = 0;
        }
        moveElapsed++;

        // Jump track (independent timing)
        let jumpBit = 0;
        if (jumpActive) {
            jumpBit = BIT.A;
            jumpFramesLeft--;
            if (jumpFramesLeft <= 0) {
                jumpActive = false;
                gapFramesLeft = randomJumpGap();
            }
        } else {
            gapFramesLeft--;
            if (gapFramesLeft <= 0) {
                const dur = randomJumpDuration();
                if (dur > 0) {
                    jumpActive = true;
                    jumpFramesLeft = dur;
                    jumpBit = BIT.A;
                } else {
                    gapFramesLeft = randomJumpGap();
                }
            }
        }

        inputs[f] = moveMask | jumpBit;
    }
    return inputs;
}

function generatePackedInputs(numSims, framesPerSim) {
    const buf = Buffer.alloc(numSims * framesPerSim);
    for (let i = 0; i < numSims; i++) {
        const offset = i * framesPerSim;
        let moveMask = randomMovementMask();
        let moveHold = randomMovementDuration();
        let moveElapsed = 0;

        let jumpActive = false;
        let jumpFramesLeft = 0;
        let gapFramesLeft = randomJumpGap();

        for (let f = 0; f < framesPerSim; f++) {
            if (moveElapsed >= moveHold) {
                moveMask = randomMovementMask();
                moveHold = randomMovementDuration();
                moveElapsed = 0;
            }
            moveElapsed++;

            let jumpBit = 0;
            if (jumpActive) {
                jumpBit = BIT.A;
                jumpFramesLeft--;
                if (jumpFramesLeft <= 0) {
                    jumpActive = false;
                    gapFramesLeft = randomJumpGap();
                }
            } else {
                gapFramesLeft--;
                if (gapFramesLeft <= 0) {
                    const dur = randomJumpDuration();
                    if (dur > 0) {
                        jumpActive = true;
                        jumpFramesLeft = dur;
                        jumpBit = BIT.A;
                    } else {
                        gapFramesLeft = randomJumpGap();
                    }
                }
            }

            buf[offset + f] = moveMask | jumpBit;
        }
    }
    return buf;
}

// ==================== SPRINT+JUMP SEEDING ====================

function generateSprintJumpInputs(numSims, framesPerSim, direction = 'right') {
    // All sims hold direction+B constantly, only vary jump (A) timing
    const buf = Buffer.alloc(numSims * framesPerSim);
    const BASE = (direction === 'left' ? BIT.LEFT : BIT.RIGHT) | BIT.B;

    for (let i = 0; i < numSims; i++) {
        const offset = i * framesPerSim;
        let jumpActive = false;
        let jumpFramesLeft = 0;
        let gapFramesLeft = randomJumpGap();

        for (let f = 0; f < framesPerSim; f++) {
            let jumpBit = 0;
            if (jumpActive) {
                jumpBit = BIT.A;
                jumpFramesLeft--;
                if (jumpFramesLeft <= 0) { jumpActive = false; gapFramesLeft = randomJumpGap(); }
            } else {
                gapFramesLeft--;
                if (gapFramesLeft <= 0) {
                    const dur = randomJumpDuration();
                    if (dur > 0) { jumpActive = true; jumpFramesLeft = dur; jumpBit = BIT.A; }
                    else { gapFramesLeft = randomJumpGap(); }
                }
            }
            buf[offset + f] = BASE | jumpBit;
        }
    }
    return buf;
}

// ==================== MUTATION ====================

function mutateInputs(parent, framesPerSim) {
    const child = new Uint8Array(framesPerSim);
    child.set(parent.length >= framesPerSim ? parent.slice(0, framesPerSim) : parent);

    // Apply 1-3 random mutations
    const numOps = 1 + Math.floor(Math.random() * 3);
    for (let op = 0; op < numOps; op++) {
        const r = Math.random();
        if (r < 0.4) {
            // Segment replace: replace 5-30 frames with a new random bitmask
            const start = Math.floor(Math.random() * framesPerSim);
            const len = 5 + Math.floor(Math.random() * 26);
            const mask = randomBitmask();
            for (let f = start; f < Math.min(start + len, framesPerSim); f++) child[f] = mask;
        } else if (r < 0.7) {
            // Segment shift: shift a block by +/- 1-5 frames
            const pos = Math.floor(Math.random() * framesPerSim);
            const shift = (Math.random() < 0.5 ? 1 : -1) * (1 + Math.floor(Math.random() * 5));
            if (shift > 0) {
                // Shift right: duplicate frames at pos
                for (let f = framesPerSim - 1; f >= pos + shift; f--) child[f] = child[f - shift];
            } else {
                // Shift left: remove frames at pos
                const absShift = -shift;
                for (let f = pos; f < framesPerSim - absShift; f++) child[f] = child[f + absShift];
            }
        } else {
            // Button flip: flip 1-3 random frame bits
            const flips = 1 + Math.floor(Math.random() * 3);
            for (let i = 0; i < flips; i++) {
                const f = Math.floor(Math.random() * framesPerSim);
                const bit = 1 << Math.floor(Math.random() * 8);
                child[f] ^= bit;
            }
        }
    }
    return child;
}

function breedInputs(parentA, parentB, framesPerSim) {
    const child = new Uint8Array(framesPerSim);
    const r = Math.random();

    if (r < 0.4) {
        // Single-point crossover: take frames 0..cut from A, cut+1..end from B
        const cut = Math.floor(Math.random() * framesPerSim);
        child.set(parentA.slice(0, cut), 0);
        child.set(parentB.slice(cut, framesPerSim), cut);
    } else if (r < 0.7) {
        // Two-point crossover: A..B..A sandwich
        let cut1 = Math.floor(Math.random() * framesPerSim);
        let cut2 = Math.floor(Math.random() * framesPerSim);
        if (cut1 > cut2) [cut1, cut2] = [cut2, cut1];
        child.set(parentA.slice(0, cut1), 0);
        child.set(parentB.slice(cut1, cut2), cut1);
        child.set(parentA.slice(cut2, framesPerSim), cut2);
    } else {
        // Uniform crossover: randomly pick each frame from A or B
        for (let f = 0; f < framesPerSim; f++) {
            child[f] = Math.random() < 0.5 ? parentA[f] : parentB[f];
        }
    }

    // Light mutation on the offspring (50% chance)
    if (Math.random() < 0.5) return mutateInputs(child, framesPerSim);
    return child;
}

function generateMixedInputs(numSims, framesPerSim, nearMissInputs) {
    // Generate a buffer with a mix of random, mutated, and bred inputs
    const buf = Buffer.alloc(numSims * framesPerSim);
    const n = nearMissInputs.length;

    // Adaptive split based on near-miss pool size
    let pctRandom, pctMutate, pctBreed;
    if (n === 0)       { pctRandom = 1.0;  pctMutate = 0;    pctBreed = 0;    }
    else if (n === 1)  { pctRandom = 0.60; pctMutate = 0.40; pctBreed = 0;    }
    else if (n <= 5)   { pctRandom = 0.60; pctMutate = 0.25; pctBreed = 0.15; }
    else if (n <= 15)  { pctRandom = 0.40; pctMutate = 0.30; pctBreed = 0.30; }
    else               { pctRandom = 0.20; pctMutate = 0.35; pctBreed = 0.45; }

    const numBred = Math.floor(numSims * pctBreed);
    const numMutated = Math.floor(numSims * pctMutate);
    const numRandom = numSims - numMutated - numBred;

    // Fill random portion using two-track generation (movement + jump)
    for (let i = 0; i < numRandom; i++) {
        const offset = i * framesPerSim;
        let moveMask = randomMovementMask();
        let moveHold = randomMovementDuration();
        let moveElapsed = 0;
        let jumpActive = false, jumpFramesLeft = 0, gapFramesLeft = randomJumpGap();
        for (let f = 0; f < framesPerSim; f++) {
            if (moveElapsed >= moveHold) { moveMask = randomMovementMask(); moveHold = randomMovementDuration(); moveElapsed = 0; }
            moveElapsed++;
            let jumpBit = 0;
            if (jumpActive) {
                jumpBit = BIT.A; jumpFramesLeft--;
                if (jumpFramesLeft <= 0) { jumpActive = false; gapFramesLeft = randomJumpGap(); }
            } else {
                gapFramesLeft--;
                if (gapFramesLeft <= 0) {
                    const dur = randomJumpDuration();
                    if (dur > 0) { jumpActive = true; jumpFramesLeft = dur; jumpBit = BIT.A; }
                    else { gapFramesLeft = randomJumpGap(); }
                }
            }
            buf[offset + f] = moveMask | jumpBit;
        }
    }

    // Fill mutated portion from near-miss parents
    for (let i = 0; i < numMutated; i++) {
        const parent = nearMissInputs[i % nearMissInputs.length];
        const child = mutateInputs(parent, framesPerSim);
        buf.set(child, (numRandom + i) * framesPerSim);
    }

    // Fill bred portion — crossover between two different parents
    for (let i = 0; i < numBred; i++) {
        const idxA = Math.floor(Math.random() * nearMissInputs.length);
        let idxB = Math.floor(Math.random() * (nearMissInputs.length - 1));
        if (idxB >= idxA) idxB++; // ensure different parents
        const child = breedInputs(nearMissInputs[idxA], nearMissInputs[idxB], framesPerSim);
        buf.set(child, (numRandom + numMutated + i) * framesPerSim);
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
        const allNearMisses = [];
        const allDeathStats = {};
        const simsPerWorker = Math.ceil(numSims / workers.length);
        let completed = 0;

        workers.forEach((worker, wi) => {
            const start = wi * simsPerWorker;
            const end = Math.min(start + simsPerWorker, numSims);
            if (start >= numSims) {
                completed++;
                if (completed === workers.length) resolve({ survivors: allSurvivors, nearMisses: allNearMisses, deathStats: allDeathStats });
                return;
            }

            const byteStart = start * framesPerSim;
            const byteEnd = end * framesPerSim;
            const chunk = packedInputs.slice(byteStart, Math.min(byteEnd, packedInputs.length));
            const actualSims = Math.floor(chunk.length / framesPerSim);
            if (actualSims === 0) {
                completed++;
                if (completed === workers.length) resolve({ survivors: allSurvivors, nearMisses: allNearMisses, deathStats: allDeathStats });
                return;
            }

            worker.once('message', (result) => {
                const survivors = Array.isArray(result) ? result : result.survivors;
                const nearMisses = Array.isArray(result) ? [] : (result.nearMisses || []);
                const deathStats = Array.isArray(result) ? {} : (result.deathStats || {});
                for (const s of survivors) s.simIndex += start;
                for (const nm of nearMisses) nm.simIndex += start;
                allSurvivors.push(...survivors);
                allNearMisses.push(...nearMisses);
                for (const [reason, count] of Object.entries(deathStats)) {
                    allDeathStats[reason] = (allDeathStats[reason] || 0) + count;
                }
                completed++;
                if (completed === workers.length) resolve({ survivors: allSurvivors, nearMisses: allNearMisses, deathStats: allDeathStats });
            });
            worker.postMessage({ type: 'simulate_packed', inputBuf: chunk, numSims: actualSims, framesPerSim, targetX });
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
            console.log(`  ${C.red}Starting fresh — clearing saved chunks and old runs${C.reset}\n`);
            db.db.exec('DELETE FROM beam_chunks');
            db.db.exec('DELETE FROM runs');
            db.db.exec('VACUUM');
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
    let previousChunkWinnerInputs = []; // seed inputs from last chunk's winners
    let prevPrevChunkBeamState = null; // beam state before the PREVIOUS chunk (for backtracking 1 level)
    let prevChunkBeamState = null; // beam state before current chunk
    let backtracked = false; // prevent infinite backtrack loops

    // Independent beam states for thorough mode
    const initBeamState = () => ({
        saveStateStr: trainingSaveStateStr,
        inputs: new Uint8Array(0),
        frames: 0,
        targetX: CHUNK_START_X,
        prevSaveState: null,
        backtracked: false,
        completed: false,
    });
    const beamStates = mode === 'thorough'
        ? Array.from({ length: NUM_BEAMS }, initBeamState)
        : [];

    console.log(`${C.cyan}=== CHUNKED BEAM SEARCH (${mode.toUpperCase()}) ===${C.reset}`);
    const modeDesc = mode === 'fast' ? 'stop on first survivor per chunk' : `${CHUNK_SIMS_PER_BEAM} sims/beam, ${NUM_BEAMS} beams`;
    console.log(`${C.dim}${totalChunks} chunks of ${CHUNK_SIZE_PX}px | ${modeDesc}${C.reset}`);
    console.log(`${C.dim}Strategy: sprint+jump seed -> random -> mutate -> breed (adaptive ratios)${C.reset}`);
    console.log(`${C.dim}Fallback: progressive ${MIN_CHUNK_SIZE_PX}px sub-targets after ${100 * 500} failed attempts${C.reset}\n`);

    for (let ci = startChunkIndex; ci < totalChunks + 5 && !levelCompleted; ci++) {
        const chunkStart = Date.now();
        await processWorkerOps();
        currentRound = ci;

        // Save beam states for backtracking (need 2 levels: prev chunk's start)
        prevPrevChunkBeamState = prevChunkBeamState;
        prevChunkBeamState = { ...beams[0] };

        const targetX = CHUNK_START_X + (ci + 1) * CHUNK_SIZE_PX;
        let chunkSims = mode === 'fast' ? 500 : CHUNK_SIMS_PER_BEAM; // fast: small batches
        let currentChunkSize = CHUNK_SIZE_PX;
        let allSurvivors = [];
        let totalSimsThisChunk = 0;
        let foundSurvivor = false;
        let chunkDeathStats = {};

        if (mode === 'fast') {
            // FAST MODE: 1 beam, send batches of 500, stop on first survivor
            // Uses mutation-based search: track near-misses and mutate their inputs
            const beam = beams[0]; // only use the best beam
            currentBroadcastState = beam.saveStateStr; await broadcastSaveState(workers, beam.saveStateStr);

            // Adaptive batch: start with 1 sim per worker, scale up as chunk gets harder
            let currentBatch = workers.length; // 1 sim per worker = minimum parallel unit
            const FAST_MAX_SIMS = 50500; // total sim budget
            let chunkNearMisses = []; // {simIndex, bestX, inputBuf} sorted by bestX desc
            let prevStrategy = 'none';

            while (totalSimsThisChunk < FAST_MAX_SIMS && !foundSurvivor) {
                await processWorkerOps();

                let packedInputs;
                if (totalSimsThisChunk === 0) {
                    // First batch: sprint+jump seed — hold RIGHT+B, vary only jump timing
                    packedInputs = generateSprintJumpInputs(currentBatch, FRAMES_PER_CHUNK, 'right');
                    console.log(`  ${C.cyan}-> Sprint+jump seed (${currentBatch} runs: RIGHT+B held, random A timing)${C.reset}`);
                    prevStrategy = 'sprint';
                } else {
                    // Subsequent batches: adaptive mix of random + mutations/breeding
                    const nearMissInputs2 = chunkNearMisses.map(nm => nm.inputBuf);
                    packedInputs = generateMixedInputs(currentBatch, FRAMES_PER_CHUNK, nearMissInputs2);

                    // Strategy transition logging
                    const nmLen = nearMissInputs2.length;
                    const strategy = nmLen >= 16 ? 'full-genetic' : nmLen >= 6 ? 'genetic' : nmLen >= 2 ? 'breed' : nmLen > 0 ? 'mutate' : 'random';
                    if (strategy !== prevStrategy) {
                        process.stdout.write('\x1b[2K');
                        const bestNMX = chunkNearMisses[0]?.bestX || 0;
                        if (nmLen >= 16) console.log(`  ${C.cyan}-> Full genetic (R20/M35/B45) from ${nmLen} near-misses (best X:${bestNMX})${C.reset}`);
                        else if (nmLen >= 6) console.log(`  ${C.cyan}-> Genetic (R40/M30/B30) from ${nmLen} near-misses (best X:${bestNMX})${C.reset}`);
                        else if (nmLen >= 2) console.log(`  ${C.cyan}-> Breeding+mutating (R60/M25/B15) from ${nmLen} near-misses (best X:${bestNMX})${C.reset}`);
                        else if (nmLen > 0) console.log(`  ${C.cyan}-> Mutating (R60/M40) from ${nmLen} near-miss (best X:${bestNMX})${C.reset}`);
                        else console.log(`  ${C.cyan}-> Random exploration${C.reset}`);
                        prevStrategy = strategy;
                    }

                    // Scale up batch size as chunk gets harder
                    // Scale up quickly: 15 -> 150 -> 500
                    if (totalSimsThisChunk > 100) currentBatch = Math.min(500, workers.length * 10);
                    if (totalSimsThisChunk > 1000) currentBatch = 500;
                }
                totalSimsThisChunk += currentBatch;

                const { survivors, nearMisses, deathStats } = await evaluateChunkBatch(workers, packedInputs, currentBatch, FRAMES_PER_CHUNK, targetX);
                for (const [r, c] of Object.entries(deathStats)) chunkDeathStats[r] = (chunkDeathStats[r] || 0) + c;

                // Update near-miss pool
                for (const nm of nearMisses) {
                    nm.inputBuf = new Uint8Array(packedInputs.buffer, packedInputs.byteOffset + nm.simIndex * FRAMES_PER_CHUNK, FRAMES_PER_CHUNK).slice();
                }
                chunkNearMisses.push(...nearMisses);
                chunkNearMisses.sort((a, b) => b.bestX - a.bestX);
                if (chunkNearMisses.length > TOP_NEAR_MISSES) chunkNearMisses.length = TOP_NEAR_MISSES;

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
                // Early backtrack: if after 5000 sims, zero near-misses and >95% same death, stop early
                if (totalSimsThisChunk >= 5000 && chunkNearMisses.length === 0 && ci > 0 && !backtracked) {
                    const totalDC = Object.values(chunkDeathStats).reduce((a, b) => a + b, 0);
                    if (totalDC > 0) {
                        const topDC = Math.max(...Object.values(chunkDeathStats));
                        if (topDC / totalDC > 0.95) {
                            process.stdout.write('\x1b[2K');
                            console.log(`  ${C.yellow}Hopeless after ${totalSimsThisChunk} attempts (0 near-misses) — triggering early backtrack${C.reset}`);
                            break;
                        }
                    }
                }

                // Progress feedback with near-miss, mutation, and death info
                if (totalSimsThisChunk % (currentBatch * 3) === 0 && totalSimsThisChunk > 0) {
                    const elapsed = (Date.now() - chunkStart) / 1000;
                    const rate = Math.round(totalSimsThisChunk / elapsed);
                    const bestNM = chunkNearMisses.length > 0 ? chunkNearMisses[0].bestX : 0;
                    const nmCount = chunkNearMisses.length;
                    const nmInfo = bestNM > 0 ? ` | ${nmCount} near-misses (best X:${bestNM})` : ' | no near-misses yet';
                    const nmLen = chunkNearMisses.length;
                    const mutInfo = nmLen >= 2 ? ` | R${nmLen<=5?60:nmLen<=15?40:20}/M${nmLen<=5?25:nmLen<=15?30:35}/B${nmLen<=5?15:nmLen<=15?30:45}` : nmLen > 0 ? ' | R60/M40' : ' | random';
                    const totalDeaths = Object.values(chunkDeathStats).reduce((a, b) => a + b, 0);
                    let deathInfo = '';
                    if (totalDeaths > 0) {
                        const top = Object.entries(chunkDeathStats).sort((a, b) => b[1] - a[1]).slice(0, 3)
                            .map(([r, c]) => `${r}:${(c / totalDeaths * 100).toFixed(0)}%`).join(' ');
                        deathInfo = ` | deaths: ${top}`;
                    }
                    process.stdout.write(`  ${C.dim}Chunk ${ci+1} X:${targetX-CHUNK_SIZE_PX}->${targetX} | ${totalSimsThisChunk} tried | ${rate}/s | ${workers.length}w | ${elapsed.toFixed(0)}s${nmInfo}${mutInfo}${deathInfo}${C.reset}\r`);
                }
            }
            if (foundSurvivor) process.stdout.write('\x1b[2K'); // clear progress line
        } else {
            // ==================== THOROUGH MODE: FULLY INDEPENDENT BEAMS ====================
            // Beams 1 & 2: 100% independent paths through the level
            // Beam 3: breeds from beams 1 & 2's near-misses but maintains its own path

            // Helper: run one beam's sims, pick its own winner, return {winner, nearMisses, survivors, deathStats}
            async function solveChunkForBeam(bi, beamState, seedInputs) {
                currentBroadcastState = beamState.saveStateStr;
                await broadcastSaveState(workers, beamState.saveStateStr);

                let beamNearMisses = [];
                let beamSurvivors = [];
                let beamDeathStats = {};
                const simsPerRound = Math.min(500, chunkSims);
                let beamSimsDone = 0;
                let bestFrame = Infinity;
                let prevBeamStrategy = 'none';

                while (beamSimsDone < chunkSims) {
                    await processWorkerOps();
                    const batchSize = Math.min(simsPerRound, chunkSims - beamSimsDone);

                    let packedInputs;
                    if (beamSimsDone === 0) {
                        packedInputs = generateSprintJumpInputs(batchSize, FRAMES_PER_CHUNK, 'right');
                        console.log(`  ${C.cyan}-> Beam ${bi+1}: Sprint+jump seed (${batchSize} runs)${C.reset}`);
                        prevBeamStrategy = 'sprint';
                    } else {
                        const nearMissInputs = beamNearMisses.map(nm => nm.inputBuf);
                        const allSeeds = [...nearMissInputs, ...seedInputs];
                        packedInputs = generateMixedInputs(batchSize, FRAMES_PER_CHUNK, allSeeds);

                        const nmLen = allSeeds.length;
                        const strategy = nmLen >= 16 ? 'full-genetic' : nmLen >= 6 ? 'genetic' : nmLen >= 2 ? 'breed' : nmLen > 0 ? 'mutate' : 'random';
                        if (strategy !== prevBeamStrategy) {
                            process.stdout.write('\x1b[2K');
                            const bestNMX = beamNearMisses[0]?.bestX || 0;
                            console.log(`  ${C.cyan}-> Beam ${bi+1}: ${strategy} from ${nmLen} seeds (best X:${bestNMX})${C.reset}`);
                            prevBeamStrategy = strategy;
                        }
                    }

                    beamSimsDone += batchSize;
                    totalSimsThisChunk += batchSize;

                    const { survivors, nearMisses, deathStats } = await evaluateChunkBatch(workers, packedInputs, batchSize, FRAMES_PER_CHUNK, targetX);
                    for (const [r, c] of Object.entries(deathStats)) {
                        beamDeathStats[r] = (beamDeathStats[r] || 0) + c;
                        chunkDeathStats[r] = (chunkDeathStats[r] || 0) + c;
                    }

                    for (const nm of nearMisses) {
                        nm.inputBuf = new Uint8Array(packedInputs.buffer, packedInputs.byteOffset + nm.simIndex * FRAMES_PER_CHUNK, FRAMES_PER_CHUNK).slice();
                    }
                    beamNearMisses.push(...nearMisses);
                    beamNearMisses.sort((a, b) => b.bestX - a.bestX);
                    if (beamNearMisses.length > TOP_NEAR_MISSES) beamNearMisses.length = TOP_NEAR_MISSES;

                    for (const s of survivors) {
                        s.beamIndex = bi;
                        s.packedInputs = packedInputs;
                        s.parentSaveStateStr = beamState.saveStateStr;
                        s.parentFrames = beamState.frames;
                        s.parentInputs = beamState.inputs;
                    }
                    beamSurvivors.push(...survivors);
                    for (const s of survivors) { if (s.frame < bestFrame) bestFrame = s.frame; }
                    if (survivors.some(s => s.completed)) levelCompleted = true;

                    if (beamSimsDone % (simsPerRound * 3) === 0) {
                        const elapsed = (Date.now() - chunkStart) / 1000;
                        const rate = Math.round(totalSimsThisChunk / elapsed);
                        const bestNM = beamNearMisses.length > 0 ? beamNearMisses[0].bestX : 0;
                        const nmInfo = bestNM > 0 ? ` | ${beamNearMisses.length} near-misses (best X:${bestNM})` : '';
                        process.stdout.write(`  ${C.dim}Beam ${bi+1} | ${beamSimsDone}/${chunkSims} sims | ${rate}/s | ${workers.length}w${nmInfo}${C.reset}\r`);
                    }
                }

                // Refinement: breed/mutate this beam's top survivors
                if (beamSurvivors.length >= 2) {
                    beamSurvivors.sort((a, b) => a.frame - b.frame);
                    const topInputs = beamSurvivors.slice(0, 20).map(s =>
                        new Uint8Array(s.packedInputs.buffer, s.packedInputs.byteOffset + s.simIndex * FRAMES_PER_CHUNK, FRAMES_PER_CHUNK).slice()
                    );
                    const bestBefore = beamSurvivors[0].frame;
                    for (let ri = 0; ri < 3; ri++) {
                        const refBuf = Buffer.alloc(500 * FRAMES_PER_CHUNK);
                        const nBreed = 300, nMut = 200;
                        for (let i = 0; i < nMut; i++) {
                            refBuf.set(mutateInputs(topInputs[i % topInputs.length], FRAMES_PER_CHUNK), i * FRAMES_PER_CHUNK);
                        }
                        for (let i = 0; i < nBreed; i++) {
                            const a = Math.floor(Math.random() * topInputs.length);
                            let b = Math.floor(Math.random() * (topInputs.length - 1)); if (b >= a) b++;
                            refBuf.set(breedInputs(topInputs[a], topInputs[b], FRAMES_PER_CHUNK), (nMut + i) * FRAMES_PER_CHUNK);
                        }
                        totalSimsThisChunk += 500;
                        const { survivors: refS } = await evaluateChunkBatch(workers, refBuf, 500, FRAMES_PER_CHUNK, targetX);
                        for (const s of refS) {
                            s.beamIndex = bi; s.packedInputs = refBuf;
                            s.parentSaveStateStr = beamState.saveStateStr;
                            s.parentFrames = beamState.frames; s.parentInputs = beamState.inputs;
                        }
                        beamSurvivors.push(...refS);
                        beamSurvivors.sort((a, b) => a.frame - b.frame);
                        for (let ti = 0; ti < Math.min(beamSurvivors.length, topInputs.length); ti++) {
                            topInputs[ti] = new Uint8Array(beamSurvivors[ti].packedInputs.buffer, beamSurvivors[ti].packedInputs.byteOffset + beamSurvivors[ti].simIndex * FRAMES_PER_CHUNK, FRAMES_PER_CHUNK).slice();
                        }
                    }
                    bestFrame = beamSurvivors[0].frame;
                }

                process.stdout.write('\x1b[2K');
                const bestNMX = beamNearMisses.length > 0 ? beamNearMisses[0].bestX : 0;
                if (beamSurvivors.length > 0) {
                    console.log(`  ${C.green}Beam ${bi+1}: ${beamSurvivors.length} survived | ${beamNearMisses.length} near-misses${bestNMX ? ` (best X:${bestNMX})` : ''}${C.reset}`);
                } else {
                    console.log(`  ${C.red}Beam ${bi+1}: 0 survived | ${beamNearMisses.length} near-misses${bestNMX ? ` (best X:${bestNMX})` : ''}${C.reset}`);
                }

                // Pick this beam's own winner
                const beamWinners = selectDiverseFromAllSurvivors(beamSurvivors, 1);
                return { winner: beamWinners[0] || null, nearMisses: beamNearMisses, survivors: beamSurvivors, deathStats: beamDeathStats };
            }

            // Solve chunk for each beam independently
            const beamNearMissPool = [];

            // Beam 1: independent
            const b1 = await solveChunkForBeam(0, beamStates[0], previousChunkWinnerInputs);
            beamNearMissPool.push(...b1.nearMisses.map(nm => nm.inputBuf));

            // Beam 2: independent
            const b2 = await solveChunkForBeam(1, beamStates[1], previousChunkWinnerInputs);
            beamNearMissPool.push(...b2.nearMisses.map(nm => nm.inputBuf));

            // Beam 3: offspring — seeded from beams 1 & 2's near-misses
            console.log(`  ${C.cyan}-> Beam 3: Breeding offspring from beams 1 & 2 (${beamNearMissPool.length} parent inputs)${C.reset}`);
            const b3 = await solveChunkForBeam(2, beamStates[2], beamNearMissPool);

            // Each beam advances independently with its own winner
            const beamResults = [b1, b2, b3];
            let anyBeamCompleted = false;

            for (let bi = 0; bi < NUM_BEAMS; bi++) {
                const br = beamResults[bi];
                if (br.winner) {
                    const w = br.winner;
                    const chunkFrames = w.survivor.frame;
                    const ss = captureBeamSaveState(nes, {
                        parentSaveStateStr: w.survivor.parentSaveStateStr,
                        inputs: w.inputs,
                        frame: chunkFrames,
                    }, romString);
                    const parentInputs = w.survivor.parentInputs;
                    const fullInputs = new Uint8Array(parentInputs.length + chunkFrames);
                    fullInputs.set(parentInputs, 0);
                    fullInputs.set(w.inputs.slice(0, chunkFrames), parentInputs.length);
                    const beamFrames = w.survivor.parentFrames + chunkFrames;

                    beamStates[bi].prevSaveState = { ...beamStates[bi] };
                    beamStates[bi].saveStateStr = ss;
                    beamStates[bi].inputs = fullInputs;
                    beamStates[bi].frames = beamFrames;
                    beamStates[bi].targetX = targetX;
                    beamStates[bi].completed = w.survivor.completed || false;
                    beamStates[bi].backtracked = false;

                    if (w.survivor.completed) anyBeamCompleted = true;

                    db.saveBeamChunk(ci, bi, {
                        targetX, frames: beamFrames, inputs: fullInputs,
                        saveStateStr: bi === 0 ? ss : '', avgY: w.survivor.avgY,
                    });
                } else {
                    // Beam failed this chunk — check for backtrack
                    const bds = br.deathStats;
                    const totalBD = Object.values(bds).reduce((a, b) => a + b, 0);
                    if (totalBD > 0 && !beamStates[bi].backtracked && beamStates[bi].prevSaveState) {
                        const topBD = Math.max(...Object.values(bds));
                        if (topBD / totalBD > 0.95) {
                            const topReason = Object.entries(bds).sort((a, b) => b[1] - a[1])[0][0];
                            console.log(`  ${C.yellow}Beam ${bi+1}: ${(topBD/totalBD*100).toFixed(0)}% "${topReason}" — backtracking with +50px${C.reset}`);
                            // Restore previous state and mark for retry
                            const prev = beamStates[bi].prevSaveState;
                            beamStates[bi].saveStateStr = prev.saveStateStr;
                            beamStates[bi].inputs = prev.inputs;
                            beamStates[bi].frames = prev.frames;
                            beamStates[bi].targetX = prev.targetX;
                            beamStates[bi].backtracked = true;
                            // TODO: extended target on retry — for now just retry from prev position
                        }
                    }
                    console.log(`  ${C.red}Beam ${bi+1}: no winner for chunk ${ci+1}${C.reset}`);
                }
            }

            // Update beams array for compatibility with fast mode / shared code
            beams = beamStates.map(bs => ({
                inputs: bs.inputs, saveStateStr: bs.saveStateStr,
                frames: bs.frames, targetX: bs.targetX,
            }));

            // Find fastest beam for global best tracking
            const bestBeam = beamStates.reduce((best, bs) => bs.frames < best.frames ? bs : best, beamStates[0]);
            totalFrames = bestBeam.frames;
            globalBestInputs = bestBeam.inputs;
            globalBestResult = {
                bestX: targetX, completed: anyBeamCompleted,
                completionFrame: anyBeamCompleted ? bestBeam.frames : 0,
                frame: bestBeam.frames, reason: anyBeamCompleted ? 'completed' : 'in_progress',
                checkpoints: [null, null, null], stuckFrames: 0,
            };

            // Chunk summary with per-beam status
            const chunkTime = (Date.now() - chunkStart) / 1000;
            const pct = Math.round(Math.min(targetX, LEVEL_WIDTH) / LEVEL_WIDTH * 100);
            const bar = makeProgressBar(Math.min(targetX, LEVEL_WIDTH), LEVEL_WIDTH, 25);
            console.log(`Chunk ${String(ci + 1).padStart(2)}/${totalChunks} | X:${targetX-CHUNK_SIZE_PX}-${targetX} | ${totalSimsThisChunk} attempts | took ${chunkTime.toFixed(0)}s`);
            for (let bi = 0; bi < NUM_BEAMS; bi++) {
                const bs = beamStates[bi];
                const gt = (bs.frames / 60.098).toFixed(1);
                const spd = (bs.targetX / bs.frames * 60.098).toFixed(0);
                const status = bs.completed ? `${C.green}COMPLETE${C.reset}` : `${bs.targetX}px ${gt}s ${spd}px/s`;
                console.log(`  Beam ${bi+1}: ${status}`);
            }
            console.log(`  ${bar} ${pct}% | ${totalChunks - ci - 1} chunks remaining`);
            const totalDeaths = Object.values(chunkDeathStats).reduce((a, b) => a + b, 0);
            if (totalDeaths > 0) {
                const parts = Object.entries(chunkDeathStats).sort((a, b) => b[1] - a[1])
                    .map(([reason, count]) => `${reason}: ${count} (${(count / totalDeaths * 100).toFixed(0)}%)`);
                console.log(`  ${C.dim}Deaths: ${parts.join(' | ')}${C.reset}`);
            }

            saveBest(bestBeam.inputs, globalBestResult);

            if (anyBeamCompleted) {
                // Try adding all completed beams to hall of fame
                const completedBeams = beamStates.filter(bs => bs.completed);
                const fastest = completedBeams.reduce((best, bs) => bs.frames < best.frames ? bs : best);
                console.log(`\n${C.green}LEVEL COMPLETE! ${completedBeams.length} beam(s) finished — fastest: ${(fastest.frames / 60.098).toFixed(1)}s${C.reset}`);
                for (const cb of completedBeams) {
                    const added = tryAddToHallOfFame(hallOfFame, cb.inputs, {
                        completed: true, completionFrame: cb.frames, frame: cb.frames,
                        bestX: LEVEL_WIDTH, reason: 'completed',
                        checkpoints: [null, null, null], stuckFrames: 0,
                    });
                    if (added) console.log(`  ${C.green}Added to hall of fame: ${(cb.frames / 60.098).toFixed(1)}s${C.reset}`);
                }
                levelCompleted = true;
            }
            continue; // skip the shared code below (fast mode only)
        }

        // ==================== FAST MODE: shared winner/backtrack/progress code ====================

        // Select beams from survivors
        const numBeamsToSelect = 1;
        let winners = selectDiverseFromAllSurvivors(allSurvivors, numBeamsToSelect);

        // Backtrack: if >95% of deaths are the same cause, re-solve previous chunk with extended target
        if (winners.length === 0 && ci > 0 && !backtracked) {
            const totalDeathsCheck = Object.values(chunkDeathStats).reduce((a, b) => a + b, 0);
            if (totalDeathsCheck > 0) {
                const topDeathCount = Math.max(...Object.values(chunkDeathStats));
                const topDeathPct = topDeathCount / totalDeathsCheck;
                const topDeathReason = Object.entries(chunkDeathStats).sort((a, b) => b[1] - a[1])[0][0];
                if (topDeathPct > 0.95 && prevPrevChunkBeamState) {
                    const BACKTRACK_EXTRA = 50;
                    const extendedTarget = beams[0].targetX + BACKTRACK_EXTRA;
                    console.log(`\n  ${C.yellow}${(topDeathPct * 100).toFixed(0)}% dying to "${topDeathReason}" — bad starting position.${C.reset}`);
                    console.log(`  ${C.yellow}Backtracking: re-solving chunk ${ci} with extended target X:${extendedTarget} (+${BACKTRACK_EXTRA}px)${C.reset}`);

                    const prevBeam = prevPrevChunkBeamState;
                    currentBroadcastState = prevBeam.saveStateStr;
                    await broadcastSaveState(workers, prevBeam.saveStateStr);

                    let btFound = false;
                    let btSurvivors = [];
                    let btNearMisses = [];
                    let btSims = 0;
                    const BT_MAX_SIMS = 50000;
                    const BT_BATCH = 500;

                    while (btSims < BT_MAX_SIMS && !btFound) {
                        const btInputs = btNearMisses.length > 0
                            ? generateMixedInputs(BT_BATCH, FRAMES_PER_CHUNK, btNearMisses.map(nm => nm.inputBuf))
                            : generateSprintJumpInputs(BT_BATCH, FRAMES_PER_CHUNK);
                        btSims += BT_BATCH;

                        const { survivors: btS, nearMisses: btNM } = await evaluateChunkBatch(workers, btInputs, BT_BATCH, FRAMES_PER_CHUNK, extendedTarget);
                        for (const nm of btNM) {
                            nm.inputBuf = new Uint8Array(btInputs.buffer, btInputs.byteOffset + nm.simIndex * FRAMES_PER_CHUNK, FRAMES_PER_CHUNK).slice();
                        }
                        btNearMisses.push(...btNM);
                        btNearMisses.sort((a, b) => b.bestX - a.bestX);
                        if (btNearMisses.length > TOP_NEAR_MISSES) btNearMisses.length = TOP_NEAR_MISSES;

                        for (const s of btS) {
                            s.packedInputs = btInputs;
                            s.parentSaveStateStr = prevBeam.saveStateStr;
                            s.parentFrames = prevBeam.frames;
                            s.parentInputs = prevBeam.inputs;
                        }
                        if (btS.length > 0) { btSurvivors.push(...btS); btFound = true; }

                        if (btSims % 1500 === 0 && !btFound) {
                            const bestNM = btNearMisses.length > 0 ? btNearMisses[0].bestX : 0;
                            process.stdout.write(`  ${C.dim}Backtrack: ${btSims} tried | target X:${extendedTarget} | best near-miss X:${bestNM}${C.reset}\r`);
                        }
                    }

                    if (btFound) {
                        process.stdout.write('\x1b[2K');
                        const btWinners = selectDiverseFromAllSurvivors(btSurvivors, 1);
                        const w = btWinners[0];
                        const ss = captureBeamSaveState(nes, {
                            parentSaveStateStr: w.survivor.parentSaveStateStr,
                            inputs: w.inputs,
                            frame: w.survivor.frame,
                        }, romString);
                        const parentInputs = w.survivor.parentInputs;
                        const fullInputs = new Uint8Array(parentInputs.length + w.survivor.frame);
                        fullInputs.set(parentInputs, 0);
                        fullInputs.set(w.inputs.slice(0, w.survivor.frame), parentInputs.length);
                        const btFrames = w.survivor.parentFrames + w.survivor.frame;

                        beams = [{
                            inputs: fullInputs, saveStateStr: ss,
                            frames: btFrames, targetX: extendedTarget,
                        }];
                        totalFrames = btFrames;
                        backtracked = true;

                        console.log(`  ${C.green}Extended chunk ${ci} to X:${extendedTarget} — retrying chunk ${ci + 1}${C.reset}\n`);
                        ci--;
                        continue;
                    } else {
                        process.stdout.write('\x1b[2K');
                        console.log(`  ${C.red}Backtrack failed — could not reach extended target X:${extendedTarget}${C.reset}`);
                    }
                }
            }
        }

        // Progressive sub-targets fallback (fast mode)
        if (winners.length === 0) {
            const beam = beams[0];
            const chunkStartX = targetX - CHUNK_SIZE_PX;
            console.log(`  ${C.yellow}No survivors after ${totalSimsThisChunk} attempts. Falling back to progressive ${MIN_CHUNK_SIZE_PX}px sub-targets...${C.reset}`);

            const SUB_STEP = Math.max(MIN_CHUNK_SIZE_PX, Math.floor(CHUNK_SIZE_PX / 2));
            let subBeam = beam;
            let subSuccess = true;

            for (let subTarget = chunkStartX + SUB_STEP; subTarget <= targetX; subTarget += SUB_STEP) {
                currentBroadcastState = subBeam.saveStateStr;
                await broadcastSaveState(workers, subBeam.saveStateStr);

                let subNearMisses = [];
                let subFound = false;
                let subAllSurvivors = [];
                const subBatch = 500;
                const subMaxAttempts = 200;

                for (let sa = 0; sa < subMaxAttempts && !subFound; sa++) {
                    await processWorkerOps();
                    const nearMissInputs = subNearMisses.map(nm => nm.inputBuf);
                    const packedInputs = generateMixedInputs(subBatch, FRAMES_PER_CHUNK, nearMissInputs);
                    totalSimsThisChunk += subBatch;

                    const { survivors, nearMisses } = await evaluateChunkBatch(workers, packedInputs, subBatch, FRAMES_PER_CHUNK, subTarget);
                    for (const nm of nearMisses) {
                        nm.inputBuf = new Uint8Array(packedInputs.buffer, packedInputs.byteOffset + nm.simIndex * FRAMES_PER_CHUNK, FRAMES_PER_CHUNK).slice();
                    }
                    subNearMisses.push(...nearMisses);
                    subNearMisses.sort((a, b) => b.bestX - a.bestX);
                    if (subNearMisses.length > TOP_NEAR_MISSES) subNearMisses.length = TOP_NEAR_MISSES;

                    for (const s of survivors) {
                        s.beamIndex = 0; s.packedInputs = packedInputs;
                        s.parentSaveStateStr = subBeam.saveStateStr;
                        s.parentFrames = subBeam.frames; s.parentInputs = subBeam.inputs;
                    }
                    if (survivors.length > 0) { subAllSurvivors.push(...survivors); subFound = true; }
                }

                if (!subFound) { subSuccess = false; break; }
                process.stdout.write('\x1b[2K');

                if (subTarget < targetX) {
                    const subWinners = selectDiverseFromAllSurvivors(subAllSurvivors, 1);
                    if (subWinners.length > 0) {
                        const w = subWinners[0];
                        const ss = captureBeamSaveState(nes, { parentSaveStateStr: w.survivor.parentSaveStateStr, inputs: w.inputs, frame: w.survivor.frame }, romString);
                        const pi = w.survivor.parentInputs;
                        const fi = new Uint8Array(pi.length + w.survivor.frame);
                        fi.set(pi, 0); fi.set(w.inputs.slice(0, w.survivor.frame), pi.length);
                        subBeam = { inputs: fi, saveStateStr: ss, frames: w.survivor.parentFrames + w.survivor.frame, targetX: subTarget };
                    }
                } else {
                    allSurvivors = subAllSurvivors;
                }
            }
            if (subSuccess) winners = selectDiverseFromAllSurvivors(allSurvivors, numBeamsToSelect);
        }

        if (winners.length === 0) {
            console.log(`${C.red}No survivors for chunk ${ci + 1}. Stopping.${C.reset}`);
            break;
        }

        // Fast mode: update beam state
        const w = winners[0];
        const actualTargetX = w.survivor.completed ? LEVEL_WIDTH : targetX;
        const chunkFrames = w.survivor.frame;
        const ss = captureBeamSaveState(nes, { parentSaveStateStr: w.survivor.parentSaveStateStr, inputs: w.inputs, frame: chunkFrames }, romString);
        const parentInputs = w.survivor.parentInputs;
        const fullInputs = new Uint8Array(parentInputs.length + chunkFrames);
        fullInputs.set(parentInputs, 0);
        fullInputs.set(w.inputs.slice(0, chunkFrames), parentInputs.length);
        const beamFrames = w.survivor.parentFrames + chunkFrames;

        previousChunkWinnerInputs = [w.inputs.slice(0, chunkFrames)];

        beams = [{ inputs: fullInputs, saveStateStr: ss, frames: beamFrames, targetX: actualTargetX }];
        backtracked = false;
        totalFrames = beamFrames;

        globalBestInputs = fullInputs;
        globalBestResult = {
            bestX: actualTargetX, completed: w.survivor.completed || levelCompleted,
            completionFrame: (w.survivor.completed || levelCompleted) ? totalFrames : 0,
            frame: totalFrames, reason: (w.survivor.completed || levelCompleted) ? 'completed' : 'in_progress',
            checkpoints: [null, null, null], stuckFrames: 0,
        };

        db.saveBeamChunk(ci, 0, { targetX: actualTargetX, frames: beamFrames, inputs: fullInputs, saveStateStr: ss, avgY: w.survivor.avgY });

        const chunkTime = (Date.now() - chunkStart) / 1000;
        const displayTargetX = actualTargetX;
        const pct = Math.round(Math.min(displayTargetX, LEVEL_WIDTH) / LEVEL_WIDTH * 100);
        const bar = makeProgressBar(Math.min(displayTargetX, LEVEL_WIDTH), LEVEL_WIDTH, 25);
        const gameTime = (totalFrames / 60.098).toFixed(1);
        const speed = (displayTargetX / totalFrames * 60.098).toFixed(0);

        console.log(`Chunk ${String(ci + 1).padStart(2)}/${totalChunks} | X:${targetX-CHUNK_SIZE_PX}-${displayTargetX} | ${totalSimsThisChunk} attempts | ${allSurvivors.length} survived | ${gameTime}s game time | ${speed} px/s | took ${chunkTime.toFixed(0)}s`);
        console.log(`  ${bar} ${pct}% | Mario at ${displayTargetX}/${LEVEL_WIDTH}px (${gameTime}s)`);
        const totalDeaths = Object.values(chunkDeathStats).reduce((a, b) => a + b, 0);
        if (totalDeaths > 0) {
            const parts = Object.entries(chunkDeathStats).sort((a, b) => b[1] - a[1])
                .map(([reason, count]) => `${reason}: ${count} (${(count / totalDeaths * 100).toFixed(0)}%)`);
            console.log(`  ${C.dim}Deaths: ${parts.join(' | ')}${C.reset}`);
        }

        saveBest(fullInputs, globalBestResult);

        if (w.survivor.completed || levelCompleted) {
            levelCompleted = true;
            console.log(`\n${C.green}LEVEL COMPLETE in ${(totalFrames / 60.098).toFixed(1)}s!${C.reset}`);
            tryAddToHallOfFame(hallOfFame, fullInputs, {
                completed: true, completionFrame: totalFrames, frame: totalFrames,
                bestX: LEVEL_WIDTH, reason: 'completed',
                checkpoints: [null, null, null], stuckFrames: 0,
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
