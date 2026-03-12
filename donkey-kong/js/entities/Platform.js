// ============================================================
// Donkey Kong — Platform / Girder Entity
// ============================================================

class PlatformManager {
    constructor(scene) {
        this.scene = scene;
        this.platforms = [];
        this.platformGroup = scene.physics.add.staticGroup();
    }

    create() {
        const cfg = DK_CONFIG;
        const THICKNESS = 8;

        cfg.PLATFORMS.forEach((pDef, index) => {
            const width = pDef.x2 - pDef.x1;

            // Build collision as a series of small static bodies along the girder
            const SEGMENT_COUNT = Math.max(4, Math.floor(width / 40));
            const segWidth = width / SEGMENT_COUNT;

            for (let i = 0; i < SEGMENT_COUNT; i++) {
                const sx = pDef.x1 + i * segWidth;
                const sy = pDef.y + pDef.slope * (i * segWidth) - THICKNESS / 2;

                const body = this.scene.add.zone(sx + segWidth / 2, sy + THICKNESS / 2, segWidth, THICKNESS);
                this.scene.physics.add.existing(body, true); // static
                this.platformGroup.add(body);
            }

            // Store platform definition for barrel movement, slope lookups etc.
            this.platforms.push({
                ...pDef,
                index,
                thickness: THICKNESS,
            });
        });
    }

    /**
     * Get the Y position on a platform at a given X coordinate
     */
    getYAtX(platformIndex, x) {
        const p = this.platforms[platformIndex];
        if (!p) return 0;
        const dx = x - p.x1;
        return p.y + p.slope * dx;
    }

    /**
     * Find which platform index an entity is standing on (by y and x)
     */
    findPlatformAt(x, y, tolerance = 20) {
        for (let i = 0; i < this.platforms.length; i++) {
            const p = this.platforms[i];
            if (x >= p.x1 && x <= p.x2) {
                const platY = this.getYAtX(i, x);
                if (Math.abs(y - platY) < tolerance) {
                    return i;
                }
            }
        }
        return -1;
    }

    /**
     * Draw all girders (called each frame from scene update for slope rendering)
     */
    draw(graphics) {
        const cfg = DK_CONFIG;
        const THICKNESS = 8;

        cfg.PLATFORMS.forEach((pDef) => {
            const width = pDef.x2 - pDef.x1;
            const SEGMENTS = 40;
            const segW = width / SEGMENTS;

            for (let i = 0; i < SEGMENTS; i++) {
                const x = pDef.x1 + i * segW;
                const y = pDef.y + pDef.slope * (i * segW);

                // Main girder
                graphics.fillStyle(cfg.COLOR_GIRDER, 1);
                graphics.fillRect(x, y - THICKNESS, segW + 1, THICKNESS);

                // Blue edge
                graphics.fillStyle(cfg.COLOR_GIRDER_EDGE, 1);
                graphics.fillRect(x, y - THICKNESS, segW + 1, 2);

                // Rivet pattern every other segment
                if (i % 4 === 0) {
                    graphics.fillStyle(cfg.COLOR_GIRDER_EDGE, 1);
                    graphics.fillCircle(x + segW / 2, y - THICKNESS / 2, 2);
                }
            }
        });
    }
}
