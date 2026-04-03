import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export class HorseLoader {
    constructor(scene) {
        this.scene = scene;
        this.mixer = null;
        this.model = null;
        this.clips = {};
        this.currentAction = null;
        this.mouthPosition = new THREE.Vector3(0, 1.5, 1.2);
        this.isEating = false;
    }

    load(onProgress) {
        return new Promise((resolve, reject) => {
            const loader = new GLTFLoader();
            loader.load(
                CONFIG.HORSE_MODEL_PATH,
                (gltf) => {
                    this.model = gltf.scene;
                    this.setupModel();
                    this.setupAnimations(gltf.animations);
                    this.scene.add(this.model);
                    this.playIdle();
                    resolve();
                },
                (progress) => {
                    if (progress.total > 0) {
                        onProgress(progress.loaded / progress.total);
                    }
                },
                reject
            );
        });
    }

    setupModel() {
        // Auto-scale to target height
        const box = new THREE.Box3().setFromObject(this.model);
        const size = box.getSize(new THREE.Vector3());
        const scale = CONFIG.HORSE_TARGET_HEIGHT / size.y;
        this.model.scale.setScalar(scale);

        // Recalculate bounds after scaling
        box.setFromObject(this.model);
        const center = box.getCenter(new THREE.Vector3());

        // Center on ground
        this.model.position.x = -center.x;
        this.model.position.y = -box.min.y;
        this.model.position.z = -center.z;

        // Enable shadows
        this.model.traverse((child) => {
            if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
            }
        });

        // Find head bone for mouth position
        this.model.traverse((child) => {
            if (child.isBone && child.name.toLowerCase().includes('head')) {
                this.headBone = child;
            }
        });

        this.updateMouthPosition();
    }

    updateMouthPosition() {
        if (this.headBone) {
            const worldPos = new THREE.Vector3();
            this.headBone.getWorldPosition(worldPos);
            // Offset forward from head
            this.mouthPosition.copy(worldPos);
            this.mouthPosition.y -= 0.1;
            this.mouthPosition.z += 0.3;
        }
    }

    setupAnimations(animations) {
        this.mixer = new THREE.AnimationMixer(this.model);

        const nameMap = {
            'Idle': 'idle',
            'Idle_2': 'idle2',
            'Idle_Headlow': 'headlow',
            'Eating': 'eat',
            'Walk': 'walk',
            'Gallop': 'gallop',
            'Attack_Headbutt': 'headbutt',
            'Attack_Kick': 'kick',
            'Jump_toIdle': 'jump',
            'Idle_HitReact1': 'react1',
            'Idle_HitReact2': 'react2',
        };

        for (const clip of animations) {
            const key = nameMap[clip.name] || clip.name.toLowerCase();
            this.clips[key] = clip;
        }
    }

    playIdle() {
        this.playClip('idle', true);
    }

    playEat(onComplete) {
        if (this.isEating) return;
        this.isEating = true;

        const eatClip = this.clips['eat'] || this.clips['headlow'];
        if (!eatClip) {
            // Fallback: just wait and call complete
            setTimeout(() => {
                this.isEating = false;
                if (onComplete) onComplete();
            }, CONFIG.EAT_DURATION * 1000);
            return;
        }

        const eatAction = this.mixer.clipAction(eatClip);
        eatAction.clampWhenFinished = true;
        eatAction.loop = THREE.LoopOnce;
        eatAction.reset();

        if (this.currentAction) {
            eatAction.crossFadeFrom(this.currentAction, CONFIG.CROSSFADE_DURATION);
        }

        eatAction.play();
        this.currentAction = eatAction;

        const onFinished = (e) => {
            if (e.action === eatAction) {
                this.mixer.removeEventListener('finished', onFinished);
                this.isEating = false;
                this.playIdle();
                if (onComplete) onComplete();
            }
        };
        this.mixer.addEventListener('finished', onFinished);
    }

    playReaction() {
        // Play a small happy reaction after eating
        const reactClip = this.clips['react1'] || this.clips['idle2'];
        if (!reactClip) return;

        const action = this.mixer.clipAction(reactClip);
        action.clampWhenFinished = true;
        action.loop = THREE.LoopOnce;
        action.reset();

        if (this.currentAction) {
            action.crossFadeFrom(this.currentAction, CONFIG.CROSSFADE_DURATION);
        }

        action.play();
        this.currentAction = action;

        const onFinished = (e) => {
            if (e.action === action) {
                this.mixer.removeEventListener('finished', onFinished);
                this.playIdle();
            }
        };
        this.mixer.addEventListener('finished', onFinished);
    }

    playClip(name, loop = false) {
        const clip = this.clips[name];
        if (!clip) return;

        const action = this.mixer.clipAction(clip);
        action.loop = loop ? THREE.LoopRepeat : THREE.LoopOnce;
        action.reset();

        if (this.currentAction && this.currentAction !== action) {
            action.crossFadeFrom(this.currentAction, CONFIG.CROSSFADE_DURATION);
        }

        action.play();
        this.currentAction = action;
    }

    update(delta) {
        if (this.mixer) {
            this.mixer.update(delta);
        }
        this.updateMouthPosition();
    }
}
