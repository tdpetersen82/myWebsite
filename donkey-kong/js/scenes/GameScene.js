// ============================================================
// Donkey Kong — Main Game Scene
// ============================================================

class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameScene' });
    }

    init(data) {
        this.difficulty = data.difficulty || 1;
    }

    create() {
        const cfg = DK_CONFIG;

        // Camera bg
        this.cameras.main.setBackgroundColor(cfg.COLOR_BG);

        // Game state
        this.score = 0;
        this.lives = cfg.STARTING_LIVES;
        this.level = 1;
        this.paused = false;
        this.gameOver = false;
        this.levelCompleteFlag = false;

        // Difficulty multiplier: 0 = easy(0.7), 1 = normal(1.0), 2 = hard(1.4)
        this.diffMultiplier = [0.7, 1.0, 1.4][this.difficulty];

        // Graphics layer for manual drawing
        this.gfx = this.add.graphics();

        // Create managers
        this.platformManager = new PlatformManager(this);
        this.platformManager.create();

        this.ladderManager = new LadderManager(this);
        this.ladderManager.create();

        // Create player
        this.player = new Player(this);

        // Platform collision for player
        this.physics.add.collider(this.player.sprite, this.platformManager.platformGroup);

        // Create DK
        this.dk = new DonkeyKong(this);
        this.dk.setThrowCallback(() => this._spawnBarrel());

        // Barrels array
        this.barrels = [];
        this.fireEnemies = [];

        // Hammer pickups
        this.hammers = [];
        cfg.HAMMERS.forEach(h => {
            const hammer = new HammerPickup(this, h.x, h.y);
            this.hammers.push(hammer);
        });

        // Oil drum
        this.oilDrumOnFire = false;
        this.oilFireTimer = 0;

        // Pauline animation timer
        this.paulineTimer = 0;

        // Score display (Phaser text)
        this.scoreText = this.add.text(16, 8, '', {
            fontFamily: 'monospace',
            fontSize: '16px',
            color: '#ffffff',
        });

        this.livesText = this.add.text(cfg.WIDTH - 16, 8, '', {
            fontFamily: 'monospace',
            fontSize: '16px',
            color: '#ffffff',
        }).setOrigin(1, 0);

        this.levelText = this.add.text(cfg.WIDTH / 2, 8, '', {
            fontFamily: 'monospace',
            fontSize: '16px',
            color: '#ffff00',
        }).setOrigin(0.5, 0);

        // Pause overlay
        this.pauseText = this.add.text(cfg.WIDTH / 2, cfg.HEIGHT / 2, 'PAUSED', {
            fontFamily: 'monospace',
            fontSize: '40px',
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 4,
        }).setOrigin(0.5).setVisible(false).setDepth(100);

        this.pauseSubText = this.add.text(cfg.WIDTH / 2, cfg.HEIGHT / 2 + 40, 'Press P or ESC to resume', {
            fontFamily: 'monospace',
            fontSize: '16px',
            color: '#aaaaaa',
        }).setOrigin(0.5).setVisible(false).setDepth(100);

        // Mute indicator
        this.muteText = this.add.text(cfg.WIDTH - 16, cfg.HEIGHT - 16, '', {
            fontFamily: 'monospace',
            fontSize: '12px',
            color: '#888888',
        }).setOrigin(1, 1);

        // Barrel jump scoring
        this.jumpScoreTimer = 0;
        this.barrelsJumpedThisJump = 0;

        // Cursors
        this.cursors = this.input.keyboard.createCursorKeys();
        this.cursors.space = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);

        // Pause / Mute keys
        this.input.keyboard.on('keydown-P', () => this._togglePause());
        this.input.keyboard.on('keydown-ESC', () => this._togglePause());
        this.input.keyboard.on('keydown-M', () => this._toggleMute());

        // Death animation state
        this.deathAnimTimer = 0;
        this.isDeathAnim = false;

        // Level complete animation
        this.levelCompleteTimer = 0;

        // Pauline "HELP!" text
        this.helpText = this.add.text(cfg.PAULINE.x, cfg.PAULINE.y - 28, 'HELP!', {
            fontFamily: 'monospace',
            fontSize: '11px',
            color: '#ffffff',
            backgroundColor: '#cc0000',
            padding: { x: 3, y: 1 },
        }).setOrigin(0.5).setDepth(10);

        this.time.addEvent({
            delay: 600,
            loop: true,
            callback: () => {
                if (!this.paused) this.helpText.setVisible(!this.helpText.visible);
            },
        });

        this._updateHUD();
    }

    update(time, delta) {
        if (this.paused || this.gameOver) return;

        const dt = delta / 1000; // seconds
        const cfg = DK_CONFIG;

        // Clear graphics
        this.gfx.clear();

        // --- Death animation ---
        if (this.isDeathAnim) {
            this.deathAnimTimer -= dt;
            this._drawLevel();
            this.player.draw(this.gfx);

            if (this.deathAnimTimer <= 0) {
                this.isDeathAnim = false;
                this.lives--;
                if (this.lives <= 0) {
                    this._endGame();
                    return;
                }
                this._resetLevel(false);
            }
            return;
        }

        // --- Level complete animation ---
        if (this.levelCompleteFlag) {
            this.levelCompleteTimer -= dt;
            this._drawLevel();
            this.player.draw(this.gfx);

            if (this.levelCompleteTimer <= 0) {
                this.level++;
                this.levelCompleteFlag = false;
                this._resetLevel(true);
            }
            return;
        }

        // --- DK update ---
        const barrelInterval = Math.max(
            cfg.BARREL_SPAWN_INTERVAL_MIN,
            cfg.BARREL_SPAWN_INTERVAL_BASE - (this.level - 1) * cfg.BARREL_SPAWN_INTERVAL_DECREMENT
        ) / this.diffMultiplier;
        this.dk.update(dt, barrelInterval);

        // --- Player update ---
        this.player.update(dt, this.cursors, this.platformManager, this.ladderManager);

        // --- Barrels update ---
        this.barrels.forEach(barrel => {
            barrel.update(dt, this.platformManager, this.ladderManager);
        });
        // Clean up inactive barrels
        this.barrels = this.barrels.filter(b => {
            if (!b.active) { b.destroy(); return false; }
            return true;
        });

        // --- Fire enemies update ---
        this.fireEnemies.forEach(fe => {
            fe.update(dt, this.platformManager, this.ladderManager, this.player.sprite.y);
        });
        this.fireEnemies = this.fireEnemies.filter(fe => {
            if (!fe.active) { fe.destroy(); return false; }
            return true;
        });

        // --- Hammer pickups ---
        this.hammers.forEach(h => {
            h.update(dt);
            if (h.active && !this.player.hasHammer) {
                const dist = Phaser.Math.Distance.Between(
                    this.player.sprite.x, this.player.sprite.y,
                    h.x, h.y
                );
                if (dist < 24) {
                    h.collect();
                    this.player.giveHammer();
                }
            }
        });

        // --- Oil drum fire check ---
        if (this.oilDrumOnFire) {
            this.oilFireTimer += dt;
            // Spawn fire enemy periodically
            if (this.oilFireTimer > 8 / this.diffMultiplier && this.fireEnemies.length < 3 + this.level) {
                this.oilFireTimer = 0;
                this._spawnFireEnemy();
            }
        }

        // --- Collision: Player vs Barrels ---
        this._checkBarrelCollisions();

        // --- Collision: Player vs Fire Enemies ---
        this._checkFireCollisions();

        // --- Barrel jump scoring ---
        if (this.player.isJumping) {
            this.jumpScoreTimer += dt;
        } else {
            if (this.barrelsJumpedThisJump > 0) {
                // Award points
                if (this.barrelsJumpedThisJump >= 2) {
                    this.score += cfg.SCORE_BARREL_JUMP_MULTI;
                    this._showFloatingScore(this.player.sprite.x, this.player.sprite.y - 30, cfg.SCORE_BARREL_JUMP_MULTI);
                } else {
                    this.score += cfg.SCORE_BARREL_JUMP;
                    this._showFloatingScore(this.player.sprite.x, this.player.sprite.y - 30, cfg.SCORE_BARREL_JUMP);
                }
                window.audioManager.barrelJump();
            }
            this.barrelsJumpedThisJump = 0;
            this.jumpScoreTimer = 0;
        }

        // --- Pauline reach check ---
        const pauline = cfg.PAULINE;
        if (Phaser.Math.Distance.Between(this.player.sprite.x, this.player.sprite.y, pauline.x, pauline.y) < 30) {
            this._levelComplete();
        }

        // --- Draw everything ---
        this._drawLevel();
        this.dk.draw(this.gfx);
        this.barrels.forEach(b => b.draw(this.gfx));
        this.fireEnemies.forEach(fe => fe.draw(this.gfx));
        this.hammers.forEach(h => h.draw(this.gfx));
        this.player.draw(this.gfx);

        this._updateHUD();
    }

    // ── Barrel Spawning ──────────────────────────────────

    _spawnBarrel() {
        const cfg = DK_CONFIG;
        const isFireBarrel = this.level >= cfg.FIRE_BARREL_START_LEVEL &&
            Math.random() < 0.3 * this.diffMultiplier;

        const barrel = new Barrel(this, cfg.DK_POSITION.x + 40, cfg.DK_POSITION.y + 20, isFireBarrel);
        const speedBoost = (this.level - 1) * cfg.BARREL_SPEED_INCREMENT * this.diffMultiplier;
        barrel.setSpeed(cfg.BARREL_SPEED_BASE + speedBoost);
        barrel.direction = 1;

        // Platform collision
        this.physics.add.collider(barrel.sprite, this.platformManager.platformGroup);

        this.barrels.push(barrel);
        window.audioManager.barrelRoll();
    }

    _spawnFireEnemy() {
        const cfg = DK_CONFIG;
        const fe = new FireEnemy(this, cfg.OIL_DRUM.x, cfg.OIL_DRUM.y - 20);
        this.physics.add.collider(fe.sprite, this.platformManager.platformGroup);
        this.fireEnemies.push(fe);
        window.audioManager.fireSpawn();
    }

    // ── Collisions ───────────────────────────────────────

    _checkBarrelCollisions() {
        const player = this.player;
        if (!player.alive || player.invincibleTimer > 0) return;

        for (const barrel of this.barrels) {
            if (!barrel.active) continue;

            const dist = Phaser.Math.Distance.Between(
                player.sprite.x, player.sprite.y,
                barrel.sprite.x, barrel.sprite.y
            );

            if (dist < 22) {
                if (player.hasHammer) {
                    // Smash barrel
                    barrel.active = false;
                    this.score += DK_CONFIG.SCORE_BARREL_SMASH;
                    this._showFloatingScore(barrel.sprite.x, barrel.sprite.y - 20, DK_CONFIG.SCORE_BARREL_SMASH);
                    window.audioManager.hammerHit();
                } else {
                    // Check if jumping over
                    if (player.isJumping && player.sprite.y < barrel.sprite.y - 10) {
                        if (!barrel.hasBeenJumped) {
                            barrel.hasBeenJumped = true;
                            this.barrelsJumpedThisJump++;
                        }
                    } else {
                        // Hit! Check fire barrel -> oil drum interaction
                        if (barrel.isFireBarrel && this._isNearOilDrum(barrel.sprite.x, barrel.sprite.y)) {
                            this.oilDrumOnFire = true;
                            barrel.active = false;
                        } else {
                            this._playerDeath();
                            return;
                        }
                    }
                }
            }

            // Check fire barrel hitting oil drum (even without player)
            if (barrel.isFireBarrel && barrel.active && this._isNearOilDrum(barrel.sprite.x, barrel.sprite.y)) {
                this.oilDrumOnFire = true;
                barrel.active = false;
            }
        }
    }

    _checkFireCollisions() {
        const player = this.player;
        if (!player.alive || player.invincibleTimer > 0) return;

        for (const fe of this.fireEnemies) {
            if (!fe.active) continue;
            const dist = Phaser.Math.Distance.Between(
                player.sprite.x, player.sprite.y,
                fe.sprite.x, fe.sprite.y
            );
            if (dist < 20) {
                if (player.hasHammer) {
                    fe.active = false;
                    this.score += DK_CONFIG.SCORE_BARREL_SMASH;
                    this._showFloatingScore(fe.sprite.x, fe.sprite.y - 20, DK_CONFIG.SCORE_BARREL_SMASH);
                    window.audioManager.hammerHit();
                } else {
                    this._playerDeath();
                    return;
                }
            }
        }
    }

    _isNearOilDrum(x, y) {
        const drum = DK_CONFIG.OIL_DRUM;
        return Math.abs(x - drum.x) < 30 && Math.abs(y - drum.y) < 30;
    }

    // ── Player Death ─────────────────────────────────────

    _playerDeath() {
        this.player.die();
        this.isDeathAnim = true;
        this.deathAnimTimer = 1.5;
    }

    // ── Level Complete ───────────────────────────────────

    _levelComplete() {
        if (this.levelCompleteFlag) return;
        this.levelCompleteFlag = true;
        this.levelCompleteTimer = 2.0;
        this.score += DK_CONFIG.SCORE_LEVEL_COMPLETE;
        window.audioManager.levelComplete();
    }

    // ── Reset Level ──────────────────────────────────────

    _resetLevel(nextLevel) {
        // Clear barrels and fire
        this.barrels.forEach(b => b.destroy());
        this.barrels = [];
        this.fireEnemies.forEach(fe => fe.destroy());
        this.fireEnemies = [];

        // Reset hammers
        this.hammers.forEach(h => h.reset());

        // Reset oil drum
        if (nextLevel) {
            this.oilDrumOnFire = false;
            this.oilFireTimer = 0;
        }

        // Reset player
        this.player.reset();
        this.player.invincibleTimer = 2.0;

        // Reset DK
        this.dk.throwTimer = 0;

        this._updateHUD();
    }

    // ── End Game ─────────────────────────────────────────

    _endGame() {
        this.gameOver = true;

        // Save high score
        const best = parseInt(localStorage.getItem(DK_CONFIG.HIGH_SCORE_KEY) || '0', 10);
        if (this.score > best) {
            localStorage.setItem(DK_CONFIG.HIGH_SCORE_KEY, this.score);
        }

        this.scene.start('GameOverScene', {
            score: this.score,
            level: this.level,
            highScore: Math.max(this.score, best),
            difficulty: this.difficulty,
        });
    }

    // ── Pause / Mute ─────────────────────────────────────

    _togglePause() {
        this.paused = !this.paused;
        this.pauseText.setVisible(this.paused);
        this.pauseSubText.setVisible(this.paused);
        if (this.paused) {
            this.physics.pause();
        } else {
            this.physics.resume();
        }
    }

    _toggleMute() {
        const muted = window.audioManager.toggleMute();
        this.muteText.setText(muted ? 'MUTED' : '');
    }

    // ── HUD ──────────────────────────────────────────────

    _updateHUD() {
        this.scoreText.setText(`SCORE: ${this.score}`);
        this.livesText.setText(`LIVES: ${'♥'.repeat(this.lives)}`);
        this.levelText.setText(`LEVEL ${this.level}`);
    }

    // ── Floating Score ───────────────────────────────────

    _showFloatingScore(x, y, points) {
        const txt = this.add.text(x, y, `+${points}`, {
            fontFamily: 'monospace',
            fontSize: '14px',
            color: '#ffff00',
            stroke: '#000000',
            strokeThickness: 2,
        }).setOrigin(0.5);

        this.tweens.add({
            targets: txt,
            y: y - 40,
            alpha: 0,
            duration: 1000,
            onComplete: () => txt.destroy(),
        });
    }

    // ── Draw Level ───────────────────────────────────────

    _drawLevel() {
        const gfx = this.gfx;
        const cfg = DK_CONFIG;

        // Draw platforms (girders)
        this.platformManager.draw(gfx);

        // Draw ladders
        this.ladderManager.draw(gfx);

        // Draw oil drum
        this._drawOilDrum(gfx);

        // Draw Pauline
        this._drawPauline(gfx);

        // Draw "HELP!" text above Pauline
        // (done via Phaser text in create or just draw here)
        this.paulineTimer += 0.016;
    }

    _drawOilDrum(gfx) {
        const drum = DK_CONFIG.OIL_DRUM;
        const cfg = DK_CONFIG;

        // Drum body
        gfx.fillStyle(cfg.COLOR_OIL_DRUM, 1);
        gfx.fillRect(drum.x - drum.width / 2, drum.y - drum.height / 2, drum.width, drum.height);

        // Metal bands
        gfx.lineStyle(2, 0x666688, 1);
        gfx.strokeRect(drum.x - drum.width / 2, drum.y - drum.height / 2, drum.width, drum.height);
        gfx.beginPath();
        gfx.moveTo(drum.x - drum.width / 2, drum.y - drum.height / 4);
        gfx.lineTo(drum.x + drum.width / 2, drum.y - drum.height / 4);
        gfx.strokePath();
        gfx.beginPath();
        gfx.moveTo(drum.x - drum.width / 2, drum.y + drum.height / 4);
        gfx.lineTo(drum.x + drum.width / 2, drum.y + drum.height / 4);
        gfx.strokePath();

        // "OIL" text — draw simple pixels
        gfx.fillStyle(0xffffff, 1);
        gfx.fillRect(drum.x - 8, drum.y - 4, 16, 2);

        // Fire if lit
        if (this.oilDrumOnFire) {
            const flicker = Math.sin(Date.now() * 0.015) * 4;
            gfx.fillStyle(cfg.COLOR_FIRE, 0.9);
            gfx.fillTriangle(
                drum.x - 10, drum.y - drum.height / 2,
                drum.x, drum.y - drum.height / 2 - 20 - flicker,
                drum.x + 10, drum.y - drum.height / 2
            );
            gfx.fillStyle(0xffaa00, 0.8);
            gfx.fillTriangle(
                drum.x - 5, drum.y - drum.height / 2,
                drum.x, drum.y - drum.height / 2 - 12 + flicker,
                drum.x + 5, drum.y - drum.height / 2
            );
        }
    }

    _drawPauline(gfx) {
        const p = DK_CONFIG.PAULINE;
        const cfg = DK_CONFIG;
        const bounce = Math.sin(this.paulineTimer * 3) * 2;

        // Dress (pink)
        gfx.fillStyle(cfg.COLOR_PAULINE, 1);
        gfx.fillRect(p.x - 6, p.y - 2 + bounce, 12, 18);

        // Head
        gfx.fillStyle(0xffccaa, 1);
        gfx.fillCircle(p.x, p.y - 10 + bounce, 7);

        // Hair
        gfx.fillStyle(0xffdd44, 1);
        gfx.fillRect(p.x - 7, p.y - 16 + bounce, 14, 6);

        // HELP text handled by Phaser text object
    }
}
