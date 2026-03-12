// ============================================================
// Simon — Game Scene (main gameplay)
// ============================================================

class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameScene' });
    }

    init(data) {
        this.difficultyKey = data.difficulty || 'NORMAL';
        this.difficulty = SIMON_CONFIG.DIFFICULTY[this.difficultyKey];
    }

    create() {
        const { WIDTH, HEIGHT } = SIMON_CONFIG;

        this.cameras.main.setBackgroundColor(SIMON_CONFIG.BG_COLOR);

        // Game state
        this.sequence = [];
        this.playerIndex = 0;
        this.round = 0;
        this.score = 0;
        this.isShowingSequence = false;
        this.isPlayerTurn = false;
        this.isPaused = false;
        this.gameOver = false;

        // Create the 4 color pads as quadrant arcs
        const gap = SIMON_CONFIG.PAD_GAP;
        const padConfigs = [
            { config: SIMON_CONFIG.PADS.GREEN,  start: Math.PI + gap,         end: Math.PI * 1.5 - gap },
            { config: SIMON_CONFIG.PADS.RED,    start: Math.PI * 1.5 + gap,   end: Math.PI * 2 - gap },
            { config: SIMON_CONFIG.PADS.YELLOW, start: gap,                    end: Math.PI * 0.5 - gap },
            { config: SIMON_CONFIG.PADS.BLUE,   start: Math.PI * 0.5 + gap,   end: Math.PI - gap },
        ];

        this.pads = padConfigs.map(p => new ColorPad(this, p.config, p.start, p.end));

        // Center circle
        const centerGfx = this.add.graphics();
        centerGfx.fillStyle(SIMON_CONFIG.CENTER_COLOR, 1);
        centerGfx.fillCircle(SIMON_CONFIG.CENTER_X, SIMON_CONFIG.CENTER_Y, SIMON_CONFIG.PAD_INNER_RADIUS - 5);
        centerGfx.setDepth(3);

        // Round display in center
        this.roundText = this.add.text(SIMON_CONFIG.CENTER_X, SIMON_CONFIG.CENTER_Y, '0', {
            fontFamily: 'Arial, sans-serif',
            fontSize: '36px',
            fontStyle: 'bold',
            color: '#ffffff',
        }).setOrigin(0.5).setDepth(4);

        // HUD - top bar
        this.scoreText = this.add.text(20, 15, 'Score: 0', {
            fontFamily: 'Arial, sans-serif',
            fontSize: '20px',
            color: '#ffffff',
        });

        const highScore = localStorage.getItem(SIMON_CONFIG.HIGH_SCORE_KEY) || 0;
        this.highScoreText = this.add.text(WIDTH - 20, 15, `Best: ${highScore}`, {
            fontFamily: 'Arial, sans-serif',
            fontSize: '20px',
            color: '#ffcc00',
        }).setOrigin(1, 0);

        this.diffText = this.add.text(WIDTH / 2, 15, this.difficulty.label, {
            fontFamily: 'Arial, sans-serif',
            fontSize: '16px',
            color: '#888899',
        }).setOrigin(0.5, 0);

        // Status text
        this.statusText = this.add.text(WIDTH / 2, HEIGHT - 40, '', {
            fontFamily: 'Arial, sans-serif',
            fontSize: '18px',
            color: '#aaaacc',
        }).setOrigin(0.5);

        // Mute indicator
        this.muteText = this.add.text(WIDTH - 20, HEIGHT - 20, audioManager.muted ? 'MUTED' : '', {
            fontFamily: 'Arial, sans-serif',
            fontSize: '14px',
            color: '#ff6666',
        }).setOrigin(1, 1);

        // Pause overlay (hidden by default)
        this.pauseOverlay = this.add.graphics();
        this.pauseOverlay.setDepth(100);
        this.pauseOverlay.setVisible(false);

        this.pauseText = this.add.text(WIDTH / 2, HEIGHT / 2, 'PAUSED\n\nPress P or ESC to resume', {
            fontFamily: 'Arial, sans-serif',
            fontSize: '32px',
            fontStyle: 'bold',
            color: '#ffffff',
            align: 'center',
        }).setOrigin(0.5).setDepth(101).setVisible(false);

        // Listen for pad presses
        this.events.on('padPressed', this.onPadPressed, this);

        // Keyboard input
        this.input.keyboard.on('keydown', this.handleKeyDown, this);

        // Start the game
        this.nextRound();
    }

    handleKeyDown(event) {
        // Mute toggle
        if (event.key === 'm' || event.key === 'M') {
            const muted = audioManager.toggleMute();
            this.muteText.setText(muted ? 'MUTED' : '');
            return;
        }

        // Pause toggle
        if (event.key === 'p' || event.key === 'P' || event.key === 'Escape') {
            this.togglePause();
            return;
        }

        // Number keys 1-4 for pad input
        if (this.isPlayerTurn && !this.isPaused) {
            const num = parseInt(event.key);
            if (num >= 1 && num <= 4) {
                this.onPadPressed(num - 1);
            }
        }
    }

    togglePause() {
        if (this.gameOver) return;

        this.isPaused = !this.isPaused;

        if (this.isPaused) {
            this.scene.pause();
            this.pauseOverlay.clear();
            this.pauseOverlay.fillStyle(0x000000, 0.7);
            this.pauseOverlay.fillRect(0, 0, SIMON_CONFIG.WIDTH, SIMON_CONFIG.HEIGHT);
            this.pauseOverlay.setVisible(true);
            this.pauseText.setVisible(true);

            // We need to listen for unpause even while paused
            this.input.keyboard.on('keydown', this._pauseListener = (event) => {
                if (event.key === 'p' || event.key === 'P' || event.key === 'Escape') {
                    this.isPaused = false;
                    this.pauseOverlay.setVisible(false);
                    this.pauseText.setVisible(false);
                    this.input.keyboard.off('keydown', this._pauseListener);
                    this.scene.resume();
                }
            });
        }
    }

    nextRound() {
        this.round++;
        this.roundText.setText(this.round.toString());
        this.statusText.setText('Watch carefully...');
        this.playerIndex = 0;
        this.isPlayerTurn = false;
        this.isShowingSequence = true;

        // Disable pads during sequence display
        this.pads.forEach(p => p.setEnabled(false));

        // Add a new random pad to the sequence
        const nextPad = Phaser.Math.Between(0, 3);
        this.sequence.push(nextPad);

        // Calculate delay for this round
        const delay = Math.max(
            this.difficulty.minDelay,
            this.difficulty.startDelay - (this.round - 1) * this.difficulty.speedRamp
        );
        const flashDuration = Math.max(
            this.difficulty.minDelay,
            this.difficulty.flashDuration - (this.round - 1) * (this.difficulty.speedRamp / 2)
        );

        // Show sequence after a short pause
        this.time.delayedCall(SIMON_CONFIG.SEQUENCE_START_DELAY, () => {
            this.showSequence(delay, flashDuration);
        });
    }

    async showSequence(delay, flashDuration) {
        for (let i = 0; i < this.sequence.length; i++) {
            if (this.gameOver) return;

            const padIndex = this.sequence[i];
            const pad = this.pads[padIndex];

            await pad.flash(flashDuration);

            // Gap between flashes
            if (i < this.sequence.length - 1) {
                await this.waitMs(delay - flashDuration > 50 ? delay - flashDuration : 50);
            }
        }

        if (!this.gameOver) {
            this.isShowingSequence = false;
            this.isPlayerTurn = true;
            this.playerIndex = 0;
            this.statusText.setText('Your turn! Repeat the pattern');
            this.pads.forEach(p => p.setEnabled(true));
        }
    }

    waitMs(ms) {
        return new Promise(resolve => {
            this.time.delayedCall(ms, resolve);
        });
    }

    onPadPressed(padIndex) {
        if (!this.isPlayerTurn || this.isPaused || this.gameOver) return;

        const pad = this.pads[padIndex];
        pad.quickFlash();

        const expected = this.sequence[this.playerIndex];

        if (padIndex !== expected) {
            // Wrong! Game over
            this.handleGameOver();
            return;
        }

        this.playerIndex++;

        // Check if player completed the sequence
        if (this.playerIndex >= this.sequence.length) {
            this.isPlayerTurn = false;
            this.pads.forEach(p => p.setEnabled(false));
            this.score = this.sequence.length;
            this.scoreText.setText(`Score: ${this.score}`);

            // Update high score
            const highScore = parseInt(localStorage.getItem(SIMON_CONFIG.HIGH_SCORE_KEY) || 0);
            if (this.score > highScore) {
                localStorage.setItem(SIMON_CONFIG.HIGH_SCORE_KEY, this.score);
                this.highScoreText.setText(`Best: ${this.score}`);
            }

            // Brief success flash, then next round
            this.statusText.setText('Correct!');
            audioManager.playSuccess();

            this.time.delayedCall(1200, () => {
                if (!this.gameOver) {
                    this.nextRound();
                }
            });
        }
    }

    handleGameOver() {
        this.gameOver = true;
        this.isPlayerTurn = false;
        this.pads.forEach(p => p.setEnabled(false));

        audioManager.playFail();

        // Flash all pads red briefly
        this.statusText.setText('Wrong!');

        // Flash the correct pad to show what it should have been
        const correctIndex = this.sequence[this.playerIndex];
        this.pads[correctIndex].flash(800, false);

        // Update high score
        const highScore = parseInt(localStorage.getItem(SIMON_CONFIG.HIGH_SCORE_KEY) || 0);
        if (this.score > highScore) {
            localStorage.setItem(SIMON_CONFIG.HIGH_SCORE_KEY, this.score);
        }

        this.time.delayedCall(1500, () => {
            this.scene.start('GameOverScene', {
                score: this.score,
                round: this.round,
                difficulty: this.difficultyKey,
                sequenceLength: this.sequence.length,
            });
        });
    }

    shutdown() {
        this.events.off('padPressed', this.onPadPressed, this);
        this.input.keyboard.off('keydown', this.handleKeyDown, this);
        if (this._pauseListener) {
            this.input.keyboard.off('keydown', this._pauseListener);
        }
    }
}
