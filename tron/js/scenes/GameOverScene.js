// Tron Light Cycles - Game Over Scene
class GameOverScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameOverScene' });
    }

    init(data) {
        this.playerScore = data.playerScore || 0;
        this.aiScore = data.aiScore || 0;
        this.playerWon = data.playerWon || false;
        this.difficultyKey = data.difficulty || 'NORMAL';
        this.totalRounds = data.totalRounds || 0;
    }

    create() {
        const w = TRON_CONFIG.WIDTH;
        const h = TRON_CONFIG.HEIGHT;
        const cx = w / 2;

        // Background
        this.cameras.main.setBackgroundColor(TRON_CONFIG.COLORS.BACKGROUND);

        // Grid lines
        const gridGfx = this.add.graphics();
        gridGfx.lineStyle(1, TRON_CONFIG.COLORS.GRID_LINE, 0.3);
        for (let x = 0; x < w; x += TRON_CONFIG.GRID_SIZE) {
            gridGfx.lineBetween(x, 0, x, h);
        }
        for (let y = 0; y < h; y += TRON_CONFIG.GRID_SIZE) {
            gridGfx.lineBetween(0, y, w, y);
        }

        // Result title
        const titleText = this.playerWon ? 'YOU WIN' : 'AI WINS';
        const titleColor = this.playerWon ? TRON_CONFIG.CSS_PLAYER : TRON_CONFIG.CSS_AI;

        this.add.text(cx, 100, titleText, {
            fontFamily: 'monospace',
            fontSize: '64px',
            fontStyle: 'bold',
            color: titleColor,
            stroke: '#000000',
            strokeThickness: 4,
        }).setOrigin(0.5);

        // Match score
        this.add.text(cx, 180, `${this.playerScore} — ${this.aiScore}`, {
            fontFamily: 'monospace',
            fontSize: '36px',
            fontStyle: 'bold',
            color: TRON_CONFIG.COLORS.TEXT_WHITE,
        }).setOrigin(0.5);

        // Labels
        this.add.text(cx - 80, 220, 'PLAYER', {
            fontFamily: 'monospace',
            fontSize: '14px',
            color: TRON_CONFIG.CSS_PLAYER,
        }).setOrigin(1, 0);

        this.add.text(cx + 80, 220, 'AI', {
            fontFamily: 'monospace',
            fontSize: '14px',
            color: TRON_CONFIG.CSS_AI,
        }).setOrigin(0, 0);

        // Stats
        const statsY = 280;
        const stats = [
            ['Rounds Played', this.totalRounds],
            ['Difficulty', TRON_CONFIG.DIFFICULTY[this.difficultyKey].label],
        ];

        stats.forEach(([label, value], i) => {
            const y = statsY + i * 30;
            this.add.text(cx - 100, y, label, {
                fontFamily: 'monospace',
                fontSize: '16px',
                color: '#888899',
            });
            this.add.text(cx + 100, y, String(value), {
                fontFamily: 'monospace',
                fontSize: '16px',
                fontStyle: 'bold',
                color: '#ffffff',
            }).setOrigin(1, 0);
        });

        // Show win count (already saved in GameScene)
        const wins = parseInt(localStorage.getItem(TRON_CONFIG.STORAGE_KEY) || '0');
        this.add.text(cx, statsY + 70, `Total Wins: ${wins}`, {
            fontFamily: 'monospace',
            fontSize: '16px',
            color: this.playerWon ? '#ffdd57' : '#666688',
        }).setOrigin(0.5);

        // Play Again button
        const btnY = 440;
        const playBtn = this.add.text(cx, btnY, '[ PLAY AGAIN ]', {
            fontFamily: 'monospace',
            fontSize: '24px',
            fontStyle: 'bold',
            color: TRON_CONFIG.CSS_PLAYER,
            stroke: '#000000',
            strokeThickness: 2,
            padding: { x: 15, y: 8 },
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });

        playBtn.on('pointerover', () => playBtn.setColor('#88eeff'));
        playBtn.on('pointerout', () => playBtn.setColor(TRON_CONFIG.CSS_PLAYER));
        playBtn.on('pointerdown', () => {
            audioManager.playMenuSelect();
            this.scene.start('GameScene', { difficulty: this.difficultyKey });
        });

        // Menu button
        const menuBtn = this.add.text(cx, btnY + 50, '[ MAIN MENU ]', {
            fontFamily: 'monospace',
            fontSize: '16px',
            color: '#888899',
            padding: { x: 10, y: 6 },
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });

        menuBtn.on('pointerover', () => menuBtn.setColor('#aaaacc'));
        menuBtn.on('pointerout', () => menuBtn.setColor('#888899'));
        menuBtn.on('pointerdown', () => {
            audioManager.playMenuSelect();
            this.scene.start('MenuScene');
        });

        // Keyboard shortcuts
        this.input.keyboard.on('keydown-ENTER', () => {
            this.scene.start('GameScene', { difficulty: this.difficultyKey });
        });
        this.input.keyboard.on('keydown-SPACE', () => {
            this.scene.start('GameScene', { difficulty: this.difficultyKey });
        });
        this.input.keyboard.on('keydown-ESC', () => {
            this.scene.start('MenuScene');
        });
    }
}
