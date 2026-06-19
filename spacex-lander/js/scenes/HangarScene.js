// SpaceX Lander - Hangar Scene (title + roguelite upgrade shop)
// The home between runs. PLAY launches a run instantly; credits buy upgrades.

class HangarScene extends Phaser.Scene {
    constructor() {
        super({ key: 'HangarScene' });
    }

    create() {
        const w = CONFIG.WIDTH;
        const h = CONFIG.HEIGHT;
        this.mono = 'JetBrains Mono, Courier New, monospace';
        this.sans = 'Inter, Arial, Helvetica, sans-serif';

        this._drawBackground();

        // --- TITLE ---
        this.add.text(w / 2, 30, 'SPACEX LANDER', {
            fontSize: '34px', fontFamily: this.sans, color: '#ffffff', fontStyle: 'bold', letterSpacing: 6
        }).setOrigin(0.5);
        this.add.text(w / 2, 58, 'BOOSTER RECOVERY — ENDLESS', {
            fontSize: '11px', fontFamily: this.sans, color: '#5b7088', letterSpacing: 4
        }).setOrigin(0.5);

        // --- BEST STATS STRIP ---
        const best = parseInt(localStorage.getItem(CONFIG.HIGH_SCORE_KEY) || '0', 10);
        const bestChain = parseFloat(localStorage.getItem(CONFIG.BEST_CHAIN_KEY) || '1');
        const bestLandings = parseInt(localStorage.getItem(CONFIG.BEST_LANDINGS_KEY) || '0', 10);
        this._statChip(w / 2 - 200, 86, 'BEST RUN', `${best}`);
        this._statChip(w / 2 - 66, 86, 'BEST CHAIN', `x${bestChain.toFixed(1)}`);
        this._statChip(w / 2 + 66, 86, 'LANDINGS', `${bestLandings}`);

        // --- CREDIT BALANCE ---
        this.creditText = this.add.text(w / 2 + 200, 86 + 10, '', {
            fontSize: '20px', fontFamily: this.mono, color: CONFIG.COLORS.CREDIT, fontStyle: 'bold'
        }).setOrigin(0.5);
        this.creditLabel = this.add.text(w / 2 + 200, 86 - 8, 'CREDITS', {
            fontSize: '9px', fontFamily: this.sans, color: '#5b7088', letterSpacing: 2
        }).setOrigin(0.5);

        // --- UPGRADE SHOP ---
        this.add.text(40, 134, 'HANGAR — UPGRADES', {
            fontSize: '12px', fontFamily: this.mono, color: '#0088ff', letterSpacing: 3
        }).setOrigin(0, 0.5);
        this.add.text(w - 40, 134, 'every upgrade is felt in flight', {
            fontSize: '10px', fontFamily: this.sans, color: '#556677'
        }).setOrigin(1, 0.5);

        this.rows = [];
        const rowH = 62, top = 152;
        CONFIG.UPGRADES.forEach((def, i) => {
            this.rows.push(this._buildRow(def, 40, top + i * rowH, w - 80, rowH - 8));
        });

        // --- PLAY BUTTON ---
        const btnW = 280, btnH = 46, btnX = w / 2 - btnW / 2, btnY = h - 58;
        this.playG = this.add.graphics();
        this._drawPlayButton(btnX, btnY, btnW, btnH, false);
        this.add.text(w / 2, btnY + btnH / 2, '▲  LAUNCH', {
            fontSize: '17px', fontFamily: this.sans, color: '#ffffff', fontStyle: 'bold', letterSpacing: 3
        }).setOrigin(0.5);
        const playZone = this.add.zone(w / 2, btnY + btnH / 2, btnW, btnH).setInteractive({ useHandCursor: true });
        playZone.on('pointerover', () => this._drawPlayButton(btnX, btnY, btnW, btnH, true));
        playZone.on('pointerout', () => this._drawPlayButton(btnX, btnY, btnW, btnH, false));
        playZone.on('pointerdown', () => this._play());
        this.tweens.add({ targets: this.playG, alpha: { from: 1, to: 0.82 }, duration: 1100, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

        this.add.text(w / 2, h - 8, '↑ thrust   ←→ steer   •   land soft, dead-center, upright', {
            fontSize: '10px', fontFamily: this.mono, color: '#445566'
        }).setOrigin(0.5, 1);

        // Keyboard
        this.input.keyboard.on('keydown-ENTER', () => this._play());
        this.input.keyboard.on('keydown-SPACE', () => this._play());

        this._refresh();
    }

    _statChip(cx, y, label, value) {
        this.add.text(cx, y - 8, label, {
            fontSize: '9px', fontFamily: this.sans, color: '#5b7088', letterSpacing: 2
        }).setOrigin(0.5);
        this.add.text(cx, y + 10, value, {
            fontSize: '18px', fontFamily: this.mono, color: '#ffffff', fontStyle: 'bold'
        }).setOrigin(0.5);
    }

    _buildRow(def, x, y, rw, rh) {
        const g = this.add.graphics();
        const row = { def, g, x, y, rw, rh };

        // Name + effect
        row.name = this.add.text(x + 14, y + 12, def.name, {
            fontSize: '15px', fontFamily: this.sans, color: '#ffffff', fontStyle: 'bold'
        });
        row.blurb = this.add.text(x + 14, y + 32, def.blurb, {
            fontSize: '10.5px', fontFamily: this.sans, color: '#8899aa'
        });

        // Level pips
        row.pips = this.add.graphics();

        // Buy button (right side)
        const bw = 118, bh = 34;
        row.bx = x + rw - bw - 12;
        row.by = y + (rh - bh) / 2;
        row.bw = bw; row.bh = bh;
        row.buyG = this.add.graphics();
        row.buyText = this.add.text(row.bx + bw / 2, row.by + bh / 2, '', {
            fontSize: '13px', fontFamily: this.mono, color: '#ffffff', fontStyle: 'bold'
        }).setOrigin(0.5);

        row.zone = this.add.zone(row.bx + bw / 2, row.by + bh / 2, bw, bh).setInteractive({ useHandCursor: true });
        row.zone.on('pointerover', () => { row.hover = true; this._renderRow(row); });
        row.zone.on('pointerout', () => { row.hover = false; this._renderRow(row); });
        row.zone.on('pointerdown', () => this._buy(row));

        return row;
    }

    _renderRow(row) {
        const def = row.def;
        const lvl = CONFIG.getUpgradeLevel(def.key);
        const cost = CONFIG.nextUpgradeCost(def);
        const credits = CONFIG.getCredits();
        const maxed = cost === null;
        const affordable = !maxed && credits >= cost;

        // Row panel
        row.g.clear();
        row.g.fillStyle(0xffffff, 0.03);
        row.g.fillRoundedRect(row.x, row.y, row.rw, row.rh, 5);
        row.g.lineStyle(1, maxed ? 0x44ffcc : 0xffffff, maxed ? 0.18 : 0.06);
        row.g.strokeRoundedRect(row.x, row.y, row.rw, row.rh, 5);

        // Pips (level / max) — placed left of the buy button
        row.pips.clear();
        const pipR = 4, gap = 13;
        const pipStartX = row.bx - def.max * gap - 14;
        const pipY = row.y + row.rh / 2;
        for (let i = 0; i < def.max; i++) {
            const cx = pipStartX + i * gap;
            if (i < lvl) {
                row.pips.fillStyle(0x44ffcc, 0.95);
                row.pips.fillCircle(cx, pipY, pipR);
            } else {
                row.pips.lineStyle(1, 0x6688aa, 0.6);
                row.pips.strokeCircle(cx, pipY, pipR);
            }
        }

        // Buy button
        let label, fill, alpha, textColor;
        if (maxed) {
            label = 'MAXED'; fill = 0x143028; alpha = 1; textColor = '#44ffcc';
        } else if (affordable) {
            label = `${cost} ⚡`; fill = row.hover ? 0x1a8a4a : 0x14743c; alpha = 1; textColor = '#ffffff';
        } else {
            label = `${cost} ⚡`; fill = 0x202632; alpha = 1; textColor = '#5b6b7a';
        }
        row.buyG.clear();
        row.buyG.fillStyle(fill, alpha);
        row.buyG.fillRoundedRect(row.bx, row.by, row.bw, row.bh, 4);
        if (affordable && !maxed) {
            row.buyG.lineStyle(1, 0x44ff99, 0.5);
            row.buyG.strokeRoundedRect(row.bx, row.by, row.bw, row.bh, 4);
        }
        row.buyText.setText(label).setColor(textColor);
    }

    _buy(row) {
        const def = row.def;
        const cost = CONFIG.nextUpgradeCost(def);
        if (cost === null) return;
        const credits = CONFIG.getCredits();
        if (credits < cost) {
            if (window.audioManager) window.audioManager.playBeep(180, 0.12);
            this._flashInsufficient();
            return;
        }
        CONFIG.setCredits(credits - cost);
        CONFIG.setUpgradeLevel(def.key, CONFIG.getUpgradeLevel(def.key) + 1);
        if (window.audioManager) {
            window.audioManager.playBeep(880, 0.08);
            window.audioManager.playBeep(1320, 0.1);
        }
        this._refresh();
        // little pop on the row name
        this.tweens.add({ targets: row.name, scaleX: 1.08, scaleY: 1.08, duration: 120, yoyo: true });
    }

    _flashInsufficient() {
        this.tweens.add({ targets: this.creditText, scaleX: 1.3, scaleY: 1.3, duration: 100, yoyo: true });
        this.creditText.setColor('#ff5555');
        this.time.delayedCall(250, () => this.creditText.setColor(CONFIG.COLORS.CREDIT));
    }

    _refresh() {
        this.creditText.setText(`${CONFIG.getCredits()} ⚡`);
        this.rows.forEach(r => this._renderRow(r));
    }

    _drawPlayButton(x, y, w, h, hover) {
        this.playG.clear();
        this.playG.fillStyle(hover ? 0x1177ff : CONFIG.COLORS.ACCENT, 1);
        this.playG.fillRoundedRect(x, y, w, h, 6);
        this.playG.fillStyle(0xffffff, hover ? 0.14 : 0.08);
        this.playG.fillRoundedRect(x, y, w, h / 2, { tl: 6, tr: 6, bl: 0, br: 0 });
    }

    _play() {
        if (window.audioManager) { window.audioManager.init(); window.audioManager.playBeep(660, 0.12); }
        this.scene.start('RunScene');
    }

    _drawBackground() {
        const w = CONFIG.WIDTH, h = CONFIG.HEIGHT;
        const bg = this.add.graphics();
        for (let i = 0; i < h; i++) {
            const t = i / h;
            bg.fillStyle(Phaser.Display.Color.GetColor(8 + t * 4, 10 + t * 5, 14 + t * 8), 1);
            bg.fillRect(0, i, w, 1);
        }
        const grid = this.add.graphics();
        grid.lineStyle(1, 0xffffff, 0.02);
        for (let x = 0; x < w; x += 40) { grid.beginPath(); grid.moveTo(x, 0); grid.lineTo(x, h); grid.strokePath(); }
        for (let y = 0; y < h; y += 40) { grid.beginPath(); grid.moveTo(0, y); grid.lineTo(w, y); grid.strokePath(); }
        const accent = this.add.graphics();
        accent.fillStyle(CONFIG.COLORS.ACCENT, 0.6);
        accent.fillRect(0, 0, w, 2);
    }
}
