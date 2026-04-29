# EXODUS — Build Notes

Living document. Status, known issues, and next steps for the crowd-evacuation game. The authoritative spec is `SPEC.md`; this is the running journal.

---

## Current version: v0.1 (commit 9fadde7)

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

## Next: v0.2 — make it a real game

Goals, in priority order:

1. **More tools**: barriers (drag-place segments), signs (4 directions), PA speakers (room-polygon influence). Each consumes from a per-level budget.
2. **Second level**: nightclub or office floor — more agents, more constraints, panic-prone composition.
3. **Debug overlay**: per `SPEC.md §11`. Mostly unblocks level tuning, secondarily unblocks player curiosity.
4. **Tutorial**: scripted level 0, gated placement steps, captioned. Per `SPEC.md §13`.
5. **Audio**: alarm loop, ambient pre-alarm, panic swell layered by avg crowd panic, fire crackle, marshal whistle, UI clicks. Per `SPEC.md §8.2`.
6. **Better art**: replace circles with simple sprites for agents, exits, marshals.

Not for v0.2 (defer): sandbox, daily challenges, multi-deck levels, multiplayer.

---

## Open follow-ups (separate from EXODUS work)

- ~~**Canvas-collapse fix for Bomberman / Asteroids and any other Phaser game**~~ — done. Patched all 17 affected Phaser games (asteroids, beat-em-up, bomberman, centipede, dig-dug, frogger, galaga, hill-climb, joust, lunar-lander, missile-command, off-road, pac-man, qbert, simon, spacex-lander, tempest, tron — plus the original Exodus). Each `#game-container` now has `aspect-ratio` (derived from each game's Phaser config), `height: auto !important`, and `max-width: <W+4>px !important` to override Phaser's inline `height: 100%`. donkey-kong / defender use a different fullscreen template (`#phaser-container` direct on body with explicit body height) and were verified rendering correctly without the patch.
- `chess-solver` not registered in `nav.js` `GAME_CATALOG` — exists on the homepage but isn't in the nav dropdown.

---

*Updated v0.1 / 2026-04-28*
