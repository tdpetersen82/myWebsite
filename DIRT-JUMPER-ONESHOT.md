# Dirt Jumper — Phased Build Plan

> A side-scrolling **downhill pump-track + dirt-jump** game for limestonegames.com (Arcade).
> **Phased to de-risk feel before depth.** Phase 1 is a minimal vertical slice whose only job is
> to answer one question: **is pumping the track + jumping + landing actually fun?** If yes, Phase 2
> adds tricks, vehicle choice, and upgrades. If no, we learned it cheap.
>
> Each phase below is a self-contained paste-in prompt for a fresh Claude Code session at the repo
> root (`/Users/trevor/Source/myWebsite`). Build Phase 1, play it, decide, then run Phase 2.

---

## The viability gate (read first)

The single uncertain thing in this whole concept is **whether pumping feels good** — whether timing
a push into a roller's backside to surge forward is satisfying, and whether the pump → pop → land →
pump-out loop has flow. Everything risky lives there. So:

- **Phase 1 builds only what's needed to feel that loop.** One generic vehicle, basic air control to
  set your landing angle, off-angle = crash. **No tricks, no scoring tricks, no vehicle select, no
  upgrades, no Garage, no currency, no SEO/site registration.** Placeholder-simple art is fine.
- **Phase 1 is NOT added to the live site.** Playtest it via the preview / by opening
  `dirt-jumper/` directly. We don't ship a homepage tile for an unproven game (`feedback_quality_bar.md`).
- **Decision gate at the end of Phase 1:** *Does pumping feel rewarding, and is the jump/land loop
  fun?* Only on "yes" do we run Phase 2 (which includes graduating it onto the live site).
- **Two cheap forward-compat hooks in Phase 1** so Phase 2 is additive, not a rewrite:
  1. `Bike.js` reads all its tunables from a single `stats` object (one hardcoded vehicle for now) —
     Phase 2's vehicles/upgrades just swap what fills `stats`.
  2. Terrain feature generators are **parametric** (amplitude/length/gap as args) — Phase 2 scales
     and adds features without touching the core.

---

# PHASE 1 — Minimal viability slice

> **Goal:** a playable downhill ride that proves the pump + jump + land loop is fun. Nothing else.
> Build it, verify the feel, report back. Do **not** register it on the site.

## 1.1 Scope

**IN:**
- One generic bike. No select screen. A bare "tap to drop in" start, instant restart.
- Endless downhill terrain: **rollers, whoops, one tabletop, one gap** — streamed ahead, culled
  behind, net downhill, gentle difficulty creep.
- Physics: roll, **pump (the thing being tested)**, takeoff/detachment, a basic pop, projectile air,
  **air rotation to set landing angle**, and **landing grade where off-angle = crash**.
- Loop: endless; **score = distance + pump flow**; best saved to `localStorage` (`dirtJumperBest`,
  plain int); restart in <1s.
- Just-enough juice to *read* the mechanic: wheel **dust**, a **pump squash/compress** on the bike,
  **screen shake** on hard landing/crash, a sense of speed, a minimal HUD (Speed / Score / Best).
- Minimal SFX (pump whoomp + landing thud) — sound materially helps you feel pump timing; keep it tiny.
- Auto-scale to viewport (`Phaser.Scale.FIT` + `CENTER_BOTH`) — required.

**OUT (Phase 2):** named tricks, trick scoring/combos/poses, Bike vs Scooter, upgrades/parts/Garage/
currency, full parallax + polished art, full audio, and all site registration/SEO.

## 1.2 Tech & files (lean)

- **Phaser 3.80.1 via CDN.** Custom kinematic physics — **NOT Matter.js**. Design res **960×540 (16:9)**.
- Page's top-level `const game` reachable as a bare global (for the eval verification in 1.8).
```
dirt-jumper/
  index.html                 # minimal Phaser page, #game-container aspect-ratio:16/9, Scale.FIT
  js/
    config.js                # ALL tunables incl. the single-vehicle `stats` object + parametric feature params
    Terrain.js               # heightfield: gen (rollers/whoops/tabletop/gap), heightAt/slopeAt/curvatureAt, draw
    Bike.js                  # physics: roll, pump, takeoff, pop, air, rotation, landing grade — reads `this.stats`
    Particle.js              # dust + dirt-spray
    RideScene.js             # the run: tick, HUD, grade, score, restart, minimal SFX (or fold tiny audio here)
```
For Phase 1, `index.html` can skip the full SEO head — just title, viewport, the Phaser CDN, the
container `<style>`, and the local `<script>` tags. (Full SEO shell is Phase 2.)

## 1.3 Physics (the heart — spend your time here)

All in px/seconds, using Phaser's clamped `delta`. **Bike reads `this.stats.*`, never raw constants.**

- **Terrain `T(x)`** — continuous **C¹** heightfield, fast `heightAt / slopeAt / curvatureAt`. Streamed
  parametric segments stitched at matching height+slope: rollers (sine humps), whoops (tight rollers),
  one tabletop (lip→flat→downramp, forgiving), one gap (lip→void→landing ramp, punishing). Net downhill.
- **Grounded roll** — snap `y=heightAt(x)`, ease `angle` toward `slopeAt(x)`. Tangential speed is the
  state: `a = GRAVITY*sin(slope)` minus `stats.rollDrag` (small const + ~v² term → terminal speed).
- **PUMP (signature, the whole point of Phase 1)** — hold **↓ / S**. During a roller's **down-phase**
  (crest→trough), pumping does positive work:
  `speed += stats.kPump * downhillSteepness * dt * speedFactor` (speedFactor damps near top speed).
  Pumping the **up-phase** pays nothing and bleeds a little. The bike visibly **compresses** on pump /
  **extends** on release; a `whoomp` + a small "+SPD" tick on a well-timed pump. Whoops nailed = a clear,
  satisfying surge. **A simple Flow value** (consecutive good pumps + clean landings) lightly multiplies
  score and nudges top speed; resets on a crash. (Keep Flow minimal here — it's the feel hook, not yet a system.)
- **Takeoff** — detach at a convex lip when the one-step ballistic `y` clears `heightAt(x_next)`; launch
  with current `(vx, vy)`.
- **Pop** — hold pump on approach, release near the lip apex: `vy -= stats.kPop * preloadCharge * timingQuality`.
  Keep it simple but present (it's part of the feel).
- **Air + rotation** — projectile (`vy += GRAVITY*dt`, vx ~constant). **← / → rotate the bike** so the
  player can set the landing angle. (In Phase 1 rotation is *only* for matching the landing — no flips
  scored.)
- **Landing — off-angle = crash:** compare bike angle vs landing slope. `PERFECT ≤8°` (keep all speed),
  `CLEAN ≤22°` (tiny scrub), `SKETCHY ≤40°` (big scrub + wobble), else **BAIL → run ends**. Casing onto a
  flat top / into a jump face = heavy scrub, bail if fast. Stomping a PERFECT and pumping straight out of
  it is the high-skill flow loop — make it feel good. (Thresholds live in `stats.landTolerance` so Phase 2
  wheel upgrades can widen them.)

## 1.4 Loop, controls, persistence

- **Loop:** drop in → ride → bail → compact inline summary (distance, score, best) → restart on **R / Space /
  tap** in <1s.
- **Score** = distance + pump flow; **best** persists as `dirtJumperBest` (plain int).
- **Controls:** hold **↓/S** pump (release to pop); **←/→** rotate; **R/Space** start/restart; **P** pause.
  Keyboard is required; a minimal hold-capable touch PUMP pad + ◀▶ is nice-to-have but can slip to Phase 2.

## 1.5 Juice (only what makes the mechanic legible)

Wheel **dust** (∝ speed) · bike **squash on pump** / stretch on release · **dust burst + thud** on landing ·
**screen shake** ∝ landing hardness · faint speed lines at top speed · minimal corner HUD. Placeholder
shapes are fine as long as lips/gaps/landings are readable and the compression reads clearly. **No
parallax background, no polished art yet.**

## 1.6 Tuning starting points (in `config.js`)

GRAVITY ~1500 · bike ~60px · cruise 350–500, top ~1050 · `kPump` so a well-pumped roller adds ~5–10% speed
and a whoops section nailed is a clear surge · `kPop` so a good pop adds up to ~350 px/s vy · rotation
~514°/s · `landTolerance {perfect:8, clean:22, sketchy:40}` · gentle distance-based ramp. Dial these by
feel via the sim in 1.8.

## 1.7 NOT in Phase 1 (do not build)

Tricks/trick-scoring/combos/poses · Bike vs Scooter · upgrades/parts/Garage/currency/`resolveStats` ·
parallax + finished art · full AudioManager · `games-catalog.js` / arcade card / hub.js / JSON-LD /
sitemap / `?v=` site-wide bumps. (All Phase 2.) Playtest by opening `dirt-jumper/` in the preview.

## 1.8 Verification — MANDATORY, this is on the AI agent

**Read this as a hard requirement, not a suggestion. The whole point of Phase 1 is to judge feel — and
you cannot judge feel through wonky physics. Shipping a slice with floaty/janky gravity, drifty or
unresponsive controls, terrain tunneling, or false crashes makes the viability read worthless and wastes
the run. Do NOT hand back "looks fine." One-shot it: test the physics extensively until it is provably
solid, fix what you find, and only then report.** (`feedback_verify_dont_fake.md`, `feedback_quality_bar.md`.)

You own this. The deliverable is not "code that loads" — it is **physics you have verified behaves
correctly across the cases below**, with the evidence in your report.

### Why you must test programmatically (not by eyeballing the preview)
Per `memory/reference_phaser_preview_testing.md`, the Claude preview **RAF-throttles** when not actively
painting: `delta` balloons, physics steps coarsely and irregularly, and you'll see **false crashes and
fake jank** that a real focused 60fps tab never hits. So **eyeballing the live preview is not valid
verification.** Prove the physics with a **deterministic hand-stepped sim**: `scene.scene.pause()`, then in
`preview_eval` loop `bike.update(16, …)` yourself at a **fixed 16ms dt** over known terrain and read exact
state. That is RAF-independent and matches a real 60fps tab. Tune constants live via eval, then bake them
into `config.js` and bump the `?v=`.

### Required test matrix — assert every one of these in the hand-stepped sim
**Gravity & integration sanity (no "wonky gravity"):**
- A bike dropped in free air falls with the expected parabola: `vy` increases ~`GRAVITY*dt` per step; drop
  distance ≈ ½·g·t² within tolerance. No drift, no runaway, no NaN/Infinity ever (assert `isFinite` on x,
  y, vx, vy, angle every step of a long run).
- **Frame-rate independence:** running N steps at dt=16ms and 2N steps at dt=8ms over the same terrain lands
  the bike in nearly the same place (integration is dt-stable, and `delta` is clamped so a lag spike can't
  fling the bike). If they diverge badly, the integrator is wrong — fix it.
- On flat ground the bike neither sinks into nor floats above terrain; on a slope it accelerates downhill
  and decelerates uphill by the gravity-along-slope component, and coasts to a sane slope-dependent terminal
  speed (drag works).

**Controls (no "wonky controls"):**
- Pump input responds the **same frame** it's pressed/released (no lag, no stuck-on state after release).
- Air rotation rate matches `stats.flipRate` and is symmetric for ← vs →; releasing stops accumulating
  rotation; the bike doesn't spin on its own when no key is held.
- No input does something absurd (e.g., pumping mid-air shouldn't add ground speed; rotating on the ground
  shouldn't launch you).

**Pump mechanic (the thing being judged):**
- Down-phase (crest→trough) pumping **measurably gains speed**; up-phase pumping does **not** and bleeds a
  little — the two are clearly distinguishable in numbers, not noise.
- A whoops section pumped in rhythm yields a clear net speed gain vs coasting it; mistimed yields ≤ coasting.

**Jumps, air & landing (no false crashes, no terrain tunneling):**
- A lip **launches** the bike with continuous velocity (no teleport/pop-through); a well-timed pop adds the
  expected `vy`, an early release adds less, holding through adds none.
- The airborne→ground transition is detected **every** frame even at high speed — at top speed across one
  16ms step the bike must not skip over a thin lip or punch through the landing (do continuous/segment
  collision against the heightfield, not just a point test). Assert the bike never ends a step below terrain.
- Landing grade is correct and stable: on-angle landing keeps speed (PERFECT/CLEAN), off-angle **bails**,
  and a landing exactly at a threshold doesn't flicker between grades.

**Long-run stability:**
- Run a crude autopilot (pump the down-phases, rotate to flatten before landing) for a long simulated run
  (e.g., 60+ seconds of stepped time): no NaN, no tunneling, no stuck states, terrain streams/culls without
  gaps, speed stays within sane bounds. A decent autopilot should reach a respectable distance — meaning a
  human goes further (fair, not punishing).

### Then confirm presentation
Posed `preview_screenshot` (forces a paint) for a mid-pump compression frame and an airborne frame —
confirm the squash/stretch and dust read clearly and terrain features are legible. Check `preview_console_logs`
is clean and the canvas auto-scales (`preview_resize`).

### The gate
Only after the matrix above passes, report back with the evidence (what you tested, the numbers) **and** your
honest read on the one question: *does pumping feel rewarding and is the jump/land loop fun?* If yes → Phase 2.
If the physics fought you, fix it before reporting — a flat *feel* is a fine reason to stop; **wonky physics
is never an acceptable reason, because that's on you to have caught.**

---

# PHASE 2 — Depth (only if Phase 1 is viable)

> **Goal:** turn the proven core into the full game — tricks (king), Bike vs Scooter, felt upgrades,
> full juice, and a proper launch onto the live site. Built additively on Phase 1's code.

## 2.1 Tricks (now that air is fun, make it the score)

- **Flips:** holding **←/→** in the air now scores **backflip/frontflip** — each completed rotation
  counts, multiplied; must come back rubber-side-down within `stats.landTolerance` or bail.
- **Named tricks:** **Z / X / C** fire **Tailwhip, Barspin, Superman, No-Hander, Can-Can** as distinct
  rider poses (2D side view); each takes `t` ms, scores `base`, must be **tucked back before landing**
  (else the grade drops), and **combos** chain a per-air multiplier. A PERFECT-timing bonus for tucking
  just before touchdown. Eased trick popups (`BACKFLIP`, `TAILWHIP x2`). **Tricks are king** — they're
  the main score source, banked on a clean landing, lost on a bail.
- Promote Phase 1's simple Flow into the full **×1→×8 chain** (consecutive pumps + clean landings;
  resets on bail) and add the PERFECT **freeze-frame micro-pause**.

## 2.2 Vehicles — Bike vs Scooter (mechanically distinct, not skins)

Add a select on a proper title/Garage screen. Both fill the same `stats` shape Phase 1 already reads:

| | **Dirt Jump Bike** — momentum | **Stunt Scooter** — technical |
|---|---|---|
| Mass/momentum | heavy: carries speed, big air | light: less top speed, pops off tiny lips |
| Pump ceiling | high `kPump` | moderate |
| Rotation `flipRate` | slower (flips need air) | fast (combo king) |
| Landing | wider base `landTolerance` (stable) | tighter (twitchy, higher skill ceiling) |

Persist the choice (`dirtJumperGarage.vehicle`).

## 2.3 Upgrades + Garage (the roguelite loop — every part is FELT)

`stats = resolveStats(vehicle, partLevels)` = vehicle base × equipped part modifiers. Data in `config.js`,
resolver in a new `Garage.js`. Four felt slots, each moving a named constant:

| Slot | Bike / Scooter | Felt property → `stats` |
|---|---|---|
| **Wheels** | Wheels·Tires / Wheels | **Toughness** → widens `landTolerance` (an angle that **bails on stock survives on maxed**). **Drag** → lowers `rollDrag` (faster). *Marquee dual-stat part.* |
| **Drive** | Cranks / Deck | `kPump` ↑ + `kPop` ↑ |
| **Bars** | Bars / Bars | `flipRate` ↑ + tuck precision |
| **Frame** | Frame / Forks | `mass`/momentum + base `landTolerance` + `kPop` |

- ~4–5 levels each (L0 stock feels rough). **No cosmetic-only parts** — if it doesn't move a constant, cut it.
- **Earn `Dirt`** (single currency) from runs. **GarageScene** (analog of spacex-lander's `HangarScene`):
  Bike/Scooter tabs, four part rows with cost + **stat delta** + level pips, buy, **DROP IN**. Permanent,
  roguelite — a bad run still earns toward the next. Persist `dirtJumperDirt`, `dirtJumperGarage`.
- **Guardrails (keep SpaceX discipline):** IN = vehicle choice, single currency, felt part upgrades, the
  Flow chain. **STILL CUT:** lives/insurance, cosmetic skins, a second currency, per-run relics, daily
  seeds, multiple courses, long cinematics, clicky game-over.

## 2.4 Full content, juice & audio

Full feature kit (drops, hips, berms, step-ups/downs) + tuned distance ramp · speed-aware camera (wider at
high speed/big air) · finished bike vs scooter + articulated rider art · **parallax background**
(`Background.js`: sky/ridges/pines/foliage/clouds) · richer particles + speed lines/vignette · full
`AudioManager.js` (WebAudio synth: tire roll ∝ speed, whoomp, takeoff/trick whoosh, thud, PERFECT chime,
crash, purchase blip, wind; mute toggle).

## 2.5 Graduate onto the site — full registration & SEO

Now wire it in (per `memory/project_adding_a_game_surface.md`; CLAUDE.md's "add a card to index.html" is
**stale**). Dirt Jumper → **Arcade**:
1. Full SEO `index.html` head (title, meta description, canonical, OG/Twitter, favicons/manifest, GA, disabled-AdSense) + three JSON-LD blocks: **VideoGame** (`["Arcade","Score Attack","Sports"]`, SinglePlayer, price 0), **BreadcrumbList** (Home › Arcade › Dirt Jumper), **FAQPage** (how to play, pumping, bike vs scooter, upgrades, free/saves). `ch-game` body data-attrs for the hint strip + custom touch controls.
2. **Arcade cab-card** in `arcade/index.html` `.row-track` (clone spacex-lander; tag `TRICKS`; bike+jump glyph; add bike/scooter/pump-track/BMX terms to the page meta + keywords).
3. **`games-catalog.js`** (single source of truth) — add once: `{ id:'dirt-jumper', name:'Dirt Jumper', cat:'classic', desc:'Pump the track, send the jumps, stomp the tricks.', color:'#C96F2A', isNew:true }`. ⚠️ Arcade uses **`cat:'classic'`** (maps to `/arcade/`), not `'arcade'`. Global search picks it up automatically.
4. **`hub.js`** — add `GLYPH_PATHS['dirt-jumper']`; add `dirtJumperBest` to `SCORE_KEYS` (★ badge); **not** `THUMBS`.
5. **`?v=YYYYMMDD`** bump on games-catalog.js + hub.js in homepage `index.html`, and on `../games-catalog.js?v=` in **all four** category pages (arcade/kids/strategy/casino).
6. Homepage **JSON-LD ItemList** (+`numberOfItems`); **`sitemap.xml`** URL + `lastmod`. No webp thumb needed (arcade uses inline SVG). No game-count/AI copy.
- **Don't orphan it:** confirm it's in games-catalog `LG_GAMES`, the ItemList, the arcade carousel, hub.js glyph/SCORE_KEYS, and sitemap — all five.

## 2.6 Phase 2 verification & ship

Re-run the hand-stepped sim for the new paths, **plus resolver asserts**: maxed wheels → lower `rollDrag` ⇒
higher steady speed, and an angle that **BAILS on stock SURVIVES on maxed**; Bike ≠ Scooter as designed;
buying a part decrements Dirt, bumps the level, persists. Posed screenshots incl. the Garage. Phone-width
touch + landscape hint; homepage tile + ★ + card + search all show it; console clean. Then **commit and push
straight to `main`** (CLAUDE.md — no PRs, no branches).

---

**Build like the rest of the site: curated, polished, finished. No garbage.** Phase 1 proves the fun;
Phase 2 earns the polish.
```
