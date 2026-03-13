// Enemy.js — Enemy types, rendering, and path following

import { hexToPixel, ENEMY_PATH } from './HexGrid.js';

// Enemy type definitions
export const ENEMY_TYPES = {
    scout: {
        name: 'Scout',
        shape: 'bug',
        color: 0x44ffaa,
        hp: 30,
        speed: 90,
        reward: 10,
        size: 8,
    },
    soldier: {
        name: 'Soldier',
        shape: 'beetle',
        color: 0xffaa44,
        hp: 60,
        speed: 60,
        reward: 15,
        size: 10,
    },
    tank: {
        name: 'Tank',
        shape: 'crab',
        color: 0xff4466,
        hp: 150,
        speed: 35,
        reward: 25,
        size: 13,
    },
    splitter: {
        name: 'Splitter',
        shape: 'blob',
        color: 0xaa66ff,
        hp: 40,
        speed: 55,
        reward: 20,
        size: 10,
    },
    boss: {
        name: 'Boss',
        shape: 'spider',
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
        this.facingAngle = 0;

        // Slow effect
        this.slowTimer = 0;
        this.slowFactor = 1;

        // Animation
        this.animTime = Math.random() * Math.PI * 2;

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
        const c = this.color;

        switch (this.shape) {
            case 'bug': {
                // Small ant/bug - oval body with legs and antennae
                // Body (oval)
                g.beginFill(c, 0.6);
                g.drawEllipse(0, 0, s * 0.9, s * 0.55);
                g.endFill();
                g.lineStyle(1, c, 0.8);
                g.drawEllipse(0, 0, s * 0.9, s * 0.55);

                // Head
                g.beginFill(c, 0.7);
                g.drawCircle(s * 0.7, 0, s * 0.35);
                g.endFill();

                // Eyes
                g.beginFill(0xffffff, 0.9);
                g.drawCircle(s * 0.85, -s * 0.15, 1.5);
                g.drawCircle(s * 0.85, s * 0.15, 1.5);
                g.endFill();

                // Legs (3 per side)
                g.lineStyle(1, c, 0.6);
                for (let i = 0; i < 3; i++) {
                    const lx = -s * 0.3 + i * s * 0.4;
                    const legLen = s * 0.5;
                    g.moveTo(lx, -s * 0.4);
                    g.lineTo(lx - 2, -s * 0.4 - legLen);
                    g.moveTo(lx, s * 0.4);
                    g.lineTo(lx - 2, s * 0.4 + legLen);
                }

                // Antennae
                g.lineStyle(0.8, c, 0.5);
                g.moveTo(s * 0.9, -s * 0.2);
                g.lineTo(s * 1.3, -s * 0.5);
                g.moveTo(s * 0.9, s * 0.2);
                g.lineTo(s * 1.3, s * 0.5);
                break;
            }
            case 'beetle': {
                // Armored beetle - rounded body with shell segments
                // Shell (main body)
                g.beginFill(c, 0.5);
                g.drawEllipse(0, 0, s * 1.0, s * 0.7);
                g.endFill();
                g.lineStyle(1.5, c, 0.8);
                g.drawEllipse(0, 0, s * 1.0, s * 0.7);

                // Shell segments (horizontal lines)
                g.lineStyle(1, c, 0.4);
                g.moveTo(-s * 0.3, -s * 0.15);
                g.lineTo(s * 0.5, -s * 0.15);
                g.moveTo(-s * 0.3, s * 0.15);
                g.lineTo(s * 0.5, s * 0.15);

                // Shell center line
                g.lineStyle(1, c, 0.3);
                g.moveTo(-s * 0.6, 0);
                g.lineTo(s * 0.6, 0);

                // Head
                g.beginFill(c, 0.65);
                g.drawCircle(s * 0.8, 0, s * 0.35);
                g.endFill();

                // Mandibles
                g.lineStyle(1.5, c, 0.7);
                g.moveTo(s * 1.0, -s * 0.1);
                g.lineTo(s * 1.3, -s * 0.25);
                g.moveTo(s * 1.0, s * 0.1);
                g.lineTo(s * 1.3, s * 0.25);

                // Eyes
                g.beginFill(0xffffff, 0.9);
                g.drawCircle(s * 0.9, -s * 0.2, 1.5);
                g.drawCircle(s * 0.9, s * 0.2, 1.5);
                g.endFill();

                // Legs (3 pairs, thicker)
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
                // Heavy armored crab - wide body with claws
                // Main shell
                g.beginFill(c, 0.5);
                g.drawEllipse(0, 0, s * 0.9, s * 0.8);
                g.endFill();
                g.lineStyle(2, c, 0.8);
                g.drawEllipse(0, 0, s * 0.9, s * 0.8);

                // Armor plates
                g.lineStyle(1.5, c, 0.4);
                g.drawEllipse(0, 0, s * 0.6, s * 0.5);

                // Eyes on stalks
                g.lineStyle(1, c, 0.6);
                g.moveTo(s * 0.5, -s * 0.3);
                g.lineTo(s * 0.8, -s * 0.5);
                g.moveTo(s * 0.5, s * 0.3);
                g.lineTo(s * 0.8, s * 0.5);
                g.beginFill(0xffffff, 0.9);
                g.drawCircle(s * 0.8, -s * 0.5, 2);
                g.drawCircle(s * 0.8, s * 0.5, 2);
                g.endFill();

                // Claws (big)
                g.lineStyle(2, c, 0.7);
                // Top claw
                g.moveTo(s * 0.6, -s * 0.6);
                g.lineTo(s * 1.2, -s * 0.7);
                g.lineTo(s * 1.0, -s * 0.4);
                // Bottom claw
                g.moveTo(s * 0.6, s * 0.6);
                g.lineTo(s * 1.2, s * 0.7);
                g.lineTo(s * 1.0, s * 0.4);

                // Legs (4 pairs, stumpy)
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
                // Amoeba/blob - wobbly circle with nucleus
                // Outer membrane (irregular circle via sine wave)
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

                // Nucleus dots
                g.beginFill(c, 0.7);
                g.drawCircle(-s * 0.15, -s * 0.1, s * 0.25);
                g.endFill();
                g.beginFill(c, 0.5);
                g.drawCircle(s * 0.2, s * 0.15, s * 0.18);
                g.endFill();

                // Division line hint
                g.lineStyle(1, c, 0.3);
                g.moveTo(0, -s * 0.7);
                g.lineTo(0, s * 0.7);
                break;
            }
            case 'spider': {
                // Large spider/scorpion boss
                // Abdomen (rear)
                g.beginFill(c, 0.5);
                g.drawEllipse(-s * 0.3, 0, s * 0.6, s * 0.55);
                g.endFill();
                g.lineStyle(1.5, c, 0.7);
                g.drawEllipse(-s * 0.3, 0, s * 0.6, s * 0.55);

                // Cephalothorax (front)
                g.beginFill(c, 0.6);
                g.drawEllipse(s * 0.35, 0, s * 0.45, s * 0.4);
                g.endFill();
                g.lineStyle(1.5, c, 0.8);
                g.drawEllipse(s * 0.35, 0, s * 0.45, s * 0.4);

                // Glowing eyes (4 pairs)
                g.beginFill(0xffff44, 0.9);
                g.drawCircle(s * 0.55, -s * 0.12, 2);
                g.drawCircle(s * 0.55, s * 0.12, 2);
                g.endFill();
                g.beginFill(0xff4444, 0.7);
                g.drawCircle(s * 0.65, -s * 0.06, 1.5);
                g.drawCircle(s * 0.65, s * 0.06, 1.5);
                g.endFill();

                // Fangs
                g.lineStyle(2, c, 0.9);
                g.moveTo(s * 0.7, -s * 0.15);
                g.lineTo(s * 1.0, -s * 0.3);
                g.lineTo(s * 0.95, 0);
                g.moveTo(s * 0.7, s * 0.15);
                g.lineTo(s * 1.0, s * 0.3);
                g.lineTo(s * 0.95, 0);

                // 4 pairs of legs
                g.lineStyle(1.5, c, 0.6);
                const legAngles = [-0.6, -0.3, 0.3, 0.6];
                for (const la of legAngles) {
                    const baseX = s * 0.1;
                    // Top leg
                    const knee1X = baseX + Math.cos(-Math.PI / 2 + la) * s * 0.6;
                    const knee1Y = -s * 0.35 + Math.sin(-Math.PI / 2 + la) * s * 0.3;
                    g.moveTo(baseX, -s * 0.35);
                    g.lineTo(knee1X, knee1Y);
                    g.lineTo(knee1X - 3, knee1Y - s * 0.4);
                    // Bottom leg
                    const knee2X = baseX + Math.cos(Math.PI / 2 - la) * s * 0.6;
                    const knee2Y = s * 0.35 + Math.sin(Math.PI / 2 - la) * s * 0.3;
                    g.moveTo(baseX, s * 0.35);
                    g.lineTo(knee2X, knee2Y);
                    g.lineTo(knee2X - 3, knee2Y + s * 0.4);
                }

                // Tail/stinger
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

            // Update facing angle toward next waypoint
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

            // Interpolate position
            const cur = this.pathPixels[this.pathIndex];
            const nxt = this.pathPixels[this.pathIndex + 1];
            this.x = cur.x + (nxt.x - cur.x) * this.pathProgress;
            this.y = cur.y + (nxt.y - cur.y) * this.pathProgress;

            // Update facing for current segment
            const sdx = nxt.x - cur.x;
            const sdy = nxt.y - cur.y;
            this.facingAngle = Math.atan2(sdy, sdx);
        }

        // Update visuals
        this.container.x = this.x;
        this.container.y = this.y;

        // Rotate creature to face movement direction
        this.graphic.rotation = this.facingAngle;

        // Animate
        this.animTime += dt * 4;
        this.pulseTime += dt * 3;

        // Subtle walking bob for non-blob enemies
        if (this.shape !== 'blob') {
            const bob = Math.sin(this.animTime * 2) * 0.8;
            this.graphic.y = bob;
        } else {
            // Blob wobble
            const wobbleX = 1 + Math.sin(this.animTime) * 0.06;
            const wobbleY = 1 + Math.cos(this.animTime * 1.3) * 0.06;
            this.graphic.scale.set(wobbleX, wobbleY);
        }

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

        const w = this.size * 2.2;
        const h = 3;
        const yOff = -this.size - 8;

        // Background
        g.beginFill(0x333333, 0.7);
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

        // Energy shield barrier
        g.lineStyle(2, 0x44aaff, 0.4);
        g.drawCircle(0, 0, this.size + 5);
        g.lineStyle(0.5, 0x88ccff, 0.2);
        g.drawCircle(0, 0, this.size + 8);
    }

    destroy() {
        if (this.container.parent) {
            this.container.parent.removeChild(this.container);
        }
        this.container.destroy({ children: true });
    }
}
