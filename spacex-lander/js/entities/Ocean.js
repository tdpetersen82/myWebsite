// SpaceX Lander - Ocean Entity (Animated wave surface + water body)

class Ocean {
    constructor(scene, level) {
        this.scene = scene;
        this.waterLevel = CONFIG.OCEAN.WATER_LEVEL;
        this.waveOffset = 0;

        // Level-based wave intensity
        const lvl = CONFIG.LEVEL;
        this.waveAmplitude = Math.min(
            lvl.WAVE_AMP_BASE + (level - 1) * lvl.WAVE_AMP_PER_LEVEL,
            lvl.WAVE_AMP_MAX
        );
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

        // Water body — gradient bands
        const bands = [
            { y: this.waterLevel, h: 30, color: CONFIG.COLORS.OCEAN_SURFACE, alpha: 0.9 },
            { y: this.waterLevel + 30, h: 40, color: CONFIG.COLORS.OCEAN_MID, alpha: 0.95 },
            { y: this.waterLevel + 70, h: bottom - this.waterLevel - 70, color: CONFIG.COLORS.OCEAN_DEEP, alpha: 1.0 }
        ];

        for (const band of bands) {
            graphics.fillStyle(band.color, band.alpha);
            graphics.fillRect(left, band.y, right - left, band.h);
        }

        // Wave surface polyline fill (over the bands)
        graphics.fillStyle(CONFIG.COLORS.OCEAN_SURFACE, 0.95);
        graphics.beginPath();
        graphics.moveTo(left, bottom);

        for (let x = left; x <= right; x += step) {
            const y = this.getHeightAt(x);
            graphics.lineTo(x, y);
        }

        graphics.lineTo(right, bottom);
        graphics.closePath();
        graphics.fillPath();

        // Darker depth below the surface
        graphics.fillStyle(CONFIG.COLORS.OCEAN_MID, 0.4);
        graphics.beginPath();
        graphics.moveTo(left, bottom);
        for (let x = left; x <= right; x += step) {
            graphics.lineTo(x, this.getHeightAt(x) + 15);
        }
        graphics.lineTo(right, bottom);
        graphics.closePath();
        graphics.fillPath();

        graphics.fillStyle(CONFIG.COLORS.OCEAN_DEEP, 0.5);
        graphics.beginPath();
        graphics.moveTo(left, bottom);
        for (let x = left; x <= right; x += step) {
            graphics.lineTo(x, this.getHeightAt(x) + 40);
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
                if (y < nextY && y < this.getHeightAt(x - step)) {
                    graphics.beginPath();
                    graphics.moveTo(x - 3, y + 1);
                    graphics.lineTo(x + 3, y + 1);
                    graphics.strokePath();
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
