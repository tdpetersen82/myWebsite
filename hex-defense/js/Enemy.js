// Enemy.js — Enemy types, rendering, and path following

import { hexToPixel, ENEMY_PATH } from './HexGrid.js';

// Enemy type definitions (reduced rewards, tighter economy)
export const ENEMY_TYPES = {
    scout: {
        name: 'Scout',
        shape: 'bug',
        color: 0x44ffaa,
        hp: 30,
        speed: 105,
        reward: 8,
        size: 10,
    },
    soldier: {
        name: 'Soldier',
        shape: 'beetle',
        color: 0xffaa44,
        hp: 60,
        speed: 60,
        reward: 12,
        size: 13,
    },
    tank: {
        name: 'Tank',
        shape: 'crab',
        color: 0xff4466,
        hp: 175,
        speed: 35,
        reward: 20,
        size: 17,
    },
    splitter: {
        name: 'Splitter',
        shape: 'blob',
        color: 0xaa66ff,
        hp: 40,
        speed: 55,
        reward: 15,
        size: 13,
    },
    swarm: {
        name: 'Swarm',
        shape: 'wasp',
        color: 0xffff44,
        hp: 15,
        speed: 140,
        reward: 5,
        size: 7,
    },
    healer: {
        name: 'Healer',
        shape: 'medic',
        color: 0x44ff44,
        hp: 80,
        speed: 45,
        reward: 30,
        size: 14,
        healRadius: 80,
        healRate: 10,
    },
    boss: {
        name: 'Boss',
        shape: 'spider',
        color: 0xff2244,
        hp: 600,
        speed: 32,
        reward: 80,
        size: 21,
        shield: 8,
    },
};

export class Enemy {
    constructor(type, container, waveNum = 1) {
        const def = ENEMY_TYPES[type];
        this.type = type;
        this.maxHp = Math.floor(def.hp * (1 + (waveNum - 1) * 0.30));
        this.hp = this.maxHp;
        this.speed = def.speed;
        this.baseSpeed = def.speed;
        this.reward = def.reward;
        this.size = def.size;
        this.color = def.color;
        this.shape = def.shape;
        this.shield = def.shield || 0;
        this.shieldMax = this.shield;
        this.healRadius = def.healRadius || 0;
        this.healRate = def.healRate || 0;

        // Path following
        this.pathIndex = 0;
        this.pathProgress = 0;

        // Pre-compute path pixel positions
        this.pathPixels = ENEMY_PATH.map(h => hexToPixel(h.q, h.r));

        // Position
        const start = this.pathPixels[0];
        this.x = start.x;
        this.y = start.y;
        this.alive = true;
        this.reachedEnd = false;
        this.facingAngle = 0;

        // Slow effect
        this.slowTimer = 0;
        this.slowFactor = 1;

        // Animation
        this.animTime = Math.random() * Math.PI * 2;

        // Hit flash
        this.hitFlashTimer = 0;

        // Graphics
        this.container = new PIXI.Container();
        this.glowGraphic = new PIXI.Graphics();
        this.graphic = new PIXI.Graphics();
        this.hpBar = new PIXI.Graphics();
        this.shieldGraphic = new PIXI.Graphics();
        this.slowGraphic = new PIXI.Graphics();
        this.healAura = new PIXI.Graphics();
        this.container.addChild(this.glowGraphic);
        this.container.addChild(this.graphic);
        this.container.addChild(this.shieldGraphic);
        this.container.addChild(this.slowGraphic);
        this.container.addChild(this.healAura);
        this.container.addChild(this.hpBar);
        container.addChild(this.container);

        this.drawShape();
        this.pulseTime = Math.random() * Math.PI * 2;
    }

    drawShape() {
        const g = this.graphic;
        g.clear();
        const s = this.size;
        const c = this.color;

        switch (this.shape) {
            case 'bug': {
                g.beginFill(c, 0.6);
                g.drawEllipse(0, 0, s * 0.9, s * 0.55);
                g.endFill();
                g.lineStyle(1, c, 0.8);
                g.drawEllipse(0, 0, s * 0.9, s * 0.55);

                g.beginFill(c, 0.7);
                g.drawCircle(s * 0.7, 0, s * 0.35);
                g.endFill();

                g.beginFill(0xffffff, 0.9);
                g.drawCircle(s * 0.85, -s * 0.15, 1.5);
                g.drawCircle(s * 0.85, s * 0.15, 1.5);
                g.endFill();

                g.lineStyle(1, c, 0.6);
                for (let i = 0; i < 3; i++) {
                    const lx = -s * 0.3 + i * s * 0.4;
                    const legLen = s * 0.5;
                    g.moveTo(lx, -s * 0.4);
                    g.lineTo(lx - 2, -s * 0.4 - legLen);
                    g.moveTo(lx, s * 0.4);
                    g.lineTo(lx - 2, s * 0.4 + legLen);
                }

                g.lineStyle(0.8, c, 0.5);
                g.moveTo(s * 0.9, -s * 0.2);
                g.lineTo(s * 1.3, -s * 0.5);
                g.moveTo(s * 0.9, s * 0.2);
                g.lineTo(s * 1.3, s * 0.5);
                break;
            }
            case 'beetle': {
                g.beginFill(c, 0.5);
                g.drawEllipse(0, 0, s * 1.0, s * 0.7);
                g.endFill();
                g.lineStyle(1.5, c, 0.8);
                g.drawEllipse(0, 0, s * 1.0, s * 0.7);

                g.lineStyle(1, c, 0.4);
                g.moveTo(-s * 0.3, -s * 0.15);
                g.lineTo(s * 0.5, -s * 0.15);
                g.moveTo(-s * 0.3, s * 0.15);
                g.lineTo(s * 0.5, s * 0.15);

                g.lineStyle(1, c, 0.3);
                g.moveTo(-s * 0.6, 0);
                g.lineTo(s * 0.6, 0);

                g.beginFill(c, 0.65);
                g.drawCircle(s * 0.8, 0, s * 0.35);
                g.endFill();

                g.lineStyle(1.5, c, 0.7);
                g.moveTo(s * 1.0, -s * 0.1);
                g.lineTo(s * 1.3, -s * 0.25);
                g.moveTo(s * 1.0, s * 0.1);
                g.lineTo(s * 1.3, s * 0.25);

                g.beginFill(0xffffff, 0.9);
                g.drawCircle(s * 0.9, -s * 0.2, 1.5);
                g.drawCircle(s * 0.9, s * 0.2, 1.5);
                g.endFill();

                g.lineStyle(1.2, c, 0.5);
                for (let i = 0; i < 3; i++) {
                    const lx = -s * 0.4 + i * s * 0.4;
                    g.moveTo(lx, -s * 0.6);
                    g.lineTo(lx - 3, -s * 0.6 - s * 0.4);
                    g.moveTo(lx, s * 0.6);
                    g.lineTo(lx - 3, s * 0.6 + s * 0.4);
                }
                break;
            }
            case 'crab': {
                g.beginFill(c, 0.5);
                g.drawEllipse(0, 0, s * 0.9, s * 0.8);
                g.endFill();
                g.lineStyle(2, c, 0.8);
                g.drawEllipse(0, 0, s * 0.9, s * 0.8);

                g.lineStyle(1.5, c, 0.4);
                g.drawEllipse(0, 0, s * 0.6, s * 0.5);

                g.lineStyle(1, c, 0.6);
                g.moveTo(s * 0.5, -s * 0.3);
                g.lineTo(s * 0.8, -s * 0.5);
                g.moveTo(s * 0.5, s * 0.3);
                g.lineTo(s * 0.8, s * 0.5);
                g.beginFill(0xffffff, 0.9);
                g.drawCircle(s * 0.8, -s * 0.5, 2);
                g.drawCircle(s * 0.8, s * 0.5, 2);
                g.endFill();

                g.lineStyle(2, c, 0.7);
                g.moveTo(s * 0.6, -s * 0.6);
                g.lineTo(s * 1.2, -s * 0.7);
                g.lineTo(s * 1.0, -s * 0.4);
                g.moveTo(s * 0.6, s * 0.6);
                g.lineTo(s * 1.2, s * 0.7);
                g.lineTo(s * 1.0, s * 0.4);

                g.lineStyle(1.5, c, 0.5);
                for (let i = 0; i < 4; i++) {
                    const lx = -s * 0.5 + i * s * 0.3;
                    g.moveTo(lx, -s * 0.7);
                    g.lineTo(lx - 2, -s * 0.7 - s * 0.3);
                    g.moveTo(lx, s * 0.7);
                    g.lineTo(lx - 2, s * 0.7 + s * 0.3);
                }
                break;
            }
            case 'blob': {
                g.beginFill(c, 0.35);
                g.lineStyle(1.5, c, 0.7);
                const points = 12;
                for (let i = 0; i <= points; i++) {
                    const angle = (Math.PI * 2 / points) * i;
                    const wobble = 1 + Math.sin(angle * 3) * 0.15 + Math.cos(angle * 2) * 0.1;
                    const px = s * wobble * Math.cos(angle);
                    const py = s * wobble * Math.sin(angle);
                    if (i === 0) g.moveTo(px, py);
                    else g.lineTo(px, py);
                }
                g.closePath();
                g.endFill();

                g.beginFill(c, 0.7);
                g.drawCircle(-s * 0.15, -s * 0.1, s * 0.25);
                g.endFill();
                g.beginFill(c, 0.5);
                g.drawCircle(s * 0.2, s * 0.15, s * 0.18);
                g.endFill();

                g.lineStyle(1, c, 0.3);
                g.moveTo(0, -s * 0.7);
                g.lineTo(0, s * 0.7);
                break;
            }
            case 'wasp': {
                // Small fast wasp — triangular body with wings
                // Body
                g.beginFill(c, 0.7);
                g.moveTo(s * 0.8, 0);
                g.lineTo(-s * 0.5, -s * 0.4);
                g.lineTo(-s * 0.5, s * 0.4);
                g.closePath();
                g.endFill();
                g.lineStyle(1, c, 0.9);
                g.moveTo(s * 0.8, 0);
                g.lineTo(-s * 0.5, -s * 0.4);
                g.lineTo(-s * 0.5, s * 0.4);
                g.closePath();

                // Stinger
                g.lineStyle(1.5, c, 0.8);
                g.moveTo(-s * 0.5, 0);
                g.lineTo(-s * 0.9, 0);

                // Eyes
                g.beginFill(0xff0000, 0.9);
                g.drawCircle(s * 0.4, -s * 0.12, 1);
                g.drawCircle(s * 0.4, s * 0.12, 1);
                g.endFill();

                // Wings (translucent)
                g.beginFill(0xffffff, 0.15);
                g.drawEllipse(0, -s * 0.5, s * 0.4, s * 0.25);
                g.drawEllipse(0, s * 0.5, s * 0.4, s * 0.25);
                g.endFill();
                g.lineStyle(0.5, c, 0.3);
                g.drawEllipse(0, -s * 0.5, s * 0.4, s * 0.25);
                g.drawEllipse(0, s * 0.5, s * 0.4, s * 0.25);

                // Stripes
                g.lineStyle(1, 0x000000, 0.3);
                g.moveTo(0, -s * 0.3);
                g.lineTo(0, s * 0.3);
                g.moveTo(-s * 0.25, -s * 0.35);
                g.lineTo(-s * 0.25, s * 0.35);
                break;
            }
            case 'medic': {
                // Healer — rounded body with cross symbol
                g.beginFill(c, 0.5);
                g.drawCircle(0, 0, s * 0.8);
                g.endFill();
                g.lineStyle(1.5, c, 0.8);
                g.drawCircle(0, 0, s * 0.8);

                // Cross symbol
                const crossW = s * 0.25;
                const crossH = s * 0.55;
                g.beginFill(0xffffff, 0.7);
                g.drawRect(-crossW / 2, -crossH / 2, crossW, crossH);
                g.drawRect(-crossH / 2, -crossW / 2, crossH, crossW);
                g.endFill();

                // Outer healing ring
                g.lineStyle(1, c, 0.4);
                g.drawCircle(0, 0, s * 1.0);

                // Small pulse dots around perimeter
                for (let i = 0; i < 4; i++) {
                    const angle = (Math.PI / 2) * i;
                    g.beginFill(c, 0.6);
                    g.drawCircle(Math.cos(angle) * s * 0.95, Math.sin(angle) * s * 0.95, 1.5);
                    g.endFill();
                }
                break;
            }
            case 'spider': {
                g.beginFill(c, 0.5);
                g.drawEllipse(-s * 0.3, 0, s * 0.6, s * 0.55);
                g.endFill();
                g.lineStyle(1.5, c, 0.7);
                g.drawEllipse(-s * 0.3, 0, s * 0.6, s * 0.55);

                g.beginFill(c, 0.6);
                g.drawEllipse(s * 0.35, 0, s * 0.45, s * 0.4);
                g.endFill();
                g.lineStyle(1.5, c, 0.8);
                g.drawEllipse(s * 0.35, 0, s * 0.45, s * 0.4);

                g.beginFill(0xffff44, 0.9);
                g.drawCircle(s * 0.55, -s * 0.12, 2);
                g.drawCircle(s * 0.55, s * 0.12, 2);
                g.endFill();
                g.beginFill(0xff4444, 0.7);
                g.drawCircle(s * 0.65, -s * 0.06, 1.5);
                g.drawCircle(s * 0.65, s * 0.06, 1.5);
                g.endFill();

                g.lineStyle(2, c, 0.9);
                g.moveTo(s * 0.7, -s * 0.15);
                g.lineTo(s * 1.0, -s * 0.3);
                g.lineTo(s * 0.95, 0);
                g.moveTo(s * 0.7, s * 0.15);
                g.lineTo(s * 1.0, s * 0.3);
                g.lineTo(s * 0.95, 0);

                g.lineStyle(1.5, c, 0.6);
                const legAngles = [-0.6, -0.3, 0.3, 0.6];
                for (const la of legAngles) {
                    const baseX = s * 0.1;
                    const knee1X = baseX + Math.cos(-Math.PI / 2 + la) * s * 0.6;
                    const knee1Y = -s * 0.35 + Math.sin(-Math.PI / 2 + la) * s * 0.3;
                    g.moveTo(baseX, -s * 0.35);
                    g.lineTo(knee1X, knee1Y);
                    g.lineTo(knee1X - 3, knee1Y - s * 0.4);
                    const knee2X = baseX + Math.cos(Math.PI / 2 - la) * s * 0.6;
                    const knee2Y = s * 0.35 + Math.sin(Math.PI / 2 - la) * s * 0.3;
                    g.moveTo(baseX, s * 0.35);
                    g.lineTo(knee2X, knee2Y);
                    g.lineTo(knee2X - 3, knee2Y + s * 0.4);
                }

                g.lineStyle(1.5, c, 0.6);
                g.moveTo(-s * 0.8, 0);
                g.quadraticCurveTo(-s * 1.2, -s * 0.4, -s * 1.0, -s * 0.7);
                g.beginFill(0xffaa00, 0.8);
                g.drawCircle(-s * 1.0, -s * 0.7, 2.5);
                g.endFill();
                break;
            }
        }
    }

    applySlow(factor, duration) {
        this.slowFactor = Math.min(this.slowFactor, factor);
        this.slowTimer = Math.max(this.slowTimer, duration);
    }

    takeDamage(amount) {
        if (this.shield > 0) {
            this.shield--;
            return false;
        }
        this.hp -= amount;
        this.hitFlashTimer = 0.06; // trigger hit flash
        if (this.hp <= 0) {
            this.hp = 0;
            this.alive = false;
            return true;
        }
        return false;
    }

    getPathPercent() {
        return (this.pathIndex + this.pathProgress) / (this.pathPixels.length - 1);
    }

    update(dt) {
        if (!this.alive) return;

        // Update slow
        if (this.slowTimer > 0) {
            this.slowTimer -= dt;
            if (this.slowTimer <= 0) {
                this.slowFactor = 1;
            }
        }

        // Move along path
        const effectiveSpeed = this.speed * this.slowFactor;
        const moveAmount = effectiveSpeed * dt;

        if (this.pathIndex < this.pathPixels.length - 1) {
            const current = this.pathPixels[this.pathIndex];
            const next = this.pathPixels[this.pathIndex + 1];
            const dx = next.x - current.x;
            const dy = next.y - current.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            this.pathProgress += moveAmount / dist;
            this.facingAngle = Math.atan2(dy, dx);

            while (this.pathProgress >= 1 && this.pathIndex < this.pathPixels.length - 2) {
                this.pathProgress -= 1;
                this.pathIndex++;
            }

            if (this.pathIndex >= this.pathPixels.length - 2 && this.pathProgress >= 1) {
                this.reachedEnd = true;
                this.alive = false;
                return;
            }

            const cur = this.pathPixels[this.pathIndex];
            const nxt = this.pathPixels[this.pathIndex + 1];
            this.x = cur.x + (nxt.x - cur.x) * this.pathProgress;
            this.y = cur.y + (nxt.y - cur.y) * this.pathProgress;

            const sdx = nxt.x - cur.x;
            const sdy = nxt.y - cur.y;
            this.facingAngle = Math.atan2(sdy, sdx);
        }

        // Update visuals
        this.container.x = this.x;
        this.container.y = this.y;
        this.graphic.rotation = this.facingAngle;

        // Animate
        this.animTime += dt * 4;
        this.pulseTime += dt * 3;

        // Walking bob / blob wobble
        if (this.shape !== 'blob') {
            const bob = Math.sin(this.animTime * 2) * 0.8;
            this.graphic.y = bob;
        } else {
            const wobbleX = 1 + Math.sin(this.animTime) * 0.06;
            const wobbleY = 1 + Math.cos(this.animTime * 1.3) * 0.06;
            this.graphic.scale.set(wobbleX, wobbleY);
        }

        // Wing flutter for wasps
        if (this.shape === 'wasp') {
            const flutter = Math.sin(this.animTime * 8) * 0.12;
            this.graphic.scale.set(1, 1 + flutter);
        }

        // Hit flash
        if (this.hitFlashTimer > 0) {
            this.hitFlashTimer -= dt;
            this.graphic.tint = 0xffffff;
        } else if (this.slowTimer > 0) {
            this.graphic.tint = 0x6688ff;
            this.drawFrostRing();
        } else {
            this.graphic.tint = 0xffffff;
            this.slowGraphic.clear();
        }

        // Pulsing glow behind enemy
        this.drawGlow();

        // HP bar
        this.drawHpBar();

        // Shield visual
        this.drawShield();

        // Healer aura
        this.drawHealerAura();
    }

    drawGlow() {
        const g = this.glowGraphic;
        g.clear();
        const pulse = Math.sin(this.pulseTime) * 0.05 + 0.12;
        g.beginFill(this.color, pulse);
        g.drawCircle(0, 0, this.size * 1.5);
        g.endFill();
    }

    drawHealerAura() {
        const g = this.healAura;
        g.clear();
        if (this.type !== 'healer') return;

        const pulse = Math.sin(this.pulseTime * 1.5) * 0.08 + 0.2;
        g.lineStyle(1.5, 0x44ff44, pulse);
        g.drawCircle(0, 0, this.healRadius * 0.4);
        g.lineStyle(0.8, 0x44ff44, pulse * 0.5);
        g.drawCircle(0, 0, this.healRadius * 0.6);

        // Rotating heal particles
        const particleCount = 3;
        for (let i = 0; i < particleCount; i++) {
            const angle = (Math.PI * 2 / particleCount) * i + this.animTime * 0.6;
            const radius = this.healRadius * 0.35;
            const px = Math.cos(angle) * radius;
            const py = Math.sin(angle) * radius;
            g.beginFill(0x88ff88, 0.4);
            // Small cross
            g.drawRect(px - 1.5, py - 0.5, 3, 1);
            g.drawRect(px - 0.5, py - 1.5, 1, 3);
            g.endFill();
        }
    }

    drawFrostRing() {
        const g = this.slowGraphic;
        g.clear();
        const orbRadius = this.size + 5;
        const crystalCount = 3;
        for (let i = 0; i < crystalCount; i++) {
            const angle = (Math.PI * 2 / crystalCount) * i + this.animTime * 0.8;
            const cx = Math.cos(angle) * orbRadius;
            const cy = Math.sin(angle) * orbRadius;
            const cSize = 3.5;
            g.beginFill(0x88ccff, 0.5);
            g.moveTo(cx, cy - cSize);
            g.lineTo(cx + cSize * 0.6, cy);
            g.lineTo(cx, cy + cSize);
            g.lineTo(cx - cSize * 0.6, cy);
            g.closePath();
            g.endFill();
        }
        g.lineStyle(0.8, 0x88ccff, 0.2);
        g.drawCircle(0, 0, orbRadius);
    }

    drawHpBar() {
        const g = this.hpBar;
        g.clear();
        if (this.hp >= this.maxHp) return;

        const w = this.size * 2.2;
        const h = 3;
        const yOff = -this.size - 8;

        g.beginFill(0x333333, 0.7);
        g.drawRect(-w / 2, yOff, w, h);
        g.endFill();

        const pct = this.hp / this.maxHp;
        const color = pct > 0.5 ? 0x44ff88 : pct > 0.25 ? 0xffaa44 : 0xff4444;
        g.beginFill(color, 0.9);
        g.drawRect(-w / 2, yOff, w * pct, h);
        g.endFill();
    }

    drawShield() {
        const g = this.shieldGraphic;
        g.clear();
        if (this.shield <= 0) return;

        g.lineStyle(2, 0x44aaff, 0.4);
        g.drawCircle(0, 0, this.size + 5);
        g.lineStyle(0.5, 0x88ccff, 0.2);
        g.drawCircle(0, 0, this.size + 8);

        // Shield charge indicators
        const chargeCount = Math.min(this.shield, 8);
        for (let i = 0; i < chargeCount; i++) {
            const angle = (Math.PI * 2 / chargeCount) * i + this.animTime * 0.3;
            const px = Math.cos(angle) * (this.size + 6.5);
            const py = Math.sin(angle) * (this.size + 6.5);
            g.beginFill(0x66ccff, 0.5);
            g.drawCircle(px, py, 1.2);
            g.endFill();
        }
    }

    destroy() {
        if (this.container.parent) {
            this.container.parent.removeChild(this.container);
        }
        this.container.destroy({ children: true });
    }
}
