class LobbyScene extends Phaser.Scene {
    constructor() {
        super({ key: 'LobbyScene' });
    }

    init(data) {
        this.isHost = data.isHost;
        this.playerName = data.playerName || 'Player';
        this.roomCode = data.roomCode || '';
        this.selectedTrack = 0;
        this.players = [];
        this.connectionError = null;
    }

    create() {
        const w = CONFIG.WIDTH;
        const h = CONFIG.HEIGHT;
        const net = window.networkManager;

        // Background
        this.add.graphics().fillStyle(0x1a1a2e, 1).fillRect(0, 0, w, h);

        // Title bar
        this.add.graphics().fillStyle(0x0f0c29, 1).fillRect(0, 0, w, 60);
        this.add.text(w / 2, 30, 'RACE LOBBY', {
            fontSize: '24px', fontFamily: '"Press Start 2P", monospace', color: '#FF6600',
            stroke: '#000000', strokeThickness: 3,
        }).setOrigin(0.5);

        // Back button
        const backBtn = this.add.text(20, 30, '< BACK', {
            fontSize: '14px', fontFamily: 'monospace', color: '#AAAAAA',
        }).setOrigin(0, 0.5).setInteractive({ useHandCursor: true });
        backBtn.on('pointerdown', () => this._leave());
        backBtn.on('pointerover', () => backBtn.setColor('#FFFFFF'));
        backBtn.on('pointerout', () => backBtn.setColor('#AAAAAA'));

        // Room code section
        this.codeText = this.add.text(w / 2, 100, '', {
            fontSize: '14px', fontFamily: 'monospace', color: '#AAAAAA',
        }).setOrigin(0.5);

        this.codeDisplay = this.add.text(w / 2, 135, '', {
            fontSize: '40px', fontFamily: '"Press Start 2P", monospace', color: '#FF6600',
            stroke: '#000000', strokeThickness: 4, letterSpacing: 8,
        }).setOrigin(0.5);

        this.copyBtn = this.add.text(w / 2, 170, '[ Copy Code ]', {
            fontSize: '12px', fontFamily: 'monospace', color: '#3388FF',
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });
        this.copyBtn.on('pointerdown', () => {
            if (this.roomCode) {
                navigator.clipboard.writeText(this.roomCode).then(() => {
                    this.copyBtn.setText('Copied!');
                    this.time.delayedCall(1500, () => this.copyBtn.setText('[ Copy Code ]'));
                });
            }
        });

        // Player list
        this.add.text(80, 210, 'PLAYERS', {
            fontSize: '16px', fontFamily: 'monospace', color: '#FFFFFF',
        });

        this.playerListContainer = this.add.container(80, 240);
        this.playerSlots = [];
        for (let i = 0; i < CONFIG.RACE.MAX_PLAYERS; i++) {
            const slotY = i * 45;
            const slot = this.add.container(0, slotY);

            const bg = this.add.graphics();
            bg.fillStyle(0x2a2a4e, 0.5);
            bg.fillRoundedRect(0, 0, 350, 38, 6);
            slot.add(bg);

            const colorSwatch = this.add.graphics();
            slot.add(colorSwatch);

            const nameLabel = this.add.text(50, 19, 'Empty', {
                fontSize: '14px', fontFamily: 'monospace', color: '#666666',
            }).setOrigin(0, 0.5);
            slot.add(nameLabel);

            const readyLabel = this.add.text(300, 19, '', {
                fontSize: '12px', fontFamily: 'monospace', color: '#33CC33',
            }).setOrigin(0.5);
            slot.add(readyLabel);

            const pingLabel = this.add.text(340, 19, '', {
                fontSize: '10px', fontFamily: 'monospace', color: '#888888',
            }).setOrigin(0.5);
            slot.add(pingLabel);

            this.playerSlots.push({ bg, colorSwatch, nameLabel, readyLabel, pingLabel });
            this.playerListContainer.add(slot);
        }

        // Track selection (host only)
        this.add.text(550, 210, 'TRACK', {
            fontSize: '16px', fontFamily: 'monospace', color: '#FFFFFF',
        });

        this.trackPreviewContainer = this.add.container(550, 240);

        // Track preview box
        const previewBg = this.add.graphics();
        previewBg.fillStyle(0x2a2a4e, 1);
        previewBg.fillRoundedRect(0, 0, 400, 250, 8);
        previewBg.lineStyle(1, 0x444466, 1);
        previewBg.strokeRoundedRect(0, 0, 400, 250, 8);
        this.trackPreviewContainer.add(previewBg);

        this.trackNameText = this.add.text(200, 20, '', {
            fontSize: '18px', fontFamily: '"Press Start 2P", monospace', color: '#FFFFFF',
        }).setOrigin(0.5);
        this.trackPreviewContainer.add(this.trackNameText);

        // Mini track preview
        this.trackPreviewGfx = this.add.graphics();
        this.trackPreviewContainer.add(this.trackPreviewGfx);

        this.trackInfoText = this.add.text(200, 220, '', {
            fontSize: '11px', fontFamily: 'monospace', color: '#AAAAAA',
        }).setOrigin(0.5);
        this.trackPreviewContainer.add(this.trackInfoText);

        // Track selection arrows (host only)
        if (this.isHost) {
            const leftArrow = this.add.text(30, 130, '<', {
                fontSize: '28px', fontFamily: 'monospace', color: '#FF6600',
            }).setOrigin(0.5).setInteractive({ useHandCursor: true });
            leftArrow.on('pointerdown', () => {
                this.selectedTrack = (this.selectedTrack - 1 + CONFIG.TRACKS.length) % CONFIG.TRACKS.length;
                this._updateTrackPreview();
            });
            this.trackPreviewContainer.add(leftArrow);

            const rightArrow = this.add.text(370, 130, '>', {
                fontSize: '28px', fontFamily: 'monospace', color: '#FF6600',
            }).setOrigin(0.5).setInteractive({ useHandCursor: true });
            rightArrow.on('pointerdown', () => {
                this.selectedTrack = (this.selectedTrack + 1) % CONFIG.TRACKS.length;
                this._updateTrackPreview();
            });
            this.trackPreviewContainer.add(rightArrow);
        }

        this._updateTrackPreview();

        // Ready / Start buttons
        if (this.isHost) {
            this.startBtn = this._createActionButton(w / 2, h - 60, 'START RACE', 0x33AA33, () => {
                this._startRace();
            });
        } else {
            this.readyToggle = false;
            this.readyBtn = this._createActionButton(w / 2, h - 60, 'READY', 0x3388FF, () => {
                this.readyToggle = !this.readyToggle;
                net.setReady(this.readyToggle);
                this.readyBtn.label.setText(this.readyToggle ? 'NOT READY' : 'READY');
            });
        }

        // Status text
        this.statusText = this.add.text(w / 2, h - 20, '', {
            fontSize: '11px', fontFamily: 'monospace', color: '#888888',
        }).setOrigin(0.5);

        // Error text
        this.errorText = this.add.text(w / 2, h - 100, '', {
            fontSize: '13px', fontFamily: 'monospace', color: '#FF3333',
        }).setOrigin(0.5);

        // Initialize network
        this._initNetwork();

        // Mute key
        this.input.keyboard.on('keydown-M', () => window.gameAudio.toggleMute());
    }

    async _initNetwork() {
        const net = window.networkManager;

        // Set up callbacks
        net.onLobbyState = (state) => this._updateLobbyState(state);
        net.onRaceStart = (data) => this._onRaceStart(data);
        net.onPlayerJoined = () => window.gameAudio.playerJoin();
        net.onPlayerLeft = () => window.gameAudio.playerLeave();
        net.onDisconnected = (reason) => {
            this.errorText.setText(reason || 'Disconnected');
            this.time.delayedCall(3000, () => {
                net.disconnect();
                this.scene.start('MenuScene');
            });
        };

        try {
            if (this.isHost) {
                const code = await net.createRoom(this.playerName);
                this.roomCode = code;
                this.codeText.setText('Share this code with your friends:');
                this.codeDisplay.setText(code);
                this.statusText.setText('Waiting for players...');
                net.startPinging();
            } else {
                this.codeText.setText('Joining room...');
                this.codeDisplay.setText(this.roomCode);
                await net.joinRoom(this.roomCode, this.playerName);
                this.codeText.setText('Room Code:');
                this.statusText.setText('Connected! Waiting for host to start...');
                net.startPinging();
            }
        } catch (err) {
            this.errorText.setText(err.message || 'Connection failed');
            this.time.delayedCall(4000, () => {
                net.disconnect();
                this.scene.start('MenuScene');
            });
        }
    }

    _updateLobbyState(state) {
        this.players = state.players || [];

        for (let i = 0; i < CONFIG.RACE.MAX_PLAYERS; i++) {
            const slot = this.playerSlots[i];
            const player = this.players[i];

            if (player) {
                const vc = CONFIG.VEHICLES[player.colorIndex];
                slot.colorSwatch.clear();
                slot.colorSwatch.fillStyle(vc.color, 1);
                slot.colorSwatch.fillRoundedRect(10, 8, 24, 22, 4);

                slot.nameLabel.setText(player.name + (player.id === state.hostId ? ' (Host)' : ''));
                slot.nameLabel.setColor(player.connected ? '#FFFFFF' : '#666666');
                slot.readyLabel.setText(player.ready ? 'READY' : '');
                slot.readyLabel.setColor(player.ready ? '#33CC33' : '#FF6600');
                slot.pingLabel.setText(player.rtt > 0 ? player.rtt + 'ms' : '');

                slot.bg.clear();
                slot.bg.fillStyle(player.connected ? 0x2a2a4e : 0x1a1a1e, 0.5);
                slot.bg.fillRoundedRect(0, 0, 350, 38, 6);
            } else {
                slot.colorSwatch.clear();
                slot.nameLabel.setText('Empty');
                slot.nameLabel.setColor('#444444');
                slot.readyLabel.setText('');
                slot.pingLabel.setText('');
                slot.bg.clear();
                slot.bg.fillStyle(0x1a1a2e, 0.3);
                slot.bg.fillRoundedRect(0, 0, 350, 38, 6);
            }
        }

        this.statusText.setText(this.players.length + ' / ' + CONFIG.RACE.MAX_PLAYERS + ' players');

        // Update track selection if from host
        if (state.trackIndex !== undefined) {
            this.selectedTrack = state.trackIndex;
            this._updateTrackPreview();
        }
    }

    _updateTrackPreview() {
        const track = CONFIG.TRACKS[this.selectedTrack];
        this.trackNameText.setText(track.name);
        this.trackInfoText.setText(track.laps + ' Laps | Width: ' + track.trackWidth + ' | Zones: ' + (track.terrainZones || []).length);

        // Draw mini preview
        this.trackPreviewGfx.clear();

        // Find bounds
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        for (const p of track.centerLine) {
            minX = Math.min(minX, p.x); minY = Math.min(minY, p.y);
            maxX = Math.max(maxX, p.x); maxY = Math.max(maxY, p.y);
        }

        const previewW = 340;
        const previewH = 150;
        const scaleX = previewW / (maxX - minX + 100);
        const scaleY = previewH / (maxY - minY + 100);
        const scale = Math.min(scaleX, scaleY);
        const offsetX = 30 + (previewW - (maxX - minX) * scale) / 2;
        const offsetY = 45 + (previewH - (maxY - minY) * scale) / 2;

        // Draw track path
        this.trackPreviewGfx.lineStyle(Math.max(2, track.trackWidth * scale * 0.3), track.theme.trackSurface, 0.7);
        this.trackPreviewGfx.beginPath();
        for (let i = 0; i < track.centerLine.length; i++) {
            const p = track.centerLine[i];
            const px = (p.x - minX) * scale + offsetX;
            const py = (p.y - minY) * scale + offsetY;
            if (i === 0) this.trackPreviewGfx.moveTo(px, py);
            else this.trackPreviewGfx.lineTo(px, py);
        }
        this.trackPreviewGfx.closePath();
        this.trackPreviewGfx.strokePath();

        // Draw terrain zones
        for (const zone of (track.terrainZones || [])) {
            const terrain = CONFIG.TERRAIN[zone.type];
            if (!terrain) continue;
            const zx = (zone.center.x - minX) * scale + offsetX;
            const zy = (zone.center.y - minY) * scale + offsetY;
            this.trackPreviewGfx.fillStyle(terrain.color, 0.5);
            this.trackPreviewGfx.fillCircle(zx, zy, zone.radius * scale);
        }

        // Start position marker
        const sp = track.startPositions[0];
        if (sp) {
            const sx = (sp.x - minX) * scale + offsetX;
            const sy = (sp.y - minY) * scale + offsetY;
            this.trackPreviewGfx.fillStyle(0x33FF33, 1);
            this.trackPreviewGfx.fillCircle(sx, sy, 4);
        }
    }

    _createActionButton(x, y, text, color, callback) {
        const container = this.add.container(x, y);
        const bg = this.add.graphics();
        bg.fillStyle(color, 1);
        bg.fillRoundedRect(-100, -22, 200, 44, 10);
        const label = this.add.text(0, 0, text, {
            fontSize: '16px', fontFamily: '"Press Start 2P", monospace', color: '#FFFFFF',
        }).setOrigin(0.5);
        container.add([bg, label]);
        container.setSize(200, 44);
        container.setInteractive({ useHandCursor: true });
        container.on('pointerdown', () => {
            window.gameAudio.buttonClick();
            callback();
        });
        container.on('pointerover', () => container.setScale(1.05));
        container.on('pointerout', () => container.setScale(1));
        container.label = label;
        return container;
    }

    _startRace() {
        if (this.players.length < 1) {
            this.errorText.setText('Need at least 1 player');
            return;
        }

        const net = window.networkManager;
        net.startRace(this.selectedTrack);
    }

    _onRaceStart(data) {
        const trackIndex = data.trackIndex !== undefined ? data.trackIndex : this.selectedTrack;
        const net = window.networkManager;

        this.scene.start('RaceScene', {
            isMultiplayer: true,
            isHost: this.isHost,
            trackIndex: trackIndex,
            players: this.players,
            playerName: this.playerName,
            roomCode: this.roomCode,
        });
    }

    _leave() {
        window.networkManager.disconnect();
        this.scene.start('MenuScene');
    }

    shutdown() {
        // Stop pinging when leaving lobby
        window.networkManager.stopPinging();
        // Clean up any stale DOM inputs from menu
        document.querySelectorAll('.offroad-input').forEach(el => el.remove());
    }
}
