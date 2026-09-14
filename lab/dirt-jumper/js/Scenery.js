// Illustrated scenery uses world-anchored parallax, independent of track generation.
class Scenery {
    constructor(scene) {
        this.g = scene.add.graphics().setScrollFactor(0).setDepth(1);
    }

    draw(cameraX) {
        const g = this.g, W = CONFIG.WIDTH, H = CONFIG.HEIGHT;
        g.clear();
        // Haze, sun and broad clouds stay distant as the trail moves underneath.
        g.fillStyle(0xffe6b6, 0.09); g.fillCircle(740, 126, 95);
        g.fillStyle(0xffe6b6, 0.15); g.fillCircle(740, 126,  62);
        g.fillStyle(0xffeed0, 0.92); g.fillCircle(740, 126, 33);
        g.fillStyle(0xf9e7c8, 0.22);
        for (let i = 0; i < 5; i++) {
            const x = ((i * 271 - cameraX * 0.015) % 1350 + 1350) % 1350 - 160;
            g.fillEllipse(x, 88 + i % 3 * 33, 180, 12);
        }
        const layers = [
            { speed: 0.055, base: 268, amp: 112, color: 0x8caaa4 },
            { speed: 0.105, base: 304, amp: 92, color: 0x678c86 },
            { speed: 0.19, base: 342, amp: 61, color: 0x416c66 }
        ];
        for (const [i, layer] of layers.entries()) {
            const height = x => layer.base - Math.abs(Math.sin((x + cameraX * layer.speed) * 0.0038 + i * 2)) * layer.amp
                + Math.sin((x + cameraX * layer.speed) * 0.011 + i) * 12;
            g.fillStyle(layer.color, 1);
            g.beginPath(); g.moveTo(-10, H);
            for (let x = -10; x <= W + 10; x += 10) g.lineTo(x, height(x));
            g.lineTo(W + 10, H); g.closePath(); g.fillPath();
            if (i === 2) {
                const spacing = 43, offset = cameraX * layer.speed;
                for (let n = Math.floor(offset / spacing) - 1; n < (offset + W) / spacing + 1; n++) {
                    const x = n * spacing - offset;
                    this.pine(x, height(x) + 4, 24 + (Math.sin(n * 7.8) + 1) * 15, 0x416c66);
                }
            }
        }
        // Closest tree silhouettes provide a stronger speed reference.
        const offset = cameraX * 0.36;
        for (let n = Math.floor(offset / 150) - 1; n < (offset + W) / 150 + 1; n++) {
            const x = n * 150 - offset;
            this.pine(x, 380 + Math.sin(n * 2.4) * 20, 62 + (Math.sin(n * 4.7) + 1) * 25, 0x315750);
        }
    }

    pine(x, y, h, color) {
        const g = this.g;
        g.fillStyle(color, 1);
        g.fillRect(x - 1.5, y - h * 0.55, 3, h * 0.6);
        for (let i = 0; i < 4; i++) {
            const top = y - h + i * h * 0.17;
            const half = h * (0.13 + i * 0.035);
            g.fillTriangle(x, top, x - half, top + h * 0.4, x + half, top + h * 0.4);
        }
    }
}
