// defender/js/scenes/GameOverScene.js — Game over screen with stats and high scores

class GameOverScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameOverScene' });
    }

    init(data) {
        this.finalScore = data.score || 0;
        this.wave = data.wave || 1;
        this.enemiesKilled = data.enemiesKilled || 0;
        this.humanoidsRescued = data.humanoidsRescued || 0;
        this.difficulty = data.difficulty || CONFIG.DIFFICULTY.NORMAL;
    }

    create() {
        this.cameras.main.setBackgroundColor(CONFIG.COLORS.BLACK);
        const cx = CONFIG.WIDTH / 2;

        // Stars
        this.starGraphics = this.add.graphics();
        this.stars = [];
        for (let i = 0; i < 40; i++) {
            this.stars.push({
                x: Math.random() * CONFIG.WIDTH,
                y: Math.random() * CONFIG.HEIGHT,
                size: Math.random() * 1.5 + 0.5,
                alpha: Math.random() * 0.5 + 0.3,
            });
        }

        // Title
        this.add.text(cx, 60, 'GAME OVER', {
            fontSize: '48px',
            fontFamily: 'monospace',
            color: '#ff4444',
            fontStyle: 'bold',
        }).setOrigin(0.5);

        // Score
        this.add.text(cx, 130, `FINAL SCORE: ${this.finalScore}`, {
            fontSize: '28px',
            fontFamily: 'monospace',
            color: '#ffff00',
        }).setOrigin(0.5);

        // High score check
        const prevHigh = parseInt(localStorage.getItem('defenderHighScore') || '0', 10);
        const isNewHigh = this.finalScore > prevHigh;
        if (isNewHigh && this.finalScore > 0) {
            localStorage.setItem('defenderHighScore', this.finalScore);
            this.add.text(cx, 165, 'NEW HIGH SCORE!', {
                fontSize: '20px',
                fontFamily: 'monospace',
                color: '#00ff00',
            }).setOrigin(0.5);
        }

        // Stats
        const statsY = 210;
        const stats = [
            ['DIFFICULTY', this.difficulty.name],
            ['WAVE REACHED', this.wave.toString()],
            ['ENEMIES DESTROYED', this.enemiesKilled.toString()],
            ['HUMANOIDS RESCUED', this.humanoidsRescued.toString()],
        ];

        this.add.text(cx, statsY, '— STATS —', {
            fontSize: '18px',
            fontFamily: 'monospace',
            color: '#aaaaaa',
        }).setOrigin(0.5);

        stats.forEach((s, i) => {
            this.add.text(cx - 140, statsY + 30 + i * 28, s[0], {
                fontSize: '14px',
                fontFamily: 'monospace',
                color: '#888888',
            });
            this.add.text(cx + 140, statsY + 30 + i * 28, s[1], {
                fontSize: '14px',
                fontFamily: 'monospace',
                color: '#ffffff',
            }).setOrigin(1, 0);
        });

        // High scores list
        const hsY = 380;
        this.add.text(cx, hsY, '— HIGH SCORE —', {
            fontSize: '18px',
            fontFamily: 'monospace',
            color: '#aaaaaa',
        }).setOrigin(0.5);

        const displayHigh = Math.max(prevHigh, this.finalScore);
        this.add.text(cx, hsY + 30, displayHigh.toString(), {
            fontSize: '24px',
            fontFamily: 'monospace',
            color: isNewHigh ? '#00ff00' : '#ffff00',
        }).setOrigin(0.5);

        // Actions
        const replayText = this.add.text(cx, 480, 'PRESS ENTER TO PLAY AGAIN', {
            fontSize: '16px',
            fontFamily: 'monospace',
            color: '#00ff00',
        }).setOrigin(0.5);

        const menuText = this.add.text(cx, 510, 'PRESS ESC FOR MENU', {
            fontSize: '14px',
            fontFamily: 'monospace',
            color: '#888888',
        }).setOrigin(0.5);

        // Blinking
        this.blinkTimer = 0;
        this.blinkTarget = replayText;

        // Input - delayed to prevent accidental trigger
        this.time.delayedCall(500, () => {
            this.input.keyboard.on('keydown-ENTER', () => {
                audioManager.menuClick();
                this.scene.start('GameScene', { difficulty: this.difficulty });
            });
            this.input.keyboard.on('keydown-SPACE', () => {
                audioManager.menuClick();
                this.scene.start('GameScene', { difficulty: this.difficulty });
            });
            this.input.keyboard.on('keydown-ESC', () => {
                audioManager.menuClick();
                this.scene.start('MenuScene');
            });
            this.input.on('pointerdown', () => {
                audioManager.menuClick();
                this.scene.start('GameScene', { difficulty: this.difficulty });
            });
        });
    }

    update(time, delta) {
        // Draw stars
        this.starGraphics.clear();
        for (const s of this.stars) {
            const a = s.alpha + Math.sin(time / 600 + s.x) * 0.15;
            this.starGraphics.fillStyle(CONFIG.COLORS.STAR, Math.max(0.1, a));
            this.starGraphics.fillCircle(s.x, s.y, s.size);
        }

        // Blink
        this.blinkTimer += delta;
        if (this.blinkTimer > 500) {
            this.blinkTimer = 0;
            this.blinkTarget.setVisible(!this.blinkTarget.visible);
        }
    }
}
