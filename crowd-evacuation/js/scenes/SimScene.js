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
        this.bgLayer       = this.add.graphics().setDepth(0);
        this.fireSprites   = [];                                // grid-cell array of fire sprites
        this.smokeLayer    = this.add.graphics().setDepth(14);
        this.placeLayer    = this.add.graphics().setDepth(5);   // marshal/sign/PA halos
        this.placeSprites  = [];                                 // sprite refs for marshals/signs/PAs
        this.agentSprites  = [];                                 // 1-to-1 with this.agents
        this.debugLayer    = this.add.graphics().setDepth(20);

        // Particles
        this.particles = new ParticleManager(this);

        this._drawBackground();
        this._buildAgentSprites();
        this._buildPlacementSprites();
        this._buildFireSprites();

        // HUD
        this.add.rectangle(0, 0, CFG.CANVAS_W, CFG.HUD_HEIGHT, 0x0f0c29, 1).setOrigin(0, 0).setDepth(25);
        const hudOpts = (color) => ({ fontFamily: '"Bungee","Arial Black",Arial', fontSize: '17px', color });
        this.hudTime    = this.add.text(20, 14, '',  hudOpts('#fff')).setDepth(26);
        this.hudEvac    = this.add.text(180, 14, '', hudOpts('#4ade80')).setDepth(26);
        this.hudInjured = this.add.text(340, 14, '', hudOpts('#ff6b6b')).setDepth(26);
        this.hudPanic   = this.add.text(500, 14, '', hudOpts('#fbbf24')).setDepth(26);
        this.hudKey     = this.add.text(CFG.CANVAS_W - 20, 40, 'P pause · F1 flow · F3 vision · F6 slow · F7 step · F8 inspect · F9 perf', {
            fontFamily: '"Inter",Arial', fontSize: '9px', color: '#666',
        }).setOrigin(1, 0).setDepth(26);

        // Alarm flash + camera shake + hit-pause
        if (!this.settings.reducedMotion) {
            Juice.flash(this, 200, 255, 80, 80);
            Juice.shake(this, 380, 0.006);
        }
        Juice.hitPause(this, 90);
        const alarmTxt = this.add.text(CFG.CANVAS_W / 2, 100, 'ALARM TRIGGERED', {
            fontFamily: '"Bungee", "Arial Black", Arial', fontSize: '34px', color: '#ff4444',
            stroke: '#000', strokeThickness: 4,
        }).setOrigin(0.5).setDepth(30);
        Juice.popIn(this, alarmTxt, 380);
        this.tweens.add({ targets: alarmTxt, alpha: 0, y: 80, duration: 1500, delay: 1100, onComplete: () => alarmTxt.destroy() });

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
        // Background uses tile sprites for floor / wall / exit. Burning cells
        // render via Graphics overlay because they change at runtime.
        const cs = CFG.CELL_M, px = CFG.PIXELS_PER_METER;
        const tileSize = cs * px;       // 16px for 0.5m cells
        // Lazy-build the tile sprite grid once
        if (!this._tilesBuilt) {
            this._tileSprites = [];
            for (let y = 0; y < this.grid.h; y++) {
                for (let x = 0; x < this.grid.w; x++) {
                    const t = this.grid.getTile(x, y);
                    let key;
                    if (t === Tile.WALL)      key = 'tile-wall';
                    else if (t === Tile.EXIT) key = 'tile-exit-0';
                    else                      key = `tile-floor-${(x + y * 3) % 3}`;
                    const sx = this.offsetX + x * tileSize + tileSize / 2;
                    const sy = this.offsetY + y * tileSize + tileSize / 2;
                    const s = this.add.image(sx, sy, key)
                        .setDisplaySize(tileSize, tileSize)
                        .setDepth(0);
                    this._tileSprites.push({ x, y, sprite: s });
                }
            }
            this._tilesBuilt = true;
        }
        // Animate exit pulse — refresh exit-tile texture each draw
        const exitFrame = Math.floor(this.simTime * 4) % 4;
        for (const t of this._tileSprites) {
            const tile = this.grid.getTile(t.x, t.y);
            if (tile === Tile.EXIT) t.sprite.setTexture(`tile-exit-${exitFrame}`);
        }
        // Burning cells: tint the underlying tile dark red
        const g = this.bgLayer; g.clear();
        for (let y = 0; y < this.grid.h; y++) {
            for (let x = 0; x < this.grid.w; x++) {
                if (this.grid.burning[y * this.grid.w + x]) {
                    g.fillStyle(0x4a1a0a, 0.55);
                    g.fillRect(this.offsetX + x * tileSize, this.offsetY + y * tileSize, tileSize, tileSize);
                }
            }
        }
    }

    _buildPlacementSprites() {
        // Marshals get a walk-cycle sprite + halo Graphics. We spawn
        // them once and animate frames in the update loop.
        const px = CFG.PIXELS_PER_METER;
        for (const m of this.placements.marshals) {
            const sx = this.offsetX + m.x * px, sy = this.offsetY + m.y * px;
            const sprite = this.add.image(sx, sy, 'marshal-0').setDepth(11);
            this.placeSprites.push({ kind: 'marshal', ref: m, sprite, frame: 0 });
        }
        for (const s of this.placements.signs) {
            const sx = this.offsetX + s.x * px, sy = this.offsetY + s.y * px;
            const sprite = this.add.image(sx, sy, `sign-${s.dir}`).setDepth(10);
            this.placeSprites.push({ kind: 'sign', ref: s, sprite });
        }
        for (const p of this.placements.pas) {
            const sx = this.offsetX + p.x * px, sy = this.offsetY + p.y * px;
            const sprite = this.add.image(sx, sy, 'pa-speaker').setDepth(10);
            this.placeSprites.push({ kind: 'pa', ref: p, sprite });
        }
    }

    _drawPlacementHalos() {
        const g = this.placeLayer;
        g.clear();
        const px = CFG.PIXELS_PER_METER;
        // Marshals: blue halo, pulsing
        const pulse = 1 + Math.sin(this.simTime * 2.5) * 0.05;
        for (const m of this.placements.marshals) {
            const sx = this.offsetX + m.x * px, sy = this.offsetY + m.y * px;
            g.fillStyle(0x60a5fa, 0.09);
            g.fillCircle(sx, sy, CFG.MARSHAL_RADIUS_M * px * pulse);
            g.lineStyle(2, 0x60a5fa, 0.5);
            g.strokeCircle(sx, sy, CFG.MARSHAL_RADIUS_M * px * pulse);
        }
        // PAs: yellow halo
        for (const p of this.placements.pas) {
            const sx = this.offsetX + p.x * px, sy = this.offsetY + p.y * px;
            g.fillStyle(0xfbbf24, 0.07);
            g.fillCircle(sx, sy, CFG.PA_RADIUS_M * px * pulse);
            g.lineStyle(1.5, 0xfbbf24, 0.4);
            g.strokeCircle(sx, sy, CFG.PA_RADIUS_M * px * pulse);
        }
    }

    _buildAgentSprites() {
        const px = CFG.PIXELS_PER_METER;
        for (const a of this.agents) {
            const sx = this.offsetX + a.x * px;
            const sy = this.offsetY + a.y * px;
            const key = SpriteFactory.agentTextureKey(a, 0);
            const sprite = this.add.image(sx, sy, key).setDepth(12);
            sprite.setTint(SpriteFactory.agentTint(a, this.settings.colorblind));
            this.agentSprites.push(sprite);
        }
    }

    _buildFireSprites() {
        // Lazy: built each tick where new fire cells appear. Cell-keyed.
        this.fireSpriteMap = new Map();   // cellIdx → sprite
    }

    _drawAgents() {
        const px = CFG.PIXELS_PER_METER;
        const cb = this.settings.colorblind;
        for (let i = 0; i < this.agents.length; i++) {
            const a = this.agents[i];
            const s = this.agentSprites[i];
            if (!s) continue;
            if (a.state === 'ESCAPED') { s.setVisible(false); continue; }
            const sx = this.offsetX + a.x * px;
            const sy = this.offsetY + a.y * px;
            s.setPosition(sx, sy);
            // walk-cycle frame: phase by sim time × speed
            const speed = Math.hypot(a.vx, a.vy);
            const frame = a.state === 'INJURED'
                ? 0
                : (speed > 0.1 ? Math.floor(this.simTime * speed * 3.5) % 4 : 0);
            s.setTexture(SpriteFactory.agentTextureKey(a, frame));
            // facing rotation (top-down: 0 rad = facing east in our textures
            // which were drawn facing south — we offset by +PI/2 to align).
            if (speed > 0.1 && a.state !== 'INJURED') {
                s.setRotation(Math.atan2(a.vy, a.vx) - Math.PI / 2);
            } else {
                s.setRotation(0);
            }
            s.setTint(SpriteFactory.agentTint(a, cb));
            // Footstep dust — every other walk-frame at high speed
            if (speed > 0.8 && (frame === 1 || frame === 3) && Math.random() < 0.12) {
                this.particles?.emitFootstep(sx, sy);
            }
        }
        // Panic halo overlay (drawn once for all agents, in agent layer behind)
        if (!this._panicHaloLayer) {
            this._panicHaloLayer = this.add.graphics().setDepth(11);
        }
        const g = this._panicHaloLayer;
        g.clear();
        for (const a of this.agents) {
            if (a.state === 'ESCAPED' || a.panic < 0.3) continue;
            const sx = this.offsetX + a.x * px;
            const sy = this.offsetY + a.y * px;
            g.fillStyle(0xff3333, a.panic * 0.32);
            g.fillCircle(sx, sy, 12);
        }
    }

    _drawFireSmoke() {
        const cs = CFG.CELL_M, px = CFG.PIXELS_PER_METER;
        const tileSize = cs * px;
        const fireFrame = Math.floor(this.simTime * 8) % 4;
        const w = this.grid.w;
        // 1. Add/update fire sprites for cells with fire
        for (let y = 0; y < this.grid.h; y++) {
            for (let x = 0; x < w; x++) {
                const i = y * w + x;
                const fire = this.threat.fire[i];
                let s = this.fireSpriteMap.get(i);
                if (fire > 0.05) {
                    if (!s) {
                        const cx = this.offsetX + (x + 0.5) * tileSize;
                        const cy = this.offsetY + (y + 0.5) * tileSize;
                        s = this.add.image(cx, cy, `fire-${fireFrame}`)
                            .setDepth(13)
                            .setDisplaySize(tileSize * 1.1, tileSize * 1.4)
                            .setOrigin(0.5, 0.7);
                        this.fireSpriteMap.set(i, s);
                        // Spark burst when this cell first ignites
                        this.particles?.emitSparksAt(cx, cy, 6);
                    }
                    s.setTexture(`fire-${(fireFrame + (x + y)) % 4}`);   // de-sync flicker
                    s.setAlpha(Math.min(1, fire * 1.4));
                    // Periodic smoke emission from this fire
                    if (Math.random() < fire * 0.3) {
                        this.particles?.emitSmokeAt(s.x, s.y - 4, 1);
                    }
                } else if (s) {
                    s.destroy();
                    this.fireSpriteMap.delete(i);
                }
            }
        }
        // 2. Smoke overlay (cell-darkening for line-of-sight effect)
        const sg = this.smokeLayer;
        sg.clear();
        for (let y = 0; y < this.grid.h; y++) {
            for (let x = 0; x < w; x++) {
                const i = y * w + x;
                const smoke = this.threat.smoke[i];
                if (smoke > 0.08) {
                    sg.fillStyle(0x4a4a55, Math.min(0.55, smoke * 0.6));
                    sg.fillRect(this.offsetX + x * tileSize, this.offsetY + y * tileSize, tileSize, tileSize);
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
        // Hit-pause respect
        if (Juice.isFrozen(this)) {
            this._drawAgents();
            this._drawPlacementHalos();
            this._drawFireSmoke();
            this._drawBackground();
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
        // Fire ignition sound + camera shake + hit-pause — once
        if (!this._fireSoundFired && this.threat.ignited) {
            window.exodusAudio?.fireWhoosh();
            if (!this.settings.reducedMotion) {
                Juice.shake(this, 600, 0.009);
                Juice.flash(this, 220, 255, 100, 0);
            }
            Juice.hitPause(this, 60);
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
        this._drawPlacementHalos();
        this._drawFireSmoke();
        this._drawAgents();
        // Jam dust at high-density spots
        this._emitJamDust();
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
            // Confetti for any successful clear (≥1 evacuee), brief flash on fail
            if (this.crowd.evacuated > 0) {
                this.particles?.emitConfettiBurst(CFG.CANVAS_W, CFG.CANVAS_H);
            }
            if (!this.settings.reducedMotion) {
                Juice.flash(this, 350, 80, 220, 120);
            }
            Juice.hitPause(this, 120);
            this.time.delayedCall(900, () => {
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

    _emitJamDust() {
        if (!this.particles) return;
        // Scan agents for high-density clusters (cheap: every ~10 frames, sparse)
        if ((this._jamDustTick = (this._jamDustTick || 0) + 1) % 10 !== 0) return;
        const px = CFG.PIXELS_PER_METER;
        for (const a of this.agents) {
            if (a.state !== 'SEARCHING' && a.state !== 'FOLLOWING') continue;
            // crude density check via spatial hash
            const nbrs = this.crowd.spatialHash.queryRadius(a.x, a.y, 0.7, 8, []);
            if (nbrs.length >= 4 && Math.hypot(a.vx, a.vy) < 0.4 && Math.random() < 0.08) {
                this.particles.emitDustAt(this.offsetX + a.x * px, this.offsetY + a.y * px + 6, 1);
            }
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
