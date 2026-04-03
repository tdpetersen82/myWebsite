import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

export class SceneSetup {
    constructor(container) {
        this.container = container;

        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(CONFIG.BG_COLOR);
        this.scene.fog = new THREE.Fog(CONFIG.BG_COLOR, 20, 40);

        this.initRenderer();
        this.initCamera();
        this.initControls();
        this.initLights();
        this.initGround();

        window.addEventListener('resize', () => this.onResize());
    }

    initRenderer() {
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.0;
        const w = this.container.clientWidth;
        const h = this.container.clientHeight;
        this.renderer.setSize(w, h);
        this.container.appendChild(this.renderer.domElement);
    }

    initCamera() {
        const w = this.container.clientWidth;
        const h = this.container.clientHeight;
        this.camera = new THREE.PerspectiveCamera(CONFIG.CAMERA_FOV, w / h, 0.1, 100);
        this.camera.position.set(
            CONFIG.CAMERA_DISTANCE * 0.7,
            CONFIG.CAMERA_HEIGHT,
            CONFIG.CAMERA_DISTANCE * 0.7
        );
    }

    initControls() {
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.target.set(0, CONFIG.CAMERA_TARGET_Y, 0);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.08;
        this.controls.minPolarAngle = Math.PI * 0.15;
        this.controls.maxPolarAngle = Math.PI * 0.48;
        this.controls.minDistance = 3;
        this.controls.maxDistance = 12;
        this.controls.enablePan = false;
        this.controls.update();
    }

    initLights() {
        const hemiLight = new THREE.HemisphereLight(
            CONFIG.HEMISPHERE_SKY,
            CONFIG.HEMISPHERE_GROUND,
            CONFIG.AMBIENT_INTENSITY
        );
        this.scene.add(hemiLight);

        const dirLight = new THREE.DirectionalLight(0xffffff, CONFIG.DIR_LIGHT_INTENSITY);
        dirLight.position.set(...CONFIG.DIR_LIGHT_POS);
        dirLight.castShadow = true;
        dirLight.shadow.mapSize.width = 2048;
        dirLight.shadow.mapSize.height = 2048;
        dirLight.shadow.camera.near = 0.5;
        dirLight.shadow.camera.far = 30;
        dirLight.shadow.camera.left = -6;
        dirLight.shadow.camera.right = 6;
        dirLight.shadow.camera.top = 6;
        dirLight.shadow.camera.bottom = -6;
        dirLight.shadow.bias = -0.0005;
        this.scene.add(dirLight);

        const fillLight = new THREE.DirectionalLight(0xffeedd, 0.3);
        fillLight.position.set(-5, 3, -5);
        this.scene.add(fillLight);
    }

    initGround() {
        const groundGeo = new THREE.PlaneGeometry(CONFIG.GROUND_SIZE, CONFIG.GROUND_SIZE);
        const groundMat = new THREE.MeshStandardMaterial({
            color: CONFIG.GROUND_COLOR,
            roughness: 0.9,
            metalness: 0.0,
        });
        const ground = new THREE.Mesh(groundGeo, groundMat);
        ground.rotation.x = -Math.PI / 2;
        ground.receiveShadow = true;
        this.scene.add(ground);
    }

    onResize() {
        const w = this.container.clientWidth;
        const h = this.container.clientHeight;
        this.camera.aspect = w / h;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(w, h);
    }

    render() {
        this.controls.update();
        this.renderer.render(this.scene, this.camera);
    }
}
