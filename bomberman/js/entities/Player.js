// Bomberman Player Entity
class Player {
    constructor(scene, gridRow, gridCol) {
        this.scene = scene;
        this.gridRow = gridRow;
        this.gridCol = gridCol;
        this.graphics = null;
        this.alive = true;
        this.invincible = false;
        this.invincibleTimer = 0;
        this.blinkOn = true;

        // Stats (can be modified by power-ups)
        this.maxBombs = CONFIG.PLAYER.DEFAULT_BOMBS;
        this.bombRange = CONFIG.PLAYER.DEFAULT_RANGE;
        this.speed = CONFIG.PLAYER.DEFAULT_SPEED;
        this.wallPass = false;
        this.bombPass = false;
        this.activeBombs = 0;

        // Movement
        this.moving = false;
        this.moveProgress = 0;
        this.moveFromRow = gridRow;
        this.moveFromCol = gridCol;
        this.moveToRow = gridRow;
        this.moveToCol = gridCol;
        this.facing = 'down';

        this._createGraphics();
    }

    _createGraphics() {
        const pos = this.scene.grid.toPixel(this.gridRow, this.gridCol);
        this.graphics = this.scene.add.graphics();
        this.graphics.setDepth(5);
        this._drawAt(pos.x, pos.y);
    }

    _drawAt(x, y) {
        this.graphics.clear();
        if (!this.alive) return;

        // Blink during invincibility
        if (this.invincible && !this.blinkOn) return;

        const ts = CONFIG.TILE_SIZE;
        const half = ts / 2;
        const bodyR = half * 0.7;

        // Body (white circle)
        this.graphics.fillStyle(CONFIG.COLORS.PLAYER, 1);
        this.graphics.fillCircle(x, y, bodyR);

        // Outline
        this.graphics.lineStyle(2, 0x333333, 1);
        this.graphics.strokeCircle(x, y, bodyR);

        // Visor / face direction
        let vx = x, vy = y;
        const vOff = bodyR * 0.3;
        if (this.facing === 'up') vy -= vOff;
        else if (this.facing === 'down') vy += vOff;
        else if (this.facing === 'left') vx -= vOff;
        else if (this.facing === 'right') vx += vOff;

        this.graphics.fillStyle(CONFIG.COLORS.PLAYER_VISOR, 1);
        this.graphics.fillCircle(vx, vy, bodyR * 0.35);

        // Eyes
        this.graphics.fillStyle(0x000000, 1);
        if (this.facing === 'up' || this.facing === 'down') {
            this.graphics.fillCircle(vx - bodyR * 0.15, vy - bodyR * 0.05, 2);
            this.graphics.fillCircle(vx + bodyR * 0.15, vy - bodyR * 0.05, 2);
        } else {
            this.graphics.fillCircle(vx, vy - bodyR * 0.15, 2);
            this.graphics.fillCircle(vx, vy + bodyR * 0.15, 2);
        }
    }

    tryMove(dr, dc) {
        if (!this.alive || this.moving) return false;

        const newR = this.gridRow + dr;
        const newC = this.gridCol + dc;

        // Check grid walkability
        if (!this.scene.grid.isWalkable(newR, newC, this.wallPass)) return false;

        // Check if bomb blocks the cell (unless bomb-pass)
        if (!this.bombPass && this.scene.isBombAt(newR, newC)) return false;

        // Set facing direction
        if (dr === -1) this.facing = 'up';
        else if (dr === 1) this.facing = 'down';
        else if (dc === -1) this.facing = 'left';
        else if (dc === 1) this.facing = 'right';

        // Start smooth movement
        this.moving = true;
        this.moveProgress = 0;
        this.moveFromRow = this.gridRow;
        this.moveFromCol = this.gridCol;
        this.moveToRow = newR;
        this.moveToCol = newC;
        this.gridRow = newR;
        this.gridCol = newC;

        return true;
    }

    update(delta) {
        if (!this.alive) return;

        // Invincibility timer
        if (this.invincible) {
            this.invincibleTimer -= delta;
            this.blinkOn = Math.floor(this.invincibleTimer / 100) % 2 === 0;
            if (this.invincibleTimer <= 0) {
                this.invincible = false;
                this.blinkOn = true;
            }
        }

        // Smooth movement
        if (this.moving) {
            const moveDuration = 1000 / this.speed; // ms to traverse one tile
            this.moveProgress += delta / moveDuration;
            if (this.moveProgress >= 1) {
                this.moveProgress = 1;
                this.moving = false;
            }
        }

        // Compute visual position
        const fromPos = this.scene.grid.toPixel(this.moveFromRow, this.moveFromCol);
        const toPos = this.scene.grid.toPixel(this.moving ? this.moveToRow : this.gridRow, this.moving ? this.moveToCol : this.gridCol);
        const t = this.moving ? this.moveProgress : 1;
        const px = fromPos.x + (toPos.x - fromPos.x) * t;
        const py = fromPos.y + (toPos.y - fromPos.y) * t;

        this._drawAt(px, py);
    }

    placeBomb() {
        if (!this.alive) return false;
        if (this.activeBombs >= this.maxBombs) return false;
        return true; // Scene will handle actual bomb creation
    }

    applyPowerUp(type) {
        switch (type) {
            case CONFIG.POWERUP.EXTRA_BOMB:
                this.maxBombs++;
                break;
            case CONFIG.POWERUP.BLAST_RANGE:
                this.bombRange++;
                break;
            case CONFIG.POWERUP.SPEED_UP:
                this.speed = Math.min(this.speed + 0.8, 8);
                break;
            case CONFIG.POWERUP.WALL_PASS:
                this.wallPass = true;
                break;
            case CONFIG.POWERUP.BOMB_PASS:
                this.bombPass = true;
                break;
        }
    }

    kill() {
        if (this.invincible) return false;
        this.alive = false;
        this.graphics.clear();
        return true;
    }

    respawn() {
        this.alive = true;
        this.gridRow = 1;
        this.gridCol = 1;
        this.moveFromRow = 1;
        this.moveFromCol = 1;
        this.moveToRow = 1;
        this.moveToCol = 1;
        this.moving = false;
        this.moveProgress = 0;
        this.invincible = true;
        this.invincibleTimer = 3000;
        this.facing = 'down';

        const pos = this.scene.grid.toPixel(this.gridRow, this.gridCol);
        this._drawAt(pos.x, pos.y);
    }

    destroy() {
        if (this.graphics) this.graphics.destroy();
    }
}
