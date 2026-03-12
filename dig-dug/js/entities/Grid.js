// Dig Dug - Grid System (dirt, tunnels, rendering)

class Grid {
    constructor(scene) {
        this.scene = scene;
        this.cols = CONFIG.GRID_COLS;
        this.rows = CONFIG.GRID_ROWS;
        this.cellW = CONFIG.CELL_WIDTH;
        this.cellH = CONFIG.CELL_HEIGHT;

        // Grid data: true = dirt, false = tunnel/empty
        this.cells = [];
        this.graphics = scene.add.graphics();
        this.graphics.setDepth(0);
    }

    init() {
        this.cells = [];
        for (let r = 0; r < this.rows; r++) {
            this.cells[r] = [];
            for (let c = 0; c < this.cols; c++) {
                // First row is sky/surface - always empty
                this.cells[r][c] = r >= CONFIG.SKY_ROWS;
            }
        }
    }

    // Create initial tunnels for enemy starting positions and player
    createInitialTunnels(playerPos, enemyPositions) {
        // Dig out player starting position
        this.digCell(playerPos.row, playerPos.col);
        // Small tunnel around player start
        if (playerPos.col > 0) this.digCell(playerPos.row, playerPos.col - 1);
        if (playerPos.col < this.cols - 1) this.digCell(playerPos.row, playerPos.col + 1);

        // Dig out enemy starting positions
        enemyPositions.forEach(pos => {
            this.digCell(pos.row, pos.col);
            // Small pocket around each enemy
            if (pos.col > 0) this.digCell(pos.row, pos.col - 1);
            if (pos.col < this.cols - 1) this.digCell(pos.row, pos.col + 1);
        });
    }

    digCell(row, col) {
        if (row >= 0 && row < this.rows && col >= 0 && col < this.cols) {
            this.cells[row][col] = false;
        }
    }

    isDirt(row, col) {
        if (row < 0 || row >= this.rows || col < 0 || col >= this.cols) return false;
        return this.cells[row][col];
    }

    isEmpty(row, col) {
        if (row < 0 || row >= this.rows || col < 0 || col >= this.cols) return false;
        return !this.cells[row][col];
    }

    isInBounds(row, col) {
        return row >= 0 && row < this.rows && col >= 0 && col < this.cols;
    }

    // Get pixel position from grid coordinates
    gridToPixel(col, row) {
        return {
            x: col * this.cellW + this.cellW / 2,
            y: row * this.cellH + this.cellH / 2
        };
    }

    // Get grid coordinates from pixel position
    pixelToGrid(x, y) {
        return {
            col: Math.floor(x / this.cellW),
            row: Math.floor(y / this.cellH)
        };
    }

    // Get the depth layer (1-4) for scoring purposes
    getDepthLayer(row) {
        const dirtRows = this.rows - CONFIG.SKY_ROWS;
        const layerSize = dirtRows / 4;
        const relativeRow = row - CONFIG.SKY_ROWS;
        return Math.min(4, Math.floor(relativeRow / layerSize) + 1);
    }

    // Check if cells below a position are dug out (for rock falling)
    isSupportedBelow(row, col) {
        // Check the two cells directly below
        if (row + 1 >= this.rows) return true; // Bottom of grid
        // A rock needs at least one dirt cell below it or be at the bottom
        if (this.isDirt(row + 1, col)) return true;
        return false;
    }

    // Count consecutive empty cells below a position
    emptyBelow(row, col) {
        let count = 0;
        for (let r = row + 1; r < this.rows; r++) {
            if (this.isEmpty(r, col)) {
                count++;
            } else {
                break;
            }
        }
        return count;
    }

    draw() {
        this.graphics.clear();

        // Draw sky
        this.graphics.fillStyle(CONFIG.COLORS.SKY, 1);
        this.graphics.fillRect(0, 0, this.cols * this.cellW, CONFIG.SKY_ROWS * this.cellH);

        // Draw surface decorations (flowers/grass)
        this.drawSurface();

        // Draw dirt and tunnels
        for (let r = CONFIG.SKY_ROWS; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                const x = c * this.cellW;
                const y = r * this.cellH;

                if (this.cells[r][c]) {
                    // Dirt cell - vary color by depth
                    const layer = this.getDepthLayer(r);
                    let color;
                    switch (layer) {
                        case 1: color = 0x8B6914; break;  // Light brown (top)
                        case 2: color = 0x8B4513; break;  // Medium brown
                        case 3: color = 0x723610; break;  // Darker brown
                        case 4: color = 0x5C2D0E; break;  // Darkest brown
                        default: color = CONFIG.COLORS.DIRT;
                    }
                    this.graphics.fillStyle(color, 1);
                    this.graphics.fillRect(x, y, this.cellW, this.cellH);

                    // Add subtle texture dots
                    this.graphics.fillStyle(color + 0x111111, 0.3);
                    const dotX = x + (((r * 7 + c * 13) % 17) / 17) * this.cellW;
                    const dotY = y + (((r * 11 + c * 3) % 13) / 13) * this.cellH;
                    this.graphics.fillCircle(dotX, dotY, 2);
                } else {
                    // Tunnel/empty - black background
                    this.graphics.fillStyle(CONFIG.COLORS.TUNNEL, 1);
                    this.graphics.fillRect(x, y, this.cellW, this.cellH);
                }
            }
        }
    }

    drawSurface() {
        // Draw grass strip at bottom of sky row
        const grassY = CONFIG.SKY_ROWS * this.cellH - 6;
        this.graphics.fillStyle(CONFIG.COLORS.STEM, 1);
        this.graphics.fillRect(0, grassY, this.cols * this.cellW, 6);

        // Draw small flowers on surface
        for (let c = 0; c < this.cols; c += 3) {
            const fx = c * this.cellW + this.cellW / 2;
            const fy = grassY - 4;
            // Stem
            this.graphics.fillStyle(CONFIG.COLORS.STEM, 1);
            this.graphics.fillRect(fx - 1, fy - 6, 2, 8);
            // Flower
            this.graphics.fillStyle(CONFIG.COLORS.FLOWER, 1);
            this.graphics.fillCircle(fx, fy - 8, 3);
        }
    }
}
