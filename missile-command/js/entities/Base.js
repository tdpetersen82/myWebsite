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
        this.locked = false; // New: base hasn't been unlocked yet
        this.aimAngle = -Math.PI / 2; // pointing up
        this.launchFlash = 0;
        this.recoilTimer = 0;
        this.statusPulse = 0;
    }

    setDifficulty(diff) {
        this.maxAmmo = diff.baseAmmo;
        this.ammo = diff.baseAmmo;
    }

    refillAmmo() {
        this.ammo = this.maxAmmo;
    }

    fire() {
        if (!this.alive || this.locked || this.ammo <= 0) return false;
        this.ammo--;
        this.launchFlash = 200; // ms
        this.recoilTimer = 150; // ms
        return true;
    }

    repair() {
        if (this.alive) return false;
        this.alive = true;
        this.damaged = false;
        this.ammo = this.maxAmmo;
        return true;
    }

    unlock() {
        this.locked = false;
        this.alive = true;
        this.ammo = this.maxAmmo;
    }

    damage() {
        if (!this.alive || this.locked) return;
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
        if (this.locked) return;
        this.aimAngle = Helpers.angle(this.x, this.y - 10, targetX, targetY);
    }

    update(dt) {
        if (this.launchFlash > 0) {
            this.launchFlash -= dt * 1000;
        }
        if (this.recoilTimer > 0) {
            this.recoilTimer -= dt * 1000;
        }
        this.statusPulse += dt * 3;
    }

    draw(graphics) {
        if (this.locked) {
            this._drawLocked(graphics);
            return;
        }
        if (!this.alive) {
            this._drawDestroyed(graphics);
            return;
        }

        const recoil = this.recoilTimer > 0 ? (this.recoilTimer / 150) * 3 : 0;

        // Ground mount / foundation
        graphics.fillStyle(0x2a5a3a, 0.8);
        graphics.fillRect(this.x - 24, this.y - 2, 48, 6);

        // Bunker body (rounded trapezoid shape)
        const bw = CONFIG.BASE.WIDTH;
        const bh = CONFIG.BASE.HEIGHT;
        const topW = bw * 0.6;

        // Shadow
        graphics.fillStyle(0x1a3a2a, 0.6);
        graphics.fillRect(this.x - bw / 2 - 2, this.y - 1, bw + 4, 4);

        // Main bunker body
        const baseColor = this.damaged ? 0x8a5500 : 0x3a8a4a;
        const darkColor = this.damaged ? 0x6a3a00 : 0x2a6a3a;
        graphics.fillStyle(baseColor, 1);
        graphics.beginPath();
        graphics.moveTo(this.x - bw / 2, this.y);
        graphics.lineTo(this.x - topW / 2, this.y - bh);
        graphics.lineTo(this.x + topW / 2, this.y - bh);
        graphics.lineTo(this.x + bw / 2, this.y);
        graphics.closePath();
        graphics.fillPath();

        // Bunker panel lines
        graphics.lineStyle(1, darkColor, 0.5);
        graphics.lineBetween(this.x - topW / 2 + 3, this.y - bh + 2, this.x - bw / 2 + 5, this.y - 2);
        graphics.lineBetween(this.x + topW / 2 - 3, this.y - bh + 2, this.x + bw / 2 - 5, this.y - 2);

        // Top plate highlight
        graphics.lineStyle(1, 0xffffff, 0.15);
        graphics.lineBetween(this.x - topW / 2 + 2, this.y - bh + 1, this.x + topW / 2 - 2, this.y - bh + 1);

        // Hatch detail on top
        graphics.fillStyle(darkColor, 0.6);
        graphics.fillRect(this.x - 5, this.y - bh - 1, 10, 3);

        // Launcher barrel
        const barrelLen = 20 - recoil;
        const bx = this.x + Math.cos(this.aimAngle) * barrelLen;
        const by = (this.y - 12) + Math.sin(this.aimAngle) * barrelLen;
        const barrelColor = this.launchFlash > 0 ? 0xffffff : (this.damaged ? 0xaa8844 : 0x66cc66);

        // Barrel shadow
        graphics.lineStyle(5, 0x000000, 0.3);
        graphics.lineBetween(this.x, this.y - 11, bx + 1, by + 1);

        // Main barrel
        graphics.lineStyle(4, barrelColor, 1);
        graphics.lineBetween(this.x, this.y - 12, bx, by);

        // Barrel inner line
        graphics.lineStyle(1.5, 0xffffff, 0.2);
        graphics.lineBetween(this.x, this.y - 12, bx, by);

        // Muzzle brake (small box at barrel end)
        const mx = this.x + Math.cos(this.aimAngle) * (barrelLen - 2);
        const my = (this.y - 12) + Math.sin(this.aimAngle) * (barrelLen - 2);
        graphics.fillStyle(barrelColor, 0.8);
        graphics.fillCircle(bx, by, 3);

        // Launch flash effect
        if (this.launchFlash > 0) {
            const flashProgress = this.launchFlash / 200;
            // Muzzle flash
            graphics.fillStyle(0xffff88, flashProgress * 0.8);
            graphics.fillCircle(bx, by, 8 * flashProgress);
            graphics.fillStyle(0xffffff, flashProgress * 0.5);
            graphics.fillCircle(bx, by, 4 * flashProgress);
            // Barrel glow
            graphics.lineStyle(6, 0xffaa44, flashProgress * 0.3);
            graphics.lineBetween(this.x, this.y - 12, bx, by);
        }

        // Status lights (3 LEDs on the bunker face)
        const ledY = this.y - 6;
        for (let i = 0; i < 3; i++) {
            const lx = this.x - 6 + i * 6;
            const ledOn = !this.damaged || i === 0;
            const ledColor = this.damaged ? 0xff4400 : 0x44ff44;
            const pulse = Math.sin(this.statusPulse + i * 0.5) * 0.15 + 0.85;
            graphics.fillStyle(ledColor, ledOn ? 0.8 * pulse : 0.15);
            graphics.fillCircle(lx, ledY, 1.5);
            if (ledOn) {
                graphics.fillStyle(ledColor, 0.2 * pulse);
                graphics.fillCircle(lx, ledY, 3);
            }
        }

        // Ammo bar (horizontal bar below base)
        const barX = this.x - 18;
        const barY = this.y + 6;
        const barW = 36;
        const barH = 3;
        const ammoRatio = this.ammo / this.maxAmmo;

        graphics.fillStyle(0x111111, 0.6);
        graphics.fillRect(barX, barY, barW, barH);

        const ammoColor = ammoRatio > 0.5 ? 0x44ff44 : ammoRatio > 0.25 ? 0xffaa00 : 0xff4444;
        graphics.fillStyle(ammoColor, 0.8);
        graphics.fillRect(barX, barY, barW * ammoRatio, barH);

        // Ammo bar border
        graphics.lineStyle(0.5, 0x44ff44, 0.3);
        graphics.strokeRect(barX, barY, barW, barH);

        // Damage indicator
        if (this.damaged) {
            graphics.lineStyle(1.5, 0xff4400, 0.7);
            graphics.lineBetween(this.x - 8, this.y - 17, this.x + 3, this.y - 7);
            graphics.lineBetween(this.x + 5, this.y - 19, this.x - 2, this.y - 9);
            // Sparks
            if (Math.random() < 0.1) {
                graphics.fillStyle(0xff8800, 0.6);
                graphics.fillCircle(
                    this.x + Helpers.randomRange(-10, 10),
                    this.y - Helpers.randomRange(5, 18),
                    1
                );
            }
        }
    }

    _drawLocked(graphics) {
        // Foundation outline - construction site
        const bw = CONFIG.BASE.WIDTH;

        // Concrete foundation
        graphics.fillStyle(0x3a3a3a, 0.4);
        graphics.fillRect(this.x - bw / 2, this.y - 4, bw, 6);

        // Foundation cross-hatching
        graphics.lineStyle(0.5, 0x555555, 0.3);
        for (let i = 0; i < 4; i++) {
            const lx = this.x - bw / 2 + (bw / 4) * i + 5;
            graphics.lineBetween(lx, this.y - 3, lx + 6, this.y + 1);
        }

        // Dashed outline showing planned structure
        graphics.lineStyle(1, 0x4488aa, 0.25 + Math.sin(this.statusPulse) * 0.1);
        const topW = bw * 0.6;
        graphics.beginPath();
        graphics.moveTo(this.x - bw / 2, this.y);
        graphics.lineTo(this.x - topW / 2, this.y - CONFIG.BASE.HEIGHT);
        graphics.lineTo(this.x + topW / 2, this.y - CONFIG.BASE.HEIGHT);
        graphics.lineTo(this.x + bw / 2, this.y);
        graphics.closePath();
        graphics.strokePath();

        // Lock icon (small padlock)
        const iconY = this.y - 12;
        graphics.fillStyle(0x666688, 0.5);
        graphics.fillRect(this.x - 4, iconY, 8, 7);
        graphics.lineStyle(1.5, 0x666688, 0.5);
        graphics.strokeCircle(this.x, iconY - 2, 4);
    }

    _drawDestroyed(graphics) {
        // Rubble with more detail
        graphics.fillStyle(0x444444, 0.5);
        graphics.fillRect(this.x - 18, this.y - 4, 36, 6);

        // Rubble pieces
        const rubble = [
            { dx: -8, dy: -3, w: 7, h: 4 },
            { dx: 3, dy: -2, w: 5, h: 3 },
            { dx: -12, dy: -1, w: 4, h: 3 },
            { dx: 10, dy: -2, w: 6, h: 3 },
        ];
        for (const r of rubble) {
            graphics.fillStyle(0x3a3a3a, 0.4);
            graphics.fillRect(this.x + r.dx, this.y + r.dy, r.w, r.h);
        }

        // Smoke wisps
        graphics.fillStyle(0x555555, 0.1);
        graphics.fillCircle(this.x - 3, this.y - 8, 5);
        graphics.fillCircle(this.x + 5, this.y - 12, 4);
    }
}
