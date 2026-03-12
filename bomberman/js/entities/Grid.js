// Bomberman Grid - Level generation and management
class Grid {
    constructor(scene) {
        this.scene = scene;
        this.cells = [];
        this.graphics = null;
        this.doorPos = null;
        this.powerUpPositions = [];
    }

    generate(level) {
        const cols = CONFIG.GRID_COLS;
        const rows = CONFIG.GRID_ROWS;
        this.cells = [];

        // Initialize all cells as empty
        for (let r = 0; r < rows; r++) {
            this.cells[r] = [];
            for (let c = 0; c < cols; c++) {
                this.cells[r][c] = CONFIG.CELL.EMPTY;
            }
        }

        // Place hard walls in fixed pattern (every other cell starting at 1,1)
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                // Border walls
                if (r === 0 || r === rows - 1 || c === 0 || c === cols - 1) {
                    this.cells[r][c] = CONFIG.CELL.HARD_WALL;
                }
                // Interior pillar pattern
                else if (r % 2 === 0 && c % 2 === 0) {
                    this.cells[r][c] = CONFIG.CELL.HARD_WALL;
                }
            }
        }

        // Compute how many soft blocks to place
        let emptyCount = 0;
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                if (this.cells[r][c] === CONFIG.CELL.EMPTY) emptyCount++;
            }
        }

        // Reserve player start area (top-left 3 cells)
        const reserved = [
            { r: 1, c: 1 },
            { r: 1, c: 2 },
            { r: 2, c: 1 },
        ];

        const maxSoftBlocks = Math.floor(emptyCount * CONFIG.DIFFICULTY.MAX_SOFT_BLOCK_RATIO);
        const targetSoftBlocks = Math.min(
            CONFIG.DIFFICULTY.BASE_SOFT_BLOCKS + level * 2,
            maxSoftBlocks
        );

        // Collect candidate positions for soft blocks
        const candidates = [];
        for (let r = 1; r < rows - 1; r++) {
            for (let c = 1; c < cols - 1; c++) {
                if (this.cells[r][c] !== CONFIG.CELL.EMPTY) continue;
                if (reserved.some(p => p.r === r && p.c === c)) continue;
                candidates.push({ r, c });
            }
        }

        // Shuffle candidates
        for (let i = candidates.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
        }

        // Place soft blocks
        const softBlockPositions = [];
        for (let i = 0; i < Math.min(targetSoftBlocks, candidates.length); i++) {
            const { r, c } = candidates[i];
            this.cells[r][c] = CONFIG.CELL.SOFT_BLOCK;
            softBlockPositions.push({ r, c });
        }

        // Place door under a random soft block
        if (softBlockPositions.length > 0) {
            const doorIdx = Math.floor(Math.random() * softBlockPositions.length);
            this.doorPos = softBlockPositions[doorIdx];
        }

        // Place power-ups under random soft blocks (excluding door block)
        this.powerUpPositions = [];
        const puCandidates = softBlockPositions.filter(
            p => !this.doorPos || !(p.r === this.doorPos.r && p.c === this.doorPos.c)
        );
        // Shuffle
        for (let i = puCandidates.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [puCandidates[i], puCandidates[j]] = [puCandidates[j], puCandidates[i]];
        }
        const puCount = Math.min(CONFIG.POWERUPS_PER_LEVEL, puCandidates.length);
        for (let i = 0; i < puCount; i++) {
            this.powerUpPositions.push({
                r: puCandidates[i].r,
                c: puCandidates[i].c,
                type: this._randomPowerUpType(),
            });
        }
    }

    _randomPowerUpType() {
        const weights = CONFIG.POWERUP_WEIGHTS;
        const types = Object.keys(weights);
        const totalWeight = types.reduce((sum, t) => sum + weights[t], 0);
        let rand = Math.random() * totalWeight;
        for (const t of types) {
            rand -= weights[t];
            if (rand <= 0) return t;
        }
        return types[0];
    }

    getCell(r, c) {
        if (r < 0 || r >= CONFIG.GRID_ROWS || c < 0 || c >= CONFIG.GRID_COLS) {
            return CONFIG.CELL.HARD_WALL;
        }
        return this.cells[r][c];
    }

    setCell(r, c, value) {
        if (r >= 0 && r < CONFIG.GRID_ROWS && c >= 0 && c < CONFIG.GRID_COLS) {
            this.cells[r][c] = value;
        }
    }

    isWalkable(r, c, wallPass = false) {
        const cell = this.getCell(r, c);
        if (cell === CONFIG.CELL.HARD_WALL) return false;
        if (cell === CONFIG.CELL.SOFT_BLOCK && !wallPass) return false;
        return true;
    }

    isDoor(r, c) {
        return this.doorPos && this.doorPos.r === r && this.doorPos.c === c;
    }

    getPowerUpAt(r, c) {
        return this.powerUpPositions.find(p => p.r === r && p.c === c);
    }

    removePowerUp(r, c) {
        this.powerUpPositions = this.powerUpPositions.filter(
            p => !(p.r === r && p.c === c)
        );
    }

    draw() {
        if (this.graphics) this.graphics.destroy();
        this.graphics = this.scene.add.graphics();
        this.graphics.setDepth(0);

        const ts = CONFIG.TILE_SIZE;
        const ox = CONFIG.OFFSET_X;
        const oy = CONFIG.OFFSET_Y;

        for (let r = 0; r < CONFIG.GRID_ROWS; r++) {
            for (let c = 0; c < CONFIG.GRID_COLS; c++) {
                const x = ox + c * ts;
                const y = oy + r * ts;
                const cell = this.cells[r][c];

                // Draw floor (checkered)
                const floorColor = (r + c) % 2 === 0 ? CONFIG.COLORS.FLOOR_A : CONFIG.COLORS.FLOOR_B;
                this.graphics.fillStyle(floorColor, 1);
                this.graphics.fillRect(x, y, ts, ts);

                if (cell === CONFIG.CELL.HARD_WALL) {
                    // Hard wall with 3D bevel
                    this.graphics.fillStyle(CONFIG.COLORS.HARD_WALL, 1);
                    this.graphics.fillRect(x, y, ts, ts);
                    this.graphics.fillStyle(CONFIG.COLORS.HARD_WALL_LIGHT, 1);
                    this.graphics.fillRect(x, y, ts, 2);
                    this.graphics.fillRect(x, y, 2, ts);
                    this.graphics.fillStyle(0x424242, 1);
                    this.graphics.fillRect(x + ts - 2, y, 2, ts);
                    this.graphics.fillRect(x, y + ts - 2, ts, 2);
                } else if (cell === CONFIG.CELL.SOFT_BLOCK) {
                    // Soft block with brick pattern
                    this.graphics.fillStyle(CONFIG.COLORS.SOFT_BLOCK, 1);
                    this.graphics.fillRect(x + 1, y + 1, ts - 2, ts - 2);
                    this.graphics.fillStyle(CONFIG.COLORS.SOFT_BLOCK_LIGHT, 1);
                    this.graphics.fillRect(x + 1, y + 1, ts - 2, 2);
                    this.graphics.fillRect(x + 1, y + 1, 2, ts - 2);
                    // Brick lines
                    this.graphics.lineStyle(1, 0x6D4C41, 0.5);
                    this.graphics.lineBetween(x + 1, y + ts / 2, x + ts - 1, y + ts / 2);
                    this.graphics.lineBetween(x + ts / 2, y + 1, x + ts / 2, y + ts / 2);
                    this.graphics.lineBetween(x + ts / 4, y + ts / 2, x + ts / 4, y + ts - 1);
                    this.graphics.lineBetween(x + ts * 3 / 4, y + ts / 2, x + ts * 3 / 4, y + ts - 1);
                }
            }
        }
    }

    getEmptyPositions() {
        const positions = [];
        for (let r = 1; r < CONFIG.GRID_ROWS - 1; r++) {
            for (let c = 1; c < CONFIG.GRID_COLS - 1; c++) {
                if (this.cells[r][c] === CONFIG.CELL.EMPTY) {
                    positions.push({ r, c });
                }
            }
        }
        return positions;
    }

    toPixel(r, c) {
        return {
            x: CONFIG.OFFSET_X + c * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE / 2,
            y: CONFIG.OFFSET_Y + r * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE / 2,
        };
    }

    toGrid(x, y) {
        return {
            c: Math.floor((x - CONFIG.OFFSET_X) / CONFIG.TILE_SIZE),
            r: Math.floor((y - CONFIG.OFFSET_Y) / CONFIG.TILE_SIZE),
        };
    }
}
