#!/usr/bin/env node
// Mario NEAT — Direct translation of MarI/O's NEAT algorithm
// No library — raw NEAT with innovation numbers, speciation, and crossover
// See GOAL.md for what we're building.
// Usage: node optimize.js

import fs from 'fs';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';
import { Worker, isMainThread, parentPort, workerData } from 'worker_threads';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ==================== NEAT CONSTANTS (from MarI/O) ====================

const Population = 300;
const DeltaDisjoint = 2.0;
const DeltaWeights = 0.4;
const DeltaThreshold = 1.0;
const StaleSpecies = 15;
const MutateConnectionsChance = 0.25;
const PerturbChance = 0.90;
const CrossoverChance = 0.75;
const LinkMutationChance = 2.0;
const NodeMutationChance = 0.50;
const BiasMutationChance = 0.40;
const StepSize = 0.1;
const DisableMutationChance = 0.4;
const EnableMutationChance = 0.2;
const MaxNodes = 1000000;

// ==================== GAME CONSTANTS ====================

const NUM_INPUTS = 156;     // 5 mario + 140 tiles + 10 enemies + 1 timer
const Inputs = NUM_INPUTS + 1; // +1 bias node
const Outputs = 6;           // RIGHT, LEFT, A, B, UP, DOWN
const MAX_FRAMES = 8000;
const STALL_FRAMES = 20;    // MarI/O uses 20
const LEVEL_WIDTH = 3200;
const NUM_WORKERS = Math.max(1, os.cpus().length - 1);

const CBTNS = { A: 0, B: 1, SELECT: 2, START: 3, UP: 4, DOWN: 5, LEFT: 6, RIGHT: 7 };
const BIT = { A: 1, B: 2, SELECT: 4, START: 8, UP: 16, DOWN: 32, LEFT: 64, RIGHT: 128 };
const BIT_TO_JSNES = [CBTNS.A, CBTNS.B, CBTNS.SELECT, CBTNS.START, CBTNS.UP, CBTNS.DOWN, CBTNS.LEFT, CBTNS.RIGHT];
const BUTTON_BITS = [BIT.RIGHT, BIT.LEFT, BIT.A, BIT.B, BIT.UP, BIT.DOWN];

// ==================== NEAT DATA STRUCTURES ====================

function newGene() {
    return { into: 0, out: 0, weight: 0.0, enabled: true, innovation: 0 };
}

function copyGene(gene) {
    return { into: gene.into, out: gene.out, weight: gene.weight, enabled: gene.enabled, innovation: gene.innovation };
}

function newGenome() {
    return {
        genes: [],
        fitness: 0,
        adjustedFitness: 0,
        network: null,
        maxneuron: 0,
        globalRank: 0,
        mutationRates: {
            connections: MutateConnectionsChance,
            link: LinkMutationChance,
            bias: BiasMutationChance,
            node: NodeMutationChance,
            enable: EnableMutationChance,
            disable: DisableMutationChance,
            step: StepSize,
        },
    };
}

function copyGenome(genome) {
    const g2 = newGenome();
    for (const gene of genome.genes) g2.genes.push(copyGene(gene));
    g2.maxneuron = genome.maxneuron;
    for (const key of Object.keys(genome.mutationRates)) g2.mutationRates[key] = genome.mutationRates[key];
    return g2;
}

function newSpecies() {
    return { topFitness: 0, staleness: 0, genomes: [], averageFitness: 0 };
}

function newPool() {
    return { species: [], generation: 0, innovation: Outputs, maxFitness: 0, maxFitnessScore: -Infinity };
}

// ==================== NEAT CORE FUNCTIONS ====================

let pool = null; // global pool

function newInnovation() {
    pool.innovation++;
    return pool.innovation;
}

function randomNeuron(genes, nonInput) {
    const neurons = {};
    if (!nonInput) {
        for (let i = 0; i < Inputs; i++) neurons[i] = true;
    }
    for (let o = 0; o < Outputs; o++) neurons[MaxNodes + o] = true;
    for (const gene of genes) {
        if (!nonInput || gene.into >= Inputs) neurons[gene.into] = true;
        if (!nonInput || gene.out >= Inputs) neurons[gene.out] = true;
    }
    const keys = Object.keys(neurons);
    return parseInt(keys[Math.floor(Math.random() * keys.length)]);
}

function containsLink(genes, link) {
    for (const gene of genes) {
        if (gene.into === link.into && gene.out === link.out) return true;
    }
    return false;
}

// ==================== MUTATION ====================

function pointMutate(genome) {
    const step = genome.mutationRates.step;
    for (const gene of genome.genes) {
        if (Math.random() < PerturbChance) {
            gene.weight += Math.random() * step * 2 - step;
        } else {
            gene.weight = Math.random() * 4 - 2;
        }
    }
}

function linkMutate(genome, forceBias) {
    let neuron1 = randomNeuron(genome.genes, false);
    let neuron2 = randomNeuron(genome.genes, true);
    const link = newGene();

    if (neuron1 < Inputs && neuron2 < Inputs) return; // both inputs
    if (neuron2 < Inputs) { const temp = neuron1; neuron1 = neuron2; neuron2 = temp; }

    link.into = neuron1;
    link.out = neuron2;
    if (forceBias) link.into = Inputs - 1; // bias node

    if (containsLink(genome.genes, link)) return;

    link.innovation = newInnovation();
    link.weight = Math.random() * 4 - 2;
    genome.genes.push(link);
}

function nodeMutate(genome) {
    if (genome.genes.length === 0) return;
    genome.maxneuron++;

    const gene = genome.genes[Math.floor(Math.random() * genome.genes.length)];
    if (!gene.enabled) return;
    gene.enabled = false;

    const gene1 = copyGene(gene);
    gene1.out = genome.maxneuron;
    gene1.weight = 1.0;
    gene1.innovation = newInnovation();
    gene1.enabled = true;
    genome.genes.push(gene1);

    const gene2 = copyGene(gene);
    gene2.into = genome.maxneuron;
    gene2.innovation = newInnovation();
    gene2.enabled = true;
    genome.genes.push(gene2);
}

function enableDisableMutate(genome, enable) {
    const candidates = genome.genes.filter(g => g.enabled === !enable);
    if (candidates.length === 0) return;
    const gene = candidates[Math.floor(Math.random() * candidates.length)];
    gene.enabled = !gene.enabled;
}

function mutate(genome) {
    for (const key of Object.keys(genome.mutationRates)) {
        if (Math.random() < 0.5) genome.mutationRates[key] *= 0.95;
        else genome.mutationRates[key] *= 1.05263;
    }

    if (Math.random() < genome.mutationRates.connections) pointMutate(genome);

    let p = genome.mutationRates.link;
    while (p > 0) { if (Math.random() < p) linkMutate(genome, false); p--; }

    p = genome.mutationRates.bias;
    while (p > 0) { if (Math.random() < p) linkMutate(genome, true); p--; }

    p = genome.mutationRates.node;
    while (p > 0) { if (Math.random() < p) nodeMutate(genome); p--; }

    p = genome.mutationRates.enable;
    while (p > 0) { if (Math.random() < p) enableDisableMutate(genome, true); p--; }

    p = genome.mutationRates.disable;
    while (p > 0) { if (Math.random() < p) enableDisableMutate(genome, false); p--; }
}

// ==================== CROSSOVER ====================

function crossover(g1, g2) {
    if (g2.fitness > g1.fitness) { const temp = g1; g1 = g2; g2 = temp; }

    const child = newGenome();
    const innovations2 = {};
    for (const gene of g2.genes) innovations2[gene.innovation] = gene;

    for (const gene1 of g1.genes) {
        const gene2 = innovations2[gene1.innovation];
        if (gene2 && Math.random() < 0.5 && gene2.enabled) {
            child.genes.push(copyGene(gene2));
        } else {
            child.genes.push(copyGene(gene1));
        }
    }

    child.maxneuron = Math.max(g1.maxneuron, g2.maxneuron);
    for (const key of Object.keys(g1.mutationRates)) child.mutationRates[key] = g1.mutationRates[key];
    return child;
}

// ==================== SPECIATION ====================

function disjoint(genes1, genes2) {
    const i1 = new Set(genes1.map(g => g.innovation));
    const i2 = new Set(genes2.map(g => g.innovation));
    let d = 0;
    for (const g of genes1) if (!i2.has(g.innovation)) d++;
    for (const g of genes2) if (!i1.has(g.innovation)) d++;
    return d / Math.max(genes1.length, genes2.length, 1);
}

function weightsDistance(genes1, genes2) {
    const i2 = {};
    for (const g of genes2) i2[g.innovation] = g;
    let sum = 0, coincident = 0;
    for (const g of genes1) {
        if (i2[g.innovation]) {
            sum += Math.abs(g.weight - i2[g.innovation].weight);
            coincident++;
        }
    }
    return coincident > 0 ? sum / coincident : 0;
}

function sameSpecies(genome1, genome2) {
    const dd = DeltaDisjoint * disjoint(genome1.genes, genome2.genes);
    const dw = DeltaWeights * weightsDistance(genome1.genes, genome2.genes);
    return dd + dw < DeltaThreshold;
}

function addToSpecies(child) {
    for (const species of pool.species) {
        if (sameSpecies(child, species.genomes[0])) {
            species.genomes.push(child);
            return;
        }
    }
    const s = newSpecies();
    s.genomes.push(child);
    pool.species.push(s);
}

// ==================== NETWORK BUILD & EVALUATE ====================

function sigmoid(x) { return 2 / (1 + Math.exp(-4.9 * x)) - 1; }

function generateNetwork(genome) {
    const neurons = {};
    for (let i = 0; i < Inputs; i++) neurons[i] = { incoming: [], value: 0 };
    for (let o = 0; o < Outputs; o++) neurons[MaxNodes + o] = { incoming: [], value: 0 };

    genome.genes.sort((a, b) => a.out - b.out);

    for (const gene of genome.genes) {
        if (gene.enabled) {
            if (!neurons[gene.out]) neurons[gene.out] = { incoming: [], value: 0 };
            neurons[gene.out].incoming.push(gene);
            if (!neurons[gene.into]) neurons[gene.into] = { incoming: [], value: 0 };
        }
    }
    genome.network = neurons;
}

function evaluateNetwork(network, inputs) {
    inputs.push(1); // bias
    for (let i = 0; i < Inputs; i++) network[i].value = inputs[i];

    // Evaluate in order of neuron keys (sorted)
    const keys = Object.keys(network).map(Number).sort((a, b) => a - b);
    for (const key of keys) {
        const neuron = network[key];
        if (neuron.incoming.length > 0) {
            let sum = 0;
            for (const gene of neuron.incoming) {
                sum += gene.weight * network[gene.into].value;
            }
            neuron.value = sigmoid(sum);
        }
    }

    const outputs = [];
    for (let o = 0; o < Outputs; o++) {
        outputs.push(network[MaxNodes + o].value > 0);
    }
    return outputs;
}

// ==================== GENERATION MANAGEMENT ====================

function rankGlobally() {
    const global = [];
    for (const species of pool.species) {
        for (const genome of species.genomes) global.push(genome);
    }
    global.sort((a, b) => a.fitness - b.fitness);
    for (let i = 0; i < global.length; i++) global[i].globalRank = i + 1;
}

function calculateAverageFitness(species) {
    let total = 0;
    for (const genome of species.genomes) total += genome.globalRank;
    species.averageFitness = total / species.genomes.length;
}

function totalAverageFitness() {
    let total = 0;
    for (const species of pool.species) total += species.averageFitness;
    return total;
}

function cullSpecies(cutToOne) {
    for (const species of pool.species) {
        species.genomes.sort((a, b) => b.fitness - a.fitness);
        const remaining = cutToOne ? 1 : Math.ceil(species.genomes.length / 2);
        species.genomes.length = remaining;
    }
}

function removeStaleSpecies() {
    const survived = [];
    for (const species of pool.species) {
        species.genomes.sort((a, b) => b.fitness - a.fitness);
        if (species.genomes[0].fitness > species.topFitness) {
            species.topFitness = species.genomes[0].fitness;
            species.staleness = 0;
        } else {
            species.staleness++;
        }
        if (species.staleness < StaleSpecies || species.topFitness >= pool.maxFitnessScore) {
            survived.push(species);
        }
    }
    pool.species = survived;
}

function removeWeakSpecies() {
    const survived = [];
    const sum = totalAverageFitness();
    for (const species of pool.species) {
        const breed = Math.floor(species.averageFitness / sum * Population);
        if (breed >= 1) survived.push(species);
    }
    // Never let species list go empty
    if (survived.length === 0 && pool.species.length > 0) survived.push(pool.species[0]);
    pool.species = survived;
}

function breedChild(species) {
    let child;
    if (Math.random() < CrossoverChance) {
        const g1 = species.genomes[Math.floor(Math.random() * species.genomes.length)];
        const g2 = species.genomes[Math.floor(Math.random() * species.genomes.length)];
        child = crossover(g1, g2);
    } else {
        child = copyGenome(species.genomes[Math.floor(Math.random() * species.genomes.length)]);
    }
    mutate(child);
    return child;
}

function newGeneration() {
    cullSpecies(false);
    rankGlobally();
    removeStaleSpecies();
    rankGlobally();
    for (const species of pool.species) calculateAverageFitness(species);
    removeWeakSpecies();

    const sum = totalAverageFitness();
    const children = [];
    for (const species of pool.species) {
        const breed = Math.floor(species.averageFitness / sum * Population) - 1;
        for (let i = 0; i < breed; i++) children.push(breedChild(species));
    }

    cullSpecies(true); // keep only champion of each species

    while (children.length + pool.species.length < Population && pool.species.length > 0) {
        const species = pool.species[Math.floor(Math.random() * pool.species.length)];
        children.push(breedChild(species));
    }

    for (const child of children) addToSpecies(child);
    pool.generation++;
}

function basicGenome() {
    const genome = newGenome();
    genome.maxneuron = Inputs;
    mutate(genome);
    return genome;
}

// ================================================================
//  Monkey-patch jsnes for lite save states
// ================================================================
function patchJsnesLite(jsnes) {
    const origTo = jsnes.NES.prototype.toJSON;
    const origFrom = jsnes.NES.prototype.fromJSON;
    jsnes.NES.prototype.toJSONLite = function() {
        const s = origTo.call(this); delete s.romData;
        if (s.ppu) { delete s.ppu.buffer; delete s.ppu.bgbuffer; delete s.ppu.pixrendered; }
        return s;
    };
    jsnes.NES.prototype.fromJSONLite = function(s) {
        if (s.ppu) {
            if (!s.ppu.buffer) s.ppu.buffer = new Array(256*240).fill(0);
            if (!s.ppu.bgbuffer) s.ppu.bgbuffer = new Array(256*240).fill(0);
            if (!s.ppu.pixrendered) s.ppu.pixrendered = new Array(256*240).fill(0);
        }
        if (!s.romData) s.romData = this.rom?.data || [];
        origFrom.call(this, s);
    };
}

// ================================================================
//  Read game state
// ================================================================
function readNetworkInputs(nes) {
    const mem = nes.cpu.mem;
    const inputs = [];
    const marioX = mem[0x006D] * 256 + mem[0x0086];
    const marioY = mem[0x00CE];
    let velX = mem[0x0057]; if (velX > 127) velX -= 256;
    let velY = mem[0x009F]; if (velY > 127) velY -= 256;

    inputs.push(marioY / 240);
    inputs.push(Math.max(0, Math.min(1, (velX + 5) / 50)));
    inputs.push(Math.max(0, Math.min(1, (velY + 5) / 10)));
    inputs.push((mem[0x009F] === 0 && marioY >= 160) ? 1 : 0);
    inputs.push(mem[0x0756] > 0 ? 1 : 0);

    for (let r = 14; r <= 27; r++) {
        for (let c = 1; c <= 10; c++) {
            const worldX = marioX + c * 16;
            const page = Math.floor(worldX / 256);
            const localX = worldX % 256;
            const tileCol = Math.floor(localX / 8);
            const nt = nes.ppu.nameTable[page % 2];
            const tile = nt ? nt.tile[r * 32 + tileCol] : 0;
            inputs.push((tile !== 0x24 && tile !== 0x00) ? 1 : 0);
        }
    }

    const ENEMY_SCREEN_X = [0x0087, 0x008B, 0x008F, 0x0093, 0x0097];
    for (let e = 0; e < 5; e++) {
        if (mem[0x000F + e] !== 0) {
            const eX = mem[0x006E + e] * 256 + mem[ENEMY_SCREEN_X[e]];
            const eY = mem[0x00CF + e];
            inputs.push(Math.max(0, Math.min(1, (eX - marioX + 128) / 384)));
            inputs.push(Math.max(0, Math.min(1, eY / 240)));
        } else {
            inputs.push(0);
            inputs.push(0);
        }
    }

    const timer = ((mem[0x07F8] >> 4) * 10 + (mem[0x07F8] & 0xF)) * 100
                + ((mem[0x07F9] >> 4) * 10 + (mem[0x07F9] & 0xF)) * 10
                + ((mem[0x07FA] >> 4) * 10 + (mem[0x07FA] & 0xF));
    inputs.push(timer / 400);

    for (let i = 0; i < inputs.length; i++) if (!isFinite(inputs[i])) inputs[i] = 0;
    return inputs;
}

// ================================================================
//  WORKER THREAD
// ================================================================
if (!isMainThread) {
    const { createRequire } = await import('module');
    const require = createRequire(import.meta.url);
    const jsnes = require('jsnes');
    const { NES } = jsnes;
    const { romString, saveStateStr } = workerData;

    patchJsnesLite(jsnes);
    const saveState = JSON.parse(saveStateStr);
    const nes = new NES({ onFrame: () => {}, onAudioSample: () => {}, emulateSound: false });
    nes.loadROM(romString);

    function fastCloneState(s) {
        const cpu = Object.assign({}, s.cpu); cpu.mem = s.cpu.mem.slice();
        const ppu = Object.assign({}, s.ppu);
        ppu.vramMem = s.ppu.vramMem.slice(); ppu.vramMirrorTable = s.ppu.vramMirrorTable.slice();
        ppu.spriteMem = s.ppu.spriteMem.slice(); ppu.sprPalette = s.ppu.sprPalette.slice();
        ppu.imgPalette = s.ppu.imgPalette.slice(); ppu.ntable1 = s.ppu.ntable1.slice();
        ppu.scantile = s.ppu.scantile.slice();
        if (s.ppu.buffer) ppu.buffer = s.ppu.buffer.slice();
        if (s.ppu.bgbuffer) ppu.bgbuffer = s.ppu.bgbuffer.slice();
        if (s.ppu.pixrendered) ppu.pixrendered = s.ppu.pixrendered.slice();
        ppu.nameTable = s.ppu.nameTable.map(nt => ({ tile: nt.tile.slice(), attrib: nt.attrib.slice() }));
        ppu.ptTile = s.ppu.ptTile.map(t => ({ opaque: t.opaque.slice(), pix: t.pix.slice() }));
        return { romData: s.romData, cpu, mmap: Object.assign({}, s.mmap), ppu };
    }

    function evaluateGenome(genomeData) {
        // Reconstruct genome and build network
        const genome = genomeData; // already a plain object with genes array
        const network = {};
        for (let i = 0; i < Inputs; i++) network[i] = { incoming: [], value: 0 };
        for (let o = 0; o < Outputs; o++) network[MaxNodes + o] = { incoming: [], value: 0 };
        const genes = genome.genes.filter(g => g.enabled);
        genes.sort((a, b) => a.out - b.out);
        for (const gene of genes) {
            if (!network[gene.out]) network[gene.out] = { incoming: [], value: 0 };
            network[gene.out].incoming.push(gene);
            if (!network[gene.into]) network[gene.into] = { incoming: [], value: 0 };
        }
        const neuronKeys = Object.keys(network).map(Number).sort((a, b) => a - b);

        nes.fromJSONLite(fastCloneState(saveState));
        const startX = nes.cpu.mem[0x006D] * 256 + nes.cpu.mem[0x0086];
        let bestX = startX;
        let lastProgressFrame = 0;
        let prevBitmask = 0;
        let frame = 0;
        let reason = 'timeout';
        let completed = false;

        for (frame = 0; frame < MAX_FRAMES; frame++) {
            const inputs = readNetworkInputs(nes);
            inputs.push(1); // bias

            // Evaluate network
            for (let i = 0; i < Inputs; i++) network[i].value = inputs[i];
            for (const key of neuronKeys) {
                const neuron = network[key];
                if (neuron.incoming.length > 0) {
                    let sum = 0;
                    for (const gene of neuron.incoming) {
                        if (network[gene.into]) sum += gene.weight * network[gene.into].value;
                    }
                    neuron.value = 2 / (1 + Math.exp(-4.9 * sum)) - 1; // sigmoid
                }
            }

            // Read outputs
            let mask = 0;
            for (let o = 0; o < Outputs; o++) {
                if (network[MaxNodes + o].value > 0) mask |= BUTTON_BITS[o];
            }
            if ((mask & BIT.LEFT) && (mask & BIT.RIGHT)) mask &= ~BIT.LEFT;

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

            nes.frame();
            const x = nes.cpu.mem[0x006D] * 256 + nes.cpu.mem[0x0086];
            if (x > bestX) { bestX = x; lastProgressFrame = frame; }

            if (nes.cpu.mem[0x001D] === 3 || nes.cpu.mem[0x075F] > 0 || nes.cpu.mem[0x0760] > 0) {
                completed = true; reason = 'completed'; break;
            }
            const ps = nes.cpu.mem[0x000E];
            if (ps === 0x0B || ps === 0x06 || nes.cpu.mem[0x00CE] > 240 || nes.cpu.mem[0x0770] === 3) {
                reason = 'dead'; break;
            }
            if (frame - lastProgressFrame > STALL_FRAMES) { reason = 'stalled'; break; }
        }

        let fitness = bestX - startX;
        if (frame > 0) fitness -= frame * 0.5;
        if (completed) fitness += 1000;
        return { fitness, bestX, frame, reason, completed };
    }

    parentPort.on('message', (msg) => {
        if (msg.type === 'evaluate') {
            const results = msg.genomes.map(g => evaluateGenome(g));
            parentPort.postMessage({ type: 'results', results });
        }
    });
    parentPort.postMessage('ready');
}

// ================================================================
//  MAIN THREAD
// ================================================================
if (isMainThread) {

const romPath = path.join(__dirname, 'super-mario-bros-1.nes');
if (!fs.existsSync(romPath)) { console.error('ROM not found'); process.exit(1); }
const romData = fs.readFileSync(romPath);
const romString = Array.from(new Uint8Array(romData)).map(b => String.fromCharCode(b)).join('');
const saveStatePath = path.join(__dirname, 'save-state.json');
const neatStatePath = path.join(__dirname, 'neat-state.json');

const thisFile = fileURLToPath(import.meta.url);

async function spawnWorker(romString, saveStateStr) {
    const w = new Worker(thisFile, { workerData: { romString, saveStateStr } });
    await new Promise(r => { w.once('message', m => { if (m === 'ready') r(); }); });
    return w;
}

function evaluateBatch(workers, genomes) {
    // Serialize genomes for workers (plain objects with genes array)
    const serialized = genomes.map(g => ({ genes: g.genes, maxneuron: g.maxneuron }));
    return new Promise((resolve) => {
        const allResults = new Array(serialized.length);
        const chunkSize = Math.ceil(serialized.length / workers.length);
        let completed = 0;
        workers.forEach((worker, wi) => {
            const start = wi * chunkSize;
            const end = Math.min(start + chunkSize, serialized.length);
            if (start >= serialized.length) { completed++; if (completed === workers.length) resolve(allResults); return; }
            worker.once('message', (msg) => {
                for (let i = 0; i < msg.results.length; i++) allResults[start + i] = msg.results[i];
                completed++;
                if (completed === workers.length) resolve(allResults);
            });
            worker.postMessage({ type: 'evaluate', genomes: serialized.slice(start, end) });
        });
    });
}

function makeProgressBar(x, maxX, w) {
    const r = Math.min(x / maxX, 1); const f = Math.round(r * w);
    return '[' + '\u2588'.repeat(Math.max(0, f - 1)) + (f > 0 ? '\u2592' : '') + '\u2591'.repeat(w - f) + ']';
}
function formatTime(s) { if (s < 60) return `${s.toFixed(0)}s`; return `${Math.floor(s/60)}m ${Math.round(s%60)}s`; }

async function main() {
    const C = { reset: '\x1b[0m', dim: '\x1b[2m', bold: '\x1b[1m', red: '\x1b[31m', green: '\x1b[32m', yellow: '\x1b[33m', blue: '\x1b[34m', cyan: '\x1b[36m' };

    console.log(`${C.cyan}\u2554${'═'.repeat(54)}\u2557${C.reset}`);
    console.log(`${C.cyan}\u2551   MARIO NEAT \u2014 MarI/O Algorithm (from scratch)           \u2551${C.reset}`);
    console.log(`${C.cyan}\u2551   Innovation numbers, speciation, crossover              \u2551${C.reset}`);
    console.log(`${C.cyan}\u255a${'═'.repeat(54)}\u255d${C.reset}`);
    console.log();

    const { createRequire } = await import('module');
    const require = createRequire(import.meta.url);
    const jsnes = require('jsnes');
    const { NES, Controller } = jsnes;
    patchJsnesLite(jsnes);

    console.log('Creating title screen save state...');
    const nes = new NES({ onFrame: () => {}, onAudioSample: () => {}, emulateSound: false });
    nes.loadROM(romString);
    for (let i = 0; i < 90; i++) nes.frame();
    nes.buttonDown(1, Controller.BUTTON_START);
    for (let i = 0; i < 2; i++) nes.frame();
    nes.buttonUp(1, Controller.BUTTON_START);
    for (let i = 0; i < 200; i++) nes.frame();
    const saveStateStr = JSON.stringify(nes.toJSONLite());
    fs.writeFileSync(saveStatePath, saveStateStr);
    console.log(`  Mario at X=${nes.cpu.mem[0x006D]*256+nes.cpu.mem[0x0086]}, Y=${nes.cpu.mem[0x00CE]}\n`);

    console.log(`Spawning ${NUM_WORKERS} workers...`);
    const workers = [];
    for (let i = 0; i < NUM_WORKERS; i++) workers.push(await spawnWorker(romString, saveStateStr));
    console.log(`  ${workers.length} workers ready\n`);

    // Initialize pool
    pool = newPool();

    // Try loading saved state
    if (fs.existsSync(neatStatePath)) {
        try {
            const saved = JSON.parse(fs.readFileSync(neatStatePath, 'utf8'));
            // Validate: must have species with genomes that have genes arrays
            if (saved.species && saved.species.length > 0 && saved.species[0].genomes && saved.species[0].genomes[0].genes) {
                pool = saved;
                if (!pool.maxFitnessScore) pool.maxFitnessScore = -Infinity;
                console.log(`${C.green}Resumed gen ${pool.generation} | species: ${pool.species.length} | best: ${pool.maxFitness}px${C.reset}\n`);
            } else {
                console.log(`${C.dim}Save file format invalid, starting fresh${C.reset}\n`);
            }
        } catch(e) {
            console.log(`${C.dim}Could not load neat-state.json, starting fresh${C.reset}\n`);
        }
    }

    if (pool.species.length === 0) {
        for (let i = 0; i < Population; i++) addToSpecies(basicGenome());
    }

    console.log(`${C.cyan}=== NEAT TRAINING ===${C.reset}`);
    console.log(`${C.dim}Pop: ${Population} | Inputs: ${Inputs} (${NUM_INPUTS}+bias) | Outputs: ${Outputs} | Species: ${pool.species.length}${C.reset}`);
    console.log(`${C.dim}Speciation: \u03b4D=${DeltaDisjoint} \u03b4W=${DeltaWeights} \u03b4T=${DeltaThreshold} | Stale: ${StaleSpecies} gens${C.reset}\n`);

    const startTime = Date.now();

    let sigCount = 0;
    process.on('SIGINT', () => {
        sigCount++;
        if (sigCount > 1) process.exit(1);
        console.log('\n\nSaving...');
        fs.writeFileSync(neatStatePath, JSON.stringify(pool));
        console.log(`Saved gen ${pool.generation} | species: ${pool.species.length} | max: ${pool.maxFitness}`);
        workers.forEach(w => w.terminate());
        setTimeout(() => process.exit(0), 200);
    });

    // ==================== EVOLUTION LOOP ====================
    for (;; ) {
        const genStart = Date.now();

        // Collect all genomes across all species
        const allGenomes = [];
        for (const species of pool.species) {
            for (const genome of species.genomes) allGenomes.push(genome);
        }

        // Evaluate in parallel
        const results = await evaluateBatch(workers, allGenomes);

        // Assign fitness
        let genBestX = 0, genBestFitness = -Infinity, genAvgX = 0, genCompletions = 0, totalFrames = 0;
        for (let i = 0; i < allGenomes.length; i++) {
            allGenomes[i].fitness = results[i].fitness;
            genAvgX += results[i].bestX;
            totalFrames += results[i].frame;
            if (results[i].completed) genCompletions++;
            if (results[i].bestX > genBestX) genBestX = results[i].bestX;
            if (results[i].fitness > genBestFitness) genBestFitness = results[i].fitness;
        }
        genAvgX = Math.round(genAvgX / allGenomes.length);

        const newBest = genBestX > pool.maxFitness;
        if (genBestX > pool.maxFitness) pool.maxFitness = genBestX;
        if (genBestFitness > pool.maxFitnessScore) pool.maxFitnessScore = genBestFitness;

        // Log
        const genTime = ((Date.now() - genStart) / 1000).toFixed(1);
        const elapsed = (Date.now() - startTime) / 1000;
        const fps = Math.round(totalFrames / ((Date.now() - genStart) / 1000));

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
        const wallPct = Math.round(wallCount / allGenomes.length * 100);

        // Best genome info
        let bestNodes = 0, bestConns = 0;
        for (const g of allGenomes) {
            if (g.fitness >= pool.maxFitness - 1) {
                bestNodes = new Set(g.genes.flatMap(ge => [ge.into, ge.out])).size;
                bestConns = g.genes.filter(ge => ge.enabled).length;
                break;
            }
        }

        const gen = pool.generation;
        if (newBest || gen % 5 === 0) {
            const bar = makeProgressBar(pool.maxFitness + 40, LEVEL_WIDTH, 20); // +40 for startX
            console.log(
                `Gen ${String(gen).padStart(4)} | ` +
                `gen: ${genBestX}px avg: ${genAvgX}px | ` +
                `ever: ${pool.maxFitness}px | ` +
                `species: ${pool.species.length} | ` +
                `wall: X=${wallX}(${wallPct}%) | ` +
                `n:${bestNodes} c:${bestConns} | ` +
                `${fps} fps | ${genTime}s` +
                (genCompletions > 0 ? ` | ${C.green}${genCompletions} COMPLETE!${C.reset}` : '') +
                (newBest ? ` ${C.yellow}\u25b2 NEW${C.reset}` : '')
            );
            if (gen % 10 === 0) {
                console.log(`  ${bar} ${Math.round((pool.maxFitness+40)/LEVEL_WIDTH*100)}% | ${formatTime(elapsed)}`);
            }
        }

        // Save periodically
        if (gen % 50 === 0) {
            fs.writeFileSync(neatStatePath, JSON.stringify(pool));
            console.log(`  ${C.dim}Saved neat-state.json (gen ${gen})${C.reset}`);
        }

        // Evolve
        newGeneration();
    }
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });

} // end isMainThread
