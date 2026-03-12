// Tron Light Cycles - Base Cycle Entity
class Cycle {
    constructor(gridX, gridY, direction, color, glowColor) {
        this.gridX = gridX;
        this.gridY = gridY;
        this.direction = { ...direction };
        this.nextDirection = { ...direction };
        this.color = color;
        this.glowColor = glowColor;
        this.trail = []; // Array of {x, y} grid positions
        this.alive = true;
        this.boosted = false;
        this.boostTimer = 0;
        this.moveInterval = TRON_CONFIG.BASE_MOVE_INTERVAL;
        this.moveAccumulator = 0;

        // Record starting position in trail
        this.trail.push({ x: this.gridX, y: this.gridY });
    }

    setDirection(dir) {
        // Prevent 180-degree turns
        if (dir.x !== 0 && dir.x === -this.direction.x) return;
        if (dir.y !== 0 && dir.y === -this.direction.y) return;

        // Only register a turn if direction actually changes
        if (dir.x !== this.direction.x || dir.y !== this.direction.y) {
            this.nextDirection = { ...dir };
        }
    }

    applyBoost() {
        this.boosted = true;
        this.boostTimer = TRON_CONFIG.BOOST_DURATION;
        this.moveInterval = TRON_CONFIG.BOOST_MOVE_INTERVAL;
    }

    update(delta) {
        if (!this.alive) return false;

        // Update boost timer
        if (this.boosted) {
            this.boostTimer -= delta;
            if (this.boostTimer <= 0) {
                this.boosted = false;
                this.moveInterval = TRON_CONFIG.BASE_MOVE_INTERVAL;
            }
        }

        // Accumulate time
        this.moveAccumulator += delta;

        let moved = false;
        // Move when enough time has passed
        if (this.moveAccumulator >= this.moveInterval) {
            this.moveAccumulator -= this.moveInterval;

            // Apply queued direction
            this.direction = { ...this.nextDirection };

            // Move
            this.gridX += this.direction.x;
            this.gridY += this.direction.y;

            // Add to trail
            this.trail.push({ x: this.gridX, y: this.gridY });
            moved = true;
        }

        return moved;
    }

    die() {
        this.alive = false;
    }

    reset(gridX, gridY, direction) {
        this.gridX = gridX;
        this.gridY = gridY;
        this.direction = { ...direction };
        this.nextDirection = { ...direction };
        this.trail = [{ x: gridX, y: gridY }];
        this.alive = true;
        this.boosted = false;
        this.boostTimer = 0;
        this.moveInterval = TRON_CONFIG.BASE_MOVE_INTERVAL;
        this.moveAccumulator = 0;
    }

    drawTrail(graphics) {
        const gs = TRON_CONFIG.GRID_SIZE;

        // Outer glow layer
        graphics.fillStyle(this.glowColor, 0.15);
        for (const pos of this.trail) {
            graphics.fillRect(pos.x * gs - 1, pos.y * gs - 1, gs + 2, gs + 2);
        }

        // Main trail
        graphics.fillStyle(this.color, 0.8);
        for (const pos of this.trail) {
            graphics.fillRect(pos.x * gs, pos.y * gs, gs, gs);
        }

        // Bright head
        if (this.alive && this.trail.length > 0) {
            // Head glow
            graphics.fillStyle(0xffffff, 0.6);
            graphics.fillRect(
                this.gridX * gs - 2,
                this.gridY * gs - 2,
                gs + 4,
                gs + 4
            );
            graphics.fillStyle(this.color, 1.0);
            graphics.fillRect(this.gridX * gs, this.gridY * gs, gs, gs);

            // Boost indicator: extra bright pulsing head
            if (this.boosted) {
                const pulse = 0.5 + 0.5 * Math.sin(Date.now() * 0.01);
                graphics.fillStyle(0xffffff, pulse * 0.5);
                graphics.fillRect(
                    this.gridX * gs - 3,
                    this.gridY * gs - 3,
                    gs + 6,
                    gs + 6
                );
            }
        }
    }
}
