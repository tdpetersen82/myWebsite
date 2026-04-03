import * as THREE from 'three';

export class FoodManager {
    constructor(scene) {
        this.scene = scene;
        this.activeFood = null; // currently animating food
    }

    createFoodMesh(foodType) {
        const foodDef = CONFIG.FOODS[foodType];
        const group = new THREE.Group();
        const mat = new THREE.MeshStandardMaterial({
            color: foodDef.color,
            roughness: 0.5,
            metalness: 0.1,
        });

        switch (foodType) {
            case 'apple': {
                const body = new THREE.Mesh(
                    new THREE.SphereGeometry(0.1, 12, 12),
                    mat
                );
                group.add(body);
                // Stem
                const stem = new THREE.Mesh(
                    new THREE.CylinderGeometry(0.01, 0.01, 0.05, 6),
                    new THREE.MeshStandardMaterial({ color: 0x5c3a1e })
                );
                stem.position.y = 0.1;
                group.add(stem);
                // Leaf
                const leaf = new THREE.Mesh(
                    new THREE.SphereGeometry(0.025, 6, 4),
                    new THREE.MeshStandardMaterial({ color: 0x2d8a2d })
                );
                leaf.scale.set(1, 0.3, 1);
                leaf.position.set(0.02, 0.11, 0);
                group.add(leaf);
                break;
            }
            case 'carrot': {
                const body = new THREE.Mesh(
                    new THREE.ConeGeometry(0.04, 0.2, 8),
                    mat
                );
                body.rotation.x = Math.PI;
                group.add(body);
                // Green top
                for (let i = 0; i < 3; i++) {
                    const frond = new THREE.Mesh(
                        new THREE.CylinderGeometry(0.008, 0.003, 0.08, 4),
                        new THREE.MeshStandardMaterial({ color: 0x2d8a2d })
                    );
                    frond.position.y = 0.1;
                    frond.rotation.z = (i - 1) * 0.3;
                    group.add(frond);
                }
                break;
            }
            case 'hay': {
                for (let i = 0; i < 8; i++) {
                    const strand = new THREE.Mesh(
                        new THREE.CylinderGeometry(0.006, 0.004, 0.15, 4),
                        mat
                    );
                    strand.position.set(
                        (Math.random() - 0.5) * 0.06,
                        (Math.random() - 0.5) * 0.04,
                        (Math.random() - 0.5) * 0.06
                    );
                    strand.rotation.z = (Math.random() - 0.5) * 0.5;
                    strand.rotation.x = (Math.random() - 0.5) * 0.3;
                    group.add(strand);
                }
                break;
            }
            case 'sugar': {
                const cube = new THREE.Mesh(
                    new THREE.BoxGeometry(0.08, 0.08, 0.08),
                    new THREE.MeshStandardMaterial({
                        color: 0xffffff,
                        roughness: 0.3,
                        metalness: 0.05,
                    })
                );
                group.add(cube);
                break;
            }
        }

        group.traverse((child) => {
            if (child.isMesh) child.castShadow = true;
        });

        return group;
    }

    feed(foodType, targetPos) {
        if (this.activeFood) return false;

        const mesh = this.createFoodMesh(foodType);
        const foodDef = CONFIG.FOODS[foodType];

        // Start position: off to the right side
        const startPos = new THREE.Vector3(3, 2.5, 1);

        mesh.position.copy(startPos);
        this.scene.add(mesh);

        this.activeFood = {
            mesh,
            startPos: startPos.clone(),
            targetPos: targetPos.clone(),
            elapsed: 0,
            phase: 'flight', // 'flight' -> 'shrink' -> done
            color: foodDef.color,
        };

        return true;
    }

    update(delta) {
        if (!this.activeFood) return null;

        const food = this.activeFood;
        food.elapsed += delta;

        if (food.phase === 'flight') {
            const t = Math.min(food.elapsed / CONFIG.FOOD_FLIGHT_DURATION, 1);
            const eased = this.easeOutCubic(t);

            // Bezier arc
            const mid = new THREE.Vector3().lerpVectors(food.startPos, food.targetPos, 0.5);
            mid.y += 1.0; // arc height

            const p0 = food.startPos;
            const p1 = mid;
            const p2 = food.targetPos;

            food.mesh.position.x = (1 - eased) * (1 - eased) * p0.x + 2 * (1 - eased) * eased * p1.x + eased * eased * p2.x;
            food.mesh.position.y = (1 - eased) * (1 - eased) * p0.y + 2 * (1 - eased) * eased * p1.y + eased * eased * p2.y;
            food.mesh.position.z = (1 - eased) * (1 - eased) * p0.z + 2 * (1 - eased) * eased * p1.z + eased * eased * p2.z;

            // Spin the food
            food.mesh.rotation.y += delta * 5;
            food.mesh.rotation.x += delta * 3;

            if (t >= 1) {
                food.phase = 'shrink';
                food.elapsed = 0;
                // Return signal that food arrived
                return { event: 'arrived', position: food.targetPos.clone(), color: food.color };
            }
        } else if (food.phase === 'shrink') {
            const t = Math.min(food.elapsed / CONFIG.FOOD_SHRINK_DURATION, 1);
            const scale = 1 - this.easeInCubic(t);
            food.mesh.scale.setScalar(Math.max(scale, 0.01));

            if (t >= 1) {
                this.scene.remove(food.mesh);
                this.activeFood = null;
                return { event: 'consumed' };
            }
        }

        return null;
    }

    easeOutCubic(t) {
        return 1 - Math.pow(1 - t, 3);
    }

    easeInCubic(t) {
        return t * t * t;
    }
}
