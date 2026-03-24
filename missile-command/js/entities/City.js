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

        // Shield generator
        this.shieldHP = 0;
        this.maxShieldHP = 0;
        this.shieldRegenWaves = 0;
        this.shieldLevel = 0;
        this.shieldFlashTimer = 0;

        // Economy
        this.income = 0;
        this._updateIncome();

        // Visual state
        this.ambientTimer = Math.random() * 100;
        this.fireParticles = []; // For damaged building fires
    }

    _generateBuildings() {
        const count = Helpers.randomInt(CONFIG.CITY.BUILDING_COUNT_MIN, CONFIG.CITY.BUILDING_COUNT_MAX);
        const buildings = [];
        const totalWidth = CONFIG.CITY.WIDTH;
        let cx = this.x - totalWidth / 2;

        // Building types: 'flat', 'peaked', 'tower', 'wide', 'antenna'
        const types = ['flat', 'peaked', 'tower', 'wide', 'antenna'];

        for (let i = 0; i < count; i++) {
            const type = Helpers.randomChoice(types);
            let w, h;
            switch (type) {
                case 'tower':  w = Helpers.randomRange(6, 10);  h = Helpers.randomRange(30, 50); break;
                case 'wide':   w = Helpers.randomRange(14, 20); h = Helpers.randomRange(12, 25); break;
                case 'peaked': w = Helpers.randomRange(8, 14);  h = Helpers.randomRange(20, 38); break;
                case 'antenna':w = Helpers.randomRange(8, 14);  h = Helpers.randomRange(22, 40); break;
                default:       w = Helpers.randomRange(8, 16);  h = Helpers.randomRange(15, 35); break;
            }

            // Richer building colors
            const color = Helpers.randomChoice([
                0x3a5588, 0x4a6699, 0x2a4477, 0x3a5a7a, 0x445566,
                0x556677, 0x2a3a55, 0x3a4a66, 0x4a5a7a, 0x334466,
            ]);

            const windowRows = Math.floor(h / 8);
            const windowCols = Math.max(1, Math.floor(w / 5));

            buildings.push({
                x: cx,
                w, h, type, color,
                windowRows, windowCols,
                windowFlicker: Array.from({ length: windowRows * windowCols }, () => Math.random() > 0.25),
                // Rooftop features
                hasAntenna: type === 'antenna' || Math.random() < 0.2,
                hasTank: type === 'flat' && Math.random() < 0.3,
                hasAC: Math.random() < 0.25,
                destroyed: false,
            });
            cx += w + Helpers.randomRange(1, 3);
        }
        return buildings;
    }

    _updateIncome() {
        const aliveBuildings = this.buildings.filter(b => !b.destroyed).length;
        this.income = aliveBuildings * CONFIG.CITY.BASE_INCOME;
    }

    getValue() {
        return this.income;
    }

    grow() {
        if (!this.alive) return;
        // Chance to add a building
        if (this.buildings.length < CONFIG.CITY.MAX_BUILDINGS && Math.random() < CONFIG.CITY.GROWTH_CHANCE) {
            const types = ['flat', 'peaked', 'tower', 'wide', 'antenna'];
            const type = Helpers.randomChoice(types);
            let w, h;
            switch (type) {
                case 'tower':  w = Helpers.randomRange(6, 10);  h = Helpers.randomRange(25, 45); break;
                case 'wide':   w = Helpers.randomRange(14, 20); h = Helpers.randomRange(12, 22); break;
                default:       w = Helpers.randomRange(8, 14);  h = Helpers.randomRange(15, 35); break;
            }
            const color = Helpers.randomChoice([
                0x3a5588, 0x4a6699, 0x2a4477, 0x3a5a7a, 0x445566,
            ]);
            const windowRows = Math.floor(h / 8);
            const windowCols = Math.max(1, Math.floor(w / 5));

            // Place at end of city
            const lastB = this.buildings[this.buildings.length - 1];
            const newX = lastB ? lastB.x + lastB.w + Helpers.randomRange(1, 3) : this.x - 20;

            this.buildings.push({
                x: newX, w, h, type, color,
                windowRows, windowCols,
                windowFlicker: Array.from({ length: windowRows * windowCols }, () => Math.random() > 0.25),
                hasAntenna: type === 'antenna' || Math.random() < 0.2,
                hasTank: type === 'flat' && Math.random() < 0.3,
                hasAC: Math.random() < 0.25,
                destroyed: false,
            });
        }

        // Existing damaged buildings can regrow slightly
        for (const b of this.buildings) {
            if (b.destroyed && Math.random() < 0.15) {
                b.destroyed = false;
                b.h = Math.max(b.h, Helpers.randomRange(10, 20));
                b.color = Helpers.randomChoice([0x3a5588, 0x4a6699, 0x2a4477]);
            }
        }

        this._updateIncome();
    }

    takeDamage() {
        // Check shield first
        if (this.shieldHP > 0) {
            this.shieldHP--;
            this.shieldFlashTimer = 300;
            if (this.shieldHP <= 0) {
                this.shielded = false;
            }
            return; // Shield absorbed the hit
        }

        this.damageLevel++;
        if (this.damageLevel >= this.maxDamage) {
            this.alive = false;
        }
        // Randomly destroy some buildings
        for (const b of this.buildings) {
            if (!b.destroyed && Math.random() < 0.4) {
                b.destroyed = true;
                b.h = Math.max(3, b.h * 0.4);
                b.color = 0x3a3a3a;
            }
        }
        this._updateIncome();
    }

    destroy() {
        this.alive = false;
        this.damageLevel = this.maxDamage;
    }

    rebuild() {
        this.alive = true;
        this.damageLevel = 0;
        this.buildings = this._generateBuildings();
        this._updateIncome();
    }

    setShield(duration) {
        this.shielded = true;
        this.shieldTimer = duration;
    }

    applyShieldLevel(level) {
        if (level <= 0) return;
        this.shieldLevel = level;
        const cfg = CONFIG.SHIELD.LEVELS[level - 1];
        this.maxShieldHP = cfg.maxHP;
        this.shieldRegenWaves = cfg.regenWaves;
    }

    regenShield(currentWave) {
        if (this.shieldLevel <= 0 || !this.alive) return;
        const cfg = CONFIG.SHIELD.LEVELS[this.shieldLevel - 1];
        if (currentWave % cfg.regenWaves === 0) {
            this.shieldHP = this.maxShieldHP;
            this.shielded = this.shieldHP > 0;
        }
    }

    update(dt) {
        this.ambientTimer += dt;

        if (this.shieldTimer > 0) {
            this.shieldTimer -= dt * 1000;
            if (this.shieldTimer <= 0) {
                this.shielded = false;
            }
        }

        if (this.shieldFlashTimer > 0) {
            this.shieldFlashTimer -= dt * 1000;
        }

        // Flicker windows occasionally
        if (this.alive && Math.random() < 0.03) {
            for (const b of this.buildings) {
                if (b.destroyed) continue;
                const idx = Helpers.randomInt(0, b.windowFlicker.length - 1);
                b.windowFlicker[idx] = !b.windowFlicker[idx];
            }
        }

        // Update fire particles for damaged buildings
        if (this.alive && this.damageLevel > 0) {
            // Spawn fire particles
            if (Math.random() < 0.05 * this.damageLevel) {
                this.fireParticles.push({
                    x: this.x + Helpers.randomRange(-20, 20),
                    y: this.y - Helpers.randomRange(5, 25),
                    life: Helpers.randomRange(300, 600),
                    maxLife: 600,
                    vy: -Helpers.randomRange(10, 25),
                    size: Helpers.randomRange(1.5, 3),
                });
            }
            // Update particles
            for (let i = this.fireParticles.length - 1; i >= 0; i--) {
                const p = this.fireParticles[i];
                p.life -= dt * 1000;
                p.y += p.vy * dt;
                if (p.life <= 0) this.fireParticles.splice(i, 1);
            }
        }
    }

    draw(graphics) {
        if (!this.alive) {
            this._drawDestroyed(graphics);
            return;
        }

        // Ambient city light glow on ground
        graphics.fillStyle(0xffcc66, 0.04 + Math.sin(this.ambientTimer * 0.5) * 0.01);
        graphics.fillCircle(this.x, this.y + 2, 30);

        // Draw buildings
        for (const b of this.buildings) {
            if (b.destroyed) {
                this._drawRuinedBuilding(graphics, b);
                continue;
            }

            const damageAlpha = 1 - this.damageLevel * 0.12;

            // Building shadow
            graphics.fillStyle(0x000000, 0.2 * damageAlpha);
            graphics.fillRect(b.x + 2, this.y - b.h + 2, b.w, b.h);

            // Main building body
            graphics.fillStyle(b.color, damageAlpha);
            graphics.fillRect(b.x, this.y - b.h, b.w, b.h);

            // Building edge highlight (left)
            graphics.fillStyle(0xffffff, 0.06 * damageAlpha);
            graphics.fillRect(b.x, this.y - b.h, 1, b.h);

            // Roof detail
            if (b.type === 'peaked') {
                // Peaked roof
                graphics.fillStyle(Helpers.lerpColor(b.color, 0x222244, 0.3), damageAlpha);
                graphics.fillTriangle(
                    b.x - 1, this.y - b.h,
                    b.x + b.w + 1, this.y - b.h,
                    b.x + b.w / 2, this.y - b.h - 6
                );
            } else {
                // Flat roof line
                graphics.fillStyle(Helpers.lerpColor(b.color, 0x000000, 0.3), damageAlpha);
                graphics.fillRect(b.x, this.y - b.h, b.w, 2);
            }

            // Rooftop features
            if (b.hasAntenna) {
                const ax = b.x + b.w / 2;
                const ay = this.y - b.h - (b.type === 'peaked' ? 6 : 0);
                graphics.lineStyle(0.5, 0x888888, 0.6 * damageAlpha);
                graphics.lineBetween(ax, ay, ax, ay - 8);
                // Blinking light
                const blink = Math.sin(this.ambientTimer * 4 + b.x) > 0.5;
                graphics.fillStyle(blink ? 0xff2222 : 0x440000, 0.8 * damageAlpha);
                graphics.fillCircle(ax, ay - 8, 1);
            }
            if (b.hasTank) {
                graphics.fillStyle(0x555566, 0.5 * damageAlpha);
                graphics.fillRect(b.x + 2, this.y - b.h - 3, 4, 3);
            }
            if (b.hasAC) {
                graphics.fillStyle(0x556666, 0.4 * damageAlpha);
                graphics.fillRect(b.x + b.w - 5, this.y - b.h - 2, 4, 2);
            }

            // Windows
            if (b.h > 10) {
                for (let row = 0; row < b.windowRows; row++) {
                    for (let col = 0; col < b.windowCols; col++) {
                        const idx = row * b.windowCols + col;
                        const wx = b.x + 2 + col * (b.w / b.windowCols);
                        const wy = this.y - b.h + 5 + row * 8;

                        if (b.windowFlicker[idx]) {
                            // Lit window - warm glow
                            const warmth = Helpers.randomChoice([0xffee88, 0xffdd66, 0xffeebb, 0xeedd77]);
                            graphics.fillStyle(warmth, 0.65 * damageAlpha);
                            graphics.fillRect(wx, wy, 2.5, 3.5);
                            // Window glow
                            graphics.fillStyle(warmth, 0.08 * damageAlpha);
                            graphics.fillCircle(wx + 1.25, wy + 1.75, 4);
                        } else {
                            // Dark window
                            graphics.fillStyle(0x1a1a33, 0.4 * damageAlpha);
                            graphics.fillRect(wx, wy, 2.5, 3.5);
                        }
                    }
                }
            }

            // Damage cracks
            if (this.damageLevel > 0) {
                graphics.lineStyle(1, 0x111111, 0.3 * this.damageLevel);
                const cx = b.x + b.w / 2;
                const cy = this.y - b.h / 2;
                graphics.lineBetween(cx - 4, cy - 8, cx + 2, cy);
                graphics.lineBetween(cx + 2, cy, cx - 1, cy + 6);
                if (this.damageLevel > 1) {
                    graphics.lineBetween(cx + 3, cy - 4, cx + 6, cy + 3);
                }
            }
        }

        // Fire particles for damaged city
        for (const p of this.fireParticles) {
            const alpha = (p.life / p.maxLife) * 0.5;
            graphics.fillStyle(Helpers.randomChoice([0xff4400, 0xff6600, 0xff8800]), alpha);
            graphics.fillCircle(p.x, p.y, p.size * (p.life / p.maxLife));
        }

        // Income indicator
        // (drawn by scene as text overlay)

        // Shield bubble
        if (this.shieldHP > 0 || this.shieldFlashTimer > 0) {
            this._drawShield(graphics);
        }
    }

    _drawShield(graphics) {
        const time = Date.now() * 0.003;
        const shieldRadius = 32;
        const shieldCY = this.y - 18;

        // Flash effect when hit
        const flashAlpha = this.shieldFlashTimer > 0 ? (this.shieldFlashTimer / 300) * 0.4 : 0;

        // Shield dome - outer ring
        const baseAlpha = 0.2 + Math.sin(time) * 0.05;
        const shieldColor = this.shieldHP > 1 ? 0x4488ff : this.shieldHP === 1 ? 0x44aaff : 0x8844ff;

        graphics.lineStyle(2, shieldColor, baseAlpha + 0.15 + flashAlpha);
        graphics.strokeCircle(this.x, shieldCY, shieldRadius);

        // Inner dome fill
        graphics.fillStyle(shieldColor, (baseAlpha * 0.25) + flashAlpha);
        graphics.fillCircle(this.x, shieldCY, shieldRadius);

        // Hexagonal pattern overlay
        const hexSize = 8;
        for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 3) {
            const hx = this.x + Math.cos(angle + time * 0.5) * shieldRadius * 0.6;
            const hy = shieldCY + Math.sin(angle + time * 0.5) * shieldRadius * 0.6;
            graphics.lineStyle(0.5, shieldColor, baseAlpha * 0.4);
            graphics.strokeCircle(hx, hy, hexSize);
        }

        // Energy pulse rings
        const pulsePhase = (time * 2) % (Math.PI * 2);
        const pulseR = shieldRadius * (0.3 + Math.sin(pulsePhase) * 0.3);
        graphics.lineStyle(1, 0xaaccff, 0.1 + Math.sin(pulsePhase) * 0.05);
        graphics.strokeCircle(this.x, shieldCY, pulseR);

        // HP pips
        if (this.maxShieldHP > 0) {
            for (let i = 0; i < this.maxShieldHP; i++) {
                const px = this.x - (this.maxShieldHP - 1) * 4 + i * 8;
                const py = shieldCY - shieldRadius - 5;
                graphics.fillStyle(i < this.shieldHP ? 0x44ccff : 0x223344, 0.7);
                graphics.fillCircle(px, py, 2);
            }
        }
    }

    _drawRuinedBuilding(graphics, b) {
        // Rubble
        graphics.fillStyle(0x3a3a3a, 0.4);
        graphics.fillRect(b.x, this.y - b.h, b.w, b.h);
        // Jagged top
        graphics.fillStyle(0x2a2a2a, 0.5);
        for (let i = 0; i < 3; i++) {
            const jx = b.x + (b.w / 3) * i;
            const jh = Helpers.randomRange(1, 4);
            graphics.fillRect(jx, this.y - b.h - jh, b.w / 3, jh);
        }
    }

    _drawDestroyed(graphics) {
        // Rubble pile
        graphics.fillStyle(0x3a3a3a, 0.35);
        for (let i = 0; i < 6; i++) {
            const rx = this.x + (i - 3) * 7;
            const ry = this.y - Helpers.randomRange(0, 4);
            graphics.fillRect(rx - 3, ry - 2, 6, 4);
        }

        // Smoke wisps
        const smokeAlpha = 0.08 + Math.sin(this.ambientTimer * 2) * 0.03;
        graphics.fillStyle(0x555555, smokeAlpha);
        graphics.fillCircle(this.x, this.y - 12, 8);
        graphics.fillCircle(this.x - 8, this.y - 18, 5);
        graphics.fillCircle(this.x + 6, this.y - 15, 4);

        // Embers
        if (Math.random() < 0.05) {
            graphics.fillStyle(0xff6600, 0.3);
            graphics.fillCircle(
                this.x + Helpers.randomRange(-15, 15),
                this.y - Helpers.randomRange(2, 10),
                1
            );
        }
    }
}
