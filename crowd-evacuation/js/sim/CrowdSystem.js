// Crowd orchestrator: per-tick update of all agents.
// Wires together flow field, social forces, panic, threats, marshals.

class CrowdSystem {
    constructor(grid, agents, threatSystem, placements = null) {
        this.grid = grid;
        this.agents = agents;
        this.threat = threatSystem;
        // backwards-compat: if a plain marshals array was passed, wrap it
        if (Array.isArray(placements)) {
            this.placements = new Placements();
            this.placements.marshals = placements;
        } else {
            this.placements = placements || new Placements();
        }
        this.marshals = this.placements.marshals;     // alias for legacy callers
        this.signs    = this.placements.signs;
        this.pas      = this.placements.pas;

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

    _applyInfluencers(agent, dt) {
        let marshalInfluence = false;
        let paInfluence = false;
        agent._awarenessMult = 1;

        // Marshals don't override flow direction (that was buggy: a marshal's
        // own-cell flow is the wrong direction for nearby agents in different
        // cells). Instead they:
        //   1. Boost awareness — signs become more effective in their radius
        //   2. Stabilize panic — clamp panic to a moderate ceiling (prevents
        //      the panic→speed→fire-injury feedback at low density)
        const mr2 = CFG.MARSHAL_RADIUS_M * CFG.MARSHAL_RADIUS_M;
        for (const m of this.marshals) {
            const dx = m.x - agent.x;
            const dy = m.y - agent.y;
            if (dx * dx + dy * dy <= mr2) {
                marshalInfluence = true;
                agent._awarenessMult = Math.max(agent._awarenessMult, 2.0);
                // Soft cap on panic only (don't aggressively reduce — agents
                // in fire zones still need to flee fast).
                if (agent.panic > 0.7) agent.panic -= CFG.MARSHAL_PANIC_REDUCTION * dt;
                break;
            }
        }

        // PA speakers — calm panic in radius (room-wide instruction effect).
        // Same caveat as marshal: only soft-cap, don't kill urgency.
        const par2 = CFG.PA_RADIUS_M * CFG.PA_RADIUS_M;
        for (const p of this.pas) {
            const dx = p.x - agent.x;
            const dy = p.y - agent.y;
            if (dx * dx + dy * dy <= par2) {
                paInfluence = true;
                agent._awarenessMult = Math.max(agent._awarenessMult, 1.5);
                if (agent.panic > 0.6) agent.panic -= CFG.PA_PANIC_REDUCTION * dt;
                break;
            }
        }

        // Signs — directional, vision-cone, probabilistic per-tick reading.
        const sr2 = CFG.SIGN_VISION_RADIUS_M * CFG.SIGN_VISION_RADIUS_M;
        const coneCos = Math.cos((CFG.SIGN_CONE_DEG / 2) * Math.PI / 180);
        for (const s of this.signs) {
            const dx = agent.x - s.x;
            const dy = agent.y - s.y;
            const d2 = dx * dx + dy * dy;
            if (d2 > sr2) continue;
            // Sign points outward in `dir`. Agent must be within the cone.
            const dirVec = SignDirVec[s.dir];
            const len = Math.sqrt(d2) || 1;
            const dot = (dx / len) * dirVec.x + (dy / len) * dirVec.y;
            if (dot < coneCos) continue;
            // Read probability scales with awareness × visionFactor.
            // Awareness can be boosted by nearby marshals/PAs (set above).
            const visionFactor = agent.visionRange / CFG.VISION_NORMAL_M;
            const awarenessMult = agent._awarenessMult || 1;
            const p = CFG.SIGN_READ_BASE_PROB * agent.awareness * awarenessMult * visionFactor * dt;
            if (Math.random() < p) {
                // Sign biases agent toward the sign's facing direction.
                agent.biasX = dirVec.x;
                agent.biasY = dirVec.y;
                agent.biasUntil = Math.max(agent.biasUntil, this.simTime + CFG.SIGN_PERSISTENCE_S);
            }
        }

        return { marshalInfluence, paInfluence };
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

            // marshal / PA / sign influence (sets bias, may reduce panic)
            const inf = this._applyInfluencers(a, dt);
            const marshalInfluence = inf.marshalInfluence || inf.paInfluence;

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
