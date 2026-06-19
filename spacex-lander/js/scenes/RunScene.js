// SpaceX Lander - Run Scene (endless score-chase)
// One run = an unbroken chain of back-to-back landings on a single fuel tank.
// A crash ends the run. No cinematic, no handover — control from frame 1.

class RunScene extends Phaser.Scene {
    constructor() {
        super({ key: 'RunScene' });
    }

    init() {
        // Effective stats are fixed for the whole run (read once).
        this.eff = CONFIG.effectiveStats();

        // Run state
        this.landingIndex = 1;
        this.runScore = 0;          // single source of truth; mirrored to the topbar
        this.chain = 1.0;           // multiplier applied to the NEXT landing
        this.bestChainThisRun = 1.0;
        this.creditsThisRun = 0;
        this.landingsCompleted = 0;

        // Phase flags
        this.transitioning = false; // brief celebration between landings
        this.runOver = false;
        this.paused = false;
        this.timeScale = 1;
        this._slowmoTimer = null;
    }

    create() {
        const w = CONFIG.WIDTH;
        const h = CONFIG.HEIGHT;

        this.audio = window.audioManager;
        if (this.audio) this.audio.init();

        // World graphics layers
        this.sky = new Sky(this);
        this.skyGraphics = this.add.graphics().setDepth(0);
        this.oceanGraphics = this.add.graphics().setDepth(1);
        this.shipGraphics = this.add.graphics().setDepth(2);
        this.rocketGraphics = this.add.graphics().setDepth(4);
        this.windGraphics = this.add.graphics().setDepth(6);

        // VFX
        this.vfx = new VFXManager(this);

        // Input
        this.cursors = this.input.keyboard.createCursorKeys();
        this.wasd = {
            up: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
            left: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
            right: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D)
        };
        this.input.keyboard.on('keydown-P', () => this._togglePause());
        this.input.keyboard.on('keydown-ESC', () => this._togglePause());
        this.input.keyboard.on('keydown-M', () => this._toggleMute());
        this.input.keyboard.on('keydown-R', () => this._restartRun());
        this.input.keyboard.on('keydown-H', () => { if (this.runOver) this._toHangar(); });
        this.input.keyboard.on('keydown-SPACE', () => this._onConfirm());
        this.input.keyboard.on('keydown-ENTER', () => this._onConfirm());
        // Thrust key / the on-screen ▲ touch button also relaunch from the summary
        this.input.keyboard.on('keydown-UP', () => this._onConfirm());
        this.input.keyboard.on('keydown-W', () => this._onConfirm());

        // HUD + cameras
        this._createHUD();
        this._setupCameras();

        // Sound-barrier flavor tracking
        this._wasSuperSonic = false;
        this._sonicBoomCooldown = 0;

        this._lowFuelWarning = false;

        this.events.on('shutdown', this.shutdown, this);

        // Rocket (created once; respawned each landing, fuel persists)
        this.rocket = new Rocket(this, w / 2, CONFIG.START_Y);
        this.rocket.fuel = this.eff.fuelMax;
        this.cameras.main.ignore(this._hudObjects);

        // Launch the first landing
        this._startLanding(1, this.eff.fuelMax);
    }

    // ----- LANDING SETUP -----
    _startLanding(N, carriedFuel) {
        const w = CONFIG.WIDTH;
        this.landingIndex = N;
        const def = CONFIG.getLevelDef(N);
        this.levelDef = def;

        // Build sea + drone ship for this difficulty (entities read getLevelDef(N))
        this.ocean = new Ocean(this, N);
        this.droneShip = new DroneShip(this, N);

        // Wind (signed)
        this.wind = def.wind > 0 ? def.wind * (Math.random() > 0.5 ? 1 : -1) : 0;

        // Spawn the booster at the top, already falling. Lateral offset from the
        // ship is clamped and scales modestly with difficulty so the deck is
        // always reachable with a competent line. Entry tilt/vx scaled by the
        // Grid-Fin Damping upgrade.
        const offMax = Math.min(220, 70 + N * 8);
        const startX = Phaser.Math.Clamp(w / 2 + (Math.random() * 2 - 1) * offMax, 90, w - 90);
        const vy = Math.min(CONFIG.START_VY_MAX, CONFIG.START_VY_BASE + N * CONFIG.START_VY_CREEP);
        const damp = this.eff.entryDamping;
        const eAngle = def.entryAngle * damp;
        const eVx = def.entryVx * damp;
        const sign = Math.random() > 0.5 ? 1 : -1;

        this.rocket.respawn(startX, CONFIG.START_Y, vy, eAngle * sign, eVx * sign, carriedFuel);

        this._legsAutoDeployed = false;
        this._wasSuperSonic = false;
        this._lowFuelWarning = false;

        // Snap camera to the new booster so the fade-in reveals it descending
        const cam = this.cameras.main;
        cam.centerOn(this.rocket.x, this.rocket.y);

        // Landing-index flash
        this._showLandingBanner(N, def);
    }

    _setupCameras() {
        const w = CONFIG.WIDTH;
        const h = CONFIG.HEIGHT;

        this.hudCamera = this.cameras.add(0, 0, w, h);
        this.hudCamera.setName('hud');

        // World objects hidden from the HUD camera
        this._worldObjects = [
            this.skyGraphics, this.oceanGraphics,
            this.shipGraphics, this.rocketGraphics
        ];
        this._worldObjects.forEach(obj => this.hudCamera.ignore(obj));

        if (this.vfx) {
            const vfxEmitters = [
                this.vfx.entryCore, this.vfx.entryFlame, this.vfx.entrySmoke,
                this.vfx.landCore, this.vfx.landFlame, this.vfx.landSmoke,
                this.vfx.reentryGlow, this.vfx.finPuff,
                this.vfx.explosionFireball, this.vfx.explosionFlash, this.vfx.explosionDebris,
                this.vfx.oceanSpray, this.vfx.fireworks
            ];
            vfxEmitters.forEach(e => { if (e) this.hudCamera.ignore(e); });
        }

        // HUD objects hidden from the main (world) camera
        this.cameras.main.ignore(this._hudObjects);
    }

    // Register an object as HUD-only (rendered on the fixed HUD camera, not the
    // zooming world camera). Safe to call after cameras exist.
    _hudOnly(obj) {
        if (this.cameras && this.cameras.main) this.cameras.main.ignore(obj);
        return obj;
    }

    // Register a runtime WORLD object so the fixed HUD camera ignores it (mirrors
    // _hudOnly). Used by VFX that spawn GameObjects mid-run (e.g. shockwave rings),
    // which would otherwise double-render at wrong screen coords on the HUD camera.
    _worldOnly(obj) {
        if (this.hudCamera) this.hudCamera.ignore(obj);
        return obj;
    }

    // ----- UPDATE LOOP -----
    update(time, delta) {
        if (this.paused) return;
        delta = Math.min(delta, 50) * this.timeScale;

        const rocket = this.rocket;
        const ocean = this.ocean;
        const ship = this.droneShip;

        const altitude = rocket.getAltitude(ocean, ship);

        // Dynamic camera zoom + follow
        const cam = this.cameras.main;
        const camCfg = CONFIG.CAMERA;
        const altRatio = Phaser.Math.Clamp(altitude / camCfg.ZOOM_ALT_REF, 0, 1);
        const easedRatio = Math.pow(altRatio, 0.6);
        const targetZoom = Phaser.Math.Clamp(
            camCfg.ZOOM_MAX - (camCfg.ZOOM_MAX - camCfg.ZOOM_MIN) * easedRatio,
            camCfg.ZOOM_MIN, camCfg.ZOOM_MAX
        );
        cam.setZoom(cam.zoom + (targetZoom - cam.zoom) * camCfg.ZOOM_LERP);
        cam.centerOn(rocket.x, rocket.y);

        // Entities
        this.sky.update(delta, altitude);
        ocean.update(delta);
        ship.update(delta, ocean);
        ship.updateProximity(altitude);

        if (!this.runOver && !this.transitioning) {
            rocket.update(delta, CONFIG.GRAVITY, this.wind);

            // Auto-deploy legs near the deck (keeps a 3-input game)
            if (!this._legsAutoDeployed && altitude < CONFIG.LEG_DEPLOY_ALTITUDE) {
                this._legsAutoDeployed = true;
                rocket.deployLegs();
                if (this.audio) this.audio.playLegDeploy();
            }

            this._checkSoundBarrier(delta);
            this._checkCollision();
        }

        // Thrust VFX + audio (full throttle only)
        if (rocket.thrusting) {
            if (this.audio && !this.audio.thrustNode) this.audio.startThrust(rocket.engineMode);
            const nozzles = rocket.getNozzlePositions();
            const gimbalOffset = rocket.gridFinAngle * 15;
            if (rocket.engineMode === 'entry') {
                const c = nozzles[Math.floor(nozzles.length / 2)];
                this.vfx.startEntryBurn(c.x, c.y, rocket.angle + gimbalOffset);
                this.vfx.stopLandingBurn();
            } else {
                const c = nozzles[0];
                this.vfx.startLandingBurn(c.x, c.y, rocket.angle + gimbalOffset);
                this.vfx.stopEntryBurn();
            }
        } else {
            if (this.audio) this.audio.stopThrust();
            this.vfx.stopAllThrust();
        }

        // Deck blast (exhaust hitting the ship)
        if (rocket.thrusting && altitude < 800 && ship.containsX(rocket.x)) {
            const intensity = 1 - altitude / 800;
            this.vfx.emitDeckBlast(rocket.x, ship.getHeightAt(rocket.x), intensity);
        }

        // Re-entry glow
        if (rocket.reentryHeat > 0.1) {
            const nozzle = rocket.getNozzlePosition();
            this.vfx.startReentryGlow(nozzle.x, nozzle.y, rocket.angle);
            if (this.audio && !this.audio.reentryNode) this.audio.startReentryWhoosh();
        } else {
            this.vfx.stopReentryGlow();
            if (this.audio) this.audio.stopReentryWhoosh();
        }

        // Low-fuel warning
        if (!this.runOver && rocket.fuel > 0 && rocket.fuel < CONFIG.LOW_FUEL_THRESHOLD && !this._lowFuelWarning) {
            this._lowFuelWarning = true;
            if (this.audio) this.audio.startLowFuelWarning();
        } else if ((rocket.fuel <= 0 || rocket.fuel >= CONFIG.LOW_FUEL_THRESHOLD || this.runOver) && this._lowFuelWarning) {
            this._lowFuelWarning = false;
            if (this.audio) this.audio.stopLowFuelWarning();
        }

        // Wind rush audio
        if (this.audio) {
            const speed = Math.sqrt(rocket.vx * rocket.vx + rocket.vy * rocket.vy);
            this.audio.updateWindRush(this.runOver ? 0 : speed);
        }

        // Draw
        this.skyGraphics.clear();
        this.sky.draw(this.skyGraphics);
        this.oceanGraphics.clear();
        ocean.draw(this.oceanGraphics);
        this.shipGraphics.clear();
        ship.draw(this.shipGraphics);
        this.rocketGraphics.clear();
        rocket.draw(this.rocketGraphics);
        this._drawWind();
        this._updateHUD(altitude);
    }

    _checkSoundBarrier(delta) {
        const rocket = this.rocket;
        const speed = Math.sqrt(rocket.vx * rocket.vx + rocket.vy * rocket.vy);
        const isSuper = speed > CONFIG.SOUND_BARRIER.MACH_1_SPEED;
        const altitude = rocket.getAltitude(this.ocean, this.droneShip);

        if (this._sonicBoomCooldown > 0) this._sonicBoomCooldown -= delta;

        if (isSuper !== this._wasSuperSonic && this._sonicBoomCooldown <= 0 &&
            altitude > CONFIG.SOUND_BARRIER.MIN_ALTITUDE) {
            this.vfx.emitSonicBoom(rocket.x, rocket.y);
            if (this.audio) this.audio.playSonicBoom();
            this.cameras.main.shake(300, 0.010);
            this._sonicBoomCooldown = CONFIG.SOUND_BARRIER.COOLDOWN;
        }
        this._wasSuperSonic = isSuper;
    }

    _checkCollision() {
        const rocket = this.rocket;
        if (!rocket.alive || rocket.landed) return;

        const points = rocket.getCollisionPoints();
        const ship = this.droneShip;
        const ocean = this.ocean;

        for (const pt of points) {
            let groundY, onShip = false;
            if (ship.containsX(pt.x)) {
                groundY = ship.getHeightAt(pt.x);
                onShip = true;
            } else {
                groundY = ocean.getHeightAt(pt.x);
            }

            if (pt.y >= groundY) {
                if (onShip) {
                    const ang = Math.abs(rocket.angle);
                    const vy = Math.abs(rocket.vy);
                    const vx = Math.abs(rocket.vx);
                    if (vy < CONFIG.LAND_MAX_VY && vx < CONFIG.LAND_MAX_VX &&
                        ang < CONFIG.LAND_MAX_ANGLE && rocket.legsDeployed) {
                        this._onLanding();
                    } else {
                        this._onCrash('ship');
                    }
                } else {
                    this._onCrash('water');
                }
                return;
            }
        }
    }

    // Determine grade + which axis was the limiting factor.
    _gradeLanding(vy, vx, ang, x) {
        const ship = this.droneShip;
        const distRatio = Math.abs(x - ship.x) / (ship.targetZoneWidth / 2);
        const G = CONFIG.GRADES;
        let key = 'sketchy';
        for (const k of ['perfect', 'great', 'good']) {
            const g = G[k];
            if (vy <= g.vy && vx <= g.vx && ang <= g.angle && distRatio <= g.distRatio) {
                key = k;
                break;
            }
        }
        // Limiting axis relative to PERFECT (what kept it from being perfect)
        const p = G.perfect;
        const ratios = [
            { axis: 'HARD', r: vy / p.vy },
            { axis: 'DRIFT', r: vx / p.vx },
            { axis: 'TILT', r: ang / p.angle },
            { axis: 'OFF-CENTER', r: distRatio / p.distRatio }
        ];
        ratios.sort((a, b) => b.r - a.r);
        return { key, limit: ratios[0].axis, distRatio };
    }

    _onLanding() {
        const rocket = this.rocket;
        const ship = this.droneShip;
        const vy = Math.abs(rocket.vy);
        const vx = Math.abs(rocket.vx);
        const ang = Math.abs(rocket.angle);

        rocket.landed = true;
        rocket.vy = 0; rocket.vx = 0;
        this.transitioning = true;

        const graded = this._gradeLanding(vy, vx, ang, rocket.x);
        const grade = CONFIG.GRADES[graded.key];

        // Slow-mo + gentle thump
        this.timeScale = 0.3;
        if (this._slowmoTimer) this._slowmoTimer.remove();
        this._slowmoTimer = this.time.delayedCall(650, () => { this.timeScale = 1; });
        this.cameras.main.shake(180, 0.004);

        if (this.audio) {
            this.audio.stopThrust();
            this.audio.stopLowFuelWarning();
            this.audio.stopReentryWhoosh();
            this.audio.stopWindRush();
            this.audio.playLanding();
        }
        this._lowFuelWarning = false; // re-arm so a low top-up can warn again
        this.vfx.stopAllThrust();
        this.vfx.stopReentryGlow();
        this.vfx.emitOceanSpray(rocket.x, rocket.getBottomY());

        // ----- SCORING (score at current chain, then step it) -----
        const precisionBonus = ship.getPrecisionScore(rocket.x);
        const softness = Math.floor(Math.max(0, CONFIG.LAND_MAX_VY - vy) * CONFIG.SOFTNESS_BONUS_MULTIPLIER);
        const base = CONFIG.BASE_LANDING_SCORE + precisionBonus + softness;
        const landingScore = Math.round(base * grade.mult * this.chain);
        this.runScore += landingScore;
        this.landingsCompleted++;

        // Credits banked immediately (kept even if the run later crashes)
        const credits = Math.floor(landingScore / CONFIG.CREDITS_PER_SCORE * this.eff.creditsMult);
        this.creditsThisRun += credits;
        if (credits > 0) CONFIG.addCredits(credits);

        // Fuel top-up by grade (never exceeds max). Track the REALIZED gain so the
        // grade stamp doesn't overstate the refuel when the tank is near full.
        const topup = CONFIG.FUEL_TOPUP[graded.key] * this.eff.topupMult;
        const fuelBefore = rocket.fuel;
        rocket.fuel = Math.min(this.eff.fuelMax, rocket.fuel + topup);
        const fuelGained = rocket.fuel - fuelBefore;

        // Chain step AFTER scoring this landing
        this.chain = Math.min(CONFIG.CHAIN_MAX, this.chain + grade.chainStep);
        this.bestChainThisRun = Math.max(this.bestChainThisRun, this.chain);

        // Chain-pitched chime + fireworks for clean landings
        if (this.audio) {
            const pitch = 440 + Math.min(this.chain, CONFIG.CHAIN_MAX) * 70;
            this.audio.playBeep(pitch, 0.12);
        }
        if (graded.key === 'perfect' || graded.key === 'great') {
            this.time.delayedCall(450, () => this.vfx.emitFireworks(rocket.x, rocket.y - 50));
        }

        this._showGradeStamp(graded, grade, landingScore, credits, fuelGained);
        this._pulseChain();

        // Advance to the next, harder landing
        this.time.delayedCall(1100, () => this._advanceLanding());
    }

    _advanceLanding() {
        const carriedFuel = this.rocket.fuel;
        const nextN = this.landingIndex + 1;
        const cam = this.cameras.main;
        cam.fadeOut(220, 0, 0, 0);
        cam.once('camerafadeoutcomplete', () => {
            this._startLanding(nextN, carriedFuel);
            this.transitioning = false;
            cam.fadeIn(260, 0, 0, 0);
        });
    }

    _onCrash(surface) {
        const rocket = this.rocket;
        if (!rocket.alive) return;
        rocket.alive = false;
        this.transitioning = true;

        this.cameras.main.shake(500, 0.025);
        if (this._screenFlash) {
            this._screenFlash.setAlpha(0.35);
            this.tweens.add({ targets: this._screenFlash, alpha: 0, duration: 400, ease: 'Quad.easeOut' });
        }

        if (this.audio) {
            this.audio.stopThrust();
            this.audio.stopLowFuelWarning();
            this.audio.stopReentryWhoosh();
            this.audio.stopWindRush();
            this.audio.playCrash();
        }
        this.vfx.stopAllThrust();
        this.vfx.stopReentryGlow();
        this.vfx.emitExplosion(rocket.x, rocket.y);
        if (surface === 'water') this.vfx.emitOceanSpray(rocket.x, rocket.getBottomY());

        this.time.delayedCall(900, () => this._endRun());
    }

    _endRun() {
        this.runOver = true;
        this.transitioning = true;

        // Persist bests
        const prevHi = parseInt(localStorage.getItem(CONFIG.HIGH_SCORE_KEY) || '0', 10);
        const newHi = this.runScore > prevHi;
        if (newHi) localStorage.setItem(CONFIG.HIGH_SCORE_KEY, this.runScore.toString());

        const prevChain = parseFloat(localStorage.getItem(CONFIG.BEST_CHAIN_KEY) || '1');
        if (this.bestChainThisRun > prevChain) {
            localStorage.setItem(CONFIG.BEST_CHAIN_KEY, this.bestChainThisRun.toFixed(1));
        }
        const prevLandings = parseInt(localStorage.getItem(CONFIG.BEST_LANDINGS_KEY) || '0', 10);
        if (this.landingsCompleted > prevLandings) {
            localStorage.setItem(CONFIG.BEST_LANDINGS_KEY, this.landingsCompleted.toString());
        }

        this._showSummaryCard(newHi);
    }

    // Confirm = restart a fresh run (from crash summary or anytime mid-air it's ignored)
    _onConfirm() {
        if (this.runOver) this._restartRun();
    }

    _restartRun() {
        if (this._leaving) return;   // guard against double restart in one step
        this._leaving = true;
        if (this.audio) {
            this.audio.stopThrust();
            this.audio.stopLowFuelWarning();
            this.audio.stopReentryWhoosh();
            this.audio.stopWindRush();
        }
        if (this.vfx) { this.vfx.destroy(); this.vfx = null; }
        if (this.hudCamera) { this.cameras.remove(this.hudCamera); this.hudCamera = null; }
        this.timeScale = 1;
        this.scene.restart();
    }

    _toHangar() {
        if (this._leaving) return;
        this._leaving = true;
        if (this.audio) {
            this.audio.stopThrust();
            this.audio.stopLowFuelWarning();
            this.audio.stopReentryWhoosh();
            this.audio.stopWindRush();
        }
        if (this.vfx) { this.vfx.destroy(); this.vfx = null; }
        if (this.hudCamera) { this.cameras.remove(this.hudCamera); this.hudCamera = null; }
        this.timeScale = 1;
        this.scene.start('HangarScene');
    }

    // ===================== HUD =====================
    _createHUD() {
        const w = CONFIG.WIDTH;
        const h = CONFIG.HEIGHT;
        const mono = 'JetBrains Mono, Courier New, monospace';
        const style = { fontSize: '13px', fontFamily: mono, color: CONFIG.COLORS.HUD_TEXT };

        this.hudTexts = {};

        // Top-center: big altitude + speed gate
        this.hudTexts.altBig = this.add.text(w / 2, 8, 'ALT 0m', {
            fontSize: '22px', fontFamily: mono, color: '#ffffff', fontStyle: 'bold'
        }).setOrigin(0.5, 0).setDepth(12);
        this.hudTexts.vSpeedBig = this.add.text(w / 2, 34, '0 m/s', {
            fontSize: '12px', fontFamily: mono, color: '#88aacc'
        }).setOrigin(0.5, 0).setDepth(12);

        // Left column: telemetry vs gate
        this.hudTexts.vSpeed = this.add.text(10, 10, 'V-SPD', style).setDepth(10);
        this.hudTexts.hSpeed = this.add.text(10, 28, 'H-SPD', style).setDepth(10);
        this.hudTexts.angle = this.add.text(10, 46, 'TILT', style).setDepth(10);

        // Fuel
        this.hudTexts.fuelLabel = this.add.text(10, 72, 'FUEL', style).setDepth(10);
        this.fuelBarBg = this.add.rectangle(70, 83, 120, 10, 0x333333, 1)
            .setStrokeStyle(1, 0x666666, 1).setDepth(10);
        this.fuelBarFg = this.add.rectangle(11, 78, 118, 8, CONFIG.COLORS.FUEL_FULL, 1)
            .setOrigin(0, 0).setDepth(11);

        // Right column: run stats
        const rStyle = { ...style, align: 'right' };
        this.hudTexts.score = this.add.text(w - 10, 10, 'SCORE 0', { ...rStyle, fontSize: '15px', color: '#ffffff', fontStyle: 'bold' }).setOrigin(1, 0).setDepth(10);
        this.hudTexts.landing = this.add.text(w - 10, 30, 'LANDING 1', { ...rStyle, fontSize: '12px', color: '#88aacc' }).setOrigin(1, 0).setDepth(10);
        this.hudTexts.credits = this.add.text(w - 10, 48, '+0 ⚡', { ...rStyle, fontSize: '12px', color: CONFIG.COLORS.CREDIT }).setOrigin(1, 0).setDepth(10);

        // Chain multiplier — big, center-ish under altitude
        this.hudTexts.chain = this.add.text(w / 2, 56, 'CHAIN x1.0', {
            fontSize: '20px', fontFamily: mono, color: '#7cff5a', fontStyle: 'bold'
        }).setOrigin(0.5, 0).setDepth(13);

        // Ship distance hint
        this.hudTexts.shipDist = this.add.text(w / 2, 84, '', {
            fontSize: '11px', fontFamily: mono, color: '#88aacc'
        }).setOrigin(0.5, 0).setDepth(12);

        // Mute indicator
        this.muteText = this.add.text(w - 10, h - 8, '', {
            fontSize: '11px', fontFamily: mono, color: '#ff4444'
        }).setOrigin(1, 1).setDepth(15);

        // Screen flash for crashes (HUD-space, not zoomed)
        this._screenFlash = this.add.rectangle(w / 2, h / 2, w, h, 0xff6600, 0).setDepth(25);

        // Pause overlay
        this.pauseOverlay = this.add.graphics().setDepth(26).setVisible(false);
        this.pauseText = this.add.text(w / 2, h / 2, 'PAUSED\n\nP / ESC resume   •   R restart', {
            fontSize: '22px', fontFamily: mono, color: '#ffffff', align: 'center'
        }).setOrigin(0.5).setDepth(27).setVisible(false);

        // Collect HUD objects for camera isolation
        this._hudObjects = [
            this.hudTexts.altBig, this.hudTexts.vSpeedBig,
            this.hudTexts.vSpeed, this.hudTexts.hSpeed, this.hudTexts.angle,
            this.hudTexts.fuelLabel, this.fuelBarBg, this.fuelBarFg,
            this.hudTexts.score, this.hudTexts.landing, this.hudTexts.credits,
            this.hudTexts.chain, this.hudTexts.shipDist, this.muteText,
            this._screenFlash, this.pauseOverlay, this.pauseText, this.windGraphics
        ];
        this._updateMuteIndicator();
    }

    _updateHUD(altitude) {
        const rocket = this.rocket;
        const alt = Math.max(0, altitude);

        const altFmt = alt >= 1000 ? `${(alt / 1000).toFixed(1)}km` : `${Math.floor(alt)}m`;
        this.hudTexts.altBig.setText(`ALT ${altFmt}`);
        let altColor = '#ffffff';
        if (alt < 200) altColor = (Math.sin(Date.now() / 100) > 0 ? '#ff2222' : '#ff6644');
        else if (alt < 500) altColor = '#ff4444';
        else if (alt < 1500) altColor = '#ffcc44';
        this.hudTexts.altBig.setColor(altColor);

        const vy = rocket.vy;
        const safeVy = alt > 3000 ? 130 : alt > 1500 ? 80 : alt > 600 ? 50 : CONFIG.LAND_MAX_VY;
        this.hudTexts.vSpeedBig.setText(`${vy.toFixed(0)} / ${safeVy} m/s`);
        this.hudTexts.vSpeedBig.setColor(Math.abs(vy) <= safeVy ? '#44ff88' : '#ff4444');

        const vyDanger = Math.abs(rocket.vy) > CONFIG.LAND_MAX_VY;
        const vxDanger = Math.abs(rocket.vx) > CONFIG.LAND_MAX_VX;
        const angDanger = Math.abs(rocket.angle) > CONFIG.LAND_MAX_ANGLE;
        this.hudTexts.vSpeed.setText(`V-SPD ${rocket.vy.toFixed(1)} / ${CONFIG.LAND_MAX_VY}`).setColor(vyDanger ? CONFIG.COLORS.HUD_WARNING : CONFIG.COLORS.HUD_TEXT);
        this.hudTexts.hSpeed.setText(`H-SPD ${rocket.vx.toFixed(1)} / ${CONFIG.LAND_MAX_VX}`).setColor(vxDanger ? CONFIG.COLORS.HUD_WARNING : CONFIG.COLORS.HUD_TEXT);
        this.hudTexts.angle.setText(`TILT ${rocket.angle.toFixed(1)} / ${CONFIG.LAND_MAX_ANGLE}`).setColor(angDanger ? CONFIG.COLORS.HUD_WARNING : CONFIG.COLORS.HUD_TEXT);

        this.hudTexts.score.setText(`SCORE ${this.runScore}`);
        this.hudTexts.landing.setText(`LANDING ${this.landingIndex}`);
        this.hudTexts.credits.setText(`+${this.creditsThisRun} ⚡`);

        // Chain multiplier — tint hotter as it climbs
        const c = this.chain;
        this.hudTexts.chain.setText(`CHAIN x${c.toFixed(1)}`);
        let chainColor = '#7cff5a';
        if (c >= 6) chainColor = '#ff4466';
        else if (c >= 4) chainColor = '#ff8a3a';
        else if (c >= 2.5) chainColor = '#ffd24a';
        this.hudTexts.chain.setColor(chainColor);

        // Ship distance / alignment. Green "ON TARGET" matches the actual scoring
        // bullseye (targetZoneWidth); yellow "NUDGE" means over the deck but off the
        // bullseye (capped at GOOD); otherwise show the distance to close.
        const dx = this.droneShip.x - rocket.x;
        const dist = Math.abs(dx);
        const dir = dx > 0 ? '→' : '←';
        if (dist <= this.droneShip.targetZoneWidth / 2) {
            this.hudTexts.shipDist.setText('▼ ON TARGET ▼').setColor('#44ff88');
        } else if (dist <= this.droneShip.width / 2) {
            this.hudTexts.shipDist.setText(`NUDGE ${dir}`).setColor('#ffd24a');
        } else {
            this.hudTexts.shipDist.setText(`SHIP ${Math.floor(dist * CONFIG.ALTITUDE_SCALE)}m ${dir}`).setColor('#88aacc');
        }

        // Fuel bar
        const fuelPct = rocket.fuel / this.eff.fuelMax;
        this.fuelBarFg.width = Math.max(0, 118 * fuelPct);
        this.fuelBarFg.setFillStyle(fuelPct > 0.3 ? CONFIG.COLORS.FUEL_FULL : CONFIG.COLORS.FUEL_LOW, 1);
    }

    _drawWind() {
        this.windGraphics.clear();
        if (!this.wind) return;
        const cx = CONFIG.WIDTH / 2;
        const y = 112;
        const len = Math.min(Math.abs(this.wind) * 3, 60);
        const dir = this.wind > 0 ? 1 : -1;
        this.windGraphics.lineStyle(2, CONFIG.COLORS.WIND_ARROW, 0.7);
        this.windGraphics.beginPath();
        this.windGraphics.moveTo(cx - len * dir / 2, y);
        this.windGraphics.lineTo(cx + len * dir / 2, y);
        this.windGraphics.lineTo(cx + len * dir / 2 - 8 * dir, y - 5);
        this.windGraphics.moveTo(cx + len * dir / 2, y);
        this.windGraphics.lineTo(cx + len * dir / 2 - 8 * dir, y + 5);
        this.windGraphics.strokePath();
    }

    // Landing banner: "LANDING N" + difficulty hint, brief
    _showLandingBanner(N, def) {
        const w = CONFIG.WIDTH;
        const txt = this._hudOnly(this.add.text(w / 2, CONFIG.HEIGHT * 0.34, `LANDING ${N}`, {
            fontSize: '26px', fontFamily: 'JetBrains Mono, monospace', color: '#ffffff',
            fontStyle: 'bold', letterSpacing: 4
        }).setOrigin(0.5).setDepth(16).setAlpha(0));
        this.tweens.add({ targets: txt, alpha: 1, duration: 250, yoyo: true, hold: 600,
            onComplete: () => txt.destroy() });
    }

    _showGradeStamp(graded, grade, landingScore, credits, fuelGained) {
        const w = CONFIG.WIDTH;
        const cy = CONFIG.HEIGHT * 0.40;

        const main = this._hudOnly(this.add.text(w / 2, cy, grade.label, {
            fontSize: '46px', fontFamily: 'JetBrains Mono, monospace', color: grade.color,
            fontStyle: 'bold', letterSpacing: 2
        }).setOrigin(0.5).setDepth(18).setScale(1.5).setAlpha(0));

        let sub = `+${landingScore}`;
        if (graded.key !== 'perfect') sub += `   • ${graded.limit}`;
        const subText = this._hudOnly(this.add.text(w / 2, cy + 36, sub, {
            fontSize: '16px', fontFamily: 'JetBrains Mono, monospace', color: '#ffffff'
        }).setOrigin(0.5).setDepth(18).setAlpha(0));

        const fuelStr = fuelGained > 0 ? `+${Math.round(fuelGained)} fuel` : 'tank full';
        const extra = this._hudOnly(this.add.text(w / 2, cy + 58,
            `${fuelStr}${credits > 0 ? `   +${credits} ⚡` : ''}`, {
            fontSize: '12px', fontFamily: 'JetBrains Mono, monospace', color: '#88ccaa'
        }).setOrigin(0.5).setDepth(18).setAlpha(0));

        this.tweens.add({ targets: main, scaleX: 1, scaleY: 1, alpha: 1, duration: 220, ease: 'Back.easeOut' });
        this.tweens.add({ targets: [subText, extra], alpha: 1, duration: 220, delay: 120 });
        this.tweens.add({ targets: [main, subText, extra], alpha: 0, y: '-=16', delay: 850, duration: 350,
            onComplete: () => { main.destroy(); subText.destroy(); extra.destroy(); } });
    }

    _pulseChain() {
        const t = this.hudTexts.chain;
        this.tweens.add({ targets: t, scaleX: 1.4, scaleY: 1.4, duration: 140, yoyo: true, ease: 'Quad.easeOut' });
    }

    _showSummaryCard(newHi) {
        const w = CONFIG.WIDTH;
        const h = CONFIG.HEIGHT;

        const dim = this._hudOnly(this.add.rectangle(w / 2, h / 2, w, h, 0x05060c, 0).setDepth(30));
        this.tweens.add({ targets: dim, fillAlpha: 0.72, duration: 300 });

        const cardY = h / 2;
        const panel = this._hudOnly(this.add.graphics().setDepth(31));
        const pw = 360, ph = 280, px = w / 2 - pw / 2, py = cardY - ph / 2;
        panel.fillStyle(0x0c1018, 0.96); panel.fillRoundedRect(px, py, pw, ph, 8);
        panel.lineStyle(1, 0xff4466, 0.5); panel.strokeRoundedRect(px, py, pw, ph, 8);
        panel.fillStyle(0xff4466, 0.9); panel.fillRect(px, py, pw, 3);

        const els = [dim, panel];
        const add = (yy, str, st) => {
            const o = this._hudOnly(this.add.text(w / 2, yy, str, st).setOrigin(0.5).setDepth(32));
            els.push(o); return o;
        };
        const mono = 'JetBrains Mono, monospace';
        add(py + 26, 'RUN COMPLETE', { fontSize: '12px', fontFamily: mono, color: '#ff6688', letterSpacing: 4 });
        add(py + 64, `${this.runScore}`, { fontSize: '46px', fontFamily: mono, color: '#ffffff', fontStyle: 'bold' });
        add(py + 96, 'RUN SCORE', { fontSize: '10px', fontFamily: mono, color: '#667788', letterSpacing: 3 });
        if (newHi) {
            const hs = add(py + 118, '★ NEW BEST ★', { fontSize: '13px', fontFamily: mono, color: '#44ffcc', fontStyle: 'bold', letterSpacing: 2 });
            this.tweens.add({ targets: hs, alpha: { from: 1, to: 0.4 }, duration: 600, yoyo: true, repeat: -1 });
        }

        const statY = py + 146;
        add(statY, `LANDINGS  ${this.landingsCompleted}`, { fontSize: '14px', fontFamily: mono, color: '#cfe' });
        add(statY + 22, `BEST CHAIN  x${this.bestChainThisRun.toFixed(1)}`, { fontSize: '14px', fontFamily: mono, color: '#cfe' });
        add(statY + 44, `CREDITS EARNED  +${this.creditsThisRun} ⚡`, { fontSize: '14px', fontFamily: mono, color: CONFIG.COLORS.CREDIT });

        const launch = add(py + ph - 44, '▲ / TAP — LAUNCH AGAIN', { fontSize: '14px', fontFamily: mono, color: '#ffffff', fontStyle: 'bold' });
        this.tweens.add({ targets: launch, alpha: { from: 1, to: 0.5 }, duration: 800, yoyo: true, repeat: -1 });
        const hangarLabel = add(py + ph - 20, 'H / TAP HERE — HANGAR & UPGRADES', { fontSize: '12px', fontFamily: mono, color: '#9fd0ff' });

        // tween whole card in
        els.forEach(o => { if (o.setAlpha && o !== dim) { o.setAlpha(0); this.tweens.add({ targets: o, alpha: 1, duration: 300, delay: 150 }); } });

        // Tappable zones. topOnly (Phaser default) makes the higher-depth hangar
        // zone win where the two overlap, so a tap on the hangar label opens the
        // shop and a tap anywhere else on the card relaunches.
        const launchZone = this._hudOnly(this.add.zone(w / 2, cardY, pw, ph).setDepth(33)
            .setInteractive({ useHandCursor: true }));
        launchZone.on('pointerdown', () => { if (this.runOver) this._restartRun(); });
        const hangarZone = this._hudOnly(this.add.zone(w / 2, hangarLabel.y, pw - 30, 34).setDepth(34)
            .setInteractive({ useHandCursor: true }));
        hangarZone.on('pointerdown', () => { if (this.runOver) this._toHangar(); });
    }

    // ===================== CONTROLS =====================
    _togglePause() {
        // Don't pause during the brief landing-celebration / crash windows — their
        // timers and tweens drive the run forward and must not freeze mid-state.
        if (this.runOver || this.transitioning) return;
        this.paused = !this.paused;
        this.pauseOverlay.setVisible(this.paused);
        this.pauseText.setVisible(this.paused);
        if (this.paused) {
            // Freeze the real engine, not just the update() body: halt the scene
            // clock (delayedCall timers) and all tweens so nothing advances.
            this.time.paused = true;
            this.tweens.pauseAll();
            this.pauseOverlay.clear();
            this.pauseOverlay.fillStyle(0x000000, 0.6);
            this.pauseOverlay.fillRect(0, 0, CONFIG.WIDTH, CONFIG.HEIGHT);
            if (this.audio) {
                this.audio.stopThrust();
                this.audio.stopLowFuelWarning();
                this.audio.stopReentryWhoosh();
                this.audio.stopWindRush();
            }
        } else {
            this.time.paused = false;
            this.tweens.resumeAll();
        }
    }

    _toggleMute() {
        if (this.audio) { this.audio.toggleMute(); this._updateMuteIndicator(); }
    }

    _updateMuteIndicator() {
        this.muteText.setText(this.audio && this.audio.muted ? 'MUTED' : '');
    }

    shutdown() {
        if (this.audio) {
            this.audio.stopThrust();
            this.audio.stopLowFuelWarning();
            this.audio.stopReentryWhoosh();
            this.audio.stopWindRush();
        }
        if (this.vfx) this.vfx.destroy();
        if (this.hudCamera) { this.cameras.remove(this.hudCamera); this.hudCamera = null; }
        this.timeScale = 1;
    }
}
