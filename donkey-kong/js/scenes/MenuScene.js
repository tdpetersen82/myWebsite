// ============================================================
// Donkey Kong — Menu Scene
// ============================================================

class MenuScene extends Phaser.Scene {
    constructor() {
        super({ key: 'MenuScene' });
    }

    create() {
        const { WIDTH, HEIGHT } = DK_CONFIG;
        const cx = WIDTH / 2;

        // Background
        this.cameras.main.setBackgroundColor(DK_CONFIG.COLOR_BG);

        // Draw DK illustration
        const gfx = this.add.graphics();
        this._drawMenuDK(gfx, cx, 140);

        // Title
        this.add.text(cx, 250, 'DONKEY KONG', {
            fontFamily: 'monospace',
            fontSize: '48px',
            color: DK_CONFIG.COLOR_TITLE,
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 4,
        }).setOrigin(0.5);

        // Subtitle
        this.add.text(cx, 300, 'A Classic Arcade Game', {
            fontFamily: 'monospace',
            fontSize: '16px',
            color: '#aaaaaa',
        }).setOrigin(0.5);

        // High score
        const highScore = localStorage.getItem(DK_CONFIG.HIGH_SCORE_KEY) || 0;
        this.add.text(cx, 340, `HIGH SCORE: ${highScore}`, {
            fontFamily: 'monospace',
            fontSize: '18px',
            color: '#ffff00',
        }).setOrigin(0.5);

        // Difficulty selection
        this.difficulty = 1;
        this.diffText = this.add.text(cx, 400, 'DIFFICULTY: NORMAL', {
            fontFamily: 'monospace',
            fontSize: '20px',
            color: '#ffffff',
        }).setOrigin(0.5);

        // Difficulty arrows
        const leftArrow = this.add.text(cx - 140, 400, '<', {
            fontFamily: 'monospace',
            fontSize: '24px',
            color: '#ffff00',
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });

        const rightArrow = this.add.text(cx + 140, 400, '>', {
            fontFamily: 'monospace',
            fontSize: '24px',
            color: '#ffff00',
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });

        leftArrow.on('pointerdown', () => this._changeDifficulty(-1));
        rightArrow.on('pointerdown', () => this._changeDifficulty(1));

        // Start prompt
        this.startText = this.add.text(cx, 460, 'PRESS ENTER OR CLICK TO START', {
            fontFamily: 'monospace',
            fontSize: '18px',
            color: '#ffffff',
        }).setOrigin(0.5);

        // Blink effect
        this.time.addEvent({
            delay: 500,
            loop: true,
            callback: () => {
                this.startText.setVisible(!this.startText.visible);
            },
        });

        // Controls
        const controls = [
            'CONTROLS:',
            '',
            'Arrow Keys — Move & Climb',
            'Space — Jump',
            'P / ESC — Pause',
            'M — Mute',
        ];
        this.add.text(cx, 535, controls.join('\n'), {
            fontFamily: 'monospace',
            fontSize: '12px',
            color: '#888888',
            align: 'center',
            lineSpacing: 4,
        }).setOrigin(0.5);

        // Input
        this.input.keyboard.on('keydown-ENTER', () => this._startGame());
        this.input.keyboard.on('keydown-SPACE', () => this._startGame());
        this.input.on('pointerdown', () => this._startGame());
        this.input.keyboard.on('keydown-LEFT', () => this._changeDifficulty(-1));
        this.input.keyboard.on('keydown-RIGHT', () => this._changeDifficulty(1));
    }

    _changeDifficulty(dir) {
        this.difficulty = Phaser.Math.Clamp(this.difficulty + dir, 0, 2);
        const labels = ['EASY', 'NORMAL', 'HARD'];
        const colors = ['#44ff44', '#ffffff', '#ff4444'];
        this.diffText.setText(`DIFFICULTY: ${labels[this.difficulty]}`);
        this.diffText.setColor(colors[this.difficulty]);
        window.audioManager.menuSelect();
    }

    _startGame() {
        window.audioManager.menuSelect();
        this.scene.start('GameScene', { difficulty: this.difficulty });
    }

    _drawMenuDK(gfx, x, y) {
        // Simple DK face for menu
        const cfg = DK_CONFIG;

        // Head
        gfx.fillStyle(cfg.COLOR_DK, 1);
        gfx.fillCircle(x, y, 50);

        // Face
        gfx.fillStyle(0xD2A06D, 1);
        gfx.fillCircle(x, y + 8, 30);

        // Eyes
        gfx.fillStyle(0xffffff, 1);
        gfx.fillCircle(x - 14, y - 8, 10);
        gfx.fillCircle(x + 14, y - 8, 10);
        gfx.fillStyle(0x000000, 1);
        gfx.fillCircle(x - 12, y - 8, 5);
        gfx.fillCircle(x + 16, y - 8, 5);

        // Brows
        gfx.fillStyle(cfg.COLOR_DK_DARK, 1);
        gfx.fillRect(x - 24, y - 24, 18, 6);
        gfx.fillRect(x + 6, y - 24, 18, 6);

        // Mouth
        gfx.fillStyle(0x000000, 1);
        gfx.fillRect(x - 12, y + 18, 24, 8);
        gfx.fillStyle(0xffffff, 1);
        gfx.fillRect(x - 10, y + 20, 20, 4);
    }
}
