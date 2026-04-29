// MenuScene: title + level-select grid. Reads stars from Storage.

class MenuScene extends Phaser.Scene {
    constructor() { super('MenuScene'); }

    preload() {
        // Generate every game texture once, on first scene boot.
        SpriteFactory.generate(this);
    }

    create() {
        const W = CFG.CANVAS_W, H = CFG.CANVAS_H;
        this.cameras.main.setBackgroundColor('#0f0c29');

        // Make sure no leftover alarm loop is playing
        window.exodusAudio?.stopAll();
        // Music: low-intensity ambient on the menu
        window.exodusMusic?.start();
        window.exodusMusic?.setIntensity(0.15);

        // Title — Bungee display font
        const title = this.add.text(W / 2, 60, 'EXODUS', {
            fontFamily: '"Bungee", "Arial Black", Arial', fontSize: '54px', color: '#fff',
            stroke: '#1a1a2e', strokeThickness: 5,
        }).setOrigin(0.5);
        Juice.bob(this, title, 2, 3500);
        const sub = this.add.text(W / 2, 110, 'WHEN THE ALARM SOUNDS, YOUR DESIGN IS EVERYONE\'S ONLY HOPE.', {
            fontFamily: '"Inter", Arial', fontSize: '11px', color: '#a1a1aa',
            letterSpacing: 1,
        }).setOrigin(0.5);
        Juice.slideIn(this, sub, 10, 600);

        // Settings gear (top right)
        const gear = this.add.text(W - 24, 24, '⚙', {
            fontFamily: 'Arial', fontSize: '22px', color: '#aaa',
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });
        gear.on('pointerover', () => gear.setColor('#fff'));
        gear.on('pointerout',  () => gear.setColor('#aaa'));
        gear.on('pointerdown', () => {
            window.exodusAudio?.click();
            this._settings = this._settings || new SettingsModal(this);
            this._settings.show();
        });

        // Best score + achievements summary
        const best = Storage.getBest();
        const unlocked = Achievements.totalUnlocked();
        const total = Achievements.ACHIEVEMENTS.length;
        this.add.text(W / 2, 134, `BEST SCORE ${best}   ·   🏆 ${unlocked} / ${total}`, {
            fontFamily: '"Inter", Arial', fontSize: '12px', color: '#a78bfa',
            fontStyle: 'bold', letterSpacing: 1,
        }).setOrigin(0.5);

        // Achievements link
        const achLink = this.add.text(W - 24, 56, '🏆', {
            fontFamily: 'Arial', fontSize: '20px', color: '#fbbf24',
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });
        achLink.on('pointerover', () => achLink.setScale(1.15));
        achLink.on('pointerout',  () => achLink.setScale(1.0));
        achLink.on('pointerdown', () => { window.exodusAudio?.click(); this._showAchievements(); });

        // Daily challenge card
        this._drawDailyCard();

        // Level select grid — one card per registered level
        // With 5 levels it doesn't fit in one row; arrange in two rows.
        const perRow = 3;
        const cardW = 180, cardH = 130;
        const gapX = 18, gapY = 14;
        const totalLevels = LEVELS.length;
        const baseY = 360;
        LEVELS.forEach((level, i) => {
            const row = Math.floor(i / perRow);
            const col = i % perRow;
            const inRow = Math.min(perRow, totalLevels - row * perRow);
            const rowW = inRow * cardW + (inRow - 1) * gapX;
            const startX = (W - rowW) / 2 + cardW / 2;
            const cx = startX + col * (cardW + gapX);
            const cy = baseY + row * (cardH + gapY);
            this._drawLevelCard(cx, cy, cardW, cardH, level, i);
        });

        // Footer hint (suppressed when too many levels would push it off-screen)
        // Intentionally none here — keeps layout calm.
    }

    _drawDailyCard() {
        const W = CFG.CANVAS_W;
        const cy = 220;
        const level = DailyChallenge.pickLevel();
        if (!level) return;
        const attempt = DailyChallenge.getAttempt();

        const cardW = 360, cardH = 90;
        const r = this.add.rectangle(W / 2, cy, cardW, cardH, 0x2d1b4e, 1)
            .setStrokeStyle(2, 0xfbbf24)
            .setInteractive({ useHandCursor: true });
        this.add.text(W / 2 - cardW / 2 + 14, cy - 30, '⚡ DAILY CHALLENGE', {
            fontFamily: 'Arial Black', fontSize: '12px', color: '#fbbf24',
        });
        this.add.text(W / 2 - cardW / 2 + 14, cy - 12, `${DailyChallenge.todayKey()}  ·  ${level.displayName}`, {
            fontFamily: 'Arial', fontSize: '13px', color: '#fff',
        });
        if (attempt) {
            const stars = '★★★'.substring(0, attempt.stars) + '☆☆☆'.substring(0, 3 - attempt.stars);
            this.add.text(W / 2 - cardW / 2 + 14, cy + 8, `Already played — score ${attempt.score}  ${stars}`, {
                fontFamily: 'Arial', fontSize: '12px', color: '#aaa',
            });
            this.add.text(W / 2 + cardW / 2 - 14, cy + 22, 'come back tomorrow', {
                fontFamily: 'Arial', fontSize: '11px', color: '#888',
            }).setOrigin(1, 0);
        } else {
            this.add.text(W / 2 - cardW / 2 + 14, cy + 8, 'One attempt per day. No retries.', {
                fontFamily: 'Arial', fontSize: '12px', color: '#aaa',
            });
            const btn = this.add.rectangle(W / 2 + cardW / 2 - 50, cy + 22, 80, 22, 0xfbbf24, 1)
                .setStrokeStyle(2, 0x92400e)
                .setInteractive({ useHandCursor: true });
            this.add.text(W / 2 + cardW / 2 - 50, cy + 22, 'PLAY', {
                fontFamily: 'Arial Black', fontSize: '11px', color: '#451a03',
            }).setOrigin(0.5);
            const onClick = () => {
                window.exodusAudio?.click();
                this.scene.start('DesignScene', { level, isDaily: true });
            };
            r.on('pointerdown', onClick);
            btn.on('pointerdown', onClick);
        }
    }

    _showAchievements() {
        const W = CFG.CANVAS_W, H = CFG.CANVAS_H;
        const overlay = this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.78)
            .setDepth(70).setInteractive();
        const panel = this.add.rectangle(W / 2, H / 2, 540, 460, 0x1a1a3a, 1)
            .setStrokeStyle(2, 0xfbbf24).setDepth(71);
        const title = this.add.text(W / 2, H / 2 - 200, 'Achievements', {
            fontFamily: 'Arial Black', fontSize: '22px', color: '#fbbf24',
        }).setOrigin(0.5).setDepth(72);

        const elements = [overlay, panel, title];
        const unlocked = Storage.getAchievements();
        const totalUnlocked = Object.keys(unlocked).length;
        const totalCount = Achievements.ACHIEVEMENTS.length;
        const sub = this.add.text(W / 2, H / 2 - 170, `${totalUnlocked} / ${totalCount} unlocked`, {
            fontFamily: 'Arial', fontSize: '12px', color: '#aaa',
        }).setOrigin(0.5).setDepth(72);
        elements.push(sub);

        Achievements.ACHIEVEMENTS.forEach((a, i) => {
            const isOn = !!unlocked[a.id];
            const y = H / 2 - 130 + i * 36;
            const ico = this.add.text(W / 2 - 230, y, isOn ? '🏆' : '🔒', {
                fontFamily: 'Arial', fontSize: '18px', color: isOn ? '#fbbf24' : '#444',
            }).setDepth(72);
            const nm = this.add.text(W / 2 - 200, y - 6, a.title, {
                fontFamily: 'Arial Black', fontSize: '13px',
                color: isOn ? '#fff' : '#777',
            }).setDepth(72);
            const ds = this.add.text(W / 2 - 200, y + 9, a.desc, {
                fontFamily: 'Arial', fontSize: '11px',
                color: isOn ? '#aaa' : '#555',
            }).setDepth(72);
            elements.push(ico, nm, ds);
        });

        // Close button
        const close = this.add.rectangle(W / 2, H / 2 + 200, 140, 32, 0x4ade80, 1)
            .setStrokeStyle(2, 0x166534)
            .setInteractive({ useHandCursor: true })
            .setDepth(72);
        const closeText = this.add.text(W / 2, H / 2 + 200, 'CLOSE', {
            fontFamily: 'Arial Black', fontSize: '13px', color: '#0a3d20',
        }).setOrigin(0.5).setDepth(73);
        const dismiss = () => {
            window.exodusAudio?.click();
            for (const e of elements) e.destroy();
            close.destroy(); closeText.destroy();
        };
        close.on('pointerdown', dismiss);
        overlay.on('pointerdown', dismiss);
    }

    _drawLevelCard(cx, cy, w, h, level, index) {
        const card = this.add.rectangle(cx, cy, w, h, 0x1a1a3a, 1)
            .setStrokeStyle(2, 0x6c5ce7)
            .setInteractive({ useHandCursor: true });
        Juice.slideIn(this, card, 24, 480 + index * 60);

        // index pill
        this.add.text(cx - w / 2 + 12, cy - h / 2 + 10, `${index + 1}`, {
            fontFamily: '"Bungee","Arial Black",Arial', fontSize: '11px', color: '#a78bfa',
            backgroundColor: '#0f0c29', padding: { x: 6, y: 2 },
        }).setDepth(2);

        // title
        this.add.text(cx, cy - 40, level.displayName, {
            fontFamily: '"Bungee","Arial Black",Arial', fontSize: '15px', color: '#fff',
            wordWrap: { width: w - 20 }, align: 'center',
        }).setOrigin(0.5);

        // summary line
        const summary = `${level.spawn.count} ppl · ${this._exitDescription(level)}`;
        this.add.text(cx, cy - 12, summary, {
            fontFamily: '"Inter",Arial', fontSize: '11px', color: '#a1a1aa',
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
            fontFamily: '"Bungee","Arial Black",Arial', fontSize: '20px',
            color: stars > 0 ? '#fbbf24' : '#3a3a4a',
        }).setOrigin(0.5);

        // play button
        const btn = this.add.rectangle(cx, cy + 56, 100, 28, 0x4ade80, 1)
            .setStrokeStyle(2, 0x166534);
        const btnText = this.add.text(cx, cy + 56, 'PLAY', {
            fontFamily: '"Bungee","Arial Black",Arial', fontSize: '13px', color: '#0a3d20',
        }).setOrigin(0.5);
        const onPlay = () => {
            window.exodusAudio?.click();
            this.scene.start('DesignScene', { level });
        };
        Juice.makeButton(this, btn);
        btn.on('pointerover', () => btn.setFillStyle(0x86efac));
        btn.on('pointerout',  () => btn.setFillStyle(0x4ade80));
        btn.on('pointerdown', onPlay);
        card.on('pointerdown', onPlay);
        card.on('pointerover', () => {
            card.setStrokeStyle(2, 0xa78bfa);
            this.tweens.add({ targets: card, scaleX: 1.04, scaleY: 1.04, duration: 140, ease: 'Quad.easeOut' });
        });
        card.on('pointerout',  () => {
            card.setStrokeStyle(2, 0x6c5ce7);
            this.tweens.add({ targets: card, scaleX: 1, scaleY: 1, duration: 140, ease: 'Quad.easeOut' });
        });
    }

    _exitDescription(level) {
        // Count exit cells
        let n = 0;
        for (const row of level.tiles) for (const ch of row) if (ch === 'E') n++;
        return `${(n * CFG.CELL_M).toFixed(1)}m exit`;
    }
}
