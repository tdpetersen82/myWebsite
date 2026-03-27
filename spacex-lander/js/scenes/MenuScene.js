// SpaceX Lander - Menu Scene (Modern, clean SpaceX aesthetic)

class MenuScene extends Phaser.Scene {
    constructor() {
        super({ key: 'MenuScene' });
    }

    create() {
        const w = CONFIG.WIDTH;
        const h = CONFIG.HEIGHT;

        // Clean dark background with subtle gradient
        const bg = this.add.graphics();
        for (let i = 0; i < h; i++) {
            const t = i / h;
            const r = Math.floor(8 + t * 4);
            const g = Math.floor(10 + t * 5);
            const b = Math.floor(14 + t * 8);
            bg.fillStyle(Phaser.Display.Color.GetColor(r, g, b), 1);
            bg.fillRect(0, i, w, 1);
        }

        // Subtle grid lines (SpaceX mission control feel)
        const gridG = this.add.graphics();
        gridG.lineStyle(1, 0xffffff, 0.02);
        for (let x = 0; x < w; x += 40) {
            gridG.beginPath();
            gridG.moveTo(x, 0);
            gridG.lineTo(x, h);
            gridG.strokePath();
        }
        for (let y = 0; y < h; y += 40) {
            gridG.beginPath();
            gridG.moveTo(0, y);
            gridG.lineTo(w, y);
            gridG.strokePath();
        }

        // Subtle horizontal accent line at top
        const accentG = this.add.graphics();
        accentG.fillStyle(0x0066ff, 0.6);
        accentG.fillRect(0, 0, w, 2);
        // Fading glow below the line
        for (let i = 0; i < 20; i++) {
            accentG.fillStyle(0x0066ff, 0.03 * (1 - i / 20));
            accentG.fillRect(0, 2 + i, w, 1);
        }

        // --- TITLE BLOCK ---
        // "SPACEX" in large, ultra-clean white
        this.add.text(w / 2, 72, 'SPACEX', {
            fontSize: '56px',
            fontFamily: 'Arial, Helvetica, sans-serif',
            color: '#ffffff',
            fontStyle: 'bold',
            letterSpacing: 12
        }).setOrigin(0.5);

        // "LANDER" in lighter weight below
        this.add.text(w / 2, 118, 'LANDER', {
            fontSize: '22px',
            fontFamily: 'Arial, Helvetica, sans-serif',
            color: '#8899aa',
            letterSpacing: 16
        }).setOrigin(0.5);

        // Thin divider line
        const divG = this.add.graphics();
        divG.fillStyle(0xffffff, 0.1);
        divG.fillRect(w / 2 - 100, 142, 200, 1);

        // Subtitle
        this.add.text(w / 2, 160, 'FIRST STAGE RECOVERY SIMULATOR', {
            fontSize: '11px',
            fontFamily: 'Arial, Helvetica, sans-serif',
            color: '#556677',
            letterSpacing: 3
        }).setOrigin(0.5);

        // --- LARGE ROCKET (centered, detailed) ---
        this._drawMenuRocket(w / 2, 280);

        // --- INFO PANELS (clean card-style layout) ---
        // Mission panel
        this._drawPanel(w / 2 - 170, 378, 155, 95, 'MISSION');
        this.add.text(w / 2 - 165, 403, 'Guide the Falcon 9\nfirst stage back to\nthe drone ship.', {
            fontSize: '10px',
            fontFamily: 'Arial, Helvetica, sans-serif',
            color: '#99aabb',
            lineSpacing: 4
        });

        // Controls panel
        this._drawPanel(w / 2 + 15, 378, 155, 95, 'CONTROLS');
        const controlLines = [
            ['THRUST', 'W / UP'],
            ['STEER', 'A D / L R'],
            ['PAUSE', 'P / ESC'],
            ['MUTE', 'M']
        ];
        controlLines.forEach(([label, key], i) => {
            this.add.text(w / 2 + 20, 403 + i * 17, label, {
                fontSize: '9px',
                fontFamily: 'Arial, Helvetica, sans-serif',
                color: '#556677'
            });
            this.add.text(w / 2 + 165, 403 + i * 17, key, {
                fontSize: '9px',
                fontFamily: 'Arial, Helvetica, sans-serif',
                color: '#aabbcc'
            }).setOrigin(1, 0);
        });

        // --- BOTTOM SECTION ---
        // High score
        const highScore = localStorage.getItem(CONFIG.HIGH_SCORE_KEY) || 0;
        if (highScore > 0) {
            this.add.text(w / 2, h - 88, 'HIGH SCORE', {
                fontSize: '9px',
                fontFamily: 'Arial, Helvetica, sans-serif',
                color: '#556677',
                letterSpacing: 2
            }).setOrigin(0.5);

            this.add.text(w / 2, h - 72, `${highScore}`, {
                fontSize: '18px',
                fontFamily: 'Arial, Helvetica, sans-serif',
                color: '#ffffff',
                fontStyle: 'bold'
            }).setOrigin(0.5);
        }

        // Launch button (clean, modern)
        const btnW = 220;
        const btnH = 36;
        const btnX = w / 2 - btnW / 2;
        const btnY = h - 32 - btnH / 2;

        const btnG = this.add.graphics();
        // Button fill
        btnG.fillStyle(0x0066ff, 1);
        btnG.fillRoundedRect(btnX, btnY, btnW, btnH, 4);
        // Subtle top highlight
        btnG.fillStyle(0xffffff, 0.08);
        btnG.fillRoundedRect(btnX, btnY, btnW, btnH / 2, { tl: 4, tr: 4, bl: 0, br: 0 });

        const btnText = this.add.text(w / 2, btnY + btnH / 2, 'LAUNCH MISSION', {
            fontSize: '13px',
            fontFamily: 'Arial, Helvetica, sans-serif',
            color: '#ffffff',
            fontStyle: 'bold',
            letterSpacing: 2
        }).setOrigin(0.5);

        // Subtle button pulse
        this.tweens.add({
            targets: btnG,
            alpha: { from: 1, to: 0.85 },
            duration: 1200,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });

        // Make button interactive
        const btnZone = this.add.zone(w / 2, btnY + btnH / 2, btnW, btnH).setInteractive({ useHandCursor: true });
        btnZone.on('pointerover', () => {
            btnG.clear();
            btnG.fillStyle(0x1177ff, 1);
            btnG.fillRoundedRect(btnX, btnY, btnW, btnH, 4);
            btnG.fillStyle(0xffffff, 0.12);
            btnG.fillRoundedRect(btnX, btnY, btnW, btnH / 2, { tl: 4, tr: 4, bl: 0, br: 0 });
        });
        btnZone.on('pointerout', () => {
            btnG.clear();
            btnG.fillStyle(0x0066ff, 1);
            btnG.fillRoundedRect(btnX, btnY, btnW, btnH, 4);
            btnG.fillStyle(0xffffff, 0.08);
            btnG.fillRoundedRect(btnX, btnY, btnW, btnH / 2, { tl: 4, tr: 4, bl: 0, br: 0 });
        });
        btnZone.on('pointerdown', () => this._startGame());

        // Keyboard
        this.input.keyboard.on('keydown-ENTER', () => this._startGame());
        this.input.keyboard.on('keydown-SPACE', () => this._startGame());

        // Subtle version text
        this.add.text(w - 8, h - 8, 'v1.0', {
            fontSize: '8px',
            fontFamily: 'Arial, Helvetica, sans-serif',
            color: '#333344'
        }).setOrigin(1, 1);
    }

    _drawPanel(x, y, w, h, title) {
        const g = this.add.graphics();
        // Panel background
        g.fillStyle(0xffffff, 0.03);
        g.fillRoundedRect(x, y, w, h, 3);
        // Panel border
        g.lineStyle(1, 0xffffff, 0.06);
        g.strokeRoundedRect(x, y, w, h, 3);
        // Panel title
        this.add.text(x + 5, y + 5, title, {
            fontSize: '8px',
            fontFamily: 'Arial, Helvetica, sans-serif',
            color: '#0088ff',
            letterSpacing: 2
        });
        // Title underline
        g.fillStyle(0x0066ff, 0.3);
        g.fillRect(x + 5, y + 18, 30, 1);
    }

    _drawMenuRocket(cx, cy) {
        const g = this.add.graphics();
        g.setDepth(2);

        // Larger, more detailed rocket for the menu
        const rw = 18;
        const rh = 90;

        // Subtle glow behind rocket
        const glowG = this.add.graphics();
        glowG.setDepth(1);
        for (let i = 5; i > 0; i--) {
            glowG.fillStyle(0x0066ff, 0.008 * i);
            glowG.fillEllipse(cx, cy + rh / 2 + 10, 60 + i * 15, 40 + i * 10);
        }

        // Interstage (top)
        g.fillStyle(0x1a1a1a, 1);
        g.fillRect(cx - rw / 2 - 1, cy - rh / 2, rw + 2, rh * 0.1);

        // Main body (white)
        g.fillStyle(0xf0f0f0, 1);
        g.fillRect(cx - rw / 2, cy - rh / 2 + rh * 0.1, rw, rh * 0.72);

        // Panel lines
        g.lineStyle(0.5, 0xcccccc, 0.2);
        for (let i = 1; i <= 4; i++) {
            const py = cy - rh / 2 + rh * 0.1 + (rh * 0.72) * (i / 5);
            g.beginPath(); g.moveTo(cx - rw / 2, py); g.lineTo(cx + rw / 2, py); g.strokePath();
        }

        // SpaceX chevron
        const chevY = cy - rh * 0.08;
        g.lineStyle(2, 0xcc2222, 0.6);
        g.beginPath();
        g.moveTo(cx - rw / 2, chevY - 4);
        g.lineTo(cx, chevY + 3);
        g.lineTo(cx + rw / 2, chevY - 4);
        g.strokePath();

        // Engine section (wider, darker)
        g.fillStyle(0x666666, 1);
        g.fillRect(cx - rw / 2 - 2, cy + rh / 2 - rh * 0.14, rw + 4, rh * 0.14);

        // Engine bells
        for (const ox of [-5, 0, 5]) {
            g.fillStyle(0x333333, 1);
            g.fillCircle(cx + ox, cy + rh / 2, 3);
        }

        // Grid fins (extended)
        for (const side of [-1, 1]) {
            g.fillStyle(0x999999, 1);
            const fx = cx + side * (rw / 2 + 4);
            g.fillRect(fx - 3, cy - rh / 2 + rh * 0.15, 7, 4);
            // Grid pattern
            g.lineStyle(0.5, 0x666666, 0.5);
            g.beginPath();
            g.moveTo(fx - 2, cy - rh / 2 + rh * 0.15 + 2);
            g.lineTo(fx + 3, cy - rh / 2 + rh * 0.15 + 2);
            g.strokePath();
        }

        // Landing legs (deployed)
        g.lineStyle(2, 0xcccccc, 0.9);
        for (const side of [-1, 1]) {
            g.beginPath();
            g.moveTo(cx + side * rw / 2, cy + rh * 0.2);
            g.lineTo(cx + side * (rw + 10), cy + rh / 2 + 12);
            g.strokePath();
            // Foot
            g.lineStyle(2.5, 0xaaaaaa, 0.8);
            g.beginPath();
            g.moveTo(cx + side * (rw + 6), cy + rh / 2 + 12);
            g.lineTo(cx + side * (rw + 14), cy + rh / 2 + 12);
            g.strokePath();
            g.lineStyle(2, 0xcccccc, 0.9);
        }

        // Body outline
        g.lineStyle(1, 0xdddddd, 0.3);
        g.strokeRect(cx - rw / 2, cy - rh / 2, rw, rh);

        // Specular highlight (left edge)
        g.lineStyle(1, 0xffffff, 0.15);
        g.beginPath();
        g.moveTo(cx - rw / 2, cy - rh / 2 + rh * 0.1);
        g.lineTo(cx - rw / 2, cy + rh / 2 - rh * 0.14);
        g.strokePath();

        // Hover animation
        this.tweens.add({
            targets: g,
            y: { from: -4, to: 4 },
            duration: 2500,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });
        this.tweens.add({
            targets: glowG,
            y: { from: -4, to: 4 },
            duration: 2500,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });

        // Engine exhaust particles
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

        const flame = this.add.particles(cx, cy + rh / 2 + 4, 'vfx_circle', {
            speed: { min: 50, max: 120 },
            lifespan: 350,
            scale: { start: 0.7, end: 0 },
            alpha: { start: 0.85, end: 0 },
            tint: [0x4488ff, 0x6699ff, 0x88bbff, 0xffffff],
            blendMode: Phaser.BlendModes.ADD,
            frequency: 25,
            gravityY: 70,
            angle: { min: 78, max: 102 }
        }).setDepth(1);

        this.tweens.add({
            targets: flame,
            y: { from: cy + rh / 2 + 4 - 4, to: cy + rh / 2 + 4 + 4 },
            duration: 2500,
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
