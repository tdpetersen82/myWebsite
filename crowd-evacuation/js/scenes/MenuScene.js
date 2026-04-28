// MenuScene: title, level select (just one level for v0.1), start button.

class MenuScene extends Phaser.Scene {
    constructor() { super('MenuScene'); }

    create() {
        const W = CFG.CANVAS_W, H = CFG.CANVAS_H;
        this.cameras.main.setBackgroundColor('#0f0c29');

        this.add.text(W / 2, 80, 'EXODUS', {
            fontFamily: 'Arial Black, Arial', fontSize: '64px', color: '#fff',
            stroke: '#000', strokeThickness: 4,
        }).setOrigin(0.5);

        this.add.text(W / 2, 140, 'When the alarm sounds, your design is everyone\'s only hope.', {
            fontFamily: 'Arial', fontSize: '14px', color: '#bbb',
        }).setOrigin(0.5);

        // Level card
        const cardX = W / 2, cardY = 280;
        const card = this.add.rectangle(cardX, cardY, 420, 160, 0x1a1a3a, 1)
            .setStrokeStyle(2, 0x6c5ce7);
        this.add.text(cardX, cardY - 50, LEVEL_01.displayName, {
            fontFamily: 'Arial Black', fontSize: '28px', color: '#fff',
        }).setOrigin(0.5);
        this.add.text(cardX, cardY - 10, '40 people · 1 exit · fire risk', {
            fontFamily: 'Arial', fontSize: '14px', color: '#aaa',
        }).setOrigin(0.5);

        // Best score
        const best = Storage.getBest();
        this.add.text(cardX, cardY + 20, `Best score: ${best}`, {
            fontFamily: 'Arial', fontSize: '14px', color: '#9ad',
        }).setOrigin(0.5);

        // Play button
        const btn = this.add.rectangle(cardX, cardY + 60, 160, 44, 0x4ade80, 1)
            .setStrokeStyle(2, 0x166534)
            .setInteractive({ useHandCursor: true });
        const btnText = this.add.text(cardX, cardY + 60, 'PLAY', {
            fontFamily: 'Arial Black', fontSize: '20px', color: '#0a3d20',
        }).setOrigin(0.5);
        btn.on('pointerover', () => btn.setFillStyle(0x86efac));
        btn.on('pointerout',  () => btn.setFillStyle(0x4ade80));
        btn.on('pointerdown', () => this.scene.start('DesignScene', { level: LEVEL_01 }));

        // Instructions
        this.add.text(W / 2, H - 80,
            'Place 3 marshals in the venue. Then press ALARM.\n' +
            'Marshals reduce panic and pull people toward exits.', {
            fontFamily: 'Arial', fontSize: '14px', color: '#aaa', align: 'center',
        }).setOrigin(0.5);
    }
}
