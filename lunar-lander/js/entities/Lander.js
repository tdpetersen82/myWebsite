// Lunar Lander - Lander Entity

class Lander {
    constructor(scene, x, y) {
        this.scene = scene;
        this.x = x;
        this.y = y;
        this.vx = 0;
        this.vy = 0;
        this.angle = 0;           // degrees, 0 = upright
        this.fuel = CONFIG.FUEL_MAX;
        this.thrusting = false;
        this.alive = true;
        this.landed = false;
        this.width = CONFIG.LANDER_WIDTH;
        this.height = CONFIG.LANDER_HEIGHT;
    }

    update(delta, gravity, wind) {
        if (!this.alive || this.landed) return;

        const dt = delta / 1000;
        const cursors = this.scene.cursors;
        const wasd = this.scene.wasd;

        // Rotation
        const leftPressed = cursors.left.isDown || (wasd && wasd.left.isDown);
        const rightPressed = cursors.right.isDown || (wasd && wasd.right.isDown);
        const thrustPressed = cursors.up.isDown || (wasd && wasd.up.isDown);

        if (leftPressed) {
            this.angle -= CONFIG.ROTATION_SPEED * dt;
        }
        if (rightPressed) {
            this.angle += CONFIG.ROTATION_SPEED * dt;
        }

        // Normalize angle to -180..180
        while (this.angle > 180) this.angle -= 360;
        while (this.angle < -180) this.angle += 360;

        // Thrust
        this.thrusting = thrustPressed && this.fuel > 0;

        if (this.thrusting) {
            const thrustAngle = Phaser.Math.DegToRad(this.angle - 90);
            this.vx += Math.cos(thrustAngle) * CONFIG.THRUST_POWER * dt;
            this.vy += Math.sin(thrustAngle) * CONFIG.THRUST_POWER * dt;
            this.fuel = Math.max(0, this.fuel - CONFIG.FUEL_BURN_RATE);
        }

        // Gravity
        this.vy += gravity * dt;

        // Wind
        if (wind) {
            this.vx += wind * dt;
        }

        // Clamp velocity
        const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
        if (speed > CONFIG.MAX_VELOCITY) {
            const scale = CONFIG.MAX_VELOCITY / speed;
            this.vx *= scale;
            this.vy *= scale;
        }

        // Update position
        this.x += this.vx * dt;
        this.y += this.vy * dt;

        // Wrap horizontally
        if (this.x < -20) this.x = CONFIG.WIDTH + 20;
        if (this.x > CONFIG.WIDTH + 20) this.x = -20;

        // Ceiling
        if (this.y < 0) {
            this.y = 0;
            this.vy = Math.abs(this.vy) * 0.2;
        }
    }

    draw(graphics) {
        if (!this.alive) return;

        // We manually rotate points around (this.x, this.y)
        const rad = Phaser.Math.DegToRad(this.angle);
        const cos = Math.cos(rad);
        const sin = Math.sin(rad);

        const rotate = (px, py) => {
            return {
                x: this.x + px * cos - py * sin,
                y: this.y + px * sin + py * cos
            };
        };

        const w = this.width;
        const h = this.height;

        // Lander body - triangular capsule shape
        const top = rotate(0, -h / 2);
        const topLeft = rotate(-w * 0.3, -h / 3);
        const topRight = rotate(w * 0.3, -h / 3);
        const midLeft = rotate(-w / 2, 0);
        const midRight = rotate(w / 2, 0);
        const botLeft = rotate(-w / 2, h / 3);
        const botRight = rotate(w / 2, h / 3);
        const nozzle = rotate(0, h / 2);

        // Main body fill
        graphics.fillStyle(CONFIG.COLORS.LANDER_BODY, 1);
        graphics.beginPath();
        graphics.moveTo(top.x, top.y);
        graphics.lineTo(topRight.x, topRight.y);
        graphics.lineTo(midRight.x, midRight.y);
        graphics.lineTo(botRight.x, botRight.y);
        graphics.lineTo(nozzle.x, nozzle.y);
        graphics.lineTo(botLeft.x, botLeft.y);
        graphics.lineTo(midLeft.x, midLeft.y);
        graphics.lineTo(topLeft.x, topLeft.y);
        graphics.closePath();
        graphics.fillPath();

        // Body outline
        graphics.lineStyle(1.5, CONFIG.COLORS.LANDER_STROKE, 1);
        graphics.beginPath();
        graphics.moveTo(top.x, top.y);
        graphics.lineTo(topRight.x, topRight.y);
        graphics.lineTo(midRight.x, midRight.y);
        graphics.lineTo(botRight.x, botRight.y);
        graphics.lineTo(nozzle.x, nozzle.y);
        graphics.lineTo(botLeft.x, botLeft.y);
        graphics.lineTo(midLeft.x, midLeft.y);
        graphics.lineTo(topLeft.x, topLeft.y);
        graphics.closePath();
        graphics.strokePath();

        // Landing legs
        const legL1 = rotate(-w / 2, h / 3);
        const legL2 = rotate(-w * 0.7, h / 2 + 4);
        const legR1 = rotate(w / 2, h / 3);
        const legR2 = rotate(w * 0.7, h / 2 + 4);

        graphics.lineStyle(1.5, CONFIG.COLORS.LANDER_STROKE, 0.8);
        graphics.beginPath();
        graphics.moveTo(legL1.x, legL1.y);
        graphics.lineTo(legL2.x, legL2.y);
        graphics.moveTo(legR1.x, legR1.y);
        graphics.lineTo(legR2.x, legR2.y);
        graphics.strokePath();

        // Leg feet (small horizontal lines)
        const footSize = 3;
        const footLL = rotate(-w * 0.7 - footSize, h / 2 + 4);
        const footLR = rotate(-w * 0.7 + footSize, h / 2 + 4);
        const footRL = rotate(w * 0.7 - footSize, h / 2 + 4);
        const footRR = rotate(w * 0.7 + footSize, h / 2 + 4);

        graphics.beginPath();
        graphics.moveTo(footLL.x, footLL.y);
        graphics.lineTo(footLR.x, footLR.y);
        graphics.moveTo(footRL.x, footRL.y);
        graphics.lineTo(footRR.x, footRR.y);
        graphics.strokePath();

        // Window/viewport on lander
        const windowPos = rotate(0, -h / 5);
        graphics.fillStyle(0x4488cc, 0.7);
        graphics.fillCircle(windowPos.x, windowPos.y, 3);
        graphics.lineStyle(1, 0x66aaff, 0.8);
        graphics.strokeCircle(windowPos.x, windowPos.y, 3);

    }

    // Get the bottom-most point of the lander (for collision)
    getBottomY() {
        const rad = Phaser.Math.DegToRad(this.angle);
        const cos = Math.cos(rad);
        const sin = Math.sin(rad);
        const h = this.height;
        const w = this.width;

        // Check nozzle, feet, and bottom corners
        const points = [
            { px: 0, py: h / 2 },                    // nozzle
            { px: -w * 0.7, py: h / 2 + 4 },        // left foot
            { px: w * 0.7, py: h / 2 + 4 },          // right foot
            { px: -w / 2, py: h / 3 },                // bottom left
            { px: w / 2, py: h / 3 }                  // bottom right
        ];

        let maxY = -Infinity;
        for (const p of points) {
            const ry = this.y + p.px * sin + p.py * cos;
            if (ry > maxY) maxY = ry;
        }
        return maxY;
    }

    // Get collision points for terrain checking
    getCollisionPoints() {
        const rad = Phaser.Math.DegToRad(this.angle);
        const cos = Math.cos(rad);
        const sin = Math.sin(rad);
        const h = this.height;
        const w = this.width;

        const rotate = (px, py) => ({
            x: this.x + px * cos - py * sin,
            y: this.y + px * sin + py * cos
        });

        return [
            rotate(0, -h / 2),           // top
            rotate(-w / 2, 0),            // left
            rotate(w / 2, 0),             // right
            rotate(0, h / 2),             // nozzle
            rotate(-w * 0.7, h / 2 + 4), // left foot
            rotate(w * 0.7, h / 2 + 4),  // right foot
        ];
    }

    // Get the nozzle position for thrust particles
    getNozzlePosition() {
        const rad = Phaser.Math.DegToRad(this.angle);
        return {
            x: this.x + 0 * Math.cos(rad) - (this.height / 2) * Math.sin(rad),
            y: this.y + 0 * Math.sin(rad) + (this.height / 2) * Math.cos(rad)
        };
    }

    // Get altitude from terrain
    getAltitude(terrain) {
        const groundY = terrain.getHeightAt(this.x);
        return groundY - this.getBottomY();
    }

    reset(x, y) {
        this.x = x;
        this.y = y;
        this.vx = 0;
        this.vy = 0;
        this.angle = 0;
        this.fuel = CONFIG.FUEL_MAX;
        this.thrusting = false;
        this.alive = true;
        this.landed = false;
    }
}
