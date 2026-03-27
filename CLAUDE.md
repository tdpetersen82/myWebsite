# CLAUDE.md

Static game hub website with browser-based arcade games. Each game is a self-contained HTML file. No build step, no dependencies — just static files. See existing games for code patterns and conventions.

## Rules

- **Preserve auto-scaling**: All games must scale to fit the viewport (CSS `transform: scale()` IIFE for vanilla, `Phaser.Scale.FIT` for Phaser games).
- **Preserve high-score persistence**: Use localStorage for score storage.
- **Tech stack is flexible**: Use whatever libraries, engines, frameworks, build tools, or asset pipelines best fit each game. Not locked to vanilla JS.
- **Multi-file games are fine**: Games can span multiple files (JS modules, asset folders, etc.) when it makes sense.
- **Assets are welcome**: Audio files, spritesheets, images, fonts — use real assets when they improve quality.

## Adding a New Game

1. Use an existing game file as a reference for patterns and structure.
2. Ensure the game auto-scales to fit the viewport.
3. Add a card to `index.html` in the appropriate category section:

```html
<div class="game-card">
    <div class="game-icon-wrap">🎮</div>
    <h2>Game Name</h2>
    <p>Short description of the game.</p>
    <a href="game-name/" class="play-button">Play</a>
</div>
```

## Git

- **Default branch**: `master`
- **Feature branches**: use the `claude/` prefix (e.g., `claude/feature-description`)
