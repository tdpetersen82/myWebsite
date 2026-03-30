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
        this.wheelRotation = 0;
        this.groundedCount = 0;

        this.createBody(x, y);
        this.createSprites();
        this.setupCollisions();
    }

    createBody(x, y) {
        const C = CONFIG;

        // Use Phaser's matter.add to create a simple game object with physics
        // Single body approach - chassis rectangle is the main physics body
        this.gameObj = this.scene.matter.add.rectangle(x, y, C.CHASSIS_WIDTH, C.CHASSIS_HEIGHT + C.WHEEL_RADIUS * 2, {
            label: 'bike',
            chamfer: { radius: C.WHEEL_RADIUS },
            mass: C.CHASSIS_MASS,
            friction: 0.6,        // Moderate - need grip for hills
            frictionStatic: 0.3,
            frictionAir: 0.015,   // Air drag limits top speed
            restitution: 0.15,
            collisionFilter: { category: 0x0002, mask: 0x0001 },
        });
        // Moderate inertia for stability
        Phaser.Physics.Matter.Matter.Body.setInertia(this.gameObj, this.gameObj.inertia * 1.5);
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
        return pair.bodyA === this.gameObj || pair.bodyB === this.gameObj ||
               pair.bodyA.parent === this.gameObj || pair.bodyB.parent === this.gameObj;
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
        // Strong horizontal force to overcome friction on hills
        // Apply at bottom of body to simulate wheel drive (creates slight forward torque)
        const body = this.gameObj;
        const forceMag = 1.5;
        const drivePoint = {
            x: body.position.x - Math.sin(body.angle) * 10,
            y: body.position.y + Math.cos(body.angle) * 10,
        };
        Phaser.Physics.Matter.Matter.Body.applyForce(body, drivePoint, {
            x: forceMag,
            y: 0,
        });
    }

    applyBrake() {
        if (this.crashed) return;
        const vel = this.gameObj.velocity;
        Phaser.Physics.Matter.Matter.Body.setVelocity(this.gameObj, {
            x: vel.x * CONFIG.BRAKE_FACTOR,
            y: vel.y,
        });
    }

    applyLean(direction) {
        if (this.crashed) return;
        this.gameObj.torque = direction * CONFIG.LEAN_FORCE * 3;
        this.leanState = direction;
    }

    update(delta) {
        if (this.crashed) return;
        if (!this.gameObj || Number.isNaN(this.gameObj.position.x)) return;

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
        const currentAngle = this.gameObj.angle;
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

        // Wheelie detection (simplified - based on angle while grounded)
        const normAngle = ((currentAngle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
        this.isWheelie = !this.airborne && (normAngle > 0.3 && normAngle < 1.0);
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

        // Gentle self-righting when grounded and no lean input
        if (!this.scene.cursors) return;
        const noLeanInput = !this.scene.cursors.left.isDown && !this.scene.cursors.right.isDown &&
            !this.scene.keyA.isDown && !this.scene.keyD.isDown;
        if (noLeanInput) {
            this.leanState = 0;
            // Subtle angular damping when on ground to prevent spin-outs
            if (!this.airborne) {
                const av = this.gameObj.angularVelocity;
                Phaser.Physics.Matter.Matter.Body.setAngularVelocity(this.gameObj, av * 0.92);
            }
        }

        this.updateSprites();
    }

    updateSprites() {
        const pos = this.gameObj.position;
        const angle = this.gameObj.angle;

        // Bike body
        this.bikeSprite.setPosition(pos.x, pos.y - 12);
        this.bikeSprite.setRotation(angle);

        if (this.leanState < 0) this.bikeSprite.setFrame('bike_lean_back');
        else if (this.leanState > 0) this.bikeSprite.setFrame('bike_lean_forward');
        else this.bikeSprite.setFrame('bike_neutral');

        // Wheel positions (visual only - offset from body center)
        const C = CONFIG;
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        const rearX = pos.x + C.REAR_AXLE_OFFSET_X * cos - (C.REAR_AXLE_OFFSET_Y + 5) * sin;
        const rearY = pos.y + C.REAR_AXLE_OFFSET_X * sin + (C.REAR_AXLE_OFFSET_Y + 5) * cos;
        this.rearWheelSprite.setPosition(rearX, rearY);

        const frontX = pos.x + C.FRONT_AXLE_OFFSET_X * cos - (C.FRONT_AXLE_OFFSET_Y + 5) * sin;
        const frontY = pos.y + C.FRONT_AXLE_OFFSET_X * sin + (C.FRONT_AXLE_OFFSET_Y + 5) * cos;
        this.frontWheelSprite.setPosition(frontX, frontY);

        // Wheel frame rotation
        const speed = Math.abs(this.gameObj.velocity.x);
        this.wheelRotation += speed * 0.15;
        const frame = Math.floor(this.wheelRotation % 4);
        this.rearWheelSprite.setFrame(`wheel_${frame}`);
        this.frontWheelSprite.setFrame(`wheel_${frame}`);
        this.rearWheelSprite.setRotation(angle + this.wheelRotation);
        this.frontWheelSprite.setRotation(angle + this.wheelRotation);
    }

    getPosition() {
        return this.gameObj.position;
    }

    getVelocity() {
        return this.gameObj.velocity;
    }

    getSpeed() {
        const v = this.gameObj.velocity;
        return Math.sqrt(v.x * v.x + v.y * v.y);
    }

    destroy() {
        this.scene.matter.world.remove(this.gameObj);
        this.bikeSprite.destroy();
        this.rearWheelSprite.destroy();
        this.frontWheelSprite.destroy();
    }
}
