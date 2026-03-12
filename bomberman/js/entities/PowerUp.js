// Bomberman Power-Up Entity
class PowerUp {
    constructor(scene, gridRow, gridCol, type) {
        this.scene = scene;
        this.gridRow = gridRow;
        this.gridCol = gridCol;
        this.type = type;
        this.collected = false;
        this.graphics = null;
        this.elapsed = 0;

        this._createGraphics();
    }

    _createGraphics() {
        this.graphics = this.scene.add.graphics();
        this.graphics.setDepth(2);
    }

    update(delta) {
        if (this.collected) return;
        this.elapsed += delta;
        this._draw();
    }

    _draw() {
        this.graphics.clear();
        if (this.collected) return;

        const pos = this.scene.grid.toPixel(this.gridRow, this.gridCol);
        const ts = CONFIG.TILE_SIZE;
        const pulse = 1 + 0.1 * Math.sin(this.elapsed * 0.005);
        const r = ts * 0.3 * pulse;

        // Background glow
        this.graphics.fillStyle(0xFFFFFF, 0.3);
        this.graphics.fillCircle(pos.x, pos.y, r * 1.3);

        // Background circle
        this.graphics.fillStyle(0xFFFFFF, 0.9);
        this.graphics.fillCircle(pos.x, pos.y, r);

        // Icon based on type
        const color = this._getColor();
        this.graphics.fillStyle(color, 1);

        switch (this.type) {
            case CONFIG.POWERUP.EXTRA_BOMB:
                // Small bomb icon
                this.graphics.fillCircle(pos.x, pos.y + 1, r * 0.55);
                this.graphics.lineStyle(2, 0xFF9800, 1);
                this.graphics.lineBetween(pos.x, pos.y - r * 0.3, pos.x + r * 0.3, pos.y - r * 0.6);
                break;

            case CONFIG.POWERUP.BLAST_RANGE:
                // Plus / cross icon
                this.graphics.fillRect(pos.x - r * 0.15, pos.y - r * 0.5, r * 0.3, r);
                this.graphics.fillRect(pos.x - r * 0.5, pos.y - r * 0.15, r, r * 0.3);
                break;

            case CONFIG.POWERUP.SPEED_UP:
                // Arrow / lightning bolt
                this.graphics.fillTriangle(
                    pos.x - r * 0.4, pos.y,
                    pos.x + r * 0.1, pos.y - r * 0.5,
                    pos.x + r * 0.1, pos.y - r * 0.1
                );
                this.graphics.fillTriangle(
                    pos.x - r * 0.1, pos.y + r * 0.1,
                    pos.x - r * 0.1, pos.y + r * 0.5,
                    pos.x + r * 0.4, pos.y
                );
                break;

            case CONFIG.POWERUP.WALL_PASS:
                // Ghost-like shape
                this.graphics.fillCircle(pos.x, pos.y - r * 0.1, r * 0.4);
                this.graphics.fillRect(pos.x - r * 0.4, pos.y - r * 0.1, r * 0.8, r * 0.4);
                // Eyes
                this.graphics.fillStyle(0xFFFFFF, 1);
                this.graphics.fillCircle(pos.x - r * 0.15, pos.y - r * 0.15, r * 0.1);
                this.graphics.fillCircle(pos.x + r * 0.15, pos.y - r * 0.15, r * 0.1);
                break;

            case CONFIG.POWERUP.BOMB_PASS:
                // Shield-like shape
                this.graphics.lineStyle(3, color, 1);
                this.graphics.strokeCircle(pos.x, pos.y, r * 0.5);
                this.graphics.fillStyle(color, 0.5);
                this.graphics.fillCircle(pos.x, pos.y, r * 0.3);
                break;
        }

        // Border
        this.graphics.lineStyle(1, 0x333333, 0.5);
        this.graphics.strokeCircle(pos.x, pos.y, r);
    }

    _getColor() {
        switch (this.type) {
            case CONFIG.POWERUP.EXTRA_BOMB: return CONFIG.COLORS.PU_BOMB;
            case CONFIG.POWERUP.BLAST_RANGE: return CONFIG.COLORS.PU_RANGE;
            case CONFIG.POWERUP.SPEED_UP: return CONFIG.COLORS.PU_SPEED;
            case CONFIG.POWERUP.WALL_PASS: return CONFIG.COLORS.PU_WALLPASS;
            case CONFIG.POWERUP.BOMB_PASS: return CONFIG.COLORS.PU_BOMBPASS;
            default: return 0xFFFFFF;
        }
    }

    getLabel() {
        switch (this.type) {
            case CONFIG.POWERUP.EXTRA_BOMB: return 'BOMB+';
            case CONFIG.POWERUP.BLAST_RANGE: return 'RANGE+';
            case CONFIG.POWERUP.SPEED_UP: return 'SPEED+';
            case CONFIG.POWERUP.WALL_PASS: return 'WALL PASS';
            case CONFIG.POWERUP.BOMB_PASS: return 'BOMB PASS';
            default: return '';
        }
    }

    collect() {
        this.collected = true;
        this.graphics.clear();
    }

    destroy() {
        if (this.graphics) this.graphics.destroy();
    }
}
