// Lunar Lander - Game Over Scene (Enhanced with transitions and celebrations)

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

        // Background starfield
        this._drawStarfield();

        // Camera FX
        try {
            this.cameras.main.postFX.addVignette(0.5, 0.5, 0.5);
        } catch (e) {}

        if (result.success) {
            this._showLandingSuccess();
            this._createCelebrationParticles();
        } else {
            this._showCrashReport();
        }

        // Input to continue
        this._canContinue = false;
        this.time.delayedCall(800, () => { this._canContinue = true; });

        this.input.keyboard.on('keydown-ENTER', () => this._continue());
        this.input.keyboard.on('keydown-SPACE', () => this._continue());
        this.input.on('pointerdown', () => this._continue());

        // Blinking prompt with neon glow
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

        try { prompt.postFX.addGlow(0x00ff00, 3, 0, false); } catch (e) {}

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

        const titleText = this.add.text(w / 2, 60, 'LANDING SUCCESSFUL!', {
            fontSize: '36px',
            fontFamily: 'Courier New, monospace',
            color: '#00ff00',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        try { titleText.postFX.addGlow(0x00ff00, 8, 0, false); } catch (e) {}

        // Eagle text
        const eagleText = this.add.text(w / 2, 110, '>>> EAGLE HAS LANDED <<<', {
            fontSize: '14px',
            fontFamily: 'Courier New, monospace',
            color: '#88ff88'
        }).setOrigin(0.5);

        try { eagleText.postFX.addGlow(0x44ff44, 3, 0, false); } catch (e) {}

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
            const valText = this.add.text(statsX + 280, y, value, {
                ...valueStyle,
                color: label === 'LEVEL TOTAL' ? '#ffff00' : '#ffffff'
            }).setOrigin(1, 0);

            if (label === 'LEVEL TOTAL') {
                try { valText.postFX.addGlow(0xffff00, 3, 0, false); } catch (e) {}
            }
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
        const totalText = this.add.text(w / 2, y, `TOTAL SCORE: ${r.totalGameScore}`, {
            fontSize: '22px',
            fontFamily: 'Courier New, monospace',
            color: '#ffff00',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        try { totalText.postFX.addGlow(0xffff00, 4, 0, false); } catch (e) {}

        // High score check
        const highScore = parseInt(localStorage.getItem(CONFIG.HIGH_SCORE_KEY) || '0');
        if (r.totalGameScore >= highScore && r.totalGameScore > 0) {
            const hsText = this.add.text(w / 2, y + 30, 'NEW HIGH SCORE!', {
                fontSize: '16px',
                fontFamily: 'Courier New, monospace',
                color: '#ff4444'
            }).setOrigin(0.5);

            try { hsText.postFX.addGlow(0xff0000, 6, 0, false); } catch (e) {}

            // Pulsing glow
            this.tweens.add({
                targets: hsText,
                alpha: { from: 1, to: 0.5 },
                scale: { from: 1, to: 1.1 },
                duration: 400,
                yoyo: true,
                repeat: -1,
                ease: 'Sine.easeInOut'
            });
        }
    }

    _showCrashReport() {
        const w = CONFIG.WIDTH;
        const r = this.result;

        const titleColor = this.lives > 0 ? '#ff6600' : '#ff0000';
        const titleGlowColor = this.lives > 0 ? 0xff6600 : 0xff0000;
        const titleStr = this.lives > 0 ? 'CRASH!' : 'MISSION FAILED';

        const titleText = this.add.text(w / 2, 80, titleStr, {
            fontSize: '40px',
            fontFamily: 'Courier New, monospace',
            color: titleColor,
            fontStyle: 'bold'
        }).setOrigin(0.5);

        try { titleText.postFX.addGlow(titleGlowColor, 8, 0, false); } catch (e) {}

        // Flickering effect
        this.tweens.add({
            targets: titleText,
            alpha: { from: 1, to: 0.6 },
            duration: 100,
            yoyo: true,
            repeat: 4,
            onComplete: () => titleText.setAlpha(1)
        });

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
            const valText = this.add.text(statsX + 260, y, value, {
                ...valueStyle,
                color: bad ? '#ff4444' : '#88ff88'
            }).setOrigin(1, 0);

            if (bad) {
                try { valText.postFX.addGlow(0xff0000, 2, 0, false); } catch (e) {}
            }
            y += 25;
        });

        y += 20;

        if (this.lives > 0) {
            const livesText = this.add.text(w / 2, y, `LIVES REMAINING: ${this.lives}`, {
                fontSize: '20px',
                fontFamily: 'Courier New, monospace',
                color: '#ffff00'
            }).setOrigin(0.5);

            try { livesText.postFX.addGlow(0xffff00, 3, 0, false); } catch (e) {}
        } else {
            const goText = this.add.text(w / 2, y, 'GAME OVER', {
                fontSize: '28px',
                fontFamily: 'Courier New, monospace',
                color: '#ff0000',
                fontStyle: 'bold'
            }).setOrigin(0.5);

            try { goText.postFX.addGlow(0xff0000, 6, 0, false); } catch (e) {}

            y += 35;
            const scoreText = this.add.text(w / 2, y, `FINAL SCORE: ${r.totalGameScore}`, {
                fontSize: '22px',
                fontFamily: 'Courier New, monospace',
                color: '#ffff00'
            }).setOrigin(0.5);

            try { scoreText.postFX.addGlow(0xffff00, 4, 0, false); } catch (e) {}

            const highScore = parseInt(localStorage.getItem(CONFIG.HIGH_SCORE_KEY) || '0');
            if (r.totalGameScore >= highScore && r.totalGameScore > 0) {
                const hsText = this.add.text(w / 2, y + 30, 'NEW HIGH SCORE!', {
                    fontSize: '16px',
                    fontFamily: 'Courier New, monospace',
                    color: '#ff4444'
                }).setOrigin(0.5);

                try { hsText.postFX.addGlow(0xff0000, 6, 0, false); } catch (e) {}

                this.tweens.add({
                    targets: hsText,
                    alpha: { from: 1, to: 0.5 },
                    scale: { from: 1, to: 1.1 },
                    duration: 400,
                    yoyo: true,
                    repeat: -1,
                    ease: 'Sine.easeInOut'
                });
            }
        }
    }

    _createCelebrationParticles() {
        // Generate texture if needed
        if (!this.textures.exists('vfx_circle')) {
            const g = this.make.graphics({ add: false });
            g.fillStyle(0xffffff, 1);
            g.fillCircle(6, 6, 6);
            g.fillStyle(0xffffff, 0.5);
            g.fillCircle(6, 6, 4);
            g.fillStyle(0xffffff, 1);
            g.fillCircle(6, 6, 2);
            g.generateTexture('vfx_circle', 12, 12);
            g.destroy();
        }

        const fireworks = this.add.particles(0, 0, 'vfx_circle', {
            speed: { min: 60, max: 160 },
            lifespan: 1000,
            scale: { start: 0.5, end: 0 },
            alpha: { start: 0.9, end: 0 },
            tint: CONFIG.VFX.FIREWORK_COLORS,
            blendMode: Phaser.BlendModes.ADD,
            frequency: -1,
            quantity: 30,
            gravityY: 30,
            angle: { min: 0, max: 360 }
        });
        fireworks.setDepth(1);

        // Periodic bursts
        const burstTimer = this.time.addEvent({
            delay: 800,
            repeat: -1,
            callback: () => {
                const x = 100 + Math.random() * (CONFIG.WIDTH - 200);
                const y = 50 + Math.random() * (CONFIG.HEIGHT * 0.5);
                fireworks.emitParticleAt(x, y, 30);
            }
        });
    }

    _continue() {
        if (!this._canContinue) return;
        this._canContinue = false;

        if (window.audioManager) {
            window.audioManager.playBeep(550, 0.1);
        }

        if (this.result.success) {
            this.scene.start('GameScene', {
                gravityMod: this.gravityMod,
                fuelMod: this.fuelMod,
                difficultyKey: this.difficultyKey,
                level: this.level + 1,
                score: this.score,
                lives: this.lives
            });
        } else if (this.lives > 0) {
            this.scene.start('GameScene', {
                gravityMod: this.gravityMod,
                fuelMod: this.fuelMod,
                difficultyKey: this.difficultyKey,
                level: this.level,
                score: this.score,
                lives: this.lives
            });
        } else {
            this.scene.start('MenuScene');
        }
    }

    _drawStarfield() {
        const g = this.add.graphics();
        g.fillStyle(CONFIG.COLORS.SKY, 1);
        g.fillRect(0, 0, CONFIG.WIDTH, CONFIG.HEIGHT);

        const vfx = CONFIG.VFX;
        vfx.STAR_LAYERS.forEach((layerConfig) => {
            for (let i = 0; i < layerConfig.count; i++) {
                const x = Math.random() * CONFIG.WIDTH;
                const y = Math.random() * CONFIG.HEIGHT;
                const size = layerConfig.sizeMin + Math.random() * (layerConfig.sizeMax - layerConfig.sizeMin);
                const baseAlpha = layerConfig.alphaMin + Math.random() * (layerConfig.alphaMax - layerConfig.alphaMin);

                const star = this.add.circle(x, y, size, CONFIG.COLORS.STAR, baseAlpha);
                star.setDepth(0);
                star.setBlendMode(Phaser.BlendModes.ADD);

                this.tweens.add({
                    targets: star,
                    alpha: { from: baseAlpha, to: baseAlpha * 0.2 },
                    duration: vfx.STAR_TWINKLE_MIN + Math.random() * (vfx.STAR_TWINKLE_MAX - vfx.STAR_TWINKLE_MIN),
                    yoyo: true,
                    repeat: -1,
                    delay: Math.random() * 2000,
                    ease: 'Sine.easeInOut'
                });
            }
        });
    }
}
