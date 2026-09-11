# Option A — 3D visual checkpoint

A standalone, real-time Three.js scene at `/pinball/study/`. This is a material/layout study of three amber pop bumpers, a limestone backdrop and one elevated wireform ramp. It does not replace or import the 2D game's physics or rules.

Drag to orbit, scroll to zoom, use Player view or Bumper close-up, and Strike bumpers to inspect compression/light response. Pause motion freezes the demonstration; reduced-motion preferences start it paused. The steel ball follows a scripted inspection route, not a physics simulation.

Implemented materials and geometry: multi-part bumper housings, transmissive amber caps, rubber skirts, brass cages, fasteners, six continuous chrome rails, cross braces, stanchions, irregular stone geometry, textured stone surfaces, quarry floor artwork, work lamps, soft shadows and a generated softbox reflection environment. Pixel ratio is capped at 1.75. No external runtime requests: Three.js 0.180.0 and two addons are vendored with their MIT license.

Verification: module syntax check, local asset HTTP checks, desktop WebGL rendering, camera preset buttons, pause/resume, and browser console inspection. The existing game is unchanged. Visual fidelity still requires review against the selected Option A image before expanding to the entire table.

Implementation reference: https://threejs.org/docs/pages/MeshPhysicalMaterial.html

## Full table assembly (checkpoint 02)

Expanded the model with lower return rails, slingshot assemblies, ivory flippers,
a separated shooter lane and plunger spring, mission inserts, drop targets, a
crusher with animated rollers, tunnel, settling pool, apron and backboard display.
Use A/D or left/right arrows to exercise the flipper pivots. Ball motion remains a
scripted visual demonstration, and the display is a preview, not a live score.
The existing playable game and its high scores remain separate.

## Playable prototype (checkpoint 03)

Three.js renders the table; `physics.mjs` supplies a custom fixed-step 240 Hz
planar simulation with circle/capsule contacts and moving flipper surfaces.
Visible ground rails are sampled into collision segments. Space launches;
A/D or arrows operate flippers; P pauses. Bumpers, targets, slings and the
wire ramp award points. Three balls per game, one early save per ball, and
localStorage key `limestone-quarry-3d-best` stores this version's best score.
The covered launch feed and elevated ramp use constrained paths; free play
uses velocity, gravity and collisions. This is an initial playable prototype:
full quarry mission rules, sound and final physics tuning are still pending.

Plaque labels fit their texture width. The rendering viewport reserves room
for the controls, keeping the cabinet apron clear in the player-view preset.
Run `node tools/pinball-3d-test.mjs` for physics regression checks.

### Collision geometry repair

Slingshots are solid polygons, not independent edge capsules; an interior ball
is projected to the nearest exterior boundary. `layout.mjs` supplies both the
visible ground rails and their sampled collision geometry. Return guides have
clearance around the sling backs and flipper pivots and slope toward their exits.
Zero-tension rail interpolation prevents curves from narrowing the designed gaps.
The regression suite exercises eight 90-second runs on the actual table layout,
including the initial launch, housing containment, stationary wedges, passive
three-ball drains, and scoring under timed flipper input.
