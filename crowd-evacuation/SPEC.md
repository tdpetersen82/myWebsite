# EXODUS — Crowd Evacuation
## Implementation Specification v1.0

A complete, coder-ready spec for building EXODUS as a self-contained Phaser 3 game inside the Arcade Game Hub.

This document is the contract. If a section is ambiguous, that's a bug in the spec — open an issue before improvising.

---

## 1. Overview

**Premise**: The player designs a venue's evacuation plan — barriers, marshals, signs, PA speakers — within a budget. They press the alarm and watch the crowd evacuate autonomously under a randomized threat. Score is based on % evacuated, injuries, time, and budget efficiency.

**Player verbs**: place, validate, alarm, watch, score, retry.

**Out of scope for v1.0**: multiplayer, sandbox sharing, multi-floor levels with stairs, mod tools.

**Target browsers**: Chrome 110+, Safari 16+, Firefox 110+, Edge 110+. Touch supported but mouse-primary.

---

## 2. Architecture

### 2.1 Directory layout

```
crowd-evacuation/
├── index.html
├── main.js                    # Phaser config, scene registration, scaling
├── sim/
│   ├── Config.js              # all tunables
│   ├── Agent.js
│   ├── CrowdSystem.js         # the per-tick update loop
│   ├── SocialForce.js         # SFM math
│   ├── FlowField.js           # BFS gradient field
│   ├── SpatialHash.js
│   ├── ThreatSystem.js        # fire/smoke CA
│   ├── PanicModel.js
│   └── Scoring.js
├── editor/
│   ├── PlacementController.js
│   ├── BudgetManager.js
│   └── ValidationCheck.js
├── scenes/
│   ├── BootScene.js
│   ├── MenuScene.js
│   ├── DesignScene.js
│   ├── SimScene.js
│   └── ResultsScene.js
├── ui/
│   ├── Hud.js
│   ├── Toolbar.js
│   ├── DebugOverlay.js
│   └── Modal.js
├── levels/
│   ├── 00-tutorial.json
│   ├── 01-cafe.json
│   └── ... (8 levels + tutorial)
├── persistence/
│   └── Storage.js             # localStorage wrapper
└── assets/
    ├── sprites/
    └── audio/
```

### 2.2 Module boundaries

- **sim/** is pure. No Phaser imports. No DOM. Takes inputs, returns state. This makes it testable and replayable.
- **scenes/** wires sim state to Phaser rendering and input.
- **editor/** mutates the level placement set; commits to sim when ALARM fires.
- **persistence/** is the only module touching `localStorage`.

### 2.3 Scene flow

```
BootScene
   ↓ (assets loaded)
MenuScene
   ↓ (player picks level)
DesignScene
   ↓ (player presses ALARM, validation passes)
SimScene
   ↓ (timer expires OR all agents resolved)
ResultsScene
   ↓ (retry → DesignScene; next → MenuScene)
```

---

## 3. Coordinate System & Time

### 3.1 Units

All sim math is in **meters** and **seconds**. Rendering converts via:
```js
const PIXELS_PER_METER = 32;
function worldToScreen(xMeters) { return xMeters * PIXELS_PER_METER; }
```
Origin: top-left of the level grid is `(0, 0)`. +x is east, +y is south. Same orientation as Phaser screen coordinates — no flipping needed.

### 3.2 Fixed sim timestep

The sim updates at a fixed 60 Hz independent of render frame rate. The threat system updates at 10 Hz. Use the standard accumulator pattern:

```js
const SIM_STEP = 1/60;
const THREAT_STEP = 1/10;
let simAcc = 0, threatAcc = 0;

function update(dt) {
  // Phaser passes dt in milliseconds; convert to seconds
  dt = Math.min(dt / 1000, 0.1);          // clamp to handle backgrounded tabs
  simAcc += dt;
  threatAcc += dt;

  while (simAcc >= SIM_STEP) {
    crowdSystem.tick(SIM_STEP);
    simAcc -= SIM_STEP;
  }
  while (threatAcc >= THREAT_STEP) {
    threatSystem.tick(THREAT_STEP);
    threatAcc -= THREAT_STEP;
  }

  const interp = simAcc / SIM_STEP;       // 0..1
  renderer.draw(crowdSystem.state, interp);
}
```

When the tab is backgrounded, Phaser's loop pauses, so `dt` won't accumulate uncontrollably — but the clamp protects against initial-resume frame spikes.

---

## 4. Sim Math (full equations)

### 4.1 Social Force Model (Helbing, 2000)

Each agent `i`'s acceleration per tick:

```
a_i  =  (v_desired_i − v_i) / τ                    [self-driving]
     +  Σ_j  A · exp((r_ij − d_ij) / B) · n̂_ij     [neighbor repulsion]
     +  Σ_w  A · exp((r_iw − d_iw) / B) · n̂_iw     [wall repulsion]
     +  k_g · (centroid_group − pos_i)              [group attraction, if grouped]
```

Where:
- `τ = 0.5` — relaxation time toward desired velocity (s)
- `A = 2000` — repulsion magnitude (N/kg, treating `m=1`)
- `B = 0.08` — repulsion range (m)
- `r_ij = AGENT_RADIUS_i + AGENT_RADIUS_j` (m)
- `d_ij` = distance between agent centers (m)
- `n̂_ij` = unit vector from j to i
- `k_g = 1.5` — group cohesion strength (m/s²)
- `v_desired = baseSpeed · mobility · (1 + PANIC_SPEED_GAIN · panic) · flowFieldDir`

Then integrate: `v_i += a_i · dt`, clamp speed to `MAX_SPEED · mobility`, then `pos_i += v_i · dt`.

**Why faster-is-slower emerges**: as `panic → 1`, `v_desired` grows but agents pile up at chokepoints. The repulsion sum from neighbors then exceeds the self-driving term, and the agent's actual velocity drops below `baseSpeed`. This is the famous evacuation paradox and falls out of the math without special-casing — provided you don't cap the repulsion force. Don't cap it. Tune `A` and `B` instead.

### 4.2 Panic update

Per sim tick:
```
densityFactor   = clamp((neighborsWithin1m / 6) − 1, 0, 1)
threatFactor    = exp(−distanceToNearestThreat / 5)        // 1 at threat, ~0 far
visionFactor    = clamp((NORMAL_VISION − currentVision) / NORMAL_VISION, 0, 1)
groupSeparation = clamp(distToGroupCentroid / 5, 0, 1)     // if grouped

panicDelta = ( 0.5 · densityFactor
             + 1.0 · threatFactor
             + 0.3 · visionFactor
             + 0.4 · groupSeparation ) · dt

panic = clamp(panic + panicDelta − 0.05 · dt · (1 − densityFactor − threatFactor), 0, 1)
```
Decay only happens when conditions are calm; in active threat it's suppressed.

### 4.3 Flow field

Computed once at sim start (and on topology changes). Single BFS from all exit cells outward. For each walkable cell, store the unit vector pointing toward the lowest-cost neighbor.

```
function computeFlowField(grid, exits):
  dist[w][h] = Infinity
  queue = []
  for each exit cell (x, y):
    dist[x][y] = 0
    queue.push((x, y))

  while queue not empty:
    (x, y) = queue.shift()
    for (nx, ny) in 8-neighbors of (x, y):
      if grid[nx][ny].walkable and dist[nx][ny] > dist[x][y] + cost(x,y,nx,ny):
        dist[nx][ny] = dist[x][y] + cost(x,y,nx,ny)
        queue.push((nx, ny))

  for each walkable cell (x, y):
    flow[x][y] = unitVector toward neighbor with lowest dist
```

Diagonal cost = √2 × cardinal cost. Cost is 1 + smokePenalty[x][y] so agents prefer clear paths.

**Recompute trigger**: any cell becoming impassable (fire spread). Use partition-incremental update — only re-flood from the changed region's frontier — to avoid full O(W·H) cost mid-sim.

### 4.4 Threat (fire/smoke) cellular automaton

Grid of `{ fire: 0..1, smoke: 0..1, fuel: 0..1 }` cells. Tick at 10 Hz.

```
for each cell c:
  if c.fire > 0:
    c.fuel -= FUEL_BURN_RATE · dt
    if c.fuel <= 0: c.fire = 0
    c.smoke = min(1, c.smoke + SMOKE_GEN · dt)
    for each neighbor n:
      windAlignment = max(0, dot(windDir, n_to_c_dir))
      spreadProb = (FIRE_SPREAD_BASE + FIRE_WIND_BIAS · windAlignment) · n.fuel · dt
      if random() < spreadProb: n.fire = max(n.fire, 0.3)

  c.smoke *= SMOKE_DECAY                                  // 0.995 per tick
  c.smoke += windAdvect(c.smoke, neighbors)               // small directional bias
```

Constants in `Config.js`. Smoke in cell `c` reduces vision radius for any agent in `c` to `NORMAL_VISION · (1 − c.smoke · 0.9)`.

### 4.5 Vision and signs

Each tick, each agent has probability `awareness · visionFactor · dt` of "reading" any sign within their vision cone (60° forward, radius `currentVision`). Reading a sign sets the agent's `targetExit` to the sign's pointed exit for `SIGN_PERSISTENCE` seconds (default 8s).

Marshals work the same way but always-on within `MARSHAL_RADIUS` (default 4m), with stronger persistence (15s) and a panic-reduction effect: agents within radius lose 0.1 panic/sec.

PA speakers cover their entire room (no LOS), reduce panic by 0.05/sec for everyone in the polygon, and force-set `targetExit` for `PA_PERSISTENCE` (12s) when activated.

---

## 5. Configuration File

`sim/Config.js`. Every magic number lives here. Treat it as the balancing surface — when a level feels wrong, you tune here, not in mechanic code.

```js
export const CFG = {
  // Time
  SIM_HZ: 60,
  THREAT_HZ: 10,
  MAX_DT: 0.1,

  // World
  PIXELS_PER_METER: 32,
  CELL_M: 0.5,                    // grid cell size in meters

  // Agent
  AGENT_RADIUS: 0.2,              // meters
  BASE_SPEED: 1.3,                // m/s
  MAX_SPEED_MULT: 1.7,
  PANIC_SPEED_GAIN: 0.7,
  MOBILITY_NORMAL: 1.0,
  MOBILITY_ELDERLY: 0.6,
  MOBILITY_CHILD: 0.8,
  MOBILITY_WHEELCHAIR: 0.3,
  MOBILITY_DRUNK: 0.7,
  AWARENESS_NORMAL: 0.5,          // base sign-read probability per second
  AWARENESS_DRUNK: 0.15,

  // Social Force Model
  SFM_A: 2000,
  SFM_B: 0.08,
  SFM_TAU: 0.5,
  GROUP_COHESION_K: 1.5,
  GROUP_LAG_M: 3.0,               // distance from group centroid that spikes panic
  WALL_REPULSION_MULT: 1.2,       // walls repel slightly more than people

  // Vision
  VISION_NORMAL_M: 15,
  VISION_MIN_M: 1.5,
  SIGN_CONE_DEG: 60,
  SIGN_PERSISTENCE_S: 8,
  MARSHAL_RADIUS_M: 4,
  MARSHAL_PERSISTENCE_S: 15,
  MARSHAL_PANIC_REDUCTION: 0.1,
  PA_PERSISTENCE_S: 12,
  PA_PANIC_REDUCTION: 0.05,

  // Panic
  PANIC_DENSITY_GAIN: 0.5,
  PANIC_THREAT_GAIN: 1.0,
  PANIC_VISION_GAIN: 0.3,
  PANIC_GROUP_GAIN: 0.4,
  PANIC_DECAY: 0.05,
  DENSITY_PANIC_THRESHOLD: 6,     // neighbors-within-1m before density panic kicks in

  // Threat — fire
  FIRE_SPREAD_BASE: 0.02,
  FIRE_WIND_BIAS: 3.0,
  FIRE_FUEL_BURN_RATE: 0.05,
  FIRE_DAMAGE_RADIUS_M: 1.0,
  FIRE_INJURE_PANIC_THRESHOLD: 0.95,

  // Threat — smoke
  SMOKE_GEN_RATE: 0.4,
  SMOKE_DECAY: 0.995,
  SMOKE_VISION_PENALTY: 0.9,
  SMOKE_FLOWFIELD_PENALTY: 5,     // pathfinding cost penalty per smoke unit

  // Scoring
  SCORE_EVAC_WEIGHT: 100,
  SCORE_INJURED_PENALTY: 30,
  SCORE_TIME_BONUS: 20,
  SCORE_BUDGET_BONUS: 10,
  STAR_THRESHOLDS: [60, 80, 95],

  // Editor
  GRID_SNAP: true,
  VALIDATION_BLOCK_ALARM: true,

  // Performance
  MAX_AGENTS: 800,
  SPATIAL_HASH_CELL_M: 1.0,
  FLOWFIELD_RECOMPUTE_BUDGET_MS: 4,
};
```

---

## 6. Level Format

`levels/<id>.json`. Hand-authored. Use a tile-paint tool (Tiled, or a custom tool) to generate the `tiles` field.

### 6.1 Schema

```json
{
  "id": "01-cafe",
  "displayName": "Riverside Café",
  "category": "tutorial",
  "grid": { "w": 60, "h": 40, "cellSize": 0.5 },
  "tiles": "RLE-encoded string, see §6.2",
  "exits": [
    { "id": "main", "cells": [[12,39],[13,39]], "label": "Main Entrance" }
  ],
  "spawns": [
    {
      "region": [[10,5],[40,30]],
      "count": 80,
      "groupSizeRange": [1, 4],
      "demographics": {
        "normal": 0.7, "elderly": 0.1, "child": 0.1, "wheelchair": 0.05, "drunk": 0.05
      }
    }
  ],
  "budget": {
    "barrier_units": 16,
    "marshal": 3,
    "sign": 6,
    "pa": 2,
    "door_modify": 4
  },
  "threats": [
    {
      "type": "fire",
      "spawnPolicy": "random:edge",
      "ignitionDelay": 5,
      "windPolicy": "random:cardinal",
      "fuel": 1.0
    }
  ],
  "timeLimit": 90,
  "starThresholds": [60, 80, 95],
  "tutorial": null
}
```

### 6.2 Tile encoding

Tiles use a single-character RLE string. Characters:
- `.` floor
- `#` wall
- `D` door (initially open)
- `d` door (initially closed)
- `E` exit cell
- `F` fire ignition candidate (only used when `spawnPolicy: "designated"`)
- `_` non-walkable / void / outside

Example for a 6×4 grid:
```
"######|#....#|#....E|######"
```
Pipe separates rows. Top-left is `(0,0)`. RLE encoding (e.g. `#6` for six `#`) is allowed for compression on large levels.

### 6.3 Spawn region

Agents spawn uniformly at random within the bounding rectangle defined by `region`'s two corners. Group members spawn co-located within 1m of their group centroid.

### 6.4 Tutorial hooks

Tutorial levels include a `tutorial` block with scripted steps. See §13.

---

## 7. Persistence

`persistence/Storage.js`. The only module that touches `localStorage`. All keys use the `crowd-evac:v1:` prefix to coexist with other hub games.

### 7.1 Schema

```js
// Per-level scores (highest only)
"crowd-evac:v1:scores" → {
  "00-tutorial": { score: 100, stars: 3, evacuated: 5, injured: 0, time: 12.4, ts: 1714329000 },
  "01-cafe":     { score: 87,  stars: 2, evacuated: 38, injured: 2, time: 67, ts: 1714329500 }
}

// User settings
"crowd-evac:v1:settings" → {
  sfxVolume: 0.8, musicVolume: 0.6, masterVolume: 1.0,
  colorblindMode: false,         // shifts panic palette to blue/yellow
  reducedMotion: false,          // disables screen shake, particle bursts
  showFps: false,
  inputMode: "auto"              // "auto" | "mouse" | "touch"
}

// Resume in-progress design (never finalized)
"crowd-evac:v1:lastDesign:<levelId>" → {
  placements: [
    { type: "barrier", x: 12, y: 8, length: 4, rotation: 0 },
    { type: "marshal", x: 18, y: 12, facing: "S" }
  ],
  ts: 1714329600
}

// Aggregate stats
"crowd-evac:v1:meta" → {
  totalPlaytimeS: 12450,
  totalEvacuated: 8230,
  totalInjured: 412,
  attemptsCount: 178,
  installVersion: "1.0.0",
  firstPlay: 1714200000,
  lastPlay: 1714329600
}
```

### 7.2 Versioning

The `:v1:` prefix lets future breaking changes ship without migrations: read `:v1:` keys, write to `:v2:`, leave v1 alone. If the game has shipped to users and the schema breaks, write a one-time migration in `Storage.js`.

### 7.3 Storage.js API

```js
Storage.getScore(levelId) → ScoreRecord | null
Storage.setScore(levelId, ScoreRecord)         // only writes if higher
Storage.getSettings() → Settings
Storage.setSettings(partial)
Storage.getDraft(levelId) → Draft | null
Storage.setDraft(levelId, Draft)
Storage.clearDraft(levelId)
Storage.getMeta() → Meta
Storage.tickMeta(deltaPlaytimeS, deltaEvac, deltaInjured)
```
All methods catch and swallow QuotaExceededError; storage is best-effort.

---

## 8. Asset Manifest

### 8.1 Sprites (PNG, transparent background)

| File | Dimensions | Frames | Notes |
|---|---|---|---|
| `agent-base.png` | 24×24 | 4 walk × 8 dir = 32 | Top-down, tinted at runtime for variants |
| `agent-child.png` | 20×20 | same | Smaller silhouette |
| `agent-elderly.png` | 24×24 | same | Slightly hunched, slower anim |
| `agent-wheelchair.png` | 28×28 | 4 roll × 8 dir | Distinct silhouette |
| `agent-drunk.png` | 24×24 | same | Wobble animation curve |
| `marshal.png` | 32×32 | 4×8 | Hi-vis vest, distinct |
| `tile-floor.png` | 32×32 | 3 variants | Tile randomly for visual interest |
| `tile-wall.png` | 32×32 | 1 | Dark stone |
| `tile-door-open.png` | 32×32 | 1 | |
| `tile-door-closed.png` | 32×32 | 1 | |
| `tile-exit.png` | 32×32 | 1 anim 4f | Glowing green |
| `fire.png` | 32×32 | 6 | Loop |
| `smoke.png` | 64×64 | 1 | Soft alpha; tinted & alpha-faded by density |
| `barrier.png` | 32×32 | 1 | Stanchion + rope variant via segment connect |
| `sign-arrow.png` | 16×16 | 4 dir | Green emergency arrow |
| `pa-speaker.png` | 24×24 | 1 + ring overlay | |
| `panic-halo.png` | 32×32 | 1 | Red ring, alpha-modulated by panic level |
| `injured-marker.png` | 24×24 | 1 | Red cross |

**Total**: ~17 sprite files. Source from itch.io, OpenGameArt, or commission. Budget: ~12 hours including integration.

### 8.2 Audio (OGG primary, MP3 fallback)

| File | Type | Length | Notes |
|---|---|---|---|
| `alarm.ogg` | Loop | 2s loop | Standard fire alarm |
| `ambient-cafe.ogg` | Loop | 30s | Pre-alarm murmur |
| `ambient-club.ogg` | Loop | 30s | Music + chatter |
| `ambient-stadium.ogg` | Loop | 30s | Crowd roar |
| `footstep-1..4.ogg` | One-shot | 0.2s | Pitch-randomize on play |
| `panic-swell-low.ogg` | Loop | 8s | Layered with panic-mid/high |
| `panic-swell-mid.ogg` | Loop | 8s | |
| `panic-swell-high.ogg` | Loop | 8s | Crossfaded by avg crowd panic |
| `fire-crackle.ogg` | Loop | 4s | Spatialized to fire centroid |
| `whistle.ogg` | One-shot | 0.4s | Marshal influence trigger |
| `pa-chime.ogg` | One-shot | 1.2s | PA activation |
| `place.ogg` | One-shot | 0.1s | Editor place |
| `remove.ogg` | One-shot | 0.1s | Editor remove |
| `error.ogg` | One-shot | 0.3s | Invalid placement |
| `ui-click.ogg` | One-shot | 0.1s | Menu/button |
| `success.ogg` | One-shot | 3s | Win fanfare |
| `failure.ogg` | One-shot | 3s | Loss dirge |

**Total**: ~20 audio files. Source from freesound.org (CC0/CC-BY) or commission. Budget: ~8 hours including integration. Document every license in `assets/CREDITS.txt`.

---

## 9. Scenes — Wireframes

ASCII because no image attachments. Treat these as **the** layout — don't drift.

### 9.1 MenuScene

```
┌───────────────────────────────────────────────────────────────┐
│   EXODUS                                          [⚙ settings] │
│   ─ get them out ─                                            │
│                                                               │
│   ┌─────────┐  ┌─────────┐  ┌─────────┐                       │
│   │ TUTORIAL│  │ LEVEL 1 │  │ LEVEL 2 │   ...                │
│   │  ★★★    │  │  ★★☆    │  │  ☆☆☆    │                       │
│   │  Café   │  │  Office │  │  Club   │                       │
│   └─────────┘  └─────────┘  └─────────┘                       │
│                                                               │
│                    [back to hub]                              │
└───────────────────────────────────────────────────────────────┘
```

Card click → DesignScene with that level. Locked levels show a padlock until prior level cleared with ≥1 star.

### 9.2 DesignScene

```
┌────┬─────────────────────────────────────────────────┬────────┐
│TOOL│                                                 │ BUDGET │
│BAR │                                                 │        │
│    │                                                 │ Barr 12│
│ [B]│              VENUE FLOOR PLAN                   │ Mar  3 │
│ [M]│           (zoomable, pannable)                  │ Sign 5 │
│ [S]│                                                 │ PA   2 │
│ [P]│                                                 │ Door 4 │
│ [D]│                                                 │        │
│    │                                                 │        │
│    │                                                 │ ┌────┐ │
│    │                                                 │ │ALRM│ │
│ [?]│                                                 │ └────┘ │
└────┴─────────────────────────────────────────────────┴────────┘
   STATUS: ✔ all spawns can reach an exit          [undo] [redo]
```

- Toolbar left: B(arrier) M(arshal) S(ign) P(A) D(oor toggle), `?` toggles debug overlay
- Floor plan center: zoom 50%–200%, pan with middle-drag
- Right panel: budget tracker, ALARM button (greyed if validation fails)
- Bottom: validation status + undo/redo

### 9.3 SimScene

```
┌───────────────────────────────────────────────────────────────┐
│ TIME 1:24  •  EVAC 12/80  •  INJURED 0  •  PANIC ▓▓▓▓░░ 67%   │
├───────────────────────────────────────────────────────────────┤
│                                                               │
│              VENUE FLOOR PLAN — LIVE SIMULATION               │
│           (zoomable, pannable — no edits possible)            │
│                                                               │
│                                                               │
│                                                               │
├───────────────────────────────────────────────────────────────┤
│   [⏸ pause]  [⏩ 2× speed]  [⏵ resume]      [F1–F8 debug]      │
└───────────────────────────────────────────────────────────────┘
```

HUD top: persistent stats. Bottom: speed control. No editing affordances visible.

### 9.4 ResultsScene

```
┌───────────────────────────────────────────────────────────────┐
│                          ★★☆                                  │
│                       LEVEL CLEARED                           │
│                                                               │
│         Evacuated      72/80                  +90             │
│         Injured         3                     −9              │
│         Time bonus     +0:23                  +5              │
│         Budget unspent  4 units               +3              │
│                                              ────             │
│         FINAL SCORE                            89             │
│                                                               │
│         [retry]   [next level]   [back to menu]               │
└───────────────────────────────────────────────────────────────┘
```

If score is a new record, animated highlight + sound.

---

## 10. Input & Controls

### 10.1 Mouse (primary)

| Action | Binding |
|---|---|
| Place selected tool | Left-click |
| Drag-place barrier | Left-click + drag |
| Remove placement | Right-click on placed item |
| Pan camera | Middle-click drag |
| Zoom | Scroll wheel |
| Rotate selected tool (sign, marshal facing, door) | `R` |
| Tool select | `1`–`5` keys |
| Toggle inspect mode | `Space` |
| Trigger alarm | `Enter` (with confirm modal) |
| Pause sim | `Space` (during SimScene) |
| Speed up sim | `+` or `]` |
| Slow sim | `-` or `[` |
| Step frame (paused) | `.` |

### 10.2 Touch (secondary)

| Action | Gesture |
|---|---|
| Select tool | Tap toolbar button |
| Place | Tap on canvas |
| Remove | Long-press placement |
| Pan | One-finger drag |
| Zoom | Two-finger pinch |
| Rotate | Tap rotate button (visible only on touch) |

Mobile portrait: toolbar collapses to bottom drawer. Floor plan auto-fits.

### 10.3 Confirmation modals

ALARM trigger always requires confirmation: *"Lock in design and trigger alarm? You cannot edit during the simulation."* with `[cancel] [confirm]`.

Quitting mid-sim requires confirmation if any agents are still alive.

---

## 11. Debug Overlay

`ui/DebugOverlay.js`. Built **before** any level authoring. Without these visualizers you cannot tune the sim.

| Key | Toggle |
|---|---|
| `F1` | Flow field arrows (one per cell) |
| `F2` | Color agents by panic (0=green, 1=red) |
| `F3` | Show agent vision cones |
| `F4` | Show pairwise repulsion forces as red lines |
| `F5` | Fire/smoke heatmap overlay |
| `F6` | Slow-mo (0.25× sim) |
| `F7` | Pause + step-frame (use `.` to advance) |
| `F8` | Agent inspector — click any agent → side panel with full state |
| `F9` | Performance graph (sim ms, render ms, agent count, FPS) |
| `F10` | Toggle ALL debug overlays |

The agent inspector panel shows:
```
Agent #142
  Type:        normal
  Position:    (12.3, 18.7) m
  Velocity:    (1.1, −0.4) m/s   speed 1.17
  Panic:       0.62   ▓▓▓▓▓▓░░░░
  Vision:      8.2 m  (smoke −47%)
  Mobility:    1.0
  Group:       #7 (3 members; centroid 1.2m away)
  TargetExit:  "main"
  State:       FOLLOWING
  LastSign:    sign #4 (read 3.1s ago)
```

Hide debug behind a flag in `Config.js` (`DEBUG_ENABLED: true`) and disable for production builds — but ship the production toggle as a hidden console command (`window.exodus.debug = true`) so post-launch tuning is possible.

---

## 12. Validation (Editor)

Run on every placement, removal, or tool change. The ALARM button is disabled and reasoning shown unless ALL of these pass:

1. **Reachability**: BFS from each spawn region's center to at least one exit. Failure → highlight unreachable spawns red.
2. **Exit reachability**: Each exit must be reachable from at least one spawn. Failure → highlight orphaned exits red.
3. **No agent traps**: A bounded region with agents inside but no path out is forbidden.
4. **Budget**: Total placement cost ≤ budget. Failure → red overlay on offending tool count.
5. **Door consistency**: A "closed" door must have a marshal or PA-controlled rule adjacent — otherwise it's just a wall (not an error, but warn).

Validation runs in <16ms even on the largest level via cached BFS results re-used across placements.

---

## 13. Tutorial — Level 00

`levels/00-tutorial.json` plus a scripted tutorial controller.

### 13.1 Setup

A 20×12 grid representing a small store. 5 agents in a single group (a family) near the back. One exit at the front. One fire ignition near the back-left, scheduled to ignite 8 seconds after ALARM.

### 13.2 Scripted steps

```json
"tutorial": {
  "steps": [
    {
      "trigger": "scene-enter:design",
      "text": "Welcome. This is a small store. 5 people need to get out when the fire alarm sounds.",
      "highlight": null,
      "advance": "click"
    },
    {
      "trigger": "click",
      "text": "Place a SIGN here — pointing toward the exit. People panic and forget where doors are. Signs help.",
      "highlight": { "tile": [10, 6] },
      "advance": "place:sign:[10,6]"
    },
    {
      "trigger": "place:sign",
      "text": "Now place a MARSHAL near the spawn area. Marshals reduce panic and guide people.",
      "highlight": { "rect": [[5,4],[8,8]] },
      "advance": "place:marshal:within:rect"
    },
    {
      "trigger": "place:marshal",
      "text": "You have 4 BARRIER units. Use them to block off the area near the fire so people don't run toward it.",
      "highlight": { "rect": [[2,1],[6,3]] },
      "advance": "place:barrier:totalLength>=4"
    },
    {
      "trigger": "barriers-placed",
      "text": "Ready? Press the ALARM button when you're ready to start the simulation.",
      "highlight": { "ui": "alarmButton" },
      "advance": "scene-enter:sim"
    },
    {
      "trigger": "scene-enter:sim",
      "text": "Watch carefully. Notice how the marshal pulls people away from the fire and the sign keeps them moving toward the exit.",
      "highlight": null,
      "advance": "scene-enter:results"
    },
    {
      "trigger": "scene-enter:results",
      "text": "That's it. Real levels add more people, more threats, and tighter budgets. Go save some lives.",
      "highlight": null,
      "advance": "click"
    }
  ]
}
```

The tutorial controller listens for `advance` events and gates input until each step is satisfied. Player cannot place wrong things during tutorial — wrong placements show a soft "try the highlighted area" hint and refund.

---

## 14. Error Handling

| Scenario | Behavior |
|---|---|
| Level JSON 404 or parse error | MenuScene shows error card with retry; never a black canvas |
| `localStorage` quota exceeded | Silent fail; in-memory state continues; toast on next save attempt only |
| `localStorage` disabled (private browsing) | Use in-memory shim; warn on first attempted save: "Progress will not persist" |
| Audio decode failure | Silent fail; game continues without that asset |
| Sprite load failure | Magenta placeholder rect; log to console; game continues |
| Agent stuck (zero velocity, not evacuated, panic high, >5s) | Teleport along flow-field gradient by 1m; log as `agent-unstick`. If repeats >3×, mark INJURED. |
| All exits blocked mid-sim | Agents enter `FIGHTING` substate (small kicks at fire/walls); slowly take damage from proximity; eventually INJURED. Sim continues to time limit. |
| Tab backgrounded | Phaser pauses loop; on resume, clamp dt to MAX_DT |
| Window resize | Re-fit canvas via Phaser scale manager; UI relayouts via CSS |

---

## 15. Testing

### 15.1 Unit tests (`tests/` dir, run via `node --test` or vitest)

Pure-function targets:
- `FlowField.compute(grid, exits) → field` — known fixtures with hand-computed expected outputs
- `SocialForce.acceleration(agent, neighbors, walls) → vector` — known geometries
- `PanicModel.update(agent, ctx, dt) → newPanic` — table-driven tests
- `Scoring.compute(simResult) → { score, stars, breakdown }` — table-driven
- `SpatialHash` insert/query/remove — randomized fuzzing
- `Storage` — mock localStorage; verify versioning, quota handling

### 15.2 Integration tests

- Replay harness: record `(seed, levelId, placements)` per attempt. Replay deterministically using the same RNG seed and verify same final score.
- "Smoke level": empty room with one exit, 50 agents — expect 100% evac in <30s with default behavior.
- "Stress level": 800 agents in stadium — verify >55 fps on a 4-year-old laptop baseline.

### 15.3 Manual playtesting

For each level:
- 10 attempts by the developer, log first-try success rate
- 5 external playtesters per level minimum
- Target: 30–50% first-try clear rate with default placements

---

## 16. Performance Budget

Target: 60 fps on a 2020 MacBook Air (M1 baseline) at largest level (800 agents).

| Subsystem | Per-frame budget | Strategy |
|---|---|---|
| Crowd update | 8 ms | Spatial hash O(N) neighbor lookups; reuse Vec2 instances; avoid GC |
| Threat tick | 1 ms (10 Hz) | Cellular automaton on coarse grid; SIMD-friendly array ops |
| Flow field recompute | 4 ms | Partition-incremental; only on topology change |
| Render | 5 ms | Sprite pooling; batched draws; off-screen culling; single draw call per sprite type |
| UI / HUD | 1 ms | Update at 10 Hz, not 60 Hz |
| **Total budget** | **16.6 ms** | leaves ~1ms headroom |

If targets miss: halve `THREAT_HZ` first, then cap `MAX_AGENTS` per level, then reduce flow-field resolution (cell size 1m instead of 0.5m).

Profile every Friday during dev.

---

## 17. Hub Integration Checklist

When the game ships, update the hub:

- [ ] Add `<div class="game-card">` to `index.html` under "Strategy & Puzzles"
- [ ] Add `{ name: "Exodus", icon: I.exodus, url: "crowd-evacuation/" }` to `GAME_CATALOG` in `nav.js`
- [ ] Add new icon definition for `I.exodus` in `nav.js`
- [ ] Add URL to `sitemap.xml` with `priority 0.8 changefreq monthly`
- [ ] Add `ListItem` entry to JSON-LD `ItemList` in `index.html`; bump `numberOfItems` to 41
- [ ] Update meta description "40 free arcade and casino games" → "41"
- [ ] Update OG description and Twitter description likewise
- [ ] Capture 1200×630 screenshot for any future OG image work
- [ ] Verify auto-scaling at 16:9, 4:3, 9:16 (mobile portrait)
- [ ] Verify keyboard navigation works for menu and design scenes
- [ ] Verify localStorage scoped to `crowd-evac:v1:` prefix only

---

## 18. Phase 1 Acceptance Criteria

The game is "v1.0 shippable" when ALL of these hold:

1. ✅ Tutorial level cleared by 5 first-time playtesters in <5 minutes each
2. ✅ All 8 levels clearable with ≥1 star within 3 attempts by an experienced playtester
3. ✅ ≥55 fps on baseline laptop at largest level (800 agents)
4. ✅ Faster-is-slower observable in debug — panicked-crowd door empties slower than calm-crowd door at identical density
5. ✅ All level JSONs validate against schema; no runtime parse errors
6. ✅ All assets credited in `assets/CREDITS.txt`
7. ✅ All localStorage interactions go through `Storage.js`; no direct calls
8. ✅ Replay harness produces identical scores across 100 deterministic re-runs
9. ✅ Hub integration checklist (§17) complete
10. ✅ Manual smoke test on Chrome, Safari, Firefox latest

---

## 19. Out of Scope (Defer to v1.1+)

- Sandbox / level editor for users
- Workshop / level sharing
- Multi-deck levels with stair transitions
- Co-op / asynchronous multiplayer
- Daily challenge mode with global leaderboards
- Mod tools / custom threats
- Localization beyond English
- Achievements integrated with the hub-wide system (if hub gains one)

---

## 20. Glossary

- **Agent** — an autonomous person in the simulation
- **Flow field** — precomputed gradient over the grid pointing toward exits
- **SFM** — Social Force Model, the math underlying agent motion
- **CA** — Cellular Automaton (used for fire/smoke spread)
- **Faster-is-slower** — well-documented evacuation paradox where higher panic produces slower throughput at chokepoints
- **Marshal** — placeable static agent that influences nearby crowd behavior
- **Validation** — pre-alarm checks ensuring the design is solvable
- **Topology change** — any event that changes which cells are walkable (typically fire spread)

---

*Spec version 1.0. Treat as authoritative. Open issues for discrepancies before deviating.*
