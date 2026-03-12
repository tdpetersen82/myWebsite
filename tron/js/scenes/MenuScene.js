// Tron Light Cycles - Menu Scene
class MenuScene extends Phaser.Scene {
    constructor() {
        super({ key: 'MenuScene' });
        this.selectedDifficulty = 'NORMAL';
    }

    create() {
        const w = TRON_CONFIG.WIDTH;
        const h = TRON_CONFIG.HEIGHT;
        const graphics = this.add.graphics();

        // Background
        graphics.fillStyle(TRON_CONFIG.COLORS.BACKGROUND, 1);
        graphics.fillRect(0, 0, w, h);

        // Animated grid lines
        this._drawGrid(graphics);

        // Title
        this.add.text(w / 2, 80, 'TRON', {
            fontFamily: 'monospace',
            fontSize: '72px',
            color: TRON_CONFIG.COLORS.TEXT,
            fontStyle: 'bold',
        }).setOrigin(0.5).setShadow(0, 0, '#00aaff', 12, true, true);

        this.add.text(w / 2, 140, 'LIGHT CYCLES', {
            fontFamily: 'monospace',
            fontSize: '28px',
            color: TRON_CONFIG.COLORS.TEXT_WHITE,
        }).setOrigin(0.5).setShadow(0, 0, '#0088cc', 8, true, true);

        // High score
        const highScore = localStorage.getItem(TRON_CONFIG.STORAGE_KEY) || 0;
        this.add.text(w / 2, 185, `Matches Won: ${highScore}`, {
            fontFamily: 'monospace',
            fontSize: '16px',
            color: TRON_CONFIG.COLORS.TEXT_GREEN,
        }).setOrigin(0.5);

        // Difficulty selection
        this.add.text(w / 2, 240, 'SELECT DIFFICULTY', {
            fontFamily: 'monospace',
            fontSize: '20px',
            color: TRON_CONFIG.COLORS.TEXT_WHITE,
        }).setOrigin(0.5);

        const difficulties = ['EASY', 'NORMAL', 'HARD'];
        this.diffButtons = [];

        difficulties.forEach((diff, i) => {
            const x = w / 2 + (i - 1) * 160;
            const y = 290;
            const isSelected = diff === this.selectedDifficulty;

            const btn = this.add.text(x, y, TRON_CONFIG.DIFFICULTY[diff].label, {
                fontFamily: 'monospace',
                fontSize: '22px',
                color: isSelected ? '#000000' : TRON_CONFIG.COLORS.TEXT,
                backgroundColor: isSelected ? TRON_CONFIG.COLORS.TEXT : 'transparent',
                padding: { x: 16, y: 8 },
            }).setOrigin(0.5).setInteractive({ useHandCursor: true });

            btn.diffKey = diff;

            btn.on('pointerover', () => {
                if (this.selectedDifficulty !== diff) {
                    btn.setStyle({ color: TRON_CONFIG.COLORS.TEXT_WHITE });
                }
            });

            btn.on('pointerout', () => {
                if (this.selectedDifficulty !== diff) {
                    btn.setStyle({ color: TRON_CONFIG.COLORS.TEXT });
                }
            });

            btn.on('pointerdown', () => {
                audioManager.playMenuSelect();
                this.selectedDifficulty = diff;
                this._updateDiffButtons();
            });

            this.diffButtons.push(btn);
        });

        // Start button
        const startBtn = this.add.text(w / 2, 370, '[ START GAME ]', {
            fontFamily: 'monospace',
            fontSize: '28px',
            color: TRON_CONFIG.COLORS.TEXT_GREEN,
            fontStyle: 'bold',
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });

        startBtn.on('pointerover', () => {
            startBtn.setStyle({ color: '#ffffff' });
        });
        startBtn.on('pointerout', () => {
            startBtn.setStyle({ color: TRON_CONFIG.COLORS.TEXT_GREEN });
        });
        startBtn.on('pointerdown', () => {
            audioManager.playMenuSelect();
            this.scene.start('GameScene', {
                difficulty: this.selectedDifficulty,
            });
        });

        // Also start on Enter/Space
        this.input.keyboard.on('keydown-ENTER', () => {
            audioManager.playMenuSelect();
            this.scene.start('GameScene', {
                difficulty: this.selectedDifficulty,
            });
        });
        this.input.keyboard.on('keydown-SPACE', () => {
            audioManager.playMenuSelect();
            this.scene.start('GameScene', {
                difficulty: this.selectedDifficulty,
            });
        });

        // Controls info
        const controlsY = 440;
        this.add.text(w / 2, controlsY, 'CONTROLS', {
            fontFamily: 'monospace',
            fontSize: '18px',
            color: TRON_CONFIG.COLORS.TEXT_ORANGE,
            fontStyle: 'bold',
        }).setOrigin(0.5);

        const controls = [
            'Arrow Keys / WASD - Turn',
            'P / ESC - Pause',
            'M - Mute',
        ];
        controls.forEach((text, i) => {
            this.add.text(w / 2, controlsY + 30 + i * 24, text, {
                fontFamily: 'monospace',
                fontSize: '14px',
                color: TRON_CONFIG.COLORS.TEXT_WHITE,
            }).setOrigin(0.5).setAlpha(0.7);
        });

        // Best of 5 info
        this.add.text(w / 2, 560, 'Best of 5 rounds  |  Arena shrinks each round', {
            fontFamily: 'monospace',
            fontSize: '13px',
            color: TRON_CONFIG.COLORS.TEXT,
        }).setOrigin(0.5).setAlpha(0.5);

        // Mute toggle
        this.input.keyboard.on('keydown-M', () => {
            audioManager.toggleMute();
        });
    }

    _updateDiffButtons() {
        this.diffButtons.forEach(btn => {
            const isSelected = btn.diffKey === this.selectedDifficulty;
            btn.setStyle({
                color: isSelected ? '#000000' : TRON_CONFIG.COLORS.TEXT,
                backgroundColor: isSelected ? TRON_CONFIG.COLORS.TEXT : 'transparent',
            });
        });
    }

    _drawGrid(graphics) {
        const gs = TRON_CONFIG.GRID_SIZE * 3;
        graphics.lineStyle(1, TRON_CONFIG.COLORS.GRID_LINE, 0.2);
        for (let x = 0; x <= TRON_CONFIG.WIDTH; x += gs) {
            graphics.lineBetween(x, 0, x, TRON_CONFIG.HEIGHT);
        }
        for (let y = 0; y <= TRON_CONFIG.HEIGHT; y += gs) {
            graphics.lineBetween(0, y, TRON_CONFIG.WIDTH, y);
        }
    }
}
