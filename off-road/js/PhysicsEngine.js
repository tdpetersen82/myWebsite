class PhysicsEngine {
    constructor(trackRenderer) {
        this.track = trackRenderer;
        this.vehicles = [];
        this.projectiles = [];
        this.oilSlicks = [];
        this.frame = 0;
    }

    addVehicle(id, startPos) {
        const v = {
            id: id,
            x: startPos.x,
            y: startPos.y,
            angle: startPos.angle || 0,
            speed: 0,
            angularVel: 0,
            steerAngle: 0,
            nitro: CONFIG.PHYSICS.NITRO_MAX,
            shield: 0,
            spinout: 0,
            speedBoost: 0,
            jump: 0,
            jumpHeight: 0,
            lap: 0,
            checkpoint: 0,
            finished: false,
            finishTime: 0,
            topSpeed: 0,
            bestLap: Infinity,
            lapStartTime: 0,
            totalTime: 0,
            input: { steer: 0, gas: false, brake: false, nitro: false, drift: false },
            powerUp: null,   // held power-up type
        };
        this.vehicles.push(v);
        return v;
    }

    getVehicle(id) {
        return this.vehicles.find(v => v.id === id);
    }

    setInput(vehicleId, input) {
        const v = this.getVehicle(vehicleId);
        if (v) v.input = input;
    }

    step(dt, raceTime) {
        if (!dt) dt = CONFIG.PHYSICS.TIMESTEP;
        this.frame++;

        for (let i = 0; i < this.vehicles.length; i++) {
            if (this.vehicles[i].finished) continue;
            this._stepVehicle(this.vehicles[i], dt);
        }

        // Vehicle-vehicle collisions
        for (let i = 0; i < this.vehicles.length; i++) {
            for (let j = i + 1; j < this.vehicles.length; j++) {
                this._resolveVehicleCollision(this.vehicles[i], this.vehicles[j]);
            }
        }

        // Update projectiles
        this._updateProjectiles(dt);

        // Update oil slicks
        this._updateOilSlicks(dt);

        // Check oil slick collisions
        this._checkOilSlickCollisions();
    }

    _stepVehicle(v, dt) {
        const P = CONFIG.PHYSICS;
        const input = v.input;

        // Spinout state - no control
        if (v.spinout > 0) {
            v.spinout -= dt;
            v.angle += P.SPINOUT_SPIN_RATE * dt;
            v.speed *= 0.96;
            if (v.spinout <= 0) v.spinout = 0;
            v.x += Math.cos(v.angle) * v.speed * dt;
            v.y += Math.sin(v.angle) * v.speed * dt;
            this._clampToTrack(v);
            return;
        }

        // Jump state - reduced control
        if (v.jump > 0) {
            v.jump -= dt;
            // Parabolic height curve
            const jumpProgress = 1 - (v.jump / P.JUMP_DURATION);
            v.jumpHeight = Math.sin(jumpProgress * Math.PI) * 30;
            if (v.jump <= 0) {
                v.jump = 0;
                v.jumpHeight = 0;
                v.speed *= P.JUMP_SPEED_BOOST;
            }
        }

        // Get terrain at vehicle position
        const terrain = this.track ? this.track.getTerrainAt(v.x, v.y) : CONFIG.TERRAIN.DIRT;
        let traction = terrain.traction;
        let friction = terrain.friction;

        // Check for ramp
        if (terrain.name === 'ramp' && v.jump <= 0 && v.speed > P.MAX_SPEED * 0.3) {
            v.jump = P.JUMP_DURATION;
            v.jumpHeight = 0;
        }

        // Drift modifier
        const isDrifting = input.drift && Math.abs(v.speed) > P.MAX_SPEED * P.DRIFT_MIN_SPEED_RATIO;
        if (isDrifting) {
            traction *= P.DRIFT_TRACTION_MULT;
        }

        // Steering
        const targetSteer = input.steer || 0;
        v.steerAngle += (targetSteer - v.steerAngle) * Math.min(1, P.STEER_SMOOTHING * dt);

        const speedRatio = Math.abs(v.speed) / P.MAX_SPEED;
        const turnMult = isDrifting ? P.DRIFT_TURN_MULT : 1.0;
        // Turning effectiveness scales with speed (need some speed to turn)
        const speedTurnFactor = Math.min(1, speedRatio * 3);
        v.angularVel = v.steerAngle * P.TURN_RATE * speedTurnFactor * traction * turnMult;
        v.angle += v.angularVel * dt;

        // Acceleration / braking
        let maxSpeed = P.MAX_SPEED;

        // Speed boost power-up
        if (v.speedBoost > 0) {
            maxSpeed *= 1.5;
            v.speedBoost -= dt;
            if (v.speedBoost <= 0) v.speedBoost = 0;
        }

        // Off-track penalty
        if (this.track && !this.track.isOnTrack(v.x, v.y)) {
            maxSpeed *= P.OFF_TRACK_SPEED_CAP;
            friction = CONFIG.TERRAIN.GRASS.friction;
            traction = CONFIG.TERRAIN.GRASS.traction;
        }

        // Nitro
        let accelMult = 1;
        if (input.nitro && v.nitro > 0 && v.speed > 0) {
            accelMult = P.NITRO_MULT;
            v.nitro -= P.NITRO_DRAIN * dt;
            maxSpeed *= 1.3;
            if (v.nitro < 0) v.nitro = 0;
        } else {
            // Passive recharge
            v.nitro = Math.min(P.NITRO_MAX, v.nitro + P.NITRO_RECHARGE * dt);
        }

        if (input.gas) {
            v.speed += P.ACCELERATION * accelMult * traction * dt;
        } else if (input.brake) {
            if (v.speed > 0) {
                v.speed -= P.BRAKE_DECEL * dt;
                if (v.speed < 0) v.speed = 0;
            } else {
                v.speed -= P.ACCELERATION * 0.4 * dt;
            }
        }

        // Apply friction
        v.speed *= Math.pow(friction, dt * 60);

        // Clamp speed
        v.speed = Math.max(P.REVERSE_MAX, Math.min(maxSpeed, v.speed));

        // Track top speed
        if (Math.abs(v.speed) > v.topSpeed) v.topSpeed = Math.abs(v.speed);

        // Move
        v.x += Math.cos(v.angle) * v.speed * dt;
        v.y += Math.sin(v.angle) * v.speed * dt;

        // Track boundary collision
        this._clampToTrack(v);

        // Checkpoint / lap detection
        this._checkCheckpoints(v);
    }

    _clampToTrack(v) {
        if (!this.track) return;

        const boundary = this.track.getTrackBoundary();
        if (!boundary) return;

        // Simple world bounds clamping
        const margin = 30;
        const worldW = this.track.worldWidth || CONFIG.WIDTH;
        const worldH = this.track.worldHeight || CONFIG.HEIGHT;

        if (v.x < margin) { v.x = margin; v.speed *= (1 - CONFIG.PHYSICS.WALL_SPEED_LOSS); this._wallBounce(v); }
        if (v.x > worldW - margin) { v.x = worldW - margin; v.speed *= (1 - CONFIG.PHYSICS.WALL_SPEED_LOSS); this._wallBounce(v); }
        if (v.y < margin) { v.y = margin; v.speed *= (1 - CONFIG.PHYSICS.WALL_SPEED_LOSS); this._wallBounce(v); }
        if (v.y > worldH - margin) { v.y = worldH - margin; v.speed *= (1 - CONFIG.PHYSICS.WALL_SPEED_LOSS); this._wallBounce(v); }

        // Track edge collision using edge segments
        if (this.track.edgeSegments) {
            const hw = CONFIG.PHYSICS.VEHICLE_WIDTH / 2;
            for (const seg of this.track.edgeSegments) {
                const dist = this._pointToSegmentDist(v.x, v.y, seg.x1, seg.y1, seg.x2, seg.y2);
                if (dist < hw) {
                    // Push out
                    const nx = seg.ny || 0;
                    const ny = -seg.nx || 0;
                    const overlap = hw - dist;
                    v.x += nx * overlap;
                    v.y += ny * overlap;
                    v.speed *= (1 - CONFIG.PHYSICS.WALL_SPEED_LOSS);
                    v._wallHit = true;
                }
            }
        }
    }

    _wallBounce(v) {
        v._wallHit = true;
    }

    _pointToSegmentDist(px, py, x1, y1, x2, y2) {
        const dx = x2 - x1;
        const dy = y2 - y1;
        const lenSq = dx * dx + dy * dy;
        if (lenSq === 0) return Math.hypot(px - x1, py - y1);
        let t = ((px - x1) * dx + (py - y1) * dy) / lenSq;
        t = Math.max(0, Math.min(1, t));
        const cx = x1 + t * dx;
        const cy = y1 + t * dy;
        return Math.hypot(px - cx, py - cy);
    }

    _resolveVehicleCollision(a, b) {
        // Skip if either is jumping
        if (a.jump > 0 || b.jump > 0) return;

        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dist = Math.hypot(dx, dy);
        const minDist = CONFIG.PHYSICS.VEHICLE_LENGTH * 0.8;

        if (dist < minDist && dist > 0) {
            const nx = dx / dist;
            const ny = dy / dist;

            // Push apart
            const overlap = minDist - dist;
            a.x -= nx * overlap * 0.5;
            a.y -= ny * overlap * 0.5;
            b.x += nx * overlap * 0.5;
            b.y += ny * overlap * 0.5;

            // Elastic collision on velocity along collision normal
            const e = CONFIG.PHYSICS.VEHICLE_COLLISION_ELASTICITY;
            const aSpeedN = Math.cos(a.angle) * a.speed * nx + Math.sin(a.angle) * a.speed * ny;
            const bSpeedN = Math.cos(b.angle) * b.speed * nx + Math.sin(b.angle) * b.speed * ny;

            // Only resolve if approaching
            if (aSpeedN - bSpeedN > 0) {
                const impulse = (aSpeedN - bSpeedN) * e;
                a.speed -= impulse * 0.5;
                b.speed += impulse * 0.5;
            }

            // Shield check
            if (a.shield > 0) { b.speed *= 0.5; }
            if (b.shield > 0) { a.speed *= 0.5; }

            a._vehicleHit = true;
            b._vehicleHit = true;
        }
    }

    _checkCheckpoints(v) {
        if (!this.track) return;
        const trackData = this.track.trackData;
        if (!trackData || !trackData.checkpoints) return;

        const cps = trackData.checkpoints;
        const nextCp = (v.checkpoint + 1) % cps.length;
        const cp = cps[nextCp];
        const dist = Math.hypot(v.x - cp.x, v.y - cp.y);

        if (dist < CONFIG.PHYSICS.CHECKPOINT_RADIUS) {
            if (nextCp === 0 && v.checkpoint === cps.length - 1) {
                // Crossed finish line - new lap
                v.lap++;
                const now = performance.now();
                if (v.lapStartTime > 0) {
                    const lapTime = (now - v.lapStartTime) / 1000;
                    if (lapTime < v.bestLap) v.bestLap = lapTime;
                }
                v.lapStartTime = now;
                v._lapComplete = true;

                if (v.lap >= (trackData.laps || CONFIG.RACE.DEFAULT_LAPS)) {
                    v.finished = true;
                    v.finishTime = now;
                    v._raceFinish = true;
                }
            }
            v.checkpoint = nextCp;
        }
    }

    // === Projectiles ===

    fireMissile(fromVehicle) {
        const missile = {
            x: fromVehicle.x,
            y: fromVehicle.y,
            angle: fromVehicle.angle,
            speed: CONFIG.MISSILE_SPEED,
            ownerId: fromVehicle.id,
            distTraveled: 0,
            id: 'missile_' + this.frame + '_' + fromVehicle.id,
        };

        // Find nearest vehicle ahead to home in on
        let bestDist = Infinity;
        let target = null;
        for (const other of this.vehicles) {
            if (other.id === fromVehicle.id || other.finished) continue;
            const dx = other.x - fromVehicle.x;
            const dy = other.y - fromVehicle.y;
            // Check if roughly ahead
            const dot = Math.cos(fromVehicle.angle) * dx + Math.sin(fromVehicle.angle) * dy;
            if (dot > 0) {
                const d = Math.hypot(dx, dy);
                if (d < bestDist) {
                    bestDist = d;
                    target = other;
                }
            }
        }
        missile.targetId = target ? target.id : null;
        this.projectiles.push(missile);
        return missile;
    }

    dropOilSlick(fromVehicle) {
        const slick = {
            x: fromVehicle.x - Math.cos(fromVehicle.angle) * 30,
            y: fromVehicle.y - Math.sin(fromVehicle.angle) * 30,
            radius: CONFIG.OIL_SLICK_RADIUS,
            ownerId: fromVehicle.id,
            timer: CONFIG.OIL_SLICK_DURATION,
            id: 'oil_' + this.frame + '_' + fromVehicle.id,
        };
        this.oilSlicks.push(slick);
        return slick;
    }

    _updateProjectiles(dt) {
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const m = this.projectiles[i];

            // Homing toward target
            if (m.targetId) {
                const target = this.getVehicle(m.targetId);
                if (target && !target.finished) {
                    const dx = target.x - m.x;
                    const dy = target.y - m.y;
                    const targetAngle = Math.atan2(dy, dx);
                    let diff = targetAngle - m.angle;
                    while (diff > Math.PI) diff -= Math.PI * 2;
                    while (diff < -Math.PI) diff += Math.PI * 2;
                    m.angle += Math.sign(diff) * Math.min(Math.abs(diff), CONFIG.MISSILE_TURN_RATE * dt);
                }
            }

            m.x += Math.cos(m.angle) * m.speed * dt;
            m.y += Math.sin(m.angle) * m.speed * dt;
            m.distTraveled += m.speed * dt;

            // Check hit
            let hit = false;
            for (const v of this.vehicles) {
                if (v.id === m.ownerId || v.jump > 0) continue;
                const dist = Math.hypot(v.x - m.x, v.y - m.y);
                if (dist < CONFIG.PHYSICS.VEHICLE_LENGTH * 0.6) {
                    if (v.shield > 0) {
                        v.shield = 0; // Shield absorbs hit
                    } else {
                        v.spinout = CONFIG.PHYSICS.SPINOUT_DURATION;
                        v.speed *= 0.3;
                    }
                    v._missileHit = true;
                    hit = true;
                    break;
                }
            }

            if (hit || m.distTraveled > CONFIG.MISSILE_MAX_DIST) {
                m._exploded = true;
                this.projectiles.splice(i, 1);
            }
        }
    }

    _updateOilSlicks(dt) {
        for (let i = this.oilSlicks.length - 1; i >= 0; i--) {
            this.oilSlicks[i].timer -= dt;
            if (this.oilSlicks[i].timer <= 0) {
                this.oilSlicks.splice(i, 1);
            }
        }
    }

    _checkOilSlickCollisions() {
        for (const slick of this.oilSlicks) {
            for (const v of this.vehicles) {
                if (v.id === slick.ownerId || v.spinout > 0 || v.jump > 0) continue;
                const dist = Math.hypot(v.x - slick.x, v.y - slick.y);
                if (dist < slick.radius + CONFIG.PHYSICS.VEHICLE_WIDTH * 0.4) {
                    if (v.shield > 0) {
                        v.shield = 0;
                    } else {
                        v.spinout = CONFIG.PHYSICS.SPINOUT_DURATION;
                    }
                    v._oilHit = true;
                }
            }
        }
    }

    // Serialize state for network
    serializeState() {
        return {
            frame: this.frame,
            timestamp: performance.now(),
            vehicles: this.vehicles.map(v => ({
                id: v.id,
                x: Math.round(v.x * 10) / 10,
                y: Math.round(v.y * 10) / 10,
                angle: Math.round(v.angle * 1000) / 1000,
                speed: Math.round(v.speed),
                steerAngle: Math.round(v.steerAngle * 100) / 100,
                nitro: Math.round(v.nitro),
                shield: v.shield > 0 ? 1 : 0,
                spinout: v.spinout > 0 ? 1 : 0,
                speedBoost: v.speedBoost > 0 ? 1 : 0,
                jump: v.jump > 0 ? 1 : 0,
                lap: v.lap,
                checkpoint: v.checkpoint,
                finished: v.finished,
                powerUp: v.powerUp,
            })),
            projectiles: this.projectiles.map(p => ({
                id: p.id, x: Math.round(p.x), y: Math.round(p.y),
                angle: Math.round(p.angle * 100) / 100,
            })),
            oilSlicks: this.oilSlicks.map(s => ({
                id: s.id, x: Math.round(s.x), y: Math.round(s.y),
                timer: Math.round(s.timer * 10) / 10,
            })),
        };
    }

    // Apply authoritative state from host
    applyState(state) {
        this.frame = state.frame;
        for (const vs of state.vehicles) {
            let v = this.getVehicle(vs.id);
            if (!v) {
                v = this.addVehicle(vs.id, { x: vs.x, y: vs.y, angle: vs.angle });
            }
            v.x = vs.x;
            v.y = vs.y;
            v.angle = vs.angle;
            v.speed = vs.speed;
            v.steerAngle = vs.steerAngle;
            v.nitro = vs.nitro;
            v.shield = vs.shield;
            v.spinout = vs.spinout;
            v.speedBoost = vs.speedBoost;
            v.jump = vs.jump;
            v.lap = vs.lap;
            v.checkpoint = vs.checkpoint;
            v.finished = vs.finished;
            v.powerUp = vs.powerUp;
        }
    }

    // Get race positions sorted by progress
    getRacePositions() {
        return [...this.vehicles].sort((a, b) => {
            if (a.finished && !b.finished) return -1;
            if (!a.finished && b.finished) return 1;
            if (a.finished && b.finished) return a.finishTime - b.finishTime;
            if (a.lap !== b.lap) return b.lap - a.lap;
            if (a.checkpoint !== b.checkpoint) return b.checkpoint - a.checkpoint;
            // Same checkpoint - who is closer to the next one?
            const trackData = this.track ? this.track.trackData : null;
            if (trackData && trackData.checkpoints) {
                const nextCp = (a.checkpoint + 1) % trackData.checkpoints.length;
                const cp = trackData.checkpoints[nextCp];
                const distA = Math.hypot(a.x - cp.x, a.y - cp.y);
                const distB = Math.hypot(b.x - cp.x, b.y - cp.y);
                return distA - distB;
            }
            return 0;
        });
    }
}
