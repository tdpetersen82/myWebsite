// ============================================================
// Missile Command — Particle System
// ============================================================

class Particle {
    constructor(x, y, vx, vy, color, life, size, gravity = 0, fadeOut = true) {
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.color = color;
        this.life = life;
        this.maxLife = life;
        this.size = size;
        this.gravity = gravity;
        this.fadeOut = fadeOut;
        this.dead = false;
    }

    update(dt) {
        this.life -= dt * 1000;
        if (this.life <= 0) {
            this.dead = true;
            return;
        }
        this.vy += this.gravity * dt;
        this.x += this.vx * dt;
        this.y += this.vy * dt;
    }

    get alpha() {
        if (!this.fadeOut) return 1;
        return Helpers.clamp(this.life / this.maxLife, 0, 1);
    }
}

class ParticleSystem {
    constructor() {
        this.particles = [];
    }

    emit(config) {
        const {
            x, y,
            count = 10,
            speedMin = 20, speedMax = 100,
            angleMin = 0, angleMax = Math.PI * 2,
            colors = [0xffffff],
            lifeMin = 300, lifeMax = 800,
            sizeMin = 1.5, sizeMax = 4,
            gravity = 0,
            fadeOut = true,
        } = config;

        for (let i = 0; i < count; i++) {
            const angle = Helpers.randomRange(angleMin, angleMax);
            const speed = Helpers.randomRange(speedMin, speedMax);
            const vx = Math.cos(angle) * speed;
            const vy = Math.sin(angle) * speed;
            const color = Helpers.randomChoice(colors);
            const life = Helpers.randomRange(lifeMin, lifeMax);
            const size = Helpers.randomRange(sizeMin, sizeMax);
            this.particles.push(new Particle(x, y, vx, vy, color, life, size, gravity, fadeOut));
        }
    }

    // Fire explosion: big burst of fiery particles
    emitExplosion(x, y, radius) {
        this.emit({
            x, y,
            count: Math.floor(radius * 0.8),
            speedMin: 30,
            speedMax: radius * 3,
            colors: [0xff4400, 0xff8800, 0xffcc00, 0xff2222, 0xffff44, 0xffffff],
            lifeMin: 200,
            lifeMax: 600,
            sizeMin: 1.5,
            sizeMax: 4,
            gravity: 80,
        });
    }

    // Missile trail: small smoke puff
    emitTrail(x, y, color = 0x4488ff) {
        this.emit({
            x, y,
            count: 2,
            speedMin: 5,
            speedMax: 20,
            colors: [color, 0x666666, 0x444444],
            lifeMin: 150,
            lifeMax: 400,
            sizeMin: 1,
            sizeMax: 2.5,
            gravity: -10,
        });
    }

    // City destruction: debris flying
    emitDebris(x, y) {
        this.emit({
            x, y,
            count: 25,
            speedMin: 40,
            speedMax: 200,
            angleMin: -Math.PI,
            angleMax: 0,
            colors: [0x888888, 0x666666, 0xaaaa44, 0xff4400, 0xcc6600],
            lifeMin: 400,
            lifeMax: 1200,
            sizeMin: 2,
            sizeMax: 5,
            gravity: 200,
        });
    }

    // Sparks: for hits and power-up collection
    emitSparks(x, y, color = 0xffdd57) {
        this.emit({
            x, y,
            count: 15,
            speedMin: 60,
            speedMax: 180,
            colors: [color, 0xffffff],
            lifeMin: 100,
            lifeMax: 400,
            sizeMin: 1,
            sizeMax: 3,
        });
    }

    // EMP wave: ring of particles expanding outward
    emitEMP(x, y) {
        this.emit({
            x, y,
            count: 60,
            speedMin: 150,
            speedMax: 300,
            colors: [0xcc44ff, 0x8844ff, 0xffffff, 0x4488ff],
            lifeMin: 400,
            lifeMax: 800,
            sizeMin: 2,
            sizeMax: 4,
        });
    }

    update(dt) {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            this.particles[i].update(dt);
            if (this.particles[i].dead) {
                this.particles.splice(i, 1);
            }
        }
    }

    draw(graphics) {
        for (const p of this.particles) {
            graphics.fillStyle(p.color, p.alpha);
            graphics.fillCircle(p.x, p.y, p.size * p.alpha);
        }
    }

    clear() {
        this.particles = [];
    }
}
