// Lunar Lander - Procedural Terrain Generator (Enhanced with surface detail)

class Terrain {
    constructor(scene, level) {
        this.scene = scene;
        this.level = level;
        this.points = [];
        this.landingPads = [];
        this.graphics = null;

        this.generate();
    }

    generate() {
        const w = CONFIG.WIDTH;
        const h = CONFIG.HEIGHT;
        const segments = CONFIG.TERRAIN_SEGMENTS + (this.level - 1) * CONFIG.DIFFICULTY.extraSegmentsPerLevel;
        const segWidth = w / segments;
        const roughness = Math.min(CONFIG.TERRAIN_ROUGHNESS + (this.level - 1) * CONFIG.DIFFICULTY.terrainRoughnessIncrease, 0.95);

        const padConfigs = this._getPadConfigs();
        const padPositions = this._choosePadPositions(segments, padConfigs.length);
        const padSegments = new Map();

        padConfigs.forEach((pc, i) => {
            const centerSeg = padPositions[i];
            const padWidthInSegs = Math.max(2, Math.ceil(pc.width / segWidth));
            const startSeg = Math.max(1, centerSeg - Math.floor(padWidthInSegs / 2));
            const endSeg = Math.min(segments - 1, startSeg + padWidthInSegs);
            for (let s = startSeg; s <= endSeg; s++) {
                padSegments.set(s, i);
            }
            pc.startSeg = startSeg;
            pc.endSeg = endSeg;
        });

        const heights = new Array(segments + 1);
        heights[0] = h - CONFIG.TERRAIN_MIN_HEIGHT - Math.random() * (CONFIG.TERRAIN_MAX_HEIGHT - CONFIG.TERRAIN_MIN_HEIGHT) * 0.3;
        heights[segments] = h - CONFIG.TERRAIN_MIN_HEIGHT - Math.random() * (CONFIG.TERRAIN_MAX_HEIGHT - CONFIG.TERRAIN_MIN_HEIGHT) * 0.3;

        for (let i = 1; i < segments; i++) {
            const baseHeight = h - CONFIG.TERRAIN_MIN_HEIGHT -
                Math.random() * (CONFIG.TERRAIN_MAX_HEIGHT - CONFIG.TERRAIN_MIN_HEIGHT);
            heights[i] = baseHeight;
        }

        for (let pass = 0; pass < 3; pass++) {
            for (let i = 1; i < segments; i++) {
                if (!padSegments.has(i)) {
                    heights[i] = heights[i] * roughness +
                        ((heights[i - 1] + heights[i + 1]) / 2) * (1 - roughness);
                }
            }
        }

        padConfigs.forEach((pc, i) => {
            let avgH = 0;
            let count = 0;
            for (let s = pc.startSeg; s <= pc.endSeg; s++) {
                avgH += heights[s];
                count++;
            }
            avgH /= count;
            avgH = Math.max(avgH, h - CONFIG.TERRAIN_MAX_HEIGHT + 40);
            avgH = Math.min(avgH, h - CONFIG.TERRAIN_MIN_HEIGHT - 20);

            for (let s = pc.startSeg; s <= pc.endSeg; s++) {
                heights[s] = avgH;
            }

            if (pc.startSeg > 0) {
                heights[pc.startSeg - 1] = (heights[pc.startSeg - 1] + avgH) / 2;
            }
            if (pc.endSeg < segments) {
                heights[pc.endSeg + 1] = (heights[pc.endSeg + 1] + avgH) / 2;
            }

            const padCenterX = ((pc.startSeg + pc.endSeg) / 2) * segWidth;
            const pad = new LandingPad(this.scene, padCenterX, avgH, pc.width, pc.multiplier);
            this.landingPads.push(pad);
        });

        this.points = [];
        for (let i = 0; i <= segments; i++) {
            this.points.push({
                x: i * segWidth,
                y: heights[i]
            });
        }

        this.points[0].y = Math.min(this.points[0].y, h - 50);
        this.points[segments].y = Math.min(this.points[segments].y, h - 50);

        // Pre-generate crater positions for surface detail
        this._craters = [];
        const vfx = CONFIG.VFX;
        for (let i = 0; i < vfx.CRATER_COUNT; i++) {
            const segIdx = 2 + Math.floor(Math.random() * (this.points.length - 4));
            const px = this.points[segIdx].x;
            const py = this.points[segIdx].y;
            // Don't place craters on landing pads
            let onPad = false;
            for (const pad of this.landingPads) {
                if (Math.abs(px - pad.x) < pad.width) { onPad = true; break; }
            }
            if (!onPad) {
                this._craters.push({
                    x: px,
                    y: py,
                    radius: 5 + Math.random() * 12,
                    depth: 2 + Math.random() * 4
                });
            }
        }

        // Pre-generate regolith dot positions
        this._regolithDots = [];
        for (let i = 0; i < vfx.REGOLITH_DOT_COUNT; i++) {
            const rx = Math.random() * w;
            const surfY = this.getHeightAt(rx);
            this._regolithDots.push({
                x: rx,
                y: surfY + 1 + Math.random() * 20,
                size: 0.5 + Math.random() * 1.5,
                alpha: 0.1 + Math.random() * 0.3,
                shade: Math.random() > 0.5 ? 0x888888 : 0x555555
            });
        }
    }

    _getPadConfigs() {
        const level = this.level;
        const shrink = Math.pow(CONFIG.DIFFICULTY.padShrinkFactor, level - 1);
        const configs = [];

        configs.push({
            width: Math.max(30, CONFIG.PAD_SIZES.LARGE * shrink),
            multiplier: 1
        });
        configs.push({
            width: Math.max(25, CONFIG.PAD_SIZES.MEDIUM * shrink),
            multiplier: 2
        });
        if (level >= 2) {
            configs.push({
                width: Math.max(20, CONFIG.PAD_SIZES.SMALL * shrink),
                multiplier: 3
            });
        }

        return configs;
    }

    _choosePadPositions(totalSegments, count) {
        const positions = [];
        const margin = 5;
        const zoneSize = Math.floor((totalSegments - margin * 2) / count);

        for (let i = 0; i < count; i++) {
            const zoneStart = margin + i * zoneSize;
            const zoneEnd = zoneStart + zoneSize;
            const pos = zoneStart + Math.floor(Math.random() * (zoneEnd - zoneStart));
            positions.push(pos);
        }
        return positions;
    }

    draw(graphics) {
        const h = CONFIG.HEIGHT;
        const w = CONFIG.WIDTH;

        // --- Gradient terrain fill (two-pass: dark base + lighter top overlay) ---

        // Dark base fill
        graphics.fillStyle(CONFIG.COLORS.TERRAIN_DARK, 1);
        graphics.beginPath();
        graphics.moveTo(0, h);
        for (const p of this.points) {
            graphics.lineTo(p.x, p.y);
        }
        graphics.lineTo(w, h);
        graphics.closePath();
        graphics.fillPath();

        // Lighter overlay on upper portion of terrain
        graphics.fillStyle(CONFIG.COLORS.TERRAIN, 0.6);
        graphics.beginPath();
        graphics.moveTo(0, h);
        for (const p of this.points) {
            graphics.lineTo(p.x, p.y);
        }
        graphics.lineTo(w, h);
        graphics.closePath();
        graphics.fillPath();

        // Even lighter strip near the surface
        for (let band = 0; band < 4; band++) {
            const offset = band * 6;
            const alpha = 0.12 - band * 0.025;
            graphics.fillStyle(CONFIG.COLORS.TERRAIN_LIGHT, Math.max(0.02, alpha));
            graphics.beginPath();
            graphics.moveTo(0, h);
            for (const p of this.points) {
                graphics.lineTo(p.x, p.y + offset);
            }
            graphics.lineTo(w, h);
            graphics.closePath();
            graphics.fillPath();
        }

        // --- Subsurface strata lines ---
        const vfx = CONFIG.VFX;
        for (let s = 0; s < vfx.STRATA_LINES; s++) {
            const strataOffset = 25 + s * 30;
            const alpha = 0.06 - s * 0.015;
            graphics.lineStyle(1, CONFIG.COLORS.TERRAIN_LIGHT, Math.max(0.01, alpha));
            graphics.beginPath();
            let started = false;
            for (const p of this.points) {
                const sy = p.y + strataOffset;
                if (sy < h) {
                    if (!started) { graphics.moveTo(p.x, sy); started = true; }
                    else graphics.lineTo(p.x, sy);
                }
            }
            if (started) graphics.strokePath();
        }

        // --- Craters ---
        for (const crater of this._craters) {
            // Dark crater depression
            graphics.fillStyle(0x222222, 0.4);
            graphics.fillEllipse(crater.x, crater.y + crater.depth * 0.3, crater.radius * 2, crater.depth * 2);

            // Highlight rim on top edge
            graphics.lineStyle(1, CONFIG.COLORS.TERRAIN_LIGHT, 0.2);
            graphics.beginPath();
            const rimX1 = crater.x - crater.radius * 0.8;
            const rimX2 = crater.x + crater.radius * 0.8;
            const rimY = crater.y - crater.depth * 0.2;
            // Simple arc approximation
            const steps = 8;
            for (let i = 0; i <= steps; i++) {
                const t = i / steps;
                const ax = rimX1 + (rimX2 - rimX1) * t;
                const ay = rimY - Math.sin(t * Math.PI) * crater.depth * 0.4;
                if (i === 0) graphics.moveTo(ax, ay);
                else graphics.lineTo(ax, ay);
            }
            graphics.strokePath();
        }

        // --- Regolith dots (surface texture) ---
        for (const dot of this._regolithDots) {
            graphics.fillStyle(dot.shade, dot.alpha);
            graphics.fillCircle(dot.x, dot.y, dot.size);
        }

        // --- Terrain edge glow (wide faint stroke) ---
        graphics.lineStyle(5, CONFIG.COLORS.TERRAIN_EDGE_GLOW, 0.08);
        graphics.beginPath();
        graphics.moveTo(this.points[0].x, this.points[0].y);
        for (let i = 1; i < this.points.length; i++) {
            graphics.lineTo(this.points[i].x, this.points[i].y);
        }
        graphics.strokePath();

        // --- Terrain outline (crisp) ---
        graphics.lineStyle(2, CONFIG.COLORS.TERRAIN_STROKE, 1);
        graphics.beginPath();
        graphics.moveTo(this.points[0].x, this.points[0].y);
        for (let i = 1; i < this.points.length; i++) {
            graphics.lineTo(this.points[i].x, this.points[i].y);
        }
        graphics.strokePath();

        // Draw landing pads
        for (const pad of this.landingPads) {
            pad.draw(graphics);
        }
    }

    getHeightAt(x) {
        if (x <= 0) return this.points[0].y;
        if (x >= CONFIG.WIDTH) return this.points[this.points.length - 1].y;

        for (let i = 0; i < this.points.length - 1; i++) {
            if (x >= this.points[i].x && x <= this.points[i + 1].x) {
                const t = (x - this.points[i].x) / (this.points[i + 1].x - this.points[i].x);
                return this.points[i].y + t * (this.points[i + 1].y - this.points[i].y);
            }
        }
        return CONFIG.HEIGHT;
    }

    getPadAt(x) {
        for (const pad of this.landingPads) {
            if (pad.containsX(x)) return pad;
        }
        return null;
    }

    destroy() {
        for (const pad of this.landingPads) {
            pad.destroy();
        }
        this.landingPads = [];
    }
}
