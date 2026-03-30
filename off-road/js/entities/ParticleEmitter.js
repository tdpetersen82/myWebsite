class ParticleEmitter {
    constructor(scene) {
        this.scene = scene;
        this.maxParticles = CONFIG.PARTICLES.MAX_COUNT;

        // Determine whether we can use sprite-based particles
        this.useSprites = scene.textures.exists('particles');

        // Frame name mapping for each particle type
        this._frameMaps = {
            DIRT:         ['dust_0', 'dust_1', 'dust_2', 'dust_3'],
            MUD_SPLASH:   ['mud_0', 'mud_1', 'mud_2', 'mud_3'],
            SMOKE:        ['smoke_0', 'smoke_1', 'smoke_2', 'smoke_3'],
            NITRO_FLAME:  ['flame_0', 'flame_1', 'flame_2', 'flame_3'],
            SPARKS:       ['spark_0', 'spark_1'],
            EXPLOSION:    ['explosion_0', 'explosion_1', 'explosion_2', 'explosion_3'],
            WATER_SPLASH: ['water_0', 'water_1', 'water_2', 'water_3'],
            CONFETTI:     ['confetti'],
        };

        // Active particle data (both modes store logic state here)
        this.particles = [];

        // Sprite pool for recycling (sprite mode only)
        this._spritePool = [];

        // Procedural graphics (fallback mode only)
        this.gfx = null;
        if (!this.useSprites) {
            this.gfx = scene.add.graphics();
            this.gfx.setDepth(15);
        }

        // Persistent tire marks layer (below vehicles) -- always procedural
        this.tireMarkGfx = scene.add.graphics();
        this.tireMarkGfx.setDepth(1.5);
        this.tireMarks = [];
        this.maxTireMarks = 500;
    }

    // --- Public API (unchanged signatures) ---

    emit(type, x, y, overrides) {
        const preset = CONFIG.PARTICLES[type];
        if (!preset) return;
        const count = (overrides && overrides.count) || preset.count;
        for (let i = 0; i < count; i++) {
            if (this.particles.length >= this.maxParticles) this._removeParticle(0);
            const angle = Math.random() * Math.PI * 2;
            const speed = preset.speed * (0.5 + Math.random() * 0.5);
            this._addParticle({
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
            if (this.particles.length >= this.maxParticles) this._removeParticle(0);
            const a = angle + (Math.random() - 0.5) * spread;
            const speed = preset.speed * (0.5 + Math.random() * 0.5);
            this._addParticle({
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

    addTireMark(x, y, angle, isDrift) {
        if (this.tireMarks.length >= this.maxTireMarks) this.tireMarks.shift();
        this.tireMarks.push({ x, y, angle, alpha: isDrift ? 0.12 : 0.05, width: isDrift ? 3 : 1.5 });
    }

    update(delta) {
        const dt = delta / 1000;
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.life -= dt;
            if (p.life <= 0) { this._removeParticle(i); continue; }

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

            // Sync sprite transforms (sprite mode)
            if (this.useSprites && p.sprite) {
                p.sprite.setPosition(p.x, p.y);
                p.sprite.setAlpha(Math.max(0, Math.min(1, p.alpha)));
                p.sprite.setScale(p.size / p._baseSize);
                p.sprite.setRotation(p.rotation);
            }
        }
    }

    render() {
        // Tire marks are always procedural
        this.tireMarkGfx.clear();
        for (const tm of this.tireMarks) {
            this.tireMarkGfx.fillStyle(0x222222, tm.alpha);
            const cos = Math.cos(tm.angle), sin = Math.sin(tm.angle);
            this.tireMarkGfx.fillRect(tm.x - cos * 3, tm.y - sin * 3, tm.width, tm.width);
        }

        // Sprite mode: sprites update themselves, nothing to draw here
        if (this.useSprites) return;

        // Fallback: procedural rendering
        this.gfx.clear();

        for (const p of this.particles) {
            if (p.type === 'SPARKS') {
                const len = p.size * 3;
                const angle = Math.atan2(p.vy, p.vx);
                this.gfx.fillStyle(p.color, p.alpha * 0.2);
                this.gfx.fillCircle(p.x, p.y, p.size + 2);
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
                this.gfx.fillStyle(p.color, p.alpha * 0.15);
                this.gfx.fillCircle(p.x, p.y, p.size + 4);
                this.gfx.fillStyle(p.color, p.alpha * 0.4);
                this.gfx.fillCircle(p.x, p.y, p.size + 1);
                this.gfx.fillStyle(p.color, p.alpha);
                this.gfx.fillCircle(p.x, p.y, Math.max(0.5, p.size));
            } else if (p.type === 'SMOKE') {
                this.gfx.fillStyle(p.color, p.alpha * 0.3);
                this.gfx.fillCircle(p.x, p.y, p.size + 2);
                this.gfx.fillStyle(p.color, p.alpha * 0.5);
                this.gfx.fillCircle(p.x, p.y, p.size);
            } else if (p.type === 'EXPLOSION') {
                this.gfx.fillStyle(p.color, p.alpha * 0.2);
                this.gfx.fillCircle(p.x, p.y, p.size + 3);
                this.gfx.fillStyle(p.color, p.alpha);
                this.gfx.fillCircle(p.x, p.y, Math.max(0.5, p.size * p.alpha));
            } else if (p.type === 'DIRT' || p.type === 'MUD_SPLASH') {
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

    clear() {
        // Return all sprites to pool
        for (let i = this.particles.length - 1; i >= 0; i--) {
            this._removeParticle(i);
        }
        this.particles = [];
        if (this.gfx) this.gfx.clear();
    }

    destroy() {
        this.clear();
        // Destroy all pooled sprites
        for (const sprite of this._spritePool) {
            sprite.destroy();
        }
        this._spritePool = [];
        if (this.gfx) this.gfx.destroy();
        this.tireMarkGfx.destroy();
    }

    // --- Internal helpers ---

    _addParticle(data) {
        if (this.useSprites) {
            const frames = this._frameMaps[data.type];
            if (frames) {
                const frameName = frames[Math.floor(Math.random() * frames.length)];
                const sprite = this._acquireSprite(frameName);
                sprite.setPosition(data.x, data.y);
                sprite.setAlpha(data.alpha);
                sprite.setRotation(data.rotation);
                sprite.setDepth(15);
                sprite.setVisible(true);

                // Compute a base size so we can scale relative to it.
                // We want the sprite to visually match the procedural particle size.
                const baseSize = Math.max(sprite.width, sprite.height) || 1;
                const desiredDiameter = data.size * 2;
                sprite.setScale(desiredDiameter / baseSize);

                data.sprite = sprite;
                data._baseSize = data.size; // snapshot for scale ratio
            }
        }
        this.particles.push(data);
    }

    _removeParticle(index) {
        const p = this.particles[index];
        if (p && p.sprite) {
            this._releaseSprite(p.sprite);
            p.sprite = null;
        }
        this.particles.splice(index, 1);
    }

    _acquireSprite(frameName) {
        // Try to reuse a pooled sprite
        if (this._spritePool.length > 0) {
            const sprite = this._spritePool.pop();
            sprite.setTexture('particles', frameName);
            sprite.setActive(true);
            sprite.setVisible(true);
            return sprite;
        }
        // Create a new one
        const sprite = this.scene.add.sprite(0, 0, 'particles', frameName);
        return sprite;
    }

    _releaseSprite(sprite) {
        sprite.setVisible(false);
        sprite.setActive(false);
        this._spritePool.push(sprite);
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
}
