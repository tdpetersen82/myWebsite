# Failed Approaches — What We Tried and Why It Didn't Work

Read GOAL.md first. Every approach below was an attempt to achieve that goal.

## 1. Random Button Mashing + Genetic Algorithm
Thousands of random playthroughs with weighted button probabilities (RIGHT 92%, B 80%, A 35%). Evolve button sequences through mutation.

**Why it failed**: Blind — zero awareness of game state. Just randomly holds buttons and hopes. Got some completions through sheer volume but learned nothing. This is memorizing a sequence, not learning to play.

## 2. Frame Database + Splice Optimization
Collected thousands of runs into a database, tracked per-frame game state. Found "slow spots" in completion runs and spliced in faster sections from donor runs. Adaptive convergence-based splicing.

**Why it failed**: Splicing almost never improved anything. State matching was too strict, donor sections didn't converge back to the golden run, and the whole approach was brittle. Still just operating on blind button sequences with no game awareness. Still memorizing, not learning.

## 3. Chunked Beam Search
Break the level into 200px chunks. For each chunk, generate thousands of random continuations, keep the top 3, advance to the next chunk.

**Why it failed**: Still random button mashing within each chunk. No game awareness. Slow. Got completions but learned nothing. Would not generalize to a different level.

## 4. Neuroevolution — Large Network (142 inputs, 5,206 weights)
First neural network attempt. 142 inputs: raw tile grid (16x8) + mario state + enemies + time. Hidden layers 32+16.

**Why it failed**: Way too many weights for neuroevolution to search. Outputs all converged to ~0.50. Crossover destroyed networks. Dead ReLU killed neurons. After 875 generations, 20-40% still couldn't walk right.

**Lesson**: Neuroevolution is random perturbation, not gradient descent. The search space must be small enough for random search to work. 5,206 weights is not.

## 5. Neuroevolution — Small Network (16 pre-digested inputs, 232 weights)
Cut to 16 hand-engineered features: gapAhead, wallAhead, ceilingAbove, ground profile, 2 nearest enemies. 8+6 hidden neurons.

**Why it failed**: Violated the goal — inputs were precomputed human interpretations, not raw game data. We were telling the network "there's a gap 3 tiles ahead" instead of showing it the tiles. And it STILL struggled. 90% of mutations destroyed parent behavior. Tried 5+ different reproduction strategies (elite-copy, keep-only-improvements, independent lineages, bottom-half culling). All hit the same wall — random perturbation is too inefficient.

**Lesson**: If you have to hand-engineer the inputs for the algorithm to work, the algorithm is wrong.

## 6. Evolution Strategies (OpenAI ES)
One mean weight vector, estimate gradient via antithetic perturbations. Rank-based fitness normalization.

**Why it failed**: Fitness landscape was flat around zero mean. 96% of networks died at X=100 every generation. No gradient signal to follow.

**Lesson**: ES is just a fancier way to do random perturbation. Still no real gradient computation.

## 7. Neuroevolution with Cumulative-X Fitness
Dense reward: sum Mario's X position every frame (instead of just final distance).

**Why it failed**: Made learning RIGHT trivially easy (avg 115px → 329px in 37 gens) but rewarded stalling. A network sitting at X=420 for 2 seconds accumulated massive fitness without progressing. Got stuck at the first pipe.

**Lesson**: Fitness shaping can bootstrap basic behavior but creates perverse incentives. The network optimizes what you measure.

## 8. Neuroevolution with Milestone Fitness (best result)
floor(bestX/100) × 100,000 + bestX × 100 + timer. Huge fitness cliffs every 100px. Standard tournament selection.

**Result**: 1100px in 10 minutes. Population learned to move right and clear first obstacles.

**Why it's not enough**: Still neuroevolution — random weight perturbation can't efficiently search even 458 weights. Still used precomputed inputs. Still slow to learn and plateau-prone. Would need to re-evolve for every new level.

---

## 9. PPO (Proximal Policy Optimization)

Switched to gradient-based RL with TensorFlow.js. Actor-critic architecture (156 inputs → 64 → 32 → 6 actor + 1 critic, ~12,000 weights). Workers collect rollout trajectories, main thread does gradient updates.

### Bugs Found and Fixed
1. Wrong nametable mapping — network couldn't see tiles on second page
2. Uninitialized tiles (0x00) treated as solid — entire view was a wall of solid tiles
3. No stall penalty — network learned "run to pipe, stop, collect free timeout"
4. Velocity Y normalization too compressed — couldn't distinguish jumping from falling
5. Adam optimizer recreated every update — reduced to basic SGD, couldn't converge
6. No gradient clipping — weights went NaN and zombied for 400+ updates
7. Log-ratio overflow — exp(49) caused NaN in policy gradient despite clipping
8. Replay eval loop never stepped the emulator
9. Entropy too high (0.05) — fought convergence, R oscillated 70-85% for 900 updates
10. Stall timeout too long (360f) — pipe stall invisible within 512-frame rollouts
11. UP/DOWN buttons had zero gradient — no reward signal, stuck at 50% forever

### Results
- Best: 1240px in 60 min (MLP with 48K weights, entropy=0.02, epochs=3, stall=180)
- A button stuck at 51% — coin flip. Network never learned WHEN to jump.
- CNN attempt: correct idea (spatial processing) but 4x slower in JS (630fps vs 2500fps). Abandoned.

### Why it failed
PPO learns from reward gradients, but the gradient for "jump at the pipe" is tiny. The network spends 200 frames running through solved territory for every 50 frames near the obstacle. 80% of compute is wasted replaying known ground. The A button was a coin flip because the gradient signal for jump timing was drowned out by hundreds of frames of irrelevant data. Without a CNN (too slow in JS) or frame stacking, the flat MLP couldn't detect spatial patterns in the tile grid.

**Lesson**: PPO needs either GPU acceleration or a fundamentally different input representation for visual/spatial tasks. CPU-only TF.js with a flat MLP cannot learn spatial features from raw tile data fast enough.

---

## 10. NEAT with neataptic library

Used the neataptic npm library for NEAT. Started with fully-connected networks (156×6 = 936 connections).

### Why it failed
neataptic doesn't implement innovation numbers — the core mechanism that makes NEAT work. Without innovation numbers, crossover can't align genes properly and speciation distance is approximate. Starting fully-connected (936 connections) meant NEAT was just tweaking weights in a huge network instead of discovering which inputs matter.

Switched to empty starting networks (0 connections, added randomly). But neataptic's speciation was broken — either 300 species (every genome its own species, no crossover) or 1 species (no diversity protection).

**Lesson**: NEAT without innovation numbers isn't NEAT. The library was missing the fundamental mechanism.

---

## 11. NEAT from scratch (MarI/O translation)

Rewrote NEAT completely, translating SethBling's MarI/O Lua code to JavaScript. Innovation numbers, proper speciation, crossover aligned by innovation, stale species removal, per-genome self-adjusting mutation rates.

### Results
- 2996px in ~1100 generations (~19 hours)
- Completed the level at gen 1280 (5 hours from fresh start)
- 21 completions per generation by gen 1315
- Network: 184 nodes, 365 connections

### Bugs Fixed Along the Way
- Species list going empty → crash in breedChild
- pool.maxFitness tracked bestX (pixels) but compared against species.topFitness (fitness score) — different units
- Corrupt save file with garbage generation number (68192900) from old neataptic format
- HOF_SIZE constant undefined after rewrite
- Browser replay crash — lite save state missing ppu.buffer/bgbuffer/pixrendered arrays

### Remaining Problems

**1. Not actually playing based on the level.** The network learned "hold RIGHT + B + A forever" — constantly jumping while running right. It doesn't react to tiles, enemies, or gaps. It stumbles through the level by luck, not skill. A human watching would see Mario bouncing nonstop, occasionally clearing obstacles by accident.

**2. Network bloat.** Networks grew to 700+ connections despite a bloat penalty. MarI/O beat the level with <12 neurons (~20-30 connections). Our networks are 10-20x larger because mutations keep adding connections without enough removal pressure. Large networks can wire constant outputs without using inputs — they don't need to be selective.

**3. Species collapse.** Speciation starts healthy (40-60 species) but collapses to 1-2 within 100 generations. Once collapsed, all genomes are copies of the same strategy. No diversity, no exploration of alternatives. The population converges on "always jump" because it works well enough.

**4. Diversity injection cycle.** When species collapse, injecting fresh random genomes crashes the average from 1800px to 200px. Population wastes 200+ generations re-evolving to the frontier. Fixed by injecting mutated copies of the best genome instead, which kept genomes near the frontier — but still didn't solve the reactive behavior problem.

**5. Fitness function rewards "always jump."** `fitness = bestX - frames*0.5 + completion_bonus`. A genome that holds RIGHT+B+A and stumbles to 3000px scores very high. A genome that carefully reacts to obstacles but only reaches 2500px scores lower. Evolution found the simpler strategy and can't escape it.

**6. The flagpole problem.** Only 2-5 genomes out of 300 reach the flagpole each generation. Mutations on those specific genomes need to fire A for the exact flagpole tile pattern. With 99% of evolutionary effort spent on the first 70% of the level, the search space at the flagpole is extremely narrow.

---

## The Pattern (Updated)

Three categories of failure:

1. **No game awareness** (methods 1-3): Blind button sequences. Memorization, not learning.

2. **Wrong learning algorithm for the search space** (methods 4-8): Fixed-topology neuroevolution can't efficiently search thousands of weights. Random perturbation isn't gradient descent.

3. **Right algorithm, wrong behavior learned** (methods 9-11): PPO and NEAT can both learn to get far in the level. But they learn "always press RIGHT+A" instead of "react to what's on screen." The fitness function rewards distance, and constant jumping achieves high distance. There's no evolutionary or gradient pressure to learn reactive behavior because the simpler strategy works.

### The Unsolved Problem

Getting a network to REACT to the game state — jump because it sees a gap, not because it always jumps. This requires either:
- A network small enough that it CAN'T always jump (forced selectivity)
- A fitness function that rewards reactive behavior without hardcoding game knowledge
- An input representation that makes spatial patterns easy to detect (CNN, but too slow in JS)
- Enough training time and compute for the gradient signal to overcome noise (GPU-based PPO)

None of these have been achieved yet within the constraints of GOAL.md (no hardcoding, JS/Node only, raw game inputs).
