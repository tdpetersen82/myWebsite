#!/usr/bin/env node
// Mario Speedrun Optimizer — Genetic Algorithm + Headless NES
// Usage: node optimize.js
// Evolves input sequences for SMB1 World 1-1 to find the fastest completion.
// Output: best-sequence.json (loadable by marioBot.setSequence() in the browser)
//
// Uses worker_threads to run simulations across all CPU cores in parallel.

import fs from 'fs';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';
import { Worker, isMainThread, parentPort, workerData } from 'worker_threads';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ==================== CONFIG ====================

const POPULATION_SIZE = 200;
const GENERATIONS = 500;
const ELITE_COUNT = 10;
const TOURNAMENT_SIZE = 5;
const CROSSOVER_RATE = 0.7;
const MUTATION_RATE = 0.4;
const SEGMENT_MUTATE_PROB = 0.2;
const MAX_SEGMENTS = 100;
const MIN_SEGMENT_DURATION = 3;
const MAX_SEGMENT_DURATION = 180;
const MAX_FRAMES = 8000;       // ~133 seconds at 60fps
const STALL_LIMIT = 180;       // frames without progress = abort
const DIVERSITY_INJECT = 15;   // inject fresh randoms each generation
const NUM_WORKERS = Math.max(1, os.cpus().length - 1); // leave 1 core free

// ==================== BUTTON CONSTANTS ====================
// jsnes Controller button IDs (must match jsnes)
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

// jsnes button IDs → bot.js button IDs for output
const JSNES_TO_BOT = { 0: 8, 1: 0, 2: 2, 3: 3, 4: 4, 5: 5, 6: 6, 7: 7 };

// ================================================================
//  WORKER THREAD — runs simulations
// ================================================================
if (!isMainThread) {
    const { createRequire } = await import('module');
    const require = createRequire(import.meta.url);
    const jsnes = require('jsnes');
    const { NES, Controller } = jsnes;
    const { romString, saveStateStr } = workerData;

    function createNES() {
        const nes = new NES({ onFrame: () => {}, onAudioSample: () => {}, emulateSound: false });
        nes.loadROM(romString);
        return nes;
    }

    function simulate(segments) {
        const nes = createNES();
        nes.fromJSON(JSON.parse(saveStateStr));

        let bestX = nes.cpu.mem[0x006D] * 256 + nes.cpu.mem[0x0086];
        let lastProgressFrame = 0;
        let completed = false;
        let completionFrame = 0;
        let frame = 0;

        let segIdx = 0;
        let segFrameStart = 0;
        let prevButtons = new Set();

        for (frame = 0; frame < MAX_FRAMES; frame++) {
            if (segIdx < segments.length) {
                const seg = segments[segIdx];
                const segFrame = frame - segFrameStart;

                if (segFrame === 0) {
                    const curButtons = new Set(seg.buttons);
                    for (const b of prevButtons) {
                        if (!curButtons.has(b)) nes.buttonUp(1, b);
                    }
                    for (const b of curButtons) {
                        if (!prevButtons.has(b)) nes.buttonDown(1, b);
                    }
                    prevButtons = curButtons;
                }

                if (segFrame + 1 >= seg.duration) {
                    segIdx++;
                    segFrameStart = frame + 1;
                }
            } else if (prevButtons.size > 0) {
                for (const b of prevButtons) nes.buttonUp(1, b);
                prevButtons = new Set();
            }

            nes.frame();

            const x = nes.cpu.mem[0x006D] * 256 + nes.cpu.mem[0x0086];
            if (x > bestX) { bestX = x; lastProgressFrame = frame; }

            // Level complete?
            if (nes.cpu.mem[0x001D] === 3 || nes.cpu.mem[0x075F] > 0 || nes.cpu.mem[0x0760] > 0) {
                completed = true;
                completionFrame = frame;
                break;
            }

            // Dead?
            const ps = nes.cpu.mem[0x000E];
            if (ps === 0x0B || ps === 0x06 || nes.cpu.mem[0x00CE] > 240 || nes.cpu.mem[0x0770] === 3) break;

            // Stalled?
            if (frame - lastProgressFrame > STALL_LIMIT) break;
        }

        return { bestX, completed, completionFrame, frame };
    }

    // Listen for batches of individuals to evaluate
    parentPort.on('message', (batch) => {
        const results = batch.map(ind => simulate(ind));
        parentPort.postMessage(results);
    });

    // Signal ready
    parentPort.postMessage('ready');
}

// ================================================================
//  MAIN THREAD — GA logic + worker pool
// ================================================================
if (isMainThread) {

// ==================== ROM & SAVE STATE ====================

const romPath = path.join(__dirname, 'super-mario-bros-1.nes');
if (!fs.existsSync(romPath)) {
    console.error('ERROR: ROM not found at', romPath);
    process.exit(1);
}
const romData = fs.readFileSync(romPath);
const romString = Array.from(new Uint8Array(romData)).map(b => String.fromCharCode(b)).join('');

// ==================== SEGMENT HELPERS ====================

function randomButtons() {
    const buttons = [];
    for (const { btn, weight } of BUTTON_WEIGHTS) {
        if (Math.random() < weight) buttons.push(btn);
    }
    if (!buttons.includes(CBTNS.RIGHT) && Math.random() < 0.85) buttons.push(CBTNS.RIGHT);
    return buttons;
}

function randomDuration() {
    return MIN_SEGMENT_DURATION + Math.floor(Math.random() * (MAX_SEGMENT_DURATION - MIN_SEGMENT_DURATION));
}

function randomSegment() {
    return { buttons: randomButtons(), duration: randomDuration() };
}

function randomIndividual(numSegments) {
    const n = numSegments || (30 + Math.floor(Math.random() * 40));
    const segments = [];
    for (let i = 0; i < n; i++) segments.push(randomSegment());
    return segments;
}

function cloneIndividual(ind) {
    return ind.map(seg => ({ buttons: [...seg.buttons], duration: seg.duration }));
}

function seedIndividual() {
    const RB = [CBTNS.RIGHT, CBTNS.B];
    const RBA = [CBTNS.RIGHT, CBTNS.B, CBTNS.A];
    const pattern = [
        { buttons: [...RB], duration: 95 },
        { buttons: [...RBA], duration: 20 },
        { buttons: [...RB], duration: 70 },
        { buttons: [...RBA], duration: 22 },
        { buttons: [...RB], duration: 60 },
        { buttons: [...RBA], duration: 25 },
        { buttons: [...RB], duration: 80 },
        { buttons: [...RBA], duration: 20 },
        { buttons: [...RB], duration: 50 },
        { buttons: [...RBA], duration: 25 },
        { buttons: [...RB], duration: 100 },
        { buttons: [...RBA], duration: 22 },
        { buttons: [...RB], duration: 70 },
        { buttons: [...RBA], duration: 20 },
        { buttons: [...RB], duration: 90 },
        { buttons: [...RBA], duration: 25 },
    ];
    const segments = [];
    for (let i = 0; i < 4; i++) {
        for (const seg of pattern) segments.push({ buttons: [...seg.buttons], duration: seg.duration });
    }
    return segments;
}

// ==================== GENETIC OPERATORS ====================

function tournamentSelect(population, fitnesses) {
    let bestIdx = Math.floor(Math.random() * population.length);
    for (let i = 1; i < TOURNAMENT_SIZE; i++) {
        const idx = Math.floor(Math.random() * population.length);
        if (fitnesses[idx] > fitnesses[bestIdx]) bestIdx = idx;
    }
    return population[bestIdx];
}

function crossover(parentA, parentB) {
    if (parentA.length < 2 || parentB.length < 2) return cloneIndividual(parentA);
    const cutA = 1 + Math.floor(Math.random() * (parentA.length - 1));
    const cutB = 1 + Math.floor(Math.random() * (parentB.length - 1));
    const child = [
        ...parentA.slice(0, cutA).map(s => ({ buttons: [...s.buttons], duration: s.duration })),
        ...parentB.slice(cutB).map(s => ({ buttons: [...s.buttons], duration: s.duration })),
    ];
    if (child.length > MAX_SEGMENTS) child.length = MAX_SEGMENTS;
    return child;
}

function mutate(individual) {
    const ind = cloneIndividual(individual);
    for (let i = 0; i < ind.length; i++) {
        if (Math.random() > SEGMENT_MUTATE_PROB) continue;
        const op = Math.random();
        if (op < 0.30) {
            const delta = Math.floor(Math.random() * 30) - 15;
            ind[i].duration = Math.max(MIN_SEGMENT_DURATION, Math.min(MAX_SEGMENT_DURATION, ind[i].duration + delta));
        } else if (op < 0.55) {
            const btn = GAMEPLAY_BUTTONS[Math.floor(Math.random() * GAMEPLAY_BUTTONS.length)];
            const idx = ind[i].buttons.indexOf(btn);
            if (idx >= 0) ind[i].buttons.splice(idx, 1);
            else ind[i].buttons.push(btn);
        } else if (op < 0.70) {
            if (ind[i].duration > MIN_SEGMENT_DURATION * 2 && ind.length < MAX_SEGMENTS) {
                const splitAt = MIN_SEGMENT_DURATION + Math.floor(Math.random() * (ind[i].duration - MIN_SEGMENT_DURATION * 2));
                const newSeg = { buttons: [...ind[i].buttons], duration: ind[i].duration - splitAt };
                ind[i].duration = splitAt;
                ind.splice(i + 1, 0, newSeg);
            }
        } else if (op < 0.80) {
            if (i < ind.length - 1) {
                ind[i].duration += ind[i + 1].duration;
                ind[i].duration = Math.min(ind[i].duration, MAX_SEGMENT_DURATION);
                ind.splice(i + 1, 1);
            }
        } else if (op < 0.90) {
            if (ind.length < MAX_SEGMENTS) ind.splice(i, 0, randomSegment());
        } else {
            if (ind.length > 5) { ind.splice(i, 1); i--; }
        }
    }
    return ind;
}

function fitness(result) {
    if (result.completed) return 100000 + (MAX_FRAMES - result.completionFrame);
    return result.bestX;
}

// ==================== OUTPUT ====================

const bestPath = path.join(__dirname, 'best-sequence.json');

function segmentsToEvents(segments) {
    const events = [];
    let frame = 0;
    let prevButtons = new Set();
    for (const seg of segments) {
        const curButtons = new Set(seg.buttons);
        for (const btn of prevButtons) {
            if (!curButtons.has(btn)) events.push([frame, JSNES_TO_BOT[btn], 0]);
        }
        for (const btn of curButtons) {
            if (!prevButtons.has(btn)) events.push([frame, JSNES_TO_BOT[btn], 1]);
        }
        frame += seg.duration;
        prevButtons = curButtons;
    }
    for (const btn of prevButtons) events.push([frame, JSNES_TO_BOT[btn], 0]);
    return events;
}

function saveBest(individual, result) {
    const events = segmentsToEvents(individual);
    fs.writeFileSync(bestPath, JSON.stringify({
        events,
        fitness: fitness(result),
        completed: result.completed,
        completionFrame: result.completionFrame,
        bestX: result.bestX,
        totalFrames: result.frame,
        timeSeconds: result.completed ? (result.completionFrame / 60.098).toFixed(2) : null,
    }, null, 2));
}

function formatFitness(result) {
    if (result.completed) {
        const time = (result.completionFrame / 60.098).toFixed(1);
        return `\x1b[32mCOMPLETE ${result.completionFrame}f (${time}s)\x1b[0m`;
    }
    return `${result.bestX} px`;
}

// ==================== WORKER POOL ====================

async function createWorkerPool(romString, saveStateStr) {
    const workers = [];
    const thisFile = fileURLToPath(import.meta.url);

    for (let i = 0; i < NUM_WORKERS; i++) {
        const w = new Worker(thisFile, {
            workerData: { romString, saveStateStr },
        });
        // Wait for ready signal
        await new Promise(resolve => {
            w.once('message', (msg) => {
                if (msg === 'ready') resolve();
            });
        });
        workers.push(w);
    }
    return workers;
}

function evaluateBatch(workers, population) {
    return new Promise((resolve) => {
        const results = new Array(population.length);
        const chunkSize = Math.ceil(population.length / workers.length);
        let completed = 0;

        workers.forEach((worker, wi) => {
            const start = wi * chunkSize;
            const end = Math.min(start + chunkSize, population.length);
            if (start >= population.length) {
                completed++;
                if (completed === workers.length) resolve(results);
                return;
            }

            const batch = population.slice(start, end);
            worker.once('message', (batchResults) => {
                for (let i = 0; i < batchResults.length; i++) {
                    results[start + i] = batchResults[i];
                }
                completed++;
                if (completed === workers.length) resolve(results);
            });
            worker.postMessage(batch);
        });
    });
}

// ==================== MAIN ====================

async function main() {
    console.log('╔══════════════════════════════════════════════╗');
    console.log('║   MARIO SPEEDRUN OPTIMIZER — Genetic Algo   ║');
    console.log('║   SMB1 World 1-1 · Headless jsnes           ║');
    console.log('╚══════════════════════════════════════════════╝');
    console.log();

    console.log('Creating title screen save state...');
    // Import jsnes in main thread via createRequire (CommonJS compat)
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
    for (let i = 0; i < 400; i++) {
        nes.frame();
        const x = nes.cpu.mem[0x006D] * 256 + nes.cpu.mem[0x0086];
        if (x >= 40 && nes.cpu.mem[0x00CE] === 176 && nes.cpu.mem[0x000E] === 0x08) break;
    }
    const saveStateStr = JSON.stringify(nes.toJSON());
    console.log(`  Mario at X=${nes.cpu.mem[0x006D]*256+nes.cpu.mem[0x0086]}, Y=${nes.cpu.mem[0x00CE]}`);
    console.log();

    console.log(`Spawning ${NUM_WORKERS} worker threads...`);
    const workers = await createWorkerPool(romString, saveStateStr);
    console.log(`  ${workers.length} workers ready`);
    console.log();

    // Generate initial population
    console.log(`Generating population of ${POPULATION_SIZE}...`);
    let population = [];
    population.push(seedIndividual());
    for (let i = 0; i < 9; i++) population.push(mutate(seedIndividual()));
    while (population.length < POPULATION_SIZE) population.push(randomIndividual());
    console.log();

    let globalBestFitness = -1;
    let globalBestResult = null;
    let globalBestIndividual = null;

    let sigCount = 0;
    process.on('SIGINT', () => {
        sigCount++;
        if (sigCount > 1) process.exit(1); // force kill on second Ctrl+C
        console.log('\n\nInterrupted! Saving best sequence... (Ctrl+C again to force quit)');
        if (globalBestIndividual) {
            saveBest(globalBestIndividual, globalBestResult);
            console.log(`Saved to ${bestPath}`);
            console.log(`Best: ${formatFitness(globalBestResult)}`);
        }
        for (const w of workers) w.terminate();
        setTimeout(() => process.exit(0), 200);
    });

    // Main GA loop
    for (let gen = 1; gen <= GENERATIONS; gen++) {
        const genStart = Date.now();

        // Evaluate entire population in parallel across workers
        const results = await evaluateBatch(workers, population);
        const fitnesses = results.map(r => fitness(r));

        // Find best
        let bestIdx = 0;
        for (let i = 1; i < fitnesses.length; i++) {
            if (fitnesses[i] > fitnesses[bestIdx]) bestIdx = i;
        }

        let improved = false;
        if (fitnesses[bestIdx] > globalBestFitness) {
            globalBestFitness = fitnesses[bestIdx];
            globalBestResult = results[bestIdx];
            globalBestIndividual = cloneIndividual(population[bestIdx]);
            improved = true;
        }

        const avgFit = (fitnesses.reduce((a, b) => a + b, 0) / fitnesses.length).toFixed(0);
        const genTime = ((Date.now() - genStart) / 1000).toFixed(1);
        const completions = results.filter(r => r.completed).length;

        let line = `Gen ${String(gen).padStart(4)}/${GENERATIONS} | Best: ${formatFitness(globalBestResult)} | Avg: ${avgFit} | ${genTime}s/gen`;
        if (completions > 0) line += ` | ${completions} completions`;
        if (improved) line += ' ★';
        console.log(line);

        saveBest(globalBestIndividual, globalBestResult);

        // Build next generation
        const sortedIndices = fitnesses.map((f, i) => i).sort((a, b) => fitnesses[b] - fitnesses[a]);
        const nextPop = [];

        for (let i = 0; i < ELITE_COUNT; i++) {
            nextPop.push(cloneIndividual(population[sortedIndices[i]]));
        }

        for (let i = 0; i < DIVERSITY_INJECT && nextPop.length < POPULATION_SIZE; i++) {
            nextPop.push(randomIndividual());
        }

        while (nextPop.length < POPULATION_SIZE) {
            const parentA = tournamentSelect(population, fitnesses);
            const parentB = tournamentSelect(population, fitnesses);
            let child;
            if (Math.random() < CROSSOVER_RATE) child = crossover(parentA, parentB);
            else child = cloneIndividual(parentA);
            if (Math.random() < MUTATION_RATE) child = mutate(child);
            nextPop.push(child);
        }

        population = nextPop;
    }

    console.log('\n══════════════════════════════════════');
    console.log('OPTIMIZATION COMPLETE');
    console.log(`Best: ${formatFitness(globalBestResult)}`);
    saveBest(globalBestIndividual, globalBestResult);
    console.log(`Saved to: ${bestPath}`);
    workers.forEach(w => w.terminate());
}

main().catch(err => { console.error('Fatal error:', err); process.exit(1); });

} // end isMainThread
