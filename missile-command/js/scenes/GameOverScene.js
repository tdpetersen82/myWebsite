// ============================================================
// Missile Command — Game Over Scene
// ============================================================

class GameOverScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameOverScene' });
    }

    init(data) {
        this.finalScore = data.score || 0;
        this.waveReached = data.wave || 1;
        this.missilesFired = data.missilesFired || 0;
        this.enemiesDestroyed = data.enemiesDestroyed || 0;
        this.citiesSaved = data.citiesSaved || 0;
        this.highestCombo = data.highestCombo || 0;
        this.difficulty = data.difficulty || 'NORMAL';
        this.isNewHighScore = data.isNewHighScore || false;
        this.totalMoneyEarned = data.totalMoneyEarned || 0;
        this.upgradesPurchased = data.upgradesPurchased || 0;
    }

    create() {
        this.cameras.main.fadeIn(500, 0, 0, 0);

        const cx = CONFIG.WIDTH / 2;

        // Gradient sky background
        this.skyGraphics = this.add.graphics();
        this._drawGradientSky();

        // Background (for stars animation)
        this.bgGfx = this.add.graphics();

        // Stars
        this.stars = [];
        for (let i = 0; i < 80; i++) {
            this.stars.push({
                x: Math.random() * CONFIG.WIDTH,
                y: Math.random() * CONFIG.HEIGHT * 0.7,
                brightness: Math.random(),
            });
        }

        // Moon
        this.moonGraphics = this.add.graphics();
        this._drawMoon(680, 60, 25);

        // Mountain silhouettes
        this.mountainGraphics = this.add.graphics();
        this._drawMountains();

        // Ground (dark, destroyed)
        this.groundGraphics = this.add.graphics();
        this.groundGraphics.fillStyle(0x0d1a0d, 1);
        this.groundGraphics.fillRect(0, CONFIG.GROUND_Y, CONFIG.WIDTH, CONFIG.HEIGHT - CONFIG.GROUND_Y);

        // Debris particles (static decoration)
        this.debrisGfx = this.add.graphics();
        for (let i = 0; i < 20; i++) {
            this.debrisGfx.fillStyle(
                Helpers.randomChoice([0x444444, 0x555555, 0x663300, 0x883300]),
                Helpers.randomRange(0.2, 0.5)
            );
            this.debrisGfx.fillRect(
                Helpers.randomRange(50, CONFIG.WIDTH - 50),
                Helpers.randomRange(CONFIG.GROUND_Y - 20, CONFIG.GROUND_Y + 10),
                Helpers.randomRange(3, 10),
                Helpers.randomRange(2, 6)
            );
        }

        // Small fires
        this.firePositions = [];
        for (let i = 0; i < 5; i++) {
            this.firePositions.push({
                x: Helpers.randomRange(100, CONFIG.WIDTH - 100),
                y: CONFIG.GROUND_Y - Helpers.randomRange(0, 10),
            });
        }
        this.fireGfx = this.add.graphics();

        // Title
        this.add.text(cx, 50, 'GAME OVER', {
            fontSize: '48px',
            fontFamily: 'monospace',
            color: '#ff4400',
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 4,
        }).setOrigin(0.5);

        // New high score
        if (this.isNewHighScore) {
            const hsText = this.add.text(cx, 95, 'NEW HIGH SCORE!', {
                fontSize: '18px',
                fontFamily: 'monospace',
                color: '#ffdd57',
                fontStyle: 'bold',
            }).setOrigin(0.5);

            this.tweens.add({
                targets: hsText,
                alpha: 0.3,
                yoyo: true,
                repeat: -1,
                duration: 500,
            });
        }

        // Score
        this.add.text(cx, 130, Helpers.formatNumber(this.finalScore), {
            fontSize: '36px',
            fontFamily: 'monospace',
            color: '#ffdd57',
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 3,
        }).setOrigin(0.5);

        // Stats
        const statsY = 180;
        const stats = [
            ['Waves Survived', this.waveReached],
            ['Missiles Fired', this.missilesFired],
            ['Enemies Destroyed', this.enemiesDestroyed],
            ['Accuracy', this.missilesFired > 0 ?
                Math.round((this.enemiesDestroyed / this.missilesFired) * 100) + '%' : 'N/A'],
            ['Cities Saved', this.citiesSaved + ' / 6'],
            ['Money Earned', '$' + Helpers.formatNumber(this.totalMoneyEarned)],
            ['Highest Combo', this.highestCombo + 'x'],
            ['Difficulty', CONFIG.DIFFICULTY[this.difficulty].label],
        ];

        stats.forEach(([label, value], i) => {
            const y = statsY + i * 24;
            this.add.text(cx - 130, y, label, {
                fontSize: '13px',
                fontFamily: 'monospace',
                color: '#888888',
            });
            this.add.text(cx + 130, y, String(value), {
                fontSize: '13px',
                fontFamily: 'monospace',
                color: '#ffffff',
                fontStyle: 'bold',
            }).setOrigin(1, 0);
        });

        // Separator
        const sepY = statsY + stats.length * 24 + 10;
        this.add.graphics().lineStyle(1, 0x333333, 0.5)
            .lineBetween(cx - 140, sepY, cx + 140, sepY);

        // Buttons
        const btnY = sepY + 40;

        const playAgainBtn = this.add.text(cx, btnY, '[ PLAY AGAIN ]', {
            fontSize: '22px',
            fontFamily: 'monospace',
            color: '#44ff44',
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 2,
            padding: { x: 15, y: 8 },
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });

        playAgainBtn.on('pointerover', () => playAgainBtn.setColor('#88ff88'));
        playAgainBtn.on('pointerout', () => playAgainBtn.setColor('#44ff44'));
        playAgainBtn.on('pointerdown', () => {
            audioManager.playMenuSelect();
            this.cameras.main.fadeOut(400, 0, 0, 0);
            this.time.delayedCall(400, () => {
                this.scene.start('GameScene', { difficulty: this.difficulty });
            });
        });

        const menuBtn = this.add.text(cx, btnY + 45, '[ MAIN MENU ]', {
            fontSize: '16px',
            fontFamily: 'monospace',
            color: '#888888',
            padding: { x: 10, y: 6 },
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });

        menuBtn.on('pointerover', () => menuBtn.setColor('#aaaaaa'));
        menuBtn.on('pointerout', () => menuBtn.setColor('#888888'));
        menuBtn.on('pointerdown', () => {
            audioManager.playMenuSelect();
            this.cameras.main.fadeOut(400, 0, 0, 0);
            this.time.delayedCall(400, () => {
                this.scene.start('MenuScene');
            });
        });

        // High scores table
        this._drawHighScores(cx, btnY + 100);
    }

    _drawHighScores(cx, startY) {
        this.add.text(cx, startY, 'TOP SCORES', {
            fontSize: '12px',
            fontFamily: 'monospace',
            color: '#666666',
        }).setOrigin(0.5);

        try {
            const scores = JSON.parse(localStorage.getItem('missileCommandScores') || '[]');
            for (let i = 0; i < Math.min(5, scores.length); i++) {
                const entry = scores[i];
                const y = startY + 18 + i * 16;
                const text = `${(i + 1)}. ${Helpers.formatNumber(entry.score).padStart(10)}  W${entry.wave}  ${entry.difficulty || ''}`;
                const isThisGame = entry.score === this.finalScore;
                this.add.text(cx, y, text, {
                    fontSize: '11px',
                    fontFamily: 'monospace',
                    color: isThisGame ? '#ffdd57' : '#555555',
                }).setOrigin(0.5);
            }
        } catch (e) {}
    }

    _drawGradientSky() {
        const g = this.skyGraphics;
        const bands = [
            { y: 0, h: CONFIG.HEIGHT * 0.25, color: 0x050520 },
            { y: CONFIG.HEIGHT * 0.25, h: CONFIG.HEIGHT * 0.25, color: 0x0a0a3e },
            { y: CONFIG.HEIGHT * 0.5, h: CONFIG.HEIGHT * 0.25, color: 0x1a1050 },
            { y: CONFIG.HEIGHT * 0.75, h: CONFIG.HEIGHT * 0.25, color: 0x2a1848 },
        ];
        for (const band of bands) {
            g.fillStyle(band.color, 1);
            g.fillRect(0, band.y, CONFIG.WIDTH, band.h + 1);
        }
        // Smooth blending between bands
        const blendPairs = [
            { y: CONFIG.HEIGHT * 0.25, color: 0x080830 },
            { y: CONFIG.HEIGHT * 0.5, color: 0x120d44 },
            { y: CONFIG.HEIGHT * 0.75, color: 0x221440 },
        ];
        for (const bp of blendPairs) {
            g.fillStyle(bp.color, 0.5);
            g.fillRect(0, bp.y - 10, CONFIG.WIDTH, 20);
        }
    }

    _drawMoon(mx, my, radius) {
        const g = this.moonGraphics;
        // Outer glow
        g.fillStyle(0xccccff, 0.05);
        g.fillCircle(mx, my, radius * 2.5);
        g.fillStyle(0xccccff, 0.08);
        g.fillCircle(mx, my, radius * 1.8);
        // Moon body
        g.fillStyle(0xddddee, 0.9);
        g.fillCircle(mx, my, radius);
        // Slight shadow for crescent effect
        g.fillStyle(0x050520, 0.3);
        g.fillCircle(mx + radius * 0.3, my - radius * 0.1, radius * 0.85);
    }

    _drawMountains() {
        const g = this.mountainGraphics;
        const baseY = CONFIG.GROUND_Y;

        for (const range of CONFIG.MOUNTAINS) {
            g.fillStyle(0x0d1a2a, 0.8);
            g.beginPath();
            g.moveTo(range.x, baseY);
            for (const peak of range.peaks) {
                g.lineTo(range.x + peak.x, baseY - peak.h);
            }
            const lastPeak = range.peaks[range.peaks.length - 1];
            g.lineTo(range.x + lastPeak.x + 40, baseY);
            g.closePath();
            g.fillPath();
        }
    }

    update(time) {
        // Animated fires
        this.fireGfx.clear();
        for (const fire of this.firePositions) {
            const flicker = Math.sin(time * 0.01 + fire.x) * 3;
            this.fireGfx.fillStyle(0xff4400, 0.3 + Math.random() * 0.2);
            this.fireGfx.fillCircle(fire.x, fire.y - 5 + flicker, 4 + Math.random() * 3);
            this.fireGfx.fillStyle(0xff8800, 0.2 + Math.random() * 0.15);
            this.fireGfx.fillCircle(fire.x + flicker, fire.y - 10, 3 + Math.random() * 2);
        }

        // Stars
        this.bgGfx.clear();

        for (const star of this.stars) {
            const flicker = Math.sin(time * 0.002 + star.brightness * 10) * 0.3 + 0.7;
            this.bgGfx.fillStyle(0xffffff, star.brightness * flicker * 0.4);
            this.bgGfx.fillCircle(star.x, star.y, star.brightness * 1.2);
        }
    }
}
