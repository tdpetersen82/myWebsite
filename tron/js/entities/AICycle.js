// Tron Light Cycles - AI Cycle (extends Cycle)
class AICycle extends Cycle {
    constructor(gridX, gridY, direction, color, glowColor, difficulty) {
        super(gridX, gridY, direction, color, glowColor);
        this.difficulty = difficulty;
        this.decisionCooldown = 0;
    }

    /**
     * AI decision-making. Called each frame; internally only decides at move boundaries.
     * @param {Arena} arena
     * @param {Cycle} playerCycle
     */
    think(arena, playerCycle) {
        const dirs = [
            TRON_CONFIG.DIR.UP,
            TRON_CONFIG.DIR.DOWN,
            TRON_CONFIG.DIR.LEFT,
            TRON_CONFIG.DIR.RIGHT,
        ];

        // Filter out reverse direction
        const validDirs = dirs.filter(d => {
            return !(d.x === -this.direction.x && d.y === -this.direction.y);
        });

        // Evaluate each direction
        const scored = validDirs.map(d => {
            return {
                dir: d,
                score: this._evaluateDirection(d, arena, playerCycle),
            };
        });

        // Random chance to pick any safe move (adds unpredictability on easy)
        if (Math.random() < this.difficulty.randomness) {
            const safeMoves = scored.filter(s => s.score > -1000);
            if (safeMoves.length > 0) {
                const pick = safeMoves[Math.floor(Math.random() * safeMoves.length)];
                this.setDirection(pick.dir);
                return;
            }
        }

        // Pick highest-scored direction
        scored.sort((a, b) => b.score - a.score);
        if (scored.length > 0) {
            this.setDirection(scored[0].dir);
        }
    }

    _evaluateDirection(dir, arena, playerCycle) {
        const nextX = this.gridX + dir.x;
        const nextY = this.gridY + dir.y;

        // Immediate death check
        if (arena.isBlocked(nextX, nextY) ||
            this._trailHasPoint(nextX, nextY) ||
            this._trailHasPoint(nextX, nextY, playerCycle)) {
            return -10000;
        }

        let score = 0;

        // Look-ahead: count how many steps we can go straight in this direction
        const openSpace = this._countOpenSteps(dir, arena, playerCycle, this.difficulty.lookAhead);
        score += openSpace * 10;

        // Flood fill to check available area (simplified BFS)
        const area = this._floodFillArea(nextX, nextY, arena, playerCycle, 50);
        score += area * 2;

        // Aggressiveness: reward moving toward the player to cut them off
        if (this.difficulty.aggressiveness > 0 && playerCycle.alive) {
            const distBefore = Math.abs(this.gridX - playerCycle.gridX) +
                               Math.abs(this.gridY - playerCycle.gridY);
            const distAfter = Math.abs(nextX - playerCycle.gridX) +
                              Math.abs(nextY - playerCycle.gridY);

            // Reward getting closer, but not too close (avoid suicide)
            if (distAfter < distBefore && distAfter > 3) {
                score += this.difficulty.aggressiveness * 30;
            }

            // On hard mode, try to move toward the player's forward path
            if (this.difficulty.aggressiveness > 0.5) {
                const playerFutureX = playerCycle.gridX + playerCycle.direction.x * 5;
                const playerFutureY = playerCycle.gridY + playerCycle.direction.y * 5;
                const distToFuture = Math.abs(nextX - playerFutureX) +
                                     Math.abs(nextY - playerFutureY);
                if (distToFuture < distBefore) {
                    score += this.difficulty.aggressiveness * 20;
                }
            }
        }

        // Slight preference for continuing straight (less erratic)
        if (dir.x === this.direction.x && dir.y === this.direction.y) {
            score += 3;
        }

        return score;
    }

    _trailHasPoint(x, y, cycle = null) {
        const target = cycle || this;
        for (const pos of target.trail) {
            if (pos.x === x && pos.y === y) return true;
        }
        return false;
    }

    _countOpenSteps(dir, arena, playerCycle, maxSteps) {
        let x = this.gridX;
        let y = this.gridY;
        let steps = 0;

        for (let i = 0; i < maxSteps; i++) {
            x += dir.x;
            y += dir.y;
            if (arena.isBlocked(x, y) ||
                this._trailHasPoint(x, y) ||
                this._trailHasPoint(x, y, playerCycle)) {
                break;
            }
            steps++;
        }
        return steps;
    }

    _floodFillArea(startX, startY, arena, playerCycle, maxCells) {
        const visited = new Set();
        const queue = [{ x: startX, y: startY }];
        const key = (x, y) => `${x},${y}`;
        visited.add(key(startX, startY));
        let count = 0;

        while (queue.length > 0 && count < maxCells) {
            const { x, y } = queue.shift();
            count++;

            const neighbors = [
                { x: x + 1, y }, { x: x - 1, y },
                { x, y: y + 1 }, { x, y: y - 1 },
            ];

            for (const n of neighbors) {
                const k = key(n.x, n.y);
                if (visited.has(k)) continue;
                if (arena.isBlocked(n.x, n.y)) continue;
                if (this._trailHasPoint(n.x, n.y)) continue;
                if (this._trailHasPoint(n.x, n.y, playerCycle)) continue;
                visited.add(k);
                queue.push(n);
            }
        }

        return count;
    }

    reset(gridX, gridY, direction) {
        super.reset(gridX, gridY, direction);
        this.decisionCooldown = 0;
    }
}
