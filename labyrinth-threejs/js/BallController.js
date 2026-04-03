import * as THREE from 'three';

export class BallController {
    constructor(scene, physicsWorld, startPos) {
        this.physicsWorld = physicsWorld;
        this.startPos = startPos;
        this.falling = false;
        this.fallTimer = 0;

        // Visual
        const geo = new THREE.SphereGeometry(CONFIG.BALL_RADIUS, 32, 32);
        const mat = new THREE.MeshStandardMaterial({
            color: CONFIG.BALL_COLOR,
            metalness: 0.7,
            roughness: 0.2,
        });
        this.mesh = new THREE.Mesh(geo, mat);
        this.mesh.castShadow = true;
        scene.add(this.mesh);

        // Physics
        this.body = physicsWorld.createBall(startPos.x, startPos.z);
    }

    reset() {
        this.body.position.set(this.startPos.x, CONFIG.BALL_RADIUS + 0.1, this.startPos.z);
        this.body.velocity.set(0, 0, 0);
        this.body.angularVelocity.set(0, 0, 0);
        this.falling = false;
        this.fallTimer = 0;
        this.mesh.scale.set(1, 1, 1);
        this.mesh.visible = true;
    }

    startFall() {
        this.falling = true;
        this.fallTimer = 0;
        this.body.velocity.set(0, 0, 0);
        this.body.angularVelocity.set(0, 0, 0);
        this.body.mass = 0;
        this.body.updateMassProperties();
    }

    update(dt) {
        if (this.falling) {
            this.fallTimer += dt * 1000;
            const progress = Math.min(this.fallTimer / CONFIG.FALL_DURATION, 1);
            const s = 1 - progress;
            this.mesh.scale.set(s, s, s);
            this.mesh.position.y -= dt * 3;
            this.mesh.position.x = this.body.position.x;
            this.mesh.position.z = this.body.position.z;
            return progress >= 1; // true when fall animation complete
        }

        // Sync mesh to physics
        this.mesh.position.copy(this.body.position);
        this.mesh.quaternion.copy(this.body.quaternion);
        return false;
    }

    restorePhysics() {
        this.body.mass = CONFIG.BALL_MASS;
        this.body.updateMassProperties();
    }

    isOnGoal(goalPos) {
        const dx = this.body.position.x - goalPos.x;
        const dz = this.body.position.z - goalPos.z;
        const dist = Math.sqrt(dx * dx + dz * dz);
        return dist < CONFIG.CELL_SIZE * 0.4;
    }

    isInHole() {
        return this.physicsWorld.checkHole(this.body);
    }
}
