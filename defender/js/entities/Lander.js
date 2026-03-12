// defender/js/entities/Lander.js — Alien that descends to grab humanoids

class Lander {
    constructor(scene, x, y, difficulty) {
        this.scene = scene;
        this.x = x;
        this.y = y;
        this.difficulty = difficulty;
        this.speedMult = difficulty.enemySpeedMult;
        this.alive = true;
        this.hp = CONFIG.LANDER.HP;

        this.state = 'descending'; // descending, grabbing, ascending, wandering
        this.targetHumanoid = null;
        this.carriedHumanoid = null;
        this.vx = (Math.random() - 0.5) * CONFIG.LANDER.SPEED * this.speedMult;
        this.vy = 0;
        this.grabTimer = 0;
        this.grabDelay = difficulty.landerGrabDelay;
        this.wanderTimer = 0;

        this.graphics = scene.add.graphics();
        this.animPhase = Math.random() * Math.PI * 2;
    }

    update(delta, humanoids, shipX) {
        const dt = delta / 1000;
        this.animPhase += dt * 4;

        switch (this.state) {
            case 'wandering':
                this.wanderTimer -= delta;
                this.x += this.vx * dt;
                this.y += Math.sin(this.animPhase) * 30 * dt;
                if (this.wanderTimer <= 0) {
                    this.state = 'descending';
                    this._pickTarget(humanoids);
                }
                break;

            case 'descending':
                if (!this.targetHumanoid || !this.targetHumanoid.alive || this.targetHumanoid.grabbed) {
                    this._pickTarget(humanoids);
                    if (!this.targetHumanoid) {
                        this.state = 'wandering';
                        this.wanderTimer = 2000 + Math.random() * 2000;
                        break;
                    }
                }
                // Move toward target humanoid
                const dx = this._worldDist(this.targetHumanoid.x, this.x);
                this.vx = Math.sign(dx) * CONFIG.LANDER.SPEED * this.speedMult;
                this.x += this.vx * dt;

                // Descend toward ground
                if (this.y < CONFIG.GROUND_Y - CONFIG.HUMANOID.HEIGHT - CONFIG.LANDER.HEIGHT) {
                    this.y += CONFIG.LANDER.DESCENT_SPEED * this.speedMult * dt;
                }

                // Check if close enough to grab
                if (Math.abs(dx) < CONFIG.LANDER.GRAB_RANGE &&
                    this.y >= CONFIG.GROUND_Y - CONFIG.HUMANOID.HEIGHT - CONFIG.LANDER.HEIGHT - 10) {
                    this.state = 'grabbing';
                    this.grabTimer = this.grabDelay;
                }
                break;

            case 'grabbing':
                this.grabTimer -= delta;
                if (this.grabTimer <= 0) {
                    if (this.targetHumanoid && this.targetHumanoid.alive && !this.targetHumanoid.grabbed) {
                        this.targetHumanoid.grabbed = true;
                        this.targetHumanoid.grabber = this;
                        this.carriedHumanoid = this.targetHumanoid;
                        this.state = 'ascending';
                    } else {
                        this.state = 'wandering';
                        this.wanderTimer = 1000;
                    }
                }
                break;

            case 'ascending':
                this.y -= CONFIG.LANDER.ASCENT_SPEED * this.speedMult * dt;
                this.x += this.vx * 0.3 * dt;

                // Update carried humanoid position
                if (this.carriedHumanoid) {
                    this.carriedHumanoid.x = this.x;
                    this.carriedHumanoid.y = this.y + CONFIG.LANDER.HEIGHT;
                }

                // Check if reached top — becomes mutant
                if (this.y <= 45) {
                    return 'mutate';
                }
                break;
        }

        // Wrap world
        if (this.x < 0) this.x += CONFIG.WORLD_WIDTH;
        if (this.x >= CONFIG.WORLD_WIDTH) this.x -= CONFIG.WORLD_WIDTH;

        // Clamp Y
        this.y = Phaser.Math.Clamp(this.y, 45, CONFIG.GROUND_Y - 10);

        return null;
    }

    _pickTarget(humanoids) {
        const available = humanoids.filter(h => h.alive && !h.grabbed);
        if (available.length === 0) {
            this.targetHumanoid = null;
            return;
        }
        // Pick closest
        let best = null;
        let bestDist = Infinity;
        for (const h of available) {
            const d = Math.abs(this._worldDist(h.x, this.x));
            if (d < bestDist) {
                bestDist = d;
                best = h;
            }
        }
        this.targetHumanoid = best;
    }

    _worldDist(ax, bx) {
        let d = ax - bx;
        if (d > CONFIG.WORLD_WIDTH / 2) d -= CONFIG.WORLD_WIDTH;
        if (d < -CONFIG.WORLD_WIDTH / 2) d += CONFIG.WORLD_WIDTH;
        return d;
    }

    draw(screenX) {
        this.graphics.clear();
        if (!this.alive) return;
        const w = CONFIG.LANDER.WIDTH;
        const h = CONFIG.LANDER.HEIGHT;
        const pulse = 0.7 + 0.3 * Math.sin(this.animPhase);

        this.graphics.lineStyle(2, CONFIG.COLORS.LANDER, pulse);
        this.graphics.fillStyle(CONFIG.COLORS.LANDER, 0.2);

        // Draw as a diamond/saucer shape
        this.graphics.beginPath();
        this.graphics.moveTo(screenX, this.y - h / 2);
        this.graphics.lineTo(screenX + w / 2, this.y);
        this.graphics.lineTo(screenX, this.y + h / 2);
        this.graphics.lineTo(screenX - w / 2, this.y);
        this.graphics.closePath();
        this.graphics.fillPath();
        this.graphics.strokePath();

        // Beam when grabbing
        if (this.state === 'grabbing') {
            this.graphics.lineStyle(1, CONFIG.COLORS.LANDER, 0.3 + 0.2 * Math.sin(this.animPhase * 3));
            this.graphics.lineBetween(screenX - 4, this.y + h / 2, screenX + 4, CONFIG.GROUND_Y);
        }
    }

    releaseHumanoid() {
        if (this.carriedHumanoid) {
            this.carriedHumanoid.grabbed = false;
            this.carriedHumanoid.grabber = null;
            this.carriedHumanoid.falling = true;
            const h = this.carriedHumanoid;
            this.carriedHumanoid = null;
            return h;
        }
        return null;
    }

    getBounds() {
        return {
            x: this.x - CONFIG.LANDER.WIDTH / 2,
            y: this.y - CONFIG.LANDER.HEIGHT / 2,
            width: CONFIG.LANDER.WIDTH,
            height: CONFIG.LANDER.HEIGHT,
        };
    }

    destroy() {
        this.graphics.destroy();
    }
}
