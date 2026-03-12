// Dig Dug - Game Scene (Main Gameplay)

class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameScene' });
    }

    init(data) {
        this.level = data.level || 1;
        this.audio = data.audio || new AudioManager();
        this.score = data.score || 0;
        this.lives = data.lives !== undefined ? data.lives : CONFIG.STARTING_LIVES;
        this.totalEnemiesKilled = data.totalEnemiesKilled || 0;
        this.totalRocksDropped = data.totalRocksDropped || 0;
    }

    create() {
        this.cameras.main.setBackgroundColor('#000000');

        // Game state
        this.paused = false;
        this.levelComplete = false;
        this.levelCompleteTimer = 0;
        this.gameOver = false;
        this.rocksDroppedThisLevel = 0;

        // Vegetable state
        this.veggie = null;
        this.veggieTimer = 0;
        this.veggieSpawned = false;

        // Pumping state
        this.pumpHeld = false;
        this.pumpInflateTimer = 0;

        // Create grid
        this.grid = new Grid(this);
        this.grid.init();

        // Determine spawn positions
        const playerSpawn = { col: 10, row: 1 }; // Top center, at surface

        // Create enemy spawn positions (spread across the dirt area)
        const enemySpawns = this.generateEnemySpawns();

        // Create initial tunnels
        this.grid.createInitialTunnels(playerSpawn, enemySpawns);

        // Create player
        this.player = new Player(this, this.grid, playerSpawn.col, playerSpawn.row);

        // Create enemies
        this.enemies = [];
        const pookaCount = CONFIG.LEVELS.getPookaCount(this.level);
        const fygarCount = CONFIG.LEVELS.getFygarCount(this.level);

        for (let i = 0; i < pookaCount && i < enemySpawns.length; i++) {
            const spawn = enemySpawns[i];
            this.enemies.push(new Pooka(this, this.grid, spawn.col, spawn.row));
        }
        for (let i = 0; i < fygarCount && (pookaCount + i) < enemySpawns.length; i++) {
            const spawn = enemySpawns[pookaCount + i];
            this.enemies.push(new Fygar(this, this.grid, spawn.col, spawn.row));
        }

        // Create rocks
        this.rocks = [];
        const rockCount = CONFIG.LEVELS.getRockCount(this.level);
        const rockPositions = this.generateRockPositions(rockCount, enemySpawns);
        rockPositions.forEach(pos => {
            this.rocks.push(new Rock(this, this.grid, pos.col, pos.row));
        });

        // Draw initial grid
        this.grid.draw();

        // HUD
        this.createHUD();

        // Input
        this.cursors = this.input.keyboard.createCursorKeys();
        this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
        this.pKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.P);
        this.escKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
        this.mKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.M);

        // Pause handler
        this.pKey.on('down', () => this.togglePause());
        this.escKey.on('down', () => this.togglePause());
        this.mKey.on('down', () => {
            const muted = this.audio.toggleMute();
            this.muteText.setText(muted ? 'MUTED' : '');
        });

        // Pause overlay
        this.pauseOverlay = this.add.graphics();
        this.pauseOverlay.setDepth(100);
        this.pauseOverlay.setVisible(false);

        this.pauseText = this.add.text(CONFIG.WIDTH / 2, CONFIG.HEIGHT / 2, 'PAUSED', {
            fontFamily: 'Arial Black, Arial, sans-serif',
            fontSize: '48px',
            color: '#FFFFFF',
            stroke: '#000000',
            strokeThickness: 4
        }).setOrigin(0.5).setDepth(101).setVisible(false);

        this.pauseSubText = this.add.text(CONFIG.WIDTH / 2, CONFIG.HEIGHT / 2 + 50, 'Press P or ESC to resume', {
            fontFamily: 'Arial, sans-serif',
            fontSize: '20px',
            color: '#AAAAAA'
        }).setOrigin(0.5).setDepth(101).setVisible(false);

        // Score popup pool
        this.scorePopups = [];

        // Speed multiplier for this level
        this.speedMult = CONFIG.LEVELS.getSpeedMult(this.level);
    }

    generateEnemySpawns() {
        const spawns = [];
        const totalEnemies = CONFIG.LEVELS.getEnemyCount(this.level);

        // Spread enemies across the dirt area
        const startRow = 4;
        const endRow = CONFIG.GRID_ROWS - 2;
        const startCol = 2;
        const endCol = CONFIG.GRID_COLS - 3;

        for (let i = 0; i < totalEnemies; i++) {
            let col, row;
            let attempts = 0;
            do {
                col = startCol + Math.floor(Math.random() * (endCol - startCol));
                row = startRow + Math.floor(Math.random() * (endRow - startRow));
                attempts++;
            } while (attempts < 50 && spawns.some(s => Math.abs(s.col - col) < 3 && Math.abs(s.row - row) < 2));

            spawns.push({ col, row });
        }

        return spawns;
    }

    generateRockPositions(count, enemySpawns) {
        const positions = [];
        const startRow = 3;
        const endRow = CONFIG.GRID_ROWS - 4;

        for (let i = 0; i < count; i++) {
            let col, row;
            let attempts = 0;
            do {
                col = 2 + Math.floor(Math.random() * (CONFIG.GRID_COLS - 4));
                row = startRow + Math.floor(Math.random() * (endRow - startRow));
                attempts++;
            } while (attempts < 50 && (
                positions.some(p => Math.abs(p.col - col) < 3 && Math.abs(p.row - row) < 2) ||
                enemySpawns.some(e => e.col === col && e.row === row)
            ));

            positions.push({ col, row });
        }

        return positions;
    }

    createHUD() {
        const hudDepth = 50;

        // Score
        this.scoreText = this.add.text(10, 5, `Score: ${this.score}`, {
            fontFamily: 'Arial, sans-serif',
            fontSize: '18px',
            color: '#FFFFFF'
        }).setDepth(hudDepth).setScrollFactor(0);

        // Level
        this.levelText = this.add.text(CONFIG.WIDTH / 2, 5, `Level ${this.level}`, {
            fontFamily: 'Arial, sans-serif',
            fontSize: '18px',
            color: '#FFD700'
        }).setOrigin(0.5, 0).setDepth(hudDepth).setScrollFactor(0);

        // Lives
        this.livesText = this.add.text(CONFIG.WIDTH - 10, 5, `Lives: ${this.lives}`, {
            fontFamily: 'Arial, sans-serif',
            fontSize: '18px',
            color: '#FF4444'
        }).setOrigin(1, 0).setDepth(hudDepth).setScrollFactor(0);

        // High score
        const hs = localStorage.getItem(CONFIG.STORAGE_KEY) || 0;
        this.highScoreText = this.add.text(CONFIG.WIDTH / 2, 25, `HI: ${hs}`, {
            fontFamily: 'Arial, sans-serif',
            fontSize: '14px',
            color: '#888888'
        }).setOrigin(0.5, 0).setDepth(hudDepth).setScrollFactor(0);

        // Mute indicator
        this.muteText = this.add.text(CONFIG.WIDTH - 10, 25, this.audio.muted ? 'MUTED' : '', {
            fontFamily: 'Arial, sans-serif',
            fontSize: '14px',
            color: '#FF8800'
        }).setOrigin(1, 0).setDepth(hudDepth).setScrollFactor(0);
    }

    update(time, delta) {
        if (this.paused || this.gameOver) return;

        if (this.levelComplete) {
            this.levelCompleteTimer -= delta;
            if (this.levelCompleteTimer <= 0) {
                this.nextLevel();
            }
            return;
        }

        // Update player
        const playerDead = this.player.update(delta, this.cursors, this.enemies);
        if (playerDead) {
            this.onPlayerDeath();
            return;
        }

        // Handle pump input
        this.handlePumpInput(delta);

        // Update enemies
        const aliveEnemies = this.enemies.filter(e => e.alive);
        const activeEnemies = aliveEnemies.filter(e => !e.dying);

        // Check if last enemy should flee
        if (activeEnemies.length === 1 && aliveEnemies.length === 1) {
            if (!activeEnemies[0].fleeing) {
                activeEnemies[0].startFleeing();
            }
        }

        for (const enemy of this.enemies) {
            if (!enemy.alive) continue;
            enemy.update(delta, this.player, this.speedMult);

            // Check collision with player
            if (this.player.alive && !this.player.invincible && !enemy.dying && enemy.inflateLevel === 0) {
                const dist = Math.abs(enemy.x - this.player.x) + Math.abs(enemy.y - this.player.y);
                if (dist < CONFIG.CELL_WIDTH * 0.7) {
                    this.player.die();
                }
            }

            // Check Fygar fire hitting player
            if (enemy.type === 'fygar' && enemy.fireActive && this.player.alive && !this.player.invincible) {
                if (enemy.isFireAt(this.player.col, this.player.row)) {
                    this.player.die();
                }
            }

            // Check if fleeing enemy reached surface
            if (enemy.fleeing && enemy.row <= CONFIG.SKY_ROWS && !enemy.dying) {
                // Enemy escaped - remove from game
                enemy.alive = false;
                enemy.destroy();
            }
        }

        // Clean up dead enemies
        this.enemies = this.enemies.filter(e => {
            if (!e.alive) {
                e.destroy();
                return false;
            }
            return true;
        });

        // Update rocks
        for (const rock of this.rocks) {
            if (!rock.alive) continue;
            const result = rock.update(delta, this.enemies, this.player);

            // Handle crushed enemies
            if (result.crushedEnemies.length > 0) {
                const rockScore = rock.getRockScore();
                if (rockScore > 0) {
                    this.addScore(rockScore, rock.x, rock.y);
                }
                this.totalEnemiesKilled += result.crushedEnemies.length;
            }

            // Handle rock dropping count for veggie spawning
            if (rock.state === 'falling' && !rock._countedDrop) {
                rock._countedDrop = true;
                this.rocksDroppedThisLevel++;
                this.totalRocksDropped++;
            }

            // Handle rock crushing player
            if (result.crushedPlayer && this.player.alive) {
                this.player.die();
            }
        }

        // Clean up dead rocks
        this.rocks = this.rocks.filter(r => {
            if (!r.alive) {
                r.destroy();
                return false;
            }
            return true;
        });

        // Vegetable spawning (after 2 rocks dropped)
        if (this.rocksDroppedThisLevel >= 2 && !this.veggieSpawned) {
            this.spawnVeggie();
        }

        // Update veggie
        if (this.veggie) {
            this.veggieTimer -= delta;
            if (this.veggieTimer <= 0) {
                this.removeVeggie();
            } else {
                // Check player collection
                const dist = Math.abs(this.veggie.x - this.player.x) + Math.abs(this.veggie.y - this.player.y);
                if (dist < CONFIG.CELL_WIDTH * 0.8) {
                    this.collectVeggie();
                }
            }
        }

        // Redraw grid
        this.grid.draw();

        // Check level complete
        if (this.enemies.filter(e => e.alive).length === 0) {
            this.levelComplete = true;
            this.levelCompleteTimer = 2000;
            this.audio.playLevelComplete();
        }

        // Update HUD
        this.updateHUD();

        // Update score popups
        this.updateScorePopups(delta);
    }

    handlePumpInput(delta) {
        if (!this.player.alive) return;

        if (Phaser.Input.Keyboard.JustDown(this.spaceKey)) {
            // Start pumping or pump more
            const target = this.player.startPump(this.enemies);
            if (target) {
                this.audio.playPump();
                this.pumpHeld = true;
                this.pumpInflateTimer = 0;
            }
        }

        if (this.spaceKey.isDown && this.player.pumping && this.player.pumpTarget) {
            this.pumpInflateTimer += delta;
            if (this.pumpInflateTimer >= CONFIG.PUMP_INFLATE_TIME) {
                this.pumpInflateTimer = 0;
                const enemy = this.player.pumpTarget;
                const popped = enemy.inflate();
                if (popped) {
                    // Enemy was killed by pumping
                    const score = enemy.getScoreValue();
                    this.addScore(score, enemy.x, enemy.y);
                    this.totalEnemiesKilled++;
                    this.player.releasePump();
                } else {
                    this.audio.playInflate();
                }
            }
        }

        if (Phaser.Input.Keyboard.JustUp(this.spaceKey)) {
            if (this.player.pumping) {
                this.player.releasePump();
            }
            this.pumpHeld = false;
            this.pumpInflateTimer = 0;
        }
    }

    spawnVeggie() {
        this.veggieSpawned = true;
        const centerCol = Math.floor(CONFIG.GRID_COLS / 2);
        const centerRow = Math.floor(CONFIG.GRID_ROWS / 2);

        // Ensure the center cell is dug out
        this.grid.digCell(centerRow, centerCol);

        const pos = this.grid.gridToPixel(centerCol, centerRow);
        const veggieIndex = Math.min(this.level - 1, CONFIG.VEGETABLES.length - 1);

        this.veggie = {
            x: pos.x,
            y: pos.y,
            col: centerCol,
            row: centerRow,
            type: CONFIG.VEGETABLES[veggieIndex],
            score: CONFIG.VEGGIE_SCORES[veggieIndex],
            graphics: this.add.graphics().setDepth(6)
        };

        this.veggieTimer = CONFIG.VEGGIE_DURATION;
        this.drawVeggie();
    }

    drawVeggie() {
        if (!this.veggie) return;
        const g = this.veggie.graphics;
        g.clear();

        const cx = this.veggie.x;
        const cy = this.veggie.y;
        const s = CONFIG.CELL_WIDTH * 0.35;

        // Pulsing glow
        const pulse = 0.8 + Math.sin(Date.now() * 0.005) * 0.2;

        // Vegetable body (orange/colored)
        g.fillStyle(CONFIG.COLORS.VEGGIE, pulse);
        g.fillRoundedRect(cx - s, cy - s, s * 2, s * 2, 4);

        // Green top/leaves
        g.fillStyle(0x00AA00, pulse);
        g.fillTriangle(cx - s * 0.3, cy - s, cx, cy - s * 1.5, cx + s * 0.3, cy - s);

        // Score value text
        // (drawn as simple indicator)
        g.fillStyle(0xFFFFFF, 0.8);
        g.fillCircle(cx, cy, s * 0.3);
    }

    collectVeggie() {
        if (!this.veggie) return;
        this.addScore(this.veggie.score, this.veggie.x, this.veggie.y);
        this.audio.playBonus();
        this.removeVeggie();
    }

    removeVeggie() {
        if (this.veggie) {
            this.veggie.graphics.destroy();
            this.veggie = null;
        }
    }

    addScore(points, x, y) {
        this.score += points;

        // Update high score
        const hs = parseInt(localStorage.getItem(CONFIG.STORAGE_KEY) || '0');
        if (this.score > hs) {
            localStorage.setItem(CONFIG.STORAGE_KEY, this.score.toString());
        }

        // Create floating score popup
        const popup = this.add.text(x, y, `+${points}`, {
            fontFamily: 'Arial Black, Arial, sans-serif',
            fontSize: '20px',
            color: '#FFFF00',
            stroke: '#000000',
            strokeThickness: 2
        }).setOrigin(0.5).setDepth(60);

        this.scorePopups.push({ text: popup, timer: 1000, startY: y });
    }

    updateScorePopups(delta) {
        for (let i = this.scorePopups.length - 1; i >= 0; i--) {
            const popup = this.scorePopups[i];
            popup.timer -= delta;
            const progress = 1 - popup.timer / 1000;
            popup.text.setY(popup.startY - progress * 40);
            popup.text.setAlpha(1 - progress);

            if (popup.timer <= 0) {
                popup.text.destroy();
                this.scorePopups.splice(i, 1);
            }
        }

        // Redraw veggie (for animation)
        if (this.veggie) {
            this.drawVeggie();
        }
    }

    onPlayerDeath() {
        this.lives--;

        if (this.lives <= 0) {
            this.gameOver = true;
            // Brief delay then game over
            this.time.delayedCall(500, () => {
                this.cleanUp();
                this.scene.start('GameOverScene', {
                    score: this.score,
                    level: this.level,
                    enemiesKilled: this.totalEnemiesKilled,
                    rocksDropped: this.totalRocksDropped,
                    audio: this.audio
                });
            });
        } else {
            // Respawn player
            this.time.delayedCall(1000, () => {
                this.player.respawn(10, 1);
                // Reset enemy inflate states
                this.enemies.forEach(e => {
                    if (e.alive && !e.dying) {
                        e.inflateLevel = 0;
                    }
                });
            });
        }

        this.updateHUD();
    }

    nextLevel() {
        this.cleanUp();
        this.scene.start('GameScene', {
            level: this.level + 1,
            audio: this.audio,
            score: this.score,
            lives: this.lives,
            totalEnemiesKilled: this.totalEnemiesKilled,
            totalRocksDropped: this.totalRocksDropped
        });
    }

    togglePause() {
        this.paused = !this.paused;
        this.pauseOverlay.setVisible(this.paused);
        this.pauseText.setVisible(this.paused);
        this.pauseSubText.setVisible(this.paused);

        if (this.paused) {
            this.pauseOverlay.clear();
            this.pauseOverlay.fillStyle(0x000000, 0.6);
            this.pauseOverlay.fillRect(0, 0, CONFIG.WIDTH, CONFIG.HEIGHT);
        }
    }

    updateHUD() {
        this.scoreText.setText(`Score: ${this.score}`);
        this.livesText.setText(`Lives: ${this.lives}`);
        const hs = localStorage.getItem(CONFIG.STORAGE_KEY) || 0;
        this.highScoreText.setText(`HI: ${hs}`);
    }

    cleanUp() {
        // Clean up all game objects
        if (this.player) this.player.destroy();
        this.enemies.forEach(e => e.destroy());
        this.rocks.forEach(r => r.destroy());
        this.scorePopups.forEach(p => p.text.destroy());
        this.removeVeggie();
    }
}
