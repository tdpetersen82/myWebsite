// ============================================================
// Donkey Kong — Ladder Entity
// ============================================================

class LadderManager {
    constructor(scene) {
        this.scene = scene;
        this.ladders = [];
    }

    create() {
        const cfg = DK_CONFIG;
        const LADDER_WIDTH = 24;

        cfg.LADDERS.forEach((lDef, index) => {
            const height = lDef.yBottom - lDef.yTop;

            // Create a zone for overlap detection
            const zone = this.scene.add.zone(
                lDef.x,
                lDef.yTop + height / 2,
                LADDER_WIDTH,
                height
            );
            this.scene.physics.add.existing(zone, true); // static

            this.ladders.push({
                ...lDef,
                index,
                width: LADDER_WIDTH,
                zone,
                centerX: lDef.x,
            });
        });
    }

    /**
     * Check if a point is near any ladder (for climbing detection)
     * Returns ladder object or null
     */
    getLadderAt(x, y, tolerance = 16) {
        for (const ladder of this.ladders) {
            if (Math.abs(x - ladder.centerX) < tolerance &&
                y >= ladder.yTop - 10 && y <= ladder.yBottom + 10) {
                return ladder;
            }
        }
        return null;
    }

    /**
     * Check if a barrel position is near the top of a ladder
     */
    getLadderTopAt(x, y, tolerance = 16) {
        for (const ladder of this.ladders) {
            if (Math.abs(x - ladder.centerX) < tolerance &&
                Math.abs(y - ladder.yTop) < tolerance) {
                return ladder;
            }
        }
        return null;
    }

    /**
     * Draw all ladders
     */
    draw(graphics) {
        const cfg = DK_CONFIG;
        const LADDER_WIDTH = 24;
        const RUNG_SPACING = 16;

        this.ladders.forEach((ladder) => {
            const height = ladder.yBottom - ladder.yTop;
            const x = ladder.centerX;

            // Side rails
            graphics.fillStyle(cfg.COLOR_LADDER, 1);
            graphics.fillRect(x - LADDER_WIDTH / 2, ladder.yTop, 4, height);
            graphics.fillRect(x + LADDER_WIDTH / 2 - 4, ladder.yTop, 4, height);

            // Rungs
            const rungCount = Math.floor(height / RUNG_SPACING);
            for (let i = 0; i <= rungCount; i++) {
                const ry = ladder.yTop + i * RUNG_SPACING;
                graphics.fillRect(x - LADDER_WIDTH / 2, ry, LADDER_WIDTH, 3);
            }
        });
    }
}
