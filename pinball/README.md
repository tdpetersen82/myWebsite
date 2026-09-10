# Limestone Quarry Pinball — Phase 1

Playable geometry and physics prototype at `/pinball/`. Serve unlimited practice balls; hold and release Space or Launch to shoot. A/D or arrow keys control the flippers, P pauses, R serves a fresh ball. Best rally duration persists locally.

Implemented: fixed-step ball simulation, moving capsule flippers with angular contact velocity, passive catches, variable plunger, shooter gate, guide rails, active slingshots, center drain and outlanes. Physics runs at 240 Hz with 960 Hz collision substeps. The 1,900 units/second velocity limit keeps travel under two units per collision step for a nine-unit ball radius. Rendering scales a 600 × 900 table to the viewport.

Dashed rock bank, crusher, conveyor and siding footprints are noncolliding layout references. Representative flipper shots reach each footprint. The orbit is an open outer shot path; the working ramp, scoop and machinery belong to Phase 2. The page is marked noindex and held out of the arcade catalog until its release phase.

## Run and verify

From the repository root:

```sh
python3 -m http.server 8765
node tools/pinball-test.mjs
node tools/pinball-flow-test.mjs
```

Open `http://localhost:8765/pinball/`.

Physics checks cover 21 launch strengths, unattended drains, both held-flipper catches and releases, moving-flipper strikes, fast rail/flipper collisions, machine footprint reachability, pause, outer-step consistency and 30 deterministic stress runs. The DOM harness checks keyboard aliases, simultaneous pointers, cancellation, launch, focus-loss pause, serving and storage reload. Browser inspection covers desktop and 390 × 844 phone layout; real-device touch feel still needs hands-on tuning.

## Next phase

Replace the footprints with rock drop targets, crusher bumpers, a conveyor ramp with safe return, and a siding scoop with capture/release. Preserve the existing flipper and collision regression checks while tuning the added geometry. Shipment progression and points are Phase 3.
