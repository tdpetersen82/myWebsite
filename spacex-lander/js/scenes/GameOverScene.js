// SpaceX Lander - Game Over Scene (Modern, clean SpaceX aesthetic)

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

        // Bottom button
        let btnLabel;
        if (result.success) {
            btnLabel = 'NEXT MISSION';
        } else if (this.lives > 0) {
            btnLabel = 'RETRY MISSION';
        } else {
            btnLabel = 'RETURN TO BASE';
        }

        const btnW = 200;
        const btnH = 34;
        const btnX = w / 2 - btnW / 2;
        const btnY = h - 45;

        const btnG = this.add.graphics();
        const btnColor = result.success ? 0x0066ff : (this.lives > 0 ? 0xff6600 : 0x0066ff);
        btnG.fillStyle(btnColor, 1);
        btnG.fillRoundedRect(btnX, btnY, btnW, btnH, 4);
        btnG.fillStyle(0xffffff, 0.08);
        btnG.fillRoundedRect(btnX, btnY, btnW, btnH / 2, { tl: 4, tr: 4, bl: 0, br: 0 });

        this.add.text(w / 2, btnY + btnH / 2, btnLabel, {
            fontSize: '12px',
            fontFamily: 'Arial, Helvetica, sans-serif',
            color: '#ffffff',
            fontStyle: 'bold',
            letterSpacing: 2
        }).setOrigin(0.5);

        this.tweens.add({
            targets: btnG,
            alpha: { from: 1, to: 0.8 },
            duration: 1000,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });
    }

    _showLandingSuccess() {
        const w = CONFIG.WIDTH;
        const r = this.result;

        // Green accent line at top
        const accentG = this.add.graphics();
        accentG.fillStyle(0x00cc66, 0.8);
        accentG.fillRect(0, 0, w, 2);
        for (let i = 0; i < 15; i++) {
            accentG.fillStyle(0x00cc66, 0.03 * (1 - i / 15));
            accentG.fillRect(0, 2 + i, w, 1);
        }

        // Status indicator
        this.add.text(w / 2, 35, 'MISSION STATUS', {
            fontSize: '9px',
            fontFamily: 'Arial, Helvetica, sans-serif',
            color: '#556677',
            letterSpacing: 3
        }).setOrigin(0.5);

        this.add.text(w / 2, 60, 'THE FALCON HAS LANDED', {
            fontSize: '28px',
            fontFamily: 'Arial, Helvetica, sans-serif',
            color: '#ffffff',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        const tagline = r.onTarget ? 'BULLSEYE LANDING' : 'SUCCESSFUL RECOVERY';
        this.add.text(w / 2, 90, tagline, {
            fontSize: '11px',
            fontFamily: 'Arial, Helvetica, sans-serif',
            color: '#00cc66',
            letterSpacing: 3
        }).setOrigin(0.5);

        // Score card panel
        const panelX = w / 2 - 160;
        const panelW = 320;
        const panelY = 115;
        const panelG = this.add.graphics();
        panelG.fillStyle(0xffffff, 0.04);
        panelG.fillRoundedRect(panelX, panelY, panelW, 150, 4);
        panelG.lineStyle(1, 0xffffff, 0.08);
        panelG.strokeRoundedRect(panelX, panelY, panelW, 150, 4);

        this.add.text(panelX + 12, panelY + 10, 'SCORE BREAKDOWN', {
            fontSize: '8px',
            fontFamily: 'Arial, Helvetica, sans-serif',
            color: '#0088ff',
            letterSpacing: 2
        });

        const labelStyle = { fontSize: '12px', fontFamily: 'Arial, Helvetica, sans-serif', color: '#8899aa' };
        const valueStyle = { fontSize: '12px', fontFamily: 'Arial, Helvetica, sans-serif', color: '#ffffff' };
        let y = panelY + 32;
        const lineH = 22;

        const stats = [
            ['Landing Score', `${r.landingScore}`],
            ['Precision Bonus', `+${r.precisionBonus}`],
            ['Speed Bonus', `+${r.speedBonus}`],
            ['Fuel Bonus', `+${r.fuelBonus}`],
        ];

        stats.forEach(([label, value]) => {
            this.add.text(panelX + 15, y, label, labelStyle);
            this.add.text(panelX + panelW - 15, y, value, valueStyle).setOrigin(1, 0);
            y += lineH;
        });

        // Divider
        panelG.fillStyle(0xffffff, 0.06);
        panelG.fillRect(panelX + 12, y + 2, panelW - 24, 1);
        y += 12;

        this.add.text(panelX + 15, y, 'MISSION TOTAL', {
            fontSize: '13px', fontFamily: 'Arial, Helvetica, sans-serif', color: '#ffffff', fontStyle: 'bold'
        });
        this.add.text(panelX + panelW - 15, y, `${r.totalScore}`, {
            fontSize: '13px', fontFamily: 'Arial, Helvetica, sans-serif', color: '#00cc66', fontStyle: 'bold'
        }).setOrigin(1, 0);

        // Telemetry panel
        const telY = panelY + 162;
        const telG = this.add.graphics();
        telG.fillStyle(0xffffff, 0.04);
        telG.fillRoundedRect(panelX, telY, panelW, 105, 4);
        telG.lineStyle(1, 0xffffff, 0.08);
        telG.strokeRoundedRect(panelX, telY, panelW, 105, 4);

        this.add.text(panelX + 12, telY + 10, 'TELEMETRY AT TOUCHDOWN', {
            fontSize: '8px',
            fontFamily: 'Arial, Helvetica, sans-serif',
            color: '#0088ff',
            letterSpacing: 2
        });

        y = telY + 30;
        const telData = [
            ['V-Speed', `${r.vy}`, `max ${CONFIG.LAND_MAX_VY}`],
            ['H-Speed', `${r.vx}`, `max ${CONFIG.LAND_MAX_VX}`],
            ['Angle', `${r.angle}\u00B0`, `max ${CONFIG.LAND_MAX_ANGLE}\u00B0`],
            ['Fuel', `${r.fuelRemaining}`, ''],
        ];

        telData.forEach(([label, value, limit]) => {
            this.add.text(panelX + 15, y, label, { ...labelStyle, fontSize: '11px' });
            this.add.text(panelX + panelW / 2 + 20, y, value, { ...valueStyle, fontSize: '11px' }).setOrigin(0.5, 0);
            if (limit) {
                this.add.text(panelX + panelW - 15, y, limit, {
                    fontSize: '9px', fontFamily: 'Arial, Helvetica, sans-serif', color: '#556677'
                }).setOrigin(1, 0);
            }
            y += 18;
        });

        // Total score
        y = telY + 120;
        this.add.text(w / 2, y, 'TOTAL SCORE', {
            fontSize: '9px',
            fontFamily: 'Arial, Helvetica, sans-serif',
            color: '#556677',
            letterSpacing: 2
        }).setOrigin(0.5);

        this.add.text(w / 2, y + 20, `${r.totalGameScore}`, {
            fontSize: '32px',
            fontFamily: 'Arial, Helvetica, sans-serif',
            color: '#ffffff',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        // High score check
        const highScore = parseInt(localStorage.getItem(CONFIG.HIGH_SCORE_KEY) || '0');
        if (r.totalGameScore >= highScore && r.totalGameScore > 0) {
            const hsText = this.add.text(w / 2, y + 52, 'NEW HIGH SCORE', {
                fontSize: '11px',
                fontFamily: 'Arial, Helvetica, sans-serif',
                color: '#00cc66',
                fontStyle: 'bold',
                letterSpacing: 3
            }).setOrigin(0.5);

            this.tweens.add({
                targets: hsText,
                alpha: { from: 1, to: 0.5 },
                duration: 600,
                yoyo: true,
                repeat: -1,
                ease: 'Sine.easeInOut'
            });
        }
    }

    _showCrashReport() {
        const w = CONFIG.WIDTH;
        const r = this.result;

        // Red/orange accent line
        const accentColor = this.lives > 0 ? 0xff6600 : 0xff2244;
        const accentG = this.add.graphics();
        accentG.fillStyle(accentColor, 0.8);
        accentG.fillRect(0, 0, w, 2);
        for (let i = 0; i < 15; i++) {
            accentG.fillStyle(accentColor, 0.03 * (1 - i / 15));
            accentG.fillRect(0, 2 + i, w, 1);
        }

        this.add.text(w / 2, 35, 'MISSION STATUS', {
            fontSize: '9px',
            fontFamily: 'Arial, Helvetica, sans-serif',
            color: '#556677',
            letterSpacing: 3
        }).setOrigin(0.5);

        const titleStr = this.lives > 0 ? 'RAPID UNSCHEDULED\nDISASSEMBLY' : 'MISSION FAILED';
        const titleText = this.add.text(w / 2, this.lives > 0 ? 68 : 60, titleStr, {
            fontSize: this.lives > 0 ? '22px' : '30px',
            fontFamily: 'Arial, Helvetica, sans-serif',
            color: this.lives > 0 ? '#ff8844' : '#ff4466',
            fontStyle: 'bold',
            align: 'center'
        }).setOrigin(0.5);

        // Brief flash effect
        this.tweens.add({
            targets: titleText,
            alpha: { from: 0, to: 1 },
            duration: 200
        });

        // Failure analysis panel
        const reasons = [];
        if (r.surface === 'water') reasons.push('Missed the drone ship');
        if (parseFloat(r.vy) >= CONFIG.LAND_MAX_VY) reasons.push('Vertical speed exceeded limits');
        if (parseFloat(r.vx) >= CONFIG.LAND_MAX_VX) reasons.push('Horizontal speed exceeded limits');
        if (parseFloat(r.angle) >= CONFIG.LAND_MAX_ANGLE) reasons.push('Approach angle too steep');
        if (!r.legsDeployed && r.surface !== 'water') reasons.push('Landing legs not deployed');
        if (reasons.length === 0) reasons.push('Impact exceeded structural limits');

        const panelX = w / 2 - 160;
        const panelW = 320;
        const panelY = this.lives > 0 ? 105 : 100;
        const panelH = 40 + reasons.length * 20;
        const panelG = this.add.graphics();
        panelG.fillStyle(0xff4444, 0.04);
        panelG.fillRoundedRect(panelX, panelY, panelW, panelH, 4);
        panelG.lineStyle(1, 0xff4444, 0.1);
        panelG.strokeRoundedRect(panelX, panelY, panelW, panelH, 4);

        this.add.text(panelX + 12, panelY + 10, 'FAILURE ANALYSIS', {
            fontSize: '8px',
            fontFamily: 'Arial, Helvetica, sans-serif',
            color: '#ff6644',
            letterSpacing: 2
        });

        reasons.forEach((reason, i) => {
            this.add.text(panelX + 15, panelY + 30 + i * 20, `\u2022  ${reason}`, {
                fontSize: '11px',
                fontFamily: 'Arial, Helvetica, sans-serif',
                color: '#ccaa88'
            });
        });

        // Telemetry panel
        let telY = panelY + panelH + 12;
        const telG = this.add.graphics();
        telG.fillStyle(0xffffff, 0.04);
        telG.fillRoundedRect(panelX, telY, panelW, 90, 4);
        telG.lineStyle(1, 0xffffff, 0.08);
        telG.strokeRoundedRect(panelX, telY, panelW, 90, 4);

        this.add.text(panelX + 12, telY + 10, 'TELEMETRY AT IMPACT', {
            fontSize: '8px',
            fontFamily: 'Arial, Helvetica, sans-serif',
            color: '#ff8844',
            letterSpacing: 2
        });

        let y = telY + 30;
        const data = [
            ['V-Speed', `${r.vy}`, `safe <${CONFIG.LAND_MAX_VY}`, parseFloat(r.vy) >= CONFIG.LAND_MAX_VY],
            ['H-Speed', `${r.vx}`, `safe <${CONFIG.LAND_MAX_VX}`, parseFloat(r.vx) >= CONFIG.LAND_MAX_VX],
            ['Angle', `${r.angle}\u00B0`, `safe <${CONFIG.LAND_MAX_ANGLE}\u00B0`, parseFloat(r.angle) >= CONFIG.LAND_MAX_ANGLE],
        ];

        data.forEach(([label, value, limit, bad]) => {
            this.add.text(panelX + 15, y, label, {
                fontSize: '11px', fontFamily: 'Arial, Helvetica, sans-serif', color: '#8899aa'
            });
            this.add.text(panelX + panelW / 2 + 10, y, value, {
                fontSize: '11px', fontFamily: 'Arial, Helvetica, sans-serif',
                color: bad ? '#ff5555' : '#66cc88'
            }).setOrigin(0.5, 0);
            this.add.text(panelX + panelW - 15, y, limit, {
                fontSize: '9px', fontFamily: 'Arial, Helvetica, sans-serif', color: '#556677'
            }).setOrigin(1, 0);
            y += 20;
        });

        // Bottom status
        y = telY + 105;

        if (this.lives > 0) {
            this.add.text(w / 2, y, 'VEHICLES REMAINING', {
                fontSize: '9px',
                fontFamily: 'Arial, Helvetica, sans-serif',
                color: '#556677',
                letterSpacing: 2
            }).setOrigin(0.5);

            // Life indicators (clean circles)
            const lifeG = this.add.graphics();
            for (let i = 0; i < CONFIG.STARTING_LIVES; i++) {
                const lx = w / 2 - (CONFIG.STARTING_LIVES - 1) * 12 + i * 24;
                if (i < this.lives) {
                    lifeG.fillStyle(0x0088ff, 1);
                    lifeG.fillCircle(lx, y + 22, 6);
                    lifeG.fillStyle(0xffffff, 0.2);
                    lifeG.fillCircle(lx, y + 20, 3);
                } else {
                    lifeG.lineStyle(1, 0x444455, 0.5);
                    lifeG.strokeCircle(lx, y + 22, 6);
                }
            }
        } else {
            this.add.text(w / 2, y, 'PROGRAM TERMINATED', {
                fontSize: '20px',
                fontFamily: 'Arial, Helvetica, sans-serif',
                color: '#ff4466',
                fontStyle: 'bold'
            }).setOrigin(0.5);

            y += 35;
            this.add.text(w / 2, y, 'FINAL SCORE', {
                fontSize: '9px',
                fontFamily: 'Arial, Helvetica, sans-serif',
                color: '#556677',
                letterSpacing: 2
            }).setOrigin(0.5);

            this.add.text(w / 2, y + 20, `${r.totalGameScore}`, {
                fontSize: '28px',
                fontFamily: 'Arial, Helvetica, sans-serif',
                color: '#ffffff',
                fontStyle: 'bold'
            }).setOrigin(0.5);

            const highScore = parseInt(localStorage.getItem(CONFIG.HIGH_SCORE_KEY) || '0');
            if (r.totalGameScore >= highScore && r.totalGameScore > 0) {
                const hsText = this.add.text(w / 2, y + 48, 'NEW HIGH SCORE', {
                    fontSize: '11px',
                    fontFamily: 'Arial, Helvetica, sans-serif',
                    color: '#00cc66',
                    fontStyle: 'bold',
                    letterSpacing: 3
                }).setOrigin(0.5);

                this.tweens.add({
                    targets: hsText,
                    alpha: { from: 1, to: 0.5 },
                    duration: 600,
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
            this.scene.start('LaunchScene', {
                level: this.level + 1,
                score: this.score,
                lives: this.lives
            });
        } else if (this.lives > 0) {
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

        // Clean dark gradient
        for (let i = 0; i < h; i++) {
            const t = i / h;
            const r = Math.floor(8 + t * 4);
            const gr = Math.floor(10 + t * 5);
            const b = Math.floor(14 + t * 8);
            g.fillStyle(Phaser.Display.Color.GetColor(r, gr, b), 1);
            g.fillRect(0, i, w, 1);
        }

        // Subtle grid
        g.lineStyle(1, 0xffffff, 0.015);
        for (let x = 0; x < w; x += 40) {
            g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.strokePath();
        }
        for (let y = 0; y < h; y += 40) {
            g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.strokePath();
        }
    }
}
