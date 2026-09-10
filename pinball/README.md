# Limestone Quarry Pinball — Phase 3

Playable three-ball shifts at `/pinball/`. Hold and release Space or Launch to shoot. A/D or arrow keys control the flippers, P pauses, R starts a new shift. Scores and completed-shift records persist locally.

Implemented: fixed-step ball simulation, moving capsule flippers with angular contact velocity, passive catches, variable plunger, shooter gate, guide rails, active slingshots, center drain and outlanes. Physics runs at 240 Hz with 960 Hz collision substeps. The 1,900 units/second velocity limit keeps travel under two units per collision step for a nine-unit ball radius. Rendering scales a 600 × 900 table to the viewport.

Working machinery: three drop targets with a delayed bank reset, three active crusher bumpers, a power-gated conveyor ramp with a guided elevated return to the right flipper, a timed siding scoop with kickout immunity, three survey rollovers with reset, and a physically guided haul-road orbit with three-checkpoint completion detection. Flipper-shot tests reach each major mechanism. Rules progress through Quarry → Crush → Load → Ship. Clear three distinct rock slabs, hit the crusher five times, shoot the ramp, then collect the siding jackpot. Jackpots start at 10,000 and rise by 5,000 per shipment. Progress carries across balls. The page is marked noindex and held out of the arcade catalog until its release phase.

## Run and verify

From the repository root:

```sh
python3 -m http.server 8765
node tools/pinball-test.mjs
node tools/pinball-flow-test.mjs
node tools/pinball-machines-test.mjs
node tools/pinball-rules-test.mjs
```

Open `http://localhost:8765/pinball/`.

Physics checks cover 101 launch strengths reaching the central playfield, unattended drains, both held-flipper catches and releases, moving-flipper strikes, fast rail/flipper collisions, pause, outer-step consistency and 30 deterministic stress runs. Machinery tests verify drop/reset behavior, individual bumper kicks, weak-shot rejection, safe ramp return, scoop dwell/release, pause during transport, rollover resets, actual flipper-shot access and a completed orbit. The DOM harness checks keyboard aliases, simultaneous pointers, cancellation, launch, focus-loss pause, a full three-ball shift, ball saves, bonus transitions, restart and high-score reload. Browser inspection covers desktop and 390 × 844 phone layout; real-device touch feel still needs hands-on tuning.

## Phase 3 rules

Each ball has one seven-second save; the replacement cannot renew it. The first rollover within 12 seconds can award a 3,000-point skill shot. Launch strength selects one of three survey lanes, shown on the launch button while charging. Completing the rollover bank advances the bonus multiplier through 2×, 3× and 5×. Consecutive orbits within eight seconds award 1,500 × combo, capped at five. Per-ball material bonuses count up over two seconds and pay exactly once. Ball three ends the shift; launching afterward starts a fresh shift.

The upper launch feed uses a guided channel into the survey lanes. The former uncontrolled collision with the inner orbit rail often returned the ball down the right outlane. Regression checks now require every sampled launch strength to reach the playable middle before draining, not just leave the shooter lane. Normal orbit shots retain their physical rail collisions.

## Next phase

Phase 4 adds quarry artwork, machinery animations and sound. Phase 5 expands real-device playtesting and tuning; Phase 6 adds the public arcade listing and release metadata. The page remains noindex until release.
