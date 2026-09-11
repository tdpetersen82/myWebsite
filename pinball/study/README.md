# Option A — 3D visual checkpoint

A standalone, real-time Three.js scene at `/pinball/study/`. This is a material/layout study of three amber pop bumpers, a limestone backdrop and one elevated wireform ramp. It does not replace or import the 2D game's physics or rules.

Drag to orbit, scroll to zoom, use Player view or Bumper close-up, and Strike bumpers to inspect compression/light response. Pause motion freezes the demonstration; reduced-motion preferences start it paused. The steel ball follows a scripted inspection route, not a physics simulation.

Implemented materials and geometry: multi-part bumper housings, transmissive amber caps, rubber skirts, brass cages, fasteners, six continuous chrome rails, cross braces, stanchions, irregular stone geometry, textured stone surfaces, quarry floor artwork, work lamps, soft shadows and a generated softbox reflection environment. Pixel ratio is capped at 1.75. No external runtime requests: Three.js 0.180.0 and two addons are vendored with their MIT license.

Verification: module syntax check, local asset HTTP checks, desktop WebGL rendering, camera preset buttons, pause/resume, and browser console inspection. The existing game is unchanged. Visual fidelity still requires review against the selected Option A image before expanding to the entire table.

Implementation reference: https://threejs.org/docs/pages/MeshPhysicalMaterial.html
