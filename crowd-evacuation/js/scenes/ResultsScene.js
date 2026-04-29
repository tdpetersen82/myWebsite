// ResultsScene: shows score breakdown and offers retry / menu.

class ResultsScene extends Phaser.Scene {
    constructor() { super('ResultsScene'); }

    init(data) {
        this.level = data.level;
        this.result = data.result;
    }

    create() {
        const W = CFG.CANVAS_W, H = CFG.CANVAS_H;
        this.cameras.main.setBackgroundColor('#0f0c29');

        // Stop any lingering alarm
        window.exodusAudio?.stopAlarm();

        const score = Scoring.compute(this.result);

        // Jingle based on outcome
        if (score.stars > 0) window.exodusAudio?.success();
        else                 window.exodusAudio?.failure();
        const isNewBest = !Storage.getScore(this.level.id) ||
                          score.score > (Storage.getScore(this.level.id)?.score || 0);
        Storage.setScore(this.level.id, {
            score: score.score,
            stars: score.stars,
            evacuated: this.result.evacuated,
            injured: this.result.injured,
            time: this.result.timeLimit - this.result.timeRemaining,
            ts: Date.now(),
        });

        // Stars
        const starY = 100;
        for (let i = 0; i < 3; i++) {
            const filled = i < score.stars;
            this.add.text(W / 2 - 60 + i * 60, starY,
                filled ? '★' : '☆', {
                    fontFamily: 'Arial Black', fontSize: '64px',
                    color: filled ? '#fbbf24' : '#555',
                }).setOrigin(0.5);
        }

        // Title
        const heading = score.stars > 0 ? 'LEVEL CLEARED' : 'LEVEL FAILED';
        this.add.text(W / 2, 200, heading, {
            fontFamily: 'Arial Black', fontSize: '32px',
            color: score.stars > 0 ? '#4ade80' : '#ff6b6b',
        }).setOrigin(0.5);

        if (isNewBest && score.stars > 0) {
            this.add.text(W / 2, 240, 'NEW BEST!', {
                fontFamily: 'Arial Black', fontSize: '18px', color: '#fbbf24',
            }).setOrigin(0.5);
        }

        // Breakdown
        const lines = [
            ['Evacuated',       `${this.result.evacuated}/${this.result.totalAgents}`,  `+${score.breakdown.evac}`],
            ['Injured',         `${this.result.injured}`,                               `${score.breakdown.injured}`],
            ['Time bonus',      `${this.result.timeRemaining.toFixed(1)}s left`,        `+${score.breakdown.time}`],
            ['Budget unspent',  `${this.result.budgetUnspent}/${this.result.budgetTotal}`, `+${score.breakdown.budget}`],
        ];
        const x0 = W / 2 - 180;
        const x1 = W / 2;
        const x2 = W / 2 + 180;
        lines.forEach((row, i) => {
            const y = 290 + i * 28;
            this.add.text(x0, y, row[0], { fontFamily: 'Arial', fontSize: '16px', color: '#bbb' });
            this.add.text(x1, y, row[1], { fontFamily: 'Arial', fontSize: '16px', color: '#fff' });
            this.add.text(x2, y, row[2], { fontFamily: 'Arial Black', fontSize: '16px', color: '#9ad' }).setOrigin(1, 0);
        });

        // Total
        this.add.text(x0, 420, 'FINAL SCORE', { fontFamily: 'Arial Black', fontSize: '20px', color: '#fff' });
        this.add.text(x2, 420, `${score.score}`, { fontFamily: 'Arial Black', fontSize: '36px', color: '#fbbf24' }).setOrigin(1, 0);

        // Buttons
        this._mkBtn(W / 2 - 130, H - 60, 'RETRY', 0x6c5ce7, () =>
            this.scene.start('DesignScene', { level: this.level }));
        this._mkBtn(W / 2 + 130, H - 60, 'MENU', 0x4a4a6a, () =>
            this.scene.start('MenuScene'));
    }

    _mkBtn(x, y, label, color, onClick) {
        const r = this.add.rectangle(x, y, 180, 44, color, 1)
            .setStrokeStyle(2, 0xffffff, 0.3)
            .setInteractive({ useHandCursor: true });
        const t = this.add.text(x, y, label, {
            fontFamily: 'Arial Black', fontSize: '18px', color: '#fff',
        }).setOrigin(0.5);
        r.on('pointerover', () => r.setFillStyle(color, 0.8));
        r.on('pointerout',  () => r.setFillStyle(color, 1));
        r.on('pointerdown', () => { window.exodusAudio?.click(); onClick(); });
        return r;
    }
}
