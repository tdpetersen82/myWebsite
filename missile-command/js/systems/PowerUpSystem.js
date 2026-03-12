// ============================================================
// Missile Command — Power-Up System
// ============================================================

class PowerUp {
    constructor(x, y, type) {
        this.x = x;
        this.y = y;
        this.type = type;
        this.config = CONFIG.POWERUP.TYPES[type];
        this.speed = CONFIG.POWERUP.FALL_SPEED;
        this.dead = false;
        this.collected = false;
        this.radius = 12;
        this.bobPhase = Math.random() * Math.PI * 2;
        this.rotAngle = 0;
    }

    update(dt) {
        if (this.dead) return;
        this.y += this.speed * dt;
        this.bobPhase += dt * 3;
        this.rotAngle += dt * 2;

        // Off screen
        if (this.y > CONFIG.HEIGHT + 20) {
            this.dead = true;
        }
    }

    contains(x, y) {
        return Helpers.distance(x, y, this.x, this.y) < this.radius + 15;
    }

    draw(graphics) {
        if (this.dead) return;

        const bob = Math.sin(this.bobPhase) * 3;
        const dy = this.y + bob;
        const pulse = 0.6 + Math.sin(Date.now() * 0.005) * 0.2;

        // Glow
        graphics.fillStyle(this.config.color, 0.15 * pulse);
        graphics.fillCircle(this.x, dy, this.radius * 1.8);

        // Outer ring
        graphics.lineStyle(2, this.config.color, pulse * 0.8);
        graphics.strokeCircle(this.x, dy, this.radius);

        // Inner fill
        graphics.fillStyle(this.config.color, 0.4);
        graphics.fillCircle(this.x, dy, this.radius - 3);

        // Icon
        graphics.fillStyle(0xffffff, 0.9);
        switch (this.type) {
            case 'SHIELD':
                // Shield icon
                graphics.lineStyle(2, 0xffffff, 0.9);
                graphics.strokeCircle(this.x, dy, 5);
                graphics.lineBetween(this.x - 3, dy, this.x + 3, dy);
                graphics.lineBetween(this.x, dy - 3, this.x, dy + 3);
                break;
            case 'AMMO':
                // Ammo dots
                for (let i = 0; i < 3; i++) {
                    graphics.fillCircle(this.x - 3 + i * 3, dy - 2, 1.5);
                    graphics.fillCircle(this.x - 3 + i * 3, dy + 2, 1.5);
                }
                break;
            case 'SLOWMO':
                // Clock icon
                graphics.lineStyle(1.5, 0xffffff, 0.9);
                graphics.strokeCircle(this.x, dy, 5);
                graphics.lineBetween(this.x, dy, this.x, dy - 3);
                graphics.lineBetween(this.x, dy, this.x + 2, dy + 1);
                break;
            case 'RAPID':
                // Lightning bolt
                graphics.lineStyle(2, 0xffffff, 0.9);
                graphics.lineBetween(this.x - 2, dy - 5, this.x + 1, dy - 1);
                graphics.lineBetween(this.x + 1, dy - 1, this.x - 1, dy + 1);
                graphics.lineBetween(this.x - 1, dy + 1, this.x + 2, dy + 5);
                break;
            case 'EMP':
                // Burst icon
                for (let i = 0; i < 6; i++) {
                    const a = (i / 6) * Math.PI * 2;
                    graphics.lineBetween(
                        this.x + Math.cos(a) * 2, dy + Math.sin(a) * 2,
                        this.x + Math.cos(a) * 5, dy + Math.sin(a) * 5
                    );
                }
                break;
        }

        // Label
        // (drawn by the scene HUD)
    }
}

class PowerUpSystem {
    constructor() {
        this.powerUps = [];
        this.activeEffects = {};
    }

    spawnPowerUp(x, y) {
        if (Math.random() > CONFIG.POWERUP.DROP_CHANCE) return null;
        const types = Object.keys(CONFIG.POWERUP.TYPES);
        const type = Helpers.randomChoice(types);
        const powerUp = new PowerUp(x, y, type);
        this.powerUps.push(powerUp);
        return powerUp;
    }

    forceSpawn(x, y, type) {
        const powerUp = new PowerUp(x, y, type || Helpers.randomChoice(Object.keys(CONFIG.POWERUP.TYPES)));
        this.powerUps.push(powerUp);
        return powerUp;
    }

    activate(type, gameState) {
        const config = CONFIG.POWERUP.TYPES[type];

        switch (type) {
            case 'SHIELD':
                // Shield all alive cities
                if (gameState.cities) {
                    gameState.cities.forEach(c => {
                        if (c.alive) c.setShield(config.duration);
                    });
                }
                this.activeEffects.SHIELD = config.duration;
                break;

            case 'AMMO':
                // Refill all bases
                if (gameState.bases) {
                    gameState.bases.forEach(b => {
                        if (b.alive) b.refillAmmo();
                    });
                }
                break;

            case 'SLOWMO':
                this.activeEffects.SLOWMO = config.duration;
                if (gameState.screenEffects) {
                    gameState.screenEffects.startSlowMo(config.duration, 0.5);
                }
                break;

            case 'RAPID':
                this.activeEffects.RAPID = config.duration;
                break;

            case 'EMP':
                // Destroy all on-screen enemy missiles
                if (gameState.enemyMissiles) {
                    gameState.enemyMissiles.forEach(m => {
                        if (!m.dead) {
                            m.dead = true;
                            if (gameState.onEnemyKilled) gameState.onEnemyKilled(m);
                        }
                    });
                }
                if (gameState.screenEffects) {
                    gameState.screenEffects.flash(0xcc44ff, 300, 0.6);
                    gameState.screenEffects.shake(8, 400);
                }
                if (gameState.particleSystem) {
                    gameState.particleSystem.emitEMP(CONFIG.WIDTH / 2, CONFIG.HEIGHT / 2);
                }
                break;
        }
    }

    update(dt) {
        // Update falling power-ups
        for (let i = this.powerUps.length - 1; i >= 0; i--) {
            this.powerUps[i].update(dt);
            if (this.powerUps[i].dead) {
                this.powerUps.splice(i, 1);
            }
        }

        // Update active effect durations
        for (const key in this.activeEffects) {
            this.activeEffects[key] -= dt * 1000;
            if (this.activeEffects[key] <= 0) {
                delete this.activeEffects[key];
            }
        }
    }

    checkClick(x, y) {
        for (const powerUp of this.powerUps) {
            if (!powerUp.dead && powerUp.contains(x, y)) {
                powerUp.collected = true;
                powerUp.dead = true;
                return powerUp;
            }
        }
        return null;
    }

    isActive(type) {
        return this.activeEffects[type] !== undefined && this.activeEffects[type] > 0;
    }

    getRemainingTime(type) {
        return this.activeEffects[type] || 0;
    }

    draw(graphics) {
        for (const p of this.powerUps) {
            p.draw(graphics);
        }
    }

    clear() {
        this.powerUps = [];
        this.activeEffects = {};
    }
}
