// Fantastic Contraption — Level Manager
class LevelManager {
    constructor(physics) {
        this.physics = physics;
        this.currentLevel = null;
        this.terrainBodies = [];
        this.payloadBody = null;
        this.goalSensor = null;
        this.buildZone = null;
        this.goalZone = null;

        this.goalContactTime = 0;
        this.isPayloadInGoal = false;
        this.onLevelComplete = null;

        this._loadProgress();
    }

    _loadProgress() {
        try {
            const data = localStorage.getItem(CONFIG.LS_PROGRESS_KEY);
            this.completedLevels = data ? JSON.parse(data) : [];
        } catch {
            this.completedLevels = [];
        }
    }

    _saveProgress() {
        localStorage.setItem(CONFIG.LS_PROGRESS_KEY, JSON.stringify(this.completedLevels));
    }

    markComplete(levelId) {
        if (!this.completedLevels.includes(levelId)) {
            this.completedLevels.push(levelId);
            this._saveProgress();
        }
    }

    isComplete(levelId) {
        return this.completedLevels.includes(levelId);
    }

    loadLevel(levelDef) {
        this.unloadLevel();
        this.currentLevel = levelDef;
        this.buildZone = levelDef.buildZone;
        this.goalZone = levelDef.goalZone;

        // Create terrain
        for (const t of levelDef.terrain) {
            let body;
            if (t.type === 'rect') {
                body = Matter.Bodies.rectangle(
                    t.x + t.w / 2, t.y + t.h / 2, t.w, t.h,
                    {
                        isStatic: true,
                        friction: CONFIG.TERRAIN_FRICTION,
                        collisionFilter: {
                            category: CONFIG.CAT_TERRAIN,
                            mask: CONFIG.CAT_USER_PART | CONFIG.CAT_WATER_ROD | CONFIG.CAT_PAYLOAD
                        },
                        label: 'terrain'
                    }
                );
            } else if (t.type === 'poly') {
                const center = this._centroid(t.vertices);
                body = Matter.Bodies.fromVertices(center.x, center.y, t.vertices, {
                    isStatic: true,
                    friction: CONFIG.TERRAIN_FRICTION,
                    collisionFilter: {
                        category: CONFIG.CAT_TERRAIN,
                        mask: CONFIG.CAT_USER_PART | CONFIG.CAT_WATER_ROD | CONFIG.CAT_PAYLOAD
                    },
                    label: 'terrain'
                });
            }
            if (body) {
                this.physics.addBody(body);
                this.terrainBodies.push(body);
            }
        }

        // Create payload (dynamic first for mass/inertia, then set static)
        this.payloadBody = Matter.Bodies.circle(
            levelDef.payload.x, levelDef.payload.y, CONFIG.PAYLOAD_RADIUS,
            {
                isStatic: false,
                density: CONFIG.PAYLOAD_DENSITY,
                friction: 0.6,
                restitution: 0.05,
                frictionAir: 0.01,
                collisionFilter: {
                    category: CONFIG.CAT_PAYLOAD,
                    mask: CONFIG.CAT_TERRAIN | CONFIG.CAT_USER_PART | CONFIG.CAT_WATER_ROD | CONFIG.CAT_GOAL_ZONE
                },
                label: 'payload'
            }
        );
        Matter.Body.setStatic(this.payloadBody, true);
        this.payloadBuildPos = { x: levelDef.payload.x, y: levelDef.payload.y };
        this.physics.addBody(this.payloadBody);

        // Create goal sensor
        this.goalSensor = Matter.Bodies.rectangle(
            levelDef.goalZone.x + levelDef.goalZone.w / 2,
            levelDef.goalZone.y + levelDef.goalZone.h / 2,
            levelDef.goalZone.w,
            levelDef.goalZone.h,
            {
                isStatic: true,
                isSensor: true,
                collisionFilter: {
                    category: CONFIG.CAT_GOAL_ZONE,
                    mask: CONFIG.CAT_PAYLOAD
                },
                label: 'goal'
            }
        );
        this.physics.addBody(this.goalSensor);

        this.goalContactTime = 0;
        this.isPayloadInGoal = false;
    }

    unloadLevel() {
        for (const b of this.terrainBodies) {
            this.physics.removeBody(b);
        }
        this.terrainBodies = [];
        if (this.payloadBody) {
            this.physics.removeBody(this.payloadBody);
            this.payloadBody = null;
        }
        if (this.goalSensor) {
            this.physics.removeBody(this.goalSensor);
            this.goalSensor = null;
        }
        this.currentLevel = null;
    }

    startSimulation() {
        Matter.Body.setStatic(this.payloadBody, false);
        this.goalContactTime = 0;
        this.isPayloadInGoal = false;
    }

    stopSimulation() {
        Matter.Body.setPosition(this.payloadBody, this.payloadBuildPos);
        Matter.Body.setAngle(this.payloadBody, 0);
        Matter.Body.setVelocity(this.payloadBody, { x: 0, y: 0 });
        Matter.Body.setAngularVelocity(this.payloadBody, 0);
        Matter.Body.setStatic(this.payloadBody, true);
        this.goalContactTime = 0;
        this.isPayloadInGoal = false;
    }

    handleCollisionStart(pairs) {
        for (const pair of pairs) {
            const { bodyA, bodyB } = pair;
            if ((bodyA === this.payloadBody && bodyB === this.goalSensor) ||
                (bodyB === this.payloadBody && bodyA === this.goalSensor)) {
                this.isPayloadInGoal = true;
                this.goalContactTime = Date.now();
            }
        }
    }

    handleCollisionEnd(pairs) {
        for (const pair of pairs) {
            const { bodyA, bodyB } = pair;
            if ((bodyA === this.payloadBody && bodyB === this.goalSensor) ||
                (bodyB === this.payloadBody && bodyA === this.goalSensor)) {
                this.isPayloadInGoal = false;
                this.goalContactTime = 0;
            }
        }
    }

    checkCompletion() {
        if (this.isPayloadInGoal && this.goalContactTime > 0) {
            if (Date.now() - this.goalContactTime >= CONFIG.GOAL_DWELL_TIME) {
                return true;
            }
        }
        return false;
    }

    isInBuildZone(x, y) {
        const z = this.buildZone;
        return x >= z.x && x <= z.x + z.w && y >= z.y && y <= z.y + z.h;
    }

    _centroid(vertices) {
        let cx = 0, cy = 0;
        for (const v of vertices) {
            cx += v.x;
            cy += v.y;
        }
        return { x: cx / vertices.length, y: cy / vertices.length };
    }

    // Check if payload fell off screen
    isPayloadLost() {
        if (!this.payloadBody) return false;
        const pos = this.payloadBody.position;
        return pos.y > CONFIG.CANVAS_HEIGHT + 200 ||
               pos.x < -200 || pos.x > CONFIG.CANVAS_WIDTH + 200;
    }
}
