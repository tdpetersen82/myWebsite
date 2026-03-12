// ============================================================
// Missile Command — Menu Scene
// ============================================================

class MenuScene extends Phaser.Scene {
    constructor() {
        super({ key: 'MenuScene' });
    }

    create() {
        this.cameras.main.fadeIn(400, 0, 0, 0);

        const cx = CONFIG.WIDTH / 2;
        const cy = CONFIG.HEIGHT / 2;

        // Starfield background
        this.starGraphics = this.add.graphics();
        this.stars = [];
        for (let i = 0; i < 100; i++) {
            this.stars.push({
                x: Math.random() * CONFIG.WIDTH,
                y: Math.random() * CONFIG.HEIGHT,
                brightness: Math.random(),
                speed: 0.2 + Math.random() * 0.5,
            });
        }

        // Ground
        this.groundGraphics = this.add.graphics();
        this.groundGraphics.fillStyle(0x1a472a, 1);
        this.groundGraphics.fillRect(0, CONFIG.GROUND_Y, CONFIG.WIDTH, CONFIG.HEIGHT - CONFIG.GROUND_Y);

        // Animated missiles in background
        this.bgMissiles = [];
        this.bgExplosions = [];
        this.bgGraphics = this.add.graphics();
        this.bgTimer = 0;

        // Title
        this.add.text(cx, 80, 'MISSILE', {
            fontSize: '64px',
            fontFamily: 'monospace',
            color: '#ff4400',
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 4,
        }).setOrigin(0.5);

        this.add.text(cx, 145, 'COMMAND', {
            fontSize: '64px',
            fontFamily: 'monospace',
            color: '#ffcc00',
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 4,
        }).setOrigin(0.5);

        this.add.text(cx, 190, 'ENHANCED EDITION', {
            fontSize: '14px',
            fontFamily: 'monospace',
            color: '#4488ff',
            fontStyle: 'bold',
        }).setOrigin(0.5);

        // Difficulty selection
        this.selectedDifficulty = 'NORMAL';
        const diffY = 260;

        this.add.text(cx, diffY - 10, 'DIFFICULTY', {
            fontSize: '16px',
            fontFamily: 'monospace',
            color: '#888888',
        }).setOrigin(0.5);

        const difficulties = ['EASY', 'NORMAL', 'HARD'];
        this.diffButtons = [];
        const diffSpacing = 120;

        difficulties.forEach((diff, i) => {
            const bx = cx - diffSpacing + i * diffSpacing;
            const by = diffY + 25;
            const label = CONFIG.DIFFICULTY[diff].label;

            const btn = this.add.text(bx, by, label, {
                fontSize: '18px',
                fontFamily: 'monospace',
                color: diff === 'NORMAL' ? '#ffdd57' : '#666666',
                fontStyle: diff === 'NORMAL' ? 'bold' : 'normal',
                padding: { x: 12, y: 6 },
            }).setOrigin(0.5).setInteractive({ useHandCursor: true });

            btn.diffKey = diff;
            btn.on('pointerover', () => {
                if (btn.diffKey !== this.selectedDifficulty) {
                    btn.setColor('#aaaaaa');
                }
            });
            btn.on('pointerout', () => {
                if (btn.diffKey !== this.selectedDifficulty) {
                    btn.setColor('#666666');
                }
            });
            btn.on('pointerdown', () => {
                this.selectedDifficulty = diff;
                this._updateDiffButtons();
                audioManager.playMenuSelect();
            });

            this.diffButtons.push(btn);
        });

        // Start button
        const startBtn = this.add.text(cx, 350, '[ START GAME ]', {
            fontSize: '28px',
            fontFamily: 'monospace',
            color: '#44ff44',
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 2,
            padding: { x: 20, y: 10 },
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });

        startBtn.on('pointerover', () => startBtn.setColor('#88ff88'));
        startBtn.on('pointerout', () => startBtn.setColor('#44ff44'));
        startBtn.on('pointerdown', () => {
            audioManager.playMenuSelect();
            this.cameras.main.fadeOut(400, 0, 0, 0);
            this.time.delayedCall(400, () => {
                this.scene.start('GameScene', {
                    difficulty: this.selectedDifficulty,
                });
            });
        });

        // Pulse animation on start button
        this.tweens.add({
            targets: startBtn,
            scaleX: 1.05,
            scaleY: 1.05,
            yoyo: true,
            repeat: -1,
            duration: 800,
            ease: 'Sine.easeInOut',
        });

        // High scores
        this._drawHighScores(cx, 410);

        // Controls
        this.add.text(cx, 520, 'CLICK to fire  |  1/2/3 select base  |  P pause  |  M mute', {
            fontSize: '11px',
            fontFamily: 'monospace',
            color: '#555555',
        }).setOrigin(0.5);

        this.add.text(cx, 545, 'Power-ups drop from bombers — click to collect!', {
            fontSize: '11px',
            fontFamily: 'monospace',
            color: '#444455',
        }).setOrigin(0.5);

        // Version
        this.add.text(CONFIG.WIDTH - 10, CONFIG.HEIGHT - 10, 'v2.0', {
            fontSize: '10px',
            fontFamily: 'monospace',
            color: '#333333',
        }).setOrigin(1, 1);
    }

    _updateDiffButtons() {
        this.diffButtons.forEach(btn => {
            if (btn.diffKey === this.selectedDifficulty) {
                btn.setColor('#ffdd57');
                btn.setFontStyle('bold');
            } else {
                btn.setColor('#666666');
                btn.setFontStyle('normal');
            }
        });
    }

    _drawHighScores(cx, startY) {
        this.add.text(cx, startY, 'HIGH SCORES', {
            fontSize: '14px',
            fontFamily: 'monospace',
            color: '#888888',
        }).setOrigin(0.5);

        const scores = this._getHighScores();
        for (let i = 0; i < Math.min(5, scores.length); i++) {
            const entry = scores[i];
            const y = startY + 22 + i * 18;
            const rank = (i + 1) + '.';
            const scoreStr = Helpers.formatNumber(entry.score);
            const diffLabel = entry.difficulty || '';
            const text = `${rank.padEnd(3)} ${scoreStr.padStart(10)}  ${diffLabel}`;
            this.add.text(cx, y, text, {
                fontSize: '12px',
                fontFamily: 'monospace',
                color: i === 0 ? '#ffdd57' : '#666666',
            }).setOrigin(0.5);
        }

        if (scores.length === 0) {
            this.add.text(cx, startY + 22, 'No scores yet — be the first!', {
                fontSize: '12px',
                fontFamily: 'monospace',
                color: '#444444',
            }).setOrigin(0.5);
        }
    }

    _getHighScores() {
        try {
            const data = localStorage.getItem('missileCommandScores');
            return data ? JSON.parse(data) : [];
        } catch (e) {
            return [];
        }
    }

    update(time, delta) {
        const dt = delta / 1000;

        // Stars
        this.starGraphics.clear();
        for (const star of this.stars) {
            const flicker = Math.sin(time * CONFIG.STARS.FLICKER_SPEED + star.brightness * 10) * 0.3 + 0.7;
            this.starGraphics.fillStyle(0xffffff, star.brightness * flicker * 0.6);
            this.starGraphics.fillCircle(star.x, star.y, star.brightness * 1.5);
        }

        // Background missiles
        this.bgTimer += dt;
        if (this.bgTimer > 2) {
            this.bgTimer = 0;
            this.bgMissiles.push({
                x: Helpers.randomRange(50, CONFIG.WIDTH - 50),
                y: 0,
                tx: Helpers.randomRange(100, CONFIG.WIDTH - 100),
                ty: CONFIG.GROUND_Y,
                progress: 0,
            });
        }

        this.bgGraphics.clear();
        for (let i = this.bgMissiles.length - 1; i >= 0; i--) {
            const m = this.bgMissiles[i];
            m.progress += dt * 0.3;
            const mx = Helpers.lerp(m.x, m.tx, m.progress);
            const my = Helpers.lerp(m.y, m.ty, m.progress);
            this.bgGraphics.lineStyle(1, 0xff4400, 0.15);
            this.bgGraphics.lineBetween(m.x, m.y, mx, my);
            this.bgGraphics.fillStyle(0xff4400, 0.3);
            this.bgGraphics.fillCircle(mx, my, 2);

            if (m.progress >= 1) {
                this.bgExplosions.push({ x: m.tx, y: m.ty, radius: 0, maxRadius: 25 });
                this.bgMissiles.splice(i, 1);
            }
        }

        for (let i = this.bgExplosions.length - 1; i >= 0; i--) {
            const e = this.bgExplosions[i];
            e.radius += dt * 60;
            const alpha = Math.max(0, 1 - e.radius / e.maxRadius) * 0.2;
            this.bgGraphics.fillStyle(0xff8800, alpha);
            this.bgGraphics.fillCircle(e.x, e.y, e.radius);
            if (e.radius > e.maxRadius) {
                this.bgExplosions.splice(i, 1);
            }
        }
    }
}
