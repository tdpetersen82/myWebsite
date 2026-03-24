// ============================================================
// Missile Command — Upgrade Scene (Between-Wave Shop)
// Tab-based layout with COMMAND / WEAPONS / DEFENSE / REPAIRS
// ============================================================

class UpgradeScene extends Phaser.Scene {
    constructor() {
        super({ key: 'UpgradeScene' });
    }

    // --------------------------------------------------------
    // Data flow
    // --------------------------------------------------------
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
            trackingLevel: 0,
            pointDefenseLevel: 0,
            shieldLevel: 0,
            leftBaseUnlocked: 0,
            rightBaseUnlocked: 0,
        }, data.upgradeState);
        this.cityStates = data.cityStates || [];
        this.baseStates = data.baseStates || [];

        // Track purchases this session
        this.rebuiltCities = [];
        this.repairedBases = [];

        // Tab state
        this.activeTab = 'WEAPONS';
    }

    // --------------------------------------------------------
    // Upgrade-key → state-key mapping
    // --------------------------------------------------------
    static get STATE_KEYS() {
        return {
            UNLOCK_LEFT_BASE: 'leftBaseUnlocked',
            UNLOCK_RIGHT_BASE: 'rightBaseUnlocked',
            EXPLOSION_SIZE: 'explosionLevel',
            MISSILE_SPEED: 'missileSpeedLevel',
            AMMO: 'ammoLevel',
            TRACKING: 'trackingLevel',
            FORTIFY: 'fortifyLevel',
            NEW_CITY: 'newCityLevel',
            POINT_DEFENSE: 'pointDefenseLevel',
            SHIELD: 'shieldLevel',
        };
    }

    // Category definitions (order matters for tab rendering)
    static get CATEGORIES() {
        return [
            { key: 'COMMAND',  label: 'COMMAND',  accent: '#ffcc44', accentHex: 0xffcc44 },
            { key: 'WEAPONS',  label: 'WEAPONS',  accent: '#ff6644', accentHex: 0xff6644 },
            { key: 'DEFENSE',  label: 'DEFENSE',  accent: '#4488ff', accentHex: 0x4488ff },
            { key: 'REPAIRS',  label: 'REPAIRS',  accent: '#44aa44', accentHex: 0x44aa44 },
        ];
    }

    // --------------------------------------------------------
    // Create
    // --------------------------------------------------------
    create() {
        this.cameras.main.fadeIn(300, 0, 0, 0);

        const cx = CONFIG.WIDTH / 2;

        // ---------- background ----------
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

        // ---------- header ----------
        this.add.text(cx, 18, 'WAVE ' + this.wave + ' COMPLETE', {
            fontSize: '28px', fontFamily: 'monospace', color: '#44ff44',
            fontStyle: 'bold', stroke: '#000000', strokeThickness: 3,
        }).setOrigin(0.5);

        this.add.text(cx, 48, 'Wave earnings: $' + Helpers.formatNumber(this.waveEarnings), {
            fontSize: '12px', fontFamily: 'monospace', color: '#888888',
        }).setOrigin(0.5);

        // Money display
        this.moneyText = this.add.text(cx, 72, '', {
            fontSize: '22px', fontFamily: 'monospace', color: '#ffdd57',
            fontStyle: 'bold', stroke: '#000000', strokeThickness: 2,
        }).setOrigin(0.5);
        this._updateMoneyText();

        // Score (right-aligned)
        this.add.text(CONFIG.WIDTH - 15, 72, 'Score: ' + Helpers.formatNumber(this.score), {
            fontSize: '11px', fontFamily: 'monospace', color: '#666666',
        }).setOrigin(1, 0.5);

        // ---------- tabs ----------
        this.tabObjects = [];
        this._createTabs();

        // ---------- content area ----------
        // Graphics layer for cards / repair items
        this.contentGfx = this.add.graphics();
        this.contentObjects = [];
        this._renderActiveTab();

        // ---------- status bar ----------
        this._createStatusBar();

        // ---------- continue button ----------
        this.continueBtn = this.add.text(cx, 558, '[ START WAVE ' + (this.wave + 1) + ' ]', {
            fontSize: '22px', fontFamily: 'monospace', color: '#44ff44',
            fontStyle: 'bold', stroke: '#000000', strokeThickness: 2,
            padding: { x: 20, y: 6 },
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

    // --------------------------------------------------------
    // Money display
    // --------------------------------------------------------
    _updateMoneyText() {
        this.moneyText.setText('$' + Helpers.formatNumber(this.money));
    }

    // --------------------------------------------------------
    // Tab bar
    // --------------------------------------------------------
    _createTabs() {
        // Clear old tab objects
        this.tabObjects.forEach(o => o.destroy());
        this.tabObjects = [];

        const cats = UpgradeScene.CATEGORIES;
        const tabW = 160;
        const tabH = 28;
        const gap = 8;
        const totalW = cats.length * tabW + (cats.length - 1) * gap;
        const startX = (CONFIG.WIDTH - totalW) / 2;
        const tabY = 96;

        const gfx = this.add.graphics();
        this.tabObjects.push(gfx);

        cats.forEach((cat, i) => {
            const tx = startX + i * (tabW + gap);
            const isActive = cat.key === this.activeTab;

            // Tab background
            if (isActive) {
                gfx.fillStyle(cat.accentHex, 0.25);
                gfx.fillRoundedRect(tx, tabY, tabW, tabH, { tl: 5, tr: 5, bl: 0, br: 0 });
                gfx.lineStyle(2, cat.accentHex, 0.8);
                gfx.strokeRoundedRect(tx, tabY, tabW, tabH, { tl: 5, tr: 5, bl: 0, br: 0 });
            } else {
                gfx.fillStyle(0x111128, 0.6);
                gfx.fillRoundedRect(tx, tabY, tabW, tabH, { tl: 5, tr: 5, bl: 0, br: 0 });
                gfx.lineStyle(1, 0x333355, 0.5);
                gfx.strokeRoundedRect(tx, tabY, tabW, tabH, { tl: 5, tr: 5, bl: 0, br: 0 });
            }

            const labelColor = isActive ? cat.accent : '#666666';
            const label = this.add.text(tx + tabW / 2, tabY + tabH / 2, cat.label, {
                fontSize: '13px', fontFamily: 'monospace', color: labelColor,
                fontStyle: 'bold',
            }).setOrigin(0.5).setInteractive({ useHandCursor: true });

            label.on('pointerdown', () => {
                if (this.activeTab === cat.key) return;
                this.activeTab = cat.key;
                audioManager.playMenuSelect();
                this._createTabs();
                this._renderActiveTab();
            });

            label.on('pointerover', () => {
                if (this.activeTab !== cat.key) label.setColor(cat.accent);
            });
            label.on('pointerout', () => {
                if (this.activeTab !== cat.key) label.setColor('#666666');
            });

            this.tabObjects.push(label);
        });

        // Bottom line under tabs
        gfx.lineStyle(1, 0x333355, 0.4);
        gfx.lineBetween(0, tabY + tabH, CONFIG.WIDTH, tabY + tabH);
    }

    // --------------------------------------------------------
    // Content area rendering
    // --------------------------------------------------------
    _clearContent() {
        this.contentGfx.clear();
        this.contentObjects.forEach(o => o.destroy());
        this.contentObjects = [];
    }

    _renderActiveTab() {
        this._clearContent();

        if (this.activeTab === 'REPAIRS') {
            this._renderRepairsTab();
        } else {
            this._renderUpgradeTab(this.activeTab);
        }
    }

    // --------------------------------------------------------
    // Upgrade cards (COMMAND / WEAPONS / DEFENSE tabs)
    // --------------------------------------------------------
    _renderUpgradeTab(categoryKey) {
        const types = CONFIG.UPGRADE.TYPES;
        const keys = Object.keys(types).filter(k => types[k].category === categoryKey);

        const catInfo = UpgradeScene.CATEGORIES.find(c => c.key === categoryKey);
        const accentColor = catInfo.accent;
        const accentHex = catInfo.accentHex;

        // Layout: 2-column grid
        const colCount = 2;
        const cardW = 350;
        const cardH = 120;
        const gapX = 20;
        const gapY = 15;
        const gridW = colCount * cardW + (colCount - 1) * gapX;
        const startX = (CONFIG.WIDTH - gridW) / 2;
        const startY = 138;

        keys.forEach((upgradeKey, idx) => {
            const col = idx % colCount;
            const row = Math.floor(idx / colCount);
            const cx = startX + col * (cardW + gapX);
            const cy = startY + row * (cardH + gapY);
            this._drawUpgradeCard(cx, cy, cardW, cardH, upgradeKey, accentColor, accentHex);
        });
    }

    _drawUpgradeCard(x, y, w, h, upgradeKey, accentColor, accentHex) {
        const config = CONFIG.UPGRADE.TYPES[upgradeKey];
        const stateKey = UpgradeScene.STATE_KEYS[upgradeKey];
        const currentLevel = this.upgradeState[stateKey];
        const maxLevel = config.maxLevel;
        const isMaxed = currentLevel >= maxLevel;
        const cost = isMaxed ? 0 : config.costs[currentLevel];
        const canAfford = !isMaxed && this.money >= cost;

        const gfx = this.contentGfx;

        // Card background
        gfx.fillStyle(0x1a1a3e, canAfford ? 0.9 : 0.7);
        gfx.fillRoundedRect(x, y, w, h, 6);

        // Left accent bar
        gfx.fillStyle(accentHex, canAfford ? 0.8 : 0.3);
        gfx.fillRect(x, y + 4, 4, h - 8);

        // Border when affordable
        if (canAfford) {
            gfx.lineStyle(1, accentHex, 0.5);
            gfx.strokeRoundedRect(x, y, w, h, 6);
        }

        // Category tag
        const catTag = this.add.text(x + 14, y + 8, config.category, {
            fontSize: '9px', fontFamily: 'monospace', color: accentColor,
            fontStyle: 'bold',
        });
        this.contentObjects.push(catTag);

        // Name
        const nameColor = isMaxed ? '#888888' : canAfford ? '#ffffff' : '#666666';
        const nameText = this.add.text(x + 14, y + 22, config.name, {
            fontSize: '16px', fontFamily: 'monospace', color: nameColor,
            fontStyle: 'bold',
        });
        this.contentObjects.push(nameText);

        // Description
        const descText = this.add.text(x + 14, y + 44, config.description, {
            fontSize: '11px', fontFamily: 'monospace', color: '#777777',
        });
        this.contentObjects.push(descText);

        // Level dots
        const dotY = y + 68;
        for (let i = 0; i < maxLevel; i++) {
            const dx = x + 14 + i * 20;
            const filled = i < currentLevel;
            gfx.fillStyle(filled ? accentHex : 0x333355, filled ? 0.9 : 0.5);
            gfx.fillRoundedRect(dx, dotY, 16, 8, 3);
        }

        const levelLabel = this.add.text(x + 14 + maxLevel * 20 + 6, dotY - 1, currentLevel + '/' + maxLevel, {
            fontSize: '10px', fontFamily: 'monospace',
            color: isMaxed ? '#888888' : '#aaaaaa',
        });
        this.contentObjects.push(levelLabel);

        // Cost / status line
        if (isMaxed) {
            const maxText = this.add.text(x + w - 14, y + h - 22, 'MAXED', {
                fontSize: '14px', fontFamily: 'monospace', color: '#888855',
                fontStyle: 'bold',
            }).setOrigin(1, 0);
            this.contentObjects.push(maxText);
        } else {
            const costColor = canAfford ? '#44ff44' : '#ff4444';
            const costStr = '$' + Helpers.formatNumber(cost);
            const costText = this.add.text(x + w - 14, y + h - 22, costStr, {
                fontSize: '14px', fontFamily: 'monospace', color: costColor,
                fontStyle: 'bold',
            }).setOrigin(1, 0);
            this.contentObjects.push(costText);

            if (canAfford) {
                const buyHint = this.add.text(x + 14, y + h - 22, 'Click to buy', {
                    fontSize: '10px', fontFamily: 'monospace', color: '#448844',
                });
                this.contentObjects.push(buyHint);
            }
        }

        // Interactive zone
        const zone = this.add.zone(x + w / 2, y + h / 2, w, h)
            .setInteractive({ useHandCursor: canAfford });
        this.contentObjects.push(zone);

        zone.on('pointerdown', () => this._buyUpgrade(upgradeKey, stateKey));
    }

    // --------------------------------------------------------
    // Repairs tab
    // --------------------------------------------------------
    _renderRepairsTab() {
        const gfx = this.contentGfx;
        const startY = 138;
        const panelW = 500;
        const startX = (CONFIG.WIDTH - panelW) / 2;
        const accentHex = 0x44aa44;
        const accentColor = '#44aa44';

        // Panel background
        gfx.fillStyle(0x1a1a3e, 0.7);
        gfx.fillRoundedRect(startX, startY, panelW, 370, 6);
        gfx.fillStyle(accentHex, 0.4);
        gfx.fillRect(startX, startY + 4, 4, 362);

        const titleText = this.add.text(startX + 20, startY + 12, 'REPAIRS & REBUILDING', {
            fontSize: '16px', fontFamily: 'monospace', color: accentColor,
            fontStyle: 'bold',
        });
        this.contentObjects.push(titleText);

        const subtitleText = this.add.text(startX + 20, startY + 34, 'Restore destroyed cities and bases', {
            fontSize: '11px', fontFamily: 'monospace', color: '#777777',
        });
        this.contentObjects.push(subtitleText);

        // Separator
        gfx.lineStyle(1, 0x333355, 0.5);
        gfx.lineBetween(startX + 14, startY + 55, startX + panelW - 14, startY + 55);

        let itemY = startY + 70;

        // --- Destroyed cities ---
        const destroyedCityIndices = [];
        for (let i = 0; i < this.cityStates.length; i++) {
            if (!this.cityStates[i].alive && !this.rebuiltCities.includes(i)) {
                destroyedCityIndices.push(i);
            }
        }

        const cityHeaderText = this.add.text(startX + 20, itemY, 'CITIES', {
            fontSize: '12px', fontFamily: 'monospace', color: '#aaaaaa',
            fontStyle: 'bold',
        });
        this.contentObjects.push(cityHeaderText);
        itemY += 22;

        if (destroyedCityIndices.length === 0) {
            const okText = this.add.text(startX + 20, itemY, 'All cities operational', {
                fontSize: '12px', fontFamily: 'monospace', color: '#44aa44',
            });
            this.contentObjects.push(okText);
            itemY += 28;
        } else {
            const cost = CONFIG.UPGRADE.CITY_REBUILD_COST;
            const canAfford = this.money >= cost;

            for (let ci = 0; ci < destroyedCityIndices.length; ci++) {
                const cityIdx = destroyedCityIndices[ci];
                const rowY = itemY;

                // Row background
                gfx.fillStyle(0x111128, 0.6);
                gfx.fillRoundedRect(startX + 14, rowY - 2, panelW - 28, 28, 4);

                const labelText = this.add.text(startX + 24, rowY + 3, 'City #' + (cityIdx + 1) + ' — Destroyed', {
                    fontSize: '12px', fontFamily: 'monospace',
                    color: '#cc4444',
                });
                this.contentObjects.push(labelText);

                const costColor = canAfford ? '#44ff44' : '#ff4444';
                const rebuildLabel = canAfford ? 'REBUILD $' + cost : '$' + cost;
                const btnText = this.add.text(startX + panelW - 24, rowY + 3, rebuildLabel, {
                    fontSize: '12px', fontFamily: 'monospace', color: costColor,
                    fontStyle: 'bold',
                }).setOrigin(1, 0).setInteractive({ useHandCursor: canAfford });

                btnText.on('pointerdown', () => this._buyRebuildCity());
                if (canAfford) {
                    btnText.on('pointerover', () => btnText.setColor('#88ff88'));
                    btnText.on('pointerout', () => btnText.setColor('#44ff44'));
                }

                this.contentObjects.push(btnText);
                itemY += 34;
            }
        }

        itemY += 10;

        // Separator
        gfx.lineStyle(1, 0x333355, 0.3);
        gfx.lineBetween(startX + 14, itemY, startX + panelW - 14, itemY);
        itemY += 14;

        // --- Destroyed bases ---
        const destroyedBaseIndices = [];
        for (let i = 0; i < this.baseStates.length; i++) {
            if (!this.baseStates[i].alive && !this.repairedBases.includes(i)) {
                destroyedBaseIndices.push(i);
            }
        }

        const baseHeaderText = this.add.text(startX + 20, itemY, 'BASES', {
            fontSize: '12px', fontFamily: 'monospace', color: '#aaaaaa',
            fontStyle: 'bold',
        });
        this.contentObjects.push(baseHeaderText);
        itemY += 22;

        if (destroyedBaseIndices.length === 0) {
            const okText = this.add.text(startX + 20, itemY, 'All bases operational', {
                fontSize: '12px', fontFamily: 'monospace', color: '#44aa44',
            });
            this.contentObjects.push(okText);
            itemY += 28;
        } else {
            const cost = CONFIG.UPGRADE.BASE_REPAIR_COST;
            const canAfford = this.money >= cost;
            const baseNames = ['West Battery', 'Central Battery', 'East Battery'];

            for (let bi = 0; bi < destroyedBaseIndices.length; bi++) {
                const baseIdx = destroyedBaseIndices[bi];
                const rowY = itemY;

                gfx.fillStyle(0x111128, 0.6);
                gfx.fillRoundedRect(startX + 14, rowY - 2, panelW - 28, 28, 4);

                const labelText = this.add.text(startX + 24, rowY + 3,
                    (baseNames[baseIdx] || 'Base #' + (baseIdx + 1)) + ' — Destroyed', {
                    fontSize: '12px', fontFamily: 'monospace',
                    color: '#cc4444',
                });
                this.contentObjects.push(labelText);

                const costColor = canAfford ? '#44ff44' : '#ff4444';
                const repairLabel = canAfford ? 'REPAIR $' + cost : '$' + cost;
                const btnText = this.add.text(startX + panelW - 24, rowY + 3, repairLabel, {
                    fontSize: '12px', fontFamily: 'monospace', color: costColor,
                    fontStyle: 'bold',
                }).setOrigin(1, 0).setInteractive({ useHandCursor: canAfford });

                btnText.on('pointerdown', () => this._buyRepairBase());
                if (canAfford) {
                    btnText.on('pointerover', () => btnText.setColor('#88ff88'));
                    btnText.on('pointerout', () => btnText.setColor('#44ff44'));
                }

                this.contentObjects.push(btnText);
                itemY += 34;
            }
        }

        // If everything is fine
        if (destroyedCityIndices.length === 0 && destroyedBaseIndices.length === 0) {
            const allGood = this.add.text(startX + panelW / 2, startY + 200, 'All systems operational!', {
                fontSize: '18px', fontFamily: 'monospace', color: '#44aa44',
                fontStyle: 'bold',
            }).setOrigin(0.5);
            this.contentObjects.push(allGood);
        }
    }

    // --------------------------------------------------------
    // Status bar (bottom)
    // --------------------------------------------------------
    _createStatusBar() {
        const barY = 525;
        const barH = 24;

        this.statusGfx = this.add.graphics();
        this.statusGfx.fillStyle(0x111128, 0.6);
        this.statusGfx.fillRoundedRect(0, barY, CONFIG.WIDTH, barH, 0);

        this.statusText = this.add.text(CONFIG.WIDTH / 2, barY + barH / 2, '', {
            fontSize: '12px', fontFamily: 'monospace', color: '#888888',
        }).setOrigin(0.5);

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

    // --------------------------------------------------------
    // Purchase logic
    // --------------------------------------------------------
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

        // Refresh current tab
        this._renderActiveTab();
        this._updateStatus();
    }

    _buyRebuildCity() {
        const cost = CONFIG.UPGRADE.CITY_REBUILD_COST;
        if (this.money < cost) {
            this._flashError();
            return;
        }

        for (let i = 0; i < this.cityStates.length; i++) {
            if (!this.cityStates[i].alive && !this.rebuiltCities.includes(i)) {
                this.money -= cost;
                this.rebuiltCities.push(i);
                this._updateMoneyText();
                audioManager.playUpgradeBuy();
                this._renderActiveTab();
                this._updateStatus();
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
                this._renderActiveTab();
                this._updateStatus();
                return;
            }
        }
    }

    _flashError() {
        audioManager.playMenuSelect();
        this.cameras.main.flash(200, 80, 0, 0);
    }

    // --------------------------------------------------------
    // Continue → return to GameScene
    // --------------------------------------------------------
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
