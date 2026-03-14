// Tower.js — Tower types, rendering, targeting, and upgrades

import { hexToPixel, hexDistance, hexCorners, HEX_SIZE } from './HexGrid.js';

// Tower type definitions (nerfed base stats)
export const TOWER_TYPES = {
    laser: {
        name: 'Laser',
        cost: 50,
        damage: 5,
        range: 2.5,
        fireRate: 3.5, // shots per second
        color: 0x00ffcc,
        description: 'Rapid fire beam',
        projectileSpeed: 380,
    },
    pulse: {
        name: 'Pulse',
        cost: 75,
        damage: 10,
        range: 2.0,
        fireRate: 0.8,
        color: 0xaa44ff,
        description: 'Area damage ring',
        aoe: true,
        aoeRadius: 50,
    },
    slow: {
        name: 'Slow',
        cost: 60,
        damage: 0,
        range: 2.5,
        fireRate: 2,
        color: 0x4488ff,
        description: 'Slows enemies',
        slowFactor: 0.35,
        slowDuration: 1.2,
    },
    sniper: {
        name: 'Sniper',
        cost: 100,
        damage: 35,
        range: 4.5,
        fireRate: 0.4,
        color: 0xffffff,
        description: 'Long range, high damage',
        projectileSpeed: 800,
    },
};

// Upgrade multipliers per level (5 levels: 0-4)
const UPGRADE_MULTS = [
    { damage: 1.0, range: 1.0,  fireRate: 1.0,  cost: 0 },       // Level 1 (base)
    { damage: 1.2, range: 1.05, fireRate: 1.1,  cost: 0.6 },     // Level 2
    { damage: 1.5, range: 1.10, fireRate: 1.2,  cost: 1.0 },     // Level 3
    { damage: 1.8, range: 1.15, fireRate: 1.3,  cost: 1.6 },     // Level 4
    { damage: 2.2, range: 1.20, fireRate: 1.4,  cost: 2.5 },     // Level 5
];

export const MAX_LEVEL = UPGRADE_MULTS.length - 1;

export class Tower {
    constructor(type, q, r, container) {
        const def = TOWER_TYPES[type];
        this.type = type;
        this.q = q;
        this.r = r;
        this.level = 0; // 0-indexed (0 to 4)
        this.def = def;

        const pos = hexToPixel(q, r);
        this.x = pos.x;
        this.y = pos.y;

        // Stats (will be updated by applyLevel)
        this.damage = def.damage;
        this.range = def.range;
        this.fireRate = def.fireRate;
        this.fireCooldown = 0;

        // Graphics
        this.container = new PIXI.Container();
        this.baseGraphic = new PIXI.Graphics();
        this.turretGraphic = new PIXI.Graphics();
        this.auraGraphic = new PIXI.Graphics();
        this.muzzleFlash = new PIXI.Graphics();

        this.container.addChild(this.auraGraphic);
        this.container.addChild(this.baseGraphic);
        this.container.addChild(this.turretGraphic);
        this.container.addChild(this.muzzleFlash);
        this.container.x = this.x;
        this.container.y = this.y;
        container.addChild(this.container);

        this.targetAngle = 0;
        this.currentAngle = 0;
        this.muzzleFlashTimer = 0;
        this.idleTime = 0;
        this.hasTarget = false;
        this.auraTime = 0;
        this.drawTower();
    }

    getUpgradeCost() {
        if (this.level >= MAX_LEVEL) return null;
        const nextLevel = this.level + 1;
        return Math.floor(this.def.cost * UPGRADE_MULTS[nextLevel].cost);
    }

    getSellValue() {
        let total = this.def.cost;
        for (let i = 1; i <= this.level; i++) {
            total += Math.floor(this.def.cost * UPGRADE_MULTS[i].cost);
        }
        return Math.floor(total * 0.6);
    }

    upgrade() {
        if (this.level >= MAX_LEVEL) return false;
        this.level++;
        this.applyLevel();
        this.drawTower();
        return true;
    }

    applyLevel() {
        const mult = UPGRADE_MULTS[this.level];
        this.damage = Math.floor(this.def.damage * mult.damage);
        this.range = this.def.range * mult.range;
        this.fireRate = this.def.fireRate * mult.fireRate;
    }

    drawTower() {
        this.drawBase();
        this.drawTurret();
        this.drawAura();
    }

    drawBase() {
        const g = this.baseGraphic;
        g.clear();
        const color = this.def.color;
        const level = this.level;

        // Platform/foundation - octagonal base
        const baseSize = HEX_SIZE * 0.45 + level * 1.5;

        // Dark filled platform
        g.beginFill(0x1a2a3a, 0.8);
        g.lineStyle(1.5 + level * 0.3, color, 0.35 + level * 0.08);
        for (let i = 0; i < 8; i++) {
            const angle = (Math.PI / 4) * i;
            const px = baseSize * Math.cos(angle);
            const py = baseSize * Math.sin(angle);
            if (i === 0) g.moveTo(px, py);
            else g.lineTo(px, py);
        }
        g.closePath();
        g.endFill();

        // Level indicators - small dots around base
        if (level > 0) {
            const dotCount = level + 1;
            for (let i = 0; i < dotCount; i++) {
                const angle = (Math.PI * 2 / dotCount) * i - Math.PI / 2;
                const dotX = (baseSize + 4) * Math.cos(angle);
                const dotY = (baseSize + 4) * Math.sin(angle);
                g.beginFill(color, 0.5 + level * 0.05);
                g.drawCircle(dotX, dotY, 1.5);
                g.endFill();
            }
        }

        // Inner tech ring at higher levels
        if (level >= 2) {
            g.lineStyle(0.5, color, 0.15 + (level - 2) * 0.05);
            g.drawCircle(0, 0, baseSize * 0.6);
        }
    }

    drawTurret() {
        const g = this.turretGraphic;
        g.clear();
        const color = this.def.color;
        const level = this.level;
        const lf = level / MAX_LEVEL; // level fraction 0-1

        switch (this.type) {
            case 'laser': {
                // Machine gun turret - central housing + barrel(s)
                g.beginFill(color, 0.5);
                g.drawCircle(0, 0, 4 + level * 0.8);
                g.endFill();
                g.lineStyle(1, color, 0.7);
                g.drawCircle(0, 0, 4 + level * 0.8);

                // Main barrel
                const barrelLen = 12 + level * 2;
                const barrelW = 1.5 + level * 0.3;
                g.beginFill(color, 0.7);
                g.drawRect(2, -barrelW, barrelLen, barrelW * 2);
                g.endFill();

                // Muzzle tip
                g.beginFill(color, 0.9);
                g.drawCircle(barrelLen + 2, 0, 1.5 + level * 0.2);
                g.endFill();

                // Extra barrels at higher levels
                if (level >= 2) {
                    g.beginFill(color, 0.5);
                    g.drawRect(2, -barrelW - 2.5, barrelLen - 3, barrelW * 0.8);
                    g.endFill();
                }
                if (level >= 3) {
                    g.beginFill(color, 0.5);
                    g.drawRect(2, barrelW + 0.5, barrelLen - 3, barrelW * 0.8);
                    g.endFill();
                }
                if (level >= 4) {
                    // Max level: energy core glow
                    g.beginFill(color, 0.3);
                    g.drawCircle(0, 0, 7);
                    g.endFill();
                }
                break;
            }
            case 'pulse': {
                // Satellite dish / emitter dome
                g.beginFill(color, 0.3);
                g.drawCircle(0, 0, 7 + level * 1.5);
                g.endFill();

                // Dish arc
                g.lineStyle(1.5 + level * 0.3, color, 0.7);
                g.arc(3, 0, 9 + level * 1.5, Math.PI * 0.65, Math.PI * 1.35);

                // Emitter core
                g.beginFill(color, 0.8);
                g.drawCircle(0, 0, 2.5 + level * 0.6);
                g.endFill();

                // Energy rings
                g.lineStyle(1, color, 0.3);
                g.drawCircle(0, 0, 10 + level * 1.5);

                if (level >= 1) {
                    g.lineStyle(0.5, color, 0.2);
                    g.drawCircle(0, 0, 13 + level * 1.5);
                }
                if (level >= 3) {
                    g.lineStyle(0.5, color, 0.15);
                    g.drawCircle(0, 0, 16 + level);
                }
                break;
            }
            case 'slow': {
                // Cryo emitter - crystal/ice spikes
                g.beginFill(color, 0.6);
                g.drawCircle(0, 0, 3.5 + level * 0.6);
                g.endFill();

                // Ice crystal spikes (more with level)
                const spikeCount = 4 + level;
                const spikeLen = 8 + level * 2;
                for (let i = 0; i < spikeCount; i++) {
                    const angle = (Math.PI * 2 / spikeCount) * i;
                    const tipX = Math.cos(angle) * spikeLen;
                    const tipY = Math.sin(angle) * spikeLen;
                    const perpX = Math.cos(angle + Math.PI / 2) * 1.8;
                    const perpY = Math.sin(angle + Math.PI / 2) * 1.8;

                    g.beginFill(color, 0.35 + lf * 0.15);
                    g.moveTo(perpX, perpY);
                    g.lineTo(tipX, tipY);
                    g.lineTo(-perpX, -perpY);
                    g.closePath();
                    g.endFill();
                }

                // Glow ring
                g.lineStyle(1.5, color, 0.2 + lf * 0.1);
                g.drawCircle(0, 0, spikeLen + 2);

                if (level >= 1) {
                    g.lineStyle(1, 0xaaddff, 0.25);
                    g.drawCircle(0, 0, 5 + level * 0.8);
                }
                break;
            }
            case 'sniper': {
                // Long cannon with scope
                const barrelLen = 16 + level * 3;
                const barrelW = 2 + level * 0.3;

                // Barrel mount/breech
                g.beginFill(color, 0.5);
                g.drawRect(-3.5, -barrelW - 1, 7, (barrelW + 1) * 2);
                g.endFill();

                // Main barrel
                g.beginFill(color, 0.6);
                g.drawRect(0, -barrelW, barrelLen, barrelW * 2);
                g.endFill();
                g.lineStyle(1, color, 0.8);
                g.drawRect(0, -barrelW, barrelLen, barrelW * 2);

                // Scope on top
                g.beginFill(color, 0.7);
                g.drawRect(barrelLen * 0.3, -barrelW - 2.5, 5 + level * 0.8, 2);
                g.endFill();

                // Scope lens
                g.beginFill(0xff4444, 0.6);
                g.drawCircle(barrelLen * 0.3 + 2.5 + level * 0.4, -barrelW - 4, 1.3);
                g.endFill();

                // Muzzle brake
                g.lineStyle(1.5, color, 0.8);
                const muzzleX = barrelLen;
                g.moveTo(muzzleX, -barrelW - 1.5);
                g.lineTo(muzzleX + 2.5, -barrelW - 1.5);
                g.moveTo(muzzleX, barrelW + 1.5);
                g.lineTo(muzzleX + 2.5, barrelW + 1.5);

                // Crosshair at higher levels
                if (level >= 1) {
                    g.lineStyle(0.5, 0xff4444, 0.3 + level * 0.05);
                    const chX = muzzleX + 5;
                    g.drawCircle(chX, 0, 2.5);
                    g.moveTo(chX - 3.5, 0);
                    g.lineTo(chX + 3.5, 0);
                    g.moveTo(chX, -3.5);
                    g.lineTo(chX, 3.5);
                }

                // Stabilizer fins at level 3+
                if (level >= 3) {
                    g.lineStyle(1, color, 0.5);
                    g.moveTo(barrelLen * 0.5, barrelW);
                    g.lineTo(barrelLen * 0.5 + 3, barrelW + 3);
                    g.moveTo(barrelLen * 0.5, -barrelW);
                    g.lineTo(barrelLen * 0.5 + 3, -barrelW - 3);
                }
                break;
            }
        }
    }

    drawAura() {
        const g = this.auraGraphic;
        g.clear();

        // Progressive aura from level 2+
        if (this.level >= 2) {
            const intensity = (this.level - 1) / (MAX_LEVEL - 1);
            g.lineStyle(1.5, this.def.color, 0.1 + intensity * 0.08);
            g.drawCircle(0, 0, HEX_SIZE * 0.65);
            if (this.level >= 3) {
                g.lineStyle(0.8, this.def.color, 0.06 + intensity * 0.04);
                g.drawCircle(0, 0, HEX_SIZE * 0.8);
            }
            if (this.level >= 4) {
                g.lineStyle(0.5, this.def.color, 0.04);
                g.drawCircle(0, 0, HEX_SIZE * 0.95);
            }
        }
    }

    showMuzzleFlash() {
        this.muzzleFlashTimer = 0.08;
    }

    updateMuzzleFlash(dt) {
        const g = this.muzzleFlash;
        if (this.muzzleFlashTimer > 0) {
            this.muzzleFlashTimer -= dt;
            g.clear();
            const alpha = this.muzzleFlashTimer / 0.08;
            const color = this.def.color;
            // Flash at muzzle position
            const barrelLen = this.type === 'sniper' ? 16 + this.level * 3 : 12 + this.level * 2;
            g.beginFill(0xffffff, alpha * 0.8);
            g.drawCircle(barrelLen + 2, 0, 3 + this.level * 0.5);
            g.endFill();
            g.beginFill(color, alpha * 0.5);
            g.drawCircle(barrelLen + 2, 0, 5 + this.level);
            g.endFill();
            g.rotation = this.currentAngle;
        } else {
            g.clear();
        }
    }

    updateAuraAnimation(dt) {
        if (this.level < 2) return;
        this.auraTime += dt;
        const g = this.auraGraphic;
        g.clear();

        const intensity = (this.level - 1) / (MAX_LEVEL - 1);
        const pulse = Math.sin(this.auraTime * 2) * 0.03;

        g.lineStyle(1.5, this.def.color, 0.1 + intensity * 0.08 + pulse);
        g.drawCircle(0, 0, HEX_SIZE * 0.65);
        if (this.level >= 3) {
            g.lineStyle(0.8, this.def.color, 0.06 + intensity * 0.04 + pulse * 0.5);
            g.drawCircle(0, 0, HEX_SIZE * 0.8);
        }
        if (this.level >= 4) {
            g.lineStyle(0.5, this.def.color, 0.04 + pulse * 0.3);
            g.drawCircle(0, 0, HEX_SIZE * 0.95);
        }
    }

    findTarget(enemies) {
        let bestTarget = null;
        let bestProgress = -1;

        for (const enemy of enemies) {
            if (!enemy.alive) continue;
            const dx = enemy.x - this.x;
            const dy = enemy.y - this.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const rangePixels = this.range * HEX_SIZE * 1.8;

            if (dist <= rangePixels) {
                const progress = enemy.getPathPercent();
                if (progress > bestProgress) {
                    bestProgress = progress;
                    bestTarget = enemy;
                }
            }
        }
        return bestTarget;
    }

    update(dt, enemies, createProjectile, particles, audio) {
        // Cooldown
        this.fireCooldown -= dt;

        // Find target
        const target = this.findTarget(enemies);
        this.hasTarget = !!target;

        if (target) {
            // Rotate turret toward target (smooth lerp)
            const dx = target.x - this.x;
            const dy = target.y - this.y;
            this.targetAngle = Math.atan2(dy, dx);

            const angleDiff = ((this.targetAngle - this.currentAngle) + Math.PI * 3) % (Math.PI * 2) - Math.PI;
            this.currentAngle += angleDiff * Math.min(1, dt * 12);
            this.turretGraphic.rotation = this.currentAngle;

            this.idleTime = 0;

            // Fire
            if (this.fireCooldown <= 0) {
                this.fireCooldown = 1 / this.fireRate;
                this.fire(target, createProjectile, particles, audio);
            }
        } else {
            // Idle oscillation
            this.idleTime += dt;
            const idleSwing = Math.sin(this.idleTime * 0.8) * 0.15;
            this.currentAngle += (this.targetAngle + idleSwing - this.currentAngle) * dt * 2;
            this.turretGraphic.rotation = this.currentAngle;
        }

        // Update muzzle flash
        this.updateMuzzleFlash(dt);

        // Update aura animation
        this.updateAuraAnimation(dt);
    }

    fire(target, createProjectile, particles, audio) {
        audio.towerShoot(this.type);
        this.showMuzzleFlash();

        if (this.type === 'pulse') {
            const aoeRadius = this.def.aoeRadius + this.level * 12;
            particles.pulseRing(this.x, this.y, aoeRadius, this.def.color);
            createProjectile({
                type: 'pulse',
                x: this.x,
                y: this.y,
                damage: this.damage,
                aoeRadius,
                tower: this,
            });
        } else if (this.type === 'slow') {
            const rangePixels = this.range * HEX_SIZE * 1.8;
            createProjectile({
                type: 'slow',
                x: this.x,
                y: this.y,
                range: rangePixels,
                slowFactor: this.def.slowFactor,
                slowDuration: this.def.slowDuration + this.level * 0.2,
                tower: this,
            });
        } else if (this.type === 'sniper') {
            particles.tracerLine(this.x, this.y, target.x, target.y, this.def.color);
            createProjectile({
                type: 'sniper',
                target,
                damage: this.damage,
                tower: this,
            });
        } else {
            createProjectile({
                type: 'laser',
                x: this.x,
                y: this.y,
                targetX: target.x,
                targetY: target.y,
                damage: this.damage,
                speed: this.def.projectileSpeed,
                color: this.def.color,
                tower: this,
            });
        }
    }

    destroy() {
        if (this.container.parent) {
            this.container.parent.removeChild(this.container);
        }
        this.container.destroy({ children: true });
    }
}
