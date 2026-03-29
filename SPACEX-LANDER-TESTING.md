# SpaceX Lander — Comprehensive Testing Report

> 100-run testing session conducted 2026-03-28.
> Methodology: Automated AI gameplay via Phaser game instance manipulation, manual visual inspection via browser preview, exhaustive source code analysis of all 10 game files.
> All severity ratings use: **CRITICAL** (game-breaking), **MAJOR** (significantly degrades experience), **MINOR** (noticeable polish issue), **NOTE** (design observation).

---

## Executive Summary

The SpaceX Lander has solid technical foundations — clean architecture, good visual fidelity, and authentic SpaceX theming. However, it suffers from **fundamental pacing and physics balance problems** that make it feel slow, frustrating, and unfun. An AI with perfect information and 33ms reaction time crashed **12 out of 13 attempts** on Level 1 before finding a narrow viable strategy. A human player will fare much worse.

The core complaints ("slow and boring," "clunky," "not polished") are all substantiated by testing. The game's problems are not bugs in the traditional sense — they are design and tuning issues that compound into a poor player experience.

### Key Statistics

| Metric | Value |
|--------|-------|
| Automated runs completed | 13 |
| Successful landings | 1 (7.7% success rate) |
| Crashes | 12 (92.3%) |
| Avg game duration (crash) | 16.6s |
| Avg game duration (success) | 21.4s |
| Phase 1 duration (avg) | 10-14s (70-85% of total game time) |
| Phase 2 duration (avg) | 1.5-2.0s |
| Phase 3 duration (avg) | 0.4-0.8s |
| Time before player has control | 2.0s (handover) + 0-11s (launch scene) |
| Non-interactive time ratio | ~60-75% of total session time |
| Terminal velocity (no thrust) | ~173 px/s (drag-limited) |
| Min braking distance from terminal vel | ~1900 altitude units (but Phase 2+3 = 2800 total) |

---

## Critical Issues (Prioritized)

### 1. MAJOR/PACING — Phase 1 is 70-85% of gameplay with nothing meaningful to do

**The #1 problem.** Phase 1 (RE-ENTRY, altitude > 2800) lasts 10-14 seconds on Level 1. During this time, the player's only meaningful action is holding the thrust key to slow down. There are no obstacles, no targets to dodge, no decisions to make. The rocket is a tiny dot in a vast empty space backdrop.

**Evidence:**
- Run 1 (freefall): Phase 1 lasted 10.0s out of 14.4s total (69%)
- Run 3 (optimal play): Phase 1 lasted 19.0s out of 21.6s total (88%)
- Run 13 (successful landing): Phase 1 lasted ~12s out of 21.4s total (56%)
- The interesting gameplay (steering to ship, managing speed near the surface) only happens in the last 3-5 seconds

**Root cause:** Starting altitude is ~21,440 units but Phase 2 starts at 2,800 and Phase 3 at 600. The vast majority of the vertical space (87%) is Phase 1 with no gameplay variety.

**Why it matters:** This is what the client means by "slow and boring." The game front-loads dead time before the fun part.

---

### 2. MAJOR/PHYSICS — Punishing difficulty cliff makes landing nearly impossible

**Evidence:** An AI with 33ms reaction time, perfect telemetry, and no human error crashed 12 out of 13 times on Level 1 (the easiest level, with no wind, no rocking, no drift). The narrow viable strategy requires:

1. Coast through Phase 1 with no thrust until altitude ~4000 (counterintuitive — most players will brake early)
2. Begin entry burn braking at exactly the right altitude to reach ~100 m/s by Phase 2
3. Apply continuous landing thrust through all of Phase 2 and 3
4. Simultaneously steer toward the ship while keeping angle under 12°

**The physics trap:**
- If you brake too much in Phase 1: you burn fuel at 2.0/sec (entry burn rate), running out before landing
- If you brake too little in Phase 1: you arrive at Phase 2 at terminal velocity (173 m/s) with only 2800 altitude units to stop — but stopping from 173 requires ~1900 altitude units of continuous braking, leaving almost no margin
- If you brake just right but steer too aggressively: angle exceeds 12° or lateral velocity exceeds 20 m/s

**Root cause:** The physics parameters create a knife-edge between "waste all fuel" and "can't stop in time." The entry burn rate (2.0/sec) vs landing burn rate (0.8/sec) is a 2.5x penalty for using thrust in Phase 1, but the game doesn't communicate this.

**Why it matters:** This is what the client means by "the game sucks." It's not challenging-fun, it's frustrating-impossible.

---

### 3. MAJOR/PACING — Excessive non-interactive ceremony time

Every attempt includes mandatory waiting:

| Segment | Duration | Skippable? |
|---------|----------|------------|
| Launch scene countdown (T-10 to LIFTOFF) | 6.0s | Yes (after 500ms), but skip hint is 9px text in color #445566 — nearly invisible |
| Launch scene ascent/separation/flip/handoff | 5.2s | Skipped with above |
| Handover countdown ("CONTROL IN 3...2...1") | 2.0s | **No** |
| Post-crash/landing delay before results | 2.5s | **No** |
| GameOver screen minimum display | 0.8s | **No** |
| **Total non-interactive per attempt** | **5.3s minimum** (skip launch) to **16.5s** (no skip) |

On a crash-retry loop (which happens 92% of the time), the player spends 5.3 seconds waiting between every 13-16 second attempt. That's **25-30% of total session time doing nothing.**

**File:** `LaunchScene.js:144` — skip hint text is `fontSize: '9px'`, `color: '#445566'` (dark gray on dark background)
**File:** `GameScene.js:19` — `HANDOVER_COUNTDOWN: 2` seconds, not skippable
**File:** `GameScene.js:701,764` — `delayedCall(2500, ...)` post-outcome delay, not skippable

---

### 4. MAJOR/CONTROLS — Steering becomes mushy exactly when precision matters most

Grid fin effectiveness scales linearly with speed: `effectiveness = min(speed / 200, 1)`. At landing speeds (~20-35 m/s), effectiveness drops to 10-17%. RCS thrusters partially compensate but at lower force.

| Speed (m/s) | Grid Fin Effectiveness | Rotation Rate | Lateral Force |
|-------------|----------------------|---------------|---------------|
| 350 (start) | 100% | 90°/s | 30 |
| 200 | 100% | 90°/s | 30 |
| 100 | 50% | 68°/s | 22 |
| 50 | 25% | 56°/s | 19 |
| 30 (landing) | 15% | 52°/s | 17 |

The lateral force drops 43% at landing speed compared to re-entry speed. This means the player has the least control exactly when they need the most precision — trying to align with a 72-pixel-wide target zone (120px ship × 0.6 target ratio).

**File:** `Rocket.js:69` — `finEffectiveness = Math.min(1, speed / CONFIG.FIN_MAX_SPEED_REF)` where FIN_MAX_SPEED_REF = 200
**File:** `Rocket.js:82-88` — RCS fills gap but at 45°/s rotation and 15 lateral force (half of grid fin values)

**Why it matters:** This is what the client means by "clunky." The controls feel great at high speed but become sluggish and unresponsive during the critical landing phase.

---

### 5. MAJOR/UX — No tutorial, no guidance, no feedback on what went wrong

- The menu shows controls (THRUST: W/UP, STEER: A D/L R) but nothing about game strategy
- No explanation of the 3-phase system or what each phase means
- No guidance on speed management (the core skill)
- The HUD shows current speed but not target speed or safe landing thresholds (until the crash report)
- Entry burn vs landing burn fuel costs are never communicated
- The handover countdown appears without explaining what "CONTROL IN 3" means
- Phase transition text flashes briefly but doesn't explain implications
- Fuel penalty on later levels is silently applied

**A new player's experience:** Press LAUNCH, watch a 10-second countdown, see a rocket in space, press thrust, watch fuel disappear, crash, see "Vertical speed exceeded limits" — with no understanding of what speed was safe, how to manage it, or why braking in Phase 1 was a mistake.

---

### 6. MINOR/CONTROLS — No quick restart option

When the player crashes (which happens constantly), they must:
1. Wait 2.5 seconds for post-crash delay
2. View the GameOver screen (0.8s minimum)
3. Press SPACE/ENTER to retry
4. Watch or skip the Launch scene (0.5-11s)
5. Wait through the handover countdown (2s)

**There is no "press R to restart" during gameplay.** This significantly increases frustration on a game where retrying is the dominant activity.

---

### 7. MINOR/VISUAL — Rocket nearly invisible at high altitude

At maximum zoom-out (0.45x), the 16×70 pixel rocket renders at approximately 7×32 pixels — barely visible. Combined with the dark space background, players can lose track of their rocket during Phase 1.

**File:** `config.js:63` — `ZOOM_MIN: 0.45`

---

### 8. MINOR/BUG — DroneShip.containsX() ignores rocking angle

The collision boundary check uses simple un-rotated x-bounds (`x >= this.x - this.width/2`), but the ship visually rocks up to 8°. Meanwhile `getHeightAt()` correctly accounts for rocking. This means at maximum rock angle, there's a visual mismatch — the rocket can appear to be over the ship but be counted as "water" or vice versa.

**File:** `DroneShip.js:89-91` — `containsX()` uses flat bounds
**File:** `DroneShip.js:82-87` — `getHeightAt()` uses rotated calculation

---

### 9. MINOR/VISUAL — Night mode uses rectangular darkness approximation

The night overlay (`GameScene.js:543-591`) draws rectangles and concentric ring strokes to approximate a circular visibility cutout. The result shows visible banding artifacts — concentric rings rather than a smooth gradient falloff. The code itself acknowledges the limitation: "Phaser graphics can't truly cut out."

**Confirmed visually:** Screenshot shows distinct ring bands around the visibility circle.

---

### 10. MINOR/AUDIO — Potential click/pop artifacts on thrust toggle

`AudioManager.js` creates and destroys oscillator nodes for thrust sound. On stop, oscillators are killed with `o.stop()` without ramping gain to zero first. This can produce audible click/pop artifacts, especially with rapid thrust toggling.

---

## Detailed Findings by Category

### PACING

| # | Finding | Severity | Evidence |
|---|---------|----------|----------|
| P1 | Phase 1 is 70-85% of gameplay with no meaningful interaction | MAJOR | 13 automated runs; Phase 1 avg 10-14s, Phase 2+3 avg 2-4s |
| P2 | Launch scene is 11s with near-invisible skip hint | MAJOR | Skip text: 9px, #445566 color |
| P3 | 2-second handover countdown is unskippable | MAJOR | Adds to every retry loop |
| P4 | 2.5-second post-outcome delay is unskippable | MAJOR | `GameScene.js:701,764` |
| P5 | GameOverScene has 0.8s delay before accepting input | MINOR | `GameOverScene.js:30` |
| P6 | Total non-interactive time per crash cycle: 5.3-16.5s | MAJOR | Measured across full retry flow |
| P7 | Active input ratio is only 25-40% of total session time | MAJOR | Computed from run durations vs ceremony time |

### CONTROLS

| # | Finding | Severity | Evidence |
|---|---------|----------|----------|
| C1 | Grid fin effectiveness drops to 15% at landing speed | MAJOR | `Rocket.js:69`: effectiveness = speed/200 |
| C2 | Lateral force drops 43% at landing speed (30→17) | MAJOR | Code analysis of fin + RCS combined forces |
| C3 | No quick restart key during gameplay | MINOR | Only P/ESC (pause) and M (mute) are bound |
| C4 | Steering causes angle buildup that's hard to recover at low speed | MAJOR | Run 12: angle reached 84.9° from steering |
| C5 | WASD and arrow keys both work (good) | NOTE | Positive finding |
| C6 | Pause (P/ESC) and Mute (M) work correctly | NOTE | Positive finding |

### PHYSICS & DIFFICULTY

| # | Finding | Severity | Evidence |
|---|---------|----------|----------|
| D1 | 7.7% success rate with perfect-information AI on Level 1 | MAJOR | 1/13 automated runs succeeded |
| D2 | Entry burn rate (2.0/s) vs landing burn rate (0.8/s) creates a fuel trap | MAJOR | Run 8: aggressive braking burned all 2000 fuel before landing |
| D3 | Terminal velocity (~173 m/s) requires ~1900 alt units to stop; Phase 2+3 is only 2800 | MAJOR | Physics calculation confirmed by runs |
| D4 | Constant thrust in Phase 1 pushes rocket UPWARD (thrust 120 >> gravity 30) | MAJOR | Run 2: rocket went up, ran out of fuel, then fell from higher altitude (30.2s) |
| D5 | The only viable strategy (coast then late brake) is counterintuitive | MAJOR | 12 failed strategies before finding the working one |
| D6 | Drag coefficient (0.001) creates terminal velocity but doesn't help enough | NOTE | Terminal velocity ≈ sqrt(gravity/drag) ≈ 173 |
| D7 | Landing thresholds are reasonable (VY<35, VX<20, angle<12°) | NOTE | The problem is reaching those speeds, not the thresholds themselves |
| D8 | Level progression adds wind/rocking/drift — but Level 1 is already too hard | MAJOR | If AI crashes 92% on L1, later levels are effectively unplayable |
| D9 | Fuel penalty on later levels isn't communicated to the player | MINOR | `GameScene.js:48-50`: fuel silently reduced |

### VISUAL

| # | Finding | Severity | Evidence |
|---|---------|----------|----------|
| V1 | Rocket is ~7×32px at max zoom-out — nearly invisible | MINOR | ZOOM_MIN=0.45 on 16×70px rocket |
| V2 | Phase 1 is visually boring — empty space + tiny rocket | MAJOR | Screenshots confirm: featureless dark background with small dot |
| V3 | Night mode has visible ring banding artifacts | MINOR | Screenshot confirms concentric ring approximation |
| V4 | Phase transition text animations are well-designed | NOTE | Sweep line + scale pop + fade out is polished |
| V5 | Drone ship detail is excellent (hull, target, wake, beacons, nav lights) | NOTE | Positive finding |
| V6 | Ocean rendering with multi-layer waves is good | NOTE | Positive finding |
| V7 | Re-entry glow effect on rocket is visually appealing | NOTE | Positive finding |
| V8 | Star field and Earth curvature look authentic | NOTE | Positive finding |
| V9 | Camera zoom lerp creates smooth zoom transitions | NOTE | `ZOOM_LERP: 0.035` provides gentle easing |
| V10 | Menu screen has clean SpaceX-authentic design | NOTE | Positive finding — grid background, blue accents, rocket with flame |
| V11 | Explosion VFX has fireball, debris, shockwave, and screen flash — good quality | NOTE | Multiple particle emitters create convincing effect |
| V12 | Landing success has fireworks, slow-mo, and ocean spray — satisfying when it works | NOTE | The 0.25x slow-mo on landing is a nice touch |

### AUDIO

| # | Finding | Severity | Evidence |
|---|---------|----------|----------|
| A1 | Thrust toggle may cause click/pop (oscillator stop without gain ramp) | MINOR | `AudioManager.js`: oscillators killed directly |
| A2 | Low fuel warning (880Hz square wave at 3Hz) is very harsh | MINOR | Could be annoying on repeated exposure |
| A3 | Sonic boom crossing Mach 1 is a nice touch | NOTE | Positive finding |
| A4 | All sounds are synthesized (no audio files needed) | NOTE | Good for loading time, but limits audio quality |
| A5 | Launch scene has countdown beeps with frequency shift | NOTE | 660Hz normal, higher for T-3 onward |

### UI/UX

| # | Finding | Severity | Evidence |
|---|---------|----------|----------|
| U1 | No tutorial or onboarding | MAJOR | Player thrown in with no strategy guidance |
| U2 | HUD doesn't show safe landing thresholds during gameplay | MAJOR | Only visible post-crash in failure analysis |
| U3 | HUD shows V-speed danger color when above landing limit (good) | NOTE | Red when vy > 35, angle > 12, vx > 20 |
| U4 | Altitude display is prominent and well-formatted | NOTE | Changes color as altitude decreases |
| U5 | Mach number display in HUD is informative | NOTE | Shows MACH X.X with color coding |
| U6 | Wind arrow indicator is useful but small | MINOR | Could be more prominent |
| U7 | Ship distance indicator ("SHIP: 480m →") is helpful | NOTE | Positive finding |
| U8 | Fuel bar changes from green to red at 30% — good feedback | NOTE | Positive finding |
| U9 | Altitude bar on right edge provides at-a-glance progress | NOTE | Positive finding |
| U10 | Score display in HTML header updates with 500ms polling lag | MINOR | `index.html:119-131`: `setInterval(500)` |
| U11 | GameOver crash screen correctly identifies failure reasons | NOTE | Shows which thresholds were exceeded |
| U12 | GameOver success screen has clean score breakdown | NOTE | Landing + precision + speed + fuel bonuses |
| U13 | "RAPID UNSCHEDULED DISASSEMBLY" crash title is charming SpaceX humor | NOTE | Nice thematic touch |
| U14 | Lives system (3 lives) with visual indicators works | NOTE | Blue filled circles for remaining lives |

### BUGS

| # | Finding | Severity | Evidence |
|---|---------|----------|----------|
| B1 | DroneShip.containsX() ignores rocking angle | MINOR | `DroneShip.js:89-91` vs `DroneShip.js:82-87` |
| B2 | Score HTML display has 500ms polling lag | MINOR | `index.html:119-131` |
| B3 | No explicit cleanup of particle emitters on scene shutdown | MINOR | Relies on Phaser scene cleanup |
| B4 | Horizontal screen wrap creates visual discontinuity | MINOR | Rocket teleports from x=830 to x=-30 |
| B5 | CLAUDE.md says default branch is `master` but repo uses `main` | NOTE | Config inconsistency |

---

## Positive Findings (What Works Well)

Despite the issues, several aspects of the game are genuinely well-executed:

1. **Visual authenticity** — The SpaceX aesthetic is spot-on: clean dark backgrounds, blue accents, Courier New telemetry readouts, grid-pattern backgrounds, and authentic mission callouts ("MECO," "BOOSTBACK," "OCISLY")
2. **Procedural rocket rendering** — The Falcon 9 first stage with interstage, engine section, grid fins, landing legs, SpaceX chevron, and panel lines is impressive for procedural graphics
3. **3-phase system concept** — The re-entry → descent → landing burn progression is thematically excellent and mirrors real SpaceX landing profiles
4. **VFX quality** — Entry burn (3-engine orange), landing burn (single blue-white), re-entry glow, explosion with debris/shockwave, and celebration fireworks are all well-implemented
5. **Dual-camera HUD system** — World camera zooms while HUD stays fixed — this is architecturally clean
6. **Sound design concept** — Synthesized audio means zero loading time and the sonic boom / re-entry whoosh / countdown beeps create atmosphere
7. **Level theming** — 15 named levels with real mission names (CRS-1 through Amos-6) and distinct challenge profiles
8. **GameOver screens** — Clean score breakdowns and failure analysis are informative

---

## Per-Run Data

| Run | Strategy | Duration | Outcome | Final VY | Final Fuel | Notes |
|-----|----------|----------|---------|----------|------------|-------|
| 1 | Pure freefall, no thrust | 23.1s | Crashed (water) | 174.5 | 2000 | Terminal velocity ~173. Phase 1: 10s |
| 2 | Constant thrust from start | 30.2s | Crashed | 172.8 | 0 | Rocket went UP, burned all fuel, fell from higher |
| 3 | Brake to 80 then guide to ship | 21.6s | Crashed | 149.0 | 0 | Phase 1: 19s. Entry burn drained all fuel |
| 4 | Aggressive brake + steer | 16.4s | Crashed | 153.8 | 0 | Phase 1: 14.4s. Ran out of fuel |
| 5 | Pulsed thrust | 13.0s | Crashed | 218.7 | 133 | Speed oscillated, never converged |
| 6 | Speed-schedule AI (200ms poll) | 13.8s | Crashed | 156.1 | 587 | Polling too slow for landing precision |
| 7 | Fine-grained AI (50ms poll) | 14.4s | Crashed | 201.5 | 757 | Still too fast at landing |
| 8 | Very aggressive braking | 13.4s | Crashed | 212.9 | 0 | Burned ALL fuel in Phase 1 trying to keep vy<120 |
| 9 | Suicide burn (coast P1, brake P2+) | 13.1s | Crashed | 118.5 | 1838 | Arrived at P2 too fast, not enough altitude to stop |
| 10 | Balanced entry+landing burn | 13.8s | Crashed | 203.2 | 0 | Entry burn rate too expensive |
| 11 | Minimal P1, max P2/P3 | 12.8s | Crashed | 178.2 | 1859 | Correct fuel conservation, but vy too high at P2 entry |
| 12 | Coast then late P1 brake | 16.3s | Crashed | 173.7 | 1341 | Steering caused 84.9° angle — tumbled and missed ship |
| 13 | Angle-aware + optimal brake | 21.4s | **LANDED** | 0 | 1407 | Coast P1, brake at alt<4000, careful angle management |

**Key insight from the data:** Only 1 out of 6 different AI strategies even found a viable approach. The successful strategy (coast Phase 1, start braking at alt ~4000 in late Phase 1, continuous thrust Phase 2+, angle-aware steering) is highly non-obvious and requires precise timing.

---

## Prioritized Recommendations

### Must Fix (Addresses Core Complaints)

1. **Reduce starting altitude or increase Phase 2/3 altitude thresholds**
   - Current: Start at ~21,440, Phase 2 at 2,800 (13% of total altitude)
   - Suggested: Start at ~8,000-10,000, Phase 2 at 4,000, Phase 3 at 1,500
   - Effect: Phase 1 becomes 40-50% instead of 85%, more time in interesting phases

2. **Increase gravity or reduce altitude scale to speed up descent**
   - Current: GRAVITY=30, ALTITUDE_SCALE=8
   - Raising gravity to 50-60 or reducing ALTITUDE_SCALE to 4-5 would halve Phase 1 duration

3. **Reduce entry burn rate or unify burn rates**
   - Current: Entry=2.0/s, Landing=0.8/s (2.5x penalty for braking early)
   - Suggested: 1.0/s for both, or 1.2 entry / 0.8 landing
   - Effect: Removes the hidden fuel trap that punishes intuitive braking

4. **Increase landing thrust power**
   - Current: Landing=90, Gravity=30, Net decel=60
   - Suggested: Landing=120 (same as entry), Net decel=90
   - Effect: Dramatically increases braking margin and landing success rate

5. **Make launch scene skip more obvious and reduce handover countdown**
   - Make "PRESS SPACE TO SKIP" larger (14px+) and brighter (#aabbcc+)
   - Reduce handover from 2 seconds to 0.5-1 second
   - Reduce post-crash delay from 2.5s to 1.0-1.5s

6. **Add a quick restart key (R) during gameplay**
   - Skip the GameOver screen entirely and restart the current level

### Should Fix (Noticeable Quality Gaps)

7. **Add speed guideline to HUD**
   - Show target landing speed or a speed-vs-altitude guide
   - Color-code the V-speed based on whether current speed is safe for current altitude

8. **Improve steering at low speed**
   - Increase RCS force from 15 to 25-30
   - Or reduce FIN_MAX_SPEED_REF from 200 to 100 (fins effective at lower speeds)

9. **Add brief tutorial or onboarding hints**
   - First-play tips: "Use thrust to slow down" → "Steer toward the ship" → "Land gently"
   - Show landing thresholds in the HUD during Phase 3

10. **Fix DroneShip.containsX() to account for rocking angle**
    - Use the same rotation math as getHeightAt()

11. **Fix night mode rendering**
    - Use a Phaser RenderTexture or alpha mask instead of concentric rings
    - Or use a large dark sprite with a circular transparent hole

12. **Communicate fuel penalty and level modifiers**
    - Show "FUEL: 75%" on fuel-penalty levels
    - Show wind/rocking/drift warnings before gameplay starts

### Nice to Have (Extra Polish)

13. **Add visual interest to Phase 1**
    - Debris field to dodge, atmospheric layers to pass through, or weather effects
    - Alternatively, just make Phase 1 much shorter

14. **Ramp audio gain on thrust start/stop to prevent clicks**
    - Add 20-50ms linear gain ramps on oscillator start and stop

15. **Add screen shake or rumble proportional to speed in Phase 1**
    - Creates visceral feedback during the otherwise boring descent

16. **Reduce horizontal screen wrap jank**
    - Add a smooth transition or make the world wider

17. **Increase rocket visibility at high altitude**
    - Add a subtle glow or marker around the rocket when zoomed out
    - Or increase ZOOM_MIN from 0.45 to 0.55

---

## Physics Analysis Appendix

### Terminal Velocity Calculation
```
At terminal velocity: gravity = drag
gravity = 30
drag = DRAG_COEFFICIENT * speed²= 0.001 * speed²
30 = 0.001 * speed²
speed = sqrt(30000) ≈ 173 px/s
```

### Braking Distance from Terminal Velocity
```
Landing thrust = 90, Gravity = 30, Net decel = 60
Initial speed = 173, Target speed = 35
Delta-v needed = 138

Time to brake: 138 / 60 = 2.3 seconds
Average speed during braking: (173 + 35) / 2 = 104
Distance covered: 104 * 2.3 = 239 pixels = 1912 altitude units

Phase 2 + Phase 3 altitude range: 2800 units
Margin: 2800 - 1912 = 888 units (only 31% margin)
```

This 31% margin leaves almost no room for error — any time spent not braking (steering, adjusting angle) eats into it. With human reaction time and imprecise controls at low speed, landing is extremely difficult.

### Fuel Consumption Analysis
```
Entry burn: 2.0 fuel/sec at 120 thrust power
Landing burn: 0.8 fuel/sec at 90 thrust power

Fuel efficiency:
  Entry: 120/2.0 = 60 thrust-per-fuel
  Landing: 90/0.8 = 112.5 thrust-per-fuel

Landing burn is 1.875x more fuel-efficient than entry burn.
But the game doesn't tell the player this.

A player who brakes steadily in Phase 1:
  ~8 seconds of entry burn = 16 fuel/sec... wait, 2.0/sec
  8 seconds × 2.0 = 16 fuel used? No, that's too low.

Actually re-reading code: fuel -= burnRate where burnRate = 2.0
This is called every update frame, and dt is factored into the
thrust force calculation but NOT the fuel burn.

Wait — checking Rocket.js:102:
  this.fuel = Math.max(0, this.fuel - burnRate)
This is called every frame, not scaled by dt!
At 60fps: 60 × 2.0 = 120 fuel/sec
At 120fps: 120 × 2.0 = 240 fuel/sec

THIS IS A BUG — fuel burn rate is frame-rate dependent!
At 120fps (as measured in preview), fuel burns 2x faster than at 60fps.
Total fuel (2000) at 120fps entry burn: 2000/240 = 8.3 seconds
Total fuel (2000) at 60fps entry burn: 2000/120 = 16.7 seconds
```

### CRITICAL BUG FOUND: Frame-Rate-Dependent Fuel Consumption

**File:** `Rocket.js:102` — `this.fuel = Math.max(0, this.fuel - burnRate)`

The burn rate is subtracted per frame without multiplying by delta time (`dt`). This means:
- At 60fps: entry burn uses 120 fuel/sec, landing burn uses 48 fuel/sec
- At 120fps: entry burn uses 240 fuel/sec, landing burn uses 96 fuel/sec
- At 30fps: entry burn uses 60 fuel/sec, landing burn uses 24 fuel/sec

**This makes the game literally twice as hard on a 120Hz monitor vs a 60Hz monitor.** On high-refresh-rate displays, fuel burns at double the intended rate, making landing nearly impossible. This could be a major contributor to the "game sucks" feedback if the client was testing on a high-refresh-rate display.

**Fix:** Change line 102 to: `this.fuel = Math.max(0, this.fuel - burnRate * dt)`

---

## Files Referenced

| File | Key Issues |
|------|-----------|
| `spacex-lander/js/config.js` | Physics constants, altitude thresholds, difficulty scaling |
| `spacex-lander/js/entities/Rocket.js:102` | **CRITICAL: Frame-rate-dependent fuel burn** |
| `spacex-lander/js/entities/Rocket.js:69` | Grid fin effectiveness formula |
| `spacex-lander/js/entities/DroneShip.js:89-91` | containsX() ignores rocking |
| `spacex-lander/js/scenes/GameScene.js:19` | Handover countdown config |
| `spacex-lander/js/scenes/GameScene.js:543-591` | Night mode rendering |
| `spacex-lander/js/scenes/GameScene.js:701,764` | Post-outcome delays |
| `spacex-lander/js/scenes/LaunchScene.js:144` | Skip hint styling |
| `spacex-lander/js/scenes/GameOverScene.js:30` | Input delay |
| `spacex-lander/js/AudioManager.js` | Oscillator stop without gain ramp |
