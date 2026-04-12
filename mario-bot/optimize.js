#!/usr/bin/env node
// Mario NEAT — Neuroevolution of Augmenting Topologies
// Networks start with zero hidden neurons and grow to fit the problem.
// See GOAL.md for what we're building, FAILED-APPROACHES.md for what doesn't work.
// Usage: node optimize.js
// Press +/- to add/remove worker threads.

import fs from 'fs';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';
import { Worker, isMainThread, parentPort, workerData } from 'worker_threads';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ==================== CONFIG ====================

const MAX_FRAMES = 8000;
const STALL_FRAMES = 60;          // 1 second — enough to try jumping, fast enough to cycle generations
const LEVEL_WIDTH = 3200;
const NUM_WORKERS = Math.max(1, os.cpus().length - 1);
const POPULATION_SIZE = 300;
const NUM_INPUTS = 156;           // 5 mario + 140 tiles + 10 enemies + 1 timer
const NUM_OUTPUTS = 6;            // RIGHT, LEFT, A, B, UP, DOWN
const HOF_SIZE = 10;

// Speciation (MarI/O parameters)
const DELTA_DISJOINT = 2.0;      // weight for structural differences
const DELTA_WEIGHTS = 0.4;       // weight for connection weight differences
const DELTA_THRESHOLD = 10.0;    // compatibility distance — high because empty genomes with random connections are very different
const STALE_SPECIES = 15;        // kill species with no improvement in N gens

// ==================== BUTTON CONSTANTS ====================

const CBTNS = { A: 0, B: 1, SELECT: 2, START: 3, UP: 4, DOWN: 5, LEFT: 6, RIGHT: 7 };
const BIT = { A: 1, B: 2, SELECT: 4, START: 8, UP: 16, DOWN: 32, LEFT: 64, RIGHT: 128 };
const BIT_TO_JSNES = [CBTNS.A, CBTNS.B, CBTNS.SELECT, CBTNS.START, CBTNS.UP, CBTNS.DOWN, CBTNS.LEFT, CBTNS.RIGHT];
const JSNES_TO_BOT = { 0: 8, 1: 0, 2: 2, 3: 3, 4: 4, 5: 5, 6: 6, 7: 7 };
const BUTTON_BITS = [BIT.RIGHT, BIT.LEFT, BIT.A, BIT.B, BIT.UP, BIT.DOWN];

// ================================================================
//  Monkey-patch jsnes for lite save states
// ================================================================
function patchJsnesLite(jsnes) {
    const origNEStoJSON = jsnes.NES.prototype.toJSON;
    const origNESfromJSON = jsnes.NES.prototype.fromJSON;

    jsnes.NES.prototype.toJSONLite = function() {
        const state = origNEStoJSON.call(this);
        delete state.romData;
        if (state.ppu) {
            delete state.ppu.buffer;
            delete state.ppu.bgbuffer;
            delete state.ppu.pixrendered;
        }
        return state;
    };

    jsnes.NES.prototype.fromJSONLite = function(state) {
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
//  Read game state — 156 raw inputs, no precomputation
// ================================================================

function readNetworkInputs(nes) {
    const mem = nes.cpu.mem;
    const inputs = new Float32Array(NUM_INPUTS);
    const EMPTY_TILE = 0x24;
    let idx = 0;

    // === Mario state (5) ===
    const marioX = mem[0x006D] * 256 + mem[0x0086];
    const marioY = mem[0x00CE];
    let velX = mem[0x0057]; if (velX > 127) velX -= 256;
    let velY = mem[0x009F]; if (velY > 127) velY -= 256;

    inputs[idx++] = marioY / 240;
    inputs[idx++] = Math.max(0, Math.min(1, (velX + 5) / 50));
    inputs[idx++] = Math.max(0, Math.min(1, (velY + 5) / 10));
    inputs[idx++] = (mem[0x009F] === 0 && marioY >= 160) ? 1 : 0;
    inputs[idx++] = mem[0x0756] > 0 ? 1 : 0;

    // === Raw tiles: 10 columns × 14 rows (140) ===
    for (let r = 14; r <= 27; r++) {
        for (let c = 1; c <= 10; c++) {
            const worldX = marioX + c * 16;
            const page = Math.floor(worldX / 256);
            const localX = worldX % 256;
            const tileCol = Math.floor(localX / 8);
            const nt = nes.ppu.nameTable[page % 2];
            const tile = nt ? nt.tile[r * 32 + tileCol] : 0;
            inputs[idx++] = (tile !== 0x24 && tile !== 0x00) ? 1 : 0;
        }
    }

    // === Raw enemies: 5 slots × (relX, relY) (10) ===
    const ENEMY_SCREEN_X = [0x0087, 0x008B, 0x008F, 0x0093, 0x0097];
    for (let e = 0; e < 5; e++) {
        if (mem[0x000F + e] !== 0) {
            const eX = mem[0x006E + e] * 256 + mem[ENEMY_SCREEN_X[e]];
            const eY = mem[0x00CF + e];
            inputs[idx++] = Math.max(0, Math.min(1, (eX - marioX + 128) / 384));
            inputs[idx++] = Math.max(0, Math.min(1, eY / 240));
        } else {
            inputs[idx++] = 0;
            inputs[idx++] = 0;
        }
    }

    // === Game timer (1) ===
    const timer = ((mem[0x07F8] >> 4) * 10 + (mem[0x07F8] & 0xF)) * 100
                + ((mem[0x07F9] >> 4) * 10 + (mem[0x07F9] & 0xF)) * 10
                + ((mem[0x07FA] >> 4) * 10 + (mem[0x07FA] & 0xF));
    inputs[idx++] = timer / 400;

    for (let i = 0; i < NUM_INPUTS; i++) {
        if (!isFinite(inputs[i])) inputs[i] = 0;
    }
    return inputs;
}

// ================================================================
//  WORKER THREAD
// ================================================================
if (!isMainThread) {
    const { createRequire } = await import('module');
    const require = createRequire(import.meta.url);
    const jsnes = require('jsnes');
    const neataptic = require('neataptic');
    const { NES } = jsnes;
    const { Network } = neataptic;
    const { romString, saveStateStr } = workerData;

    patchJsnesLite(jsnes);

    const saveState = JSON.parse(saveStateStr);
    const nes = new NES({ onFrame: () => {}, onAudioSample: () => {}, emulateSound: false });
    nes.loadROM(romString);

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
            tile: nt.tile.slice(), attrib: nt.attrib.slice(),
        }));
        ppu.ptTile = s.ppu.ptTile.map(t => ({
            opaque: t.opaque.slice(), pix: t.pix.slice(),
        }));
        return { romData: s.romData, cpu, mmap: Object.assign({}, s.mmap), ppu };
    }

    function evaluateGenome(genomeJSON) {
        const network = Network.fromJSON(genomeJSON);

        nes.fromJSONLite(fastCloneState(saveState));
        const startX = nes.cpu.mem[0x006D] * 256 + nes.cpu.mem[0x0086];
        let bestX = startX;
        let lastProgressFrame = 0;
        let prevBitmask = 0;
        let frame = 0;
        let reason = 'timeout';
        let completed = false;

        for (frame = 0; frame < MAX_FRAMES; frame++) {
            // Read inputs and activate network
            const inputs = readNetworkInputs(nes);
            const outputs = network.noTraceActivate(Array.from(inputs));

            // Convert outputs to button bitmask (threshold 0.5)
            let mask = 0;
            for (let i = 0; i < NUM_OUTPUTS; i++) {
                if (outputs[i] > 0.5) mask |= BUTTON_BITS[i];
            }
            if ((mask & BIT.LEFT) && (mask & BIT.RIGHT)) mask &= ~BIT.LEFT;

            // Apply buttons
            if (mask !== prevBitmask) {
                const changed = mask ^ prevBitmask;
                for (let bit = 0; bit < 8; bit++) {
                    if (changed & (1 << bit)) {
                        if (mask & (1 << bit)) nes.buttonDown(1, BIT_TO_JSNES[bit]);
                        else nes.buttonUp(1, BIT_TO_JSNES[bit]);
                    }
                }
                prevBitmask = mask;
            }

            // Step emulator
            nes.frame();

            // Check progress
            const x = nes.cpu.mem[0x006D] * 256 + nes.cpu.mem[0x0086];
            if (x > bestX) { bestX = x; lastProgressFrame = frame; }

            // Level complete?
            if (nes.cpu.mem[0x001D] === 3 || nes.cpu.mem[0x075F] > 0 || nes.cpu.mem[0x0760] > 0) {
                completed = true; reason = 'completed'; break;
            }
            // Dead?
            const ps = nes.cpu.mem[0x000E];
            if (ps === 0x0B || ps === 0x06 || nes.cpu.mem[0x00CE] > 240 || nes.cpu.mem[0x0770] === 3) {
                reason = 'dead'; break;
            }
            // Stalled?
            if (frame - lastProgressFrame > STALL_FRAMES) { reason = 'stalled'; break; }
        }

        // Fitness: rightmost position - time penalty. Completion bonus.
        let fitness = bestX - startX;
        if (frame > 0) fitness -= frame * 0.5;  // MarI/O style: penalize time
        if (completed) fitness += 1000;

        return { fitness, bestX, frame, reason, completed };
    }

    parentPort.on('message', (msg) => {
        if (msg.type === 'evaluate') {
            const results = msg.genomes.map(g => evaluateGenome(g));
            parentPort.postMessage({ type: 'results', results });
            return;
        }
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

const bestPath = path.join(__dirname, 'best-sequence.json');
const saveStatePath = path.join(__dirname, 'save-state.json');
const hofPath = path.join(__dirname, 'hall-of-fame.json');
const neatStatePath = path.join(__dirname, 'neat-state.json');

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

function evaluateBatch(workers, genomeJSONs) {
    return new Promise((resolve) => {
        const allResults = new Array(genomeJSONs.length);
        const chunkSize = Math.ceil(genomeJSONs.length / workers.length);
        let completed = 0;

        workers.forEach((worker, wi) => {
            const start = wi * chunkSize;
            const end = Math.min(start + chunkSize, genomeJSONs.length);
            if (start >= genomeJSONs.length) {
                completed++;
                if (completed === workers.length) resolve(allResults);
                return;
            }
            const batch = genomeJSONs.slice(start, end);
            worker.once('message', (msg) => {
                for (let i = 0; i < msg.results.length; i++) {
                    allResults[start + i] = msg.results[i];
                }
                completed++;
                if (completed === workers.length) resolve(allResults);
            });
            worker.postMessage({ type: 'evaluate', genomes: batch });
        });
    });
}

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

// ==================== SPECIATION ====================
// MarI/O-style: group similar genomes, protect innovation, breed within species

function genomeDistance(g1, g2) {
    // Build connection maps by innovation-like key (from→to)
    const conns1 = new Map();
    for (const c of g1.connections) conns1.set(`${c.from}→${c.to}`, c.weight);
    const conns2 = new Map();
    for (const c of g2.connections) conns2.set(`${c.from}→${c.to}`, c.weight);

    // Count disjoint (in one but not the other)
    let disjoint = 0;
    let matching = 0;
    let weightDiff = 0;

    for (const key of conns1.keys()) {
        if (conns2.has(key)) {
            matching++;
            weightDiff += Math.abs(conns1.get(key) - conns2.get(key));
        } else {
            disjoint++;
        }
    }
    for (const key of conns2.keys()) {
        if (!conns1.has(key)) disjoint++;
    }

    const n = Math.max(conns1.size, conns2.size, 1);
    const avgWeight = matching > 0 ? weightDiff / matching : 0;

    return DELTA_DISJOINT * (disjoint / n) + DELTA_WEIGHTS * avgWeight;
}

function assignSpecies(population, speciesList) {
    // Clear members from all species
    for (const sp of speciesList) sp.members = [];

    for (const genome of population) {
        let placed = false;
        for (const sp of speciesList) {
            if (sp.representative && genomeDistance(genome.toJSON(), sp.representative) < DELTA_THRESHOLD) {
                sp.members.push(genome);
                placed = true;
                break;
            }
        }
        if (!placed) {
            // New species
            speciesList.push({
                representative: genome.toJSON(),
                members: [genome],
                bestFitness: -Infinity,
                staleness: 0,
            });
        }
    }

    // Remove empty species
    for (let i = speciesList.length - 1; i >= 0; i--) {
        if (speciesList[i].members.length === 0) speciesList.splice(i, 1);
    }

    // Update representatives (random member from each species)
    for (const sp of speciesList) {
        sp.representative = sp.members[Math.floor(Math.random() * sp.members.length)].toJSON();
    }
}

function cullAndAllocate(speciesList, popsize, Network, methods) {
    // Update staleness
    for (const sp of speciesList) {
        const best = Math.max(...sp.members.map(g => g.score || 0));
        if (best > sp.bestFitness) {
            sp.bestFitness = best;
            sp.staleness = 0;
        } else {
            sp.staleness++;
        }
    }

    // Kill stale species (keep at least 1)
    if (speciesList.length > 1) {
        for (let i = speciesList.length - 1; i >= 0; i--) {
            if (speciesList[i].staleness >= STALE_SPECIES && speciesList.length > 1) {
                speciesList.splice(i, 1);
            }
        }
    }

    // Calculate average fitness per species (using global rank)
    // Rank all genomes globally
    const allGenomes = speciesList.flatMap(sp => sp.members);
    allGenomes.sort((a, b) => (a.score || 0) - (b.score || 0));
    for (let i = 0; i < allGenomes.length; i++) allGenomes[i]._globalRank = i + 1;

    // Species average = sum of member ranks / member count
    for (const sp of speciesList) {
        sp.avgRank = sp.members.reduce((sum, g) => sum + (g._globalRank || 0), 0) / sp.members.length;
    }
    const totalAvg = speciesList.reduce((sum, sp) => sum + sp.avgRank, 0);

    // Allocate breeding slots proportional to species avg rank
    const newPop = [];

    for (const sp of speciesList) {
        // Sort species members by fitness
        sp.members.sort((a, b) => (b.score || 0) - (a.score || 0));

        // Elite: keep best of each species
        if (sp.members.length > 0) {
            newPop.push(sp.members[0]); // species champion
        }

        // Breeding slots for this species
        const slots = Math.floor((sp.avgRank / totalAvg) * popsize) - 1;
        for (let i = 0; i < slots && newPop.length < popsize; i++) {
            if (sp.members.length === 1) {
                // Clone and mutate
                const child = Network.fromJSON(sp.members[0].toJSON());
                child.mutate(methods.mutation.FFW);
                newPop.push(child);
            } else {
                // Crossover within species
                const p1 = sp.members[Math.floor(Math.random() * Math.min(5, sp.members.length))];
                const p2 = sp.members[Math.floor(Math.random() * sp.members.length)];
                try {
                    const child = Network.crossOver(p1, p2, p1.score >= p2.score);
                    if (Math.random() < 0.8) child.mutate(methods.mutation.FFW);
                    newPop.push(child);
                } catch(e) {
                    // Fallback: clone and mutate
                    const child = Network.fromJSON(p1.toJSON());
                    child.mutate(methods.mutation.FFW);
                    newPop.push(child);
                }
            }
        }
    }

    // Fill remaining with offspring from best species
    while (newPop.length < popsize) {
        const bestSpecies = speciesList.reduce((a, b) => a.avgRank > b.avgRank ? a : b);
        const parent = bestSpecies.members[Math.floor(Math.random() * Math.min(5, bestSpecies.members.length))];
        const child = Network.fromJSON(parent.toJSON());
        child.mutate(methods.mutation.FFW);
        newPop.push(child);
    }

    return newPop;
}

// ==================== HELPERS ====================

function makeProgressBar(x, maxX, w) {
    const r = Math.min(x / maxX, 1); const f = Math.round(r * w);
    return '[' + '\u2588'.repeat(Math.max(0, f - 1)) + (f > 0 ? '\u2592' : '') + '\u2591'.repeat(w - f) + ']';
}
function formatTime(s) { if (s < 60) return `${s.toFixed(0)}s`; return `${Math.floor(s/60)}m ${Math.round(s%60)}s`; }

// ==================== MAIN ====================

async function main() {
    const C = { reset: '\x1b[0m', dim: '\x1b[2m', bold: '\x1b[1m', red: '\x1b[31m', green: '\x1b[32m', yellow: '\x1b[33m', blue: '\x1b[34m', magenta: '\x1b[35m', cyan: '\x1b[36m' };

    console.log(`${C.cyan}\u2554${'═'.repeat(54)}\u2557${C.reset}`);
    console.log(`${C.cyan}\u2551   MARIO NEAT \u2014 Neuroevolution of Augmenting Topologies   \u2551${C.reset}`);
    console.log(`${C.cyan}\u2551   Networks grow from zero to fit the problem             \u2551${C.reset}`);
    console.log(`${C.cyan}\u255a${'═'.repeat(54)}\u255d${C.reset}`);
    console.log();

    console.log('Creating title screen save state...');
    const { createRequire } = await import('module');
    const require = createRequire(import.meta.url);
    const jsnes = require('jsnes');
    const neataptic = require('neataptic');
    const { Neat, Network, methods } = neataptic;
    const { NES, Controller } = jsnes;

    patchJsnesLite(jsnes);

    const nes = new NES({ onFrame: () => {}, onAudioSample: () => {}, emulateSound: false });
    nes.loadROM(romString);
    for (let i = 0; i < 90; i++) nes.frame();
    nes.buttonDown(1, Controller.BUTTON_START);
    for (let i = 0; i < 2; i++) nes.frame();
    nes.buttonUp(1, Controller.BUTTON_START);
    for (let i = 0; i < 200; i++) nes.frame();
    const saveStateStr = JSON.stringify(nes.toJSONLite());
    console.log(`  Mario at X=${nes.cpu.mem[0x006D]*256+nes.cpu.mem[0x0086]}, Y=${nes.cpu.mem[0x00CE]}`);
    fs.writeFileSync(saveStatePath, saveStateStr);
    console.log();

    console.log(`Spawning ${NUM_WORKERS} worker threads...`);
    const workers = await createWorkerPool(romString, saveStateStr, NUM_WORKERS);
    console.log(`  ${workers.length} workers ready\n`);

    // Create NEAT population — start empty, each gets random connections
    function createEmptyGenome() {
        const net = new Network(NUM_INPUTS, NUM_OUTPUTS);
        net.connections = [];
        net.selfconns = [];
        net.gates = [];
        for (const node of net.nodes) {
            node.connections = { in: [], out: [], gated: [], self: { weight: 0, gater: null, from: node, to: node } };
        }
        for (let i = 0; i < 5; i++) {
            try { net.mutate(methods.mutation.ADD_CONN); } catch(e) {}
        }
        return net;
    }

    const initialPop = [];
    for (let i = 0; i < POPULATION_SIZE; i++) initialPop.push(createEmptyGenome());

    const neat = new Neat(NUM_INPUTS, NUM_OUTPUTS, null, {
        popsize: POPULATION_SIZE,
        elitism: 0, // we handle elitism via species champions
        mutationRate: 0.5,
        mutationAmount: 3,
        mutation: methods.mutation.FFW,
    });
    neat.population = initialPop;
    let speciesList = [];

    console.log(`${C.cyan}=== NEAT TRAINING ===${C.reset}`);
    console.log(`${C.dim}Population: ${POPULATION_SIZE} | Inputs: ${NUM_INPUTS} | Outputs: ${NUM_OUTPUTS} | Speciation: δ=${DELTA_THRESHOLD} stale=${STALE_SPECIES}${C.reset}`);
    console.log(`${C.dim}Stall timeout: ${STALL_FRAMES} frames | Max frames: ${MAX_FRAMES}${C.reset}`);
    console.log();

    let bestEverX = 0;
    let bestEverFitness = -Infinity;
    let bestEverGenome = null;
    const startTime = Date.now();

    function saveNeatState(gen) {
        const state = {
            generation: gen,
            bestEverX,
            bestEverFitness,
            bestEverGenome,
            population: neat.population.map(g => g.toJSON()),
            species: speciesList.map(sp => ({
                representative: sp.representative,
                bestFitness: sp.bestFitness,
                staleness: sp.staleness,
            })),
        };
        fs.writeFileSync(neatStatePath, JSON.stringify(state));
    }

    // Try loading saved state
    let startGen = 1;
    if (fs.existsSync(neatStatePath)) {
        try {
            const saved = JSON.parse(fs.readFileSync(neatStatePath, 'utf8'));
            if (saved.population && saved.population.length > 0) {
                neat.population = saved.population.map(g => Network.fromJSON(g));
                startGen = (saved.generation || 0) + 1;
                bestEverX = saved.bestEverX || 0;
                bestEverFitness = saved.bestEverFitness || -Infinity;
                bestEverGenome = saved.bestEverGenome || null;
                if (saved.species) {
                    speciesList = saved.species.map(sp => ({
                        representative: sp.representative,
                        members: [],
                        bestFitness: sp.bestFitness || -Infinity,
                        staleness: sp.staleness || 0,
                    }));
                }
                console.log(`${C.green}Resumed from gen ${startGen - 1} | best: ${bestEverX}px | pop: ${neat.population.length} | species: ${speciesList.length}${C.reset}\n`);
            }
        } catch(e) { console.log(`${C.dim}Could not load neat-state.json, starting fresh${C.reset}\n`); }
    }

    // SIGINT handler
    let sigCount = 0;
    process.on('SIGINT', () => {
        sigCount++;
        if (sigCount > 1) process.exit(1);
        console.log('\n\nInterrupted! Saving...');
        saveNeatState(startGen);
        if (bestEverGenome) {
            console.log(`Saved gen ${startGen} | best: ${bestEverX}px`);
        }
        workers.forEach(w => w.terminate());
        if (process.stdin.isTTY) process.stdin.setRawMode(false);
        setTimeout(() => process.exit(0), 200);
    });

    // ==================== EVOLUTION LOOP ====================
    for (let gen = startGen; ; gen++) {
        const genStart = Date.now();

        // 1. Serialize all genomes
        const genomeJSONs = neat.population.map(g => g.toJSON());

        // 2. Evaluate in parallel across workers
        const results = await evaluateBatch(workers, genomeJSONs);

        // 3. Assign fitness scores
        let genBestX = 0;
        let genBestIdx = 0;
        let genCompletions = 0;
        let genAvgX = 0;
        let totalFrames = 0;

        for (let i = 0; i < POPULATION_SIZE; i++) {
            neat.population[i].score = results[i].fitness;
            genAvgX += results[i].bestX;
            totalFrames += results[i].frame;
            if (results[i].completed) genCompletions++;
            if (results[i].bestX > genBestX) {
                genBestX = results[i].bestX;
                genBestIdx = i;
            }
        }
        genAvgX = Math.round(genAvgX / POPULATION_SIZE);

        // Track best ever
        let newBest = false;
        if (genBestX > bestEverX) {
            bestEverX = genBestX;
            bestEverFitness = results[genBestIdx].fitness;
            bestEverGenome = neat.population[genBestIdx].toJSON();
            newBest = true;
        }

        // 4. Speciation: assign genomes to species
        assignSpecies(neat.population, speciesList);

        // 5. Log
        const genTime = ((Date.now() - genStart) / 1000).toFixed(1);
        const elapsed = (Date.now() - startTime) / 1000;
        const fps = Math.round(totalFrames / ((Date.now() - genStart) / 1000));

        // Best genome this gen
        neat.population.sort((a, b) => (b.score || 0) - (a.score || 0));
        const bestGenome = neat.population[0];
        const nodes = bestGenome.nodes.length;
        const conns = bestGenome.connections.length;

        // Wall detection
        const deathCounts = {};
        for (const r of results) {
            if (!r.completed) {
                const bucket = Math.floor(r.bestX / 20) * 20;
                deathCounts[bucket] = (deathCounts[bucket] || 0) + 1;
            }
        }
        let wallX = 0, wallCount = 0;
        for (const [x, count] of Object.entries(deathCounts)) {
            if (count > wallCount) { wallX = x; wallCount = count; }
        }
        const wallPct = Math.round(wallCount / POPULATION_SIZE * 100);

        if (newBest || gen % 5 === 0) {
            const bar = makeProgressBar(bestEverX, LEVEL_WIDTH, 20);
            const tag = newBest ? `${C.yellow}\u25b2 NEW BEST${C.reset}` : '';
            console.log(
                `Gen ${String(gen).padStart(4)} | ` +
                `gen: ${genBestX}px avg: ${genAvgX}px | ` +
                `ever: ${bestEverX}px | ` +
                `species: ${speciesList.length} | ` +
                `wall: X=${wallX}(${wallPct}%) | ` +
                `n:${nodes} c:${conns} | ` +
                `${fps} fps | ${genTime}s` +
                (genCompletions > 0 ? ` | ${C.green}${genCompletions} COMPLETE!${C.reset}` : '') +
                (newBest ? ` ${tag}` : '')
            );
            if (gen % 10 === 0) {
                console.log(`  ${bar} ${Math.round(bestEverX/LEVEL_WIDTH*100)}% | ${formatTime(elapsed)}`);
            }
        }

        // Save periodically
        if (gen % 50 === 0) {
            saveNeatState(gen);
            console.log(`  ${C.dim}Saved neat-state.json (gen ${gen})${C.reset}`);
        }
        startGen = gen;

        // 6. Evolve: speciation-based breeding
        neat.population = cullAndAllocate(speciesList, POPULATION_SIZE, Network, methods);
        neat.generation++;
    }
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });

} // end isMainThread
