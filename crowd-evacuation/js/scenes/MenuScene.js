// MenuScene: title + level-select grid. Reads stars from Storage.

class MenuScene extends Phaser.Scene {
    constructor() { super('MenuScene'); }

    create() {
        const W = CFG.CANVAS_W, H = CFG.CANVAS_H;
        this.cameras.main.setBackgroundColor('#0f0c29');

        // Title
        this.add.text(W / 2, 60, 'EXODUS', {
            fontFamily: 'Arial Black, Arial', fontSize: '52px', color: '#fff',
            stroke: '#000', strokeThickness: 4,
        }).setOrigin(0.5);
        this.add.text(W / 2, 110, 'When the alarm sounds, your design is everyone\'s only hope.', {
            fontFamily: 'Arial', fontSize: '13px', color: '#bbb',
        }).setOrigin(0.5);

        // Best score readout
        const best = Storage.getBest();
        this.add.text(W / 2, 134, `Best score: ${best}`, {
            fontFamily: 'Arial', fontSize: '12px', color: '#9ad',
        }).setOrigin(0.5);

        // Level select grid — one card per registered level
        const cardW = 220, cardH = 140;
        const gap = 24;
        const total = LEVELS.length;
        const rowW = total * cardW + (total - 1) * gap;
        const startX = (W - rowW) / 2 + cardW / 2;
        const cardY = 280;

        LEVELS.forEach((level, i) => {
            const cx = startX + i * (cardW + gap);
            this._drawLevelCard(cx, cardY, cardW, cardH, level, i);
        });

        // Footer
        this.add.text(W / 2, H - 60,
            'Place tools in the venue. Sound the alarm. Design is locked once it fires.\n' +
            'Marshals reduce panic · barriers redirect · signs guide · PA calms.', {
            fontFamily: 'Arial', fontSize: '12px', color: '#888', align: 'center',
        }).setOrigin(0.5);
    }

    _drawLevelCard(cx, cy, w, h, level, index) {
        const card = this.add.rectangle(cx, cy, w, h, 0x1a1a3a, 1)
            .setStrokeStyle(2, 0x6c5ce7)
            .setInteractive({ useHandCursor: true });

        // index pill
        this.add.text(cx - w / 2 + 12, cy - h / 2 + 10, `${index + 1}`, {
            fontFamily: 'Arial Black', fontSize: '11px', color: '#6c5ce7',
            backgroundColor: '#0f0c29', padding: { x: 6, y: 2 },
        });

        // title
        this.add.text(cx, cy - 40, level.displayName, {
            fontFamily: 'Arial Black', fontSize: '16px', color: '#fff',
            wordWrap: { width: w - 20 }, align: 'center',
        }).setOrigin(0.5);

        // summary line
        const summary = `${level.spawn.count} ppl · ${this._exitDescription(level)}`;
        this.add.text(cx, cy - 12, summary, {
            fontFamily: 'Arial', fontSize: '11px', color: '#aaa',
        }).setOrigin(0.5);

        // budget summary
        const b = level.budget;
        const budgetLine =
            (b.marshals       ? `M${b.marshals} ` : '') +
            (b.barrier_units  ? `B${b.barrier_units} ` : '') +
            (b.signs          ? `S${b.signs} ` : '') +
            (b.pa             ? `P${b.pa}` : '');
        this.add.text(cx, cy + 8, budgetLine.trim(), {
            fontFamily: 'monospace', fontSize: '11px', color: '#7dd3fc',
        }).setOrigin(0.5);

        // stars (if cleared)
        const score = Storage.getScore(level.id);
        const stars = score ? score.stars : 0;
        const starLine = '★★★'.substring(0, stars) + '☆☆☆'.substring(0, 3 - stars);
        this.add.text(cx, cy + 32, starLine, {
            fontFamily: 'Arial', fontSize: '20px',
            color: stars > 0 ? '#fbbf24' : '#444',
        }).setOrigin(0.5);

        // play button
        const btn = this.add.rectangle(cx, cy + 56, 100, 26, 0x4ade80, 1)
            .setStrokeStyle(2, 0x166534)
            .setInteractive({ useHandCursor: true });
        this.add.text(cx, cy + 56, 'PLAY', {
            fontFamily: 'Arial Black', fontSize: '13px', color: '#0a3d20',
        }).setOrigin(0.5);
        const onPlay = () => this.scene.start('DesignScene', { level });
        btn.on('pointerover', () => btn.setFillStyle(0x86efac));
        btn.on('pointerout',  () => btn.setFillStyle(0x4ade80));
        btn.on('pointerdown', onPlay);
        card.on('pointerdown', onPlay);
        card.on('pointerover', () => card.setStrokeStyle(2, 0xa78bfa));
        card.on('pointerout',  () => card.setStrokeStyle(2, 0x6c5ce7));
    }

    _exitDescription(level) {
        // Count exit cells
        let n = 0;
        for (const row of level.tiles) for (const ch of row) if (ch === 'E') n++;
        return `${(n * CFG.CELL_M).toFixed(1)}m exit`;
    }
}
