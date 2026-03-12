// ============================================================
// Q*bert — Pyramid Entity
// Isometric pyramid of cubes with color state tracking
// ============================================================

class Pyramid {
    constructor(scene) {
        this.scene = scene;
        this.rows = CONFIG.PYRAMID_ROWS;
        this.cubeWidth = CONFIG.CUBE_WIDTH;
        this.cubeHeight = CONFIG.CUBE_HEIGHT;
        this.cubeDepth = CONFIG.CUBE_DEPTH;
        this.offsetX = CONFIG.PYRAMID_OFFSET_X;
        this.offsetY = CONFIG.PYRAMID_OFFSET_Y;

        // cubes[row][col] = { colorState, graphics, screenX, screenY }
        this.cubes = [];
        this.graphics = scene.add.graphics();

        this.levelConfig = null;
        this.colorPalette = null;

        this._buildCubePositions();
    }

    _buildCubePositions() {
        this.cubes = [];
        for (let row = 0; row < this.rows; row++) {
            this.cubes[row] = [];
            for (let col = 0; col <= row; col++) {
                const pos = this.getCubeScreenPos(row, col);
                this.cubes[row][col] = {
                    colorState: 0,
                    screenX: pos.x,
                    screenY: pos.y
                };
            }
        }
    }

    // Convert grid (row, col) to isometric screen coordinates (top of cube)
    getCubeScreenPos(row, col) {
        const halfW = this.cubeWidth / 2;
        const x = this.offsetX + (col - row / 2) * this.cubeWidth;
        const y = this.offsetY + row * (this.cubeHeight + this.cubeDepth - 8);
        return { x, y };
    }

    // Get the center of the top face for character positioning
    getCubeTopCenter(row, col) {
        const pos = this.getCubeScreenPos(row, col);
        return {
            x: pos.x,
            y: pos.y - 10  // slight offset above cube top
        };
    }

    setLevel(level) {
        this.levelConfig = CONFIG.getLevelConfig(level);
        this.colorPalette = CONFIG.getColorPalette(level);
        // Reset all cube colors
        for (let row = 0; row < this.rows; row++) {
            for (let col = 0; col <= row; col++) {
                this.cubes[row][col].colorState = this.levelConfig.startColor;
            }
        }
    }

    // Land on cube, return { changed, scorePoints }
    landOnCube(row, col) {
        if (row < 0 || row >= this.rows || col < 0 || col > row) {
            return { changed: false, scorePoints: 0 };
        }

        const cube = this.cubes[row][col];
        const oldState = cube.colorState;

        if (cube.colorState < this.levelConfig.targetColor) {
            cube.colorState++;
            return { changed: true, scorePoints: CONFIG.SCORE_COLOR_CHANGE };
        } else if (this.levelConfig.revertsOnExtra && cube.colorState >= this.levelConfig.targetColor) {
            // Revert on extra hop
            cube.colorState = Math.max(0, cube.colorState - 1);
            return { changed: cube.colorState !== oldState, scorePoints: 0 };
        }

        return { changed: false, scorePoints: 0 };
    }

    // Revert a cube color (Slick/Sam effect)
    revertCube(row, col) {
        if (row < 0 || row >= this.rows || col < 0 || col > row) return false;
        const cube = this.cubes[row][col];
        if (cube.colorState > 0) {
            cube.colorState--;
            return true;
        }
        return false;
    }

    // Check if all cubes are at target color
    isLevelComplete() {
        for (let row = 0; row < this.rows; row++) {
            for (let col = 0; col <= row; col++) {
                if (this.cubes[row][col].colorState !== this.levelConfig.targetColor) {
                    return false;
                }
            }
        }
        return true;
    }

    // Count completed cubes
    getCompletionCount() {
        let count = 0;
        let total = 0;
        for (let row = 0; row < this.rows; row++) {
            for (let col = 0; col <= row; col++) {
                total++;
                if (this.cubes[row][col].colorState === this.levelConfig.targetColor) {
                    count++;
                }
            }
        }
        return { count, total };
    }

    // Check if position is valid on pyramid
    isValidPosition(row, col) {
        return row >= 0 && row < this.rows && col >= 0 && col <= row;
    }

    draw() {
        this.graphics.clear();

        for (let row = this.rows - 1; row >= 0; row--) {
            for (let col = 0; col <= row; col++) {
                this._drawCube(row, col);
            }
        }
    }

    _drawCube(row, col) {
        const cube = this.cubes[row][col];
        const x = cube.screenX;
        const y = cube.screenY;
        const halfW = this.cubeWidth / 2;
        const h = this.cubeHeight / 2;
        const d = this.cubeDepth;
        const palette = this.colorPalette[cube.colorState];
        const g = this.graphics;

        // Top face (diamond)
        g.fillStyle(palette.top, 1);
        g.beginPath();
        g.moveTo(x, y - h);          // top
        g.lineTo(x + halfW, y);       // right
        g.lineTo(x, y + h);           // bottom
        g.lineTo(x - halfW, y);       // left
        g.closePath();
        g.fillPath();

        // Left face
        g.fillStyle(palette.left, 1);
        g.beginPath();
        g.moveTo(x - halfW, y);       // top-left
        g.lineTo(x, y + h);           // top-right (bottom of top face)
        g.lineTo(x, y + h + d);       // bottom-right
        g.lineTo(x - halfW, y + d);   // bottom-left
        g.closePath();
        g.fillPath();

        // Right face
        g.fillStyle(palette.right, 1);
        g.beginPath();
        g.moveTo(x + halfW, y);       // top-right
        g.lineTo(x, y + h);           // top-left (bottom of top face)
        g.lineTo(x, y + h + d);       // bottom-left
        g.lineTo(x + halfW, y + d);   // bottom-right
        g.closePath();
        g.fillPath();

        // Outline edges
        g.lineStyle(1, 0x000000, 0.3);
        // Top face outline
        g.beginPath();
        g.moveTo(x, y - h);
        g.lineTo(x + halfW, y);
        g.lineTo(x, y + h);
        g.lineTo(x - halfW, y);
        g.closePath();
        g.strokePath();
        // Left face outline
        g.beginPath();
        g.moveTo(x - halfW, y);
        g.lineTo(x - halfW, y + d);
        g.lineTo(x, y + h + d);
        g.lineTo(x, y + h);
        g.closePath();
        g.strokePath();
        // Right face outline
        g.beginPath();
        g.moveTo(x + halfW, y);
        g.lineTo(x + halfW, y + d);
        g.lineTo(x, y + h + d);
        g.lineTo(x, y + h);
        g.closePath();
        g.strokePath();
    }

    destroy() {
        if (this.graphics) {
            this.graphics.destroy();
        }
    }
}
