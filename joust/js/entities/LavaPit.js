// ============================================================
// Joust — Lava Pit Entity (bottom hazard with grabbing hand)
// ============================================================

class LavaPit {
    constructor(scene) {
        this.scene = scene;
        this.x = 0;
        this.y = CONFIG.LAVA_Y;
        this.width = CONFIG.WIDTH;
        this.height = CONFIG.LAVA_HEIGHT;
        this.graphics = scene.add.graphics();

        // Lava animation
        this.bubbles = [];
        this.wavePhase = 0;

        // Lava hand
        this.hand = null;
        this.handTimer = 0;

        // Initialize some bubbles
        for (let i = 0; i < 6; i++) {
            this.bubbles.push({
                x: Math.random() * CONFIG.WIDTH,
                y: this.y + Math.random() * 5,
                radius: 2 + Math.random() * 4,
                speed: 0.3 + Math.random() * 0.5,
                phase: Math.random() * Math.PI * 2
            });
        }
    }

    update(delta) {
        const dt = delta / 1000;
        this.wavePhase += dt * 2;

        // Update bubbles
        for (const b of this.bubbles) {
            b.phase += dt * b.speed * 3;
            b.y = this.y - Math.abs(Math.sin(b.phase)) * 8;
            if (b.phase > Math.PI * 4) {
                b.phase = 0;
                b.x = Math.random() * CONFIG.WIDTH;
                // Play bubble sound occasionally
                if (Math.random() < 0.2) {
                    this.scene.audio.playLavaBubble();
                }
            }
        }

        // Lava hand logic
        if (this.hand) {
            this.hand.timer -= delta;
            if (this.hand.extending) {
                this.hand.currentReach += CONFIG.LAVA_HAND_SPEED * dt;
                if (this.hand.currentReach >= this.hand.maxReach) {
                    this.hand.extending = false;
                }
            } else {
                this.hand.currentReach -= CONFIG.LAVA_HAND_SPEED * dt * 0.7;
                if (this.hand.currentReach <= 0 || this.hand.timer <= 0) {
                    this.hand = null;
                }
            }
        } else {
            // Chance to spawn a new lava hand
            if (Math.random() < CONFIG.LAVA_HAND_CHANCE) {
                const player = this.scene.player;
                if (player && player.alive && player.y > CONFIG.LAVA_Y - 150) {
                    this.hand = {
                        x: player.x + (Math.random() - 0.5) * 60,
                        extending: true,
                        currentReach: 0,
                        maxReach: CONFIG.LAVA_HAND_REACH,
                        timer: 3000,
                        grabWidth: 20
                    };
                }
            }
        }
    }

    checkCollision(entity) {
        if (!entity || !entity.alive) return false;
        // Check lava surface
        if (entity.y + (entity.height || 16) / 2 >= this.y) {
            return true;
        }
        // Check lava hand grab
        if (this.hand && this.hand.currentReach > 10) {
            const handTop = this.y - this.hand.currentReach;
            const hx = this.hand.x;
            const hw = this.hand.grabWidth / 2;
            if (entity.x > hx - hw && entity.x < hx + hw &&
                entity.y + (entity.height || 16) / 2 > handTop) {
                return true;
            }
        }
        return false;
    }

    draw() {
        this.graphics.clear();

        // Lava glow (gradient effect)
        this.graphics.fillStyle(CONFIG.LAVA_GLOW_COLOR, 0.15);
        this.graphics.fillRect(0, this.y - 20, CONFIG.WIDTH, 20);

        // Main lava body
        this.graphics.fillStyle(CONFIG.LAVA_COLOR, 1);
        this.graphics.fillRect(0, this.y, CONFIG.WIDTH, CONFIG.LAVA_HEIGHT);

        // Wavy lava surface
        this.graphics.fillStyle(0xFF6A00, 1);
        for (let x = 0; x < CONFIG.WIDTH; x += 4) {
            const waveY = Math.sin(x * 0.03 + this.wavePhase) * 3 +
                           Math.sin(x * 0.05 + this.wavePhase * 1.3) * 2;
            this.graphics.fillRect(x, this.y + waveY - 2, 4, 4);
        }

        // Bright spots
        this.graphics.fillStyle(0xFFAA00, 0.6);
        for (let x = 0; x < CONFIG.WIDTH; x += 30) {
            const offset = Math.sin(x * 0.1 + this.wavePhase * 0.7) * 3;
            this.graphics.fillRect(x + 5, this.y + 8 + offset, 12, 4);
        }

        // Bubbles
        for (const b of this.bubbles) {
            const alpha = 1 - Math.abs(Math.sin(b.phase)) * 0.5;
            this.graphics.fillStyle(0xFFCC00, alpha);
            this.graphics.fillCircle(b.x, b.y, b.radius);
            this.graphics.lineStyle(1, 0xFF8800, alpha * 0.5);
            this.graphics.strokeCircle(b.x, b.y, b.radius);
        }

        // Lava hand
        if (this.hand && this.hand.currentReach > 0) {
            const hx = this.hand.x;
            const reach = this.hand.currentReach;
            const handTop = this.y - reach;

            // Arm
            this.graphics.fillStyle(0xFF3300, 0.8);
            this.graphics.fillRect(hx - 4, handTop + 10, 8, reach - 10);

            // Hand/claw
            this.graphics.fillStyle(0xFF4400, 1);
            this.graphics.fillCircle(hx, handTop + 8, 6);

            // Fingers
            this.graphics.lineStyle(2, 0xFF5500, 1);
            this.graphics.lineBetween(hx - 5, handTop + 6, hx - 8, handTop);
            this.graphics.lineBetween(hx, handTop + 4, hx, handTop - 2);
            this.graphics.lineBetween(hx + 5, handTop + 6, hx + 8, handTop);

            // Glow around hand
            this.graphics.fillStyle(0xFF6600, 0.15);
            this.graphics.fillCircle(hx, handTop + 5, 14);
        }
    }

    destroy() {
        if (this.graphics) {
            this.graphics.destroy();
        }
    }
}
