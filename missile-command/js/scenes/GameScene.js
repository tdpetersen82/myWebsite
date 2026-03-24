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
        this.skyGfx = this.add.graphics();
        this._drawSkyBackground();
        this.moonGfx = this.add.graphics();
        this._drawMoon();
        this.starGfx = this.add.graphics();
        this.mountainGfx = this.add.graphics();
        this._drawMountains();
        this.groundGfx = this.add.graphics();
        this.trailGfx = this.add.graphics();
        this.entityGfx = this.add.graphics();
        this.explosionGfx = this.add.graphics();
        this.cityGfx = this.add.graphics();
        this.baseGfx = this.add.graphics();
        this.particleGfx = this.add.graphics();
        this.hudGfx = this.add.graphics();
        this.flashGfx = this.add.graphics();

        // Systems
        this.particleSystem = new ParticleSystem();
        this.screenEffects = new ScreenEffects(this);
        this.waveManager = new WaveManager(this.diffConfig);
        this.comboSystem = new ComboSystem();

        // Upgrade state
        this.upgradeState = {
            explosionLevel: 0,
            missileSpeedLevel: 0,
            ammoLevel: 0,
            fortifyLevel: 0,
            newCityLevel: 0,
            trackingLevel: 0,
            pointDefenseLevel: 0,
            shieldLevel: 0,
            leftBaseUnlocked: 0,
            rightBaseUnlocked: 0,
        };
        this.explosionRadiusMultiplier = 1;
        this.missileSpeedMultiplier = 1;

        // Stars
        this.stars = [];
        for (let i = 0; i < CONFIG.STARS.COUNT; i++) {
            this.stars.push({
                x: Math.random() * CONFIG.WIDTH,
                y: Math.random() * CONFIG.GROUND_Y,
                brightness: Math.random(),
            });
        }

        // Game entities — only center base starts unlocked
        this.bases = CONFIG.BASE.POSITIONS.map((x, i) => {
            const b = new Base(x, i);
            b.setDifficulty(this.diffConfig);
            if (!CONFIG.BASE.STARTING_UNLOCKED.includes(i)) {
                b.locked = true;
            }
            return b;
        });

        this.cities = CONFIG.CITY.POSITIONS.map((x, i) => new City(x, i));

        this.counterMissiles = [];
        this.enemyMissiles = [];
        this.explosions = [];
        this.bombers = [];
        this.satellites = [];
        this.pointDefenses = [];
        this.craters = [];

        // Game state
        this.score = 0;
        this.money = 0;
        this.waveMoneyEarned = 0;
        this.highScore = parseInt(localStorage.getItem('missileCommandHighScore')) || 0;
        this.gameOver = false;
        this.paused = false;
        this.upgradeScreenActive = false;
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

        // Combo HUD label (persistent, near combo meter)
        this.comboHudText = this.add.text(CONFIG.WIDTH / 2, 28, '', {
            fontSize: '11px', fontFamily: 'monospace', color: '#ffdd57', fontStyle: 'bold',
            stroke: '#000000', strokeThickness: 2,
        }).setOrigin(0.5, 0).setAlpha(0);

        // Money display
        this.moneyText = this.add.text(CONFIG.WIDTH - 10, 8, '', {
            fontSize: '16px', fontFamily: 'monospace', color: '#44ff44', fontStyle: 'bold',
            stroke: '#000000', strokeThickness: 2,
        }).setOrigin(1, 0);

        // Base ammo count texts
        this.baseAmmoTexts = this.bases.map(base => {
            return this.add.text(base.x, base.y - 28, '', {
                fontSize: '12px', fontFamily: 'monospace', color: '#44ff44', fontStyle: 'bold',
                stroke: '#000000', strokeThickness: 2,
            }).setOrigin(0.5);
        });

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
        this.muteText = this.add.text(CONFIG.WIDTH - 10, 28, '', {
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

        // Fire missile
        let baseIdx;

        if (this.forcedBaseIndex >= 0 && this.bases[this.forcedBaseIndex] &&
            this.bases[this.forcedBaseIndex].alive &&
            this.bases[this.forcedBaseIndex].ammo > 0) {
            baseIdx = this.forcedBaseIndex;
        } else {
            baseIdx = Helpers.nearestBase(pointer.x, this.bases);
        }

        if (baseIdx < 0) return;

        const base = this.bases[baseIdx];
        if (base.fire()) {
            base.aimAt(pointer.x, pointer.y);
            const speed = CONFIG.COUNTER_MISSILE_SPEED * this.missileSpeedMultiplier;
            let missile;
            if (this.upgradeState.trackingLevel > 0) {
                missile = new TrackingMissile(base.x, base.y - 15, pointer.x, pointer.y, speed, this.upgradeState.trackingLevel);
            } else {
                missile = new CounterMissile(base.x, base.y - 15, pointer.x, pointer.y, speed);
            }
            this.counterMissiles.push(missile);
            this.missilesFired++;
            audioManager.playLaunch();
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
                        this.money += em.points; // Base points as money
                        this.waveMoneyEarned += em.points;
                        this.comboSystem.registerKill(em.x, em.y);
                        this.enemiesDestroyed++;
                        this.particleSystem.emitSparks(em.x, em.y, em.color);
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
                        this.money += bomber.points;
                        this.waveMoneyEarned += bomber.points;
                        this.comboSystem.registerKill(bomber.x, bomber.y);
                        this.enemiesDestroyed++;
                        audioManager.playBomberDestroyed();
                        this.particleSystem.emitExplosion(bomber.x, bomber.y, 30);
                        this.screenEffects.shake(3, 150);
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
                        this.money += sat.points;
                        this.waveMoneyEarned += sat.points;
                        this.comboSystem.registerKill(sat.x, sat.y);
                        this.enemiesDestroyed++;
                        audioManager.playBomberDestroyed();
                        this.particleSystem.emitExplosion(sat.x, sat.y, 40);
                        this.screenEffects.shake(5, 200);
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

            // Add crater
            this.craters.push({ x: em.x, radius: Helpers.randomRange(4, 8) });
            if (this.craters.length > 30) this.craters.shift();

            // Check city hits (shields absorb first via city.takeDamage)
            for (const city of this.cities) {
                if (!city.alive) continue;
                if (Math.abs(em.targetX - city.x) < 30) {
                    const hadShield = city.shieldHP > 0;
                    city.takeDamage();
                    if (hadShield && city.shieldHP >= 0 && city.alive) {
                        audioManager.playShieldAbsorb();
                        if (city.shieldHP <= 0) audioManager.playShieldBreak();
                    } else if (!city.alive) {
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
                        totalMoneyEarned: this.money + this.waveMoneyEarned,
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

        // Bonus wave intermission complete → transition to upgrade screen
        if (wm.isIntermissionComplete() && !this.upgradeScreenActive) {
            audioManager.playWaveComplete();

            const aliveBases = this.bases.filter(b => b.alive);
            const aliveCities = this.cities.filter(c => c.alive);
            let ammoBonus = 0;
            aliveBases.forEach(b => { ammoBonus += b.ammo * 5; });
            const cityBonus = aliveCities.length * this.diffConfig.bonusCityPoints;
            this.score += ammoBonus + cityBonus;

            for (const city of aliveCities) { city.grow(); }
            for (const city of this.cities) { city.regenShield(this.waveManager.wave); }

            let moneyCityBonus = 0;
            for (const city of aliveCities) { moneyCityBonus += city.getValue(); }
            let moneyAmmoBonus = 0;
            aliveBases.forEach(b => { moneyAmmoBonus += b.ammo * CONFIG.UPGRADE.MONEY.PER_AMMO_REMAINING; });
            this.money += moneyCityBonus + moneyAmmoBonus;
            this.waveMoneyEarned += moneyCityBonus + moneyAmmoBonus;

            const bonusStr = `BONUS COMPLETE!  |  MONEY: +$${moneyCityBonus + moneyAmmoBonus}`;
            this.bonusText.setText(bonusStr);
            this.bonusText.setAlpha(1);
            this.tweens.add({ targets: this.bonusText, alpha: 0, duration: 2500, delay: 800 });

            this.upgradeScreenActive = true;
            this.time.delayedCall(2000, () => { this._launchUpgradeScreen(); });
        }

        // Check if all enemies are done and no missiles on screen
        if (wm.state === 'spawning' && wm.enemyMissilesRemaining <= 0 &&
            this.enemyMissiles.filter(m => !m.dead).length === 0 &&
            this.bombers.filter(b => !b.dead).length === 0 &&
            this.satellites.filter(s => !s.dead).length === 0 &&
            !this.upgradeScreenActive) {

            // Wave complete!
            audioManager.playWaveComplete();

            // Calculate score bonuses
            const aliveBases = this.bases.filter(b => b.alive);
            const aliveCities = this.cities.filter(c => c.alive);
            let ammoBonus = 0;
            aliveBases.forEach(b => { ammoBonus += b.ammo * 5; });
            const cityBonus = aliveCities.length * this.diffConfig.bonusCityPoints;
            this.score += ammoBonus + cityBonus;

            // Grow surviving cities
            for (const city of aliveCities) {
                city.grow();
            }

            // Regen shields
            for (const city of this.cities) {
                city.regenShield(this.waveManager.wave);
            }

            // Calculate money bonuses (city income scales with buildings)
            let moneyCityBonus = 0;
            for (const city of aliveCities) {
                moneyCityBonus += city.getValue();
            }
            let moneyAmmoBonus = 0;
            aliveBases.forEach(b => { moneyAmmoBonus += b.ammo * CONFIG.UPGRADE.MONEY.PER_AMMO_REMAINING; });
            this.money += moneyCityBonus + moneyAmmoBonus;
            this.waveMoneyEarned += moneyCityBonus + moneyAmmoBonus;

            // Show bonus
            const bonusStr = `SCORE BONUS: +${ammoBonus + cityBonus}  |  MONEY: +$${moneyCityBonus + moneyAmmoBonus}`;
            this.bonusText.setText(bonusStr);
            this.bonusText.setAlpha(1);
            this.tweens.add({
                targets: this.bonusText,
                alpha: 0,
                duration: 2500,
                delay: 800,
            });

            // Launch upgrade screen after brief delay
            this.upgradeScreenActive = true;
            this.time.delayedCall(2000, () => {
                this._launchUpgradeScreen();
            });
        }
    }

    _launchUpgradeScreen() {
        this.scene.pause();
        this.scene.launch('UpgradeScene', {
            money: this.money,
            wave: this.waveManager.wave,
            waveEarnings: this.waveMoneyEarned,
            score: this.score,
            difficultyKey: this.difficultyKey,
            upgradeState: Object.assign({}, this.upgradeState),
            cityStates: this.cities.map(c => ({ alive: c.alive, damageLevel: c.damageLevel, income: c.income })),
            baseStates: this.bases.map(b => ({ alive: b.alive, damaged: b.damaged, locked: b.locked })),
        });
    }

    applyUpgradeResults(results) {
        this.money = results.money;
        const prevState = Object.assign({}, this.upgradeState);
        Object.assign(this.upgradeState, results.upgradeState);

        // Apply explosion size upgrade
        this.explosionRadiusMultiplier = 1 + this.upgradeState.explosionLevel * 0.2;

        // Apply missile speed upgrade
        this.missileSpeedMultiplier = 1 + this.upgradeState.missileSpeedLevel * 0.25;

        // Apply ammo upgrade
        const extraAmmo = this.upgradeState.ammoLevel * 3;
        this.bases.forEach(b => {
            if (b.alive) {
                b.maxAmmo = this.diffConfig.baseAmmo + extraAmmo;
                b.refillAmmo();
            }
        });

        // Apply fortification to all cities
        const maxDmg = 3 + this.upgradeState.fortifyLevel;
        this.cities.forEach(c => { c.maxDamage = maxDmg; });

        // Rebuild cities
        for (const idx of results.rebuiltCities) {
            if (idx < this.cities.length) {
                this.cities[idx].rebuild();
                this.cities[idx].maxDamage = maxDmg;
            }
        }

        // Repair bases
        for (const idx of results.repairedBases) {
            if (idx < this.bases.length) {
                this.bases[idx].repair();
                this.bases[idx].maxAmmo = this.diffConfig.baseAmmo + extraAmmo;
                this.bases[idx].refillAmmo();
            }
        }

        // Unlock bases
        if (this.upgradeState.leftBaseUnlocked && this.bases[0].locked) {
            this.bases[0].unlock();
            this.bases[0].setDifficulty(this.diffConfig);
            this.bases[0].maxAmmo = this.diffConfig.baseAmmo + extraAmmo;
            this.bases[0].refillAmmo();
            audioManager.playBaseUnlock();
        }
        if (this.upgradeState.rightBaseUnlocked && this.bases[2].locked) {
            this.bases[2].unlock();
            this.bases[2].setDifficulty(this.diffConfig);
            this.bases[2].maxAmmo = this.diffConfig.baseAmmo + extraAmmo;
            this.bases[2].refillAmmo();
            audioManager.playBaseUnlock();
        }

        // Build new cities
        const newCitiesToBuild = this.upgradeState.newCityLevel - prevState.newCityLevel;
        for (let i = 0; i < newCitiesToBuild; i++) {
            const posIdx = prevState.newCityLevel + i;
            if (posIdx < CONFIG.UPGRADE.NEW_CITY_POSITIONS.length) {
                const pos = CONFIG.UPGRADE.NEW_CITY_POSITIONS[posIdx];
                const city = new City(pos, this.cities.length);
                city.maxDamage = maxDmg;
                this.cities.push(city);
            }
        }

        // Apply shield level to all cities
        if (this.upgradeState.shieldLevel > 0) {
            for (const city of this.cities) {
                if (city.alive) {
                    city.applyShieldLevel(this.upgradeState.shieldLevel);
                }
            }
        }

        // Point defense turrets
        if (this.upgradeState.pointDefenseLevel > 0) {
            const level = this.upgradeState.pointDefenseLevel;
            const turretCount = CONFIG.POINT_DEFENSE.TURRETS_PER_LEVEL[level - 1];
            this.pointDefenses = [];
            const aliveCities = this.cities.filter(c => c.alive);
            for (let i = 0; i < Math.min(turretCount, aliveCities.length); i++) {
                this.pointDefenses.push(new PointDefense(aliveCities[i].x, aliveCities[i].y, level));
            }
        }

        // Reset wave money tracking and start next wave
        this.waveMoneyEarned = 0;
        this.upgradeScreenActive = false;
        this.waveManager.startNextWave();

        // Ammo floor: ensure total ammo across alive bases >= wave enemy count
        const aliveBases = this.bases.filter(b => b.alive && !b.locked);
        const totalAmmo = aliveBases.reduce((sum, b) => sum + b.ammo, 0);
        const enemyCount = this.waveManager.enemyMissilesTotal;
        if (totalAmmo < enemyCount && aliveBases.length > 0) {
            const minPerBase = Math.ceil(enemyCount / aliveBases.length);
            aliveBases.forEach(b => {
                if (b.ammo < minPerBase) {
                    b.maxAmmo = Math.max(b.maxAmmo, minPerBase);
                    b.ammo = minPerBase;
                }
            });
        }
    }

    _updateHUD() {
        this.scoreText.setText(Helpers.formatNumber(this.score));
        this.highScoreText.setText('HI: ' + Helpers.formatNumber(this.highScore));
        this.waveText.setText('WAVE ' + this.waveManager.wave);
        this.moneyText.setText('$' + Helpers.formatNumber(this.money));

        // Combo HUD label
        if (this.comboSystem.count > 0) {
            const cs = this.comboSystem;
            const label = cs.multiplier > 1
                ? 'x' + cs.multiplier + ' COMBO'
                : cs.count + ' HIT' + (cs.count > 1 ? 'S' : '');
            this.comboHudText.setText(label);
            this.comboHudText.setAlpha(1);
        } else {
            this.comboHudText.setAlpha(0);
        }

        // Base ammo counts
        for (let i = 0; i < this.bases.length; i++) {
            const base = this.bases[i];
            if (base.alive && base.ammo > 0) {
                this.baseAmmoTexts[i].setText(base.ammo);
                this.baseAmmoTexts[i].setAlpha(0.9);
                this.baseAmmoTexts[i].setColor(base.ammo <= 3 ? '#ff4444' : '#44ff44');
            } else if (base.alive && base.ammo === 0) {
                this.baseAmmoTexts[i].setText('EMPTY');
                this.baseAmmoTexts[i].setAlpha(0.6);
                this.baseAmmoTexts[i].setColor('#ff4444');
            } else {
                this.baseAmmoTexts[i].setAlpha(0);
            }
        }
    }

    _drawHUD() {
        this.hudGfx.clear();

        // Combo meter (only when active)
        if (this.comboSystem.count > 0) {
            this.comboSystem.drawMeter(this.hudGfx, CONFIG.WIDTH / 2 - 40, 42, 80);
        }

        // Wave progress bar
        if (this.waveManager.state === 'spawning') {
            const progress = this.waveManager.getProgress();
            const barW = 100, barH = 3;
            const barX = CONFIG.WIDTH / 2 - barW / 2;
            const barY = 55;
            this.hudGfx.fillStyle(0x222244, 0.3);
            this.hudGfx.fillRect(barX, barY, barW, barH);
            this.hudGfx.fillStyle(0x4488aa, 0.4);
            this.hudGfx.fillRect(barX, barY, barW * progress, barH);
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

        // Bonus wave: unlimited ammo
        const isBonusActive = this.waveManager.state === 'bonus';
        this.bases.forEach(b => { b.bonusAmmo = isBonusActive; });

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

        // Speed multiplier
        const speedMult = this.waveManager.getSpeedMultiplier();

        // Update entities
        this.bases.forEach(b => b.update(dt));
        this.cities.forEach(c => c.update(dt));

        for (const cm of this.counterMissiles) {
            if (cm.update.length >= 3) {
                cm.update(dt, this.particleSystem, this.enemyMissiles);
            } else {
                cm.update(dt, this.particleSystem);
            }
            if (cm.detonated) {
                const expRadius = CONFIG.EXPLOSION.COUNTER_RADIUS * this.explosionRadiusMultiplier;
                this.explosions.push(new Explosion(cm.x, cm.y, expRadius, true));
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

        // Point defenses
        for (const pd of this.pointDefenses) {
            pd.update(dt, this.enemyMissiles);
            const hits = pd.checkHits(this.enemyMissiles);
            for (const em of hits) {
                const killed = em.hit();
                if (killed) {
                    const points = this.comboSystem.getPoints(em.points);
                    this.score += points;
                    this.money += em.points;
                    this.waveMoneyEarned += em.points;
                    this.comboSystem.registerKill(em.x, em.y);
                    this.enemiesDestroyed++;
                    this.particleSystem.emitSparks(em.x, em.y, em.color);
                }
            }
        }

        // Collisions
        this._checkCollisions();

        // Systems
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

        // Clean up dead entities (include newly built cities in draw)
        // Remove only truly dead entities
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
        this.particleGfx.clear();
        this.flashGfx.clear();

        // Stars (varied sizes)
        for (const star of this.stars) {
            const flicker = Math.sin(time * CONFIG.STARS.FLICKER_SPEED + star.brightness * 10) * 0.3 + 0.7;
            const alpha = star.brightness * flicker * 0.55;
            const size = star.brightness < 0.3 ? 0.8 : star.brightness < 0.8 ? 1.2 : 2.0;
            this.starGfx.fillStyle(0xffffff, alpha);
            this.starGfx.fillCircle(star.x, star.y, size);
        }

        // Ground with gradient
        this.groundGfx.fillStyle(0x1e5530, 1);
        this.groundGfx.fillRect(0, CONFIG.GROUND_Y, CONFIG.WIDTH, CONFIG.HEIGHT - CONFIG.GROUND_Y);
        this.groundGfx.fillStyle(0x123820, 1);
        this.groundGfx.fillRect(0, CONFIG.GROUND_Y, CONFIG.WIDTH, 3);
        // Atmospheric haze
        this.groundGfx.fillStyle(0x1a1848, 0.12);
        this.groundGfx.fillRect(0, CONFIG.GROUND_Y - 15, CONFIG.WIDTH, 15);

        // Craters
        for (const c of this.craters) {
            this.groundGfx.fillStyle(0x0a1a0a, 0.4);
            this.groundGfx.fillEllipse(c.x, CONFIG.GROUND_Y + 2, c.radius * 2, 3);
        }

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

        // Point defenses
        for (const pd of this.pointDefenses) {
            pd.draw(this.baseGfx);
        }

        // Particles
        this.particleSystem.draw(this.particleGfx);

        // HUD
        this._drawHUD();

        // Screen flash
        this.screenEffects.drawFlash(this.flashGfx);
    }

    _drawSkyBackground() {
        const g = this.skyGfx;
        const bands = [
            { y: 0, h: CONFIG.HEIGHT * 0.25, color: 0x0a0a30 },
            { y: CONFIG.HEIGHT * 0.25, h: CONFIG.HEIGHT * 0.25, color: 0x141450 },
            { y: CONFIG.HEIGHT * 0.5, h: CONFIG.HEIGHT * 0.25, color: 0x251868 },
            { y: CONFIG.HEIGHT * 0.75, h: CONFIG.HEIGHT * 0.25, color: 0x3a2260 },
        ];
        for (const band of bands) {
            g.fillStyle(band.color, 1);
            g.fillRect(0, band.y, CONFIG.WIDTH, band.h + 1);
        }
        const blendPairs = [
            { y: CONFIG.HEIGHT * 0.25, color: 0x080830 },
            { y: CONFIG.HEIGHT * 0.5, color: 0x120d44 },
            { y: CONFIG.HEIGHT * 0.75, color: 0x221440 },
        ];
        for (const bp of blendPairs) {
            g.fillStyle(bp.color, 0.5);
            g.fillRect(0, bp.y - 10, CONFIG.WIDTH, 20);
        }
    }

    _drawMoon() {
        const g = this.moonGfx;
        const mx = 680, my = 55, r = 22;
        g.fillStyle(0xccccff, 0.04);
        g.fillCircle(mx, my, r * 2.5);
        g.fillStyle(0xccccff, 0.07);
        g.fillCircle(mx, my, r * 1.8);
        g.fillStyle(0xddddee, 0.85);
        g.fillCircle(mx, my, r);
        g.fillStyle(0x0a0a30, 0.3);
        g.fillCircle(mx + r * 0.3, my - r * 0.1, r * 0.85);
    }

    _drawMountains() {
        const g = this.mountainGfx;
        for (const range of CONFIG.MOUNTAINS) {
            g.fillStyle(0x0d1a2a, 0.7);
            g.beginPath();
            g.moveTo(range.x, CONFIG.GROUND_Y);
            for (const peak of range.peaks) {
                g.lineTo(range.x + peak.x, CONFIG.GROUND_Y - peak.h);
            }
            const lastPeak = range.peaks[range.peaks.length - 1];
            g.lineTo(range.x + lastPeak.x + 40, CONFIG.GROUND_Y);
            g.closePath();
            g.fillPath();
        }
    }

    shutdown() {
        audioManager.stopMusic();
    }
}
