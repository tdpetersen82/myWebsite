// SimScene: runs the simulation. No editing during this scene.
// Fixed-timestep accumulator pattern. See SPEC.md §3.2.

class SimScene extends Phaser.Scene {
    constructor() { super('SimScene'); }

    init(data) {
        this.level = data.level;
        this.marshals = data.marshals;
        this.grid = data.grid;
        this.offsetX = data.offsetX;
        this.offsetY = data.offsetY;
    }

    create() {
        // build agents
        this.agents = spawnAgentsForLevel(this.level);

        // threat
        this.threat = new ThreatSystem(this.grid, this.level.threat);

        // crowd system
        this.crowd = new CrowdSystem(this.grid, this.agents, this.threat, this.marshals);

        // accumulator
        this.simAcc = 0;
        this.threatAcc = 0;
        this.simStep = 1 / CFG.SIM_HZ;
        this.threatStep = 1 / CFG.THREAT_HZ;
        this.simTime = 0;
        this.timeRemaining = this.level.timeLimit;
        this.ended = false;

        // graphics
        this.bgLayer = this.add.graphics();
        this.fireLayer = this.add.graphics();
        this.smokeLayer = this.add.graphics();
        this.agentLayer = this.add.graphics();
        this.marshalLayer = this.add.graphics();
        this._drawBackground();
        this._drawMarshals();

        // HUD
        const hudBg = this.add.rectangle(0, 0, CFG.CANVAS_W, CFG.HUD_HEIGHT, 0x0f0c29, 1)
            .setOrigin(0, 0);
        this.hudTime = this.add.text(20, 16, '', { fontFamily: 'Arial Black', fontSize: '18px', color: '#fff' });
        this.hudEvac = this.add.text(180, 16, '', { fontFamily: 'Arial Black', fontSize: '18px', color: '#4ade80' });
        this.hudInjured = this.add.text(340, 16, '', { fontFamily: 'Arial Black', fontSize: '18px', color: '#ff6b6b' });
        this.hudPanic = this.add.text(500, 16, '', { fontFamily: 'Arial Black', fontSize: '18px', color: '#fbbf24' });

        // alarm flash
        const flash = this.add.rectangle(CFG.CANVAS_W / 2, CFG.CANVAS_H / 2, CFG.CANVAS_W, CFG.CANVAS_H, 0xff4444, 0.4);
        this.tweens.add({ targets: flash, alpha: 0, duration: 600, onComplete: () => flash.destroy() });
        this.add.text(CFG.CANVAS_W / 2, 100, 'ALARM TRIGGERED', {
            fontFamily: 'Arial Black', fontSize: '32px', color: '#ff4444',
        }).setOrigin(0.5).setAlpha(1).setDepth(10);

        // optional: fade alarm text
        const alarmTxt = this.children.list[this.children.list.length - 1];
        this.tweens.add({ targets: alarmTxt, alpha: 0, duration: 1500, delay: 1000, onComplete: () => alarmTxt.destroy() });
    }

    _drawBackground() {
        const g = this.bgLayer;
        g.clear();
        const cs = CFG.CELL_M, px = CFG.PIXELS_PER_METER;
        for (let y = 0; y < this.grid.h; y++) {
            for (let x = 0; x < this.grid.w; x++) {
                const t = this.grid.getTile(x, y);
                const burning = this.grid.burning[y * this.grid.w + x];
                let color;
                if (burning)              color = 0x4a1a0a;
                else if (t === Tile.WALL) color = 0x2a2a3a;
                else if (t === Tile.EXIT) color = 0x4ade80;
                else                      color = 0xddd5c8;
                g.fillStyle(color, 1);
                g.fillRect(this.offsetX + x * cs * px, this.offsetY + y * cs * px, cs * px, cs * px);
            }
        }
    }

    _drawMarshals() {
        const g = this.marshalLayer;
        g.clear();
        const px = CFG.PIXELS_PER_METER;
        for (const m of this.marshals) {
            const sx = this.offsetX + m.x * px;
            const sy = this.offsetY + m.y * px;
            g.fillStyle(0x60a5fa, 0.10);
            g.fillCircle(sx, sy, CFG.MARSHAL_RADIUS_M * px);
            g.fillStyle(0x60a5fa, 1);
            g.fillCircle(sx, sy, 9);
            g.lineStyle(2, 0xffffff, 1);
            g.strokeCircle(sx, sy, 9);
        }
    }

    _drawAgents() {
        const g = this.agentLayer;
        g.clear();
        const px = CFG.PIXELS_PER_METER;
        for (const a of this.agents) {
            if (a.state === 'ESCAPED') continue;
            const sx = this.offsetX + a.x * px;
            const sy = this.offsetY + a.y * px;
            // halo by panic
            if (a.panic > 0.2) {
                g.fillStyle(0xff4444, a.panic * 0.4);
                g.fillCircle(sx, sy, 14);
            }
            // body color by state/type
            let color;
            if (a.state === 'INJURED')              color = 0x666666;
            else if (a.type === 'wheelchair')       color = 0x9333ea;
            else if (a.type === 'elderly')          color = 0x78716c;
            else if (a.type === 'child')            color = 0xfbbf24;
            else if (a.type === 'drunk')            color = 0xa855f7;
            else {
                // gradient panic green→red
                const r = Math.floor(0x4a + a.panic * (0xff - 0x4a));
                const grn = Math.floor(0xde - a.panic * (0xde - 0x44));
                const b = Math.floor(0x80 - a.panic * (0x80 - 0x44));
                color = (r << 16) | (grn << 8) | b;
            }
            g.fillStyle(color, 1);
            g.fillCircle(sx, sy, 6);
            g.lineStyle(1, 0x000000, 0.6);
            g.strokeCircle(sx, sy, 6);
        }
    }

    _drawFireSmoke() {
        const fg = this.fireLayer;
        const sg = this.smokeLayer;
        fg.clear(); sg.clear();
        const cs = CFG.CELL_M, px = CFG.PIXELS_PER_METER;
        for (let y = 0; y < this.grid.h; y++) {
            for (let x = 0; x < this.grid.w; x++) {
                const i = y * this.grid.w + x;
                const fire = this.threat.fire[i];
                const smoke = this.threat.smoke[i];
                if (fire > 0.05) {
                    fg.fillStyle(0xff6b1a, fire);
                    fg.fillRect(this.offsetX + x * cs * px, this.offsetY + y * cs * px, cs * px, cs * px);
                    fg.fillStyle(0xfff080, fire * 0.5);
                    fg.fillCircle(this.offsetX + (x + 0.5) * cs * px, this.offsetY + (y + 0.5) * cs * px, 5);
                }
                if (smoke > 0.05) {
                    sg.fillStyle(0x666666, Math.min(0.6, smoke * 0.7));
                    sg.fillRect(this.offsetX + x * cs * px, this.offsetY + y * cs * px, cs * px, cs * px);
                }
            }
        }
    }

    update(time, dtMs) {
        if (this.ended) return;
        let dt = Math.min(dtMs / 1000, CFG.MAX_DT);

        this.simAcc += dt;
        this.threatAcc += dt;
        let topologyChanged = false;

        while (this.threatAcc >= this.threatStep) {
            const changed = this.threat.tick(this.threatStep);
            if (changed) topologyChanged = true;
            this.threatAcc -= this.threatStep;
        }
        if (topologyChanged) {
            this.crowd.rebuildFlowField();
        }

        while (this.simAcc >= this.simStep) {
            this.crowd.tick(this.simStep);
            this.simAcc -= this.simStep;
            this.simTime += this.simStep;
        }

        this.timeRemaining = Math.max(0, this.level.timeLimit - this.simTime);

        // render
        this._drawBackground();
        this._drawFireSmoke();
        this._drawAgents();

        // HUD
        const minutes = Math.floor(this.timeRemaining / 60);
        const seconds = Math.floor(this.timeRemaining % 60).toString().padStart(2, '0');
        this.hudTime.setText(`TIME ${minutes}:${seconds}`);
        this.hudEvac.setText(`EVAC ${this.crowd.evacuated}/${this.agents.length}`);
        this.hudInjured.setText(`INJ ${this.crowd.injured}`);
        const pct = Math.round(this.crowd.averagePanic() * 100);
        this.hudPanic.setText(`PANIC ${pct}%`);

        // termination
        const active = this.crowd.activeAgents();
        if (active === 0 || this.timeRemaining <= 0) {
            this.ended = true;
            this.time.delayedCall(800, () => {
                this.scene.start('ResultsScene', {
                    level: this.level,
                    result: {
                        totalAgents: this.agents.length,
                        evacuated: this.crowd.evacuated,
                        injured: this.crowd.injured,
                        timeRemaining: this.timeRemaining,
                        timeLimit: this.level.timeLimit,
                        budgetUnspent: this.level.budget.marshals - this.marshals.length,
                        budgetTotal: this.level.budget.marshals,
                    },
                });
            });
        }
    }
}
