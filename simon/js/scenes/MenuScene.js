// ============================================================
// Simon — Menu Scene
// ============================================================

class MenuScene extends Phaser.Scene {
    constructor() {
        super({ key: 'MenuScene' });
        this.selectedDifficulty = 'NORMAL';
    }

    create() {
        const { WIDTH, HEIGHT } = SIMON_CONFIG;

        // Background
        this.cameras.main.setBackgroundColor(SIMON_CONFIG.BG_COLOR);

        // Title
        this.add.text(WIDTH / 2, 80, 'SIMON', {
            fontFamily: 'Arial, sans-serif',
            fontSize: '72px',
            fontStyle: 'bold',
            color: '#ffffff',
            stroke: '#667eea',
            strokeThickness: 4,
        }).setOrigin(0.5);

        // Subtitle
        this.add.text(WIDTH / 2, 135, 'Memory Pattern Game', {
            fontFamily: 'Arial, sans-serif',
            fontSize: '20px',
            color: '#aaaacc',
        }).setOrigin(0.5);

        // Decorative mini pads
        const colors = [0x00a74a, 0xcc0000, 0xcccc00, 0x0044cc];
        const miniSize = 30;
        const startX = WIDTH / 2 - (colors.length * (miniSize + 10)) / 2 + miniSize / 2;
        colors.forEach((color, i) => {
            const g = this.add.graphics();
            g.fillStyle(color, 1);
            g.fillRoundedRect(startX + i * (miniSize + 10), 160, miniSize, miniSize, 6);
        });

        // Difficulty selection
        this.add.text(WIDTH / 2, 230, 'SELECT DIFFICULTY', {
            fontFamily: 'Arial, sans-serif',
            fontSize: '18px',
            fontStyle: 'bold',
            color: '#888899',
            letterSpacing: 2,
        }).setOrigin(0.5);

        const difficulties = ['EASY', 'NORMAL', 'HARD'];
        this.diffButtons = [];
        this.diffTexts = [];

        difficulties.forEach((diff, i) => {
            const x = WIDTH / 2 + (i - 1) * 160;
            const y = 280;

            const bg = this.add.graphics();
            const txt = this.add.text(x, y, SIMON_CONFIG.DIFFICULTY[diff].label, {
                fontFamily: 'Arial, sans-serif',
                fontSize: '22px',
                fontStyle: 'bold',
                color: '#ffffff',
            }).setOrigin(0.5);

            const zone = this.add.zone(x, y, 130, 45).setInteractive({ useHandCursor: true });
            zone.on('pointerdown', () => {
                audioManager.playClick();
                this.selectedDifficulty = diff;
                this.updateDifficultyDisplay();
            });
            zone.on('pointerover', () => {
                if (this.selectedDifficulty !== diff) {
                    txt.setColor('#ccccff');
                }
            });
            zone.on('pointerout', () => {
                if (this.selectedDifficulty !== diff) {
                    txt.setColor('#888899');
                }
            });

            this.diffButtons.push({ bg, zone, key: diff });
            this.diffTexts.push({ text: txt, key: diff });
        });

        this.updateDifficultyDisplay();

        // Play button
        const playY = 360;
        const playBg = this.add.graphics();
        playBg.fillStyle(0x667eea, 1);
        playBg.fillRoundedRect(WIDTH / 2 - 100, playY - 25, 200, 50, 12);

        const playText = this.add.text(WIDTH / 2, playY, 'PLAY', {
            fontFamily: 'Arial, sans-serif',
            fontSize: '28px',
            fontStyle: 'bold',
            color: '#ffffff',
        }).setOrigin(0.5);

        const playZone = this.add.zone(WIDTH / 2, playY, 200, 50).setInteractive({ useHandCursor: true });
        playZone.on('pointerdown', () => {
            audioManager.playClick();
            this.scene.start('GameScene', { difficulty: this.selectedDifficulty });
        });
        playZone.on('pointerover', () => {
            playBg.clear();
            playBg.fillStyle(0x7b93f5, 1);
            playBg.fillRoundedRect(WIDTH / 2 - 100, playY - 25, 200, 50, 12);
        });
        playZone.on('pointerout', () => {
            playBg.clear();
            playBg.fillStyle(0x667eea, 1);
            playBg.fillRoundedRect(WIDTH / 2 - 100, playY - 25, 200, 50, 12);
        });

        // High score
        const highScore = localStorage.getItem(SIMON_CONFIG.HIGH_SCORE_KEY) || 0;
        this.add.text(WIDTH / 2, 430, `High Score: ${highScore}`, {
            fontFamily: 'Arial, sans-serif',
            fontSize: '22px',
            color: '#ffcc00',
        }).setOrigin(0.5);

        // Controls info
        const controlsY = 490;
        this.add.text(WIDTH / 2, controlsY, 'CONTROLS', {
            fontFamily: 'Arial, sans-serif',
            fontSize: '16px',
            fontStyle: 'bold',
            color: '#888899',
        }).setOrigin(0.5);

        const controlLines = [
            'Click pads or press 1-2-3-4 to repeat the pattern',
            'P / ESC: Pause  |  M: Mute',
        ];
        controlLines.forEach((line, i) => {
            this.add.text(WIDTH / 2, controlsY + 25 + i * 22, line, {
                fontFamily: 'Arial, sans-serif',
                fontSize: '14px',
                color: '#666688',
            }).setOrigin(0.5);
        });

        // Keyboard: Enter to start
        this.input.keyboard.on('keydown-ENTER', () => {
            this.scene.start('GameScene', { difficulty: this.selectedDifficulty });
        });
        this.input.keyboard.on('keydown-SPACE', () => {
            this.scene.start('GameScene', { difficulty: this.selectedDifficulty });
        });
    }

    updateDifficultyDisplay() {
        this.diffButtons.forEach(({ bg, key }) => {
            const isSelected = key === this.selectedDifficulty;
            const btn = this.diffTexts.find(t => t.key === key);
            const x = btn.text.x;
            const y = btn.text.y;

            bg.clear();
            if (isSelected) {
                bg.fillStyle(0x667eea, 0.3);
                bg.lineStyle(2, 0x667eea, 1);
                bg.fillRoundedRect(x - 65, y - 22, 130, 44, 10);
                bg.strokeRoundedRect(x - 65, y - 22, 130, 44, 10);
            }
        });

        this.diffTexts.forEach(({ text, key }) => {
            text.setColor(key === this.selectedDifficulty ? '#ffffff' : '#888899');
        });
    }
}
