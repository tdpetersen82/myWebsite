// Dig Dug - Rock Entity (falls when dirt below is removed)

class Rock {
    constructor(scene, grid, col, row) {
        this.scene = scene;
        this.grid = grid;

        // Grid position
        this.col = col;
        this.row = row;

        // Pixel position
        const pos = grid.gridToPixel(col, row);
        this.x = pos.x;
        this.y = pos.y;

        // States: idle, wobbling, falling, crashed
        this.state = 'idle';
        this.wobbleTimer = 0;
        this.fallSpeed = 0;
        this.crushCount = 0;   // enemies crushed during this fall
        this.alive = true;
        this.crashTimer = 0;

        // The rock "sits" on dirt. We track if support is removed
        this.supportCheckTimer = 0;

        // Animation
        this.wobbleOffset = 0;

        // Graphics
        this.graphics = scene.add.graphics();
        this.graphics.setDepth(7);
    }

    update(delta, enemies, player) {
        if (!this.alive) return { crushedEnemies: [], crushedPlayer: false };

        const result = { crushedEnemies: [], crushedPlayer: false };

        switch (this.state) {
            case 'idle':
                this.checkSupport(delta);
                break;

            case 'wobbling':
                this.wobbleTimer += delta;
                this.wobbleOffset = Math.sin(this.wobbleTimer * 0.03) * 3;

                if (this.wobbleTimer >= CONFIG.ROCK_WOBBLE_TIME) {
                    this.state = 'falling';
                    this.fallSpeed = 0;
                    // Clear the dirt cell where the rock was (it's now falling)
                    this.grid.digCell(this.row, this.col);
                    if (this.scene.audio) {
                        this.scene.audio.playRockWobble();
                    }
                }
                break;

            case 'falling':
                this.fallSpeed += CONFIG.ROCK_FALL_SPEED * 2 * (delta / 1000);
                this.y += this.fallSpeed * (delta / 1000);

                // Update grid row
                const newRow = Math.floor(this.y / CONFIG.CELL_HEIGHT);

                // Check for crushing enemies
                for (const enemy of enemies) {
                    if (!enemy.alive || enemy.dying) continue;
                    if (enemy.col === this.col && Math.abs(enemy.y - this.y) < CONFIG.CELL_HEIGHT * 0.6) {
                        enemy.crush();
                        this.crushCount++;
                        result.crushedEnemies.push(enemy);
                    }
                }

                // Check for crushing player
                if (player.alive && player.col === this.col && Math.abs(player.y - this.y) < CONFIG.CELL_HEIGHT * 0.6) {
                    result.crushedPlayer = true;
                }

                // Check if rock hit dirt or bottom
                if (newRow >= CONFIG.GRID_ROWS - 1 || (newRow > this.row && this.grid.isDirt(newRow + 1, this.col))) {
                    this.state = 'crashed';
                    this.crashTimer = 500;
                    this.row = Math.min(newRow, CONFIG.GRID_ROWS - 1);
                    this.y = this.row * CONFIG.CELL_HEIGHT + CONFIG.CELL_HEIGHT / 2;
                    if (this.scene.audio) {
                        this.scene.audio.playRockCrush();
                    }
                } else {
                    // Dig through dirt as rock falls
                    if (this.grid.isDirt(newRow, this.col)) {
                        this.grid.digCell(newRow, this.col);
                    }
                    this.row = newRow;
                }
                break;

            case 'crashed':
                this.crashTimer -= delta;
                if (this.crashTimer <= 0) {
                    this.alive = false;
                }
                break;
        }

        this.draw();
        return result;
    }

    checkSupport(delta) {
        this.supportCheckTimer += delta;
        if (this.supportCheckTimer < 100) return;
        this.supportCheckTimer = 0;

        // Check if the cell directly below is empty
        if (!this.grid.isSupportedBelow(this.row, this.col)) {
            // Check if at least 2 cells below were dug
            if (this.grid.emptyBelow(this.row, this.col) >= 1) {
                this.state = 'wobbling';
                this.wobbleTimer = 0;
            }
        }
    }

    getRockScore() {
        const scores = [0, CONFIG.SCORE.ROCK_KILL_1, CONFIG.SCORE.ROCK_KILL_2,
            CONFIG.SCORE.ROCK_KILL_3, CONFIG.SCORE.ROCK_KILL_4, CONFIG.SCORE.ROCK_KILL_5];
        return scores[Math.min(this.crushCount, scores.length - 1)] || 0;
    }

    draw() {
        this.graphics.clear();
        if (!this.alive) return;

        const cx = this.x + this.wobbleOffset;
        const cy = this.y;
        const s = CONFIG.CELL_WIDTH * 0.45;

        if (this.state === 'crashed') {
            // Crumbling animation
            const progress = 1 - (this.crashTimer / 500);
            const alpha = 1 - progress;

            // Rock fragments
            this.graphics.fillStyle(CONFIG.COLORS.ROCK, alpha);
            this.graphics.fillRoundedRect(cx - s - progress * 5, cy - s * 0.5 + progress * 3, s * 0.7, s * 0.6, 3);
            this.graphics.fillRoundedRect(cx + s * 0.3 + progress * 5, cy - s * 0.3 + progress * 5, s * 0.6, s * 0.5, 3);
            this.graphics.fillRoundedRect(cx - s * 0.3, cy + s * 0.2 + progress * 4, s * 0.5, s * 0.4, 2);

            this.graphics.fillStyle(CONFIG.COLORS.ROCK_DARK, alpha);
            this.graphics.fillRoundedRect(cx - s * 0.5, cy - s * 0.7 + progress * 2, s * 0.8, s * 0.5, 3);
            return;
        }

        // Main rock body
        this.graphics.fillStyle(CONFIG.COLORS.ROCK, 1);
        this.graphics.fillRoundedRect(cx - s, cy - s * 0.8, s * 2, s * 1.6, 6);

        // Rock details / cracks
        this.graphics.fillStyle(CONFIG.COLORS.ROCK_DARK, 1);
        this.graphics.fillRoundedRect(cx - s * 0.7, cy - s * 0.5, s * 0.6, s * 0.4, 3);
        this.graphics.fillRoundedRect(cx + s * 0.1, cy + s * 0.1, s * 0.5, s * 0.35, 3);

        // Crack lines
        this.graphics.lineStyle(1.5, CONFIG.COLORS.ROCK_DARK, 0.6);
        this.graphics.beginPath();
        this.graphics.moveTo(cx - s * 0.3, cy - s * 0.3);
        this.graphics.lineTo(cx + s * 0.2, cy + s * 0.1);
        this.graphics.lineTo(cx + s * 0.5, cy - s * 0.1);
        this.graphics.strokePath();

        // Highlight
        this.graphics.fillStyle(0xAAAAAA, 0.4);
        this.graphics.fillRoundedRect(cx - s * 0.8, cy - s * 0.6, s * 0.5, s * 0.3, 2);

        // Wobble indicator (red tint when about to fall)
        if (this.state === 'wobbling') {
            this.graphics.fillStyle(0xFF0000, 0.2);
            this.graphics.fillRoundedRect(cx - s, cy - s * 0.8, s * 2, s * 1.6, 6);
        }
    }

    destroy() {
        this.graphics.destroy();
    }
}
