class ParticleManager {
    constructor(scene) {
        this.scene = scene;
        this.particles = [];
    }

    emitDirt(x, y, biome) {
        const colors = {
            grassland: [0x4A7A2E, 0x6B4914, 0x3A5A1E],
            desert: [0xD4A854, 0xC49844, 0xB48834],
            arctic: [0xE8E8F0, 0xC8C8E0, 0xCCDDEE],
            volcanic: [0x444444, 0x333333, 0x553322],
        };
        const palette = colors[biome] || colors.grassland;

        for (let i = 0; i < 3; i++) {
            const color = palette[Math.floor(Math.random() * palette.length)];
            const size = 2 + Math.random() * 4;
            const particle = this.scene.add.rectangle(x, y, size, size, color);
            particle.setDepth(12);

            const vx = -2 - Math.random() * 4;
            const vy = -1 - Math.random() * 3;
            const life = 300 + Math.random() * 200;

            this.particles.push({
                sprite: particle,
                vx, vy,
                life,
                maxLife: life,
                gravity: 0.1,
            });
        }
    }

    emitExhaust(x, y) {
        const particle = this.scene.add.circle(x, y, 2 + Math.random() * 2, 0x888888, 0.5);
        particle.setDepth(7);

        this.particles.push({
            sprite: particle,
            vx: -1 - Math.random() * 2,
            vy: -0.5 - Math.random(),
            life: 400,
            maxLife: 400,
            gravity: -0.02,
        });
    }

    emitCrash(x, y) {
        for (let i = 0; i < 20; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 2 + Math.random() * 5;
            const size = 2 + Math.random() * 6;
            const colors = [0xFF4444, 0xFF8800, 0xFFCC00, 0x888888, 0x444444];
            const color = colors[Math.floor(Math.random() * colors.length)];

            const particle = this.scene.add.rectangle(x, y, size, size, color);
            particle.setDepth(15);

            this.particles.push({
                sprite: particle,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed - 2,
                life: 600 + Math.random() * 400,
                maxLife: 1000,
                gravity: 0.08,
            });
        }
    }

    emitLanding(x, y, biome) {
        const colors = {
            grassland: [0x4A7A2E, 0x6B4914],
            desert: [0xD4A854, 0xC49844],
            arctic: [0xE8E8F0, 0xCCDDEE],
            volcanic: [0x444444, 0x333333],
        };
        const palette = colors[biome] || colors.grassland;

        for (let i = 0; i < 8; i++) {
            const color = palette[Math.floor(Math.random() * palette.length)];
            const angle = Math.PI + (Math.random() - 0.5) * Math.PI;
            const speed = 1 + Math.random() * 3;
            const size = 2 + Math.random() * 4;

            const particle = this.scene.add.rectangle(x, y, size, size, color);
            particle.setDepth(12);

            this.particles.push({
                sprite: particle,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed - 1,
                life: 300 + Math.random() * 200,
                maxLife: 500,
                gravity: 0.06,
            });
        }
    }

    update(delta) {
        this.particles = this.particles.filter(p => {
            p.life -= delta;
            if (p.life <= 0) {
                p.sprite.destroy();
                return false;
            }

            p.vy += p.gravity;
            p.sprite.x += p.vx;
            p.sprite.y += p.vy;
            p.sprite.alpha = Math.max(0, p.life / p.maxLife);

            return true;
        });
    }

    destroy() {
        this.particles.forEach(p => p.sprite.destroy());
        this.particles = [];
    }
}
