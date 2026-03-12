// ============================================================
// Donkey Kong — Hammer Power-up Entity
// ============================================================

class HammerPickup {
    constructor(scene, x, y) {
        this.scene = scene;
        this.x = x;
        this.y = y;
        this.width = 20;
        this.height = 24;
        this.active = true;
        this.flashTimer = 0;

        // Overlap zone
        this.zone = scene.add.zone(x, y, this.width, this.height);
        scene.physics.add.existing(this.zone, true);
    }

    update(dt) {
        if (!this.active) return;
        this.flashTimer += dt;
    }

    collect() {
        this.active = false;
    }

    reset() {
        this.active = true;
        this.flashTimer = 0;
    }

    draw(graphics) {
        if (!this.active) return;

        const x = this.x;
        const y = this.y;
        const cfg = DK_CONFIG;

        // Flash effect
        const flash = Math.floor(this.flashTimer * 5) % 2 === 0;

        // Handle
        graphics.fillStyle(flash ? cfg.COLOR_HAMMER : 0xaaaaaa, 1);
        graphics.fillRect(x - 3, y - 4, 6, 22);

        // Head
        graphics.fillStyle(flash ? cfg.COLOR_HAMMER_HEAD : 0xffff88, 1);
        graphics.fillRect(x - 8, y - 12, 16, 12);

        // Outline
        graphics.lineStyle(1, 0x000000, 0.5);
        graphics.strokeRect(x - 8, y - 12, 16, 12);
    }
}
