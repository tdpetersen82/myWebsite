class GameOverScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameOverScene' });
    }

    create(data) {
        const w = CONFIG.WIDTH;
        const h = CONFIG.HEIGHT;

        const distance = data.distance || 0;
        const coins = data.coins || 0;
        const flips = data.flips || 0;
        const score = data.score || 0;
        const reason = data.reason || 'crashed';

        // Background
        this.add.rectangle(w / 2, h / 2, w, h, 0x1a1a2e, 0.95);

        // Crash sprite
        this.add.image(w / 2, 100, 'bike', 'bike_crash').setScale(1.5);

        // Title
        const titleText = reason === 'fuel' ? 'OUT OF FUEL!' : 'CRASHED!';
        const titleColor = reason === 'fuel' ? '#ffaa00' : '#ff4444';
        this.add.text(w / 2, 170, titleText, {
            fontSize: '42px', fontFamily: 'Arial', color: titleColor,
            fontStyle: 'bold', stroke: '#000000', strokeThickness: 5
        }).setOrigin(0.5);

        // Stats
        const stats = [
            { label: 'Distance', value: `${Math.floor(distance)}m`, color: '#ffffff' },
            { label: 'Coins', value: `${coins}`, color: '#ffdd44' },
            { label: 'Flips', value: `${flips}`, color: '#44ddff' },
            { label: 'Total Score', value: `${Math.floor(score)}`, color: '#44ff44' },
        ];

        stats.forEach((stat, i) => {
            this.add.text(w / 2 - 80, 220 + i * 36, stat.label + ':', {
                fontSize: '20px', fontFamily: 'Arial', color: '#aaaaaa',
                fontStyle: 'bold'
            }).setOrigin(0, 0.5);
            this.add.text(w / 2 + 80, 220 + i * 36, stat.value, {
                fontSize: '22px', fontFamily: 'Arial', color: stat.color,
                fontStyle: 'bold'
            }).setOrigin(0.5);
        });

        // New best?
        const bestDistance = parseFloat(localStorage.getItem(CONFIG.LS_HIGH_SCORE) || '0');
        if (distance > bestDistance) {
            localStorage.setItem(CONFIG.LS_HIGH_SCORE, distance.toString());
            this.add.text(w / 2, 380, 'NEW BEST!', {
                fontSize: '28px', fontFamily: 'Arial', color: '#ffdd44',
                fontStyle: 'bold', stroke: '#000000', strokeThickness: 4
            }).setOrigin(0.5);
        } else {
            this.add.text(w / 2, 380, `Best: ${Math.floor(bestDistance)}m`, {
                fontSize: '18px', fontFamily: 'Arial', color: '#888888'
            }).setOrigin(0.5);
        }

        // Buttons
        const retryBtn = this.add.text(w / 2 - 100, 450, 'RETRY', {
            fontSize: '26px', fontFamily: 'Arial', color: '#ffffff',
            fontStyle: 'bold', backgroundColor: '#cc2222',
            padding: { x: 20, y: 10 }
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });

        const menuBtn = this.add.text(w / 2 + 100, 450, 'MENU', {
            fontSize: '26px', fontFamily: 'Arial', color: '#ffffff',
            fontStyle: 'bold', backgroundColor: '#444444',
            padding: { x: 20, y: 10 }
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });

        retryBtn.on('pointerover', () => retryBtn.setStyle({ backgroundColor: '#ee4444' }));
        retryBtn.on('pointerout', () => retryBtn.setStyle({ backgroundColor: '#cc2222' }));
        retryBtn.on('pointerdown', () => this.scene.start('GameScene'));

        menuBtn.on('pointerover', () => menuBtn.setStyle({ backgroundColor: '#666666' }));
        menuBtn.on('pointerout', () => menuBtn.setStyle({ backgroundColor: '#444444' }));
        menuBtn.on('pointerdown', () => this.scene.start('MenuScene'));

        // Keyboard shortcuts
        this.input.keyboard.once('keydown-ENTER', () => this.scene.start('GameScene'));
        this.input.keyboard.once('keydown-SPACE', () => this.scene.start('GameScene'));
        this.input.keyboard.once('keydown-ESC', () => this.scene.start('MenuScene'));

        // Hint
        this.add.text(w / 2, 510, 'Press ENTER to retry  |  ESC for menu', {
            fontSize: '13px', fontFamily: 'Arial', color: '#666666'
        }).setOrigin(0.5);
    }
}
