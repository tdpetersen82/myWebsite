// ParticleSystem.js — Visual effects (death explosions, placement effects, enhanced particles)

export class ParticleSystem {
    constructor(stage) {
        this.container = new PIXI.Container();
        stage.addChild(this.container);
        this.particles = [];
    }

    // Creature death explosion - burst of body parts (enhanced: more particles, staggered rings)
    enemyDeath(x, y, color) {
        // Main body chunks — increased from 14 to 22
        const count = 22;
        for (let i = 0; i < count; i++) {
            const angle = (Math.PI * 2 / count) * i + (Math.random() - 0.5) * 0.5;
            const speed = 50 + Math.random() * 160;
            const size = 1.5 + Math.random() * 5;

            const g = new PIXI.Graphics();

            if (i % 4 === 0) {
                // Oval chunk
                g.beginFill(color, 0.85);
                g.drawEllipse(0, 0, size, size * 0.6);
                g.endFill();
            } else if (i % 4 === 1) {
                // Splat circle
                g.beginFill(color, 0.7);
                g.drawCircle(0, 0, size * 0.7);
                g.endFill();
                g.beginFill(color, 0.3);
                g.drawCircle(size * 0.3, -size * 0.2, size * 0.4);
                g.endFill();
            } else if (i % 4 === 2) {
                // Leg/spike shard
                g.beginFill(color, 0.8);
                g.moveTo(0, -size);
                g.lineTo(size * 0.3, size * 0.5);
                g.lineTo(-size * 0.3, size * 0.5);
                g.closePath();
                g.endFill();
            } else {
                // Small dot debris
                g.beginFill(color, 0.6);
                g.drawCircle(0, 0, size * 0.4);
                g.endFill();
            }

            g.x = x;
            g.y = y;
            this.container.addChild(g);

            this.particles.push({
                graphic: g,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed - 25,
                life: 1.0,
                decay: 1.2 + Math.random() * 0.6,
                rotation: (Math.random() - 0.5) * 10,
                gravity: 80,
            });
        }

        // Fast tiny sparks — increased count
        for (let i = 0; i < 8; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 180 + Math.random() * 120;
            const g = new PIXI.Graphics();
            g.beginFill(0xffffff, 0.9);
            g.drawCircle(0, 0, 1.2);
            g.endFill();
            g.x = x;
            g.y = y;
            this.container.addChild(g);

            this.particles.push({
                graphic: g,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: 1.0,
                decay: 3.5,
                rotation: 0,
            });
        }

        // Central flash — larger with ring
        const flash = new PIXI.Graphics();
        flash.beginFill(0xffffff, 0.7);
        flash.drawCircle(0, 0, 18);
        flash.endFill();
        flash.beginFill(color, 0.35);
        flash.drawCircle(0, 0, 30);
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

        // Secondary ring burst (staggered, slightly delayed feel)
        this.pulseRing(x, y, 35, color);

        // Goo splatter mark — persists for 2-3s
        this.splatMark(x, y, color);
    }

    // Goo splatter mark that persists at death location
    splatMark(x, y, color) {
        const g = new PIXI.Graphics();
        const splatCount = 3 + Math.floor(Math.random() * 3);
        for (let i = 0; i < splatCount; i++) {
            const ox = (Math.random() - 0.5) * 12;
            const oy = (Math.random() - 0.5) * 12;
            const size = 2 + Math.random() * 4;
            g.beginFill(color, 0.2);
            g.drawEllipse(ox, oy, size, size * (0.5 + Math.random() * 0.5));
            g.endFill();
        }
        g.x = x;
        g.y = y;
        this.container.addChildAt(g, 0); // behind other particles

        this.particles.push({
            graphic: g,
            type: 'static',
            life: 1.0,
            decay: 0.35, // slow fade over ~3 seconds
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

        // Expanding ring effect
        this.pulseRing(x, y, 35, 0x44ff88);

        // Outward-shooting sparks — more sparks
        for (let i = 0; i < 8; i++) {
            const angle = (Math.PI * 2 / 8) * i;
            const speed = 70 + Math.random() * 30;
            const spark = new PIXI.Graphics();
            spark.beginFill(0x44ff88, 0.8);
            spark.drawCircle(0, 0, 1.8);
            spark.endFill();
            spark.x = x;
            spark.y = y;
            this.container.addChild(spark);

            this.particles.push({
                graphic: spark,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: 1.0,
                decay: 2.5,
                rotation: 0,
            });
        }
    }

    // Muzzle spark burst when tower fires
    muzzleSpark(x, y, angle, color) {
        const count = 4;
        for (let i = 0; i < count; i++) {
            const spread = (Math.random() - 0.5) * 0.8;
            const a = angle + spread;
            const speed = 60 + Math.random() * 40;
            const g = new PIXI.Graphics();
            g.beginFill(color, 0.7);
            g.drawCircle(0, 0, 1 + Math.random());
            g.endFill();
            g.x = x;
            g.y = y;
            this.container.addChild(g);

            this.particles.push({
                graphic: g,
                vx: Math.cos(a) * speed,
                vy: Math.sin(a) * speed,
                life: 1.0,
                decay: 5.0,
                rotation: 0,
            });
        }
    }

    // Sniper tracer line - thick bright beam
    tracerLine(x1, y1, x2, y2, color) {
        const g = new PIXI.Graphics();
        // Outer glow
        g.lineStyle(5, color, 0.25);
        g.moveTo(x1, y1);
        g.lineTo(x2, y2);
        // Core beam
        g.lineStyle(2, color, 0.9);
        g.moveTo(x1, y1);
        g.lineTo(x2, y2);
        // Impact flash
        g.beginFill(0xffffff, 0.7);
        g.drawCircle(x2, y2, 6);
        g.endFill();
        g.beginFill(color, 0.4);
        g.drawCircle(x2, y2, 10);
        g.endFill();

        this.container.addChild(g);

        this.particles.push({
            graphic: g,
            type: 'static',
            life: 1.0,
            decay: 5.0,
        });

        // Impact sparks
        for (let i = 0; i < 4; i++) {
            const a = Math.random() * Math.PI * 2;
            const speed = 50 + Math.random() * 50;
            const spark = new PIXI.Graphics();
            spark.beginFill(color, 0.8);
            spark.drawCircle(0, 0, 1.2);
            spark.endFill();
            spark.x = x2;
            spark.y = y2;
            this.container.addChild(spark);

            this.particles.push({
                graphic: spark,
                vx: Math.cos(a) * speed,
                vy: Math.sin(a) * speed,
                life: 1.0,
                decay: 4.0,
                rotation: 0,
            });
        }
    }

    // Wave completion celebration burst
    celebrationBurst() {
        const colors = [0x44ff88, 0x88aaff, 0xffcc44, 0xff88cc, 0x44ffff];
        const cx = 700; // center of screen
        const cy = 480;
        for (let i = 0; i < 20; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 100 + Math.random() * 150;
            const color = colors[Math.floor(Math.random() * colors.length)];
            const g = new PIXI.Graphics();
            g.beginFill(color, 0.7);
            g.drawCircle(0, 0, 1.5 + Math.random() * 2);
            g.endFill();
            g.x = cx + (Math.random() - 0.5) * 400;
            g.y = cy + (Math.random() - 0.5) * 300;
            this.container.addChild(g);

            this.particles.push({
                graphic: g,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed - 60,
                life: 1.0,
                decay: 1.0 + Math.random() * 0.5,
                rotation: 0,
                gravity: 50,
            });
        }
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
