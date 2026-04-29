// Lighting: dynamic 2D lighting overlay.
// Two layers:
//   - darkness: uniform dim across the canvas (NORMAL blend, low alpha)
//   - lights:   additive bright spots at light sources (ADD blend)
//
// Usage from SimScene:
//   this.lighting = new Lighting(this, level.ambient);
//   ... each frame: this.lighting.draw(this._collectLights());

class Lighting {
    constructor(scene, ambient) {
        this.scene = scene;
        this.ambient = ambient || { tint: 0x000020, alpha: 0.20 };

        // Darkness layer: a single rectangle covering the whole canvas.
        // We rebuild this once; the alpha is fixed by the level's ambient.
        this.darkness = scene.add.graphics().setDepth(18);
        this._drawDarkness();

        // Lights layer: redrawn each frame via additive blending.
        this.lights = scene.add.graphics()
            .setDepth(19)
            .setBlendMode(Phaser.BlendModes.ADD);
    }

    _drawDarkness() {
        const W = CFG.CANVAS_W, H = CFG.CANVAS_H;
        // Only darken the play area (below HUD strip).
        this.darkness.clear();
        this.darkness.fillStyle(this.ambient.tint, this.ambient.alpha);
        this.darkness.fillRect(0, CFG.HUD_HEIGHT, W, H - CFG.HUD_HEIGHT);
    }

    setAmbient(ambient) {
        this.ambient = ambient;
        this._drawDarkness();
    }

    // lights: array of { x, y, radius, color, intensity }
    draw(lights) {
        const g = this.lights;
        g.clear();
        if (!lights || lights.length === 0) return;
        for (const L of lights) {
            // Build a radial falloff via concentric circles with decreasing alpha.
            const STEPS = 7;
            for (let i = STEPS - 1; i >= 0; i--) {
                const t = i / STEPS;
                // soft quadratic falloff
                const a = (1 - t) * (1 - t) * 0.55 * (L.intensity || 1);
                const r = L.radius * (1 - t * 0.55);
                g.fillStyle(L.color, a);
                g.fillCircle(L.x, L.y, r);
            }
        }
    }

    destroy() {
        this.darkness.destroy();
        this.lights.destroy();
    }
}
