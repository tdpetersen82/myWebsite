class Terrain {
    constructor(scene) {
        this.scene = scene;
        this.segments = [];     // { x, y, body, graphics }
        this.details = [];      // decoration sprites
        this.heightCache = {};  // x -> y mapping
        this.leftmostX = 0;
        this.rightmostX = 0;
        this.currentBiome = 'grassland';
        this.graphics = scene.add.graphics();
        this.graphics.setDepth(5);
        this.detailGroup = scene.add.group();
    }

    getHeight(worldX) {
        // Multi-octave sine terrain with difficulty ramp
        const w1 = CONFIG.TERRAIN_WAVE_1;
        const w2 = CONFIG.TERRAIN_WAVE_2;
        const w3 = CONFIG.TERRAIN_WAVE_3;
        const ramp = 1 + Math.max(0, worldX) * CONFIG.TERRAIN_DIFFICULTY_RAMP;

        let height = CONFIG.TERRAIN_BASE_Y;
        height += Math.sin(worldX * w1.freq) * w1.amp * ramp;
        height += Math.sin(worldX * w2.freq + 1.5) * w2.amp * ramp;
        height += Math.sin(worldX * w3.freq + 3.0) * w3.amp * Math.min(ramp, 3);

        // Flatten the start area — generous flat runway then smooth blend
        if (worldX < 400) {
            return CONFIG.TERRAIN_BASE_Y;
        }
        if (worldX < 800) {
            const t = (worldX - 400) / 400;
            const eased = t * t * (3 - 2 * t); // smoothstep
            height = CONFIG.TERRAIN_BASE_Y * (1 - eased) + height * eased;
        }

        return height;
    }

    getBiome(worldX) {
        const idx = Math.min(
            CONFIG.BIOMES.length - 1,
            Math.floor(Math.max(0, worldX) / CONFIG.BIOME_LENGTH)
        );
        return CONFIG.BIOMES[idx];
    }

    getBiomeColors(biome) {
        const palettes = {
            grassland: { top: 0x4A7A2E, mid: 0x3A5A1E, bottom: 0x2A3A0E, surface: 0x5A9A3E },
            desert: { top: 0xD4A854, mid: 0xB48834, bottom: 0x8A6824, surface: 0xE4B864 },
            arctic: { top: 0xE8E8F0, mid: 0xC8C8E0, bottom: 0xA0A0B8, surface: 0xF0F0FF },
            volcanic: { top: 0x444444, mid: 0x2A2A2A, bottom: 0x1A1A1A, surface: 0x555555 },
        };
        return palettes[biome] || palettes.grassland;
    }

    generateChunk(startX, endX) {
        const segW = CONFIG.TERRAIN_SEGMENT_WIDTH;
        const points = [];

        for (let x = startX; x <= endX + segW; x += segW) {
            const y = this.getHeight(x);
            points.push({ x, y });
            this.heightCache[x] = y;
        }

        // Create Matter.js bodies for each segment
        for (let i = 0; i < points.length - 1; i++) {
            const p1 = points[i];
            const p2 = points[i + 1];

            const cx = (p1.x + p2.x) / 2;
            const cy = (p1.y + p2.y) / 2;
            const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x);
            const length = Math.sqrt(
                (p2.x - p1.x) ** 2 + (p2.y - p1.y) ** 2
            );

            const body = this.scene.matter.add.rectangle(cx, cy + CONFIG.TERRAIN_DEPTH / 2, length + 1, CONFIG.TERRAIN_DEPTH, {
                isStatic: true,
                angle: angle,
                label: 'terrain',
                friction: 0.6,
                restitution: 0.05,
                collisionFilter: { category: 0x0001, mask: 0x0002 },
            });

            this.segments.push({
                x: p1.x,
                y: p1.y,
                x2: p2.x,
                y2: p2.y,
                body: body,
            });
        }

        return points;
    }

    update(cameraX) {
        const leftBound = cameraX - CONFIG.TERRAIN_BEHIND;
        const rightBound = cameraX + CONFIG.TERRAIN_AHEAD;
        const segW = CONFIG.TERRAIN_SEGMENT_WIDTH;

        // Generate terrain ahead
        if (this.rightmostX < rightBound) {
            const startX = this.rightmostX === 0 ? -200 : this.rightmostX;
            const endX = rightBound + segW;
            this.generateChunk(startX, endX);
            this.rightmostX = endX;
        }

        // Remove old segments behind camera
        this.segments = this.segments.filter(seg => {
            if (seg.x2 < leftBound) {
                this.scene.matter.world.remove(seg.body);
                return false;
            }
            return true;
        });

        // Remove off-screen details
        this.details = this.details.filter(d => {
            if (d.x < leftBound) {
                d.sprite.destroy();
                return false;
            }
            return true;
        });

        // Update biome
        this.currentBiome = this.getBiome(cameraX);

        // Redraw visible terrain
        this.draw(cameraX);
    }

    draw(cameraX) {
        this.graphics.clear();

        const cam = this.scene.cameras.main;
        const leftBound = cam.scrollX - 50;
        const rightBound = cam.scrollX + CONFIG.WIDTH + 50;

        const visibleSegs = this.segments.filter(
            s => s.x2 >= leftBound && s.x <= rightBound
        );

        if (visibleSegs.length === 0) return;

        // Group segments by biome for batched drawing
        const biomeGroups = {};
        for (const seg of visibleSegs) {
            const biome = this.getBiome(seg.x);
            if (!biomeGroups[biome]) biomeGroups[biome] = [];
            biomeGroups[biome].push(seg);
        }

        // Draw each biome group as batched paths
        for (const biome in biomeGroups) {
            const segs = biomeGroups[biome];
            const colors = this.getBiomeColors(biome);
            const bottomY = cam.scrollY + CONFIG.HEIGHT + 200;

            // Top layer — single batched path
            this.graphics.fillStyle(colors.top, 1);
            this.graphics.beginPath();
            this.graphics.moveTo(segs[0].x, segs[0].y);
            for (const seg of segs) {
                this.graphics.lineTo(seg.x2, seg.y2);
            }
            const last = segs[segs.length - 1];
            this.graphics.lineTo(last.x2, bottomY);
            this.graphics.lineTo(segs[0].x, bottomY);
            this.graphics.closePath();
            this.graphics.fill();

            // Mid layer
            this.graphics.fillStyle(colors.mid, 1);
            this.graphics.beginPath();
            this.graphics.moveTo(segs[0].x, segs[0].y + 30);
            for (const seg of segs) {
                this.graphics.lineTo(seg.x2, seg.y2 + 30);
            }
            this.graphics.lineTo(last.x2, bottomY);
            this.graphics.lineTo(segs[0].x, bottomY);
            this.graphics.closePath();
            this.graphics.fill();

            // Bottom layer
            this.graphics.fillStyle(colors.bottom, 1);
            this.graphics.beginPath();
            this.graphics.moveTo(segs[0].x, segs[0].y + 80);
            for (const seg of segs) {
                this.graphics.lineTo(seg.x2, seg.y2 + 80);
            }
            this.graphics.lineTo(last.x2, bottomY);
            this.graphics.lineTo(segs[0].x, bottomY);
            this.graphics.closePath();
            this.graphics.fill();

            // Surface highlight — single batched stroke
            this.graphics.lineStyle(3, colors.surface, 1);
            this.graphics.beginPath();
            this.graphics.moveTo(segs[0].x, segs[0].y);
            for (const seg of segs) {
                this.graphics.lineTo(seg.x2, seg.y2);
            }
            this.graphics.stroke();
        }
    }

    getSurfaceY(worldX) {
        return this.getHeight(worldX);
    }
}
