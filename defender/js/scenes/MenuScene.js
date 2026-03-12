// defender/js/scenes/MenuScene.js — Title screen with difficulty select

class MenuScene extends Phaser.Scene {
    constructor() {
        super({ key: 'MenuScene' });
    }

    create() {
        this.cameras.main.setBackgroundColor(CONFIG.COLORS.BLACK);

        const cx = CONFIG.WIDTH / 2;

        // Stars background
        this.starGraphics = this.add.graphics();
        this.stars = [];
        for (let i = 0; i < 60; i++) {
            this.stars.push({
                x: Math.random() * CONFIG.WIDTH,
                y: Math.random() * CONFIG.HEIGHT,
                size: Math.random() * 1.5 + 0.5,
                alpha: Math.random() * 0.5 + 0.3,
                speed: Math.random() * 0.5 + 0.1,
            });
        }

        // Title
        this.add.text(cx, 80, 'DEFENDER', {
            fontSize: '64px',
            fontFamily: 'monospace',
            color: '#00ccff',
            fontStyle: 'bold',
        }).setOrigin(0.5);

        this.add.text(cx, 130, 'CLASSIC ARCADE', {
            fontSize: '16px',
            fontFamily: 'monospace',
            color: '#888888',
        }).setOrigin(0.5);

        // Difficulty selection
        this.add.text(cx, 200, 'SELECT DIFFICULTY', {
            fontSize: '20px',
            fontFamily: 'monospace',
            color: '#ffffff',
        }).setOrigin(0.5);

        this.difficulties = ['EASY', 'NORMAL', 'HARD'];
        this.selectedIndex = 1; // default NORMAL

        this.diffTexts = this.difficulties.map((d, i) => {
            const txt = this.add.text(cx, 245 + i * 40, d, {
                fontSize: '24px',
                fontFamily: 'monospace',
                color: '#ffffff',
            }).setOrigin(0.5);
            txt.setInteractive({ useHandCursor: true });
            txt.on('pointerdown', () => {
                this.selectedIndex = i;
                audioManager.menuClick();
                this._updateSelection();
            });
            return txt;
        });

        this._updateSelection();

        // Controls
        const controlsY = 400;
        this.add.text(cx, controlsY, 'CONTROLS', {
            fontSize: '18px',
            fontFamily: 'monospace',
            color: '#aaaaaa',
        }).setOrigin(0.5);

        const controls = [
            'Arrow Keys — Move / Thrust',
            'SPACE — Shoot',
            'B — Smart Bomb',
            'H — Hyperspace',
            'P / ESC — Pause',
            'M — Mute',
        ];
        controls.forEach((line, i) => {
            this.add.text(cx, controlsY + 25 + i * 20, line, {
                fontSize: '13px',
                fontFamily: 'monospace',
                color: '#888888',
            }).setOrigin(0.5);
        });

        // High score
        const highScore = localStorage.getItem('defenderHighScore') || 0;
        this.add.text(cx, 560, `HIGH SCORE: ${highScore}`, {
            fontSize: '16px',
            fontFamily: 'monospace',
            color: '#ffff00',
        }).setOrigin(0.5);

        // Start prompt
        this.startText = this.add.text(cx, 580, 'PRESS ENTER OR CLICK TO START', {
            fontSize: '14px',
            fontFamily: 'monospace',
            color: '#00ff00',
        }).setOrigin(0.5);

        // Input
        this.cursors = this.input.keyboard.createCursorKeys();
        this.enterKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);
        this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);

        this.input.keyboard.on('keydown-UP', () => {
            this.selectedIndex = Math.max(0, this.selectedIndex - 1);
            audioManager.menuClick();
            this._updateSelection();
        });
        this.input.keyboard.on('keydown-DOWN', () => {
            this.selectedIndex = Math.min(2, this.selectedIndex + 1);
            audioManager.menuClick();
            this._updateSelection();
        });

        this.enterKey.on('down', () => this._startGame());
        this.spaceKey.on('down', () => this._startGame());
        this.input.on('pointerdown', (pointer) => {
            // Only start if not clicking on difficulty buttons
            if (pointer.y > 350 || pointer.y < 230) {
                this._startGame();
            }
        });

        this.blinkTimer = 0;
    }

    _updateSelection() {
        this.diffTexts.forEach((txt, i) => {
            if (i === this.selectedIndex) {
                txt.setColor('#ffff00');
                txt.setText('> ' + this.difficulties[i] + ' <');
            } else {
                txt.setColor('#ffffff');
                txt.setText(this.difficulties[i]);
            }
        });
    }

    _startGame() {
        const diffKey = this.difficulties[this.selectedIndex];
        audioManager.menuClick();
        this.scene.start('GameScene', {
            difficulty: CONFIG.DIFFICULTY[diffKey],
        });
    }

    update(time, delta) {
        // Animate stars
        this.starGraphics.clear();
        for (const s of this.stars) {
            s.x -= s.speed;
            if (s.x < 0) s.x += CONFIG.WIDTH;
            const a = s.alpha + Math.sin(time / 500 + s.x) * 0.2;
            this.starGraphics.fillStyle(CONFIG.COLORS.STAR, Math.max(0.1, a));
            this.starGraphics.fillCircle(s.x, s.y, s.size);
        }

        // Blink start text
        this.blinkTimer += delta;
        if (this.blinkTimer > 500) {
            this.blinkTimer = 0;
            this.startText.setVisible(!this.startText.visible);
        }
    }
}
