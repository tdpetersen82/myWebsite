class MenuScene extends Phaser.Scene {
    constructor() {
        super({ key: 'MenuScene' });
    }

    create() {
        const w = CONFIG.WIDTH;
        const h = CONFIG.HEIGHT;

        // Sky background
        this.add.image(w / 2, h / 2, 'grassland_layer0').setDisplaySize(w, h);

        // Ground
        this.add.rectangle(w / 2, h - 60, w, 120, 0x4A7A2E);
        this.add.rectangle(w / 2, h - 118, w, 4, 0x5A9A3E);

        // Title
        this.add.text(w / 2, 100, 'DIRT BIKE', {
            fontSize: '52px', fontFamily: 'Arial', color: '#ffffff',
            fontStyle: 'bold', stroke: '#000000', strokeThickness: 6
        }).setOrigin(0.5);

        this.add.text(w / 2, 155, 'HILL CLIMB', {
            fontSize: '36px', fontFamily: 'Arial', color: '#ff4444',
            fontStyle: 'bold', stroke: '#000000', strokeThickness: 4
        }).setOrigin(0.5);

        // Bike preview — body only (wheels are separate animated sprites)
        const bikePreview = this.add.image(w / 2 - 25, h - 150, 'bike', 'bike_neutral');
        bikePreview.setScale(1.5).setDepth(1);

        // Animated wheels — positioned to match the bike sprite
        this.wheelAngle = 0;
        this.wheelFrame = 0;
        this.rearWheel = this.add.image(w / 2 - 68, h - 110, 'bike', 'wheel_0').setScale(1.5).setDepth(0);
        this.frontWheel = this.add.image(w / 2 + 18, h - 110, 'bike', 'wheel_0').setScale(1.5).setDepth(0);

        // High score
        const bestDistance = localStorage.getItem(CONFIG.LS_HIGH_SCORE) || 0;
        if (bestDistance > 0) {
            this.add.text(w / 2, 220, `Best: ${Math.floor(bestDistance)}m`, {
                fontSize: '22px', fontFamily: 'Arial', color: '#ffdd44',
                fontStyle: 'bold', stroke: '#000000', strokeThickness: 3
            }).setOrigin(0.5);
        }

        // Instructions
        this.add.text(w / 2, h / 2 + 20, 'Controls:', {
            fontSize: '18px', fontFamily: 'Arial', color: '#ffffff',
            fontStyle: 'bold', stroke: '#000000', strokeThickness: 2
        }).setOrigin(0.5);

        const controls = [
            'UP / W  -  Gas',
            'LEFT / A  -  Lean Back',
            'RIGHT / D  -  Lean Forward',
            'DOWN / S  -  Brake',
        ];
        controls.forEach((line, i) => {
            this.add.text(w / 2, h / 2 + 50 + i * 24, line, {
                fontSize: '14px', fontFamily: 'Arial', color: '#cccccc',
                stroke: '#000000', strokeThickness: 2
            }).setOrigin(0.5);
        });

        // Start prompt
        this.startText = this.add.text(w / 2, h - 30, 'Press ENTER or tap to start', {
            fontSize: '20px', fontFamily: 'Arial', color: '#ffffff',
            fontStyle: 'bold', stroke: '#000000', strokeThickness: 3
        }).setOrigin(0.5);

        // Blink animation
        this.tweens.add({
            targets: this.startText,
            alpha: 0.3,
            duration: 600,
            yoyo: true,
            repeat: -1,
        });

        // Input
        this.input.keyboard.once('keydown-ENTER', () => this.startGame());
        this.input.keyboard.once('keydown-SPACE', () => this.startGame());
        this.input.once('pointerdown', () => this.startGame());
    }

    update() {
        // Spin wheels on menu
        this.wheelFrame = ((this.wheelFrame || 0) + 0.05) % 4;
        const frame = Math.floor(this.wheelFrame);
        if (this.rearWheel) this.rearWheel.setFrame(`wheel_${frame}`);
        if (this.frontWheel) this.frontWheel.setFrame(`wheel_${frame}`);
    }

    startGame() {
        this.scene.start('GameScene');
    }
}
