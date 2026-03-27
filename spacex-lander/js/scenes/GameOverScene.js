// SpaceX Lander - Game Over Scene

class GameOverScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameOverScene' });
    }

    init(data) {
        this.result = data.result;
        this.level = data.level || 1;
        this.score = data.score || 0;
        this.lives = data.lives || 0;
    }

    create() {
        const w = CONFIG.WIDTH;
        const h = CONFIG.HEIGHT;
        const result = this.result;

        this._drawBackground();

        if (result.success) {
            this._showLandingSuccess();
        } else {
            this._showCrashReport();
        }

        // Input to continue
        this._canContinue = false;
        this.time.delayedCall(800, () => { this._canContinue = true; });

        this.input.keyboard.on('keydown-ENTER', () => this._continue());
        this.input.keyboard.on('keydown-SPACE', () => this._continue());
        this.input.on('pointerdown', () => this._continue());

        // Prompt
        let promptText;
        if (result.success) {
            promptText = 'PRESS ENTER FOR NEXT MISSION';
        } else if (this.lives > 0) {
            promptText = 'PRESS ENTER TO RETRY';
        } else {
            promptText = 'PRESS ENTER FOR MENU';
        }

        const prompt = this.add.text(w / 2, h - 35, promptText, {
            fontSize: '16px',
            fontFamily: 'Courier New, monospace',
            color: '#66ffaa'
        }).setOrigin(0.5);

        this.tweens.add({
            targets: prompt,
            alpha: { from: 1, to: 0.3 },
            duration: 600,
            yoyo: true,
            repeat: -1
        });
    }

    _showLandingSuccess() {
        const w = CONFIG.WIDTH;
        const r = this.result;

        this.add.text(w / 2, 50, 'THE FALCON HAS LANDED!', {
            fontSize: '32px',
            fontFamily: 'Courier New, monospace',
            color: '#44ff88',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        this.add.text(w / 2, 90, r.onTarget ? '>>> BULLSEYE LANDING <<<' : '>>> SUCCESSFUL RECOVERY <<<', {
            fontSize: '14px',
            fontFamily: 'Courier New, monospace',
            color: '#88ffbb'
        }).setOrigin(0.5);

        const statsX = w / 2 - 140;
        let y = 130;
        const lineH = 24;
        const labelStyle = { fontSize: '14px', fontFamily: 'Courier New, monospace', color: '#bbccdd' };
        const valueStyle = { fontSize: '14px', fontFamily: 'Courier New, monospace', color: '#ffffff' };

        const stats = [
            ['Landing Score', `${r.landingScore}`],
            ['Precision Bonus', `+${r.precisionBonus}`],
            ['Speed Bonus', `+${r.speedBonus}`],
            ['Fuel Bonus', `+${r.fuelBonus}`],
            ['', ''],
            ['MISSION TOTAL', `${r.totalScore}`],
        ];

        stats.forEach(([label, value]) => {
            if (label === '') {
                const g = this.add.graphics();
                g.lineStyle(1, 0x556677, 1);
                g.beginPath();
                g.moveTo(statsX, y + 4);
                g.lineTo(statsX + 280, y + 4);
                g.strokePath();
                y += lineH * 0.5;
                return;
            }
            this.add.text(statsX, y, label, labelStyle);
            this.add.text(statsX + 280, y, value, {
                ...valueStyle,
                color: label === 'MISSION TOTAL' ? '#ffdd44' : '#ffffff'
            }).setOrigin(1, 0);
            y += lineH;
        });

        // Flight data
        y += 12;
        this.add.text(w / 2, y, 'TELEMETRY AT TOUCHDOWN', {
            fontSize: '13px',
            fontFamily: 'Courier New, monospace',
            color: '#66ddff'
        }).setOrigin(0.5);
        y += 22;

        const flightData = [
            ['V-Speed', `${r.vy} (max ${CONFIG.LAND_MAX_VY})`],
            ['H-Speed', `${r.vx} (max ${CONFIG.LAND_MAX_VX})`],
            ['Angle', `${r.angle}\u00B0 (max ${CONFIG.LAND_MAX_ANGLE}\u00B0)`],
            ['Fuel remaining', `${r.fuelRemaining}`],
        ];

        flightData.forEach(([label, value]) => {
            this.add.text(statsX, y, label, { ...labelStyle, fontSize: '12px' });
            this.add.text(statsX + 280, y, value, { ...valueStyle, fontSize: '12px' }).setOrigin(1, 0);
            y += 20;
        });

        // Total score
        y += 12;
        this.add.text(w / 2, y, `TOTAL SCORE: ${r.totalGameScore}`, {
            fontSize: '24px',
            fontFamily: 'Courier New, monospace',
            color: '#ffdd44',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        // High score check
        const highScore = parseInt(localStorage.getItem(CONFIG.HIGH_SCORE_KEY) || '0');
        if (r.totalGameScore >= highScore && r.totalGameScore > 0) {
            const hsText = this.add.text(w / 2, y + 30, 'NEW HIGH SCORE!', {
                fontSize: '18px',
                fontFamily: 'Courier New, monospace',
                color: '#ff6688',
                fontStyle: 'bold'
            }).setOrigin(0.5);

            this.tweens.add({
                targets: hsText,
                alpha: { from: 1, to: 0.5 },
                scale: { from: 1, to: 1.08 },
                duration: 500,
                yoyo: true,
                repeat: -1,
                ease: 'Sine.easeInOut'
            });
        }
    }

    _showCrashReport() {
        const w = CONFIG.WIDTH;
        const r = this.result;

        const titleColor = this.lives > 0 ? '#ff8844' : '#ff4466';
        const titleStr = this.lives > 0 ? 'RAPID UNSCHEDULED DISASSEMBLY' : 'MISSION FAILED';

        const titleText = this.add.text(w / 2, 75, titleStr, {
            fontSize: this.lives > 0 ? '24px' : '36px',
            fontFamily: 'Courier New, monospace',
            color: titleColor,
            fontStyle: 'bold'
        }).setOrigin(0.5);

        this.tweens.add({
            targets: titleText,
            alpha: { from: 1, to: 0.6 },
            duration: 100,
            yoyo: true,
            repeat: 4,
            onComplete: () => titleText.setAlpha(1)
        });

        // Crash reasons
        const reasons = [];
        if (r.surface === 'water') reasons.push('Missed the drone ship');
        if (parseFloat(r.vy) >= CONFIG.LAND_MAX_VY) reasons.push('Vertical speed too high');
        if (parseFloat(r.vx) >= CONFIG.LAND_MAX_VX) reasons.push('Horizontal speed too high');
        if (parseFloat(r.angle) >= CONFIG.LAND_MAX_ANGLE) reasons.push('Approach angle too steep');
        if (!r.legsDeployed && r.surface !== 'water') reasons.push('Landing legs not deployed');
        if (reasons.length === 0) reasons.push('Impact exceeded structural limits');

        this.add.text(w / 2, 125, 'FAILURE ANALYSIS', {
            fontSize: '16px',
            fontFamily: 'Courier New, monospace',
            color: '#ffaa66'
        }).setOrigin(0.5);

        reasons.forEach((reason, i) => {
            this.add.text(w / 2, 155 + i * 22, `\u2022 ${reason}`, {
                fontSize: '13px',
                fontFamily: 'Courier New, monospace',
                color: '#ffcc88'
            }).setOrigin(0.5);
        });

        let y = 155 + reasons.length * 22 + 25;

        const statsX = w / 2 - 130;
        const labelStyle = { fontSize: '13px', fontFamily: 'Courier New, monospace', color: '#bbccdd' };
        const valueStyle = { fontSize: '13px', fontFamily: 'Courier New, monospace', color: '#ffffff' };

        this.add.text(w / 2, y, 'TELEMETRY AT IMPACT', {
            fontSize: '14px',
            fontFamily: 'Courier New, monospace',
            color: '#ffaa66'
        }).setOrigin(0.5);
        y += 28;

        const data = [
            ['V-Speed', `${r.vy} (safe: <${CONFIG.LAND_MAX_VY})`, parseFloat(r.vy) >= CONFIG.LAND_MAX_VY],
            ['H-Speed', `${r.vx} (safe: <${CONFIG.LAND_MAX_VX})`, parseFloat(r.vx) >= CONFIG.LAND_MAX_VX],
            ['Angle', `${r.angle}\u00B0 (safe: <${CONFIG.LAND_MAX_ANGLE}\u00B0)`, parseFloat(r.angle) >= CONFIG.LAND_MAX_ANGLE],
        ];

        data.forEach(([label, value, bad]) => {
            this.add.text(statsX, y, label, labelStyle);
            this.add.text(statsX + 260, y, value, {
                ...valueStyle,
                color: bad ? '#ff6666' : '#88ffaa'
            }).setOrigin(1, 0);
            y += 24;
        });

        y += 20;

        if (this.lives > 0) {
            this.add.text(w / 2, y, `VEHICLES REMAINING: ${this.lives}`, {
                fontSize: '20px',
                fontFamily: 'Courier New, monospace',
                color: '#ffdd44',
                fontStyle: 'bold'
            }).setOrigin(0.5);
        } else {
            this.add.text(w / 2, y, 'PROGRAM TERMINATED', {
                fontSize: '28px',
                fontFamily: 'Courier New, monospace',
                color: '#ff4466',
                fontStyle: 'bold'
            }).setOrigin(0.5);

            y += 35;
            this.add.text(w / 2, y, `FINAL SCORE: ${r.totalGameScore}`, {
                fontSize: '22px',
                fontFamily: 'Courier New, monospace',
                color: '#ffdd44',
                fontStyle: 'bold'
            }).setOrigin(0.5);

            const highScore = parseInt(localStorage.getItem(CONFIG.HIGH_SCORE_KEY) || '0');
            if (r.totalGameScore >= highScore && r.totalGameScore > 0) {
                const hsText = this.add.text(w / 2, y + 30, 'NEW HIGH SCORE!', {
                    fontSize: '16px',
                    fontFamily: 'Courier New, monospace',
                    color: '#ff6688',
                    fontStyle: 'bold'
                }).setOrigin(0.5);

                this.tweens.add({
                    targets: hsText,
                    alpha: { from: 1, to: 0.5 },
                    scale: { from: 1, to: 1.08 },
                    duration: 500,
                    yoyo: true,
                    repeat: -1,
                    ease: 'Sine.easeInOut'
                });
            }
        }
    }

    _continue() {
        if (!this._canContinue) return;
        this._canContinue = false;

        if (window.audioManager) {
            window.audioManager.playBeep(550, 0.1);
        }

        if (this.result.success) {
            // Next level via launch cinematic
            this.scene.start('LaunchScene', {
                level: this.level + 1,
                score: this.score,
                lives: this.lives
            });
        } else if (this.lives > 0) {
            // Retry same level via launch cinematic
            this.scene.start('LaunchScene', {
                level: this.level,
                score: this.score,
                lives: this.lives
            });
        } else {
            this.scene.start('MenuScene');
        }
    }

    _drawBackground() {
        const g = this.add.graphics();
        const w = CONFIG.WIDTH;
        const h = CONFIG.HEIGHT;

        for (let i = 0; i < h; i++) {
            const t = i / h;
            const r = Math.floor(5 + t * 15);
            const gr = Math.floor(5 + t * 12);
            const b = Math.floor(15 + t * 25);
            g.fillStyle(Phaser.Display.Color.GetColor(r, gr, b), 1);
            g.fillRect(0, i, w, 1);
        }

        // Stars
        CONFIG.VFX.STAR_LAYERS.forEach(layer => {
            for (let i = 0; i < layer.count; i++) {
                g.fillStyle(0xffffff, layer.alphaMin + Math.random() * (layer.alphaMax - layer.alphaMin));
                g.fillCircle(Math.random() * w, Math.random() * h,
                    layer.sizeMin + Math.random() * (layer.sizeMax - layer.sizeMin));
            }
        });
    }
}
