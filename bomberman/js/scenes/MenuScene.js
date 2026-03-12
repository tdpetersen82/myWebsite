// Bomberman Menu Scene
class MenuScene extends Phaser.Scene {
    constructor() {
        super({ key: 'MenuScene' });
        this.selectedDifficulty = 1; // 0=Easy, 1=Normal, 2=Hard
    }

    create() {
        const w = CONFIG.WIDTH;
        const h = CONFIG.HEIGHT;

        // Background
        this.add.rectangle(w / 2, h / 2, w, h, CONFIG.COLORS.BG);

        // Decorative grid pattern
        const gridGfx = this.add.graphics();
        gridGfx.lineStyle(1, 0x333355, 0.3);
        for (let x = 0; x < w; x += 40) {
            gridGfx.lineBetween(x, 0, x, h);
        }
        for (let y = 0; y < h; y += 40) {
            gridGfx.lineBetween(0, y, w, y);
        }

        // Title
        this.add.text(w / 2, 80, 'BOMBERMAN', {
            fontFamily: 'monospace',
            fontSize: '56px',
            color: CONFIG.COLORS.ACCENT,
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 4,
        }).setOrigin(0.5);

        // Subtitle
        this.add.text(w / 2, 130, 'Classic Arcade', {
            fontFamily: 'monospace',
            fontSize: '18px',
            color: '#AAAACC',
        }).setOrigin(0.5);

        // Decorative bomb
        const bombGfx = this.add.graphics();
        bombGfx.fillStyle(0x212121, 1);
        bombGfx.fillCircle(w / 2, 200, 25);
        bombGfx.fillStyle(0x444444, 0.5);
        bombGfx.fillCircle(w / 2 - 8, 192, 8);
        bombGfx.lineStyle(3, 0xFF9800, 1);
        bombGfx.lineBetween(w / 2, 175, w / 2 + 12, 160);
        bombGfx.fillStyle(0xFFFF00, 1);
        bombGfx.fillCircle(w / 2 + 12, 158, 4);

        // Difficulty selection
        this.add.text(w / 2, 270, 'DIFFICULTY', {
            fontFamily: 'monospace',
            fontSize: '20px',
            color: CONFIG.COLORS.TEXT,
        }).setOrigin(0.5);

        const difficulties = ['EASY', 'NORMAL', 'HARD'];
        this.diffButtons = [];
        const btnWidth = 120;
        const btnSpacing = 140;
        const startX = w / 2 - btnSpacing;

        difficulties.forEach((label, i) => {
            const bx = startX + i * btnSpacing;
            const by = 310;

            const bg = this.add.rectangle(bx, by, btnWidth, 40, 0x333355)
                .setInteractive({ useHandCursor: true });
            const txt = this.add.text(bx, by, label, {
                fontFamily: 'monospace',
                fontSize: '16px',
                color: CONFIG.COLORS.TEXT,
            }).setOrigin(0.5);

            bg.on('pointerdown', () => {
                this.selectedDifficulty = i;
                this._updateDifficultyUI();
                if (window.gameAudio) window.gameAudio.menuSelect();
            });

            this.diffButtons.push({ bg, txt, index: i });
        });

        this._updateDifficultyUI();

        // Start button
        const startBtn = this.add.rectangle(w / 2, 400, 200, 50, 0x4CAF50)
            .setInteractive({ useHandCursor: true });
        this.add.text(w / 2, 400, 'START GAME', {
            fontFamily: 'monospace',
            fontSize: '22px',
            color: '#FFFFFF',
            fontStyle: 'bold',
        }).setOrigin(0.5);

        startBtn.on('pointerover', () => startBtn.setFillStyle(0x66BB6A));
        startBtn.on('pointerout', () => startBtn.setFillStyle(0x4CAF50));
        startBtn.on('pointerdown', () => this._startGame());

        // Controls info
        const controlsY = 470;
        this.add.text(w / 2, controlsY, 'CONTROLS', {
            fontFamily: 'monospace',
            fontSize: '18px',
            color: CONFIG.COLORS.ACCENT,
            fontStyle: 'bold',
        }).setOrigin(0.5);

        const controls = [
            'Arrow Keys - Move',
            'Space - Place Bomb',
            'P / ESC - Pause',
            'M - Mute/Unmute',
        ];
        controls.forEach((txt, i) => {
            this.add.text(w / 2, controlsY + 25 + i * 22, txt, {
                fontFamily: 'monospace',
                fontSize: '14px',
                color: '#AAAACC',
            }).setOrigin(0.5);
        });

        // High score
        const highScore = localStorage.getItem(CONFIG.STORAGE_KEY) || 0;
        this.add.text(w / 2, h - 30, `HIGH SCORE: ${highScore}`, {
            fontFamily: 'monospace',
            fontSize: '16px',
            color: CONFIG.COLORS.ACCENT,
        }).setOrigin(0.5);

        // Keyboard: Enter to start, 1/2/3 for difficulty
        this.input.keyboard.on('keydown-ENTER', () => this._startGame());
        this.input.keyboard.on('keydown-SPACE', () => this._startGame());
        this.input.keyboard.on('keydown-ONE', () => {
            this.selectedDifficulty = 0;
            this._updateDifficultyUI();
        });
        this.input.keyboard.on('keydown-TWO', () => {
            this.selectedDifficulty = 1;
            this._updateDifficultyUI();
        });
        this.input.keyboard.on('keydown-THREE', () => {
            this.selectedDifficulty = 2;
            this._updateDifficultyUI();
        });
    }

    _updateDifficultyUI() {
        this.diffButtons.forEach(btn => {
            if (btn.index === this.selectedDifficulty) {
                btn.bg.setFillStyle(0xFFD54F);
                btn.txt.setColor('#000000');
            } else {
                btn.bg.setFillStyle(0x333355);
                btn.txt.setColor('#FFFFFF');
            }
        });
    }

    _startGame() {
        if (window.gameAudio) window.gameAudio.menuSelect();
        this.scene.start('GameScene', { difficulty: this.selectedDifficulty });
    }
}
