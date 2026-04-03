export class TiltController {
    constructor(canvas) {
        this.tiltX = 0; // left/right
        this.tiltZ = 0; // up/down
        this.targetTiltX = 0;
        this.targetTiltZ = 0;
        this.keys = {};
        this.active = false;
        this.canvas = canvas;
        this.usePointer = false;
        this.pointerDown = false;

        window.addEventListener('keydown', e => {
            this.keys[e.key] = true;
            if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key)) {
                e.preventDefault();
            }
        });
        window.addEventListener('keyup', e => { this.keys[e.key] = false; });

        // Touch/mouse tilt
        canvas.style.touchAction = 'none';
        canvas.addEventListener('pointerdown', e => {
            this.pointerDown = true;
            this.usePointer = true;
            this.updatePointerTilt(e);
        });
        canvas.addEventListener('pointermove', e => {
            if (this.pointerDown) this.updatePointerTilt(e);
        });
        canvas.addEventListener('pointerup', () => {
            this.pointerDown = false;
            this.targetTiltX = 0;
            this.targetTiltZ = 0;
        });
        canvas.addEventListener('pointerleave', () => {
            this.pointerDown = false;
            this.targetTiltX = 0;
            this.targetTiltZ = 0;
        });
    }

    updatePointerTilt(e) {
        const rect = this.canvas.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const dx = (e.clientX - cx) / (rect.width / 2);
        const dy = (e.clientY - cy) / (rect.height / 2);
        this.targetTiltX = Math.max(-1, Math.min(1, dx)) * CONFIG.MAX_TILT;
        this.targetTiltZ = Math.max(-1, Math.min(1, dy)) * CONFIG.MAX_TILT;
    }

    update() {
        if (!this.active) {
            this.tiltX = 0;
            this.tiltZ = 0;
            return;
        }

        // Keyboard overrides pointer
        if (this.keys['ArrowLeft'] || this.keys['a']) this.targetTiltX = -CONFIG.MAX_TILT;
        else if (this.keys['ArrowRight'] || this.keys['d']) this.targetTiltX = CONFIG.MAX_TILT;
        else if (!this.pointerDown) this.targetTiltX *= CONFIG.TILT_DECAY;

        if (this.keys['ArrowUp'] || this.keys['w']) this.targetTiltZ = -CONFIG.MAX_TILT;
        else if (this.keys['ArrowDown'] || this.keys['s']) this.targetTiltZ = CONFIG.MAX_TILT;
        else if (!this.pointerDown) this.targetTiltZ *= CONFIG.TILT_DECAY;

        this.tiltX += (this.targetTiltX - this.tiltX) * CONFIG.TILT_LERP;
        this.tiltZ += (this.targetTiltZ - this.tiltZ) * CONFIG.TILT_LERP;
    }
}
