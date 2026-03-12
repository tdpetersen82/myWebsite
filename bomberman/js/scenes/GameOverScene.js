// Bomberman Game Over Scene
class GameOverScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameOverScene' });
    }

    init(data) {
        this.finalScore = data.score || 0;
        this.finalLevel = data.level || 1;
        this.highScore = data.highScore || 0;
        this.difficulty = data.difficulty != null ? data.difficulty : 1;
        this.isNewHigh = this.finalScore >= this.highScore && this.finalScore > 0;
    }

    create() {
        const w = CONFIG.WIDTH;
        const h = CONFIG.HEIGHT;

        // Background
        this.add.rectangle(w / 2, h / 2, w, h, CONFIG.COLORS.BG);

        // Game Over title
        const titleColor = this.isNewHigh ? CONFIG.COLORS.ACCENT : '#FF5555';
        this.add.text(w / 2, 80, 'GAME OVER', {
            fontFamily: 'monospace',
            fontSize: '52px',
            color: titleColor,
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 4,
        }).setOrigin(0.5);

        // New high score banner
        if (this.isNewHigh) {
            this.add.text(w / 2, 130, '★ NEW HIGH SCORE ★', {
                fontFamily: 'monospace',
                fontSize: '22px',
                color: '#FFD54F',
                fontStyle: 'bold',
            }).setOrigin(0.5);
        }

        // Stats panel
        const panelY = 190;
        const panelH = 180;
        this.add.rectangle(w / 2, panelY + panelH / 2, 350, panelH, 0x1a1a3e, 0.8)
            .setStrokeStyle(2, 0x333366);

        const diffLabels = ['Easy', 'Normal', 'Hard'];
        const stats = [
            { label: 'SCORE', value: this.finalScore.toString() },
            { label: 'LEVEL', value: this.finalLevel.toString() },
            { label: 'DIFFICULTY', value: diffLabels[this.difficulty] },
            { label: 'HIGH SCORE', value: this.highScore.toString() },
        ];

        stats.forEach((stat, i) => {
            const sy = panelY + 25 + i * 40;
            this.add.text(w / 2 - 140, sy, stat.label, {
                fontFamily: 'monospace',
                fontSize: '16px',
                color: '#AAAACC',
            }).setOrigin(0, 0.5);

            this.add.text(w / 2 + 140, sy, stat.value, {
                fontFamily: 'monospace',
                fontSize: '18px',
                color: CONFIG.COLORS.ACCENT,
                fontStyle: 'bold',
            }).setOrigin(1, 0.5);
        });

        // Play Again button
        const playBtn = this.add.rectangle(w / 2, 430, 220, 50, 0x4CAF50)
            .setInteractive({ useHandCursor: true });
        this.add.text(w / 2, 430, 'PLAY AGAIN', {
            fontFamily: 'monospace',
            fontSize: '22px',
            color: '#FFFFFF',
            fontStyle: 'bold',
        }).setOrigin(0.5);

        playBtn.on('pointerover', () => playBtn.setFillStyle(0x66BB6A));
        playBtn.on('pointerout', () => playBtn.setFillStyle(0x4CAF50));
        playBtn.on('pointerdown', () => {
            if (window.gameAudio) window.gameAudio.menuSelect();
            this.scene.start('GameScene', { difficulty: this.difficulty });
        });

        // Menu button
        const menuBtn = this.add.rectangle(w / 2, 495, 220, 50, 0x333355)
            .setInteractive({ useHandCursor: true });
        this.add.text(w / 2, 495, 'MAIN MENU', {
            fontFamily: 'monospace',
            fontSize: '22px',
            color: '#FFFFFF',
            fontStyle: 'bold',
        }).setOrigin(0.5);

        menuBtn.on('pointerover', () => menuBtn.setFillStyle(0x444466));
        menuBtn.on('pointerout', () => menuBtn.setFillStyle(0x333355));
        menuBtn.on('pointerdown', () => {
            if (window.gameAudio) window.gameAudio.menuSelect();
            this.scene.start('MenuScene');
        });

        // Keyboard shortcuts
        this.input.keyboard.on('keydown-ENTER', () => {
            this.scene.start('GameScene', { difficulty: this.difficulty });
        });
        this.input.keyboard.on('keydown-SPACE', () => {
            this.scene.start('GameScene', { difficulty: this.difficulty });
        });
        this.input.keyboard.on('keydown-ESC', () => {
            this.scene.start('MenuScene');
        });

        // Footer
        this.add.text(w / 2, h - 30, 'Press ENTER to play again | ESC for menu', {
            fontFamily: 'monospace',
            fontSize: '13px',
            color: '#666688',
        }).setOrigin(0.5);
    }
}
