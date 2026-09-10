# Limestone Quarry Pinball — Phase 2

Playable geometry and physics prototype at `/pinball/`. Serve unlimited practice balls; hold and release Space or Launch to shoot. A/D or arrow keys control the flippers, P pauses, R serves a fresh ball. Best rally duration persists locally.

Implemented: fixed-step ball simulation, moving capsule flippers with angular contact velocity, passive catches, variable plunger, shooter gate, guide rails, active slingshots, center drain and outlanes. Physics runs at 240 Hz with 960 Hz collision substeps. The 1,900 units/second velocity limit keeps travel under two units per collision step for a nine-unit ball radius. Rendering scales a 600 × 900 table to the viewport.

Working machinery: three drop targets with a delayed bank reset, three active crusher bumpers, a power-gated conveyor ramp with a guided elevated return to the right flipper, a timed siding scoop with kickout immunity, three survey rollovers with reset, and a physically guided haul-road orbit with three-checkpoint completion detection. Flipper-shot tests reach each major mechanism. Counters reset on a fresh ball; shipment rules and points are still deferred. The page is marked noindex and held out of the arcade catalog until its release phase.

## Run and verify

From the repository root:

```sh
python3 -m http.server 8765
node tools/pinball-test.mjs
node tools/pinball-flow-test.mjs
node tools/pinball-machines-test.mjs
```

Open `http://localhost:8765/pinball/`.

Physics checks cover 21 launch strengths, unattended drains, both held-flipper catches and releases, moving-flipper strikes, fast rail/flipper collisions, pause, outer-step consistency and 30 deterministic stress runs. Machinery tests verify drop/reset behavior, individual bumper kicks, weak-shot rejection, safe ramp return, scoop dwell/release, pause during transport, rollover resets, actual flipper-shot access and a completed orbit. The DOM harness checks keyboard aliases, simultaneous pointers, cancellation, launch, focus-loss pause, serving and storage reload. Browser inspection covers desktop and 390 × 844 phone layout; real-device touch feel still needs hands-on tuning.

## Next phase

Phase 3 adds Quarry → Crush → Load → Ship progression, three-ball shifts, scoring, ball saver, skill shots, combos, bonus multipliers and saved high scores. The current machine events and counters provide the inputs; keep the physics and machinery regression checks while layering on these rules.
