class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameScene' });
    }

    create() {
        // State
        this.fuel = CONFIG.FUEL_MAX;
        this.distance = 0;
        this.score = 0;
        this.coins = 0;
        this.totalFlips = 0;
        this.gameOver = false;
        this.paused = false;
        this.startX = 200;
        this.dirtTimer = 0;
        this.exhaustTimer = 0;
        this.lowFuelTimer = 0;
        this.coinAnimTimer = 0;

        // Audio
        this.audioManager = new AudioManager(this);

        // Setup world - no bounds for infinite scrolling
        this.cameras.main.setBackgroundColor('#87CEEB');

        // Parallax backgrounds
        this.bgLayers = [];
        this.currentBiome = 'grassland';
        this.createBackgrounds('grassland');

        // Terrain
        this.terrain = new Terrain(this);
        this.terrain.update(this.startX);

        // Bike
        const surfaceY = this.terrain.getSurfaceY(this.startX);
        this.bike = new Bike(this, this.startX, surfaceY - 60);

        // Pickups
        this.pickupManager = new PickupManager(this);

        // Particles
        this.particleManager = new ParticleManager(this);

        // Camera — manually controlled in update() via scrollX/scrollY

        // Input
        this.cursors = this.input.keyboard.createCursorKeys();
        this.keyW = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W);
        this.keyA = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A);
        this.keyS = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S);
        this.keyD = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D);
        this.keyP = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.P);
        this.keyM = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.M);
        this.keyEsc = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);

        this.keyP.on('down', () => this.togglePause());
        this.keyEsc.on('down', () => this.togglePause());
        this.keyM.on('down', () => {
            const muted = this.audioManager.toggleMute();
            this.muteText.setText(muted ? 'MUTED' : '');
        });

        // Touch controls — 4 zones: TL=lean back, TR=lean forward, BL=brake, BR=gas
        this.touchGas = false;
        this.touchBrake = false;
        this.touchLeanBack = false;
        this.touchLeanForward = false;
        this.touchLeft = false;   // backward compat
        this.touchRight = false;  // backward compat

        const updateTouch = (pointer) => {
            if (!pointer.isDown) {
                this.touchGas = false;
                this.touchBrake = false;
                this.touchLeanBack = false;
                this.touchLeanForward = false;
                this.touchLeft = false;
                this.touchRight = false;
                return;
            }
            const left = pointer.x < CONFIG.WIDTH / 2;
            const top = pointer.y < CONFIG.HEIGHT / 2;
            this.touchGas = !left && !top;       // bottom-right
            this.touchBrake = left && !top;      // bottom-left
            this.touchLeanBack = left && top;    // top-left
            this.touchLeanForward = !left && top; // top-right
            this.touchRight = this.touchGas;
            this.touchLeft = this.touchLeanBack;
        };
        this.input.on('pointerdown', updateTouch);
        this.input.on('pointerup', (pointer) => {
            this.touchGas = false;
            this.touchBrake = false;
            this.touchLeanBack = false;
            this.touchLeanForward = false;
            this.touchLeft = false;
            this.touchRight = false;
        });
        this.input.on('pointermove', updateTouch);

        // HUD
        this.createHUD();

        // Start engine
        this.audioManager.init();
        this.audioManager.startEngine();
    }

    createBackgrounds(biome) {
        // Remove old layers
        this.bgLayers.forEach(l => l.destroy());
        this.bgLayers = [];

        const speeds = [0.05, 0.15, 0.35];
        for (let i = 0; i < 3; i++) {
            const layer = this.add.tileSprite(
                CONFIG.WIDTH / 2, CONFIG.HEIGHT / 2,
                CONFIG.WIDTH, CONFIG.HEIGHT,
                `${biome}_layer${i}`
            );
            layer.setScrollFactor(0);
            layer.setDepth(i);
            layer._parallaxSpeed = speeds[i];
            // No scaling needed - backgrounds regenerated at game size
            this.bgLayers.push(layer);
        }
    }

    createHUD() {
        const depth = 100;

        // Distance display
        this.distanceText = this.add.text(CONFIG.WIDTH / 2, 15, '0m', {
            fontSize: '28px', fontFamily: 'Arial', color: '#ffffff',
            fontStyle: 'bold', stroke: '#000000', strokeThickness: 4
        }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(depth);

        // Score display
        this.scoreText = this.add.text(CONFIG.WIDTH - 15, 15, 'Score: 0', {
            fontSize: '18px', fontFamily: 'Arial', color: '#ffdd44',
            fontStyle: 'bold', stroke: '#000000', strokeThickness: 3
        }).setOrigin(1, 0).setScrollFactor(0).setDepth(depth);

        // Coins display
        this.coinsText = this.add.text(CONFIG.WIDTH - 15, 40, 'Coins: 0', {
            fontSize: '16px', fontFamily: 'Arial', color: '#ffaa00',
            stroke: '#000000', strokeThickness: 2
        }).setOrigin(1, 0).setScrollFactor(0).setDepth(depth);

        // Fuel gauge background
        this.add.rectangle(90, CONFIG.HEIGHT - 25, 154, 22, 0x000000, 0.6)
            .setScrollFactor(0).setDepth(depth).setStrokeStyle(1, 0xffffff, 0.3);

        // Fuel label
        this.add.text(5, CONFIG.HEIGHT - 25, '\u26FD', {
            fontSize: '16px', fontFamily: 'Arial', color: '#ffcc00'
        }).setOrigin(0, 0.5).setScrollFactor(0).setDepth(depth);

        // Fuel bar
        this.fuelBar = this.add.rectangle(22, CONFIG.HEIGHT - 25, 140, 16, 0x44ff44)
            .setOrigin(0, 0.5).setScrollFactor(0).setDepth(depth);

        // Speed display
        this.speedText = this.add.text(15, 15, '0 km/h', {
            fontSize: '16px', fontFamily: 'Arial', color: '#cccccc',
            stroke: '#000000', strokeThickness: 2
        }).setOrigin(0, 0).setScrollFactor(0).setDepth(depth);

        // Trick popup text (hidden by default)
        this.trickText = this.add.text(CONFIG.WIDTH / 2, CONFIG.HEIGHT / 2 - 80, '', {
            fontSize: '32px', fontFamily: 'Arial', color: '#ffdd00',
            fontStyle: 'bold', stroke: '#000000', strokeThickness: 5
        }).setOrigin(0.5).setScrollFactor(0).setDepth(depth).setAlpha(0);

        // Air time display
        this.airTimeText = this.add.text(CONFIG.WIDTH / 2, CONFIG.HEIGHT / 2 - 40, '', {
            fontSize: '20px', fontFamily: 'Arial', color: '#44ddff',
            fontStyle: 'bold', stroke: '#000000', strokeThickness: 3
        }).setOrigin(0.5).setScrollFactor(0).setDepth(depth).setAlpha(0);

        // Biome indicator
        this.biomeText = this.add.text(CONFIG.WIDTH / 2, CONFIG.HEIGHT - 15, 'GRASSLAND', {
            fontSize: '12px', fontFamily: 'Arial', color: '#88aa66',
            fontStyle: 'bold', stroke: '#000000', strokeThickness: 2
        }).setOrigin(0.5, 1).setScrollFactor(0).setDepth(depth);

        // Mute indicator
        this.muteText = this.add.text(CONFIG.WIDTH - 15, CONFIG.HEIGHT - 15, '', {
            fontSize: '12px', fontFamily: 'Arial', color: '#ff4444'
        }).setOrigin(1, 1).setScrollFactor(0).setDepth(depth);

        // Pause overlay
        this.pauseOverlay = this.add.rectangle(
            CONFIG.WIDTH / 2, CONFIG.HEIGHT / 2, CONFIG.WIDTH, CONFIG.HEIGHT, 0x000000, 0.6
        ).setScrollFactor(0).setDepth(depth + 1).setVisible(false);

        this.pauseText = this.add.text(CONFIG.WIDTH / 2, CONFIG.HEIGHT / 2, 'PAUSED', {
            fontSize: '48px', fontFamily: 'Arial', color: '#ffffff',
            fontStyle: 'bold'
        }).setOrigin(0.5).setScrollFactor(0).setDepth(depth + 2).setVisible(false);
    }

    togglePause() {
        if (this.gameOver) return;
        this.paused = !this.paused;
        this.matter.world.enabled = !this.paused;
        this.pauseOverlay.setVisible(this.paused);
        this.pauseText.setVisible(this.paused);
        if (this.paused) {
            this.audioManager.stopEngine();
        } else {
            this.audioManager.startEngine();
        }
    }

    update(time, delta) {
        if (this.paused || this.gameOver) return;

        const dt = Math.min(delta, 33); // cap at ~30fps equivalent

        // Input
        const gasPressed = this.cursors.up.isDown || this.keyW.isDown || this.touchGas;
        const brakePressed = this.cursors.down.isDown || this.keyS.isDown || this.touchBrake;
        const leanBackPressed = this.cursors.left.isDown || this.keyA.isDown || this.touchLeanBack;
        const leanForwardPressed = this.cursors.right.isDown || this.keyD.isDown || this.touchLeanForward;

        // Apply controls
        if (gasPressed) {
            this.bike.applyGas(dt);
            this.audioManager.setRevving(true);
        } else {
            this.audioManager.setRevving(false);
        }

        if (brakePressed) this.bike.applyBrake();
        if (leanBackPressed) this.bike.applyLean(-1);
        else if (leanForwardPressed) this.bike.applyLean(1);

        // Update bike
        this.bike.update(dt);

        // Fuel
        if (gasPressed) {
            this.fuel -= CONFIG.FUEL_DRAIN_RATE * (dt / 1000);
        } else {
            this.fuel -= CONFIG.FUEL_IDLE_DRAIN * (dt / 1000);
        }
        this.fuel = Math.max(0, this.fuel);

        if (this.fuel <= 0 && !this.gameOver) {
            this.endGame('fuel');
            return;
        }

        // Low fuel warning
        if (this.fuel < CONFIG.FUEL_LOW_THRESHOLD && this.fuel > 0) {
            this.lowFuelTimer += dt;
            if (this.lowFuelTimer > 1000) {
                this.audioManager.play('low_fuel');
                this.lowFuelTimer = 0;
            }
        }

        // Distance & score
        const bikePos = this.bike.getPosition();
        this.distance = Math.max(0, (bikePos.x - this.startX) * CONFIG.DISTANCE_SCALE);
        this.score = this.distance + this.coins * CONFIG.COIN_VALUE;

        // Camera follow
        this.cameras.main.scrollX = bikePos.x + CONFIG.CAM_OFFSET_X;
        this.cameras.main.scrollY = bikePos.y + CONFIG.CAM_OFFSET_Y;

        // Parallax
        this.bgLayers.forEach(layer => {
            layer.tilePositionX = this.cameras.main.scrollX * layer._parallaxSpeed;
            layer.tilePositionY = this.cameras.main.scrollY * layer._parallaxSpeed * 0.3;
        });

        // Biome transitions — crossfade
        const newBiome = this.terrain.getBiome(bikePos.x);
        if (newBiome !== this.currentBiome) {
            const oldLayers = [...this.bgLayers];
            this.currentBiome = newBiome;
            this.createBackgrounds(newBiome);
            // Fade out old layers
            oldLayers.forEach(layer => {
                this.tweens.add({
                    targets: layer,
                    alpha: 0,
                    duration: 2000,
                    onComplete: () => layer.destroy()
                });
            });
        }

        // Terrain
        this.terrain.update(bikePos.x);

        // Pickups
        this.pickupManager.update(bikePos.x, this.terrain);
        const collected = this.pickupManager.checkCollection(bikePos);
        collected.forEach(type => {
            if (type === 'fuel') {
                this.fuel = Math.min(CONFIG.FUEL_MAX, this.fuel + CONFIG.FUEL_PICKUP_AMOUNT);
                this.audioManager.play('fuel_pickup');
                this.showTrick('+FUEL', '#44ff44');
            } else if (type === 'coin') {
                this.coins++;
                this.audioManager.play('coin');
            }
        });

        // Particles
        if (gasPressed && this.bike.rearGrounded) {
            this.dirtTimer += dt;
            if (this.dirtTimer > 50) {
                const bikeP = this.bike.getPosition();
                this.particleManager.emitDirt(
                    bikeP.x - 25,
                    bikeP.y + CONFIG.WHEEL_RADIUS + 5,
                    this.currentBiome
                );
                this.dirtTimer = 0;
            }
            this.exhaustTimer += dt;
            if (this.exhaustTimer > 100) {
                const bikeP2 = this.bike.getPosition();
                this.particleManager.emitExhaust(
                    bikeP2.x - 35,
                    bikeP2.y + 5
                );
                this.exhaustTimer = 0;
            }
        }
        this.particleManager.update(dt);

        // Air time display
        if (this.bike.airborne && this.bike.airTime > 0.5) {
            this.airTimeText.setText(`AIR: ${this.bike.airTime.toFixed(1)}s`);
            this.airTimeText.setAlpha(1);
        } else {
            this.airTimeText.setAlpha(0);
        }

        // Update HUD
        this.updateHUD();

        // Fell off world check
        if (bikePos.y > CONFIG.TERRAIN_BASE_Y + 500) {
            this.bike.crash();
        }
    }

    updateHUD() {
        this.distanceText.setText(`${Math.floor(this.distance)}m`);
        this.scoreText.setText(`Score: ${Math.floor(this.score)}`);
        this.coinsText.setText(`Coins: ${this.coins}`);

        // Speed
        const speed = Math.floor(this.bike.getSpeed() * 3.6);
        this.speedText.setText(`${speed} km/h`);

        // Biome
        if (this.biomeText) {
            this.biomeText.setText(this.currentBiome.toUpperCase());
        }

        // Fuel bar
        const fuelPct = this.fuel / CONFIG.FUEL_MAX;
        this.fuelBar.width = 140 * fuelPct;
        if (fuelPct > 0.5) {
            this.fuelBar.fillColor = 0x44ff44;
        } else if (fuelPct > 0.25) {
            this.fuelBar.fillColor = 0xffaa00;
        } else {
            this.fuelBar.fillColor = 0xff2222;
            // Pulse effect
            this.fuelBar.alpha = 0.6 + 0.4 * Math.sin(Date.now() * 0.01);
        }
    }

    showTrick(text, color) {
        this.trickText.setText(text);
        this.trickText.setColor(color || '#ffdd00');
        this.trickText.setAlpha(1);
        this.trickText.setScale(0.5);

        this.tweens.add({
            targets: this.trickText,
            alpha: 0,
            scale: 1.2,
            y: CONFIG.HEIGHT / 2 - 120,
            duration: 1200,
            ease: 'Power2',
            onComplete: () => {
                this.trickText.y = CONFIG.HEIGHT / 2 - 80;
            }
        });
    }

    onFlip() {
        this.totalFlips++;
        this.score += CONFIG.FLIP_BONUS;
        this.audioManager.play('flip_bonus');
        this.showTrick(`FLIP! +${CONFIG.FLIP_BONUS}`, '#ff44ff');
    }

    onLand(airTime) {
        const bonus = Math.floor(airTime * CONFIG.AIR_TIME_BONUS);
        if (bonus > 0) {
            this.score += bonus;
            if (airTime > 1) {
                this.showTrick(`AIR TIME +${bonus}`, '#44ddff');
            }
        }
        this.particleManager.emitLanding(
            this.bike.getPosition().x,
            this.bike.getPosition().y + 20,
            this.currentBiome
        );
    }

    onWheelieEnd(wheelieTime) {
        const bonus = Math.floor(wheelieTime * CONFIG.WHEELIE_BONUS);
        if (bonus > 10) {
            this.score += bonus;
            this.showTrick(`WHEELIE +${bonus}`, '#ffaa44');
        }
    }

    onCrash() {
        if (this.gameOver) return;
        this.particleManager.emitCrash(
            this.bike.getPosition().x,
            this.bike.getPosition().y
        );
        this.time.delayedCall(1500, () => {
            this.endGame('crashed');
        });
        this.gameOver = true;
    }

    endGame(reason) {
        this.gameOver = true;
        this.audioManager.stopEngine();
        if (reason === 'fuel') {
            this.audioManager.play('game_over');
        }

        this.time.delayedCall(reason === 'fuel' ? 1000 : 500, () => {
            this.scene.start('GameOverScene', {
                distance: this.distance,
                coins: this.coins,
                flips: this.totalFlips,
                score: this.score,
                reason: reason,
            });
        });
    }

    shutdown() {
        if (this.bike) this.bike.destroy();
        if (this.pickupManager) this.pickupManager.destroy();
        if (this.particleManager) this.particleManager.destroy();
        this.audioManager.stopEngine();
    }
}
