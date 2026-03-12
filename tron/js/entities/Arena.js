// Tron Light Cycles - Arena / Grid
class Arena {
    constructor() {
        this.reset(0);
    }

    /**
     * Reset arena bounds for the given round number (0-indexed).
     * Each round shrinks the arena by ARENA_SHRINK_PER_ROUND pixels on each side.
     */
    reset(roundIndex) {
        const shrink = roundIndex * TRON_CONFIG.ARENA_SHRINK_PER_ROUND;
        const gs = TRON_CONFIG.GRID_SIZE;

        // Bounds in grid coordinates (inclusive)
        this.minCol = Math.ceil(shrink / gs);
        this.minRow = Math.ceil(shrink / gs);
        this.maxCol = Math.floor((TRON_CONFIG.WIDTH - shrink) / gs) - 1;
        this.maxRow = Math.floor((TRON_CONFIG.HEIGHT - shrink) / gs) - 1;
    }

    /**
     * Check if a grid cell is outside the arena walls.
     */
    isBlocked(gridX, gridY) {
        return (
            gridX < this.minCol ||
            gridX > this.maxCol ||
            gridY < this.minRow ||
            gridY > this.maxRow
        );
    }

    /**
     * Get a random open position inside the arena.
     */
    getRandomPosition() {
        return {
            x: this.minCol + Math.floor(Math.random() * (this.maxCol - this.minCol + 1)),
            y: this.minRow + Math.floor(Math.random() * (this.maxRow - this.minRow + 1)),
        };
    }

    /**
     * Get player start position for the current arena size.
     */
    getPlayerStart() {
        const cols = this.maxCol - this.minCol;
        const rows = this.maxRow - this.minRow;
        return {
            x: this.minCol + Math.floor(cols * TRON_CONFIG.PLAYER_START_COL_FRACTION),
            y: this.minRow + Math.floor(rows * TRON_CONFIG.START_ROW_FRACTION),
        };
    }

    /**
     * Get AI start position for the current arena size.
     */
    getAIStart() {
        const cols = this.maxCol - this.minCol;
        const rows = this.maxRow - this.minRow;
        return {
            x: this.minCol + Math.floor(cols * TRON_CONFIG.AI_START_COL_FRACTION),
            y: this.minRow + Math.floor(rows * TRON_CONFIG.START_ROW_FRACTION),
        };
    }

    /**
     * Draw the arena: grid lines and walls.
     */
    draw(graphics) {
        const gs = TRON_CONFIG.GRID_SIZE;
        const w = TRON_CONFIG.WIDTH;
        const h = TRON_CONFIG.HEIGHT;

        // Background
        graphics.fillStyle(TRON_CONFIG.COLORS.BACKGROUND, 1);
        graphics.fillRect(0, 0, w, h);

        // Grid lines (subtle)
        graphics.lineStyle(1, TRON_CONFIG.COLORS.GRID_LINE, 0.3);
        for (let x = this.minCol * gs; x <= (this.maxCol + 1) * gs; x += gs) {
            graphics.lineBetween(x, this.minRow * gs, x, (this.maxRow + 1) * gs);
        }
        for (let y = this.minRow * gs; y <= (this.maxRow + 1) * gs; y += gs) {
            graphics.lineBetween(this.minCol * gs, y, (this.maxCol + 1) * gs, y);
        }

        // Walls (neon glow effect)
        const wallLeft = this.minCol * gs;
        const wallTop = this.minRow * gs;
        const wallRight = (this.maxCol + 1) * gs;
        const wallBottom = (this.maxRow + 1) * gs;
        const wallWidth = wallRight - wallLeft;
        const wallHeight = wallBottom - wallTop;

        // Outer glow
        graphics.lineStyle(4, TRON_CONFIG.COLORS.WALL_GLOW, 0.3);
        graphics.strokeRect(wallLeft - 2, wallTop - 2, wallWidth + 4, wallHeight + 4);

        // Main wall
        graphics.lineStyle(2, TRON_CONFIG.COLORS.WALL, 1);
        graphics.strokeRect(wallLeft, wallTop, wallWidth, wallHeight);

        // Inner glow
        graphics.lineStyle(1, TRON_CONFIG.COLORS.WALL_GLOW, 0.5);
        graphics.strokeRect(wallLeft + 1, wallTop + 1, wallWidth - 2, wallHeight - 2);

        // If arena is shrunk, shade the dead zone
        if (this.minCol > 0) {
            graphics.fillStyle(0x110000, 0.5);
            // Top
            graphics.fillRect(0, 0, w, wallTop);
            // Bottom
            graphics.fillRect(0, wallBottom, w, h - wallBottom);
            // Left
            graphics.fillRect(0, wallTop, wallLeft, wallHeight);
            // Right
            graphics.fillRect(wallRight, wallTop, w - wallRight, wallHeight);
        }
    }
}
