// ============================================================
// Simon — Game Over Scene
// ============================================================

class GameOverScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameOverScene' });
    }

    init(data) {
        this.finalScore = data.score || 0;
        this.finalRound = data.round || 0;
        this.difficultyKey = data.difficulty || 'NORMAL';
        this.sequenceLength = data.sequenceLength || 0;
    }

    create() {
        const { WIDTH, HEIGHT } = SIMON_CONFIG;
        const highScore = parseInt(localStorage.getItem(SIMON_CONFIG.HIGH_SCORE_KEY) || 0);
        const isNewBest = this.finalScore >= highScore && this.finalScore > 0;

        this.cameras.main.setBackgroundColor(SIMON_CONFIG.BG_COLOR);

        // Game Over title
        this.add.text(WIDTH / 2, 80, 'GAME OVER', {
            fontFamily: 'Arial, sans-serif',
            fontSize: '56px',
            fontStyle: 'bold',
            color: '#ff4444',
            stroke: '#000000',
            strokeThickness: 4,
        }).setOrigin(0.5);

        // New best indicator
        if (isNewBest) {
            const newBestText = this.add.text(WIDTH / 2, 130, 'NEW HIGH SCORE!', {
                fontFamily: 'Arial, sans-serif',
                fontSize: '24px',
                fontStyle: 'bold',
                color: '#ffcc00',
            }).setOrigin(0.5);

            // Pulse animation
            this.tweens.add({
                targets: newBestText,
                alpha: { from: 1, to: 0.4 },
                duration: 500,
                yoyo: true,
                repeat: -1,
            });
        }

        // Stats panel
        const panelX = WIDTH / 2 - 150;
        const panelY = 170;
        const panelW = 300;
        const panelH = 200;

        const panel = this.add.graphics();
        panel.fillStyle(0x222244, 0.8);
        panel.lineStyle(2, 0x667eea, 0.5);
        panel.fillRoundedRect(panelX, panelY, panelW, panelH, 12);
        panel.strokeRoundedRect(panelX, panelY, panelW, panelH, 12);

        const stats = [
            { label: 'Score', value: this.finalScore.toString() },
            { label: 'Round Reached', value: this.finalRound.toString() },
            { label: 'Difficulty', value: SIMON_CONFIG.DIFFICULTY[this.difficultyKey].label },
            { label: 'High Score', value: highScore.toString() },
        ];

        stats.forEach((stat, i) => {
            const y = panelY + 30 + i * 42;
            this.add.text(panelX + 25, y, stat.label, {
                fontFamily: 'Arial, sans-serif',
                fontSize: '18px',
                color: '#888899',
            });
            this.add.text(panelX + panelW - 25, y, stat.value, {
                fontFamily: 'Arial, sans-serif',
                fontSize: '22px',
                fontStyle: 'bold',
                color: '#ffffff',
            }).setOrigin(1, 0);
        });

        // Play Again button
        const playAgainY = 420;
        const playAgainBg = this.add.graphics();
        playAgainBg.fillStyle(0x667eea, 1);
        playAgainBg.fillRoundedRect(WIDTH / 2 - 110, playAgainY - 25, 220, 50, 12);

        this.add.text(WIDTH / 2, playAgainY, 'PLAY AGAIN', {
            fontFamily: 'Arial, sans-serif',
            fontSize: '24px',
            fontStyle: 'bold',
            color: '#ffffff',
        }).setOrigin(0.5);

        const playAgainZone = this.add.zone(WIDTH / 2, playAgainY, 220, 50)
            .setInteractive({ useHandCursor: true });
        playAgainZone.on('pointerdown', () => {
            audioManager.playClick();
            this.scene.start('GameScene', { difficulty: this.difficultyKey });
        });
        playAgainZone.on('pointerover', () => {
            playAgainBg.clear();
            playAgainBg.fillStyle(0x7b93f5, 1);
            playAgainBg.fillRoundedRect(WIDTH / 2 - 110, playAgainY - 25, 220, 50, 12);
        });
        playAgainZone.on('pointerout', () => {
            playAgainBg.clear();
            playAgainBg.fillStyle(0x667eea, 1);
            playAgainBg.fillRoundedRect(WIDTH / 2 - 110, playAgainY - 25, 220, 50, 12);
        });

        // Menu button
        const menuY = 490;
        const menuBg = this.add.graphics();
        menuBg.fillStyle(0x444466, 1);
        menuBg.fillRoundedRect(WIDTH / 2 - 90, menuY - 22, 180, 44, 10);

        this.add.text(WIDTH / 2, menuY, 'MAIN MENU', {
            fontFamily: 'Arial, sans-serif',
            fontSize: '20px',
            fontStyle: 'bold',
            color: '#ccccdd',
        }).setOrigin(0.5);

        const menuZone = this.add.zone(WIDTH / 2, menuY, 180, 44)
            .setInteractive({ useHandCursor: true });
        menuZone.on('pointerdown', () => {
            audioManager.playClick();
            this.scene.start('MenuScene');
        });
        menuZone.on('pointerover', () => {
            menuBg.clear();
            menuBg.fillStyle(0x555577, 1);
            menuBg.fillRoundedRect(WIDTH / 2 - 90, menuY - 22, 180, 44, 10);
        });
        menuZone.on('pointerout', () => {
            menuBg.clear();
            menuBg.fillStyle(0x444466, 1);
            menuBg.fillRoundedRect(WIDTH / 2 - 90, menuY - 22, 180, 44, 10);
        });

        // Controls hint
        this.add.text(WIDTH / 2, HEIGHT - 30, 'Press ENTER or SPACE to play again', {
            fontFamily: 'Arial, sans-serif',
            fontSize: '14px',
            color: '#555566',
        }).setOrigin(0.5);

        // Keyboard shortcuts
        this.input.keyboard.on('keydown-ENTER', () => {
            this.scene.start('GameScene', { difficulty: this.difficultyKey });
        });
        this.input.keyboard.on('keydown-SPACE', () => {
            this.scene.start('GameScene', { difficulty: this.difficultyKey });
        });
    }
}
