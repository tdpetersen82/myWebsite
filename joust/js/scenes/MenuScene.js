// ============================================================
// Joust — Menu Scene
// ============================================================

class MenuScene extends Phaser.Scene {
    constructor() {
        super({ key: 'MenuScene' });
    }

    create() {
        this.audio = new AudioManager();

        const cx = CONFIG.WIDTH / 2;
        const cy = CONFIG.HEIGHT / 2;

        // Background
        this.cameras.main.setBackgroundColor(CONFIG.BG_COLOR);

        // Animated lava at bottom
        this.lavaGraphics = this.add.graphics();
        this.lavaPhase = 0;

        // Title
        this.add.text(cx, 100, 'JOUST', {
            fontFamily: 'monospace',
            fontSize: '72px',
            fontStyle: 'bold',
            color: '#FFD700',
            stroke: '#8B4513',
            strokeThickness: 6
        }).setOrigin(0.5);

        // Subtitle
        this.add.text(cx, 160, 'Knight vs. Buzzard Riders', {
            fontFamily: 'monospace',
            fontSize: '18px',
            color: '#CCAA55'
        }).setOrigin(0.5);

        // Draw a decorative knight on ostrich
        this.demoGraphics = this.add.graphics();
        this.demoX = cx;
        this.demoY = 230;
        this.demoWingPhase = 0;
        this.drawDemoKnight();

        // High score
        const highScore = localStorage.getItem(CONFIG.HIGH_SCORE_KEY) || 0;
        this.add.text(cx, 310, `High Score: ${highScore}`, {
            fontFamily: 'monospace',
            fontSize: '20px',
            color: '#FFD700'
        }).setOrigin(0.5);

        // Controls info
        const controlsText = [
            'CONTROLS:',
            '',
            'SPACE / UP  -  Flap (fly upward)',
            'LEFT / RIGHT  -  Move horizontally',
            'P / ESC  -  Pause',
            'M  -  Mute / Unmute',
            '',
            'Defeat enemies by being HIGHER on collision!',
            'Collect eggs before they hatch!'
        ].join('\n');

        this.add.text(cx, 430, controlsText, {
            fontFamily: 'monospace',
            fontSize: '14px',
            color: '#AAAACC',
            align: 'center',
            lineSpacing: 4
        }).setOrigin(0.5);

        // Start prompt (flashing)
        this.startText = this.add.text(cx, 550, 'Press SPACE or ENTER to Start', {
            fontFamily: 'monospace',
            fontSize: '22px',
            color: '#FFFFFF'
        }).setOrigin(0.5);

        this.flashTimer = 0;

        // Input
        this.input.keyboard.on('keydown-SPACE', () => this.startGame());
        this.input.keyboard.on('keydown-ENTER', () => this.startGame());

        // Click/tap to start
        this.input.on('pointerdown', () => this.startGame());
    }

    startGame() {
        this.audio.playMenuSelect();
        this.scene.start('GameScene');
    }

    update(time, delta) {
        // Flash start text
        this.flashTimer += delta;
        this.startText.setAlpha(Math.sin(this.flashTimer * 0.004) * 0.4 + 0.6);

        // Animate demo knight wings
        this.demoWingPhase += delta * 0.005;
        this.drawDemoKnight();

        // Animate lava
        this.lavaPhase += delta * 0.002;
        this.drawMenuLava();
    }

    drawDemoKnight() {
        const g = this.demoGraphics;
        const x = this.demoX;
        const y = this.demoY;
        const wingUp = Math.sin(this.demoWingPhase) > 0;

        g.clear();

        // Ostrich body
        g.fillStyle(0xDDA520, 1);
        g.fillEllipse(x, y + 6, 26, 20);

        // Neck
        g.lineStyle(4, 0xDDA520, 1);
        g.lineBetween(x + 6, y, x + 12, y - 10);

        // Head
        g.fillStyle(0xDDA520, 1);
        g.fillCircle(x + 12, y - 12, 5);

        // Beak
        g.fillStyle(0xFF8800, 1);
        g.fillTriangle(x + 17, y - 12, x + 12, y - 15, x + 12, y - 9);

        // Wings
        g.fillStyle(0xBB8820, 1);
        if (wingUp) {
            g.fillTriangle(x - 4, y + 2, x - 18, y - 14, x - 10, y + 4);
        } else {
            g.fillTriangle(x - 4, y + 2, x - 18, y + 10, x - 10, y + 4);
        }

        // Knight body
        g.fillStyle(0xFFFF44, 1);
        g.fillRect(x - 6, y - 12, 12, 12);

        // Helmet
        g.fillCircle(x, y - 16, 6);
        g.fillStyle(0x333333, 1);
        g.fillRect(x + 1, y - 18, 5, 3);

        // Lance
        g.lineStyle(3, 0xFFFFFF, 1);
        g.lineBetween(x + 8, y - 8, x + 24, y - 18);
    }

    drawMenuLava() {
        const g = this.lavaGraphics;
        g.clear();

        g.fillStyle(0xFF6A00, 0.1);
        g.fillRect(0, CONFIG.LAVA_Y - 15, CONFIG.WIDTH, 15);

        g.fillStyle(CONFIG.LAVA_COLOR, 1);
        g.fillRect(0, CONFIG.LAVA_Y, CONFIG.WIDTH, CONFIG.LAVA_HEIGHT);

        g.fillStyle(0xFF6A00, 1);
        for (let x = 0; x < CONFIG.WIDTH; x += 4) {
            const wy = Math.sin(x * 0.03 + this.lavaPhase) * 3;
            g.fillRect(x, CONFIG.LAVA_Y + wy - 1, 4, 3);
        }
    }
}
