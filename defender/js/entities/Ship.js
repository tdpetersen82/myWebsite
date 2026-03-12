// defender/js/entities/Ship.js — Player ship entity

class Ship {
    constructor(scene) {
        this.scene = scene;
        this.x = CONFIG.WORLD_WIDTH / 2;
        this.y = CONFIG.HEIGHT / 2;
        this.vx = 0;
        this.vy = 0;
        this.facingRight = true;
        this.alive = true;
        this.invincible = false;
        this.invincibleTimer = 0;
        this.lastFireTime = 0;
        this.thrusting = false;
        this.blinkVisible = true;
        this.blinkTimer = 0;

        this.graphics = scene.add.graphics();
        this.thrustGraphics = scene.add.graphics();
        this.draw();
    }

    draw() {
        this.graphics.clear();
        const c = CONFIG.COLORS.SHIP;
        const w = CONFIG.SHIP.WIDTH;
        const h = CONFIG.SHIP.HEIGHT;

        if (this.invincible) {
            this.blinkTimer += 16;
            if (this.blinkTimer > 80) {
                this.blinkTimer = 0;
                this.blinkVisible = !this.blinkVisible;
            }
            if (!this.blinkVisible) {
                this.thrustGraphics.clear();
                return;
            }
        }

        this.graphics.lineStyle(2, c, 1);
        this.graphics.fillStyle(c, 0.3);

        if (this.facingRight) {
            this.graphics.beginPath();
            this.graphics.moveTo(w / 2, 0);
            this.graphics.lineTo(-w / 2, -h / 2);
            this.graphics.lineTo(-w / 3, 0);
            this.graphics.lineTo(-w / 2, h / 2);
            this.graphics.closePath();
            this.graphics.fillPath();
            this.graphics.strokePath();
        } else {
            this.graphics.beginPath();
            this.graphics.moveTo(-w / 2, 0);
            this.graphics.lineTo(w / 2, -h / 2);
            this.graphics.lineTo(w / 3, 0);
            this.graphics.lineTo(w / 2, h / 2);
            this.graphics.closePath();
            this.graphics.fillPath();
            this.graphics.strokePath();
        }

        // Thrust flame
        this.thrustGraphics.clear();
        if (this.thrusting) {
            const flameLen = 6 + Math.random() * 8;
            this.thrustGraphics.lineStyle(2, CONFIG.COLORS.SHIP_THRUST, 0.8);
            if (this.facingRight) {
                this.thrustGraphics.beginPath();
                this.thrustGraphics.moveTo(-w / 3, -3);
                this.thrustGraphics.lineTo(-w / 3 - flameLen, 0);
                this.thrustGraphics.lineTo(-w / 3, 3);
                this.thrustGraphics.strokePath();
            } else {
                this.thrustGraphics.beginPath();
                this.thrustGraphics.moveTo(w / 3, -3);
                this.thrustGraphics.lineTo(w / 3 + flameLen, 0);
                this.thrustGraphics.lineTo(w / 3, 3);
                this.thrustGraphics.strokePath();
            }
        }
    }

    setScreenPosition(screenX) {
        this.graphics.setPosition(screenX, this.y);
        this.thrustGraphics.setPosition(screenX, this.y);
    }

    update(delta, cursors, keys) {
        const dt = delta / 1000;

        if (this.invincible) {
            this.invincibleTimer -= delta;
            if (this.invincibleTimer <= 0) {
                this.invincible = false;
                this.blinkVisible = true;
            }
        }

        // Horizontal thrust
        this.thrusting = false;
        if (cursors.right.isDown) {
            this.facingRight = true;
            this.vx += CONFIG.SHIP.THRUST_ACCEL * dt;
            this.thrusting = true;
        } else if (cursors.left.isDown) {
            this.facingRight = false;
            this.vx -= CONFIG.SHIP.THRUST_ACCEL * dt;
            this.thrusting = true;
        } else {
            // Apply drag
            if (Math.abs(this.vx) > 5) {
                this.vx -= Math.sign(this.vx) * CONFIG.SHIP.DRAG * dt;
            } else {
                this.vx = 0;
            }
        }

        // Clamp horizontal speed
        const maxSpeed = CONFIG.SHIP.SPEED;
        this.vx = Phaser.Math.Clamp(this.vx, -maxSpeed, maxSpeed);

        // Vertical movement
        if (cursors.up.isDown) {
            this.vy = -CONFIG.SHIP.VERTICAL_SPEED;
        } else if (cursors.down.isDown) {
            this.vy = CONFIG.SHIP.VERTICAL_SPEED;
        } else {
            this.vy *= 0.85;
        }

        // Update position
        this.x += this.vx * dt;
        this.y += this.vy * dt;

        // Wrap world horizontally
        if (this.x < 0) this.x += CONFIG.WORLD_WIDTH;
        if (this.x >= CONFIG.WORLD_WIDTH) this.x -= CONFIG.WORLD_WIDTH;

        // Clamp vertically
        this.y = Phaser.Math.Clamp(this.y, 40, CONFIG.GROUND_Y - 20);

        // Thrust sound
        if (this.thrusting && Math.random() < 0.3) {
            audioManager.thrust();
        }

        this.draw();
    }

    shoot(time) {
        if (time - this.lastFireTime < CONFIG.SHIP.FIRE_RATE) return null;
        this.lastFireTime = time;
        audioManager.shoot();
        return {
            x: this.x + (this.facingRight ? CONFIG.SHIP.WIDTH / 2 : -CONFIG.SHIP.WIDTH / 2),
            y: this.y,
            dir: this.facingRight ? 1 : -1,
        };
    }

    hyperspace() {
        audioManager.hyperspace();
        this.x = Math.random() * CONFIG.WORLD_WIDTH;
        this.y = 60 + Math.random() * (CONFIG.GROUND_Y - 120);
        this.vx = 0;
        this.vy = 0;
        // Chance of death
        if (Math.random() < CONFIG.SHIP.HYPERSPACE_DEATH_CHANCE) {
            return true; // died
        }
        return false;
    }

    makeInvincible() {
        this.invincible = true;
        this.invincibleTimer = CONFIG.SHIP.INVINCIBLE_TIME;
    }

    getBounds() {
        return {
            x: this.x - CONFIG.SHIP.WIDTH / 2,
            y: this.y - CONFIG.SHIP.HEIGHT / 2,
            width: CONFIG.SHIP.WIDTH,
            height: CONFIG.SHIP.HEIGHT,
        };
    }

    destroy() {
        this.graphics.destroy();
        this.thrustGraphics.destroy();
    }
}
