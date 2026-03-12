// Lunar Lander - Game Over Scene

class GameOverScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameOverScene' });
    }

    init(data) {
        this.result = data.result;
        this.level = data.level || 1;
        this.score = data.score || 0;
        this.lives = data.lives || 0;
        this.gravityMod = data.gravityMod || 1.0;
        this.fuelMod = data.fuelMod || 1.0;
        this.difficultyKey = data.difficultyKey || 'normal';
    }

    create() {
        const w = CONFIG.WIDTH;
        const h = CONFIG.HEIGHT;
        const result = this.result;

        // Starfield background
        this._drawStarfield();

        if (result.success) {
            this._showLandingSuccess();
        } else {
            this._showCrashReport();
        }

        // Wait for input to continue
        this.input.keyboard.on('keydown-ENTER', () => this._continue());
        this.input.keyboard.on('keydown-SPACE', () => this._continue());
        this.input.on('pointerdown', () => this._continue());

        // Blinking prompt
        const promptY = h - 40;
        let promptText;
        if (result.success) {
            promptText = 'PRESS ENTER FOR NEXT LEVEL';
        } else if (this.lives > 0) {
            promptText = 'PRESS ENTER TO RETRY';
        } else {
            promptText = 'PRESS ENTER FOR MENU';
        }

        const prompt = this.add.text(w / 2, promptY, promptText, {
            fontSize: '16px',
            fontFamily: 'Courier New, monospace',
            color: '#00ff00'
        }).setOrigin(0.5);

        this.tweens.add({
            targets: prompt,
            alpha: 0.2,
            duration: 500,
            yoyo: true,
            repeat: -1
        });
    }

    _showLandingSuccess() {
        const w = CONFIG.WIDTH;
        const r = this.result;

        this.add.text(w / 2, 60, 'LANDING SUCCESSFUL!', {
            fontSize: '36px',
            fontFamily: 'Courier New, monospace',
            color: '#00ff00',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        // Eagle icon
        this.add.text(w / 2, 110, '>>> EAGLE HAS LANDED <<<', {
            fontSize: '14px',
            fontFamily: 'Courier New, monospace',
            color: '#88ff88'
        }).setOrigin(0.5);

        const statsX = w / 2 - 140;
        let y = 160;
        const lineH = 28;
        const labelStyle = { fontSize: '15px', fontFamily: 'Courier New, monospace', color: '#aaaaaa' };
        const valueStyle = { fontSize: '15px', fontFamily: 'Courier New, monospace', color: '#ffffff' };

        const stats = [
            ['Pad Multiplier', `${r.padMultiplier}X`],
            ['Landing Score', `${r.landingScore}`],
            ['Speed Bonus', `+${r.speedBonus}`],
            ['Fuel Bonus', `+${r.fuelBonus}`],
            ['', ''],
            ['LEVEL TOTAL', `${r.totalScore}`],
        ];

        stats.forEach(([label, value]) => {
            if (label === '') {
                // Separator line
                const g = this.add.graphics();
                g.lineStyle(1, 0x444444, 1);
                g.beginPath();
                g.moveTo(statsX, y + 6);
                g.lineTo(statsX + 280, y + 6);
                g.strokePath();
                y += lineH * 0.6;
                return;
            }
            this.add.text(statsX, y, label, labelStyle);
            this.add.text(statsX + 280, y, value, {
                ...valueStyle,
                color: label === 'LEVEL TOTAL' ? '#ffff00' : '#ffffff'
            }).setOrigin(1, 0);
            y += lineH;
        });

        // Flight data
        y += 20;
        this.add.text(w / 2, y, 'FLIGHT DATA', {
            fontSize: '14px',
            fontFamily: 'Courier New, monospace',
            color: '#00ff00'
        }).setOrigin(0.5);
        y += 25;

        const flightData = [
            ['V-Speed at landing', `${r.vy} (max ${CONFIG.LAND_MAX_VY})`],
            ['H-Speed at landing', `${r.vx} (max ${CONFIG.LAND_MAX_VX})`],
            ['Angle at landing', `${r.angle} (max ${CONFIG.LAND_MAX_ANGLE})`],
            ['Fuel remaining', `${r.fuelRemaining}`],
        ];

        flightData.forEach(([label, value]) => {
            this.add.text(statsX, y, label, { ...labelStyle, fontSize: '12px' });
            this.add.text(statsX + 280, y, value, { ...valueStyle, fontSize: '12px' }).setOrigin(1, 0);
            y += 22;
        });

        // Total score
        y += 15;
        this.add.text(w / 2, y, `TOTAL SCORE: ${r.totalGameScore}`, {
            fontSize: '22px',
            fontFamily: 'Courier New, monospace',
            color: '#ffff00',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        // High score check
        const highScore = parseInt(localStorage.getItem(CONFIG.HIGH_SCORE_KEY) || '0');
        if (r.totalGameScore >= highScore && r.totalGameScore > 0) {
            this.add.text(w / 2, y + 30, 'NEW HIGH SCORE!', {
                fontSize: '16px',
                fontFamily: 'Courier New, monospace',
                color: '#ff4444'
            }).setOrigin(0.5);
        }
    }

    _showCrashReport() {
        const w = CONFIG.WIDTH;
        const r = this.result;

        const titleColor = this.lives > 0 ? '#ff6600' : '#ff0000';
        const titleText = this.lives > 0 ? 'CRASH!' : 'MISSION FAILED';

        this.add.text(w / 2, 80, titleText, {
            fontSize: '40px',
            fontFamily: 'Courier New, monospace',
            color: titleColor,
            fontStyle: 'bold'
        }).setOrigin(0.5);

        // Crash reason analysis
        const reasons = [];
        if (parseFloat(r.vy) >= CONFIG.LAND_MAX_VY) reasons.push('Vertical speed too high');
        if (parseFloat(r.vx) >= CONFIG.LAND_MAX_VX) reasons.push('Horizontal speed too high');
        if (parseFloat(r.angle) >= CONFIG.LAND_MAX_ANGLE) reasons.push('Approach angle too steep');
        if (reasons.length === 0) reasons.push('Missed the landing pad');

        this.add.text(w / 2, 140, 'CRASH ANALYSIS', {
            fontSize: '16px',
            fontFamily: 'Courier New, monospace',
            color: '#ff8844'
        }).setOrigin(0.5);

        reasons.forEach((reason, i) => {
            this.add.text(w / 2, 170 + i * 22, `- ${reason}`, {
                fontSize: '14px',
                fontFamily: 'Courier New, monospace',
                color: '#ff6644'
            }).setOrigin(0.5);
        });

        let y = 170 + reasons.length * 22 + 30;

        // Flight data at crash
        const statsX = w / 2 - 130;
        const labelStyle = { fontSize: '14px', fontFamily: 'Courier New, monospace', color: '#aaaaaa' };
        const valueStyle = { fontSize: '14px', fontFamily: 'Courier New, monospace', color: '#ffffff' };

        this.add.text(w / 2, y, 'FLIGHT DATA AT IMPACT', {
            fontSize: '14px',
            fontFamily: 'Courier New, monospace',
            color: '#ff8844'
        }).setOrigin(0.5);
        y += 30;

        const data = [
            ['V-Speed', `${r.vy} (safe: <${CONFIG.LAND_MAX_VY})`, parseFloat(r.vy) >= CONFIG.LAND_MAX_VY],
            ['H-Speed', `${r.vx} (safe: <${CONFIG.LAND_MAX_VX})`, parseFloat(r.vx) >= CONFIG.LAND_MAX_VX],
            ['Angle', `${r.angle} (safe: <${CONFIG.LAND_MAX_ANGLE})`, parseFloat(r.angle) >= CONFIG.LAND_MAX_ANGLE],
        ];

        data.forEach(([label, value, bad]) => {
            this.add.text(statsX, y, label, labelStyle);
            this.add.text(statsX + 260, y, value, {
                ...valueStyle,
                color: bad ? '#ff4444' : '#88ff88'
            }).setOrigin(1, 0);
            y += 25;
        });

        y += 20;

        if (this.lives > 0) {
            this.add.text(w / 2, y, `LIVES REMAINING: ${this.lives}`, {
                fontSize: '20px',
                fontFamily: 'Courier New, monospace',
                color: '#ffff00'
            }).setOrigin(0.5);
        } else {
            this.add.text(w / 2, y, 'GAME OVER', {
                fontSize: '28px',
                fontFamily: 'Courier New, monospace',
                color: '#ff0000',
                fontStyle: 'bold'
            }).setOrigin(0.5);

            y += 35;
            this.add.text(w / 2, y, `FINAL SCORE: ${r.totalGameScore}`, {
                fontSize: '22px',
                fontFamily: 'Courier New, monospace',
                color: '#ffff00'
            }).setOrigin(0.5);

            const highScore = parseInt(localStorage.getItem(CONFIG.HIGH_SCORE_KEY) || '0');
            if (r.totalGameScore >= highScore && r.totalGameScore > 0) {
                this.add.text(w / 2, y + 30, 'NEW HIGH SCORE!', {
                    fontSize: '16px',
                    fontFamily: 'Courier New, monospace',
                    color: '#ff4444'
                }).setOrigin(0.5);
            }
        }
    }

    _continue() {
        if (window.audioManager) {
            window.audioManager.playBeep(550, 0.1);
        }

        if (this.result.success) {
            // Next level
            this.scene.start('GameScene', {
                gravityMod: this.gravityMod,
                fuelMod: this.fuelMod,
                difficultyKey: this.difficultyKey,
                level: this.level + 1,
                score: this.score,
                lives: this.lives
            });
        } else if (this.lives > 0) {
            // Retry same level
            this.scene.start('GameScene', {
                gravityMod: this.gravityMod,
                fuelMod: this.fuelMod,
                difficultyKey: this.difficultyKey,
                level: this.level,
                score: this.score,
                lives: this.lives
            });
        } else {
            // Back to menu
            this.scene.start('MenuScene');
        }
    }

    _drawStarfield() {
        const g = this.add.graphics();
        g.fillStyle(CONFIG.COLORS.SKY, 1);
        g.fillRect(0, 0, CONFIG.WIDTH, CONFIG.HEIGHT);

        for (let i = 0; i < 100; i++) {
            const x = Math.random() * CONFIG.WIDTH;
            const y = Math.random() * CONFIG.HEIGHT;
            const size = Math.random() * 1.5 + 0.3;
            const alpha = Math.random() * 0.6 + 0.2;
            g.fillStyle(CONFIG.COLORS.STAR, alpha);
            g.fillCircle(x, y, size);
        }
    }
}
