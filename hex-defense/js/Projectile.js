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
            this.maxDist = dist * 1.5; // kill after overshooting
            this.traveled = 0;

            // Graphics
            this.graphic = new PIXI.Graphics();
            this.graphic.beginFill(this.color, 0.9);
            this.graphic.drawCircle(0, 0, 3);
            this.graphic.endFill();
            // Glow
            this.graphic.beginFill(this.color, 0.2);
            this.graphic.drawCircle(0, 0, 6);
            this.graphic.endFill();
            this.graphic.x = this.x;
            this.graphic.y = this.y;
            container.addChild(this.graphic);

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
            this.x += this.vx * dt;
            this.y += this.vy * dt;
            this.traveled += this.speed * dt;
            this.graphic.x = this.x;
            this.graphic.y = this.y;

            if (this.traveled > this.maxDist) {
                this.alive = false;
            }
        }
    }

    destroy() {
        if (this.graphic) {
            if (this.graphic.parent) {
                this.graphic.parent.removeChild(this.graphic);
            }
            this.graphic.destroy();
        }
    }
}
