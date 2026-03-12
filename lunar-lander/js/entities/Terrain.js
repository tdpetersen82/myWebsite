// Lunar Lander - Procedural Terrain Generator

class Terrain {
    constructor(scene, level) {
        this.scene = scene;
        this.level = level;
        this.points = [];       // Array of {x, y}
        this.landingPads = [];  // Array of LandingPad instances
        this.graphics = null;

        this.generate();
    }

    generate() {
        const w = CONFIG.WIDTH;
        const h = CONFIG.HEIGHT;
        const segments = CONFIG.TERRAIN_SEGMENTS + (this.level - 1) * CONFIG.DIFFICULTY.extraSegmentsPerLevel;
        const segWidth = w / segments;
        const roughness = Math.min(CONFIG.TERRAIN_ROUGHNESS + (this.level - 1) * CONFIG.DIFFICULTY.terrainRoughnessIncrease, 0.95);

        // Determine number and sizes of landing pads
        const padConfigs = this._getPadConfigs();

        // Choose random segment positions for pads (spread them out)
        const padPositions = this._choosePadPositions(segments, padConfigs.length);

        // Create a set of segments that are part of pads
        const padSegments = new Map(); // segIndex -> padConfig index

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

        // Generate terrain heights using midpoint displacement
        const heights = new Array(segments + 1);
        heights[0] = h - CONFIG.TERRAIN_MIN_HEIGHT - Math.random() * (CONFIG.TERRAIN_MAX_HEIGHT - CONFIG.TERRAIN_MIN_HEIGHT) * 0.3;
        heights[segments] = h - CONFIG.TERRAIN_MIN_HEIGHT - Math.random() * (CONFIG.TERRAIN_MAX_HEIGHT - CONFIG.TERRAIN_MIN_HEIGHT) * 0.3;

        // Fill random heights
        for (let i = 1; i < segments; i++) {
            const baseHeight = h - CONFIG.TERRAIN_MIN_HEIGHT -
                Math.random() * (CONFIG.TERRAIN_MAX_HEIGHT - CONFIG.TERRAIN_MIN_HEIGHT);
            heights[i] = baseHeight;
        }

        // Smooth the terrain
        for (let pass = 0; pass < 3; pass++) {
            for (let i = 1; i < segments; i++) {
                if (!padSegments.has(i)) {
                    heights[i] = heights[i] * roughness +
                        ((heights[i - 1] + heights[i + 1]) / 2) * (1 - roughness);
                }
            }
        }

        // Flatten pad areas and create LandingPad objects
        padConfigs.forEach((pc, i) => {
            // Find the average height in the pad zone
            let avgH = 0;
            let count = 0;
            for (let s = pc.startSeg; s <= pc.endSeg; s++) {
                avgH += heights[s];
                count++;
            }
            avgH /= count;

            // Ensure pad isn't too high (must be landable)
            avgH = Math.max(avgH, h - CONFIG.TERRAIN_MAX_HEIGHT + 40);
            avgH = Math.min(avgH, h - CONFIG.TERRAIN_MIN_HEIGHT - 20);

            // Flatten
            for (let s = pc.startSeg; s <= pc.endSeg; s++) {
                heights[s] = avgH;
            }

            // Smooth transition to neighbors
            if (pc.startSeg > 0) {
                heights[pc.startSeg - 1] = (heights[pc.startSeg - 1] + avgH) / 2;
            }
            if (pc.endSeg < segments) {
                heights[pc.endSeg + 1] = (heights[pc.endSeg + 1] + avgH) / 2;
            }

            // Create LandingPad object
            const padCenterX = ((pc.startSeg + pc.endSeg) / 2) * segWidth;
            const pad = new LandingPad(this.scene, padCenterX, avgH, pc.width, pc.multiplier);
            this.landingPads.push(pad);
        });

        // Build points array
        this.points = [];
        for (let i = 0; i <= segments; i++) {
            this.points.push({
                x: i * segWidth,
                y: heights[i]
            });
        }

        // Ensure edges go to bottom
        this.points[0].y = Math.min(this.points[0].y, h - 50);
        this.points[segments].y = Math.min(this.points[segments].y, h - 50);
    }

    _getPadConfigs() {
        const level = this.level;
        const shrink = Math.pow(CONFIG.DIFFICULTY.padShrinkFactor, level - 1);
        const configs = [];

        // Always have at least one large pad
        configs.push({
            width: Math.max(30, CONFIG.PAD_SIZES.LARGE * shrink),
            multiplier: 1
        });

        // Add medium pad
        configs.push({
            width: Math.max(25, CONFIG.PAD_SIZES.MEDIUM * shrink),
            multiplier: 2
        });

        // Level 2+ gets a small/3x pad
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
        // Draw filled terrain
        graphics.fillStyle(CONFIG.COLORS.TERRAIN, 1);
        graphics.beginPath();
        graphics.moveTo(0, CONFIG.HEIGHT);

        for (const p of this.points) {
            graphics.lineTo(p.x, p.y);
        }

        graphics.lineTo(CONFIG.WIDTH, CONFIG.HEIGHT);
        graphics.closePath();
        graphics.fillPath();

        // Draw terrain outline
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

    // Get terrain height at a given x position (interpolated)
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

    // Check if x position is on a landing pad, returns pad or null
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
