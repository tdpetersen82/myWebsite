// Lunar Lander - Menu Scene (Enhanced with full VFX)

class MenuScene extends Phaser.Scene {
    constructor() {
        super({ key: 'MenuScene' });
    }

    create() {
        const w = CONFIG.WIDTH;
        const h = CONFIG.HEIGHT;

        // Background
        const bg = this.add.graphics();
        bg.fillStyle(CONFIG.COLORS.SKY, 1);
        bg.fillRect(0, 0, w, h);

        // Animated twinkling starfield
        this._createStarfield();

        // Nebula clouds
        this._createNebulae();

        // Camera vignette
        // Camera post-FX
        try {
            this.cameras.main.postFX.addVignette(0.5, 0.5, 0.5);
        } catch (e) {}

        // Title with glow
        const title = this.add.text(w / 2, 80, 'LUNAR LANDER', {
            fontSize: '48px',
            fontFamily: 'Courier New, monospace',
            color: '#ffffff',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        try {
            title.postFX.addGlow(0xffffff, 6, 0, false);
        } catch (e) {}

        // Subtitle
        const subtitle = this.add.text(w / 2, 130, 'A Classic Arcade Game', {
            fontSize: '16px',
            fontFamily: 'Courier New, monospace',
            color: '#888888'
        }).setOrigin(0.5);

        // Animated lander with flame
        this._drawMenuLander(w / 2, 220);

        // Difficulty selection
        const selLabel = this.add.text(w / 2, 310, 'SELECT DIFFICULTY', {
            fontSize: '18px',
            fontFamily: 'Courier New, monospace',
            color: '#00ff00'
        }).setOrigin(0.5);

        try { selLabel.postFX.addGlow(0x00ff00, 2, 0, false); } catch (e) {}

        const difficulties = [
            { label: '[ CADET ]', gravity: 0.7, fuel: 1.2, key: 'easy' },
            { label: '[ PILOT ]', gravity: 1.0, fuel: 1.0, key: 'normal' },
            { label: '[ COMMANDER ]', gravity: 1.3, fuel: 0.8, key: 'hard' }
        ];

        this.selectedDifficulty = 1;
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

        this._updateDifficultySelection();

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

        // High score with glow
        const highScore = localStorage.getItem(CONFIG.HIGH_SCORE_KEY) || 0;
        const hsText = this.add.text(w / 2, h - 30, `HIGH SCORE: ${highScore}`, {
            fontSize: '14px',
            fontFamily: 'Courier New, monospace',
            color: '#ffff00'
        }).setOrigin(0.5);

        try { hsText.postFX.addGlow(0xffff00, 2, 0, false); } catch (e) {}

        // Keyboard navigation
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

        // Blinking prompt with neon glow
        const prompt = this.add.text(w / 2, h - 60, 'PRESS ENTER OR CLICK TO START', {
            fontSize: '14px',
            fontFamily: 'Courier New, monospace',
            color: '#00ff00'
        }).setOrigin(0.5);

        try { prompt.postFX.addGlow(0x00ff00, 3, 0, false); } catch (e) {}

        this.tweens.add({
            targets: prompt,
            alpha: 0.2,
            duration: 600,
            yoyo: true,
            repeat: -1
        });
    }

    _createStarfield() {
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
                    alpha: { from: baseAlpha, to: baseAlpha * 0.15 },
                    duration: vfx.STAR_TWINKLE_MIN + Math.random() * (vfx.STAR_TWINKLE_MAX - vfx.STAR_TWINKLE_MIN),
                    yoyo: true,
                    repeat: -1,
                    delay: Math.random() * 3000,
                    ease: 'Sine.easeInOut'
                });
            }
        });
    }

    _createNebulae() {
        const colors = CONFIG.COLORS.NEBULA;
        for (let i = 0; i < 3; i++) {
            const g = this.add.graphics();
            g.setDepth(0);
            g.setBlendMode(Phaser.BlendModes.ADD);
            const cx = 100 + Math.random() * (CONFIG.WIDTH - 200);
            const cy = 50 + Math.random() * (CONFIG.HEIGHT * 0.3);
            const color = colors[i % colors.length];
            for (let j = 0; j < 4; j++) {
                g.fillStyle(color, 0.02 + Math.random() * 0.015);
                g.fillCircle(cx + (Math.random() - 0.5) * 50, cy + (Math.random() - 0.5) * 30, 25 + Math.random() * 40);
            }
            this.tweens.add({
                targets: g,
                x: { from: -5, to: 5 },
                duration: 18000 + Math.random() * 12000,
                yoyo: true,
                repeat: -1,
                ease: 'Sine.easeInOut'
            });
        }
    }

    _drawMenuLander(cx, cy) {
        // Lander body graphics (with hover animation)
        const g = this.add.graphics();
        g.setDepth(2);

        // Body
        g.fillStyle(CONFIG.COLORS.LANDER_BODY, 1);
        g.lineStyle(2, CONFIG.COLORS.LANDER_STROKE, 1);
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

        // Specular highlight
        g.lineStyle(1, 0xffffff, 0.3);
        g.beginPath();
        g.moveTo(cx, cy - 25);
        g.lineTo(cx - 15, cy - 5);
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

        // Window with glow
        g.fillStyle(CONFIG.COLORS.LANDER_WINDOW_GLOW, 0.1);
        g.fillCircle(cx, cy - 3, 9);
        g.fillStyle(CONFIG.COLORS.LANDER_WINDOW_GLOW, 0.15);
        g.fillCircle(cx, cy - 3, 7);
        g.fillStyle(0x4488cc, 0.8);
        g.fillCircle(cx, cy - 3, 5);
        g.lineStyle(1, 0x66aaff, 1);
        g.strokeCircle(cx, cy - 3, 5);

        // Hover animation on the whole lander
        this.tweens.add({
            targets: g,
            y: { from: -5, to: 5 },
            duration: 2200,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });

        // Generate particle texture if needed
        if (!this.textures.exists('vfx_circle')) {
            const pg = this.make.graphics({ add: false });
            pg.fillStyle(0xffffff, 1);
            pg.fillCircle(6, 6, 6);
            pg.fillStyle(0xffffff, 0.5);
            pg.fillCircle(6, 6, 4);
            pg.fillStyle(0xffffff, 1);
            pg.fillCircle(6, 6, 2);
            pg.generateTexture('vfx_circle', 12, 12);
            pg.destroy();
        }

        // Flame particle emitter below the lander
        const flameEmitter = this.add.particles(cx, cy + 18, 'vfx_circle', {
            speed: { min: 40, max: 100 },
            lifespan: 350,
            scale: { start: 0.8, end: 0 },
            alpha: { start: 0.9, end: 0 },
            tint: [0xff8800, 0xff6600, 0xffaa00, 0xffffff],
            blendMode: Phaser.BlendModes.ADD,
            frequency: 30,
            gravityY: 60,
            angle: { min: 75, max: 105 }
        });
        flameEmitter.setDepth(1);

        // Sync flame with hover
        this.tweens.add({
            targets: flameEmitter,
            y: { from: cy + 18 - 5, to: cy + 18 + 5 },
            duration: 2200,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });
    }

    _updateDifficultySelection() {
        this.diffButtons.forEach((btn, i) => {
            const selected = i === this.selectedDifficulty;
            btn.setColor(selected ? '#ffff00' : '#aaaaaa');
            btn.setScale(selected ? 1.1 : 1.0);
            try {
                btn.postFX.clear();
                if (selected) {
                    btn.postFX.addGlow(0xffff00, 3, 0, false);
                }
            } catch (e) {}
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
