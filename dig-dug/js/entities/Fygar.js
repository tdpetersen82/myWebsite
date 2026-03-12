// Dig Dug - Fygar Enemy (green dragon that breathes fire horizontally)

class Fygar {
    constructor(scene, grid, col, row) {
        this.scene = scene;
        this.grid = grid;
        this.type = 'fygar';

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
        this.speed = CONFIG.FYGAR_SPEED;
        this.direction = Math.random() < 0.5 ? 'left' : 'right';
        this.moving = true;
        this.dirChangeTimer = 0;
        this.dirChangeCooldown = 500;

        // Ghost mode
        this.ghosting = false;
        this.ghostTimer = 0;

        // Fire breathing
        this.fireActive = false;
        this.fireTimer = 0;
        this.fireCooldown = CONFIG.FIRE_COOLDOWN + Math.random() * 2000;
        this.fireDirection = 'right';
        this.fireCells = [];

        // Inflate state
        this.inflateLevel = 0;
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

        // Fire graphics (separate layer)
        this.fireGraphics = scene.add.graphics();
        this.fireGraphics.setDepth(8);
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

        // Fire cooldown
        this.fireCooldown -= delta;

        // Handle fire breathing
        if (this.fireActive) {
            this.fireTimer -= delta;
            if (this.fireTimer <= 0) {
                this.fireActive = false;
                this.fireCells = [];
                this.fireCooldown = CONFIG.FIRE_COOLDOWN + Math.random() * 2000;
            }
        }

        // Ghost mode
        if (this.ghosting) {
            this.updateGhosting(delta, player, currentSpeed);
        } else {
            this.updateNormalMovement(delta, player, currentSpeed);

            // Try to breathe fire
            if (!this.fleeing && !this.fireActive && this.fireCooldown <= 0) {
                this.tryBreatheFire(player);
            }

            // Random ghosting
            if (!this.fleeing && Math.random() < CONFIG.GHOST_CHANCE * 0.7) {
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

        const nextCol = Math.floor(newX / CONFIG.CELL_WIDTH);
        const nextRow = Math.floor(newY / CONFIG.CELL_HEIGHT);

        if (!this.grid.isInBounds(nextRow, nextCol) || this.grid.isDirt(nextRow, nextCol)) {
            this.changeDirection(player);
            return;
        }

        this.x = newX;
        this.y = newY;
        this.col = Math.floor(this.x / CONFIG.CELL_WIDTH);
        this.row = Math.floor(this.y / CONFIG.CELL_HEIGHT);

        if (this.dirChangeTimer > this.dirChangeCooldown && this.isAtCellCenter()) {
            if (Math.random() < 0.3) {
                this.changeDirection(player);
            }
        }

        this.bounceOffset = Math.sin(Date.now() * 0.008) * 2;
    }

    updateGhosting(delta, player, speed) {
        this.ghostTimer -= delta;

        if (this.ghostTimer <= 0) {
            this.ghosting = false;
            if (this.grid.isDirt(this.row, this.col)) {
                this.grid.digCell(this.row, this.col);
            }
            return;
        }

        const ghostSpeed = CONFIG.GHOST_SPEED * (delta / 1000);
        const dxToPlayer = player.x - this.x;
        const dyToPlayer = player.y - this.y;
        const dist = Math.sqrt(dxToPlayer * dxToPlayer + dyToPlayer * dyToPlayer);

        if (dist > 0) {
            this.x += (dxToPlayer / dist) * ghostSpeed;
            this.y += (dyToPlayer / dist) * ghostSpeed;
        }

        this.col = Math.floor(this.x / CONFIG.CELL_WIDTH);
        this.row = Math.floor(this.y / CONFIG.CELL_HEIGHT);

        if (this.grid.isEmpty(this.row, this.col) && dist < CONFIG.CELL_WIDTH * 3) {
            this.ghosting = false;
        }
    }

    startGhosting(player) {
        const dist = Math.abs(player.col - this.col) + Math.abs(player.row - this.row);
        if (dist < 3 || dist > 10) return;

        this.ghosting = true;
        this.ghostTimer = CONFIG.GHOST_DURATION;
    }

    tryBreatheFire(player) {
        // Only breathe fire horizontally when on same row as player
        if (Math.abs(player.row - this.row) > 0) return;

        const distCols = player.col - this.col;
        if (Math.abs(distCols) > CONFIG.FIRE_RANGE + 1 || Math.abs(distCols) < 1) return;

        this.fireDirection = distCols > 0 ? 'right' : 'left';
        this.fireActive = true;
        this.fireTimer = CONFIG.FIRE_DURATION;

        // Calculate fire cells
        this.fireCells = [];
        const dir = this.fireDirection === 'right' ? 1 : -1;
        for (let i = 1; i <= CONFIG.FIRE_RANGE; i++) {
            const fc = this.col + dir * i;
            if (!this.grid.isInBounds(this.row, fc)) break;
            if (this.grid.isDirt(this.row, fc)) break;
            this.fireCells.push({ col: fc, row: this.row });
        }

        if (this.scene.audio) {
            this.scene.audio.playFire();
        }
    }

    isFireAt(col, row) {
        if (!this.fireActive) return false;
        return this.fireCells.some(c => c.col === col && c.row === row);
    }

    changeDirection(player) {
        this.dirChangeTimer = 0;

        const dirs = ['left', 'right', 'up', 'down'];
        const validDirs = [];

        for (const dir of dirs) {
            const ddx = dir === 'right' ? 1 : dir === 'left' ? -1 : 0;
            const ddy = dir === 'down' ? 1 : dir === 'up' ? -1 : 0;
            const checkCol = this.col + ddx;
            const checkRow = this.row + ddy;

            if (this.grid.isInBounds(checkRow, checkCol) && this.grid.isEmpty(checkRow, checkCol)) {
                validDirs.push(dir);
            }
        }

        if (validDirs.length === 0) {
            const reverseMap = { left: 'right', right: 'left', up: 'down', down: 'up' };
            this.direction = reverseMap[this.direction];
            return;
        }

        if (this.fleeing) {
            if (validDirs.includes('up')) {
                this.direction = 'up';
                return;
            }
        }

        // Prefer horizontal movement (for fire breathing opportunities)
        if (player && Math.random() < 0.4) {
            if (player.row === this.row) {
                const preferred = player.col > this.col ? 'right' : 'left';
                if (validDirs.includes(preferred)) {
                    this.direction = preferred;
                    return;
                }
            }
        }

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
        this.fireActive = false;
        this.fireCells = [];

        if (this.inflateLevel >= CONFIG.MAX_INFLATE) {
            this.pop();
            return true;
        }
        return false;
    }

    pop() {
        this.dying = true;
        this.deathTimer = 300;
        this.fireActive = false;
        this.fireCells = [];
        if (this.scene.audio) {
            this.scene.audio.playPop();
        }
    }

    crush() {
        this.dying = true;
        this.deathTimer = 200;
        this.fireActive = false;
        this.fireCells = [];
        this.alive = true;
    }

    startFleeing() {
        this.fleeing = true;
        this.ghosting = false;
        this.fireActive = false;
        this.fireCells = [];
    }

    getScoreValue() {
        const layer = this.grid.getDepthLayer(this.row);
        let base;
        switch (layer) {
            case 1: base = CONFIG.SCORE.PUMP_KILL_LAYER1; break;
            case 2: base = CONFIG.SCORE.PUMP_KILL_LAYER2; break;
            case 3: base = CONFIG.SCORE.PUMP_KILL_LAYER3; break;
            case 4: base = CONFIG.SCORE.PUMP_KILL_LAYER4; break;
            default: base = CONFIG.SCORE.PUMP_KILL_LAYER1;
        }
        return base;
    }

    draw() {
        this.graphics.clear();
        this.fireGraphics.clear();

        if (!this.alive) return;

        const cx = this.x;
        const cy = this.y + this.bounceOffset;
        const s = CONFIG.CELL_WIDTH * 0.4;

        if (this.dying) {
            const progress = 1 - (this.deathTimer / 300);
            const scale = 1 + progress * 2;
            const alpha = 1 - progress;
            this.graphics.fillStyle(CONFIG.COLORS.FYGAR, alpha);
            this.graphics.fillCircle(cx, cy, s * scale);
            return;
        }

        if (this.ghosting) {
            this.drawBody(cx, cy, s, 0.5);
        } else if (this.inflateLevel > 0) {
            this.drawInflated(cx, cy, s);
        } else {
            this.drawBody(cx, cy, s, 1);
        }

        // Draw fire
        if (this.fireActive && this.fireCells.length > 0) {
            this.drawFire();
        }
    }

    drawBody(cx, cy, s, alpha) {
        const g = this.graphics;

        // Green body (more rectangular/dragon-like)
        g.fillStyle(CONFIG.COLORS.FYGAR, alpha);
        g.fillRoundedRect(cx - s, cy - s * 0.7, s * 2, s * 1.4, 6);

        // Wings
        g.fillStyle(CONFIG.COLORS.FYGAR_WING, alpha);
        const wingFlap = this.animFrame === 0 ? -3 : 3;
        g.fillTriangle(
            cx - s * 0.3, cy - s * 0.3,
            cx - s * 1.1, cy - s * 0.8 + wingFlap,
            cx - s * 0.3, cy + s * 0.1
        );
        g.fillTriangle(
            cx + s * 0.3, cy - s * 0.3,
            cx + s * 1.1, cy - s * 0.8 + wingFlap,
            cx + s * 0.3, cy + s * 0.1
        );

        // Eyes
        g.fillStyle(0xFFFFFF, alpha);
        const eyeDir = this.direction === 'left' ? -1 : 1;
        g.fillCircle(cx + eyeDir * s * 0.15 - s * 0.2, cy - s * 0.2, s * 0.2);
        g.fillCircle(cx + eyeDir * s * 0.15 + s * 0.2, cy - s * 0.2, s * 0.2);

        // Pupils
        g.fillStyle(0x000000, alpha);
        g.fillCircle(cx + eyeDir * s * 0.25 - s * 0.2, cy - s * 0.2, s * 0.08);
        g.fillCircle(cx + eyeDir * s * 0.25 + s * 0.2, cy - s * 0.2, s * 0.08);

        // Mouth/snout
        g.fillStyle(0x008800, alpha);
        const mouthDir = this.direction === 'left' ? -1 : 1;
        g.fillRoundedRect(cx + mouthDir * s * 0.5, cy + s * 0.05, s * 0.5 * mouthDir, s * 0.25, 2);

        // Feet
        g.fillStyle(CONFIG.COLORS.FYGAR, alpha);
        const footAnim = this.animFrame === 0 ? 1 : -1;
        g.fillRect(cx - s * 0.6 + footAnim * 2, cy + s * 0.6, s * 0.3, s * 0.3);
        g.fillRect(cx + s * 0.3 - footAnim * 2, cy + s * 0.6, s * 0.3, s * 0.3);
    }

    drawInflated(cx, cy, s) {
        const g = this.graphics;
        const inflate = this.inflateLevel;
        const scale = 1 + inflate * 0.35;
        const colors = [CONFIG.COLORS.FYGAR, 0x44DD44, 0x88EE88, 0xBBFFBB];
        const color = colors[Math.min(inflate, colors.length - 1)];

        g.fillStyle(color, 1);
        g.fillCircle(cx, cy, s * scale);

        // Strained eyes
        g.fillStyle(0xFFFFFF, 1);
        g.fillCircle(cx - s * 0.2 * scale, cy - s * 0.15, s * 0.18);
        g.fillCircle(cx + s * 0.2 * scale, cy - s * 0.15, s * 0.18);

        if (inflate >= 3) {
            g.lineStyle(2, 0x000000, 1);
            const es = s * 0.1;
            g.beginPath();
            g.moveTo(cx - s * 0.2 * scale - es, cy - s * 0.15 - es);
            g.lineTo(cx - s * 0.2 * scale + es, cy - s * 0.15 + es);
            g.strokePath();
            g.beginPath();
            g.moveTo(cx - s * 0.2 * scale + es, cy - s * 0.15 - es);
            g.lineTo(cx - s * 0.2 * scale - es, cy - s * 0.15 + es);
            g.strokePath();
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
            g.fillCircle(cx - s * 0.2 * scale, cy - s * 0.15, s * 0.06);
            g.fillCircle(cx + s * 0.2 * scale, cy - s * 0.15, s * 0.06);
        }
    }

    drawFire() {
        const g = this.fireGraphics;
        const dir = this.fireDirection === 'right' ? 1 : -1;

        for (let i = 0; i < this.fireCells.length; i++) {
            const cell = this.fireCells[i];
            const fx = cell.col * CONFIG.CELL_WIDTH + CONFIG.CELL_WIDTH / 2;
            const fy = cell.row * CONFIG.CELL_HEIGHT + CONFIG.CELL_HEIGHT / 2;

            // Fire gets smaller toward the end
            const sizeMult = 1 - (i / (CONFIG.FIRE_RANGE + 1)) * 0.4;
            const flicker = Math.sin(Date.now() * 0.02 + i) * 3;

            // Outer flame (orange)
            g.fillStyle(CONFIG.COLORS.FYGAR_FIRE, 0.8);
            g.fillCircle(fx + flicker, fy, CONFIG.CELL_WIDTH * 0.4 * sizeMult);

            // Inner flame (yellow)
            g.fillStyle(0xFFCC00, 0.9);
            g.fillCircle(fx + flicker * 0.5, fy, CONFIG.CELL_WIDTH * 0.25 * sizeMult);

            // Core (white)
            g.fillStyle(0xFFFFFF, 0.6);
            g.fillCircle(fx, fy, CONFIG.CELL_WIDTH * 0.1 * sizeMult);
        }
    }

    destroy() {
        this.graphics.destroy();
        this.fireGraphics.destroy();
    }
}
