// SettingsModal: lightweight in-Phaser overlay for volume + accessibility.
// Persists via Storage.setSettings(). Emits 'settings-changed' on the host scene.

class SettingsModal {
    constructor(scene) {
        this.scene = scene;
        this.visible = false;
        this.elements = [];
    }

    show() {
        if (this.visible) return;
        this.visible = true;
        const W = CFG.CANVAS_W, H = CFG.CANVAS_H;
        const s = Storage.getSettings();

        const overlay = this.scene.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.7)
            .setDepth(80).setInteractive();
        const panel = this.scene.add.rectangle(W / 2, H / 2, 460, 360, 0x1a1a3a, 1)
            .setStrokeStyle(2, 0x6c5ce7).setDepth(81);
        const title = this.scene.add.text(W / 2, H / 2 - 150, 'Settings', {
            fontFamily: 'Arial Black', fontSize: '22px', color: '#fff',
        }).setOrigin(0.5).setDepth(82);

        this.elements.push(overlay, panel, title);

        // Sliders
        this._slider(W / 2, H / 2 - 100, 'Master volume', s.master ?? 1.0, (v) => {
            const cur = Storage.getSettings();
            Storage.setSettings({ ...cur, master: v });
            window.exodusAudio?.settingsChanged();
        });
        this._slider(W / 2, H / 2 - 50, 'SFX volume', s.sfx ?? 0.8, (v) => {
            const cur = Storage.getSettings();
            Storage.setSettings({ ...cur, sfx: v });
            window.exodusAudio?.settingsChanged();
        });

        // Toggles
        this._toggle(W / 2, H / 2 + 10, 'Colorblind palette', !!s.colorblind, (v) => {
            const cur = Storage.getSettings();
            Storage.setSettings({ ...cur, colorblind: v });
        });
        this._toggle(W / 2, H / 2 + 50, 'Reduced motion', !!s.reducedMotion, (v) => {
            const cur = Storage.getSettings();
            Storage.setSettings({ ...cur, reducedMotion: v });
        });

        // Close button
        const close = this.scene.add.rectangle(W / 2, H / 2 + 130, 140, 36, 0x4ade80, 1)
            .setStrokeStyle(2, 0x166534)
            .setInteractive({ useHandCursor: true })
            .setDepth(82);
        const closeText = this.scene.add.text(W / 2, H / 2 + 130, 'CLOSE', {
            fontFamily: 'Arial Black', fontSize: '14px', color: '#0a3d20',
        }).setOrigin(0.5).setDepth(83);
        close.on('pointerdown', () => { window.exodusAudio?.click(); this.hide(); });
        this.elements.push(close, closeText);
    }

    _slider(cx, cy, label, value, onChange) {
        const W = 280, H = 6;
        const labelTxt = this.scene.add.text(cx - W / 2, cy - 16, label, {
            fontFamily: 'Arial', fontSize: '13px', color: '#bbb',
        }).setDepth(82);
        const valueTxt = this.scene.add.text(cx + W / 2, cy - 16, Math.round(value * 100) + '%', {
            fontFamily: 'Arial', fontSize: '13px', color: '#9ad',
        }).setOrigin(1, 0).setDepth(82);
        const track = this.scene.add.rectangle(cx, cy, W, H, 0x44475a, 1).setDepth(82);
        const fill  = this.scene.add.rectangle(cx - W / 2 + value * W / 2, cy, value * W, H, 0x6c5ce7, 1)
            .setOrigin(0, 0.5).setDepth(82);
        const handle = this.scene.add.circle(cx - W / 2 + value * W, cy, 9, 0xa78bfa, 1)
            .setStrokeStyle(2, 0xffffff)
            .setInteractive({ useHandCursor: true, draggable: true })
            .setDepth(83);
        this.scene.input.setDraggable(handle);
        handle.on('drag', (pointer, x, y) => {
            const newX = Math.max(cx - W / 2, Math.min(cx + W / 2, x));
            handle.x = newX;
            const v = (newX - (cx - W / 2)) / W;
            fill.width = v * W;
            valueTxt.setText(Math.round(v * 100) + '%');
            onChange(v);
        });
        this.elements.push(labelTxt, valueTxt, track, fill, handle);
    }

    _toggle(cx, cy, label, value, onChange) {
        const labelTxt = this.scene.add.text(cx - 140, cy, label, {
            fontFamily: 'Arial', fontSize: '13px', color: '#bbb',
        }).setOrigin(0, 0.5).setDepth(82);
        const box = this.scene.add.rectangle(cx + 130, cy, 60, 24, value ? 0x4ade80 : 0x44475a, 1)
            .setStrokeStyle(2, 0xffffff, 0.4)
            .setInteractive({ useHandCursor: true })
            .setDepth(82);
        const knob = this.scene.add.circle(cx + 130 + (value ? 14 : -14), cy, 9, 0xffffff, 1).setDepth(83);
        let v = value;
        box.on('pointerdown', () => {
            v = !v;
            window.exodusAudio?.click();
            box.setFillStyle(v ? 0x4ade80 : 0x44475a, 1);
            knob.x = cx + 130 + (v ? 14 : -14);
            onChange(v);
        });
        this.elements.push(labelTxt, box, knob);
    }

    hide() {
        for (const e of this.elements) e.destroy();
        this.elements = [];
        this.visible = false;
    }
}
