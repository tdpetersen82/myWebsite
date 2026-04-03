// Fantastic Contraption — Build System
class BuildSystem {
    constructor(physics) {
        this.physics = physics;
        this.parts = [];
        this.undoStack = [];
        this.redoStack = [];
    }

    getAllEndpoints() {
        const endpoints = [];
        for (const part of this.parts) {
            for (const ep of part.endpoints) {
                endpoints.push({ part: part, endpoint: ep });
            }
        }
        return endpoints;
    }

    findSnap(pos) {
        const allEps = this.getAllEndpoints();
        let closest = null;
        let closestDist = CONFIG.SNAP_RADIUS;
        for (const item of allEps) {
            const wp = this._getEndpointWorldPos(item.part, item.endpoint);
            const dx = wp.x - pos.x;
            const dy = wp.y - pos.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < closestDist) {
                closestDist = dist;
                closest = { part: item.part, endpoint: item.endpoint, worldPos: wp };
            }
        }
        return closest;
    }

    _getEndpointWorldPos(part, endpoint) {
        const body = part.body;
        const cos = Math.cos(body.angle);
        const sin = Math.sin(body.angle);
        return {
            x: body.position.x + endpoint.localOffset.x * cos - endpoint.localOffset.y * sin,
            y: body.position.y + endpoint.localOffset.x * sin + endpoint.localOffset.y * cos
        };
    }

    placeWheel(x, y, type) {
        const snap = this.findSnap({ x, y });
        let placeX = x, placeY = y;
        if (snap) {
            placeX = snap.worldPos.x;
            placeY = snap.worldPos.y;
        }

        const part = PartFactory.createWheel(placeX, placeY, type);
        this.physics.addBody(part.body);
        this.parts.push(part);

        if (snap) {
            this._connectEndpoints(part, part.endpoints[0], snap.part, snap.endpoint);
        }

        this.undoStack.push({ action: 'place', partIndex: this.parts.length - 1 });
        this.redoStack = [];
        return part;
    }

    placeRod(x1, y1, x2, y2, isWater) {
        const snap1 = this.findSnap({ x: x1, y: y1 });
        const snap2 = this.findSnap({ x: x2, y: y2 });

        if (snap1) { x1 = snap1.worldPos.x; y1 = snap1.worldPos.y; }
        if (snap2) { x2 = snap2.worldPos.x; y2 = snap2.worldPos.y; }

        const dx = x2 - x1;
        const dy = y2 - y1;
        const length = Math.sqrt(dx * dx + dy * dy);
        if (length < CONFIG.ROD_MIN_LENGTH) return null;
        if (length > CONFIG.ROD_MAX_LENGTH) {
            const ratio = CONFIG.ROD_MAX_LENGTH / length;
            x2 = x1 + dx * ratio;
            y2 = y1 + dy * ratio;
        }

        const part = PartFactory.createRod(x1, y1, x2, y2, isWater);
        this.physics.addBody(part.body);
        this.parts.push(part);

        if (snap1) {
            this._connectEndpoints(part, part.endpoints[0], snap1.part, snap1.endpoint);
        }
        if (snap2) {
            this._connectEndpoints(part, part.endpoints[1], snap2.part, snap2.endpoint);
        }

        this.undoStack.push({ action: 'place', partIndex: this.parts.length - 1 });
        this.redoStack = [];
        return part;
    }

    _connectEndpoints(partA, epA, partB, epB) {
        const constraint = Matter.Constraint.create({
            bodyA: partA.body,
            pointA: { x: epA.localOffset.x, y: epA.localOffset.y },
            bodyB: partB.body,
            pointB: { x: epB.localOffset.x, y: epB.localOffset.y },
            length: 0,
            stiffness: CONFIG.JOINT_STIFFNESS,
            damping: CONFIG.JOINT_DAMPING,
            render: { visible: false }
        });
        this.physics.addConstraint(constraint);
        partA.constraints.push(constraint);
        partB.constraints.push(constraint);

        // Put connected parts in the same collision group (negative = never collide with each other)
        const groupId = this._getSharedGroup(partA, partB);
        partA.body.collisionFilter.group = groupId;
        partB.body.collisionFilter.group = groupId;
    }

    _getSharedGroup(partA, partB) {
        // If either already has a group, use that one so chains share the same group
        const gA = partA.body.collisionFilter.group;
        const gB = partB.body.collisionFilter.group;
        if (gA && gA < 0) {
            if (gB && gB < 0 && gB !== gA) {
                // Merge: set all parts with groupB to groupA
                for (const p of this.parts) {
                    if (p.body.collisionFilter.group === gB) {
                        p.body.collisionFilter.group = gA;
                    }
                }
            }
            return gA;
        }
        if (gB && gB < 0) return gB;
        // New group
        if (!this._nextGroup) this._nextGroup = -1;
        return this._nextGroup--;
    }

    deletePart(part) {
        const index = this.parts.indexOf(part);
        if (index === -1) return;

        // Remove all constraints involving this part
        for (const c of part.constraints) {
            this.physics.removeConstraint(c);
            // Also remove from other parts' constraint lists
            for (const other of this.parts) {
                if (other === part) continue;
                const ci = other.constraints.indexOf(c);
                if (ci !== -1) other.constraints.splice(ci, 1);
            }
        }

        this.physics.removeBody(part.body);
        this.parts.splice(index, 1);

        // Fix undo stack indices
        this.undoStack = this.undoStack.filter(cmd => {
            if (cmd.action === 'place' && cmd.partIndex === index) return false;
            if (cmd.action === 'place' && cmd.partIndex > index) cmd.partIndex--;
            return true;
        });
        this.redoStack = [];
    }

    deletePartAtPoint(point) {
        const bodies = this.physics.queryPoint(point);
        for (const body of bodies) {
            const part = this.parts.find(p => p.body === body);
            if (part) {
                this.deletePart(part);
                return part;
            }
        }
        return null;
    }

    undo() {
        if (this.undoStack.length === 0) return;
        const cmd = this.undoStack.pop();
        if (cmd.action === 'place') {
            const part = this.parts[cmd.partIndex];
            if (part) {
                // Store part data for redo
                cmd.partData = this._serializePart(part);
                this._removePart(part);
                this.redoStack.push(cmd);
            }
        }
    }

    redo() {
        if (this.redoStack.length === 0) return;
        const cmd = this.redoStack.pop();
        if (cmd.action === 'place' && cmd.partData) {
            const part = this._deserializePart(cmd.partData);
            if (part) {
                cmd.partIndex = this.parts.length - 1;
                delete cmd.partData;
                this.undoStack.push(cmd);
            }
        }
    }

    _serializePart(part) {
        return {
            type: part.type,
            buildPos: { x: part.buildPos.x, y: part.buildPos.y },
            buildAngle: part.buildAngle,
            endpoints: part.endpoints.map(ep => ({
                localOffset: { x: ep.localOffset.x, y: ep.localOffset.y },
                worldPos: { x: ep.worldPos.x, y: ep.worldPos.y }
            })),
            length: part.length || 0
        };
    }

    _deserializePart(data) {
        if (PartFactory.isWheelType(data.type)) {
            return this.placeWheel(data.buildPos.x, data.buildPos.y, data.type);
        } else if (PartFactory.isRodType(data.type)) {
            const ep0 = data.endpoints[0].worldPos;
            const ep1 = data.endpoints[1].worldPos;
            return this.placeRod(ep0.x, ep0.y, ep1.x, ep1.y, data.type === CONFIG.PART_WATER_ROD);
        }
        return null;
    }

    _removePart(part) {
        for (const c of part.constraints) {
            this.physics.removeConstraint(c);
            for (const other of this.parts) {
                if (other === part) continue;
                const ci = other.constraints.indexOf(c);
                if (ci !== -1) other.constraints.splice(ci, 1);
            }
        }
        this.physics.removeBody(part.body);
        const idx = this.parts.indexOf(part);
        if (idx !== -1) this.parts.splice(idx, 1);
    }

    clearAll() {
        while (this.parts.length > 0) {
            this._removePart(this.parts[0]);
        }
        this.undoStack = [];
        this.redoStack = [];
    }

    saveState() {
        for (const part of this.parts) {
            part.buildPos = { x: part.body.position.x, y: part.body.position.y };
            part.buildAngle = part.body.angle;
        }
    }

    startSimulation() {
        this.saveState();
        for (const part of this.parts) {
            Matter.Body.setStatic(part.body, false);
        }
    }

    stopSimulation() {
        for (const part of this.parts) {
            Matter.Body.setPosition(part.body, part.buildPos);
            Matter.Body.setAngle(part.body, part.buildAngle);
            Matter.Body.setVelocity(part.body, { x: 0, y: 0 });
            Matter.Body.setAngularVelocity(part.body, 0);
            Matter.Body.setStatic(part.body, true);
        }
    }

    applyMotors() {
        for (const part of this.parts) {
            if (part.isMotored && part.motorDir !== 0) {
                const body = part.body;
                // Wake up sleeping bodies
                if (body.isSleeping) Matter.Sleeping.set(body, false);
                const targetSpeed = part.motorDir * CONFIG.MOTOR_SPEED;
                const diff = targetSpeed - body.angularVelocity;
                // Proportional torque — stronger when far from target, eases off near it
                body.torque = diff * CONFIG.MOTOR_TORQUE;
            }
        }
    }
}
