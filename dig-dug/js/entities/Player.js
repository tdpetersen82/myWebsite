// Dig Dug - Player Entity

class Player {
    constructor(scene, grid, col, row) {
        this.scene = scene;
        this.grid = grid;

        // Grid position
        this.col = col;
        this.row = row;

        // Pixel position (center of cell)
        const pos = grid.gridToPixel(col, row);
        this.x = pos.x;
        this.y = pos.y;

        // Target position for smooth movement
        this.targetX = this.x;
        this.targetY = this.y;

        // Movement
        this.speed = CONFIG.PLAYER_SPEED;
        this.direction = 'right'; // right, left, up, down
        this.moving = false;

        // Pump attack
        this.pumping = false;
        this.pumpTarget = null;   // reference to enemy being pumped
        this.pumpExtend = 0;      // how far pump extends (0 to PUMP_RANGE cells)
        this.pumpHoseEndX = 0;
        this.pumpHoseEndY = 0;
        this.pumpCooldown = 0;

        // State
        this.alive = true;
        this.deathTimer = 0;
        this.invincible = false;
        this.invincibleTimer = 0;

        // Animation
        this.animFrame = 0;
        this.animTimer = 0;
        this.walkCycle = 0;

        // Graphics
        this.graphics = scene.add.graphics();
        this.graphics.setDepth(10);
    }

    update(delta, cursors, enemies) {
        if (!this.alive) {
            this.deathTimer -= delta;
            this.draw();
            return this.deathTimer <= 0;
        }

        if (this.invincible) {
            this.invincibleTimer -= delta;
            if (this.invincibleTimer <= 0) {
                this.invincible = false;
            }
        }

        this.animTimer += delta;
        if (this.animTimer > 150) {
            this.animTimer = 0;
            this.animFrame = (this.animFrame + 1) % 4;
        }

        // Handle pump cooldown
        if (this.pumpCooldown > 0) {
            this.pumpCooldown -= delta;
        }

        // Handle movement
        this.handleMovement(delta, cursors);

        // Handle pumping
        if (this.pumping && this.pumpTarget) {
            this.updatePumpHose();
        }

        this.draw();
        return false;
    }

    handleMovement(delta, cursors) {
        if (this.pumping) return;

        let dx = 0, dy = 0;
        let newDir = this.direction;

        if (cursors.left.isDown) {
            dx = -1; newDir = 'left';
        } else if (cursors.right.isDown) {
            dx = 1; newDir = 'right';
        } else if (cursors.up.isDown) {
            dy = -1; newDir = 'up';
        } else if (cursors.down.isDown) {
            dy = 1; newDir = 'down';
        }

        if (dx !== 0 || dy !== 0) {
            this.direction = newDir;
            this.moving = true;

            const moveAmount = this.speed * (delta / 1000);

            // Calculate new position
            let newX = this.x + dx * moveAmount;
            let newY = this.y + dy * moveAmount;

            // Snap to grid axis when moving perpendicular
            if (dx !== 0) {
                // Moving horizontally - snap Y to grid center
                const targetCenterY = this.row * CONFIG.CELL_HEIGHT + CONFIG.CELL_HEIGHT / 2;
                this.y += (targetCenterY - this.y) * 0.3;
                newY = this.y;
            }
            if (dy !== 0) {
                // Moving vertically - snap X to grid center
                const targetCenterX = this.col * CONFIG.CELL_WIDTH + CONFIG.CELL_WIDTH / 2;
                this.x += (targetCenterX - this.x) * 0.3;
                newX = this.x;
            }

            // Boundary checks
            const halfW = CONFIG.CELL_WIDTH / 2 - 2;
            const halfH = CONFIG.CELL_HEIGHT / 2 - 2;
            newX = Math.max(halfW, Math.min(CONFIG.WIDTH - halfW, newX));
            newY = Math.max(halfH, Math.min(CONFIG.HEIGHT - halfH, newY));

            // Update pixel position
            this.x = newX;
            this.y = newY;

            // Update grid position
            const gridPos = this.grid.pixelToGrid(this.x, this.y);
            const newCol = gridPos.col;
            const newRow = gridPos.row;

            // Dig through dirt
            if (this.grid.isInBounds(newRow, newCol) && this.grid.isDirt(newRow, newCol)) {
                this.grid.digCell(newRow, newCol);
                if (this.scene.audio) {
                    this.scene.audio.playDig();
                }
            }

            this.col = newCol;
            this.row = newRow;

            // Walk cycle for animation
            this.walkCycle += delta * 0.01;
        } else {
            this.moving = false;
        }
    }

    startPump(enemies) {
        if (this.pumpCooldown > 0 || !this.alive) return null;

        if (this.pumping && this.pumpTarget && this.pumpTarget.alive) {
            // Already pumping an enemy - inflate more
            return this.pumpTarget;
        }

        // Fire pump in current direction
        this.pumping = true;
        this.pumpExtend = 0;

        // Check for enemy in pump range
        const target = this.findPumpTarget(enemies);
        if (target) {
            this.pumpTarget = target;
            return target;
        }

        // No target found - pump extends briefly then retracts
        this.pumpTarget = null;
        this.scene.time.delayedCall(200, () => {
            if (!this.pumpTarget) {
                this.pumping = false;
            }
        });

        return null;
    }

    findPumpTarget(enemies) {
        const dx = this.direction === 'right' ? 1 : this.direction === 'left' ? -1 : 0;
        const dy = this.direction === 'down' ? 1 : this.direction === 'up' ? -1 : 0;

        for (let dist = 1; dist <= CONFIG.PUMP_RANGE; dist++) {
            const checkCol = this.col + dx * dist;
            const checkRow = this.row + dy * dist;

            // Stop if we hit dirt (pump can't go through dirt)
            if (this.grid.isDirt(checkRow, checkCol)) break;

            // Check each enemy
            for (const enemy of enemies) {
                if (!enemy.alive || enemy.inflateLevel >= CONFIG.MAX_INFLATE) continue;
                if (enemy.col === checkCol && enemy.row === checkRow) {
                    this.pumpExtend = dist;
                    return enemy;
                }
            }
        }
        return null;
    }

    releasePump() {
        this.pumping = false;
        this.pumpTarget = null;
        this.pumpExtend = 0;
        this.pumpCooldown = 100;
    }

    updatePumpHose() {
        if (!this.pumpTarget || !this.pumpTarget.alive) {
            this.releasePump();
            return;
        }
        // Update hose end position to target enemy
        this.pumpHoseEndX = this.pumpTarget.x;
        this.pumpHoseEndY = this.pumpTarget.y;
    }

    die() {
        if (this.invincible || !this.alive) return false;
        this.alive = false;
        this.deathTimer = 1500;
        this.pumping = false;
        this.pumpTarget = null;
        if (this.scene.audio) {
            this.scene.audio.playDeath();
        }
        return true;
    }

    respawn(col, row) {
        const pos = this.grid.gridToPixel(col, row);
        this.x = pos.x;
        this.y = pos.y;
        this.col = col;
        this.row = row;
        this.alive = true;
        this.deathTimer = 0;
        this.invincible = true;
        this.invincibleTimer = 2000;
        this.pumping = false;
        this.pumpTarget = null;
        this.direction = 'right';
    }

    draw() {
        this.graphics.clear();

        if (!this.alive) {
            // Death animation - player spins and fades
            const progress = 1 - (this.deathTimer / 1500);
            const alpha = 1 - progress;
            const scale = 1 + progress * 0.5;
            this.drawCharacter(alpha, scale, progress * Math.PI * 4);
            return;
        }

        if (this.invincible && Math.floor(this.invincibleTimer / 100) % 2 === 0) {
            return; // Blink during invincibility
        }

        this.drawCharacter(1, 1, 0);

        // Draw pump hose if pumping
        if (this.pumping) {
            this.drawPumpHose();
        }
    }

    drawCharacter(alpha, scale, rotation) {
        const g = this.graphics;
        const cx = this.x;
        const cy = this.y;
        const s = CONFIG.CELL_WIDTH * 0.4 * scale;

        // Body (blue suit)
        g.fillStyle(CONFIG.COLORS.PLAYER_SUIT, alpha);
        g.fillRoundedRect(cx - s * 0.6, cy - s * 0.7, s * 1.2, s * 1.4, 4);

        // Head (white)
        g.fillStyle(CONFIG.COLORS.PLAYER, alpha);
        g.fillCircle(cx, cy - s * 0.4, s * 0.45);

        // Visor/goggles
        g.fillStyle(CONFIG.COLORS.PLAYER_VISOR, alpha);
        if (this.direction === 'left') {
            g.fillRoundedRect(cx - s * 0.55, cy - s * 0.55, s * 0.5, s * 0.25, 2);
        } else if (this.direction === 'right') {
            g.fillRoundedRect(cx + s * 0.05, cy - s * 0.55, s * 0.5, s * 0.25, 2);
        } else {
            g.fillRoundedRect(cx - s * 0.35, cy - s * 0.55, s * 0.7, s * 0.2, 2);
        }

        // Legs (walking animation)
        g.fillStyle(CONFIG.COLORS.PLAYER_SUIT, alpha);
        const legOffset = this.moving ? Math.sin(this.walkCycle * 5) * 3 : 0;
        g.fillRect(cx - s * 0.4, cy + s * 0.6, s * 0.3, s * 0.4 + legOffset);
        g.fillRect(cx + s * 0.1, cy + s * 0.6, s * 0.3, s * 0.4 - legOffset);

        // Pump nozzle in hand direction
        if (!this.pumping) {
            g.fillStyle(CONFIG.COLORS.PLAYER, alpha);
            const nDir = this.direction;
            if (nDir === 'right') {
                g.fillRect(cx + s * 0.5, cy - s * 0.1, s * 0.4, s * 0.2);
            } else if (nDir === 'left') {
                g.fillRect(cx - s * 0.9, cy - s * 0.1, s * 0.4, s * 0.2);
            } else if (nDir === 'up') {
                g.fillRect(cx - s * 0.1, cy - s * 1.0, s * 0.2, s * 0.4);
            } else {
                g.fillRect(cx - s * 0.1, cy + s * 0.6, s * 0.2, s * 0.4);
            }
        }
    }

    drawPumpHose() {
        const g = this.graphics;
        g.lineStyle(3, CONFIG.COLORS.PUMP_HOSE, 1);

        let endX, endY;
        if (this.pumpTarget) {
            endX = this.pumpHoseEndX;
            endY = this.pumpHoseEndY;
        } else {
            // Pump extending into empty space
            const dx = this.direction === 'right' ? 1 : this.direction === 'left' ? -1 : 0;
            const dy = this.direction === 'down' ? 1 : this.direction === 'up' ? -1 : 0;
            const ext = CONFIG.CELL_WIDTH * 2;
            endX = this.x + dx * ext;
            endY = this.y + dy * ext;
        }

        g.beginPath();
        g.moveTo(this.x, this.y);
        g.lineTo(endX, endY);
        g.strokePath();

        // Pump end circle
        g.fillStyle(0xFFFFFF, 1);
        g.fillCircle(endX, endY, 4);
    }

    destroy() {
        this.graphics.destroy();
    }
}
