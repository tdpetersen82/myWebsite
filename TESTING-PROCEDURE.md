# Game Hub Testing Procedure

> Standard procedure for browser-based testing of all games and utilities.
> Issues are tracked in TESTING-ISSUES.md. Don't fix during testing — log issues only.

## CRITICAL: Beatability Verification (ALL games, ALL engines)

The #1 priority is verifying the game **can actually be beaten / progressed through**.

The Donkey Kong bug (player stuck on ladders, game unbeatable) was only found by actually trying to play through level 1.

For EVERY game, you MUST:

1. **Actually play through at least 1 full level/round** — not just verify the title screen or watch idle gameplay
2. **Test core mechanics in sequence**: movement -> interaction with game objects -> completing an objective -> level progression
3. **Verify physical interactions work**: Can the player reach all areas? Do collision zones align with visuals? Can ladders/doors/portals be used? Do platforms line up?
4. **Check for instant-death on start**: Does the player die immediately without input? (Found in Galaga, Tempest)
5. **Test win/progression condition**: Can you actually score, clear a level, or reach the goal?
6. **For physics games**: Verify colliders don't block intended movement (Donkey Kong's platform collider blocked ladder climbing)

---

## For Vanilla JS (canvas) Games

1. Navigate to game URL via `preview_eval: window.location.href = 'http://localhost:8080/game-name/'`
2. Wait for load, take screenshot, check console for errors
3. Identify game functions: `startGame`, `update`, `drawGame`, `draw`, etc.
4. Start game and run AI-controlled play loop:
   - For Snake: AI that pathfinds to food coordinates
   - For Pong: AI that tracks ball.y with paddle
   - For Breakout: AI that tracks ball.x with paddle
   - For shooters: AI that targets nearest enemy and shoots periodically
   - For Flappy Bird: AI that targets pipe gap center `(pipe.top + pipe.bottom)/2`
5. Run 3000-8000 manual frames via `for` loop calling `update()` + `drawGame()`
6. **Beatability check**: Run enough frames to attempt level completion. Verify score increases, level transitions, no stuck states.
7. Check score, lives, game state after run
8. Verify: scoring works, game over triggers, restart works, level progression
9. Screenshot mid-game and game-over states

## For Phaser-based Games

Phaser uses rAF which may run slowly in headless preview. Synthetic keyboard events don't work with Phaser's input system.

1. Navigate to game URL, wait 3 seconds
2. Take screenshot to verify title screen renders
3. Check console for errors (filter level=error)
4. Start game via `scene.start('GameScene', {...})` or click canvas
5. **Access scene directly**: `game.scene.scenes.find(s => s.sys.isActive())` to get player, cursors, etc.
6. **Control player via scene.cursors**: Set `scene.cursors.right.isDown = true` etc. to move player
7. **Beatability check**: Navigate player through the core gameplay loop:
   - Move to key locations (ladders, doors, objectives)
   - Verify transitions between areas work (climbing, entering doors, etc.)
   - Check if player can reach the goal/complete the level
   - Verify no physics colliders block intended movement (CHECK `body.blocked` properties)
8. Monitor score, lives, level state throughout
9. Screenshot gameplay states

## For Iframe/Embedded Games (GameDistribution)

1. Navigate and screenshot
2. Check if iframe loads (may have CORS/network issues)
3. Note any loading failures

## For Utility Tools

1. Navigate to `http://localhost:8080/utilities/tool-name/`
2. Screenshot, check console errors
3. Use `preview_eval` or `preview_fill` to enter test input
4. Verify output via snapshot or eval
5. Test one edge case (empty input, special chars)

---

## Key Variable Patterns Across Games

- Most games: `startGame()`, `gameRunning`, `score`, `lives`
- Update functions: `update()` or `updateGame()`
- Draw functions: `drawGame()` or `draw()`
- Ball objects: `ball.x`, `ball.y`, `ball.dx`, `ball.dy`
- Paddle: `paddle.x`, `paddle.y`, `paddle.dx`, `paddle.speed`
- Pieces/enemies: `aliens`, `pipes`, `bricks`, `snake`, `food`

## Games by Engine

- **Vanilla JS (canvas):** snake, pong, breakout, space-invaders, flappy-bird, block-puzzle, connect-4, connect-dots, blackjack, roulette, video-poker, baccarat, craps, three-card-poker, fruit-catcher
- **Phaser 3:** asteroids, pac-man, frogger, missile-command, galaga, centipede, lunar-lander, spacex-lander, joust, bomberman, qbert, donkey-kong, dig-dug, tempest, defender, tron, simon, beat-em-up
- **Pixi.js:** hex-defense
- **Iframe/embedded:** bubble-shooter-hd, merge-fruit, drift-boss, slope-run

## Severity Levels

- **CRITICAL**: Game crashes, freezes, or is unbeatable (Donkey Kong ladder bug)
- **MAJOR**: Core feature broken, instant death without input (Galaga, Tempest)
- **MINOR**: Visual/UX issue, missing game-over overlay, UI element hidden
- **COSMETIC**: Polish items, minor visual quirks
