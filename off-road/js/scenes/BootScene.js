class BootScene extends Phaser.Scene {
    constructor() {
        super({ key: 'BootScene' });
    }

    create() {
        // Initialize global systems
        window.gameAudio = window.gameAudio || new AudioManager();
        window.networkManager = window.networkManager || new NetworkManager();

        // Go directly to menu
        this.scene.start('MenuScene');
    }
}
