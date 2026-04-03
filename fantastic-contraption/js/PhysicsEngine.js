// Fantastic Contraption — Physics Engine (Matter.js wrapper)
class PhysicsEngine {
    constructor() {
        this.engine = Matter.Engine.create({
            gravity: CONFIG.GRAVITY,
            positionIterations: CONFIG.POSITION_ITERATIONS,
            velocityIterations: CONFIG.VELOCITY_ITERATIONS,
            constraintIterations: CONFIG.CONSTRAINT_ITERATIONS,
            enableSleeping: true
        });
        this.world = this.engine.world;
        this.running = false;
    }

    addBody(body) {
        Matter.Composite.add(this.world, body);
    }

    removeBody(body) {
        Matter.Composite.remove(this.world, body);
    }

    addConstraint(constraint) {
        Matter.Composite.add(this.world, constraint);
    }

    removeConstraint(constraint) {
        Matter.Composite.remove(this.world, constraint);
    }

    step() {
        if (this.running) {
            // Sub-stepping: 3 smaller steps per frame for smoother, more stable physics
            const subSteps = 3;
            const dt = CONFIG.TIME_STEP / subSteps;
            for (let i = 0; i < subSteps; i++) {
                Matter.Engine.update(this.engine, dt);
            }
        }
    }

    start() {
        this.running = true;
    }

    stop() {
        this.running = false;
    }

    clear() {
        Matter.Composite.clear(this.world, false);
    }

    onCollisionStart(callback) {
        Matter.Events.on(this.engine, 'collisionStart', callback);
    }

    onCollisionEnd(callback) {
        Matter.Events.on(this.engine, 'collisionEnd', callback);
    }

    queryPoint(point) {
        const bodies = Matter.Composite.allBodies(this.world);
        return Matter.Query.point(bodies, point);
    }
}
