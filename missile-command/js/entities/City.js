// ============================================================
// Missile Command — City Entity
// ============================================================

class City {
    constructor(x, index) {
        this.x = x;
        this.y = CONFIG.CITY.Y;
        this.index = index;
        this.alive = true;
        this.shielded = false;
        this.shieldTimer = 0;
        this.buildings = this._generateBuildings();
        this.damageLevel = 0; // 0 = full, increments on each hit
        this.maxDamage = 3;   // hits before destruction (upgradeable)
    }

    _generateBuildings() {
        const count = Helpers.randomInt(CONFIG.CITY.BUILDING_COUNT_MIN, CONFIG.CITY.BUILDING_COUNT_MAX);
        const buildings = [];
        const totalWidth = CONFIG.CITY.WIDTH;
        let cx = this.x - totalWidth / 2;

        for (let i = 0; i < count; i++) {
            const w = Helpers.randomRange(8, 16);
            const h = Helpers.randomRange(15, 40);
            const color = Helpers.randomChoice([0x4466aa, 0x5577bb, 0x3355aa, 0x446688, 0x557799]);
            const windowRows = Math.floor(h / 8);
            const windowCols = Math.max(1, Math.floor(w / 5));
            buildings.push({
                x: cx,
                w: w,
                h: h,
                color: color,
                windowRows,
                windowCols,
                windowFlicker: Array.from({ length: windowRows * windowCols }, () => Math.random() > 0.3),
            });
            cx += w + Helpers.randomRange(1, 3);
        }
        return buildings;
    }

    takeDamage() {
        this.damageLevel++;
        if (this.damageLevel >= this.maxDamage) {
            this.alive = false;
        }
        // Randomly destroy some buildings
        for (const b of this.buildings) {
            if (Math.random() < 0.4) {
                b.h = Math.max(3, b.h * 0.5);
                b.color = 0x444444;
            }
        }
    }

    destroy() {
        this.alive = false;
        this.damageLevel = this.maxDamage;
    }

    rebuild() {
        this.alive = true;
        this.damageLevel = 0;
        this.buildings = this._generateBuildings();
    }

    setShield(duration) {
        this.shielded = true;
        this.shieldTimer = duration;
    }

    update(dt) {
        if (this.shieldTimer > 0) {
            this.shieldTimer -= dt * 1000;
            if (this.shieldTimer <= 0) {
                this.shielded = false;
            }
        }

        // Flicker windows occasionally
        if (this.alive && Math.random() < 0.02) {
            for (const b of this.buildings) {
                const idx = Helpers.randomInt(0, b.windowFlicker.length - 1);
                b.windowFlicker[idx] = !b.windowFlicker[idx];
            }
        }
    }

    draw(graphics) {
        if (!this.alive) {
            // Draw rubble
            graphics.fillStyle(0x444444, 0.4);
            for (let i = 0; i < 5; i++) {
                const rx = this.x + Helpers.randomRange(-20, 20);
                const ry = this.y - Helpers.randomRange(0, 5);
                graphics.fillRect(rx - 3, ry - 2, 6, 4);
            }
            // Smoke wisps (static)
            graphics.fillStyle(0x666666, 0.15);
            graphics.fillCircle(this.x, this.y - 10, 8);
            graphics.fillCircle(this.x - 8, this.y - 15, 5);
            return;
        }

        // Draw buildings
        for (const b of this.buildings) {
            const damageAlpha = 1 - this.damageLevel * 0.15;
            graphics.fillStyle(b.color, damageAlpha);
            graphics.fillRect(b.x, this.y - b.h, b.w, b.h);

            // Roof detail
            graphics.fillStyle(Helpers.lerpColor(b.color, 0x000000, 0.3), damageAlpha);
            graphics.fillRect(b.x, this.y - b.h, b.w, 2);

            // Windows
            if (b.h > 10) {
                for (let row = 0; row < b.windowRows; row++) {
                    for (let col = 0; col < b.windowCols; col++) {
                        const idx = row * b.windowCols + col;
                        if (b.windowFlicker[idx]) {
                            const wx = b.x + 2 + col * (b.w / b.windowCols);
                            const wy = this.y - b.h + 5 + row * 8;
                            graphics.fillStyle(0xffee88, 0.7 * damageAlpha);
                            graphics.fillRect(wx, wy, 2.5, 3);
                        }
                    }
                }
            }

            // Damage cracks
            if (this.damageLevel > 0) {
                graphics.lineStyle(1, 0x222222, 0.4 * this.damageLevel);
                const cx = b.x + b.w / 2;
                const cy = this.y - b.h / 2;
                graphics.lineBetween(cx - 4, cy - 6, cx + 2, cy);
                graphics.lineBetween(cx + 2, cy, cx - 1, cy + 5);
            }
        }

        // Shield bubble
        if (this.shielded) {
            const pulse = Math.sin(Date.now() * 0.005) * 0.1 + 0.3;
            graphics.lineStyle(2, 0x4488ff, pulse + 0.2);
            graphics.strokeCircle(this.x, this.y - 15, 30);
            graphics.fillStyle(0x4488ff, pulse * 0.3);
            graphics.fillCircle(this.x, this.y - 15, 30);
        }
    }
}
