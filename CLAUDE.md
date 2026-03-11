# CLAUDE.md — AI Assistant Guide for myWebsite

## Project Overview

This is a **static game hub website** featuring 17 browser-based arcade games. Original games use vanilla HTML5, CSS3, and JavaScript. Newer games use **Phaser 3** (loaded via CDN). Each game is fully self-contained in a single HTML file. All game canvases auto-scale to fit the browser viewport.

**Live games:**
- Snake (`snake.html`)
- Pong (`pong.html`)
- Block Puzzle / Tetris-like (`block-puzzle.html`)
- Breakout / Brick Breaker (`breakout.html`)
- Space Invaders (`space-invaders.html`)
- Flappy Bird (`flappy-bird.html`)
- Connect 4 (`connect-4.html`)
- Fruit Catcher (`fruit-catcher.html`)
- Motorcycle Trail Rider (`motorcycle-game.html`)
- Dots & Boxes (`connect-dots.html`)
- eMoto Database (`emoto-database.html`)
- Asteroids (`asteroids.html`) — Phaser 3
- Pac-Man (`pac-man.html`) — Phaser 3
- Frogger (`frogger.html`) — Phaser 3
- Missile Command (`missile-command.html`) — Phaser 3
- Galaga (`galaga.html`) — Phaser 3
- Centipede (`centipede.html`) — Phaser 3

---

## Repository Structure

```
myWebsite/
├── index.html              # Landing page — game hub with categorized cards
├── styles.css              # Shared stylesheet (index.html + game page chrome)
├── snake.html              # Self-contained Snake game
├── pong.html               # Self-contained Pong game
├── block-puzzle.html       # Self-contained Block Puzzle game
├── breakout.html           # Self-contained Breakout game
├── space-invaders.html     # Self-contained Space Invaders game
├── flappy-bird.html        # Self-contained Flappy Bird game
├── connect-4.html          # Self-contained Connect 4 game
├── fruit-catcher.html      # Self-contained Fruit Catcher game
├── motorcycle-game.html    # Self-contained Motorcycle Trail Rider game
├── connect-dots.html       # Self-contained Dots & Boxes game
├── emoto-database.html     # Electric motorcycle database/browser
├── asteroids.html          # Phaser 3 — Asteroids game
├── pac-man.html            # Phaser 3 — Pac-Man game
├── frogger.html            # Phaser 3 — Frogger game
├── missile-command.html    # Phaser 3 — Missile Command game
├── galaga.html             # Phaser 3 — Galaga game
├── centipede.html          # Phaser 3 — Centipede game
└── .vscode/
    └── launch.json         # VS Code debug config (Chrome + Live Server on port 5500)
```

---

## Technology Stack

| Layer       | Technology                                              |
|-------------|---------------------------------------------------------|
| Markup      | HTML5 (semantic, single-page per game)                  |
| Styling     | CSS3 (inline `<style>` blocks per game)                 |
| Logic       | Vanilla JavaScript (ES6+) or Phaser 3 (newer games)    |
| Rendering   | HTML5 Canvas 2D API / Phaser 3 renderer                 |
| Game Engine | Phaser 3 via CDN (newer games only)                     |
| Physics     | Matter.js via CDN (motorcycle game), Phaser Arcade Physics |
| Audio       | Web Audio API (synthesized sounds, no files)            |
| Storage     | LocalStorage (high score persistence)                   |
| Build       | None — zero-dependency static site                      |
| Deployment  | Static hosting (e.g., GitHub Pages)                     |

---

## Development Workflow

### Running Locally

There is no build step. Serve files with any static HTTP server:

```bash
# Option 1: VS Code Live Server (recommended — matches .vscode/launch.json)
# Install the "Live Server" extension, then right-click index.html → Open with Live Server
# Runs at http://127.0.0.1:5500

# Option 2: Python
python3 -m http.server 5500

# Option 3: Node http-server
npx http-server -p 5500
```

Open `http://127.0.0.1:5500` (or whatever port) in a modern browser.

### No Install / No Build Required

There is no `package.json`, no `npm install`, and no compile step. Editing a file is immediately reflected on browser refresh.

---

## Code Conventions

### Vanilla Game File Structure

Each vanilla game HTML file follows this consistent layout:

1. `<!DOCTYPE html>` + `<head>` with title and inline `<style>`
2. `<body>` with `<canvas>` element + score/control UI
3. Auto-scaling IIFE at end of `<script>` block
4. `<script>` block containing:
   - Canvas setup + DOM element references
   - **Sound effects** (Web Audio API oscillators)
   - **Game configuration constants** (UPPER_CASE)
   - **Game state variables** (camelCase)
   - **Draw functions** (named `draw*`)
   - **Update / game logic functions**
   - **Collision detection**
   - **Event listeners** (keyboard, mouse, buttons)
   - **Game loop** with `requestAnimationFrame`
   - **Initialization call**

### Phaser Game File Structure

Phaser games follow this layout:

1. `<!DOCTYPE html>` + `<head>` with Phaser CDN script tag
2. `<body>` with `<div id="phaser-container">` + score/control UI
3. `<script>` block with Phaser config using `Phaser.Scale.FIT` and scene classes
4. Scenes: typically MenuScene, GameScene, GameOverScene

### Naming Conventions

| Context              | Convention        | Example                        |
|----------------------|-------------------|--------------------------------|
| Variables / functions| camelCase         | `gameRunning`, `drawSnake()`   |
| Game constants       | UPPER_SNAKE_CASE  | `COLS`, `BLOCK_SIZE`, `ROWS`   |
| DOM references       | camelCase + type  | `canvas`, `scoreDisplay`       |

### Canvas Auto-Scaling

All vanilla games include a scaling IIFE that uses CSS `transform: scale()` to fit the viewport while preserving the internal coordinate system. Phaser games use the built-in `Phaser.Scale.FIT` mode.

### Frame Rate Control

All vanilla games use timestamp-based frame limiting. Phaser handles this internally.

```js
let lastTime = 0;
const FRAME_INTERVAL = 100; // ms between updates

function gameLoop(timestamp) {
    if (timestamp - lastTime >= FRAME_INTERVAL) {
        lastTime = timestamp;
        update();
        draw();
    }
    requestAnimationFrame(gameLoop);
}
```

### Sound Effects

All audio is synthesized via Web Audio API (no audio files). The standard pattern:

```js
function playSound(freq, type = 'square', duration = 0.1) {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.start();
    osc.stop(ctx.currentTime + duration);
}
```

### High Scores

LocalStorage keys use a descriptive, game-specific pattern:

```js
localStorage.setItem('snakeHighScore', score);
const best = localStorage.getItem('snakeHighScore') || 0;
```

---

## Adding a New Game

### Vanilla JS Game
1. Copy an existing game file as a starting template (e.g., `cp snake.html my-game.html`).
2. Follow the vanilla game file structure pattern above.
3. Include the auto-scaling IIFE at the end of the script block.
4. Add a card to `index.html` in the appropriate category section.

### Phaser 3 Game
1. Use the Phaser template with CDN script tag: `<script src="https://cdn.jsdelivr.net/npm/phaser@3.80.1/dist/phaser.min.js"></script>`
2. Configure `Phaser.Scale.FIT` with `autoCenter: Phaser.Scale.CENTER_HORIZONTALLY`.
3. Implement as scene classes (MenuScene, GameScene, GameOverScene).
4. Add a card to `index.html` in the appropriate category section.

No build step needed — new files are immediately accessible.

---

## Modifying Existing Games

- Each game is entirely self-contained. Changes to one file do not affect others.
- Shared visual styles for `index.html` only live in `styles.css`. Game-specific styles are inline.
- Preserve the frame rate limiting pattern (`requestAnimationFrame` + timestamp delta) for vanilla games.
- Preserve the auto-scaling behavior in all games.

---

## Git Workflow

- **Default branch**: `master`
- **Feature branches**: use the `claude/` prefix convention (e.g., `claude/feature-description`)
- The working tree should stay clean; there is no build output or generated files to ignore
- No `.gitignore` is needed (no node_modules, dist, etc.)

---

## Deployment

The site is suitable for **GitHub Pages** (static, no server-side rendering needed). Push `master` to enable GitHub Pages from the repository root.

---

## Guidelines for AI Assistants

- **Tech stack is flexible**: Use whatever libraries, engines, frameworks, build tools, or asset pipelines best fit each game. CDN, npm, bundlers, TypeScript — all fair game.
- **Multi-file games are fine**: Games can span multiple files (JS modules, asset folders, etc.) when it makes sense.
- **Assets are welcome**: Audio files, spritesheets, images, fonts — use real assets when they improve quality.
- **Preserve auto-scaling**: All games should still scale to fit the viewport.
- **Preserve high-score persistence**: Continue using localStorage for score storage.
- **Existing games**: When modifying an existing game, match its current tech stack unless the user explicitly asks to migrate it.
