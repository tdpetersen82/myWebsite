// Lunar Lander - Game Scene (Main gameplay)

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

        // Audio
        this.audio = window.audioManager;
        if (this.audio) this.audio.init();

        // Background - starfield
        this.bgGraphics = this.add.graphics();
        this.bgGraphics.setDepth(0);
        this._drawStarfield();

        // Terrain
        this.terrain = new Terrain(this, this.level);
        this.terrainGraphics = this.add.graphics();
        this.terrainGraphics.setDepth(1);

        // Lander
        const startX = 100 + Math.random() * (w - 200);
        this.lander = new Lander(this, startX, 40);
        this.lander.fuel = CONFIG.FUEL_MAX * this.fuelMod;
        this.landerGraphics = this.add.graphics();
        this.landerGraphics.setDepth(4);

        // Particles
        this.particles = new ParticleSystem(this);

        // Wind
        this.wind = 0;
        if (this.level >= CONFIG.DIFFICULTY.windStartLevel) {
            const maxWind = CONFIG.WIND_MAX_FORCE +
                (this.level - CONFIG.DIFFICULTY.windStartLevel) * CONFIG.DIFFICULTY.windIncreasePerLevel;
            this.wind = (Math.random() - 0.5) * 2 * maxWind;
        }
        this.windGraphics = this.add.graphics();
        this.windGraphics.setDepth(6);

        // Input
        this.cursors = this.input.keyboard.createCursorKeys();
        this.wasd = {
            up: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
            left: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
            right: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D)
        };

        // Pause / Mute keys
        this.input.keyboard.on('keydown-P', () => this._togglePause());
        this.input.keyboard.on('keydown-ESC', () => this._togglePause());
        this.input.keyboard.on('keydown-M', () => this._toggleMute());

        // HUD
        this._createHUD();

        // Draw terrain once
        this.terrain.draw(this.terrainGraphics);

        // Pause overlay (hidden initially)
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

        // Level start text
        const levelText = this.add.text(w / 2, h / 2 - 50, `LEVEL ${this.level}`, {
            fontSize: '36px',
            fontFamily: 'Courier New, monospace',
            color: '#ffffff',
            fontStyle: 'bold'
        }).setOrigin(0.5).setDepth(15).setAlpha(1);

        const windInfo = this.wind !== 0
            ? `Wind: ${this.wind > 0 ? 'RIGHT' : 'LEFT'} ${Math.abs(this.wind).toFixed(1)}`
            : 'No Wind';

        const subText = this.add.text(w / 2, h / 2 - 10, windInfo, {
            fontSize: '16px',
            fontFamily: 'Courier New, monospace',
            color: '#88aaff'
        }).setOrigin(0.5).setDepth(15).setAlpha(1);

        this.tweens.add({
            targets: [levelText, subText],
            alpha: 0,
            delay: 1500,
            duration: 500,
            onComplete: () => { levelText.destroy(); subText.destroy(); }
        });

        // Low fuel warning state
        this._lowFuelWarning = false;

        // Landing detection cooldown
        this._landingCooldown = 0;
    }

    update(time, delta) {
        if (this.paused || this.gameOver) return;

        // Cap delta to prevent huge jumps
        delta = Math.min(delta, 50);

        const lander = this.lander;
        const terrain = this.terrain;

        // Update lander physics
        const gravity = CONFIG.GRAVITY * this.gravityMod;
        lander.update(delta, gravity, this.wind);

        // Thrust audio + particles
        if (lander.thrusting) {
            if (this.audio) this.audio.startThrust();
            const nozzle = lander.getNozzlePosition();
            this.particles.emitThrust(nozzle.x, nozzle.y, lander.angle);
        } else {
            if (this.audio) this.audio.stopThrust();
        }

        // Low fuel warning
        if (lander.fuel > 0 && lander.fuel < CONFIG.LOW_FUEL_THRESHOLD && !this._lowFuelWarning) {
            this._lowFuelWarning = true;
            if (this.audio) this.audio.startLowFuelWarning();
        } else if ((lander.fuel <= 0 || lander.fuel >= CONFIG.LOW_FUEL_THRESHOLD) && this._lowFuelWarning) {
            this._lowFuelWarning = false;
            if (this.audio) this.audio.stopLowFuelWarning();
        }

        // Collision detection
        if (this._landingCooldown > 0) {
            this._landingCooldown -= delta;
        } else {
            this._checkCollision();
        }

        // Update particles
        this.particles.update(delta);

        // Draw lander
        this.landerGraphics.clear();
        lander.draw(this.landerGraphics);

        // Draw wind indicator
        this._drawWind();

        // Update HUD
        this._updateHUD();
    }

    _checkCollision() {
        const lander = this.lander;
        if (!lander.alive || lander.landed) return;

        const terrain = this.terrain;
        const points = lander.getCollisionPoints();

        for (const pt of points) {
            const groundY = terrain.getHeightAt(pt.x);

            if (pt.y >= groundY) {
                // Collision detected - check if on landing pad
                const pad = terrain.getPadAt(lander.x);
                const absAngle = Math.abs(lander.angle);
                const vy = Math.abs(lander.vy);
                const vx = Math.abs(lander.vx);

                if (pad &&
                    vy < CONFIG.LAND_MAX_VY &&
                    vx < CONFIG.LAND_MAX_VX &&
                    absAngle < CONFIG.LAND_MAX_ANGLE) {
                    // Successful landing
                    this._onLanding(pad);
                } else {
                    // Crash
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

        // Dust effect
        this.particles.emitLandingDust(lander.x, lander.getBottomY());

        // Calculate score
        const landingScore = CONFIG.BASE_LANDING_SCORE * pad.multiplier;
        const fuelBonus = Math.floor(lander.fuel * CONFIG.FUEL_BONUS_MULTIPLIER);
        const speedBonus = Math.floor((CONFIG.LAND_MAX_VY - Math.abs(lander.vy)) * 2);
        const totalScore = landingScore + fuelBonus + speedBonus;

        this.score += totalScore;

        // Update high score
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

        // Transition after delay
        this.time.delayedCall(2000, () => {
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

        // Explosion particles
        this.particles.emitExplosion(lander.x, lander.y);

        // Screen shake
        this.cameras.main.shake(300, 0.015);

        const highScore = parseInt(localStorage.getItem(CONFIG.HIGH_SCORE_KEY) || '0');
        if (this.score > highScore) {
            localStorage.setItem(CONFIG.HIGH_SCORE_KEY, this.score);
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

        // Fuel gauge
        this.hudTexts.fuelLabel = this.add.text(10, 90, 'FUEL', style).setDepth(10);
        this.fuelBarBg = this.add.graphics().setDepth(10);
        this.fuelBarFg = this.add.graphics().setDepth(11);

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

        const vyColor = Math.abs(lander.vy) > CONFIG.LAND_MAX_VY ? '#ff4444' : CONFIG.COLORS.HUD_TEXT;
        this.hudTexts.vSpeed.setText(`V-SPD: ${lander.vy.toFixed(1)}`).setColor(vyColor);

        const vxColor = Math.abs(lander.vx) > CONFIG.LAND_MAX_VX ? '#ff4444' : CONFIG.COLORS.HUD_TEXT;
        this.hudTexts.hSpeed.setText(`H-SPD: ${lander.vx.toFixed(1)}`).setColor(vxColor);

        const angColor = Math.abs(lander.angle) > CONFIG.LAND_MAX_ANGLE ? '#ff4444' : CONFIG.COLORS.HUD_TEXT;
        this.hudTexts.angle.setText(`ANG: ${lander.angle.toFixed(1)}`).setColor(angColor);

        this.hudTexts.score.setText(`SCORE: ${this.score}`);
        this.hudTexts.level.setText(`LEVEL: ${this.level}`);
        this.hudTexts.lives.setText(`LIVES: ${this.lives}`);

        // Fuel bar
        const fuelMax = CONFIG.FUEL_MAX * this.fuelMod;
        const fuelPct = lander.fuel / fuelMax;
        const barX = 10;
        const barY = 108;
        const barW = 120;
        const barH = 10;

        this.fuelBarBg.clear();
        this.fuelBarBg.fillStyle(0x333333, 1);
        this.fuelBarBg.fillRect(barX, barY, barW, barH);
        this.fuelBarBg.lineStyle(1, 0x666666, 1);
        this.fuelBarBg.strokeRect(barX, barY, barW, barH);

        this.fuelBarFg.clear();
        const fuelColor = fuelPct > 0.3 ? CONFIG.COLORS.FUEL_FULL : CONFIG.COLORS.FUEL_LOW;
        this.fuelBarFg.fillStyle(fuelColor, 1);
        this.fuelBarFg.fillRect(barX + 1, barY + 1, (barW - 2) * fuelPct, barH - 2);
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
        // Arrowhead
        this.windGraphics.lineTo(cx + len * dir / 2 - 8 * dir, y - 5);
        this.windGraphics.moveTo(cx + len * dir / 2, y);
        this.windGraphics.lineTo(cx + len * dir / 2 - 8 * dir, y + 5);
        this.windGraphics.strokePath();

        // Label
        if (!this._windLabel) {
            this._windLabel = this.add.text(cx, y + 12, '', {
                fontSize: '10px',
                fontFamily: 'Courier New, monospace',
                color: '#4488ff'
            }).setOrigin(0.5, 0).setDepth(10);
        }
        this._windLabel.setText(`WIND ${Math.abs(this.wind).toFixed(1)}`);
    }

    _drawStarfield() {
        this.bgGraphics.fillStyle(CONFIG.COLORS.SKY, 1);
        this.bgGraphics.fillRect(0, 0, CONFIG.WIDTH, CONFIG.HEIGHT);

        for (let i = 0; i < 100; i++) {
            const x = Math.random() * CONFIG.WIDTH;
            const y = Math.random() * CONFIG.HEIGHT;
            const size = Math.random() * 1.5 + 0.3;
            const alpha = Math.random() * 0.6 + 0.2;
            this.bgGraphics.fillStyle(CONFIG.COLORS.STAR, alpha);
            this.bgGraphics.fillCircle(x, y, size);
        }
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
        if (this.particles) this.particles.destroy();
    }
}
