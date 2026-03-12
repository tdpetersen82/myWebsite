// ============================================================
// Q*bert — Menu Scene
// ============================================================

class MenuScene extends Phaser.Scene {
    constructor() {
        super({ key: 'MenuScene' });
    }

    create() {
        const { width, height } = this.scale;
        this.audio = new AudioManager();

        // Background
        this.cameras.main.setBackgroundColor('#1a0033');

        // Starfield effect
        const starGraphics = this.add.graphics();
        for (let i = 0; i < 80; i++) {
            const sx = Math.random() * width;
            const sy = Math.random() * height;
            const brightness = Math.random();
            starGraphics.fillStyle(0xffffff, brightness * 0.6 + 0.1);
            starGraphics.fillCircle(sx, sy, Math.random() * 1.5 + 0.5);
        }

        // Title
        this.add.text(width / 2, 80, 'Q*BERT', {
            fontSize: '72px',
            fontFamily: 'monospace',
            fontStyle: 'bold',
            color: '#ff8800',
            stroke: '#000000',
            strokeThickness: 6
        }).setOrigin(0.5);

        // Subtitle
        this.add.text(width / 2, 140, 'The Isometric Arcade Classic', {
            fontSize: '16px',
            fontFamily: 'monospace',
            color: '#ffcc66'
        }).setOrigin(0.5);

        // Draw a mini pyramid preview
        this._drawMiniPyramid(width / 2, 260);

        // High score
        const highScore = localStorage.getItem('qbertHighScore') || 0;
        this.add.text(width / 2, 370, `High Score: ${highScore}`, {
            fontSize: '18px',
            fontFamily: 'monospace',
            color: '#ffff00'
        }).setOrigin(0.5);

        // Difficulty select
        this.selectedDifficulty = 'normal';
        this.add.text(width / 2, 410, 'Difficulty:', {
            fontSize: '16px',
            fontFamily: 'monospace',
            color: '#aaaaaa'
        }).setOrigin(0.5);

        const difficulties = ['easy', 'normal', 'hard'];
        const diffColors = { easy: '#44ff44', normal: '#ffff44', hard: '#ff4444' };
        this.diffTexts = {};

        difficulties.forEach((diff, i) => {
            const dx = width / 2 + (i - 1) * 120;
            const text = this.add.text(dx, 440, diff.toUpperCase(), {
                fontSize: '18px',
                fontFamily: 'monospace',
                color: diff === 'normal' ? diffColors[diff] : '#666666',
                stroke: '#000000',
                strokeThickness: 2
            }).setOrigin(0.5).setInteractive({ useHandCursor: true });

            this.diffTexts[diff] = text;

            text.on('pointerdown', () => {
                this.audio.playMenuSelect();
                this.selectedDifficulty = diff;
                Object.keys(this.diffTexts).forEach(d => {
                    this.diffTexts[d].setColor(d === diff ? diffColors[d] : '#666666');
                });
            });
        });

        // Start button
        const startText = this.add.text(width / 2, 500, '[ PRESS ENTER TO START ]', {
            fontSize: '22px',
            fontFamily: 'monospace',
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 3
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });

        // Blinking effect
        this.tweens.add({
            targets: startText,
            alpha: 0.3,
            duration: 800,
            yoyo: true,
            repeat: -1
        });

        startText.on('pointerdown', () => this._startGame());

        // Controls info
        this.add.text(width / 2, 555, 'Arrow Keys / WASD: Jump | P/ESC: Pause | M: Mute', {
            fontSize: '12px',
            fontFamily: 'monospace',
            color: '#888888'
        }).setOrigin(0.5);

        this.add.text(width / 2, 575, 'Up=Up-Left  Right=Up-Right  Down=Down-Right  Left=Down-Left', {
            fontSize: '11px',
            fontFamily: 'monospace',
            color: '#666666'
        }).setOrigin(0.5);

        // Key bindings
        this.input.keyboard.on('keydown-ENTER', () => this._startGame());
        this.input.keyboard.on('keydown-SPACE', () => this._startGame());
    }

    _startGame() {
        this.audio.playMenuSelect();
        this.scene.start('GameScene', { difficulty: this.selectedDifficulty });
    }

    _drawMiniPyramid(cx, cy) {
        const g = this.add.graphics();
        const miniSize = 18;
        const rows = 5;
        const colors = [0x4444ff, 0xffff00, 0xff4444, 0x44cc44, 0xff8800];

        for (let row = 0; row < rows; row++) {
            for (let col = 0; col <= row; col++) {
                const x = cx + (col - row / 2) * miniSize;
                const y = cy + row * (miniSize * 0.75);
                const color = colors[(row + col) % colors.length];

                // Top face
                g.fillStyle(color, 1);
                g.beginPath();
                g.moveTo(x, y - miniSize / 4);
                g.lineTo(x + miniSize / 2, y);
                g.lineTo(x, y + miniSize / 4);
                g.lineTo(x - miniSize / 2, y);
                g.closePath();
                g.fillPath();

                // Left face
                g.fillStyle(Phaser.Display.Color.GetColor(
                    ((color >> 16) & 0xff) * 0.6,
                    ((color >> 8) & 0xff) * 0.6,
                    (color & 0xff) * 0.6
                ), 1);
                g.beginPath();
                g.moveTo(x - miniSize / 2, y);
                g.lineTo(x, y + miniSize / 4);
                g.lineTo(x, y + miniSize / 4 + miniSize / 2);
                g.lineTo(x - miniSize / 2, y + miniSize / 2);
                g.closePath();
                g.fillPath();

                // Right face
                g.fillStyle(Phaser.Display.Color.GetColor(
                    ((color >> 16) & 0xff) * 0.75,
                    ((color >> 8) & 0xff) * 0.75,
                    (color & 0xff) * 0.75
                ), 1);
                g.beginPath();
                g.moveTo(x + miniSize / 2, y);
                g.lineTo(x, y + miniSize / 4);
                g.lineTo(x, y + miniSize / 4 + miniSize / 2);
                g.lineTo(x + miniSize / 2, y + miniSize / 2);
                g.closePath();
                g.fillPath();
            }
        }

        // Mini Q*bert on top
        g.fillStyle(0xff8800, 1);
        g.fillCircle(cx, cy - miniSize - 4, 6);
        g.fillStyle(0xffffff, 1);
        g.fillCircle(cx - 2, cy - miniSize - 7, 2);
        g.fillCircle(cx + 2, cy - miniSize - 7, 2);
    }
}
