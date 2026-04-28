// Panic dynamics. See SPEC.md §4.2.
// Pure function over agent + context; mutates panic field.

const PanicModel = (function () {
    function update(agent, ctx, dt) {
        // Density factor — neighbors within 1m, normalized.
        const dens = ctx.localDensity;
        const densityFactor = Math.max(0, Math.min(1, dens / CFG.DENSITY_PANIC_THRESHOLD - 1));

        // Threat factor — exp falloff from nearest threat.
        const threatFactor = Math.exp(-ctx.threatDistance / 5);

        // Vision factor — how blinded is the agent?
        const visionFactor = Math.max(0, Math.min(1,
            (CFG.VISION_NORMAL_M - agent.visionRange) / CFG.VISION_NORMAL_M));

        // Group separation — distance from group centroid.
        const groupFactor = ctx.groupSeparation > 0
            ? Math.max(0, Math.min(1, ctx.groupSeparation / CFG.GROUP_LAG_M))
            : 0;

        let delta = (
            CFG.PANIC_DENSITY_GAIN * densityFactor +
            CFG.PANIC_THREAT_GAIN  * threatFactor  +
            CFG.PANIC_VISION_GAIN  * visionFactor  +
            0.4                    * groupFactor
        ) * dt;

        // Decay only when conditions are actually calm.
        const calmness = Math.max(0, 1 - densityFactor - threatFactor);
        delta -= CFG.PANIC_DECAY * dt * calmness;

        // Marshal influence reduces panic (applied externally, but can include here).
        if (ctx.marshalInfluence) {
            delta -= CFG.MARSHAL_PANIC_REDUCTION * dt;
        }

        agent.panic = Math.max(0, Math.min(1, agent.panic + delta));
    }

    return { update };
})();
