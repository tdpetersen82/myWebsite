// Bomberman Enemy Entity
class Enemy {
    constructor(scene, gridRow, gridCol, type) {
        this.scene = scene;
        this.gridRow = gridRow;
        this.gridCol = gridCol;
        this.type = type;
        this.alive = true;
        this.graphics = null;

        // Movement
        this.moving = false;
        this.moveProgress = 0;
        this.moveFromRow = gridRow;
        this.moveFromCol = gridCol;
        this.moveToRow = gridRow;
        this.moveToCol = gridCol;
        this.moveTimer = 0;
        this.direction = { dr: 0, dc: 1 }; // Start moving right

        // Type-specific properties
        switch (type) {
            case CONFIG.ENEMY_TYPE.BALLOM:
                this.speed = CONFIG.ENEMY.BALLOM_SPEED;
                this.color = CONFIG.COLORS.BALLOM;
                this.score = CONFIG.SCORE.BALLOM;
                this.moveInterval = CONFIG.ENEMY.MOVE_INTERVAL_BASE;
                this.chases = false;
                break;
            case CONFIG.ENEMY_TYPE.ONEAL:
                this.speed = CONFIG.ENEMY.ONEAL_SPEED;
                this.color = CONFIG.COLORS.ONEAL;
                this.score = CONFIG.SCORE.ONEAL;
                this.moveInterval = CONFIG.ENEMY.MOVE_INTERVAL_BASE * 0.8;
                this.chases = true;
                break;
            case CONFIG.ENEMY_TYPE.DAHL:
                this.speed = CONFIG.ENEMY.DAHL_SPEED;
                this.color = CONFIG.COLORS.DAHL;
                this.score = CONFIG.SCORE.DAHL;
                this.moveInterval = CONFIG.ENEMY.MOVE_INTERVAL_BASE * 0.6;
                this.chases = false;
                break;
        }

        this._createGraphics();
    }

    _createGraphics() {
        this.graphics = this.scene.add.graphics();
        this.graphics.setDepth(4);
    }

    applyDifficultyScale(level) {
        const speedMult = 1 + (level - 1) * CONFIG.DIFFICULTY.SPEED_MULTIPLIER_PER_LEVEL;
        this.speed *= speedMult;
        this.moveInterval /= speedMult;
    }

    update(delta, playerRow, playerCol) {
        if (!this.alive) return;

        // Handle smooth movement
        if (this.moving) {
            const moveDuration = 1000 / this.speed;
            this.moveProgress += delta / moveDuration;
            if (this.moveProgress >= 1) {
                this.moveProgress = 1;
                this.moving = false;
                this.gridRow = this.moveToRow;
                this.gridCol = this.moveToCol;
            }
        }

        // Movement decision timer
        if (!this.moving) {
            this.moveTimer += delta;
            if (this.moveTimer >= this.moveInterval) {
                this.moveTimer = 0;
                this._decideMove(playerRow, playerCol);
            }
        }

        // Draw at interpolated position
        const fromPos = this.scene.grid.toPixel(this.moveFromRow, this.moveFromCol);
        const toPos = this.scene.grid.toPixel(this.moveToRow, this.moveToCol);
        const t = this.moving ? this.moveProgress : 1;
        const px = fromPos.x + (toPos.x - fromPos.x) * t;
        const py = fromPos.y + (toPos.y - fromPos.y) * t;

        this._drawAt(px, py);
    }

    _decideMove(playerRow, playerCol) {
        const directions = [
            { dr: -1, dc: 0 },
            { dr: 1, dc: 0 },
            { dr: 0, dc: -1 },
            { dr: 0, dc: 1 },
        ];

        // Filter valid directions
        const valid = directions.filter(d => {
            const nr = this.gridRow + d.dr;
            const nc = this.gridCol + d.dc;
            return this.scene.grid.isWalkable(nr, nc, false) &&
                   !this.scene.isBombAt(nr, nc);
        });

        if (valid.length === 0) return;

        let chosen;

        if (this.chases && Math.random() < CONFIG.ENEMY.CHASE_PROBABILITY) {
            // Oneal: try to move toward player
            chosen = this._chaseDirection(valid, playerRow, playerCol);
        } else if (this.type === CONFIG.ENEMY_TYPE.DAHL) {
            // Dahl: fast random, prefers current direction
            const sameDir = valid.find(d =>
                d.dr === this.direction.dr && d.dc === this.direction.dc
            );
            if (sameDir && Math.random() < 0.6) {
                chosen = sameDir;
            } else {
                chosen = valid[Math.floor(Math.random() * valid.length)];
            }
        } else {
            // Ballom: pure random
            chosen = valid[Math.floor(Math.random() * valid.length)];
        }

        if (chosen) {
            this.direction = chosen;
            this.moving = true;
            this.moveProgress = 0;
            this.moveFromRow = this.gridRow;
            this.moveFromCol = this.gridCol;
            this.moveToRow = this.gridRow + chosen.dr;
            this.moveToCol = this.gridCol + chosen.dc;
        }
    }

    _chaseDirection(valid, playerRow, playerCol) {
        // Sort by distance to player
        valid.sort((a, b) => {
            const distA = Math.abs(this.gridRow + a.dr - playerRow) +
                          Math.abs(this.gridCol + a.dc - playerCol);
            const distB = Math.abs(this.gridRow + b.dr - playerRow) +
                          Math.abs(this.gridCol + b.dc - playerCol);
            return distA - distB;
        });
        return valid[0];
    }

    _drawAt(x, y) {
        this.graphics.clear();
        if (!this.alive) return;

        const ts = CONFIG.TILE_SIZE;
        const r = ts * 0.38;

        // Body - blob shape
        this.graphics.fillStyle(this.color, 1);

        // Main body (rounded top, wavy bottom)
        this.graphics.fillCircle(x, y - r * 0.2, r);
        this.graphics.fillRect(x - r, y - r * 0.2, r * 2, r * 0.8);

        // Wavy bottom (feet-like bumps)
        const bumpR = r * 0.3;
        const bumpY = y + r * 0.6;
        this.graphics.fillCircle(x - r * 0.6, bumpY, bumpR);
        this.graphics.fillCircle(x, bumpY, bumpR);
        this.graphics.fillCircle(x + r * 0.6, bumpY, bumpR);

        // Eyes
        this.graphics.fillStyle(0xFFFFFF, 1);
        this.graphics.fillCircle(x - r * 0.3, y - r * 0.3, r * 0.25);
        this.graphics.fillCircle(x + r * 0.3, y - r * 0.3, r * 0.25);

        // Pupils
        this.graphics.fillStyle(0x000000, 1);
        this.graphics.fillCircle(x - r * 0.2, y - r * 0.25, r * 0.12);
        this.graphics.fillCircle(x + r * 0.4, y - r * 0.25, r * 0.12);

        // Type-specific features
        if (this.type === CONFIG.ENEMY_TYPE.ONEAL) {
            // Angry eyebrows
            this.graphics.lineStyle(2, 0x000000, 1);
            this.graphics.lineBetween(x - r * 0.5, y - r * 0.55, x - r * 0.1, y - r * 0.45);
            this.graphics.lineBetween(x + r * 0.1, y - r * 0.45, x + r * 0.5, y - r * 0.55);
        } else if (this.type === CONFIG.ENEMY_TYPE.DAHL) {
            // Spiky top
            this.graphics.fillStyle(this.color, 1);
            for (let i = -2; i <= 2; i++) {
                const sx = x + i * r * 0.3;
                this.graphics.fillTriangle(
                    sx - r * 0.1, y - r * 0.8,
                    sx + r * 0.1, y - r * 0.8,
                    sx, y - r * 1.2
                );
            }
        }
    }

    kill() {
        this.alive = false;
        this.graphics.clear();
        return this.score;
    }

    getCurrentRow() {
        return this.moving ? this.moveToRow : this.gridRow;
    }

    getCurrentCol() {
        return this.moving ? this.moveToCol : this.gridCol;
    }

    getVisualRow() {
        if (!this.moving) return this.gridRow;
        return this.moveFromRow + (this.moveToRow - this.moveFromRow) * this.moveProgress;
    }

    getVisualCol() {
        if (!this.moving) return this.gridCol;
        return this.moveFromCol + (this.moveToCol - this.moveFromCol) * this.moveProgress;
    }

    destroy() {
        if (this.graphics) this.graphics.destroy();
    }
}
