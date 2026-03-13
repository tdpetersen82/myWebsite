// Projectile.js — Projectile rendering and movement

export class Projectile {
    constructor(data, container) {
        this.type = data.type;
        this.damage = data.damage || 0;
        this.alive = true;

        if (data.type === 'laser') {
            this.x = data.x;
            this.y = data.y;
            this.speed = data.speed;
            this.color = data.color;

            // Calculate direction toward target position at time of firing
            const dx = data.targetX - data.x;
            const dy = data.targetY - data.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            this.vx = (dx / dist) * this.speed;
            this.vy = (dy / dist) * this.speed;
            this.maxDist = dist * 1.5;
            this.traveled = 0;
            this.angle = Math.atan2(dy, dx);

            // Trail history
            this.trail = [];
            this.trailMax = 5;

            // Graphics
            this.container = new PIXI.Container();
            this.trailGraphic = new PIXI.Graphics();
            this.graphic = new PIXI.Graphics();
            this.container.addChild(this.trailGraphic);
            this.container.addChild(this.graphic);

            // Projectile head
            this.graphic.beginFill(this.color, 0.95);
            this.graphic.drawCircle(0, 0, 3);
            this.graphic.endFill();
            // Glow
            this.graphic.beginFill(this.color, 0.25);
            this.graphic.drawCircle(0, 0, 7);
            this.graphic.endFill();
            this.graphic.x = this.x;
            this.graphic.y = this.y;
            container.addChild(this.container);

        } else if (data.type === 'pulse') {
            // Instant AoE — resolved immediately
            this.x = data.x;
            this.y = data.y;
            this.aoeRadius = data.aoeRadius;
            this.instant = true;

        } else if (data.type === 'slow') {
            // Instant area slow
            this.x = data.x;
            this.y = data.y;
            this.range = data.range;
            this.slowFactor = data.slowFactor;
            this.slowDuration = data.slowDuration;
            this.instant = true;

        } else if (data.type === 'sniper') {
            // Instant hit
            this.target = data.target;
            this.instant = true;
        }
    }

    update(dt) {
        if (!this.alive || this.instant) return;

        if (this.type === 'laser') {
            // Store trail position
            this.trail.push({ x: this.x, y: this.y });
            if (this.trail.length > this.trailMax) {
                this.trail.shift();
            }

            this.x += this.vx * dt;
            this.y += this.vy * dt;
            this.traveled += this.speed * dt;
            this.graphic.x = this.x;
            this.graphic.y = this.y;

            // Draw trail
            this.trailGraphic.clear();
            if (this.trail.length > 1) {
                for (let i = 1; i < this.trail.length; i++) {
                    const alpha = (i / this.trail.length) * 0.5;
                    const width = (i / this.trail.length) * 2;
                    this.trailGraphic.lineStyle(width, this.color, alpha);
                    this.trailGraphic.moveTo(this.trail[i - 1].x, this.trail[i - 1].y);
                    this.trailGraphic.lineTo(this.trail[i].x, this.trail[i].y);
                }
                // Final segment to current position
                this.trailGraphic.lineStyle(2, this.color, 0.4);
                this.trailGraphic.moveTo(this.trail[this.trail.length - 1].x, this.trail[this.trail.length - 1].y);
                this.trailGraphic.lineTo(this.x, this.y);
            }

            if (this.traveled > this.maxDist) {
                this.alive = false;
            }
        }
    }

    destroy() {
        if (this.container) {
            if (this.container.parent) {
                this.container.parent.removeChild(this.container);
            }
            this.container.destroy({ children: true });
        } else if (this.graphic) {
            if (this.graphic.parent) {
                this.graphic.parent.removeChild(this.graphic);
            }
            this.graphic.destroy();
        }
    }
}
