// defender/js/scenes/GameScene.js — Main gameplay scene

class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameScene' });
    }

    init(data) {
        this.difficulty = data.difficulty || CONFIG.DIFFICULTY.NORMAL;
    }

    create() {
        this.cameras.main.setBackgroundColor(CONFIG.COLORS.BLACK);

        // Game state
        this.score = 0;
        this.lives = CONFIG.SHIP.START_LIVES;
        this.smartBombs = CONFIG.SHIP.SMART_BOMBS_PER_LIFE;
        this.wave = 1;
        this.enemiesKilled = 0;
        this.humanoidsRescued = 0;
        this.nextExtraLife = CONFIG.SCORE.EXTRA_LIFE_AT;
        this.paused = false;
        this.gameOver = false;
        this.waveTransition = false;
        this.waveTransitionTimer = 0;

        // Camera
        this.cameraX = CONFIG.WORLD_WIDTH / 2;

        // Stars background
        this.starGraphics = this.add.graphics();
        this.stars = [];
        for (let i = 0; i < CONFIG.STAR_COUNT; i++) {
            this.stars.push({
                x: Math.random() * CONFIG.WORLD_WIDTH,
                y: Math.random() * (CONFIG.GROUND_Y - 50) + 45,
                size: Math.random() * 1.2 + 0.3,
                alpha: Math.random() * 0.4 + 0.2,
            });
        }

        // Terrain
        this.terrain = new Terrain(this);

        // Ship
        this.ship = new Ship(this);
        this.ship.makeInvincible();

        // Bullets
        this.bullets = [];

        // Enemies
        this.landers = [];
        this.mutants = [];
        this.bombers = [];
        this.pods = [];
        this.swarmers = [];

        // Humanoids
        this.humanoids = [];
        this._spawnHumanoids();

        // Explosions
        this.explosions = [];
        this.explosionGraphics = this.add.graphics();

        // HUD
        this.hudGraphics = this.add.graphics();
        this.scoreText = this.add.text(8, 8, 'SCORE: 0', {
            fontSize: '14px', fontFamily: 'monospace', color: '#ffffff',
        });
        this.livesText = this.add.text(8, 26, `LIVES: ${this.lives}`, {
            fontSize: '12px', fontFamily: 'monospace', color: '#00ff00',
        });
        this.bombText = this.add.text(140, 26, `BOMBS: ${this.smartBombs}`, {
            fontSize: '12px', fontFamily: 'monospace', color: '#ffff00',
        });
        this.waveText = this.add.text(CONFIG.WIDTH - 8, 8, `WAVE ${this.wave}`, {
            fontSize: '14px', fontFamily: 'monospace', color: '#00ccff',
        }).setOrigin(1, 0);

        // Radar
        this.radarGraphics = this.add.graphics();

        // Pause overlay
        this.pauseText = this.add.text(CONFIG.WIDTH / 2, CONFIG.HEIGHT / 2, 'PAUSED', {
            fontSize: '48px', fontFamily: 'monospace', color: '#ffffff', fontStyle: 'bold',
        }).setOrigin(0.5).setVisible(false).setDepth(100);

        // Mute indicator
        this.muteText = this.add.text(CONFIG.WIDTH - 8, CONFIG.HEIGHT - 8, '', {
            fontSize: '12px', fontFamily: 'monospace', color: '#ff4444',
        }).setOrigin(1, 1);

        // Wave announcement
        this.waveAnnounce = this.add.text(CONFIG.WIDTH / 2, CONFIG.HEIGHT / 2, '', {
            fontSize: '36px', fontFamily: 'monospace', color: '#00ccff', fontStyle: 'bold',
        }).setOrigin(0.5).setVisible(false).setDepth(50);

        // Input
        this.cursors = this.input.keyboard.createCursorKeys();
        this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
        this.keyB = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.B);
        this.keyH = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.H);
        this.keyP = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.P);
        this.keyM = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.M);
        this.keyEsc = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);

        this.keyP.on('down', () => this._togglePause());
        this.keyEsc.on('down', () => this._togglePause());
        this.keyM.on('down', () => {
            const muted = audioManager.toggleMute();
            this.muteText.setText(muted ? 'MUTED' : '');
        });
        this.keyB.on('down', () => this._useSmartBomb());
        this.keyH.on('down', () => this._useHyperspace());

        // Spawn first wave
        this._spawnWave();
        this._showWaveAnnouncement();
    }

    update(time, delta) {
        if (this.paused || this.gameOver) return;

        // Clamp delta to avoid physics explosions
        delta = Math.min(delta, 33);

        // Wave transition
        if (this.waveTransition) {
            this.waveTransitionTimer -= delta;
            if (this.waveTransitionTimer <= 0) {
                this.waveTransition = false;
                this.wave++;
                this._spawnWave();
                this._showWaveAnnouncement();
            }
            // Still update ship and drawing during transition
            this.ship.update(delta, this.cursors);
            this.cameraX = this.ship.x;
            this._drawAll(time, delta);
            return;
        }

        // Update ship
        this.ship.update(delta, this.cursors);
        this.cameraX = this.ship.x;

        // Shooting
        if (this.spaceKey.isDown) {
            const bullet = this.ship.shoot(time);
            if (bullet) {
                this.bullets.push(new Bullet(this, bullet.x, bullet.y, bullet.dir));
            }
        }

        // Update bullets
        for (const b of this.bullets) {
            b.update(delta);
        }
        this._cleanupDead(this.bullets);

        // Update enemies
        this._updateLanders(delta, time);
        this._updateMutants(delta);
        this._updateBombers(delta, time);
        this._updatePods(delta);
        this._updateSwarmers(delta);

        // Update humanoids
        for (const h of this.humanoids) {
            h.update(delta);
        }

        // Check if ship is carrying humanoid
        this._updateCarriedHumanoid();

        // Collision detection
        this._checkCollisions();

        // Update explosions
        this._updateExplosions(delta);

        // Check wave complete
        this._checkWaveComplete();

        // Check extra life
        if (this.score >= this.nextExtraLife) {
            this.lives++;
            this.nextExtraLife += CONFIG.SCORE.EXTRA_LIFE_AT;
            audioManager.extraLife();
        }

        // Draw everything
        this._drawAll(time, delta);
    }

    // --- Spawning ---

    _spawnHumanoids() {
        for (let i = 0; i < CONFIG.HUMANOID.COUNT; i++) {
            const x = Math.random() * CONFIG.WORLD_WIDTH;
            this.humanoids.push(new Humanoid(this, x));
        }
    }

    _spawnWave() {
        const d = this.difficulty;
        const w = this.wave - 1;

        const landerCount = Math.min(
            d.startWaveLanders + w * d.waveLanderIncrease,
            d.maxEnemiesPerWave
        );
        const bomberCount = Math.min(
            d.startWaveBombers + Math.floor(w / 2) * d.waveBomberIncrease,
            Math.floor(d.maxEnemiesPerWave / 3)
        );
        const podCount = Math.min(
            d.startWavePods + Math.floor(w / 3) * d.wavePodIncrease,
            Math.floor(d.maxEnemiesPerWave / 4)
        );

        for (let i = 0; i < landerCount; i++) {
            const x = (this.ship.x + 400 + Math.random() * (CONFIG.WORLD_WIDTH - 800)) % CONFIG.WORLD_WIDTH;
            const y = 50 + Math.random() * 100;
            this.landers.push(new Lander(this, x, y, this.difficulty));
        }

        for (let i = 0; i < bomberCount; i++) {
            const x = (this.ship.x + 600 + Math.random() * (CONFIG.WORLD_WIDTH - 1200)) % CONFIG.WORLD_WIDTH;
            const y = 100 + Math.random() * 200;
            this.bombers.push(new Bomber(this, x, y, this.difficulty));
        }

        for (let i = 0; i < podCount; i++) {
            const x = (this.ship.x + 500 + Math.random() * (CONFIG.WORLD_WIDTH - 1000)) % CONFIG.WORLD_WIDTH;
            const y = 80 + Math.random() * 150;
            this.pods.push(new Pod(this, x, y, this.difficulty));
        }
    }

    _showWaveAnnouncement() {
        this.waveAnnounce.setText(`WAVE ${this.wave}`).setVisible(true);
        this.time.delayedCall(2000, () => {
            this.waveAnnounce.setVisible(false);
        });
    }

    // --- Enemy Updates ---

    _updateLanders(delta, time) {
        for (let i = this.landers.length - 1; i >= 0; i--) {
            const lander = this.landers[i];
            const result = lander.update(delta, this.humanoids, this.ship.x);

            if (result === 'mutate') {
                // Lander reached top with humanoid → becomes mutant
                const carried = lander.carriedHumanoid;
                if (carried) {
                    carried.alive = false;
                    carried.destroy();
                }
                const mutant = new Mutant(this, lander.x, lander.y, this.difficulty);
                this.mutants.push(mutant);
                audioManager.mutantSpawn();
                lander.alive = false;
                lander.destroy();
                this.landers.splice(i, 1);
            }
        }
        this._cleanupDead(this.landers);
    }

    _updateMutants(delta) {
        for (const m of this.mutants) {
            m.update(delta, this.ship.x, this.ship.y);
        }
        this._cleanupDead(this.mutants);
    }

    _updateBombers(delta, time) {
        for (const b of this.bombers) {
            b.update(delta, time);
        }
        this._cleanupDead(this.bombers);
    }

    _updatePods(delta) {
        for (const p of this.pods) {
            p.update(delta);
        }
        this._cleanupDead(this.pods);
    }

    _updateSwarmers(delta) {
        for (const s of this.swarmers) {
            s.update(delta, this.ship.x, this.ship.y);
        }
        this._cleanupDead(this.swarmers);
    }

    // --- Carried humanoid ---

    _updateCarriedHumanoid() {
        for (const h of this.humanoids) {
            if (h.carried) {
                h.x = this.ship.x;
                h.y = this.ship.y + CONFIG.SHIP.HEIGHT;
                // Check if near ground — deliver
                if (this.ship.y >= CONFIG.GROUND_Y - 40) {
                    h.carried = false;
                    h.y = CONFIG.GROUND_Y - CONFIG.HUMANOID.HEIGHT / 2;
                    h.falling = false;
                    this._addScore(CONFIG.SCORE.HUMANOID_RETURN);
                    audioManager.rescueHumanoid();
                    this.humanoidsRescued++;
                }
            }
        }
    }

    // --- Collisions ---

    _checkCollisions() {
        if (!this.ship.alive) return;

        const shipBounds = this.ship.getBounds();

        // Bullets vs enemies
        for (const bullet of this.bullets) {
            if (!bullet.alive) continue;
            const bb = bullet.getBounds();

            // vs Landers
            for (const e of this.landers) {
                if (!e.alive) continue;
                if (this._rectsOverlap(bb, e.getBounds())) {
                    bullet.alive = false;
                    e.alive = false;
                    const released = e.releaseHumanoid();
                    if (released) {
                        released.falling = true;
                        audioManager.humanoidFall();
                    }
                    this._addScore(CONFIG.SCORE.LANDER);
                    this._spawnExplosion(e.x, e.y, CONFIG.COLORS.LANDER);
                    this.enemiesKilled++;
                    e.destroy();
                }
            }

            // vs Mutants
            for (const e of this.mutants) {
                if (!e.alive) continue;
                if (this._rectsOverlap(bb, e.getBounds())) {
                    bullet.alive = false;
                    e.alive = false;
                    this._addScore(CONFIG.SCORE.MUTANT);
                    this._spawnExplosion(e.x, e.y, CONFIG.COLORS.MUTANT);
                    this.enemiesKilled++;
                    e.destroy();
                }
            }

            // vs Bombers
            for (const e of this.bombers) {
                if (!e.alive) continue;
                if (this._rectsOverlap(bb, e.getBounds())) {
                    bullet.alive = false;
                    e.alive = false;
                    this._addScore(CONFIG.SCORE.BOMBER);
                    this._spawnExplosion(e.x, e.y, CONFIG.COLORS.BOMBER);
                    this.enemiesKilled++;
                    e.destroy();
                }
            }

            // vs Pods
            for (const e of this.pods) {
                if (!e.alive) continue;
                if (this._rectsOverlap(bb, e.getBounds())) {
                    bullet.alive = false;
                    e.alive = false;
                    this._addScore(CONFIG.SCORE.POD);
                    this._spawnExplosion(e.x, e.y, CONFIG.COLORS.POD);
                    this.enemiesKilled++;
                    // Spawn swarmers
                    for (let s = 0; s < CONFIG.POD.SWARMER_COUNT; s++) {
                        this.swarmers.push(new Swarmer(this, e.x, e.y, this.difficulty));
                    }
                    e.destroy();
                }
            }

            // vs Swarmers
            for (const e of this.swarmers) {
                if (!e.alive) continue;
                if (this._rectsOverlap(bb, e.getBounds())) {
                    bullet.alive = false;
                    e.alive = false;
                    this._addScore(CONFIG.SCORE.SWARMER);
                    this._spawnExplosion(e.x, e.y, CONFIG.COLORS.SWARMER);
                    this.enemiesKilled++;
                    e.destroy();
                }
            }

            // vs Bomber mines
            for (const b of this.bombers) {
                if (!b.alive) continue;
                for (const mb of b.getMineBounds()) {
                    if (this._rectsOverlap(bb, mb)) {
                        bullet.alive = false;
                        mb.mine.alive = false;
                        this._addScore(CONFIG.SCORE.MINE);
                        this._spawnExplosion(mb.mine.x, mb.mine.y, CONFIG.COLORS.BOMBER_MINE);
                    }
                }
            }
        }

        // Ship vs enemies (if not invincible)
        if (!this.ship.invincible) {
            const allEnemies = [
                ...this.landers, ...this.mutants, ...this.bombers,
                ...this.pods, ...this.swarmers,
            ];
            for (const e of allEnemies) {
                if (!e.alive) continue;
                if (this._rectsOverlap(shipBounds, e.getBounds())) {
                    this._playerDeath();
                    return;
                }
            }

            // Ship vs mines
            for (const b of this.bombers) {
                if (!b.alive) continue;
                for (const mb of b.getMineBounds()) {
                    if (this._rectsOverlap(shipBounds, mb)) {
                        this._playerDeath();
                        return;
                    }
                }
            }
        }

        // Ship vs falling humanoids (rescue)
        for (const h of this.humanoids) {
            if (!h.alive || !h.falling || h.carried) continue;
            const hb = h.getBounds();
            if (this._rectsOverlap(shipBounds, hb)) {
                h.falling = false;
                h.carried = true;
                this._addScore(CONFIG.SCORE.HUMANOID_RESCUE);
                audioManager.rescueHumanoid();
            }
        }
    }

    _rectsOverlap(a, b) {
        // Handle world wrapping for collision
        const dx = this._worldDist(a.x + a.width / 2, b.x + b.width / 2);
        const halfW = (a.width + b.width) / 2;
        if (Math.abs(dx) > halfW) return false;
        return a.y < b.y + b.height && a.y + a.height > b.y;
    }

    _worldDist(ax, bx) {
        let d = ax - bx;
        if (d > CONFIG.WORLD_WIDTH / 2) d -= CONFIG.WORLD_WIDTH;
        if (d < -CONFIG.WORLD_WIDTH / 2) d += CONFIG.WORLD_WIDTH;
        return d;
    }

    // --- Player death ---

    _playerDeath() {
        this._spawnExplosion(this.ship.x, this.ship.y, CONFIG.COLORS.SHIP);
        audioManager.explosion();

        // Release any carried humanoid
        for (const h of this.humanoids) {
            if (h.carried) {
                h.carried = false;
                h.falling = true;
            }
        }

        this.lives--;
        if (this.lives <= 0) {
            this.gameOver = true;
            this.time.delayedCall(1500, () => {
                this.scene.start('GameOverScene', {
                    score: this.score,
                    wave: this.wave,
                    enemiesKilled: this.enemiesKilled,
                    humanoidsRescued: this.humanoidsRescued,
                    difficulty: this.difficulty,
                });
            });
        } else {
            // Respawn
            this.ship.x = CONFIG.WORLD_WIDTH / 2;
            this.ship.y = CONFIG.HEIGHT / 2;
            this.ship.vx = 0;
            this.ship.vy = 0;
            this.ship.makeInvincible();
            this.smartBombs = CONFIG.SHIP.SMART_BOMBS_PER_LIFE;
        }
    }

    // --- Smart bomb ---

    _useSmartBomb() {
        if (this.paused || this.smartBombs <= 0) return;
        this.smartBombs--;
        audioManager.smartBomb();

        // Destroy all visible enemies
        const allEnemies = [
            ...this.landers, ...this.mutants, ...this.bombers,
            ...this.pods, ...this.swarmers,
        ];

        for (const e of allEnemies) {
            if (!e.alive) continue;
            const sx = this._toScreenX(e.x);
            if (sx >= -50 && sx <= CONFIG.WIDTH + 50) {
                e.alive = false;
                this._spawnExplosion(e.x, e.y, CONFIG.COLORS.SMART_BOMB_ICON);
                this.enemiesKilled++;

                // Release humanoids from landers
                if (e instanceof Lander) {
                    const released = e.releaseHumanoid();
                    if (released) {
                        released.falling = true;
                    }
                }
                // Pods spawn swarmers even on smart bomb
                if (e instanceof Pod) {
                    for (let s = 0; s < CONFIG.POD.SWARMER_COUNT; s++) {
                        this.swarmers.push(new Swarmer(this, e.x + (Math.random() - 0.5) * 30, e.y, this.difficulty));
                    }
                }
                e.destroy();
            }
        }

        // Destroy visible mines
        for (const b of this.bombers) {
            for (const m of b.mines) {
                const sx = this._toScreenX(m.x);
                if (sx >= -50 && sx <= CONFIG.WIDTH + 50) {
                    m.alive = false;
                }
            }
        }

        // Screen flash
        this.cameras.main.flash(200, 255, 255, 255);
    }

    // --- Hyperspace ---

    _useHyperspace() {
        if (this.paused) return;
        const died = this.ship.hyperspace();
        if (died) {
            this._playerDeath();
        }
    }

    // --- Explosions ---

    _spawnExplosion(x, y, color) {
        const particles = [];
        for (let i = 0; i < 12; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 40 + Math.random() * 120;
            particles.push({
                x: x,
                y: y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: 0.3 + Math.random() * 0.3,
                maxLife: 0.3 + Math.random() * 0.3,
                size: 1 + Math.random() * 3,
            });
        }
        this.explosions.push({ particles, color });
        audioManager.explosion();
    }

    _updateExplosions(delta) {
        const dt = delta / 1000;
        for (let i = this.explosions.length - 1; i >= 0; i--) {
            const exp = this.explosions[i];
            let allDead = true;
            for (const p of exp.particles) {
                p.life -= dt;
                if (p.life > 0) {
                    allDead = false;
                    p.x += p.vx * dt;
                    p.y += p.vy * dt;
                    p.vx *= 0.95;
                    p.vy *= 0.95;
                }
            }
            if (allDead) {
                this.explosions.splice(i, 1);
            }
        }
    }

    // --- Wave completion ---

    _checkWaveComplete() {
        const totalEnemies = this.landers.length + this.mutants.length +
            this.bombers.length + this.pods.length + this.swarmers.length;

        if (totalEnemies === 0 && !this.waveTransition) {
            this.waveTransition = true;
            this.waveTransitionTimer = 2000;
            this._addScore(CONFIG.SCORE.WAVE_BONUS);
            audioManager.waveComplete();
        }
    }

    // --- Scoring ---

    _addScore(points) {
        this.score += points;
    }

    // --- Pause ---

    _togglePause() {
        this.paused = !this.paused;
        this.pauseText.setVisible(this.paused);
    }

    // --- Coordinate helpers ---

    _toScreenX(worldX) {
        let sx = worldX - this.cameraX;
        if (sx < -CONFIG.WORLD_WIDTH / 2) sx += CONFIG.WORLD_WIDTH;
        if (sx > CONFIG.WORLD_WIDTH / 2) sx -= CONFIG.WORLD_WIDTH;
        return sx + CONFIG.WIDTH / 2;
    }

    // --- Drawing ---

    _drawAll(time, delta) {
        // Stars
        this.starGraphics.clear();
        for (const s of this.stars) {
            const sx = this._toScreenX(s.x);
            if (sx < -10 || sx > CONFIG.WIDTH + 10) continue;
            const a = s.alpha + Math.sin(time / 800 + s.x) * 0.1;
            this.starGraphics.fillStyle(CONFIG.COLORS.STAR, Math.max(0.05, a));
            this.starGraphics.fillCircle(sx, s.y, s.size);
        }

        // Terrain
        this.terrain.draw(this.cameraX);

        // Ship screen position
        this.ship.setScreenPosition(CONFIG.WIDTH / 2);

        // Bullets
        for (const b of this.bullets) {
            if (!b.alive) continue;
            b.draw(this._toScreenX(b.x));
        }

        // Enemies
        for (const e of this.landers) {
            if (!e.alive) continue;
            const sx = this._toScreenX(e.x);
            if (sx > -30 && sx < CONFIG.WIDTH + 30) e.draw(sx);
            else e.graphics.clear();
        }
        for (const e of this.mutants) {
            if (!e.alive) continue;
            const sx = this._toScreenX(e.x);
            if (sx > -30 && sx < CONFIG.WIDTH + 30) e.draw(sx);
            else e.graphics.clear();
        }
        for (const e of this.bombers) {
            if (!e.alive) continue;
            const sx = this._toScreenX(e.x);
            if (sx > -30 && sx < CONFIG.WIDTH + 30) e.draw(sx, this.cameraX);
            else e.graphics.clear();
        }
        for (const e of this.pods) {
            if (!e.alive) continue;
            const sx = this._toScreenX(e.x);
            if (sx > -30 && sx < CONFIG.WIDTH + 30) e.draw(sx);
            else e.graphics.clear();
        }
        for (const e of this.swarmers) {
            if (!e.alive) continue;
            const sx = this._toScreenX(e.x);
            if (sx > -30 && sx < CONFIG.WIDTH + 30) e.draw(sx);
            else e.graphics.clear();
        }

        // Humanoids
        for (const h of this.humanoids) {
            if (!h.alive) continue;
            const sx = this._toScreenX(h.x);
            if (sx > -20 && sx < CONFIG.WIDTH + 20) h.draw(sx);
            else h.graphics.clear();
        }

        // Explosions
        this.explosionGraphics.clear();
        for (const exp of this.explosions) {
            for (const p of exp.particles) {
                if (p.life <= 0) continue;
                const sx = this._toScreenX(p.x);
                if (sx < -20 || sx > CONFIG.WIDTH + 20) continue;
                const alpha = p.life / p.maxLife;
                this.explosionGraphics.fillStyle(exp.color, alpha);
                this.explosionGraphics.fillCircle(sx, p.y, p.size * alpha);
            }
        }

        // HUD
        this.scoreText.setText(`SCORE: ${this.score}`);
        this.livesText.setText(`LIVES: ${this.lives}`);
        this.bombText.setText(`BOMBS: ${this.smartBombs}`);
        this.waveText.setText(`WAVE ${this.wave}`);

        // Radar minimap
        this._drawRadar();
    }

    _drawRadar() {
        const r = CONFIG.RADAR;
        this.radarGraphics.clear();

        // Background
        this.radarGraphics.fillStyle(CONFIG.COLORS.RADAR_BG, 0.7);
        this.radarGraphics.fillRect(r.X, r.Y, r.WIDTH, r.HEIGHT);

        // Border
        this.radarGraphics.lineStyle(1, CONFIG.COLORS.RADAR_BORDER, 0.8);
        this.radarGraphics.strokeRect(r.X, r.Y, r.WIDTH, r.HEIGHT);

        const xScale = r.WIDTH / CONFIG.WORLD_WIDTH;
        const yScale = r.HEIGHT / CONFIG.HEIGHT;

        // Camera view indicator
        const viewWidth = (CONFIG.WIDTH / CONFIG.WORLD_WIDTH) * r.WIDTH;
        const viewX = r.X + ((this.cameraX - CONFIG.WIDTH / 2 + CONFIG.WORLD_WIDTH) % CONFIG.WORLD_WIDTH) * xScale;
        this.radarGraphics.lineStyle(0.5, CONFIG.COLORS.RADAR_BORDER, 0.4);
        this.radarGraphics.strokeRect(viewX, r.Y, viewWidth, r.HEIGHT);

        // Player dot
        const px = r.X + this.ship.x * xScale;
        const py = r.Y + this.ship.y * yScale;
        this.radarGraphics.fillStyle(CONFIG.COLORS.RADAR_PLAYER, 1);
        this.radarGraphics.fillRect(px - 1, py - 1, 3, 2);

        // Enemy dots
        this.radarGraphics.fillStyle(CONFIG.COLORS.RADAR_ENEMY, 0.9);
        const allEnemies = [
            ...this.landers, ...this.mutants, ...this.bombers,
            ...this.pods, ...this.swarmers,
        ];
        for (const e of allEnemies) {
            if (!e.alive) continue;
            const ex = r.X + e.x * xScale;
            const ey = r.Y + e.y * yScale;
            this.radarGraphics.fillRect(ex, ey, 1.5, 1.5);
        }

        // Humanoid dots
        this.radarGraphics.fillStyle(CONFIG.COLORS.RADAR_HUMANOID, 0.8);
        for (const h of this.humanoids) {
            if (!h.alive) continue;
            const hx = r.X + h.x * xScale;
            const hy = r.Y + h.y * yScale;
            this.radarGraphics.fillRect(hx, hy, 1, 1.5);
        }
    }

    // --- Cleanup ---

    _cleanupDead(arr) {
        for (let i = arr.length - 1; i >= 0; i--) {
            if (!arr[i].alive) {
                arr[i].destroy();
                arr.splice(i, 1);
            }
        }
    }

    shutdown() {
        // Cleanup all entities
        this.ship.destroy();
        this.terrain.destroy();
        for (const b of this.bullets) b.destroy();
        for (const e of this.landers) e.destroy();
        for (const e of this.mutants) e.destroy();
        for (const e of this.bombers) e.destroy();
        for (const e of this.pods) e.destroy();
        for (const e of this.swarmers) e.destroy();
        for (const h of this.humanoids) h.destroy();
    }
}
