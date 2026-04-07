# Mario Speedrun Bot — Optimization Strategy

## Overview

Frame database optimizer with adaptive convergence-based splicing. Collects thousands of random NES playthroughs, records per-frame game state, then surgically improves completion runs by transplanting faster obstacle traversals from donor runs.

## Architecture

### Three Phases

**Phase 1 — Collection**: Run thousands of random playthroughs. For every viable run (≥300px), store per-frame button inputs, X/Y position, and X/Y velocity. Scan every run for section speed records — fast sections from even mediocre runs get persisted.

**Phase 2 — Initial Splice**: One round of golden run improvement using adaptive splicing (see below).

**Phase 3 — Refinement Loop**: Repeats up to 50 rounds:
- **Exploration mode** (no completions yet): Frontier runs push past the death point.
- **Completion mode** (HoF has completions): For each golden run, find slow spots, search for faster donors, splice with adaptive convergence, validate by simulation. Also generates noisy variants to discover new strategies.

### Adaptive Convergence-Based Splicing

The core splice algorithm for improving completion runs:

1. **Find slow spots**: Compare each golden run's section times against the section record book. Any section where the golden is ≥5 frames slower = slow spot.

2. **Back up from slow spot**: Move 80px before the slow spot start to create the splice entry point. This gives the donor room to set up a different approach to the obstacle (e.g., start a jump earlier).

3. **Search for donors**: Scan top 100 DB runs for those passing through the entry zone with a compatible state (Y within 4px, both grounded, moving right).

4. **Find convergence**: Follow each donor forward from the entry point. The splice ENDS wherever the donor naturally converges back to a state compatible with the golden run (same ground level, grounded, moving right). Each donor has its own convergence point — some fix the obstacle in 25px, some take 200px.

5. **Build and validate**: Construct golden prefix + donor middle + golden suffix. Only if the donor's middle is faster than the golden's. Validate every splice by full emulator simulation.

6. **Targeted generation**: If no DB candidates help, generate 500 random runs that follow the golden run up to the entry point then randomize. These specifically explore that obstacle with different approaches. Results go into the DB for this and future rounds.

### Persistence

- `hall-of-fame.json`: Top 10 completions with diversity enforcement. Stores raw inputs for splicing.
- `section-records.json`: Fastest known inputs for each level section (100px milestone pairs). Updated from ALL viable runs. Drives slow spot identification.
- `best-sequence.json` + `save-state.json`: Current best for browser replay.

### Playback (`bot.js`)
- Uses jsnes directly in the browser (same emulator = deterministic replay)
- Save state paired with best sequence ensures frame-perfect reproducibility
- RAM HUD shows Mario's position, velocity, enemies, score in real-time
- Hall of Fame browser, completion detection during flag sequence

## Input Representation

Each frame is a single byte (bitmask):
- bit 0 = A (jump), bit 1 = B (sprint), bit 4 = UP, bit 5 = DOWN, bit 6 = LEFT, bit 7 = RIGHT
- Random inputs: hold a weighted random button combo for 3-240 frames, then switch
- Bias: RIGHT (92%), B (80%), A (35%), others rare

## Fitness Function

Three tiers:
1. **Below 300px**: `fitness = bestX` (just reward distance)
2. **300px+ viable**: `fitness = speed × 10000 + distance × 10 - stuckPenalty + checkpointBonus`
3. **Completed**: `fitness = 10,000,000 + (8000 - frames) × 10 + checkpointBonus` (completions always win, faster = better)

### Checkpoints: X=800, 1600, 2400. Bonus: `(8000 - frame) × 10` per checkpoint.

## Tunable Parameters

### Collection
| Parameter | Default | Description |
|-----------|---------|-------------|
| `COLLECTION_BATCH_SIZE` | 500 | Runs per batch sent to workers |
| `INITIAL_BATCHES` | 10 | Number of collection batches (total = batch × size) |
| `MAX_STORED_RUNS` | 3000 | Max runs in memory DB before pruning |
| `MIN_VIABLE_DISTANCE` | 300 | Minimum X to store a run |

### Splicing
| Parameter | Default | Description |
|-----------|---------|-------------|
| `MAX_SPLICE_CANDIDATES` | 300 | Max splice attempts validated per round |
| `SPLICE_BACKUP_PX` | 80 | Pixels to back up from slow spot for entry |
| `CONVERGENCE_SCAN_PX` | 300 | Max pixels past slow spot to search for convergence |
| `CONVERGENCE_Y_TOLERANCE` | 4 | Y position match tolerance (pixels) |
| `MIN_SAVED_FRAMES` | 5 | Minimum frames faster to be worth splicing |
| `MAX_CANDIDATES_PER_SPOT` | 100 | Cap splice candidates per slow spot |
| `DB_SCAN_TOP_N` | 100 | Top DB runs to scan as potential donors |
| `TARGETED_GEN_THRESHOLD` | 20 | Generate targeted runs if fewer candidates than this |
| `TARGETED_GEN_COUNT` | 500 | Targeted random runs per obstacle |

### Section Records
| Parameter | Default | Description |
|-----------|---------|-------------|
| `MILESTONE_STEP` | 100 | X milestones every N pixels |
| `RECORD_MIN_SECTION` | 100 | Minimum section width to record |
| `RECORD_MAX_SECTION` | 2400 | Maximum section width (3/4 of level) |

### Hall of Fame
| Parameter | Default | Description |
|-----------|---------|-------------|
| `HOF_SIZE` | 10 | Max hall of fame entries |
| `GOLDEN_DIVERSITY_THRESHOLD` | 30 | Min checkpoint frame distance for diversity |

### Refinement
| Parameter | Default | Description |
|-----------|---------|-------------|
| `REFINEMENT_VARIANTS` | 300 | Variants generated per refinement round |
| `REFINEMENT_MAX_ROUNDS` | 50 | Maximum refinement rounds |
| `REFINEMENT_STALL_LIMIT` | 5 | Rounds without improvement before burst |

### Variant Generation
| Parameter | Default | Description |
|-----------|---------|-------------|
| `MIN_SEGMENT_DURATION` | 3 | Minimum frames per random button combo |
| `MAX_SEGMENT_DURATION` | 240 | Maximum frames per random button combo |

### Worker Pool
| Parameter | Default | Description |
|-----------|---------|-------------|
| `NUM_WORKERS` | CPU cores - 1 | Parallel worker threads |
| `MAX_FRAMES` | 8000 | Maximum frames per simulation |
| `STALL_LIMIT` | 120 | Frames without progress before termination |

## Files

| File | Purpose |
|------|---------|
| `optimize.js` | Training optimizer (Node.js, worker threads) |
| `bot.js` | Browser replay engine, RAM HUD, hall of fame browser |
| `index.html` | Game page with EmulatorJS + jsnes replay canvas |
| `analysis.html` | Speed profile charts, bottleneck analysis |
| `best-sequence.json` | Current best candidate (events + metadata) |
| `save-state.json` | jsnes save state for deterministic replay |
| `hall-of-fame.json` | Top 10 completions (inputs + events + metadata) |
| `section-records.json` | Fastest known inputs per level section |

## Training

```bash
cd mario-bot
node optimize.js          # Start training
# Press + to add worker threads
# Press - to remove worker threads
# Ctrl+C to save and quit
```

## Key Insights

1. **Adaptive convergence** — splice boundaries are determined by where donor and golden run states naturally converge, not fixed pixel positions. Each donor has its own splice length.
2. **Back up from obstacles** — splicing 80px before a slow spot gives donors room to set up a different approach (jump earlier, take different trajectory).
3. **Targeted generation** — when no DB runs handle an obstacle well, generate purpose-built runs that follow the golden path up to the obstacle then randomize.
4. **Section records capture knowledge** — fast traversals from ANY run get persisted, even from low-fitness runs that die shortly after. This knowledge drives slow spot identification.
5. **Validation by simulation** — every splice is tested by running it through the emulator. Enemy states, timing mismatches, and physics differences are caught automatically.
6. **Dual tracking** — highest-fitness and furthest-reaching runs tracked independently. Frontier runs push exploration, fitness-best drives speed optimization.
7. **HoF diversity** — checkpoint-based distance prevents the hall of fame from filling with near-identical runs.
