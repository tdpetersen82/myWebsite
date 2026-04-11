# Goal

A system that learns to play Super Mario Bros. You give it:

- **The buttons**: A, B, UP, DOWN, LEFT, RIGHT
- **What it can see**: the full game state — tiles on screen, enemy positions, Mario's position and velocity, the game timer
- **Three rules**: making progress through the level is good, dying is bad, the timer running out is bad

That's it. No precomputed features, no hand-engineered inputs, no hardcoded behaviors. It sees raw game data and figures out on its own that going right means progress, pits mean death, goombas are dangerous, and jumping clears obstacles.

It learns to **play Mario**, not memorize World 1-1. If you put it in a different level with the same kinds of obstacles, it should handle them — because it learned what gaps and enemies look like and how to react to them, not that "jump at X=594."

The algorithm needs to be powerful enough to handle a real amount of input data and actually learn from experience, not randomly guess.

## Hard rule: no hardcoding

Do not hardcode any game knowledge into the system. No biasing specific buttons, no special-casing outputs, no injecting human knowledge about which buttons are useful or when to press them. If RIGHT is important, the network learns that from reward. If UP is useless, the network learns that from the absence of reward. The reward function defines the goal (progress, survival, speed). Everything else — strategy, timing, button selection — is learned, not programmed.
