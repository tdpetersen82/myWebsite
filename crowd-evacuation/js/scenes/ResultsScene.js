// ResultsScene: shows score breakdown and offers retry / menu.

class ResultsScene extends Phaser.Scene {
    constructor() { super('ResultsScene'); }

    init(data) {
        this.level = data.level;
        this.result = data.result;
        this.placementsUsed = data.placementsUsed || null;
        this.isDaily = !!data.isDaily;
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

        // Record daily attempt if this was the daily challenge
        if (this.isDaily && !DailyChallenge.alreadyPlayed()) {
            DailyChallenge.recordAttempt(
                { ...this.result, levelId: this.level.id },
                score
            );
        }

        // Check achievements; if any newly unlocked, show toasts staggered.
        const newly = Achievements.checkAfterLevel({
            level: this.level,
            result: this.result,
            score,
            placementsUsed: this.placementsUsed,
        });
        newly.forEach((ach, i) => {
            this.time.delayedCall(800 + i * 700, () => Achievements.spawnToast(this, ach, i));
        });
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

        // Stars — drop-in with bounce, staggered, with a chime per star earned
        const starY = 110;
        for (let i = 0; i < 3; i++) {
            const filled = i < score.stars;
            const star = this.add.text(W / 2 - 60 + i * 60, starY,
                filled ? '★' : '☆', {
                    fontFamily: '"Bungee","Arial Black",Arial', fontSize: '64px',
                    color: filled ? '#fbbf24' : '#3a3a4a',
                    stroke: '#000', strokeThickness: 3,
                }).setOrigin(0.5);
            Juice.drop(this, star, -100, 700, i * 250);
            if (filled) {
                this.time.delayedCall(i * 250 + 600, () => window.exodusAudio?.click?.());
            }
        }

        // Title
        const heading = score.stars > 0 ? 'LEVEL CLEARED' : 'LEVEL FAILED';
        const headingTxt = this.add.text(W / 2, 210, heading, {
            fontFamily: '"Bungee","Arial Black",Arial', fontSize: '34px',
            color: score.stars > 0 ? '#4ade80' : '#ff6b6b',
            stroke: '#000', strokeThickness: 4,
        }).setOrigin(0.5);
        Juice.popIn(this, headingTxt, 500);

        if (isNewBest && score.stars > 0) {
            const nb = this.add.text(W / 2, 254, 'NEW BEST!', {
                fontFamily: '"Bungee","Arial Black",Arial', fontSize: '17px', color: '#fbbf24',
            }).setOrigin(0.5);
            Juice.slideIn(this, nb, 12, 500);
            Juice.pulse(this, nb, 1.06, 1400);
        }

        // Breakdown rows — fade in sequentially
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
            const y = 296 + i * 28;
            const a = this.add.text(x0, y, row[0], { fontFamily: '"Inter",Arial', fontSize: '14px', color: '#a1a1aa' });
            const b = this.add.text(x1, y, row[1], { fontFamily: '"Inter",Arial', fontSize: '14px', color: '#fff' });
            const c = this.add.text(x2, y, row[2], { fontFamily: '"Bungee","Arial Black",Arial', fontSize: '14px', color: '#9ad' }).setOrigin(1, 0);
            [a, b, c].forEach(o => { o.alpha = 0; });
            const delay = 200 + i * 180;
            this.tweens.add({ targets: [a, b, c], alpha: 1, duration: 250, delay });
        });

        // Total — count up
        this.add.text(x0, 432, 'FINAL SCORE', {
            fontFamily: '"Bungee","Arial Black",Arial', fontSize: '20px', color: '#fff',
        });
        const totalText = this.add.text(x2, 432, '0', {
            fontFamily: '"Bungee","Arial Black",Arial', fontSize: '36px', color: '#fbbf24',
        }).setOrigin(1, 0);
        this.time.delayedCall(950, () => Juice.countUp(this, totalText, 0, score.score, 800));

        // Buttons
        const btnRetry = this._mkBtn(W / 2 - 130, H - 60, 'RETRY', 0x6c5ce7, () =>
            this.scene.start('DesignScene', { level: this.level }));
        const btnMenu = this._mkBtn(W / 2 + 130, H - 60, 'MENU', 0x4a4a6a, () =>
            this.scene.start('MenuScene'));
        Juice.slideIn(this, btnRetry, 30, 600);
        Juice.slideIn(this, btnMenu, 30, 600);
    }

    _mkBtn(x, y, label, color, onClick) {
        const r = this.add.rectangle(x, y, 200, 48, color, 1)
            .setStrokeStyle(2, 0xffffff, 0.3);
        const t = this.add.text(x, y, label, {
            fontFamily: '"Bungee","Arial Black",Arial', fontSize: '18px', color: '#fff',
        }).setOrigin(0.5);
        Juice.makeButton(this, r);
        r.on('pointerover', () => r.setFillStyle(color, 0.85));
        r.on('pointerout',  () => r.setFillStyle(color, 1));
        r.on('pointerdown', onClick);
        return r;
    }
}
