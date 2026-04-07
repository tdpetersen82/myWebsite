#!/usr/bin/env node
// Mario Speedrun Optimizer — Frame Database + State-Matched Splicing
// Collects thousands of random playthroughs, records per-frame state,
// then splices the fastest segments where game state matches exactly.
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
const MIN_VIABLE_DISTANCE = 300;   // lowered to get more runs in DB
const LEVEL_WIDTH = 3200;
const CHECKPOINTS = [800, 1600, 2400];
const CHECKPOINT_BONUS_WEIGHT = 10;
const STUCK_PENALTY = 50;
const NUM_WORKERS = Math.max(1, os.cpus().length - 1);

// Collection
const COLLECTION_BATCH_SIZE = 500;
const INITIAL_BATCHES = 10;            // 5000 random runs
const MAX_STORED_RUNS = 3000;

// Splicing — adaptive convergence-based splicing
const MAX_SPLICE_CANDIDATES = 300;     // max splice attempts per round
const MIN_SAVED_FRAMES = 5;            // minimum frames faster to be a useful splice
const GOLDEN_DIVERSITY_THRESHOLD = 30; // min checkpoint frame difference for diversity
const MILESTONE_STEP = 100;            // X milestones every 100px for section records
const RECORD_MIN_SECTION = 100;        // minimum section width worth recording (~1 screen)
const RECORD_MAX_SECTION = Math.floor(LEVEL_WIDTH * 0.75); // max 3/4 of the level
const SPLICE_BACKUP_PX = 80;          // pixels to back up from slow spot for splice entry
const CONVERGENCE_SCAN_PX = 300;      // max pixels past slow spot to search for convergence
const CONVERGENCE_Y_TOLERANCE = 4;    // Y position match tolerance in pixels
const TARGETED_GEN_THRESHOLD = 20;    // generate targeted runs if fewer candidates than this
const TARGETED_GEN_COUNT = 500;       // targeted random runs per obstacle
const MAX_CANDIDATES_PER_SPOT = 100;  // cap splice candidates per slow spot
const DB_SCAN_TOP_N = 100;            // top DB runs to scan as potential donors

// Refinement
const REFINEMENT_VARIANTS = 300;
const REFINEMENT_MAX_ROUNDS = 50;
const REFINEMENT_STALL_LIMIT = 5;

// Segment generation
const MIN_SEGMENT_DURATION = 3;
const MAX_SEGMENT_DURATION = 240;

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
//  WORKER THREAD
// ================================================================
if (!isMainThread) {
    const { createRequire } = await import('module');
    const require = createRequire(import.meta.url);
    const jsnes = require('jsnes');
    const { NES, Controller } = jsnes;
    const { romString, saveStateStr } = workerData;

    const saveState = JSON.parse(saveStateStr);
    const nes = new NES({ onFrame: () => {}, onAudioSample: () => {}, emulateSound: false });
    nes.loadROM(romString);

    function simulate(inputBuf) {
        nes.fromJSON(structuredClone(saveState));

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

        // Per-frame state trace: compact arrays for memory efficiency
        const traceX = [];
        const traceY = [];
        const traceVelX = [];
        const traceVelY = [];

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

            traceX.push(x);
            traceY.push(y);
            traceVelX.push(velX);
            traceVelY.push(velY);

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
            if (frame === 600 && bestX < MIN_VIABLE_DISTANCE) { reason = 'too_slow'; break; }
            if (frame - lastProgressFrame > STALL_LIMIT) { reason = 'stalled'; break; }
        }

        return {
            bestX, completed, completionFrame, frame, reason,
            velocityFrames, stuckFrames, checkpoints,
            traceX, traceY, traceVelX, traceVelY
        };
    }

    parentPort.on('message', (batch) => {
        const results = [];
        for (const inputArr of batch) {
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

// Generate a frontier run: keep the best run's inputs up to near the death point,
// then randomize everything after. This creates diverse data PAST where we're stuck.
// cutoffFrame: the frame near where the best run dies
// jitter: how many frames before the death point to start randomizing (adds variety)
function generateFrontierRun(base, deathFrame, jitter) {
    const inputs = new Uint8Array(MAX_FRAMES);
    // Copy the proven-good prefix, with some jitter on where we cut
    const cutoff = Math.max(10, deathFrame - Math.floor(Math.random() * jitter));
    for (let f = 0; f < Math.min(cutoff, base.length); f++) {
        inputs[f] = base[f];
    }
    // Randomize everything from cutoff onward — try wildly different things at the obstacle
    let bitmask = randomBitmask();
    let hold = randomDuration();
    let elapsed = 0;
    for (let f = cutoff; f < MAX_FRAMES; f++) {
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

// Light noise variant: small mutations concentrated toward the END of the run.
// Leaves the early proven-good frames mostly untouched.
function generateNoisyVariant(base, noiseLevel, deathFrame) {
    const inputs = new Uint8Array(base);
    const len = inputs.length;
    // Bias mutations toward the death point: 80% of mutations in the last 30% of the run
    const lateZoneStart = Math.max(0, Math.floor((deathFrame || len) * 0.7));

    // Micro-mutations: flip random button bits, biased toward end
    const numFlips = Math.floor(Math.random() * noiseLevel * 20) + 5;
    for (let i = 0; i < numFlips; i++) {
        const f = Math.random() < 0.8
            ? lateZoneStart + Math.floor(Math.random() * (len - lateZoneStart))
            : Math.floor(Math.random() * len);
        if (f >= len) continue;
        const bit = 1 << Math.floor(Math.random() * 8);
        inputs[f] ^= bit;
        if ((inputs[f] & BIT.LEFT) && (inputs[f] & BIT.RIGHT)) inputs[f] &= ~BIT.LEFT;
        if ((inputs[f] & BIT.UP) && (inputs[f] & BIT.DOWN)) inputs[f] &= ~BIT.DOWN;
    }

    // Segment replacement near the death point
    if (Math.random() < 0.4) {
        const windowSize = 10 + Math.floor(Math.random() * 50);
        const start = lateZoneStart + Math.floor(Math.random() * Math.max(1, len - lateZoneStart - windowSize));
        const mask = randomBitmask();
        for (let f = start; f < Math.min(start + windowSize, len); f++) {
            inputs[f] = mask;
        }
    }

    // Temporal shift near death point
    if (Math.random() < 0.3) {
        const shift = Math.floor(Math.random() * 8) - 4; // -4 to +3
        if (shift !== 0) {
            const section = lateZoneStart + Math.floor(Math.random() * (len - lateZoneStart));
            const sectionLen = 20 + Math.floor(Math.random() * 60);
            if (shift > 0) {
                for (let f = Math.min(section + sectionLen, len) - 1; f >= section + shift; f--) {
                    inputs[f] = inputs[f - shift];
                }
            } else {
                for (let f = section; f < Math.min(section + sectionLen + shift, len); f++) {
                    if (f - shift < len) inputs[f] = inputs[f - shift];
                }
            }
        }
    }

    return inputs;
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

// ==================== FRAME DATABASE ====================

class FrameDatabase {
    constructor() {
        this.runs = [];
        this.nextRunId = 0;
        this.runMap = new Map(); // runId -> run (fast lookup)
    }

    addRun(inputs, result) {
        if (result.bestX < MIN_VIABLE_DISTANCE) return null;
        if (!result.traceX || result.traceX.length === 0) return null;

        const runId = this.nextRunId++;
        const run = {
            runId,
            inputs: new Uint8Array(inputs.slice(0, result.frame + 1)),
            fitness: fitness(result),
            bestX: result.bestX,
            completed: result.completed,
            completionFrame: result.completionFrame,
            totalFrames: result.frame,
            reason: result.reason,
            checkpoints: result.checkpoints,
            stuckFrames: result.stuckFrames,
            traceX: new Uint16Array(result.traceX),
            traceY: new Uint8Array(result.traceY),
            traceVelX: new Uint8Array(result.traceVelX),
            traceVelY: new Uint8Array(result.traceVelY),
            // Precompute: first frame to reach each unique X value (sparse, only increasing X)
            frameAtX: this._buildFrameAtX(result.traceX),
        };

        this.runs.push(run);
        this.runMap.set(runId, run);
        return runId;
    }

    _buildFrameAtX(traceX) {
        // Record the first frame each new max X is reached.
        // This is sparse — only entries where X actually increases.
        // Stored as parallel arrays for fast binary search.
        const xs = [];    // sorted ascending X values
        const frames = []; // corresponding frame numbers
        let maxX = -1;
        for (let f = 0; f < traceX.length; f++) {
            if (traceX[f] > maxX) {
                maxX = traceX[f];
                xs.push(maxX);
                frames.push(f);
            }
        }
        return { xs, frames };
    }

    getRunById(runId) {
        return this.runMap.get(runId);
    }

    // Binary search: find the frame at which run first reaches X >= targetX
    getFrameAtX(run, targetX) {
        const { xs, frames } = run.frameAtX;
        // Find first xs[i] >= targetX
        let lo = 0, hi = xs.length;
        while (lo < hi) {
            const mid = (lo + hi) >> 1;
            if (xs[mid] < targetX) lo = mid + 1;
            else hi = mid;
        }
        return lo < xs.length ? frames[lo] : -1;
    }

    prune() {
        if (this.runs.length <= MAX_STORED_RUNS) return 0;

        // Keep a mix: top by fitness AND top by distance (so we don't lose far-reaching runs)
        const byFitness = [...this.runs].sort((a, b) => b.fitness - a.fitness);
        const byDistance = [...this.runs].sort((a, b) => b.bestX - a.bestX);

        const kept = new Set();
        const halfBudget = Math.floor(MAX_STORED_RUNS / 2);
        for (let i = 0; i < halfBudget && i < byFitness.length; i++) kept.add(byFitness[i].runId);
        for (let i = 0; i < MAX_STORED_RUNS && kept.size < MAX_STORED_RUNS && i < byDistance.length; i++) kept.add(byDistance[i].runId);
        // Fill remaining with fitness-sorted
        for (let i = 0; kept.size < MAX_STORED_RUNS && i < byFitness.length; i++) kept.add(byFitness[i].runId);

        const removed = this.runs.length - kept.size;
        this.runs = this.runs.filter(r => kept.has(r.runId));
        this.runMap.clear();
        for (const run of this.runs) this.runMap.set(run.runId, run);
        return removed;
    }

    stats() {
        const completions = this.runs.filter(r => r.completed).length;
        const maxX = this.runs.reduce((m, r) => Math.max(m, r.bestX), 0);
        const avgX = this.runs.length > 0
            ? Math.round(this.runs.reduce((s, r) => s + r.bestX, 0) / this.runs.length)
            : 0;
        return { totalRuns: this.runs.length, completions, maxX, avgX };
    }
}

// ==================== TARGETED THREE-PART SPLICING ====================

// Two-part splice (fallback): A's start + B's end at a given X position
function buildTwoPartSplice(db, runA, runB, spliceX) {
    const frameA = db.getFrameAtX(runA, spliceX);
    const frameB = db.getFrameAtX(runB, spliceX);
    if (frameA < 0 || frameB < 0) return null;
    const partA = runA.inputs.slice(0, frameA + 1);
    const partB = runB.inputs.slice(frameB + 1);
    if (partB.length === 0) return null;
    const combined = new Uint8Array(partA.length + partB.length);
    combined.set(partA, 0);
    combined.set(partB, partA.length);
    return combined;
}

// Three-part splice: golden prefix + donor middle + golden suffix.
// Transplants a fast section [xStart, xEnd] from a donor run into a golden run.
function buildThreePartSplice(db, goldenRun, donorRun, xStart, xEnd) {
    const fG_start = db.getFrameAtX(goldenRun, xStart);
    const fG_end = db.getFrameAtX(goldenRun, xEnd);
    const fD_start = db.getFrameAtX(donorRun, xStart);
    const fD_end = db.getFrameAtX(donorRun, xEnd);
    if (fG_start < 0 || fD_start < 0 || fD_end < 0) return null;
    if (fD_start >= fD_end) return null;

    // If the fast section covers the tail of the golden run, fall back to two-part
    if (fG_end < 0 || xEnd >= goldenRun.bestX) {
        return buildTwoPartSplice(db, goldenRun, donorRun, xStart);
    }
    if (fG_start >= fG_end) return null;

    const prefix = goldenRun.inputs.slice(0, fG_start + 1);
    const middle = donorRun.inputs.slice(fD_start + 1, fD_end + 1);
    const suffix = goldenRun.inputs.slice(fG_end + 1);

    if (middle.length === 0) return null;

    const combined = new Uint8Array(prefix.length + middle.length + suffix.length);
    combined.set(prefix, 0);
    combined.set(middle, prefix.length);
    combined.set(suffix, prefix.length + middle.length);
    return combined;
}

// Generate jittered boundary variants for a splice section.
function jitterBoundaries(xStart, xEnd) {
    const variants = [];
    const seen = new Set();
    for (const dStart of JITTER_DELTAS) {
        for (const dEnd of JITTER_DELTAS) {
            for (const sStart of [-1, 1]) {
                for (const sEnd of [-1, 1]) {
                    const xs = xStart + dStart * sStart;
                    const xe = xEnd + dEnd * sEnd;
                    if (xe - xs < 20) continue; // too narrow
                    if (xs < 50) continue;
                    const key = `${xs}:${xe}`;
                    if (seen.has(key)) continue;
                    seen.add(key);
                    variants.push({ xStart: xs, xEnd: xe });
                }
            }
        }
    }
    return variants;
}

// ==================== SECTION RECORD BOOK ====================
// Persists the fastest known inputs for each section of the level.
// A "section" is any pair of milestones (every MILESTONE_STEP px).
// Records survive across sessions — no re-simulation needed on load.

const MILESTONES = [];
for (let x = MILESTONE_STEP; x <= LEVEL_WIDTH; x += MILESTONE_STEP) MILESTONES.push(x);

class SectionRecordBook {
    constructor() {
        this.records = new Map(); // "xStart:xEnd" -> {frames, inputs, source, addedAt}
        this.filePath = path.join(__dirname, 'section-records.json');
    }

    _key(xStart, xEnd) { return `${xStart}:${xEnd}`; }

    load() {
        try {
            if (fs.existsSync(this.filePath)) {
                const data = JSON.parse(fs.readFileSync(this.filePath, 'utf8'));
                if (Array.isArray(data)) {
                    for (const r of data) {
                        this.records.set(this._key(r.xStart, r.xEnd), {
                            frames: r.frames, inputs: r.inputs,
                            source: r.source || '?', addedAt: r.addedAt || '',
                        });
                    }
                }
            }
        } catch (e) {}
        return this.records.size;
    }

    save() {
        const arr = [];
        for (const [key, rec] of this.records) {
            const [xStart, xEnd] = key.split(':').map(Number);
            arr.push({ xStart, xEnd, frames: rec.frames, inputs: rec.inputs, source: rec.source, addedAt: rec.addedAt });
        }
        fs.writeFileSync(this.filePath, JSON.stringify(arr));
    }

    getBestTime(xStart, xEnd) {
        const rec = this.records.get(this._key(xStart, xEnd));
        return rec ? rec.frames : Infinity;
    }

    getBestInputs(xStart, xEnd) {
        const rec = this.records.get(this._key(xStart, xEnd));
        return rec ? new Uint8Array(rec.inputs) : null;
    }

    // Scan a run for sections that beat existing records.
    // Returns number of new records set.
    tryRecord(run, db, source) {
        let newRecords = 0;
        for (let i = 0; i < MILESTONES.length; i++) {
            const xStart = MILESTONES[i];
            if (xStart >= run.bestX) break;
            const fStart = db.getFrameAtX(run, xStart);
            if (fStart < 0) continue;

            for (let j = i + 1; j < MILESTONES.length; j++) {
                const xEnd = MILESTONES[j];
                if (xEnd - xStart < RECORD_MIN_SECTION || xEnd - xStart > RECORD_MAX_SECTION) continue;
                if (xEnd > run.bestX) break;

                const fEnd = db.getFrameAtX(run, xEnd);
                if (fEnd < 0) continue;

                const frames = fEnd - fStart;
                if (frames <= 0) continue;

                const key = this._key(xStart, xEnd);
                const existing = this.records.get(key);
                if (!existing || frames < existing.frames) {
                    // New record! Extract just the inputs for this section.
                    const inputs = Array.from(run.inputs.slice(fStart, fEnd + 1));
                    this.records.set(key, {
                        frames, inputs,
                        source: source || currentPhase,
                        addedAt: new Date().toISOString(),
                    });
                    newRecords++;
                }
            }
        }
        return newRecords;
    }

    // Find slow spots in a golden run: sections where it's slower than the best record.
    getSlowSpots(goldenRun, db) {
        const spots = [];
        for (let i = 0; i < MILESTONES.length; i++) {
            const xStart = MILESTONES[i];
            if (xStart >= goldenRun.bestX) break;
            const fGStart = db.getFrameAtX(goldenRun, xStart);
            if (fGStart < 0) continue;

            for (let j = i + 1; j < MILESTONES.length; j++) {
                const xEnd = MILESTONES[j];
                if (xEnd - xStart < RECORD_MIN_SECTION || xEnd - xStart > RECORD_MAX_SECTION) continue;
                if (xEnd > goldenRun.bestX) break;

                const fGEnd = db.getFrameAtX(goldenRun, xEnd);
                if (fGEnd < 0) continue;

                const goldenFrames = fGEnd - fGStart;
                const bestFrames = this.getBestTime(xStart, xEnd);
                const saved = goldenFrames - bestFrames;

                if (saved >= MIN_SAVED_FRAMES) {
                    spots.push({ xStart, xEnd, goldenFrames, bestFrames, savedFrames: saved });
                }
            }
        }
        // Sort by frames saved descending
        spots.sort((a, b) => b.savedFrames - a.savedFrames);
        return spots;
    }

    stats() {
        return { totalRecords: this.records.size };
    }
}

// ==================== ADAPTIVE SPLICE HELPERS ====================

// Get a run's full state at a given X position.
function getStateAtX(run, db, targetX) {
    const frame = db.getFrameAtX(run, targetX);
    if (frame < 0 || frame >= run.traceX.length) return null;
    return {
        frame,
        x: run.traceX[frame],
        y: run.traceY[frame],
        velX: run.traceVelX[frame],
        velY: run.traceVelY[frame],
    };
}

// Check if two states are compatible for a splice boundary.
// "Compatible" = similar enough that the golden run's suffix has a chance of working.
function statesConverged(goldenState, donorState) {
    if (!goldenState || !donorState) return false;
    // Y must be close (same platform level)
    if (Math.abs(goldenState.y - donorState.y) > CONVERGENCE_Y_TOLERANCE) return false;
    // Both must be grounded (velY near 0) — don't splice back mid-jump
    const gGrounded = goldenState.velY <= 3 || goldenState.velY >= 252;
    const dGrounded = donorState.velY <= 3 || donorState.velY >= 252;
    if (!gGrounded || !dGrounded) return false;
    // Donor must be moving right
    if (donorState.velX === 0 || donorState.velX > 127) return false;
    return true;
}

// Scan forward from searchStartX to find where donor converges back to golden's state.
// Returns the convergence X, or -1 if not found.
function findConvergencePoint(db, goldenRun, donorRun, searchStartX, maxSearchX) {
    for (let x = searchStartX; x <= maxSearchX; x += 2) {
        const goldenState = getStateAtX(goldenRun, db, x);
        const donorState = getStateAtX(donorRun, db, x);
        if (statesConverged(goldenState, donorState)) return x;
    }
    return -1;
}

// Build an adaptive splice: golden prefix + donor middle + golden suffix.
// Entry and convergence points are donor-specific (not fixed milestones).
function buildAdaptiveSplice(db, goldenRun, donorRun, entryX, convergenceX) {
    const fG_entry = db.getFrameAtX(goldenRun, entryX);
    const fG_conv = db.getFrameAtX(goldenRun, convergenceX);
    const fD_entry = db.getFrameAtX(donorRun, entryX);
    const fD_conv = db.getFrameAtX(donorRun, convergenceX);

    if (fG_entry < 0 || fD_entry < 0 || fD_conv < 0) return null;
    if (fD_entry >= fD_conv) return null;

    // If convergence is past golden run's end, fall back to two-part
    if (fG_conv < 0 || convergenceX >= goldenRun.bestX) {
        return buildTwoPartSplice(db, goldenRun, donorRun, entryX);
    }
    if (fG_entry >= fG_conv) return null;

    // Check donor is actually faster for this stretch
    const goldenFrames = fG_conv - fG_entry;
    const donorFrames = fD_conv - fD_entry;
    if (goldenFrames - donorFrames < MIN_SAVED_FRAMES) return null;

    const prefix = goldenRun.inputs.slice(0, fG_entry + 1);
    const middle = donorRun.inputs.slice(fD_entry + 1, fD_conv + 1);
    const suffix = goldenRun.inputs.slice(fG_conv + 1);

    if (middle.length === 0) return null;

    const combined = new Uint8Array(prefix.length + middle.length + suffix.length);
    combined.set(prefix, 0);
    combined.set(middle, prefix.length);
    combined.set(suffix, prefix.length + middle.length);
    return combined;
}

// ==================== ADAPTIVE SPLICE FINDER ====================

// Find splice opportunities by backing up from slow spots, searching for
// state-compatible donors, and finding natural convergence points.
// Async because it may generate targeted random runs when no DB candidates exist.
async function findAdaptiveSpliceOpportunities(db, goldenRuns, sectionRecords, workers, collectBatchFn) {
    const spliceInputs = [];
    const spliceInfo = [];
    let totalSlowSpots = 0;
    let targetedGenCount = 0;

    // Pre-sort DB runs by fitness for donor scanning
    const topDonors = [...db.runs].sort((a, b) => b.fitness - a.fitness).slice(0, DB_SCAN_TOP_N);

    for (const golden of goldenRuns) {
        const slowSpots = sectionRecords.getSlowSpots(golden, db);
        totalSlowSpots += slowSpots.length;
        let targetedGensThisGolden = 0; // limit targeted generation per golden run

        for (const spot of slowSpots) {
            if (spliceInputs.length >= MAX_SPLICE_CANDIDATES) break;
            let spotCandidates = 0;

            // Back up from the slow spot to give the splice room for setup
            const entryX = Math.max(50, spot.xStart - SPLICE_BACKUP_PX);
            const goldenEntryState = getStateAtX(golden, db, entryX);
            if (!goldenEntryState) continue;

            const maxSearchX = Math.min(spot.xEnd + CONVERGENCE_SCAN_PX, golden.bestX - 10);

            // Search DB donors for candidates with compatible entry state
            for (const donor of topDonors) {
                if (donor.runId === golden.runId) continue;
                if (donor.bestX < spot.xEnd) continue;

                // Check entry state compatibility
                const donorEntryState = getStateAtX(donor, db, entryX);
                if (!donorEntryState) continue;
                if (Math.abs(goldenEntryState.y - donorEntryState.y) > CONVERGENCE_Y_TOLERANCE) continue;

                // Find where this donor converges back to golden's state
                const convX = findConvergencePoint(db, golden, donor, spot.xEnd - 20, maxSearchX);
                if (convX < 0) continue;

                // Try the main entry + a few jittered entry points
                const entryVariants = [entryX, entryX - 10, entryX + 10, entryX - 20, entryX + 20]
                    .filter(x => x >= 50);

                for (const ex of entryVariants) {
                    const inputs = buildAdaptiveSplice(db, golden, donor, ex, convX);
                    if (inputs) {
                        spliceInputs.push(inputs);
                        spliceInfo.push({
                            goldenRunId: golden.runId, donorRunId: donor.runId,
                            entryX: ex, convergenceX: convX,
                            spliceLength: convX - ex,
                            savedFrames: spot.savedFrames,
                            source: 'adaptive',
                        });
                        spotCandidates++;
                    }
                    if (spotCandidates >= MAX_CANDIDATES_PER_SPOT) break;
                    if (spliceInputs.length >= MAX_SPLICE_CANDIDATES) break;
                }
                if (spotCandidates >= MAX_CANDIDATES_PER_SPOT) break;
                if (spliceInputs.length >= MAX_SPLICE_CANDIDATES) break;
            }

            // If not enough DB candidates, generate targeted random runs at this obstacle
            // Limit to 3 targeted generations per golden run to avoid spending forever here
            if (spotCandidates < TARGETED_GEN_THRESHOLD && collectBatchFn && targetedGensThisGolden < 3 && spliceInputs.length < MAX_SPLICE_CANDIDATES) {
                targetedGensThisGolden++;
                const entryFrame = goldenEntryState.frame;
                const targetedInputs = [];
                for (let i = 0; i < TARGETED_GEN_COUNT; i++) {
                    targetedInputs.push(generateFrontierRun(golden.inputs, entryFrame, 20));
                }

                // Simulate targeted runs, add to DB
                await collectBatchFn(targetedInputs);
                targetedGenCount += TARGETED_GEN_COUNT;

                // Re-scan the newly added runs as donors
                const newDonors = db.runs.slice(-TARGETED_GEN_COUNT).filter(r => r.bestX > spot.xEnd);
                for (const donor of newDonors) {
                    if (donor.runId === golden.runId) continue;
                    const donorEntryState = getStateAtX(donor, db, entryX);
                    if (!donorEntryState) continue;
                    if (Math.abs(goldenEntryState.y - donorEntryState.y) > CONVERGENCE_Y_TOLERANCE) continue;

                    const convX = findConvergencePoint(db, golden, donor, spot.xEnd - 20, maxSearchX);
                    if (convX < 0) continue;

                    const inputs = buildAdaptiveSplice(db, golden, donor, entryX, convX);
                    if (inputs) {
                        spliceInputs.push(inputs);
                        spliceInfo.push({
                            goldenRunId: golden.runId, donorRunId: donor.runId,
                            entryX, convergenceX: convX,
                            spliceLength: convX - entryX,
                            savedFrames: spot.savedFrames,
                            source: 'targeted',
                        });
                        spotCandidates++;
                    }
                    if (spotCandidates >= MAX_CANDIDATES_PER_SPOT) break;
                    if (spliceInputs.length >= MAX_SPLICE_CANDIDATES) break;
                }
            }

            if (spliceInputs.length >= MAX_SPLICE_CANDIDATES) break;
        }
        if (spliceInputs.length >= MAX_SPLICE_CANDIDATES) break;
    }

    return { spliceInputs, spliceInfo, slowSpotCount: totalSlowSpots, targetedGenCount };
}

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

// ==================== DISPLAY HELPERS ====================

function makeProgressBar(x, maxX, w) {
    const r = Math.min(x / maxX, 1);
    const f = Math.round(r * w);
    return '[' + '█'.repeat(Math.max(0, f - 1)) + (f > 0 ? '▒' : '') + '░'.repeat(w - f) + ']';
}

function formatTime(s) {
    if (s < 60) return `${s.toFixed(0)}s`;
    return `${Math.floor(s / 60)}m ${Math.round(s % 60)}s`;
}

// ==================== OUTPUT ====================

const bestPath = path.join(__dirname, 'best-sequence.json');
const saveStatePath = path.join(__dirname, 'save-state.json');
const hofPath = path.join(__dirname, 'hall-of-fame.json');
const HOF_SIZE = 10;
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
        if (fa === null || fb === null) { dist += 200; continue; } // one reached, other didn't
        dist += Math.abs(fa - fb);
    }
    return dist;
}

function tryAddToHallOfFame(hof, inputs, result) {
    if (!result.completed) return false;
    const events = inputsToEvents(inputs);
    const entry = {
        events, fitness: fitness(result),
        inputs: Array.from(inputs),  // store raw inputs for splicing
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

    // If too similar to an existing entry, only replace if strictly faster
    if (minDist < GOLDEN_DIVERSITY_THRESHOLD && mostSimilarIdx >= 0) {
        if (entry.fitness > hof[mostSimilarIdx].fitness) {
            hof[mostSimilarIdx] = entry;
            hof.sort((a, b) => b.fitness - a.fitness);
            saveHallOfFame(hof);
            return true;
        }
        return false; // too similar and not faster
    }

    // Normal admission: add if room or better than worst
    if (hof.length < HOF_SIZE) {
        hof.push(entry);
        hof.sort((a, b) => b.fitness - a.fitness);
        saveHallOfFame(hof);
        return true;
    }
    if (entry.fitness > hof[hof.length - 1].fitness) {
        hof.pop();
        hof.push(entry);
        hof.sort((a, b) => b.fitness - a.fitness);
        saveHallOfFame(hof);
        return true;
    }
    return false;
}

// ==================== EVENTS <-> INPUTS CONVERSION ====================
// Convert stored events back to per-frame bitmask inputs (for old HoF entries without inputs)

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

let currentPhase = 'collection';
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

function evaluateBatch(workers, inputArrays) {
    return new Promise((resolve) => {
        const results = new Array(inputArrays.length);
        const chunkSize = Math.ceil(inputArrays.length / workers.length);
        let completed = 0;
        workers.forEach((worker, wi) => {
            const start = wi * chunkSize;
            const end = Math.min(start + chunkSize, inputArrays.length);
            if (start >= inputArrays.length) {
                completed++;
                if (completed === workers.length) resolve(results);
                return;
            }
            const chunk = inputArrays.slice(start, end).map(arr => Array.from(arr));
            worker.once('message', (br) => {
                for (let i = 0; i < br.length; i++) results[start + i] = br[i];
                completed++;
                if (completed === workers.length) resolve(results);
            });
            worker.postMessage(chunk);
        });
    });
}

// ==================== MAIN ====================

async function main() {
    const C = {
        reset: '\x1b[0m', dim: '\x1b[2m', bold: '\x1b[1m',
        red: '\x1b[31m', green: '\x1b[32m', yellow: '\x1b[33m',
        blue: '\x1b[34m', magenta: '\x1b[35m', cyan: '\x1b[36m',
    };

    console.log(`${C.cyan}╔══════════════════════════════════════════════════════╗${C.reset}`);
    console.log(`${C.cyan}║  MARIO SPEEDRUN — Frame Database + Splice Optimizer  ║${C.reset}`);
    console.log(`${C.cyan}║  Collect -> Splice -> Refine                         ║${C.reset}`);
    console.log(`${C.cyan}╚══════════════════════════════════════════════════════╝${C.reset}`);
    console.log();

    console.log('Creating title screen save state...');
    const { createRequire } = await import('module');
    const require = createRequire(import.meta.url);
    const jsnes = require('jsnes');
    const { NES, Controller } = jsnes;
    const nes = new NES({ onFrame: () => {}, onAudioSample: () => {}, emulateSound: false });
    nes.loadROM(romString);
    for (let i = 0; i < 90; i++) nes.frame();
    nes.buttonDown(1, Controller.BUTTON_START);
    for (let i = 0; i < 2; i++) nes.frame();
    nes.buttonUp(1, Controller.BUTTON_START);
    for (let i = 0; i < 200; i++) nes.frame();
    const saveStateStr = JSON.stringify(nes.toJSON());
    trainingSaveStateStr = saveStateStr;
    console.log(`  Mario at X=${nes.cpu.mem[0x006D] * 256 + nes.cpu.mem[0x0086]}, Y=${nes.cpu.mem[0x00CE]}`);
    console.log();

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
                workers.push(await spawnWorker(romString, saveStateStr));
                console.log(`  ${C.green}+ Worker added${C.reset} (now ${workers.length})`);
            } else if (op === '-' && workers.length > 1) {
                workers.pop().terminate();
                console.log(`  ${C.red}- Worker removed${C.reset} (now ${workers.length})`);
            }
        }
        pendingWorkerOps = [];
    }

    const hallOfFame = loadHallOfFame();
    const sectionRecords = new SectionRecordBook();
    const loadedRecords = sectionRecords.load();

    if (hallOfFame.length > 0) {
        console.log(`${C.green}Loaded ${hallOfFame.length} hall of fame entries${C.reset}`);
        for (const h of hallOfFame) {
            console.log(`  ${C.dim}${h.bestX}px ${h.speed}px/f ${h.completed ? 'COMPLETE ' + h.completionFrame + 'f' : h.reason}${C.reset}`);
        }
    }
    if (loadedRecords > 0) {
        console.log(`${C.green}Loaded ${loadedRecords} section records${C.reset}`);
    }
    if (hallOfFame.length > 0 || loadedRecords > 0) console.log();

    const db = new FrameDatabase();
    let globalBestInputs = null;     // highest fitness (speed-weighted)
    let globalBestResult = null;
    let globalBestFitness = -1;
    let furthestInputs = null;       // furthest reaching run (for variant generation)
    let furthestResult = null;
    let furthestX = 0;
    const goldenRunIds = new Set(); // track which DB runIds are HoF golden runs
    let totalSimulated = 0;
    let totalViable = 0;
    let totalWallTime = 0;
    let cumulativeFrames = 0;

    // Bootstrap: simulate HoF entries to get traces and add to DB
    const bootstrapEntries = [...hallOfFame];
    if (bootstrapEntries.length > 0) {
        console.log(`Bootstrapping ${bootstrapEntries.length} persisted entries into DB...`);
        const bootstrapInputs = [];
        for (const entry of bootstrapEntries) {
            const inputs = getInputsFromEntry(entry);
            if (inputs) bootstrapInputs.push(inputs);
        }
        if (bootstrapInputs.length > 0) {
            const bootstrapResults = await evaluateBatch(workers, bootstrapInputs);
            let bootstrapped = 0;
            for (let i = 0; i < bootstrapResults.length; i++) {
                const r = bootstrapResults[i];
                if (!r) continue;
                if (r.bestX >= MIN_VIABLE_DISTANCE) {
                    const runId = db.addRun(bootstrapInputs[i], r);
                    bootstrapped++;
                    // Tag HoF entries as golden runs
                    if (runId !== null) {
                        if (i < hallOfFame.length) goldenRunIds.add(runId);
                        const run = db.getRunById(runId);
                        if (run) sectionRecords.tryRecord(run, db, 'bootstrap');
                    }
                }
                // Update global best from bootstrapped runs
                const f = fitness(r);
                if (f > globalBestFitness) {
                    globalBestFitness = f;
                    globalBestResult = r;
                    globalBestInputs = bootstrapInputs[i];
                }
                if (r.bestX > furthestX) {
                    furthestX = r.bestX;
                    furthestResult = r;
                    furthestInputs = bootstrapInputs[i];
                }
            }
            sectionRecords.save();
            console.log(`  ${bootstrapped} entries added to DB | ${sectionRecords.stats().totalRecords} section records\n`);
        }
    }

    function updateGlobalBest(inputs, result) {
        let improved = false;
        const f = fitness(result);
        if (f > globalBestFitness) {
            globalBestFitness = f;
            globalBestResult = result;
            globalBestInputs = inputs;
            tryAddToHallOfFame(hallOfFame, inputs, result);
            improved = true;
        }
        if (result.bestX > furthestX) {
            furthestX = result.bestX;
            furthestResult = result;
            furthestInputs = inputs;
            improved = true;
        }
        return improved;
    }

    // Graceful shutdown
    let sigCount = 0;
    process.on('SIGINT', () => {
        sigCount++; if (sigCount > 1) process.exit(1);
        console.log('\n\nInterrupted! Saving...');
        if (globalBestInputs) {
            saveBest(globalBestInputs, globalBestResult);
            const speed = (globalBestResult.bestX / Math.max(globalBestResult.frame, 1)).toFixed(2);
            console.log(`Saved: ${globalBestResult.bestX}px ${speed}px/f ${globalBestResult.reason}`);
        }
        for (const w of workers) w.terminate();
        if (process.stdin.isTTY) process.stdin.setRawMode(false);
        setTimeout(() => process.exit(0), 200);
    });

    // Helper to collect a batch
    async function collectBatch(inputsArray) {
        const results = await evaluateBatch(workers, inputsArray);
        let viable = 0, batchBestX = 0, completions = 0, newRecords = 0;
        for (let i = 0; i < results.length; i++) {
            const result = results[i];
            if (!result) continue;
            totalSimulated++;
            cumulativeFrames += result.frame;
            if (result.bestX >= MIN_VIABLE_DISTANCE) {
                const runId = db.addRun(inputsArray[i], result);
                viable++;
                totalViable++;
                // Scan for section records — captures fast sections from ANY viable run
                if (runId !== null) {
                    const run = db.getRunById(runId);
                    if (run) newRecords += sectionRecords.tryRecord(run, db);
                }
            }
            if (result.bestX > batchBestX) batchBestX = result.bestX;
            if (result.completed) completions++;
            updateGlobalBest(inputsArray[i], result);
        }
        if (newRecords > 0) sectionRecords.save();
        return { viable, batchBestX, completions, newRecords };
    }

    // ==================== PHASE 1: COLLECTION ====================
    currentPhase = 'collection';
    console.log(`${C.cyan}=== PHASE 1: COLLECTION ===${C.reset}`);
    console.log(`${C.dim}Generating ${INITIAL_BATCHES * COLLECTION_BATCH_SIZE} random playthroughs...${C.reset}\n`);

    for (let batch = 0; batch < INITIAL_BATCHES; batch++) {
        const batchStart = Date.now();
        await processWorkerOps();

        const inputs = [];
        for (let i = 0; i < COLLECTION_BATCH_SIZE; i++) {
            inputs.push(generateRandomInputs(MAX_FRAMES));
        }

        const { viable, batchBestX, completions, newRecords } = await collectBatch(inputs);

        const batchTime = (Date.now() - batchStart) / 1000;
        totalWallTime += batchTime;
        const fps = Math.round(cumulativeFrames / totalWallTime);
        const fpsStr = fps > 1000000 ? `${(fps / 1000000).toFixed(1)}M` : fps > 1000 ? `${(fps / 1000).toFixed(0)}k` : `${fps}`;
        const stats = db.stats();
        const bar = makeProgressBar(stats.maxX, LEVEL_WIDTH, 25);
        const pct = (stats.maxX / LEVEL_WIDTH * 100).toFixed(0);

        console.log(`  Batch ${batch + 1}/${INITIAL_BATCHES} | +${viable} viable (${stats.totalRuns} total) | bestX: ${batchBestX} | ${batchTime.toFixed(1)}s | ${fpsStr} f/s${completions > 0 ? ` | ${C.green}${completions} completions!${C.reset}` : ''}`);
        if (batch % 3 === 2 || batch === INITIAL_BATCHES - 1) {
            console.log(`  ${C.cyan}${bar}${C.reset} ${pct}% | DB: ${stats.totalRuns} runs | Max: ${stats.maxX}px`);
        }

        const pruned = db.prune();
        if (pruned > 0) console.log(`  ${C.dim}Pruned ${pruned} runs${C.reset}`);

        if (globalBestInputs) saveBest(globalBestInputs, globalBestResult);
    }

    console.log();
    const collStats = db.stats();
    console.log(`${C.green}Collection complete:${C.reset} ${totalSimulated} simulated, ${collStats.totalRuns} stored, ${collStats.completions} completions`);
    console.log(`  Max distance: ${collStats.maxX}px | Furthest: ${furthestX}px | Best fitness: ${globalBestFitness.toFixed(0)} | ${sectionRecords.stats().totalRecords} section records`);
    console.log();

    // ==================== PHASE 2: SPLICE ====================
    currentPhase = 'splice';
    console.log(`${C.cyan}=== PHASE 2: X-POSITION SPLICE ===${C.reset}`);
    console.log(`${C.dim}Finding runs where A reaches X faster + B goes further past X...${C.reset}\n`);

    // Get golden runs from the DB (runs that originated from HoF entries)
    function getGoldenRuns() {
        // Return only the HoF-originated runs (not every completion in DB)
        const goldens = [];
        for (const id of goldenRunIds) {
            const run = db.getRunById(id);
            if (run) goldens.push(run);
        }
        // Fallback: if no HoF entries, use top 5 by fitness
        if (goldens.length === 0) {
            return [...db.runs].sort((a, b) => b.fitness - a.fitness).slice(0, 5);
        }
        return goldens;
    }

    async function runSpliceRound(label) {
        const spliceStart = Date.now();
        const goldenRuns = getGoldenRuns();

        if (goldenRuns.length === 0 || db.runs.length < 2) {
            console.log(`  ${C.yellow}${label}: Not enough runs for splicing${C.reset}`);
            return 0;
        }

        const { spliceInputs, spliceInfo, slowSpotCount, targetedGenCount } = await findAdaptiveSpliceOpportunities(db, goldenRuns, sectionRecords, workers, collectBatch);

        if (spliceInputs.length === 0) {
            console.log(`  ${C.yellow}${label}: ${slowSpotCount || 0} slow spots, no viable splices${targetedGenCount ? ' (+' + targetedGenCount + ' targeted)' : ''} | ${sectionRecords.stats().totalRecords} recs${C.reset}`);
            return 0;
        }

        const targetedStr = targetedGenCount ? ` +${targetedGenCount} targeted` : '';
        console.log(`  ${label}: ${goldenRuns.length} golden | ${slowSpotCount} slow spots | ${spliceInputs.length} splices${targetedStr} | ${sectionRecords.stats().totalRecords} recs`);
        const spliceResults = await evaluateBatch(workers, spliceInputs);

        let improved = 0;
        let spliceBestX = 0;
        let spliceBestFit = 0;
        for (let i = 0; i < spliceResults.length; i++) {
            const r = spliceResults[i];
            if (!r) continue;
            totalSimulated++;
            cumulativeFrames += r.frame;
            if (r.bestX >= MIN_VIABLE_DISTANCE) {
                const runId = db.addRun(spliceInputs[i], r);
                if (runId !== null) {
                    const run = db.getRunById(runId);
                    if (run) sectionRecords.tryRecord(run, db, 'splice');
                }
            }
            if (updateGlobalBest(spliceInputs[i], r)) improved++;
            if (r.bestX > spliceBestX) { spliceBestX = r.bestX; spliceBestFit = fitness(r); }
        }

        sectionRecords.save();
        const spliceTime = (Date.now() - spliceStart) / 1000;
        const bestSpeed = (globalBestResult.bestX / Math.max(globalBestResult.frame, 1)).toFixed(2);
        console.log(`  ${label}: Best splice: ${spliceBestX}px (fit: ${spliceBestFit.toFixed(0)}) | ${improved > 0 ? C.green + 'IMPROVED!' + C.reset : 'no improvement'} | ${spliceTime.toFixed(1)}s`);
        const completionStr = globalBestResult.completed ? ` | ${C.green}COMPLETE ${globalBestResult.completionFrame}f (${(globalBestResult.completionFrame / 60.098).toFixed(1)}s)${C.reset}` : '';
        console.log(`  Global best: ${globalBestResult.bestX}px ${bestSpeed}px/f [${rateResult(globalBestResult)}]${completionStr} | Furthest: ${furthestX}px`);

        return improved;
    }

    await runSpliceRound('Initial');
    if (globalBestInputs) saveBest(globalBestInputs, globalBestResult);
    console.log();

    // ==================== PHASE 3: REFINEMENT ====================
    currentPhase = 'refine';
    console.log(`${C.cyan}=== PHASE 3: REFINEMENT (Frontier Exploration) ===${C.reset}`);
    console.log(`${C.dim}Focused exploration at the death point + splicing...${C.reset}\n`);

    let stagnation = 0;
    for (let round = 0; round < REFINEMENT_MAX_ROUNDS; round++) {
        currentRound = round + 1;
        const roundStart = Date.now();
        await processWorkerOps();

        const prevFitness = globalBestFitness;
        const prevFurthest = furthestX;

        // Use the furthest-reaching run as base for frontier exploration
        const baseInputs = furthestInputs || globalBestInputs;
        const bestCompleted = globalBestResult?.completed || false;
        const deathFrame = furthestResult ? furthestResult.frame : (globalBestResult?.frame || 300);
        const noiseLevel = 0.5 + (stagnation * 0.3);
        const jitter = 30 + stagnation * 20;

        const variants = [];

        if (bestCompleted) {
            // COMPLETION MODE: the run finishes the level. We want to make it FASTER.
            // 40% SLOW SPOT EXPLORERS: keep golden run, randomize just the slow sections
            const goldenRuns = getGoldenRuns();
            const allSlowSpots = [];
            for (const g of goldenRuns) {
                const spots = sectionRecords.getSlowSpots(g, db);
                for (const s of spots) allSlowSpots.push({ ...s, goldenRun: g });
            }
            allSlowSpots.sort((a, b) => b.savedFrames - a.savedFrames);

            const numSlowSpotRuns = Math.floor(REFINEMENT_VARIANTS * 0.4);
            for (let i = 0; i < numSlowSpotRuns; i++) {
                if (allSlowSpots.length === 0) break;
                // Pick a random slow spot (biased toward worst ones)
                const spotIdx = Math.floor(Math.random() * Math.min(allSlowSpots.length, 10));
                const spot = allSlowSpots[spotIdx];
                const golden = spot.goldenRun;

                // Back up from the slow spot to give room for a different approach
                const backedUpX = Math.max(50, spot.xStart - SPLICE_BACKUP_PX);
                const fBackup = db.getFrameAtX(golden, backedUpX);
                const fEnd = db.getFrameAtX(golden, spot.xEnd);
                if (fBackup < 0 || fEnd < 0 || fEnd <= fBackup) continue;

                // Keep golden prefix up to backed-up point, randomize through the obstacle, keep suffix
                const inputs = new Uint8Array(golden.inputs);
                let bitmask = randomBitmask();
                let hold = randomDuration();
                let elapsed = 0;
                for (let f = fBackup + 1; f <= fEnd && f < inputs.length; f++) {
                    inputs[f] = bitmask;
                    elapsed++;
                    if (elapsed >= hold) {
                        bitmask = randomBitmask();
                        hold = randomDuration();
                        elapsed = 0;
                    }
                }
                variants.push(inputs);
            }

            // 30% uniform noise across the whole run
            const numNoise = Math.floor(REFINEMENT_VARIANTS * 0.3);
            for (let i = 0; i < numNoise; i++) {
                variants.push(generateNoisyVariant(globalBestInputs, noiseLevel, deathFrame * 2));
            }
            // 15% noise on furthest (may be a different completion strategy)
            if (furthestInputs && furthestInputs !== globalBestInputs) {
                const numFurthest = Math.floor(REFINEMENT_VARIANTS * 0.15);
                for (let i = 0; i < numFurthest; i++) {
                    variants.push(generateNoisyVariant(furthestInputs, noiseLevel, deathFrame * 2));
                }
            }
            // 15% pure random for entirely new completion strategies
            const numRandom = Math.max(10, REFINEMENT_VARIANTS - variants.length);
            for (let i = 0; i < numRandom; i++) {
                variants.push(generateRandomInputs(MAX_FRAMES));
            }
        } else {
            // EXPLORATION MODE: run dies before finishing. Push the frontier.
            // 40% FRONTIER RUNS: keep proven prefix, randomize past the death point
            const numFrontier = Math.floor(REFINEMENT_VARIANTS * 0.4);
            for (let i = 0; i < numFrontier; i++) {
                variants.push(generateFrontierRun(baseInputs, deathFrame, jitter));
            }
            // 30% NOISE VARIANTS biased toward death point
            const numNoise = Math.floor(REFINEMENT_VARIANTS * 0.3);
            for (let i = 0; i < numNoise; i++) {
                variants.push(generateNoisyVariant(baseInputs, noiseLevel, deathFrame));
            }
            // 15% NOISE on fitness-best (may differ from furthest)
            if (globalBestInputs !== furthestInputs && globalBestInputs) {
                const numFitNoise = Math.floor(REFINEMENT_VARIANTS * 0.15);
                const fitDeathFrame = globalBestResult?.frame || deathFrame;
                for (let i = 0; i < numFitNoise; i++) {
                    variants.push(generateNoisyVariant(globalBestInputs, noiseLevel, fitDeathFrame));
                }
            }
            // 15% PURE RANDOM
            const numRandom = Math.max(10, REFINEMENT_VARIANTS - variants.length);
            for (let i = 0; i < numRandom; i++) {
                variants.push(generateRandomInputs(MAX_FRAMES));
            }
        }

        const { viable: roundViable, batchBestX: roundBestX, completions: roundCompletions } = await collectBatch(variants);

        // Re-splice with expanded database
        db.prune();
        await runSpliceRound(`R${round + 1}`);

        const roundImproved = globalBestFitness > prevFitness + 0.01 || furthestX > prevFurthest;

        if (roundImproved) stagnation = 0;
        else stagnation++;

        const roundTime = (Date.now() - roundStart) / 1000;
        totalWallTime += roundTime;
        const fps = Math.round(cumulativeFrames / totalWallTime);
        const fpsStr = fps > 1000000 ? `${(fps / 1000000).toFixed(1)}M` : fps > 1000 ? `${(fps / 1000).toFixed(0)}k` : `${fps}`;
        const bestSpeed = (globalBestResult.bestX / Math.max(globalBestResult.frame, 1)).toFixed(2);
        const rating = rateResult(globalBestResult);
        const bar = makeProgressBar(furthestX, LEVEL_WIDTH, 25);
        const pct = (furthestX / LEVEL_WIDTH * 100).toFixed(0);

        const completionInfo = bestCompleted ? ` ${(globalBestResult.completionFrame / 60.098).toFixed(1)}s` : '';
        const recCount = sectionRecords.stats().totalRecords;
        if (roundImproved) {
            console.log(`${C.yellow}Refine ${String(round + 1).padStart(3)}/${REFINEMENT_MAX_ROUNDS}${C.reset} ${C.green}NEW BEST [${rating}]${C.reset} | ${globalBestResult.bestX}px ${bestSpeed}px/f${completionInfo} | fit: ${globalBestFitness.toFixed(0)} | ${recCount} recs`);
            console.log(`  ${C.cyan}${bar}${C.reset} ${pct}% | +${roundViable} viable | DB: ${db.runs.length} | ${roundTime.toFixed(1)}s | ${fpsStr} f/s`);
            console.log(`  ${C.cyan}Splits: ${formatCheckpointSplits(furthestResult || globalBestResult)}${C.reset}`);
        } else {
            console.log(`${C.dim}Refine ${String(round + 1).padStart(3)}/${REFINEMENT_MAX_ROUNDS}${C.reset} | Best: ${globalBestResult.bestX}px [${rating}]${completionInfo} | +${roundViable} | stag:${stagnation} | ${recCount} recs | ${roundTime.toFixed(1)}s`);
        }
        if (roundCompletions > 0) console.log(`  ${C.green}${roundCompletions} completions this round!${C.reset}`);

        saveBest(globalBestInputs, globalBestResult);

        // Stagnation reset
        if (stagnation >= REFINEMENT_STALL_LIMIT) {
            stagnation = 0;
            const burstInputs = [];

            if (bestCompleted) {
                // Completed + stagnant: heavy uniform noise to find faster completions
                console.log(`\n  ${C.yellow}Stagnant. Heavy noise burst on completion run...${C.reset}\n`);
                for (let i = 0; i < Math.floor(COLLECTION_BATCH_SIZE * 0.7); i++) {
                    burstInputs.push(generateNoisyVariant(globalBestInputs, noiseLevel * 2, deathFrame * 2));
                }
                for (let i = burstInputs.length; i < COLLECTION_BATCH_SIZE; i++) {
                    burstInputs.push(generateRandomInputs(MAX_FRAMES));
                }
            } else {
                // Not completed: frontier burst
                const burstBase = furthestInputs || globalBestInputs;
                const burstDeath = furthestResult ? furthestResult.frame : (globalBestResult?.frame || 300);
                const bigJitter = 60 + stagnation * 30;
                console.log(`\n  ${C.yellow}Stagnant. Frontier burst at frame ~${burstDeath} (jitter +/-${bigJitter})...${C.reset}\n`);
                for (let i = 0; i < Math.floor(COLLECTION_BATCH_SIZE * 0.8); i++) {
                    burstInputs.push(generateFrontierRun(burstBase, burstDeath, bigJitter));
                }
                for (let i = burstInputs.length; i < COLLECTION_BATCH_SIZE; i++) {
                    burstInputs.push(generateRandomInputs(MAX_FRAMES));
                }
            }

            const { viable: burstViable, batchBestX: burstBestX } = await collectBatch(burstInputs);
            db.prune();
            console.log(`  ${C.cyan}Burst: +${burstViable} viable (best: ${burstBestX}px) | DB: ${db.runs.length} | ${sectionRecords.stats().totalRecords} records${C.reset}\n`);
        }
    }

    // ==================== DONE ====================
    console.log();
    console.log(`${C.cyan}==========================================${C.reset}`);
    console.log(`${C.bold}OPTIMIZATION COMPLETE${C.reset}`);
    const finalSpeed = (globalBestResult.bestX / Math.max(globalBestResult.frame, 1)).toFixed(2);
    console.log(`Best: ${globalBestResult.bestX}px ${finalSpeed}px/f ${globalBestResult.reason} [${rateResult(globalBestResult)}]`);
    console.log(`Fitness: ${globalBestFitness.toFixed(0)}`);
    console.log(`Splits: ${formatCheckpointSplits(globalBestResult)}`);
    if (globalBestResult.completed) {
        console.log(`${C.green}COMPLETED in ${globalBestResult.completionFrame}f (${(globalBestResult.completionFrame / 60.098).toFixed(2)}s)${C.reset}`);
    }
    const finalStats = db.stats();
    console.log(`Database: ${finalStats.totalRuns} runs`);
    console.log(`Total: ${totalSimulated} simulated | ${formatTime(totalWallTime)} | ${Math.round(cumulativeFrames / totalWallTime)} f/s`);
    saveBest(globalBestInputs, globalBestResult);
    console.log(`Saved to: ${bestPath}`);
    workers.forEach(w => w.terminate());
    if (process.stdin.isTTY) process.stdin.setRawMode(false);
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });

} // end isMainThread
