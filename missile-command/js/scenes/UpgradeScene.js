// ============================================================
// Missile Command — Upgrade Scene (Between-Wave Shop)
// ============================================================

class UpgradeScene extends Phaser.Scene {
    constructor() {
        super({ key: 'UpgradeScene' });
    }

    init(data) {
        this.money = data.money || 0;
        this.wave = data.wave || 1;
        this.score = data.score || 0;
        this.waveEarnings = data.waveEarnings || 0;
        this.difficultyKey = data.difficultyKey || 'NORMAL';
        this.upgradeState = Object.assign({
            explosionLevel: 0,
            missileSpeedLevel: 0,
            ammoLevel: 0,
            fortifyLevel: 0,
            newCityLevel: 0,
        }, data.upgradeState);
        this.cityStates = data.cityStates || [];
        this.baseStates = data.baseStates || [];

        // Track purchases this session
        this.rebuiltCities = [];
        this.repairedBases = [];
    }

    create() {
        this.cameras.main.fadeIn(300, 0, 0, 0);

        const cx = CONFIG.WIDTH / 2;

        // Background
        this.add.graphics()
            .fillStyle(0x0a0a2e, 1)
            .fillRect(0, 0, CONFIG.WIDTH, CONFIG.HEIGHT);

        // Stars
        const starGfx = this.add.graphics();
        for (let i = 0; i < 80; i++) {
            const brightness = Math.random();
            starGfx.fillStyle(0xffffff, brightness * 0.4);
            starGfx.fillCircle(
                Math.random() * CONFIG.WIDTH,
                Math.random() * CONFIG.HEIGHT,
                brightness * 1.2
            );
        }

        // Ground
        this.add.graphics()
            .fillStyle(0x1a472a, 0.5)
            .fillRect(0, CONFIG.GROUND_Y, CONFIG.WIDTH, CONFIG.HEIGHT - CONFIG.GROUND_Y);

        // Title
        this.add.text(cx, 22, 'WAVE ' + this.wave + ' COMPLETE', {
            fontSize: '32px', fontFamily: 'monospace', color: '#44ff44',
            fontStyle: 'bold', stroke: '#000000', strokeThickness: 3,
        }).setOrigin(0.5);

        // Earnings info
        this.add.text(cx, 58, 'Wave earnings: $' + Helpers.formatNumber(this.waveEarnings), {
            fontSize: '13px', fontFamily: 'monospace', color: '#888888',
        }).setOrigin(0.5);

        // Money display
        this.moneyText = this.add.text(cx, 85, '', {
            fontSize: '24px', fontFamily: 'monospace', color: '#ffdd57',
            fontStyle: 'bold', stroke: '#000000', strokeThickness: 2,
        }).setOrigin(0.5);
        this._updateMoneyText();

        // Score display
        this.add.text(cx + 200, 85, 'Score: ' + Helpers.formatNumber(this.score), {
            fontSize: '12px', fontFamily: 'monospace', color: '#666666',
        }).setOrigin(0.5);

        // Create upgrade cards
        this._createUpgradeCards();

        // Continue button
        this.continueBtn = this.add.text(cx, 545, '[ START WAVE ' + (this.wave + 1) + ' ]', {
            fontSize: '24px', fontFamily: 'monospace', color: '#44ff44',
            fontStyle: 'bold', stroke: '#000000', strokeThickness: 2,
            padding: { x: 20, y: 8 },
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });

        this.continueBtn.on('pointerover', () => this.continueBtn.setColor('#88ff88'));
        this.continueBtn.on('pointerout', () => this.continueBtn.setColor('#44ff44'));
        this.continueBtn.on('pointerdown', () => this._continue());

        this.tweens.add({
            targets: this.continueBtn,
            scaleX: 1.03, scaleY: 1.03,
            yoyo: true, repeat: -1, duration: 900,
            ease: 'Sine.easeInOut',
        });
    }

    _updateMoneyText() {
        this.moneyText.setText('$' + Helpers.formatNumber(this.money));
    }

    _createUpgradeCards() {
        const cardW = 230;
        const cardH = 115;
        const gap = 15;
        const startX = (CONFIG.WIDTH - cardW * 3 - gap * 2) / 2;
        const row1Y = 115;
        const row2Y = 245;
        const row3Y = 375;

        this.cards = [];
        this.cardGraphics = this.add.graphics();

        // Row 1: Weapon upgrades
        this._createCard(startX, row1Y, cardW, cardH, 'EXPLOSION_SIZE', 'explosionLevel');
        this._createCard(startX + cardW + gap, row1Y, cardW, cardH, 'MISSILE_SPEED', 'missileSpeedLevel');
        this._createCard(startX + (cardW + gap) * 2, row1Y, cardW, cardH, 'AMMO', 'ammoLevel');

        // Row 2: Defense upgrades
        this._createCard(startX, row2Y, cardW, cardH, 'FORTIFY', 'fortifyLevel');
        this._createCard(startX + cardW + gap, row2Y, cardW, cardH, 'NEW_CITY', 'newCityLevel');

        // Row 2, slot 3: Repair panel
        this._createRepairPanel(startX + (cardW + gap) * 2, row2Y, cardW, cardH);

        // Row 3: Status display
        this._createStatusPanel(startX, row3Y, cardW * 3 + gap * 2, 55);
    }

    _createCard(x, y, w, h, upgradeKey, stateKey) {
        const config = CONFIG.UPGRADE.TYPES[upgradeKey];
        const currentLevel = this.upgradeState[stateKey];
        const maxLevel = config.maxLevel;
        const isMaxed = currentLevel >= maxLevel;
        const cost = isMaxed ? 0 : config.costs[currentLevel];
        const canAfford = !isMaxed && this.money >= cost;

        // Card background
        const card = { x, y, w, h, upgradeKey, stateKey, config, isMaxed };
        this.cards.push(card);

        // Interactive zone
        const zone = this.add.zone(x + w / 2, y + h / 2, w, h)
            .setInteractive({ useHandCursor: canAfford });

        zone.on('pointerdown', () => this._buyUpgrade(upgradeKey, stateKey));

        // Draw the card
        this._drawCard(card);
    }

    _drawCard(card) {
        // This is called initially and after purchases to redraw
        const { x, y, w, h, upgradeKey, stateKey, config } = card;
        const currentLevel = this.upgradeState[stateKey];
        const maxLevel = config.maxLevel;
        const isMaxed = currentLevel >= maxLevel;
        const cost = isMaxed ? 0 : config.costs[currentLevel];
        const canAfford = !isMaxed && this.money >= cost;

        const isWeapon = config.category === 'WEAPONS';
        const accentColor = isWeapon ? '#ff6644' : '#4488ff';
        const accentHex = isWeapon ? 0xff6644 : 0x4488ff;

        // We need to use unique keys for text objects so we can update them
        const key = 'card_' + upgradeKey;

        // Destroy old texts if they exist
        if (this[key + '_texts']) {
            this[key + '_texts'].forEach(t => t.destroy());
        }
        this[key + '_texts'] = [];

        const gfx = this.cardGraphics;

        // Background
        const bgAlpha = canAfford ? 0.25 : 0.12;
        gfx.fillStyle(0x1a1a3e, bgAlpha > 0.2 ? 0.9 : 0.7);
        gfx.fillRoundedRect(x, y, w, h, 6);

        // Left accent
        gfx.fillStyle(accentHex, canAfford ? 0.8 : 0.3);
        gfx.fillRect(x, y + 4, 4, h - 8);

        // Border
        if (canAfford) {
            gfx.lineStyle(1, accentHex, 0.5);
            gfx.strokeRoundedRect(x, y, w, h, 6);
        }

        // Category label
        const catText = this.add.text(x + 14, y + 8, config.category, {
            fontSize: '9px', fontFamily: 'monospace', color: accentColor,
            fontStyle: 'bold',
        });
        this[key + '_texts'] = [catText];

        // Name
        const nameColor = isMaxed ? '#888888' : canAfford ? '#ffffff' : '#666666';
        const nameText = this.add.text(x + 14, y + 22, config.name, {
            fontSize: '16px', fontFamily: 'monospace', color: nameColor,
            fontStyle: 'bold',
        });
        this[key + '_texts'].push(nameText);

        // Description
        const descText = this.add.text(x + 14, y + 42, config.description, {
            fontSize: '11px', fontFamily: 'monospace', color: '#777777',
        });
        this[key + '_texts'].push(descText);

        // Level dots
        const dotY = y + 65;
        for (let i = 0; i < maxLevel; i++) {
            const dx = x + 14 + i * 18;
            const filled = i < currentLevel;
            gfx.fillStyle(filled ? accentHex : 0x333355, filled ? 0.9 : 0.5);
            gfx.fillRoundedRect(dx, dotY, 14, 8, 3);
        }

        const levelLabel = this.add.text(x + 14 + maxLevel * 18 + 6, dotY, currentLevel + '/' + maxLevel, {
            fontSize: '10px', fontFamily: 'monospace',
            color: isMaxed ? '#888888' : '#aaaaaa',
        });
        this[key + '_texts'].push(levelLabel);

        // Cost / status
        if (isMaxed) {
            const maxText = this.add.text(x + w - 14, y + h - 18, 'MAXED', {
                fontSize: '14px', fontFamily: 'monospace', color: '#888855',
                fontStyle: 'bold',
            }).setOrigin(1, 0);
            this[key + '_texts'].push(maxText);
        } else {
            const costColor = canAfford ? '#44ff44' : '#ff4444';
            const costStr = '$' + Helpers.formatNumber(cost);
            const costText = this.add.text(x + w - 14, y + h - 18, costStr, {
                fontSize: '14px', fontFamily: 'monospace', color: costColor,
                fontStyle: 'bold',
            }).setOrigin(1, 0);
            this[key + '_texts'].push(costText);

            if (canAfford) {
                const buyHint = this.add.text(x + 14, y + h - 18, 'Click to buy', {
                    fontSize: '10px', fontFamily: 'monospace', color: '#448844',
                });
                this[key + '_texts'].push(buyHint);
            }
        }
    }

    _createRepairPanel(x, y, w, h) {
        const gfx = this.cardGraphics;

        // Background
        gfx.fillStyle(0x1a1a3e, 0.7);
        gfx.fillRoundedRect(x, y, w, h, 6);

        // Accent
        gfx.fillStyle(0x44aa44, 0.4);
        gfx.fillRect(x, y + 4, 4, h - 8);

        if (!this.repairTexts) this.repairTexts = [];

        const repairLabel = this.add.text(x + 14, y + 8, 'REPAIRS', {
            fontSize: '9px', fontFamily: 'monospace', color: '#44aa44',
            fontStyle: 'bold',
        });
        this.repairTexts.push(repairLabel);

        const destroyedCities = this.cityStates.filter(c => !c.alive).length - this.rebuiltCities.length;
        const destroyedBases = this.baseStates.filter(b => !b.alive).length - this.repairedBases.length;

        if (destroyedCities <= 0 && destroyedBases <= 0) {
            const allGood = this.add.text(x + 14, y + 35, 'All systems\noperational!', {
                fontSize: '13px', fontFamily: 'monospace', color: '#44aa44',
            });
            this.repairTexts.push(allGood);
            return;
        }

        let btnY = y + 26;

        if (destroyedCities > 0) {
            const cost = CONFIG.UPGRADE.CITY_REBUILD_COST;
            const canAfford = this.money >= cost;
            const label = 'Rebuild City (' + destroyedCities + ' destroyed)';
            const costStr = '$' + cost;

            const btn = this.add.text(x + 14, btnY, label, {
                fontSize: '12px', fontFamily: 'monospace',
                color: canAfford ? '#ffffff' : '#666666',
            }).setInteractive({ useHandCursor: canAfford });

            const costText = this.add.text(x + w - 14, btnY, costStr, {
                fontSize: '12px', fontFamily: 'monospace',
                color: canAfford ? '#44ff44' : '#ff4444',
                fontStyle: 'bold',
            }).setOrigin(1, 0);

            btn.on('pointerdown', () => this._buyRebuildCity());

            this.repairTexts.push(btn, costText);
            btnY += 26;
        }

        if (destroyedBases > 0) {
            const cost = CONFIG.UPGRADE.BASE_REPAIR_COST;
            const canAfford = this.money >= cost;
            const label = 'Repair Base (' + destroyedBases + ' destroyed)';
            const costStr = '$' + cost;

            const btn = this.add.text(x + 14, btnY, label, {
                fontSize: '12px', fontFamily: 'monospace',
                color: canAfford ? '#ffffff' : '#666666',
            }).setInteractive({ useHandCursor: canAfford });

            const costText = this.add.text(x + w - 14, btnY, costStr, {
                fontSize: '12px', fontFamily: 'monospace',
                color: canAfford ? '#44ff44' : '#ff4444',
                fontStyle: 'bold',
            }).setOrigin(1, 0);

            btn.on('pointerdown', () => this._buyRepairBase());

            this.repairTexts.push(btn, costText);
        }
    }

    _createStatusPanel(x, y, w, h) {
        const gfx = this.cardGraphics;
        gfx.fillStyle(0x111128, 0.6);
        gfx.fillRoundedRect(x, y, w, h, 4);

        const aliveCities = this.cityStates.filter(c => c.alive).length + this.rebuiltCities.length;
        const totalCities = this.cityStates.length + this.upgradeState.newCityLevel;
        const aliveBases = this.baseStates.filter(b => b.alive).length + this.repairedBases.length;

        const statsStr = [
            'Cities: ' + aliveCities + '/' + totalCities,
            'Bases: ' + aliveBases + '/3',
            'Wave ' + (this.wave + 1) + ' incoming',
        ].join('   |   ');

        this.statusText = this.add.text(x + w / 2, y + h / 2, statsStr, {
            fontSize: '12px', fontFamily: 'monospace', color: '#888888',
        }).setOrigin(0.5);
    }

    _buyUpgrade(upgradeKey, stateKey) {
        const config = CONFIG.UPGRADE.TYPES[upgradeKey];
        const currentLevel = this.upgradeState[stateKey];
        if (currentLevel >= config.maxLevel) return;

        const cost = config.costs[currentLevel];
        if (this.money < cost) {
            this._flashError();
            return;
        }

        this.money -= cost;
        this.upgradeState[stateKey]++;
        this._updateMoneyText();
        audioManager.playUpgradeBuy();

        // Redraw all cards (lazy but simple)
        this._redrawAllCards();
    }

    _buyRebuildCity() {
        const cost = CONFIG.UPGRADE.CITY_REBUILD_COST;
        if (this.money < cost) {
            this._flashError();
            return;
        }

        // Find first destroyed city not yet rebuilt
        for (let i = 0; i < this.cityStates.length; i++) {
            if (!this.cityStates[i].alive && !this.rebuiltCities.includes(i)) {
                this.money -= cost;
                this.rebuiltCities.push(i);
                this._updateMoneyText();
                audioManager.playUpgradeBuy();
                this._redrawAllCards();
                return;
            }
        }
    }

    _buyRepairBase() {
        const cost = CONFIG.UPGRADE.BASE_REPAIR_COST;
        if (this.money < cost) {
            this._flashError();
            return;
        }

        for (let i = 0; i < this.baseStates.length; i++) {
            if (!this.baseStates[i].alive && !this.repairedBases.includes(i)) {
                this.money -= cost;
                this.repairedBases.push(i);
                this._updateMoneyText();
                audioManager.playUpgradeBuy();
                this._redrawAllCards();
                return;
            }
        }
    }

    _flashError() {
        audioManager.playMenuSelect();
        this.cameras.main.flash(200, 80, 0, 0);
    }

    _redrawAllCards() {
        // Clear and redraw all card graphics
        this.cardGraphics.clear();

        for (const card of this.cards) {
            this._drawCard(card);
        }

        // Redraw repair panel
        this.repairTexts.forEach(t => t.destroy());
        this.repairTexts = [];
        const cardW = 230;
        const gap = 15;
        const startX = (CONFIG.WIDTH - cardW * 3 - gap * 2) / 2;
        this._createRepairPanel(startX + (cardW + gap) * 2, 245, cardW, 115);

        // Redraw status panel background
        const statusX = startX;
        const statusW = cardW * 3 + gap * 2;
        this.cardGraphics.fillStyle(0x111128, 0.6);
        this.cardGraphics.fillRoundedRect(statusX, 375, statusW, 55, 4);

        // Update status text
        this._updateStatus();
    }

    _updateStatus() {
        if (!this.statusText) return;
        const aliveCities = this.cityStates.filter(c => c.alive).length + this.rebuiltCities.length;
        const totalCities = this.cityStates.length + this.upgradeState.newCityLevel;
        const aliveBases = this.baseStates.filter(b => b.alive).length + this.repairedBases.length;

        const statsStr = [
            'Cities: ' + aliveCities + '/' + totalCities,
            'Bases: ' + aliveBases + '/3',
            'Wave ' + (this.wave + 1) + ' incoming',
        ].join('   |   ');
        this.statusText.setText(statsStr);
    }

    _continue() {
        audioManager.playMenuSelect();

        const gameScene = this.scene.get('GameScene');
        gameScene.applyUpgradeResults({
            money: this.money,
            upgradeState: this.upgradeState,
            rebuiltCities: this.rebuiltCities,
            repairedBases: this.repairedBases,
        });

        this.cameras.main.fadeOut(300, 0, 0, 0);
        this.time.delayedCall(300, () => {
            this.scene.stop();
            this.scene.resume('GameScene');
        });
    }
}
