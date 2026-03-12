// ============================================================
// Joust — Game Scene (main wave-based gameplay)
// ============================================================

class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameScene' });
    }

    create() {
        this.audio = new AudioManager();
        this.cameras.main.setBackgroundColor(CONFIG.BG_COLOR);

        // Game state
        this.score = 0;
        this.lives = CONFIG.PLAYER_LIVES;
        this.wave = 0;
        this.paused = false;
        this.gameOver = false;
        this.waveTimer = 0;
        this.pteroSpawned = false;
        this.waveTransition = false;
        this.waveTransitionTimer = 0;
        this.enemiesDefeated = 0;
        this.eggsCollected = 0;

        // Entity arrays
        this.enemies = [];
        this.eggs = [];
        this.pterodactyls = [];

        // Create platforms
        this.platforms = [];
        for (const [px, py, pw] of CONFIG.PLATFORMS) {
            const plat = new Platform(this, px, py, pw);
            this.platforms.push(plat);
        }

        // Create lava pit
        this.lavaPit = new LavaPit(this);

        // Create player
        this.player = new Player(this, CONFIG.PLAYER_START_X, CONFIG.PLAYER_START_Y);
        this.player.makeInvincible();

        // UI
        this.createUI();

        // Input
        this.cursors = this.input.keyboard.createCursorKeys();
        this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
        this.pKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.P);
        this.mKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.M);
        this.escKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);

        // Flap on space press (not hold)
        this.spaceKey.on('down', () => {
            if (!this.paused && !this.gameOver) {
                this.player.flap();
            }
        });
        this.cursors.up.on('down', () => {
            if (!this.paused && !this.gameOver) {
                this.player.flap();
            }
        });

        this.pKey.on('down', () => this.togglePause());
        this.escKey.on('down', () => this.togglePause());
        this.mKey.on('down', () => {
            const muted = this.audio.toggleMute();
            this.muteText.setText(muted ? 'MUTED' : '');
        });

        // Start first wave
        this.startWave();

        // Draw static elements
        this.drawStaticElements();
    }

    createUI() {
        const uiStyle = {
            fontFamily: 'monospace',
            fontSize: '16px',
            color: '#FFFFFF'
        };

        this.scoreText = this.add.text(10, 8, 'Score: 0', uiStyle).setDepth(100);
        this.livesText = this.add.text(CONFIG.WIDTH - 10, 8, `Lives: ${this.lives}`, uiStyle)
            .setOrigin(1, 0).setDepth(100);
        this.waveText = this.add.text(CONFIG.WIDTH / 2, 8, 'Wave 1', {
            ...uiStyle, color: '#FFD700'
        }).setOrigin(0.5, 0).setDepth(100);

        this.muteText = this.add.text(CONFIG.WIDTH / 2, CONFIG.HEIGHT - 15, '', {
            fontFamily: 'monospace',
            fontSize: '12px',
            color: '#FF6666'
        }).setOrigin(0.5).setDepth(100);

        // Pause overlay (hidden by default)
        this.pauseOverlay = this.add.graphics().setDepth(200);
        this.pauseText = this.add.text(CONFIG.WIDTH / 2, CONFIG.HEIGHT / 2, 'PAUSED', {
            fontFamily: 'monospace',
            fontSize: '48px',
            fontStyle: 'bold',
            color: '#FFFFFF'
        }).setOrigin(0.5).setDepth(201).setVisible(false);

        // Wave announcement text
        this.waveAnnounce = this.add.text(CONFIG.WIDTH / 2, CONFIG.HEIGHT / 2 - 40, '', {
            fontFamily: 'monospace',
            fontSize: '36px',
            fontStyle: 'bold',
            color: '#FFD700',
            stroke: '#000000',
            strokeThickness: 4
        }).setOrigin(0.5).setDepth(150).setAlpha(0);
    }

    drawStaticElements() {
        // Draw all platforms
        for (const plat of this.platforms) {
            plat.draw();
        }
    }

    startWave() {
        this.wave++;
        this.waveText.setText(`Wave ${this.wave}`);
        this.waveTimer = 0;
        this.pteroSpawned = false;

        // Show wave announcement
        this.waveAnnounce.setText(`Wave ${this.wave}`);
        this.waveAnnounce.setAlpha(1);
        this.waveTransition = true;
        this.waveTransitionTimer = 2000;

        // Get wave config (cycle through waves with increasing difficulty)
        const waveIdx = Math.min(this.wave - 1, CONFIG.WAVES.length - 1);
        const waveConfig = CONFIG.WAVES[waveIdx];

        // Extra enemies for waves beyond the defined ones
        const extraEnemies = Math.max(0, this.wave - CONFIG.WAVES.length);

        // Spawn enemies with delay
        this.time.delayedCall(1500, () => {
            this.spawnWaveEnemies(waveConfig, extraEnemies);
        });
    }

    spawnWaveEnemies(waveConfig, extra) {
        const spawnPositions = [
            { x: 100, y: 100 },
            { x: 300, y: 80 },
            { x: 500, y: 100 },
            { x: 700, y: 80 },
            { x: 200, y: 200 },
            { x: 600, y: 200 },
            { x: 400, y: 120 },
            { x: 150, y: 350 },
            { x: 650, y: 350 }
        ];

        let posIdx = 0;

        const spawn = (tierKey, count) => {
            for (let i = 0; i < count; i++) {
                const pos = spawnPositions[posIdx % spawnPositions.length];
                posIdx++;
                const enemy = new BuzzardRider(
                    this,
                    pos.x + (Math.random() - 0.5) * 40,
                    pos.y,
                    tierKey
                );
                this.enemies.push(enemy);
            }
        };

        spawn('BOUNDER', waveConfig.bounders);
        spawn('HUNTER', waveConfig.hunters);
        spawn('SHADOW_LORD', waveConfig.shadowLords);

        // Extra enemies for high waves
        if (extra > 0) {
            spawn('SHADOW_LORD', Math.min(extra, 3));
            if (extra > 3) spawn('HUNTER', extra - 3);
        }
    }

    spawnEnemyAt(x, y, tierKey) {
        const enemy = new BuzzardRider(this, x, y, tierKey);
        this.enemies.push(enemy);
    }

    togglePause() {
        if (this.gameOver) return;
        this.paused = !this.paused;

        if (this.paused) {
            this.pauseOverlay.fillStyle(0x000000, 0.5);
            this.pauseOverlay.fillRect(0, 0, CONFIG.WIDTH, CONFIG.HEIGHT);
            this.pauseText.setVisible(true);
        } else {
            this.pauseOverlay.clear();
            this.pauseText.setVisible(false);
        }
    }

    update(time, delta) {
        if (this.paused || this.gameOver) return;

        // Cap delta to prevent physics issues
        if (delta > 50) delta = 50;

        // Wave transition timer
        if (this.waveTransition) {
            this.waveTransitionTimer -= delta;
            this.waveAnnounce.setAlpha(this.waveTransitionTimer / 2000);
            if (this.waveTransitionTimer <= 0) {
                this.waveTransition = false;
                this.waveAnnounce.setAlpha(0);
            }
        }

        // Player input
        if (this.player.alive) {
            if (this.cursors.left.isDown) {
                this.player.moveLeft();
            }
            if (this.cursors.right.isDown) {
                this.player.moveRight();
            }
        }

        // Update entities
        this.player.update(delta);
        this.lavaPit.update(delta);

        for (const enemy of this.enemies) {
            enemy.update(delta);
        }

        for (const egg of this.eggs) {
            egg.update(delta);
        }

        for (const ptero of this.pterodactyls) {
            ptero.update(delta);
        }

        // Wave timer for pterodactyl
        this.waveTimer += delta;
        if (!this.pteroSpawned && this.waveTimer > CONFIG.PTERO_SPAWN_DELAY && this.enemies.length > 0) {
            this.pteroSpawned = true;
            const ptero = new Pterodactyl(this, this.player);
            this.pterodactyls.push(ptero);
        }

        // Collision checks
        this.checkCombat();
        this.checkEggCollection();
        this.checkLavaCollisions();
        this.checkPterodactylCollisions();

        // Check wave complete
        this.checkWaveComplete();

        // Update UI
        this.scoreText.setText(`Score: ${this.score}`);
        this.livesText.setText(`Lives: ${this.lives}`);

        // Draw all entities
        this.drawEntities();
    }

    checkCombat() {
        if (!this.player.alive || this.player.invincible) return;

        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const enemy = this.enemies[i];
            if (!enemy.alive) continue;

            // Check collision between player and enemy
            if (Phaser.Geom.Rectangle.Overlaps(this.player.bounds, enemy.bounds)) {
                const playerLanceY = this.player.getLanceY();
                const enemyLanceY = enemy.getLanceY();

                if (playerLanceY < enemyLanceY - 2) {
                    // Player wins (higher position)
                    this.defeatEnemy(enemy, i);
                } else if (enemyLanceY < playerLanceY - 2) {
                    // Enemy wins
                    this.playerHit();
                } else {
                    // Same height — both bounce off
                    this.player.velocityY = -150;
                    this.player.velocityX = -this.player.velocityX * 0.5;
                    enemy.velocityY = -150;
                    enemy.velocityX = -enemy.velocityX * 0.5;
                }
            }
        }
    }

    defeatEnemy(enemy, index) {
        enemy.alive = false;
        this.audio.playLanceHit();
        this.score += enemy.tier.score;
        this.enemiesDefeated++;

        // Drop an egg
        const egg = new Egg(this, enemy.x, enemy.y, enemy.tierKey);
        this.eggs.push(egg);

        // Bounce player up slightly
        this.player.velocityY = -120;

        // Clean up enemy graphics
        enemy.destroy();
        this.enemies.splice(index, 1);
    }

    playerHit() {
        this.lives--;
        this.player.die();
        this.livesText.setText(`Lives: ${this.lives}`);

        if (this.lives <= 0) {
            this.time.delayedCall(1000, () => this.endGame());
        } else {
            this.time.delayedCall(1500, () => {
                this.player.respawn();
            });
        }
    }

    checkEggCollection() {
        if (!this.player.alive) return;

        for (let i = this.eggs.length - 1; i >= 0; i--) {
            const egg = this.eggs[i];
            if (!egg.alive || egg.collected) {
                if (!egg.alive) {
                    egg.destroy();
                    this.eggs.splice(i, 1);
                }
                continue;
            }

            // Check player overlap with egg
            if (Phaser.Geom.Rectangle.Overlaps(this.player.bounds, egg.bounds)) {
                egg.collect();
                this.score += CONFIG.EGG_SCORE;
                this.eggsCollected++;
                egg.destroy();
                this.eggs.splice(i, 1);
            }
        }
    }

    checkLavaCollisions() {
        // Check player
        if (this.player.alive && this.lavaPit.checkCollision(this.player)) {
            this.audio.playLavaDeath();
            this.playerHit();
        }

        // Check enemies
        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const enemy = this.enemies[i];
            if (enemy.alive && enemy.y + enemy.height / 2 >= CONFIG.LAVA_Y) {
                enemy.alive = false;
                enemy.destroy();
                this.enemies.splice(i, 1);
            }
        }

        // Check eggs
        for (let i = this.eggs.length - 1; i >= 0; i--) {
            const egg = this.eggs[i];
            if (egg.alive && egg.y + egg.height / 2 >= CONFIG.LAVA_Y) {
                egg.alive = false;
                egg.destroy();
                this.eggs.splice(i, 1);
            }
        }
    }

    checkPterodactylCollisions() {
        if (!this.player.alive) return;

        for (let i = this.pterodactyls.length - 1; i >= 0; i--) {
            const ptero = this.pterodactyls[i];
            if (!ptero.alive) {
                ptero.destroy();
                this.pterodactyls.splice(i, 1);
                continue;
            }

            if (Phaser.Geom.Rectangle.Overlaps(this.player.bounds, ptero.bounds)) {
                // Check if player hit the open mouth
                if (ptero.checkMouthHit(this.player.bounds)) {
                    ptero.kill();
                    this.score += CONFIG.PTERO_SCORE;
                    this.player.velocityY = -150;
                    ptero.destroy();
                    this.pterodactyls.splice(i, 1);
                } else if (!this.player.invincible) {
                    // Pterodactyl kills player
                    this.playerHit();
                }
            }
        }
    }

    checkWaveComplete() {
        // Wave is complete when all enemies and eggs are gone
        if (this.enemies.length === 0 && this.eggs.length === 0 && !this.waveTransition) {
            // Clean up pterodactyls
            for (const ptero of this.pterodactyls) {
                ptero.destroy();
            }
            this.pterodactyls = [];

            this.audio.playWaveComplete();

            // Small delay before next wave
            this.waveTransition = true;
            this.waveTransitionTimer = 2000;

            this.time.delayedCall(2000, () => {
                if (!this.gameOver) {
                    this.startWave();
                }
            });
        }
    }

    endGame() {
        this.gameOver = true;
        this.audio.playGameOver();

        // Save high score
        const highScore = parseInt(localStorage.getItem(CONFIG.HIGH_SCORE_KEY) || '0');
        const isNewHigh = this.score > highScore;
        if (isNewHigh) {
            localStorage.setItem(CONFIG.HIGH_SCORE_KEY, this.score);
        }

        // Transition to game over
        this.time.delayedCall(1500, () => {
            this.scene.start('GameOverScene', {
                score: this.score,
                wave: this.wave,
                enemiesDefeated: this.enemiesDefeated,
                eggsCollected: this.eggsCollected,
                isNewHigh: isNewHigh
            });
        });
    }

    drawEntities() {
        // Draw lava first (background)
        this.lavaPit.draw();

        // Draw eggs
        for (const egg of this.eggs) {
            egg.draw();
        }

        // Draw enemies
        for (const enemy of this.enemies) {
            enemy.draw();
        }

        // Draw pterodactyls
        for (const ptero of this.pterodactyls) {
            ptero.draw();
        }

        // Draw player on top
        this.player.draw();
    }

    shutdown() {
        // Clean up entities
        if (this.player) this.player.destroy();
        if (this.lavaPit) this.lavaPit.destroy();
        for (const p of this.platforms) p.destroy();
        for (const e of this.enemies) e.destroy();
        for (const e of this.eggs) e.destroy();
        for (const p of this.pterodactyls) p.destroy();
    }
}
