// ============================================================
// Tempest — Game Over Scene
// ============================================================

class GameOverScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameOverScene' });
    }

    init(data) {
        this.finalScore = data.score || 0;
        this.finalLevel = data.level || 1;
        this.highScore = data.highScore || 0;
        this.enemiesKilled = data.enemiesKilled || 0;
    }

    create() {
        this.cameras.main.setBackgroundColor('#000000');
        const cx = CONFIG.WIDTH / 2;

        // Explosion particles background
        this.particles = [];
        for (let i = 0; i < 40; i++) {
            this.particles.push({
                x: Math.random() * CONFIG.WIDTH,
                y: Math.random() * CONFIG.HEIGHT,
                dx: (Math.random() - 0.5) * 2,
                dy: (Math.random() - 0.5) * 2,
                color: LEVEL_COLORS[Math.floor(Math.random() * LEVEL_COLORS.length)],
                size: 1 + Math.random() * 3,
            });
        }
        this.particleGraphics = this.add.graphics();

        // Game Over title
        this.add.text(cx, 80, 'GAME OVER', {
            fontFamily: 'monospace',
            fontSize: '56px',
            color: '#ff0044',
            stroke: '#880022',
            strokeThickness: 2,
        }).setOrigin(0.5);

        // Stats
        const isNewHigh = this.finalScore >= this.highScore && this.finalScore > 0;

        if (isNewHigh) {
            this.add.text(cx, 150, 'NEW HIGH SCORE!', {
                fontFamily: 'monospace',
                fontSize: '24px',
                color: '#ffff00',
            }).setOrigin(0.5);
        }

        const stats = [
            { label: 'FINAL SCORE', value: this.finalScore.toLocaleString(), color: '#ffff00' },
            { label: 'HIGH SCORE', value: this.highScore.toLocaleString(), color: '#00ff88' },
            { label: 'LEVEL REACHED', value: this.finalLevel.toString(), color: '#4488ff' },
            { label: 'ENEMIES DESTROYED', value: this.enemiesKilled.toString(), color: '#ff4444' },
        ];

        stats.forEach((stat, i) => {
            const y = 200 + i * 55;
            this.add.text(cx, y, stat.label, {
                fontFamily: 'monospace',
                fontSize: '16px',
                color: '#888888',
            }).setOrigin(0.5);
            this.add.text(cx, y + 24, stat.value, {
                fontFamily: 'monospace',
                fontSize: '28px',
                color: stat.color,
            }).setOrigin(0.5);
        });

        // Replay prompt
        this.replayText = this.add.text(cx, 480, 'PRESS ENTER TO PLAY AGAIN', {
            fontFamily: 'monospace',
            fontSize: '20px',
            color: '#ffff00',
        }).setOrigin(0.5);

        this.add.text(cx, 520, 'PRESS M FOR MENU', {
            fontFamily: 'monospace',
            fontSize: '16px',
            color: '#888888',
        }).setOrigin(0.5);

        this.blinkTimer = 0;

        // Input
        this.enterKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);
        this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
        this.mKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.M);
    }

    update(time, delta) {
        this.blinkTimer += delta;
        this.replayText.setAlpha(Math.sin(this.blinkTimer * 0.004) > 0 ? 1 : 0.2);

        // Animate background particles
        const g = this.particleGraphics;
        g.clear();
        for (const p of this.particles) {
            p.x += p.dx;
            p.y += p.dy;
            if (p.x < 0 || p.x > CONFIG.WIDTH) p.dx *= -1;
            if (p.y < 0 || p.y > CONFIG.HEIGHT) p.dy *= -1;
            g.fillStyle(p.color, 0.4);
            g.fillCircle(p.x, p.y, p.size);
        }

        if (Phaser.Input.Keyboard.JustDown(this.enterKey) || Phaser.Input.Keyboard.JustDown(this.spaceKey)) {
            this.scene.start('GameScene', { startLevel: 1 });
        }
        if (Phaser.Input.Keyboard.JustDown(this.mKey)) {
            this.scene.start('MenuScene');
        }
    }
}
