// ============================================================
// Q*bert — Game Scene (Main Gameplay)
// ============================================================

class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameScene' });
    }

    init(data) {
        this.difficulty = data.difficulty || 'normal';
    }

    create() {
        const { width, height } = this.scale;

        // Audio
        this.audio = new AudioManager();

        // Game state
        this.level = 1;
        this.lives = CONFIG.LIVES;
        this.score = 0;
        this.gameOver = false;
        this.paused = false;
        this.levelTransition = false;
        this.cubeChanges = 0;
        this.enemiesKilled = 0;
        this.levelsCompleted = 0;

        // Difficulty multiplier
        this.diffMultiplier = this.difficulty === 'easy' ? 1.4 : this.difficulty === 'hard' ? 0.7 : 1.0;

        // Background
        this.cameras.main.setBackgroundColor('#000022');

        // Stars
        this.starGraphics = this.add.graphics();
        for (let i = 0; i < 60; i++) {
            this.starGraphics.fillStyle(0xffffff, Math.random() * 0.5 + 0.1);
            this.starGraphics.fillCircle(Math.random() * width, Math.random() * height, Math.random() + 0.5);
        }

        // Create pyramid
        this.pyramid = new Pyramid(this);
        this.levelConfig = CONFIG.getLevelConfig(this.level);
        this.pyramid.setLevel(this.level);

        // Create Q*bert
        this.qbert = new Qbert(this, this.pyramid);

        // Enemy arrays
        this.coilies = [];
        this.slickSams = [];
        this.flyingDiscs = [];

        // Spawn flying discs
        this._spawnDiscs();

        // UI
        this._createUI();

        // Input
        this._setupInput();

        // Enemy spawn timers
        this._startEnemySpawns();

        // Pause overlay (hidden)
        this.pauseOverlay = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.7)
            .setDepth(200).setVisible(false);
        this.pauseText = this.add.text(width / 2, height / 2, 'PAUSED\n\nPress P or ESC to resume', {
            fontSize: '32px',
            fontFamily: 'monospace',
            color: '#ffffff',
            align: 'center'
        }).setOrigin(0.5).setDepth(201).setVisible(false);

        // Initial draw
        this.pyramid.draw();
        this.qbert.draw();
    }

    _createUI() {
        const uiStyle = {
            fontSize: '16px',
            fontFamily: 'monospace',
            color: '#ffffff'
        };

        this.scoreText = this.add.text(16, 16, 'Score: 0', uiStyle).setDepth(150);
        this.livesText = this.add.text(16, 40, 'Lives: 3', uiStyle).setDepth(150);
        this.levelText = this.add.text(16, 64, 'Level: 1', uiStyle).setDepth(150);

        const highScore = localStorage.getItem('qbertHighScore') || 0;
        this.highScoreText = this.add.text(this.scale.width - 16, 16, `High: ${highScore}`, {
            ...uiStyle, align: 'right'
        }).setOrigin(1, 0).setDepth(150);

        // Mute indicator
        this.muteText = this.add.text(this.scale.width - 16, 40, '', {
            fontSize: '14px',
            fontFamily: 'monospace',
            color: '#888888'
        }).setOrigin(1, 0).setDepth(150);
    }

    _updateUI() {
        this.scoreText.setText(`Score: ${this.score}`);
        this.livesText.setText(`Lives: ${this.lives}`);
        this.levelText.setText(`Level: ${this.level}`);

        const highScore = localStorage.getItem('qbertHighScore') || 0;
        this.highScoreText.setText(`High: ${Math.max(this.score, parseInt(highScore))}`);
        this.muteText.setText(this.audio.muted ? '[MUTED]' : '');
    }

    _setupInput() {
        // Arrow keys for diagonal movement on isometric grid
        // Up = up-left, Right = up-right, Down = down-right, Left = down-left
        this.cursors = this.input.keyboard.createCursorKeys();

        this.input.keyboard.on('keydown-UP', () => this._handleMove(-1, -1));
        this.input.keyboard.on('keydown-RIGHT', () => this._handleMove(-1, 0));
        this.input.keyboard.on('keydown-DOWN', () => this._handleMove(1, 1));
        this.input.keyboard.on('keydown-LEFT', () => this._handleMove(1, 0));

        // WASD
        this.input.keyboard.on('keydown-W', () => this._handleMove(-1, -1));
        this.input.keyboard.on('keydown-D', () => this._handleMove(-1, 0));
        this.input.keyboard.on('keydown-S', () => this._handleMove(1, 1));
        this.input.keyboard.on('keydown-A', () => this._handleMove(1, 0));

        // Pause
        this.input.keyboard.on('keydown-P', () => this._togglePause());
        this.input.keyboard.on('keydown-ESC', () => this._togglePause());

        // Mute
        this.input.keyboard.on('keydown-M', () => {
            this.audio.toggleMute();
            this._updateUI();
        });
    }

    _handleMove(dRow, dCol) {
        if (this.paused || this.gameOver || this.levelTransition) return;
        if (this.qbert.isJumping || !this.qbert.isAlive) return;

        // Check for flying disc
        for (const disc of this.flyingDiscs) {
            if (disc.active && disc.canRide(this.qbert.row, this.qbert.col, dRow, dCol)) {
                this._rideDisc(disc);
                return;
            }
        }

        const newRow = this.qbert.row + dRow;
        const newCol = this.qbert.col + dCol;

        // Check if valid
        if (!this.pyramid.isValidPosition(newRow, newCol)) {
            // Fall off!
            this.audio.playJump();
            this.qbert.fallOff(dRow, dCol, () => {
                this.audio.playFallOff();
                this.qbert.showSpeechBubble();
                this._loseLife();
            });
            return;
        }

        // Valid jump
        this.audio.playJump();
        this.qbert.jumpTo(newRow, newCol, () => {
            this.audio.playLand();
            this._onQbertLand();
        });
    }

    _onQbertLand() {
        // Change cube color
        const result = this.pyramid.landOnCube(this.qbert.row, this.qbert.col);
        if (result.changed) {
            this.audio.playColorChange();
            this.score += result.scorePoints;
            this.cubeChanges++;
        }

        // Check collision with enemies
        this._checkEnemyCollisions();

        // Check level complete
        if (this.pyramid.isLevelComplete()) {
            this._completeLevel();
        }

        this._updateUI();
    }

    _rideDisc(disc) {
        disc.use();
        this.audio.playDiscRide();
        this.score += CONFIG.SCORE_DISC_BONUS;

        this.qbert.rideDisc(() => {
            // Kill all enemies on screen when Q*bert rides disc
            this._killAllEnemies();

            // Land on top cube
            const result = this.pyramid.landOnCube(0, 0);
            if (result.changed) {
                this.audio.playColorChange();
                this.score += result.scorePoints;
                this.cubeChanges++;
            }

            if (this.pyramid.isLevelComplete()) {
                this._completeLevel();
            }

            this._updateUI();
        });
    }

    _killAllEnemies() {
        for (const coily of this.coilies) {
            if (coily.active) {
                coily.kill();
                this.score += CONFIG.SCORE_COILY_KILL;
                this.enemiesKilled++;
                this.audio.playCoilyDeath();
            }
        }
        for (const ss of this.slickSams) {
            if (ss.active) {
                ss.kill();
                this.score += CONFIG.SCORE_SLICK_SAM_CATCH;
                this.enemiesKilled++;
            }
        }
    }

    _checkEnemyCollisions() {
        // Check Coily collision (deadly)
        for (const coily of this.coilies) {
            if (coily.checkCollision(this.qbert) && !this.qbert.isInvincible) {
                this.qbert.showSpeechBubble();
                this._loseLife();
                return;
            }
        }

        // Check Slick/Sam collision (Q*bert catches them for points)
        for (const ss of this.slickSams) {
            if (ss.checkCollision(this.qbert)) {
                ss.kill();
                this.score += CONFIG.SCORE_SLICK_SAM_CATCH;
                this.enemiesKilled++;
                this._updateUI();
            }
        }
    }

    _loseLife() {
        this.lives--;
        this._updateUI();

        if (this.lives <= 0) {
            this.audio.playGameOver();
            this._endGame();
            return;
        }

        // Respawn after delay
        this._clearEnemies();
        this.time.delayedCall(1500, () => {
            if (this.gameOver) return;
            this.qbert.resetPosition();
            this.qbert.setInvincible(CONFIG.INVINCIBLE_TIME);
            this._startEnemySpawns();
        });
    }

    _completeLevel() {
        this.levelTransition = true;
        this.levelsCompleted++;
        this.audio.playLevelComplete();

        // Level completion bonus
        this.score += CONFIG.SCORE_LEVEL_BONUS + (this.level * 250);
        this._updateUI();

        // Flash the pyramid
        this._flashPyramid(() => {
            this._clearEnemies();
            this.level++;
            this.levelConfig = CONFIG.getLevelConfig(this.level);
            this.pyramid.setLevel(this.level);
            this.qbert.resetPosition();
            this._spawnDiscs();
            this.levelTransition = false;
            this._startEnemySpawns();

            // Show level text
            const lvlText = this.add.text(this.scale.width / 2, this.scale.height / 2, `LEVEL ${this.level}`, {
                fontSize: '48px',
                fontFamily: 'monospace',
                color: '#ffff00',
                stroke: '#000000',
                strokeThickness: 4
            }).setOrigin(0.5).setDepth(150);

            this.tweens.add({
                targets: lvlText,
                alpha: 0,
                y: lvlText.y - 50,
                duration: 1500,
                onComplete: () => lvlText.destroy()
            });
        });
    }

    _flashPyramid(callback) {
        let flashes = 0;
        const timer = this.time.addEvent({
            delay: 150,
            repeat: 5,
            callback: () => {
                flashes++;
                // Toggle cube colors for flash effect
                const palette = CONFIG.getColorPalette(this.level);
                // Redraw with alternating brightness
                this.pyramid.draw();
                if (flashes >= 6 && callback) callback();
            }
        });
    }

    _clearEnemies() {
        for (const coily of this.coilies) coily.destroy();
        for (const ss of this.slickSams) ss.destroy();
        this.coilies = [];
        this.slickSams = [];

        // Clear spawn timers
        if (this.coilySpawnTimer) this.coilySpawnTimer.remove(false);
        if (this.slickSamSpawnTimer) this.slickSamSpawnTimer.remove(false);
    }

    _spawnDiscs() {
        // Clear old discs
        for (const disc of this.flyingDiscs) disc.destroy();
        this.flyingDiscs = [];

        const discCount = this.levelConfig.discCount || 2;
        const availableRows = [];
        for (let r = 1; r < this.pyramid.rows - 1; r++) {
            availableRows.push(r);
        }

        // Shuffle and pick
        Phaser.Utils.Array.Shuffle(availableRows);
        const sides = ['left', 'right'];

        for (let i = 0; i < Math.min(discCount, availableRows.length); i++) {
            const side = sides[i % 2];
            const disc = new FlyingDisc(this, this.pyramid, side, availableRows[i]);
            this.flyingDiscs.push(disc);
        }
    }

    _startEnemySpawns() {
        const coilyInterval = CONFIG.COILY_SPAWN_INTERVAL * this.diffMultiplier;
        const slickSamInterval = CONFIG.SLICK_SAM_SPAWN_INTERVAL * this.diffMultiplier;

        // Coily spawns
        this.coilySpawnTimer = this.time.addEvent({
            delay: coilyInterval,
            callback: () => this._trySpawnCoily(),
            loop: true
        });

        // Slick/Sam spawns (delayed start)
        this.time.delayedCall(3000 * this.diffMultiplier, () => {
            if (this.gameOver || this.levelTransition) return;
            this.slickSamSpawnTimer = this.time.addEvent({
                delay: slickSamInterval,
                callback: () => this._trySpawnSlickSam(),
                loop: true
            });
        });
    }

    _trySpawnCoily() {
        if (this.gameOver || this.levelTransition || this.paused) return;

        const activeCoilies = this.coilies.filter(c => c.active).length;
        const maxEnemies = this.levelConfig.maxEnemies;

        if (activeCoilies < Math.ceil(maxEnemies / 2)) {
            const coily = new Coily(this, this.pyramid);
            this.coilies.push(coily);
            coily.spawn();
            this.audio.playEnemySpawn();
        }
    }

    _trySpawnSlickSam() {
        if (this.gameOver || this.levelTransition || this.paused) return;

        const activeSlickSams = this.slickSams.filter(s => s.active).length;
        const maxEnemies = this.levelConfig.maxEnemies;

        if (activeSlickSams < Math.floor(maxEnemies / 2) + 1) {
            const type = Math.random() < 0.5 ? 'slick' : 'sam';
            const ss = new SlickSam(this, this.pyramid, type);
            this.slickSams.push(ss);
            ss.spawn();
        }
    }

    // Called when Coily falls off (from chasing Q*bert onto disc)
    onCoilyDeath() {
        this.score += CONFIG.SCORE_COILY_KILL;
        this.enemiesKilled++;
        this._updateUI();
    }

    _togglePause() {
        if (this.gameOver) return;
        this.paused = !this.paused;

        this.pauseOverlay.setVisible(this.paused);
        this.pauseText.setVisible(this.paused);
    }

    _endGame() {
        this.gameOver = true;
        this._clearEnemies();

        // Save high score
        const highScore = parseInt(localStorage.getItem('qbertHighScore') || 0);
        if (this.score > highScore) {
            localStorage.setItem('qbertHighScore', this.score);
        }

        this.time.delayedCall(2000, () => {
            this.scene.start('GameOverScene', {
                score: this.score,
                level: this.level,
                cubeChanges: this.cubeChanges,
                enemiesKilled: this.enemiesKilled,
                levelsCompleted: this.levelsCompleted,
                difficulty: this.difficulty
            });
        });
    }

    update(time, delta) {
        if (this.paused || this.gameOver) return;

        // Redraw everything
        this.pyramid.draw();
        this.qbert.draw();

        // Draw flying discs
        for (const disc of this.flyingDiscs) {
            disc.draw(time);
        }

        // Draw enemies
        for (const coily of this.coilies) {
            coily.draw();
        }
        for (const ss of this.slickSams) {
            ss.draw();
        }

        // Continuous collision check (enemies moving into Q*bert)
        if (this.qbert.isAlive && !this.qbert.isJumping && !this.qbert.isInvincible && !this.levelTransition) {
            for (const coily of this.coilies) {
                if (coily.checkCollision(this.qbert)) {
                    this.qbert.showSpeechBubble();
                    this._loseLife();
                    return;
                }
            }

            // Catching Slick/Sam on contact
            for (const ss of this.slickSams) {
                if (ss.checkCollision(this.qbert)) {
                    ss.kill();
                    this.score += CONFIG.SCORE_SLICK_SAM_CATCH;
                    this.enemiesKilled++;
                    this._updateUI();
                }
            }
        }
    }

    shutdown() {
        this._clearEnemies();
        for (const disc of this.flyingDiscs) disc.destroy();
        if (this.pyramid) this.pyramid.destroy();
        if (this.qbert) this.qbert.destroy();
    }
}
