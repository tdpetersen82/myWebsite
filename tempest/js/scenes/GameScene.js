// ============================================================
// Tempest — Game Scene (Main Gameplay)
// ============================================================

class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameScene' });
    }

    init(data) {
        this.startLevel = data.startLevel || 1;
    }

    create() {
        this.cameras.main.setBackgroundColor('#000000');

        // Game state
        this.level = this.startLevel;
        this.score = 0;
        this.lives = CONFIG.STARTING_LIVES;
        this.highScore = parseInt(localStorage.getItem(CONFIG.HIGH_SCORE_KEY)) || 0;
        this.nextExtraLife = CONFIG.EXTRA_LIFE_SCORE;
        this.paused = false;
        this.gameOver = false;
        this.warping = false;
        this.warpProgress = 0;
        this.warpStartTime = 0;
        this.levelComplete = false;
        this.zapperFlash = 0;
        this.enemiesKilled = 0;
        this.totalEnemiesKilled = 0;
        this.levelTransitionTimer = 0;

        // Audio
        this.audio = new AudioManager();

        // Graphics layers
        this.tubeGraphics = this.add.graphics();
        this.entityGraphics = this.add.graphics();
        this.uiGraphics = this.add.graphics();
        this.glowGraphics = this.add.graphics();

        // Enemies and bullets
        this.enemies = [];
        this.bullets = [];
        this.explosions = [];
        this.spawnQueue = [];
        this.spawnTimer = 0;
        this.totalEnemiesForLevel = 0;
        this.enemiesSpawned = 0;

        // UI
        this.scoreText = this.add.text(10, 10, 'SCORE: 0', {
            fontFamily: 'monospace', fontSize: '18px', color: '#ffff00'
        });
        this.highScoreText = this.add.text(CONFIG.WIDTH / 2, 10, `HI: ${this.highScore}`, {
            fontFamily: 'monospace', fontSize: '18px', color: '#00ff88'
        }).setOrigin(0.5, 0);
        this.livesText = this.add.text(CONFIG.WIDTH - 10, 10, `LIVES: ${this.lives}`, {
            fontFamily: 'monospace', fontSize: '18px', color: '#ff4444'
        }).setOrigin(1, 0);
        this.levelText = this.add.text(CONFIG.WIDTH / 2, 35, `LEVEL ${this.level}`, {
            fontFamily: 'monospace', fontSize: '16px', color: '#4488ff'
        }).setOrigin(0.5, 0);
        this.zapperText = this.add.text(10, 35, 'ZAPPER: READY', {
            fontFamily: 'monospace', fontSize: '14px', color: '#ffffff'
        });
        this.pauseText = this.add.text(CONFIG.WIDTH / 2, CONFIG.HEIGHT / 2, 'PAUSED', {
            fontFamily: 'monospace', fontSize: '48px', color: '#ffff00'
        }).setOrigin(0.5).setVisible(false);
        this.muteText = this.add.text(CONFIG.WIDTH - 10, 35, '', {
            fontFamily: 'monospace', fontSize: '14px', color: '#888888'
        }).setOrigin(1, 0);

        // Input setup
        this.keys = {
            left: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.LEFT),
            right: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.RIGHT),
            space: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE),
            z: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.Z),
            p: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.P),
            esc: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC),
            m: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.M),
        };

        // Start level
        this._initLevel();
    }

    _initLevel() {
        this.levelConfig = getLevelConfig(this.level);
        this.tube = new Tube(
            this.levelConfig.tubeDef,
            CONFIG.CENTER_X,
            CONFIG.CENTER_Y,
            CONFIG.TUBE_OUTER_RADIUS,
            CONFIG.TUBE_INNER_RADIUS
        );
        this.blaster = new Blaster(this.tube);
        this.blaster.invincible = true;
        this.blaster.invincibleTimer = 2000;
        this.enemies = [];
        this.bullets = [];
        this.explosions = [];
        this.warping = false;
        this.warpProgress = 0;
        this.levelComplete = false;
        this.enemiesKilled = 0;
        this.enemiesSpawned = 0;
        this.blaster.superZapperUsed = 0;

        // Build spawn queue
        this.spawnQueue = [];
        const lc = this.levelConfig;
        for (let i = 0; i < lc.flipperCount; i++) this.spawnQueue.push('flipper');
        for (let i = 0; i < lc.tankerCount; i++) this.spawnQueue.push('tanker');
        for (let i = 0; i < lc.spikerCount; i++) this.spawnQueue.push('spiker');
        for (let i = 0; i < lc.fuseBallCount; i++) this.spawnQueue.push('fuseball');

        // Shuffle spawn queue
        for (let i = this.spawnQueue.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.spawnQueue[i], this.spawnQueue[j]] = [this.spawnQueue[j], this.spawnQueue[i]];
        }

        this.totalEnemiesForLevel = this.spawnQueue.length;
        this.spawnTimer = 1000; // Initial delay before first spawn

        this.levelText.setText(`LEVEL ${this.level} — ${this.levelConfig.tubeDef.label}`);
        this._updateZapperText();
    }

    update(time, delta) {
        // Mute toggle
        if (Phaser.Input.Keyboard.JustDown(this.keys.m)) {
            const muted = this.audio.toggleMute();
            this.muteText.setText(muted ? 'MUTED' : '');
        }

        // Pause toggle
        if (Phaser.Input.Keyboard.JustDown(this.keys.p) || Phaser.Input.Keyboard.JustDown(this.keys.esc)) {
            this.paused = !this.paused;
            this.pauseText.setVisible(this.paused);
        }

        if (this.paused || this.gameOver) return;

        // Level transition
        if (this.levelTransitionTimer > 0) {
            this.levelTransitionTimer -= delta;
            if (this.levelTransitionTimer <= 0) {
                this.level++;
                this._initLevel();
            }
            this._drawAll(time);
            return;
        }

        // Warping
        if (this.warping) {
            this.warpProgress += delta / CONFIG.WARP_DURATION;
            if (this.warpProgress >= 1) {
                this._checkWarpSpikes();
                this.warping = false;
                this.levelTransitionTimer = 1000;
                this.audio.levelComplete();
            }
            this._drawAll(time);
            return;
        }

        // Player input
        if (this.blaster.alive) {
            if (this.keys.left.isDown) {
                this.blaster.moveLeft(time);
            }
            if (this.keys.right.isDown) {
                this.blaster.moveRight(time);
            }
            if (Phaser.Input.Keyboard.JustDown(this.keys.space) || this.keys.space.isDown) {
                if (this.blaster.canShoot(time) && this.bullets.length < CONFIG.MAX_BULLETS) {
                    const bullet = this.blaster.shoot(time);
                    if (bullet) {
                        this.bullets.push(bullet);
                        this.audio.shoot();
                    }
                }
            }
            if (Phaser.Input.Keyboard.JustDown(this.keys.z)) {
                this._superZapper();
            }
        }

        // Spawn enemies
        this._updateSpawning(delta);

        // Update bullets
        this._updateBullets(delta);

        // Update enemies
        this._updateEnemies(delta);

        // Check collisions
        this._checkCollisions(time);

        // Update explosions
        this._updateExplosions(delta);

        // Check level complete
        this._checkLevelComplete();

        // Check invincibility
        if (this.blaster.invincible) {
            this.blaster.invincibleTimer -= delta;
            if (this.blaster.invincibleTimer <= 0) {
                this.blaster.invincible = false;
            }
        }

        // Zapper flash
        if (this.zapperFlash > 0) {
            this.zapperFlash -= delta;
        }

        // Draw everything
        this._drawAll(time);
    }

    _updateSpawning(delta) {
        if (this.spawnQueue.length === 0) return;
        this.spawnTimer -= delta;
        if (this.spawnTimer <= 0) {
            const type = this.spawnQueue.shift();
            const lane = Math.floor(Math.random() * this.tube.lanes);
            const lc = this.levelConfig;

            let enemy;
            switch (type) {
                case 'flipper':
                    enemy = new Flipper(lane, this.tube, lc.enemySpeed, lc.flipChance);
                    break;
                case 'tanker':
                    enemy = new Tanker(lane, this.tube, lc.enemySpeed, lc.flipChance);
                    break;
                case 'spiker':
                    enemy = new Spiker(lane, this.tube, lc.enemySpeed);
                    break;
                case 'fuseball':
                    enemy = new FuseBall(lane, this.tube, lc.enemySpeed);
                    break;
            }

            if (enemy) {
                this.enemies.push(enemy);
                this.enemiesSpawned++;
                this.audio.enemySpawn();
            }

            this.spawnTimer = this.levelConfig.spawnInterval * (0.7 + Math.random() * 0.6);
        }
    }

    _updateBullets(delta) {
        for (let i = this.bullets.length - 1; i >= 0; i--) {
            const b = this.bullets[i];
            b.depth -= b.speed * delta;
            if (b.depth <= 0) {
                this.bullets.splice(i, 1);
            }
        }
    }

    _updateEnemies(delta) {
        for (const enemy of this.enemies) {
            enemy.update(delta);
        }
        // Remove inactive enemies (spikers that retreated)
        // But keep their spike trails
    }

    _checkCollisions(time) {
        // Bullet-Enemy collisions
        for (let bi = this.bullets.length - 1; bi >= 0; bi--) {
            const b = this.bullets[bi];
            if (!b.active) continue;

            for (let ei = this.enemies.length - 1; ei >= 0; ei--) {
                const e = this.enemies[ei];
                if (!e.active) continue;

                // Same lane and depth overlap
                if (b.lane === e.lane && Math.abs(b.depth - e.depth) < 0.08) {
                    // Hit!
                    b.active = false;
                    this.bullets.splice(bi, 1);

                    if (e.type === 'tanker') {
                        // Split into flippers
                        const flippers = e.split();
                        this.enemies.push(...flippers);
                    }

                    e.active = false;
                    this._addScore(e.score);
                    this.enemiesKilled++;
                    this.totalEnemiesKilled++;
                    this._addExplosion(e.getPosition(), e.type);
                    this.audio.enemyDestroy();

                    // Remove enemy
                    this.enemies.splice(ei, 1);
                    break;
                }
            }
        }

        // Also check bullet vs spike trails
        for (let bi = this.bullets.length - 1; bi >= 0; bi--) {
            const b = this.bullets[bi];
            if (!b.active) continue;

            for (const e of this.enemies) {
                if (e.type === 'spiker' && e.spikeDepth > 0) {
                    if (b.lane === e.lane && b.depth <= e.spikeDepth && b.depth > 0) {
                        // Destroy part of the spike
                        e.spikeDepth = Math.max(0, b.depth - 0.1);
                        b.active = false;
                        this.bullets.splice(bi, 1);
                        this._addScore(CONFIG.SCORE_SPIKE);
                        break;
                    }
                }
            }
        }

        // Enemy-Player collisions
        if (this.blaster.alive && !this.blaster.invincible) {
            for (const enemy of this.enemies) {
                if (!enemy.active) continue;

                // Check if enemy is at rim in same lane
                if (enemy.lane === this.blaster.lane && enemy.depth >= 0.92) {
                    this._playerDeath();
                    return;
                }

                // FuseBalls at rim - check adjacent lanes too
                if (enemy.type === 'fuseball' && enemy.atRim) {
                    if (enemy.lane === this.blaster.lane) {
                        this._playerDeath();
                        return;
                    }
                }

                // Flippers flipping through player's lane
                if (enemy.type === 'flipper' && enemy.atRim && enemy.flipProgress > 0) {
                    if (enemy.sourceLane === this.blaster.lane || enemy.lane === this.blaster.lane) {
                        this.audio.flipperOnRim();
                        this._playerDeath();
                        return;
                    }
                }
            }
        }
    }

    _playerDeath() {
        this.lives--;
        this.livesText.setText(`LIVES: ${this.lives}`);
        this.audio.death();

        this._addExplosion(this.blaster.getPosition(), 'player');

        if (this.lives <= 0) {
            this.blaster.alive = false;
            this.gameOver = true;
            // Save high score
            if (this.score > this.highScore) {
                this.highScore = this.score;
                localStorage.setItem(CONFIG.HIGH_SCORE_KEY, this.highScore);
            }
            this.time.delayedCall(2000, () => {
                this.scene.start('GameOverScene', {
                    score: this.score,
                    level: this.level,
                    highScore: this.highScore,
                    enemiesKilled: this.totalEnemiesKilled,
                });
            });
        } else {
            // Respawn with brief invincibility
            this.blaster.invincible = true;
            this.blaster.invincibleTimer = 2000;
        }
    }

    _superZapper() {
        if (this.blaster.superZapperUsed >= 2) return;

        this.blaster.superZapperUsed++;
        this.zapperFlash = CONFIG.ZAPPER_FLASH_DURATION;
        this.audio.zapper();
        this._updateZapperText();

        if (this.blaster.superZapperUsed === 1) {
            // First use: destroy all visible enemies
            for (let i = this.enemies.length - 1; i >= 0; i--) {
                const e = this.enemies[i];
                if (e.active) {
                    this._addScore(e.score);
                    this._addExplosion(e.getPosition(), e.type);
                    e.active = false;
                    this.enemiesKilled++;
                    this.totalEnemiesKilled++;
                }
            }
            this.enemies = this.enemies.filter(e => e.type === 'spiker' && e.spikeDepth > 0);
        } else {
            // Second use: kill one random enemy
            const activeEnemies = this.enemies.filter(e => e.active);
            if (activeEnemies.length > 0) {
                const target = activeEnemies[Math.floor(Math.random() * activeEnemies.length)];
                this._addScore(target.score);
                this._addExplosion(target.getPosition(), target.type);
                target.active = false;
                this.enemiesKilled++;
                this.totalEnemiesKilled++;
            }
        }
    }

    _updateZapperText() {
        const uses = 2 - this.blaster.superZapperUsed;
        if (uses === 2) this.zapperText.setText('ZAPPER: READY').setColor('#ffffff');
        else if (uses === 1) this.zapperText.setText('ZAPPER: 1 LEFT').setColor('#ffaa00');
        else this.zapperText.setText('ZAPPER: EMPTY').setColor('#666666');
    }

    _addScore(points) {
        this.score += points;
        this.scoreText.setText(`SCORE: ${this.score}`);
        if (this.score > this.highScore) {
            this.highScore = this.score;
            this.highScoreText.setText(`HI: ${this.highScore}`);
        }
        // Extra life
        if (this.score >= this.nextExtraLife) {
            this.lives++;
            this.livesText.setText(`LIVES: ${this.lives}`);
            this.nextExtraLife += CONFIG.EXTRA_LIFE_SCORE;
        }
    }

    _addExplosion(pos, type) {
        const color = type === 'player' ? CONFIG.COLOR_PLAYER :
                      type === 'flipper' ? CONFIG.COLOR_FLIPPER :
                      type === 'tanker' ? CONFIG.COLOR_TANKER :
                      type === 'spiker' ? CONFIG.COLOR_SPIKER :
                      CONFIG.COLOR_FUSEBALL;
        this.explosions.push({
            x: pos.x,
            y: pos.y,
            life: 1.0,
            color: color,
            particles: Array.from({ length: 8 }, () => ({
                dx: (Math.random() - 0.5) * 4,
                dy: (Math.random() - 0.5) * 4,
            }))
        });
    }

    _updateExplosions(delta) {
        for (let i = this.explosions.length - 1; i >= 0; i--) {
            this.explosions[i].life -= delta * 0.002;
            if (this.explosions[i].life <= 0) {
                this.explosions.splice(i, 1);
            }
        }
    }

    _checkLevelComplete() {
        if (this.levelComplete || this.warping) return;

        const allSpawned = this.spawnQueue.length === 0;
        const allDefeated = this.enemies.filter(e => e.active).length === 0;

        // Keep spikers with trails alive for warp
        if (allSpawned && allDefeated) {
            this.levelComplete = true;
            this.warping = true;
            this.warpProgress = 0;
            this.audio.warp();
        }
    }

    _checkWarpSpikes() {
        // During warp, check if player's lane has spikes
        for (const e of this.enemies) {
            if (e.type === 'spiker' && e.lane === this.blaster.lane && e.spikeDepth > 0.1) {
                this.audio.spikeHit();
                this._playerDeath();
                return;
            }
        }
    }

    // ==================== RENDERING ====================

    _drawAll(time) {
        this.tubeGraphics.clear();
        this.entityGraphics.clear();
        this.glowGraphics.clear();

        // Zapper flash
        if (this.zapperFlash > 0) {
            const alpha = this.zapperFlash / CONFIG.ZAPPER_FLASH_DURATION;
            this.glowGraphics.fillStyle(CONFIG.COLOR_ZAPPER, alpha * 0.3);
            this.glowGraphics.fillRect(0, 0, CONFIG.WIDTH, CONFIG.HEIGHT);
        }

        // Draw tube
        this._drawTube(time);

        if (!this.warping) {
            // Draw enemies
            for (const enemy of this.enemies) {
                enemy.draw(this.entityGraphics);
            }

            // Draw bullets
            this._drawBullets();

            // Draw player
            this.blaster.draw(this.entityGraphics, time, this.levelConfig.tubeColor);
        } else {
            // Warp animation
            this._drawWarp(time);
        }

        // Draw explosions
        this._drawExplosions();

        // Draw active lane highlight
        if (!this.warping && this.blaster.alive) {
            this._drawActiveLane();
        }
    }

    _drawTube(time) {
        const tube = this.tube;
        const g = this.tubeGraphics;
        const color = this.levelConfig.tubeColor;
        const depthSteps = CONFIG.TUBE_DEPTH_STEPS;

        // Draw depth rings
        for (let d = 0; d <= depthSteps; d++) {
            const t = d / depthSteps;
            const alpha = 0.2 + (1 - t) * 0.5;
            g.lineStyle(d === depthSteps ? 2 : 1, color, alpha);

            g.beginPath();
            for (let i = 0; i < tube.rimPoints.length; i++) {
                const next = (i + 1) % tube.rimPoints.length;
                if (tube.open && i === tube.rimPoints.length - 1) continue;

                const p1 = tube.getLanePosition(i < tube.lanes ? i : tube.lanes - 1, t);
                const rim1 = tube.rimPoints[i];
                const rim2 = tube.rimPoints[next];
                const center1 = tube.centerPoints[i];
                const center2 = tube.centerPoints[next];

                const x1 = center1.x + (rim1.x - center1.x) * t;
                const y1 = center1.y + (rim1.y - center1.y) * t;
                const x2 = center2.x + (rim2.x - center2.x) * t;
                const y2 = center2.y + (rim2.y - center2.y) * t;

                g.moveTo(x1, y1);
                g.lineTo(x2, y2);
            }
            g.strokePath();
        }

        // Draw lane lines (rim to center)
        for (let i = 0; i < tube.rimPoints.length; i++) {
            const rim = tube.rimPoints[i];
            const center = tube.centerPoints[i];
            const alpha = 0.3;
            g.lineStyle(1, color, alpha);
            g.beginPath();
            g.moveTo(rim.x, rim.y);
            g.lineTo(center.x, center.y);
            g.strokePath();
        }

        // Draw outer rim glow
        g.lineStyle(2, color, 0.8);
        g.beginPath();
        for (let i = 0; i < tube.rimPoints.length; i++) {
            const next = (i + 1) % tube.rimPoints.length;
            if (tube.open && i === tube.rimPoints.length - 1) continue;
            const p1 = tube.rimPoints[i];
            const p2 = tube.rimPoints[next];
            g.moveTo(p1.x, p1.y);
            g.lineTo(p2.x, p2.y);
        }
        g.strokePath();
    }

    _drawActiveLane() {
        const tube = this.tube;
        const g = this.glowGraphics;
        const lane = this.blaster.lane;
        const color = this.levelConfig.tubeColor;

        const i1 = lane % tube.rimPoints.length;
        const i2 = (lane + 1) % tube.rimPoints.length;

        const rim1 = tube.rimPoints[i1];
        const rim2 = tube.rimPoints[i2];
        const ctr1 = tube.centerPoints[i1];
        const ctr2 = tube.centerPoints[i2];

        g.lineStyle(2, color, 0.5);
        g.beginPath();
        g.moveTo(rim1.x, rim1.y);
        g.lineTo(rim2.x, rim2.y);
        g.strokePath();

        g.lineStyle(1, color, 0.25);
        g.beginPath();
        g.moveTo(rim1.x, rim1.y);
        g.lineTo(ctr1.x, ctr1.y);
        g.lineTo(ctr2.x, ctr2.y);
        g.lineTo(rim2.x, rim2.y);
        g.strokePath();
    }

    _drawBullets() {
        const g = this.entityGraphics;
        g.lineStyle(2, CONFIG.COLOR_BULLET, 1);

        for (const b of this.bullets) {
            if (!b.active) continue;
            const pos = this.tube.getLanePosition(b.lane, b.depth);
            const angle = this.tube.getLaneAngle(b.lane);
            const len = 6;

            g.beginPath();
            g.moveTo(pos.x - Math.cos(angle) * len, pos.y - Math.sin(angle) * len);
            g.lineTo(pos.x + Math.cos(angle) * len, pos.y + Math.sin(angle) * len);
            g.strokePath();

            // Small dot
            g.fillStyle(CONFIG.COLOR_BULLET, 1);
            g.fillCircle(pos.x, pos.y, 2);
        }
    }

    _drawExplosions() {
        const g = this.entityGraphics;
        for (const exp of this.explosions) {
            const alpha = exp.life;
            const spread = (1 - exp.life) * 30;

            g.lineStyle(2, exp.color, alpha);
            for (const p of exp.particles) {
                const px = exp.x + p.dx * spread;
                const py = exp.y + p.dy * spread;
                g.beginPath();
                g.moveTo(px - 2, py - 2);
                g.lineTo(px + 2, py + 2);
                g.moveTo(px + 2, py - 2);
                g.lineTo(px - 2, py + 2);
                g.strokePath();
            }
        }
    }

    _drawWarp(time) {
        const g = this.entityGraphics;
        const tube = this.tube;
        const t = this.warpProgress;

        // Player zooms down the tube
        const playerDepth = 1 - t;
        const pos = this.tube.getLanePosition(this.blaster.lane, playerDepth);
        const angle = this.tube.getLaneAngle(this.blaster.lane);
        const size = CONFIG.PLAYER_SIZE * (0.3 + playerDepth * 0.7);

        // Draw shrinking player
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        const px = -sin;
        const py = cos;

        g.lineStyle(2, CONFIG.COLOR_PLAYER, 1);
        g.beginPath();
        const tip = { x: pos.x + cos * size, y: pos.y + sin * size };
        const left = { x: pos.x - cos * size * 0.5 + px * size * 0.8, y: pos.y - sin * size * 0.5 + py * size * 0.8 };
        const right = { x: pos.x - cos * size * 0.5 - px * size * 0.8, y: pos.y - sin * size * 0.5 - py * size * 0.8 };
        g.moveTo(tip.x, tip.y);
        g.lineTo(left.x, left.y);
        g.lineTo(right.x, right.y);
        g.closePath();
        g.strokePath();

        // Speed lines
        g.lineStyle(1, this.levelConfig.tubeColor, 0.5 * (1 - t));
        for (let i = 0; i < 8; i++) {
            const laneIdx = (this.blaster.lane + i * 2) % tube.lanes;
            const rim = tube.rimPoints[laneIdx % tube.rimPoints.length];
            const ctr = tube.centerPoints[laneIdx % tube.centerPoints.length];
            const d1 = Math.max(0, playerDepth - 0.1);
            const d2 = Math.min(1, playerDepth + 0.3);
            const p1x = ctr.x + (rim.x - ctr.x) * d1;
            const p1y = ctr.y + (rim.y - ctr.y) * d1;
            const p2x = ctr.x + (rim.x - ctr.x) * d2;
            const p2y = ctr.y + (rim.y - ctr.y) * d2;
            g.beginPath();
            g.moveTo(p1x, p1y);
            g.lineTo(p2x, p2y);
            g.strokePath();
        }

        // Level complete text
        const textAlpha = Math.min(1, t * 3);
        if (!this._warpText) {
            this._warpText = this.add.text(CONFIG.WIDTH / 2, CONFIG.HEIGHT / 2 - 60, 'LEVEL COMPLETE', {
                fontFamily: 'monospace', fontSize: '32px', color: '#00ff88'
            }).setOrigin(0.5).setAlpha(0);
        }
        this._warpText.setAlpha(textAlpha);
    }
}
