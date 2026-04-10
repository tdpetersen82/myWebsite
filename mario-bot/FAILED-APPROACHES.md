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

## The Pattern

Every approach failed for one of two reasons:

1. **No game awareness** (methods 1-3): Operating on blind button sequences. Can memorize a level through brute force but learns nothing transferable.

2. **Wrong learning algorithm** (methods 4-8): Neuroevolution is random search. It doesn't compute gradients. Each simulation gives ONE fitness number regardless of how many frames were played. A 2000-frame run that dies at a goomba teaches the algorithm exactly as much as a 2000-frame run that almost clears a pipe — both just get a distance score. No frame-level learning happens.

---

## 9. PPO — First Attempt (current)

Switched to Proximal Policy Optimization with TensorFlow.js. Actor-critic architecture (156 inputs → 64 → 32 → 6 actor + 1 critic, ~12,000 weights). Workers collect rollout trajectories, main thread does gradient updates.

**Status**: Running but not yet producing good results. Multiple bugs found and fixed:

### Bugs Found

1. **Wrong nametable mapping** (`nameTable[(page % 2) * 2]` → `nameTable[page % 2]`). With horizontal mirroring, nameTable[2] mirrors nameTable[0], so page 1 was reading from the same physical nametable as page 0. The network couldn't see tiles on the second nametable page.

2. **Uninitialized nametable tiles (0x00) treated as solid**. The NES fills unwritten nametable memory with 0x00. Our code treated everything ≠ 0x24 as solid. Result: the entire ahead view was a wall of solid tiles whenever columns crossed into unscrolled territory. The network was completely blind to level geometry.

3. **No stall penalty**. Stalling at an obstacle triggered `done=1` but no reward penalty. 85% of episodes ended by stalling at the first pipe (X=594) — the network learned "run to pipe, stop, collect free timeout" as the optimal strategy because it wasn't punished. Fixed: stall now costs the same as dying (REWARD_DEATH).

4. **Velocity Y normalization too compressed**. VelY was normalized to [-40, 40] range but actual NES values are [-5, +5]. Jumping mapped to 0.45, falling to 0.51 — the network couldn't tell the difference. Fixed: normalize to [-5, +5] → [0, 1]. Now jumping=0.2, falling=0.9.

5. **Adam optimizer recreated every PPO update**. `tf.train.adam()` was called inside `ppoUpdate()` and disposed after each call. Adam's entire value is its per-weight momentum and variance accumulators — destroying them each update reduces it to basic SGD. The network couldn't learn context-dependent behavior (when to jump vs when not to) because gradient momentum never built up. Fixed: optimizer persists at module level.

### Lessons

- **Test your inputs visually**. Print the tile grid as ASCII art. We would have caught bugs 1-2 immediately if we'd looked at what the network actually sees instead of trusting the code.
- **Run sample episodes and watch the behavior**. The X=112 "stuck" problem was the network holding A constantly, bouncing Mario under question blocks. Nothing is at X=112 — we already knew this from neuroevolution.
- **Check your optimizer lifecycle**. Creating and destroying Adam per batch is a silent killer — the code "works" but can't converge.
- **Log per-button probabilities**, not just which buttons are pressed. Seeing A=0.65 constantly told us the network hadn't learned when to jump vs when not to.
- **The reward balance matters**. Progress reward of 0.01/px × 594px = 5.94, death penalty = -5. Dying at the pipe was net positive (+0.94). The network had no incentive to survive.
