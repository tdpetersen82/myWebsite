import * as THREE from 'three';

export class CameraManager {
    constructor(renderer) {
        const aspect = renderer.domElement.clientWidth / renderer.domElement.clientHeight;
        this.camera = new THREE.PerspectiveCamera(CONFIG.CAMERA_FOV, aspect, 0.1, 100);
        this.camera.position.set(0, CONFIG.CAMERA_HEIGHT, CONFIG.CAMERA_OFFSET_Z);
        this.camera.lookAt(0, 0, 0);
        this.renderer = renderer;

        window.addEventListener('resize', () => this.onResize());
    }

    onResize() {
        const container = this.renderer.domElement.parentElement;
        if (!container) return;
        const w = container.clientWidth;
        const h = container.clientHeight;
        this.camera.aspect = w / h;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(w, h);
    }
}
