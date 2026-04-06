# Mario Speedrun Bot — Optimization Strategy

## Overview

Genetic algorithm that evolves NES input sequences to speedrun Super Mario Bros World 1-1. Uses jsnes (headless NES emulator) for simulation, worker threads for parallelism, and an island model for diversity.

## Architecture

### Training (`optimize.js`)
- **Island Model**: 3 independent populations of 67 individuals each
  - **Island 0**: Seeded with hall of fame + seed individual on startup
  - **Island 1**: Pure random (finds its own path)
  - **Island 2**: Wild island — 90% mutation rate, lots of earthquakes
- **Workers**: N-1 CPU cores, dynamically scalable with +/- keys
- **Migration**: Top 5 individuals swap between islands every 15 generations
- **Island Reset**: After 25 generations of stagnation, island gets nuked with fresh randoms
- **Hall of Fame**: Top 10 individuals ever seen, persisted to `hall-of-fame.json`, survives across training runs

### Representation
- Each individual is an array of **segments**: `{ buttons: [...], duration: N }`
- Buttons are NES controller inputs: RIGHT, LEFT, UP, DOWN, A (jump), B (sprint)
- Duration is 3-240 frames per segment
- Individuals have 20-44 segments typically
- Seed individual: 16 segments of alternating RIGHT+B (sprint) and RIGHT+B+A (sprint+jump)

### Playback (`bot.js`)
- Uses jsnes directly in the browser (same emulator as training = deterministic replay)
- Save state paired with best sequence ensures frame-perfect reproducibility
- RAM HUD shows Mario's position, velocity, enemies, score in real-time
- Hall of Fame browser lets you play back any of the top 10 runs

## Fitness Function

### Philosophy: "All gas, no brakes. If you survive, JACKPOT."

Three tiers:

1. **Below 500px** (not viable): `fitness = bestX`
   - Pure distance — just get past the first obstacles

2. **500px+ (viable)**: `fitness = speed × 10000 + distance × 10 - stuckPenalty + checkpointBonus`
   - **Speed is KING** — a fast short death beats a slow long crawl
   - Distance is just a tiebreaker
   - Stuck frames penalized at 50/frame

3. **Completed**: `fitness = 10,000,000 + (8000 - frames) × 10 + checkpointBonus`
   - Completions always beat non-completions
   - Faster completions massively rewarded (×10 time bonus)
   - No stuck penalty — if you finished, you win

### Checkpoints
- Position markers at X=800, 1600, 2400
- Bonus: `(MAX_FRAMES - checkpoint_frame) × 10` per checkpoint reached
- Rewards fast section times even if the run dies later

### Stuck Frames
- Counted when Mario's X doesn't change and he's not in a jump arc
- Penalized at 50 fitness/frame for non-completions
- NOT penalized for completions

### Early Kill
- If a run hasn't reached 500px by frame 600, it's killed as `too_slow`
- Saves CPU cycles on obviously bad individuals

## Mutation Operators

### Normal Mutations (per-segment, 20% chance each)
- **Duration ±15 frames** (30% of mutations)
- **Toggle button** (25%): Add/remove a random button. Directional mutex prevents LEFT+RIGHT conflicts.
- **Split segment** (15%): Break one segment into two
- **Merge segments** (10%): Combine adjacent segments
- **Insert random** (10%): Add a new random segment
- **Delete segment** (10%): Remove a segment

### Earthquake Mutations (5% chance, structural)
- **Shuffle section**: Randomize 3-8 consecutive segments completely
- **Time warp**: Scale durations in a range by 0.5-1.5×

### Adaptive Mutation Rate
- Stagnation 0-5: 30%
- Stagnation 6-10: 50%
- Stagnation 11-20: 70%
- Stagnation 21+: 70% + boosted diversity injection
- Wild island (last): Always 90%

## Files

| File | Purpose |
|------|---------|
| `optimize.js` | Training optimizer (Node.js, worker threads) |
| `bot.js` | Browser replay engine, RAM HUD, hall of fame browser |
| `index.html` | Game page with EmulatorJS + jsnes replay canvas |
| `best-sequence.json` | Current best individual (events + metadata) |
| `save-state.json` | jsnes save state for deterministic replay |
| `hall-of-fame.json` | Top 10 individuals ever (segments + events + metadata) |
| `super-mario-bros-1.nes` | NES ROM file |

## Training Commands

```bash
cd mario-bot
node optimize.js          # Start training
# Press + to add worker threads
# Press - to remove worker threads
# Ctrl+C to save and quit
```

## Key Learnings

1. **Fitness function is everything** — wrong incentives = wrong behavior. Speed must be primary for speedruns.
2. **Island model prevents convergence** — independent populations explore different strategies.
3. **Save state must be deterministic** — fixed frame counts, not conditional breaks.
4. **Stuck penalty helps non-completions** — but hurts completions if applied there.
5. **Segment count matters** — too many = junk, too few = can't find jumps. 20-44 is the sweet spot.
6. **Directional mutex** — LEFT+RIGHT cancel on NES hardware. Prevent it in mutations.
7. **Hall of fame** — preserve best DNA across training runs so you never lose progress.
8. **Wild island** — one island with extreme mutations ensures continued exploration.
9. **Early kill** — don't waste CPU on runs that can't even reach 500px in 10 seconds.
