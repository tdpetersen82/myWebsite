#!/usr/bin/env node
// Mario PPO — Neural network learns to play Mario via reinforcement learning.
// See GOAL.md for what we're building, FAILED-APPROACHES.md for what doesn't work.
// Usage: node optimize.js [--new | --continue]
// Press +/- to add/remove worker threads on the fly.

import fs from 'fs';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';
import { Worker, isMainThread, parentPort, workerData } from 'worker_threads';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ==================== CONFIG ====================

const MAX_FRAMES = 8000;
const STALL_FRAMES = 180; // 3 seconds — triggers within 512-frame rollout after pipe (~200f run + 180f stall = 380f)
const LEVEL_WIDTH = 3200;
const NUM_WORKERS = Math.max(1, os.cpus().length - 1);

// Network architecture: shared-trunk actor-critic
// 156 inputs → 64 hidden (ReLU) → 32 hidden (ReLU) → 6 actor (sigmoid) + 1 critic (linear)
const NUM_INPUTS = 156;   // 5 mario + 140 tiles (10 cols × 14 rows) + 10 enemies (5×2) + 1 timer
const H1 = 64;
const H2 = 32;
const NUM_OUTPUTS = 6;    // RIGHT, LEFT, A, B, UP, DOWN

// Weight layout for flat Float32Array (must match TF.js extraction order)
// TF.js dense layers store [kernel, bias] pairs in creation order
const W = {};
W.ih1_k = 0;                                       // input→h1 kernel: NUM_INPUTS×H1
W.ih1_b = W.ih1_k + NUM_INPUTS * H1;               // input→h1 bias: H1
W.h1h2_k = W.ih1_b + H1;                           // h1→h2 kernel: H1×H2
W.h1h2_b = W.h1h2_k + H1 * H2;                     // h1→h2 bias: H2
W.actor_k = W.h1h2_b + H2;                          // h2→actor kernel: H2×NUM_OUTPUTS
W.actor_b = W.actor_k + H2 * NUM_OUTPUTS;           // h2→actor bias: NUM_OUTPUTS
W.critic_k = W.actor_b + NUM_OUTPUTS;               // h2→critic kernel: H2×1
W.critic_b = W.critic_k + H2;                       // h2→critic bias: 1
const TOTAL_WEIGHTS = W.critic_b + 1;
// = 156*64 + 64 + 64*32 + 32 + 32*6 + 6 + 32 + 1 = 9984+64+2048+32+192+6+32+1 = 12359

// PPO hyperparameters
const ROLLOUT_LENGTH = 512;    // frames per worker per rollout
const PPO_EPOCHS = 2;             // 4 was causing clip fractions of 0.4-0.6 (should be 0.1-0.2)
const MINIBATCH_SIZE = 256;
const CLIP_EPSILON = 0.2;
const GAE_LAMBDA = 0.95;
const DISCOUNT_GAMMA = 0.99;
const LEARNING_RATE = 3e-4;
const ENTROPY_COEFF = 0.05;       // keep exploring — 0.01 converged before learning to jump
const VALUE_LOSS_COEFF = 0.5;
const MAX_GRAD_NORM = 0.5;

// Reward design (from GOAL.md: progress good, dying bad, timer bad)
const REWARD_PROGRESS = 0.01;    // per pixel of rightward movement
const REWARD_DEATH = -5.0;       // dying is bad
const REWARD_TIME_PENALTY = -0.001;  // per frame — standing still costs
const REWARD_COMPLETION = 10.0;
const REWARD_BUTTON_COST = -0.001;  // per button pressed per frame — learn to not press useless buttons

// Hall of fame
const GOLDEN_DIVERSITY_THRESHOLD = 30;
const HOF_SIZE = 10;

// ==================== BUTTON CONSTANTS ====================

const CBTNS = { A: 0, B: 1, SELECT: 2, START: 3, UP: 4, DOWN: 5, LEFT: 6, RIGHT: 7 };
const BIT = { A: 1, B: 2, SELECT: 4, START: 8, UP: 16, DOWN: 32, LEFT: 64, RIGHT: 128 };
const BIT_TO_JSNES = [CBTNS.A, CBTNS.B, CBTNS.SELECT, CBTNS.START, CBTNS.UP, CBTNS.DOWN, CBTNS.LEFT, CBTNS.RIGHT];
const JSNES_TO_BOT = { 0: 8, 1: 0, 2: 2, 3: 3, 4: 4, 5: 5, 6: 6, 7: 7 };
const BUTTON_BITS = [BIT.RIGHT, BIT.LEFT, BIT.A, BIT.B, BIT.UP, BIT.DOWN];

// ================================================================
//  Monkey-patch jsnes for lite save states (shared by both threads)
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
//  Forward pass — manual matrix multiply (used by workers)
//  Must produce identical output to the TF.js model on main thread.
// ================================================================

function forwardPass(inputs, weights) {
    // Hidden layer 1: ReLU
    const h1 = new Float32Array(H1);
    for (let j = 0; j < H1; j++) {
        let sum = weights[W.ih1_b + j];
        for (let i = 0; i < NUM_INPUTS; i++) {
            sum += inputs[i] * weights[W.ih1_k + i * H1 + j];
        }
        h1[j] = sum > 0 ? sum : 0; // ReLU
    }

    // Hidden layer 2: ReLU
    const h2 = new Float32Array(H2);
    for (let j = 0; j < H2; j++) {
        let sum = weights[W.h1h2_b + j];
        for (let i = 0; i < H1; i++) {
            sum += h1[i] * weights[W.h1h2_k + i * H2 + j];
        }
        h2[j] = sum > 0 ? sum : 0; // ReLU
    }

    // Actor head: sigmoid (independent per-button probability)
    const probs = new Float32Array(NUM_OUTPUTS);
    for (let j = 0; j < NUM_OUTPUTS; j++) {
        let sum = weights[W.actor_b + j];
        for (let i = 0; i < H2; i++) {
            sum += h2[i] * weights[W.actor_k + i * NUM_OUTPUTS + j];
        }
        sum = Math.max(-10, Math.min(10, sum));
        probs[j] = 1 / (1 + Math.exp(-sum));
    }

    // Critic head: linear (state value)
    let value = weights[W.critic_b];
    for (let i = 0; i < H2; i++) {
        value += h2[i] * weights[W.critic_k + i];
    }

    return { probs, value };
}

// ================================================================
//  Read game state — 146 raw inputs, no precomputation
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
    inputs[idx++] = Math.max(0, Math.min(1, (velX + 5) / 50));    // velX: -5 to 45 → 0 to 1
    inputs[idx++] = Math.max(0, Math.min(1, (velY + 5) / 10));    // velY: -5 to +5 → 0 to 1
    inputs[idx++] = (mem[0x009F] === 0 && marioY >= 160) ? 1 : 0;
    inputs[idx++] = mem[0x0756] > 0 ? 1 : 0;

    // === Raw tiles: 10 columns × 14 rows (140) ===
    // Columns 1-10 ahead of Mario (16px to 160px, skipping col 0 which is at the scroll seam)
    // Rows 14-27 (Y=112 to Y=216, covers overhead blocks through ground)
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

    // Sanitize
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
    // Sample each button independently from Bernoulli(p)
    let mask = 0;
    for (let i = 0; i < NUM_OUTPUTS; i++) {
        if (Math.random() < probs[i]) mask |= BUTTON_BITS[i];
    }
    if ((mask & BIT.LEFT) && (mask & BIT.RIGHT)) mask &= ~BIT.LEFT;
    return mask;
}

function computeLogProb(probs, actionMask) {
    // Sum of log probabilities for each button's Bernoulli
    let logProb = 0;
    for (let i = 0; i < NUM_OUTPUTS; i++) {
        const p = Math.max(1e-8, Math.min(1 - 1e-8, probs[i]));
        const pressed = (actionMask & BUTTON_BITS[i]) ? 1 : 0;
        logProb += pressed * Math.log(p) + (1 - pressed) * Math.log(1 - p);
    }
    return logProb;
}

// ================================================================
//  WORKER THREAD — collect rollout trajectories
// ================================================================
if (!isMainThread) {
    const { createRequire } = await import('module');
    const require = createRequire(import.meta.url);
    const jsnes = require('jsnes');
    const { NES, Controller } = jsnes;
    const { romString, saveStateStr } = workerData;

    patchJsnesLite(jsnes);

    let saveState = JSON.parse(saveStateStr);
    let currentWeights = null;
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

    function resetToStart() {
        nes.fromJSONLite(fastCloneState(saveState));
    }

    function collectRollout(rolloutLen) {
        const weights = currentWeights;
        if (!weights) return null;

        // Pre-allocate rollout buffers
        const states = new Float32Array(rolloutLen * NUM_INPUTS);
        const actions = new Uint8Array(rolloutLen);
        const rewards = new Float32Array(rolloutLen);
        const logProbs = new Float32Array(rolloutLen);
        const values = new Float32Array(rolloutLen);
        const dones = new Uint8Array(rolloutLen);

        // Episode tracking
        let episodes = 0;
        let bestX = 0;
        let completions = 0;
        let totalReward = 0;
        let episodeBestX = 0;
        let lastProgressFrame = 0;
        let prevBitmask = 0;
        let prevX = 0;
        let inEpisode = false;

        // Start first episode
        resetToStart();
        prevX = nes.cpu.mem[0x006D] * 256 + nes.cpu.mem[0x0086];
        episodeBestX = prevX;
        lastProgressFrame = 0;
        prevBitmask = 0;
        inEpisode = true;

        for (let t = 0; t < rolloutLen; t++) {
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
                const changed = actionMask ^ prevBitmask;
                for (let bit = 0; bit < 8; bit++) {
                    if (changed & (1 << bit)) {
                        if (actionMask & (1 << bit)) nes.buttonDown(1, BIT_TO_JSNES[bit]);
                        else nes.buttonUp(1, BIT_TO_JSNES[bit]);
                    }
                }
                prevBitmask = actionMask;
            }

            // Step emulator
            nes.frame();

            // Read new state
            const mem = nes.cpu.mem;
            const x = mem[0x006D] * 256 + mem[0x0086];
            const deltaX = x - prevX;
            if (x > episodeBestX) { episodeBestX = x; lastProgressFrame = t; }

            // Compute reward
            // Count pressed buttons for action cost
            let buttonsPressed = 0;
            for (let b = 0; b < 8; b++) { if (actionMask & (1 << b)) buttonsPressed++; }
            let reward = REWARD_PROGRESS * deltaX + REWARD_TIME_PENALTY + REWARD_BUTTON_COST * buttonsPressed;

            // Check death
            const ps = mem[0x000E];
            const dead = ps === 0x0B || ps === 0x06 || mem[0x00CE] > 240 || mem[0x0770] === 3;

            // Check completion
            const completed = mem[0x001D] === 3 || mem[0x075F] > 0 || mem[0x0760] > 0;

            // Check stall
            const stalled = (t - lastProgressFrame) > STALL_FRAMES;

            if (dead) reward += REWARD_DEATH;
            if (stalled) reward += REWARD_DEATH;  // stalling = giving up = as bad as dying
            if (completed) reward += REWARD_COMPLETION;

            rewards[t] = reward;
            totalReward += reward;
            prevX = x;

            const done = dead || completed || stalled;
            dones[t] = done ? 1 : 0;

            if (done) {
                if (episodeBestX > bestX) bestX = episodeBestX;
                if (completed) completions++;
                episodes++;

                // Reset for next episode
                resetToStart();
                prevX = nes.cpu.mem[0x006D] * 256 + nes.cpu.mem[0x0086];
                episodeBestX = prevX;
                lastProgressFrame = t + 1;
                prevBitmask = 0;
            }
        }
        if (episodeBestX > bestX) bestX = episodeBestX;

        // Get bootstrap value for last state (for GAE)
        const lastState = readNetworkInputs(nes);
        const { value: lastValue } = forwardPass(lastState, weights);

        return {
            states: states.buffer,
            actions: actions.buffer,
            rewards: rewards.buffer,
            logProbs: logProbs.buffer,
            values: values.buffer,
            dones: dones.buffer,
            lastValue,
            metadata: { episodes, bestX, completions, totalReward, frames: rolloutLen }
        };
    }

    // Message handler
    parentPort.on('message', (msg) => {
        if (msg.type === 'setSaveState') {
            saveState = JSON.parse(msg.saveStateStr);
            parentPort.postMessage({ type: 'ack' });
            return;
        }
        if (msg.type === 'setWeights') {
            currentWeights = new Float32Array(msg.weightsBuf);
            parentPort.postMessage({ type: 'ack' });
            return;
        }
        if (msg.type === 'collectRollout') {
            const result = collectRollout(msg.rolloutLen || ROLLOUT_LENGTH);
            // Transfer buffers for zero-copy
            parentPort.postMessage(
                { type: 'rollout', ...result },
                [result.states, result.actions, result.rewards,
                 result.logProbs, result.values, result.dones]
            );
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

// Import TF.js (pure JS — no native bindings, works everywhere)
const tf = await import('@tensorflow/tfjs');

patchJsnesLite(jsnes);

const romPath = path.join(__dirname, 'super-mario-bros-1.nes');
if (!fs.existsSync(romPath)) { console.error('ROM not found at', romPath); process.exit(1); }
const romData = fs.readFileSync(romPath);
const romString = Array.from(new Uint8Array(romData)).map(b => String.fromCharCode(b)).join('');

// ==================== TF.JS MODEL ====================

function createModel() {
    const input = tf.input({ shape: [NUM_INPUTS] });
    const h1 = tf.layers.dense({ units: H1, activation: 'relu', kernelInitializer: 'heNormal', name: 'h1' }).apply(input);
    const h2 = tf.layers.dense({ units: H2, activation: 'relu', kernelInitializer: 'heNormal', name: 'h2' }).apply(h1);
    const actorOut = tf.layers.dense({ units: NUM_OUTPUTS, activation: 'sigmoid', name: 'actor' }).apply(h2);
    const criticOut = tf.layers.dense({ units: 1, name: 'critic' }).apply(h2);
    return tf.model({ inputs: input, outputs: [actorOut, criticOut] });
}

function extractWeights(model) {
    // Extract all weights into a flat Float32Array matching the W layout
    const flat = new Float32Array(TOTAL_WEIGHTS);
    const tensors = model.getWeights();
    // TF.js order: h1/kernel, h1/bias, h2/kernel, h2/bias, actor/kernel, actor/bias, critic/kernel, critic/bias
    const data = tensors.map(t => t.dataSync());
    flat.set(data[0], W.ih1_k);     // h1 kernel
    flat.set(data[1], W.ih1_b);     // h1 bias
    flat.set(data[2], W.h1h2_k);    // h2 kernel
    flat.set(data[3], W.h1h2_b);    // h2 bias
    flat.set(data[4], W.actor_k);   // actor kernel
    flat.set(data[5], W.actor_b);   // actor bias
    flat.set(data[6], W.critic_k);  // critic kernel
    flat.set(data[7], W.critic_b);  // critic bias
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

// ==================== GAE (Generalized Advantage Estimation) ====================

function computeGAE(rewards, values, dones, lastValue) {
    const T = rewards.length;
    const advantages = new Float32Array(T);
    const returns = new Float32Array(T);
    let lastAdv = 0;

    for (let t = T - 1; t >= 0; t--) {
        const nextValue = (t === T - 1) ? lastValue : values[t + 1];
        const nextNonTerminal = (t === T - 1) ? (1 - dones[T - 1]) : (1 - dones[t]);
        // When dones[t]=1, we don't bootstrap from the next state (episode ended)
        // But the next value should be 0 if the episode ended at t
        const delta = rewards[t] + DISCOUNT_GAMMA * nextValue * nextNonTerminal - values[t];
        lastAdv = delta + DISCOUNT_GAMMA * GAE_LAMBDA * nextNonTerminal * lastAdv;
        advantages[t] = lastAdv;
        returns[t] = advantages[t] + values[t];
    }

    return { advantages, returns };
}

// ==================== PPO UPDATE ====================

// Persistent optimizer — Adam accumulates momentum/variance across all updates.
// Creating a new one per call was resetting these statistics, making it essentially SGD.
let ppoOptimizer = null;

function ppoUpdate(model, states, actions, oldLogProbs, advantages, returns) {
    if (!ppoOptimizer) ppoOptimizer = tf.train.adam(LEARNING_RATE);
    const optimizer = ppoOptimizer;
    const T = advantages.length;

    // Normalize advantages
    let advMean = 0, advStd = 0;
    for (let i = 0; i < T; i++) advMean += advantages[i];
    advMean /= T;
    for (let i = 0; i < T; i++) advStd += (advantages[i] - advMean) ** 2;
    advStd = Math.sqrt(advStd / T + 1e-8);
    const normAdv = new Float32Array(T);
    for (let i = 0; i < T; i++) normAdv[i] = (advantages[i] - advMean) / advStd;

    // Pre-convert action bitmasks to per-button arrays
    const actionBits = new Float32Array(T * NUM_OUTPUTS);
    for (let t = 0; t < T; t++) {
        for (let b = 0; b < NUM_OUTPUTS; b++) {
            actionBits[t * NUM_OUTPUTS + b] = (actions[t] & BUTTON_BITS[b]) ? 1 : 0;
        }
    }

    let totalPolicyLoss = 0, totalValueLoss = 0, totalEntropy = 0, totalClipFrac = 0;
    let batchCount = 0;

    // Create tensors for full dataset
    const statesTensor = tf.tensor2d(states, [T, NUM_INPUTS]);
    const actionsTensor = tf.tensor2d(actionBits, [T, NUM_OUTPUTS]);
    const oldLogProbsTensor = tf.tensor1d(oldLogProbs);
    const advTensor = tf.tensor1d(normAdv);
    const returnsTensor = tf.tensor1d(returns);

    for (let epoch = 0; epoch < PPO_EPOCHS; epoch++) {
        // Shuffle indices
        const indices = Array.from({ length: T }, (_, i) => i);
        for (let i = indices.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [indices[i], indices[j]] = [indices[j], indices[i]];
        }

        for (let start = 0; start < T; start += MINIBATCH_SIZE) {
            const end = Math.min(start + MINIBATCH_SIZE, T);
            const mbIdx = tf.tensor1d(indices.slice(start, end), 'int32');

            const mbStates = tf.gather(statesTensor, mbIdx);
            const mbActions = tf.gather(actionsTensor, mbIdx);
            const mbOldLogProbs = tf.gather(oldLogProbsTensor, mbIdx);
            const mbAdv = tf.gather(advTensor, mbIdx);
            const mbReturns = tf.gather(returnsTensor, mbIdx);

            // Compute gradients manually so we can clip them
            const { value: loss, grads } = tf.variableGrads(() => {
                const [actorOut, criticOut] = model.apply(mbStates, { training: true });

                // Clamp probabilities
                const probs = actorOut.clipByValue(1e-8, 1 - 1e-8);
                const values = criticOut.squeeze([-1]);

                // Bernoulli log prob: sum over buttons of [a*log(p) + (1-a)*log(1-p)]
                const logP = mbActions.mul(probs.log()).add(
                    mbActions.mul(-1).add(1).mul(probs.mul(-1).add(1).log())
                ).sum(-1); // sum across buttons

                // Ratio — clamp log-ratio to prevent exp() overflow
                const logRatio = logP.sub(mbOldLogProbs).clipByValue(-20, 20);
                const ratio = logRatio.exp();

                // Clipped surrogate loss
                const surr1 = ratio.mul(mbAdv);
                const surr2 = ratio.clipByValue(1 - CLIP_EPSILON, 1 + CLIP_EPSILON).mul(mbAdv);
                const policyLoss = surr1.minimum(surr2).mean().mul(-1);

                // Value loss
                const valueLoss = mbReturns.sub(values).square().mean().mul(VALUE_LOSS_COEFF);

                // Entropy bonus (Bernoulli entropy: -p*log(p) - (1-p)*log(1-p))
                const entropy = probs.mul(probs.log()).add(
                    probs.mul(-1).add(1).mul(probs.mul(-1).add(1).log())
                ).mul(-1).mean();

                // Clip fraction for monitoring
                const clipFrac = ratio.sub(1).abs().greater(CLIP_EPSILON).mean();

                // Store stats (sync to avoid memory leaks)
                totalPolicyLoss += policyLoss.dataSync()[0];
                totalValueLoss += valueLoss.dataSync()[0];
                totalEntropy += entropy.dataSync()[0];
                totalClipFrac += clipFrac.dataSync()[0];
                batchCount++;

                return policyLoss.add(valueLoss).sub(entropy.mul(ENTROPY_COEFF));
            });

            // Clip gradients by global norm to prevent NaN explosion
            const gradValues = Object.values(grads);
            const globalNorm = tf.sqrt(gradValues.reduce((sum, g) => sum.add(g.square().sum()), tf.scalar(0)));
            const clipCoeff = tf.minimum(tf.scalar(1), tf.scalar(MAX_GRAD_NORM).div(globalNorm.add(1e-6)));
            const clippedGrads = {};
            for (const [name, g] of Object.entries(grads)) {
                clippedGrads[name] = g.mul(clipCoeff);
            }
            optimizer.applyGradients(clippedGrads);

            // Clean up gradient tensors
            globalNorm.dispose();
            clipCoeff.dispose();
            loss.dispose();
            for (const g of Object.values(grads)) g.dispose();
            for (const g of Object.values(clippedGrads)) g.dispose();

            // Clean up
            mbIdx.dispose();
            mbStates.dispose();
            mbActions.dispose();
            mbOldLogProbs.dispose();
            mbAdv.dispose();
            mbReturns.dispose();
        }
    }

    // Clean up full-dataset tensors
    statesTensor.dispose();
    actionsTensor.dispose();
    oldLogProbsTensor.dispose();
    advTensor.dispose();
    returnsTensor.dispose();
    // Don't dispose optimizer — it persists across updates for momentum accumulation

    return {
        policyLoss: totalPolicyLoss / batchCount,
        valueLoss: totalValueLoss / batchCount,
        entropy: totalEntropy / batchCount,
        clipFraction: totalClipFrac / batchCount,
    };
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

        // Legacy tables (keep for history)
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

        // PPO tables
        this.db.exec(`CREATE TABLE IF NOT EXISTS ppo_updates (
            update_id INTEGER PRIMARY KEY,
            total_frames INTEGER, policy_loss REAL, value_loss REAL,
            entropy REAL, clip_fraction REAL,
            mean_reward REAL, best_x INTEGER, completions INTEGER,
            elapsed REAL, created_at TEXT
        )`);
        this.db.exec(`CREATE TABLE IF NOT EXISTS ppo_weights (
            update_id INTEGER PRIMARY KEY,
            weights BLOB
        )`);

        this._insertPPOUpdate = this.db.prepare(`INSERT INTO ppo_updates VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
        this._insertPPOWeights = this.db.prepare(`INSERT OR REPLACE INTO ppo_weights VALUES (?, ?)`);
        this._getLastPPOUpdate = this.db.prepare(`SELECT MAX(update_id) as id FROM ppo_updates`);
        this._getLatestPPOWeights = this.db.prepare(`SELECT * FROM ppo_weights ORDER BY update_id DESC LIMIT 1`);
    }

    savePPOUpdate(id, totalFrames, pLoss, vLoss, entropy, clipFrac, meanReward, bestX, comps, elapsed) {
        this._insertPPOUpdate.run(id, totalFrames, pLoss, vLoss, entropy, clipFrac, meanReward, bestX, comps, elapsed, new Date().toISOString());
    }

    savePPOWeights(updateId, weightsFloat32) {
        this._insertPPOWeights.run(updateId, Buffer.from(weightsFloat32.buffer, weightsFloat32.byteOffset, weightsFloat32.byteLength));
    }

    getLastPPOUpdate() {
        const row = this._getLastPPOUpdate.get();
        return row?.id ?? -1;
    }

    getLatestPPOWeights() {
        return this._getLatestPPOWeights.get();
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

    let mostSimilarIdx = -1, minDist = Infinity;
    for (let i = 0; i < hof.length; i++) {
        const d = checkpointDistance(entry, hof[i]);
        if (d < minDist) { minDist = d; mostSimilarIdx = i; }
    }

    let added = false;
    if (minDist < GOLDEN_DIVERSITY_THRESHOLD && mostSimilarIdx >= 0) {
        if (entry.fitness > hof[mostSimilarIdx].fitness) {
            hof[mostSimilarIdx] = entry;
            hof.sort((a, b) => b.fitness - a.fitness);
            saveHallOfFame(hof); added = true;
        }
    } else if (hof.length < HOF_SIZE) {
        hof.push(entry); hof.sort((a, b) => b.fitness - a.fitness);
        saveHallOfFame(hof); added = true;
    } else if (entry.fitness > hof[hof.length - 1].fitness) {
        hof.pop(); hof.push(entry); hof.sort((a, b) => b.fitness - a.fitness);
        saveHallOfFame(hof); added = true;
    }
    return added;
}

let currentPhase = 'ppo';
let currentUpdateId = 0;

function saveBest(inputs, result) {
    const events = inputsToEvents(inputs);
    const speed = result.bestX / Math.max(result.frame, 1);
    const id = `ppo-U${currentUpdateId}-${result.bestX}px-${speed.toFixed(2)}pf`;
    fs.writeFileSync(bestPath, JSON.stringify({
        id, rating: result.completed ? 'S' : (result.bestX > LEVEL_WIDTH * 0.8 ? 'A' : 'C'),
        phase: 'ppo', generation: currentUpdateId,
        events, fitness: result.bestX * 1000 + (result.timer || 0),
        completed: result.completed, completionFrame: result.completed ? result.frame : undefined,
        bestX: result.bestX, speed: parseFloat(speed.toFixed(2)),
        reason: result.reason, totalFrames: result.frame,
        stuckFrames: 0, checkpoints: [], checkpointSplits: 'none',
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
            worker.once('message', () => { ackCount++; if (ackCount === workers.length) resolve(); });
            worker.postMessage({ type: 'setSaveState', saveStateStr });
        }
    });
}

function broadcastWeights(workers, weightsFlat) {
    return new Promise((resolve) => {
        let ackCount = 0;
        for (const worker of workers) {
            worker.once('message', () => { ackCount++; if (ackCount === workers.length) resolve(); });
            // Send a copy of the buffer to each worker
            const copy = new Float32Array(weightsFlat);
            worker.postMessage({ type: 'setWeights', weightsBuf: copy.buffer }, [copy.buffer]);
        }
    });
}

function collectRollouts(workers) {
    return new Promise((resolve) => {
        const rollouts = [];
        let completed = 0;
        for (const worker of workers) {
            worker.once('message', (msg) => {
                rollouts.push(msg);
                completed++;
                if (completed === workers.length) resolve(rollouts);
            });
            worker.postMessage({ type: 'collectRollout', rolloutLen: ROLLOUT_LENGTH });
        }
    });
}

// ==================== REPLAY ====================

function replayBestPolicy(nes, weights, saveStateStr) {
    const state = JSON.parse(saveStateStr);
    nes.fromJSONLite(state);

    const inputsRecord = [];
    let prevBitmask = 0;

    for (let frame = 0; frame < MAX_FRAMES; frame++) {
        const netInputs = readNetworkInputs(nes);
        const { probs } = forwardPass(netInputs, weights);
        const bitmask = probsToBitmask(probs); // deterministic: p > 0.5
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

    console.log(`${C.cyan}╔══════════════════════════════════════════════════════╗${C.reset}`);
    console.log(`${C.cyan}║  MARIO PPO — Reinforcement Learning                 ║${C.reset}`);
    console.log(`${C.cyan}║  Neural network learns to play from experience       ║${C.reset}`);
    console.log(`${C.cyan}╚══════════════════════════════════════════════════════╝${C.reset}`);
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
    const saveStateStr = JSON.stringify(nes.toJSONLite());
    trainingSaveStateStr = saveStateStr;
    console.log(`  Mario at X=${nes.cpu.mem[0x006D] * 256 + nes.cpu.mem[0x0086]}, Y=${nes.cpu.mem[0x00CE]}`);
    console.log(`  Save state size: ${(saveStateStr.length / 1024).toFixed(0)}KB (lite)`);
    console.log();

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
                w.postMessage({ type: 'setSaveState', saveStateStr: trainingSaveStateStr });
                await new Promise(r => w.once('message', r));
                if (currentWeightsFlat) {
                    const copy = new Float32Array(currentWeightsFlat);
                    w.postMessage({ type: 'setWeights', weightsBuf: copy.buffer }, [copy.buffer]);
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

    // Database
    const dbPath = path.join(__dirname, 'runs.db');
    const db = new RunDatabase(dbPath);
    console.log(`${C.green}SQLite database: ${dbPath}${C.reset}`);
    console.log();

    // Create TF.js model
    const model = createModel();
    let currentWeightsFlat = extractWeights(model);
    let updateCount = 0;
    let bestEverX = 0;
    let bestEverWeights = null;

    // Check for resume
    const lastUpdate = db.getLastPPOUpdate();
    if (lastUpdate >= 0) {
        console.log(`${C.yellow}Found existing PPO progress: update ${lastUpdate}${C.reset}`);
        let resumeAnswer;
        if (process.argv.includes('--continue')) resumeAnswer = 'r';
        else if (process.argv.includes('--new')) resumeAnswer = 'n';
        else resumeAnswer = await ask(`${C.cyan}Resume${C.reset} or ${C.cyan}start new${C.reset}? [${C.green}r${C.reset}]esume / [${C.red}n${C.reset}]ew: `);

        if (resumeAnswer === 'n' || resumeAnswer === 'new') {
            console.log(`  ${C.red}Starting fresh${C.reset}\n`);
            db.db.exec('DELETE FROM ppo_updates');
            db.db.exec('DELETE FROM ppo_weights');
            db.db.exec('VACUUM');
        } else {
            const saved = db.getLatestPPOWeights();
            if (saved) {
                const loadedWeights = new Float32Array(new Uint8Array(saved.weights).buffer);
                loadWeightsIntoModel(model, loadedWeights);
                currentWeightsFlat = extractWeights(model);
                updateCount = saved.update_id;
                console.log(`  ${C.green}Resumed from update ${updateCount}${C.reset}\n`);
            }
        }
    }

    // Graceful shutdown
    let sigCount = 0;
    process.on('SIGINT', () => {
        sigCount++; if (sigCount > 1) process.exit(1);
        console.log('\n\nInterrupted! Saving...');
        try {
            const weights = bestEverWeights || currentWeightsFlat;
            db.savePPOWeights(updateCount, weights);
            const replayInputs = replayBestPolicy(nes, weights, trainingSaveStateStr);
            const replayResult = { bestX: bestEverX, frame: replayInputs.length, completed: false, reason: 'interrupted', timer: 0 };
            saveBest(replayInputs, replayResult);
            tryAddToHallOfFame(hallOfFame, replayInputs, replayResult);
            console.log(`Saved: update ${updateCount}, best ${bestEverX}px`);
        } catch (e) {
            console.error('Error saving:', e.message);
        }
        for (const w of workers) w.terminate();
        if (process.stdin.isTTY) process.stdin.setRawMode(false);
        setTimeout(() => process.exit(0), 200);
    });

    // Broadcast save state and initial weights
    await broadcastSaveState(workers, trainingSaveStateStr);
    await broadcastWeights(workers, currentWeightsFlat);

    console.log(`${C.cyan}=== PPO TRAINING ===${C.reset}`);
    console.log(`${C.dim}Arch: ${NUM_INPUTS}→${H1}→${H2}→${NUM_OUTPUTS}+1 | Weights: ${TOTAL_WEIGHTS}${C.reset}`);
    console.log(`${C.dim}Rollout: ${ROLLOUT_LENGTH}f × ${workers.length} workers = ${ROLLOUT_LENGTH * workers.length} frames/update${C.reset}`);
    console.log(`${C.dim}PPO: epochs=${PPO_EPOCHS} minibatch=${MINIBATCH_SIZE} clip=${CLIP_EPSILON} lr=${LEARNING_RATE}${C.reset}`);
    console.log(`${C.dim}Reward: progress=${REWARD_PROGRESS}/px death=${REWARD_DEATH} time=${REWARD_TIME_PENALTY}/f completion=${REWARD_COMPLETION}${C.reset}`);
    console.log();

    const startTime = Date.now();
    let totalFrames = 0;

    // ==================== PPO TRAINING LOOP ====================

    while (true) {
        const updateStart = Date.now();
        await processWorkerOps();
        updateCount++;
        currentUpdateId = updateCount;

        // 1. Collect rollouts from all workers
        const rollouts = await collectRollouts(workers);

        // 2. Concatenate rollout data
        const batchSize = ROLLOUT_LENGTH * workers.length;
        const allStates = new Float32Array(batchSize * NUM_INPUTS);
        const allActions = new Uint8Array(batchSize);
        const allRewards = new Float32Array(batchSize);
        const allLogProbs = new Float32Array(batchSize);
        const allValues = new Float32Array(batchSize);
        const allDones = new Uint8Array(batchSize);
        const allLastValues = [];

        let totalEpisodes = 0, totalCompletions = 0, batchBestX = 0, batchTotalReward = 0;

        for (let w = 0; w < rollouts.length; w++) {
            const r = rollouts[w];
            const offset = w * ROLLOUT_LENGTH;
            allStates.set(new Float32Array(r.states), offset * NUM_INPUTS);
            allActions.set(new Uint8Array(r.actions), offset);
            allRewards.set(new Float32Array(r.rewards), offset);
            allLogProbs.set(new Float32Array(r.logProbs), offset);
            allValues.set(new Float32Array(r.values), offset);
            allDones.set(new Uint8Array(r.dones), offset);
            allLastValues.push(r.lastValue);
            totalEpisodes += r.metadata.episodes;
            totalCompletions += r.metadata.completions;
            if (r.metadata.bestX > batchBestX) batchBestX = r.metadata.bestX;
            batchTotalReward += r.metadata.totalReward;
        }

        totalFrames += batchSize;

        // 3. Compute GAE per worker segment (respecting episode boundaries)
        const allAdvantages = new Float32Array(batchSize);
        const allReturns = new Float32Array(batchSize);
        for (let w = 0; w < rollouts.length; w++) {
            const offset = w * ROLLOUT_LENGTH;
            const segRewards = allRewards.subarray(offset, offset + ROLLOUT_LENGTH);
            const segValues = allValues.subarray(offset, offset + ROLLOUT_LENGTH);
            const segDones = allDones.subarray(offset, offset + ROLLOUT_LENGTH);
            const { advantages, returns } = computeGAE(segRewards, segValues, segDones, allLastValues[w]);
            allAdvantages.set(advantages, offset);
            allReturns.set(returns, offset);
        }

        // 4. PPO gradient update
        const stats = ppoUpdate(model, allStates, allActions, allLogProbs, allAdvantages, allReturns);

        // NaN detection — if weights exploded, reinitialize the model
        if (isNaN(stats.policyLoss) || isNaN(stats.valueLoss)) {
            console.log(`  \x1b[31mNaN detected in losses! Reinitializing model...\x1b[0m`);
            // Rebuild model with fresh weights
            const freshModel = createModel();
            model.setWeights(freshModel.getWeights());
            freshModel.dispose();
            // Reset optimizer momentum
            ppoOptimizer = null;
            stats.policyLoss = 0;
            stats.valueLoss = 0;
            stats.entropy = 0;
            stats.clipFraction = 0;
        }

        // 5. Extract new weights and broadcast
        currentWeightsFlat = extractWeights(model);
        await broadcastWeights(workers, currentWeightsFlat);

        // Track best
        if (batchBestX > bestEverX) {
            bestEverX = batchBestX;
            bestEverWeights = new Float32Array(currentWeightsFlat);
        }

        // ==================== LOGGING ====================
        const updateTime = (Date.now() - updateStart) / 1000;
        const elapsed = (Date.now() - startTime) / 1000;
        const meanReward = batchTotalReward / Math.max(totalEpisodes, 1);
        const fps = Math.round(batchSize / updateTime);

        console.log(
            `Update ${String(updateCount).padStart(4)} | ` +
            `best: ${batchBestX}px | avg reward: ${meanReward.toFixed(2)} | ` +
            `episodes: ${totalEpisodes} | ` +
            `π_loss: ${stats.policyLoss.toFixed(4)} v_loss: ${stats.valueLoss.toFixed(4)} ` +
            `ent: ${stats.entropy.toFixed(4)} clip: ${stats.clipFraction.toFixed(3)} | ` +
            `${fps} fps | ${updateTime.toFixed(1)}s` +
            (totalCompletions > 0 ? ` | ${C.green}${totalCompletions} completions!${C.reset}` : '')
        );

        if (updateCount % 10 === 0) {
            const bar = makeProgressBar(bestEverX, LEVEL_WIDTH, 20);
            console.log(`  ${bar} ${Math.round(bestEverX/LEVEL_WIDTH*100)}% | best ever: ${bestEverX}px | ${(totalFrames/1000).toFixed(0)}K frames | ${formatTime(elapsed)}`);

            // Log per-button action frequencies from the batch
            const btnNames = ['R', 'L', 'A', 'B', 'U', 'D'];
            const btnFreqs = new Float32Array(NUM_OUTPUTS);
            for (let t = 0; t < batchSize; t++) {
                for (let b = 0; b < NUM_OUTPUTS; b++) {
                    if (allActions[t] & BUTTON_BITS[b]) btnFreqs[b]++;
                }
            }
            const freqStr = btnNames.map((n, i) => `${n}:${(btnFreqs[i]/batchSize*100).toFixed(0)}%`).join(' ');
            console.log(`  ${C.dim}buttons: ${freqStr}${C.reset}`);
        }

        // Save replay every 10 updates or on completion
        if (updateCount % 10 === 0 || totalCompletions > 0) {
            const replayInputs = replayBestPolicy(nes, currentWeightsFlat, trainingSaveStateStr);
            // replayBestPolicy already ran the simulation — read final X from NES state
            const replayX = nes.cpu.mem[0x006D] * 256 + nes.cpu.mem[0x0086];
            const replayResult = { bestX: Math.max(replayX, batchBestX), frame: replayInputs.length, completed: totalCompletions > 0, reason: totalCompletions > 0 ? 'completed' : 'replay', timer: 0 };
            saveBest(replayInputs, replayResult);
            if (totalCompletions > 0) {
                tryAddToHallOfFame(hallOfFame, replayInputs, replayResult);
                console.log(`  ${C.green}${C.bold}LEVEL COMPLETE! Saved to hall of fame.${C.reset}`);
            }
        }

        // DB checkpoint every 25 updates
        if (updateCount % 25 === 0) {
            db.savePPOUpdate(updateCount, totalFrames, stats.policyLoss, stats.valueLoss,
                stats.entropy, stats.clipFraction, meanReward, batchBestX, totalCompletions, updateTime);
            db.savePPOWeights(updateCount, currentWeightsFlat);
            console.log(`  ${C.dim}DB checkpoint saved (update ${updateCount})${C.reset}`);
        }
    }
}

main().catch(e => { console.error(e); process.exit(1); });

} // end isMainThread
