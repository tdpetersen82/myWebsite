// Dig Dug - Pooka Enemy (round red monster that can ghost through dirt)

class Pooka {
    constructor(scene, grid, col, row) {
        this.scene = scene;
        this.grid = grid;
        this.type = 'pooka';

        // Grid position
        this.col = col;
        this.row = row;

        // Pixel position
        const pos = grid.gridToPixel(col, row);
        this.x = pos.x;
        this.y = pos.y;
        this.startCol = col;
        this.startRow = row;

        // Movement
        this.speed = CONFIG.POOKA_SPEED;
        this.direction = Math.random() < 0.5 ? 'left' : 'right';
        this.moving = true;
        this.moveTimer = 0;
        this.dirChangeTimer = 0;
        this.dirChangeCooldown = 500;

        // Ghost mode (can move through dirt)
        this.ghosting = false;
        this.ghostTimer = 0;
        this.ghostTarget = null;

        // Inflate state
        this.inflateLevel = 0;  // 0 = normal, 1-3 = inflating, 4 = popped
        this.deflateTimer = 0;
        this.alive = true;
        this.dying = false;
        this.deathTimer = 0;

        // Fleeing
        this.fleeing = false;

        // Animation
        this.animFrame = 0;
        this.animTimer = 0;
        this.bounceOffset = 0;

        // Graphics
        this.graphics = scene.add.graphics();
        this.graphics.setDepth(5);
    }

    update(delta, player, speedMult) {
        if (!this.alive) return;

        if (this.dying) {
            this.deathTimer -= delta;
            if (this.deathTimer <= 0) {
                this.alive = false;
            }
            this.draw();
            return;
        }

        // Handle inflate/deflate
        if (this.inflateLevel > 0) {
            this.deflateTimer += delta;
            if (this.deflateTimer >= CONFIG.PUMP_DEFLATE_TIME) {
                this.deflateTimer = 0;
                this.inflateLevel--;
            }
            // Don't move while inflated
            this.draw();
            return;
        }

        // Animation
        this.animTimer += delta;
        if (this.animTimer > 200) {
            this.animTimer = 0;
            this.animFrame = (this.animFrame + 1) % 2;
        }

        const currentSpeed = this.speed * speedMult * (this.fleeing ? CONFIG.FLEE_SPEED_MULT : 1);

        // Ghost mode logic
        if (this.ghosting) {
            this.updateGhosting(delta, player, currentSpeed);
        } else {
            this.updateNormalMovement(delta, player, currentSpeed);

            // Random chance to start ghosting toward player
            if (!this.fleeing && Math.random() < CONFIG.GHOST_CHANCE) {
                this.startGhosting(player);
            }
        }

        this.draw();
    }

    updateNormalMovement(delta, player, speed) {
        this.dirChangeTimer += delta;

        const moveAmount = speed * (delta / 1000);
        const dx = this.direction === 'right' ? 1 : this.direction === 'left' ? -1 : 0;
        const dy = this.direction === 'down' ? 1 : this.direction === 'up' ? -1 : 0;

        let newX = this.x + dx * moveAmount;
        let newY = this.y + dy * moveAmount;

        // Snap to grid axis
        if (dx !== 0) {
            const targetY = this.row * CONFIG.CELL_HEIGHT + CONFIG.CELL_HEIGHT / 2;
            newY = this.y + (targetY - this.y) * 0.3;
        }
        if (dy !== 0) {
            const targetX = this.col * CONFIG.CELL_WIDTH + CONFIG.CELL_WIDTH / 2;
            newX = this.x + (targetX - this.x) * 0.3;
        }

        // Check next grid cell
        const nextCol = Math.floor(newX / CONFIG.CELL_WIDTH);
        const nextRow = Math.floor(newY / CONFIG.CELL_HEIGHT);

        // Boundary check
        if (nextCol < 0 || nextCol >= CONFIG.GRID_COLS || nextRow < 0 || nextRow >= CONFIG.GRID_ROWS) {
            this.changeDirection(player);
            return;
        }

        // Can't move through dirt in normal mode
        if (this.grid.isDirt(nextRow, nextCol)) {
            this.changeDirection(player);
            return;
        }

        this.x = newX;
        this.y = newY;
        this.col = Math.floor(this.x / CONFIG.CELL_WIDTH);
        this.row = Math.floor(this.y / CONFIG.CELL_HEIGHT);

        // Random direction changes at intersections
        if (this.dirChangeTimer > this.dirChangeCooldown && this.isAtCellCenter()) {
            if (Math.random() < 0.3) {
                this.changeDirection(player);
            }
        }

        // Bounce animation
        this.bounceOffset = Math.sin(Date.now() * 0.008) * 2;
    }

    updateGhosting(delta, player, speed) {
        this.ghostTimer -= delta;

        if (this.ghostTimer <= 0) {
            this.ghosting = false;
            // Make sure we end up in a tunnel
            if (this.grid.isDirt(this.row, this.col)) {
                this.grid.digCell(this.row, this.col);
            }
            return;
        }

        // Move toward player through dirt
        const ghostSpeed = CONFIG.GHOST_SPEED * (delta / 1000);
        const dxToPlayer = player.x - this.x;
        const dyToPlayer = player.y - this.y;
        const dist = Math.sqrt(dxToPlayer * dxToPlayer + dyToPlayer * dyToPlayer);

        if (dist > 0) {
            this.x += (dxToPlayer / dist) * ghostSpeed;
            this.y += (dyToPlayer / dist) * ghostSpeed;
        }

        // Update grid position
        this.col = Math.floor(this.x / CONFIG.CELL_WIDTH);
        this.row = Math.floor(this.y / CONFIG.CELL_HEIGHT);

        // Stop ghosting if we reached a tunnel near the player
        if (this.grid.isEmpty(this.row, this.col) && dist < CONFIG.CELL_WIDTH * 3) {
            this.ghosting = false;
        }
    }

    startGhosting(player) {
        // Only ghost if there's dirt between us and the player
        const dist = Math.abs(player.col - this.col) + Math.abs(player.row - this.row);
        if (dist < 3 || dist > 10) return;

        this.ghosting = true;
        this.ghostTimer = CONFIG.GHOST_DURATION;
    }

    changeDirection(player) {
        this.dirChangeTimer = 0;

        const dirs = ['left', 'right', 'up', 'down'];
        const validDirs = [];

        for (const dir of dirs) {
            const dx = dir === 'right' ? 1 : dir === 'left' ? -1 : 0;
            const dy = dir === 'down' ? 1 : dir === 'up' ? -1 : 0;
            const checkCol = this.col + dx;
            const checkRow = this.row + dy;

            if (this.grid.isInBounds(checkRow, checkCol) && this.grid.isEmpty(checkRow, checkCol)) {
                validDirs.push(dir);
            }
        }

        if (validDirs.length === 0) {
            // Stuck - reverse
            const reverseMap = { left: 'right', right: 'left', up: 'down', down: 'up' };
            this.direction = reverseMap[this.direction];
            return;
        }

        if (this.fleeing) {
            // Prefer upward when fleeing
            if (validDirs.includes('up')) {
                this.direction = 'up';
                return;
            }
        }

        // Prefer direction toward player (50% chance) or random
        if (player && Math.random() < 0.5) {
            const dxP = player.col - this.col;
            const dyP = player.row - this.row;

            let preferred = null;
            if (Math.abs(dxP) > Math.abs(dyP)) {
                preferred = dxP > 0 ? 'right' : 'left';
            } else {
                preferred = dyP > 0 ? 'down' : 'up';
            }

            if (validDirs.includes(preferred)) {
                this.direction = preferred;
                return;
            }
        }

        // Random valid direction
        this.direction = validDirs[Math.floor(Math.random() * validDirs.length)];
    }

    isAtCellCenter() {
        const centerX = this.col * CONFIG.CELL_WIDTH + CONFIG.CELL_WIDTH / 2;
        const centerY = this.row * CONFIG.CELL_HEIGHT + CONFIG.CELL_HEIGHT / 2;
        return Math.abs(this.x - centerX) < 5 && Math.abs(this.y - centerY) < 5;
    }

    inflate() {
        if (!this.alive || this.dying) return false;
        this.inflateLevel++;
        this.deflateTimer = 0;

        if (this.inflateLevel >= CONFIG.MAX_INFLATE) {
            this.pop();
            return true;
        }
        return false;
    }

    pop() {
        this.dying = true;
        this.deathTimer = 300;
        if (this.scene.audio) {
            this.scene.audio.playPop();
        }
    }

    crush() {
        this.dying = true;
        this.deathTimer = 200;
        this.alive = true; // will be set to false when timer expires
    }

    startFleeing() {
        this.fleeing = true;
        this.ghosting = false;
    }

    getScoreValue() {
        const layer = this.grid.getDepthLayer(this.row);
        switch (layer) {
            case 1: return CONFIG.SCORE.PUMP_KILL_LAYER1;
            case 2: return CONFIG.SCORE.PUMP_KILL_LAYER2;
            case 3: return CONFIG.SCORE.PUMP_KILL_LAYER3;
            case 4: return CONFIG.SCORE.PUMP_KILL_LAYER4;
            default: return CONFIG.SCORE.PUMP_KILL_LAYER1;
        }
    }

    draw() {
        this.graphics.clear();
        if (!this.alive) return;

        const cx = this.x;
        const cy = this.y + this.bounceOffset;
        const s = CONFIG.CELL_WIDTH * 0.4;

        if (this.dying) {
            // Pop animation - expand and fade
            const progress = 1 - (this.deathTimer / 300);
            const scale = 1 + progress * 2;
            const alpha = 1 - progress;
            this.graphics.fillStyle(CONFIG.COLORS.POOKA, alpha);
            this.graphics.fillCircle(cx, cy, s * scale);
            return;
        }

        if (this.ghosting) {
            // Semi-transparent when ghosting
            this.drawBody(cx, cy, s, 0.5);
            return;
        }

        if (this.inflateLevel > 0) {
            this.drawInflated(cx, cy, s);
            return;
        }

        this.drawBody(cx, cy, s, 1);
    }

    drawBody(cx, cy, s, alpha) {
        const g = this.graphics;

        // Round red body
        g.fillStyle(CONFIG.COLORS.POOKA, alpha);
        g.fillCircle(cx, cy, s);

        // Goggles/eyes
        g.fillStyle(CONFIG.COLORS.POOKA_GOGGLE, alpha);
        const eyeDir = this.direction === 'left' ? -1 : 1;
        g.fillCircle(cx + eyeDir * s * 0.2 - s * 0.15, cy - s * 0.15, s * 0.22);
        g.fillCircle(cx + eyeDir * s * 0.2 + s * 0.15, cy - s * 0.15, s * 0.22);

        // Pupils
        g.fillStyle(0x000000, alpha);
        g.fillCircle(cx + eyeDir * s * 0.3 - s * 0.15, cy - s * 0.15, s * 0.08);
        g.fillCircle(cx + eyeDir * s * 0.3 + s * 0.15, cy - s * 0.15, s * 0.08);

        // Feet (small bumps at bottom)
        g.fillStyle(CONFIG.COLORS.POOKA, alpha);
        const footAnim = this.animFrame === 0 ? 1 : -1;
        g.fillCircle(cx - s * 0.4 + footAnim * 2, cy + s * 0.8, s * 0.25);
        g.fillCircle(cx + s * 0.4 - footAnim * 2, cy + s * 0.8, s * 0.25);
    }

    drawInflated(cx, cy, s) {
        const g = this.graphics;
        const inflate = this.inflateLevel;

        // Get progressively larger and lighter
        const scale = 1 + inflate * 0.35;
        const colors = [CONFIG.COLORS.POOKA, CONFIG.COLORS.INFLATED_1, CONFIG.COLORS.INFLATED_2, CONFIG.COLORS.INFLATED_3];
        const color = colors[Math.min(inflate, colors.length - 1)];

        g.fillStyle(color, 1);
        g.fillCircle(cx, cy, s * scale);

        // Strained eyes
        g.fillStyle(CONFIG.COLORS.POOKA_GOGGLE, 1);
        g.fillCircle(cx - s * 0.2 * scale, cy - s * 0.15, s * 0.2);
        g.fillCircle(cx + s * 0.2 * scale, cy - s * 0.15, s * 0.2);

        // X eyes if about to pop
        if (inflate >= 3) {
            g.lineStyle(2, 0x000000, 1);
            const es = s * 0.12;
            // Left X
            g.beginPath();
            g.moveTo(cx - s * 0.2 * scale - es, cy - s * 0.15 - es);
            g.lineTo(cx - s * 0.2 * scale + es, cy - s * 0.15 + es);
            g.strokePath();
            g.beginPath();
            g.moveTo(cx - s * 0.2 * scale + es, cy - s * 0.15 - es);
            g.lineTo(cx - s * 0.2 * scale - es, cy - s * 0.15 + es);
            g.strokePath();
            // Right X
            g.beginPath();
            g.moveTo(cx + s * 0.2 * scale - es, cy - s * 0.15 - es);
            g.lineTo(cx + s * 0.2 * scale + es, cy - s * 0.15 + es);
            g.strokePath();
            g.beginPath();
            g.moveTo(cx + s * 0.2 * scale + es, cy - s * 0.15 - es);
            g.lineTo(cx + s * 0.2 * scale - es, cy - s * 0.15 + es);
            g.strokePath();
        } else {
            g.fillStyle(0x000000, 1);
            g.fillCircle(cx - s * 0.2 * scale, cy - s * 0.15, s * 0.07);
            g.fillCircle(cx + s * 0.2 * scale, cy - s * 0.15, s * 0.07);
        }
    }

    destroy() {
        this.graphics.destroy();
    }
}
