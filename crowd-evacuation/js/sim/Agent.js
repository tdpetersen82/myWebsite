// Agent: a single person in the simulation.
// State machine: SEARCHING → FOLLOWING → ESCAPED, or → INJURED.
// All positions/velocities in meters / m·s⁻¹.

const AgentState = Object.freeze({
    SEARCHING: 'SEARCHING',
    FOLLOWING: 'FOLLOWING',
    ESCAPED: 'ESCAPED',
    INJURED: 'INJURED',
});

const AgentType = Object.freeze({
    NORMAL: 'normal',
    ELDERLY: 'elderly',
    CHILD: 'child',
    WHEELCHAIR: 'wheelchair',
    DRUNK: 'drunk',
});

class Agent {
    constructor(id, x, y, type = AgentType.NORMAL, group = -1) {
        this.id = id;
        this.x = x;
        this.y = y;
        this.vx = 0;
        this.vy = 0;
        // accumulator vectors (reused per tick)
        this.ax = 0;
        this.ay = 0;
        this.type = type;
        this.group = group;
        this.state = AgentState.SEARCHING;
        this.panic = 0;
        this.injured = false;

        switch (type) {
            case AgentType.ELDERLY:    this.mobility = CFG.MOBILITY_ELDERLY;   this.awareness = CFG.AWARENESS_NORMAL;  break;
            case AgentType.CHILD:      this.mobility = CFG.MOBILITY_CHILD;     this.awareness = CFG.AWARENESS_NORMAL;  break;
            case AgentType.WHEELCHAIR: this.mobility = CFG.MOBILITY_WHEELCHAIR;this.awareness = CFG.AWARENESS_NORMAL;  break;
            case AgentType.DRUNK:      this.mobility = CFG.MOBILITY_DRUNK;     this.awareness = CFG.AWARENESS_DRUNK;   break;
            default:                   this.mobility = CFG.MOBILITY_NORMAL;    this.awareness = CFG.AWARENESS_NORMAL;
        }

        this.radius = CFG.AGENT_RADIUS;
        this.visionRange = CFG.VISION_NORMAL_M;
        // marshal/sign biasing — when set, overrides flow-field for N seconds
        this.biasUntil = 0;
        this.biasX = 0;
        this.biasY = 0;
    }

    speed() { return Math.hypot(this.vx, this.vy); }
}
