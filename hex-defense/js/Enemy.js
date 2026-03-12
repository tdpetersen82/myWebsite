// Enemy.js — Enemy types, rendering, and path following

import { hexToPixel, ENEMY_PATH } from './HexGrid.js';

// Enemy type definitions
export const ENEMY_TYPES = {
    scout: {
        name: 'Scout',
        shape: 'triangle',
        color: 0x44ffaa,
        hp: 30,
        speed: 90,
        reward: 10,
        size: 8,
    },
    soldier: {
        name: 'Soldier',
        shape: 'diamond',
        color: 0xffaa44,
        hp: 60,
        speed: 60,
        reward: 15,
        size: 10,
    },
    tank: {
        name: 'Tank',
        shape: 'hexagon',
        color: 0xff4466,
        hp: 150,
        speed: 35,
        reward: 25,
        size: 13,
    },
    splitter: {
        name: 'Splitter',
        shape: 'splitter',
        color: 0xaa66ff,
        hp: 40,
        speed: 55,
        reward: 20,
        size: 10,
    },
    boss: {
        name: 'Boss',
        shape: 'pentagon',
        color: 0xff2244,
        hp: 500,
        speed: 28,
        reward: 100,
        size: 16,
        shield: 5,
    },
};

export class Enemy {
    constructor(type, container, waveNum = 1) {
        const def = ENEMY_TYPES[type];
        this.type = type;
        this.maxHp = Math.floor(def.hp * (1 + (waveNum - 1) * 0.15));
        this.hp = this.maxHp;
        this.speed = def.speed;
        this.baseSpeed = def.speed;
        this.reward = def.reward;
        this.size = def.size;
        this.color = def.color;
        this.shape = def.shape;
        this.shield = def.shield || 0;
        this.shieldMax = this.shield;

        // Path following
        this.pathIndex = 0;
        this.pathProgress = 0; // 0-1 between current and next path node

        // Pre-compute path pixel positions
        this.pathPixels = ENEMY_PATH.map(h => hexToPixel(h.q, h.r));

        // Position
        const start = this.pathPixels[0];
        this.x = start.x;
        this.y = start.y;
        this.alive = true;
        this.reachedEnd = false;

        // Slow effect
        this.slowTimer = 0;
        this.slowFactor = 1;

        // Graphics
        this.container = new PIXI.Container();
        this.graphic = new PIXI.Graphics();
        this.hpBar = new PIXI.Graphics();
        this.shieldGraphic = new PIXI.Graphics();
        this.container.addChild(this.graphic);
        this.container.addChild(this.shieldGraphic);
        this.container.addChild(this.hpBar);
        container.addChild(this.container);

        this.drawShape();
        this.pulseTime = Math.random() * Math.PI * 2;
    }

    drawShape() {
        const g = this.graphic;
        g.clear();
        const s = this.size;

        g.lineStyle(1.5, this.color, 0.9);
        g.beginFill(this.color, 0.3);

        switch (this.shape) {
            case 'triangle':
                g.moveTo(0, -s);
                g.lineTo(s * 0.87, s * 0.5);
                g.lineTo(-s * 0.87, s * 0.5);
                g.closePath();
                break;
            case 'diamond':
                g.moveTo(0, -s);
                g.lineTo(s * 0.7, 0);
                g.lineTo(0, s);
                g.lineTo(-s * 0.7, 0);
                g.closePath();
                break;
            case 'hexagon':
                for (let i = 0; i < 6; i++) {
                    const angle = (Math.PI / 3) * i - Math.PI / 6;
                    const px = s * Math.cos(angle);
                    const py = s * Math.sin(angle);
                    if (i === 0) g.moveTo(px, py);
                    else g.lineTo(px, py);
                }
                g.closePath();
                break;
            case 'pentagon':
                for (let i = 0; i < 5; i++) {
                    const angle = (Math.PI * 2 / 5) * i - Math.PI / 2;
                    const px = s * Math.cos(angle);
                    const py = s * Math.sin(angle);
                    if (i === 0) g.moveTo(px, py);
                    else g.lineTo(px, py);
                }
                g.closePath();
                break;
            case 'splitter':
                // Diamond with a line through it
                g.moveTo(0, -s);
                g.lineTo(s * 0.7, 0);
                g.lineTo(0, s);
                g.lineTo(-s * 0.7, 0);
                g.closePath();
                g.endFill();
                g.lineStyle(1, this.color, 0.6);
                g.moveTo(-s * 0.5, 0);
                g.lineTo(s * 0.5, 0);
                return;
        }
        g.endFill();
    }

    applySlow(factor, duration) {
        this.slowFactor = Math.min(this.slowFactor, factor);
        this.slowTimer = Math.max(this.slowTimer, duration);
    }

    takeDamage(amount) {
        if (this.shield > 0) {
            this.shield--;
            return false; // blocked by shield
        }
        this.hp -= amount;
        if (this.hp <= 0) {
            this.hp = 0;
            this.alive = false;
            return true; // killed
        }
        return false;
    }

    // How far along the total path (0 to 1)
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

            while (this.pathProgress >= 1 && this.pathIndex < this.pathPixels.length - 2) {
                this.pathProgress -= 1;
                this.pathIndex++;
            }

            if (this.pathIndex >= this.pathPixels.length - 2 && this.pathProgress >= 1) {
                this.reachedEnd = true;
                this.alive = false;
                return;
            }

            // Interpolate position
            const cur = this.pathPixels[this.pathIndex];
            const nxt = this.pathPixels[this.pathIndex + 1];
            this.x = cur.x + (nxt.x - cur.x) * this.pathProgress;
            this.y = cur.y + (nxt.y - cur.y) * this.pathProgress;
        }

        // Update visuals
        this.container.x = this.x;
        this.container.y = this.y;

        // Pulse animation
        this.pulseTime += dt * 3;
        const pulse = 1 + Math.sin(this.pulseTime) * 0.05;
        this.graphic.scale.set(pulse);

        // Slow tint
        if (this.slowTimer > 0) {
            this.graphic.tint = 0x6688ff;
        } else {
            this.graphic.tint = 0xffffff;
        }

        // HP bar
        this.drawHpBar();

        // Shield visual
        this.drawShield();
    }

    drawHpBar() {
        const g = this.hpBar;
        g.clear();
        if (this.hp >= this.maxHp) return;

        const w = this.size * 2;
        const h = 3;
        const yOff = -this.size - 6;

        // Background
        g.beginFill(0x333333, 0.6);
        g.drawRect(-w / 2, yOff, w, h);
        g.endFill();

        // HP fill
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

        g.lineStyle(1.5, 0x44aaff, 0.5);
        g.drawCircle(0, 0, this.size + 4);
    }

    destroy() {
        if (this.container.parent) {
            this.container.parent.removeChild(this.container);
        }
        this.container.destroy({ children: true });
    }
}
