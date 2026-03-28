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

        // Shadow (separate, rendered below)
        this.shadowGfx = scene.add.graphics();
        this.shadowGfx.setDepth(5);

        // Main container
        this.container = scene.add.container(0, 0);
        this.container.setDepth(10);

        // Car graphics
        this.gfx = scene.add.graphics();
        this.container.add(this.gfx);

        // Nitro glow (rendered behind car)
        this.nitroGlowGfx = scene.add.graphics();
        this.nitroGlowGfx.setVisible(false);
        this.container.add(this.nitroGlowGfx);

        // Shield graphic
        this.shieldGfx = scene.add.graphics();
        this.shieldGfx.setVisible(false);
        this.container.add(this.shieldGfx);

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

        this._drawVehicle();
        this._drawNitroGlow();
        this._drawShield();
    }

    setName(name) {
        this.playerName = name;
        this.nameText.setText(name);
    }

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

    _drawVehicle() {
        const g = this.gfx;
        g.clear();

        const color = this.config.color;
        const stripe = this.config.stripe;
        const accent = this.config.accent;
        const dark = this._darken(color, 0.3);
        const light = this._lighten(color, 0.2);
        const W = CONFIG.PHYSICS.VEHICLE_WIDTH;
        const L = CONFIG.PHYSICS.VEHICLE_LENGTH;
        const hw = W / 2;
        const hl = L / 2;

        // === CAR BODY ===

        // Main body shape (slightly tapered front)
        g.fillStyle(dark, 1);
        g.beginPath();
        g.moveTo(-hl, -hw + 2);       // rear left
        g.lineTo(-hl, hw - 2);        // rear right
        g.lineTo(hl - 8, hw - 1);     // front-right
        g.lineTo(hl - 2, hw * 0.6);   // front-right taper
        g.lineTo(hl, 0);              // nose tip
        g.lineTo(hl - 2, -hw * 0.6);  // front-left taper
        g.lineTo(hl - 8, -hw + 1);    // front-left
        g.closePath();
        g.fillPath();

        // Body fill (main color, slightly inset)
        g.fillStyle(color, 1);
        g.beginPath();
        g.moveTo(-hl + 1, -hw + 3);
        g.lineTo(-hl + 1, hw - 3);
        g.lineTo(hl - 9, hw - 2);
        g.lineTo(hl - 3, hw * 0.55);
        g.lineTo(hl - 1, 0);
        g.lineTo(hl - 3, -hw * 0.55);
        g.lineTo(hl - 9, -hw + 2);
        g.closePath();
        g.fillPath();

        // Hood gradient (lighter upper half)
        g.fillStyle(light, 0.4);
        g.beginPath();
        g.moveTo(-hl + 6, -hw + 4);
        g.lineTo(hl - 10, -hw + 3);
        g.lineTo(hl - 4, -hw * 0.3);
        g.lineTo(hl - 4, 0);
        g.lineTo(-hl + 6, 0);
        g.closePath();
        g.fillPath();

        // Panel lines (thin dark lines)
        g.lineStyle(1, dark, 0.5);
        // Door line
        g.beginPath(); g.moveTo(-4, -hw + 3); g.lineTo(-4, hw - 3); g.strokePath();
        // Hood/windshield line
        g.beginPath(); g.moveTo(hl - 16, -hw + 3); g.lineTo(hl - 16, hw - 3); g.strokePath();
        // Trunk line
        g.beginPath(); g.moveTo(-hl + 8, -hw + 3); g.lineTo(-hl + 8, hw - 3); g.strokePath();

        // Racing stripe (two parallel lines)
        g.fillStyle(stripe, 0.8);
        g.fillRect(-hl + 3, -3, L - 10, 2);
        g.fillRect(-hl + 3, 1, L - 10, 2);

        // Windshield (dark tinted glass)
        g.fillStyle(0x1A3A5C, 0.85);
        g.beginPath();
        g.moveTo(hl - 16, -hw + 4);
        g.lineTo(hl - 10, -hw + 3);
        g.lineTo(hl - 6, -hw * 0.5);
        g.lineTo(hl - 6, hw * 0.5);
        g.lineTo(hl - 10, hw - 3);
        g.lineTo(hl - 16, hw - 4);
        g.closePath();
        g.fillPath();
        // Windshield reflection
        g.fillStyle(0x88CCEE, 0.25);
        g.beginPath();
        g.moveTo(hl - 15, -hw + 5);
        g.lineTo(hl - 11, -hw + 4);
        g.lineTo(hl - 9, -hw * 0.4);
        g.lineTo(hl - 13, 0);
        g.lineTo(hl - 15, 0);
        g.closePath();
        g.fillPath();

        // Rear window
        g.fillStyle(0x1A3A5C, 0.7);
        g.fillRoundedRect(-hl + 9, -hw + 5, 8, W - 10, 2);

        // Driver silhouette in cockpit
        g.fillStyle(0x0D1B2A, 0.6);
        g.fillCircle(-8, 0, 4);
        g.fillRoundedRect(-10, -3, 5, 6, 1);

        // === WHEELS (with detail) ===
        const wheelW = 9, wheelH = 5;
        const drawWheel = (wx, wy) => {
            g.fillStyle(0x111111, 1);
            g.fillRoundedRect(wx - wheelW/2, wy - wheelH/2, wheelW, wheelH, 1.5);
            g.fillStyle(0x333333, 1);
            g.fillRoundedRect(wx - wheelW/2 + 1, wy - wheelH/2 + 0.5, wheelW - 2, wheelH - 1, 1);
            // Hub cap
            g.fillStyle(0x555555, 1);
            g.fillCircle(wx, wy, 1.5);
        };
        drawWheel(-hl + 8, -hw - 1.5);   // rear left
        drawWheel(-hl + 8, hw + 1.5);     // rear right
        drawWheel(hl - 13, -hw - 1.5);    // front left
        drawWheel(hl - 13, hw + 1.5);     // front right

        // === HEADLIGHTS ===
        g.fillStyle(0xFFFF99, 0.9);
        g.fillEllipse(hl - 3, -hw * 0.45, 4, 3);
        g.fillEllipse(hl - 3, hw * 0.45, 4, 3);
        // Headlight glow
        g.fillStyle(0xFFFF66, 0.15);
        g.fillEllipse(hl + 2, -hw * 0.45, 10, 6);
        g.fillEllipse(hl + 2, hw * 0.45, 10, 6);

        // === TAILLIGHTS ===
        g.fillStyle(0xFF0000, 1);
        g.fillRoundedRect(-hl, -hw + 3, 3, 4, 1);
        g.fillRoundedRect(-hl, hw - 7, 3, 4, 1);
        // Taillight glow
        g.fillStyle(0xFF0000, 0.15);
        g.fillCircle(-hl - 2, -hw + 5, 4);
        g.fillCircle(-hl - 2, hw - 5, 4);

        // === CHROME BUMPER (front edge highlight) ===
        g.lineStyle(1.5, 0xCCCCCC, 0.7);
        g.beginPath();
        g.moveTo(hl - 7, -hw + 2);
        g.lineTo(hl - 2, -hw * 0.55);
        g.lineTo(hl, 0);
        g.lineTo(hl - 2, hw * 0.55);
        g.lineTo(hl - 7, hw - 2);
        g.strokePath();

        // === SIDE MIRRORS ===
        g.fillStyle(dark, 1);
        g.fillCircle(hl - 14, -hw - 2, 2);
        g.fillCircle(hl - 14, hw + 2, 2);

        // === NUMBER on roof ===
        g.fillStyle(0xFFFFFF, 0.7);
        g.fillCircle(-2, 0, 5);
        g.fillStyle(dark, 0.9);
        g.fillCircle(-2, 0, 3.5);

        // === EXHAUST PIPES (rear) ===
        g.fillStyle(0x444444, 1);
        g.fillCircle(-hl - 1, -hw * 0.3, 2);
        g.fillCircle(-hl - 1, hw * 0.3, 2);
        g.fillStyle(0x666666, 1);
        g.fillCircle(-hl - 1, -hw * 0.3, 1.2);
        g.fillCircle(-hl - 1, hw * 0.3, 1.2);
    }

    _drawNitroGlow() {
        const g = this.nitroGlowGfx;
        g.clear();
        const hl = CONFIG.PHYSICS.VEHICLE_LENGTH / 2;
        // Multi-layer glow behind car
        g.fillStyle(0xFF4400, 0.08); g.fillCircle(-hl - 8, 0, 25);
        g.fillStyle(0xFF6600, 0.12); g.fillCircle(-hl - 5, 0, 18);
        g.fillStyle(0xFF8800, 0.15); g.fillCircle(-hl - 3, 0, 12);
        g.fillStyle(0xFFAA00, 0.2);  g.fillCircle(-hl - 1, 0, 6);
    }

    _drawShield() {
        const g = this.shieldGfx;
        g.clear();
        const r = CONFIG.PHYSICS.VEHICLE_LENGTH / 2 + 8;
        // Multi-ring shield
        g.lineStyle(2, 0x33CCFF, 0.5); g.strokeEllipse(0, 0, r * 2, r * 1.4);
        g.lineStyle(1, 0x66DDFF, 0.3); g.strokeEllipse(0, 0, r * 2.2, r * 1.55);
        g.fillStyle(0x33CCFF, 0.06); g.fillEllipse(0, 0, r * 2, r * 1.4);
        // Hex pattern hint
        for (let i = 0; i < 6; i++) {
            const a = (i / 6) * Math.PI * 2;
            g.lineStyle(1, 0x33CCFF, 0.15);
            g.beginPath();
            g.moveTo(0, 0);
            g.lineTo(Math.cos(a) * r, Math.sin(a) * r * 0.7);
            g.strokePath();
        }
    }

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

    update(time, delta) {
        // Drop shadow
        this.shadowGfx.clear();
        if (this.jumpActive) {
            this.shadowGfx.setVisible(true);
            this.shadowGfx.fillStyle(0x000000, 0.15);
            this.shadowGfx.fillEllipse(this.displayX + 3, this.displayY + 3,
                CONFIG.PHYSICS.VEHICLE_LENGTH * 0.8, CONFIG.PHYSICS.VEHICLE_WIDTH * 0.6);
            this.container.setPosition(this.displayX, this.displayY - this.jumpHeight);
        } else {
            // Normal ground shadow
            this.shadowGfx.setVisible(true);
            this.shadowGfx.fillStyle(0x000000, 0.18);
            this.shadowGfx.fillEllipse(this.displayX + 2, this.displayY + 2,
                CONFIG.PHYSICS.VEHICLE_LENGTH * 0.85, CONFIG.PHYSICS.VEHICLE_WIDTH * 0.7);
            this.container.setPosition(this.displayX, this.displayY);
        }

        this.container.setRotation(this.displayAngle);

        // Nitro glow
        this.nitroGlowGfx.setVisible(this.nitroActive);
        if (this.nitroActive) {
            const pulse = 0.8 + Math.sin(time / 60) * 0.2;
            this.nitroGlowGfx.setAlpha(pulse);
        }

        // Shield
        this.shieldGfx.setVisible(this.shieldActive);
        if (this.shieldActive) {
            this.shieldGfx.setAlpha(0.5 + Math.sin(time / 200) * 0.2);
            this.shieldGfx.setRotation(-this.displayAngle + time / 1000);
        }

        // Speed boost glow
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
        this.shadowGfx.destroy();
    }
}
