// Lunar Lander - Menu Scene

class MenuScene extends Phaser.Scene {
    constructor() {
        super({ key: 'MenuScene' });
    }

    create() {
        const w = CONFIG.WIDTH;
        const h = CONFIG.HEIGHT;

        // Starfield background
        this._drawStarfield();

        // Title
        this.add.text(w / 2, 80, 'LUNAR LANDER', {
            fontSize: '48px',
            fontFamily: 'Courier New, monospace',
            color: '#ffffff',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        // Subtitle
        this.add.text(w / 2, 130, 'A Classic Arcade Game', {
            fontSize: '16px',
            fontFamily: 'Courier New, monospace',
            color: '#888888'
        }).setOrigin(0.5);

        // Draw a decorative lander
        this._drawMenuLander(w / 2, 220);

        // Difficulty selection
        this.add.text(w / 2, 310, 'SELECT DIFFICULTY', {
            fontSize: '18px',
            fontFamily: 'Courier New, monospace',
            color: '#00ff00'
        }).setOrigin(0.5);

        const difficulties = [
            { label: '[ CADET ]', gravity: 0.7, fuel: 1.2, key: 'easy' },
            { label: '[ PILOT ]', gravity: 1.0, fuel: 1.0, key: 'normal' },
            { label: '[ COMMANDER ]', gravity: 1.3, fuel: 0.8, key: 'hard' }
        ];

        this.selectedDifficulty = 1; // default normal
        this.diffButtons = [];

        difficulties.forEach((diff, i) => {
            const btn = this.add.text(w / 2, 350 + i * 35, diff.label, {
                fontSize: '20px',
                fontFamily: 'Courier New, monospace',
                color: i === 1 ? '#ffff00' : '#aaaaaa'
            }).setOrigin(0.5).setInteractive({ useHandCursor: true });

            btn.on('pointerover', () => {
                this.selectedDifficulty = i;
                this._updateDifficultySelection();
            });

            btn.on('pointerdown', () => {
                this.selectedDifficulty = i;
                this._startGame(difficulties[i]);
            });

            this.diffButtons.push(btn);
        });

        // Controls info
        const controlsY = 470;
        this.add.text(w / 2, controlsY, 'CONTROLS', {
            fontSize: '16px',
            fontFamily: 'Courier New, monospace',
            color: '#00ff00'
        }).setOrigin(0.5);

        const controls = [
            'UP / W - Thrust',
            'LEFT / RIGHT / A / D - Rotate',
            'P / ESC - Pause    M - Mute'
        ];

        controls.forEach((line, i) => {
            this.add.text(w / 2, controlsY + 25 + i * 20, line, {
                fontSize: '13px',
                fontFamily: 'Courier New, monospace',
                color: '#888888'
            }).setOrigin(0.5);
        });

        // High score
        const highScore = localStorage.getItem(CONFIG.HIGH_SCORE_KEY) || 0;
        this.add.text(w / 2, h - 30, `HIGH SCORE: ${highScore}`, {
            fontSize: '14px',
            fontFamily: 'Courier New, monospace',
            color: '#ffff00'
        }).setOrigin(0.5);

        // Keyboard navigation
        this.cursors = this.input.keyboard.createCursorKeys();
        this.enterKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);
        this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);

        this.input.keyboard.on('keydown-UP', () => {
            this.selectedDifficulty = Math.max(0, this.selectedDifficulty - 1);
            this._updateDifficultySelection();
        });
        this.input.keyboard.on('keydown-DOWN', () => {
            this.selectedDifficulty = Math.min(2, this.selectedDifficulty + 1);
            this._updateDifficultySelection();
        });
        this.input.keyboard.on('keydown-ENTER', () => {
            this._startGame(difficulties[this.selectedDifficulty]);
        });
        this.input.keyboard.on('keydown-SPACE', () => {
            this._startGame(difficulties[this.selectedDifficulty]);
        });

        // Blinking prompt
        const prompt = this.add.text(w / 2, h - 60, 'PRESS ENTER OR CLICK TO START', {
            fontSize: '14px',
            fontFamily: 'Courier New, monospace',
            color: '#00ff00'
        }).setOrigin(0.5);

        this.tweens.add({
            targets: prompt,
            alpha: 0.2,
            duration: 600,
            yoyo: true,
            repeat: -1
        });
    }

    _drawStarfield() {
        const g = this.add.graphics();
        g.fillStyle(CONFIG.COLORS.SKY, 1);
        g.fillRect(0, 0, CONFIG.WIDTH, CONFIG.HEIGHT);

        for (let i = 0; i < 120; i++) {
            const x = Math.random() * CONFIG.WIDTH;
            const y = Math.random() * CONFIG.HEIGHT;
            const size = Math.random() * 1.5 + 0.5;
            const alpha = Math.random() * 0.7 + 0.3;
            g.fillStyle(CONFIG.COLORS.STAR, alpha);
            g.fillCircle(x, y, size);
        }
    }

    _drawMenuLander(cx, cy) {
        const g = this.add.graphics();
        // Simple lander icon
        g.fillStyle(CONFIG.COLORS.LANDER_BODY, 1);
        g.lineStyle(2, CONFIG.COLORS.LANDER_STROKE, 1);

        // Body
        g.beginPath();
        g.moveTo(cx, cy - 25);
        g.lineTo(cx + 15, cy - 5);
        g.lineTo(cx + 18, cy + 8);
        g.lineTo(cx, cy + 18);
        g.lineTo(cx - 18, cy + 8);
        g.lineTo(cx - 15, cy - 5);
        g.closePath();
        g.fillPath();
        g.strokePath();

        // Legs
        g.lineStyle(2, CONFIG.COLORS.LANDER_STROKE, 0.8);
        g.beginPath();
        g.moveTo(cx - 18, cy + 8);
        g.lineTo(cx - 25, cy + 22);
        g.moveTo(cx + 18, cy + 8);
        g.lineTo(cx + 25, cy + 22);
        g.strokePath();

        // Feet
        g.beginPath();
        g.moveTo(cx - 30, cy + 22);
        g.lineTo(cx - 20, cy + 22);
        g.moveTo(cx + 20, cy + 22);
        g.lineTo(cx + 30, cy + 22);
        g.strokePath();

        // Window
        g.fillStyle(0x4488cc, 0.8);
        g.fillCircle(cx, cy - 3, 5);
        g.lineStyle(1, 0x66aaff, 1);
        g.strokeCircle(cx, cy - 3, 5);

        // Flame decoration
        g.fillStyle(0xff6600, 0.7);
        g.fillTriangle(cx - 6, cy + 18, cx + 6, cy + 18, cx, cy + 40);
        g.fillStyle(0xffcc00, 0.8);
        g.fillTriangle(cx - 3, cy + 18, cx + 3, cy + 18, cx, cy + 32);
    }

    _updateDifficultySelection() {
        this.diffButtons.forEach((btn, i) => {
            btn.setColor(i === this.selectedDifficulty ? '#ffff00' : '#aaaaaa');
            btn.setScale(i === this.selectedDifficulty ? 1.1 : 1.0);
        });
    }

    _startGame(difficulty) {
        if (window.audioManager) {
            window.audioManager.init();
            window.audioManager.playBeep(660, 0.15);
        }
        this.scene.start('GameScene', {
            gravityMod: difficulty.gravity,
            fuelMod: difficulty.fuel,
            difficultyKey: difficulty.key
        });
    }
}
