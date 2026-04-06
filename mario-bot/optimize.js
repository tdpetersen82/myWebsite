#!/usr/bin/env node
// Mario Speedrun Optimizer — Genetic Algorithm + Headless NES
// Island Model with Checkpoint-Based Fitness
// Usage: node optimize.js
// Press +/- to add/remove worker threads on the fly.

import fs from 'fs';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';
import { Worker, isMainThread, parentPort, workerData } from 'worker_threads';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ==================== CONFIG ====================

const NUM_ISLANDS = 3;
const ISLAND_SIZE = 67;
const POPULATION_SIZE = NUM_ISLANDS * ISLAND_SIZE;  // 201
const GENERATIONS = 500;
const ELITE_COUNT_PER_ISLAND = 4;
const TOURNAMENT_SIZE = 5;
const CROSSOVER_RATE = 0.7;
const BASE_MUTATION_RATE = 0.4;
const SEGMENT_MUTATE_PROB = 0.2;
const EARTHQUAKE_PROB = 0.05;
const MAX_SEGMENTS = 100;
const MIN_SEGMENT_DURATION = 3;
const MAX_SEGMENT_DURATION = 240;
const MAX_FRAMES = 8000;
const STALL_LIMIT = 120;
const BASE_DIVERSITY_INJECT = 5;   // per island base
const NUM_WORKERS = Math.max(1, os.cpus().length - 1);
const LEVEL_WIDTH = 3200;
const SPEED_WEIGHT = 500;
const MIN_VIABLE_DISTANCE = 500;  // must reach this far to be "viable"
const STUCK_PENALTY = 50;
const MIGRATION_INTERVAL = 15;
const MIGRATION_COUNT = 5;
const ISLAND_RESET_THRESHOLD = 25;  // nuke island after this many stagnant gens
const CHECKPOINTS = [800, 1600, 2400];
const CHECKPOINT_BONUS_WEIGHT = 10;

// ==================== BUTTON CONSTANTS ====================
const CBTNS = { A: 0, B: 1, SELECT: 2, START: 3, UP: 4, DOWN: 5, LEFT: 6, RIGHT: 7 };
const GAMEPLAY_BUTTONS = [CBTNS.A, CBTNS.B, CBTNS.UP, CBTNS.DOWN, CBTNS.LEFT, CBTNS.RIGHT];

const BUTTON_WEIGHTS = [
    { btn: CBTNS.RIGHT, weight: 0.92 },
    { btn: CBTNS.B,     weight: 0.80 },
    { btn: CBTNS.A,     weight: 0.35 },
    { btn: CBTNS.LEFT,  weight: 0.03 },
    { btn: CBTNS.DOWN,  weight: 0.03 },
    { btn: CBTNS.UP,    weight: 0.02 },
];

const JSNES_TO_BOT = { 0: 8, 1: 0, 2: 2, 3: 3, 4: 4, 5: 5, 6: 6, 7: 7 };

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

    function simulate(segments) {
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

        let segIdx = 0;
        let segFrameStart = 0;
        let prevButtons = new Set();

        for (frame = 0; frame < MAX_FRAMES; frame++) {
            if (segIdx < segments.length) {
                const seg = segments[segIdx];
                const segFrame = frame - segFrameStart;
                if (segFrame === 0) {
                    const curButtons = new Set(seg.buttons);
                    for (const b of prevButtons) { if (!curButtons.has(b)) nes.buttonUp(1, b); }
                    for (const b of curButtons) { if (!prevButtons.has(b)) nes.buttonDown(1, b); }
                    prevButtons = curButtons;
                }
                if (segFrame + 1 >= seg.duration) { segIdx++; segFrameStart = frame + 1; }
            } else if (prevButtons.size > 0) {
                for (const b of prevButtons) nes.buttonUp(1, b);
                prevButtons = new Set();
            }

            nes.frame();

            const x = nes.cpu.mem[0x006D] * 256 + nes.cpu.mem[0x0086];
            if (x > bestX) { bestX = x; lastProgressFrame = frame; }

            // Checkpoints
            for (let ci = 0; ci < CHECKPOINTS.length; ci++) {
                if (checkpoints[ci] === null && x >= CHECKPOINTS[ci]) checkpoints[ci] = frame;
            }

            // Velocity
            const vel = nes.cpu.mem[0x0057];
            if (vel > 0 && vel < 128) velocityFrames++;

            // Stuck detection
            const velY = nes.cpu.mem[0x009F];
            const isAscending = (velY !== 0 && velY < 128);
            if (x === prevX && frame > 0 && !isAscending) stuckFrames++;
            prevX = x;

            // Level complete?
            if (nes.cpu.mem[0x001D] === 3 || nes.cpu.mem[0x075F] > 0 || nes.cpu.mem[0x0760] > 0) {
                completed = true; completionFrame = frame; reason = 'completed'; break;
            }
            // Dead?
            const ps = nes.cpu.mem[0x000E];
            if (ps === 0x0B || ps === 0x06 || nes.cpu.mem[0x00CE] > 240 || nes.cpu.mem[0x0770] === 3) {
                reason = 'dead'; break;
            }
            // Backwards?
            if (frame > 60 && x < startX) { reason = 'backwards'; break; }
            // Too slow? If we haven't reached MIN_VIABLE_DISTANCE by frame 600, give up
            if (frame === 600 && bestX < MIN_VIABLE_DISTANCE) { reason = 'too_slow'; break; }
            // Stalled?
            if (frame - lastProgressFrame > STALL_LIMIT) { reason = 'stalled'; break; }
        }

        return { bestX, completed, completionFrame, frame, reason, velocityFrames, stuckFrames, checkpoints };
    }

    parentPort.on('message', (batch) => {
        parentPort.postMessage(batch.map(ind => simulate(ind)));
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

// ==================== SEGMENT HELPERS ====================

function randomButtons() {
    const buttons = [];
    for (const { btn, weight } of BUTTON_WEIGHTS) { if (Math.random() < weight) buttons.push(btn); }
    if (!buttons.includes(CBTNS.RIGHT) && Math.random() < 0.85) buttons.push(CBTNS.RIGHT);
    return buttons;
}
function randomDuration() { return MIN_SEGMENT_DURATION + Math.floor(Math.random() * (MAX_SEGMENT_DURATION - MIN_SEGMENT_DURATION)); }
function randomSegment() { return { buttons: randomButtons(), duration: randomDuration() }; }
function randomIndividual(n) { n = n || (20 + Math.floor(Math.random() * 25)); const s = []; for (let i = 0; i < n; i++) s.push(randomSegment()); return s; }
function cloneIndividual(ind) { return ind.map(s => ({ buttons: [...s.buttons], duration: s.duration })); }

function seedIndividual() {
    const RB = [CBTNS.RIGHT, CBTNS.B], RBA = [CBTNS.RIGHT, CBTNS.B, CBTNS.A];
    // 16 segments, ~1280 frames (~21 seconds) — close to optimal speedrun
    return [
        { buttons: [...RB], duration: 160 }, { buttons: [...RBA], duration: 15 },
        { buttons: [...RB], duration: 140 }, { buttons: [...RBA], duration: 20 },
        { buttons: [...RB], duration: 120 }, { buttons: [...RBA], duration: 22 },
        { buttons: [...RB], duration: 160 }, { buttons: [...RBA], duration: 18 },
        { buttons: [...RB], duration: 100 }, { buttons: [...RBA], duration: 25 },
        { buttons: [...RB], duration: 200 }, { buttons: [...RBA], duration: 20 },
        { buttons: [...RB], duration: 140 }, { buttons: [...RBA], duration: 18 },
        { buttons: [...RB], duration: 180 }, { buttons: [...RBA], duration: 22 },
    ];
}

// ==================== GENETIC OPERATORS ====================

function tournamentSelect(pop, fit) {
    let best = Math.floor(Math.random() * pop.length);
    for (let i = 1; i < TOURNAMENT_SIZE; i++) { const idx = Math.floor(Math.random() * pop.length); if (fit[idx] > fit[best]) best = idx; }
    return pop[best];
}

function crossover(a, b) {
    if (a.length < 2 || b.length < 2) return cloneIndividual(a);
    const cutA = 1 + Math.floor(Math.random() * (a.length - 1));
    const cutB = 1 + Math.floor(Math.random() * (b.length - 1));
    const child = [...a.slice(0, cutA).map(s => ({ buttons: [...s.buttons], duration: s.duration })), ...b.slice(cutB).map(s => ({ buttons: [...s.buttons], duration: s.duration }))];
    if (child.length > MAX_SEGMENTS) child.length = MAX_SEGMENTS;
    return child;
}

function mutate(individual) {
    const ind = cloneIndividual(individual);
    if (Math.random() < EARTHQUAKE_PROB && ind.length >= 5) {
        const maxLen = Math.min(8, ind.length - 1);
        const len = Math.min(3 + Math.floor(Math.random() * 6), maxLen);
        const start = Math.floor(Math.random() * (ind.length - len));
        if (Math.random() < 0.5) {
            for (let j = start; j < start + len; j++) ind[j] = randomSegment();
        } else {
            const scale = 0.5 + Math.random();
            for (let j = start; j < start + len; j++) ind[j].duration = Math.max(MIN_SEGMENT_DURATION, Math.min(MAX_SEGMENT_DURATION, Math.round(ind[j].duration * scale)));
        }
        return ind;
    }
    for (let i = 0; i < ind.length; i++) {
        if (Math.random() > SEGMENT_MUTATE_PROB) continue;
        const op = Math.random();
        if (op < 0.30) { ind[i].duration = Math.max(MIN_SEGMENT_DURATION, Math.min(MAX_SEGMENT_DURATION, ind[i].duration + Math.floor(Math.random() * 30) - 15)); }
        else if (op < 0.55) {
            const btn = GAMEPLAY_BUTTONS[Math.floor(Math.random() * GAMEPLAY_BUTTONS.length)];
            const idx = ind[i].buttons.indexOf(btn);
            if (idx >= 0) { ind[i].buttons.splice(idx, 1); }
            else {
                ind[i].buttons.push(btn);
                // Directional mutex: LEFT+RIGHT cancel on NES, prevent contradictions
                if (btn === CBTNS.LEFT) ind[i].buttons = ind[i].buttons.filter(b => b !== CBTNS.RIGHT);
                if (btn === CBTNS.RIGHT) ind[i].buttons = ind[i].buttons.filter(b => b !== CBTNS.LEFT);
                if (btn === CBTNS.UP) ind[i].buttons = ind[i].buttons.filter(b => b !== CBTNS.DOWN);
                if (btn === CBTNS.DOWN) ind[i].buttons = ind[i].buttons.filter(b => b !== CBTNS.UP);
            }
        }
        else if (op < 0.70) { if (ind[i].duration > MIN_SEGMENT_DURATION * 2 && ind.length < MAX_SEGMENTS) { const sp = MIN_SEGMENT_DURATION + Math.floor(Math.random() * (ind[i].duration - MIN_SEGMENT_DURATION * 2)); ind.splice(i + 1, 0, { buttons: [...ind[i].buttons], duration: ind[i].duration - sp }); ind[i].duration = sp; } }
        else if (op < 0.80) { if (i < ind.length - 1) { ind[i].duration = Math.min(ind[i].duration + ind[i + 1].duration, MAX_SEGMENT_DURATION); ind.splice(i + 1, 1); } }
        else if (op < 0.90) { if (ind.length < MAX_SEGMENTS) ind.splice(i, 0, randomSegment()); }
        else { if (ind.length > 5) { ind.splice(i, 1); i--; } }
    }
    return ind;
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
        // Completed: MASSIVE reward. Faster = MUCH better. No stuck penalty.
        return 10000000 + (MAX_FRAMES - result.completionFrame) * 10 + cpBonus;
    }

    // Non-completions: must reach minimum distance to be viable
    if (result.bestX < MIN_VIABLE_DISTANCE) {
        // Below threshold: just reward distance to help population get past first obstacles
        return result.bestX;
    }

    // Viable runs (500px+): SPEED is king, distance is tiebreaker.
    // speed * 10000 means 0.1 px/f faster = +1000 fitness (equivalent to 100px more distance)
    const stuckPen = (result.stuckFrames || 0) * STUCK_PENALTY;
    return speed * 10000 + result.bestX * 10 - stuckPen + cpBonus;
}

function fitnessBreakdown(result) {
    const cpBonus = checkpointBonus(result);
    const speed = result.bestX / Math.max(result.frame, 1);
    if (result.completed) {
        const timeBonus = (MAX_FRAMES - result.completionFrame) * 10;
        return { total: 10000000 + timeBonus + cpBonus, dist: result.bestX, speedBonus: timeBonus, speed, stuckPenalty: 0, stuckFrames: result.stuckFrames || 0, cpBonus };
    }
    if (result.bestX < MIN_VIABLE_DISTANCE) {
        return { total: result.bestX, dist: result.bestX, speedBonus: 0, speed, stuckPenalty: 0, stuckFrames: result.stuckFrames || 0, cpBonus: 0 };
    }
    const stuckPen = (result.stuckFrames || 0) * STUCK_PENALTY;
    const speedBonus = speed * 10000;
    return { total: speed * 10000 + result.bestX * 10 - stuckPen + cpBonus, dist: result.bestX, speedBonus, speed, stuckPenalty: stuckPen, stuckFrames: result.stuckFrames || 0, cpBonus };
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
    return parts.length > 0 ? parts.join(' → ') : 'none reached';
}

// ==================== STATS ====================

function computeStats(fitnesses) {
    const sorted = [...fitnesses].sort((a, b) => a - b);
    const n = sorted.length;
    const avg = fitnesses.reduce((a, b) => a + b, 0) / n;
    const variance = fitnesses.reduce((sum, f) => sum + (f - avg) ** 2, 0) / n;
    return { min: sorted[0], max: sorted[n - 1], median: n % 2 === 0 ? (sorted[n/2 - 1] + sorted[n/2]) / 2 : sorted[Math.floor(n/2)], avg, stddev: Math.sqrt(variance) };
}

function makeProgressBar(x, maxX, w) { const r = Math.min(x / maxX, 1); const f = Math.round(r * w); return '[' + '█'.repeat(Math.max(0, f - 1)) + (f > 0 ? '▒' : '') + '░'.repeat(w - f) + ']'; }
function formatTime(s) { if (s < 60) return `${s.toFixed(0)}s`; return `${Math.floor(s/60)}m ${Math.round(s%60)}s`; }

function analyzeResults(results) {
    const counts = { completed: 0, dead: 0, stalled: 0, timeout: 0, backwards: 0, too_slow: 0 };
    let deadXSum = 0, totalFrames = 0, totalStuck = 0;
    for (const r of results) {
        counts[r.reason] = (counts[r.reason] || 0) + 1;
        if (r.reason === 'dead' || r.reason === 'backwards') deadXSum += r.bestX;
        totalFrames += r.frame;
        totalStuck += (r.stuckFrames || 0);
    }
    const deadCount = counts.dead + counts.backwards;
    return { counts, avgDeadX: deadCount > 0 ? Math.round(deadXSum / deadCount) : 0, totalFrames, avgStuckFrames: Math.round(totalStuck / results.length) };
}

// ==================== OUTPUT ====================

const bestPath = path.join(__dirname, 'best-sequence.json');
const saveStatePath = path.join(__dirname, 'save-state.json');
const hofPath = path.join(__dirname, 'hall-of-fame.json');
const HOF_SIZE = 10;
let trainingSaveStateStr = null;

// ==================== HALL OF FAME ====================

function loadHallOfFame() {
    try {
        if (fs.existsSync(hofPath)) {
            const data = JSON.parse(fs.readFileSync(hofPath, 'utf8'));
            if (Array.isArray(data) && data.length > 0) return data;
        }
    } catch(e) {}
    return [];
}

function saveHallOfFame(hof) {
    fs.writeFileSync(hofPath, JSON.stringify(hof, null, 2));
}

function tryAddToHallOfFame(hof, individual, result) {
    const entry = {
        segments: cloneIndividual(individual),
        events: segmentsToEvents(individual),
        fitness: fitness(result),
        bestX: result.bestX,
        speed: parseFloat((result.bestX / Math.max(result.frame, 1)).toFixed(2)),
        completed: result.completed,
        completionFrame: result.completionFrame,
        frame: result.frame,
        reason: result.reason,
        checkpoints: result.checkpoints,
        stuckFrames: result.stuckFrames || 0,
        rating: rateResult(result),
        addedAt: new Date().toISOString(),
    };

    // Check if this is better than worst in hall, or hall isn't full
    if (hof.length < HOF_SIZE) {
        hof.push(entry);
        hof.sort((a, b) => b.fitness - a.fitness);
        saveHallOfFame(hof);
        return true;
    }

    const worstFitness = hof[hof.length - 1].fitness;
    if (entry.fitness > worstFitness) {
        hof.pop();
        hof.push(entry);
        hof.sort((a, b) => b.fitness - a.fitness);
        saveHallOfFame(hof);
        return true;
    }
    return false;
}

function segmentsToEvents(segments) {
    const events = []; let frame = 0; let prev = new Set();
    for (const seg of segments) {
        const cur = new Set(seg.buttons);
        for (const b of prev) { if (!cur.has(b)) events.push([frame, JSNES_TO_BOT[b], 0]); }
        for (const b of cur) { if (!prev.has(b)) events.push([frame, JSNES_TO_BOT[b], 1]); }
        frame += seg.duration; prev = cur;
    }
    for (const b of prev) events.push([frame, JSNES_TO_BOT[b], 0]);
    return events;
}

let currentGen = 0;
let globalBestIsland = 0;

function saveBest(individual, result) {
    const events = segmentsToEvents(individual);
    const speed = result.bestX / Math.max(result.frame, 1);
    const id = `gen${currentGen}-I${globalBestIsland}-${result.bestX}px-${speed.toFixed(2)}pf`;
    fs.writeFileSync(bestPath, JSON.stringify({
        id, rating: rateResult(result), generation: currentGen, island: globalBestIsland,
        events, fitness: fitness(result),
        completed: result.completed, completionFrame: result.completionFrame,
        bestX: result.bestX, speed: parseFloat(speed.toFixed(2)),
        reason: result.reason, totalFrames: result.frame,
        stuckFrames: result.stuckFrames || 0,
        checkpoints: result.checkpoints, checkpointSplits: formatCheckpointSplits(result),
        timeSeconds: result.completed ? (result.completionFrame / 60.098).toFixed(2) : null,
        segments: individual.length,
    }, null, 2));
    fs.writeFileSync(saveStatePath, trainingSaveStateStr);
}

function formatFitness(result) {
    const speed = (result.bestX / Math.max(result.frame, 1)).toFixed(2);
    if (result.completed) { const t = (result.completionFrame / 60.098).toFixed(1); return `\x1b[32mCOMPLETE ${result.completionFrame}f (${t}s) ${speed} px/f\x1b[0m`; }
    return `${result.bestX} px (${speed} px/f)`;
}

// ==================== WORKER POOL ====================

const thisFile = fileURLToPath(import.meta.url);
async function spawnWorker(romString, saveStateStr) { const w = new Worker(thisFile, { workerData: { romString, saveStateStr } }); await new Promise(r => { w.once('message', m => { if (m === 'ready') r(); }); }); return w; }
async function createWorkerPool(romString, saveStateStr, count) { const w = []; for (let i = 0; i < count; i++) w.push(await spawnWorker(romString, saveStateStr)); return w; }

function evaluateBatch(workers, population) {
    return new Promise((resolve) => {
        const results = new Array(population.length);
        const chunkSize = Math.ceil(population.length / workers.length);
        let completed = 0;
        workers.forEach((worker, wi) => {
            const start = wi * chunkSize;
            const end = Math.min(start + chunkSize, population.length);
            if (start >= population.length) { completed++; if (completed === workers.length) resolve(results); return; }
            worker.once('message', (br) => { for (let i = 0; i < br.length; i++) results[start + i] = br[i]; completed++; if (completed === workers.length) resolve(results); });
            worker.postMessage(population.slice(start, end));
        });
    });
}

// ==================== ISLAND EVOLUTION ====================

function evolveIsland(island, mutRate, diversityInject) {
    const { population, fitnesses } = island;
    const sorted = fitnesses.map((f, i) => i).sort((a, b) => fitnesses[b] - fitnesses[a]);
    const next = [];
    // Elites
    for (let i = 0; i < ELITE_COUNT_PER_ISLAND && i < sorted.length; i++) next.push(cloneIndividual(population[sorted[i]]));
    // Diversity
    for (let i = 0; i < diversityInject && next.length < ISLAND_SIZE; i++) next.push(randomIndividual());
    // Fill with tournament + crossover + mutation
    while (next.length < ISLAND_SIZE) {
        const a = tournamentSelect(population, fitnesses);
        const b = tournamentSelect(population, fitnesses);
        let child = Math.random() < CROSSOVER_RATE ? crossover(a, b) : cloneIndividual(a);
        if (Math.random() < mutRate) child = mutate(child);
        next.push(child);
    }
    island.population = next;
}

function migrate(islands, C) {
    for (let i = 0; i < NUM_ISLANDS; i++) {
        const target = (i + 1 + Math.floor(Math.random() * (NUM_ISLANDS - 1))) % NUM_ISLANDS;
        const srcSorted = islands[i].fitnesses.map((f, j) => j).sort((a, b) => islands[i].fitnesses[b] - islands[i].fitnesses[a]);
        const tgtSorted = islands[target].fitnesses.map((f, j) => j).sort((a, b) => islands[target].fitnesses[a] - islands[target].fitnesses[b]);
        for (let k = 0; k < MIGRATION_COUNT; k++) {
            islands[target].population[tgtSorted[k]] = cloneIndividual(islands[i].population[srcSorted[k]]);
        }
    }
}

// ==================== MAIN ====================

async function main() {
    const C = { reset: '\x1b[0m', dim: '\x1b[2m', bold: '\x1b[1m', red: '\x1b[31m', green: '\x1b[32m', yellow: '\x1b[33m', blue: '\x1b[34m', magenta: '\x1b[35m', cyan: '\x1b[36m', white: '\x1b[37m' };

    console.log(`${C.cyan}╔══════════════════════════════════════════════╗${C.reset}`);
    console.log(`${C.cyan}║   MARIO SPEEDRUN OPTIMIZER — Island Model    ║${C.reset}`);
    console.log(`${C.cyan}║   ${NUM_ISLANDS} islands × ${ISLAND_SIZE} │ Migrate: ${MIGRATION_COUNT}@${MIGRATION_INTERVAL}g │ Reset@${ISLAND_RESET_THRESHOLD}  ║${C.reset}`);
    console.log(`${C.cyan}╚══════════════════════════════════════════════╝${C.reset}`);
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
    console.log(`  Mario at X=${nes.cpu.mem[0x006D]*256+nes.cpu.mem[0x0086]}, Y=${nes.cpu.mem[0x00CE]}`);
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
            if (op === '+') { workers.push(await spawnWorker(romString, saveStateStr)); console.log(`  ${C.green}+ Worker added${C.reset} (now ${workers.length})`); }
            else if (op === '-' && workers.length > 1) { workers.pop().terminate(); console.log(`  ${C.red}- Worker removed${C.reset} (now ${workers.length})`); }
        }
        pendingWorkerOps = [];
    }

    // Initialize islands
    // Load hall of fame from previous runs
    const hallOfFame = loadHallOfFame();
    if (hallOfFame.length > 0) {
        console.log(`${C.green}Loaded ${hallOfFame.length} hall of fame entries${C.reset}`);
        for (const h of hallOfFame) {
            console.log(`  ${C.dim}${h.bestX}px ${h.speed}px/f ${h.completed ? 'COMPLETE '+h.completionFrame+'f' : h.reason} (${h.addedAt?.slice(0,10) || '?'})${C.reset}`);
        }
    } else {
        console.log(`${C.dim}No hall of fame yet — starting fresh${C.reset}`);
    }
    console.log();

    console.log(`Initializing ${NUM_ISLANDS} islands of ${ISLAND_SIZE} each...`);
    const islands = [];
    for (let i = 0; i < NUM_ISLANDS; i++) {
        const pop = [];
        if (i === 0) {
            // Island 0: seeded with hall of fame + seed individual
            pop.push(seedIndividual());
            for (let j = 0; j < 4; j++) pop.push(mutate(seedIndividual()));
            for (const h of hallOfFame) {
                if (pop.length < ISLAND_SIZE - 5 && h.segments) {
                    pop.push(cloneIndividual(h.segments));
                    pop.push(mutate(cloneIndividual(h.segments)));
                }
            }
            while (pop.length < ISLAND_SIZE) pop.push(randomIndividual());
        } else {
            // Islands 1+: pure random (find their own path)
            while (pop.length < ISLAND_SIZE) pop.push(randomIndividual());
        }
        if (pop.length > ISLAND_SIZE) pop.length = ISLAND_SIZE;
        islands.push({ population: pop, results: null, fitnesses: null, bestFitness: -1, bestResult: null, bestIndividual: null, stagnation: 0 });
    }
    console.log(`${C.dim}Press + / - to add/remove workers${C.reset}\n`);

    let globalBestFitness = -1;
    let globalBestResult = null;
    let globalBestIndividual = null;
    let gensSinceGlobalImprovement = 0;
    let totalWallTime = 0;
    let cumulativeFrames = 0;

    let sigCount = 0;
    process.on('SIGINT', () => {
        sigCount++; if (sigCount > 1) process.exit(1);
        console.log('\n\nInterrupted! Saving...');
        if (globalBestIndividual) { saveBest(globalBestIndividual, globalBestResult); console.log(`Saved: ${formatFitness(globalBestResult)}`); }
        for (const w of workers) w.terminate();
        if (process.stdin.isTTY) process.stdin.setRawMode(false);
        setTimeout(() => process.exit(0), 200);
    });

    // ==================== MAIN GA LOOP ====================
    for (let gen = 1; gen <= GENERATIONS; gen++) {
        const genStart = Date.now();
        await processWorkerOps();

        // Evaluate all islands in one batch
        const allPop = [];
        const offsets = [];
        for (const isl of islands) { offsets.push(allPop.length); allPop.push(...isl.population); }
        const allResults = await evaluateBatch(workers, allPop);

        // Split results back to islands
        for (let i = 0; i < NUM_ISLANDS; i++) {
            const start = offsets[i];
            islands[i].results = allResults.slice(start, start + ISLAND_SIZE);
            islands[i].fitnesses = islands[i].results.map(r => fitness(r));
        }

        const genTime = (Date.now() - genStart) / 1000;
        totalWallTime += genTime;

        // Find per-island best + update global best
        let globalImproved = false;
        for (let i = 0; i < NUM_ISLANDS; i++) {
            const isl = islands[i];
            let bestIdx = 0;
            for (let j = 1; j < isl.fitnesses.length; j++) { if (isl.fitnesses[j] > isl.fitnesses[bestIdx]) bestIdx = j; }
            if (isl.fitnesses[bestIdx] > isl.bestFitness) {
                isl.bestFitness = isl.fitnesses[bestIdx];
                isl.bestResult = isl.results[bestIdx];
                isl.bestIndividual = cloneIndividual(isl.population[bestIdx]);
                isl.stagnation = 0;
            } else {
                isl.stagnation++;
            }
            if (isl.bestFitness > globalBestFitness) {
                globalBestFitness = isl.bestFitness;
                globalBestResult = isl.bestResult;
                globalBestIndividual = cloneIndividual(isl.bestIndividual);
                globalBestIsland = i;
                globalImproved = true;
                gensSinceGlobalImprovement = 0;
                // Update hall of fame
                if (tryAddToHallOfFame(hallOfFame, isl.bestIndividual, isl.bestResult)) {
                    console.log(`  ${C.green}🏆 Hall of Fame updated (${hallOfFame.length} entries)${C.reset}`);
                }
            }
        }
        if (!globalImproved) gensSinceGlobalImprovement++;

        // Aggregate stats
        const allFitnesses = islands.flatMap(isl => isl.fitnesses);
        const allResultsFlat = islands.flatMap(isl => isl.results);
        const stats = computeStats(allFitnesses);
        const analysis = analyzeResults(allResultsFlat);
        cumulativeFrames += analysis.totalFrames;

        const fps = Math.round(cumulativeFrames / totalWallTime);
        const fpsStr = fps > 1000000 ? `${(fps/1000000).toFixed(1)}M` : fps > 1000 ? `${(fps/1000).toFixed(0)}k` : `${fps}`;
        const eta = formatTime((GENERATIONS - gen) * (totalWallTime / gen));
        const bestRating = rateResult(globalBestResult);

        // Island summary string
        const islSummary = islands.map((isl, i) => {
            const bx = isl.bestResult ? isl.bestResult.bestX : 0;
            const tag = i === globalBestIsland ? `${C.green}I${i}:${bx}${C.reset}` : `I${i}:${bx}`;
            return tag + (isl.stagnation > 0 ? `(${isl.stagnation})` : '');
        }).join(' ');

        // Log
        if (globalImproved) {
            const bestX = globalBestResult.bestX;
            const bar = makeProgressBar(bestX, LEVEL_WIDTH, 30);
            const pct = Math.min(100, (bestX / LEVEL_WIDTH * 100)).toFixed(0);
            const bd = fitnessBreakdown(globalBestResult);
            const { counts, avgDeadX } = analysis;
            const isBest = globalBestResult.completed;
            const tag = isBest ? `${C.green}★ NEW BEST [${bestRating}]${C.reset}` : `${C.yellow}▲ NEW RECORD [${bestRating}]${C.reset}`;

            console.log(`${C.yellow}Gen ${String(gen).padStart(4)}/${GENERATIONS}${C.reset} ${'─'.repeat(28)} ${genTime.toFixed(1)}s ${tag} ${C.dim}(I${globalBestIsland})${C.reset}`);
            console.log(`  ${C.bold}Best: ${formatFitness(globalBestResult)}${C.reset}`);
            console.log(`  ${C.magenta}Fitness: ${bd.total.toFixed(0)} = ${bd.dist} dist + ${bd.speedBonus.toFixed(0)} spd + ${bd.cpBonus.toFixed(0)} cp - ${bd.stuckPenalty.toFixed(0)} stk${C.reset}`);
            console.log(`  ${C.cyan}Splits: ${formatCheckpointSplits(globalBestResult)}${C.reset}`);
            console.log(`  ${C.cyan}${bar}${C.reset} ${pct}%  ${bestX}/${LEVEL_WIDTH} px`);

            const dp = [];
            if (counts.dead) dp.push(`${counts.dead}d(X:${avgDeadX})`);
            if (counts.stalled) dp.push(`${counts.stalled}s`);
            if (counts.completed) dp.push(`${C.green}${counts.completed}c${C.reset}`);
            console.log(`  ${dp.join(' │ ')} │ stk:${analysis.avgStuckFrames} │ ${fpsStr} f/s │ W:${workers.length}`);
            console.log(`  ${islSummary}`);
        } else {
            let line = `${C.dim}Gen ${String(gen).padStart(4)}/${GENERATIONS}${C.reset}`;
            line += ` │ Best: ${formatFitness(globalBestResult)} [${bestRating}]`;
            line += ` │ ${islSummary}`;
            line += ` │ ${genTime.toFixed(1)}s │ Stag:${gensSinceGlobalImprovement}`;
            console.log(line);
        }

        // Population health every 10 gens
        if (gen % 10 === 0) {
            const speeds = allResultsFlat.map(r => r.bestX / Math.max(r.frame, 1));
            const buckets = [0,0,0,0];
            for (const s of speeds) { if (s < 0.5) buckets[0]++; else if (s < 1.0) buckets[1]++; else if (s < 1.5) buckets[2]++; else buckets[3]++; }
            const stuckAvg = Math.round(allResultsFlat.reduce((a, r) => a + (r.stuckFrames || 0), 0) / allResultsFlat.length);
            console.log(`  ${C.blue}── Health: <0.5:${buckets[0]} 0.5-1:${buckets[1]} 1-1.5:${buckets[2]} >1.5:${buckets[3]} │ stk:${stuckAvg} │ ETA:${eta}${C.reset}`);
        }

        // Migration
        if (gen % MIGRATION_INTERVAL === 0 && gen > 0) {
            migrate(islands, C);
            console.log(`  ${C.magenta}🔄 Migration round (${MIGRATION_COUNT} per island)${C.reset}`);
        }

        currentGen = gen;
        saveBest(globalBestIndividual, globalBestResult);

        // Evolve each island (with reset for hopelessly stagnant ones)
        for (let i = 0; i < NUM_ISLANDS; i++) {
            const isl = islands[i];

            // Nuke island if stagnant too long — pure fresh randoms (find its own path)
            if (isl.stagnation >= ISLAND_RESET_THRESHOLD) {
                const oldBest = isl.bestResult ? isl.bestResult.bestX : 0;
                isl.population = [];
                while (isl.population.length < ISLAND_SIZE) isl.population.push(randomIndividual());
                isl.stagnation = 0;
                isl.bestFitness = -1;
                isl.bestResult = null;
                isl.bestIndividual = null;
                console.log(`  ${C.red}💥 Island ${i} RESET (was ${oldBest}px) — fresh randoms${C.reset}`);
                continue;
            }

            let mutRate = BASE_MUTATION_RATE;
            let divInject = BASE_DIVERSITY_INJECT;

            if (i === NUM_ISLANDS - 1) {
                // Last island: WILD — always high mutation, lots of earthquakes
                mutRate = 0.9;
                divInject = 15;
            } else if (isl.stagnation <= 5) mutRate = 0.3;
            else if (isl.stagnation <= 10) mutRate = 0.5;
            else if (isl.stagnation <= 20) { mutRate = 0.7; divInject = 10; }
            else { mutRate = 0.7; divInject = 15; }
            evolveIsland(isl, mutRate, divInject);
        }
    }

    console.log(`\n${C.cyan}══════════════════════════════════════${C.reset}`);
    console.log(`${C.bold}OPTIMIZATION COMPLETE${C.reset}`);
    console.log(`Best: ${formatFitness(globalBestResult)}`);
    console.log(`Splits: ${formatCheckpointSplits(globalBestResult)}`);
    console.log(`Total: ${formatTime(totalWallTime)} │ ${Math.round(cumulativeFrames / totalWallTime)} f/s`);
    saveBest(globalBestIndividual, globalBestResult);
    console.log(`Saved to: ${bestPath}`);
    workers.forEach(w => w.terminate());
    if (process.stdin.isTTY) process.stdin.setRawMode(false);
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });

} // end isMainThread
