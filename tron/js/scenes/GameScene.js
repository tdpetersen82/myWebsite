// Tron Light Cycles - Game Scene
class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameScene' });
    }

    init(data) {
        this.difficultyKey = data.difficulty || 'NORMAL';
        this.difficultySettings = TRON_CONFIG.DIFFICULTY[this.difficultyKey];
    }

    create() {
        const w = TRON_CONFIG.WIDTH;
        const h = TRON_CONFIG.HEIGHT;

        // Graphics layers
        this.arenaGraphics = this.add.graphics();
        this.trailGraphics = this.add.graphics();
        this.uiGraphics = this.add.graphics();
        this.boostGraphics = this.add.graphics();

        // Arena
        this.arena = new Arena();

        // Match state
        this.playerScore = 0;
        this.aiScore = 0;
        this.currentRound = 0;
        this.roundActive = false;
        this.matchOver = false;
        this.paused = false;
        this.roundStartTime = 0;

        // Boost pickup
        this.boostPickup = null;
        this.boostSpawnTimer = 0;
        this.nextBoostSpawnTime = this._randomBoostTime();

        // Speed increase per round: reduce move interval by 5ms each round
        this.speedBonus = 0;

        // HUD texts
        this._createHUD();

        // Input
        this.cursors = this.input.keyboard.createCursorKeys();
        this.wasd = {
            up: this.input.keyboard.addKey('W'),
            down: this.input.keyboard.addKey('S'),
            left: this.input.keyboard.addKey('A'),
            right: this.input.keyboard.addKey('D'),
        };

        this.input.keyboard.on('keydown-P', () => this._togglePause());
        this.input.keyboard.on('keydown-ESC', () => this._togglePause());
        this.input.keyboard.on('keydown-M', () => {
            const muted = audioManager.toggleMute();
            this.muteText.setText(muted ? 'MUTED' : '');
        });

        // Start first round
        this._startRound();
    }

    _createHUD() {
        const w = TRON_CONFIG.WIDTH;

        // Round indicator
        this.roundText = this.add.text(w / 2, 12, '', {
            fontFamily: 'monospace',
            fontSize: '16px',
            color: TRON_CONFIG.COLORS.TEXT_WHITE,
        }).setOrigin(0.5, 0).setDepth(10);

        // Player score (left)
        this.playerScoreText = this.add.text(8, 8, '', {
            fontFamily: 'monospace',
            fontSize: '18px',
            color: TRON_CONFIG.COLORS.TEXT,
            fontStyle: 'bold',
        }).setDepth(10);

        // AI score (right)
        this.aiScoreText = this.add.text(w - 8, 8, '', {
            fontFamily: 'monospace',
            fontSize: '18px',
            color: TRON_CONFIG.COLORS.TEXT_ORANGE,
            fontStyle: 'bold',
        }).setOrigin(1, 0).setDepth(10);

        // Round pips (visual round tracker)
        this.pipTexts = [];

        // Center message (countdown, round result)
        this.centerText = this.add.text(w / 2, TRON_CONFIG.HEIGHT / 2, '', {
            fontFamily: 'monospace',
            fontSize: '48px',
            color: TRON_CONFIG.COLORS.TEXT_WHITE,
            fontStyle: 'bold',
        }).setOrigin(0.5).setDepth(20).setShadow(0, 0, '#ffffff', 8, true, true);

        this.subText = this.add.text(w / 2, TRON_CONFIG.HEIGHT / 2 + 50, '', {
            fontFamily: 'monospace',
            fontSize: '18px',
            color: TRON_CONFIG.COLORS.TEXT_WHITE,
        }).setOrigin(0.5).setDepth(20).setAlpha(0.7);

        // Pause overlay
        this.pauseText = this.add.text(w / 2, TRON_CONFIG.HEIGHT / 2, 'PAUSED', {
            fontFamily: 'monospace',
            fontSize: '48px',
            color: TRON_CONFIG.COLORS.TEXT_WHITE,
            fontStyle: 'bold',
        }).setOrigin(0.5).setDepth(30).setVisible(false)
          .setShadow(0, 0, '#ffffff', 10, true, true);

        this.pauseSubText = this.add.text(w / 2, TRON_CONFIG.HEIGHT / 2 + 50, 'Press P or ESC to resume', {
            fontFamily: 'monospace',
            fontSize: '16px',
            color: TRON_CONFIG.COLORS.TEXT_WHITE,
        }).setOrigin(0.5).setDepth(30).setVisible(false).setAlpha(0.6);

        // Mute indicator
        this.muteText = this.add.text(w - 8, TRON_CONFIG.HEIGHT - 8, audioManager.muted ? 'MUTED' : '', {
            fontFamily: 'monospace',
            fontSize: '12px',
            color: TRON_CONFIG.COLORS.TEXT_ORANGE,
        }).setOrigin(1, 1).setDepth(10).setAlpha(0.6);

        this._updateHUD();
    }

    _updateHUD() {
        this.roundText.setText(`Round ${this.currentRound + 1} of ${TRON_CONFIG.TOTAL_ROUNDS}`);
        this.playerScoreText.setText(`PLAYER: ${this.playerScore}`);
        this.aiScoreText.setText(`AI: ${this.aiScore}`);

        // Update round pip display
        this._updatePips();
    }

    _updatePips() {
        // Clear old pips
        this.pipTexts.forEach(t => t.destroy());
        this.pipTexts = [];

        const w = TRON_CONFIG.WIDTH;
        const pipY = 32;
        const totalPips = TRON_CONFIG.TOTAL_ROUNDS;
        const pipWidth = 16;
        const spacing = 6;
        const totalWidth = totalPips * pipWidth + (totalPips - 1) * spacing;
        const startX = (w - totalWidth) / 2;

        for (let i = 0; i < totalPips; i++) {
            let color;
            let symbol;
            if (i < this.roundResults.length) {
                // Completed round
                if (this.roundResults[i] === 'player') {
                    color = TRON_CONFIG.COLORS.TEXT;
                    symbol = '\u25CF'; // filled circle
                } else if (this.roundResults[i] === 'ai') {
                    color = TRON_CONFIG.COLORS.TEXT_ORANGE;
                    symbol = '\u25CF';
                } else {
                    color = '#666666';
                    symbol = '\u25CB'; // draw
                }
            } else if (i === this.currentRound) {
                color = TRON_CONFIG.COLORS.TEXT_WHITE;
                symbol = '\u25C9'; // current round
            } else {
                color = '#333333';
                symbol = '\u25CB'; // empty circle
            }

            const pip = this.add.text(startX + i * (pipWidth + spacing), pipY, symbol, {
                fontFamily: 'monospace',
                fontSize: '14px',
                color: color,
            }).setDepth(10);

            this.pipTexts.push(pip);
        }
    }

    _startRound() {
        // Reset arena for current round
        this.arena.reset(this.currentRound);

        // Speed increases each round
        this.speedBonus = this.currentRound * 5;

        // Get start positions
        const playerStart = this.arena.getPlayerStart();
        const aiStart = this.arena.getAIStart();

        // Create or reset cycles
        if (!this.playerCycle) {
            this.playerCycle = new Cycle(
                playerStart.x, playerStart.y,
                TRON_CONFIG.DIR.RIGHT,
                TRON_CONFIG.COLORS.PLAYER,
                TRON_CONFIG.COLORS.PLAYER_GLOW
            );
            this.aiCycle = new AICycle(
                aiStart.x, aiStart.y,
                TRON_CONFIG.DIR.LEFT,
                TRON_CONFIG.COLORS.AI,
                TRON_CONFIG.COLORS.AI_GLOW,
                this.difficultySettings
            );
        } else {
            this.playerCycle.reset(playerStart.x, playerStart.y, TRON_CONFIG.DIR.RIGHT);
            this.aiCycle.reset(aiStart.x, aiStart.y, TRON_CONFIG.DIR.LEFT);
        }

        // Apply speed bonus
        this.playerCycle.moveInterval = TRON_CONFIG.BASE_MOVE_INTERVAL - this.speedBonus;
        this.aiCycle.moveInterval = TRON_CONFIG.BASE_MOVE_INTERVAL - this.speedBonus;

        // Reset boost
        this.boostPickup = null;
        this.boostSpawnTimer = 0;
        this.nextBoostSpawnTime = this._randomBoostTime();

        // Round results tracking
        if (!this.roundResults) {
            this.roundResults = [];
        }

        this.roundActive = false;

        this._updateHUD();

        // Countdown
        this._doCountdown();
    }

    _doCountdown() {
        this.centerText.setVisible(true);
        this.subText.setVisible(true);

        const countSteps = [
            { text: '3', delay: 0 },
            { text: '2', delay: 800 },
            { text: '1', delay: 1600 },
            { text: 'GO!', delay: 2400 },
        ];

        countSteps.forEach(step => {
            this.time.delayedCall(step.delay, () => {
                if (this.matchOver) return;
                this.centerText.setText(step.text);
                this.subText.setText(step.text === 'GO!' ? '' : '');

                if (step.text === 'GO!') {
                    audioManager.playGo();
                    this.roundActive = true;
                    this.roundStartTime = this.time.now;
                    this.time.delayedCall(500, () => {
                        this.centerText.setVisible(false);
                        this.subText.setVisible(false);
                    });
                } else {
                    audioManager.playCountdown();
                }
            });
        });
    }

    _togglePause() {
        if (!this.roundActive || this.matchOver) return;

        this.paused = !this.paused;
        this.pauseText.setVisible(this.paused);
        this.pauseSubText.setVisible(this.paused);

        if (this.paused) {
            this.scene.pause();
        } else {
            this.scene.resume();
        }
    }

    update(time, delta) {
        if (this.paused || !this.roundActive || this.matchOver) return;

        // Handle input
        this._handleInput();

        // AI thinks before moving
        this.aiCycle.think(this.arena, this.playerCycle);

        // Update cycles
        const playerMoved = this.playerCycle.update(delta);
        const aiMoved = this.aiCycle.update(delta);

        // Check collisions after moves
        if (playerMoved || aiMoved) {
            this._checkCollisions();
        }

        // Update boost spawn
        if (!this.boostPickup) {
            this.boostSpawnTimer += delta;
            if (this.boostSpawnTimer >= this.nextBoostSpawnTime) {
                this._spawnBoost();
            }
        }

        // Check boost pickup
        if (this.boostPickup) {
            if (this.playerCycle.alive &&
                this.playerCycle.gridX === this.boostPickup.x &&
                this.playerCycle.gridY === this.boostPickup.y) {
                this.playerCycle.applyBoost();
                audioManager.playBoostPickup();
                this.boostPickup = null;
            } else if (this.aiCycle.alive &&
                       this.aiCycle.gridX === this.boostPickup.x &&
                       this.aiCycle.gridY === this.boostPickup.y) {
                this.aiCycle.applyBoost();
                audioManager.playBoostPickup();
                this.boostPickup = null;
            }
        }

        // Draw everything
        this._draw();
    }

    _handleInput() {
        const DIR = TRON_CONFIG.DIR;

        if (this.cursors.up.isDown || this.wasd.up.isDown) {
            this.playerCycle.setDirection(DIR.UP);
            audioManager.playTurn();
        } else if (this.cursors.down.isDown || this.wasd.down.isDown) {
            this.playerCycle.setDirection(DIR.DOWN);
            audioManager.playTurn();
        } else if (this.cursors.left.isDown || this.wasd.left.isDown) {
            this.playerCycle.setDirection(DIR.LEFT);
            audioManager.playTurn();
        } else if (this.cursors.right.isDown || this.wasd.right.isDown) {
            this.playerCycle.setDirection(DIR.RIGHT);
            audioManager.playTurn();
        }
    }

    _checkCollisions() {
        const player = this.playerCycle;
        const ai = this.aiCycle;
        let playerDead = false;
        let aiDead = false;

        // Check player collision
        if (player.alive) {
            // Wall collision
            if (this.arena.isBlocked(player.gridX, player.gridY)) {
                playerDead = true;
            }
            // Own trail collision (skip last entry which is current position)
            for (let i = 0; i < player.trail.length - 1; i++) {
                if (player.trail[i].x === player.gridX && player.trail[i].y === player.gridY) {
                    playerDead = true;
                    break;
                }
            }
            // AI trail collision
            for (const pos of ai.trail) {
                if (pos.x === player.gridX && pos.y === player.gridY) {
                    playerDead = true;
                    break;
                }
            }
        }

        // Check AI collision
        if (ai.alive) {
            // Wall collision
            if (this.arena.isBlocked(ai.gridX, ai.gridY)) {
                aiDead = true;
            }
            // Own trail collision (skip last entry)
            for (let i = 0; i < ai.trail.length - 1; i++) {
                if (ai.trail[i].x === ai.gridX && ai.trail[i].y === ai.gridY) {
                    aiDead = true;
                    break;
                }
            }
            // Player trail collision
            for (const pos of player.trail) {
                if (pos.x === ai.gridX && pos.y === ai.gridY) {
                    aiDead = true;
                    break;
                }
            }
        }

        // Head-on collision (both at same cell)
        if (player.alive && ai.alive &&
            player.gridX === ai.gridX && player.gridY === ai.gridY) {
            playerDead = true;
            aiDead = true;
        }

        if (playerDead) player.die();
        if (aiDead) ai.die();

        if (playerDead || aiDead) {
            audioManager.playCrash();
            this._endRound(playerDead, aiDead);
        }
    }

    _endRound(playerDead, aiDead) {
        this.roundActive = false;

        let roundWinner;
        if (playerDead && aiDead) {
            // Draw - no one scores
            roundWinner = 'draw';
            this.centerText.setText('DRAW');
            this.centerText.setColor('#888888');
        } else if (playerDead) {
            this.aiScore++;
            roundWinner = 'ai';
            this.centerText.setText('AI WINS ROUND');
            this.centerText.setColor(TRON_CONFIG.COLORS.TEXT_ORANGE);
        } else {
            this.playerScore++;
            roundWinner = 'player';
            this.centerText.setText('YOU WIN ROUND');
            this.centerText.setColor(TRON_CONFIG.COLORS.TEXT);
            audioManager.playRoundWin();
        }

        this.roundResults.push(roundWinner);
        this.centerText.setFontSize(36).setVisible(true);
        this.subText.setVisible(true);

        this._updateHUD();

        // Check if match is over
        if (this.playerScore >= TRON_CONFIG.ROUNDS_TO_WIN ||
            this.aiScore >= TRON_CONFIG.ROUNDS_TO_WIN) {
            this._endMatch();
            return;
        }

        // Check if remaining rounds can't change outcome
        const roundsPlayed = this.currentRound + 1;
        const roundsLeft = TRON_CONFIG.TOTAL_ROUNDS - roundsPlayed;
        if (roundsLeft <= 0) {
            this._endMatch();
            return;
        }

        // Next round after delay
        this.subText.setText('Next round starting...');
        this.time.delayedCall(2000, () => {
            this.centerText.setVisible(false);
            this.subText.setVisible(false);
            this.centerText.setColor(TRON_CONFIG.COLORS.TEXT_WHITE);
            this.centerText.setFontSize(48);
            this.currentRound++;
            this._startRound();
        });
    }

    _endMatch() {
        this.matchOver = true;

        const playerWon = this.playerScore > this.aiScore;
        const draw = this.playerScore === this.aiScore;

        this.time.delayedCall(2500, () => {
            // Calculate stats
            const totalTrailLength = this.playerCycle.trail.length;
            const roundDuration = ((this.time.now - this.roundStartTime) / 1000).toFixed(1);

            // Save high score (matches won)
            if (playerWon) {
                const current = parseInt(localStorage.getItem(TRON_CONFIG.STORAGE_KEY) || '0', 10);
                localStorage.setItem(TRON_CONFIG.STORAGE_KEY, current + 1);
            }

            this.scene.start('GameOverScene', {
                playerScore: this.playerScore,
                aiScore: this.aiScore,
                playerWon: playerWon,
                draw: draw,
                difficulty: this.difficultyKey,
                roundResults: this.roundResults,
                totalRounds: this.currentRound + 1,
            });
        });
    }

    _spawnBoost() {
        // Find a spot not on any trail
        let attempts = 0;
        while (attempts < 50) {
            const pos = this.arena.getRandomPosition();
            let blocked = false;

            // Check player trail
            for (const t of this.playerCycle.trail) {
                if (t.x === pos.x && t.y === pos.y) { blocked = true; break; }
            }
            // Check AI trail
            if (!blocked) {
                for (const t of this.aiCycle.trail) {
                    if (t.x === pos.x && t.y === pos.y) { blocked = true; break; }
                }
            }

            if (!blocked) {
                this.boostPickup = { x: pos.x, y: pos.y };
                break;
            }
            attempts++;
        }

        this.boostSpawnTimer = 0;
        this.nextBoostSpawnTime = this._randomBoostTime();
    }

    _randomBoostTime() {
        return TRON_CONFIG.BOOST_SPAWN_MIN +
               Math.random() * (TRON_CONFIG.BOOST_SPAWN_MAX - TRON_CONFIG.BOOST_SPAWN_MIN);
    }

    _draw() {
        const gs = TRON_CONFIG.GRID_SIZE;

        // Clear graphics
        this.arenaGraphics.clear();
        this.trailGraphics.clear();
        this.boostGraphics.clear();

        // Draw arena (background, grid, walls)
        this.arena.draw(this.arenaGraphics);

        // Draw trails
        this.playerCycle.drawTrail(this.trailGraphics);
        this.aiCycle.drawTrail(this.trailGraphics);

        // Draw boost pickup
        if (this.boostPickup) {
            const bx = this.boostPickup.x * gs;
            const by = this.boostPickup.y * gs;
            const pulse = 0.5 + 0.5 * Math.sin(this.time.now * 0.005);

            // Outer glow
            this.boostGraphics.fillStyle(TRON_CONFIG.COLORS.BOOST_GLOW, 0.3 * pulse);
            this.boostGraphics.fillRect(bx - 4, by - 4, gs + 8, gs + 8);

            // Main pickup
            this.boostGraphics.fillStyle(TRON_CONFIG.COLORS.BOOST, 0.7 + 0.3 * pulse);
            this.boostGraphics.fillRect(bx, by, gs, gs);

            // Inner bright center
            this.boostGraphics.fillStyle(0xffffff, 0.5 * pulse);
            this.boostGraphics.fillRect(bx + 2, by + 2, gs - 4, gs - 4);
        }
    }
}
