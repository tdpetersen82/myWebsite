// Crowd orchestrator: per-tick update of all agents.
// Wires together flow field, social forces, panic, threats, marshals.

class CrowdSystem {
    constructor(grid, agents, threatSystem, marshals = []) {
        this.grid = grid;
        this.agents = agents;
        this.threat = threatSystem;
        this.marshals = marshals;
        this.flowField = new FlowField(grid);
        this.spatialHash = new SpatialHash();
        this.simTime = 0;
        this.evacuated = 0;
        this.injured = 0;
        this._neighborBuf = [];

        // Group centroid scratchpad
        this._groupCentroids = new Map();   // groupId -> {x,y,count}
    }

    rebuildFlowField() {
        this.flowField = new FlowField(this.grid);
    }

    _computeGroupCentroids() {
        this._groupCentroids.clear();
        for (const a of this.agents) {
            if (a.state === 'ESCAPED' || a.group < 0) continue;
            let g = this._groupCentroids.get(a.group);
            if (!g) { g = { x: 0, y: 0, count: 0 }; this._groupCentroids.set(a.group, g); }
            g.x += a.x; g.y += a.y; g.count++;
        }
        for (const g of this._groupCentroids.values()) {
            if (g.count > 0) { g.x /= g.count; g.y /= g.count; }
        }
    }

    _applyMarshals(agent) {
        let influenced = false;
        for (const m of this.marshals) {
            const dx = m.x - agent.x;
            const dy = m.y - agent.y;
            const d2 = dx * dx + dy * dy;
            if (d2 <= CFG.MARSHAL_RADIUS_M * CFG.MARSHAL_RADIUS_M) {
                influenced = true;
                // bias toward the flow direction sampled at the marshal's tile
                const tmp = { x: 0, y: 0 };
                this.flowField.sampleAt(m.x, m.y, tmp);
                agent.biasX = tmp.x;
                agent.biasY = tmp.y;
                agent.biasUntil = Math.max(agent.biasUntil, this.simTime + CFG.MARSHAL_PERSISTENCE_S);
            }
        }
        return influenced;
    }

    tick(dt) {
        this.simTime += dt;
        const agents = this.agents;
        const grid = this.grid;
        const threat = this.threat;

        // 1. Build spatial hash
        this.spatialHash.rebuild(agents);
        // 2. Group centroids
        this._computeGroupCentroids();

        // 3. Compute accelerations
        const desired = { x: 0, y: 0 };
        for (let i = 0; i < agents.length; i++) {
            const a = agents[i];
            if (a.state === 'ESCAPED' || a.state === 'INJURED') {
                a.ax = 0; a.ay = 0;
                continue;
            }

            // marshal influence (sets bias)
            const marshalInfluence = this._applyMarshals(a);

            // vision: shrink in smoke
            const smoke = threat.smokeAt(a.x, a.y);
            a.visionRange = Math.max(CFG.VISION_MIN_M,
                CFG.VISION_NORMAL_M * (1 - smoke * 0.9));

            // desired velocity
            SocialForce.desiredVelocity(a, this.flowField, this.simTime, desired);

            // gather neighbors within ~2m for SFM
            const nbrs = this.spatialHash.queryRadius(a.x, a.y, 2.0,
                CFG.MAX_NEIGHBOR_QUERY, this._neighborBuf);

            // local density (within 1m)
            let dens = 0;
            for (let k = 0; k < nbrs.length; k++) {
                const o = nbrs[k];
                if (o === a) continue;
                const dx = o.x - a.x;
                const dy = o.y - a.y;
                if (dx * dx + dy * dy <= 1.0) dens++;
            }

            // group cohesion
            let groupSep = 0;
            let groupCentroid = null;
            if (a.group >= 0) {
                const g = this._groupCentroids.get(a.group);
                if (g && g.count > 1) {
                    groupCentroid = g;
                    groupSep = Math.hypot(g.x - a.x, g.y - a.y);
                }
            }

            // panic update
            const threatDist = threat.distanceToFireMeters(a.x, a.y);
            PanicModel.update(a, {
                localDensity: dens,
                threatDistance: threatDist,
                groupSeparation: groupSep,
                marshalInfluence,
            }, dt);

            // accumulate forces
            const drive = SocialForce.selfDrive(a, desired, { x: 0, y: 0 });
            const repel = SocialForce.neighborRepulsion(a, nbrs);
            const wall  = SocialForce.wallRepulsion(a, grid);
            const cohes = groupCentroid
                ? SocialForce.groupCohesion(a, groupCentroid)
                : { x: 0, y: 0 };

            a.ax = drive.x + repel.x + wall.x + cohes.x;
            a.ay = drive.y + repel.y + wall.y + cohes.y;
        }

        // 4. Integrate
        const maxSpd = CFG.BASE_SPEED * CFG.MAX_SPEED_MULT;
        for (let i = 0; i < agents.length; i++) {
            const a = agents[i];
            if (a.state === 'ESCAPED' || a.state === 'INJURED') continue;
            a.vx += a.ax * dt;
            a.vy += a.ay * dt;
            // clamp speed
            const sp = Math.hypot(a.vx, a.vy);
            const cap = maxSpd * a.mobility;
            if (sp > cap) {
                const k = cap / sp;
                a.vx *= k; a.vy *= k;
            }
            a.x += a.vx * dt;
            a.y += a.vy * dt;
        }

        // 5. Resolve states (escape / injury)
        for (let i = 0; i < agents.length; i++) {
            const a = agents[i];
            if (a.state === 'ESCAPED' || a.state === 'INJURED') continue;

            // escape: at any exit cell
            if (grid.isExitAt(a.x, a.y)) {
                a.state = 'ESCAPED';
                this.evacuated++;
                continue;
            }

            // injury: standing in fire
            const fire = threat.fireAt(a.x, a.y);
            if (fire > 0.2 && a.panic >= CFG.FIRE_INJURE_PANIC_THRESHOLD) {
                a.state = 'INJURED';
                a.injured = true;
                this.injured++;
            }
        }
    }

    activeAgents() {
        let n = 0;
        for (const a of this.agents) if (a.state === 'SEARCHING' || a.state === 'FOLLOWING') n++;
        return n;
    }

    averagePanic() {
        let sum = 0, count = 0;
        for (const a of this.agents) {
            if (a.state === 'SEARCHING' || a.state === 'FOLLOWING') {
                sum += a.panic; count++;
            }
        }
        return count > 0 ? sum / count : 0;
    }
}
