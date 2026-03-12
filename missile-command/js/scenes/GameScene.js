// ============================================================
// Missile Command — Game Scene (Main Gameplay)
// ============================================================

class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameScene' });
    }

    init(data) {
        this.difficultyKey = data.difficulty || 'NORMAL';
        this.diffConfig = CONFIG.DIFFICULTY[this.difficultyKey];
    }

    create() {
        this.cameras.main.fadeIn(400, 0, 0, 0);

        // Graphics layers
        this.starGfx = this.add.graphics();
        this.groundGfx = this.add.graphics();
        this.trailGfx = this.add.graphics();
        this.entityGfx = this.add.graphics();
        this.explosionGfx = this.add.graphics();
        this.cityGfx = this.add.graphics();
        this.baseGfx = this.add.graphics();
        this.powerUpGfx = this.add.graphics();
        this.particleGfx = this.add.graphics();
        this.hudGfx = this.add.graphics();
        this.flashGfx = this.add.graphics();

        // Systems
        this.particleSystem = new ParticleSystem();
        this.screenEffects = new ScreenEffects(this);
        this.waveManager = new WaveManager(this.diffConfig);
        this.powerUpSystem = new PowerUpSystem();
        this.comboSystem = new ComboSystem();

        // Stars
        this.stars = [];
        for (let i = 0; i < CONFIG.STARS.COUNT; i++) {
            this.stars.push({
                x: Math.random() * CONFIG.WIDTH,
                y: Math.random() * CONFIG.GROUND_Y,
                brightness: Math.random(),
            });
        }

        // Game entities
        this.bases = CONFIG.BASE.POSITIONS.map((x, i) => {
            const b = new Base(x, i);
            b.setDifficulty(this.diffConfig);
            return b;
        });

        this.cities = CONFIG.CITY.POSITIONS.map((x, i) => new City(x, i));

        this.counterMissiles = [];
        this.enemyMissiles = [];
        this.explosions = [];
        this.bombers = [];
        this.satellites = [];

        // Game state
        this.score = 0;
        this.highScore = parseInt(localStorage.getItem('missileCommandHighScore')) || 0;
        this.gameOver = false;
        this.paused = false;
        this.missilesFired = 0;
        this.enemiesDestroyed = 0;
        this.forcedBaseIndex = -1; // For keyboard base selection

        // HUD text objects
        this.scoreText = this.add.text(10, 8, '', {
            fontSize: '18px', fontFamily: 'monospace', color: '#ffdd57', fontStyle: 'bold',
            stroke: '#000000', strokeThickness: 2,
        });
        this.highScoreText = this.add.text(10, 28, '', {
            fontSize: '11px', fontFamily: 'monospace', color: '#888888',
        });
        this.waveText = this.add.text(CONFIG.WIDTH / 2, 8, '', {
            fontSize: '16px', fontFamily: 'monospace', color: '#ffffff', fontStyle: 'bold',
            stroke: '#000000', strokeThickness: 2,
        }).setOrigin(0.5, 0);

        this.waveProgressText = this.add.text(CONFIG.WIDTH / 2, 26, '', {
            fontSize: '10px', fontFamily: 'monospace', color: '#666666',
        }).setOrigin(0.5, 0);

        // Combo display text
        this.comboText = this.add.text(0, 0, '', {
            fontSize: '24px', fontFamily: 'monospace', color: '#ffdd57', fontStyle: 'bold',
            stroke: '#000000', strokeThickness: 3,
        }).setOrigin(0.5).setAlpha(0);

        // Wave announcement text
        this.announceText = this.add.text(CONFIG.WIDTH / 2, CONFIG.HEIGHT / 2 - 40, '', {
            fontSize: '36px', fontFamily: 'monospace', color: '#ff4400', fontStyle: 'bold',
            stroke: '#000000', strokeThickness: 4,
        }).setOrigin(0.5).setAlpha(0);

        this.announceSubText = this.add.text(CONFIG.WIDTH / 2, CONFIG.HEIGHT / 2, '', {
            fontSize: '14px', fontFamily: 'monospace', color: '#aaaaaa',
        }).setOrigin(0.5).setAlpha(0);

        // Bonus text
        this.bonusText = this.add.text(CONFIG.WIDTH / 2, CONFIG.HEIGHT / 2 + 40, '', {
            fontSize: '16px', fontFamily: 'monospace', color: '#44ff44',
        }).setOrigin(0.5).setAlpha(0);

        // Pause overlay
        this.pauseText = this.add.text(CONFIG.WIDTH / 2, CONFIG.HEIGHT / 2, 'PAUSED', {
            fontSize: '48px', fontFamily: 'monospace', color: '#ffffff', fontStyle: 'bold',
            stroke: '#000000', strokeThickness: 4,
        }).setOrigin(0.5).setAlpha(0).setDepth(100);

        this.pauseSubText = this.add.text(CONFIG.WIDTH / 2, CONFIG.HEIGHT / 2 + 40, 'Press P or ESC to resume', {
            fontSize: '14px', fontFamily: 'monospace', color: '#888888',
        }).setOrigin(0.5).setAlpha(0).setDepth(100);

        // Mute indicator
        this.muteText = this.add.text(CONFIG.WIDTH - 10, 8, '', {
            fontSize: '12px', fontFamily: 'monospace', color: '#666666',
        }).setOrigin(1, 0);

        // Input
        this.input.on('pointerdown', (pointer) => this._handleClick(pointer));

        this.input.keyboard.on('keydown', (event) => {
            if (event.key === CONFIG.KEYS.PAUSE || event.key === 'Escape') {
                this._togglePause();
            } else if (event.key === CONFIG.KEYS.MUTE || event.key === 'm') {
                const muted = audioManager.toggleMute();
                this.muteText.setText(muted ? 'MUTED' : '');
            } else if (event.key === CONFIG.KEYS.BASE_1) {
                this.forcedBaseIndex = 0;
            } else if (event.key === CONFIG.KEYS.BASE_2) {
                this.forcedBaseIndex = 1;
            } else if (event.key === CONFIG.KEYS.BASE_3) {
                this.forcedBaseIndex = 2;
            }
        });

        this.input.keyboard.on('keyup', (event) => {
            if (event.key === '1' || event.key === '2' || event.key === '3') {
                this.forcedBaseIndex = -1;
            }
        });

        // Start music and first wave
        audioManager.startMusic();
        this.waveManager.startNextWave();
    }

    _handleClick(pointer) {
        if (this.paused || this.gameOver) return;
        if (pointer.y >= CONFIG.GROUND_Y) return;

        // Check for power-up click first
        const collectedPowerUp = this.powerUpSystem.checkClick(pointer.x, pointer.y);
        if (collectedPowerUp) {
            this._activatePowerUp(collectedPowerUp);
            return;
        }

        // Fire missile
        const isRapid = this.powerUpSystem.isActive('RAPID');
        let baseIdx;

        if (this.forcedBaseIndex >= 0 && this.bases[this.forcedBaseIndex] &&
            this.bases[this.forcedBaseIndex].alive &&
            (isRapid || this.bases[this.forcedBaseIndex].ammo > 0)) {
            baseIdx = this.forcedBaseIndex;
        } else if (isRapid) {
            // During rapid fire, pick nearest alive base regardless of ammo
            let best = -1, bestDist = Infinity;
            for (let i = 0; i < this.bases.length; i++) {
                if (this.bases[i].alive) {
                    const d = Math.abs(pointer.x - this.bases[i].x);
                    if (d < bestDist) { bestDist = d; best = i; }
                }
            }
            baseIdx = best;
        } else {
            baseIdx = Helpers.nearestBase(pointer.x, this.bases);
        }

        if (baseIdx < 0) return;

        const base = this.bases[baseIdx];
        if (isRapid || base.fire()) {
            base.aimAt(pointer.x, pointer.y);
            const missile = new CounterMissile(base.x, base.y - 15, pointer.x, pointer.y);
            this.counterMissiles.push(missile);
            this.missilesFired++;
            audioManager.playLaunch();
            base.launchFlash = 150;
        }
    }

    _activatePowerUp(powerUp) {
        audioManager.playPowerUpCollect();
        this.particleSystem.emitSparks(powerUp.x, powerUp.y, powerUp.config.color);
        this.screenEffects.flash(powerUp.config.color, 100, 0.2);

        const gameState = {
            cities: this.cities,
            bases: this.bases,
            enemyMissiles: this.enemyMissiles,
            screenEffects: this.screenEffects,
            particleSystem: this.particleSystem,
            onEnemyKilled: (m) => {
                this.score += this.comboSystem.getPoints(m.points);
                this.comboSystem.registerKill(m.x, m.y);
                this.enemiesDestroyed++;
            },
        };

        this.powerUpSystem.activate(powerUp.type, gameState);

        if (powerUp.type === 'EMP') {
            audioManager.playEMP();
        }
    }

    _togglePause() {
        if (this.gameOver) return;
        this.paused = !this.paused;
        this.pauseText.setAlpha(this.paused ? 1 : 0);
        this.pauseSubText.setAlpha(this.paused ? 1 : 0);
    }

    _spawnEnemyMissile() {
        const type = this.waveManager.getEnemyType();
        const startX = Helpers.randomRange(30, CONFIG.WIDTH - 30);
        const startY = Helpers.randomRange(-20, 10);

        // Target a city, base, or random ground position
        const aliveCities = this.cities.filter(c => c.alive);
        const aliveBases = this.bases.filter(b => b.alive);
        const targets = [...aliveCities, ...aliveBases];
        let tx, ty;

        if (targets.length > 0 && Math.random() < 0.8) {
            const target = Helpers.randomChoice(targets);
            tx = target.x + Helpers.randomRange(-10, 10);
            ty = CONFIG.GROUND_Y;
        } else {
            tx = Helpers.randomRange(50, CONFIG.WIDTH - 50);
            ty = CONFIG.GROUND_Y;
        }

        this.enemyMissiles.push(new EnemyMissile(startX, startY, tx, ty, type, this.waveManager.wave));
    }

    _checkCollisions() {
        // Explosions vs enemy missiles
        for (const exp of this.explosions) {
            if (exp.dead) continue;

            for (const em of this.enemyMissiles) {
                if (em.dead) continue;
                if (exp.contains(em.x, em.y)) {
                    const killed = em.hit();
                    if (killed) {
                        const points = this.comboSystem.getPoints(em.points);
                        this.score += points;
                        this.comboSystem.registerKill(em.x, em.y);
                        this.enemiesDestroyed++;
                        this.particleSystem.emitSparks(em.x, em.y, em.color);

                        // Drop power-up from certain kills
                        if (Math.random() < 0.05) {
                            this.powerUpSystem.forceSpawn(em.x, em.y);
                        }
                    }
                }
            }

            // Explosions vs bombers
            for (const bomber of this.bombers) {
                if (bomber.dead) continue;
                if (bomber.contains(exp.x, exp.y, exp.radius)) {
                    const killed = bomber.hit();
                    if (killed) {
                        const points = this.comboSystem.getPoints(bomber.points);
                        this.score += points;
                        this.comboSystem.registerKill(bomber.x, bomber.y);
                        this.enemiesDestroyed++;
                        audioManager.playBomberDestroyed();
                        this.particleSystem.emitExplosion(bomber.x, bomber.y, 30);
                        this.screenEffects.shake(3, 150);
                        // Bombers always try to drop power-up
                        this.powerUpSystem.spawnPowerUp(bomber.x, bomber.y);
                    }
                }
            }

            // Explosions vs satellites
            for (const sat of this.satellites) {
                if (sat.dead) continue;
                if (sat.contains(exp.x, exp.y, exp.radius)) {
                    const killed = sat.hit();
                    if (killed) {
                        const points = this.comboSystem.getPoints(sat.points);
                        this.score += points;
                        this.comboSystem.registerKill(sat.x, sat.y);
                        this.enemiesDestroyed++;
                        audioManager.playBomberDestroyed();
                        this.particleSystem.emitExplosion(sat.x, sat.y, 40);
                        this.screenEffects.shake(5, 200);
                        this.powerUpSystem.spawnPowerUp(sat.x, sat.y);
                    }
                }
            }
        }

        // Enemy missiles hitting ground → check cities and bases
        for (const em of this.enemyMissiles) {
            if (!em.hitGround || em.dead === false) continue;
            // Already marked dead when hitGround

            // Small ground explosion
            this.explosions.push(new Explosion(em.x, CONFIG.GROUND_Y, CONFIG.EXPLOSION.ENEMY_RADIUS, false));
            audioManager.playExplosion('small');

            // Check city hits
            for (const city of this.cities) {
                if (!city.alive) continue;
                if (city.shielded) continue;
                if (Math.abs(em.targetX - city.x) < 30) {
                    city.takeDamage();
                    if (!city.alive) {
                        audioManager.playCityHit();
                        this.particleSystem.emitDebris(city.x, city.y);
                        this.screenEffects.shake(8, 300);
                        this.screenEffects.flash(0xff2200, 200, 0.3);
                    }
                }
            }

            // Check base hits
            for (const base of this.bases) {
                if (!base.alive) continue;
                if (Math.abs(em.targetX - base.x) < 25) {
                    base.damage();
                    if (!base.alive) {
                        audioManager.playBaseHit();
                        this.particleSystem.emitDebris(base.x, base.y);
                        this.screenEffects.shake(5, 200);
                    }
                }
            }
        }
    }

    _handleMIRVSplits() {
        const newMissiles = [];
        for (const em of this.enemyMissiles) {
            if (em.shouldSplit()) {
                const children = em.createSplitMissiles(this.cities);
                newMissiles.push(...children);
                audioManager.playMIRVSplit();
                this.particleSystem.emitSparks(em.x, em.y, 0xff00ff);
            }
        }
        this.enemyMissiles.push(...newMissiles);
    }

    _handleBomberDrops() {
        for (const bomber of this.bombers) {
            if (bomber.dead) continue;
            if (bomber.shouldDrop()) {
                const missiles = bomber.createDropMissiles(this.cities);
                this.enemyMissiles.push(...missiles);
            }
        }
    }

    _handleSatelliteFire() {
        for (const sat of this.satellites) {
            if (sat.dead) continue;
            if (sat.shouldFire()) {
                const missile = sat.createMissile(this.cities);
                this.enemyMissiles.push(missile);
            }
        }
    }

    _checkGameOver() {
        const aliveCities = this.cities.filter(c => c.alive);
        if (aliveCities.length === 0) {
            this.gameOver = true;
            audioManager.playGameOver();
            audioManager.stopMusic();

            // Update high score
            if (this.score > this.highScore) {
                this.highScore = this.score;
                localStorage.setItem('missileCommandHighScore', this.highScore);
            }

            // Save to high scores list
            this._saveHighScore();

            // Transition to game over
            this.time.delayedCall(2000, () => {
                this.cameras.main.fadeOut(500, 0, 0, 0);
                this.time.delayedCall(500, () => {
                    this.scene.start('GameOverScene', {
                        score: this.score,
                        wave: this.waveManager.wave,
                        missilesFired: this.missilesFired,
                        enemiesDestroyed: this.enemiesDestroyed,
                        citiesSaved: this.cities.filter(c => c.alive).length,
                        highestCombo: this.comboSystem.highestCombo,
                        difficulty: this.difficultyKey,
                        isNewHighScore: this.score >= this.highScore,
                    });
                });
            });
        }
    }

    _saveHighScore() {
        try {
            let scores = JSON.parse(localStorage.getItem('missileCommandScores') || '[]');
            scores.push({
                score: this.score,
                wave: this.waveManager.wave,
                difficulty: this.difficultyKey,
                date: Date.now(),
            });
            scores.sort((a, b) => b.score - a.score);
            scores = scores.slice(0, 10);
            localStorage.setItem('missileCommandScores', JSON.stringify(scores));
        } catch (e) {}
    }

    _handleWaveTransition() {
        const wm = this.waveManager;

        if (wm.state === 'announcement') {
            this.announceText.setText(wm.getWaveLabel());
            this.announceSubText.setText(wm.getWaveSubtitle());
            this.announceText.setAlpha(1);
            this.announceSubText.setAlpha(0.7);
        } else {
            if (this.announceText.alpha > 0) {
                this.announceText.setAlpha(Math.max(0, this.announceText.alpha - 0.02));
                this.announceSubText.setAlpha(Math.max(0, this.announceSubText.alpha - 0.02));
            }
        }

        // Check if all enemies are done and no missiles on screen
        if (wm.state === 'spawning' && wm.enemyMissilesRemaining <= 0 &&
            this.enemyMissiles.filter(m => !m.dead).length === 0 &&
            this.bombers.filter(b => !b.dead).length === 0 &&
            this.satellites.filter(s => !s.dead).length === 0) {

            // Wave complete!
            audioManager.playWaveComplete();

            // Calculate bonuses
            const aliveBases = this.bases.filter(b => b.alive);
            const aliveCities = this.cities.filter(c => c.alive);
            let ammoBonus = 0;
            aliveBases.forEach(b => { ammoBonus += b.ammo * 5; });
            const cityBonus = aliveCities.length * this.diffConfig.bonusCityPoints;
            this.score += ammoBonus + cityBonus;

            // Show bonus
            const bonusStr = `AMMO BONUS: ${ammoBonus}  |  CITY BONUS: ${cityBonus}`;
            this.bonusText.setText(bonusStr);
            this.bonusText.setAlpha(1);
            this.tweens.add({
                targets: this.bonusText,
                alpha: 0,
                duration: 3000,
                delay: 1000,
            });

            // Refill bases
            this.bases.forEach(b => {
                if (b.alive) b.refillAmmo();
            });

            wm.startIntermission();
        }

        // Intermission complete → next wave
        if (wm.isIntermissionComplete()) {
            wm.startNextWave();
        }
    }

    _updateHUD() {
        this.scoreText.setText(Helpers.formatNumber(this.score));
        this.highScoreText.setText('HI: ' + Helpers.formatNumber(this.highScore));
        this.waveText.setText('WAVE ' + this.waveManager.wave);

        // Wave progress
        const progress = this.waveManager.getProgress();
        const pctStr = Math.floor(progress * 100) + '%';
        this.waveProgressText.setText(pctStr);

        // Active power-ups display
        // (drawn in drawHUD)
    }

    _drawHUD() {
        this.hudGfx.clear();

        // Wave progress bar
        const barX = CONFIG.WIDTH / 2 - 50;
        const barY = 36;
        const barW = 100;
        const barH = 4;
        const progress = this.waveManager.getProgress();
        this.hudGfx.fillStyle(0x333333, 0.5);
        this.hudGfx.fillRect(barX, barY, barW, barH);
        this.hudGfx.fillStyle(0x4488ff, 0.7);
        this.hudGfx.fillRect(barX, barY, barW * progress, barH);

        // Active power-up indicators
        let puX = CONFIG.WIDTH - 15;
        const puY = 30;
        const activeEffects = this.powerUpSystem.activeEffects;
        for (const type in activeEffects) {
            const remaining = activeEffects[type];
            const config = CONFIG.POWERUP.TYPES[type];
            if (!config || !config.duration) continue;
            const pct = remaining / config.duration;

            // Background
            this.hudGfx.fillStyle(config.color, 0.3);
            this.hudGfx.fillRect(puX - 50, puY, 50, 14);
            // Fill
            this.hudGfx.fillStyle(config.color, 0.7);
            this.hudGfx.fillRect(puX - 50, puY, 50 * pct, 14);
            // Label (drawn as simple dots since we can't use text in graphics)
            this.hudGfx.fillStyle(0xffffff, 0.8);
            this.hudGfx.fillRect(puX - 48, puY + 5, 4, 4);

            puX -= 56;
        }

        // Combo meter
        if (this.comboSystem.count > 0) {
            this.comboSystem.drawMeter(this.hudGfx, CONFIG.WIDTH / 2 - 40, 44, 80);

            // Combo multiplier text
            if (this.comboSystem.multiplier > 1) {
                this.hudGfx.fillStyle(0xffdd57, 0.8);
                // Small indicator near the bar
            }
        }

        // Base selection indicator
        if (this.forcedBaseIndex >= 0 && this.bases[this.forcedBaseIndex] && this.bases[this.forcedBaseIndex].alive) {
            const b = this.bases[this.forcedBaseIndex];
            this.hudGfx.lineStyle(1, 0x44ff44, 0.5);
            this.hudGfx.strokeCircle(b.x, b.y - 10, 25);
        }
    }

    update(time, delta) {
        if (this.paused || this.gameOver) return;

        const dt = delta / 1000;

        // Update aim for all bases
        const pointer = this.input.activePointer;
        this.bases.forEach(b => {
            if (b.alive) b.aimAt(pointer.x, pointer.y);
        });

        // Wave manager
        this.waveManager.update(dt);

        // Spawn enemies
        if (this.waveManager.shouldSpawnMissile()) {
            this._spawnEnemyMissile();
        }
        if (this.waveManager.shouldSpawnBomber()) {
            const type = this.waveManager.getBomberType();
            this.bombers.push(new Bomber(type, this.waveManager.wave));
        }
        if (this.waveManager.shouldSpawnSatellite()) {
            this.satellites.push(new Satellite(this.waveManager.wave));
        }

        // Speed multiplier (affected by slow-mo power-up)
        const speedMult = this.waveManager.getSpeedMultiplier() *
                         (this.powerUpSystem.isActive('SLOWMO') ? 0.5 : 1);

        // Update entities
        this.bases.forEach(b => b.update(dt));
        this.cities.forEach(c => c.update(dt));

        for (const cm of this.counterMissiles) {
            cm.update(dt, this.particleSystem);
            if (cm.detonated) {
                this.explosions.push(new Explosion(cm.x, cm.y, CONFIG.EXPLOSION.COUNTER_RADIUS, true));
                audioManager.playExplosion('medium');
                this.screenEffects.shake(2, 100);
            }
        }

        for (const em of this.enemyMissiles) {
            em.update(dt, speedMult);
        }

        this._handleMIRVSplits();

        for (const bomber of this.bombers) {
            bomber.update(dt);
        }
        this._handleBomberDrops();

        for (const sat of this.satellites) {
            sat.update(dt);
        }
        this._handleSatelliteFire();

        for (const exp of this.explosions) {
            exp.update(dt, this.particleSystem);
        }

        // Collisions
        this._checkCollisions();

        // Power-ups
        this.powerUpSystem.update(dt);
        this.comboSystem.update(dt);
        this.particleSystem.update(dt);
        this.screenEffects.update(dt);

        // Combo text display
        this.comboSystem.draw(null, this);
        if (this.comboSystem.displayState && this.comboSystem.displayTimer > 0) {
            const ds = this.comboSystem.displayState;
            this.comboText.setText(ds.text);
            this.comboText.setPosition(ds.x, ds.y);
            this.comboText.setAlpha(ds.alpha);
            this.comboText.setColor(ds.color);
            this.comboText.setScale(ds.scale);
        } else {
            this.comboText.setAlpha(0);
        }

        if (this.comboSystem.milestoneReached) {
            audioManager.playComboMilestone();
        }

        // Clean up dead entities
        this.counterMissiles = this.counterMissiles.filter(m => !m.dead);
        this.enemyMissiles = this.enemyMissiles.filter(m => !m.dead);
        this.explosions = this.explosions.filter(e => !e.dead);
        this.bombers = this.bombers.filter(b => !b.dead);
        this.satellites = this.satellites.filter(s => !s.dead);

        // Wave transitions
        this._handleWaveTransition();

        // Game over check
        this._checkGameOver();

        // Update high score
        if (this.score > this.highScore) {
            this.highScore = this.score;
        }

        // HUD
        this._updateHUD();

        // === DRAW ===
        this._draw(time);
    }

    _draw(time) {
        // Clear all graphics
        this.starGfx.clear();
        this.groundGfx.clear();
        this.trailGfx.clear();
        this.entityGfx.clear();
        this.explosionGfx.clear();
        this.cityGfx.clear();
        this.baseGfx.clear();
        this.powerUpGfx.clear();
        this.particleGfx.clear();
        this.flashGfx.clear();

        // Stars
        for (const star of this.stars) {
            const flicker = Math.sin(time * CONFIG.STARS.FLICKER_SPEED + star.brightness * 10) * 0.3 + 0.7;
            this.starGfx.fillStyle(0xffffff, star.brightness * flicker * 0.5);
            this.starGfx.fillCircle(star.x, star.y, star.brightness * 1.5);
        }

        // Ground
        this.groundGfx.fillStyle(0x1a472a, 1);
        this.groundGfx.fillRect(0, CONFIG.GROUND_Y, CONFIG.WIDTH, CONFIG.HEIGHT - CONFIG.GROUND_Y);
        this.groundGfx.fillStyle(0x0d2e1a, 1);
        this.groundGfx.fillRect(0, CONFIG.GROUND_Y, CONFIG.WIDTH, 3);

        // Counter missiles
        for (const cm of this.counterMissiles) {
            cm.draw(this.trailGfx);
        }

        // Enemy missiles
        for (const em of this.enemyMissiles) {
            em.draw(this.trailGfx);
        }

        // Bombers
        for (const bomber of this.bombers) {
            bomber.draw(this.entityGfx);
        }

        // Satellites
        for (const sat of this.satellites) {
            sat.draw(this.entityGfx);
        }

        // Explosions
        for (const exp of this.explosions) {
            exp.draw(this.explosionGfx);
        }

        // Cities
        for (const city of this.cities) {
            city.draw(this.cityGfx);
        }

        // Bases
        for (const base of this.bases) {
            base.draw(this.baseGfx);
        }

        // Power-ups
        this.powerUpSystem.draw(this.powerUpGfx);

        // Particles
        this.particleSystem.draw(this.particleGfx);

        // HUD
        this._drawHUD();

        // Screen flash
        this.screenEffects.drawFlash(this.flashGfx);
    }

    shutdown() {
        audioManager.stopMusic();
    }
}
