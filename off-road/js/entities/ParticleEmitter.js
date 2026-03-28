class ParticleEmitter {
    constructor(scene) {
        this.scene = scene;
        this.particles = [];
        this.maxParticles = CONFIG.PARTICLES.MAX_COUNT;
        this.gfx = scene.add.graphics();
        this.gfx.setDepth(15);

        // Persistent tire marks layer (below vehicles)
        this.tireMarkGfx = scene.add.graphics();
        this.tireMarkGfx.setDepth(1.5);
        this.tireMarks = [];
        this.maxTireMarks = 500;
    }

    emit(type, x, y, overrides) {
        const preset = CONFIG.PARTICLES[type];
        if (!preset) return;
        const count = (overrides && overrides.count) || preset.count;
        for (let i = 0; i < count; i++) {
            if (this.particles.length >= this.maxParticles) this.particles.shift();
            const angle = Math.random() * Math.PI * 2;
            const speed = preset.speed * (0.5 + Math.random() * 0.5);
            this.particles.push({
                x: x + (Math.random() - 0.5) * 6,
                y: y + (Math.random() - 0.5) * 6,
                vx: Math.cos(angle) * speed + ((overrides && overrides.vx) || 0),
                vy: Math.sin(angle) * speed + ((overrides && overrides.vy) || 0),
                life: preset.life, maxLife: preset.life,
                size: preset.size * (0.7 + Math.random() * 0.6),
                color: this._getColor(type, preset),
                alpha: 1, gravity: preset.gravity, type: type,
                drag: 0.97, rotation: Math.random() * Math.PI * 2,
                rotSpeed: (Math.random() - 0.5) * 8,
            });
        }
    }

    emitDirectional(type, x, y, angle, spread, overrides) {
        const preset = CONFIG.PARTICLES[type];
        if (!preset) return;
        const count = (overrides && overrides.count) || preset.count;
        for (let i = 0; i < count; i++) {
            if (this.particles.length >= this.maxParticles) this.particles.shift();
            const a = angle + (Math.random() - 0.5) * spread;
            const speed = preset.speed * (0.5 + Math.random() * 0.5);
            this.particles.push({
                x: x + (Math.random() - 0.5) * 4,
                y: y + (Math.random() - 0.5) * 4,
                vx: Math.cos(a) * speed, vy: Math.sin(a) * speed,
                life: preset.life, maxLife: preset.life,
                size: preset.size * (0.7 + Math.random() * 0.6),
                color: this._getColor(type, preset),
                alpha: 1, gravity: preset.gravity, type: type,
                drag: 0.96, rotation: Math.random() * Math.PI * 2,
                rotSpeed: (Math.random() - 0.5) * 6,
            });
        }
    }

    // Add a tire mark at position
    addTireMark(x, y, angle, isDrift) {
        if (this.tireMarks.length >= this.maxTireMarks) this.tireMarks.shift();
        this.tireMarks.push({ x, y, angle, alpha: isDrift ? 0.12 : 0.05, width: isDrift ? 3 : 1.5 });
    }

    _getColor(type, preset) {
        if (type === 'CONFETTI') {
            const c = [0xFF3333, 0x33FF33, 0x3333FF, 0xFFFF33, 0xFF33FF, 0x33FFFF, 0xFF8800, 0xFF0088];
            return c[Math.floor(Math.random() * c.length)];
        }
        if (type === 'NITRO_FLAME') {
            const c = [0xFFFFFF, 0xFFFF66, 0xFFCC00, 0xFF8800, 0xFF6600, 0xFF4400];
            return c[Math.floor(Math.random() * c.length)];
        }
        if (type === 'SPARKS') {
            return Math.random() > 0.3 ? 0xFFFF88 : 0xFFFFFF;
        }
        if (type === 'EXPLOSION') {
            const c = [0xFFFFFF, 0xFFFF00, 0xFF8800, 0xFF4400, 0xFF2200, 0xCC0000, 0x666666];
            return c[Math.floor(Math.random() * c.length)];
        }
        if (type === 'DIRT') {
            const c = [0x8B7355, 0x7A6245, 0x6B5535, 0x9C8466];
            return c[Math.floor(Math.random() * c.length)];
        }
        if (type === 'MUD_SPLASH') {
            const c = [0x5C4033, 0x4E342E, 0x3E2723, 0x6D4C41];
            return c[Math.floor(Math.random() * c.length)];
        }
        return preset.color;
    }

    update(delta) {
        const dt = delta / 1000;
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.life -= dt;
            if (p.life <= 0) { this.particles.splice(i, 1); continue; }

            p.vy += p.gravity * dt;
            p.vx *= p.drag;
            p.vy *= p.drag;
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.rotation += p.rotSpeed * dt;

            const lifeRatio = p.life / p.maxLife;
            p.alpha = lifeRatio;

            if (p.type === 'SMOKE') {
                p.size += dt * 10;
                p.alpha = lifeRatio * 0.5;
            } else if (p.type === 'NITRO_FLAME') {
                p.size *= 0.94;
                p.alpha = lifeRatio * 1.2;
            } else if (p.type === 'EXPLOSION') {
                p.size *= 0.97;
            }
        }
    }

    render() {
        this.gfx.clear();

        // Render tire marks (persistent)
        this.tireMarkGfx.clear();
        for (const tm of this.tireMarks) {
            this.tireMarkGfx.fillStyle(0x222222, tm.alpha);
            const cos = Math.cos(tm.angle), sin = Math.sin(tm.angle);
            this.tireMarkGfx.fillRect(tm.x - cos * 3, tm.y - sin * 3, tm.width, tm.width);
        }

        for (const p of this.particles) {
            if (p.type === 'SPARKS') {
                // Bright spark with glow halo
                const len = p.size * 3;
                const angle = Math.atan2(p.vy, p.vx);
                // Glow
                this.gfx.fillStyle(p.color, p.alpha * 0.2);
                this.gfx.fillCircle(p.x, p.y, p.size + 2);
                // Core line
                this.gfx.lineStyle(1.5, p.color, p.alpha);
                this.gfx.beginPath();
                this.gfx.moveTo(p.x + Math.cos(angle) * len * 0.3, p.y + Math.sin(angle) * len * 0.3);
                this.gfx.lineTo(p.x - Math.cos(angle) * len, p.y - Math.sin(angle) * len);
                this.gfx.strokePath();
            } else if (p.type === 'CONFETTI') {
                const tumble = p.life * 10 + p.rotation;
                const w = p.size * Math.abs(Math.cos(tumble));
                const h = p.size * 0.6;
                this.gfx.fillStyle(p.color, p.alpha);
                this.gfx.fillRect(p.x - w / 2, p.y - h / 2, Math.max(1, w), h);
            } else if (p.type === 'NITRO_FLAME') {
                // Layered flame: glow → core
                this.gfx.fillStyle(p.color, p.alpha * 0.15);
                this.gfx.fillCircle(p.x, p.y, p.size + 4);
                this.gfx.fillStyle(p.color, p.alpha * 0.4);
                this.gfx.fillCircle(p.x, p.y, p.size + 1);
                this.gfx.fillStyle(p.color, p.alpha);
                this.gfx.fillCircle(p.x, p.y, Math.max(0.5, p.size));
            } else if (p.type === 'SMOKE') {
                // Soft expanding smoke rings
                this.gfx.fillStyle(p.color, p.alpha * 0.3);
                this.gfx.fillCircle(p.x, p.y, p.size + 2);
                this.gfx.fillStyle(p.color, p.alpha * 0.5);
                this.gfx.fillCircle(p.x, p.y, p.size);
            } else if (p.type === 'EXPLOSION') {
                // Debris with glow
                this.gfx.fillStyle(p.color, p.alpha * 0.2);
                this.gfx.fillCircle(p.x, p.y, p.size + 3);
                this.gfx.fillStyle(p.color, p.alpha);
                this.gfx.fillCircle(p.x, p.y, Math.max(0.5, p.size * p.alpha));
            } else if (p.type === 'DIRT' || p.type === 'MUD_SPLASH') {
                // Elongated dirt chunks
                this.gfx.fillStyle(p.color, p.alpha * 0.8);
                const cos = Math.cos(p.rotation), sin = Math.sin(p.rotation);
                const hw = p.size * 1.5, hh = p.size * 0.8;
                this.gfx.fillTriangle(
                    p.x + cos * hw, p.y + sin * hw,
                    p.x - sin * hh, p.y + cos * hh,
                    p.x + sin * hh, p.y - cos * hh
                );
            } else {
                this.gfx.fillStyle(p.color, p.alpha);
                this.gfx.fillCircle(p.x, p.y, Math.max(0.5, p.size * p.alpha));
            }
        }
    }

    clear() { this.particles = []; this.gfx.clear(); }
    destroy() { this.gfx.destroy(); this.tireMarkGfx.destroy(); }
}
