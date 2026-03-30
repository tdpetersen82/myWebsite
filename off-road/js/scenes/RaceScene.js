class RaceScene extends Phaser.Scene {
    constructor() {
        super({ key: 'RaceScene' });
    }

    init(data) {
        this.isMultiplayer = data.isMultiplayer || false;
        this.isHost = data.isHost || false;
        this.trackIndex = data.trackIndex || 0;
        this.playersList = data.players || [];
        this.playerName = data.playerName || 'Player';
        this.roomCode = data.roomCode || '';
        this.localPlayerIndex = 0;
    }

    create() {
        const w = CONFIG.WIDTH;
        const h = CONFIG.HEIGHT;

        // === TRACK ===
        this.trackRenderer = new TrackRenderer(this, this.trackIndex);
        this.trackRenderer.render();

        // === PHYSICS ===
        this.physicsEngine = new PhysicsEngine(this.trackRenderer);

        // === PARTICLES ===
        this.particles = new ParticleEmitter(this);

        // === INPUT ===
        this.inputManager = new InputManager(this);

        // === VEHICLES ===
        this.vehicles = new Map(); // id -> Vehicle entity
        this.localVehicleId = null;

        if (this.isMultiplayer) {
            this._setupMultiplayerVehicles();
        } else {
            this._setupSinglePlayerVehicle();
        }

        // === POWER-UPS ===
        this.powerUps = [];
        this._spawnPowerUps();

        // === PROJECTILES (visual) ===
        this.projectileEntities = new Map();

        // === HUD ===
        this._createHUD();

        // === CAMERA ===
        const ww = this.trackRenderer.worldWidth;
        const wh = this.trackRenderer.worldHeight;
        this.cameras.main.setBounds(-50, -50, ww + 100, wh + 100);
        this.cameras.main.setZoom(CONFIG.CAMERA.ZOOM);

        // === SPEED LINES overlay ===
        this.speedLinesGfx = this.add.graphics().setScrollFactor(0).setDepth(35);

        // === LAP NOTIFICATION ===
        this.lapNotifyText = this.add.text(CONFIG.WIDTH / 2, CONFIG.HEIGHT / 2 - 60, '', {
            fontSize: '36px', fontFamily: '"Press Start 2P", monospace',
            color: '#33FF88', stroke: '#000000', strokeThickness: 5,
        }).setOrigin(0.5).setScrollFactor(0).setDepth(45).setAlpha(0);

        // === WRONG WAY ===
        this.wrongWayText = this.add.text(CONFIG.WIDTH / 2, 80, 'WRONG WAY!', {
            fontSize: '28px', fontFamily: '"Press Start 2P", monospace',
            color: '#FF3333', stroke: '#000000', strokeThickness: 4,
        }).setOrigin(0.5).setScrollFactor(0).setDepth(45).setAlpha(0);
        this.wrongWayTimer = 0;
        this.lastCenterIdx = -1;

        // === SCREEN SHAKE ===
        this.shakeIntensity = 0;
        this.shakeDuration = 0;
        this.shakeTimer = 0;

        // === RACE STATE ===
        this.raceState = 'countdown'; // countdown, racing, finished
        this.raceStartTime = 0;
        this.raceTime = 0;
        this.countdownValue = CONFIG.RACE.COUNTDOWN_SECS;
        this.finishTimeout = 0;
        this.finishedPlayers = [];
        this.syncTimer = 0;
        this.particleTimer = 0;

        // === NETWORK ===
        if (this.isMultiplayer) {
            this._setupNetworkCallbacks();
        }

        // === WEATHER PARTICLES ===
        this._createWeatherParticles();

        // === AUDIO ===
        window.gameAudio.startEngine();
        window.gameAudio.startMusic();

        // === COUNTDOWN ===
        this._startCountdown();

        // Mute key
        this.input.keyboard.on('keydown-M', () => window.gameAudio.toggleMute());

        // Escape to leave
        this.input.keyboard.on('keydown-ESC', () => this._confirmLeave());
    }

    _setupSinglePlayerVehicle() {
        const trackData = CONFIG.TRACKS[this.trackIndex];
        const startAngle = this.trackRenderer.getStartAngle();

        // Player vehicle
        const startPos = trackData.startPositions[0];
        const pv = this.physicsEngine.addVehicle('local', { x: startPos.x, y: startPos.y, angle: startAngle });
        pv.lapStartTime = performance.now();

        const vehicle = new Vehicle(this, CONFIG.VEHICLES[0], 0);
        vehicle.isLocal = true;
        vehicle.setName(this.playerName);
        vehicle.displayX = startPos.x;
        vehicle.displayY = startPos.y;
        vehicle.displayAngle = startAngle;
        this.vehicles.set('local', vehicle);
        this.localVehicleId = 'local';

        // AI opponents
        this.aiVehicles = [];
        const aiCount = CONFIG.AI.COUNT;
        for (let i = 0; i < aiCount; i++) {
            const sp = trackData.startPositions[i + 1] || trackData.startPositions[0];
            const aiId = 'ai_' + i;
            const colorIdx = i + 1;
            const aiPv = this.physicsEngine.addVehicle(aiId, { x: sp.x, y: sp.y, angle: startAngle });
            aiPv.lapStartTime = performance.now();

            const aiVehicle = new Vehicle(this, CONFIG.VEHICLES[colorIdx % CONFIG.VEHICLES.length], colorIdx);
            const name = CONFIG.AI.NAMES[i % CONFIG.AI.NAMES.length];
            aiVehicle.setName(name);
            aiVehicle.displayX = sp.x;
            aiVehicle.displayY = sp.y;
            aiVehicle.displayAngle = startAngle;
            this.vehicles.set(aiId, aiVehicle);

            this.aiVehicles.push({
                id: aiId,
                speedMult: CONFIG.AI.SPEED_BASE + (Math.random() - 0.5) * CONFIG.AI.SPEED_VARIANCE * 2,
                currentCenterIdx: 0,
                powerUpTimer: 0,
            });
        }
    }

    _setupMultiplayerVehicles() {
        const trackData = CONFIG.TRACKS[this.trackIndex];
        const net = window.networkManager;
        const startAngle = this.trackRenderer.getStartAngle();

        this.playersList.forEach((player, index) => {
            const startPos = trackData.startPositions[index] || trackData.startPositions[0];
            const vConfig = CONFIG.VEHICLES[player.colorIndex || index];

            const pv = this.physicsEngine.addVehicle(player.id, { x: startPos.x, y: startPos.y, angle: startAngle });
            pv.lapStartTime = performance.now();

            const vehicle = new Vehicle(this, vConfig, player.colorIndex || index);
            vehicle.setName(player.name);
            vehicle.displayX = startPos.x;
            vehicle.displayY = startPos.y;
            vehicle.displayAngle = startAngle;

            if (player.id === net.localId) {
                vehicle.isLocal = true;
                this.localVehicleId = player.id;
                this.localPlayerIndex = index;
            }

            this.vehicles.set(player.id, vehicle);
        });
    }

    _spawnPowerUps() {
        const trackData = CONFIG.TRACKS[this.trackIndex];
        if (!trackData.powerUpSpawns) return;

        trackData.powerUpSpawns.forEach((spawn, i) => {
            const type = spawn.types[Math.floor(Math.random() * spawn.types.length)];
            const pu = new PowerUp(this, 'pu_' + i, type, spawn.x, spawn.y);
            this.powerUps.push(pu);
        });
    }

    _setupNetworkCallbacks() {
        const net = window.networkManager;

        if (this.isHost) {
            net.onInput = (fromId, input) => {
                this.physicsEngine.setInput(fromId, input);
            };
        } else {
            net.onGameState = (state) => {
                this._applyNetworkState(state);
            };
        }

        net.onEvent = (data) => {
            this._handleNetworkEvent(data);
        };

        net.onRaceEnd = (data) => {
            this._showResults(data.results);
        };

        net.onDisconnected = (reason) => {
            this._showDisconnectMessage(reason);
        };
    }

    // === COUNTDOWN ===

    _startCountdown() {
        this.countdownText = this.add.text(CONFIG.WIDTH / 2, CONFIG.HEIGHT / 2, '', {
            fontSize: '80px',
            fontFamily: '"Press Start 2P", monospace',
            color: '#FFFFFF',
            stroke: '#000000',
            strokeThickness: 8,
        }).setOrigin(0.5).setScrollFactor(0).setDepth(50);

        this._countdownTick();
    }

    _countdownTick() {
        const hasUI = this.textures.exists('ui');
        if (this.countdownValue > 0) {
            const spriteKey = 'countdown_' + this.countdownValue;
            const useSprite = hasUI && this.textures.get('ui').has(spriteKey);

            if (useSprite) {
                // Use sprite for countdown number
                this.countdownText.setVisible(false);
                if (this._countdownSprite) this._countdownSprite.destroy();
                this._countdownSprite = this.add.image(CONFIG.WIDTH / 2, CONFIG.HEIGHT / 2, 'ui', spriteKey)
                    .setScrollFactor(0).setDepth(50).setScale(2).setAlpha(1);
                this.tweens.add({
                    targets: this._countdownSprite,
                    scaleX: 1, scaleY: 1,
                    duration: 400, ease: 'Cubic.easeOut',
                });
                this.tweens.add({
                    targets: this._countdownSprite,
                    alpha: 0.3,
                    duration: 800, ease: 'Linear',
                });
            } else {
                // Fallback to text
                const colors = ['#FF3333', '#FFCC00', '#33CC33'];
                this.countdownText.setVisible(true);
                this.countdownText.setText(this.countdownValue.toString());
                this.countdownText.setColor(colors[CONFIG.RACE.COUNTDOWN_SECS - this.countdownValue] || '#FFFFFF');
                this.countdownText.setScale(2).setAlpha(1);
                this.tweens.add({
                    targets: this.countdownText,
                    scaleX: 1, scaleY: 1,
                    duration: 400, ease: 'Cubic.easeOut',
                });
                this.tweens.add({
                    targets: this.countdownText,
                    alpha: 0.3,
                    duration: 800, ease: 'Linear',
                });
            }

            window.gameAudio.countdown(this.countdownValue);
            this._triggerShake(CONFIG.SCREEN_SHAKE.COUNTDOWN);

            this.countdownValue--;
            this.time.delayedCall(1000, () => this._countdownTick());
        } else {
            // GO!
            if (this._countdownSprite) { this._countdownSprite.destroy(); this._countdownSprite = null; }

            const goSpriteKey = 'countdown_go';
            const useGoSprite = hasUI && this.textures.get('ui').has(goSpriteKey);

            if (useGoSprite) {
                this.countdownText.setVisible(false);
                const goSprite = this.add.image(CONFIG.WIDTH / 2, CONFIG.HEIGHT / 2, 'ui', goSpriteKey)
                    .setScrollFactor(0).setDepth(50).setScale(2).setAlpha(1);
                this.tweens.add({
                    targets: goSprite,
                    scaleX: 3, scaleY: 3, alpha: 0,
                    duration: 600,
                    onComplete: () => goSprite.destroy(),
                });
            } else {
                this.countdownText.setVisible(true);
                this.countdownText.setText('GO!');
                this.countdownText.setColor('#33FF33');
                this.countdownText.setScale(2).setAlpha(1);
                this.tweens.add({
                    targets: this.countdownText,
                    scaleX: 3, scaleY: 3, alpha: 0,
                    duration: 600,
                    onComplete: () => this.countdownText.destroy(),
                });
            }

            window.gameAudio.countdown(0);
            this._triggerShake({ intensity: 8, duration: 400 });

            this.raceState = 'racing';
            this.raceStartTime = performance.now();

            // Reset lap start times
            for (const v of this.physicsEngine.vehicles) {
                v.lapStartTime = this.raceStartTime;
            }
        }
    }

    // === HUD ===

    _createHUD() {
        this.hudContainer = this.add.container(0, 0).setScrollFactor(0).setDepth(40);
        const W = CONFIG.WIDTH, H = CONFIG.HEIGHT;

        // === TOP BAR (gradient panel) ===
        const topBar = this.add.graphics();
        topBar.fillStyle(0x0A0A1A, 0.8);
        topBar.fillRoundedRect(0, 0, W, 44, { tl: 0, tr: 0, bl: 8, br: 8 });
        topBar.fillStyle(0x1A1A3A, 0.3);
        topBar.fillRect(0, 0, W, 22);
        topBar.lineStyle(1, 0x3366AA, 0.3);
        topBar.beginPath(); topBar.moveTo(0, 44); topBar.lineTo(W, 44); topBar.strokePath();
        this.hudContainer.add(topBar);

        // Position badge
        this.hudPosBadge = this.add.graphics();
        this.hudContainer.add(this.hudPosBadge);
        this.hudPosition = this.add.text(36, 22, '1st', {
            fontSize: '22px', fontFamily: '"Press Start 2P", monospace', color: '#FFD700',
            stroke: '#000000', strokeThickness: 4,
        }).setOrigin(0.5);
        this.hudContainer.add(this.hudPosition);

        // Lap (with panel)
        const lapPanel = this.add.graphics();
        lapPanel.fillStyle(0x1A1A3A, 0.6); lapPanel.fillRoundedRect(110, 6, 120, 32, 6);
        lapPanel.lineStyle(1, 0x4466AA, 0.3); lapPanel.strokeRoundedRect(110, 6, 120, 32, 6);
        this.hudContainer.add(lapPanel);
        this.hudLapLabel = this.add.text(120, 14, 'LAP', {
            fontSize: '8px', fontFamily: 'monospace', color: '#6688AA',
        });
        this.hudContainer.add(this.hudLapLabel);
        this.hudLap = this.add.text(170, 26, '0/3', {
            fontSize: '16px', fontFamily: '"Press Start 2P", monospace', color: '#FFFFFF',
            stroke: '#000000', strokeThickness: 2,
        }).setOrigin(0.5, 0.5);
        this.hudContainer.add(this.hudLap);

        // Timer (center panel)
        const timerPanel = this.add.graphics();
        timerPanel.fillStyle(0x1A1A3A, 0.6); timerPanel.fillRoundedRect(W/2 - 75, 6, 150, 32, 6);
        timerPanel.lineStyle(1, 0x4466AA, 0.3); timerPanel.strokeRoundedRect(W/2 - 75, 6, 150, 32, 6);
        this.hudContainer.add(timerPanel);
        this.hudTimerLabel = this.add.text(W/2, 13, 'TIME', {
            fontSize: '7px', fontFamily: 'monospace', color: '#6688AA',
        }).setOrigin(0.5);
        this.hudContainer.add(this.hudTimerLabel);
        this.hudTimer = this.add.text(W / 2, 30, '0:00.00', {
            fontSize: '16px', fontFamily: '"Press Start 2P", monospace', color: '#33FF88',
            stroke: '#000000', strokeThickness: 2,
        }).setOrigin(0.5);
        this.hudContainer.add(this.hudTimer);

        // Speed (right panel)
        const speedPanel = this.add.graphics();
        speedPanel.fillStyle(0x1A1A3A, 0.6); speedPanel.fillRoundedRect(W - 160, 6, 150, 32, 6);
        speedPanel.lineStyle(1, 0x4466AA, 0.3); speedPanel.strokeRoundedRect(W - 160, 6, 150, 32, 6);
        this.hudContainer.add(speedPanel);
        this.hudSpeedLabel = this.add.text(W - 85, 13, 'SPEED', {
            fontSize: '7px', fontFamily: 'monospace', color: '#6688AA',
        }).setOrigin(0.5);
        this.hudContainer.add(this.hudSpeedLabel);
        this.hudSpeed = this.add.text(W - 85, 30, '0', {
            fontSize: '16px', fontFamily: '"Press Start 2P", monospace', color: '#FFFFFF',
            stroke: '#000000', strokeThickness: 2,
        }).setOrigin(0.5);
        this.hudContainer.add(this.hudSpeed);
        this.hudSpeedUnit = this.add.text(W - 30, 30, 'km/h', {
            fontSize: '8px', fontFamily: 'monospace', color: '#6688AA',
        }).setOrigin(0.5);
        this.hudContainer.add(this.hudSpeedUnit);

        // === BOTTOM BAR ===
        const botBar = this.add.graphics();
        botBar.fillStyle(0x0A0A1A, 0.7);
        botBar.fillRoundedRect(0, H - 56, 260, 56, { tl: 8, tr: 8, bl: 0, br: 0 });
        botBar.lineStyle(1, 0x3366AA, 0.2);
        botBar.beginPath(); botBar.moveTo(0, H - 56); botBar.lineTo(260, H - 56); botBar.strokePath();
        this.hudContainer.add(botBar);

        // Nitro bar (styled)
        this.hudNitroLabel = this.add.text(14, H - 38, 'NITRO', {
            fontSize: '8px', fontFamily: '"Press Start 2P", monospace', color: '#FF8800',
            stroke: '#000000', strokeThickness: 2,
        }).setOrigin(0, 0.5);
        this.hudContainer.add(this.hudNitroLabel);

        this.hudNitroBg = this.add.graphics();
        this.hudNitroBg.fillStyle(0x1A1A2A, 0.8);
        this.hudNitroBg.fillRoundedRect(72, H - 46, 170, 16, 4);
        this.hudNitroBg.lineStyle(1, 0x444466, 0.5);
        this.hudNitroBg.strokeRoundedRect(72, H - 46, 170, 16, 4);
        this.hudContainer.add(this.hudNitroBg);

        this.hudNitroBar = this.add.graphics();
        this.hudContainer.add(this.hudNitroBar);

        // Nitro bar frame sprite overlay (if ui atlas available)
        if (this.textures.exists('ui') && this.textures.get('ui').has('nitro_bar_frame')) {
            this.hudNitroFrame = this.add.image(72 + 85, H - 38, 'ui', 'nitro_bar_frame')
                .setOrigin(0.5).setDisplaySize(174, 20);
            this.hudContainer.add(this.hudNitroFrame);
        }

        // Power-up indicator
        this.hudPowerUpBg = this.add.graphics();
        this.hudContainer.add(this.hudPowerUpBg);

        // Power-up slot sprite overlay (if ui atlas available)
        if (this.textures.exists('ui') && this.textures.get('ui').has('powerup_slot')) {
            this.hudPowerUpSlot = this.add.image(W / 2, H - 34, 'ui', 'powerup_slot')
                .setOrigin(0.5).setAlpha(0.8);
            this.hudContainer.add(this.hudPowerUpSlot);
        }
        this.hudPowerUp = this.add.text(W / 2, H - 34, '', {
            fontSize: '12px', fontFamily: '"Press Start 2P", monospace', color: '#FFFFFF',
            stroke: '#000000', strokeThickness: 3,
        }).setOrigin(0.5);
        this.hudContainer.add(this.hudPowerUp);

        // Minimap
        this.minimapGfx = this.add.graphics();
        this.minimapGfx.setScrollFactor(0);
        this.minimapGfx.setDepth(41);

        // Minimap frame sprite overlay (if ui atlas available)
        if (this.textures.exists('ui') && this.textures.get('ui').has('minimap_frame')) {
            const mmX = W - 175, mmY = H - 135, mmW = 160, mmH = 120;
            this.minimapFrame = this.add.image(mmX + mmW / 2, mmY + mmH / 2, 'ui', 'minimap_frame')
                .setDisplaySize(mmW + 12, mmH + 12).setScrollFactor(0).setDepth(42).setAlpha(0.9);
        }
    }

    _updateHUD() {
        const localPV = this.physicsEngine.getVehicle(this.localVehicleId);
        if (!localPV) return;
        const W = CONFIG.WIDTH, H = CONFIG.HEIGHT;

        const trackData = CONFIG.TRACKS[this.trackIndex];
        const totalLaps = trackData.laps || CONFIG.RACE.DEFAULT_LAPS;

        // Position badge
        const positions = this.physicsEngine.getRacePositions();
        const pos = positions.findIndex(v => v.id === this.localVehicleId) + 1;
        const suffix = pos === 1 ? 'st' : pos === 2 ? 'nd' : pos === 3 ? 'rd' : 'th';
        const posColors = { 1: '#FFD700', 2: '#C0C0C0', 3: '#CD7F32' };
        const posBgColors = { 1: 0xFFD700, 2: 0xC0C0C0, 3: 0xCD7F32 };
        this.hudPosition.setText(pos + suffix);
        this.hudPosition.setColor(posColors[pos] || '#FFFFFF');
        // Badge background
        this.hudPosBadge.clear();
        this.hudPosBadge.fillStyle(posBgColors[pos] || 0x444466, 0.15);
        this.hudPosBadge.fillRoundedRect(8, 6, 56, 32, 6);
        this.hudPosBadge.lineStyle(1, posBgColors[pos] || 0x666688, 0.4);
        this.hudPosBadge.strokeRoundedRect(8, 6, 56, 32, 6);

        // Lap
        const lap = Math.min(localPV.lap + 1, totalLaps);
        this.hudLap.setText(lap + '/' + totalLaps);

        // Timer
        if (this.raceState === 'racing') {
            this.raceTime = (performance.now() - this.raceStartTime) / 1000;
        }
        const mins = Math.floor(this.raceTime / 60);
        const secs = Math.floor(this.raceTime % 60);
        const ms = Math.floor((this.raceTime * 100) % 100);
        this.hudTimer.setText(mins + ':' + secs.toString().padStart(2, '0') + '.' + ms.toString().padStart(2, '0'));

        // Speed
        const speedKmh = Math.round(Math.abs(localPV.speed) * 0.8);
        this.hudSpeed.setText(speedKmh.toString());

        // Nitro bar (gradient fill)
        this.hudNitroBar.clear();
        const nitroFrac = localPV.nitro / CONFIG.PHYSICS.NITRO_MAX;
        const barW = 168 * nitroFrac;
        if (barW > 2) {
            // Gradient: green when full → orange → red when low
            const r = nitroFrac < 0.5 ? 255 : Math.floor(255 * (1 - (nitroFrac - 0.5) * 2) + 255 * ((nitroFrac - 0.5) * 2));
            const green = nitroFrac > 0.5 ? Math.floor(100 + 155 * ((nitroFrac - 0.5) * 2)) : Math.floor(100 * nitroFrac * 2);
            const barColor = (Math.min(255, r) << 16) | (Math.min(255, green) << 8) | 0;
            // Bar fill
            this.hudNitroBar.fillStyle(barColor, 0.9);
            this.hudNitroBar.fillRoundedRect(73, H - 45, barW, 14, 3);
            // Bright top edge
            this.hudNitroBar.fillStyle(0xFFFFFF, 0.15);
            this.hudNitroBar.fillRect(73, H - 45, barW, 3);
            // Glow when full
            if (nitroFrac > 0.9) {
                this.hudNitroBar.fillStyle(barColor, 0.15);
                this.hudNitroBar.fillRoundedRect(70, H - 50, barW + 6, 24, 6);
            }
        }

        // Power-up display
        this.hudPowerUpBg.clear();
        if (localPV.powerUp) {
            const puConfig = CONFIG.POWERUPS[localPV.powerUp];
            this.hudPowerUp.setText('[E] ' + (puConfig ? puConfig.label : localPV.powerUp));
            this.hudPowerUp.setVisible(true);
            if (this.hudPowerUpSlot) this.hudPowerUpSlot.setVisible(true);
            // Styled background
            const tw = this.hudPowerUp.width + 20;
            this.hudPowerUpBg.fillStyle(0x0A0A1A, 0.7);
            this.hudPowerUpBg.fillRoundedRect(W/2 - tw/2, H - 50, tw, 30, 6);
            this.hudPowerUpBg.lineStyle(1, puConfig ? puConfig.color : 0xFFFFFF, 0.5);
            this.hudPowerUpBg.strokeRoundedRect(W/2 - tw/2, H - 50, tw, 30, 6);
        } else {
            this.hudPowerUp.setVisible(false);
            if (this.hudPowerUpSlot) this.hudPowerUpSlot.setVisible(false);
        }

        // Minimap
        this.minimapGfx.clear();
        const mmX = W - 175, mmY = H - 135, mmW = 160, mmH = 120;
        const vehicleData = [];
        for (const [, v] of this.vehicles) vehicleData.push(v.getMinimapData());
        this.trackRenderer.renderMinimap(this.minimapGfx, mmX, mmY, mmW, mmH, vehicleData);
    }

    // === MAIN UPDATE LOOP ===

    update(time, delta) {
        if (this.raceState === 'countdown') {
            this._updateCamera();
            return;
        }

        const dt = delta / 1000;
        const net = window.networkManager;

        // === INPUT ===
        const input = this.inputManager.getInput();

        if (this.raceState === 'racing') {
            // Apply local input
            if (this.isMultiplayer && !this.isHost) {
                // Client: send input to host, also apply locally for prediction
                net.sendInput(input);
                this.physicsEngine.setInput(this.localVehicleId, input);
            } else {
                // Host or single player: apply directly
                this.physicsEngine.setInput(this.localVehicleId, input);
            }

            // Use power-up
            if (input.usePowerUp) {
                this._usePowerUp();
            }

            // === AI INPUT ===
            if (!this.isMultiplayer && this.aiVehicles) {
                this._updateAI(dt);
            }

            // === PHYSICS ===
            if (!this.isMultiplayer || this.isHost) {
                this.physicsEngine.step(dt);
                this._checkPowerUpCollisions();

                // Host: broadcast state
                if (this.isMultiplayer && this.isHost) {
                    this.syncTimer += delta;
                    if (this.syncTimer >= 1000 / CONFIG.NETWORK.SYNC_RATE) {
                        this.syncTimer = 0;
                        const state = this.physicsEngine.serializeState();
                        net.broadcastGameState(state);
                    }
                }
            } else {
                // Client: run local prediction for own vehicle only
                const localPV = this.physicsEngine.getVehicle(this.localVehicleId);
                if (localPV) {
                    this.physicsEngine._stepVehicle(localPV, dt);
                }
            }
        }

        // === UPDATE VEHICLES ===
        for (const [id, vehicle] of this.vehicles) {
            const pv = this.physicsEngine.getVehicle(id);
            if (!pv) continue;

            vehicle.updateFromPhysics(pv);

            // Remote player interpolation
            if (!vehicle.isLocal && this.isMultiplayer) {
                vehicle.interpolate(performance.now());
            }

            vehicle.update(time, delta);

            // === PARTICLE EFFECTS ===
            this._emitVehicleParticles(vehicle, pv, dt, time);

            // === CHECK EVENTS ===
            if (pv._wallHit) {
                window.gameAudio.collision(1);
                this._triggerShake(CONFIG.SCREEN_SHAKE.COLLISION);
                this.particles.emit('SPARKS', pv.x, pv.y);
                pv._wallHit = false;
            }
            if (pv._vehicleHit) {
                window.gameAudio.collision(0.7);
                this._triggerShake({ intensity: 4, duration: 200 });
                this.particles.emit('SPARKS', pv.x, pv.y);
                pv._vehicleHit = false;
            }
            if (pv._missileHit) {
                window.gameAudio.missileExplode();
                window.gameAudio.spinout();
                this._triggerShake(CONFIG.SCREEN_SHAKE.EXPLOSION);
                this.particles.emit('EXPLOSION', pv.x, pv.y);
                pv._missileHit = false;
            }
            if (pv._oilHit) {
                window.gameAudio.spinout();
                this._triggerShake({ intensity: 4, duration: 300 });
                pv._oilHit = false;
            }
            if (pv._lapComplete) {
                window.gameAudio.lapComplete();
                if (pv.id === this.localVehicleId) {
                    this._showLapNotification(pv.lap);
                }
                pv._lapComplete = false;
            }
            if (pv._raceFinish) {
                this._onPlayerFinished(pv);
                pv._raceFinish = false;
            }
        }

        // === UPDATE ENGINE SOUND ===
        const localPV = this.physicsEngine.getVehicle(this.localVehicleId);
        if (localPV) {
            window.gameAudio.updateEngine(localPV.speed / CONFIG.PHYSICS.MAX_SPEED);
        }

        // === UPDATE PROJECTILES ===
        this._updateProjectileEntities(time, delta);

        // === UPDATE POWER-UPS ===
        for (const pu of this.powerUps) {
            pu.update(time, delta);
        }

        // === PARTICLES ===
        this.particles.update(delta);
        this.particles.render();

        // === CAMERA ===
        this._updateCamera();

        // === SCREEN SHAKE ===
        this._updateShake(delta);

        // === HUD ===
        this._updateHUD();

        // === SPEED LINES ===
        this._updateSpeedLines();

        // === WEATHER ===
        this._updateWeatherParticles();

        // === WRONG WAY DETECTION ===
        this._updateWrongWay();

        // === FINISH TIMEOUT ===
        if (this.raceState === 'finished') {
            this.finishTimeout -= dt;
            if (this.finishTimeout <= 0) {
                this._endRace();
            }
        }
    }

    // === PARTICLES ===

    _emitVehicleParticles(vehicle, pv, dt, time) {
        if (Math.abs(pv.speed) < 20) return;

        this.particleTimer += dt;
        if (this.particleTimer < 0.05) return;
        this.particleTimer = 0;

        const terrain = this.trackRenderer.getTerrainAt(pv.x, pv.y);
        const rearX = pv.x - Math.cos(pv.angle) * CONFIG.PHYSICS.VEHICLE_LENGTH * 0.5;
        const rearY = pv.y - Math.sin(pv.angle) * CONFIG.PHYSICS.VEHICLE_LENGTH * 0.5;

        // Terrain-based particles
        if (terrain.name === 'dirt' || terrain.name === 'grass') {
            this.particles.emitDirectional('DIRT', rearX, rearY, pv.angle + Math.PI, 1.5);
        } else if (terrain.name === 'mud') {
            this.particles.emitDirectional('MUD_SPLASH', rearX, rearY, pv.angle + Math.PI, 1.2);
        } else if (terrain.name === 'water') {
            this.particles.emitDirectional('WATER_SPLASH', rearX, rearY, pv.angle + Math.PI, 1.5);
        }

        // Drift smoke + tire marks
        const isDrifting = pv.input && pv.input.drift && Math.abs(pv.speed) > CONFIG.PHYSICS.MAX_SPEED * 0.4;
        if (isDrifting) {
            this.particles.emit('SMOKE', rearX, rearY);
            this.particles.addTireMark(rearX, rearY, pv.angle, true);
        } else if (Math.abs(pv.speed) > CONFIG.PHYSICS.MAX_SPEED * 0.6) {
            // Subtle tire marks at high speed
            this.particles.addTireMark(rearX, rearY, pv.angle, false);
        }

        // Nitro flame
        if (pv.input && pv.input.nitro && pv.nitro > 0) {
            this.particles.emitDirectional('NITRO_FLAME', rearX, rearY, pv.angle + Math.PI, 0.5);
        }
    }

    // === POWER-UPS ===

    _checkPowerUpCollisions() {
        for (const pu of this.powerUps) {
            if (!pu.active) continue;

            for (const v of this.physicsEngine.vehicles) {
                if (v.finished || v.jump > 0) continue;
                const dist = Math.hypot(v.x - pu.x, v.y - pu.y);
                if (dist < CONFIG.POWERUP_COLLECT_RADIUS + CONFIG.PHYSICS.VEHICLE_WIDTH * 0.5) {
                    this._collectPowerUp(v, pu);
                    break;
                }
            }
        }
    }

    _collectPowerUp(vehicle, powerUp) {
        const type = powerUp.type;
        powerUp.collect();
        window.gameAudio.powerUpCollect();

        // Apply immediate effects or hold as usable
        switch (type) {
            case 'NITRO':
                vehicle.nitro = CONFIG.PHYSICS.NITRO_MAX;
                break;
            case 'SPEED_BOOST':
                vehicle.speedBoost = CONFIG.POWERUPS.SPEED_BOOST.duration;
                break;
            case 'SHIELD':
                vehicle.shield = CONFIG.POWERUPS.SHIELD.duration;
                break;
            case 'CASH':
                // Just points - no effect
                break;
            case 'MISSILE':
            case 'OIL_SLICK':
                vehicle.powerUp = type;
                break;
        }

        // Respawn after cooldown
        this.time.delayedCall(CONFIG.POWERUP_SPAWN_COOLDOWN * 1000, () => {
            const spawns = CONFIG.TRACKS[this.trackIndex].powerUpSpawns;
            const spawnData = spawns.find(s => Math.hypot(s.x - powerUp.x, s.y - powerUp.y) < 5);
            if (spawnData) {
                const newType = spawnData.types[Math.floor(Math.random() * spawnData.types.length)];
                powerUp.type = newType;
                powerUp.config = CONFIG.POWERUPS[newType];
                powerUp._draw();
            }
            powerUp.respawn();
        });

        // Broadcast event
        if (this.isMultiplayer && this.isHost) {
            window.networkManager.broadcastEvent('powerupCollect', {
                vehicleId: vehicle.id,
                powerUpId: powerUp.id,
                powerUpType: type,
            });
        }
    }

    _usePowerUp() {
        const pv = this.physicsEngine.getVehicle(this.localVehicleId);
        if (!pv || !pv.powerUp) return;

        const type = pv.powerUp;
        pv.powerUp = null;

        if (type === 'MISSILE') {
            const missile = this.physicsEngine.fireMissile(pv);
            window.gameAudio.missileFire();
            if (missile) {
                const entity = new Projectile(this, 'missile', missile.x, missile.y, missile.angle, pv.id);
                entity.id = missile.id;
                this.projectileEntities.set(missile.id, entity);
            }
        } else if (type === 'OIL_SLICK') {
            const slick = this.physicsEngine.dropOilSlick(pv);
            window.gameAudio.oilSlickDrop();
            if (slick) {
                const entity = new Projectile(this, 'oilSlick', slick.x, slick.y, 0, pv.id);
                entity.id = slick.id;
                this.projectileEntities.set(slick.id, entity);
            }
        }
    }

    _updateProjectileEntities(time, delta) {
        // Update missile positions from physics
        for (const missile of this.physicsEngine.projectiles) {
            const entity = this.projectileEntities.get(missile.id);
            if (entity) {
                entity.updatePosition(missile.x, missile.y, missile.angle);
                entity.update(time, delta);
            }
        }

        // Check for exploded missiles
        for (const [id, entity] of this.projectileEntities) {
            const inPhysics = this.physicsEngine.projectiles.find(p => p.id === id) ||
                              this.physicsEngine.oilSlicks.find(s => s.id === id);
            if (!inPhysics) {
                if (entity.type === 'missile') {
                    entity.explode(this.particles);
                } else {
                    entity.destroy();
                }
                this.projectileEntities.delete(id);
            }
        }
    }

    // === CAMERA ===

    _updateCamera() {
        const vehicle = this.vehicles.get(this.localVehicleId);
        if (!vehicle) return;

        const targetX = vehicle.displayX + Math.cos(vehicle.displayAngle) * vehicle.displaySpeed * CONFIG.CAMERA.LOOKAHEAD;
        const targetY = vehicle.displayY + Math.sin(vehicle.displayAngle) * vehicle.displaySpeed * CONFIG.CAMERA.LOOKAHEAD;

        const cam = this.cameras.main;
        cam.scrollX += (targetX - cam.width / 2 - cam.scrollX) * CONFIG.CAMERA.LERP;
        cam.scrollY += (targetY - cam.height / 2 - cam.scrollY) * CONFIG.CAMERA.LERP;

        // Dynamic zoom: slight zoom out at high speeds for a sense of velocity
        const localPV = this.physicsEngine.getVehicle(this.localVehicleId);
        if (localPV) {
            const speedRatio = Math.min(1, Math.abs(localPV.speed) / CONFIG.PHYSICS.MAX_SPEED);
            const targetZoom = CONFIG.CAMERA.ZOOM - (speedRatio * 0.15);
            const currentZoom = cam.zoom;
            cam.setZoom(currentZoom + (targetZoom - currentZoom) * 0.05);
        }
    }

    // === SCREEN SHAKE ===

    _triggerShake(config) {
        if (config.intensity > this.shakeIntensity) {
            this.shakeIntensity = config.intensity;
            this.shakeDuration = config.duration;
            this.shakeTimer = config.duration;
        }
    }

    _updateShake(delta) {
        if (this.shakeTimer > 0) {
            this.shakeTimer -= delta;
            const ratio = this.shakeTimer / this.shakeDuration;
            const offset = this.shakeIntensity * ratio;
            this.cameras.main.scrollX += (Math.random() - 0.5) * offset;
            this.cameras.main.scrollY += (Math.random() - 0.5) * offset;
            if (this.shakeTimer <= 0) {
                this.shakeIntensity = 0;
            }
        }
    }

    // === NETWORK STATE ===

    _applyNetworkState(state) {
        // Apply authoritative state from host
        for (const vs of state.vehicles) {
            const vehicle = this.vehicles.get(vs.id);
            if (!vehicle) continue;

            if (vehicle.isLocal) {
                // Reconcile local prediction
                vehicle.reconcile(vs);
            } else {
                // Buffer for interpolation
                vehicle.addNetworkState(vs, state.timestamp);
            }

            // Update physics state
            const pv = this.physicsEngine.getVehicle(vs.id);
            if (pv && !vehicle.isLocal) {
                pv.x = vs.x;
                pv.y = vs.y;
                pv.angle = vs.angle;
                pv.speed = vs.speed;
                pv.nitro = vs.nitro;
                pv.shield = vs.shield;
                pv.spinout = vs.spinout;
                pv.speedBoost = vs.speedBoost;
                pv.jump = vs.jump;
                pv.lap = vs.lap;
                pv.checkpoint = vs.checkpoint;
                pv.finished = vs.finished;
                pv.powerUp = vs.powerUp;
            }
        }
    }

    _handleNetworkEvent(data) {
        switch (data.event) {
            case 'powerupCollect':
                window.gameAudio.powerUpCollect();
                break;
            case 'missile_hit':
                window.gameAudio.missileExplode();
                break;
        }
    }

    // === RACE END ===

    _onPlayerFinished(pv) {
        window.gameAudio.raceFinish();
        this.finishedPlayers.push({
            id: pv.id,
            time: (pv.finishTime - this.raceStartTime) / 1000,
            bestLap: pv.bestLap,
            topSpeed: pv.topSpeed,
        });

        const vehicle = this.vehicles.get(pv.id);
        if (vehicle && vehicle.isLocal) {
            // Winner celebration
            this.particles.emit('CONFETTI', CONFIG.WIDTH / 2, CONFIG.HEIGHT / 3, { count: 40 });
            window.gameAudio.crowdCheer();

            // "YOU WIN" or position text
            const pos = this.finishedPlayers.length;
            const suffix = pos === 1 ? 'st' : pos === 2 ? 'nd' : pos === 3 ? 'rd' : 'th';
            const msg = pos === 1 ? 'YOU WIN!' : 'FINISHED ' + pos + suffix + '!';

            this.add.text(CONFIG.WIDTH / 2, CONFIG.HEIGHT / 2, msg, {
                fontSize: pos === 1 ? '48px' : '36px',
                fontFamily: '"Press Start 2P", monospace',
                color: pos === 1 ? '#FFD700' : '#FFFFFF',
                stroke: '#000000',
                strokeThickness: 6,
            }).setOrigin(0.5).setScrollFactor(0).setDepth(50);
        }

        // Check if all finished or start timeout
        if (this.raceState !== 'finished') {
            this.raceState = 'finished';
            this.finishTimeout = CONFIG.RACE.FINISH_TIMEOUT;
        }

        // All vehicles finished?
        const totalVehicles = this.physicsEngine.vehicles.length;
        if (this.finishedPlayers.length >= totalVehicles) {
            this._endRace();
        }
    }

    _endRace() {
        window.gameAudio.stopEngine();
        window.gameAudio.stopMusic();

        const positions = this.physicsEngine.getRacePositions();
        const results = positions.map((pv, i) => {
            const fp = this.finishedPlayers.find(f => f.id === pv.id);
            const vehicle = this.vehicles.get(pv.id);
            return {
                position: i + 1,
                id: pv.id,
                name: vehicle ? vehicle.playerName : 'Unknown',
                colorIndex: vehicle ? vehicle.colorIndex : 0,
                time: fp ? fp.time : null,
                bestLap: pv.bestLap < Infinity ? pv.bestLap : null,
                topSpeed: Math.round(pv.topSpeed * 0.8),
                finished: pv.finished,
            };
        });

        // Save best time
        this._saveBestTime(results);

        if (this.isMultiplayer && this.isHost) {
            window.networkManager.endRace(results);
        }

        this.time.delayedCall(2000, () => {
            this.scene.start('ResultsScene', {
                results,
                trackIndex: this.trackIndex,
                isMultiplayer: this.isMultiplayer,
                isHost: this.isHost,
                roomCode: this.roomCode,
                playerName: this.playerName,
                players: this.playersList,
            });
        });
    }

    _saveBestTime(results) {
        try {
            const localResult = results.find(r => r.id === this.localVehicleId);
            if (!localResult || !localResult.time) return;

            const saved = JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEY) || '{}');
            const trackKey = 'track_' + this.trackIndex;
            if (!saved[trackKey] || localResult.time < saved[trackKey]) {
                saved[trackKey] = localResult.time;
                localStorage.setItem(CONFIG.STORAGE_KEY, JSON.stringify(saved));
            }
        } catch (e) {}
    }

    _showDisconnectMessage(reason) {
        this.add.text(CONFIG.WIDTH / 2, CONFIG.HEIGHT / 2, reason || 'Disconnected', {
            fontSize: '24px', fontFamily: 'monospace', color: '#FF3333',
            stroke: '#000000', strokeThickness: 4,
        }).setOrigin(0.5).setScrollFactor(0).setDepth(50);

        this.time.delayedCall(3000, () => {
            window.gameAudio.stopEngine();
            window.gameAudio.stopMusic();
            window.networkManager.disconnect();
            this.scene.start('MenuScene');
        });
    }

    _confirmLeave() {
        window.gameAudio.stopEngine();
        window.gameAudio.stopMusic();
        if (this.isMultiplayer) {
            window.networkManager.disconnect();
        }
        this.scene.start('MenuScene');
    }

    _showResults(results) {
        this.scene.start('ResultsScene', {
            results: results,
            trackIndex: this.trackIndex,
            isMultiplayer: this.isMultiplayer,
            isHost: this.isHost,
            roomCode: this.roomCode,
            playerName: this.playerName,
            players: this.playersList,
        });
    }

    // === AI LOGIC ===

    _updateAI(dt) {
        if (!this.aiVehicles || this.raceState !== 'racing') return;

        for (const ai of this.aiVehicles) {
            const pv = this.physicsEngine.getVehicle(ai.id);
            if (!pv || pv.finished) continue;

            // Find where we are on the track
            ai.currentCenterIdx = this.trackRenderer.getNearestCenterIndex(pv.x, pv.y);

            // Get target point ahead on the center line
            const lookAhead = CONFIG.AI.STEER_LOOKAHEAD + Math.abs(pv.speed) * 0.15;
            const target = this.trackRenderer.getPointAhead(ai.currentCenterIdx, lookAhead);

            // Steer toward target
            const dx = target.x - pv.x, dy = target.y - pv.y;
            const targetAngle = Math.atan2(dy, dx);
            let angleDiff = targetAngle - pv.angle;
            while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
            while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

            let steer = Math.max(-1, Math.min(1, angleDiff * 3));
            steer += (Math.random() - 0.5) * CONFIG.AI.STEER_NOISE;

            // Speed control
            const speedRatio = Math.abs(pv.speed) / CONFIG.PHYSICS.MAX_SPEED;
            const shouldBrake = Math.abs(angleDiff) > 0.8 && speedRatio > 0.6;
            const gas = !shouldBrake;
            const brake = shouldBrake;

            // Random nitro/drift
            const nitro = Math.random() < CONFIG.AI.NITRO_CHANCE && speedRatio < 0.9 && pv.nitro > 30;
            const drift = Math.abs(angleDiff) > 0.5 && speedRatio > 0.5 && Math.random() < CONFIG.AI.DRIFT_CHANCE * 10;

            // Use held power-up
            let usePowerUp = false;
            if (pv.powerUp) {
                ai.powerUpTimer += dt;
                if (ai.powerUpTimer > CONFIG.AI.POWERUP_USE_DELAY) {
                    usePowerUp = true;
                    ai.powerUpTimer = 0;
                }
            }

            this.physicsEngine.setInput(ai.id, {
                steer: steer * ai.speedMult * 1.3,
                gas: gas,
                brake: brake,
                nitro: nitro,
                drift: drift,
                usePowerUp: usePowerUp,
            });

            // Handle AI power-up use
            if (usePowerUp && pv.powerUp) {
                const type = pv.powerUp;
                pv.powerUp = null;
                if (type === 'MISSILE') {
                    this.physicsEngine.fireMissile(pv);
                } else if (type === 'OIL_SLICK') {
                    this.physicsEngine.dropOilSlick(pv);
                }
            }
        }
    }

    // === WEATHER PARTICLES ===

    _createWeatherParticles() {
        this.weatherGfx = this.add.graphics().setScrollFactor(0).setDepth(35);
        this.weatherParticles = [];

        // Track 0 = Desert (dust), Track 1 = Arctic (snow), Track 2 = Jungle (rain)
        const W = CONFIG.WIDTH, H = CONFIG.HEIGHT;
        const count = this.trackIndex === 2 ? 35 : 25;

        for (let i = 0; i < count; i++) {
            const p = { x: Math.random() * W, y: Math.random() * H };
            if (this.trackIndex === 0) {
                // Desert dust motes
                p.vx = (Math.random() - 0.5) * 15;
                p.vy = (Math.random() - 0.3) * 8;
                p.size = 1.5 + Math.random() * 2;
                p.alpha = 0.15 + Math.random() * 0.15;
                p.color = 0xD2B48C;
            } else if (this.trackIndex === 1) {
                // Arctic snowfall
                p.vx = (Math.random() - 0.5) * 20;
                p.vy = 15 + Math.random() * 25;
                p.size = 1 + Math.random() * 2.5;
                p.alpha = 0.2 + Math.random() * 0.25;
                p.color = 0xFFFFFF;
            } else {
                // Jungle rain
                p.vx = -5 + Math.random() * 3;
                p.vy = 80 + Math.random() * 60;
                p.size = 1;
                p.length = 4 + Math.random() * 6;
                p.alpha = 0.12 + Math.random() * 0.15;
                p.color = 0xAABBDD;
            }
            this.weatherParticles.push(p);
        }
    }

    _updateWeatherParticles() {
        if (!this.weatherGfx || !this.weatherParticles) return;
        this.weatherGfx.clear();

        const W = CONFIG.WIDTH, H = CONFIG.HEIGHT;
        const dt = 1 / 60;

        for (const p of this.weatherParticles) {
            p.x += p.vx * dt;
            p.y += p.vy * dt;

            // Wrap around screen
            if (p.x < -10) p.x = W + 10;
            if (p.x > W + 10) p.x = -10;
            if (p.y > H + 10) { p.y = -10; p.x = Math.random() * W; }
            if (p.y < -10) { p.y = H + 10; p.x = Math.random() * W; }

            if (this.trackIndex === 2) {
                // Rain: draw as thin lines
                this.weatherGfx.lineStyle(p.size, p.color, p.alpha);
                this.weatherGfx.beginPath();
                this.weatherGfx.moveTo(p.x, p.y);
                this.weatherGfx.lineTo(p.x + p.vx * dt * 2, p.y + p.length);
                this.weatherGfx.strokePath();
            } else {
                // Dust / Snow: draw as circles
                this.weatherGfx.fillStyle(p.color, p.alpha);
                this.weatherGfx.fillCircle(p.x, p.y, p.size);
            }
        }
    }

    // === SPEED LINES ===

    _updateSpeedLines() {
        this.speedLinesGfx.clear();
        const localPV = this.physicsEngine.getVehicle(this.localVehicleId);
        if (!localPV) return;

        const speedRatio = Math.abs(localPV.speed) / CONFIG.PHYSICS.MAX_SPEED;
        if (speedRatio < 0.6) {
            if (this._speedLineSprites) {
                for (const s of this._speedLineSprites) s.setAlpha(0);
            }
            return;
        }

        const alpha = (speedRatio - 0.6) * 0.4; // 0 to 0.16
        const W = CONFIG.WIDTH, H = CONFIG.HEIGHT;
        const cx = W / 2, cy = H / 2;

        // Use particle sprites if available, otherwise procedural lines
        const hasParticles = this.textures.exists('particles') && this.textures.get('particles').has('speed_line');
        if (hasParticles) {
            // Lazy-create speed line sprite pool
            if (!this._speedLineSprites) {
                this._speedLineSprites = [];
                for (let i = 0; i < 16; i++) {
                    const s = this.add.image(0, 0, 'particles', 'speed_line')
                        .setScrollFactor(0).setDepth(35).setAlpha(0).setOrigin(0.5);
                    this._speedLineSprites.push(s);
                }
            }
            for (let i = 0; i < this._speedLineSprites.length; i++) {
                const angle = (i / this._speedLineSprites.length) * Math.PI * 2;
                const r = 260 + Math.random() * 40;
                const s = this._speedLineSprites[i];
                s.setPosition(cx + Math.cos(angle) * r, cy + Math.sin(angle) * r);
                s.setRotation(angle);
                s.setAlpha(alpha);
                s.setScale(0.5 + speedRatio * 1.0, 0.3);
            }
        } else {
            // Hide sprite pool if it exists but we're below threshold
            if (this._speedLineSprites) {
                for (const s of this._speedLineSprites) s.setAlpha(0);
            }

            // Procedural speed lines
            const lineCount = 12 + Math.floor(speedRatio * 8);
            this.speedLinesGfx.lineStyle(1 + speedRatio, 0xFFFFFF, alpha);
            for (let i = 0; i < lineCount; i++) {
                const angle = (i / lineCount) * Math.PI * 2;
                const innerR = 250 + Math.random() * 50;
                const outerR = innerR + 40 + speedRatio * 60;
                this.speedLinesGfx.beginPath();
                this.speedLinesGfx.moveTo(cx + Math.cos(angle) * innerR, cy + Math.sin(angle) * innerR);
                this.speedLinesGfx.lineTo(cx + Math.cos(angle) * outerR, cy + Math.sin(angle) * outerR);
                this.speedLinesGfx.strokePath();
            }
        }
    }

    // === WRONG WAY DETECTION ===

    _updateWrongWay() {
        const localPV = this.physicsEngine.getVehicle(this.localVehicleId);
        if (!localPV || this.raceState !== 'racing') return;

        const currentIdx = this.trackRenderer.getNearestCenterIndex(localPV.x, localPV.y);
        if (this.lastCenterIdx >= 0 && Math.abs(localPV.speed) > 30) {
            const n = this.trackRenderer.centerPoints.length;
            const diff = (currentIdx - this.lastCenterIdx + n) % n;
            // If moving backwards along the center line
            if (diff > n * 0.4 && diff < n * 0.9) {
                this.wrongWayTimer = 1.5;
            }
        }
        this.lastCenterIdx = currentIdx;

        if (this.wrongWayTimer > 0) {
            this.wrongWayTimer -= 1/60;
            this.wrongWayText.setAlpha(0.6 + Math.sin(Date.now() / 150) * 0.4);
        } else {
            this.wrongWayText.setAlpha(0);
        }
    }

    // === LAP NOTIFICATION ===

    _showLapNotification(lapNumber) {
        const trackData = CONFIG.TRACKS[this.trackIndex];
        const totalLaps = trackData.laps || CONFIG.RACE.DEFAULT_LAPS;
        if (lapNumber >= totalLaps) return; // Don't show on finish

        const text = lapNumber === totalLaps - 1 ? 'FINAL LAP!' : 'LAP ' + (lapNumber + 1) + '/' + totalLaps;
        const color = lapNumber === totalLaps - 1 ? '#FF3333' : '#33FF88';

        this.lapNotifyText.setText(text);
        this.lapNotifyText.setColor(color);
        this.lapNotifyText.setAlpha(1);
        this.lapNotifyText.setScale(1.5);

        this.tweens.add({
            targets: this.lapNotifyText,
            scaleX: 1, scaleY: 1,
            duration: 300, ease: 'Cubic.easeOut',
        });
        this.tweens.add({
            targets: this.lapNotifyText,
            alpha: 0, delay: 1200,
            duration: 500,
        });

        this._triggerShake({ intensity: 3, duration: 200 });
    }

    shutdown() {
        window.gameAudio.stopEngine();
        window.gameAudio.stopMusic();
        this.particles.destroy();
        for (const [, v] of this.vehicles) v.destroy();
        for (const [, p] of this.projectileEntities) p.destroy();
        for (const pu of this.powerUps) pu.destroy();
        if (this.weatherGfx) this.weatherGfx.destroy();
        if (this._speedLineSprites) {
            for (const s of this._speedLineSprites) s.destroy();
            this._speedLineSprites = null;
        }
        if (this.minimapFrame) this.minimapFrame.destroy();
    }
}
