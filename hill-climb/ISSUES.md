# Dirt Bike Hill Climb - Issue List

Comprehensive testing report. Issues ordered by severity.

---

## CRITICAL - Game-Breaking

### 1. Bike has almost zero forward movement
**File:** `js/entities/Bike.js:87-101` (`applyGas`)
**What happens:** Pressing gas barely moves the bike. After 15+ seconds of holding gas, the bike has traveled ~1 meter. Speed tops out at ~20 km/h briefly then drops to 0.
**Root cause:** `applyGas()` applies a fixed horizontal force (`forceMag = 1.5`) in world-space, not along the body's angle. On any uphill slope, the force fights gravity instead of pushing along the surface. The single-body physics model (a chamfered rectangle, not real wheels) creates enormous friction against the terrain segments, effectively locking the bike in place. There are no actual rotating wheel bodies providing traction — the chassis just slides.
**Impact:** The game is unplayable. You cannot meaningfully progress.

### 2. Distance counter barely increments
**File:** `js/scenes/GameScene.js:249`
**What happens:** Distance shows "0m" for the vast majority of gameplay, even when the bike has visibly moved some amount.
**Root cause:** `DISTANCE_SCALE: 0.05` means 1 pixel = 0.05 meters, so 20 pixels = 1 meter. Combined with the near-zero movement from Issue #1, distance rounds to 0 for a long time. Even the HTML wrapper `Distance: 0m` never updates because the distance is < 1.
**Impact:** The player sees no progress feedback. The game feels completely broken.

### 3. No real wheel physics — single box body
**File:** `js/entities/Bike.js:23-37` (`createBody`)
**What happens:** The bike is a single Matter.js rectangle with chamfered corners simulating "wheels." There are no separate wheel bodies, no axle constraints, no wheel rotation torque, no suspension.
**Root cause:** The physics body is `matter.add.rectangle` with `chamfer: { radius: WHEEL_RADIUS }`. This creates a rounded box that slides along terrain rather than rolling. Gas applies a force to this box, but the chamfered corners create dead-spots where the box catches on terrain segment joints.
**Impact:** The bike feels like a sliding brick, not a motorcycle. Cannot climb hills, gets stuck on small bumps, no satisfying wheel-over-terrain feel.

---

## HIGH - Major UX Problems

### 4. Camera framing wastes 60%+ of screen space
**File:** `js/scenes/GameScene.js:253-254`, `js/config.js:66-68`
**What happens:** The bike sits in the upper-left quadrant of the screen. The entire bottom 60% of the viewport is empty green terrain fill with nothing to look at.
**Root cause:** Camera offset (`CAM_OFFSET_X: -120, CAM_OFFSET_Y: -80`) positions the bike too high. The terrain `TERRAIN_BASE_Y: 400` is at 67% of the 600px height, but the camera doesn't frame the action area well. No zoom or dynamic camera adjustments.
**Impact:** The gameplay area feels tiny and claustrophobic while most of the screen is wasted.

### 5. Rider is a featureless black silhouette
**File:** `assets/bike/bike.png`
**What happens:** The rider on the bike is a solid black shape with zero detail — no face, no clothing, no helmet, no limbs articulation. Looks like a placeholder.
**Root cause:** The sprite was generated as crude pixel art. The rider has no color variation, no shading, no distinguishing features.
**Impact:** Looks extremely low-quality and unfinished. Major negative first impression.

### 6. Bike sprite doesn't match physics body at all
**File:** `js/entities/Bike.js:190-221` (`updateSprites`)
**What happens:** The visual bike sprite (160x120px) is positioned with a hardcoded Y offset of -12 from the physics body center. The wheel sprites are offset from the body using axle offset constants. But the physics body is an 80x60 rectangle (CHASSIS_WIDTH x CHASSIS_HEIGHT+WHEEL_RADIUS*2). The sprite is 2x wider than the physics body.
**Root cause:** Sprite dimensions (160x120) don't match physics body dimensions (80x60). The sprite positioning is eyeballed with magic offsets rather than properly aligned.
**Impact:** Wheels visually clip through terrain. The bike appears to float or sink. Collision boundaries don't match what the player sees.

### 7. Terrain starting area is an uphill slope
**File:** `js/entities/Terrain.js:15-33` (`getHeight`)
**What happens:** The terrain at the spawn point (x=200) transitions from flat to the sine wave terrain. The first terrain the player encounters is an uphill slope.
**Root cause:** The flattening code (`if (worldX < 200)`) lerps from flat to terrain height, but the sine wave at x=200 is already going uphill. The bike starts right at the transition point and immediately faces a hill it can't climb (due to Issue #1).
**Impact:** New players immediately get stuck, reinforcing the impression the game is broken.

### 8. Fuel system is broken — fuel barely drains
**File:** `js/scenes/GameScene.js:226-231`
**What happens:** After 15+ seconds of gameplay with gas held, fuel remained at 99.8 out of 100.
**Root cause:** `FUEL_DRAIN_RATE: 3` per second while gas held, `FUEL_IDLE_DRAIN: 0.5` per second. These rates are reasonable, but delta is passed in milliseconds and divided by 1000: `CONFIG.FUEL_DRAIN_RATE * (dt / 1000)`. With dt capped at 33ms, this drains 3 * 0.033 = 0.099 fuel per frame. At 30fps that's ~3/sec, which IS correct. But during testing the game appeared to show barely any drain — this may be because the game loop was running slowly due to heavy terrain rendering. At low framerates, the `dt = Math.min(delta, 33)` cap limits fuel drain to 3 * 0.033 = 0.099 per frame regardless of actual time elapsed.
**Impact:** Fuel system doesn't create intended pressure. Game can last forever even with fuel mechanic.

---

## MEDIUM - Noticeable Problems

### 9. Touch controls only have lean-back and gas — no lean-forward or brake
**File:** `js/scenes/GameScene.js:70-88`
**What happens:** Touch input maps left-half to lean-back and right-half to gas. There is no way to lean forward or brake on touch/mobile.
**Root cause:** Only two touch zones are defined. No on-screen buttons or gesture support for the other two controls.
**Impact:** Mobile players have a significantly degraded experience with half the controls missing.

### 10. Speed display uses arbitrary multiplier
**File:** `js/scenes/GameScene.js:334`
**What happens:** Speed is calculated as `Math.floor(this.bike.getSpeed() * 15)` km/h. This is an arbitrary conversion with no physical basis.
**Root cause:** `getSpeed()` returns magnitude of velocity vector in physics units. Multiplying by 15 was likely eyeballed.
**Impact:** Speed numbers are meaningless. At near-zero actual movement, it shows "1 km/h" or "8 km/h" erratically.

### 11. Wheel sprite rotation is wrong
**File:** `js/entities/Bike.js:214-221`
**What happens:** Wheel sprites use frame-cycling (4 frames) AND rotation simultaneously: `this.rearWheelSprite.setRotation(angle + this.wheelRotation)`. The `wheelRotation` accumulates `speed * 0.15` every frame without bounds, eventually overflowing.
**Root cause:** Double rotation — the sprite frame changes AND the sprite rotates. Also `this.wheelRotation` grows without limit: `this.wheelRotation += speed * 0.15`.
**Impact:** Wheels look jittery and wrong. Frame animation + continuous rotation = visual chaos.

### 12. Coin collected immediately at game start
**What happens:** Score jumps to 100 and "Coins: 1" appears within 1-2 seconds of starting, before the player has intentionally done anything.
**Root cause:** Coins spawn starting at x=200 (same as player start). The coin placement overlaps with the bike's starting position. Collection distance is 35px which is generous.
**Impact:** Confusing — player didn't do anything but got a coin and score.

### 13. Terrain rendering redraws ALL visible segments every frame
**File:** `js/entities/Terrain.js:135-191` (`draw`)
**What happens:** Every frame, `graphics.clear()` is called and ALL visible terrain segments are redrawn as filled polygons with 3 layers each (top, mid, bottom) plus a surface line.
**Root cause:** Using Phaser's Graphics object which is an immediate-mode renderer. No caching, no render textures, no tile-based optimization.
**Impact:** Poor performance, especially as more terrain is generated. Each visible segment requires 4 draw calls (3 fills + 1 stroke), with ~20+ segments visible = 80+ draw calls per frame just for terrain.

### 14. Terrain physics bodies are 600px-deep rectangles
**File:** `js/entities/Terrain.js:76`
**What happens:** Each terrain segment physics body is a rectangle with height = `CONFIG.TERRAIN_DEPTH` (600px). These are massive static rectangles tilted at the terrain angle.
**Root cause:** `TERRAIN_DEPTH: 600` creates 40x600 rotated rectangles for each 40px terrain segment. When tilted at steep angles, these overlap and create impossible geometry for the physics engine.
**Impact:** The bike can get wedged between overlapping terrain bodies at segment joints. Contributes to the "stuck" feeling.

### 15. No visual feedback when pressing gas
**What happens:** There's no throttle animation, no speed lines, no engine rev visual indicator. The only feedback is the speed number changing (barely).
**Root cause:** Dirt particles only emit when `gasPressed && bike.rearGrounded`, and exhaust particles are tiny grey dots that are nearly invisible.
**Impact:** The player can't tell if their input is registering.

---

## LOW - Polish Issues

### 16. Menu screen bike has duplicate wheels
**What happens:** On the title screen, the bike appears to have 4 wheels — 2 large physics wheels and 2 smaller sprite wheels overlapping.
**Root cause:** The MenuScene likely renders the bike sprite (which includes wheels in the image) alongside separate wheel sprites.

### 17. Score formula double-counts coins
**File:** `js/scenes/GameScene.js:250, 282`
**What happens:** `this.score = this.distance + this.coins * CONFIG.COIN_VALUE` recalculates score from scratch each frame including coin value. Then on coin collection, `this.score += CONFIG.COIN_VALUE` adds it again.
**Root cause:** Line 250 sets score = distance + coins*100 every frame. Line 282 also adds 100 on collection. Next frame, line 250 overwrites it again anyway, so the += is redundant but causes a brief frame where score is doubled.
**Impact:** Minor — the per-frame recalculation corrects it, but the code is confusing and score may flicker.

### 18. Crash detection angle threshold is too generous
**File:** `js/config.js:71`
**What happens:** `CRASH_ANGLE_THRESHOLD: 2.8` radians = 160 degrees from upright. The bike has to be nearly fully upside-down before crashing.
**Root cause:** The threshold allows the bike to be tilted 160 degrees and still not crash.
**Impact:** The bike can be at absurd angles without triggering a crash, breaking immersion.

### 19. Camera startFollow target is never updated
**File:** `js/scenes/GameScene.js:47-50`
**What happens:** Camera uses `startFollow` on a static object `{ x: this.startX, y: surfaceY }` but then manually sets `scrollX/scrollY` in update. The startFollow does nothing.
**Root cause:** Lines 253-254 manually set camera scroll position, overriding the follow behavior set up in create().
**Impact:** No functional impact, but dead code that's confusing.

### 20. No game-over screen accessible — bike never progresses far enough
**What happens:** Because the bike can barely move (Issue #1), fuel barely drains (Issue #8), and crash detection is very generous (Issue #18), the player can never reach a natural game-over state.
**Root cause:** All three systems (movement, fuel drain, crash detection) are miscalibrated.
**Impact:** The game has no conclusion. Players will quit out of boredom, never seeing the game-over screen.

### 21. Parallax background doesn't tile seamlessly
**What happens:** Background tileSprites may show seams or pop during biome transitions since `createBackgrounds` destroys and recreates all 3 layers instantly.
**Root cause:** No cross-fade or gradual transition between biome backgrounds.

### 22. Pickup spawning can place fuel/coins inside terrain
**File:** `js/entities/Pickup.js:17-18, 26-28`
**What happens:** Fuel spawns at `surfaceY - 30` and coins at `surfaceY - 25 - airOffset`. On steep downhill slopes, these positions can end up visually below the terrain surface when viewed from the camera angle.
**Root cause:** Offset is from the terrain height at the spawn X, but doesn't account for the terrain slope or the sprite size.

### 23. No visual indication of biome/progress
**What happens:** There's no progress bar, minimap, or biome indicator. The player has no sense of how far they've gone or what's coming next.
**Root cause:** Not implemented.

### 24. BootScene has no loading indicator for slow connections
**What happens:** If assets take time to load (especially on mobile/slow connections), there's just a blank screen.
**Root cause:** Need to verify BootScene has a proper loading bar — likely exists but wasn't testable.
