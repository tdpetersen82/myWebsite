// ParticleSystem.js — Visual effects (death explosions, placement effects)

export class ParticleSystem {
    constructor(stage) {
        this.container = new PIXI.Container();
        stage.addChild(this.container);
        this.particles = [];
    }

    // Geometric shatter effect for enemy death
    enemyDeath(x, y, color) {
        const count = 8;
        for (let i = 0; i < count; i++) {
            const angle = (Math.PI * 2 / count) * i + (Math.random() - 0.5) * 0.5;
            const speed = 80 + Math.random() * 120;
            const size = 2 + Math.random() * 4;

            const g = new PIXI.Graphics();
            // Draw a small triangle or diamond shard
            if (i % 2 === 0) {
                g.beginFill(color, 0.9);
                g.moveTo(0, -size);
                g.lineTo(size * 0.6, size * 0.5);
                g.lineTo(-size * 0.6, size * 0.5);
                g.closePath();
                g.endFill();
            } else {
                g.beginFill(color, 0.9);
                g.moveTo(0, -size);
                g.lineTo(size * 0.5, 0);
                g.lineTo(0, size);
                g.lineTo(-size * 0.5, 0);
                g.closePath();
                g.endFill();
            }

            g.x = x;
            g.y = y;
            this.container.addChild(g);

            this.particles.push({
                graphic: g,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: 1.0,
                decay: 1.5 + Math.random() * 0.5,
                rotation: (Math.random() - 0.5) * 8,
            });
        }
    }

    // Ring pulse for AoE tower
    pulseRing(x, y, maxRadius, color) {
        const g = new PIXI.Graphics();
        g.x = x;
        g.y = y;
        this.container.addChild(g);

        this.particles.push({
            graphic: g,
            type: 'ring',
            radius: 0,
            maxRadius,
            color,
            life: 1.0,
            decay: 2.5,
        });
    }

    // Tower placement flash
    placeFlash(x, y) {
        const g = new PIXI.Graphics();
        g.beginFill(0x44ff88, 0.4);
        g.drawCircle(0, 0, 20);
        g.endFill();
        g.x = x;
        g.y = y;
        this.container.addChild(g);

        this.particles.push({
            graphic: g,
            vx: 0, vy: 0,
            life: 1.0,
            decay: 3.0,
            rotation: 0,
        });
    }

    // Sniper tracer line
    tracerLine(x1, y1, x2, y2, color) {
        const g = new PIXI.Graphics();
        g.lineStyle(2, color, 0.8);
        g.moveTo(x1, y1);
        g.lineTo(x2, y2);
        this.container.addChild(g);

        this.particles.push({
            graphic: g,
            type: 'static',
            life: 1.0,
            decay: 6.0,
        });
    }

    // Currency pickup float text
    floatText(x, y, text, color = 0xffcc00) {
        const t = new PIXI.Text(text, {
            fontFamily: 'Segoe UI',
            fontSize: 14,
            fontWeight: 'bold',
            fill: color,
        });
        t.anchor.set(0.5);
        t.x = x;
        t.y = y;
        this.container.addChild(t);

        this.particles.push({
            graphic: t,
            vx: 0,
            vy: -40,
            life: 1.0,
            decay: 1.2,
            rotation: 0,
        });
    }

    update(dt) {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.life -= p.decay * dt;

            if (p.type === 'ring') {
                // Expanding ring
                const progress = 1 - p.life;
                p.radius = p.maxRadius * progress;
                const g = p.graphic;
                g.clear();
                g.lineStyle(2 * p.life, p.color, p.life * 0.6);
                g.drawCircle(0, 0, p.radius);
            } else if (p.type === 'static') {
                p.graphic.alpha = p.life;
            } else {
                // Moving particles
                if (p.vx !== undefined) {
                    p.graphic.x += p.vx * dt;
                    p.graphic.y += p.vy * dt;
                }
                if (p.rotation) {
                    p.graphic.rotation += p.rotation * dt;
                }
                p.graphic.alpha = Math.max(0, p.life);
                p.graphic.scale.set(Math.max(0.1, p.life));
            }

            if (p.life <= 0) {
                this.container.removeChild(p.graphic);
                p.graphic.destroy();
                this.particles.splice(i, 1);
            }
        }
    }
}
