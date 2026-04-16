# Mario NEAT — Current Strategy

## Overview

NEAT (NeuroEvolution of Augmenting Topologies) — networks start with zero hidden neurons and evolve structure to fit the problem. Direct translation of SethBling's MarI/O algorithm to JavaScript.

## How It Works

1. **Start empty.** Each genome has 157 input nodes (156 game state + 1 bias) and 6 output nodes (RIGHT, LEFT, A, B, UP, DOWN). Zero connections. Zero hidden neurons.

2. **Mutate.** Add a connection between two nodes. Add a node that splits an existing connection. Tweak a weight. Enable/disable a connection. Each genome has self-adjusting mutation rates.

3. **Evaluate.** Run each genome through the NES emulator. Read the game state (tiles, enemies, mario position/velocity, timer), feed it through the network, apply the output buttons, repeat every frame. Fitness = distance reached - time penalty + completion bonus.

4. **Speciate.** Group similar genomes by compatibility distance (structural differences + weight differences). Genomes compete within their species, not globally. New structural innovations are protected.

5. **Breed.** Each species gets offspring proportional to its average fitness. Crossover happens within species only, aligned by innovation number. Champions of each species survive unchanged.

6. **Repeat.** Kill stale species (no improvement in 15 generations). Remove weak species (no breeding allocation). Inject mutated copies of the best genome when species collapse to maintain diversity.

## Architecture

### Inputs (157)
- **Mario state (5):** Y position, X velocity, Y velocity, on-ground flag, power-up flag
- **Tile grid (140):** 14 rows × 10 columns ahead of Mario. Binary: 1=solid, 0=empty. Reads directly from NES PPU nametable.
- **Enemies (10):** 5 slots × (relative X, relative Y). From NES RAM.
- **Timer (1):** Game timer normalized to [0, 1].
- **Bias (1):** Always 1.

### Outputs (6)
Each output uses MarI/O's sigmoid: `2/(1+exp(-4.9x))-1`. Output > 0 = button pressed.
- RIGHT, LEFT, A (jump), B (sprint), UP, DOWN

### NEAT Parameters (from MarI/O)
| Parameter | Value |
|-----------|-------|
| Population | 300 |
| DeltaDisjoint | 2.0 |
| DeltaWeights | 0.4 |
| DeltaThreshold | 1.0 |
| StaleSpecies | 15 generations |
| CrossoverChance | 75% |
| LinkMutationChance | 2.0 |
| NodeMutationChance | 0.50 |
| MutateConnectionsChance | 0.25 |
| PerturbChance | 90% |
| StepSize | 0.1 |
| StallTimeout | 20 frames |

### Fitness
```
fitness = bestX - startX - (frames × 0.5)
if completed: fitness += 1000
if enabledConnections > 50: fitness -= (connections - 50) × 0.5
```

## Results

- **Completed the level** at generation 1280 (~5 hours)
- 21 completions per generation by gen 1315
- Best genome: 184 nodes, 365 connections

## Known Problems

1. **Network doesn't react to the level.** Constantly jumps. Gets through by luck, not by reading tiles.
2. **Networks bloat.** Grow to 300-700 connections. MarI/O beat the level with <12 neurons.
3. **Species collapse.** Converges to 1 species, losing diversity.
4. **The "always jump" strategy.** Simpler than reactive jumping and scores well enough that evolution can't escape it.

## Files

| File | Purpose |
|------|---------|
| `optimize.js` | NEAT optimizer (Node.js, worker threads) |
| `bot.js` | Browser replay engine, RAM HUD, hall of fame browser |
| `index.html` | Game page with EmulatorJS + jsnes replay canvas |
| `best-sequence.json` | Current best (events for browser replay) |
| `save-state.json` | jsnes save state for deterministic replay |
| `hall-of-fame.json` | Top 10 genomes (events + genome data) |
| `neat-state.json` | Full NEAT state for resume (population + species) |

## Training

```bash
cd mario-bot
node optimize.js          # Start training (auto-resumes from neat-state.json)
# Ctrl+C to save and quit
```
