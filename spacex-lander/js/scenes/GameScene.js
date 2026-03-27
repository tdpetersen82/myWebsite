// SpaceX Lander - Game Scene (3-Phase Gameplay)

class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameScene' });
    }

    init(data) {
        this.level = data.level || 1;
        this.score = data.score || 0;
        this.lives = data.lives !== undefined ? data.lives : CONFIG.STARTING_LIVES;
        this.paused = false;
        this.gameOver = false;
        this.landingResult = null;
        this.currentPhase = 1;
        this._prevPhase = 1;
        this.timeScale = 1;
        this._slowmoTimer = null;
        this._handoverCountdown = CONFIG.HANDOVER_COUNTDOWN || 3;
        this._playerHasControl = false;
    }

    create() {
        const w = CONFIG.WIDTH;
        const h = CONFIG.HEIGHT;
        const lvl = CONFIG.LEVEL;

        // Audio
        this.audio = window.audioManager;
        if (this.audio) this.audio.init();

        // --- SKY ---
        this.sky = new Sky(this);
        this.skyGraphics = this.add.graphics().setDepth(0);

        // --- OCEAN ---
        this.ocean = new Ocean(this, this.level);
        this.oceanGraphics = this.add.graphics().setDepth(1);

        // --- DRONE SHIP ---
        this.droneShip = new DroneShip(this, this.level);
        this.shipGraphics = this.add.graphics().setDepth(2);

        // --- ROCKET ---
        const startX = 100 + Math.random() * (w - 200);
        const fuelPenalty = this.level >= lvl.FUEL_PENALTY_START_LEVEL
            ? Math.min(lvl.FUEL_PENALTY_MAX, (this.level - lvl.FUEL_PENALTY_START_LEVEL) * lvl.FUEL_PENALTY_PER_LEVEL)
            : 0;
        this.rocket = new Rocket(this, startX, CONFIG.START_Y || -120);
        this.rocket.fuel = CONFIG.FUEL_MAX * (1 - fuelPenalty);
        this.rocketGraphics = this.add.graphics().setDepth(4);

        // --- VFX ---
        this.vfx = new VFXManager(this);

        // --- WIND ---
        this.wind = 0;
        if (this.level >= lvl.WIND_START_LEVEL) {
            const maxWind = CONFIG.LEVEL.WIND_MAX;
            const windForce = Math.min(maxWind, (this.level - lvl.WIND_START_LEVEL + 1) * lvl.WIND_PER_LEVEL);
            this.wind = (Math.random() - 0.5) * 2 * windForce;
        }
        this.windGraphics = this.add.graphics().setDepth(6);

        // --- INPUT ---
        this.cursors = this.input.keyboard.createCursorKeys();
        this.wasd = {
            up: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
            left: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
            right: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D)
        };

        this.input.keyboard.on('keydown-P', () => this._togglePause());
        this.input.keyboard.on('keydown-ESC', () => this._togglePause());
        this.input.keyboard.on('keydown-M', () => this._toggleMute());

        // --- HUD ---
        this._createHUD();

        // --- PAUSE OVERLAY ---
        this.pauseOverlay = this.add.graphics().setDepth(20).setVisible(false);
        this.pauseText = this.add.text(w / 2, h / 2, 'PAUSED\n\nPress P or ESC to resume', {
            fontSize: '28px',
            fontFamily: 'Courier New, monospace',
            color: '#ffffff',
            align: 'center'
        }).setOrigin(0.5).setDepth(21).setVisible(false);

        // Mute indicator
        this.muteText = this.add.text(w - 10, 10, '', {
            fontSize: '12px',
            fontFamily: 'Courier New, monospace',
            color: '#ff4444'
        }).setOrigin(1, 0).setDepth(15);
        this._updateMuteIndicator();

        // Cleanup on shutdown
        this.events.on('shutdown', this.shutdown, this);

        // State tracking
        this._lowFuelWarning = false;
        this._legsAutoDeployed = false;
        this._phaseTextTimer = null;

        // Handover countdown text (upper area, clear of rocket)
        this._handoverText = this.add.text(w / 2, h * 0.28 + 30, '', {
            fontSize: '52px',
            fontFamily: 'Courier New, monospace',
            color: '#ffffff',
            fontStyle: 'bold',
            align: 'center'
        }).setOrigin(0.5).setDepth(16);

        this._handoverLabel = this.add.text(w / 2, h * 0.28 - 10, 'CONTROL IN', {
            fontSize: '14px',
            fontFamily: 'Courier New, monospace',
            color: '#88aacc',
            letterSpacing: 4
        }).setOrigin(0.5).setDepth(16);

        // --- DUAL CAMERA SETUP ---
        // HUD camera: never zooms/scrolls, renders only HUD elements
        // Main camera: zooms/scrolls, renders only game world
        this.hudCamera = this.cameras.add(0, 0, w, h);
        this.hudCamera.setName('hud');

        // Collect all HUD objects to isolate them from main camera
        this._hudObjects = [
            ...Object.values(this.hudTexts),
            this.fuelBarBg, this.fuelBarFg,
            this._altBarBg, this._altBarFg,
            this.pauseOverlay, this.pauseText,
            this.muteText, this.windGraphics,
            this._handoverText, this._handoverLabel
        ].filter(Boolean);

        // Collect world objects to isolate from HUD camera
        this._worldObjects = [
            this.skyGraphics, this.oceanGraphics,
            this.shipGraphics, this.rocketGraphics
        ];

        // HUD objects: hide from main camera
        this._hudObjects.forEach(obj => this.cameras.main.ignore(obj));

        // World objects: hide from HUD camera
        this._worldObjects.forEach(obj => this.hudCamera.ignore(obj));

        // VFX particles: hide from HUD camera
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

        // Screen flash overlay for explosions (on HUD camera, not zoomed)
        this._screenFlash = this.add.rectangle(
            w / 2, h / 2, w, h, 0xff6600, 0
        ).setDepth(25);
        this.cameras.main.ignore(this._screenFlash);

        // Phase overlay text (must be after camera setup)
        this._showPhaseText('RE-ENTRY', CONFIG.COLORS.HUD_PHASE_1);
    }

    // --- UPDATE LOOP ---
    update(time, delta) {
        if (this.paused || this.gameOver) return;
        delta = Math.min(delta, 50) * this.timeScale;

        const rocket = this.rocket;
        const ocean = this.ocean;
        const ship = this.droneShip;

        // --- HANDOVER COUNTDOWN ---
        if (!this._playerHasControl) {
            this._handoverCountdown -= delta / 1000;
            if (this._handoverCountdown <= 0) {
                this._playerHasControl = true;
                this._handoverText.setVisible(false);
                this._handoverLabel.setVisible(false);
                if (this.audio) this.audio.playCountdownBeep(true);
            } else {
                const sec = Math.ceil(this._handoverCountdown);
                this._handoverText.setText(sec.toString());
                if (this.audio && Math.ceil(this._handoverCountdown + delta / 1000) !== sec) {
                    this.audio.playCountdownBeep(false);
                }
            }
        }

        // Calculate altitude
        const altitude = rocket.getAltitude(ocean, ship);

        // --- DYNAMIC CAMERA ZOOM ---
        const cam = this.cameras.main;
        const targetZoom = Phaser.Math.Clamp(
            Phaser.Math.Linear(1.35, 0.45, altitude / 8000),
            0.45, 1.35
        );
        const newZoom = cam.zoom + (targetZoom - cam.zoom) * 0.025;
        cam.setZoom(newZoom);
        cam.centerOn(rocket.x, rocket.y);

        // Phase transitions
        this._updatePhase(altitude);

        // Update entities
        this.sky.update(delta, altitude);
        ocean.update(delta);
        ship.update(delta, ocean);
        ship.updateProximity(altitude);
        rocket.update(delta, CONFIG.GRAVITY, this.wind, this.currentPhase, this._playerHasControl);

        // Auto-deploy legs
        if (!this._legsAutoDeployed && altitude < CONFIG.LEG_DEPLOY_ALTITUDE && this.currentPhase === 3) {
            this._legsAutoDeployed = true;
            rocket.deployLegs();
            if (this.audio) this.audio.playLegDeploy();
        }

        // --- THRUST VFX ---
        if (rocket.thrusting) {
            if (this.audio && !this.audio.thrustNode) {
                this.audio.startThrust(rocket.engineMode);
            }
            const nozzles = rocket.getNozzlePositions();
            if (rocket.engineMode === 'entry') {
                // Use center nozzle for entry burn VFX
                const center = nozzles[Math.floor(nozzles.length / 2)];
                this.vfx.startEntryBurn(center.x, center.y, rocket.angle);
                this.vfx.stopLandingBurn();
            } else {
                const center = nozzles[0];
                this.vfx.startLandingBurn(center.x, center.y, rocket.angle);
                this.vfx.stopEntryBurn();
            }
        } else {
            if (this.audio) this.audio.stopThrust();
            this.vfx.stopAllThrust();
        }

        // --- DECK BLAST VFX (exhaust hitting the ship) ---
        if (rocket.thrusting && this.currentPhase === 3 && altitude < 800 && ship.containsX(rocket.x)) {
            const intensity = 1 - altitude / 800;
            const deckY = ship.getHeightAt(rocket.x);
            this.vfx.emitDeckBlast(rocket.x, deckY, intensity);
        }

        // --- RE-ENTRY GLOW VFX ---
        if (rocket.reentryHeat > 0.1) {
            const nozzle = rocket.getNozzlePosition();
            this.vfx.startReentryGlow(nozzle.x, nozzle.y, rocket.angle);
            if (this.audio && !this.audio.reentryNode) this.audio.startReentryWhoosh();
        } else {
            this.vfx.stopReentryGlow();
            if (this.audio) this.audio.stopReentryWhoosh();
        }

        // --- LOW FUEL WARNING ---
        if (rocket.fuel > 0 && rocket.fuel < CONFIG.LOW_FUEL_THRESHOLD && !this._lowFuelWarning) {
            this._lowFuelWarning = true;
            if (this.audio) this.audio.startLowFuelWarning();
        } else if ((rocket.fuel <= 0 || rocket.fuel >= CONFIG.LOW_FUEL_THRESHOLD) && this._lowFuelWarning) {
            this._lowFuelWarning = false;
            if (this.audio) this.audio.stopLowFuelWarning();
        }

        // --- WIND RUSH AUDIO ---
        if (this.audio) {
            const speed = Math.sqrt(rocket.vx * rocket.vx + rocket.vy * rocket.vy);
            this.audio.updateWindRush(speed);
        }

        // --- COLLISION ---
        if (this.currentPhase >= 2) {
            this._checkCollision();
        }

        // --- DRAW ---
        this.skyGraphics.clear();
        this.sky.draw(this.skyGraphics);

        this.oceanGraphics.clear();
        ocean.draw(this.oceanGraphics);

        this.shipGraphics.clear();
        ship.draw(this.shipGraphics);

        this.rocketGraphics.clear();
        rocket.draw(this.rocketGraphics);

        this._drawWind();
        this._updateHUD();
    }

    _updatePhase(altitude) {
        if (altitude > CONFIG.PHASE_2_ALTITUDE) {
            this.currentPhase = 1;
        } else if (altitude > CONFIG.PHASE_3_ALTITUDE) {
            this.currentPhase = 2;
        } else {
            this.currentPhase = 3;
        }

        if (this.currentPhase !== this._prevPhase) {
            this._onPhaseTransition(this._prevPhase, this.currentPhase);
            this._prevPhase = this.currentPhase;
        }
    }

    _onPhaseTransition(from, to) {
        if (this.audio) this.audio.playPhaseTransition();
        this.score += CONFIG.PHASE_TRANSITION_BONUS;

        if (to === 2) {
            this._showPhaseText('DESCENT', CONFIG.COLORS.HUD_PHASE_2);
            // Sonic boom on phase 1→2 transition
            if (this.audio) this.audio.playSonicBoom();
            this.vfx.emitSonicBoom(this.rocket.x, this.rocket.y);
            this.cameras.main.shake(250, 0.008);
            // Switch audio mode
            if (this.audio) {
                this.audio.stopReentryWhoosh();
                if (this.audio.thrustNode) {
                    this.audio.stopThrust();
                }
            }
        } else if (to === 3) {
            this._showPhaseText('LANDING BURN', CONFIG.COLORS.HUD_PHASE_3);
            if (this.audio && this.audio.thrustNode) {
                this.audio.stopThrust();
            }
        }
    }

    _showPhaseText(text, color) {
        const w = CONFIG.WIDTH;
        const h = CONFIG.HEIGHT;
        const cy = h / 2 - 50;

        // Helper: register object on HUD camera only
        const hudOnly = (obj) => {
            if (this.hudCamera) this.cameras.main.ignore(obj);
            return obj;
        };

        // Main text — starts invisible and slightly scaled up
        const phaseText = hudOnly(this.add.text(w / 2, cy, text, {
            fontSize: '36px',
            fontFamily: 'Courier New, monospace',
            color: color,
            fontStyle: 'bold'
        }).setOrigin(0.5).setDepth(16).setAlpha(0).setScale(1.3));

        // Subtitle for LANDING BURN
        let subText = null;
        if (text === 'LANDING BURN') {
            subText = hudOnly(this.add.text(w / 2, cy + 36, 'STARTUP', {
                fontSize: '16px',
                fontFamily: 'Courier New, monospace',
                color: color,
                fontStyle: 'bold',
                letterSpacing: 8
            }).setOrigin(0.5).setDepth(16).setAlpha(0));
        }

        // Glow backdrop
        const glow = hudOnly(this.add.rectangle(w / 2, cy, w * 0.6, 60, 0xffffff, 0)
            .setDepth(15));

        // Horizontal sweep line
        const sweep = hudOnly(this.add.rectangle(0, cy, 4, 50, Phaser.Display.Color.HexStringToColor(color).color, 0.9)
            .setDepth(17));

        // Animate sweep line across, then reveal text
        this.tweens.add({
            targets: sweep,
            x: w,
            duration: 350,
            ease: 'Quad.easeOut',
            onStart: () => {
                // Flash the glow backdrop
                this.tweens.add({
                    targets: glow,
                    alpha: { from: 0, to: 0.08 },
                    duration: 200,
                    yoyo: true,
                    hold: 300,
                    onComplete: () => glow.destroy()
                });
            },
            onUpdate: (tween) => {
                // Reveal text as sweep passes center
                if (tween.progress > 0.3 && phaseText.alpha === 0) {
                    phaseText.setAlpha(1).setScale(1);
                    if (subText) {
                        this.time.delayedCall(150, () => subText.setAlpha(1));
                    }
                }
            },
            onComplete: () => sweep.destroy()
        });

        // Scale pop on appear
        this.tweens.add({
            targets: phaseText,
            scaleX: { from: 1.3, to: 1 },
            scaleY: { from: 1.3, to: 1 },
            delay: 120,
            duration: 200,
            ease: 'Back.easeOut'
        });

        // Fade out after display
        this.tweens.add({
            targets: phaseText,
            alpha: 0,
            y: cy - 15,
            delay: 1500,
            duration: 500,
            onComplete: () => phaseText.destroy()
        });
        if (subText) {
            this.tweens.add({
                targets: subText,
                alpha: 0,
                y: cy + 21,
                delay: 1500,
                duration: 500,
                onComplete: () => subText.destroy()
            });
        }
    }

    _checkCollision() {
        const rocket = this.rocket;
        if (!rocket.alive || rocket.landed) return;

        const points = rocket.getCollisionPoints();
        const ship = this.droneShip;
        const ocean = this.ocean;

        for (const pt of points) {
            let groundY;
            let onShip = false;

            if (ship.containsX(pt.x)) {
                groundY = ship.getHeightAt(pt.x);
                onShip = true;
            } else {
                groundY = ocean.getHeightAt(pt.x);
            }

            if (pt.y >= groundY) {
                if (onShip) {
                    const absAngle = Math.abs(rocket.angle);
                    const vy = Math.abs(rocket.vy);
                    const vx = Math.abs(rocket.vx);

                    if (vy < CONFIG.LAND_MAX_VY &&
                        vx < CONFIG.LAND_MAX_VX &&
                        absAngle < CONFIG.LAND_MAX_ANGLE &&
                        rocket.legsDeployed) {
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

    _onLanding() {
        const rocket = this.rocket;
        const ship = this.droneShip;
        rocket.landed = true;
        rocket.vy = 0;
        rocket.vx = 0;
        this.gameOver = true;

        // Slow-motion landing moment
        this.timeScale = 0.25;
        if (this._slowmoTimer) this._slowmoTimer.remove();
        this._slowmoTimer = this.time.delayedCall(700, () => {
            this.timeScale = 1;
        });

        // Screen shake — gentle thump
        this.cameras.main.shake(200, 0.004);

        if (this.audio) {
            this.audio.stopThrust();
            this.audio.stopLowFuelWarning();
            this.audio.stopReentryWhoosh();
            this.audio.stopWindRush();
            this.audio.playLanding();
        }

        this.vfx.stopAllThrust();
        this.vfx.stopReentryGlow();

        // Ocean spray
        this.vfx.emitOceanSpray(rocket.x, rocket.getBottomY());

        // Fireworks
        this.time.delayedCall(600, () => {
            this.vfx.emitFireworks(rocket.x, rocket.y - 50);
        });

        // Scoring
        const landingScore = CONFIG.BASE_LANDING_SCORE;
        const fuelBonus = Math.floor(rocket.fuel * CONFIG.FUEL_BONUS_MULTIPLIER);
        const speedBonus = Math.floor((CONFIG.LAND_MAX_VY - Math.abs(rocket.vy)) * CONFIG.SPEED_BONUS_MULTIPLIER);
        const precisionBonus = ship.getPrecisionScore(rocket.x);
        const totalScore = landingScore + fuelBonus + speedBonus + precisionBonus;

        this.score += totalScore;

        const highScore = parseInt(localStorage.getItem(CONFIG.HIGH_SCORE_KEY) || '0');
        if (this.score > highScore) {
            localStorage.setItem(CONFIG.HIGH_SCORE_KEY, this.score);
        }

        this.landingResult = {
            success: true,
            landingScore,
            fuelBonus,
            speedBonus,
            precisionBonus,
            totalScore,
            vy: Math.abs(rocket.vy).toFixed(1),
            vx: Math.abs(rocket.vx).toFixed(1),
            angle: Math.abs(rocket.angle).toFixed(1),
            fuelRemaining: Math.floor(rocket.fuel),
            totalGameScore: this.score,
            onTarget: ship.isOnTarget(rocket.x)
        };

        this.time.delayedCall(2500, () => {
            this.scene.start('GameOverScene', {
                result: this.landingResult,
                level: this.level,
                score: this.score,
                lives: this.lives
            });
        });
    }

    _onCrash(surface) {
        const rocket = this.rocket;
        rocket.alive = false;
        this.gameOver = true;
        this.lives--;

        // Screen shake — heavy impact
        this.cameras.main.shake(500, 0.025);

        // Screen flash — orange explosion tint
        if (this._screenFlash) {
            this._screenFlash.setAlpha(0.35);
            this.tweens.add({
                targets: this._screenFlash,
                alpha: 0,
                duration: 400,
                ease: 'Quad.easeOut'
            });
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

        if (surface === 'water') {
            this.vfx.emitOceanSpray(rocket.x, rocket.getBottomY());
        }

        const highScore = parseInt(localStorage.getItem(CONFIG.HIGH_SCORE_KEY) || '0');
        if (this.score > highScore) {
            localStorage.setItem(CONFIG.HIGH_SCORE_KEY, this.score);
        }

        this.landingResult = {
            success: false,
            surface,
            vy: Math.abs(rocket.vy).toFixed(1),
            vx: Math.abs(rocket.vx).toFixed(1),
            angle: Math.abs(rocket.angle).toFixed(1),
            legsDeployed: rocket.legsDeployed,
            totalGameScore: this.score,
            livesRemaining: this.lives
        };

        this.time.delayedCall(2500, () => {
            this.scene.start('GameOverScene', {
                result: this.landingResult,
                level: this.level,
                score: this.score,
                lives: this.lives
            });
        });
    }

    _createHUD() {
        const w = CONFIG.WIDTH;
        const h = CONFIG.HEIGHT;
        const style = {
            fontSize: '13px',
            fontFamily: 'Courier New, monospace',
            color: CONFIG.COLORS.HUD_TEXT
        };

        this.hudTexts = {};

        // Left panel
        this.hudTexts.altitude = this.add.text(10, 10, 'ALT: 0', style).setDepth(10);
        this.hudTexts.vSpeed = this.add.text(10, 28, 'V-SPD: 0', style).setDepth(10);
        this.hudTexts.hSpeed = this.add.text(10, 46, 'H-SPD: 0', style).setDepth(10);
        this.hudTexts.angle = this.add.text(10, 64, 'ANG: 0', style).setDepth(10);
        this.hudTexts.phase = this.add.text(10, 88, 'PHASE: RE-ENTRY', {
            ...style, color: CONFIG.COLORS.HUD_PHASE_1, fontSize: '12px'
        }).setDepth(10);

        // Fuel
        this.hudTexts.fuelLabel = this.add.text(10, 110, 'FUEL', style).setDepth(10);
        this.fuelBarBg = this.add.rectangle(10 + 60, 128 + 5, 120, 10, 0x333333, 1)
            .setStrokeStyle(1, 0x666666, 1).setDepth(10);
        this.fuelBarFg = this.add.rectangle(11, 124, 118, 8, CONFIG.COLORS.FUEL_FULL, 1)
            .setOrigin(0, 0).setDepth(11);

        // Right panel
        const rStyle = { ...style, align: 'right' };
        this.hudTexts.score = this.add.text(CONFIG.WIDTH - 10, 10, 'SCORE: 0', rStyle).setOrigin(1, 0).setDepth(10);
        this.hudTexts.level = this.add.text(CONFIG.WIDTH - 10, 28, 'LEVEL: 1', rStyle).setOrigin(1, 0).setDepth(10);
        this.hudTexts.lives = this.add.text(CONFIG.WIDTH - 10, 46, 'LIVES: 3', rStyle).setOrigin(1, 0).setDepth(10);
        this.hudTexts.legs = this.add.text(CONFIG.WIDTH - 10, 68, 'LEGS: STOWED', {
            ...rStyle, fontSize: '11px'
        }).setOrigin(1, 0).setDepth(10);
        this.hudTexts.shipDist = this.add.text(CONFIG.WIDTH - 10, 86, '', {
            ...rStyle, fontSize: '11px', color: '#88aacc'
        }).setOrigin(1, 0).setDepth(10);

        // --- PROMINENT ALTITUDE DISPLAY (top center) ---
        this.hudTexts.altBig = this.add.text(w / 2, 8, 'ALT 0m', {
            fontSize: '22px',
            fontFamily: 'Courier New, monospace',
            color: '#ffffff',
            fontStyle: 'bold'
        }).setOrigin(0.5, 0).setDepth(12);

        this.hudTexts.vSpeedBig = this.add.text(w / 2, 34, '0 m/s', {
            fontSize: '12px',
            fontFamily: 'Courier New, monospace',
            color: '#88aacc'
        }).setOrigin(0.5, 0).setDepth(12);

        // Altitude bar (right edge, vertical)
        this._altBarBg = this.add.rectangle(w - 6, h / 2, 8, h - 20, 0x222233, 0.6)
            .setStrokeStyle(1, 0x444466, 0.5).setDepth(10);
        this._altBarFg = this.add.rectangle(w - 6, h - 10, 6, 0, 0x44ff88, 0.8)
            .setOrigin(0.5, 1).setDepth(11);
        this._altBarMax = h - 20; // max bar height in pixels
    }

    _updateHUD() {
        const rocket = this.rocket;
        const alt = Math.max(0, rocket.getAltitude(this.ocean, this.droneShip));

        this.hudTexts.altitude.setText(`ALT: ${Math.floor(alt)}`);

        // Big altitude display (top center)
        const altFormatted = alt >= 1000 ? `${(alt / 1000).toFixed(1)}km` : `${Math.floor(alt)}m`;
        this.hudTexts.altBig.setText(`ALT ${altFormatted}`);
        // Color: white > yellow < 1500 > red < 500 > pulsing < 200
        let altColor = '#ffffff';
        if (alt < 200) {
            altColor = Math.sin(Date.now() / 100) > 0 ? '#ff2222' : '#ff6644';
        } else if (alt < 500) {
            altColor = '#ff4444';
        } else if (alt < 1500) {
            altColor = '#ffcc44';
        }
        this.hudTexts.altBig.setColor(altColor);

        // V-speed under altitude
        this.hudTexts.vSpeedBig.setText(`${rocket.vy.toFixed(0)} m/s`);
        this.hudTexts.vSpeedBig.setColor(Math.abs(rocket.vy) > CONFIG.LAND_MAX_VY ? '#ff4444' : '#88aacc');

        // Altitude bar
        const startAlt = (CONFIG.OCEAN.WATER_LEVEL - (CONFIG.START_Y || -900)) * CONFIG.ALTITUDE_SCALE;
        const altPct = Phaser.Math.Clamp(alt / startAlt, 0, 1);
        const barH = this._altBarMax * altPct;
        this._altBarFg.height = barH;
        // Color gradient: green > yellow > red
        let barColor = 0x44ff88;
        if (altPct < 0.15) barColor = 0xff3333;
        else if (altPct < 0.3) barColor = 0xffaa33;
        else if (altPct < 0.5) barColor = 0xffff44;
        this._altBarFg.setFillStyle(barColor, 0.8);

        const vyDanger = Math.abs(rocket.vy) > CONFIG.LAND_MAX_VY;
        this.hudTexts.vSpeed.setText(`V-SPD: ${rocket.vy.toFixed(1)}`).setColor(vyDanger ? CONFIG.COLORS.HUD_WARNING : CONFIG.COLORS.HUD_TEXT);

        const vxDanger = Math.abs(rocket.vx) > CONFIG.LAND_MAX_VX;
        this.hudTexts.hSpeed.setText(`H-SPD: ${rocket.vx.toFixed(1)}`).setColor(vxDanger ? CONFIG.COLORS.HUD_WARNING : CONFIG.COLORS.HUD_TEXT);

        const angDanger = Math.abs(rocket.angle) > CONFIG.LAND_MAX_ANGLE;
        this.hudTexts.angle.setText(`ANG: ${rocket.angle.toFixed(1)}`).setColor(angDanger ? CONFIG.COLORS.HUD_WARNING : CONFIG.COLORS.HUD_TEXT);

        // Phase
        const phaseNames = { 1: 'RE-ENTRY', 2: 'DESCENT', 3: 'LANDING BURN' };
        const phaseColors = { 1: CONFIG.COLORS.HUD_PHASE_1, 2: CONFIG.COLORS.HUD_PHASE_2, 3: CONFIG.COLORS.HUD_PHASE_3 };
        this.hudTexts.phase.setText(`PHASE: ${phaseNames[this.currentPhase]}`).setColor(phaseColors[this.currentPhase]);

        this.hudTexts.score.setText(`SCORE: ${this.score}`);
        this.hudTexts.level.setText(`LEVEL: ${this.level}`);
        this.hudTexts.lives.setText(`LIVES: ${this.lives}`);

        // Legs
        this.hudTexts.legs.setText(`LEGS: ${rocket.legsDeployed ? 'DEPLOYED' : 'STOWED'}`)
            .setColor(rocket.legsDeployed ? '#44ff88' : '#aabbcc');

        // Ship distance
        const dx = this.droneShip.x - rocket.x;
        const dist = Math.abs(dx);
        if (dist > this.droneShip.width) {
            const dir = dx > 0 ? '\u2192' : '\u2190';
            this.hudTexts.shipDist.setText(`SHIP: ${Math.floor(dist * CONFIG.ALTITUDE_SCALE)}m ${dir}`);
        } else {
            this.hudTexts.shipDist.setText('SHIP: ALIGNED');
        }

        // Fuel bar
        const fuelMax = CONFIG.FUEL_MAX;
        const fuelPct = rocket.fuel / fuelMax;
        const fuelColor = fuelPct > 0.3 ? CONFIG.COLORS.FUEL_FULL : CONFIG.COLORS.FUEL_LOW;
        this.fuelBarFg.width = Math.max(0, 118 * fuelPct);
        this.fuelBarFg.setFillStyle(fuelColor, 1);
    }

    _drawWind() {
        this.windGraphics.clear();
        if (this.wind === 0) return;

        const cx = CONFIG.WIDTH / 2;
        const y = 15;
        const len = Math.min(Math.abs(this.wind) * 3, 60);
        const dir = this.wind > 0 ? 1 : -1;

        this.windGraphics.lineStyle(2, CONFIG.COLORS.WIND_ARROW, 0.8);
        this.windGraphics.beginPath();
        this.windGraphics.moveTo(cx - len * dir / 2, y);
        this.windGraphics.lineTo(cx + len * dir / 2, y);
        this.windGraphics.lineTo(cx + len * dir / 2 - 8 * dir, y - 5);
        this.windGraphics.moveTo(cx + len * dir / 2, y);
        this.windGraphics.lineTo(cx + len * dir / 2 - 8 * dir, y + 5);
        this.windGraphics.strokePath();

        if (!this._windLabel || this._windLabel.scene !== this) {
            this._windLabel = this.add.text(cx, y + 12, '', {
                fontSize: '10px',
                fontFamily: 'Courier New, monospace',
                color: '#4488ff'
            }).setOrigin(0.5, 0).setDepth(10);
            if (this.hudCamera) this.cameras.main.ignore(this._windLabel);
        }
        this._windLabel.setText(`WIND ${Math.abs(this.wind).toFixed(1)}`);
    }

    _togglePause() {
        this.paused = !this.paused;
        this.pauseOverlay.setVisible(this.paused);
        this.pauseText.setVisible(this.paused);

        if (this.paused) {
            this.pauseOverlay.clear();
            this.pauseOverlay.fillStyle(0x000000, 0.6);
            this.pauseOverlay.fillRect(0, 0, CONFIG.WIDTH, CONFIG.HEIGHT);
            if (this.audio) {
                this.audio.stopThrust();
                this.audio.stopLowFuelWarning();
                this.audio.stopReentryWhoosh();
            }
        }
    }

    _toggleMute() {
        if (this.audio) {
            this.audio.toggleMute();
            this._updateMuteIndicator();
        }
    }

    _updateMuteIndicator() {
        if (this.audio && this.audio.muted) {
            this.muteText.setText('MUTED');
        } else {
            this.muteText.setText('');
        }
    }

    shutdown() {
        if (this.audio) {
            this.audio.stopThrust();
            this.audio.stopLowFuelWarning();
            this.audio.stopReentryWhoosh();
            this.audio.stopWindRush();
        }
        if (this.vfx) this.vfx.destroy();
        if (this.hudCamera) {
            this.cameras.remove(this.hudCamera);
            this.hudCamera = null;
        }
        this.timeScale = 1;
    }
}
