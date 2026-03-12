// Tower.js — Tower types, rendering, targeting, and upgrades

import { hexToPixel, hexDistance, hexCorners, HEX_SIZE } from './HexGrid.js';

// Tower type definitions
export const TOWER_TYPES = {
    laser: {
        name: 'Laser',
        cost: 50,
        damage: 12,
        range: 3,
        fireRate: 6, // shots per second
        color: 0x00ffcc,
        description: 'Rapid fire beam',
        projectileSpeed: 400,
    },
    pulse: {
        name: 'Pulse',
        cost: 75,
        damage: 20,
        range: 2.5,
        fireRate: 1.2,
        color: 0xaa44ff,
        description: 'Area damage ring',
        aoe: true,
        aoeRadius: 60,
    },
    slow: {
        name: 'Slow',
        cost: 60,
        damage: 0,
        range: 2.5,
        fireRate: 2,
        color: 0x4488ff,
        description: 'Slows enemies',
        slowFactor: 0.4,
        slowDuration: 1.5,
    },
    sniper: {
        name: 'Sniper',
        cost: 100,
        damage: 80,
        range: 5,
        fireRate: 0.6,
        color: 0xffffff,
        description: 'Long range, high damage',
        projectileSpeed: 800,
    },
};

// Upgrade multipliers per level
const UPGRADE_MULTS = [
    { damage: 1, range: 1, fireRate: 1, cost: 0 },       // Level 1
    { damage: 1.5, range: 1.1, fireRate: 1.2, cost: 1.5 }, // Level 2
    { damage: 2.2, range: 1.2, fireRate: 1.4, cost: 2.5 }, // Level 3
];

export class Tower {
    constructor(type, q, r, container) {
        const def = TOWER_TYPES[type];
        this.type = type;
        this.q = q;
        this.r = r;
        this.level = 0; // 0-indexed (0, 1, 2)
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

        this.container.addChild(this.auraGraphic);
        this.container.addChild(this.baseGraphic);
        this.container.addChild(this.turretGraphic);
        this.container.x = this.x;
        this.container.y = this.y;
        container.addChild(this.container);

        this.targetAngle = 0;
        this.drawTower();
    }

    getUpgradeCost() {
        if (this.level >= 2) return null; // max level
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
        if (this.level >= 2) return false;
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

        const s = HEX_SIZE * 0.55;
        const color = this.def.color;
        const alpha = 0.15 + this.level * 0.08;

        // Hexagonal base
        g.lineStyle(1.5 + this.level * 0.5, color, 0.6 + this.level * 0.15);
        g.beginFill(color, alpha);
        for (let i = 0; i < 6; i++) {
            const angle = (Math.PI / 3) * i;
            const px = s * Math.cos(angle);
            const py = s * Math.sin(angle);
            if (i === 0) g.moveTo(px, py);
            else g.lineTo(px, py);
        }
        g.closePath();
        g.endFill();
    }

    drawTurret() {
        const g = this.turretGraphic;
        g.clear();
        const color = this.def.color;
        const level = this.level;

        switch (this.type) {
            case 'laser': {
                // Central circle + barrel
                g.beginFill(color, 0.7);
                g.drawCircle(0, 0, 4 + level);
                g.endFill();
                g.lineStyle(2 + level * 0.5, color, 0.9);
                g.moveTo(0, 0);
                g.lineTo(10 + level * 2, 0);
                break;
            }
            case 'pulse': {
                // Concentric rings
                g.lineStyle(2, color, 0.7);
                g.drawCircle(0, 0, 5 + level * 2);
                g.lineStyle(1, color, 0.4);
                g.drawCircle(0, 0, 9 + level * 2);
                g.beginFill(color, 0.5);
                g.drawCircle(0, 0, 3);
                g.endFill();
                break;
            }
            case 'slow': {
                // Snowflake-like pattern
                g.beginFill(color, 0.6);
                g.drawCircle(0, 0, 3 + level);
                g.endFill();
                g.lineStyle(1.5, color, 0.6);
                for (let i = 0; i < 6; i++) {
                    const angle = (Math.PI / 3) * i;
                    g.moveTo(0, 0);
                    g.lineTo(Math.cos(angle) * (8 + level * 2), Math.sin(angle) * (8 + level * 2));
                }
                break;
            }
            case 'sniper': {
                // Long barrel with crosshair
                g.beginFill(color, 0.7);
                g.drawCircle(0, 0, 3 + level);
                g.endFill();
                g.lineStyle(2.5 + level * 0.5, color, 0.9);
                g.moveTo(0, 0);
                g.lineTo(14 + level * 3, 0);
                // Crosshair at tip
                const tipX = 14 + level * 3;
                g.lineStyle(1, color, 0.5);
                g.moveTo(tipX, -3);
                g.lineTo(tipX, 3);
                break;
            }
        }
    }

    drawAura() {
        const g = this.auraGraphic;
        g.clear();

        // Level 3 gets a particle aura
        if (this.level >= 2) {
            g.lineStyle(1, this.def.color, 0.15);
            g.drawCircle(0, 0, HEX_SIZE * 0.7);
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
        if (!target) return;

        // Rotate turret toward target
        const dx = target.x - this.x;
        const dy = target.y - this.y;
        this.targetAngle = Math.atan2(dy, dx);
        this.turretGraphic.rotation = this.targetAngle;

        // Fire
        if (this.fireCooldown <= 0) {
            this.fireCooldown = 1 / this.fireRate;
            this.fire(target, createProjectile, particles, audio);
        }
    }

    fire(target, createProjectile, particles, audio) {
        audio.towerShoot(this.type);

        if (this.type === 'pulse') {
            // AoE damage — hit all enemies in range
            const aoeRadius = this.def.aoeRadius + this.level * 15;
            particles.pulseRing(this.x, this.y, aoeRadius, this.def.color);
            // Damage is applied by the game loop checking distance
            createProjectile({
                type: 'pulse',
                x: this.x,
                y: this.y,
                damage: this.damage,
                aoeRadius,
                tower: this,
            });
        } else if (this.type === 'slow') {
            // Slow all enemies in range
            const rangePixels = this.range * HEX_SIZE * 1.8;
            createProjectile({
                type: 'slow',
                x: this.x,
                y: this.y,
                range: rangePixels,
                slowFactor: this.def.slowFactor,
                slowDuration: this.def.slowDuration + this.level * 0.3,
                tower: this,
            });
        } else if (this.type === 'sniper') {
            // Instant hit + tracer
            particles.tracerLine(this.x, this.y, target.x, target.y, this.def.color);
            createProjectile({
                type: 'sniper',
                target,
                damage: this.damage,
                tower: this,
            });
        } else {
            // Laser — fire a projectile
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
