class BootScene extends Phaser.Scene {
    constructor() {
        super({ key: 'BootScene' });
    }

    preload() {
        // --- Loading bar UI ---
        const w = this.cameras.main.width;
        const h = this.cameras.main.height;

        const barW = 400, barH = 30;
        const barX = (w - barW) / 2;
        const barY = h / 2 + 20;

        // Title text
        this.add.text(w / 2, h / 2 - 60, 'SUPER OFF ROAD', {
            fontSize: '32px',
            fontFamily: '"Press Start 2P", monospace',
            color: '#FF6600',
            stroke: '#000000',
            strokeThickness: 4,
        }).setOrigin(0.5);

        // "Loading..." text
        const loadingText = this.add.text(w / 2, barY - 20, 'Loading...', {
            fontSize: '12px',
            fontFamily: '"Press Start 2P", monospace',
            color: '#ffffff',
        }).setOrigin(0.5);

        // Bar background
        const barBg = this.add.graphics();
        barBg.fillStyle(0x222233, 1);
        barBg.fillRoundedRect(barX - 2, barY - 2, barW + 4, barH + 4, 6);
        barBg.lineStyle(2, 0x3388FF, 0.5);
        barBg.strokeRoundedRect(barX - 2, barY - 2, barW + 4, barH + 4, 6);

        // Bar fill
        const barFill = this.add.graphics();

        // Percentage text
        const pctText = this.add.text(w / 2, barY + barH + 16, '0%', {
            fontSize: '10px',
            fontFamily: '"Press Start 2P", monospace',
            color: '#aaaaaa',
        }).setOrigin(0.5);

        this.load.on('progress', (value) => {
            barFill.clear();
            // Gradient: green -> yellow -> orange
            const fillW = barW * value;
            barFill.fillStyle(0x00FF44, 1);
            barFill.fillRoundedRect(barX, barY, fillW, barH, 4);
            // Glossy highlight
            barFill.fillStyle(0xFFFFFF, 0.15);
            barFill.fillRoundedRect(barX, barY, fillW, barH / 3, 4);

            pctText.setText(Math.round(value * 100) + '%');
        });

        this.load.on('complete', () => {
            loadingText.setText('Ready!');
            pctText.setText('100%');
        });

        // --- Load all assets ---

        // Vehicle spritesheets (8 vehicles)
        for (let i = 0; i < 8; i++) {
            this.load.atlas(
                `vehicle_${i}`,
                `assets/vehicles/vehicle_${i}.png`,
                `assets/vehicles/vehicle_${i}.json`
            );
        }
        this.load.image('vehicle_shadow', 'assets/vehicles/shadow.png');

        // Track images (3 tracks)
        for (let i = 0; i < 3; i++) {
            this.load.image(`track_${i}`, `assets/tracks/track_${i}.png`);
        }

        // Decoration atlases (3 themes)
        this.load.atlas('decor_desert', 'assets/decorations/desert.png', 'assets/decorations/desert.json');
        this.load.atlas('decor_arctic', 'assets/decorations/arctic.png', 'assets/decorations/arctic.json');
        this.load.atlas('decor_jungle', 'assets/decorations/jungle.png', 'assets/decorations/jungle.json');

        // Power-up atlas
        this.load.atlas('powerups', 'assets/powerups/powerups.png', 'assets/powerups/powerups.json');

        // Particle atlas
        this.load.atlas('particles', 'assets/particles/particles.png', 'assets/particles/particles.json');

        // UI atlas
        this.load.atlas('ui', 'assets/ui/ui.png', 'assets/ui/ui.json');

        // Audio files
        const audioFiles = [
            'engine_idle', 'engine_high',
            'tire_screech', 'drift_screech',
            'collision_light', 'collision_heavy',
            'nitro_boost', 'powerup_collect',
            'missile_fire', 'missile_explode',
            'oil_splat', 'shield_activate',
            'spinout', 'countdown_beep', 'countdown_go',
            'lap_complete', 'race_finish',
            'button_click', 'wrong_way',
            'jump_launch', 'jump_land',
        ];
        for (const name of audioFiles) {
            this.load.audio(name, `assets/audio/${name}.wav`);
        }
    }

    create() {
        // Initialize global systems
        window.gameAudio = window.gameAudio || new AudioManager();
        window.networkManager = window.networkManager || new NetworkManager();

        // Brief delay so player sees "Ready!"
        this.time.delayedCall(300, () => {
            this.scene.start('MenuScene');
        });
    }
}
