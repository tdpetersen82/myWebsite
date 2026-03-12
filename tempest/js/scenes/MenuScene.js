// ============================================================
// Tempest — Menu Scene
// ============================================================

class MenuScene extends Phaser.Scene {
    constructor() {
        super({ key: 'MenuScene' });
    }

    create() {
        this.cameras.main.setBackgroundColor('#000000');

        const cx = CONFIG.WIDTH / 2;
        const cy = CONFIG.HEIGHT / 2;

        // Animated tube preview
        this.previewAngle = 0;
        this.previewGraphics = this.add.graphics();

        // Title with glow effect
        this.add.text(cx, 80, 'TEMPEST', {
            fontFamily: 'monospace',
            fontSize: '64px',
            color: '#ffff00',
            stroke: '#ff8800',
            strokeThickness: 2,
        }).setOrigin(0.5);

        // Subtitle
        this.add.text(cx, 140, 'GEOMETRIC TUBE SHOOTER', {
            fontFamily: 'monospace',
            fontSize: '16px',
            color: '#4488ff',
        }).setOrigin(0.5);

        // High score
        const highScore = localStorage.getItem(CONFIG.HIGH_SCORE_KEY) || 0;
        this.add.text(cx, 180, `HIGH SCORE: ${highScore}`, {
            fontFamily: 'monospace',
            fontSize: '18px',
            color: '#00ff88',
        }).setOrigin(0.5);

        // Start level selection
        this.startLevel = 1;
        this.levelText = this.add.text(cx, 380, 'STARTING LEVEL: 1', {
            fontFamily: 'monospace',
            fontSize: '20px',
            color: '#ffffff',
        }).setOrigin(0.5);

        this.add.text(cx, 410, 'UP/DOWN to select level (1-16)', {
            fontFamily: 'monospace',
            fontSize: '14px',
            color: '#888888',
        }).setOrigin(0.5);

        // Controls
        const controls = [
            'LEFT / RIGHT  —  Move along rim',
            'SPACE  —  Shoot',
            'Z  —  Super Zapper',
            'P / ESC  —  Pause',
            'M  —  Mute',
        ];

        controls.forEach((text, i) => {
            this.add.text(cx, 460 + i * 22, text, {
                fontFamily: 'monospace',
                fontSize: '14px',
                color: '#aaaaaa',
            }).setOrigin(0.5);
        });

        // Start prompt
        this.startText = this.add.text(cx, 570, 'PRESS ENTER OR SPACE TO START', {
            fontFamily: 'monospace',
            fontSize: '20px',
            color: '#ffff00',
        }).setOrigin(0.5);

        this.blinkTimer = 0;

        // Input
        this.enterKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);
        this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
        this.upKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.UP);
        this.downKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.DOWN);

        this.levelChangeDelay = 0;
    }

    update(time, delta) {
        // Blink start text
        this.blinkTimer += delta;
        this.startText.setAlpha(Math.sin(this.blinkTimer * 0.004) > 0 ? 1 : 0.2);

        // Level selection
        this.levelChangeDelay -= delta;
        if (Phaser.Input.Keyboard.JustDown(this.upKey)) {
            this.startLevel = Math.min(this.startLevel + 1, 16);
            this.levelText.setText(`STARTING LEVEL: ${this.startLevel}`);
            this.levelChangeDelay = 200;
        }
        if (Phaser.Input.Keyboard.JustDown(this.downKey)) {
            this.startLevel = Math.max(this.startLevel - 1, 1);
            this.levelText.setText(`STARTING LEVEL: ${this.startLevel}`);
            this.levelChangeDelay = 200;
        }

        // Draw rotating tube preview
        this.previewAngle += delta * 0.001;
        this._drawPreview();

        // Start game
        if (Phaser.Input.Keyboard.JustDown(this.enterKey) || Phaser.Input.Keyboard.JustDown(this.spaceKey)) {
            this.scene.start('GameScene', { startLevel: this.startLevel });
        }
    }

    _drawPreview() {
        const g = this.previewGraphics;
        g.clear();
        const cx = CONFIG.WIDTH / 2;
        const cy = 270;
        const r = 100;
        const lanes = 16;
        const color = LEVEL_COLORS[(Math.floor(this.previewAngle * 2)) % LEVEL_COLORS.length];

        g.lineStyle(1.5, color, 0.6);
        for (let i = 0; i < lanes; i++) {
            const a1 = this.previewAngle + (i / lanes) * Math.PI * 2;
            const a2 = this.previewAngle + ((i + 1) / lanes) * Math.PI * 2;
            const ox1 = cx + Math.cos(a1) * r;
            const oy1 = cy + Math.sin(a1) * r;
            const ox2 = cx + Math.cos(a2) * r;
            const oy2 = cy + Math.sin(a2) * r;
            const ix1 = cx + Math.cos(a1) * 20;
            const iy1 = cy + Math.sin(a1) * 20;

            // Rim edge
            g.beginPath();
            g.moveTo(ox1, oy1);
            g.lineTo(ox2, oy2);
            g.strokePath();

            // Lane line to center
            g.beginPath();
            g.moveTo(ox1, oy1);
            g.lineTo(ix1, iy1);
            g.strokePath();
        }
    }
}
