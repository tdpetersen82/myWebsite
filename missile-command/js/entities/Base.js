// ============================================================
// Missile Command — Missile Base Entity
// ============================================================

class Base {
    constructor(x, index) {
        this.x = x;
        this.y = CONFIG.BASE.Y;
        this.index = index;
        this.ammo = CONFIG.DIFFICULTY.NORMAL.baseAmmo;
        this.maxAmmo = CONFIG.DIFFICULTY.NORMAL.baseAmmo;
        this.alive = true;
        this.damaged = false;
        this.aimAngle = -Math.PI / 2; // pointing up
        this.launchFlash = 0;
    }

    setDifficulty(diff) {
        this.maxAmmo = diff.baseAmmo;
        this.ammo = diff.baseAmmo;
    }

    refillAmmo() {
        this.ammo = this.maxAmmo;
    }

    fire() {
        if (!this.alive || this.ammo <= 0) return false;
        this.ammo--;
        this.launchFlash = 150; // ms
        return true;
    }

    repair() {
        if (this.alive) return false;
        this.alive = true;
        this.damaged = false;
        this.ammo = this.maxAmmo;
        return true;
    }

    damage() {
        if (!this.alive) return;
        if (this.damaged) {
            this.alive = false;
        } else {
            this.damaged = true;
            this.ammo = Math.floor(this.ammo / 2);
        }
    }

    destroy() {
        this.alive = false;
        this.ammo = 0;
    }

    aimAt(targetX, targetY) {
        this.aimAngle = Helpers.angle(this.x, this.y - 10, targetX, targetY);
    }

    update(dt) {
        if (this.launchFlash > 0) {
            this.launchFlash -= dt * 1000;
        }
    }

    draw(graphics) {
        if (!this.alive) {
            // Draw rubble
            graphics.fillStyle(0x444444, 0.5);
            graphics.fillRect(this.x - 15, this.y - 3, 30, 6);
            graphics.fillStyle(0x333333, 0.4);
            graphics.fillCircle(this.x - 5, this.y - 2, 4);
            graphics.fillCircle(this.x + 8, this.y - 1, 3);
            return;
        }

        const baseColor = this.damaged ? 0xaa6600 : 0x44aa44;
        const barrelColor = this.launchFlash > 0 ? 0xffffff : 0x66cc66;

        // Base platform (trapezoid shape)
        graphics.fillStyle(baseColor, 1);
        graphics.fillTriangle(
            this.x - CONFIG.BASE.WIDTH / 2, this.y,
            this.x + CONFIG.BASE.WIDTH / 2, this.y,
            this.x, this.y - CONFIG.BASE.HEIGHT
        );

        // Launcher barrel
        const barrelLen = 18;
        const bx = this.x + Math.cos(this.aimAngle) * barrelLen;
        const by = (this.y - 10) + Math.sin(this.aimAngle) * barrelLen;
        graphics.lineStyle(3, barrelColor, 1);
        graphics.lineBetween(this.x, this.y - 10, bx, by);

        // Launch flash effect
        if (this.launchFlash > 0) {
            const flashAlpha = this.launchFlash / 150;
            graphics.fillStyle(0xffff88, flashAlpha * 0.6);
            graphics.fillCircle(bx, by, 6);
        }

        // Ammo dots
        const dotY = this.y + 8;
        const dotsPerRow = 5;
        for (let i = 0; i < this.ammo; i++) {
            const row = Math.floor(i / dotsPerRow);
            const col = i % dotsPerRow;
            const dx = this.x - ((Math.min(this.ammo, dotsPerRow) - 1) * 4) / 2 + col * 4;
            const dy = dotY + row * 5;
            graphics.fillStyle(0x44ff44, 0.8);
            graphics.fillCircle(dx, dy, 1.5);
        }

        // Damage indicator
        if (this.damaged) {
            graphics.lineStyle(1, 0xff4400, 0.6);
            graphics.lineBetween(this.x - 8, this.y - 15, this.x + 3, this.y - 5);
            graphics.lineBetween(this.x + 5, this.y - 18, this.x - 2, this.y - 8);
        }
    }
}
