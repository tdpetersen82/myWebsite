// ============================================================
// Donkey Kong — DK Entity (throws barrels from the top)
// ============================================================

class DonkeyKong {
    constructor(scene) {
        this.scene = scene;
        this.x = DK_CONFIG.DK_POSITION.x;
        this.y = DK_CONFIG.DK_POSITION.y;
        this.width = 56;
        this.height = 50;
        this.animTimer = 0;
        this.frame = 0;          // 0 = idle, 1 = arm up, 2 = throwing
        this.throwTimer = 0;
        this.isThrowing = false;
        this.throwCallback = null;
        this.chestBeat = 0;
    }

    setThrowCallback(cb) {
        this.throwCallback = cb;
    }

    update(dt, barrelInterval) {
        this.animTimer += dt;
        this.chestBeat += dt;

        // Idle chest-beat animation
        if (!this.isThrowing) {
            this.frame = Math.floor(this.chestBeat * 3) % 2;
        }

        // Barrel throw timer
        this.throwTimer += dt * 1000;
        if (this.throwTimer >= barrelInterval) {
            this.throwTimer = 0;
            this.startThrow();
        }
    }

    startThrow() {
        this.isThrowing = true;
        this.frame = 1; // arm raised

        // After a brief wind-up, release the barrel
        this.scene.time.delayedCall(300, () => {
            this.frame = 2; // throwing
            if (this.throwCallback) {
                this.throwCallback();
            }
            // Return to idle
            this.scene.time.delayedCall(200, () => {
                this.isThrowing = false;
                this.frame = 0;
                this.chestBeat = 0;
            });
        });
    }

    draw(graphics) {
        const x = this.x;
        const y = this.y;
        const cfg = DK_CONFIG;

        // Body (large brown torso)
        graphics.fillStyle(cfg.COLOR_DK, 1);
        // Torso
        graphics.fillRect(x - 24, y - 10, 48, 35);

        // Head
        graphics.fillStyle(cfg.COLOR_DK, 1);
        graphics.fillCircle(x, y - 22, 18);

        // Face (lighter)
        graphics.fillStyle(0xD2A06D, 1);
        graphics.fillCircle(x, y - 18, 10);

        // Eyes
        graphics.fillStyle(0xffffff, 1);
        graphics.fillCircle(x - 5, y - 22, 4);
        graphics.fillCircle(x + 5, y - 22, 4);
        graphics.fillStyle(0x000000, 1);
        graphics.fillCircle(x - 4, y - 22, 2);
        graphics.fillCircle(x + 6, y - 22, 2);

        // Mouth
        graphics.fillStyle(0x000000, 1);
        graphics.fillRect(x - 5, y - 14, 10, 3);

        // Brow
        graphics.fillStyle(cfg.COLOR_DK_DARK, 1);
        graphics.fillRect(x - 10, y - 28, 8, 3);
        graphics.fillRect(x + 2, y - 28, 8, 3);

        // Arms
        graphics.fillStyle(cfg.COLOR_DK, 1);
        if (this.frame === 0) {
            // Idle — arms at sides, chest beating
            const beatOff = Math.sin(this.chestBeat * 6) * 3;
            graphics.fillRect(x - 32, y - 8 + beatOff, 10, 28);
            graphics.fillRect(x + 22, y - 8 - beatOff, 10, 28);
            // Fists
            graphics.fillStyle(cfg.COLOR_DK_DARK, 1);
            graphics.fillCircle(x - 27, y + 22 + beatOff, 6);
            graphics.fillCircle(x + 27, y + 22 - beatOff, 6);
        } else if (this.frame === 1) {
            // Right arm raised (holding barrel)
            graphics.fillRect(x - 32, y - 8, 10, 28);
            graphics.fillRect(x + 22, y - 30, 10, 20);
            // Barrel above
            graphics.fillStyle(cfg.COLOR_BARREL, 1);
            graphics.fillCircle(x + 30, y - 38, 10);
            graphics.fillStyle(cfg.COLOR_BARREL_BAND, 1);
            graphics.fillRect(x + 22, y - 40, 16, 3);
        } else {
            // Throwing — arm extended right
            graphics.fillRect(x - 32, y - 8, 10, 28);
            graphics.fillRect(x + 22, y - 5, 24, 8);
        }

        // Legs
        graphics.fillStyle(cfg.COLOR_DK, 1);
        graphics.fillRect(x - 18, y + 25, 14, 14);
        graphics.fillRect(x + 4, y + 25, 14, 14);
        // Feet
        graphics.fillStyle(cfg.COLOR_DK_DARK, 1);
        graphics.fillRect(x - 20, y + 36, 16, 6);
        graphics.fillRect(x + 4, y + 36, 16, 6);

        // Tie
        graphics.fillStyle(0xcc2222, 1);
        graphics.fillRect(x - 4, y - 6, 8, 10);
        graphics.fillStyle(0xffff00, 1);
        graphics.fillRect(x - 2, y - 3, 4, 5);
    }
}
