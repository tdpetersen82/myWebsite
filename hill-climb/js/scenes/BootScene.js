class BootScene extends Phaser.Scene {
    constructor() {
        super({ key: 'BootScene' });
    }

    preload() {
        // Loading bar
        const w = CONFIG.WIDTH;
        const h = CONFIG.HEIGHT;
        const barW = 300;
        const barH = 20;
        const barX = (w - barW) / 2;
        const barY = h / 2 + 20;

        const bg = this.add.rectangle(w / 2, h / 2, w, h, 0x1a1a2e);
        const title = this.add.text(w / 2, h / 2 - 40, 'DIRT BIKE HILL CLIMB', {
            fontSize: '28px', fontFamily: 'Arial', color: '#ffffff', fontStyle: 'bold'
        }).setOrigin(0.5);

        const loadingText = this.add.text(w / 2, barY - 20, 'Loading...', {
            fontSize: '14px', fontFamily: 'Arial', color: '#aaaaaa'
        }).setOrigin(0.5);

        const barBg = this.add.rectangle(barX, barY, barW, barH, 0x333333).setOrigin(0, 0);
        const barFill = this.add.rectangle(barX + 2, barY + 2, 0, barH - 4, 0xff4444).setOrigin(0, 0);

        this.load.on('progress', (value) => {
            barFill.width = (barW - 4) * value;
        });

        this.load.on('complete', () => {
            loadingText.setText('Ready!');
        });

        // If loading stalls (e.g. audio decode issues), force continue
        window._bootTimeout = setTimeout(() => {
            const active = game.scene.getScenes(true).map(s => s.scene.key);
            if (!active.includes('MenuScene') && !active.includes('GameScene')) {
                console.warn('Boot: Load timeout after 5s, forcing MenuScene');
                game.scene.stop('BootScene');
                game.scene.start('MenuScene');
            }
        }, 5000);

        // Load bike atlas
        this.load.atlas('bike', 'assets/bike/bike.png', 'assets/bike/bike.json');

        // Load terrain atlases
        CONFIG.BIOMES.forEach(biome => {
            this.load.atlas(`terrain_${biome}`, `assets/terrain/terrain_${biome}.png`, `assets/terrain/terrain_${biome}.json`);
        });

        // Load backgrounds
        CONFIG.BIOMES.forEach(biome => {
            for (let i = 0; i < 3; i++) {
                this.load.image(`${biome}_layer${i}`, `assets/backgrounds/${biome}_layer${i}.png`);
            }
        });

        // Load pickups
        this.load.atlas('pickups', 'assets/pickups/pickups.png', 'assets/pickups/pickups.json');

        // Load UI
        this.load.atlas('ui', 'assets/ui/ui.png', 'assets/ui/ui.json');

        // Load audio
        const audioFiles = [
            'coin', 'fuel_pickup', 'crash', 'flip_bonus',
            'land', 'low_fuel', 'click', 'game_over',
            'engine_idle', 'engine_rev'
        ];
        audioFiles.forEach(name => {
            this.load.audio(name, `assets/audio/${name}.wav`);
        });
    }

    create() {
        this.scene.start('MenuScene');
    }
}
