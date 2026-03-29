class Vehicle {
    constructor(scene, vehicleConfig, playerIndex) {
        this.scene = scene;
        this.config = vehicleConfig;
        this.colorIndex = playerIndex;
        this.playerName = vehicleConfig.name;

        this.displayX = 0;
        this.displayY = 0;
        this.displayAngle = 0;
        this.displaySpeed = 0;
        this.x = 0;
        this.y = 0;
        this.angle = 0;
        this.speed = 0;

        this.nitroActive = false;
        this.shieldActive = false;
        this.spinoutActive = false;
        this.jumpActive = false;
        this.jumpHeight = 0;
        this.driftActive = false;
        this.speedBoostActive = false;

        this.stateBuffer = [];
        this.isLocal = false;

        const atlasKey = `vehicle_${playerIndex}`;
        const hasAtlas = scene.textures.exists(atlasKey);

        // Shadow sprite
        if (hasAtlas && scene.textures.exists('vehicle_shadow')) {
            this.shadowSprite = scene.add.image(0, 0, 'vehicle_shadow');
            this.shadowSprite.setDepth(5);
        } else {
            // Fallback: graphics shadow
            this.shadowSprite = null;
            this.shadowGfx = scene.add.graphics();
            this.shadowGfx.setDepth(5);
        }

        // Main container
        this.container = scene.add.container(0, 0);
        this.container.setDepth(10);

        if (hasAtlas) {
            // Sprite-based rendering
            this.useSprites = true;
            this.sprite = scene.add.sprite(0, 0, atlasKey, 'normal_0');
            this.sprite.setDisplaySize(CONFIG.PHYSICS.VEHICLE_LENGTH, CONFIG.PHYSICS.VEHICLE_WIDTH);
            this.container.add(this.sprite);

            // No separate gfx needed for nitro/shield — handled by frame selection
            this.gfx = null;
            this.nitroGlowGfx = null;
            this.shieldGfx = null;
        } else {
            // Fallback: procedural graphics (original code)
            this.useSprites = false;
            this.gfx = scene.add.graphics();
            this.container.add(this.gfx);
            this.nitroGlowGfx = scene.add.graphics();
            this.nitroGlowGfx.setVisible(false);
            this.container.add(this.nitroGlowGfx);
            this.shieldGfx = scene.add.graphics();
            this.shieldGfx.setVisible(false);
            this.container.add(this.shieldGfx);
            this._drawVehicleFallback();
            this._drawNitroGlowFallback();
            this._drawShieldFallback();
        }

        // Name label
        this.nameText = scene.add.text(0, -36, '', {
            fontSize: '9px',
            fontFamily: '"Press Start 2P", monospace',
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 3,
            align: 'center',
        }).setOrigin(0.5);
        this.container.add(this.nameText);

        this._numAngles = 24;
    }

    setName(name) {
        this.playerName = name;
        this.nameText.setText(name);
    }

    // --- Sprite frame selection ---

    _getFrameIndex(angle) {
        const TWO_PI = Math.PI * 2;
        const norm = ((angle % TWO_PI) + TWO_PI) % TWO_PI;
        return Math.round(norm / TWO_PI * this._numAngles) % this._numAngles;
    }

    _getStatePrefix() {
        if (this.spinoutActive) return 'spinout';
        if (this.shieldActive) return 'shield';
        if (this.nitroActive) return 'nitro';
        return 'normal';
    }

    // --- Physics/Network (unchanged) ---

    updateFromPhysics(vehicleState) {
        this.x = vehicleState.x;
        this.y = vehicleState.y;
        this.angle = vehicleState.angle;
        this.speed = vehicleState.speed;
        this.nitroActive = vehicleState.input && vehicleState.input.nitro && vehicleState.nitro > 0;
        this.shieldActive = vehicleState.shield > 0;
        this.spinoutActive = vehicleState.spinout > 0;
        this.jumpActive = vehicleState.jump > 0;
        this.jumpHeight = vehicleState.jumpHeight || 0;
        this.driftActive = vehicleState.input && vehicleState.input.drift;
        this.speedBoostActive = vehicleState.speedBoost > 0;
        if (this.isLocal) {
            this.displayX = this.x;
            this.displayY = this.y;
            this.displayAngle = this.angle;
            this.displaySpeed = this.speed;
        }
    }

    addNetworkState(state, timestamp) {
        this.stateBuffer.push({
            x: state.x, y: state.y, angle: state.angle, speed: state.speed,
            shield: state.shield, spinout: state.spinout, jump: state.jump,
            speedBoost: state.speedBoost, timestamp: timestamp,
        });
        if (this.stateBuffer.length > 10) this.stateBuffer.shift();
    }

    interpolate(renderTime) {
        if (this.isLocal || this.stateBuffer.length < 2) return;
        const buf = this.stateBuffer;
        const targetTime = renderTime - CONFIG.NETWORK.INTERP_DELAY;
        let from = buf[0], to = buf[1];
        for (let i = 0; i < buf.length - 1; i++) {
            if (buf[i].timestamp <= targetTime && buf[i + 1].timestamp >= targetTime) {
                from = buf[i]; to = buf[i + 1]; break;
            }
        }
        if (targetTime > buf[buf.length - 1].timestamp) {
            from = buf[buf.length - 2] || buf[buf.length - 1]; to = buf[buf.length - 1];
        }
        const range = to.timestamp - from.timestamp;
        const alpha = range > 0 ? Math.min(1, Math.max(0, (targetTime - from.timestamp) / range)) : 1;
        this.displayX = from.x + (to.x - from.x) * alpha;
        this.displayY = from.y + (to.y - from.y) * alpha;
        this.displaySpeed = from.speed + (to.speed - from.speed) * alpha;
        let angleDiff = to.angle - from.angle;
        while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
        while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
        this.displayAngle = from.angle + angleDiff * alpha;
        this.shieldActive = to.shield > 0;
        this.spinoutActive = to.spinout > 0;
        this.jumpActive = to.jump > 0;
        this.speedBoostActive = to.speedBoost > 0;
    }

    reconcile(serverState) {
        const dx = serverState.x - this.x, dy = serverState.y - this.y;
        const dist = Math.hypot(dx, dy);
        if (dist > CONFIG.NETWORK.SNAP_THRESHOLD) {
            this.x = serverState.x; this.y = serverState.y; this.angle = serverState.angle;
        } else if (dist > 2) {
            this.x += dx * CONFIG.NETWORK.LERP_RATE;
            this.y += dy * CONFIG.NETWORK.LERP_RATE;
            let ad = serverState.angle - this.angle;
            while (ad > Math.PI) ad -= Math.PI * 2;
            while (ad < -Math.PI) ad += Math.PI * 2;
            this.angle += ad * CONFIG.NETWORK.LERP_RATE;
        }
        this.displayX = this.x; this.displayY = this.y; this.displayAngle = this.angle;
    }

    // --- Update (renders each frame) ---

    update(time, delta) {
        if (this.useSprites) {
            this._updateSprite(time);
        } else {
            this._updateGraphics(time);
        }
    }

    _updateSprite(time) {
        // Select rotation frame from pre-rendered angles
        const frameIdx = this._getFrameIndex(this.displayAngle);
        const statePrefix = this._getStatePrefix();
        const frameName = `${statePrefix}_${frameIdx}`;
        this.sprite.setFrame(frameName);

        // Position container (no rotation needed — frames are pre-rotated)
        if (this.jumpActive) {
            this.container.setPosition(this.displayX, this.displayY - this.jumpHeight);
        } else {
            this.container.setPosition(this.displayX, this.displayY);
        }
        // Don't rotate the container since sprites are pre-rotated
        this.container.setRotation(0);

        // Shadow
        if (this.shadowSprite) {
            if (this.jumpActive) {
                this.shadowSprite.setPosition(this.displayX + 3, this.displayY + 3);
                this.shadowSprite.setAlpha(0.15);
                this.shadowSprite.setScale(0.8);
            } else {
                this.shadowSprite.setPosition(this.displayX + 2, this.displayY + 2);
                this.shadowSprite.setAlpha(0.2);
                this.shadowSprite.setScale(1);
            }
            this.shadowSprite.setVisible(true);
        }

        // Speed boost / spinout pulsing
        if (this.speedBoostActive) {
            this.container.setAlpha(0.75 + Math.sin(time / 60) * 0.25);
        } else if (this.spinoutActive) {
            this.container.setAlpha(0.5 + Math.sin(time / 40) * 0.4);
        } else {
            this.container.setAlpha(1);
        }
    }

    _updateGraphics(time) {
        // Original procedural update code
        if (this.shadowGfx) {
            this.shadowGfx.clear();
            if (this.jumpActive) {
                this.shadowGfx.setVisible(true);
                this.shadowGfx.fillStyle(0x000000, 0.15);
                this.shadowGfx.fillEllipse(this.displayX + 3, this.displayY + 3,
                    CONFIG.PHYSICS.VEHICLE_LENGTH * 0.8, CONFIG.PHYSICS.VEHICLE_WIDTH * 0.6);
                this.container.setPosition(this.displayX, this.displayY - this.jumpHeight);
            } else {
                this.shadowGfx.setVisible(true);
                this.shadowGfx.fillStyle(0x000000, 0.18);
                this.shadowGfx.fillEllipse(this.displayX + 2, this.displayY + 2,
                    CONFIG.PHYSICS.VEHICLE_LENGTH * 0.85, CONFIG.PHYSICS.VEHICLE_WIDTH * 0.7);
                this.container.setPosition(this.displayX, this.displayY);
            }
        }
        this.container.setRotation(this.displayAngle);

        if (this.nitroGlowGfx) {
            this.nitroGlowGfx.setVisible(this.nitroActive);
            if (this.nitroActive) {
                this.nitroGlowGfx.setAlpha(0.8 + Math.sin(time / 60) * 0.2);
            }
        }
        if (this.shieldGfx) {
            this.shieldGfx.setVisible(this.shieldActive);
            if (this.shieldActive) {
                this.shieldGfx.setAlpha(0.5 + Math.sin(time / 200) * 0.2);
                this.shieldGfx.setRotation(-this.displayAngle + time / 1000);
            }
        }
        if (this.speedBoostActive) {
            this.container.setAlpha(0.75 + Math.sin(time / 60) * 0.25);
        } else if (this.spinoutActive) {
            this.container.setAlpha(0.5 + Math.sin(time / 40) * 0.4);
        } else {
            this.container.setAlpha(1);
        }
    }

    getMinimapData() {
        return { x: this.displayX, y: this.displayY, colorIndex: this.colorIndex };
    }

    setGhost(isGhost) { this.container.setAlpha(isGhost ? 0.3 : 1); }

    destroy() {
        this.container.destroy();
        if (this.shadowSprite) this.shadowSprite.destroy();
        if (this.shadowGfx) this.shadowGfx.destroy();
    }

    // === FALLBACK: Procedural drawing (used when atlas not loaded) ===

    _darken(color, amt) {
        const r = Math.max(0, ((color >> 16) & 0xFF) * (1 - amt));
        const g = Math.max(0, ((color >> 8) & 0xFF) * (1 - amt));
        const b = Math.max(0, (color & 0xFF) * (1 - amt));
        return (Math.floor(r) << 16) | (Math.floor(g) << 8) | Math.floor(b);
    }
    _lighten(color, amt) {
        const r = Math.min(255, ((color >> 16) & 0xFF) + 255 * amt);
        const g = Math.min(255, ((color >> 8) & 0xFF) + 255 * amt);
        const b = Math.min(255, (color & 0xFF) + 255 * amt);
        return (Math.floor(r) << 16) | (Math.floor(g) << 8) | Math.floor(b);
    }

    _drawVehicleFallback() {
        const g = this.gfx;
        g.clear();
        const color = this.config.color;
        const stripe = this.config.stripe;
        const dark = this._darken(color, 0.3);
        const light = this._lighten(color, 0.2);
        const W = CONFIG.PHYSICS.VEHICLE_WIDTH;
        const L = CONFIG.PHYSICS.VEHICLE_LENGTH;
        const hw = W / 2;
        const hl = L / 2;

        g.fillStyle(dark, 1);
        g.beginPath();
        g.moveTo(-hl, -hw + 2); g.lineTo(-hl, hw - 2);
        g.lineTo(hl - 8, hw - 1); g.lineTo(hl - 2, hw * 0.6);
        g.lineTo(hl, 0); g.lineTo(hl - 2, -hw * 0.6);
        g.lineTo(hl - 8, -hw + 1); g.closePath(); g.fillPath();

        g.fillStyle(color, 1);
        g.beginPath();
        g.moveTo(-hl + 1, -hw + 3); g.lineTo(-hl + 1, hw - 3);
        g.lineTo(hl - 9, hw - 2); g.lineTo(hl - 3, hw * 0.55);
        g.lineTo(hl - 1, 0); g.lineTo(hl - 3, -hw * 0.55);
        g.lineTo(hl - 9, -hw + 2); g.closePath(); g.fillPath();

        g.fillStyle(stripe, 0.8);
        g.fillRect(-hl + 3, -3, L - 10, 2);
        g.fillRect(-hl + 3, 1, L - 10, 2);

        g.fillStyle(0x1A3A5C, 0.85);
        g.beginPath();
        g.moveTo(hl - 16, -hw + 4); g.lineTo(hl - 10, -hw + 3);
        g.lineTo(hl - 6, -hw * 0.5); g.lineTo(hl - 6, hw * 0.5);
        g.lineTo(hl - 10, hw - 3); g.lineTo(hl - 16, hw - 4);
        g.closePath(); g.fillPath();

        const wheelW = 9, wheelH = 5;
        const drawWheel = (wx, wy) => {
            g.fillStyle(0x111111, 1);
            g.fillRoundedRect(wx - wheelW/2, wy - wheelH/2, wheelW, wheelH, 1.5);
            g.fillStyle(0x333333, 1);
            g.fillRoundedRect(wx - wheelW/2 + 1, wy - wheelH/2 + 0.5, wheelW - 2, wheelH - 1, 1);
            g.fillStyle(0x555555, 1);
            g.fillCircle(wx, wy, 1.5);
        };
        drawWheel(-hl + 8, -hw - 1.5);
        drawWheel(-hl + 8, hw + 1.5);
        drawWheel(hl - 13, -hw - 1.5);
        drawWheel(hl - 13, hw + 1.5);

        g.fillStyle(0xFFFF99, 0.9);
        g.fillEllipse(hl - 3, -hw * 0.45, 4, 3);
        g.fillEllipse(hl - 3, hw * 0.45, 4, 3);

        g.fillStyle(0xFF0000, 1);
        g.fillRoundedRect(-hl, -hw + 3, 3, 4, 1);
        g.fillRoundedRect(-hl, hw - 7, 3, 4, 1);
    }

    _drawNitroGlowFallback() {
        const g = this.nitroGlowGfx;
        g.clear();
        const hl = CONFIG.PHYSICS.VEHICLE_LENGTH / 2;
        g.fillStyle(0xFF4400, 0.08); g.fillCircle(-hl - 8, 0, 25);
        g.fillStyle(0xFF6600, 0.12); g.fillCircle(-hl - 5, 0, 18);
        g.fillStyle(0xFF8800, 0.15); g.fillCircle(-hl - 3, 0, 12);
        g.fillStyle(0xFFAA00, 0.2);  g.fillCircle(-hl - 1, 0, 6);
    }

    _drawShieldFallback() {
        const g = this.shieldGfx;
        g.clear();
        const r = CONFIG.PHYSICS.VEHICLE_LENGTH / 2 + 8;
        g.lineStyle(2, 0x33CCFF, 0.5); g.strokeEllipse(0, 0, r * 2, r * 1.4);
        g.lineStyle(1, 0x66DDFF, 0.3); g.strokeEllipse(0, 0, r * 2.2, r * 1.55);
        g.fillStyle(0x33CCFF, 0.06); g.fillEllipse(0, 0, r * 2, r * 1.4);
        for (let i = 0; i < 6; i++) {
            const a = (i / 6) * Math.PI * 2;
            g.lineStyle(1, 0x33CCFF, 0.15);
            g.beginPath();
            g.moveTo(0, 0);
            g.lineTo(Math.cos(a) * r, Math.sin(a) * r * 0.7);
            g.strokePath();
        }
    }
}
