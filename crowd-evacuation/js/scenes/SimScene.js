// SimScene: runs the simulation. No editing during this scene.
// Fixed-timestep accumulator. Hosts DebugOverlay (F1, F3, F6, F7, F9).

class SimScene extends Phaser.Scene {
    constructor() { super('SimScene'); }

    init(data) {
        this.level = data.level;
        this.placements = data.placements || new Placements();
        this.offsetX = data.offsetX;
        this.offsetY = data.offsetY;
        this.isDaily = !!data.isDaily;
    }

    create() {
        // Read settings once at scene start
        this.settings = Storage.getSettings();

        // Build a fresh grid and apply barriers.
        this.grid = buildGridFromLevel(this.level);
        this.placements.applyBarriersToGrid(this.grid);

        // Build agents
        this.agents = spawnAgentsForLevel(this.level);

        // Threat
        this.threat = new ThreatSystem(this.grid, this.level.threat);

        // Crowd system
        this.crowd = new CrowdSystem(this.grid, this.agents, this.threat, this.placements);

        // Accumulators
        this.simAcc = 0;
        this.threatAcc = 0;
        this.simStep = 1 / CFG.SIM_HZ;
        this.threatStep = 1 / CFG.THREAT_HZ;
        this.simTime = 0;
        this.timeRemaining = this.level.timeLimit;
        this.ended = false;

        // Render layers
        this.bgLayer       = this.add.graphics();
        this.fireLayer     = this.add.graphics();
        this.smokeLayer    = this.add.graphics();
        this.placeLayer    = this.add.graphics();   // marshals, signs, PAs (always shown)
        this.agentLayer    = this.add.graphics();
        this.debugLayer    = this.add.graphics().setDepth(20);

        this._drawBackground();
        this._drawPlacements();

        // HUD
        this.add.rectangle(0, 0, CFG.CANVAS_W, CFG.HUD_HEIGHT, 0x0f0c29, 1).setOrigin(0, 0);
        this.hudTime    = this.add.text(20, 16, '',  { fontFamily: 'Arial Black', fontSize: '18px', color: '#fff' });
        this.hudEvac    = this.add.text(180, 16, '', { fontFamily: 'Arial Black', fontSize: '18px', color: '#4ade80' });
        this.hudInjured = this.add.text(340, 16, '', { fontFamily: 'Arial Black', fontSize: '18px', color: '#ff6b6b' });
        this.hudPanic   = this.add.text(500, 16, '', { fontFamily: 'Arial Black', fontSize: '18px', color: '#fbbf24' });
        this.hudKey     = this.add.text(CFG.CANVAS_W - 20, 40, 'P pause · F1 flow · F3 vision · F6 slow · F7 step · F8 inspect · F9 perf', {
            fontFamily: 'Arial', fontSize: '9px', color: '#666',
        }).setOrigin(1, 0);

        // Alarm flash + text (skip flash if reduced motion)
        if (!this.settings.reducedMotion) {
            const flash = this.add.rectangle(CFG.CANVAS_W / 2, CFG.CANVAS_H / 2, CFG.CANVAS_W, CFG.CANVAS_H, 0xff4444, 0.4);
            this.tweens.add({ targets: flash, alpha: 0, duration: 600, onComplete: () => flash.destroy() });
        }
        const alarmTxt = this.add.text(CFG.CANVAS_W / 2, 100, 'ALARM TRIGGERED', {
            fontFamily: 'Arial Black', fontSize: '32px', color: '#ff4444',
        }).setOrigin(0.5).setDepth(10);
        this.tweens.add({ targets: alarmTxt, alpha: 0, duration: 1500, delay: 1000, onComplete: () => alarmTxt.destroy() });

        // Audio: alarm + continuous loops; intensities updated each tick
        window.exodusAudio?.startAlarm();
        window.exodusAudio?.startPanicSwell();
        window.exodusAudio?.startFireCrackle();
        this._fireSoundFired = false;

        // Debug overlay
        this.debug = new DebugOverlay(this);

        // Pause menu
        this.userPaused = false;
        this._pauseElements = [];
        this.input.keyboard.on('keydown-P',   () => this._togglePause());
        this.input.keyboard.on('keydown-ESC', () => this._togglePause());

        // Stop loops on scene exit
        this.events.once('shutdown', () => {
            window.exodusAudio?.stopAlarm();
            window.exodusAudio?.stopPanicSwell();
            window.exodusAudio?.stopFireCrackle();
        });
    }

    _togglePause() {
        if (this.ended) return;
        this.userPaused = !this.userPaused;
        if (this.userPaused) this._showPauseMenu();
        else this._hidePauseMenu();
    }

    _showPauseMenu() {
        const W = CFG.CANVAS_W, H = CFG.CANVAS_H;
        const overlay = this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.7).setDepth(60);
        const panel = this.add.rectangle(W / 2, H / 2, 320, 260, 0x1a1a3a, 1)
            .setStrokeStyle(2, 0xfbbf24).setDepth(61);
        const title = this.add.text(W / 2, H / 2 - 90, 'PAUSED', {
            fontFamily: 'Arial Black', fontSize: '28px', color: '#fbbf24',
        }).setOrigin(0.5).setDepth(62);
        this._pauseElements.push(overlay, panel, title);

        const mkBtn = (y, label, color, onClick) => {
            const r = this.add.rectangle(W / 2, y, 220, 40, color, 1)
                .setStrokeStyle(2, 0xffffff, 0.3)
                .setInteractive({ useHandCursor: true })
                .setDepth(62);
            const t = this.add.text(W / 2, y, label, {
                fontFamily: 'Arial Black', fontSize: '15px', color: '#fff',
            }).setOrigin(0.5).setDepth(63);
            r.on('pointerdown', () => { window.exodusAudio?.click(); onClick(); });
            this._pauseElements.push(r, t);
        };
        mkBtn(H / 2 - 30, 'RESUME',           0x4ade80, () => this._togglePause());
        mkBtn(H / 2 + 20, 'RESTART LEVEL',    0x6c5ce7, () => this.scene.start('DesignScene', { level: this.level }));
        mkBtn(H / 2 + 70, 'BACK TO MENU',     0x4a4a6a, () => this.scene.start('MenuScene'));
    }

    _hidePauseMenu() {
        for (const e of this._pauseElements) e.destroy();
        this._pauseElements = [];
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

    _drawPlacements() {
        const g = this.placeLayer;
        g.clear();
        const px = CFG.PIXELS_PER_METER;

        // Marshals — hi-vis vest body + helmet head + dashed influence ring
        for (const m of this.placements.marshals) {
            const sx = this.offsetX + m.x * px, sy = this.offsetY + m.y * px;
            // soft fill of influence radius
            g.fillStyle(0x60a5fa, 0.10);
            g.fillCircle(sx, sy, CFG.MARSHAL_RADIUS_M * px);
            // dashed ring on the radius border (visual only — Phaser graphics has no native dash, fake with arcs)
            g.lineStyle(2, 0x60a5fa, 0.55);
            g.strokeCircle(sx, sy, CFG.MARSHAL_RADIUS_M * px);
            // shadow
            g.fillStyle(0x000000, 0.3);
            g.fillEllipse(sx, sy + 6, 16, 5);
            // hi-vis vest (yellow rectangle)
            g.fillStyle(0xfbbf24, 1);
            g.fillRect(sx - 6, sy - 1, 12, 9);
            g.lineStyle(1.5, 0x000000, 0.7);
            g.strokeRect(sx - 6, sy - 1, 12, 9);
            // belt stripe
            g.lineStyle(2, 0xef4444, 0.9);
            g.lineBetween(sx - 6, sy + 4, sx + 6, sy + 4);
            // head with helmet
            g.fillStyle(0x1e40af, 1);
            g.fillCircle(sx, sy - 5, 4);
            g.lineStyle(1.5, 0x000000, 0.7);
            g.strokeCircle(sx, sy - 5, 4);
            // helmet shine
            g.fillStyle(0xffffff, 0.5);
            g.fillCircle(sx - 1, sy - 6, 1.2);
        }
        // PA speakers — speaker box + sound waves
        for (const p of this.placements.pas) {
            const sx = this.offsetX + p.x * px, sy = this.offsetY + p.y * px;
            g.fillStyle(0xfbbf24, 0.08);
            g.fillCircle(sx, sy, CFG.PA_RADIUS_M * px);
            // speaker box
            g.fillStyle(0xfbbf24, 1);
            g.fillRect(sx - 7, sy - 7, 14, 14);
            g.lineStyle(2, 0x000000, 0.7);
            g.strokeRect(sx - 7, sy - 7, 14, 14);
            // speaker grille
            g.fillStyle(0x000000, 0.6);
            g.fillCircle(sx, sy, 4);
            g.fillStyle(0xfbbf24, 1);
            g.fillCircle(sx, sy, 1.5);
            // sound waves (concentric arcs to the right)
            g.lineStyle(1.5, 0xfbbf24, 0.8);
            for (let r = 12; r <= 22; r += 5) {
                g.beginPath();
                g.arc(sx + 4, sy, r, -Math.PI / 4, Math.PI / 4);
                g.strokePath();
            }
        }
        // Signs
        for (const s of this.placements.signs) {
            const sx = this.offsetX + s.x * px, sy = this.offsetY + s.y * px;
            const v = SignDirVec[s.dir];
            g.fillStyle(0x4ade80, 1);
            g.fillCircle(sx, sy, 8);
            g.lineStyle(2, 0xffffff, 1);
            g.strokeCircle(sx, sy, 8);
            g.lineStyle(3, 0x064e3b, 1);
            g.lineBetween(sx, sy, sx + v.x * 9, sy + v.y * 9);
            g.fillStyle(0x064e3b, 1);
            const tipX = sx + v.x * 11, tipY = sy + v.y * 11;
            g.fillTriangle(
                tipX, tipY,
                tipX - v.x * 5 + v.y * 4, tipY - v.y * 5 - v.x * 4,
                tipX - v.x * 5 - v.y * 4, tipY - v.y * 5 + v.x * 4,
            );
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

            // panic halo
            if (a.panic > 0.2) {
                g.fillStyle(0xff4444, a.panic * 0.45);
                g.fillCircle(sx, sy, 13);
            }

            // body color by type / panic
            let bodyColor;
            if (a.state === 'INJURED')           bodyColor = 0x555555;
            else if (a.type === 'wheelchair')    bodyColor = 0x9333ea;
            else if (a.type === 'elderly')       bodyColor = 0x78716c;
            else if (a.type === 'child')         bodyColor = 0xfbbf24;
            else if (a.type === 'drunk')         bodyColor = 0xa855f7;
            else {
                if (this.settings.colorblind) {
                    const r = Math.floor(0x33 + a.panic * (0xfb - 0x33));
                    const grn = Math.floor(0x80 + a.panic * (0xbf - 0x80));
                    const b = Math.floor(0xee - a.panic * (0xee - 0x24));
                    bodyColor = (r << 16) | (grn << 8) | b;
                } else {
                    const r = Math.floor(0x4a + a.panic * (0xff - 0x4a));
                    const grn = Math.floor(0xde - a.panic * (0xde - 0x44));
                    const b = Math.floor(0x80 - a.panic * (0x80 - 0x44));
                    bodyColor = (r << 16) | (grn << 8) | b;
                }
            }

            // shadow underfoot
            g.fillStyle(0x000000, 0.25);
            g.fillEllipse(sx, sy + 4, 12, 4);

            // body (torso)
            g.fillStyle(bodyColor, 1);
            g.fillCircle(sx, sy + 1, 5);
            g.lineStyle(1, 0x000000, 0.65);
            g.strokeCircle(sx, sy + 1, 5);

            // head — slight skin tone, distinct for child / elderly
            const headColor = a.type === 'child'   ? 0xfde68a
                           : a.type === 'elderly'  ? 0xe7d4b5
                           : a.type === 'drunk'    ? 0xfde68a
                           : 0xfde68a;
            g.fillStyle(headColor, 1);
            g.fillCircle(sx, sy - 3, 2.6);
            g.lineStyle(1, 0x000000, 0.65);
            g.strokeCircle(sx, sy - 3, 2.6);

            // direction indicator (small line in velocity direction)
            const sp = Math.hypot(a.vx, a.vy);
            if (sp > 0.1 && a.state !== 'INJURED') {
                const k = 4 / sp;
                g.lineStyle(1.5, 0x000000, 0.7);
                g.lineBetween(sx, sy + 1, sx + a.vx * k, sy + 1 + a.vy * k);
            }
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
        if (this.userPaused) return;
        if (this.debug && this.debug.paused) {
            this._drawAgents();
            this.debug.draw();
            return;
        }
        let dt = Math.min(dtMs / 1000, CFG.MAX_DT);
        if (this.debug) dt *= this.debug.speedScale();

        const t0 = performance.now();
        this.simAcc += dt;
        this.threatAcc += dt;
        let topologyChanged = false;

        while (this.threatAcc >= this.threatStep) {
            const changed = this.threat.tick(this.threatStep);
            if (changed) topologyChanged = true;
            this.threatAcc -= this.threatStep;
        }
        if (topologyChanged) this.crowd.rebuildFlowField();
        // Fire ignition sound — fires once when fire first appears
        if (!this._fireSoundFired && this.threat.ignited) {
            window.exodusAudio?.fireWhoosh();
            this._fireSoundFired = true;
        }

        while (this.simAcc >= this.simStep) {
            this.crowd.tick(this.simStep);
            this.simAcc -= this.simStep;
            this.simTime += this.simStep;
        }
        const tSim = performance.now() - t0;

        this.timeRemaining = Math.max(0, this.level.timeLimit - this.simTime);

        const tR0 = performance.now();
        this._drawBackground();
        this._drawFireSmoke();
        this._drawAgents();
        const tRender = performance.now() - tR0;

        // HUD
        const minutes = Math.floor(this.timeRemaining / 60);
        const seconds = Math.floor(this.timeRemaining % 60).toString().padStart(2, '0');
        this.hudTime.setText(`TIME ${minutes}:${seconds}`);
        this.hudEvac.setText(`EVAC ${this.crowd.evacuated}/${this.agents.length}`);
        this.hudInjured.setText(`INJ ${this.crowd.injured}`);
        const pct = Math.round(this.crowd.averagePanic() * 100);
        this.hudPanic.setText(`PANIC ${pct}%`);

        if (this.debug) {
            this.debug.recordPerf(tSim, tRender);
            this.debug.draw();
        }

        // Intensity-driven continuous audio
        const panic = this.crowd.averagePanic();
        window.exodusAudio?.updatePanicIntensity(panic);
        let totalFire = 0;
        for (let i = 0; i < this.threat.fire.length; i++) totalFire += this.threat.fire[i];
        const fireIntensity = Math.min(1, totalFire / 8);   // saturate around 8 cells of full fire
        window.exodusAudio?.updateFireIntensity(fireIntensity);

        // termination
        const active = this.crowd.activeAgents();
        if (active === 0 || this.timeRemaining <= 0) {
            this.ended = true;
            this.time.delayedCall(800, () => {
                this.scene.start('ResultsScene', {
                    level: this.level,
                    isDaily: this.isDaily,
                    placementsUsed: {
                        marshal: this.placements.marshals.length > 0,
                        barrier: this.placements.barriers.length > 0,
                        sign:    this.placements.signs.length > 0,
                        pa:      this.placements.pas.length > 0,
                    },
                    result: {
                        totalAgents: this.agents.length,
                        evacuated: this.crowd.evacuated,
                        injured: this.crowd.injured,
                        timeRemaining: this.timeRemaining,
                        timeLimit: this.level.timeLimit,
                        budgetUnspent: this._budgetUnspent(),
                        budgetTotal: this._budgetTotal(),
                    },
                });
            });
        }
    }

    _budgetUnspent() {
        const cost = this.placements.cost();
        const b = this.level.budget;
        return Math.max(0,
            (b.marshals      - cost.marshals)
          + (b.barrier_units - cost.barrier_units)
          + (b.signs         - cost.signs)
          + (b.pa            - cost.pa));
    }
    _budgetTotal() {
        const b = this.level.budget;
        return (b.marshals || 0) + (b.barrier_units || 0) + (b.signs || 0) + (b.pa || 0);
    }
}
