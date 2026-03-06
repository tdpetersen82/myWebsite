# CLAUDE.md — AI Assistant Guide for myWebsite

## Project Overview

This is a **static game hub website** featuring 6 browser-based arcade games implemented in vanilla HTML5, CSS3, and JavaScript. No build tools, frameworks, or external dependencies exist. Each game is fully self-contained in a single HTML file.

**Live games:**
- Snake (`snake.html`)
- Pong (`pong.html`)
- Block Puzzle / Tetris-like (`block-puzzle.html`)
- Breakout / Brick Breaker (`breakout.html`)
- Space Invaders (`space-invaders.html`)
- Flappy Bird (`flappy-bird.html`)

---

## Repository Structure

```
myWebsite/
├── index.html          # Landing page — game hub with cards linking to all games
├── styles.css          # Shared stylesheet used only by index.html
├── snake.html          # Self-contained Snake game
├── pong.html           # Self-contained Pong game
├── block-puzzle.html   # Self-contained Block Puzzle game
├── breakout.html       # Self-contained Breakout game
├── space-invaders.html # Self-contained Space Invaders game
├── flappy-bird.html    # Self-contained Flappy Bird game
└── .vscode/
    └── launch.json     # VS Code debug config (Chrome + Live Server on port 5500)
```

---

## Technology Stack

| Layer      | Technology                                  |
|------------|---------------------------------------------|
| Markup     | HTML5 (semantic, single-page per game)      |
| Styling    | CSS3 (inline `<style>` blocks per game)     |
| Logic      | Vanilla JavaScript (ES6+, no frameworks)    |
| Rendering  | HTML5 Canvas 2D API                         |
| Audio      | Web Audio API (synthesized sounds, no files)|
| Storage    | LocalStorage (high score persistence)       |
| Build      | None — zero-dependency static site          |
| Deployment | Static hosting (e.g., GitHub Pages)         |

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

### File Structure (per game)

Each game HTML file follows this consistent layout:

1. `<!DOCTYPE html>` + `<head>` with title and inline `<style>`
2. `<body>` with `<canvas>` element + score/control UI
3. `<script>` block containing:
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

### Naming Conventions

| Context              | Convention        | Example                        |
|----------------------|-------------------|--------------------------------|
| Variables / functions| camelCase         | `gameRunning`, `drawSnake()`   |
| Game constants       | UPPER_SNAKE_CASE  | `COLS`, `BLOCK_SIZE`, `ROWS`   |
| DOM references       | camelCase + type  | `canvas`, `scoreDisplay`       |

### Frame Rate Control

All games use timestamp-based frame limiting to prevent speed issues on high-refresh-rate displays. Do not use `setInterval` for game loops. The pattern is:

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

### Responsive Design (`styles.css` / `index.html` only)

- Max container width: `800px`
- Game card grid: `repeat(auto-fit, minmax(200px, 1fr))`
- Mobile breakpoint: `@media (max-width: 768px)` → single-column layout

---

## Adding a New Game

1. Copy an existing game file as a starting template (e.g., `cp snake.html my-game.html`).
2. Follow the file structure pattern above.
3. Add a card to `index.html` in the games grid:
   ```html
   <a href="my-game.html" class="game-card">
       <div class="game-icon">🎮</div>
       <h3>My Game</h3>
       <p>Short description</p>
   </a>
   ```
4. No build step needed — the new file is immediately accessible.

---

## Modifying Existing Games

- Each game is entirely self-contained. Changes to one file do not affect others.
- Shared visual styles for `index.html` only live in `styles.css`. Game-specific styles are inline.
- Do not introduce external libraries or CDN scripts — keep all games dependency-free.
- Preserve the frame rate limiting pattern (`requestAnimationFrame` + timestamp delta) to avoid speed bugs on high-refresh displays.

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

## Key Constraints for AI Assistants

1. **No dependencies**: Do not add npm packages, CDN scripts, or external imports.
2. **No build tools**: Do not introduce webpack, Vite, Rollup, TypeScript compilation, or similar tooling unless explicitly requested.
3. **No frameworks**: No React, Vue, Angular, etc. Keep everything vanilla.
4. **Self-contained files**: Each game must remain a single HTML file with inline CSS and JS.
5. **Preserve audio pattern**: Use Web Audio API synthesis — do not add audio file assets.
6. **Preserve frame limiting**: Always use `requestAnimationFrame` with timestamp-based delta for game loops.
7. **LocalStorage only**: No backend, no cookies beyond localStorage for score persistence.
