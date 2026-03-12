// Bomberman Game Scene - Main gameplay
class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameScene' });
    }

    init(data) {
        data = data || {};
        this.difficulty = data.difficulty != null ? data.difficulty : 1;
        this.level = 1;
        this.lives = CONFIG.PLAYER.START_LIVES;
        this.score = 0;
        this.paused = false;
        this.levelClearing = false;
        this.doorRevealed = false;
        this.doorOpen = false;
    }

    create() {
        // Audio
        this.audio = window.gameAudio || new AudioManager();

        // Initialize containers
        this.bombs = [];
        this.explosions = [];
        this.enemies = [];
        this.powerUps = [];
        this.revealedDoor = null;

        // Create grid
        this.grid = new Grid(this);

        // HUD
        this._createHUD();

        // Start first level
        this._startLevel();

        // Input
        this.cursors = this.input.keyboard.createCursorKeys();
        this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
        this.pKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.P);
        this.escKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
        this.mKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.M);

        // Pause handling
        this.pKey.on('down', () => this._togglePause());
        this.escKey.on('down', () => this._togglePause());
        this.mKey.on('down', () => {
            if (this.audio) {
                const muted = this.audio.toggleMute();
                this.muteText.setText(muted ? 'MUTED' : '');
            }
        });

        // Space to place bomb
        this.spaceKey.on('down', () => {
            if (this.paused || this.levelClearing) return;
            this._placeBomb();
        });

        // Move cooldown tracking
        this.moveHeld = false;
        this.moveTimer = 0;

        // Pause overlay (hidden initially)
        this.pauseOverlay = this.add.rectangle(
            CONFIG.WIDTH / 2, CONFIG.HEIGHT / 2,
            CONFIG.WIDTH, CONFIG.HEIGHT,
            0x000000, 0.7
        ).setDepth(100).setVisible(false);

        this.pauseText = this.add.text(CONFIG.WIDTH / 2, CONFIG.HEIGHT / 2, 'PAUSED', {
            fontFamily: 'monospace',
            fontSize: '48px',
            color: CONFIG.COLORS.ACCENT,
            fontStyle: 'bold',
        }).setOrigin(0.5).setDepth(101).setVisible(false);

        this.pauseSubText = this.add.text(CONFIG.WIDTH / 2, CONFIG.HEIGHT / 2 + 50, 'Press P or ESC to resume', {
            fontFamily: 'monospace',
            fontSize: '16px',
            color: '#AAAACC',
        }).setOrigin(0.5).setDepth(101).setVisible(false);
    }

    _createHUD() {
        // HUD background
        this.add.rectangle(CONFIG.WIDTH / 2, CONFIG.HUD_HEIGHT / 2, CONFIG.WIDTH, CONFIG.HUD_HEIGHT, CONFIG.COLORS.HUD_BG).setDepth(50);

        this.hudLives = this.add.text(10, CONFIG.HUD_HEIGHT / 2, '', {
            fontFamily: 'monospace',
            fontSize: '16px',
            color: CONFIG.COLORS.TEXT,
        }).setOrigin(0, 0.5).setDepth(51);

        this.hudScore = this.add.text(CONFIG.WIDTH / 2, CONFIG.HUD_HEIGHT / 2, '', {
            fontFamily: 'monospace',
            fontSize: '16px',
            color: CONFIG.COLORS.ACCENT,
            fontStyle: 'bold',
        }).setOrigin(0.5, 0.5).setDepth(51);

        this.hudLevel = this.add.text(CONFIG.WIDTH - 10, CONFIG.HUD_HEIGHT / 2, '', {
            fontFamily: 'monospace',
            fontSize: '16px',
            color: CONFIG.COLORS.TEXT,
        }).setOrigin(1, 0.5).setDepth(51);

        this.muteText = this.add.text(CONFIG.WIDTH - 120, CONFIG.HUD_HEIGHT / 2, '', {
            fontFamily: 'monospace',
            fontSize: '12px',
            color: '#FF5555',
        }).setOrigin(1, 0.5).setDepth(51);

        // Notification text (center of play area)
        this.notifyText = this.add.text(CONFIG.WIDTH / 2, CONFIG.HEIGHT / 2, '', {
            fontFamily: 'monospace',
            fontSize: '24px',
            color: CONFIG.COLORS.ACCENT,
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 3,
        }).setOrigin(0.5).setDepth(90).setAlpha(0);
    }

    _updateHUD() {
        this.hudLives.setText(`LIVES: ${'♥'.repeat(this.lives)}`);
        this.hudScore.setText(`SCORE: ${this.score}`);
        this.hudLevel.setText(`LEVEL ${this.level}`);
    }

    _showNotification(text, duration = 2000) {
        this.notifyText.setText(text).setAlpha(1);
        this.tweens.add({
            targets: this.notifyText,
            alpha: 0,
            duration: duration,
            delay: 500,
            ease: 'Power2',
        });
    }

    _startLevel() {
        // Clean up old entities
        this._cleanupEntities();

        this.levelClearing = false;
        this.doorRevealed = false;
        this.doorOpen = false;
        this.bombs = [];
        this.explosions = [];
        this.enemies = [];
        this.powerUps = [];
        this.revealedDoor = null;

        // Generate grid
        this.grid.generate(this.level);
        this.grid.draw();

        // Create player
        this.player = new Player(this, 1, 1);

        // Spawn enemies
        this._spawnEnemies();

        // Update HUD
        this._updateHUD();

        // Show level notification
        this._showNotification(`LEVEL ${this.level}`, 2000);
    }

    _spawnEnemies() {
        const base = CONFIG.DIFFICULTY.BASE_ENEMIES;
        const inc = CONFIG.DIFFICULTY.ENEMY_INCREMENT;
        const diffMult = [0.7, 1.0, 1.5][this.difficulty];

        const numBallom = Math.round((base.ballom + (this.level - 1) * inc.ballom) * diffMult);
        const numOneal = Math.round((base.oneal + (this.level - 1) * inc.oneal) * diffMult);
        const numDahl = Math.round((base.dahl + Math.max(0, this.level - 2) * inc.dahl) * diffMult);

        // Get valid spawn positions (away from player start)
        const empty = this.grid.getEmptyPositions().filter(
            p => Math.abs(p.r - 1) + Math.abs(p.c - 1) > 4
        );

        // Shuffle
        for (let i = empty.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [empty[i], empty[j]] = [empty[j], empty[i]];
        }

        let idx = 0;
        const spawn = (count, type) => {
            for (let i = 0; i < count && idx < empty.length; i++, idx++) {
                const enemy = new Enemy(this, empty[idx].r, empty[idx].c, type);
                enemy.applyDifficultyScale(this.level);
                this.enemies.push(enemy);
            }
        };

        spawn(numBallom, CONFIG.ENEMY_TYPE.BALLOM);
        spawn(numOneal, CONFIG.ENEMY_TYPE.ONEAL);
        spawn(numDahl, CONFIG.ENEMY_TYPE.DAHL);
    }

    _cleanupEntities() {
        if (this.player) { this.player.destroy(); this.player = null; }
        this.bombs.forEach(b => b.destroy());
        this.explosions.forEach(e => e.destroy());
        this.enemies.forEach(e => e.destroy());
        this.powerUps.forEach(p => p.destroy());
        if (this.revealedDoor) { this.revealedDoor.destroy(); this.revealedDoor = null; }
        if (this.grid && this.grid.graphics) { this.grid.graphics.destroy(); }
    }

    update(time, delta) {
        if (this.paused || this.levelClearing) return;

        // Clamp delta to prevent huge jumps
        delta = Math.min(delta, 50);

        // Handle player movement (held keys)
        this._handleInput(delta);

        // Update player
        if (this.player) this.player.update(delta);

        // Update bombs
        this.bombs.forEach(b => b.update(delta));
        // Remove exploded bombs
        const explodedBombs = this.bombs.filter(b => b.exploded);
        explodedBombs.forEach(b => {
            this.player.activeBombs = Math.max(0, this.player.activeBombs - 1);
            b.destroy();
        });
        this.bombs = this.bombs.filter(b => !b.exploded);

        // Update explosions
        this.explosions.forEach(e => e.update(delta));
        const doneExplosions = this.explosions.filter(e => e.done);
        doneExplosions.forEach(e => e.destroy());
        this.explosions = this.explosions.filter(e => !e.done);

        // Update enemies
        this.enemies.forEach(e => {
            if (e.alive) {
                e.update(delta, this.player.gridRow, this.player.gridCol);
            }
        });

        // Update power-ups
        this.powerUps.forEach(p => p.update(delta));

        // Update revealed door
        if (this.revealedDoor) this.revealedDoor.update(delta);

        // Collision checks
        this._checkExplosionCollisions();
        this._checkPlayerEnemyCollision();
        this._checkPlayerPowerUpCollision();
        this._checkPlayerDoorCollision();

        // Update HUD
        this._updateHUD();
    }

    _handleInput(delta) {
        if (!this.player || !this.player.alive) return;

        let dr = 0, dc = 0;
        if (this.cursors.up.isDown) dr = -1;
        else if (this.cursors.down.isDown) dr = 1;
        else if (this.cursors.left.isDown) dc = -1;
        else if (this.cursors.right.isDown) dc = 1;

        if (dr !== 0 || dc !== 0) {
            if (!this.moveHeld) {
                // First press - move immediately
                this.player.tryMove(dr, dc);
                this.moveHeld = true;
                this.moveTimer = 0;
            } else {
                this.moveTimer += delta;
                if (this.moveTimer >= CONFIG.PLAYER.MOVE_COOLDOWN) {
                    this.player.tryMove(dr, dc);
                    this.moveTimer = 0;
                }
            }
        } else {
            this.moveHeld = false;
            this.moveTimer = 0;
        }
    }

    _placeBomb() {
        if (!this.player || !this.player.alive) return;
        if (!this.player.placeBomb()) return;

        const r = this.player.gridRow;
        const c = this.player.gridCol;

        // Check if bomb already exists at this position
        if (this.isBombAt(r, c)) return;

        const bomb = new Bomb(this, r, c, this.player.bombRange, 'player');
        this.bombs.push(bomb);
        this.player.activeBombs++;
        this.audio.placeBomb();
    }

    isBombAt(r, c) {
        return this.bombs.some(b => !b.exploded && b.gridRow === r && b.gridCol === c);
    }

    createExplosion(r, c, range) {
        const explosion = new Explosion(this, r, c, range);
        this.explosions.push(explosion);
    }

    chainDetonateBomb(r, c) {
        const bomb = this.bombs.find(b => !b.exploded && b.gridRow === r && b.gridCol === c);
        if (bomb) {
            bomb.detonate();
        }
    }

    destroySoftBlock(r, c) {
        if (this.grid.getCell(r, c) !== CONFIG.CELL.SOFT_BLOCK) return;

        this.grid.setCell(r, c, CONFIG.CELL.EMPTY);
        this.score += CONFIG.SCORE.SOFT_BLOCK;

        // Redraw grid
        this.grid.draw();

        // Check if door was hidden here
        if (this.grid.isDoor(r, c) && !this.doorRevealed) {
            this.doorRevealed = true;
            this._revealDoor(r, c);
        }

        // Check if power-up was hidden here
        const pu = this.grid.getPowerUpAt(r, c);
        if (pu) {
            this.grid.removePowerUp(r, c);
            const powerUp = new PowerUp(this, r, c, pu.type);
            this.powerUps.push(powerUp);
        }
    }

    _revealDoor(r, c) {
        // Create a door visual
        this.revealedDoor = {
            r, c,
            graphics: this.add.graphics().setDepth(1),
            elapsed: 0,
            update(delta) {
                this.elapsed += delta;
                this.graphics.clear();
                const pos = {
                    x: CONFIG.OFFSET_X + this.c * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE / 2,
                    y: CONFIG.OFFSET_Y + this.r * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE / 2,
                };
                const ts = CONFIG.TILE_SIZE;
                const pulse = 0.8 + 0.2 * Math.sin(this.elapsed * 0.003);

                // Door background
                this.graphics.fillStyle(CONFIG.COLORS.DOOR, pulse);
                this.graphics.fillRect(
                    pos.x - ts * 0.35, pos.y - ts * 0.4,
                    ts * 0.7, ts * 0.8
                );
                // Door frame
                this.graphics.lineStyle(2, 0xBF8F00, 1);
                this.graphics.strokeRect(
                    pos.x - ts * 0.35, pos.y - ts * 0.4,
                    ts * 0.7, ts * 0.8
                );
                // Door knob
                this.graphics.fillStyle(0x795548, 1);
                this.graphics.fillCircle(pos.x + ts * 0.15, pos.y, ts * 0.06);
            },
            destroy() {
                this.graphics.destroy();
            }
        };
    }

    _checkExplosionCollisions() {
        for (const explosion of this.explosions) {
            if (explosion.done) continue;

            // Check player
            if (this.player && this.player.alive) {
                if (explosion.isAffecting(this.player.gridRow, this.player.gridCol)) {
                    this._playerHit();
                }
            }

            // Check enemies
            for (const enemy of this.enemies) {
                if (!enemy.alive) continue;
                if (explosion.isAffecting(enemy.gridRow, enemy.gridCol)) {
                    const pts = enemy.kill();
                    this.score += pts;
                    this.audio.enemyKill();
                }
            }
        }
    }

    _checkPlayerEnemyCollision() {
        if (!this.player || !this.player.alive) return;

        for (const enemy of this.enemies) {
            if (!enemy.alive) continue;

            // Grid-based collision
            const sameCell = enemy.gridRow === this.player.gridRow &&
                             enemy.gridCol === this.player.gridCol;

            // Also check visual proximity for smooth movement overlap
            const eVr = enemy.getVisualRow();
            const eVc = enemy.getVisualCol();
            const pVr = this.player.moving ?
                this.player.moveFromRow + (this.player.moveToRow - this.player.moveFromRow) * this.player.moveProgress :
                this.player.gridRow;
            const pVc = this.player.moving ?
                this.player.moveFromCol + (this.player.moveToCol - this.player.moveFromCol) * this.player.moveProgress :
                this.player.gridCol;

            const dist = Math.abs(eVr - pVr) + Math.abs(eVc - pVc);

            if (sameCell || dist < 0.7) {
                this._playerHit();
                break;
            }
        }
    }

    _checkPlayerPowerUpCollision() {
        if (!this.player || !this.player.alive) return;

        for (const pu of this.powerUps) {
            if (pu.collected) continue;
            if (pu.gridRow === this.player.gridRow && pu.gridCol === this.player.gridCol) {
                pu.collect();
                this.player.applyPowerUp(pu.type);
                this.audio.pickup();
                this._showNotification(pu.getLabel(), 1500);
            }
        }

        // Clean up collected power-ups
        const collected = this.powerUps.filter(p => p.collected);
        collected.forEach(p => p.destroy());
        this.powerUps = this.powerUps.filter(p => !p.collected);
    }

    _checkPlayerDoorCollision() {
        if (!this.player || !this.player.alive) return;
        if (!this.doorRevealed || !this.revealedDoor) return;

        // Door only works when all enemies are dead
        const allDead = this.enemies.every(e => !e.alive);
        if (!allDead) return;

        if (!this.doorOpen) {
            this.doorOpen = true;
            this.audio.doorOpen();
            this._showNotification('DOOR OPEN!', 1500);
        }

        if (this.player.gridRow === this.revealedDoor.r &&
            this.player.gridCol === this.revealedDoor.c) {
            this._levelClear();
        }
    }

    _playerHit() {
        if (!this.player || !this.player.alive) return;
        if (this.player.invincible) return;

        if (!this.player.kill()) return;

        this.audio.death();
        this.lives--;

        if (this.lives <= 0) {
            // Game over
            this.time.delayedCall(1500, () => {
                this._gameOver();
            });
        } else {
            // Respawn after delay
            this._showNotification(`LIVES: ${this.lives}`, 1500);
            this.time.delayedCall(2000, () => {
                if (this.player) {
                    // Clear bombs near spawn
                    this.bombs = this.bombs.filter(b => {
                        if (b.gridRow <= 2 && b.gridCol <= 2) {
                            b.destroy();
                            return false;
                        }
                        return true;
                    });
                    this.player.respawn();
                }
            });
        }
    }

    _levelClear() {
        this.levelClearing = true;
        this.score += CONFIG.SCORE.LEVEL_CLEAR;
        this.audio.levelClear();
        this._showNotification('LEVEL CLEAR!', 2500);

        this.time.delayedCall(3000, () => {
            this.level++;
            this._startLevel();
        });
    }

    _gameOver() {
        // Save high score
        const highScore = parseInt(localStorage.getItem(CONFIG.STORAGE_KEY) || '0');
        if (this.score > highScore) {
            localStorage.setItem(CONFIG.STORAGE_KEY, this.score);
        }

        this._cleanupEntities();

        this.scene.start('GameOverScene', {
            score: this.score,
            level: this.level,
            highScore: Math.max(this.score, highScore),
            difficulty: this.difficulty,
        });
    }

    _togglePause() {
        this.paused = !this.paused;
        this.pauseOverlay.setVisible(this.paused);
        this.pauseText.setVisible(this.paused);
        this.pauseSubText.setVisible(this.paused);
    }
}
