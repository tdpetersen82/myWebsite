class ResultsScene extends Phaser.Scene {
    constructor() {
        super({ key: 'ResultsScene' });
    }

    init(data) {
        this.results = data.results || [];
        this.trackIndex = data.trackIndex || 0;
        this.isMultiplayer = data.isMultiplayer || false;
        this.isHost = data.isHost || false;
        this.roomCode = data.roomCode || '';
        this.playerName = data.playerName || 'Player';
        this.players = data.players || [];
    }

    create() {
        const w = CONFIG.WIDTH;
        const h = CONFIG.HEIGHT;

        // Background
        this.add.graphics().fillStyle(0x1a1a2e, 1).fillRect(0, 0, w, h);

        // Title
        this.add.text(w / 2, 40, 'RACE RESULTS', {
            fontSize: '32px',
            fontFamily: '"Press Start 2P", monospace',
            color: '#FF6600',
            stroke: '#000000',
            strokeThickness: 4,
        }).setOrigin(0.5);

        // Track name
        const trackName = CONFIG.TRACKS[this.trackIndex].name;
        this.add.text(w / 2, 80, trackName, {
            fontSize: '14px',
            fontFamily: 'monospace',
            color: '#AAAAAA',
        }).setOrigin(0.5);

        // Podium area
        this._renderPodium();

        // Results table
        this._renderResultsTable();

        // Particles
        this.confetti = new ParticleEmitter(this);
        this._celebrationEffect();

        // Buttons
        if (this.isMultiplayer) {
            this._createButton(w / 2 - 140, h - 60, 'LOBBY', 0x3388FF, () => {
                this.scene.start('LobbyScene', {
                    isHost: this.isHost,
                    playerName: this.playerName,
                    roomCode: this.roomCode,
                });
            });
            this._createButton(w / 2 + 140, h - 60, 'LEAVE', 0x666666, () => {
                window.networkManager.disconnect();
                this.scene.start('MenuScene');
            });
        } else {
            this._createButton(w / 2 - 120, h - 60, 'RETRY', 0x33AA33, () => {
                this.scene.start('RaceScene', {
                    isMultiplayer: false,
                    trackIndex: this.trackIndex,
                    playerName: this.playerName,
                });
            });
            this._createButton(w / 2 + 120, h - 60, 'MENU', 0x666666, () => {
                this.scene.start('MenuScene');
            });
        }

        // Mute key
        this.input.keyboard.on('keydown-M', () => window.gameAudio.toggleMute());
    }

    _renderPodium() {
        const w = CONFIG.WIDTH;
        const podiumY = 200;
        const podiumPositions = [
            { x: w / 2, y: podiumY - 30, height: 80, label: '1st' },        // 1st (center, tallest)
            { x: w / 2 - 120, y: podiumY, height: 55, label: '2nd' },       // 2nd (left)
            { x: w / 2 + 120, y: podiumY + 15, height: 40, label: '3rd' },  // 3rd (right)
        ];

        const colors = [0xFFD700, 0xC0C0C0, 0xCD7F32]; // Gold, Silver, Bronze

        for (let i = 0; i < Math.min(3, this.results.length); i++) {
            const result = this.results[i];
            const pos = podiumPositions[i];
            const vConfig = CONFIG.VEHICLES[result.colorIndex || i];

            // Podium block
            const gfx = this.add.graphics();
            gfx.fillStyle(colors[i], 0.8);
            gfx.fillRoundedRect(pos.x - 40, pos.y, 80, pos.height, 4);
            gfx.fillStyle(colors[i], 0.5);
            gfx.fillRoundedRect(pos.x - 40, pos.y, 80, 10, 4);

            // Position label
            this.add.text(pos.x, pos.y + pos.height / 2 + 5, pos.label, {
                fontSize: '14px', fontFamily: '"Press Start 2P", monospace',
                color: '#FFFFFF', stroke: '#000000', strokeThickness: 2,
            }).setOrigin(0.5);

            // Car on podium
            const carGfx = this.add.graphics();
            carGfx.fillStyle(vConfig.color, 1);
            carGfx.fillRoundedRect(pos.x - 14, pos.y - 18, 28, 16, 3);
            carGfx.fillStyle(vConfig.stripe, 1);
            carGfx.fillRect(pos.x - 10, pos.y - 11, 20, 2);
            carGfx.fillStyle(0x88CCFF, 0.7);
            carGfx.fillRect(pos.x + 6, pos.y - 16, 5, 12);

            // Name
            this.add.text(pos.x, pos.y - 32, result.name, {
                fontSize: '11px', fontFamily: 'monospace',
                color: '#FFFFFF', stroke: '#000000', strokeThickness: 2,
            }).setOrigin(0.5);

            // Time
            if (result.time) {
                const timeStr = this._formatTime(result.time);
                this.add.text(pos.x, pos.y - 45, timeStr, {
                    fontSize: '10px', fontFamily: 'monospace', color: '#AAAAAA',
                }).setOrigin(0.5);
            }
        }
    }

    _renderResultsTable() {
        const startX = 150;
        const startY = 340;
        const rowHeight = 32;

        // Headers
        const headers = ['POS', 'NAME', 'TIME', 'BEST LAP', 'TOP SPEED'];
        const colX = [0, 60, 200, 350, 500];

        headers.forEach((h, i) => {
            this.add.text(startX + colX[i], startY - 5, h, {
                fontSize: '11px', fontFamily: 'monospace', color: '#FF6600',
            });
        });

        // Divider
        const divider = this.add.graphics();
        divider.lineStyle(1, 0x444466, 1);
        divider.beginPath();
        divider.moveTo(startX, startY + 15);
        divider.lineTo(startX + 600, startY + 15);
        divider.strokePath();

        // Results rows
        this.results.forEach((result, i) => {
            const y = startY + 25 + i * rowHeight;
            const vConfig = CONFIG.VEHICLES[result.colorIndex || i];

            // Row background
            const rowBg = this.add.graphics();
            rowBg.fillStyle(i % 2 === 0 ? 0x2a2a4e : 0x222244, 0.4);
            rowBg.fillRect(startX - 5, y - 4, 610, rowHeight - 2);

            // Color swatch
            const swatch = this.add.graphics();
            swatch.fillStyle(vConfig.color, 1);
            swatch.fillRoundedRect(startX + colX[0], y, 16, 16, 3);

            // Position
            const suffix = result.position === 1 ? 'st' : result.position === 2 ? 'nd' : result.position === 3 ? 'rd' : 'th';
            this.add.text(startX + colX[0] + 24, y + 8, result.position + suffix, {
                fontSize: '13px', fontFamily: 'monospace',
                color: result.finished ? '#FFFFFF' : '#666666',
            }).setOrigin(0, 0.5);

            // Name
            this.add.text(startX + colX[1], y + 8, result.name, {
                fontSize: '13px', fontFamily: 'monospace', color: '#FFFFFF',
            }).setOrigin(0, 0.5);

            // Time
            this.add.text(startX + colX[2], y + 8, result.time ? this._formatTime(result.time) : 'DNF', {
                fontSize: '13px', fontFamily: 'monospace',
                color: result.time ? '#33CC33' : '#FF3333',
            }).setOrigin(0, 0.5);

            // Best lap
            this.add.text(startX + colX[3], y + 8, result.bestLap ? this._formatTime(result.bestLap) : '-', {
                fontSize: '13px', fontFamily: 'monospace', color: '#AAAAAA',
            }).setOrigin(0, 0.5);

            // Top speed
            this.add.text(startX + colX[4], y + 8, result.topSpeed ? result.topSpeed + ' km/h' : '-', {
                fontSize: '13px', fontFamily: 'monospace', color: '#AAAAAA',
            }).setOrigin(0, 0.5);
        });
    }

    _formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        const ms = Math.floor((seconds * 100) % 100);
        return mins + ':' + secs.toString().padStart(2, '0') + '.' + ms.toString().padStart(2, '0');
    }

    _celebrationEffect() {
        // Burst of confetti
        for (let i = 0; i < 3; i++) {
            this.time.delayedCall(i * 400, () => {
                this.confetti.emit('CONFETTI',
                    200 + Math.random() * (CONFIG.WIDTH - 400),
                    50 + Math.random() * 50,
                    { count: 30 }
                );
            });
        }
    }

    update(time, delta) {
        this.confetti.update(delta);
        this.confetti.render();
    }

    _createButton(x, y, text, color, callback) {
        const container = this.add.container(x, y);
        const bg = this.add.graphics();
        bg.fillStyle(color, 1);
        bg.fillRoundedRect(-80, -20, 160, 40, 8);
        const label = this.add.text(0, 0, text, {
            fontSize: '14px', fontFamily: '"Press Start 2P", monospace', color: '#FFFFFF',
        }).setOrigin(0.5);
        container.add([bg, label]);
        container.setSize(160, 40);
        container.setInteractive({ useHandCursor: true });
        container.on('pointerdown', () => {
            window.gameAudio.buttonClick();
            callback();
        });
        container.on('pointerover', () => container.setScale(1.05));
        container.on('pointerout', () => container.setScale(1));
    }

    shutdown() {
        if (this.confetti) this.confetti.destroy();
    }
}
