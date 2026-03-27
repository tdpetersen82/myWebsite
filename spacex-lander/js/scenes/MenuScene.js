// SpaceX Lander - Menu Scene

class MenuScene extends Phaser.Scene {
    constructor() {
        super({ key: 'MenuScene' });
    }

    create() {
        const w = CONFIG.WIDTH;
        const h = CONFIG.HEIGHT;

        // Dark gradient background
        const bg = this.add.graphics();
        for (let i = 0; i < h; i++) {
            const t = i / h;
            const r = Math.floor(5 + t * 10);
            const g = Math.floor(5 + t * 15);
            const b = Math.floor(15 + t * 30);
            bg.fillStyle(Phaser.Display.Color.GetColor(r, g, b), 1);
            bg.fillRect(0, i, w, 1);
        }

        // Stars
        const starG = this.add.graphics();
        CONFIG.VFX.STAR_LAYERS.forEach(layer => {
            for (let i = 0; i < layer.count; i++) {
                starG.fillStyle(0xffffff, layer.alphaMin + Math.random() * (layer.alphaMax - layer.alphaMin));
                starG.fillCircle(
                    Math.random() * w,
                    Math.random() * h,
                    layer.sizeMin + Math.random() * (layer.sizeMax - layer.sizeMin)
                );
            }
        });

        // Title
        this.add.text(w / 2, 65, 'SPACEX LANDER', {
            fontSize: '48px',
            fontFamily: 'Courier New, monospace',
            color: '#ffffff',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        // Subtitle
        this.add.text(w / 2, 112, 'First Stage Recovery Simulator', {
            fontSize: '15px',
            fontFamily: 'Courier New, monospace',
            color: '#88aacc'
        }).setOrigin(0.5);

        // Draw animated Falcon 9 rocket
        this._drawMenuRocket(w / 2, 230);

        // Controls
        this.add.text(w / 2, 360, 'CONTROLS', {
            fontSize: '14px',
            fontFamily: 'Courier New, monospace',
            color: '#66ddff'
        }).setOrigin(0.5);

        const controls = [
            'UP / W = Thrust       LEFT / RIGHT / A / D = Grid Fins',
            'P / ESC = Pause        M = Mute'
        ];

        controls.forEach((line, i) => {
            this.add.text(w / 2, 385 + i * 18, line, {
                fontSize: '11px',
                fontFamily: 'Courier New, monospace',
                color: '#99aabb'
            }).setOrigin(0.5);
        });

        // Mission briefing
        this.add.text(w / 2, 440, 'MISSION', {
            fontSize: '14px',
            fontFamily: 'Courier New, monospace',
            color: '#66ddff'
        }).setOrigin(0.5);

        this.add.text(w / 2, 462, 'Guide the Falcon 9 first stage back to the drone ship.', {
            fontSize: '11px',
            fontFamily: 'Courier New, monospace',
            color: '#99aabb'
        }).setOrigin(0.5);

        this.add.text(w / 2, 480, 'Survive re-entry, manage fuel, and stick the landing!', {
            fontSize: '11px',
            fontFamily: 'Courier New, monospace',
            color: '#99aabb'
        }).setOrigin(0.5);

        // High score
        const highScore = localStorage.getItem(CONFIG.HIGH_SCORE_KEY) || 0;
        this.add.text(w / 2, h - 55, `HIGH SCORE: ${highScore}`, {
            fontSize: '15px',
            fontFamily: 'Courier New, monospace',
            color: '#ffdd44',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        // Blinking prompt
        const prompt = this.add.text(w / 2, h - 30, 'PRESS ENTER OR CLICK TO LAUNCH', {
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

        // Input
        this.input.keyboard.on('keydown-ENTER', () => this._startGame());
        this.input.keyboard.on('keydown-SPACE', () => this._startGame());
        this.input.on('pointerdown', () => this._startGame());
    }

    _drawMenuRocket(cx, cy) {
        const g = this.add.graphics();
        g.setDepth(2);
        const rw = 12;
        const rh = 60;

        // Interstage (top)
        g.fillStyle(CONFIG.COLORS.ROCKET_INTERSTAGE, 1);
        g.fillRect(cx - rw / 2 - 1, cy - rh / 2, rw + 2, rh * 0.12);

        // Body
        g.fillStyle(CONFIG.COLORS.ROCKET_BODY, 1);
        g.fillRect(cx - rw / 2, cy - rh / 2 + rh * 0.12, rw, rh * 0.76);

        // Engine section
        g.fillStyle(CONFIG.COLORS.ROCKET_ENGINE, 1);
        g.fillRect(cx - rw / 2 - 1, cy + rh / 2 - rh * 0.12, rw + 2, rh * 0.12);

        // Chevron
        g.lineStyle(1.5, 0xcc2222, 0.5);
        g.beginPath();
        g.moveTo(cx - rw / 2, cy - 5);
        g.lineTo(cx, cy);
        g.lineTo(cx + rw / 2, cy - 5);
        g.strokePath();

        // Grid fins
        for (const side of [-1, 1]) {
            g.fillStyle(CONFIG.COLORS.GRID_FIN, 1);
            g.fillRect(cx + side * (rw / 2 + 2), cy - rh / 2 + rh * 0.16, 4, 3);
        }

        // Landing legs (deployed)
        g.lineStyle(1.5, CONFIG.COLORS.LANDING_LEG, 0.9);
        g.beginPath();
        g.moveTo(cx - rw / 2, cy + rh * 0.2);
        g.lineTo(cx - rw - 6, cy + rh / 2 + 8);
        g.moveTo(cx + rw / 2, cy + rh * 0.2);
        g.lineTo(cx + rw + 6, cy + rh / 2 + 8);
        g.strokePath();

        // Feet
        g.lineStyle(2, CONFIG.COLORS.LEG_FOOT, 0.8);
        g.beginPath();
        g.moveTo(cx - rw - 10, cy + rh / 2 + 8);
        g.lineTo(cx - rw - 2, cy + rh / 2 + 8);
        g.moveTo(cx + rw + 2, cy + rh / 2 + 8);
        g.lineTo(cx + rw + 10, cy + rh / 2 + 8);
        g.strokePath();

        // Outline
        g.lineStyle(1, CONFIG.COLORS.ROCKET_STROKE, 0.5);
        g.strokeRect(cx - rw / 2, cy - rh / 2, rw, rh);

        // Hover animation
        this.tweens.add({
            targets: g,
            y: { from: -5, to: 5 },
            duration: 2200,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });

        // Flame emitter
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

        const flame = this.add.particles(cx, cy + rh / 2 + 2, 'vfx_circle', {
            speed: { min: 40, max: 100 },
            lifespan: 300,
            scale: { start: 0.6, end: 0 },
            alpha: { start: 0.9, end: 0 },
            tint: [0x6699ff, 0x88bbff, 0xaaddff, 0xffffff],
            blendMode: Phaser.BlendModes.ADD,
            frequency: 30,
            gravityY: 60,
            angle: { min: 78, max: 102 }
        });
        flame.setDepth(1);

        this.tweens.add({
            targets: flame,
            y: { from: cy + rh / 2 + 2 - 5, to: cy + rh / 2 + 2 + 5 },
            duration: 2200,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });
    }

    _startGame() {
        if (window.audioManager) {
            window.audioManager.init();
            window.audioManager.playBeep(660, 0.15);
        }

        this.scene.start('LaunchScene', {
            level: 1,
            score: 0,
            lives: CONFIG.STARTING_LIVES
        });
    }
}
