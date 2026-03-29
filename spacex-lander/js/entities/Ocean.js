// SpaceX Lander - Ocean Entity (Animated wave surface + water body)

class Ocean {
    constructor(scene, level) {
        this.scene = scene;
        this.waterLevel = CONFIG.OCEAN.WATER_LEVEL;
        this.waveOffset = 0;

        // Use themed level definition if available
        const levelDef = CONFIG.getLevelDef ? CONFIG.getLevelDef(level) : null;

        if (levelDef && levelDef.waveAmp !== undefined) {
            this.waveAmplitude = levelDef.waveAmp;
        } else {
            const lvl = CONFIG.LEVEL;
            this.waveAmplitude = Math.min(
                lvl.WAVE_AMP_BASE + (level - 1) * lvl.WAVE_AMP_PER_LEVEL,
                lvl.WAVE_AMP_MAX
            );
        }
        this.waveFreq = CONFIG.OCEAN.WAVE_FREQ;
        this.waveSpeed = CONFIG.OCEAN.WAVE_SPEED;
        this.swellAmplitude = this.waveAmplitude * CONFIG.OCEAN.SWELL_RATIO;
        this.chopAmplitude = this.waveAmplitude * CONFIG.OCEAN.CHOP_RATIO;
    }

    update(delta) {
        const dt = delta / 1000;
        this.waveOffset += this.waveSpeed * dt;
    }

    getHeightAt(x) {
        const t = this.waveOffset;
        const f = this.waveFreq;

        return this.waterLevel
            - Math.sin(x * f + t) * this.waveAmplitude
            - Math.sin(x * f * 0.3 + t * 0.7) * this.swellAmplitude
            - Math.sin(x * f * 2.1 + t * 1.3) * this.chopAmplitude;
    }

    draw(graphics) {
        const cam = this.scene.cameras.main;
        const wv = cam.worldView;
        const left = wv.x - 100;
        const right = wv.x + wv.width + 100;
        const bottom = wv.y + wv.height + 100;
        const step = 4;

        // Deep water base fill (covers entire ocean area, no seams)
        graphics.fillStyle(CONFIG.COLORS.OCEAN_DEEP, 1.0);
        graphics.fillRect(left, this.waterLevel - 20, right - left, bottom - this.waterLevel + 20);

        // Mid-depth layer (wave-relative polyline, no flat edges)
        graphics.fillStyle(CONFIG.COLORS.OCEAN_MID, 0.6);
        graphics.beginPath();
        graphics.moveTo(left, bottom);
        for (let x = left; x <= right; x += step) {
            graphics.lineTo(x, this.getHeightAt(x) + 40);
        }
        graphics.lineTo(right, bottom);
        graphics.closePath();
        graphics.fillPath();

        // Surface-depth layer (wave-relative)
        graphics.fillStyle(CONFIG.COLORS.OCEAN_MID, 0.4);
        graphics.beginPath();
        graphics.moveTo(left, bottom);
        for (let x = left; x <= right; x += step) {
            graphics.lineTo(x, this.getHeightAt(x) + 15);
        }
        graphics.lineTo(right, bottom);
        graphics.closePath();
        graphics.fillPath();

        // Surface layer (wave-relative)
        graphics.fillStyle(CONFIG.COLORS.OCEAN_SURFACE, 0.95);
        graphics.beginPath();
        graphics.moveTo(left, bottom);
        for (let x = left; x <= right; x += step) {
            graphics.lineTo(x, this.getHeightAt(x));
        }
        graphics.lineTo(right, bottom);
        graphics.closePath();
        graphics.fillPath();

        // Wave highlights / foam
        if (this.waveAmplitude > CONFIG.OCEAN.FOAM_THRESHOLD) {
            graphics.lineStyle(1, CONFIG.COLORS.OCEAN_FOAM, 0.3);
            for (let x = left; x <= right; x += step) {
                const y = this.getHeightAt(x);
                const nextY = this.getHeightAt(x + step);
                const prevY = this.getHeightAt(x - step);
                if (y < nextY && y < prevY) {
                    // Foam line at wave peak
                    graphics.beginPath();
                    graphics.moveTo(x - 3, y + 1);
                    graphics.lineTo(x + 3, y + 1);
                    graphics.strokePath();

                    // Scattered foam dots near peaks
                    graphics.fillStyle(CONFIG.COLORS.OCEAN_FOAM, 0.2);
                    graphics.fillCircle(x + 5, y + 2.5, 1);
                    graphics.fillCircle(x - 4, y + 3, 0.8);
                } else if (y > nextY) {
                    // Specular highlight on rising wave face
                    graphics.lineStyle(0.5, CONFIG.COLORS.OCEAN_HIGHLIGHT, 0.12);
                    graphics.beginPath();
                    graphics.moveTo(x, y);
                    graphics.lineTo(x + step, nextY);
                    graphics.strokePath();
                    graphics.lineStyle(1, CONFIG.COLORS.OCEAN_FOAM, 0.3);
                }
            }
        }

        // Horizon line glow
        graphics.lineStyle(1, CONFIG.COLORS.OCEAN_HIGHLIGHT, 0.15);
        graphics.beginPath();
        for (let x = left; x <= right; x += step) {
            const y = this.getHeightAt(x);
            if (x === left) graphics.moveTo(x, y);
            else graphics.lineTo(x, y);
        }
        graphics.strokePath();
    }
}
