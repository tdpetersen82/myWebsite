// ============================================================
// Donkey Kong — Game Over Scene
// ============================================================

class GameOverScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameOverScene' });
    }

    init(data) {
        this.finalScore = data.score || 0;
        this.finalLevel = data.level || 1;
        this.highScore = data.highScore || 0;
        this.difficulty = data.difficulty || 1;
    }

    create() {
        const { WIDTH, HEIGHT } = DK_CONFIG;
        const cx = WIDTH / 2;

        this.cameras.main.setBackgroundColor(DK_CONFIG.COLOR_BG);

        const isNewHighScore = this.finalScore >= this.highScore && this.finalScore > 0;

        // Game Over title
        this.add.text(cx, 120, 'GAME OVER', {
            fontFamily: 'monospace',
            fontSize: '52px',
            color: '#ff4444',
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 4,
        }).setOrigin(0.5);

        // New high score?
        if (isNewHighScore) {
            const hsText = this.add.text(cx, 175, 'NEW HIGH SCORE!', {
                fontFamily: 'monospace',
                fontSize: '22px',
                color: '#ffff00',
                fontStyle: 'bold',
            }).setOrigin(0.5);

            this.tweens.add({
                targets: hsText,
                alpha: 0.3,
                duration: 400,
                yoyo: true,
                repeat: -1,
            });
        }

        // Stats box
        const statsY = 230;
        const stats = [
            `SCORE:      ${this.finalScore.toString().padStart(8, ' ')}`,
            `HIGH SCORE: ${this.highScore.toString().padStart(8, ' ')}`,
            `LEVEL:      ${this.finalLevel.toString().padStart(8, ' ')}`,
            `DIFFICULTY: ${['EASY', 'NORMAL', 'HARD'][this.difficulty].padStart(8, ' ')}`,
        ];

        // Box background
        const gfx = this.add.graphics();
        gfx.fillStyle(0x111133, 0.8);
        gfx.fillRoundedRect(cx - 180, statsY - 15, 360, stats.length * 32 + 20, 8);
        gfx.lineStyle(2, 0x4444aa, 1);
        gfx.strokeRoundedRect(cx - 180, statsY - 15, 360, stats.length * 32 + 20, 8);

        stats.forEach((line, i) => {
            this.add.text(cx, statsY + 8 + i * 32, line, {
                fontFamily: 'monospace',
                fontSize: '18px',
                color: '#ffffff',
            }).setOrigin(0.5);
        });

        // Buttons
        const btnY = statsY + stats.length * 32 + 50;

        // Play Again
        const playBtn = this.add.text(cx, btnY, 'PLAY AGAIN', {
            fontFamily: 'monospace',
            fontSize: '24px',
            color: '#44ff44',
            fontStyle: 'bold',
            padding: { x: 20, y: 10 },
            backgroundColor: '#224422',
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });

        playBtn.on('pointerover', () => playBtn.setColor('#88ff88'));
        playBtn.on('pointerout', () => playBtn.setColor('#44ff44'));
        playBtn.on('pointerdown', () => {
            window.audioManager.menuSelect();
            this.scene.start('GameScene', { difficulty: this.difficulty });
        });

        // Main Menu
        const menuBtn = this.add.text(cx, btnY + 50, 'MAIN MENU', {
            fontFamily: 'monospace',
            fontSize: '20px',
            color: '#aaaaaa',
            padding: { x: 16, y: 8 },
            backgroundColor: '#222222',
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });

        menuBtn.on('pointerover', () => menuBtn.setColor('#ffffff'));
        menuBtn.on('pointerout', () => menuBtn.setColor('#aaaaaa'));
        menuBtn.on('pointerdown', () => {
            window.audioManager.menuSelect();
            this.scene.start('MenuScene');
        });

        // Keyboard
        this.input.keyboard.on('keydown-ENTER', () => {
            window.audioManager.menuSelect();
            this.scene.start('GameScene', { difficulty: this.difficulty });
        });

        this.input.keyboard.on('keydown-ESC', () => {
            window.audioManager.menuSelect();
            this.scene.start('MenuScene');
        });

        // Prompt
        const prompt = this.add.text(cx, HEIGHT - 40, 'ENTER to Play Again  |  ESC for Menu', {
            fontFamily: 'monospace',
            fontSize: '13px',
            color: '#666666',
        }).setOrigin(0.5);

        this.tweens.add({
            targets: prompt,
            alpha: 0.3,
            duration: 800,
            yoyo: true,
            repeat: -1,
        });
    }
}
