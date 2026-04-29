# EXODUS — Build Notes

Living document. Status, known issues, and next steps for the crowd-evacuation game. The authoritative spec is `SPEC.md`; this is the running journal.

---

## Current version: v0.3

### What changed in v0.3

- **Three levels**: Tutorial — Coffee Stand (00, 8 agents, single fire, gentle intro), Riverside Café (01, the original 40-agent layout), and Bassline Club (02, 60 agents, half drunk, narrow 1m exit, faster fire).
- **Level registry** in `levels/levels.js` — shared `buildGridFromLevel` and `spawnAgentsForLevel` helpers. Each level file pushes itself into the global `LEVELS` array on load.
- **Menu rebuilt as a level-select grid** — one card per registered level, showing budget summary, exit width, and earned stars. Click anywhere on the card to play.
- **Tutorial intro modal** — levels with a `tutorial.intro` field show a centered captioned overlay on entry. Click to dismiss.

### Verification

- All 3 levels register at load time (`LEVELS.length === 3`).
- Sim/editor verified working in v0.2 — same code path, no regressions expected.
- Preview-browser cache prevented runtime menu re-render verification, but served file content confirmed correct via `curl` and `fetch`.

---

## v0.2 (commit 67558d0)

### What changed in v0.2

- **Editor expanded from one tool to four**: marshal, barrier (drag-place axis-aligned walls), sign (4-direction with R-rotate, 120° vision cone), PA speaker (radius-based panic reduction).
- **Placements** class persists the bag of placed tools across scene transitions and computes per-tool budget cost.
- **Validation** now rebuilds the grid with barriers applied and runs reachability BFS before allowing ALARM. Spawn-trapping designs are blocked.
- **CrowdSystem._applyInfluencers** unifies marshal/PA/sign biasing in one pass; signs use awareness × visionFactor probability per tick.
- **DebugOverlay**: F1 flow-field arrows, F3 vision cones, F6 slow-mo (0.25×), F7 pause + `.` step-frame, F9 sim/render perf graph, F10 toggle all.
- Level 1 budget bumped to include all four tool kinds.

Verified: barrier blocks tile, sign biases agents toward direction, PA reduces panic, fire still spreads and injures stragglers. 60s manual playthrough with mixed tools: 21/40 evacuated.

---

## v0.1 (commit 9fadde7)

### What shipped

- 17 source files, ~1,700 LOC, no sprite/audio dependencies (procedural rendering only).
- **Sim core**: Helbing social-force model with spatial hashing, panic dynamics coupled to local density and threat distance, fire/smoke cellular automaton, BFS flow fields with diagonal cost.
- **Single playable level — Riverside Café**: 40 agents, 5 demographic types (normal / elderly / child / wheelchair / drunk), NE-corner fire ignition after 8s delay, 4m exit on south wall, 120s time limit.
- **Editor (minimal)**: place up to 3 marshals anywhere walkable, click again to remove, press ALARM (or Enter) to commit and start the sim. Validation blocks ALARM if spawn region cannot reach an exit.
- **Scoring**: evac% × 100 + time bonus + budget bonus − injury penalty. 1/2/3 stars at thresholds 60/80/95.
- **Persistence**: `crowd-evac:v1:` localStorage prefix; also writes hub-convention `crowdEvacHighScore`.
- **Hub integration**: card in Strategy & Puzzles section of homepage, `nav.js` catalog entry with custom SVG icon, `sitemap.xml`, `index.html` JSON-LD ItemList. Count bumped 40 → 41.

### Verified working in preview

- Menu scene renders correctly.
- Design scene: level layout, spawn region indicator, exit highlight, marshal placement with influence radius, ALARM button, validation status.
- Sim scene: alarm flash, agent rendering with type/panic colors, marshal halos, fire/smoke overlays, HUD with timer/evac/injured/panic.
- Manual sim stepping confirms agents flow toward exits and pile up at chokepoints — the SFM jam behavior is real.
- Homepage card present in Strategy & Puzzles, "NEW" badge, custom icon, correct href and section.

### Known limitations (intentional v0.1 cuts)

- Marshal placement only. No barriers, no signs, no PA speakers, no door manipulation.
- One level.
- No audio.
- No tutorial.
- No debug overlay (`F1`–`F10` from spec §11) — defer until v0.2 when level authoring needs it.
- SFM repulsion magnitude tuned softer than spec (`SFM_A = 800` vs 2000) for browser perf headroom. Re-tune once we profile at target framerate.

### Known bugs

- **Hub-wide: canvas collapses to 0×0 in flex-wrapped game pages.** Phaser's scale manager injects inline `width: 100%; height: 100%` on the parent of the canvas. Without an explicit ancestor height, the canvas renders at 0×0. Confirmed broken on Bomberman and Asteroids in the same preview environment. Worked around in Exodus via `#game-container { aspect-ratio: 4/3; height: auto !important }`. **Worth a separate hub-wide fix pass** — same one-line CSS in every game page would resolve it.
- Background-tab RAF throttling pauses the sim aggressively in hidden tabs. Standard browser behavior; not a code bug, but means automated runtime testing in headless preview is unreliable. Manual sim stepping via `crowd.tick()` is the workaround for diagnostics.

---

## Next: v0.4 — feel + craft

Goals, in priority order:

1. **Audio**: alarm loop, ambient pre-alarm, panic swell layered by avg crowd panic, fire crackle, marshal whistle, UI clicks. Per `SPEC.md §8.2`. Most impact on perceived quality.
2. **Better art**: replace circles with simple sprites for agents, exits, marshals.
3. **Agent inspector** (debug F8): click-to-inspect side panel for any agent.
4. **Settings**: SFX/music sliders, colorblind mode, reduced motion.
5. **Multi-step tutorial**: replace the intro modal with progressive gated hints (see `SPEC.md §13`).
6. **More levels**: stadium concourse, subway platform, office tower.

Not for v0.4 (defer): sandbox, daily challenges, multi-deck levels, multiplayer.

---

## Open follow-ups (separate from EXODUS work)

- **Canvas-collapse fix for Bomberman / Asteroids and any other Phaser game** — single CSS rule (`aspect-ratio` + `height: auto !important` on `#game-container`).
- `chess-solver` not registered in `nav.js` `GAME_CATALOG` — exists on the homepage but isn't in the nav dropdown.

---

*Updated v0.1 / 2026-04-28*
