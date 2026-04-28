// Social Force Model (Helbing 2000).
// Computes per-agent acceleration from desired velocity, neighbor repulsion,
// wall repulsion, and group cohesion. See SPEC.md §4.1.

const SocialForce = (function () {
    const tmp = { x: 0, y: 0 };

    // Desired velocity from flow field (or bias if active) and panic.
    function desiredVelocity(agent, flowField, simTime, out) {
        let dx, dy;
        if (simTime < agent.biasUntil) {
            dx = agent.biasX;
            dy = agent.biasY;
        } else {
            flowField.sampleAt(agent.x, agent.y, tmp);
            dx = tmp.x;
            dy = tmp.y;
        }
        const speed = CFG.BASE_SPEED * agent.mobility *
                      (1 + CFG.PANIC_SPEED_GAIN * agent.panic);
        out.x = dx * speed;
        out.y = dy * speed;
        return out;
    }

    // Self-driving force toward desired velocity.
    function selfDrive(agent, desired, out) {
        out.x = (desired.x - agent.vx) / CFG.SFM_TAU;
        out.y = (desired.y - agent.vy) / CFG.SFM_TAU;
        return out;
    }

    // Pairwise repulsion from other agents.
    // Adds in place to (ax, ay).
    function neighborRepulsion(agent, neighbors) {
        let ax = 0, ay = 0;
        const A = CFG.SFM_A;
        const B = CFG.SFM_B;
        for (let i = 0; i < neighbors.length; i++) {
            const o = neighbors[i];
            if (o === agent || o.state === 'ESCAPED') continue;
            const dx = agent.x - o.x;
            const dy = agent.y - o.y;
            const d2 = dx * dx + dy * dy;
            if (d2 < 1e-6) continue;
            const d = Math.sqrt(d2);
            const r = agent.radius + o.radius;
            const force = A * Math.exp((r - d) / B);
            ax += force * (dx / d);
            ay += force * (dy / d);
        }
        return { x: ax, y: ay };
    }

    // Repulsion from nearby walls. Sample 8-neighborhood of agent's cell
    // and apply force from any blocked cell.
    function wallRepulsion(agent, grid) {
        let ax = 0, ay = 0;
        const A = CFG.SFM_A * CFG.WALL_REPULSION_MULT;
        const B = CFG.SFM_B;
        const cs = CFG.CELL_M;
        const cx = Math.floor(agent.x / cs);
        const cy = Math.floor(agent.y / cs);
        for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
                if (dx === 0 && dy === 0) continue;
                const nx = cx + dx, ny = cy + dy;
                if (nx < 0 || ny < 0 || nx >= grid.w || ny >= grid.h) continue;
                if (grid.walkable(nx, ny)) continue;
                // wall cell — repel from cell center
                const wx = (nx + 0.5) * cs;
                const wy = (ny + 0.5) * cs;
                const ddx = agent.x - wx;
                const ddy = agent.y - wy;
                const d2 = ddx * ddx + ddy * ddy;
                if (d2 < 1e-6) continue;
                const d = Math.sqrt(d2);
                const r = agent.radius + cs * 0.5;
                const force = A * Math.exp((r - d) / B);
                ax += force * (ddx / d);
                ay += force * (ddy / d);
            }
        }
        return { x: ax, y: ay };
    }

    // Group cohesion: pull toward group centroid if grouped.
    function groupCohesion(agent, groupCentroid) {
        if (!groupCentroid) return { x: 0, y: 0 };
        return {
            x: CFG.GROUP_COHESION_K * (groupCentroid.x - agent.x),
            y: CFG.GROUP_COHESION_K * (groupCentroid.y - agent.y),
        };
    }

    return { desiredVelocity, selfDrive, neighborRepulsion, wallRepulsion, groupCohesion };
})();
