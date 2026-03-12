// Lunar Lander - Particle System

class ParticleSystem {
    constructor(scene) {
        this.scene = scene;
        this.particles = [];
        this.graphics = scene.add.graphics();
        this.graphics.setDepth(5);
    }

    // Emit thrust exhaust particles
    emitThrust(x, y, angle) {
        const count = CONFIG.THRUST_PARTICLE_COUNT;
        const rad = Phaser.Math.DegToRad(angle + 90); // direction opposite to thrust

        for (let i = 0; i < count; i++) {
            const spread = (Math.random() - 0.5) * 0.6;
            const speed = 80 + Math.random() * 120;
            this.particles.push({
                x: x,
                y: y,
                vx: Math.cos(rad + spread) * speed + (Math.random() - 0.5) * 30,
                vy: Math.sin(rad + spread) * speed + (Math.random() - 0.5) * 30,
                life: CONFIG.PARTICLE_LIFETIME * (0.3 + Math.random() * 0.7),
                maxLife: CONFIG.PARTICLE_LIFETIME,
                born: Date.now(),
                size: 1.5 + Math.random() * 2.5,
                color: Math.random() > 0.5 ? 0xff6600 : (Math.random() > 0.5 ? 0xff9900 : 0xffcc00),
                type: 'thrust'
            });
        }
    }

    // Emit explosion particles
    emitExplosion(x, y) {
        const count = CONFIG.EXPLOSION_PARTICLE_COUNT;
        const colors = CONFIG.COLORS.EXPLOSION;

        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 30 + Math.random() * 200;
            this.particles.push({
                x: x,
                y: y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed - 30,
                life: CONFIG.PARTICLE_LIFETIME * (0.5 + Math.random() * 1.5),
                maxLife: CONFIG.PARTICLE_LIFETIME * 2,
                born: Date.now(),
                size: 2 + Math.random() * 4,
                color: colors[Math.floor(Math.random() * colors.length)],
                type: 'explosion'
            });
        }

        // Add debris pieces
        for (let i = 0; i < 8; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 50 + Math.random() * 150;
            this.particles.push({
                x: x + (Math.random() - 0.5) * 10,
                y: y + (Math.random() - 0.5) * 10,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed - 60,
                life: CONFIG.PARTICLE_LIFETIME * 2,
                maxLife: CONFIG.PARTICLE_LIFETIME * 2,
                born: Date.now(),
                size: 2 + Math.random() * 3,
                color: 0xaaaaaa,
                type: 'debris',
                rotation: Math.random() * 360,
                rotSpeed: (Math.random() - 0.5) * 400
            });
        }
    }

    // Emit landing dust
    emitLandingDust(x, y) {
        for (let i = 0; i < 15; i++) {
            const angle = -Math.PI * (0.1 + Math.random() * 0.8);
            const speed = 20 + Math.random() * 60;
            this.particles.push({
                x: x + (Math.random() - 0.5) * 30,
                y: y,
                vx: Math.cos(angle) * speed * (Math.random() > 0.5 ? 1 : -1),
                vy: Math.sin(angle) * speed,
                life: 600 + Math.random() * 400,
                maxLife: 1000,
                born: Date.now(),
                size: 1.5 + Math.random() * 2,
                color: 0x888888,
                type: 'dust'
            });
        }
    }

    update(delta) {
        const dt = delta / 1000;
        const now = Date.now();

        this.graphics.clear();

        this.particles = this.particles.filter(p => {
            const age = now - p.born;
            if (age > p.life) return false;

            // Update position
            p.x += p.vx * dt;
            p.y += p.vy * dt;

            // Gravity on explosion/debris particles
            if (p.type === 'explosion' || p.type === 'debris') {
                p.vy += 60 * dt;
            }
            if (p.type === 'dust') {
                p.vy += 20 * dt;
                p.vx *= 0.98;
            }

            // Fade based on life
            const alpha = 1 - (age / p.life);

            // Draw
            this.graphics.fillStyle(p.color, alpha);
            if (p.type === 'debris') {
                p.rotation += p.rotSpeed * dt;
                // Draw as small rectangle
                this.graphics.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size * 0.5);
            } else {
                this.graphics.fillCircle(p.x, p.y, p.size * alpha);
            }

            return true;
        });
    }

    clear() {
        this.particles = [];
        this.graphics.clear();
    }

    destroy() {
        this.graphics.destroy();
        this.particles = [];
    }
}
