// ParticleSystem.js — Visual effects (death explosions, placement effects)

export class ParticleSystem {
    constructor(stage) {
        this.container = new PIXI.Container();
        stage.addChild(this.container);
        this.particles = [];
    }

    // Creature death explosion - burst of body parts
    enemyDeath(x, y, color) {
        const count = 10;
        for (let i = 0; i < count; i++) {
            const angle = (Math.PI * 2 / count) * i + (Math.random() - 0.5) * 0.5;
            const speed = 60 + Math.random() * 140;
            const size = 2 + Math.random() * 5;

            const g = new PIXI.Graphics();

            // Mix of body chunk shapes
            if (i % 3 === 0) {
                // Oval chunk
                g.beginFill(color, 0.85);
                g.drawEllipse(0, 0, size, size * 0.6);
                g.endFill();
            } else if (i % 3 === 1) {
                // Splat circle
                g.beginFill(color, 0.7);
                g.drawCircle(0, 0, size * 0.7);
                g.endFill();
                g.beginFill(color, 0.3);
                g.drawCircle(size * 0.3, -size * 0.2, size * 0.4);
                g.endFill();
            } else {
                // Leg/spike shard
                g.beginFill(color, 0.8);
                g.moveTo(0, -size);
                g.lineTo(size * 0.3, size * 0.5);
                g.lineTo(-size * 0.3, size * 0.5);
                g.closePath();
                g.endFill();
            }

            g.x = x;
            g.y = y;
            this.container.addChild(g);

            this.particles.push({
                graphic: g,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed - 20, // slight upward bias
                life: 1.0,
                decay: 1.3 + Math.random() * 0.5,
                rotation: (Math.random() - 0.5) * 10,
                gravity: 80,
            });
        }

        // Central flash
        const flash = new PIXI.Graphics();
        flash.beginFill(0xffffff, 0.6);
        flash.drawCircle(0, 0, 12);
        flash.endFill();
        flash.beginFill(color, 0.3);
        flash.drawCircle(0, 0, 20);
        flash.endFill();
        flash.x = x;
        flash.y = y;
        this.container.addChild(flash);

        this.particles.push({
            graphic: flash,
            vx: 0, vy: 0,
            life: 1.0,
            decay: 4.0,
            rotation: 0,
        });
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

        // Bright center
        g.beginFill(0x44ff88, 0.5);
        g.drawCircle(0, 0, 15);
        g.endFill();

        // Outer ring
        g.lineStyle(2, 0x44ff88, 0.4);
        g.drawCircle(0, 0, 22);

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

    // Sniper tracer line - thick bright beam
    tracerLine(x1, y1, x2, y2, color) {
        const g = new PIXI.Graphics();
        // Outer glow
        g.lineStyle(4, color, 0.3);
        g.moveTo(x1, y1);
        g.lineTo(x2, y2);
        // Core beam
        g.lineStyle(2, color, 0.9);
        g.moveTo(x1, y1);
        g.lineTo(x2, y2);
        // Impact flash
        g.beginFill(color, 0.6);
        g.drawCircle(x2, y2, 5);
        g.endFill();

        this.container.addChild(g);

        this.particles.push({
            graphic: g,
            type: 'static',
            life: 1.0,
            decay: 5.0,
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
                g.lineStyle(3 * p.life, p.color, p.life * 0.5);
                g.drawCircle(0, 0, p.radius);
                // Inner ring
                if (p.life > 0.5) {
                    g.lineStyle(1, p.color, p.life * 0.2);
                    g.drawCircle(0, 0, p.radius * 0.6);
                }
            } else if (p.type === 'static') {
                p.graphic.alpha = p.life;
            } else {
                // Moving particles
                if (p.vx !== undefined) {
                    p.graphic.x += p.vx * dt;
                    p.graphic.y += p.vy * dt;
                    // Apply gravity if present
                    if (p.gravity) {
                        p.vy += p.gravity * dt;
                    }
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
