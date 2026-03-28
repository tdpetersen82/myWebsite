class MenuScene extends Phaser.Scene {
    constructor() {
        super({ key: 'MenuScene' });
    }

    init() {
        // Clean up any stale DOM inputs from previous visits
        document.querySelectorAll('.offroad-input').forEach(el => el.remove());
    }

    create() {
        const w = CONFIG.WIDTH;
        const h = CONFIG.HEIGHT;

        // Background
        this.add.graphics().fillStyle(0x0f0c29, 1).fillRect(0, 0, w, h);
        // Gradient overlay
        const grad = this.add.graphics();
        grad.fillStyle(0x302b63, 0.5); grad.fillRect(0, 0, w, h / 2);
        grad.fillStyle(0x24243e, 0.3); grad.fillRect(0, h / 2, w, h / 2);

        // Animated background cars
        this.bgCars = [];
        const carColors = [0xFF3333, 0x3388FF, 0x33CC33, 0xFFCC00, 0xAA33FF, 0xFF8833];
        for (let i = 0; i < 6; i++) {
            const car = this.add.graphics();
            car.fillStyle(carColors[i], 0.12);
            car.fillRoundedRect(-18, -9, 36, 18, 4);
            car.fillStyle(carColors[i], 0.06);
            car.fillRoundedRect(-14, -6, 28, 12, 2);
            car.setPosition(-80 + Math.random() * (w + 160), 280 + i * 65 + (Math.random() - 0.5) * 30);
            car.setDepth(0);
            this.bgCars.push({ gfx: car, speed: 0.8 + Math.random() * 1.5 });
        }

        // Title
        this.add.text(w / 2, 90, 'SUPER', {
            fontSize: '58px', fontFamily: '"Press Start 2P", monospace',
            color: '#FFFFFF', stroke: '#000000', strokeThickness: 6,
        }).setOrigin(0.5);

        const titleOff = this.add.text(w / 2, 160, 'OFF ROAD', {
            fontSize: '68px', fontFamily: '"Press Start 2P", monospace',
            color: '#FF6600', stroke: '#000000', strokeThickness: 8,
        }).setOrigin(0.5);

        // Glow under OFF ROAD text
        const glow = this.add.graphics();
        glow.fillStyle(0xFF6600, 0.06);
        glow.fillRoundedRect(w / 2 - 280, 120, 560, 80, 20);

        // Racing stripe
        const stripe = this.add.graphics();
        stripe.fillStyle(0xFF6600, 1); stripe.fillRoundedRect(w / 2 - 200, 205, 400, 3, 2);
        stripe.fillStyle(0xFFFFFF, 0.5); stripe.fillRoundedRect(w / 2 - 160, 212, 320, 1, 1);

        // Subtitle
        this.add.text(w / 2, 240, 'Up to 8 Players Online!', {
            fontSize: '14px', fontFamily: 'monospace', color: '#8888AA',
        }).setOrigin(0.5);

        // === BUTTONS ===
        this._createButton(w / 2, 330, 'CREATE ROOM', 0x2D8F2D, 0x33AA33, () => {
            this._showNameDialog('create');
        });

        this._createButton(w / 2, 410, 'JOIN ROOM', 0x2266CC, 0x3388FF, () => {
            this._showJoinDialog();
        });

        this._createButton(w / 2, 490, 'PRACTICE', 0x555555, 0x777777, () => {
            this._showNameDialog('practice');
        });

        // Controls section
        const ctrlY = 590;
        this.add.text(w / 2, ctrlY, 'CONTROLS', {
            fontSize: '12px', fontFamily: '"Press Start 2P", monospace', color: '#FF6600',
        }).setOrigin(0.5);

        const ctrlLines = [
            'Arrow Keys / WASD = Steer & Accelerate/Brake',
            'SPACE = Nitro Boost   |   SHIFT = Drift',
            'E = Use Power-Up   |   M = Mute   |   ESC = Leave',
        ];
        ctrlLines.forEach((line, i) => {
            this.add.text(w / 2, ctrlY + 25 + i * 18, line, {
                fontSize: '10px', fontFamily: 'monospace', color: '#666688',
            }).setOrigin(0.5);
        });

        // Version
        this.add.text(w - 10, h - 10, 'v1.0', {
            fontSize: '9px', fontFamily: 'monospace', color: '#333355',
        }).setOrigin(1, 1);

        // Keyboard
        this.input.keyboard.on('keydown-M', () => window.gameAudio.toggleMute());

        this._overlay = null;
        this._domInputs = [];
    }

    update() {
        for (const car of this.bgCars) {
            car.gfx.x += car.speed;
            if (car.gfx.x > CONFIG.WIDTH + 80) car.gfx.x = -80;
        }
    }

    _createButton(x, y, text, darkColor, lightColor, callback) {
        const bw = 300, bh = 55;
        const container = this.add.container(x, y);

        // Shadow
        const shadow = this.add.graphics();
        shadow.fillStyle(0x000000, 0.3);
        shadow.fillRoundedRect(-bw / 2 + 3, -bh / 2 + 3, bw, bh, 12);
        container.add(shadow);

        // Background
        const bg = this.add.graphics();
        bg.fillStyle(darkColor, 1);
        bg.fillRoundedRect(-bw / 2, -bh / 2, bw, bh, 12);
        // Lighter top half
        bg.fillStyle(lightColor, 1);
        bg.fillRoundedRect(-bw / 2, -bh / 2, bw, bh / 2, { tl: 12, tr: 12, bl: 0, br: 0 });
        // Border
        bg.lineStyle(1, 0xFFFFFF, 0.2);
        bg.strokeRoundedRect(-bw / 2, -bh / 2, bw, bh, 12);
        container.add(bg);

        const label = this.add.text(0, 0, text, {
            fontSize: '18px', fontFamily: '"Press Start 2P", monospace',
            color: '#FFFFFF', stroke: '#000000', strokeThickness: 2,
        }).setOrigin(0.5);
        container.add(label);

        container.setSize(bw, bh);
        container.setInteractive({ useHandCursor: true });
        container.on('pointerover', () => container.setScale(1.04));
        container.on('pointerout', () => container.setScale(1));
        container.on('pointerdown', () => { window.gameAudio.buttonClick(); callback(); });
    }

    // === DIALOGS (using positioned DOM inputs relative to game container) ===

    _getInputPosition() {
        // Calculate where the center of the game canvas is in the page
        const canvas = this.game.canvas;
        const rect = canvas.getBoundingClientRect();
        return {
            centerX: rect.left + rect.width / 2,
            centerY: rect.top + rect.height / 2,
            scaleX: rect.width / CONFIG.WIDTH,
            scaleY: rect.height / CONFIG.HEIGHT,
        };
    }

    _createDOMInput(opts) {
        const pos = this._getInputPosition();
        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'offroad-input';
        input.value = opts.value || '';
        input.placeholder = opts.placeholder || '';
        input.maxLength = opts.maxLength || 20;

        const offsetY = (opts.yOffset || 0) * pos.scaleY;
        const inputW = (opts.width || 200) * pos.scaleX;

        input.style.cssText = `
            position:fixed;
            left:${pos.centerX}px;
            top:${pos.centerY + offsetY}px;
            transform:translate(-50%,-50%);
            width:${inputW}px;
            padding:${8 * pos.scaleY}px ${12 * pos.scaleX}px;
            font-size:${(opts.fontSize || 16) * pos.scaleY}px;
            font-family:monospace;
            background:#12122a;
            color:${opts.color || '#fff'};
            border:2px solid ${opts.borderColor || '#FF6600'};
            border-radius:${8 * pos.scaleY}px;
            text-align:center;
            outline:none;
            z-index:9999;
            letter-spacing:${(opts.letterSpacing || 0) * pos.scaleX}px;
            text-transform:${opts.uppercase ? 'uppercase' : 'none'};
        `;
        document.body.appendChild(input);
        this._domInputs.push(input);
        return input;
    }

    _cleanupDialog() {
        this._domInputs.forEach(el => el.remove());
        this._domInputs = [];
        if (this._overlay) { this._overlay.destroy(); this._overlay = null; }
    }

    _showNameDialog(mode) {
        if (this._overlay) return;
        const w = CONFIG.WIDTH, h = CONFIG.HEIGHT;

        this._overlay = this.add.container(w / 2, h / 2).setDepth(100);

        // Dim
        const dim = this.add.graphics();
        dim.fillStyle(0x000000, 0.75);
        dim.fillRect(-w / 2, -h / 2, w, h);
        dim.setInteractive(new Phaser.Geom.Rectangle(-w/2, -h/2, w, h), Phaser.Geom.Rectangle.Contains);
        this._overlay.add(dim);

        // Dialog panel
        const panel = this.add.graphics();
        panel.fillStyle(0x1a1a3a, 1);
        panel.fillRoundedRect(-200, -120, 400, 240, 16);
        panel.lineStyle(2, mode === 'create' ? 0x33AA33 : 0xFF6600, 0.8);
        panel.strokeRoundedRect(-200, -120, 400, 240, 16);
        // Panel gradient
        panel.fillStyle(0x222244, 0.5);
        panel.fillRoundedRect(-200, -120, 400, 60, { tl: 16, tr: 16, bl: 0, br: 0 });
        this._overlay.add(panel);

        // Title
        const titleText = mode === 'create' ? 'Create Room' : 'Practice Mode';
        const titleColor = mode === 'create' ? '#33AA33' : '#FF6600';
        this._overlay.add(this.add.text(0, -95, titleText, {
            fontSize: '18px', fontFamily: '"Press Start 2P", monospace', color: titleColor,
        }).setOrigin(0.5));

        // Label
        this._overlay.add(this.add.text(0, -45, 'Enter Your Name', {
            fontSize: '12px', fontFamily: 'monospace', color: '#8888AA',
        }).setOrigin(0.5));

        // DOM input
        const nameInput = this._createDOMInput({
            value: this._getPlayerName(), maxLength: 12, yOffset: -10,
            width: 220, borderColor: mode === 'create' ? '#33AA33' : '#FF6600',
        });
        nameInput.focus();
        nameInput.select();

        // GO button
        const goBtn = this.add.container(0, 65);
        const goBg = this.add.graphics();
        const btnColor = mode === 'create' ? 0x33AA33 : 0xFF6600;
        goBg.fillStyle(btnColor, 1);
        goBg.fillRoundedRect(-70, -20, 140, 40, 10);
        goBg.lineStyle(1, 0xFFFFFF, 0.2);
        goBg.strokeRoundedRect(-70, -20, 140, 40, 10);
        const goLabel = this.add.text(0, 0, 'GO!', {
            fontSize: '18px', fontFamily: '"Press Start 2P", monospace', color: '#FFFFFF',
        }).setOrigin(0.5);
        goBtn.add([goBg, goLabel]);
        goBtn.setSize(140, 40);
        goBtn.setInteractive({ useHandCursor: true });
        this._overlay.add(goBtn);

        // Cancel button
        const cancelBtn = this.add.text(0, 108, 'Cancel', {
            fontSize: '12px', fontFamily: 'monospace', color: '#666688',
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });
        cancelBtn.on('pointerover', () => cancelBtn.setColor('#AAAACC'));
        cancelBtn.on('pointerout', () => cancelBtn.setColor('#666688'));
        cancelBtn.on('pointerdown', () => this._cleanupDialog());
        this._overlay.add(cancelBtn);

        const submit = () => {
            const name = nameInput.value.trim() || 'Player';
            this._savePlayerName(name);
            this._cleanupDialog();
            if (mode === 'create') {
                this.scene.start('LobbyScene', { isHost: true, playerName: name });
            } else {
                this.scene.start('RaceScene', {
                    isMultiplayer: false, trackIndex: 0, playerName: name,
                });
            }
        };

        goBtn.on('pointerdown', submit);
        nameInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') submit();
            if (e.key === 'Escape') this._cleanupDialog();
        });
    }

    _showJoinDialog() {
        if (this._overlay) return;
        const w = CONFIG.WIDTH, h = CONFIG.HEIGHT;

        this._overlay = this.add.container(w / 2, h / 2).setDepth(100);

        // Dim
        const dim = this.add.graphics();
        dim.fillStyle(0x000000, 0.75);
        dim.fillRect(-w / 2, -h / 2, w, h);
        dim.setInteractive(new Phaser.Geom.Rectangle(-w/2, -h/2, w, h), Phaser.Geom.Rectangle.Contains);
        this._overlay.add(dim);

        // Panel
        const panel = this.add.graphics();
        panel.fillStyle(0x1a1a3a, 1);
        panel.fillRoundedRect(-210, -160, 420, 320, 16);
        panel.lineStyle(2, 0x3388FF, 0.8);
        panel.strokeRoundedRect(-210, -160, 420, 320, 16);
        panel.fillStyle(0x222244, 0.5);
        panel.fillRoundedRect(-210, -160, 420, 60, { tl: 16, tr: 16, bl: 0, br: 0 });
        this._overlay.add(panel);

        this._overlay.add(this.add.text(0, -135, 'Join Room', {
            fontSize: '18px', fontFamily: '"Press Start 2P", monospace', color: '#3388FF',
        }).setOrigin(0.5));

        // Name label + input
        this._overlay.add(this.add.text(0, -80, 'Your Name', {
            fontSize: '11px', fontFamily: 'monospace', color: '#8888AA',
        }).setOrigin(0.5));

        const nameInput = this._createDOMInput({
            value: this._getPlayerName(), maxLength: 12, yOffset: -50,
            width: 200, borderColor: '#3388FF',
        });

        // Room code label + input
        this._overlay.add(this.add.text(0, -15, 'Room Code', {
            fontSize: '11px', fontFamily: 'monospace', color: '#8888AA',
        }).setOrigin(0.5));

        const codeInput = this._createDOMInput({
            placeholder: 'ABC123', maxLength: 6, yOffset: 20,
            width: 200, fontSize: 22, color: '#FF6600',
            borderColor: '#3388FF', letterSpacing: 6, uppercase: true,
        });
        codeInput.focus();

        // Error text
        const errorText = this.add.text(0, 70, '', {
            fontSize: '11px', fontFamily: 'monospace', color: '#FF4444',
        }).setOrigin(0.5);
        this._overlay.add(errorText);

        // Join button
        const joinBtn = this.add.container(0, 105);
        const joinBg = this.add.graphics();
        joinBg.fillStyle(0x3388FF, 1);
        joinBg.fillRoundedRect(-70, -20, 140, 40, 10);
        joinBg.lineStyle(1, 0xFFFFFF, 0.2);
        joinBg.strokeRoundedRect(-70, -20, 140, 40, 10);
        const joinLabel = this.add.text(0, 0, 'JOIN', {
            fontSize: '18px', fontFamily: '"Press Start 2P", monospace', color: '#FFFFFF',
        }).setOrigin(0.5);
        joinBtn.add([joinBg, joinLabel]);
        joinBtn.setSize(140, 40);
        joinBtn.setInteractive({ useHandCursor: true });
        this._overlay.add(joinBtn);

        // Cancel
        const cancelBtn = this.add.text(0, 148, 'Cancel', {
            fontSize: '12px', fontFamily: 'monospace', color: '#666688',
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });
        cancelBtn.on('pointerover', () => cancelBtn.setColor('#AAAACC'));
        cancelBtn.on('pointerout', () => cancelBtn.setColor('#666688'));
        cancelBtn.on('pointerdown', () => this._cleanupDialog());
        this._overlay.add(cancelBtn);

        const submit = () => {
            const name = nameInput.value.trim() || 'Player';
            const code = codeInput.value.trim().toUpperCase();
            if (code.length !== 6) {
                errorText.setText('Enter a 6-character room code');
                return;
            }
            this._savePlayerName(name);
            this._cleanupDialog();
            this.scene.start('LobbyScene', { isHost: false, playerName: name, roomCode: code });
        };

        joinBtn.on('pointerdown', submit);
        codeInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') submit();
            if (e.key === 'Escape') this._cleanupDialog();
        });
        nameInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') codeInput.focus();
            if (e.key === 'Escape') this._cleanupDialog();
        });
    }

    _getPlayerName() {
        try {
            return (JSON.parse(localStorage.getItem(CONFIG.SETTINGS_KEY) || '{}')).name || 'Player';
        } catch (e) { return 'Player'; }
    }

    _savePlayerName(name) {
        try {
            const s = JSON.parse(localStorage.getItem(CONFIG.SETTINGS_KEY) || '{}');
            s.name = name;
            localStorage.setItem(CONFIG.SETTINGS_KEY, JSON.stringify(s));
        } catch (e) {}
    }

    shutdown() {
        this._cleanupDialog();
    }
}
