# Mario Neuroevolution — Session Notes

## What We Built

Neural network that learns to play SMB 1-1 through neuroevolution. Each network observes the game state (Mario position, terrain, enemies) and outputs button presses every frame. Population of 200 networks evolves through mutation and selection.

## Architecture Evolution

### Started With
- **142 inputs**: 5 mario state + 128 raw tile grid (16x8) + 8 enemy values (4x2) + 1 time
- **Hidden layers**: 32 + 16 neurons (ReLU)
- **Total weights**: 5,206
- **Reproduction**: 10% elite, 30% mutated elite, 40% uniform crossover, 20% fresh random
- **Mutation**: 10% rate, 0.3 strength (~520 weights per child)

### Problems Found and Fixed

**1. Crossover destroys networks**
Neural network weights aren't independent genes. Weight[500] in network A and weight[500] in network B do completely different things. Uniform crossover (randomly picking each weight from parent A or B) scrambles both parents' learned behaviors. 40% of each generation was crossover garbage.

Fix: Removed crossover entirely. All children are mutated copies of one good parent. Reproduction is now 10% elite, 45% mutated elite, 40% tournament mutants (select good parent, mutate), 5% fresh random.

**2. Too many fresh randoms**
20% fresh random = 40 networks per gen that definitely can't walk right. Cut to 5% (10 networks).

**3. Dead ReLU problem**
Standard ReLU kills neurons permanently — once a neuron's pre-activation goes negative, it outputs 0 for all inputs and no mutation can revive it through signal alone. With small hidden layers (12+6), losing even a few neurons collapses the network's capacity. The RIGHT output depends on a chain through both hidden layers, and dead neurons break the chain.

Fix: Switched to Leaky ReLU (`sum > 0 ? sum : sum * 0.01`). Neurons never fully die — signal is attenuated but not zeroed, so mutations can still strengthen weak pathways.

**4. Network way too large for the problem**
142 inputs meant the first hidden layer alone was 142x12 = 1,704 weights. Most inputs were raw tile values that the network had no way to usefully combine. 128 tile inputs encoded "is there a solid block at row 14, column 7" — information the network can't contextualize without learning spatial convolution from scratch, which neuroevolution can't do.

Even at 3% mutation rate with 1,836 weights, ~55 weights changed per child. That's enough to scramble the ~15-weight chain that controls the RIGHT output. After 875 generations, 20-40% of the population still couldn't walk right — the simplest possible behavior.

Fix: Replaced 142 raw inputs with 16 pre-digested features:
- **Mario state (5)**: Y position, horizontal velocity, vertical velocity, on-ground flag, big/small
- **Terrain summary (3)**: gap ahead (distance-weighted), wall ahead (distance-weighted), ceiling above
- **Enemies (4)**: 2 nearest enemies, relative X and Y each
- **Ground profile (3)**: ground height at 32px, 64px, 96px ahead
- **Time pressure (1)**: normalized frame counter

Hidden layers shrunk to 8+6. Total weights: 232. At 5% mutation, ~12 weights change per child. The RIGHT output chain is ~15 weights — most mutations don't touch it.

### Final Architecture
- **16 inputs** (pre-digested features, not raw tiles)
- **8 + 6 hidden neurons** (Leaky ReLU)
- **6 outputs** (RIGHT, LEFT, A, B, UP, DOWN — sigmoid > 0.5 threshold)
- **232 total weights**
- **5% mutation rate** (~12 weights per child)
- **No crossover** — mutation-only reproduction
- **5% fresh random** per generation

## Key Lessons

1. **Neuroevolution is not gradient descent.** There's no signal telling each weight which direction to move. "Learning" is random perturbation filtered by selection. The search space must be small enough for random search to work.

2. **Input representation matters more than architecture.** 142 raw inputs was unsearchable. 16 meaningful features made the same problem tractable. The human does the feature engineering; the network just learns the policy.

3. **Crossover doesn't work for neural networks** (without alignment). Unlike GAs where gene N means the same thing in every individual, weight N in two different networks does completely different things. Uniform crossover is destructive. Mutation-only (ES-style) works.

4. **Dead neurons kill small networks.** With ReLU and small hidden layers, a few unlucky mutations can permanently disable the entire output chain. Leaky ReLU prevents this.

5. **Mutation rate must scale with effective network size.** 10% of 5,206 weights = 520 changes = total scramble. 5% of 232 weights = 12 changes = targeted perturbation. The ratio of mutated weights to critical-path weights determines whether learned behaviors survive.

6. **The stagnation boost is counterproductive.** When the optimizer stalls, it doubles the mutation rate. But higher mutation just breaks more networks — the X=100 wall percentage rises with mutation rate. The population needs more diverse *good* networks, not more destruction.

## What the Beam Search Approach Does Better

The hall of fame already has 7 level completions from the frame-database/beam-search optimizer. That approach works because:
- It operates on concrete button sequences, not abstract weight vectors
- Splicing is position-aware (donors matched by game state at splice point)
- Good sections are preserved verbatim, not encoded in weights that can drift
- The search space is the actual input space (buttons per frame), not a proxy (neural network weights)

Neuroevolution's advantage — learning a reactive *policy* instead of a fixed sequence — hasn't materialized because the policy space (232 weights) is still too large relative to the population size (200) and the reward signal (distance before death).
