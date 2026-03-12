// ============================================================
// Missile Command — Boot Scene
// ============================================================

class BootScene extends Phaser.Scene {
    constructor() {
        super({ key: 'BootScene' });
    }

    create() {
        // Quick transition to menu
        this.cameras.main.fadeIn(500, 0, 0, 0);
        this.time.delayedCall(600, () => {
            this.scene.start('MenuScene');
        });
    }
}
