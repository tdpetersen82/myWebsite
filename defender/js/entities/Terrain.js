// defender/js/entities/Terrain.js — Scrolling mountain terrain at bottom

class Terrain {
    constructor(scene) {
        this.scene = scene;
        this.graphics = scene.add.graphics();
        this.points = [];
        this._generate();
    }

    _generate() {
        const segments = CONFIG.TERRAIN.SEGMENTS;
        const segWidth = CONFIG.WORLD_WIDTH / segments;

        // Generate mountain heights using midpoint displacement
        this.points = [];
        for (let i = 0; i <= segments; i++) {
            const x = i * segWidth;
            const baseH = CONFIG.TERRAIN.MIN_HEIGHT +
                Math.random() * (CONFIG.TERRAIN.MAX_HEIGHT - CONFIG.TERRAIN.MIN_HEIGHT);
            // Multiple octaves for natural-looking terrain
            const h = baseH +
                Math.sin(i * 0.3) * 20 +
                Math.sin(i * 0.7) * 15 +
                Math.sin(i * 1.5) * 8;
            this.points.push({
                x: x,
                y: CONFIG.GROUND_Y - Math.max(CONFIG.TERRAIN.MIN_HEIGHT, h),
            });
        }
    }

    draw(cameraX) {
        this.graphics.clear();

        // Fill terrain
        this.graphics.fillStyle(CONFIG.COLORS.TERRAIN_FILL, 1);
        this.graphics.lineStyle(1.5, CONFIG.COLORS.TERRAIN, 0.8);

        this.graphics.beginPath();

        // Start at bottom-left of screen
        this.graphics.moveTo(0, CONFIG.HEIGHT);

        const segWidth = CONFIG.WORLD_WIDTH / CONFIG.TERRAIN.SEGMENTS;

        for (let screenX = -segWidth; screenX <= CONFIG.WIDTH + segWidth; screenX += 2) {
            let worldX = screenX + cameraX - CONFIG.WIDTH / 2;
            // Wrap
            while (worldX < 0) worldX += CONFIG.WORLD_WIDTH;
            while (worldX >= CONFIG.WORLD_WIDTH) worldX -= CONFIG.WORLD_WIDTH;

            // Find which segment
            const segIndex = worldX / segWidth;
            const i = Math.floor(segIndex) % this.points.length;
            const j = (i + 1) % this.points.length;
            const t = segIndex - Math.floor(segIndex);

            // Interpolate
            const y = this.points[i].y * (1 - t) + this.points[j].y * t;
            this.graphics.lineTo(screenX, y);
        }

        // Close at bottom-right
        this.graphics.lineTo(CONFIG.WIDTH, CONFIG.HEIGHT);
        this.graphics.lineTo(0, CONFIG.HEIGHT);
        this.graphics.closePath();
        this.graphics.fillPath();

        // Draw terrain outline on top
        this.graphics.beginPath();
        let first = true;
        for (let screenX = -segWidth; screenX <= CONFIG.WIDTH + segWidth; screenX += 2) {
            let worldX = screenX + cameraX - CONFIG.WIDTH / 2;
            while (worldX < 0) worldX += CONFIG.WORLD_WIDTH;
            while (worldX >= CONFIG.WORLD_WIDTH) worldX -= CONFIG.WORLD_WIDTH;

            const segIndex = worldX / segWidth;
            const i = Math.floor(segIndex) % this.points.length;
            const j = (i + 1) % this.points.length;
            const t = segIndex - Math.floor(segIndex);
            const y = this.points[i].y * (1 - t) + this.points[j].y * t;

            if (first) {
                this.graphics.moveTo(screenX, y);
                first = false;
            } else {
                this.graphics.lineTo(screenX, y);
            }
        }
        this.graphics.strokePath();
    }

    getHeightAt(worldX) {
        while (worldX < 0) worldX += CONFIG.WORLD_WIDTH;
        while (worldX >= CONFIG.WORLD_WIDTH) worldX -= CONFIG.WORLD_WIDTH;

        const segWidth = CONFIG.WORLD_WIDTH / CONFIG.TERRAIN.SEGMENTS;
        const segIndex = worldX / segWidth;
        const i = Math.floor(segIndex) % this.points.length;
        const j = (i + 1) % this.points.length;
        const t = segIndex - Math.floor(segIndex);
        return this.points[i].y * (1 - t) + this.points[j].y * t;
    }

    destroy() {
        this.graphics.destroy();
    }
}
