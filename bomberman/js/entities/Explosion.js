// Bomberman Explosion Entity - Cross-shaped blast
class Explosion {
    constructor(scene, gridRow, gridCol, range) {
        this.scene = scene;
        this.gridRow = gridRow;
        this.gridCol = gridCol;
        this.range = range;
        this.duration = CONFIG.EXPLOSION.DURATION;
        this.elapsed = 0;
        this.done = false;
        this.graphics = null;
        this.affectedCells = [];

        this._computeAffectedCells();
        this._createGraphics();
    }

    _computeAffectedCells() {
        // Center cell
        this.affectedCells.push({ r: this.gridRow, c: this.gridCol });

        // Four directions
        const directions = [
            { dr: -1, dc: 0 },  // up
            { dr: 1, dc: 0 },   // down
            { dr: 0, dc: -1 },  // left
            { dr: 0, dc: 1 },   // right
        ];

        for (const dir of directions) {
            for (let i = 1; i <= this.range; i++) {
                const r = this.gridRow + dir.dr * i;
                const c = this.gridCol + dir.dc * i;
                const cell = this.scene.grid.getCell(r, c);

                if (cell === CONFIG.CELL.HARD_WALL) {
                    break; // Blocked by hard wall
                }

                this.affectedCells.push({ r, c });

                if (cell === CONFIG.CELL.SOFT_BLOCK) {
                    // Destroy the soft block
                    this.scene.destroySoftBlock(r, c);
                    break; // Explosion stops at soft block
                }
            }
        }

        // Check for chain reactions (bombs in affected cells)
        for (const cell of this.affectedCells) {
            this.scene.chainDetonateBomb(cell.r, cell.c);
        }
    }

    _createGraphics() {
        this.graphics = this.scene.add.graphics();
        this.graphics.setDepth(8);
    }

    update(delta) {
        if (this.done) return;

        this.elapsed += delta;
        const progress = this.elapsed / this.duration;

        if (progress >= 1) {
            this.done = true;
            this.graphics.clear();
            return;
        }

        this._draw(progress);
    }

    _draw(progress) {
        this.graphics.clear();

        const ts = CONFIG.TILE_SIZE;
        const alpha = progress < 0.5 ? 1 : 1 - (progress - 0.5) * 2;
        const scale = progress < 0.3 ? progress / 0.3 : 1;

        for (const cell of this.affectedCells) {
            const pos = this.scene.grid.toPixel(cell.r, cell.c);
            const isCenter = cell.r === this.gridRow && cell.c === this.gridCol;
            const halfSize = ts * 0.45 * scale;

            // Outer glow
            this.graphics.fillStyle(CONFIG.COLORS.EXPLOSION, alpha * 0.7);
            this.graphics.fillRect(
                pos.x - halfSize, pos.y - halfSize,
                halfSize * 2, halfSize * 2
            );

            // Inner bright core
            const innerSize = halfSize * 0.6;
            this.graphics.fillStyle(
                isCenter ? CONFIG.COLORS.EXPLOSION_CENTER : 0xFFA726,
                alpha
            );
            this.graphics.fillRect(
                pos.x - innerSize, pos.y - innerSize,
                innerSize * 2, innerSize * 2
            );

            // Center white hot
            if (isCenter) {
                const coreSize = halfSize * 0.3;
                this.graphics.fillStyle(0xFFFFFF, alpha);
                this.graphics.fillRect(
                    pos.x - coreSize, pos.y - coreSize,
                    coreSize * 2, coreSize * 2
                );
            }
        }
    }

    isAffecting(r, c) {
        if (this.done) return false;
        return this.affectedCells.some(cell => cell.r === r && cell.c === c);
    }

    destroy() {
        if (this.graphics) this.graphics.destroy();
    }
}
