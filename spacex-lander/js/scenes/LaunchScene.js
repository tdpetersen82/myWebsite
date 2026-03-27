// SpaceX Lander - Launch Scene (Cinematic launch + stage separation)

class LaunchScene extends Phaser.Scene {
    constructor() {
        super({ key: 'LaunchScene' });
    }

    init(data) {
        this.level = data.level || 1;
        this.score = data.score || 0;
        this.lives = data.lives !== undefined ? data.lives : CONFIG.STARTING_LIVES;
    }

    create() {
        const w = CONFIG.WIDTH;
        const h = CONFIG.HEIGHT;
        this.audio = window.audioManager;
        if (this.audio) this.audio.init();

        // Allow skipping
        this._skippable = false;
        this._skipped = false;
        this.time.delayedCall(500, () => { this._skippable = true; });
        this.input.keyboard.on('keydown-SPACE', () => this._skip());
        this.input.keyboard.on('keydown-ENTER', () => this._skip());
        this.input.on('pointerdown', () => this._skip());

        // Graphics layers
        this.bgGraphics = this.add.graphics().setDepth(0);
        this.rocketGraphics = this.add.graphics().setDepth(2);
        this.textLayer = this.add.graphics().setDepth(5);

        // Generate particle texture
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

        // State machine
        this.phase = 'countdown'; // countdown, liftoff, ascent, separation, flip, handoff
        this.elapsed = 0;

        // Rocket state for animation
        this.rocketX = w / 2;
        this.rocketY = h - 120;
        this.rocketAngle = 0;    // 0 = upright, will flip to 180
        this.stage2Y = 0;        // Second stage y offset from first stage
        this.separated = false;
        this.flipping = false;
        this.flipProgress = 0;

        // Background scroll offset (simulates camera moving up)
        this.bgOffset = 0;
        this.bgPhase = 'ground'; // ground, sky, space

        // Exhaust emitter
        this.exhaust = this.add.particles(this.rocketX, this.rocketY + 40, 'vfx_circle', {
            speed: { min: 80, max: 180 },
            lifespan: 400,
            scale: { start: 1.0, end: 0 },
            alpha: { start: 0.9, end: 0 },
            tint: [0xff8800, 0xff6600, 0xffaa00, 0xffffff],
            blendMode: Phaser.BlendModes.ADD,
            frequency: 25,
            gravityY: 80,
            angle: { min: 75, max: 105 },
            emitting: false
        }).setDepth(1);

        // Mission name
        const missionIdx = (this.level - 1) % CONFIG.MISSIONS.length;
        this.missionName = CONFIG.MISSIONS[missionIdx];

        // Level/Mission text
        this.levelText = this.add.text(w / 2, 30, `LEVEL ${this.level}`, {
            fontSize: '24px',
            fontFamily: 'Courier New, monospace',
            color: '#ffffff',
            fontStyle: 'bold'
        }).setOrigin(0.5).setDepth(10);

        this.missionText = this.add.text(w / 2, 58, `Mission: ${this.missionName}`, {
            fontSize: '14px',
            fontFamily: 'Courier New, monospace',
            color: '#88aacc'
        }).setOrigin(0.5).setDepth(10);

        // Countdown text
        this.countdownText = this.add.text(w / 2, h / 2 - 30, '', {
            fontSize: '60px',
            fontFamily: 'Courier New, monospace',
            color: '#ffffff',
            fontStyle: 'bold'
        }).setOrigin(0.5).setDepth(10);

        // Status text
        this.statusText = this.add.text(w / 2, h - 30, 'Press SPACE to skip', {
            fontSize: '11px',
            fontFamily: 'Courier New, monospace',
            color: '#666688'
        }).setOrigin(0.5).setDepth(10);

        // Start countdown
        this._startCountdown();
    }

    _startCountdown() {
        // 3...2...1...
        const counts = [3, 2, 1];
        counts.forEach((num, i) => {
            this.time.delayedCall(i * 800, () => {
                if (this._skipped) return;
                this.countdownText.setText(num.toString());
                if (this.audio) this.audio.playCountdownBeep(false);

                // Flash effect
                this.tweens.add({
                    targets: this.countdownText,
                    scale: { from: 1.3, to: 1.0 },
                    alpha: { from: 1, to: 0.8 },
                    duration: 300
                });
            });
        });

        // Liftoff
        this.time.delayedCall(2400, () => {
            if (this._skipped) return;
            this.countdownText.setText('LIFTOFF');
            this.countdownText.setFontSize('36px');
            if (this.audio) {
                this.audio.playCountdownBeep(true);
                this.audio.playIgnition();
            }
            this.phase = 'liftoff';
            this.exhaust.start();
            this.elapsed = 0;
        });
    }

    update(time, delta) {
        if (this._skipped) return;

        delta = Math.min(delta, 50);
        const dt = delta / 1000;
        this.elapsed += delta;

        this._drawBackground();

        switch (this.phase) {
            case 'countdown':
                this._drawFullRocket();
                break;

            case 'liftoff':
                // Rocket rises
                this.rocketY -= dt * 80;
                this.bgOffset += dt * 40;

                if (this.elapsed > 1500) {
                    this.phase = 'ascent';
                    this.elapsed = 0;
                    this.countdownText.setText('');
                }
                this._drawFullRocket();
                this._updateExhaust();
                break;

            case 'ascent':
                // Faster ascent
                this.rocketY -= dt * 150;
                this.bgOffset += dt * 120;

                // Transition background
                if (this.bgOffset > 200) this.bgPhase = 'sky';
                if (this.bgOffset > 500) this.bgPhase = 'space';

                if (this.elapsed > 2000) {
                    this.phase = 'separation';
                    this.elapsed = 0;
                    this.separated = true;
                    this.stage2Y = 0;

                    // MECO text
                    this.countdownText.setText('MECO');
                    this.countdownText.setFontSize('30px');
                    this.countdownText.setColor('#ffaa44');

                    this.exhaust.stop();
                    if (this.audio) this.audio.playSeparation();
                }
                this._drawFullRocket();
                this._updateExhaust();
                break;

            case 'separation':
                // Stage 2 drifts upward
                this.stage2Y -= dt * 60;

                if (this.elapsed > 1200) {
                    this.phase = 'flip';
                    this.elapsed = 0;
                    this.flipping = true;
                    this.flipProgress = 0;
                    this.countdownText.setText('BOOSTBACK');
                    this.countdownText.setColor('#66ddff');
                    if (this.audio) this.audio.playGridFinClick();
                }
                this._drawSeparatedRocket();
                break;

            case 'flip':
                // First stage flips 180 degrees
                this.flipProgress = Math.min(1, this.flipProgress + dt * 1.2);
                this.rocketAngle = this.flipProgress * 180;

                // Stage 2 continues away
                this.stage2Y -= dt * 40;

                if (this.flipProgress >= 1 && this.elapsed > 1500) {
                    this.phase = 'handoff';
                    this.elapsed = 0;
                    this.countdownText.setText('ENTRY BURN');
                    this.countdownText.setColor('#ff6644');
                    this.countdownText.setFontSize('28px');
                }
                this._drawSeparatedRocket();
                break;

            case 'handoff':
                // Brief pause then transition to game
                if (this.elapsed > 1000) {
                    this._transitionToGame();
                }
                this._drawSeparatedRocket();
                break;
        }
    }

    _drawBackground() {
        const g = this.bgGraphics;
        const w = CONFIG.WIDTH;
        const h = CONFIG.HEIGHT;
        g.clear();

        if (this.bgPhase === 'ground') {
            // Sky gradient
            for (let i = 0; i < h; i++) {
                const t = i / h;
                const r = Math.floor(40 + t * 60);
                const gr = Math.floor(80 + t * 80);
                const b = Math.floor(140 + t * 60);
                g.fillStyle(Phaser.Display.Color.GetColor(r, gr, b), 1);
                g.fillRect(0, i, w, 1);
            }
            // Ground
            g.fillStyle(0x334422, 1);
            g.fillRect(0, h - 60 + this.bgOffset * 0.3, w, 60);
            // Launch pad
            g.fillStyle(0x555555, 1);
            g.fillRect(w / 2 - 30, h - 62 + this.bgOffset * 0.3, 60, 5);
        } else if (this.bgPhase === 'sky') {
            // Upper atmosphere
            for (let i = 0; i < h; i++) {
                const t = i / h;
                const r = Math.floor(10 + t * 30);
                const gr = Math.floor(20 + t * 50);
                const b = Math.floor(60 + t * 80);
                g.fillStyle(Phaser.Display.Color.GetColor(r, gr, b), 1);
                g.fillRect(0, i, w, 1);
            }
        } else {
            // Space
            g.fillStyle(CONFIG.COLORS.SPACE, 1);
            g.fillRect(0, 0, w, h);
            // Stars
            CONFIG.VFX.STAR_LAYERS.forEach(layer => {
                for (let i = 0; i < Math.floor(layer.count / 2); i++) {
                    g.fillStyle(0xffffff, layer.alphaMin + Math.random() * (layer.alphaMax - layer.alphaMin));
                    g.fillCircle(Math.random() * w, Math.random() * h, layer.sizeMin + Math.random() * (layer.sizeMax - layer.sizeMin));
                }
            });
        }
    }

    _drawFullRocket() {
        const g = this.rocketGraphics;
        const cx = this.rocketX;
        const cy = this.rocketY;
        const rw = 10;
        const stage1H = 50;
        const stage2H = 25;
        const totalH = stage1H + stage2H + 4; // 4px for separation ring

        g.clear();

        // Second stage (top) — smaller, with nose cone
        g.fillStyle(0xdddddd, 1);
        g.fillRect(cx - rw / 2 + 1, cy - totalH / 2, rw - 2, stage2H);
        // Nose cone
        g.fillStyle(0xcccccc, 1);
        g.beginPath();
        g.moveTo(cx - rw / 2 + 1, cy - totalH / 2);
        g.lineTo(cx, cy - totalH / 2 - 10);
        g.lineTo(cx + rw / 2 - 1, cy - totalH / 2);
        g.closePath();
        g.fillPath();

        // Separation ring
        g.fillStyle(0x444444, 1);
        g.fillRect(cx - rw / 2 - 1, cy - totalH / 2 + stage2H, rw + 2, 4);

        // First stage body
        g.fillStyle(CONFIG.COLORS.ROCKET_BODY, 1);
        g.fillRect(cx - rw / 2, cy - totalH / 2 + stage2H + 4, rw, stage1H);

        // Engine section
        g.fillStyle(CONFIG.COLORS.ROCKET_ENGINE, 1);
        g.fillRect(cx - rw / 2 - 1, cy + totalH / 2 - 8, rw + 2, 8);

        // Grid fins (folded)
        g.fillStyle(CONFIG.COLORS.GRID_FIN, 1);
        for (const side of [-1, 1]) {
            g.fillRect(cx + side * (rw / 2 + 1), cy - totalH / 2 + stage2H + 12, 3, 2);
        }

        // Outline
        g.lineStyle(0.5, 0x888888, 0.4);
        g.strokeRect(cx - rw / 2, cy - totalH / 2 + stage2H + 4, rw, stage1H);
    }

    _drawSeparatedRocket() {
        const g = this.rocketGraphics;
        const cx = this.rocketX;
        const cy = this.rocketY;
        const rw = 10;
        const stage1H = 50;
        const rad = Phaser.Math.DegToRad(this.rocketAngle);
        const cos = Math.cos(rad);
        const sin = Math.sin(rad);

        g.clear();

        // Second stage (drifting away)
        const s2y = cy - 45 + this.stage2Y;
        if (s2y > -50) {
            g.fillStyle(0xdddddd, 0.6);
            g.fillRect(cx - 4, s2y, 8, 20);
            // Nose cone
            g.beginPath();
            g.moveTo(cx - 4, s2y);
            g.lineTo(cx, s2y - 8);
            g.lineTo(cx + 4, s2y);
            g.closePath();
            g.fillPath();
        }

        // First stage (rotating)
        const rotate = (px, py) => ({
            x: cx + px * cos - py * sin,
            y: cy + px * sin + py * cos
        });

        // Body
        const corners = [
            rotate(-rw / 2, -stage1H / 2),
            rotate(rw / 2, -stage1H / 2),
            rotate(rw / 2, stage1H / 2),
            rotate(-rw / 2, stage1H / 2)
        ];

        g.fillStyle(CONFIG.COLORS.ROCKET_BODY, 1);
        g.beginPath();
        g.moveTo(corners[0].x, corners[0].y);
        for (let i = 1; i < 4; i++) g.lineTo(corners[i].x, corners[i].y);
        g.closePath();
        g.fillPath();

        // Interstage (was at top, now might be bottom after flip)
        const iTop = rotate(-rw / 2 - 1, -stage1H / 2);
        const iBottom = rotate(rw / 2 + 1, -stage1H / 2 + 6);
        g.fillStyle(CONFIG.COLORS.ROCKET_INTERSTAGE, 1);
        g.fillRect(
            Math.min(iTop.x, iBottom.x),
            Math.min(iTop.y, iBottom.y),
            Math.abs(iBottom.x - iTop.x) || rw + 2,
            Math.abs(iBottom.y - iTop.y) || 6
        );

        // Engine section
        const eCorners = [
            rotate(-rw / 2 - 1, stage1H / 2 - 6),
            rotate(rw / 2 + 1, stage1H / 2 - 6),
            rotate(rw / 2 + 1, stage1H / 2),
            rotate(-rw / 2 - 1, stage1H / 2)
        ];
        g.fillStyle(CONFIG.COLORS.ROCKET_ENGINE, 1);
        g.beginPath();
        g.moveTo(eCorners[0].x, eCorners[0].y);
        for (let i = 1; i < 4; i++) g.lineTo(eCorners[i].x, eCorners[i].y);
        g.closePath();
        g.fillPath();

        // Grid fins (deploying during flip)
        if (this.flipping) {
            const finDeploy = Math.min(1, this.flipProgress * 2);
            for (const side of [-1, 1]) {
                const fx = side * (rw / 2 + 1 + finDeploy * 3);
                const fy = -stage1H / 2 + 10;
                const fp = rotate(fx, fy);
                g.fillStyle(CONFIG.COLORS.GRID_FIN, 1);
                g.fillRect(fp.x - 2, fp.y - 1, 4 + finDeploy * 2, 3);
            }
        }

        // Outline
        g.lineStyle(0.5, 0x888888, 0.4);
        g.beginPath();
        g.moveTo(corners[0].x, corners[0].y);
        for (let i = 1; i < 4; i++) g.lineTo(corners[i].x, corners[i].y);
        g.closePath();
        g.strokePath();
    }

    _updateExhaust() {
        this.exhaust.setPosition(this.rocketX, this.rocketY + 40);
    }

    _skip() {
        if (!this._skippable || this._skipped) return;
        this._skipped = true;
        this._transitionToGame();
    }

    _transitionToGame() {
        if (this._transitioned) return;
        this._transitioned = true;

        this.exhaust.stop();

        this.scene.start('GameScene', {
            level: this.level,
            score: this.score,
            lives: this.lives
        });
    }
}
