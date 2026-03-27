// Lunar Lander - Game Scene (Main gameplay — Enhanced with full VFX)

class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameScene' });
    }

    init(data) {
        this.gravityMod = data.gravityMod || 1.0;
        this.fuelMod = data.fuelMod || 1.0;
        this.difficultyKey = data.difficultyKey || 'normal';
        this.level = data.level || 1;
        this.score = data.score || 0;
        this.lives = data.lives !== undefined ? data.lives : CONFIG.STARTING_LIVES;
        this.paused = false;
        this.gameOver = false;
        this.landingResult = null;
    }

    create() {
        const w = CONFIG.WIDTH;
        const h = CONFIG.HEIGHT;
        const vfx = CONFIG.VFX;

        // Audio
        this.audio = window.audioManager;
        if (this.audio) this.audio.init();

        // --- STARFIELD (multi-layer parallax with twinkling) ---
        this.bgGraphics = this.add.graphics();
        this.bgGraphics.setDepth(0);
        this.bgGraphics.fillStyle(CONFIG.COLORS.SKY, 1);
        this.bgGraphics.fillRect(0, 0, w, h);

        this._createStarfield();
        this._createNebulae();
        this._createEarth();
        this._createDustMotes();
        this._scheduleShootingStars();

        // --- TERRAIN ---
        this.terrain = new Terrain(this, this.level);
        this.terrainGraphics = this.add.graphics();
        this.terrainGraphics.setDepth(1);

        // --- LANDER ---
        const startX = 100 + Math.random() * (w - 200);
        this.lander = new Lander(this, startX, 40);
        this.lander.fuel = CONFIG.FUEL_MAX * this.fuelMod;
        this.landerGraphics = this.add.graphics();
        this.landerGraphics.setDepth(4);

        // --- VFX MANAGER (replaces old ParticleSystem) ---
        this.vfx = new VFXManager(this);

        // backward compat reference
        this.particles = this.vfx;

        // --- WIND ---
        this.wind = 0;
        if (this.level >= CONFIG.DIFFICULTY.windStartLevel) {
            const maxWind = CONFIG.WIND_MAX_FORCE +
                (this.level - CONFIG.DIFFICULTY.windStartLevel) * CONFIG.DIFFICULTY.windIncreasePerLevel;
            this.wind = (Math.random() - 0.5) * 2 * maxWind;
        }
        this.windGraphics = this.add.graphics();
        this.windGraphics.setDepth(6);

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

        // Draw terrain once
        this.terrain.draw(this.terrainGraphics);

        // --- CAMERA POST-FX ---
        try {
            this.cameras.main.postFX.addVignette(0.5, 0.5, vfx.VIGNETTE_STRENGTH);
        } catch (e) {}

        // --- PAUSE OVERLAY ---
        this.pauseOverlay = this.add.graphics();
        this.pauseOverlay.setDepth(20);
        this.pauseOverlay.setVisible(false);

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

        // Cleanup on scene shutdown
        this.events.on('shutdown', this.shutdown, this);

        // --- LEVEL START TEXT with glow ---
        const levelText = this.add.text(w / 2, h / 2 - 50, `LEVEL ${this.level}`, {
            fontSize: '36px',
            fontFamily: 'Courier New, monospace',
            color: '#ffffff',
            fontStyle: 'bold'
        }).setOrigin(0.5).setDepth(15).setAlpha(1);

        try {
            levelText.postFX.addGlow(0xffffff, 6, 0, false);
        } catch (e) {}

        const windInfo = this.wind !== 0
            ? `Wind: ${this.wind > 0 ? 'RIGHT' : 'LEFT'} ${Math.abs(this.wind).toFixed(1)}`
            : 'No Wind';

        const subText = this.add.text(w / 2, h / 2 - 10, windInfo, {
            fontSize: '16px',
            fontFamily: 'Courier New, monospace',
            color: '#88aaff'
        }).setOrigin(0.5).setDepth(15).setAlpha(1);

        try {
            subText.postFX.addGlow(0x4488ff, 3, 0, false);
        } catch (e) {}

        this.tweens.add({
            targets: [levelText, subText],
            alpha: 0,
            delay: 1500,
            duration: 500,
            onComplete: () => { levelText.destroy(); subText.destroy(); }
        });

        // Tracking state
        this._lowFuelWarning = false;
        this._landingCooldown = 0;
        this.proximityWarning = null;
        this._baseZoom = 1;
    }

    // --- STARFIELD ---
    _createStarfield() {
        const vfx = CONFIG.VFX;
        this.starLayers = [];

        vfx.STAR_LAYERS.forEach((layerConfig, layerIdx) => {
            const stars = [];
            for (let i = 0; i < layerConfig.count; i++) {
                const x = Math.random() * CONFIG.WIDTH;
                const y = Math.random() * CONFIG.HEIGHT;
                const size = layerConfig.sizeMin + Math.random() * (layerConfig.sizeMax - layerConfig.sizeMin);
                const baseAlpha = layerConfig.alphaMin + Math.random() * (layerConfig.alphaMax - layerConfig.alphaMin);

                const star = this.add.circle(x, y, size, CONFIG.COLORS.STAR, baseAlpha);
                star.setDepth(0);
                star.setBlendMode(Phaser.BlendModes.ADD);
                star._baseAlpha = baseAlpha;
                star._driftSpeed = layerConfig.speed;

                // Twinkling
                this.tweens.add({
                    targets: star,
                    alpha: { from: baseAlpha, to: baseAlpha * 0.2 },
                    duration: vfx.STAR_TWINKLE_MIN + Math.random() * (vfx.STAR_TWINKLE_MAX - vfx.STAR_TWINKLE_MIN),
                    yoyo: true,
                    repeat: -1,
                    delay: Math.random() * 3000,
                    ease: 'Sine.easeInOut'
                });

                stars.push(star);
            }
            this.starLayers.push(stars);
        });
    }

    // --- NEBULAE ---
    _createNebulae() {
        const vfx = CONFIG.VFX;
        const colors = CONFIG.COLORS.NEBULA;
        this._nebulae = [];

        for (let i = 0; i < vfx.NEBULA_COUNT; i++) {
            const g = this.add.graphics();
            g.setDepth(0);
            g.setBlendMode(Phaser.BlendModes.ADD);

            const cx = 80 + Math.random() * (CONFIG.WIDTH - 160);
            const cy = 40 + Math.random() * (CONFIG.HEIGHT * 0.4);
            const color = colors[i % colors.length];

            // Multiple overlapping soft circles
            for (let j = 0; j < 5; j++) {
                const ox = (Math.random() - 0.5) * 60;
                const oy = (Math.random() - 0.5) * 40;
                const radius = 30 + Math.random() * 50;
                g.fillStyle(color, 0.015 + Math.random() * 0.02);
                g.fillCircle(cx + ox, cy + oy, radius);
            }

            // Slow drift tween
            this.tweens.add({
                targets: g,
                x: { from: -8, to: 8 },
                duration: 20000 + Math.random() * 15000,
                yoyo: true,
                repeat: -1,
                ease: 'Sine.easeInOut'
            });

            this._nebulae.push(g);
        }
    }

    // --- EARTH ---
    _createEarth() {
        const vfx = CONFIG.VFX;
        const ex = vfx.EARTH_X;
        const ey = vfx.EARTH_Y;
        const r = vfx.EARTH_RADIUS;

        // Earth body
        this._earth = this.add.circle(ex, ey, r, CONFIG.COLORS.EARTH, 0.8);
        this._earth.setDepth(0);

        // Simple land mass overlay
        const earthDetail = this.add.graphics();
        earthDetail.setDepth(0);
        earthDetail.fillStyle(CONFIG.COLORS.EARTH_LAND, 0.3);
        // A few irregular "continent" patches
        earthDetail.fillEllipse(ex - 8, ey - 5, 18, 14);
        earthDetail.fillEllipse(ex + 12, ey + 8, 14, 10);
        earthDetail.fillEllipse(ex - 2, ey + 14, 10, 8);

        // Atmospheric glow
        try {
            this._earth.postFX.addGlow(CONFIG.COLORS.EARTH_GLOW, 10, 0, false);
        } catch (e) {}

        // Crescent shadow (dark circle offset to simulate lighting)
        const shadow = this.add.circle(ex + r * 0.35, ey - r * 0.1, r * 0.95, 0x000011, 0.6);
        shadow.setDepth(0);
    }

    // --- DUST MOTES ---
    _createDustMotes() {
        const vfx = CONFIG.VFX;
        this._dustMotes = [];

        for (let i = 0; i < vfx.DUST_MOTE_COUNT; i++) {
            const mote = this.add.circle(
                Math.random() * CONFIG.WIDTH,
                Math.random() * CONFIG.HEIGHT,
                0.5 + Math.random() * 0.8,
                0xffffff,
                0.04 + Math.random() * 0.06
            );
            mote.setDepth(0);

            // Slow random drift
            this.tweens.add({
                targets: mote,
                x: mote.x + (Math.random() - 0.5) * 80,
                y: mote.y + (Math.random() - 0.5) * 60,
                alpha: { from: mote.alpha, to: mote.alpha * 0.3 },
                duration: 12000 + Math.random() * 10000,
                yoyo: true,
                repeat: -1,
                ease: 'Sine.easeInOut'
            });

            this._dustMotes.push(mote);
        }
    }

    // --- SHOOTING STARS ---
    _scheduleShootingStars() {
        const vfx = CONFIG.VFX;
        const delay = vfx.SHOOTING_STAR_MIN_INTERVAL +
            Math.random() * (vfx.SHOOTING_STAR_MAX_INTERVAL - vfx.SHOOTING_STAR_MIN_INTERVAL);

        this._shootingStarTimer = this.time.delayedCall(delay, () => {
            this._createShootingStar();
            this._scheduleShootingStars();
        });
    }

    _createShootingStar() {
        const startX = 50 + Math.random() * (CONFIG.WIDTH - 100);
        const startY = 10 + Math.random() * 80;
        const angle = 20 + Math.random() * 30; // degrees
        const length = 60 + Math.random() * 100;
        const rad = Phaser.Math.DegToRad(angle);

        const endX = startX + Math.cos(rad) * length;
        const endY = startY + Math.sin(rad) * length;

        const line = this.add.line(0, 0, startX, startY, startX, startY, 0xffffff, 0.8);
        line.setOrigin(0, 0);
        line.setDepth(0);
        line.setBlendMode(Phaser.BlendModes.ADD);
        line.setLineWidth(1.5);

        this.tweens.add({
            targets: line,
            x2: endX,
            y2: endY,
            duration: 300,
            ease: 'Quad.easeIn',
            onComplete: () => {
                this.tweens.add({
                    targets: line,
                    alpha: 0,
                    x1: endX,
                    y1: endY,
                    duration: 200,
                    onComplete: () => line.destroy()
                });
            }
        });
    }

    // --- UPDATE LOOP ---
    update(time, delta) {
        if (this.paused || this.gameOver) return;

        delta = Math.min(delta, 50);

        const lander = this.lander;
        const terrain = this.terrain;

        // Update lander physics
        const gravity = CONFIG.GRAVITY * this.gravityMod;
        lander.update(delta, gravity, this.wind);

        // --- THRUST VFX ---
        if (lander.thrusting) {
            if (this.audio) this.audio.startThrust();
            const nozzle = lander.getNozzlePosition();
            this.vfx.startThrust(nozzle.x, nozzle.y, lander.angle);
        } else {
            if (this.audio) this.audio.stopThrust();
            this.vfx.stopThrust();
        }

        // --- RCS PUFFS ---
        if (lander.rotatingLeft && lander.alive && !lander.landed) {
            const rcsPos = lander.getRCSPositions().left;
            rcsPos.forEach(p => this.vfx.emitRCS(p.x, p.y, 'left'));
        }
        if (lander.rotatingRight && lander.alive && !lander.landed) {
            const rcsPos = lander.getRCSPositions().right;
            rcsPos.forEach(p => this.vfx.emitRCS(p.x, p.y, 'right'));
        }

        // --- LOW FUEL WARNING ---
        if (lander.fuel > 0 && lander.fuel < CONFIG.LOW_FUEL_THRESHOLD && !this._lowFuelWarning) {
            this._lowFuelWarning = true;
            if (this.audio) this.audio.startLowFuelWarning();
        } else if ((lander.fuel <= 0 || lander.fuel >= CONFIG.LOW_FUEL_THRESHOLD) && this._lowFuelWarning) {
            this._lowFuelWarning = false;
            if (this.audio) this.audio.stopLowFuelWarning();
        }

        // --- COLLISION ---
        if (this._landingCooldown > 0) {
            this._landingCooldown -= delta;
        } else {
            this._checkCollision();
        }

        // --- DRAW LANDER ---
        this.landerGraphics.clear();
        lander.draw(this.landerGraphics);

        // --- WIND ---
        this._drawWind();

        // --- HUD ---
        this._updateHUD();

        // --- PROXIMITY & DESCENT ZOOM ---
        if (lander.alive && !lander.landed) {
            const alt = Math.max(0, lander.getAltitude(terrain));

            // Update landing pad proximity
            terrain.landingPads.forEach(pad => pad.updateProximity(alt));

            // Proximity warning
            if (alt < 80) {
                if (!this.proximityWarning) {
                    this.proximityWarning = this.add.text(CONFIG.WIDTH / 2, 50, 'PROXIMITY WARNING', {
                        fontSize: '16px',
                        fontFamily: 'Courier New, monospace',
                        color: '#ff4444'
                    }).setOrigin(0.5).setDepth(15);
                    try {
                        this.proximityWarning.postFX.addGlow(0xff0000, 4, 0, false);
                    } catch (e) {}
                    this.tweens.add({
                        targets: this.proximityWarning,
                        alpha: { from: 1, to: 0.2 },
                        duration: 300,
                        yoyo: true,
                        repeat: -1
                    });
                }
            } else if (this.proximityWarning) {
                this.proximityWarning.destroy();
                this.proximityWarning = null;
            }

            // Descent zoom
            const altNorm = Phaser.Math.Clamp(alt / 300, 0, 1);
            const targetZoom = 1 + (1 - altNorm) * CONFIG.VFX.DESCENT_ZOOM_MAX;
            this.cameras.main.zoom = Phaser.Math.Linear(this.cameras.main.zoom, targetZoom, 0.02);
        }

        // --- STAR DRIFT ---
        if (this.starLayers) {
            this.starLayers.forEach((layer) => {
                layer.forEach(star => {
                    star.x -= star._driftSpeed;
                    if (star.x < -5) star.x = CONFIG.WIDTH + 5;
                });
            });
        }
    }

    _checkCollision() {
        const lander = this.lander;
        if (!lander.alive || lander.landed) return;

        const terrain = this.terrain;
        const points = lander.getCollisionPoints();

        for (const pt of points) {
            const groundY = terrain.getHeightAt(pt.x);

            if (pt.y >= groundY) {
                const pad = terrain.getPadAt(lander.x);
                const absAngle = Math.abs(lander.angle);
                const vy = Math.abs(lander.vy);
                const vx = Math.abs(lander.vx);

                if (pad &&
                    vy < CONFIG.LAND_MAX_VY &&
                    vx < CONFIG.LAND_MAX_VX &&
                    absAngle < CONFIG.LAND_MAX_ANGLE) {
                    this._onLanding(pad);
                } else {
                    this._onCrash();
                }
                return;
            }
        }
    }

    _onLanding(pad) {
        const lander = this.lander;
        lander.landed = true;
        lander.vy = 0;
        lander.vx = 0;
        this.gameOver = true;

        if (this.audio) {
            this.audio.stopThrust();
            this.audio.stopLowFuelWarning();
            this.audio.playLanding();
        }

        this.vfx.stopThrust();

        // Dust effect
        this.vfx.emitLandingDust(lander.x, lander.getBottomY());

        // Celebration effects
        this.time.delayedCall(300, () => {
            this.vfx.emitFireworks(lander.x, lander.y - 50);
            this.cameras.main.flash(200, 255, 255, 255, true);
            this.tweens.add({
                targets: this.cameras.main,
                zoom: 1.25,
                duration: 1500,
                ease: 'Sine.easeInOut'
            });
        });

        // Calculate score
        const landingScore = CONFIG.BASE_LANDING_SCORE * pad.multiplier;
        const fuelBonus = Math.floor(lander.fuel * CONFIG.FUEL_BONUS_MULTIPLIER);
        const speedBonus = Math.floor((CONFIG.LAND_MAX_VY - Math.abs(lander.vy)) * 2);
        const totalScore = landingScore + fuelBonus + speedBonus;

        this.score += totalScore;

        const highScore = parseInt(localStorage.getItem(CONFIG.HIGH_SCORE_KEY) || '0');
        if (this.score > highScore) {
            localStorage.setItem(CONFIG.HIGH_SCORE_KEY, this.score);
        }

        this.landingResult = {
            success: true,
            padMultiplier: pad.multiplier,
            landingScore,
            fuelBonus,
            speedBonus,
            totalScore,
            vy: Math.abs(lander.vy).toFixed(1),
            vx: Math.abs(lander.vx).toFixed(1),
            angle: Math.abs(lander.angle).toFixed(1),
            fuelRemaining: Math.floor(lander.fuel),
            totalGameScore: this.score
        };

        // Destroy proximity warning if active
        if (this.proximityWarning) {
            this.proximityWarning.destroy();
            this.proximityWarning = null;
        }

        this.time.delayedCall(2500, () => {
            this.scene.start('GameOverScene', {
                result: this.landingResult,
                level: this.level,
                score: this.score,
                lives: this.lives,
                gravityMod: this.gravityMod,
                fuelMod: this.fuelMod,
                difficultyKey: this.difficultyKey
            });
        });
    }

    _onCrash() {
        const lander = this.lander;
        lander.alive = false;
        this.gameOver = true;
        this.lives--;

        if (this.audio) {
            this.audio.stopThrust();
            this.audio.stopLowFuelWarning();
            this.audio.playCrash();
        }

        this.vfx.stopThrust();

        // Epic explosion
        this.vfx.emitExplosion(lander.x, lander.y);

        // Enhanced camera effects
        const vfxCfg = CONFIG.VFX;
        this.cameras.main.shake(vfxCfg.EXPLOSION_SHAKE_DURATION, vfxCfg.EXPLOSION_SHAKE_INTENSITY);
        this.cameras.main.flash(150, 255, 120, 0, true); // orange flash

        const highScore = parseInt(localStorage.getItem(CONFIG.HIGH_SCORE_KEY) || '0');
        if (this.score > highScore) {
            localStorage.setItem(CONFIG.HIGH_SCORE_KEY, this.score);
        }

        // Destroy proximity warning
        if (this.proximityWarning) {
            this.proximityWarning.destroy();
            this.proximityWarning = null;
        }

        this.landingResult = {
            success: false,
            vy: Math.abs(lander.vy).toFixed(1),
            vx: Math.abs(lander.vx).toFixed(1),
            angle: Math.abs(lander.angle).toFixed(1),
            totalGameScore: this.score,
            livesRemaining: this.lives
        };

        this.time.delayedCall(2500, () => {
            this.scene.start('GameOverScene', {
                result: this.landingResult,
                level: this.level,
                score: this.score,
                lives: this.lives,
                gravityMod: this.gravityMod,
                fuelMod: this.fuelMod,
                difficultyKey: this.difficultyKey
            });
        });
    }

    _createHUD() {
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

        // Fuel gauge label
        this.hudTexts.fuelLabel = this.add.text(10, 90, 'FUEL', style).setDepth(10);

        // Fuel bar as persistent rectangle (for postFX glow)
        const barX = 10;
        const barY = 108;
        const barW = 120;
        const barH = 10;

        this.fuelBarBg = this.add.rectangle(barX + barW / 2, barY + barH / 2, barW, barH, 0x333333, 1);
        this.fuelBarBg.setStrokeStyle(1, 0x666666, 1);
        this.fuelBarBg.setDepth(10);

        this.fuelBarFg = this.add.rectangle(barX + 1, barY + 1, barW - 2, barH - 2, CONFIG.COLORS.FUEL_FULL, 1);
        this.fuelBarFg.setOrigin(0, 0);
        this.fuelBarFg.setDepth(11);

        // Right panel
        const rightStyle = { ...style, align: 'right' };
        this.hudTexts.score = this.add.text(CONFIG.WIDTH - 10, 10, 'SCORE: 0', rightStyle)
            .setOrigin(1, 0).setDepth(10);
        this.hudTexts.level = this.add.text(CONFIG.WIDTH - 10, 28, 'LEVEL: 1', rightStyle)
            .setOrigin(1, 0).setDepth(10);
        this.hudTexts.lives = this.add.text(CONFIG.WIDTH - 10, 46, 'LIVES: 3', rightStyle)
            .setOrigin(1, 0).setDepth(10);
    }

    _updateHUD() {
        const lander = this.lander;
        const alt = Math.max(0, lander.getAltitude(this.terrain));

        this.hudTexts.altitude.setText(`ALT: ${Math.floor(alt)}`);

        const vyDanger = Math.abs(lander.vy) > CONFIG.LAND_MAX_VY;
        this.hudTexts.vSpeed.setText(`V-SPD: ${lander.vy.toFixed(1)}`).setColor(vyDanger ? '#ff4444' : CONFIG.COLORS.HUD_TEXT);

        const vxDanger = Math.abs(lander.vx) > CONFIG.LAND_MAX_VX;
        this.hudTexts.hSpeed.setText(`H-SPD: ${lander.vx.toFixed(1)}`).setColor(vxDanger ? '#ff4444' : CONFIG.COLORS.HUD_TEXT);

        const angDanger = Math.abs(lander.angle) > CONFIG.LAND_MAX_ANGLE;
        this.hudTexts.angle.setText(`ANG: ${lander.angle.toFixed(1)}`).setColor(angDanger ? '#ff4444' : CONFIG.COLORS.HUD_TEXT);

        this.hudTexts.score.setText(`SCORE: ${this.score}`);
        this.hudTexts.level.setText(`LEVEL: ${this.level}`);
        this.hudTexts.lives.setText(`LIVES: ${this.lives}`);

        // Fuel bar
        const fuelMax = CONFIG.FUEL_MAX * this.fuelMod;
        const fuelPct = lander.fuel / fuelMax;
        const barW = 120;

        const fuelColor = fuelPct > 0.3 ? CONFIG.COLORS.FUEL_FULL : CONFIG.COLORS.FUEL_LOW;
        this.fuelBarFg.width = Math.max(0, (barW - 2) * fuelPct);
        this.fuelBarFg.setFillStyle(fuelColor, 1);

        // Pulsing glow on fuel bar when low
        if (fuelPct < 0.3 && fuelPct > 0) {
            try {
                this.fuelBarFg.postFX.clear();
                const pulse = 0.5 + 0.5 * Math.sin(Date.now() / 200);
                this.fuelBarFg.postFX.addGlow(0xff3300, 3 * pulse, 0, false);
            } catch (e) {}
        } else {
            try { this.fuelBarFg.postFX.clear(); } catch (e) {}
        }

        // Glow on danger HUD texts
        try {
            if (vyDanger) {
                this.hudTexts.vSpeed.postFX.clear();
                this.hudTexts.vSpeed.postFX.addGlow(0xff0000, 3, 0, false);
            } else {
                this.hudTexts.vSpeed.postFX.clear();
            }
            if (vxDanger) {
                this.hudTexts.hSpeed.postFX.clear();
                this.hudTexts.hSpeed.postFX.addGlow(0xff0000, 3, 0, false);
            } else {
                this.hudTexts.hSpeed.postFX.clear();
            }
            if (angDanger) {
                this.hudTexts.angle.postFX.clear();
                this.hudTexts.angle.postFX.addGlow(0xff0000, 3, 0, false);
            } else {
                this.hudTexts.angle.postFX.clear();
            }
        } catch (e) {}
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

        if (!this._windLabel) {
            this._windLabel = this.add.text(cx, y + 12, '', {
                fontSize: '10px',
                fontFamily: 'Courier New, monospace',
                color: '#4488ff'
            }).setOrigin(0.5, 0).setDepth(10);
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
        }
        if (this.terrain) this.terrain.destroy();
        if (this.vfx) this.vfx.destroy();
        if (this.proximityWarning) {
            this.proximityWarning.destroy();
            this.proximityWarning = null;
        }
    }
}
