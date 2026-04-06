#!/usr/bin/env node
// Mario Speedrun Optimizer — Genetic Algorithm + Headless NES
// Usage: node optimize.js
// Evolves input sequences for SMB1 World 1-1 to find the fastest completion.
// Output: best-sequence.json (loadable by marioBot.setSequence() in the browser)

import jsnes from 'jsnes';
const { NES, Controller } = jsnes;
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ==================== CONFIG ====================

const POPULATION_SIZE = 100;
const GENERATIONS = 500;
const ELITE_COUNT = 5;
const TOURNAMENT_SIZE = 5;
const CROSSOVER_RATE = 0.7;
const MUTATION_RATE = 0.4;
const SEGMENT_MUTATE_PROB = 0.2;
const MAX_SEGMENTS = 100;
const MIN_SEGMENT_DURATION = 3;
const MAX_SEGMENT_DURATION = 180;
const MAX_FRAMES = 8000;       // ~133 seconds at 60fps
const STALL_LIMIT = 180;       // frames without progress = abort
const SAVE_EVERY = 5;          // save best every N generations
const DIVERSITY_INJECT = 10;   // inject this many fresh randoms each generation

// ==================== ROM ====================

const romPath = path.join(__dirname, 'super-mario-bros-1.nes');
if (!fs.existsSync(romPath)) {
    console.error('ERROR: ROM not found at', romPath);
    process.exit(1);
}
const romData = fs.readFileSync(romPath);
const romString = Array.from(new Uint8Array(romData)).map(b => String.fromCharCode(b)).join('');

// ==================== NES HELPERS ====================

function createNES() {
    const nes = new NES({
        onFrame: () => {},
        onAudioSample: () => {},
        emulateSound: false,
    });
    nes.loadROM(romString);
    return nes;
}

function readRAM(nes, addr) {
    return nes.cpu.mem[addr];
}

function getMarioX(nes) {
    return readRAM(nes, 0x006D) * 256 + readRAM(nes, 0x0086);
}

function getTimer(nes) {
    return readRAM(nes, 0x07A0) * 100 + readRAM(nes, 0x07A1) * 10 + readRAM(nes, 0x07A2);
}

function isLevelComplete(nes) {
    // Flagpole slide state OR world/level changed from 1-1
    const floatState = readRAM(nes, 0x001D);
    if (floatState === 3) return true;
    // Also check if level advanced past 1-1
    const world = readRAM(nes, 0x075F);
    const level = readRAM(nes, 0x0760);
    if (world > 0 || level > 0) return true;
    return false;
}

function isDead(nes) {
    const playerState = readRAM(nes, 0x000E);
    // 0x0B = dying, 0x06 = dead
    if (playerState === 0x0B || playerState === 0x06) return true;
    // Fell below screen
    const yPos = readRAM(nes, 0x00CE);
    if (yPos > 240) return true;
    // Game over screen
    if (readRAM(nes, 0x0770) === 3) return true;
    return false;
}

// ==================== TITLE SCREEN SAVE STATE ====================

let gameplayState = null;

function createGameplayState() {
    console.log('Creating title screen save state...');
    const nes = createNES();

    // Advance past power-on + title screen
    for (let i = 0; i < 90; i++) nes.frame();

    // Press START
    nes.buttonDown(1, Controller.BUTTON_START);
    for (let i = 0; i < 2; i++) nes.frame();
    nes.buttonUp(1, Controller.BUTTON_START);

    // Wait until Mario is actually on screen and controllable
    // Mario spawns at X=40, Y=176 — wait for that, not just gameMode
    let ready = false;
    for (let i = 0; i < 400; i++) {
        nes.frame();
        const x = getMarioX(nes);
        const y = readRAM(nes, 0x00CE);
        const playerState = readRAM(nes, 0x000E);
        // Mario is ready when at starting position (x=40, y=176, playerState=0x08)
        if (x >= 40 && y === 176 && playerState === 0x08) {
            ready = true;
            break;
        }
    }

    if (!ready) {
        console.log('  WARNING: Could not detect Mario ready state, using fallback');
    }

    const startX = getMarioX(nes);
    const startY = readRAM(nes, 0x00CE);
    console.log(`  Save state created. Mario at X=${startX}, Y=${startY}`);

    // Deep copy to prevent mutation across simulations
    gameplayState = JSON.stringify(nes.toJSON());
    return gameplayState;
}

// ==================== BUTTON CONSTANTS ====================

// jsnes Controller constants
const BTN = {
    A: Controller.BUTTON_A,
    B: Controller.BUTTON_B,
    SELECT: Controller.BUTTON_SELECT,
    START: Controller.BUTTON_START,
    UP: Controller.BUTTON_UP,
    DOWN: Controller.BUTTON_DOWN,
    LEFT: Controller.BUTTON_LEFT,
    RIGHT: Controller.BUTTON_RIGHT,
};

// Buttons we use in gameplay (exclude START/SELECT)
const GAMEPLAY_BUTTONS = [BTN.A, BTN.B, BTN.UP, BTN.DOWN, BTN.LEFT, BTN.RIGHT];

// Button weights for random generation (biased toward useful inputs)
const BUTTON_WEIGHTS = [
    { btn: BTN.RIGHT, weight: 0.92 },
    { btn: BTN.B,     weight: 0.80 },
    { btn: BTN.A,     weight: 0.35 },
    { btn: BTN.LEFT,  weight: 0.03 },
    { btn: BTN.DOWN,  weight: 0.03 },
    { btn: BTN.UP,    weight: 0.02 },
];

// ==================== SEGMENT REPRESENTATION ====================

// Segment: { buttons: number[], duration: number }

function randomButtons() {
    const buttons = [];
    for (const { btn, weight } of BUTTON_WEIGHTS) {
        if (Math.random() < weight) buttons.push(btn);
    }
    // Always have at least RIGHT
    if (!buttons.includes(BTN.RIGHT) && Math.random() < 0.85) buttons.push(BTN.RIGHT);
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

// Seed individual: baseline "run right + periodic jumps" strategy
// Goomba #1 is at X≈312, Mario starts at X=40. At run speed ~2.5px/f = ~109f.
// Jump needs ~100f to clear it safely.
function seedIndividual() {
    const RB = [BTN.RIGHT, BTN.B];
    const RBA = [BTN.RIGHT, BTN.B, BTN.A];
    // Pattern: run, then jump periodically. Jumps every ~80-120 frames.
    const pattern = [
        { buttons: [...RB], duration: 95 },    // run toward first goomba
        { buttons: [...RBA], duration: 20 },    // jump over it
        { buttons: [...RB], duration: 70 },     // run
        { buttons: [...RBA], duration: 22 },    // jump
        { buttons: [...RB], duration: 60 },     // run
        { buttons: [...RBA], duration: 25 },    // jump (pipe)
        { buttons: [...RB], duration: 80 },     // run
        { buttons: [...RBA], duration: 20 },    // jump
        { buttons: [...RB], duration: 50 },     // run
        { buttons: [...RBA], duration: 25 },    // jump
        { buttons: [...RB], duration: 100 },    // run
        { buttons: [...RBA], duration: 22 },    // jump
        { buttons: [...RB], duration: 70 },     // run
        { buttons: [...RBA], duration: 20 },    // jump
        { buttons: [...RB], duration: 90 },     // run
        { buttons: [...RBA], duration: 25 },    // jump
    ];
    // Repeat to fill enough frames for the full level
    const segments = [];
    for (let i = 0; i < 4; i++) {
        for (const seg of pattern) segments.push({ buttons: [...seg.buttons], duration: seg.duration });
    }
    return segments;
}

// ==================== SIMULATION ====================

function simulate(segments) {
    const nes = createNES();
    nes.fromJSON(JSON.parse(gameplayState));

    let bestX = getMarioX(nes);
    let lastProgressFrame = 0;
    let completed = false;
    let completionFrame = 0;
    let frame = 0;

    // Convert segments to frame ranges
    let segIdx = 0;
    let segFrameStart = 0;
    let prevButtons = new Set();

    for (frame = 0; frame < MAX_FRAMES; frame++) {
        // Determine current segment
        if (segIdx < segments.length) {
            const seg = segments[segIdx];
            const segFrame = frame - segFrameStart;

            if (segFrame === 0) {
                // Transition: release old, press new
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
        } else {
            // Past all segments — release everything
            if (prevButtons.size > 0) {
                for (const b of prevButtons) nes.buttonUp(1, b);
                prevButtons = new Set();
            }
        }

        nes.frame();

        // Check state
        const x = getMarioX(nes);
        if (x > bestX) {
            bestX = x;
            lastProgressFrame = frame;
        }

        if (isLevelComplete(nes)) {
            completed = true;
            completionFrame = frame;
            break;
        }

        if (isDead(nes)) break;

        // Stall detection
        if (frame - lastProgressFrame > STALL_LIMIT) break;
    }

    return { bestX, completed, completionFrame, frame };
}

// ==================== FITNESS ====================

function fitness(result) {
    if (result.completed) {
        // Any completion >> any non-completion. Faster = higher score.
        return 100000 + (MAX_FRAMES - result.completionFrame);
    }
    return result.bestX;
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
    // Clamp length
    if (child.length > MAX_SEGMENTS) child.length = MAX_SEGMENTS;
    return child;
}

function mutate(individual) {
    const ind = cloneIndividual(individual);

    for (let i = 0; i < ind.length; i++) {
        if (Math.random() > SEGMENT_MUTATE_PROB) continue;

        const op = Math.random();

        if (op < 0.30) {
            // Duration jitter
            const delta = Math.floor(Math.random() * 30) - 15;
            ind[i].duration = Math.max(MIN_SEGMENT_DURATION, Math.min(MAX_SEGMENT_DURATION, ind[i].duration + delta));
        } else if (op < 0.55) {
            // Toggle a button
            const btn = GAMEPLAY_BUTTONS[Math.floor(Math.random() * GAMEPLAY_BUTTONS.length)];
            const idx = ind[i].buttons.indexOf(btn);
            if (idx >= 0) ind[i].buttons.splice(idx, 1);
            else ind[i].buttons.push(btn);
        } else if (op < 0.70) {
            // Split segment
            if (ind[i].duration > MIN_SEGMENT_DURATION * 2 && ind.length < MAX_SEGMENTS) {
                const splitAt = MIN_SEGMENT_DURATION + Math.floor(Math.random() * (ind[i].duration - MIN_SEGMENT_DURATION * 2));
                const newSeg = { buttons: [...ind[i].buttons], duration: ind[i].duration - splitAt };
                ind[i].duration = splitAt;
                ind.splice(i + 1, 0, newSeg);
            }
        } else if (op < 0.80) {
            // Merge with next
            if (i < ind.length - 1) {
                ind[i].duration += ind[i + 1].duration;
                ind[i].duration = Math.min(ind[i].duration, MAX_SEGMENT_DURATION);
                ind.splice(i + 1, 1);
            }
        } else if (op < 0.90) {
            // Insert random segment
            if (ind.length < MAX_SEGMENTS) {
                ind.splice(i, 0, randomSegment());
            }
        } else {
            // Delete segment
            if (ind.length > 5) {
                ind.splice(i, 1);
                i--;
            }
        }
    }

    return ind;
}

// ==================== OUTPUT CONVERSION ====================

// jsnes button IDs → bot.js button IDs
// jsnes: A=0, B=1, Select=2, Start=3, Up=4, Down=5, Left=6, Right=7
// bot.js: B=0, Select=2, Start=3, Up=4, Down=5, Left=6, Right=7, A=8
const JSNES_TO_BOT = { 0: 8, 1: 0, 2: 2, 3: 3, 4: 4, 5: 5, 6: 6, 7: 7 };

function segmentsToEvents(segments) {
    const events = [];
    let frame = 0;
    let prevButtons = new Set();

    for (const seg of segments) {
        const curButtons = new Set(seg.buttons);

        // Release buttons no longer held
        for (const btn of prevButtons) {
            if (!curButtons.has(btn)) {
                events.push([frame, JSNES_TO_BOT[btn], 0]);
            }
        }
        // Press new buttons
        for (const btn of curButtons) {
            if (!prevButtons.has(btn)) {
                events.push([frame, JSNES_TO_BOT[btn], 1]);
            }
        }

        frame += seg.duration;
        prevButtons = curButtons;
    }

    // Release all at end
    for (const btn of prevButtons) {
        events.push([frame, JSNES_TO_BOT[btn], 0]);
    }

    return events;
}

// ==================== FILE I/O ====================

const bestPath = path.join(__dirname, 'best-sequence.json');

function saveBest(individual, result) {
    const events = segmentsToEvents(individual);
    const data = {
        events,
        fitness: fitness(result),
        completed: result.completed,
        completionFrame: result.completionFrame,
        bestX: result.bestX,
        totalFrames: result.frame,
        timeSeconds: result.completed ? (result.completionFrame / 60.098).toFixed(2) : null,
    };
    fs.writeFileSync(bestPath, JSON.stringify(data, null, 2));
}

// ==================== DISPLAY ====================

function formatFitness(result) {
    if (result.completed) {
        const time = (result.completionFrame / 60.098).toFixed(1);
        return `\x1b[32mCOMPLETE ${result.completionFrame}f (${time}s)\x1b[0m`;
    }
    return `${result.bestX} px`;
}

function progressBar(fraction, width = 30) {
    const filled = Math.round(fraction * width);
    return '█'.repeat(filled) + '░'.repeat(width - filled);
}

// ==================== MAIN ====================

async function main() {
    console.log('╔══════════════════════════════════════════════╗');
    console.log('║   MARIO SPEEDRUN OPTIMIZER — Genetic Algo   ║');
    console.log('║   SMB1 World 1-1 · Headless jsnes           ║');
    console.log('╚══════════════════════════════════════════════╝');
    console.log();

    // Create save state
    createGameplayState();
    console.log();

    // Generate initial population
    console.log('Generating initial population...');
    let population = [];
    population.push(seedIndividual()); // seed strategy
    // Variations of the seed
    for (let i = 0; i < 9; i++) population.push(mutate(seedIndividual()));
    // Random individuals
    while (population.length < POPULATION_SIZE) population.push(randomIndividual());
    console.log(`  ${population.length} individuals ready`);
    console.log();

    let globalBestFitness = -1;
    let globalBestResult = null;
    let globalBestIndividual = null;

    // Graceful shutdown
    process.on('SIGINT', () => {
        console.log('\n\nInterrupted! Saving best sequence...');
        if (globalBestIndividual) {
            saveBest(globalBestIndividual, globalBestResult);
            console.log(`Saved to ${bestPath}`);
            console.log(`Best: ${formatFitness(globalBestResult)}`);
        }
        process.exit(0);
    });

    // Main GA loop
    for (let gen = 1; gen <= GENERATIONS; gen++) {
        const genStart = Date.now();

        // Evaluate
        const results = [];
        const fitnesses = [];
        for (let i = 0; i < population.length; i++) {
            const result = simulate(population[i]);
            results.push(result);
            fitnesses.push(fitness(result));
        }

        // Find best this generation
        let bestIdx = 0;
        for (let i = 1; i < fitnesses.length; i++) {
            if (fitnesses[i] > fitnesses[bestIdx]) bestIdx = i;
        }

        const bestResult = results[bestIdx];
        const bestFit = fitnesses[bestIdx];

        // Track global best
        let improved = false;
        if (bestFit > globalBestFitness) {
            globalBestFitness = bestFit;
            globalBestResult = bestResult;
            globalBestIndividual = cloneIndividual(population[bestIdx]);
            improved = true;
        }

        // Average fitness
        const avgFit = (fitnesses.reduce((a, b) => a + b, 0) / fitnesses.length).toFixed(0);
        const genTime = ((Date.now() - genStart) / 1000).toFixed(1);

        // Completions count
        const completions = results.filter(r => r.completed).length;

        // Progress display
        const genStr = String(gen).padStart(4);
        const maxStr = String(GENERATIONS);
        let line = `Gen ${genStr}/${maxStr} | Best: ${formatFitness(globalBestResult)} | Avg: ${avgFit} | ${genTime}s/gen`;
        if (completions > 0) line += ` | ${completions} completions`;
        if (improved) line += ' ★';
        console.log(line);

        // Save periodically
        if (improved || gen % SAVE_EVERY === 0) {
            saveBest(globalBestIndividual, globalBestResult);
        }

        // Build next generation
        // Sort indices by fitness descending
        const sortedIndices = fitnesses.map((f, i) => i).sort((a, b) => fitnesses[b] - fitnesses[a]);

        const nextPop = [];

        // Elitism
        for (let i = 0; i < ELITE_COUNT; i++) {
            nextPop.push(cloneIndividual(population[sortedIndices[i]]));
        }

        // Diversity injection: add fresh random individuals
        for (let i = 0; i < DIVERSITY_INJECT && nextPop.length < POPULATION_SIZE; i++) {
            nextPop.push(randomIndividual());
        }

        // Fill rest via crossover/mutation
        while (nextPop.length < POPULATION_SIZE) {
            const parentA = tournamentSelect(population, fitnesses);
            const parentB = tournamentSelect(population, fitnesses);

            let child;
            if (Math.random() < CROSSOVER_RATE) {
                child = crossover(parentA, parentB);
            } else {
                child = cloneIndividual(parentA);
            }

            if (Math.random() < MUTATION_RATE) {
                child = mutate(child);
            }

            nextPop.push(child);
        }

        population = nextPop;
    }

    // Final save
    console.log('\n══════════════════════════════════════');
    console.log('OPTIMIZATION COMPLETE');
    console.log(`Best: ${formatFitness(globalBestResult)}`);
    saveBest(globalBestIndividual, globalBestResult);
    console.log(`Saved to: ${bestPath}`);
    console.log('\nTo replay in browser:');
    console.log('  1. Open the Mario Bot page');
    console.log('  2. Click "LOAD BEST" to load and replay the optimized sequence');
}

main().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
