import * as CANNON from 'cannon-es';

export class PhysicsWorld {
    constructor(boardBuilder) {
        this.world = new CANNON.World();
        this.world.gravity.set(0, -CONFIG.GRAVITY, 0);
        this.world.solver.iterations = 10;
        this.world.broadphase = new CANNON.SAPBroadphase(this.world);

        // Contact material
        const ballMaterial = new CANNON.Material('ball');
        const wallMaterial = new CANNON.Material('wall');
        this.world.addContactMaterial(new CANNON.ContactMaterial(ballMaterial, wallMaterial, {
            friction: CONFIG.BALL_FRICTION,
            restitution: CONFIG.BALL_RESTITUTION,
        }));

        this.ballMaterial = ballMaterial;
        this.wallMaterial = wallMaterial;

        // Ground plane
        const totalW = boardBuilder.level.cols * CONFIG.CELL_SIZE;
        const totalH = boardBuilder.level.rows * CONFIG.CELL_SIZE;
        const groundBody = new CANNON.Body({
            mass: 0,
            material: wallMaterial,
            shape: new CANNON.Box(new CANNON.Vec3(totalW / 2 + 1, CONFIG.BOARD_THICKNESS / 2, totalH / 2 + 1)),
            position: new CANNON.Vec3(0, -CONFIG.BOARD_THICKNESS / 2, 0),
        });
        this.world.addBody(groundBody);

        // Walls
        for (const wall of boardBuilder.getWallData()) {
            const body = new CANNON.Body({
                mass: 0,
                material: wallMaterial,
                shape: new CANNON.Box(new CANNON.Vec3(wall.w / 2, wall.h / 2, wall.d / 2)),
                position: new CANNON.Vec3(wall.x, wall.h / 2, wall.z),
            });
            this.world.addBody(body);
        }

        // Hole sensors (trigger bodies)
        this.holeBodies = [];
        for (const hole of boardBuilder.getHolePositions()) {
            const body = new CANNON.Body({
                mass: 0,
                isTrigger: true,
                shape: new CANNON.Cylinder(CONFIG.HOLE_RADIUS * 0.9, CONFIG.HOLE_RADIUS * 0.9, 0.5, 12),
                position: new CANNON.Vec3(hole.x, 0.1, hole.z),
            });
            this.world.addBody(body);
            this.holeBodies.push(body);
        }
    }

    createBall(x, z) {
        const body = new CANNON.Body({
            mass: CONFIG.BALL_MASS,
            material: this.ballMaterial,
            shape: new CANNON.Sphere(CONFIG.BALL_RADIUS),
            position: new CANNON.Vec3(x, CONFIG.BALL_RADIUS + 0.1, z),
            linearDamping: CONFIG.BALL_DAMPING,
            angularDamping: CONFIG.BALL_DAMPING,
        });
        body.ccdSpeedThreshold = 0.5;
        body.ccdIterations = 5;
        this.world.addBody(body);
        return body;
    }

    setGravity(tiltX, tiltZ) {
        const g = CONFIG.GRAVITY;
        this.world.gravity.set(
            Math.sin(tiltX) * g,
            -Math.cos(Math.max(Math.abs(tiltX), Math.abs(tiltZ))) * g,
            Math.sin(tiltZ) * g
        );
    }

    step(dt) {
        this.world.step(1 / 60, dt, 3);
    }

    checkHole(ballBody) {
        const bx = ballBody.position.x;
        const bz = ballBody.position.z;
        for (const hole of this.holeBodies) {
            const dx = bx - hole.position.x;
            const dz = bz - hole.position.z;
            const dist = Math.sqrt(dx * dx + dz * dz);
            if (dist < CONFIG.HOLE_RADIUS * 0.7) {
                return true;
            }
        }
        return false;
    }
}
