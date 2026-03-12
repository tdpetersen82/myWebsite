// ============================================================
// Missile Command — Screen Effects (Shake, Flash, Slow-Mo)
// ============================================================

class ScreenEffects {
    constructor(scene) {
        this.scene = scene;
        this.shakeIntensity = 0;
        this.shakeDuration = 0;
        this.shakeTimer = 0;
        this.flashAlpha = 0;
        this.flashColor = 0xffffff;
        this.flashDuration = 0;
        this.flashTimer = 0;
        this.slowMoActive = false;
        this.slowMoTimer = 0;
        this.slowMoScale = 1;
        this.targetTimeScale = 1;
    }

    shake(intensity = 5, duration = 200) {
        this.shakeIntensity = Math.max(this.shakeIntensity, intensity);
        this.shakeDuration = Math.max(this.shakeDuration, duration);
        this.shakeTimer = 0;
    }

    flash(color = 0xffffff, duration = 150, alpha = 0.5) {
        this.flashColor = color;
        this.flashDuration = duration;
        this.flashTimer = 0;
        this.flashAlpha = alpha;
    }

    startSlowMo(duration = 3000, scale = 0.4) {
        this.slowMoActive = true;
        this.slowMoTimer = duration;
        this.slowMoScale = scale;
        this.targetTimeScale = scale;
    }

    stopSlowMo() {
        this.slowMoActive = false;
        this.targetTimeScale = 1;
    }

    update(dt) {
        // Shake
        if (this.shakeTimer < this.shakeDuration) {
            this.shakeTimer += dt * 1000;
            const progress = this.shakeTimer / this.shakeDuration;
            const currentIntensity = this.shakeIntensity * (1 - progress);
            const offsetX = (Math.random() - 0.5) * 2 * currentIntensity;
            const offsetY = (Math.random() - 0.5) * 2 * currentIntensity;
            this.scene.cameras.main.setScroll(offsetX, offsetY);
        } else {
            this.shakeIntensity = 0;
            this.shakeDuration = 0;
            this.scene.cameras.main.setScroll(0, 0);
        }

        // Flash
        if (this.flashTimer < this.flashDuration) {
            this.flashTimer += dt * 1000;
        }

        // Slow-mo
        if (this.slowMoActive) {
            this.slowMoTimer -= dt * 1000;
            if (this.slowMoTimer <= 0) {
                this.stopSlowMo();
            }
        }

        // Smooth time scale transition
        const currentScale = this.scene.time.timeScale || 1;
        if (Math.abs(currentScale - this.targetTimeScale) > 0.01) {
            const newScale = Helpers.lerp(currentScale, this.targetTimeScale, 0.1);
            this.scene.time.timeScale = newScale;
            this.scene.physics && this.scene.physics.world && (this.scene.physics.world.timeScale = 1 / newScale);
        }
    }

    drawFlash(graphics) {
        if (this.flashTimer < this.flashDuration) {
            const progress = this.flashTimer / this.flashDuration;
            const alpha = this.flashAlpha * (1 - progress);
            graphics.fillStyle(this.flashColor, alpha);
            graphics.fillRect(0, 0, CONFIG.WIDTH, CONFIG.HEIGHT);
        }
    }

    get timeScale() {
        return this.slowMoActive ? this.slowMoScale : 1;
    }
}
