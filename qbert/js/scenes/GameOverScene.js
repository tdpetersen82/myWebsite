// ============================================================
// Q*bert — Game Over Scene
// ============================================================

class GameOverScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameOverScene' });
    }

    init(data) {
        this.finalScore = data.score || 0;
        this.finalLevel = data.level || 1;
        this.cubeChanges = data.cubeChanges || 0;
        this.enemiesKilled = data.enemiesKilled || 0;
        this.levelsCompleted = data.levelsCompleted || 0;
        this.difficulty = data.difficulty || 'normal';
    }

    create() {
        const { width, height } = this.scale;
        this.audio = new AudioManager();

        // Background
        this.cameras.main.setBackgroundColor('#1a0011');

        // Stars
        const g = this.add.graphics();
        for (let i = 0; i < 50; i++) {
            g.fillStyle(0xffffff, Math.random() * 0.4 + 0.1);
            g.fillCircle(Math.random() * width, Math.random() * height, Math.random() + 0.5);
        }

        // Game Over title
        this.add.text(width / 2, 60, 'GAME OVER', {
            fontSize: '56px',
            fontFamily: 'monospace',
            fontStyle: 'bold',
            color: '#ff4444',
            stroke: '#000000',
            strokeThickness: 5
        }).setOrigin(0.5);

        // High score check
        const highScore = parseInt(localStorage.getItem('qbertHighScore') || 0);
        const isNewHigh = this.finalScore >= highScore && this.finalScore > 0;

        if (isNewHigh) {
            const newHighText = this.add.text(width / 2, 110, 'NEW HIGH SCORE!', {
                fontSize: '24px',
                fontFamily: 'monospace',
                fontStyle: 'bold',
                color: '#ffff00'
            }).setOrigin(0.5);

            this.tweens.add({
                targets: newHighText,
                scaleX: 1.1,
                scaleY: 1.1,
                duration: 500,
                yoyo: true,
                repeat: -1
            });
        }

        // Score
        this.add.text(width / 2, 160, `Score: ${this.finalScore}`, {
            fontSize: '36px',
            fontFamily: 'monospace',
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 3
        }).setOrigin(0.5);

        // Stats panel
        const stats = [
            `Difficulty: ${this.difficulty.toUpperCase()}`,
            `Level Reached: ${this.finalLevel}`,
            `Levels Completed: ${this.levelsCompleted}`,
            `Cubes Changed: ${this.cubeChanges}`,
            `Enemies Defeated: ${this.enemiesKilled}`,
            `High Score: ${Math.max(this.finalScore, highScore)}`
        ];

        const statsY = 220;
        stats.forEach((stat, i) => {
            this.add.text(width / 2, statsY + i * 30, stat, {
                fontSize: '16px',
                fontFamily: 'monospace',
                color: '#cccccc'
            }).setOrigin(0.5);
        });

        // Draw sad Q*bert
        this._drawSadQbert(width / 2, statsY + stats.length * 30 + 50);

        // Buttons
        const buttonY = height - 90;

        const replayText = this.add.text(width / 2, buttonY, '[ PLAY AGAIN - ENTER ]', {
            fontSize: '22px',
            fontFamily: 'monospace',
            color: '#44ff44',
            stroke: '#000000',
            strokeThickness: 3
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });

        this.tweens.add({
            targets: replayText,
            alpha: 0.4,
            duration: 700,
            yoyo: true,
            repeat: -1
        });

        const menuText = this.add.text(width / 2, buttonY + 40, '[ MENU - ESC ]', {
            fontSize: '16px',
            fontFamily: 'monospace',
            color: '#aaaaaa'
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });

        replayText.on('pointerdown', () => this._replay());
        menuText.on('pointerdown', () => this._goMenu());

        this.input.keyboard.on('keydown-ENTER', () => this._replay());
        this.input.keyboard.on('keydown-SPACE', () => this._replay());
        this.input.keyboard.on('keydown-ESC', () => this._goMenu());
    }

    _drawSadQbert(cx, cy) {
        const g = this.add.graphics();

        // Body
        g.fillStyle(0xff8800, 1);
        g.fillCircle(cx, cy, 20);

        // Eyes (droopy/sad)
        g.fillStyle(0xffffff, 1);
        g.fillCircle(cx - 7, cy - 8, 7);
        g.fillCircle(cx + 7, cy - 8, 7);

        // Pupils (looking down)
        g.fillStyle(0x000000, 1);
        g.fillCircle(cx - 6, cy - 5, 3);
        g.fillCircle(cx + 8, cy - 5, 3);

        // Sad mouth
        g.lineStyle(2, 0x000000, 1);
        g.beginPath();
        g.arc(cx, cy + 12, 8, Math.PI * 1.2, Math.PI * 1.8);
        g.strokePath();

        // Nose
        g.fillStyle(0xff6600, 1);
        g.beginPath();
        g.moveTo(cx + 2, cy);
        g.lineTo(cx + 18, cy + 6);
        g.lineTo(cx + 16, cy + 10);
        g.lineTo(cx + 2, cy + 4);
        g.closePath();
        g.fillPath();

        // Speech bubble
        this.add.text(cx + 30, cy - 30, '@!#?@!', {
            fontSize: '14px',
            fontFamily: 'monospace',
            color: '#ffffff',
            backgroundColor: '#333333',
            padding: { x: 6, y: 4 }
        });
    }

    _replay() {
        this.audio.playMenuSelect();
        this.scene.start('GameScene', { difficulty: this.difficulty });
    }

    _goMenu() {
        this.audio.playMenuSelect();
        this.scene.start('MenuScene');
    }
}
