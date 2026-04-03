import * as THREE from 'three';

export class LightingManager {
    constructor(scene) {
        // Ambient fill
        const ambient = new THREE.AmbientLight(0xffffff, 0.4);
        scene.add(ambient);

        // Directional light with shadows
        this.dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
        this.dirLight.position.set(-8, 20, 8);
        this.dirLight.castShadow = true;
        this.dirLight.shadow.mapSize.width = 2048;
        this.dirLight.shadow.mapSize.height = 2048;
        this.dirLight.shadow.camera.near = 1;
        this.dirLight.shadow.camera.far = 50;
        this.dirLight.shadow.camera.left = -15;
        this.dirLight.shadow.camera.right = 15;
        this.dirLight.shadow.camera.top = 15;
        this.dirLight.shadow.camera.bottom = -15;
        this.dirLight.shadow.radius = 3;
        scene.add(this.dirLight);
    }
}
