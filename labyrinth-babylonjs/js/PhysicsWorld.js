class PhysicsWorld {
    constructor(scene, boardBuilder) {
        this.scene = scene;
        this.holePositions = boardBuilder.getHolePositions();

        // Ground
        const totalW = boardBuilder.level.cols * CONFIG.CELL_SIZE;
        const totalH = boardBuilder.level.rows * CONFIG.CELL_SIZE;
        const ground = BABYLON.MeshBuilder.CreateBox('ground_phys', {
            width: totalW + 2, height: CONFIG.BOARD_THICKNESS, depth: totalH + 2
        }, scene);
        ground.position.y = -CONFIG.BOARD_THICKNESS / 2;
        ground.isVisible = false;
        const groundAgg = new BABYLON.PhysicsAggregate(ground, BABYLON.PhysicsShapeType.BOX, {
            mass: 0, friction: CONFIG.BALL_FRICTION, restitution: CONFIG.BALL_RESTITUTION
        }, scene);
        ground.parent = boardBuilder.group;

        // Walls
        for (const wall of boardBuilder.getWallData()) {
            const mesh = BABYLON.MeshBuilder.CreateBox('wall_phys_' + Math.random(), {
                width: wall.w, height: wall.h, depth: wall.d
            }, scene);
            mesh.position.set(wall.x, wall.h / 2, wall.z);
            mesh.isVisible = false;
            new BABYLON.PhysicsAggregate(mesh, BABYLON.PhysicsShapeType.BOX, {
                mass: 0, friction: CONFIG.BALL_FRICTION, restitution: CONFIG.BALL_RESTITUTION
            }, scene);
            mesh.parent = boardBuilder.group;
        }
    }

    createBall(scene, x, z, boardGroup) {
        const ball = BABYLON.MeshBuilder.CreateSphere('ball', {
            diameter: CONFIG.BALL_RADIUS * 2, segments: 32
        }, scene);
        const mat = new BABYLON.StandardMaterial('ballMat', scene);
        mat.diffuseColor = new BABYLON.Color3(0.8, 0.8, 0.8);
        mat.specularColor = new BABYLON.Color3(1, 1, 1);
        mat.specularPower = 64;
        ball.material = mat;
        ball.position.set(x, CONFIG.BALL_RADIUS + 0.1, z);

        const agg = new BABYLON.PhysicsAggregate(ball, BABYLON.PhysicsShapeType.SPHERE, {
            mass: CONFIG.BALL_MASS,
            friction: CONFIG.BALL_FRICTION,
            restitution: CONFIG.BALL_RESTITUTION
        }, scene);
        agg.body.setLinearDamping(CONFIG.BALL_DAMPING);
        agg.body.setAngularDamping(CONFIG.BALL_DAMPING);

        return { mesh: ball, aggregate: agg, body: agg.body };
    }

    setGravity(tiltX, tiltZ) {
        const g = CONFIG.GRAVITY;
        const gx = Math.sin(tiltX) * g;
        const gy = -Math.cos(Math.max(Math.abs(tiltX), Math.abs(tiltZ))) * g;
        const gz = Math.sin(tiltZ) * g;
        this.scene.getPhysicsEngine().setGravity(new BABYLON.Vector3(gx, gy, gz));
    }

    checkHole(ballPos) {
        for (const hole of this.holePositions) {
            const dx = ballPos.x - hole.x;
            const dz = ballPos.z - hole.z;
            const dist = Math.sqrt(dx * dx + dz * dz);
            if (dist < CONFIG.HOLE_RADIUS * 0.7) {
                return true;
            }
        }
        return false;
    }
}
