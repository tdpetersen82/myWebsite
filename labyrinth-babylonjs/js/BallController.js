class BallController {
    constructor(scene, physicsWorld, startPos, boardGroup) {
        this.scene = scene;
        this.physicsWorld = physicsWorld;
        this.startPos = startPos;
        this.falling = false;
        this.fallTimer = 0;

        const ballData = physicsWorld.createBall(scene, startPos.x, startPos.z, boardGroup);
        this.mesh = ballData.mesh;
        this.aggregate = ballData.aggregate;
        this.body = ballData.body;
    }

    reset() {
        this.body.disablePreStep = false;
        this.mesh.position.set(this.startPos.x, CONFIG.BALL_RADIUS + 0.1, this.startPos.z);
        this.body.setLinearVelocity(BABYLON.Vector3.Zero());
        this.body.setAngularVelocity(BABYLON.Vector3.Zero());
        this.falling = false;
        this.fallTimer = 0;
        this.mesh.scaling.set(1, 1, 1);
        this.mesh.isVisible = true;
        // Re-enable physics stepping
        setTimeout(() => { this.body.disablePreStep = true; }, 100);
    }

    startFall() {
        this.falling = true;
        this.fallTimer = 0;
        this.body.setLinearVelocity(BABYLON.Vector3.Zero());
        this.body.setAngularVelocity(BABYLON.Vector3.Zero());
        this.body.setMassProperties({ mass: 0 });
    }

    update(dt) {
        if (this.falling) {
            this.fallTimer += dt * 1000;
            const progress = Math.min(this.fallTimer / CONFIG.FALL_DURATION, 1);
            const s = 1 - progress;
            this.mesh.scaling.set(s, s, s);
            this.mesh.position.y -= dt * 3;
            return progress >= 1;
        }
        return false;
    }

    restorePhysics() {
        this.body.setMassProperties({ mass: CONFIG.BALL_MASS });
    }

    isOnGoal(goalPos) {
        const pos = this.mesh.position;
        const dx = pos.x - goalPos.x;
        const dz = pos.z - goalPos.z;
        return Math.sqrt(dx * dx + dz * dz) < CONFIG.CELL_SIZE * 0.4;
    }

    isInHole() {
        return this.physicsWorld.checkHole(this.mesh.position);
    }

    dispose() {
        this.aggregate.dispose();
        this.mesh.dispose();
    }
}
