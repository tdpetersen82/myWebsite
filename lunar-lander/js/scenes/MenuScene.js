// Lunar Lander - Menu Scene

class MenuScene extends Phaser.Scene {
    constructor() {
        super({ key: 'MenuScene' });
    }

    create() {
        const w = CONFIG.WIDTH;
        const h = CONFIG.HEIGHT;

        // Gradient background — deep blue to purple
        const bg = this.add.graphics();
        for (let i = 0; i < h; i++) {
            const t = i / h;
            const r = Math.floor(10 + t * 20);
            const g = Math.floor(10 + t * 15);
            const b = Math.floor(40 + t * 30);
            bg.fillStyle(Phaser.Display.Color.GetColor(r, g, b), 1);
            bg.fillRect(0, i, w, 1);
        }

        // Starfield
        const starG = this.add.graphics();
        const vfx = CONFIG.VFX;
        vfx.STAR_LAYERS.forEach((layerConfig) => {
            for (let i = 0; i < layerConfig.count; i++) {
                const x = Math.random() * w;
                const y = Math.random() * h;
                const size = layerConfig.sizeMin + Math.random() * (layerConfig.sizeMax - layerConfig.sizeMin);
                const alpha = layerConfig.alphaMin + Math.random() * (layerConfig.alphaMax - layerConfig.alphaMin);
                starG.fillStyle(0xffffff, alpha);
                starG.fillCircle(x, y, size);
            }
        });

        // Title
        this.add.text(w / 2, 70, 'LUNAR LANDER', {
            fontSize: '52px',
            fontFamily: 'Courier New, monospace',
            color: '#ffffff',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        // Subtitle
        this.add.text(w / 2, 120, 'A Classic Arcade Game', {
            fontSize: '16px',
            fontFamily: 'Courier New, monospace',
            color: '#99bbdd'
        }).setOrigin(0.5);

        // Animated lander with flame
        this._drawMenuLander(w / 2, 210);

        // Difficulty selection header
        this.add.text(w / 2, 300, 'SELECT DIFFICULTY', {
            fontSize: '18px',
            fontFamily: 'Courier New, monospace',
            color: '#66ddff'
        }).setOrigin(0.5);

        const difficulties = [
            { label: 'CADET', gravity: 0.7, fuel: 1.2, key: 'easy' },
            { label: 'PILOT', gravity: 1.0, fuel: 1.0, key: 'normal' },
            { label: 'COMMANDER', gravity: 1.3, fuel: 0.8, key: 'hard' }
        ];

        this.selectedDifficulty = 1;
        this.diffButtons = [];

        difficulties.forEach((diff, i) => {
            const btn = this.add.text(w / 2, 340 + i * 38, diff.label, {
                fontSize: '22px',
                fontFamily: 'Courier New, monospace',
                color: '#bbccdd'
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

        // Controls
        this.add.text(w / 2, 465, 'CONTROLS', {
            fontSize: '14px',
            fontFamily: 'Courier New, monospace',
            color: '#66ddff'
        }).setOrigin(0.5);

        const controls = [
            'UP / W = Thrust    LEFT / RIGHT / A / D = Rotate',
            'P / ESC = Pause    M = Mute'
        ];

        controls.forEach((line, i) => {
            this.add.text(w / 2, 488 + i * 18, line, {
                fontSize: '12px',
                fontFamily: 'Courier New, monospace',
                color: '#99aabb'
            }).setOrigin(0.5);
        });

        // High score
        const highScore = localStorage.getItem(CONFIG.HIGH_SCORE_KEY) || 0;
        this.add.text(w / 2, h - 25, `HIGH SCORE: ${highScore}`, {
            fontSize: '15px',
            fontFamily: 'Courier New, monospace',
            color: '#ffdd44',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        // Blinking prompt
        const prompt = this.add.text(w / 2, h - 50, 'PRESS ENTER OR CLICK TO START', {
            fontSize: '14px',
            fontFamily: 'Courier New, monospace',
            color: '#66ffaa'
        }).setOrigin(0.5);

        this.tweens.add({
            targets: prompt,
            alpha: { from: 1, to: 0.3 },
            duration: 800,
            yoyo: true,
            repeat: -1
        });

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
    }

    _drawMenuLander(cx, cy) {
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
        g.lineStyle(1, 0xffffff, 0.4);
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

        // Window
        g.fillStyle(0x66bbff, 0.3);
        g.fillCircle(cx, cy - 3, 8);
        g.fillStyle(0x88ccff, 0.6);
        g.fillCircle(cx, cy - 3, 5);
        g.lineStyle(1, 0xaaddff, 1);
        g.strokeCircle(cx, cy - 3, 5);

        // Hover animation
        this.tweens.add({
            targets: g,
            y: { from: -5, to: 5 },
            duration: 2200,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });

        // Flame particle emitter
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
            btn.setColor(selected ? '#ffff66' : '#bbccdd');
            btn.setScale(selected ? 1.15 : 1.0);
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
