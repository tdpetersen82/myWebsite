class InputManager {
    constructor(scene) {
        this.scene = scene;
        this.keys = {};
        this.touchInput = { steer: 0, gas: false, brake: false, nitro: false, drift: false, usePowerUp: false };
        this.usingTouch = false;

        // Keyboard
        if (scene && scene.input && scene.input.keyboard) {
            this.cursors = scene.input.keyboard.createCursorKeys();
            this.wasd = {
                up: scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
                down: scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S),
                left: scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
                right: scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D),
            };
            this.spaceKey = scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
            this.shiftKey = scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT);
            this.eKey = scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E);
        }

        // Touch controls
        this._setupTouchControls();
    }

    _setupTouchControls() {
        if (!this.scene) return;

        this.touchZones = {
            steerLeft: null,
            steerRight: null,
            gas: null,
            brake: null,
            nitro: null,
        };

        // Detect touch device
        this.scene.input.on('pointerdown', (pointer) => {
            if (pointer.wasTouch) this.usingTouch = true;
        });
    }

    getInput() {
        if (this.usingTouch) {
            return this._getTouchInput();
        }
        return this._getKeyboardInput();
    }

    _getKeyboardInput() {
        if (!this.cursors) return { steer: 0, gas: false, brake: false, nitro: false, drift: false, usePowerUp: false };

        let steer = 0;
        if (this.cursors.left.isDown || this.wasd.left.isDown) steer -= 1;
        if (this.cursors.right.isDown || this.wasd.right.isDown) steer += 1;

        return {
            steer: steer,
            gas: this.cursors.up.isDown || this.wasd.up.isDown,
            brake: this.cursors.down.isDown || this.wasd.down.isDown,
            nitro: this.spaceKey.isDown,
            drift: this.shiftKey.isDown,
            usePowerUp: Phaser.Input.Keyboard.JustDown(this.eKey),
        };
    }

    _getTouchInput() {
        const pointers = this.scene.input.manager.pointers;
        let steer = 0;
        let gas = false;
        let brake = false;
        let nitro = false;
        let drift = false;

        const w = this.scene.scale.width;
        const h = this.scene.scale.height;

        for (const pointer of pointers) {
            if (!pointer.isDown) continue;
            const px = pointer.x / w;
            const py = pointer.y / h;

            // Left third = steer left, right third = steer right
            if (px < 0.33) steer -= 1;
            else if (px > 0.67) steer += 1;

            // Bottom half = gas, top area on sides = brake
            if (py > 0.6) {
                gas = true;
                // Two finger = nitro
                if (pointer.identifier > 0) nitro = true;
            } else if (py < 0.3 && (px < 0.33 || px > 0.67)) {
                brake = true;
            }
        }

        return { steer, gas, brake, nitro, drift, usePowerUp: false };
    }

    // Serialize for network
    serialize(input) {
        // Pack into compact format
        let flags = 0;
        if (input.gas) flags |= 1;
        if (input.brake) flags |= 2;
        if (input.nitro) flags |= 4;
        if (input.drift) flags |= 8;
        if (input.usePowerUp) flags |= 16;
        return {
            s: Math.round(input.steer * 100) / 100,
            f: flags,
        };
    }

    // Deserialize from network
    static deserialize(data) {
        return {
            steer: data.s,
            gas: !!(data.f & 1),
            brake: !!(data.f & 2),
            nitro: !!(data.f & 4),
            drift: !!(data.f & 8),
            usePowerUp: !!(data.f & 16),
        };
    }
}
