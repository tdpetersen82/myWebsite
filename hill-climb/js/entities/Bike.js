class Bike {
    constructor(scene, x, y) {
        this.scene = scene;
        this.crashed = false;
        this.airborne = false;
        this.airTime = 0;
        this.cumulativeRotation = 0;
        this.lastAngle = 0;
        this.flips = 0;
        this.wheelieTime = 0;
        this.isWheelie = false;
        this.rearGrounded = false;
        this.frontGrounded = false;
        this.leanState = 0;
        this.groundedCount = 0;

        const Matter = Phaser.Physics.Matter.Matter;

        this.createBodies(x, y, Matter);
        this.createSprites();
        this.setupCollisions();
    }

    createBodies(x, y, Matter) {
        const C = CONFIG;
        const collisionFilter = { category: 0x0002, mask: 0x0001 };

        // Chassis — the main body
        this.chassis = Matter.Bodies.rectangle(x, y, C.CHASSIS_WIDTH, C.CHASSIS_HEIGHT, {
            label: 'bike_chassis',
            mass: C.CHASSIS_MASS,
            friction: 0.3,
            frictionAir: 0.02,
            restitution: 0.1,
            collisionFilter: collisionFilter,
        });

        // Rear wheel — driven wheel
        const rearX = x + C.REAR_AXLE_OFFSET_X;
        const rearY = y + C.REAR_AXLE_OFFSET_Y;
        this.rearWheel = Matter.Bodies.circle(rearX, rearY, C.WHEEL_RADIUS, {
            label: 'bike_rear_wheel',
            mass: C.WHEEL_MASS,
            friction: 0.95,
            frictionStatic: 0.8,
            frictionAir: 0.005,
            restitution: 0.1,
            collisionFilter: collisionFilter,
        });

        // Front wheel
        const frontX = x + C.FRONT_AXLE_OFFSET_X;
        const frontY = y + C.FRONT_AXLE_OFFSET_Y;
        this.frontWheel = Matter.Bodies.circle(frontX, frontY, C.WHEEL_RADIUS, {
            label: 'bike_front_wheel',
            mass: C.WHEEL_MASS,
            friction: 0.8,
            frictionStatic: 0.6,
            frictionAir: 0.005,
            restitution: 0.15,
            collisionFilter: collisionFilter,
        });

        // Suspension constraints — connect chassis to wheels
        this.rearAxle = Matter.Constraint.create({
            bodyA: this.chassis,
            pointA: { x: C.REAR_AXLE_OFFSET_X, y: C.REAR_AXLE_OFFSET_Y },
            bodyB: this.rearWheel,
            pointB: { x: 0, y: 0 },
            length: C.SUSPENSION_LENGTH,
            stiffness: C.SUSPENSION_STIFFNESS,
            damping: C.SUSPENSION_DAMPING,
        });

        this.frontAxle = Matter.Constraint.create({
            bodyA: this.chassis,
            pointA: { x: C.FRONT_AXLE_OFFSET_X, y: C.FRONT_AXLE_OFFSET_Y },
            bodyB: this.frontWheel,
            pointB: { x: 0, y: 0 },
            length: C.SUSPENSION_LENGTH,
            stiffness: C.SUSPENSION_STIFFNESS,
            damping: C.SUSPENSION_DAMPING,
        });

        // Add everything to the world
        const world = this.scene.matter.world;
        world.add(this.chassis);
        world.add(this.rearWheel);
        world.add(this.frontWheel);
        world.add(this.rearAxle);
        world.add(this.frontAxle);

        // Alias for backward compat with GameScene position reads
        this.gameObj = this.chassis;
    }

    createSprites() {
        this.bikeSprite = this.scene.add.image(0, 0, 'bike', 'bike_neutral');
        this.bikeSprite.setDepth(10);

        this.rearWheelSprite = this.scene.add.image(0, 0, 'bike', 'wheel_0');
        this.rearWheelSprite.setDepth(9);
        this.frontWheelSprite = this.scene.add.image(0, 0, 'bike', 'wheel_0');
        this.frontWheelSprite.setDepth(9);
    }

    setupCollisions() {
        this.scene.matter.world.on('collisionstart', (event) => {
            event.pairs.forEach(pair => {
                if (this.isBikePair(pair) && this.isTerrainPair(pair)) {
                    this.groundedCount++;
                }
            });
        });

        this.scene.matter.world.on('collisionend', (event) => {
            event.pairs.forEach(pair => {
                if (this.isBikePair(pair) && this.isTerrainPair(pair)) {
                    this.groundedCount = Math.max(0, this.groundedCount - 1);
                }
            });
        });
    }

    isBikePair(pair) {
        const bodies = [this.chassis, this.rearWheel, this.frontWheel];
        return bodies.includes(pair.bodyA) || bodies.includes(pair.bodyB) ||
               bodies.includes(pair.bodyA.parent) || bodies.includes(pair.bodyB.parent);
    }

    isTerrainPair(pair) {
        return pair.bodyA.label === 'terrain' || pair.bodyB.label === 'terrain';
    }

    crash() {
        if (this.crashed) return;
        this.crashed = true;
        this.scene.audioManager.stopEngine();
        this.scene.audioManager.play('crash');
        this.scene.onCrash();
    }

    applyGas(delta) {
        if (this.crashed) return;
        const Matter = Phaser.Physics.Matter.Matter;
        const wheel = this.rearWheel;
        const currentAV = wheel.angularVelocity;

        // Apply torque to rear wheel
        if (currentAV < CONFIG.MAX_WHEEL_ANGULAR_VEL) {
            Matter.Body.setAngularVelocity(wheel, currentAV + CONFIG.GAS_TORQUE);
        }

        // Also apply a body-relative forward force to help climb hills
        // This simulates the chain drive pushing the whole bike forward
        const angle = this.chassis.angle;
        const forceMag = 0.006;
        Matter.Body.applyForce(this.chassis, this.chassis.position, {
            x: Math.cos(angle) * forceMag,
            y: Math.sin(angle) * forceMag,
        });

        // Speed limit on chassis
        const vel = this.chassis.velocity;
        const speed = Math.sqrt(vel.x * vel.x + vel.y * vel.y);
        if (speed > CONFIG.MAX_SPEED) {
            const scale = CONFIG.MAX_SPEED / speed;
            Matter.Body.setVelocity(this.chassis, { x: vel.x * scale, y: vel.y * scale });
        }
    }

    applyBrake() {
        if (this.crashed) return;
        const Matter = Phaser.Physics.Matter.Matter;

        // Slow wheel rotation
        Matter.Body.setAngularVelocity(this.rearWheel, this.rearWheel.angularVelocity * CONFIG.BRAKE_FACTOR);
        Matter.Body.setAngularVelocity(this.frontWheel, this.frontWheel.angularVelocity * CONFIG.BRAKE_FACTOR);

        // Slow chassis
        const vel = this.chassis.velocity;
        Matter.Body.setVelocity(this.chassis, { x: vel.x * 0.95, y: vel.y });
    }

    applyLean(direction) {
        if (this.crashed) return;
        const Matter = Phaser.Physics.Matter.Matter;
        Matter.Body.setAngularVelocity(this.chassis,
            this.chassis.angularVelocity + direction * CONFIG.LEAN_FORCE * 3);
        this.leanState = direction;
    }

    update(delta) {
        if (this.crashed) return;
        if (!this.chassis || Number.isNaN(this.chassis.position.x)) return;

        const wasAirborne = this.airborne;
        this.airborne = this.groundedCount === 0;
        this.rearGrounded = this.groundedCount > 0;
        this.frontGrounded = this.groundedCount > 0;

        // Track air time
        if (this.airborne) {
            this.airTime += delta / 1000;
        } else {
            if (wasAirborne && this.airTime > 0.3) {
                this.scene.audioManager.play('land');
                this.scene.onLand(this.airTime);
            }
            this.airTime = 0;
        }

        // Track rotation for flips
        const currentAngle = this.chassis.angle;
        let angleDelta = currentAngle - this.lastAngle;
        if (angleDelta > Math.PI) angleDelta -= Math.PI * 2;
        if (angleDelta < -Math.PI) angleDelta += Math.PI * 2;

        if (this.airborne) {
            this.cumulativeRotation += angleDelta;
            const fullRotations = Math.floor(Math.abs(this.cumulativeRotation) / (Math.PI * 2));
            if (fullRotations > this.flips) {
                this.flips = fullRotations;
                this.scene.onFlip();
            }
        } else {
            this.cumulativeRotation = 0;
        }
        this.lastAngle = currentAngle;

        // Wheelie detection — front wheel up when angle is negative (leaning back)
        const absAngle = Math.abs(currentAngle);
        this.isWheelie = !this.airborne && this.groundedCount > 0 && absAngle > 0.25 && absAngle < 1.2;
        if (this.isWheelie) {
            this.wheelieTime += delta / 1000;
        } else {
            if (this.wheelieTime > 0.5) {
                this.scene.onWheelieEnd(this.wheelieTime);
            }
            this.wheelieTime = 0;
        }

        // Crash check: too tilted while on ground
        if (!this.airborne && (normAngle > CONFIG.CRASH_ANGLE_THRESHOLD &&
            normAngle < (Math.PI * 2 - CONFIG.CRASH_ANGLE_THRESHOLD))) {
            this.crash();
        }

        // Gentle angular damping when grounded and no lean input
        if (!this.scene.cursors) return;
        const noLeanInput = !this.scene.cursors.left.isDown && !this.scene.cursors.right.isDown &&
            !this.scene.keyA.isDown && !this.scene.keyD.isDown;
        if (noLeanInput) {
            this.leanState = 0;
            if (!this.airborne) {
                const Matter = Phaser.Physics.Matter.Matter;
                const av = this.chassis.angularVelocity;
                Matter.Body.setAngularVelocity(this.chassis, av * 0.92);
            }
        }

        this.updateSprites();
    }

    updateSprites() {
        const chassisPos = this.chassis.position;
        const chassisAngle = this.chassis.angle;

        // Bike body — offset up from chassis center
        this.bikeSprite.setPosition(chassisPos.x, chassisPos.y - 14);
        this.bikeSprite.setRotation(chassisAngle);

        if (this.leanState < 0) this.bikeSprite.setFrame('bike_lean_back');
        else if (this.leanState > 0) this.bikeSprite.setFrame('bike_lean_forward');
        else this.bikeSprite.setFrame('bike_neutral');

        // Wheels — use actual physics body positions
        this.rearWheelSprite.setPosition(this.rearWheel.position.x, this.rearWheel.position.y);
        this.rearWheelSprite.setRotation(this.rearWheel.angle);

        this.frontWheelSprite.setPosition(this.frontWheel.position.x, this.frontWheel.position.y);
        this.frontWheelSprite.setRotation(this.frontWheel.angle);
    }

    getPosition() {
        return this.chassis.position;
    }

    getVelocity() {
        return this.chassis.velocity;
    }

    getSpeed() {
        const v = this.chassis.velocity;
        return Math.sqrt(v.x * v.x + v.y * v.y);
    }

    destroy() {
        const world = this.scene.matter.world;
        world.remove(this.rearAxle);
        world.remove(this.frontAxle);
        world.remove(this.chassis);
        world.remove(this.rearWheel);
        world.remove(this.frontWheel);
        this.bikeSprite.destroy();
        this.rearWheelSprite.destroy();
        this.frontWheelSprite.destroy();
    }
}
