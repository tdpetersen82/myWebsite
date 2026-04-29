// TutorialController: multi-step caption banner that advances on player events.
// Hosted by DesignScene. Each step has a text and an `advance` event name.
// When DesignScene fires that event, the next step shows.
// Backwards-compatible shim: if a level uses the legacy tutorial.intro string,
// build a single-step set automatically.

class TutorialController {
    constructor(scene, steps) {
        this.scene = scene;
        this.steps = steps || [];
        this.idx = 0;
        this.banner = null;
        this._render();
    }

    static fromLevel(scene, level) {
        if (!level.tutorial) return null;
        if (Array.isArray(level.tutorial.steps)) {
            return new TutorialController(scene, level.tutorial.steps);
        }
        if (level.tutorial.intro) {
            return new TutorialController(scene, [{ text: level.tutorial.intro, advance: '__click__' }]);
        }
        return null;
    }

    notify(event) {
        if (this.idx >= this.steps.length) return;
        const cur = this.steps[this.idx];
        if (cur.advance === event) {
            this.idx++;
            window.exodusAudio?.click();
            this._render();
        }
    }

    _render() {
        if (this.banner) {
            for (const e of this.banner) e.destroy();
            this.banner = null;
        }
        if (this.idx >= this.steps.length) return;
        const W = CFG.CANVAS_W;
        const cur = this.steps[this.idx];
        // Banner pinned just below toolbar.
        const y = CFG.HUD_HEIGHT + 8;
        const bg = this.scene.add.rectangle(W / 2, y, 580, 48, 0x000000, 0.78)
            .setOrigin(0.5, 0).setStrokeStyle(2, 0xfbbf24).setDepth(40);
        const txt = this.scene.add.text(W / 2, y + 24, `(${this.idx + 1}/${this.steps.length})  ${cur.text}`, {
            fontFamily: 'Arial', fontSize: '12px', color: '#fff',
            align: 'center', wordWrap: { width: 540 },
        }).setOrigin(0.5, 0.5).setDepth(41);
        // Allow click-to-advance for "click anywhere" steps
        if (cur.advance === '__click__') {
            bg.setInteractive({ useHandCursor: true });
            bg.on('pointerdown', () => this.notify('__click__'));
        }
        this.banner = [bg, txt];
    }
}
