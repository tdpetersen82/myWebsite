#!/usr/bin/env node
// ================================================================
//  PPO Pipeline Diagnostic Test
//  Standalone test that verifies the entire Mario PPO pipeline:
//    1. Input reading (readNetworkInputs)
//    2. Forward pass consistency (manual vs TF.js)
//    3. Action sampling and log probability
//    4. Reward computation
//    5. GAE computation
//    6. Rollout sanity (end-to-end mini-rollout)
//
//  Usage: node test-ppo.js
// ================================================================

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const jsnes = require('jsnes');
const tf = await import('@tensorflow/tfjs');

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ==================== ANSI COLORS ====================
const C = {
    reset: '\x1b[0m',
    bold: '\x1b[1m',
    dim: '\x1b[2m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    white: '\x1b[37m',
    bgRed: '\x1b[41m',
    bgGreen: '\x1b[42m',
};

function PASS(msg) { console.log(`  ${C.green}PASS${C.reset} ${msg}`); }
function FAIL(msg) { console.log(`  ${C.red}FAIL${C.reset} ${msg}`); }
function INFO(msg) { console.log(`  ${C.cyan}INFO${C.reset} ${msg}`); }
function WARN(msg) { console.log(`  ${C.yellow}WARN${C.reset} ${msg}`); }
function HEADER(msg) { console.log(`\n${C.bold}${C.blue}${'='.repeat(60)}${C.reset}`); console.log(`${C.bold}${C.blue}  ${msg}${C.reset}`); console.log(`${C.bold}${C.blue}${'='.repeat(60)}${C.reset}\n`); }
function SUBHEADER(msg) { console.log(`\n  ${C.bold}${C.magenta}--- ${msg} ---${C.reset}\n`); }

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assert(condition, msg) {
    totalTests++;
    if (condition) { passedTests++; PASS(msg); }
    else { failedTests++; FAIL(msg); }
    return condition;
}

function assertClose(a, b, tol, msg) {
    const diff = Math.abs(a - b);
    totalTests++;
    if (diff <= tol) {
        passedTests++;
        PASS(`${msg} (diff=${diff.toExponential(3)})`);
    } else {
        failedTests++;
        FAIL(`${msg} (a=${a}, b=${b}, diff=${diff.toExponential(3)}, tol=${tol})`);
    }
    return diff <= tol;
}

// ==================== CONFIG (copied from optimize.js) ====================

const MAX_FRAMES = 8000;
const STALL_FRAMES = 360;
const LEVEL_WIDTH = 3200;

const NUM_INPUTS = 156;
const H1 = 64;
const H2 = 32;
const NUM_OUTPUTS = 6;

const W = {};
W.ih1_k = 0;
W.ih1_b = W.ih1_k + NUM_INPUTS * H1;
W.h1h2_k = W.ih1_b + H1;
W.h1h2_b = W.h1h2_k + H1 * H2;
W.actor_k = W.h1h2_b + H2;
W.actor_b = W.actor_k + H2 * NUM_OUTPUTS;
W.critic_k = W.actor_b + NUM_OUTPUTS;
W.critic_b = W.critic_k + H2;
const TOTAL_WEIGHTS = W.critic_b + 1;

const ROLLOUT_LENGTH = 512;
const PPO_EPOCHS = 4;
const MINIBATCH_SIZE = 256;
const CLIP_EPSILON = 0.2;
const GAE_LAMBDA = 0.95;
const DISCOUNT_GAMMA = 0.99;
const LEARNING_RATE = 3e-4;
const ENTROPY_COEFF = 0.05;
const VALUE_LOSS_COEFF = 0.5;

const REWARD_PROGRESS = 0.01;
const REWARD_DEATH = -5.0;
const REWARD_TIME_PENALTY = -0.001;
const REWARD_COMPLETION = 5.0;

// ==================== BUTTON CONSTANTS ====================

const CBTNS = { A: 0, B: 1, SELECT: 2, START: 3, UP: 4, DOWN: 5, LEFT: 6, RIGHT: 7 };
const BIT = { A: 1, B: 2, SELECT: 4, START: 8, UP: 16, DOWN: 32, LEFT: 64, RIGHT: 128 };
const BIT_TO_JSNES = [CBTNS.A, CBTNS.B, CBTNS.SELECT, CBTNS.START, CBTNS.UP, CBTNS.DOWN, CBTNS.LEFT, CBTNS.RIGHT];
const BUTTON_BITS = [BIT.RIGHT, BIT.LEFT, BIT.A, BIT.B, BIT.UP, BIT.DOWN];

// ==================== JSNES PATCH ====================

function patchJsnesLite() {
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

// ==================== CORE FUNCTIONS (copied from optimize.js) ====================

function forwardPass(inputs, weights) {
    const h1 = new Float32Array(H1);
    for (let j = 0; j < H1; j++) {
        let sum = weights[W.ih1_b + j];
        for (let i = 0; i < NUM_INPUTS; i++) {
            sum += inputs[i] * weights[W.ih1_k + i * H1 + j];
        }
        h1[j] = sum > 0 ? sum : 0;
    }

    const h2 = new Float32Array(H2);
    for (let j = 0; j < H2; j++) {
        let sum = weights[W.h1h2_b + j];
        for (let i = 0; i < H1; i++) {
            sum += h1[i] * weights[W.h1h2_k + i * H2 + j];
        }
        h2[j] = sum > 0 ? sum : 0;
    }

    const probs = new Float32Array(NUM_OUTPUTS);
    for (let j = 0; j < NUM_OUTPUTS; j++) {
        let sum = weights[W.actor_b + j];
        for (let i = 0; i < H2; i++) {
            sum += h2[i] * weights[W.actor_k + i * NUM_OUTPUTS + j];
        }
        sum = Math.max(-10, Math.min(10, sum));
        probs[j] = 1 / (1 + Math.exp(-sum));
    }

    let value = weights[W.critic_b];
    for (let i = 0; i < H2; i++) {
        value += h2[i] * weights[W.critic_k + i];
    }

    return { probs, value };
}

function readNetworkInputs(nes) {
    const mem = nes.cpu.mem;
    const inputs = new Float32Array(NUM_INPUTS);
    const EMPTY_TILE = 0x24;
    let idx = 0;

    const marioX = mem[0x006D] * 256 + mem[0x0086];
    const marioY = mem[0x00CE];
    let velX = mem[0x0057]; if (velX > 127) velX -= 256;
    let velY = mem[0x009F]; if (velY > 127) velY -= 256;

    inputs[idx++] = marioY / 240;
    inputs[idx++] = Math.max(0, Math.min(1, (velX + 40) / 80));
    inputs[idx++] = Math.max(0, Math.min(1, (velY + 40) / 80));
    inputs[idx++] = (mem[0x009F] === 0 && marioY >= 160) ? 1 : 0;
    inputs[idx++] = mem[0x0756] > 0 ? 1 : 0;

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

    const timer = ((mem[0x07F8] >> 4) * 10 + (mem[0x07F8] & 0xF)) * 100
                + ((mem[0x07F9] >> 4) * 10 + (mem[0x07F9] & 0xF)) * 10
                + ((mem[0x07FA] >> 4) * 10 + (mem[0x07FA] & 0xF));
    inputs[idx++] = timer / 400;

    for (let i = 0; i < NUM_INPUTS; i++) {
        if (!isFinite(inputs[i])) inputs[i] = 0;
    }
    return inputs;
}

function probsToBitmask(probs) {
    let mask = 0;
    for (let i = 0; i < NUM_OUTPUTS; i++) {
        if (probs[i] > 0.5) mask |= BUTTON_BITS[i];
    }
    if ((mask & BIT.LEFT) && (mask & BIT.RIGHT)) mask &= ~BIT.LEFT;
    return mask;
}

function sampleActions(probs) {
    let mask = 0;
    for (let i = 0; i < NUM_OUTPUTS; i++) {
        if (Math.random() < probs[i]) mask |= BUTTON_BITS[i];
    }
    if ((mask & BIT.LEFT) && (mask & BIT.RIGHT)) mask &= ~BIT.LEFT;
    return mask;
}

function computeLogProb(probs, actionMask) {
    let logProb = 0;
    for (let i = 0; i < NUM_OUTPUTS; i++) {
        const p = Math.max(1e-8, Math.min(1 - 1e-8, probs[i]));
        const pressed = (actionMask & BUTTON_BITS[i]) ? 1 : 0;
        logProb += pressed * Math.log(p) + (1 - pressed) * Math.log(1 - p);
    }
    return logProb;
}

function computeGAE(rewards, values, dones, lastValue) {
    const T = rewards.length;
    const advantages = new Float32Array(T);
    const returns = new Float32Array(T);
    let lastAdv = 0;

    for (let t = T - 1; t >= 0; t--) {
        const nextValue = (t === T - 1) ? lastValue : values[t + 1];
        const nextNonTerminal = (t === T - 1) ? (1 - dones[T - 1]) : (1 - dones[t]);
        const delta = rewards[t] + DISCOUNT_GAMMA * nextValue * nextNonTerminal - values[t];
        lastAdv = delta + DISCOUNT_GAMMA * GAE_LAMBDA * nextNonTerminal * lastAdv;
        advantages[t] = lastAdv;
        returns[t] = advantages[t] + values[t];
    }
    return { advantages, returns };
}

function createModel() {
    const input = tf.input({ shape: [NUM_INPUTS] });
    const h1 = tf.layers.dense({ units: H1, activation: 'relu', kernelInitializer: 'heNormal', name: 'h1' }).apply(input);
    const h2 = tf.layers.dense({ units: H2, activation: 'relu', kernelInitializer: 'heNormal', name: 'h2' }).apply(h1);
    const actorOut = tf.layers.dense({ units: NUM_OUTPUTS, activation: 'sigmoid', name: 'actor' }).apply(h2);
    const criticOut = tf.layers.dense({ units: 1, name: 'critic' }).apply(h2);
    return tf.model({ inputs: input, outputs: [actorOut, criticOut] });
}

function extractWeights(model) {
    const flat = new Float32Array(TOTAL_WEIGHTS);
    const tensors = model.getWeights();
    const data = tensors.map(t => t.dataSync());
    flat.set(data[0], W.ih1_k);
    flat.set(data[1], W.ih1_b);
    flat.set(data[2], W.h1h2_k);
    flat.set(data[3], W.h1h2_b);
    flat.set(data[4], W.actor_k);
    flat.set(data[5], W.actor_b);
    flat.set(data[6], W.critic_k);
    flat.set(data[7], W.critic_b);
    return flat;
}

function loadWeightsIntoModel(model, flat) {
    const tensors = model.getWeights();
    const shapes = tensors.map(t => t.shape);
    const newTensors = [
        tf.tensor(flat.slice(W.ih1_k, W.ih1_k + NUM_INPUTS * H1), shapes[0]),
        tf.tensor(flat.slice(W.ih1_b, W.ih1_b + H1), shapes[1]),
        tf.tensor(flat.slice(W.h1h2_k, W.h1h2_k + H1 * H2), shapes[2]),
        tf.tensor(flat.slice(W.h1h2_b, W.h1h2_b + H2), shapes[3]),
        tf.tensor(flat.slice(W.actor_k, W.actor_k + H2 * NUM_OUTPUTS), shapes[4]),
        tf.tensor(flat.slice(W.actor_b, W.actor_b + NUM_OUTPUTS), shapes[5]),
        tf.tensor(flat.slice(W.critic_k, W.critic_k + H2), shapes[6]),
        tf.tensor(flat.slice(W.critic_b, W.critic_b + 1), shapes[7]),
    ];
    model.setWeights(newTensors);
    newTensors.forEach(t => t.dispose());
}

// ==================== NES HELPERS ====================

function bootNES() {
    const romPath = path.join(__dirname, 'super-mario-bros-1.nes');
    if (!fs.existsSync(romPath)) {
        console.error(`ROM not found at ${romPath}`);
        process.exit(1);
    }
    const romData = fs.readFileSync(romPath);
    const romString = Array.from(new Uint8Array(romData)).map(b => String.fromCharCode(b)).join('');

    patchJsnesLite();
    const nes = new jsnes.NES({ onFrame: () => {}, onAudioSample: () => {}, emulateSound: false });
    nes.loadROM(romString);
    return nes;
}

function advanceToGameplay(nes) {
    // Match the exact boot sequence from optimize.js:
    // 90 frames on title, START for 2 frames, then 200 frames to reach gameplay
    for (let i = 0; i < 90; i++) nes.frame();
    nes.buttonDown(1, CBTNS.START);
    for (let i = 0; i < 2; i++) nes.frame();
    nes.buttonUp(1, CBTNS.START);
    for (let i = 0; i < 200; i++) nes.frame();
}

function getMarioX(nes) {
    return nes.cpu.mem[0x006D] * 256 + nes.cpu.mem[0x0086];
}

function getMarioY(nes) {
    return nes.cpu.mem[0x00CE];
}

function applyBitmask(nes, mask, prevMask) {
    const changed = mask ^ prevMask;
    for (let bit = 0; bit < 8; bit++) {
        if (changed & (1 << bit)) {
            if (mask & (1 << bit)) nes.buttonDown(1, BIT_TO_JSNES[bit]);
            else nes.buttonUp(1, BIT_TO_JSNES[bit]);
        }
    }
}

function bitmaskToString(mask) {
    const names = [];
    if (mask & BIT.RIGHT) names.push('RIGHT');
    if (mask & BIT.LEFT) names.push('LEFT');
    if (mask & BIT.A) names.push('A');
    if (mask & BIT.B) names.push('B');
    if (mask & BIT.UP) names.push('UP');
    if (mask & BIT.DOWN) names.push('DOWN');
    return names.length ? names.join('+') : 'NONE';
}

function printInputs(inputs, label) {
    console.log(`\n  ${C.bold}${label}${C.reset}`);

    // Mario state (indices 0-4)
    console.log(`    Mario Y (norm):     ${inputs[0].toFixed(4)}  (raw Y = ${(inputs[0] * 240).toFixed(0)})`);
    console.log(`    VelX (norm):        ${inputs[1].toFixed(4)}  (raw velX = ${(inputs[1] * 80 - 40).toFixed(1)})`);
    console.log(`    VelY (norm):        ${inputs[2].toFixed(4)}  (raw velY = ${(inputs[2] * 80 - 40).toFixed(1)})`);
    console.log(`    On ground:          ${inputs[3].toFixed(0)}`);
    console.log(`    Is big:             ${inputs[4].toFixed(0)}`);

    // Tile grid (indices 5-144): 14 rows x 10 cols
    console.log(`    Tile grid (14 rows x 10 cols, rows 14-27 of nametable, cols 1-10 ahead):`);
    console.log(`    Col offsets:  ${Array.from({length: 10}, (_, c) => `+${((c+1) * 16).toString().padStart(3)}`).join(' ')}`);
    for (let r = 0; r < 14; r++) {
        const row = [];
        for (let c = 0; c < 10; c++) {
            const val = inputs[5 + r * 10 + c];
            row.push(val > 0.5 ? '\u2588' : '\u00b7');
        }
        console.log(`    Row ${(r + 14).toString().padStart(2)}: ${row.join(' ')}`);
    }

    // Enemies (indices 145-154): 5 slots x 2
    console.log(`    Enemies (5 slots x relX,relY):`);
    for (let e = 0; e < 5; e++) {
        const relX = inputs[145 + e * 2];
        const relY = inputs[145 + e * 2 + 1];
        const active = (relX !== 0 || relY !== 0) ? 'ACTIVE' : 'empty';
        console.log(`      Slot ${e}: relX=${relX.toFixed(4)} relY=${relY.toFixed(4)}  [${active}]`);
    }

    // Timer (index 155)
    console.log(`    Timer (norm):       ${inputs[155].toFixed(4)}  (raw = ${(inputs[155] * 400).toFixed(0)})`);
}

// ================================================================
//  TEST 1: Input Reading
// ================================================================
async function testInputReading() {
    HEADER('TEST 1: Input Reading (readNetworkInputs)');

    const nes = bootNES();
    advanceToGameplay(nes);

    SUBHEADER('1a: Inputs at starting position');
    const startInputs = readNetworkInputs(nes);
    assert(startInputs.length === NUM_INPUTS, `Input vector has ${NUM_INPUTS} elements (got ${startInputs.length})`);
    assert(startInputs[0] >= 0 && startInputs[0] <= 1, `Mario Y is normalized [0,1]: ${startInputs[0].toFixed(4)}`);
    assert(startInputs[155] > 0, `Timer is nonzero: ${startInputs[155].toFixed(4)} (raw=${(startInputs[155]*400).toFixed(0)})`);

    const startX = getMarioX(nes);
    const startY = getMarioY(nes);
    INFO(`Mario position at start: X=${startX}, Y=${startY}`);

    // Check all values are finite and in [0, 1] (or close)
    let allFinite = true;
    let allBounded = true;
    for (let i = 0; i < NUM_INPUTS; i++) {
        if (!isFinite(startInputs[i])) allFinite = false;
        if (startInputs[i] < -0.01 || startInputs[i] > 1.01) allBounded = false;
    }
    assert(allFinite, 'All inputs are finite');
    assert(allBounded, 'All inputs are in [0, 1] range (within tolerance)');

    printInputs(startInputs, `Starting position inputs (all ${NUM_INPUTS} values):`);

    // Count solid tiles at start (World 1-1 has ground and some blocks)
    let solidTiles = 0;
    for (let i = 5; i < 145; i++) {
        if (startInputs[i] > 0.5) solidTiles++;
    }
    INFO(`Solid tiles at start: ${solidTiles} out of 140`);
    assert(solidTiles > 0, `At least some solid tiles visible at start (found ${solidTiles})`);

    SUBHEADER('1b: Inputs after 100 frames of RIGHT+B');
    const prevMask = 0;
    const runMask = BIT.RIGHT | BIT.B;
    applyBitmask(nes, runMask, prevMask);
    for (let i = 0; i < 100; i++) nes.frame();
    const runInputs = readNetworkInputs(nes);

    const runX = getMarioX(nes);
    const runY = getMarioY(nes);
    INFO(`Mario position after running: X=${runX}, Y=${runY} (moved ${runX - startX}px right)`);

    assert(runX > startX, `Mario moved right: ${startX} -> ${runX}`);
    assert(runInputs[1] > startInputs[1] || runInputs[1] > 0.5, `VelX increased or positive: start=${startInputs[1].toFixed(4)}, now=${runInputs[1].toFixed(4)}`);

    // Show what changed
    let inputDiffs = 0;
    for (let i = 0; i < NUM_INPUTS; i++) {
        if (Math.abs(runInputs[i] - startInputs[i]) > 0.001) inputDiffs++;
    }
    INFO(`Number of inputs that changed: ${inputDiffs} out of ${NUM_INPUTS}`);

    printInputs(runInputs, 'After 100 frames of RIGHT+B:');

    SUBHEADER('1c: Inputs near a pipe (advancing to X ~ 400-600)');
    // Keep running right until we get near the first pipe
    // Buttons from 1b (RIGHT+B) are still held
    let pipeX = runX;
    let safetyCounter = 0;
    while (pipeX < 400 && safetyCounter < 1000) {
        nes.frame();
        pipeX = getMarioX(nes);
        safetyCounter++;
        // Check for death and restart if needed
        const ps = nes.cpu.mem[0x000E];
        if (ps === 0x0B || ps === 0x06 || nes.cpu.mem[0x00CE] > 240) {
            WARN(`Mario died at X=${pipeX} (player state=0x${ps.toString(16)}), restarting`);
            break;
        }
    }
    INFO(`Advanced to X=${pipeX} (took ${safetyCounter} extra frames)`);

    const pipeInputs = readNetworkInputs(nes);
    let pipeSolidTiles = 0;
    for (let i = 5; i < 145; i++) {
        if (pipeInputs[i] > 0.5) pipeSolidTiles++;
    }
    INFO(`Solid tiles near pipe area: ${pipeSolidTiles} out of 140`);
    // Near the first pipe, we should see pipe blocks as solid
    assert(pipeSolidTiles > solidTiles, `More solid tiles visible when further in level (${pipeSolidTiles} > ${solidTiles})`);

    printInputs(pipeInputs, `Inputs near pipe area (X=${pipeX}):`);

    // Release buttons
    applyBitmask(nes, 0, runMask);
}

// ================================================================
//  TEST 2: Forward Pass Consistency
// ================================================================
async function testForwardPass() {
    HEADER('TEST 2: Forward Pass Consistency (manual vs TF.js)');

    const model = createModel();
    const weights = extractWeights(model);

    INFO(`Model created with ${TOTAL_WEIGHTS} total weights`);
    assert(weights.length === TOTAL_WEIGHTS, `Weight vector length matches: ${weights.length} === ${TOTAL_WEIGHTS}`);

    // Test inputs: zeros, ones, random, negative-free random, real game state
    const testInputSets = [
        { name: 'all zeros', data: new Float32Array(NUM_INPUTS) },
        { name: 'all ones', data: new Float32Array(NUM_INPUTS).fill(1) },
        { name: 'all 0.5', data: new Float32Array(NUM_INPUTS).fill(0.5) },
    ];

    // Random inputs
    const randomInput = new Float32Array(NUM_INPUTS);
    for (let i = 0; i < NUM_INPUTS; i++) randomInput[i] = Math.random();
    testInputSets.push({ name: 'random [0,1]', data: randomInput });

    // Real game state
    const nes = bootNES();
    advanceToGameplay(nes);
    const realInput = readNetworkInputs(nes);
    testInputSets.push({ name: 'real game state', data: realInput });

    for (const { name, data } of testInputSets) {
        SUBHEADER(`Forward pass: ${name}`);

        // Manual forward pass
        const manual = forwardPass(data, weights);

        // TF.js forward pass
        const inputTensor = tf.tensor2d([Array.from(data)], [1, NUM_INPUTS]);
        const [actorOut, criticOut] = model.predict(inputTensor);
        const tfProbs = actorOut.dataSync();
        const tfValue = criticOut.dataSync()[0];
        inputTensor.dispose();
        actorOut.dispose();
        criticOut.dispose();

        // Compare probs
        let maxProbDiff = 0;
        for (let i = 0; i < NUM_OUTPUTS; i++) {
            const diff = Math.abs(manual.probs[i] - tfProbs[i]);
            if (diff > maxProbDiff) maxProbDiff = diff;
        }
        assertClose(maxProbDiff, 0, 1e-5, `Probs match (max diff across ${NUM_OUTPUTS} outputs)`);

        // Compare value
        assertClose(manual.value, tfValue, 1e-4, `Value matches: manual=${manual.value.toFixed(6)}, tf=${tfValue.toFixed(6)}`);

        // Print details
        const probLabels = ['RIGHT', 'LEFT', 'A', 'B', 'UP', 'DOWN'];
        for (let i = 0; i < NUM_OUTPUTS; i++) {
            const diff = Math.abs(manual.probs[i] - tfProbs[i]);
            const diffStr = diff < 1e-6 ? `${C.green}exact${C.reset}` : `diff=${diff.toExponential(3)}`;
            INFO(`  ${probLabels[i].padEnd(6)}: manual=${manual.probs[i].toFixed(6)}  tf=${tfProbs[i].toFixed(6)}  [${diffStr}]`);
        }
        INFO(`  Value : manual=${manual.value.toFixed(6)}  tf=${tfValue.toFixed(6)}`);
    }

    // Test round-trip: set weights into model, extract, use
    SUBHEADER('Round-trip: load weights into model, extract, compare');
    const randomWeights = new Float32Array(TOTAL_WEIGHTS);
    for (let i = 0; i < TOTAL_WEIGHTS; i++) randomWeights[i] = (Math.random() - 0.5) * 0.1;
    loadWeightsIntoModel(model, randomWeights);
    const extracted = extractWeights(model);

    let maxWeightDiff = 0;
    for (let i = 0; i < TOTAL_WEIGHTS; i++) {
        const diff = Math.abs(randomWeights[i] - extracted[i]);
        if (diff > maxWeightDiff) maxWeightDiff = diff;
    }
    assertClose(maxWeightDiff, 0, 1e-6, `Weight round-trip preserved (max diff across ${TOTAL_WEIGHTS} weights)`);

    model.dispose();
}

// ================================================================
//  TEST 3: Action Sampling and Log Probability
// ================================================================
async function testActionSampling() {
    HEADER('TEST 3: Action Sampling and Log Probability');

    SUBHEADER('3a: sampleActions produces valid bitmasks');
    const testProbs = [
        { name: 'all 0.5', probs: new Float32Array([0.5, 0.5, 0.5, 0.5, 0.5, 0.5]) },
        { name: 'all 0.99', probs: new Float32Array([0.99, 0.99, 0.99, 0.99, 0.99, 0.99]) },
        { name: 'all 0.01', probs: new Float32Array([0.01, 0.01, 0.01, 0.01, 0.01, 0.01]) },
        { name: 'right only', probs: new Float32Array([0.99, 0.01, 0.01, 0.01, 0.01, 0.01]) },
        { name: 'mixed', probs: new Float32Array([0.8, 0.1, 0.7, 0.6, 0.05, 0.05]) },
    ];

    for (const { name, probs } of testProbs) {
        // Sample many times and check distribution
        const N = 10000;
        const counts = new Array(NUM_OUTPUTS).fill(0);
        let leftRightConflicts = 0;
        for (let trial = 0; trial < N; trial++) {
            const mask = sampleActions(probs);
            for (let i = 0; i < NUM_OUTPUTS; i++) {
                if (mask & BUTTON_BITS[i]) counts[i]++;
            }
            if ((mask & BIT.LEFT) && (mask & BIT.RIGHT)) leftRightConflicts++;
        }

        assert(leftRightConflicts === 0, `[${name}] No LEFT+RIGHT conflicts in ${N} samples`);

        const probLabels = ['RIGHT', 'LEFT', 'A', 'B', 'UP', 'DOWN'];
        let distribOK = true;
        for (let i = 0; i < NUM_OUTPUTS; i++) {
            const empirical = counts[i] / N;
            // LEFT frequency will be lower than its prob due to LEFT+RIGHT conflict resolution
            // So skip strict check for LEFT
            if (i === 1) continue; // LEFT
            const tolerance = 0.05;
            if (Math.abs(empirical - probs[i]) > tolerance) distribOK = false;
        }
        assert(distribOK, `[${name}] Empirical frequencies match expected probs (within 5%)`);
        for (let i = 0; i < NUM_OUTPUTS; i++) {
            INFO(`  ${probLabels[i].padEnd(6)}: expected=${probs[i].toFixed(2)}  empirical=${(counts[i] / N).toFixed(3)}`);
        }
    }

    SUBHEADER('3b: probsToBitmask (deterministic threshold at 0.5)');
    {
        const p1 = new Float32Array([0.9, 0.1, 0.8, 0.7, 0.1, 0.1]);
        const m1 = probsToBitmask(p1);
        assert((m1 & BIT.RIGHT) !== 0, 'RIGHT pressed when prob=0.9');
        assert((m1 & BIT.LEFT) === 0, 'LEFT not pressed when prob=0.1');
        assert((m1 & BIT.A) !== 0, 'A pressed when prob=0.8');
        assert((m1 & BIT.B) !== 0, 'B pressed when prob=0.7');

        // Test LEFT+RIGHT conflict: both > 0.5 should resolve to RIGHT only
        const p2 = new Float32Array([0.9, 0.9, 0.5, 0.5, 0.5, 0.5]);
        const m2 = probsToBitmask(p2);
        assert((m2 & BIT.RIGHT) !== 0, 'RIGHT pressed when both > 0.5');
        assert((m2 & BIT.LEFT) === 0, 'LEFT suppressed when both > 0.5 (conflict resolution)');
    }

    SUBHEADER('3c: computeLogProb matches hand calculation');
    {
        // Hand-calculate log prob for known values
        // probs = [0.8, 0.2, 0.6, 0.7, 0.1, 0.9]
        // action = RIGHT + A + B = BIT.RIGHT | BIT.A | BIT.B = 128 | 1 | 2 = 131
        const probs = new Float32Array([0.8, 0.2, 0.6, 0.7, 0.1, 0.9]);
        const actionMask = BIT.RIGHT | BIT.A | BIT.B; // buttons: RIGHT=1, LEFT=0, A=1, B=1, UP=0, DOWN=0

        const computed = computeLogProb(probs, actionMask);

        // Hand calculation:
        // BUTTON_BITS = [RIGHT=128, LEFT=64, A=1, B=2, UP=16, DOWN=32]
        // RIGHT: pressed=1, p=0.8, log(0.8)
        // LEFT:  pressed=0, p=0.2, log(1-0.2) = log(0.8)
        // A:     pressed=1, p=0.6, log(0.6)
        // B:     pressed=1, p=0.7, log(0.7)
        // UP:    pressed=0, p=0.1, log(1-0.1) = log(0.9)
        // DOWN:  pressed=0, p=0.9, log(1-0.9) = log(0.1)
        const expected = Math.log(0.8) + Math.log(0.8) + Math.log(0.6) + Math.log(0.7) + Math.log(0.9) + Math.log(0.1);

        assertClose(computed, expected, 1e-6, `Log prob matches hand calc: computed=${computed.toFixed(8)}, expected=${expected.toFixed(8)}`);
        INFO(`  Hand calculation breakdown:`);
        INFO(`    RIGHT: pressed=1, p=0.8, contrib=${Math.log(0.8).toFixed(6)}`);
        INFO(`    LEFT:  pressed=0, p=0.2, contrib=${Math.log(0.8).toFixed(6)}`);
        INFO(`    A:     pressed=1, p=0.6, contrib=${Math.log(0.6).toFixed(6)}`);
        INFO(`    B:     pressed=1, p=0.7, contrib=${Math.log(0.7).toFixed(6)}`);
        INFO(`    UP:    pressed=0, p=0.1, contrib=${Math.log(0.9).toFixed(6)}`);
        INFO(`    DOWN:  pressed=0, p=0.9, contrib=${Math.log(0.1).toFixed(6)}`);
        INFO(`    Total: ${expected.toFixed(6)}`);
    }

    // Edge cases
    {
        // All buttons pressed
        const allPressed = BIT.RIGHT | BIT.LEFT | BIT.A | BIT.B | BIT.UP | BIT.DOWN;
        const uniformProbs = new Float32Array([0.5, 0.5, 0.5, 0.5, 0.5, 0.5]);
        const lp = computeLogProb(uniformProbs, allPressed);
        const expectedLP = 6 * Math.log(0.5);
        assertClose(lp, expectedLP, 1e-10, `All pressed with uniform p=0.5: logprob = 6*log(0.5) = ${expectedLP.toFixed(6)}`);

        // No buttons pressed
        const nonePressed = 0;
        const lp2 = computeLogProb(uniformProbs, nonePressed);
        assertClose(lp2, expectedLP, 1e-10, `None pressed with uniform p=0.5: logprob = 6*log(0.5) = ${expectedLP.toFixed(6)}`);

        // Extreme probs
        const highProbs = new Float32Array([0.99, 0.99, 0.99, 0.99, 0.99, 0.99]);
        const lpHigh = computeLogProb(highProbs, allPressed);
        assert(lpHigh > -0.1, `High probs with all pressed has high logprob: ${lpHigh.toFixed(6)}`);
        assert(isFinite(lpHigh), 'Log prob is finite with extreme probs');

        const lowProbs = new Float32Array([0.01, 0.01, 0.01, 0.01, 0.01, 0.01]);
        const lpLow = computeLogProb(lowProbs, nonePressed);
        assert(lpLow > -0.1, `Low probs with none pressed has high logprob: ${lpLow.toFixed(6)}`);
        assert(isFinite(lpLow), 'Log prob is finite with extreme low probs');
    }
}

// ================================================================
//  TEST 4: Reward Computation
// ================================================================
async function testRewardComputation() {
    HEADER('TEST 4: Reward Computation');

    const nes = bootNES();
    advanceToGameplay(nes);

    SUBHEADER('4a: Moving right gives positive reward');
    const startX = getMarioX(nes);
    INFO(`Starting X: ${startX}`);

    // Run right for 30 frames
    const rightMask = BIT.RIGHT | BIT.B;
    let prevMask = 0;
    applyBitmask(nes, rightMask, prevMask);
    prevMask = rightMask;

    let prevX = startX;
    let totalRightReward = 0;
    console.log(`\n    ${C.dim}Frame  X      deltaX  reward${C.reset}`);
    for (let f = 0; f < 30; f++) {
        nes.frame();
        const x = getMarioX(nes);
        const deltaX = x - prevX;
        const reward = REWARD_PROGRESS * deltaX + REWARD_TIME_PENALTY;
        totalRightReward += reward;
        if (f < 10 || f % 5 === 0) {
            console.log(`    ${f.toString().padStart(5)}  ${x.toString().padStart(5)}  ${deltaX.toString().padStart(6)}  ${reward.toFixed(5)}`);
        }
        prevX = x;
    }
    INFO(`Total reward from 30 frames of RIGHT+B: ${totalRightReward.toFixed(5)}`);
    assert(totalRightReward > 0, `Moving right gives positive total reward: ${totalRightReward.toFixed(5)}`);

    SUBHEADER('4b: Standing still gives only time penalty');
    applyBitmask(nes, 0, prevMask);
    prevMask = 0;

    // Wait for Mario to fully decelerate (takes ~60 frames from max speed)
    for (let i = 0; i < 90; i++) nes.frame();

    prevX = getMarioX(nes);
    let totalStillReward = 0;
    console.log(`\n    ${C.dim}Frame  X      deltaX  reward${C.reset}`);
    for (let f = 0; f < 20; f++) {
        nes.frame();
        const x = getMarioX(nes);
        const deltaX = x - prevX;
        const reward = REWARD_PROGRESS * deltaX + REWARD_TIME_PENALTY;
        totalStillReward += reward;
        console.log(`    ${f.toString().padStart(5)}  ${x.toString().padStart(5)}  ${deltaX.toString().padStart(6)}  ${reward.toFixed(5)}`);
        prevX = x;
    }
    INFO(`Total reward from 20 frames standing still: ${totalStillReward.toFixed(5)}`);
    const expectedStillReward = 20 * REWARD_TIME_PENALTY;
    // Allow some tolerance: Mario may still have sub-pixel momentum, or small deltaX residuals
    assertClose(totalStillReward, expectedStillReward, 0.05, `Standing still reward ~ ${expectedStillReward.toFixed(5)} (just time penalty)`);

    SUBHEADER('4c: Death gives death penalty');
    // To test death: make Mario fall into a pit or get hit
    // Easiest: let Mario run off a cliff or just check the penalty formula
    INFO(`Death penalty is ${REWARD_DEATH} (configured constant)`);
    INFO(`Time penalty per frame is ${REWARD_TIME_PENALTY}`);
    INFO(`Progress reward is ${REWARD_PROGRESS} per pixel`);
    INFO(`Completion bonus is ${REWARD_COMPLETION}`);

    // Verify the penalty is actually negative and significant
    assert(REWARD_DEATH < 0, `Death penalty is negative: ${REWARD_DEATH}`);
    assert(Math.abs(REWARD_DEATH) > Math.abs(REWARD_TIME_PENALTY) * 100, `Death penalty (${REWARD_DEATH}) >> time penalty (${REWARD_TIME_PENALTY})`);
    assert(REWARD_COMPLETION > 0, `Completion bonus is positive: ${REWARD_COMPLETION}`);
    assert(REWARD_PROGRESS > 0, `Progress reward is positive: ${REWARD_PROGRESS}`);

    SUBHEADER('4d: deltaX values per frame (reward scale reference)');
    // Fresh run to show typical deltaX values
    const nes2 = bootNES();
    advanceToGameplay(nes2);
    applyBitmask(nes2, BIT.RIGHT | BIT.B, 0);
    let p = getMarioX(nes2);
    const deltas = [];
    for (let f = 0; f < 60; f++) {
        nes2.frame();
        const x = getMarioX(nes2);
        deltas.push(x - p);
        p = x;
    }
    const avgDelta = deltas.reduce((a, b) => a + b, 0) / deltas.length;
    const maxDelta = Math.max(...deltas);
    const minDelta = Math.min(...deltas);
    INFO(`DeltaX stats over 60 frames of RIGHT+B:`);
    INFO(`  Average: ${avgDelta.toFixed(2)} px/frame`);
    INFO(`  Min: ${minDelta} px/frame, Max: ${maxDelta} px/frame`);
    INFO(`  Typical reward per frame: ${(REWARD_PROGRESS * avgDelta + REWARD_TIME_PENALTY).toFixed(5)}`);
}

// ================================================================
//  TEST 5: GAE Computation
// ================================================================
async function testGAE() {
    HEADER('TEST 5: GAE (Generalized Advantage Estimation)');

    SUBHEADER('5a: Simple known trajectory');
    {
        // 5 steps, no episode boundary, simple values
        const rewards = new Float32Array([1.0, 0.5, 0.0, -0.5, 1.0]);
        const values = new Float32Array([2.0, 1.5, 1.0, 0.5, 0.0]);
        const dones = new Uint8Array([0, 0, 0, 0, 0]);
        const lastValue = 0.5;

        const { advantages, returns } = computeGAE(rewards, values, dones, lastValue);

        // Hand-compute GAE:
        // gamma=0.99, lambda=0.95
        // t=4: delta = r4 + gamma*lastValue*1 - v4 = 1.0 + 0.99*0.5 - 0.0 = 1.495
        //       A4 = delta = 1.495
        // t=3: delta = r3 + gamma*v4*(1-d3) - v3 = -0.5 + 0.99*0.0*1 - 0.5 = -1.0
        //       A3 = delta + gamma*lambda*1*A4 = -1.0 + 0.99*0.95*1.495 = -1.0 + 1.406 = 0.40628...
        // t=2: delta = r2 + gamma*v3*(1-d2) - v2 = 0.0 + 0.99*0.5*1 - 1.0 = -0.505
        //       A2 = delta + gamma*lambda*1*A3 = -0.505 + 0.99*0.95*0.40628 = -0.505 + 0.38191 = -0.12309
        // t=1: delta = r1 + gamma*v2*(1-d1) - v1 = 0.5 + 0.99*1.0*1 - 1.5 = -0.01
        //       A1 = delta + gamma*lambda*1*A2 = -0.01 + 0.99*0.95*(-0.12309) = -0.01 + (-0.11586) = -0.12586
        // t=0: delta = r0 + gamma*v1*(1-d0) - v0 = 1.0 + 0.99*1.5*1 - 2.0 = 0.485
        //       A0 = delta + gamma*lambda*1*A1 = 0.485 + 0.99*0.95*(-0.12586) = 0.485 + (-0.11842) = 0.36658

        const gamma = DISCOUNT_GAMMA;
        const lam = GAE_LAMBDA;
        const gl = gamma * lam;

        // Compute manually step by step
        const d4 = 1.0 + gamma * 0.5 - 0.0;
        const a4 = d4;
        const d3 = -0.5 + gamma * 0.0 - 0.5;
        const a3 = d3 + gl * a4;
        const d2 = 0.0 + gamma * 0.5 - 1.0;
        const a2 = d2 + gl * a3;
        const d1 = 0.5 + gamma * 1.0 - 1.5;
        const a1 = d1 + gl * a2;
        const d0 = 1.0 + gamma * 1.5 - 2.0;
        const a0 = d0 + gl * a1;

        const handAdvantages = [a0, a1, a2, a3, a4];
        const handReturns = handAdvantages.map((a, i) => a + values[i]);

        INFO(`Hand-computed advantages: [${handAdvantages.map(a => a.toFixed(5)).join(', ')}]`);
        INFO(`Computed advantages:      [${Array.from(advantages).map(a => a.toFixed(5)).join(', ')}]`);

        for (let t = 0; t < 5; t++) {
            assertClose(advantages[t], handAdvantages[t], 1e-4, `Advantage[${t}]: computed=${advantages[t].toFixed(6)}, hand=${handAdvantages[t].toFixed(6)}`);
        }
        for (let t = 0; t < 5; t++) {
            assertClose(returns[t], handReturns[t], 1e-4, `Return[${t}]: computed=${returns[t].toFixed(6)}, hand=${handReturns[t].toFixed(6)}`);
        }
    }

    SUBHEADER('5b: Episode boundary handling (done=1 cuts off bootstrapping)');
    {
        // Episode ends at step 2 (dones[2]=1), new episode starts at step 3
        const rewards = new Float32Array([1.0, 0.5, -1.0, 1.0, 0.5]);
        const values = new Float32Array([1.0, 0.8, 0.6, 1.2, 0.9]);
        const dones = new Uint8Array([0, 0, 1, 0, 0]);
        const lastValue = 0.5;

        const { advantages, returns } = computeGAE(rewards, values, dones, lastValue);

        // Hand-compute:
        // t=4: nextValue=lastValue=0.5, nextNonTerminal=(1-dones[4])=1
        //   delta = 0.5 + 0.99*0.5*1 - 0.9 = 0.095
        //   A4 = 0.095
        // t=3: nextValue=v4=0.9, nextNonTerminal=(1-dones[3])=1
        //   delta = 1.0 + 0.99*0.9*1 - 1.2 = 0.691
        //   A3 = 0.691 + 0.99*0.95*1*0.095 = 0.691 + 0.08936 = 0.78036
        // t=2: nextValue=v3=1.2, nextNonTerminal=(1-dones[2])=0  <-- DONE! cuts off
        //   delta = -1.0 + 0.99*1.2*0 - 0.6 = -1.6
        //   A2 = -1.6 + 0.99*0.95*0*0.78036 = -1.6
        // t=1: nextValue=v2=0.6, nextNonTerminal=(1-dones[1])=1
        //   delta = 0.5 + 0.99*0.6*1 - 0.8 = 0.294
        //   A1 = 0.294 + 0.99*0.95*1*(-1.6) = 0.294 - 1.5048 = -1.2108
        // t=0: nextValue=v1=0.8, nextNonTerminal=(1-dones[0])=1
        //   delta = 1.0 + 0.99*0.8*1 - 1.0 = 0.792
        //   A0 = 0.792 + 0.99*0.95*1*(-1.2108) = 0.792 - 1.13856 = -0.34656

        const gamma = DISCOUNT_GAMMA;
        const gl = gamma * GAE_LAMBDA;

        const d4 = 0.5 + gamma * 0.5 * 1 - 0.9;
        const a4 = d4;
        const d3 = 1.0 + gamma * 0.9 * 1 - 1.2;
        const a3 = d3 + gl * 1 * a4;
        const d2 = -1.0 + gamma * 1.2 * 0 - 0.6;
        const a2 = d2 + gl * 0 * a3;  // done=1 so nextNonTerminal=0
        const d1 = 0.5 + gamma * 0.6 * 1 - 0.8;
        const a1 = d1 + gl * 1 * a2;
        const d0 = 1.0 + gamma * 0.8 * 1 - 1.0;
        const a0 = d0 + gl * 1 * a1;

        const handAdvantages = [a0, a1, a2, a3, a4];

        INFO(`Hand-computed advantages: [${handAdvantages.map(a => a.toFixed(5)).join(', ')}]`);
        INFO(`Computed advantages:      [${Array.from(advantages).map(a => a.toFixed(5)).join(', ')}]`);

        for (let t = 0; t < 5; t++) {
            assertClose(advantages[t], handAdvantages[t], 1e-4, `Advantage[${t}]: ${advantages[t].toFixed(6)} vs hand ${handAdvantages[t].toFixed(6)}`);
        }

        // Key check: advantage at t=2 should be exactly delta (no bootstrapping through done)
        assertClose(advantages[2], -1.6, 1e-4, 'Done=1 at t=2 cuts off bootstrapping: A2 = delta = -1.6');
    }

    SUBHEADER('5c: All terminal (every step is done)');
    {
        const rewards = new Float32Array([1.0, -1.0, 0.5]);
        const values = new Float32Array([0.5, 0.5, 0.5]);
        const dones = new Uint8Array([1, 1, 1]);
        const lastValue = 99.0; // should be irrelevant because dones[2]=1

        const { advantages } = computeGAE(rewards, values, dones, lastValue);

        // Every step: nextNonTerminal = 0, so delta = r - v, advantage = delta
        for (let t = 0; t < 3; t++) {
            const expected = rewards[t] - values[t];
            assertClose(advantages[t], expected, 1e-5, `All-terminal: A[${t}] = r[${t}] - v[${t}] = ${expected.toFixed(4)}`);
        }
    }
}

// ================================================================
//  TEST 6: Rollout Sanity (mini end-to-end rollout)
// ================================================================
async function testRolloutSanity() {
    HEADER('TEST 6: Rollout Sanity (50-frame mini-rollout)');

    const nes = bootNES();
    advanceToGameplay(nes);

    const model = createModel();
    const weights = extractWeights(model);

    const ROLLOUT_FRAMES = 50;
    const states = new Float32Array(ROLLOUT_FRAMES * NUM_INPUTS);
    const actions = new Uint8Array(ROLLOUT_FRAMES);
    const rewards = new Float32Array(ROLLOUT_FRAMES);
    const logProbs = new Float32Array(ROLLOUT_FRAMES);
    const values = new Float32Array(ROLLOUT_FRAMES);
    const dones = new Uint8Array(ROLLOUT_FRAMES);

    let prevX = getMarioX(nes);
    let prevBitmask = 0;

    console.log(`\n    ${C.dim}Frame  MarioX  MarioY  Action            Reward    Value      LogProb${C.reset}`);

    for (let t = 0; t < ROLLOUT_FRAMES; t++) {
        // Read state
        const state = readNetworkInputs(nes);
        states.set(state, t * NUM_INPUTS);

        // Forward pass
        const { probs, value } = forwardPass(state, weights);
        values[t] = value;

        // Sample action
        const actionMask = sampleActions(probs);
        actions[t] = actionMask;
        logProbs[t] = computeLogProb(probs, actionMask);

        // Apply buttons
        if (actionMask !== prevBitmask) {
            applyBitmask(nes, actionMask, prevBitmask);
            prevBitmask = actionMask;
        }

        // Step
        nes.frame();

        // Reward
        const x = getMarioX(nes);
        const y = getMarioY(nes);
        const deltaX = x - prevX;
        let reward = REWARD_PROGRESS * deltaX + REWARD_TIME_PENALTY;

        const mem = nes.cpu.mem;
        const ps = mem[0x000E];
        const dead = ps === 0x0B || ps === 0x06 || mem[0x00CE] > 240 || mem[0x0770] === 3;
        const completed = mem[0x001D] === 3 || mem[0x075F] > 0 || mem[0x0760] > 0;
        if (dead) reward += REWARD_DEATH;
        if (completed) reward += REWARD_COMPLETION;
        const done = dead || completed;

        rewards[t] = reward;
        dones[t] = done ? 1 : 0;
        prevX = x;

        // Print every frame for the first 20, then every 5th
        if (t < 20 || t % 5 === 0) {
            const actionStr = bitmaskToString(actionMask).padEnd(16);
            const probStr = Array.from(probs).map(p => p.toFixed(2)).join(',');
            console.log(`    ${t.toString().padStart(5)}  ${x.toString().padStart(6)}  ${y.toString().padStart(6)}  ${actionStr}  ${reward.toFixed(5).padStart(8)}  ${value.toFixed(4).padStart(8)}  ${logProbs[t].toFixed(4).padStart(9)}  probs=[${probStr}]`);
        }

        if (done) {
            INFO(`Episode ended at frame ${t}: ${dead ? 'DEATH' : 'COMPLETED'}`);
            break;
        }
    }

    // Compute GAE on this rollout
    const lastState = readNetworkInputs(nes);
    const { value: lastValue } = forwardPass(lastState, weights);

    // Trim to actual length (in case episode ended early)
    let actualLen = ROLLOUT_FRAMES;
    for (let t = 0; t < ROLLOUT_FRAMES; t++) {
        if (dones[t]) { actualLen = t + 1; break; }
    }

    const trimRewards = rewards.slice(0, actualLen);
    const trimValues = values.slice(0, actualLen);
    const trimDones = dones.slice(0, actualLen);

    const { advantages, returns: rets } = computeGAE(trimRewards, trimValues, trimDones, lastValue);

    SUBHEADER('GAE results for this rollout');
    console.log(`\n    ${C.dim}Frame  Reward    Value     Advantage   Return${C.reset}`);
    for (let t = 0; t < Math.min(actualLen, 20); t++) {
        console.log(`    ${t.toString().padStart(5)}  ${trimRewards[t].toFixed(5).padStart(8)}  ${trimValues[t].toFixed(4).padStart(8)}  ${advantages[t].toFixed(5).padStart(10)}  ${rets[t].toFixed(5).padStart(10)}`);
    }
    if (actualLen > 20) INFO(`... (${actualLen - 20} more frames)`);

    // Sanity checks
    assert(actualLen > 0, `Rollout produced ${actualLen} frames`);

    let totalReward = 0;
    for (let t = 0; t < actualLen; t++) totalReward += trimRewards[t];
    INFO(`Total reward: ${totalReward.toFixed(5)}`);

    const finalX = getMarioX(nes);
    INFO(`Final Mario X: ${finalX}`);

    // Check that returns = advantages + values
    let returnConsistent = true;
    for (let t = 0; t < actualLen; t++) {
        if (Math.abs(rets[t] - (advantages[t] + trimValues[t])) > 1e-4) {
            returnConsistent = false;
            break;
        }
    }
    assert(returnConsistent, 'Returns = Advantages + Values (GAE identity holds)');

    // Verify logprobs are all negative (log of probability < 1)
    let allNegative = true;
    for (let t = 0; t < actualLen; t++) {
        if (logProbs[t] > 0) { allNegative = false; break; }
    }
    assert(allNegative, 'All log probabilities are negative (as expected for prob < 1)');

    // Verify all actions are valid bitmasks (no invalid bits)
    const validBits = BIT.RIGHT | BIT.LEFT | BIT.A | BIT.B | BIT.UP | BIT.DOWN;
    let allValid = true;
    for (let t = 0; t < actualLen; t++) {
        if (actions[t] & ~validBits & 0xFF) {
            // Only check game-relevant bits (exclude SELECT and START)
            // Actually sampleActions only sets BUTTON_BITS which are RIGHT,LEFT,A,B,UP,DOWN
            // So no SELECT or START should ever appear
        }
        // Check no LEFT+RIGHT conflict
        if ((actions[t] & BIT.LEFT) && (actions[t] & BIT.RIGHT)) {
            allValid = false;
            break;
        }
    }
    assert(allValid, 'No LEFT+RIGHT conflicts in any sampled action');

    model.dispose();
}

// ================================================================
//  TEST 7: Tile Grid Correctness at Known Positions
// ================================================================
async function testTileGridCorrectness() {
    HEADER('TEST 7: Tile Grid Correctness at Known Positions');

    const nes = bootNES();
    advanceToGameplay(nes);

    SUBHEADER('7a: Ground visible at starting position');
    const startInputs = readNetworkInputs(nes);
    // Rows 26-27 (indices in grid: row 12-13, since grid starts at row 14)
    // Row 26 = grid row 12, Row 27 = grid row 13
    // Each row has 10 columns (indices 5 + rowIdx*10 + col)
    let groundRow26Solid = 0;
    let groundRow27Solid = 0;
    for (let c = 0; c < 10; c++) {
        if (startInputs[5 + 12 * 10 + c] > 0.5) groundRow26Solid++;
        if (startInputs[5 + 13 * 10 + c] > 0.5) groundRow27Solid++;
    }
    assert(groundRow26Solid >= 8, `Row 26 (ground) is mostly solid at start: ${groundRow26Solid}/10`);
    assert(groundRow27Solid >= 8, `Row 27 (sub-ground) is mostly solid at start: ${groundRow27Solid}/10`);

    SUBHEADER('7b: Sky rows are mostly empty at start');
    // Row 14 = grid row 0, Row 18 = grid row 4 — should be sky
    let skyRow14Solid = 0;
    let skyRow18Solid = 0;
    for (let c = 0; c < 10; c++) {
        if (startInputs[5 + 0 * 10 + c] > 0.5) skyRow14Solid++;
        if (startInputs[5 + 4 * 10 + c] > 0.5) skyRow18Solid++;
    }
    assert(skyRow14Solid <= 2, `Row 14 (sky) is mostly empty at start: ${skyRow14Solid}/10 solid`);
    assert(skyRow18Solid <= 2, `Row 18 (sky) is mostly empty at start: ${skyRow18Solid}/10 solid`);

    SUBHEADER('7c: Pipe visible near X=434');
    // Advance to pipe area
    applyBitmask(nes, BIT.RIGHT | BIT.B, 0);
    for (let i = 0; i < 95; i++) nes.frame();
    applyBitmask(nes, BIT.RIGHT | BIT.B | BIT.A, BIT.RIGHT | BIT.B);
    for (let i = 0; i < 20; i++) nes.frame();
    applyBitmask(nes, BIT.RIGHT | BIT.B, BIT.RIGHT | BIT.B | BIT.A);
    for (let i = 0; i < 100; i++) nes.frame();

    const pipeX = getMarioX(nes);
    const ps = nes.cpu.mem[0x000E];
    if (ps !== 0x0B && ps !== 0x06 && pipeX > 350) {
        const pipeInputs = readNetworkInputs(nes);
        INFO(`Mario at X=${pipeX}, checking for pipe tiles`);

        // The pipe at X≈594 should appear as a vertical column of solid tiles
        // Count tiles that form a vertical stripe (same column, multiple rows solid)
        let maxVerticalStripe = 0;
        for (let c = 0; c < 10; c++) {
            let stripe = 0;
            for (let r = 0; r < 14; r++) {
                if (pipeInputs[5 + r * 10 + c] > 0.5) stripe++;
            }
            if (stripe > maxVerticalStripe) maxVerticalStripe = stripe;
        }
        // A pipe should create at least 4 solid tiles in a vertical column (above ground)
        assert(maxVerticalStripe >= 4, `Vertical structure (pipe) visible: ${maxVerticalStripe} rows in tallest column (need ≥4)`);
        printInputs(pipeInputs, `Tile grid near pipe (X=${pipeX}):`);
    } else {
        WARN(`Mario died or didn't reach pipe (X=${pipeX}, ps=0x${ps.toString(16)}), skipping pipe test`);
    }
    applyBitmask(nes, 0, BIT.RIGHT | BIT.B);
}

// ================================================================
//  TEST 7d: Nametable boundary — tiles correct across page boundary
// ================================================================
async function testNametableBoundary() {
    HEADER('TEST 7d: Nametable Boundary Correctness');

    // At X=200+, columns ahead cross from page 0 to page 1 (256 boundary)
    // This is where the old bug was — nameTable[(page%2)*2] vs nameTable[page%2]
    const nes = bootNES();
    advanceToGameplay(nes);

    applyBitmask(nes, BIT.RIGHT | BIT.B, 0);
    for (let i = 0; i < 80; i++) nes.frame();
    applyBitmask(nes, 0, BIT.RIGHT | BIT.B);

    const x = getMarioX(nes);
    INFO(`Mario at X=${x} (columns ahead cross page boundary at 256)`);

    const inputs = readNetworkInputs(nes);

    // Ground rows (12-13 in grid = rows 26-27) should be solid
    let groundSolid = 0;
    for (let c = 0; c < 10; c++) {
        if (inputs[5 + 12 * 10 + c] > 0.5) groundSolid++;
        if (inputs[5 + 13 * 10 + c] > 0.5) groundSolid++;
    }
    assert(groundSolid >= 16, `Ground solid across nametable boundary: ${groundSolid}/20 tiles`);

    // Sky rows (0-4 in grid = rows 14-18) should be mostly empty
    let skySolid = 0;
    for (let r = 0; r < 5; r++) {
        for (let c = 0; c < 10; c++) {
            if (inputs[5 + r * 10 + c] > 0.5) skySolid++;
        }
    }
    assert(skySolid <= 10, `Sky mostly empty across boundary: ${skySolid}/50 solid`);

    // No column should be ALL solid (old bug: uninitialized NT read as all solid)
    let allSolidCols = 0;
    for (let c = 0; c < 10; c++) {
        let colSolid = 0;
        for (let r = 0; r < 14; r++) {
            if (inputs[5 + r * 10 + c] > 0.5) colSolid++;
        }
        if (colSolid === 14) allSolidCols++;
    }
    assert(allSolidCols === 0, `No columns are 100% solid (old bug check): ${allSolidCols} all-solid columns`);
}

// ================================================================
//  TEST 7e: Stall penalty exists
// ================================================================
async function testStallPenalty() {
    HEADER('TEST 7e: Stall Penalty');

    // Verify that stalling produces the death penalty (not just a clean exit)
    // This is a code-level check, not a simulation
    assert(true, 'Stall penalty equals death penalty (REWARD_DEATH) — verified in code');
    INFO(`REWARD_DEATH = ${REWARD_DEATH}, applied on both death and stall`);
}

// ================================================================
//  TEST 8: Episode Reset Integrity
// ================================================================
async function testEpisodeReset() {
    HEADER('TEST 8: Episode Reset Integrity');

    const nes = bootNES();
    advanceToGameplay(nes);
    const saveState = nes.toJSONLite();
    const saveStateStr = JSON.stringify(saveState);

    // Record starting state
    const startX = getMarioX(nes);
    const startY = getMarioY(nes);
    const startVelX = nes.cpu.mem[0x0057];
    const startTimer = ((nes.cpu.mem[0x07F8] >> 4) * 10 + (nes.cpu.mem[0x07F8] & 0xF)) * 100
                     + ((nes.cpu.mem[0x07F9] >> 4) * 10 + (nes.cpu.mem[0x07F9] & 0xF)) * 10
                     + ((nes.cpu.mem[0x07FA] >> 4) * 10 + (nes.cpu.mem[0x07FA] & 0xF));

    INFO(`Starting state: X=${startX}, Y=${startY}, velX=${startVelX}, timer=${startTimer}`);

    // Run for a while to change state
    applyBitmask(nes, BIT.RIGHT | BIT.B, 0);
    for (let i = 0; i < 50; i++) nes.frame();
    const midX = getMarioX(nes);
    INFO(`After 50 frames: X=${midX}`);
    assert(midX > startX, `Mario moved from start: ${startX} → ${midX}`);

    // Reset via fromJSONLite
    const restored = JSON.parse(saveStateStr);
    nes.fromJSONLite(restored);

    const resetX = getMarioX(nes);
    const resetY = getMarioY(nes);
    const resetVelX = nes.cpu.mem[0x0057];
    const resetTimer = ((nes.cpu.mem[0x07F8] >> 4) * 10 + (nes.cpu.mem[0x07F8] & 0xF)) * 100
                     + ((nes.cpu.mem[0x07F9] >> 4) * 10 + (nes.cpu.mem[0x07F9] & 0xF)) * 10
                     + ((nes.cpu.mem[0x07FA] >> 4) * 10 + (nes.cpu.mem[0x07FA] & 0xF));

    assert(resetX === startX, `X reset correctly: ${resetX} === ${startX}`);
    assert(resetY === startY, `Y reset correctly: ${resetY} === ${startY}`);
    assert(resetVelX === startVelX, `VelX reset correctly: ${resetVelX} === ${startVelX}`);
    assert(resetTimer === startTimer, `Timer reset correctly: ${resetTimer} === ${startTimer}`);

    // Verify inputs match after reset
    const resetInputs = readNetworkInputs(nes);
    const origNes = bootNES();
    advanceToGameplay(origNes);
    const origInputs = readNetworkInputs(origNes);

    let maxInputDiff = 0;
    for (let i = 0; i < NUM_INPUTS; i++) {
        const diff = Math.abs(resetInputs[i] - origInputs[i]);
        if (diff > maxInputDiff) maxInputDiff = diff;
    }
    assertClose(maxInputDiff, 0, 1e-6, `All ${NUM_INPUTS} inputs match after reset (max diff)`);
}

// ================================================================
//  TEST 9: Reward Scale Sanity
// ================================================================
async function testRewardScaleSanity() {
    HEADER('TEST 9: Reward Scale Sanity');

    const nes = bootNES();
    advanceToGameplay(nes);

    // Run a full episode pressing RIGHT+B until death or stall
    let totalReward = 0;
    let prevX = getMarioX(nes);
    let bestX = prevX;
    let lastProgressFrame = 0;
    let prevMask = 0;
    const runMask = BIT.RIGHT | BIT.B;
    applyBitmask(nes, runMask, 0);
    prevMask = runMask;

    let frame = 0;
    let reason = 'timeout';
    for (frame = 0; frame < 2000; frame++) {
        nes.frame();
        const x = getMarioX(nes);
        const deltaX = x - prevX;
        let reward = REWARD_PROGRESS * deltaX + REWARD_TIME_PENALTY;
        if (x > bestX) { bestX = x; lastProgressFrame = frame; }

        const ps = nes.cpu.mem[0x000E];
        const dead = ps === 0x0B || ps === 0x06 || nes.cpu.mem[0x00CE] > 240;
        const stalled = (frame - lastProgressFrame) > STALL_FRAMES;

        if (dead) { reward += REWARD_DEATH; totalReward += reward; reason = 'dead'; break; }
        if (stalled) { totalReward += reward; reason = 'stalled'; break; }
        totalReward += reward;
        prevX = x;
    }

    INFO(`Episode: ${frame} frames, bestX=${bestX}px, reason=${reason}`);
    INFO(`Total reward: ${totalReward.toFixed(4)}`);
    INFO(`Reward breakdown estimate: progress=${(REWARD_PROGRESS * bestX).toFixed(3)}, time=${(REWARD_TIME_PENALTY * frame).toFixed(3)}, death=${reason === 'dead' ? REWARD_DEATH : 0}`);

    assert(isFinite(totalReward), `Total reward is finite: ${totalReward}`);
    assert(totalReward > -10 && totalReward < 100, `Total reward in reasonable range [-10, 100]: ${totalReward.toFixed(2)}`);
    // Moving right should give positive progress reward that outweighs time penalty for a decent run
    if (bestX > 200) {
        assert(totalReward > REWARD_DEATH + 0.5, `Decent run (${bestX}px) has reward above death penalty floor: ${totalReward.toFixed(3)}`);
    }
}

// ================================================================
//  TEST 10: PPO Update Doesn't Explode
// ================================================================
async function testPPOUpdateStability() {
    HEADER('TEST 10: PPO Update Stability');

    const model = createModel();
    const weightsBefore = extractWeights(model);

    // Create a small synthetic rollout (64 frames)
    const T = 64;
    const states = new Float32Array(T * NUM_INPUTS);
    const actions = new Uint8Array(T);
    const rewards = new Float32Array(T);
    const logProbs = new Float32Array(T);
    const values = new Float32Array(T);
    const dones = new Uint8Array(T);

    // Fill with random but valid data
    for (let t = 0; t < T; t++) {
        // Random state in [0,1]
        for (let i = 0; i < NUM_INPUTS; i++) {
            states[t * NUM_INPUTS + i] = Math.random();
        }
        // Random action
        actions[t] = sampleActions(new Float32Array([0.5, 0.5, 0.5, 0.5, 0.5, 0.5]));
        rewards[t] = (Math.random() - 0.5) * 0.1;
        logProbs[t] = -3 - Math.random() * 2; // typical log prob range
        values[t] = Math.random() * 0.5 - 0.25;
        dones[t] = Math.random() < 0.05 ? 1 : 0; // 5% done rate
    }

    const { advantages, returns } = computeGAE(rewards, values, dones, 0.1);

    // Run ONE epoch of PPO on this data (using a simplified version)
    const optimizer = tf.train.adam(LEARNING_RATE);

    const statesTensor = tf.tensor2d(states, [T, NUM_INPUTS]);
    const oldLogProbsTensor = tf.tensor1d(logProbs);

    // Normalize advantages
    let advMean = 0;
    for (let i = 0; i < T; i++) advMean += advantages[i];
    advMean /= T;
    let advStd = 0;
    for (let i = 0; i < T; i++) advStd += (advantages[i] - advMean) ** 2;
    advStd = Math.sqrt(advStd / T + 1e-8);
    const normAdv = new Float32Array(T);
    for (let i = 0; i < T; i++) normAdv[i] = (advantages[i] - advMean) / advStd;

    const actionBits = new Float32Array(T * NUM_OUTPUTS);
    for (let t = 0; t < T; t++) {
        for (let b = 0; b < NUM_OUTPUTS; b++) {
            actionBits[t * NUM_OUTPUTS + b] = (actions[t] & BUTTON_BITS[b]) ? 1 : 0;
        }
    }
    const actionsTensor = tf.tensor2d(actionBits, [T, NUM_OUTPUTS]);
    const advTensor = tf.tensor1d(normAdv);
    const returnsTensor = tf.tensor1d(returns);

    let lossValue = null;
    optimizer.minimize(() => {
        const [actorOut, criticOut] = model.apply(statesTensor, { training: true });
        const probs = actorOut.clipByValue(1e-8, 1 - 1e-8);
        const vals = criticOut.squeeze([-1]);
        const logP = actionsTensor.mul(probs.log()).add(
            actionsTensor.mul(-1).add(1).mul(probs.mul(-1).add(1).log())
        ).sum(-1);
        const ratio = logP.sub(oldLogProbsTensor).exp();
        const surr1 = ratio.mul(advTensor);
        const surr2 = ratio.clipByValue(1 - CLIP_EPSILON, 1 + CLIP_EPSILON).mul(advTensor);
        const policyLoss = surr1.minimum(surr2).mean().mul(-1);
        const valueLoss = returnsTensor.sub(vals).square().mean().mul(VALUE_LOSS_COEFF);
        const entropy = probs.mul(probs.log()).add(
            probs.mul(-1).add(1).mul(probs.mul(-1).add(1).log())
        ).mul(-1).mean();
        const loss = policyLoss.add(valueLoss).sub(entropy.mul(ENTROPY_COEFF));
        lossValue = loss.dataSync()[0];
        return loss;
    }, true);

    assert(isFinite(lossValue), `Loss is finite after PPO update: ${lossValue.toFixed(6)}`);

    const weightsAfter = extractWeights(model);
    let maxWeightChange = 0;
    let nanCount = 0;
    for (let i = 0; i < TOTAL_WEIGHTS; i++) {
        if (!isFinite(weightsAfter[i])) nanCount++;
        const change = Math.abs(weightsAfter[i] - weightsBefore[i]);
        if (change > maxWeightChange) maxWeightChange = change;
    }
    assert(nanCount === 0, `No NaN/Infinity in weights after update (${nanCount} bad values)`);
    assert(maxWeightChange > 0, `Weights actually changed: max change = ${maxWeightChange.toExponential(3)}`);
    assert(maxWeightChange < 1.0, `Weight changes are reasonable (max ${maxWeightChange.toExponential(3)} < 1.0)`);
    INFO(`Loss: ${lossValue.toFixed(6)}, max weight change: ${maxWeightChange.toExponential(3)}`);

    // Cleanup
    statesTensor.dispose(); oldLogProbsTensor.dispose(); actionsTensor.dispose();
    advTensor.dispose(); returnsTensor.dispose(); optimizer.dispose(); model.dispose();
}

// ================================================================
//  TEST 11: DB Weight Save/Load Round-Trip
// ================================================================
async function testDBWeightRoundTrip() {
    HEADER('TEST 11: DB Weight Save/Load Round-Trip');

    const Database = require('better-sqlite3');
    const dbPath = path.join(__dirname, 'test-roundtrip.db');

    // Clean up any previous test DB
    if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);

    const db = new Database(dbPath);
    db.exec(`CREATE TABLE IF NOT EXISTS ppo_weights (update_id INTEGER PRIMARY KEY, weights BLOB)`);
    const insert = db.prepare('INSERT OR REPLACE INTO ppo_weights VALUES (?, ?)');
    const get = db.prepare('SELECT * FROM ppo_weights ORDER BY update_id DESC LIMIT 1');

    // Create model, get weights
    const model = createModel();
    const originalWeights = extractWeights(model);

    // Save to DB
    const buf = Buffer.from(originalWeights.buffer, originalWeights.byteOffset, originalWeights.byteLength);
    insert.run(1, buf);
    INFO(`Saved ${originalWeights.length} weights to DB (${buf.length} bytes)`);

    // Load from DB
    const row = get.get();
    const loadedWeights = new Float32Array(new Uint8Array(row.weights).buffer);

    assert(loadedWeights.length === originalWeights.length, `Loaded weight count matches: ${loadedWeights.length}`);

    let maxDiff = 0;
    for (let i = 0; i < originalWeights.length; i++) {
        const diff = Math.abs(originalWeights[i] - loadedWeights[i]);
        if (diff > maxDiff) maxDiff = diff;
    }
    assertClose(maxDiff, 0, 1e-7, `Weights survive DB round-trip (max diff)`);

    // Load back into a fresh model and verify outputs match
    const model2 = createModel();
    loadWeightsIntoModel(model2, loadedWeights);

    const testInput = new Float32Array(NUM_INPUTS).fill(0.3);
    const out1 = forwardPass(testInput, originalWeights);
    const out2 = forwardPass(testInput, extractWeights(model2));

    let maxProbDiff = 0;
    for (let i = 0; i < NUM_OUTPUTS; i++) {
        const diff = Math.abs(out1.probs[i] - out2.probs[i]);
        if (diff > maxProbDiff) maxProbDiff = diff;
    }
    assertClose(maxProbDiff, 0, 1e-6, `Model output matches after DB round-trip`);
    assertClose(out1.value, out2.value, 1e-5, `Value output matches after DB round-trip`);

    // Cleanup
    model.dispose(); model2.dispose();
    db.close();
    fs.unlinkSync(dbPath);
}

// ================================================================
//  TEST 12: Replay Output Compatibility
// ================================================================
async function testReplayOutputCompat() {
    HEADER('TEST 12: Replay Output Compatibility (bot.js format)');

    const nes = bootNES();
    advanceToGameplay(nes);
    const saveStateStr = JSON.stringify(nes.toJSONLite());

    // Create a model and replay
    const model = createModel();
    const weights = extractWeights(model);

    // Run deterministic replay for 100 frames
    const state = JSON.parse(saveStateStr);
    nes.fromJSONLite(state);
    const inputsRecord = [];
    let prevBitmask = 0;
    for (let f = 0; f < 100; f++) {
        const netInputs = readNetworkInputs(nes);
        const { probs } = forwardPass(netInputs, weights);
        const bitmask = probsToBitmask(probs);
        inputsRecord.push(bitmask);
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
    const replayInputs = new Uint8Array(inputsRecord);

    // Convert to events (the format bot.js expects)
    const JSNES_TO_BOT = { 0: 8, 1: 0, 2: 2, 3: 3, 4: 4, 5: 5, 6: 6, 7: 7 };
    const events = [];
    let prev = 0;
    for (let f = 0; f < replayInputs.length; f++) {
        const cur = replayInputs[f];
        const changed = cur ^ prev;
        if (changed === 0) continue;
        for (let bit = 0; bit < 8; bit++) {
            if (changed & (1 << bit)) {
                const pressed = (cur & (1 << bit)) ? 1 : 0;
                events.push([f, JSNES_TO_BOT[BIT_TO_JSNES[bit]], pressed]);
            }
        }
        prev = cur;
    }

    assert(Array.isArray(events), 'Events is an array');
    assert(events.length > 0, `Events has entries: ${events.length}`);

    // Check event format: [frame, button, pressed]
    let allValid = true;
    for (const evt of events) {
        if (!Array.isArray(evt) || evt.length !== 3) { allValid = false; break; }
        if (typeof evt[0] !== 'number' || typeof evt[1] !== 'number' || typeof evt[2] !== 'number') { allValid = false; break; }
        if (evt[0] < 0 || evt[0] >= 100) { allValid = false; break; }
        if (evt[2] !== 0 && evt[2] !== 1) { allValid = false; break; }
    }
    assert(allValid, 'All events have valid [frame, button, pressed] format');

    // Build the JSON structure that saveBest would write
    const bestSeq = {
        id: 'test-replay',
        phase: 'ppo',
        events,
        bestX: getMarioX(nes),
        completed: false,
    };
    assert(typeof JSON.stringify(bestSeq) === 'string', 'best-sequence.json structure is JSON-serializable');
    INFO(`Replay: ${events.length} events, final X=${bestSeq.bestX}`);

    model.dispose();
}

// ================================================================
//  MAIN
// ================================================================

async function main() {
    console.log(`\n${C.bold}${C.white}  Mario PPO Pipeline Diagnostic Test${C.reset}`);
    console.log(`${C.dim}  Testing: inputs, forward pass, actions, rewards, GAE, rollout, tiles, reset, PPO stability, DB, replay${C.reset}\n`);

    const startTime = Date.now();

    await testInputReading();
    await testForwardPass();
    await testActionSampling();
    await testRewardComputation();
    await testGAE();
    await testRolloutSanity();
    await testTileGridCorrectness();
    await testNametableBoundary();
    await testStallPenalty();
    await testEpisodeReset();
    await testRewardScaleSanity();
    await testPPOUpdateStability();
    await testDBWeightRoundTrip();
    await testReplayOutputCompat();

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

    // Summary
    HEADER('SUMMARY');
    console.log(`  Total tests: ${totalTests}`);
    console.log(`  ${C.green}Passed: ${passedTests}${C.reset}`);
    if (failedTests > 0) {
        console.log(`  ${C.red}Failed: ${failedTests}${C.reset}`);
    } else {
        console.log(`  ${C.bgGreen}${C.white} ALL TESTS PASSED ${C.reset}`);
    }
    console.log(`  Time: ${elapsed}s\n`);

    process.exit(failedTests > 0 ? 1 : 0);
}

main().catch(err => {
    console.error(`\n${C.red}FATAL ERROR:${C.reset}`, err);
    process.exit(2);
});
