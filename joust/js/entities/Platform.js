// ============================================================
// Joust — Platform Entity
// ============================================================

class Platform {
    constructor(scene, x, y, width) {
        this.scene = scene;
        this.x = x + width / 2; // Center x
        this.y = y;
        this.width = width;
        this.height = CONFIG.PLATFORM_HEIGHT;
        this.graphics = scene.add.graphics();
    }

    draw() {
        this.graphics.clear();

        const left = this.x - this.width / 2;
        const top = this.y - this.height / 2;

        // Platform body (stone look)
        this.graphics.fillStyle(CONFIG.PLATFORM_COLOR, 1);
        this.graphics.fillRect(left, top, this.width, this.height);

        // Top surface (lighter)
        this.graphics.fillStyle(CONFIG.PLATFORM_TOP_COLOR, 1);
        this.graphics.fillRect(left, top, this.width, 3);

        // Stone texture lines
        this.graphics.lineStyle(1, 0x6B5B45, 0.4);
        for (let bx = left + 15; bx < left + this.width; bx += 20) {
            this.graphics.lineBetween(bx, top + 3, bx, top + this.height);
        }
        // Horizontal mortar line
        this.graphics.lineBetween(left, top + this.height / 2, left + this.width, top + this.height / 2);

        // Bottom shadow
        this.graphics.fillStyle(0x000000, 0.2);
        this.graphics.fillRect(left, top + this.height - 2, this.width, 2);
    }

    destroy() {
        if (this.graphics) {
            this.graphics.destroy();
        }
    }
}
