// HUD.js — UI layer (top bar, tower selection, wave info, menus)

import { TOWER_TYPES } from './Tower.js';
import { TOTAL_WAVES } from './WaveManager.js';
import { ENEMY_TYPES } from './Enemy.js';

const GAME_W = 1400;
const GAME_H = 960;

// Draw a mini tower icon for UI buttons
function drawMiniTower(g, type, x, y, scale = 1) {
    const color = TOWER_TYPES[type].color;
    const s = scale;

    switch (type) {
        case 'laser': {
            // Mini turret with barrel
            g.beginFill(color, 0.6);
            g.drawCircle(x, y, 3 * s);
            g.endFill();
            g.lineStyle(1.5 * s, color, 0.8);
            g.moveTo(x, y);
            g.lineTo(x + 8 * s, y);
            g.beginFill(color, 0.9);
            g.drawCircle(x + 9 * s, y, 1.5 * s);
            g.endFill();
            break;
        }
        case 'pulse': {
            // Mini dish
            g.lineStyle(1.5 * s, color, 0.7);
            g.arc(x + 2 * s, y, 6 * s, Math.PI * 0.65, Math.PI * 1.35);
            g.beginFill(color, 0.7);
            g.drawCircle(x, y, 2.5 * s);
            g.endFill();
            g.lineStyle(0.5 * s, color, 0.3);
            g.drawCircle(x, y, 7 * s);
            break;
        }
        case 'slow': {
            // Mini crystal
            g.beginFill(color, 0.6);
            g.drawCircle(x, y, 2.5 * s);
            g.endFill();
            g.lineStyle(1 * s, color, 0.6);
            for (let i = 0; i < 4; i++) {
                const angle = (Math.PI / 2) * i;
                g.moveTo(x, y);
                g.lineTo(x + Math.cos(angle) * 6 * s, y + Math.sin(angle) * 6 * s);
            }
            break;
        }
        case 'sniper': {
            // Mini cannon
            g.beginFill(color, 0.5);
            g.drawRect(x - 2 * s, y - 1.5 * s, 4 * s, 3 * s);
            g.endFill();
            g.beginFill(color, 0.7);
            g.drawRect(x, y - 1.5 * s, 10 * s, 3 * s);
            g.endFill();
            g.beginFill(0xff4444, 0.5);
            g.drawCircle(x + 3 * s, y - 3 * s, 1 * s);
            g.endFill();
            break;
        }
    }
}

// Draw a mini enemy icon for wave preview
function drawMiniEnemy(g, type, x, y, scale = 1) {
    const def = ENEMY_TYPES[type];
    const color = def.color;
    const s = scale * 0.7;

    switch (def.shape) {
        case 'bug': {
            g.beginFill(color, 0.7);
            g.drawEllipse(x, y, 4 * s, 3 * s);
            g.endFill();
            g.beginFill(0xffffff, 0.9);
            g.drawCircle(x + 3.5 * s, y, 1 * s);
            g.endFill();
            break;
        }
        case 'beetle': {
            g.beginFill(color, 0.6);
            g.drawEllipse(x, y, 5 * s, 3.5 * s);
            g.endFill();
            g.lineStyle(0.8 * s, color, 0.8);
            g.drawEllipse(x, y, 5 * s, 3.5 * s);
            break;
        }
        case 'crab': {
            g.beginFill(color, 0.6);
            g.drawEllipse(x, y, 5 * s, 4 * s);
            g.endFill();
            g.lineStyle(1 * s, color, 0.7);
            g.moveTo(x + 4 * s, y - 3 * s);
            g.lineTo(x + 7 * s, y - 4 * s);
            g.moveTo(x + 4 * s, y + 3 * s);
            g.lineTo(x + 7 * s, y + 4 * s);
            break;
        }
        case 'blob': {
            g.beginFill(color, 0.5);
            g.drawCircle(x, y, 4 * s);
            g.endFill();
            g.beginFill(color, 0.7);
            g.drawCircle(x - 1 * s, y, 2 * s);
            g.endFill();
            break;
        }
        case 'spider': {
            g.beginFill(color, 0.6);
            g.drawEllipse(x - 1 * s, y, 4 * s, 3.5 * s);
            g.drawEllipse(x + 3 * s, y, 3 * s, 2.5 * s);
            g.endFill();
            g.beginFill(0xffff44, 0.9);
            g.drawCircle(x + 4.5 * s, y - 1 * s, 1 * s);
            g.drawCircle(x + 4.5 * s, y + 1 * s, 1 * s);
            g.endFill();
            break;
        }
    }
}

export class HUD {
    constructor(stage, gameState) {
        this.state = gameState;
        this.container = new PIXI.Container();
        stage.addChild(this.container);

        // Layers
        this.topBar = new PIXI.Container();
        this.bottomBar = new PIXI.Container();
        this.menuLayer = new PIXI.Container();
        this.waveAnnounce = new PIXI.Container();
        this.tooltipContainer = new PIXI.Container();
        this.wavePreview = new PIXI.Container();

        this.container.addChild(this.topBar);
        this.container.addChild(this.bottomBar);
        this.container.addChild(this.wavePreview);
        this.container.addChild(this.tooltipContainer);
        this.container.addChild(this.waveAnnounce);
        this.container.addChild(this.menuLayer);

        this.towerButtons = [];
        this.actionButtons = [];
        this.selectedType = null;
        this.onTowerSelect = null;
        this.onStartWave = null;
        this.onSellTower = null;
        this.onUpgradeTower = null;
        this.onStartGame = null;
        this.onRestart = null;
        this.waveManager = null; // set by main.js

        this.createTopBar();
        this.createBottomBar();
    }

    createTopBar() {
        // Background
        const bg = new PIXI.Graphics();
        bg.beginFill(0x0a0a2a, 0.85);
        bg.drawRoundedRect(10, 6, GAME_W - 20, 40, 8);
        bg.endFill();
        bg.lineStyle(1, 0x667eea, 0.3);
        bg.drawRoundedRect(10, 6, GAME_W - 20, 40, 8);
        this.topBar.addChild(bg);

        const style = { fontFamily: 'Segoe UI', fontSize: 16, fill: '#ffffff', fontWeight: 'bold' };
        const valStyle = { fontFamily: 'Segoe UI', fontSize: 16, fill: '#ffcc44', fontWeight: 'bold' };

        // Currency
        this.currencyLabel = new PIXI.Text('Gold: ', style);
        this.currencyLabel.x = 40;
        this.currencyLabel.y = 14;
        this.topBar.addChild(this.currencyLabel);

        this.currencyValue = new PIXI.Text('125', valStyle);
        this.currencyValue.x = 95;
        this.currencyValue.y = 14;
        this.topBar.addChild(this.currencyValue);

        // Lives
        this.livesLabel = new PIXI.Text('Lives: ', style);
        this.livesLabel.x = 270;
        this.livesLabel.y = 14;
        this.topBar.addChild(this.livesLabel);

        this.livesValue = new PIXI.Text('15', { ...valStyle, fill: '#ff6688' });
        this.livesValue.x = 330;
        this.livesValue.y = 14;
        this.topBar.addChild(this.livesValue);

        // Wave
        this.waveLabel = new PIXI.Text('Wave: ', style);
        this.waveLabel.x = 530;
        this.waveLabel.y = 14;
        this.topBar.addChild(this.waveLabel);

        this.waveValue = new PIXI.Text(`0/${TOTAL_WAVES}`, { ...valStyle, fill: '#88aaff' });
        this.waveValue.x = 590;
        this.waveValue.y = 14;
        this.topBar.addChild(this.waveValue);

        // Score
        this.scoreLabel = new PIXI.Text('Score: ', style);
        this.scoreLabel.x = 790;
        this.scoreLabel.y = 14;
        this.topBar.addChild(this.scoreLabel);

        this.scoreValue = new PIXI.Text('0', valStyle);
        this.scoreValue.x = 855;
        this.scoreValue.y = 14;
        this.topBar.addChild(this.scoreValue);

        // High score
        this.hiScoreText = new PIXI.Text(`Best: ${this.state.highScore}`, { ...style, fontSize: 13, fill: '#999999' });
        this.hiScoreText.x = 1150;
        this.hiScoreText.y = 17;
        this.topBar.addChild(this.hiScoreText);
    }

    createBottomBar() {
        // Background
        const bg = new PIXI.Graphics();
        bg.beginFill(0x0a0a2a, 0.85);
        bg.drawRoundedRect(10, GAME_H - 58, GAME_W - 20, 50, 8);
        bg.endFill();
        bg.lineStyle(1, 0x667eea, 0.3);
        bg.drawRoundedRect(10, GAME_H - 58, GAME_W - 20, 50, 8);
        this.bottomBar.addChild(bg);

        // Tower buttons with mini icons
        const towerTypes = ['laser', 'pulse', 'slow', 'sniper'];
        const startX = 30;
        const btnW = 160;
        const btnH = 36;
        const y = GAME_H - 50;

        towerTypes.forEach((type, i) => {
            const def = TOWER_TYPES[type];
            const btn = this.createTowerButton(
                type,
                def,
                startX + i * (btnW + 12),
                y,
                btnW,
                btnH
            );
            btn.towerType = type;
            btn.interactive = true;
            btn.cursor = 'pointer';
            btn.on('pointerdown', () => {
                this.selectTower(type);
                if (this.onTowerSelect) this.onTowerSelect(type);
            });
            this.bottomBar.addChild(btn);
            this.towerButtons.push(btn);
        });

        // Start Wave button
        this.startWaveBtn = this.createButton(
            'Start Wave',
            startX + 4 * (btnW + 12) + 30,
            y,
            130,
            btnH,
            0x44ff88
        );
        this.startWaveBtn.interactive = true;
        this.startWaveBtn.cursor = 'pointer';
        this.startWaveBtn.on('pointerdown', () => {
            if (this.onStartWave) this.onStartWave();
        });
        this.bottomBar.addChild(this.startWaveBtn);

        // Sell button (hidden by default)
        this.sellBtn = this.createButton('Sell', 1100, y, 80, btnH, 0xff6644);
        this.sellBtn.interactive = true;
        this.sellBtn.cursor = 'pointer';
        this.sellBtn.visible = false;
        this.sellBtn.on('pointerdown', () => {
            if (this.onSellTower) this.onSellTower();
        });
        this.bottomBar.addChild(this.sellBtn);

        // Upgrade button (hidden by default)
        this.upgradeBtn = this.createButton('Upgrade', 1195, y, 110, btnH, 0x44aaff);
        this.upgradeBtn.interactive = true;
        this.upgradeBtn.cursor = 'pointer';
        this.upgradeBtn.visible = false;
        this.upgradeBtn.on('pointerdown', () => {
            if (this.onUpgradeTower) this.onUpgradeTower();
        });
        this.bottomBar.addChild(this.upgradeBtn);

        // Build timer text
        this.buildTimerText = new PIXI.Text('', {
            fontFamily: 'Segoe UI', fontSize: 13, fill: '#88ffaa', fontWeight: 'bold',
        });
        this.buildTimerText.x = startX + 4 * (btnW + 12) + 30;
        this.buildTimerText.y = y - 18;
        this.buildTimerText.visible = false;
        this.bottomBar.addChild(this.buildTimerText);
    }

    createTowerButton(type, def, x, y, w, h) {
        const cont = new PIXI.Container();
        cont.x = x;
        cont.y = y;

        const bg = new PIXI.Graphics();
        bg.beginFill(0x1a1a3a, 0.9);
        bg.drawRoundedRect(0, 0, w, h, 6);
        bg.endFill();
        bg.lineStyle(1.5, def.color, 0.6);
        bg.drawRoundedRect(0, 0, w, h, 6);
        cont.addChild(bg);

        // Mini tower icon on the left side
        const iconG = new PIXI.Graphics();
        drawMiniTower(iconG, type, 18, h / 2, 1.0);
        cont.addChild(iconG);

        // Label text (shifted right to make room for icon)
        const label = new PIXI.Text(`${def.name} (${def.cost})`, {
            fontFamily: 'Segoe UI',
            fontSize: 12,
            fill: '#ffffff',
            fontWeight: 'bold',
        });
        label.anchor.set(0.5);
        label.x = w / 2 + 12;
        label.y = h / 2;
        cont.addChild(label);

        cont.hitArea = new PIXI.Rectangle(0, 0, w, h);
        cont._bg = bg;
        cont._label = label;
        cont._accentColor = def.color;

        return cont;
    }

    createButton(text, x, y, w, h, accentColor) {
        const cont = new PIXI.Container();
        cont.x = x;
        cont.y = y;

        const bg = new PIXI.Graphics();
        bg.beginFill(0x1a1a3a, 0.9);
        bg.drawRoundedRect(0, 0, w, h, 6);
        bg.endFill();
        bg.lineStyle(1.5, accentColor, 0.6);
        bg.drawRoundedRect(0, 0, w, h, 6);
        cont.addChild(bg);

        const label = new PIXI.Text(text, {
            fontFamily: 'Segoe UI',
            fontSize: 12,
            fill: '#ffffff',
            fontWeight: 'bold',
        });
        label.anchor.set(0.5);
        label.x = w / 2;
        label.y = h / 2;
        cont.addChild(label);

        cont.hitArea = new PIXI.Rectangle(0, 0, w, h);
        cont._bg = bg;
        cont._label = label;
        cont._accentColor = accentColor;

        return cont;
    }

    selectTower(type) {
        this.selectedType = type;
        this.towerButtons.forEach(btn => {
            const isSelected = btn.towerType === type;
            btn._bg.clear();
            btn._bg.beginFill(isSelected ? 0x2a2a5a : 0x1a1a3a, 0.9);
            btn._bg.drawRoundedRect(0, 0, 160, 36, 6);
            btn._bg.endFill();
            btn._bg.lineStyle(isSelected ? 2.5 : 1.5, btn._accentColor, isSelected ? 0.9 : 0.6);
            btn._bg.drawRoundedRect(0, 0, 160, 36, 6);
        });
    }

    deselectTower() {
        this.selectedType = null;
        this.towerButtons.forEach(btn => {
            btn._bg.clear();
            btn._bg.beginFill(0x1a1a3a, 0.9);
            btn._bg.drawRoundedRect(0, 0, 160, 36, 6);
            btn._bg.endFill();
            btn._bg.lineStyle(1.5, btn._accentColor, 0.6);
            btn._bg.drawRoundedRect(0, 0, 160, 36, 6);
        });
    }

    showSellUpgrade(tower) {
        this.sellBtn.visible = true;
        const sellValue = tower.getSellValue();
        this.sellBtn._label.text = `Sell (${sellValue})`;

        const upgradeCost = tower.getUpgradeCost();
        if (upgradeCost !== null) {
            this.upgradeBtn.visible = true;
            this.upgradeBtn._label.text = `Upgrade (${upgradeCost})`;
        } else {
            this.upgradeBtn.visible = true;
            this.upgradeBtn._label.text = 'MAX';
            this.upgradeBtn.interactive = false;
        }
    }

    hideSellUpgrade() {
        this.sellBtn.visible = false;
        this.upgradeBtn.visible = false;
        this.upgradeBtn.interactive = true;
    }

    updateWavePreview() {
        this.wavePreview.removeChildren();

        if (this.state.phase !== 'build' || !this.waveManager) return;

        const nextWave = this.state.wave + 1;
        if (nextWave > TOTAL_WAVES) return;

        const preview = this.waveManager.getNextWavePreview(nextWave);
        if (!preview || preview.length === 0) return;

        // Background panel
        const panelX = GAME_W - 250;
        const panelY = 56;
        const panelW = 220;
        const panelH = 20 + preview.length * 22;

        const bg = new PIXI.Graphics();
        bg.beginFill(0x0a0a2a, 0.8);
        bg.drawRoundedRect(panelX, panelY, panelW, panelH, 6);
        bg.endFill();
        bg.lineStyle(1, 0x667eea, 0.25);
        bg.drawRoundedRect(panelX, panelY, panelW, panelH, 6);
        this.wavePreview.addChild(bg);

        // Title
        const title = new PIXI.Text(`Next Wave ${nextWave}:`, {
            fontFamily: 'Segoe UI', fontSize: 11, fill: '#aaaaaa', fontWeight: 'bold',
        });
        title.x = panelX + 8;
        title.y = panelY + 4;
        this.wavePreview.addChild(title);

        // Enemy list with mini icons
        preview.forEach((entry, i) => {
            const ey = panelY + 20 + i * 22;
            const def = ENEMY_TYPES[entry.type];

            // Mini enemy icon
            const iconG = new PIXI.Graphics();
            drawMiniEnemy(iconG, entry.type, panelX + 20, ey + 8, 1.2);
            this.wavePreview.addChild(iconG);

            // Name and count
            const text = new PIXI.Text(`${def.name} x${entry.count}`, {
                fontFamily: 'Segoe UI', fontSize: 11, fill: '#cccccc',
            });
            text.x = panelX + 38;
            text.y = ey + 2;
            this.wavePreview.addChild(text);
        });
    }

    showWaveAnnouncement(waveNum, isBoss) {
        this.waveAnnounce.removeChildren();

        const text = isBoss ? `BOSS WAVE ${waveNum}` : `WAVE ${waveNum}`;
        const color = isBoss ? '#ff4466' : '#88aaff';

        const t = new PIXI.Text(text, {
            fontFamily: 'Segoe UI',
            fontSize: isBoss ? 42 : 36,
            fill: color,
            fontWeight: 'bold',
            dropShadow: true,
            dropShadowColor: '#000000',
            dropShadowDistance: 2,
            dropShadowBlur: 4,
        });
        t.anchor.set(0.5);
        t.x = GAME_W / 2;
        t.y = GAME_H / 2 - 40;
        t.alpha = 0;
        this.waveAnnounce.addChild(t);

        // Animate in and out
        gsap.to(t, { alpha: 1, y: GAME_H / 2 - 60, duration: 0.3, ease: 'power2.out' });
        gsap.to(t, { alpha: 0, y: GAME_H / 2 - 80, duration: 0.4, delay: 1.2, ease: 'power2.in',
            onComplete: () => { this.waveAnnounce.removeChildren(); }
        });
    }

    showMenu() {
        this.menuLayer.removeChildren();

        // Overlay
        const overlay = new PIXI.Graphics();
        overlay.beginFill(0x0a0a1a, 0.92);
        overlay.drawRect(0, 0, GAME_W, GAME_H);
        overlay.endFill();
        this.menuLayer.addChild(overlay);

        // Title
        const title = new PIXI.Text('HEX DEFENSE', {
            fontFamily: 'Segoe UI',
            fontSize: 60,
            fill: '#667eea',
            fontWeight: 'bold',
            letterSpacing: 8,
        });
        title.anchor.set(0.5);
        title.x = GAME_W / 2;
        title.y = 200;
        this.menuLayer.addChild(title);

        // Subtitle
        const sub = new PIXI.Text('Tower Defense', {
            fontFamily: 'Segoe UI',
            fontSize: 22,
            fill: '#764ba2',
            fontWeight: '600',
            letterSpacing: 4,
        });
        sub.anchor.set(0.5);
        sub.x = GAME_W / 2;
        sub.y = 265;
        this.menuLayer.addChild(sub);

        // Instructions
        const instr = new PIXI.Text(
            'Select a tower from the bottom bar, then click green hexes to place.\nDefend the path against 20 waves of creatures!',
            { fontFamily: 'Segoe UI', fontSize: 15, fill: '#888888', align: 'center', lineHeight: 24 }
        );
        instr.anchor.set(0.5);
        instr.x = GAME_W / 2;
        instr.y = 320;
        this.menuLayer.addChild(instr);

        // Tower guide
        const guideY = 370;
        const towerTypes = ['laser', 'pulse', 'slow', 'sniper'];
        const guideStartX = GAME_W / 2 - 220;

        towerTypes.forEach((type, i) => {
            const def = TOWER_TYPES[type];
            const tx = guideStartX + i * 115;
            const ty = guideY + 10;

            // Icon
            const iconG = new PIXI.Graphics();
            drawMiniTower(iconG, type, tx + 10, ty + 10, 1.3);
            this.menuLayer.addChild(iconG);

            // Name
            const nameT = new PIXI.Text(def.name, {
                fontFamily: 'Segoe UI', fontSize: 11, fill: '#cccccc', fontWeight: 'bold',
            });
            nameT.x = tx + 25;
            nameT.y = ty + 3;
            this.menuLayer.addChild(nameT);

            // Description
            const descT = new PIXI.Text(def.description, {
                fontFamily: 'Segoe UI', fontSize: 9, fill: '#888888',
            });
            descT.x = tx + 25;
            descT.y = ty + 16;
            this.menuLayer.addChild(descT);
        });

        // Legend
        const legendY = 430;
        const legendG = new PIXI.Graphics();

        // Green hex = buildable
        legendG.beginFill(0x2a5530, 0.4);
        legendG.lineStyle(1.5, 0x3a7744, 0.6);
        legendG.drawRect(GAME_W / 2 - 150, legendY, 16, 16);
        legendG.endFill();
        this.menuLayer.addChild(legendG);

        const legendBuild = new PIXI.Text('= Buildable area', {
            fontFamily: 'Segoe UI', fontSize: 11, fill: '#888888',
        });
        legendBuild.x = GAME_W / 2 - 130;
        legendBuild.y = legendY + 1;
        this.menuLayer.addChild(legendBuild);

        // Brown = path
        const legendG2 = new PIXI.Graphics();
        legendG2.beginFill(0x6B5B45, 0.5);
        legendG2.lineStyle(1.5, 0x8B7355, 0.6);
        legendG2.drawRect(GAME_W / 2 + 30, legendY, 16, 16);
        legendG2.endFill();
        this.menuLayer.addChild(legendG2);

        const legendPath = new PIXI.Text('= Enemy path', {
            fontFamily: 'Segoe UI', fontSize: 11, fill: '#888888',
        });
        legendPath.x = GAME_W / 2 + 50;
        legendPath.y = legendY + 1;
        this.menuLayer.addChild(legendPath);

        // High score
        if (this.state.highScore > 0) {
            const hs = new PIXI.Text(`High Score: ${this.state.highScore}  |  Best Wave: ${this.state.bestWave}`, {
                fontFamily: 'Segoe UI', fontSize: 15, fill: '#ffcc44',
            });
            hs.anchor.set(0.5);
            hs.x = GAME_W / 2;
            hs.y = 480;
            this.menuLayer.addChild(hs);
        }

        // Start button
        const startBtn = this.createMenuButton('START GAME', GAME_W / 2 - 90, 530, 180, 48, 0x44ff88);
        startBtn.on('pointerdown', () => {
            this.menuLayer.removeChildren();
            if (this.onStartGame) this.onStartGame();
        });
        this.menuLayer.addChild(startBtn);

        // Controls info
        const ctrl = new PIXI.Text(
            'Click: Place/Select  |  Tower Buttons: Choose Type  |  Sell/Upgrade: Manage Towers',
            { fontFamily: 'Segoe UI', fontSize: 12, fill: '#555555' }
        );
        ctrl.anchor.set(0.5);
        ctrl.x = GAME_W / 2;
        ctrl.y = 610;
        this.menuLayer.addChild(ctrl);
    }

    showGameOver() {
        this.menuLayer.removeChildren();

        const overlay = new PIXI.Graphics();
        overlay.beginFill(0x0a0a1a, 0.88);
        overlay.drawRect(0, 0, GAME_W, GAME_H);
        overlay.endFill();
        this.menuLayer.addChild(overlay);

        const title = new PIXI.Text('GAME OVER', {
            fontFamily: 'Segoe UI', fontSize: 56, fill: '#ff4466', fontWeight: 'bold',
        });
        title.anchor.set(0.5);
        title.x = GAME_W / 2;
        title.y = 300;
        this.menuLayer.addChild(title);

        const stats = new PIXI.Text(
            `Wave Reached: ${this.state.wave}\nScore: ${this.state.score}\nHigh Score: ${this.state.highScore}`,
            { fontFamily: 'Segoe UI', fontSize: 22, fill: '#cccccc', align: 'center', lineHeight: 34 }
        );
        stats.anchor.set(0.5);
        stats.x = GAME_W / 2;
        stats.y = 420;
        this.menuLayer.addChild(stats);

        const restartBtn = this.createMenuButton('PLAY AGAIN', GAME_W / 2 - 90, 510, 180, 48, 0x44ff88);
        restartBtn.on('pointerdown', () => {
            this.menuLayer.removeChildren();
            if (this.onRestart) this.onRestart();
        });
        this.menuLayer.addChild(restartBtn);
    }

    showVictory() {
        this.menuLayer.removeChildren();

        const overlay = new PIXI.Graphics();
        overlay.beginFill(0x0a0a1a, 0.88);
        overlay.drawRect(0, 0, GAME_W, GAME_H);
        overlay.endFill();
        this.menuLayer.addChild(overlay);

        const title = new PIXI.Text('VICTORY!', {
            fontFamily: 'Segoe UI', fontSize: 60, fill: '#44ff88', fontWeight: 'bold',
        });
        title.anchor.set(0.5);
        title.x = GAME_W / 2;
        title.y = 300;
        this.menuLayer.addChild(title);

        const stats = new PIXI.Text(
            `All ${TOTAL_WAVES} waves defeated!\nFinal Score: ${this.state.score}\nHigh Score: ${this.state.highScore}`,
            { fontFamily: 'Segoe UI', fontSize: 22, fill: '#cccccc', align: 'center', lineHeight: 34 }
        );
        stats.anchor.set(0.5);
        stats.x = GAME_W / 2;
        stats.y = 420;
        this.menuLayer.addChild(stats);

        const restartBtn = this.createMenuButton('PLAY AGAIN', GAME_W / 2 - 90, 510, 180, 48, 0x667eea);
        restartBtn.on('pointerdown', () => {
            this.menuLayer.removeChildren();
            if (this.onRestart) this.onRestart();
        });
        this.menuLayer.addChild(restartBtn);
    }

    createMenuButton(text, x, y, w, h, color) {
        const cont = new PIXI.Container();
        cont.x = x;
        cont.y = y;

        const bg = new PIXI.Graphics();
        bg.beginFill(color, 0.15);
        bg.drawRoundedRect(0, 0, w, h, 8);
        bg.endFill();
        bg.lineStyle(2, color, 0.8);
        bg.drawRoundedRect(0, 0, w, h, 8);
        cont.addChild(bg);

        const label = new PIXI.Text(text, {
            fontFamily: 'Segoe UI', fontSize: 16, fill: '#ffffff', fontWeight: 'bold', letterSpacing: 2,
        });
        label.anchor.set(0.5);
        label.x = w / 2;
        label.y = h / 2;
        cont.addChild(label);

        cont.interactive = true;
        cont.cursor = 'pointer';
        cont.hitArea = new PIXI.Rectangle(0, 0, w, h);

        cont.on('pointerover', () => {
            bg.clear();
            bg.beginFill(color, 0.3);
            bg.drawRoundedRect(0, 0, w, h, 8);
            bg.endFill();
            bg.lineStyle(2, color, 1);
            bg.drawRoundedRect(0, 0, w, h, 8);
        });
        cont.on('pointerout', () => {
            bg.clear();
            bg.beginFill(color, 0.15);
            bg.drawRoundedRect(0, 0, w, h, 8);
            bg.endFill();
            bg.lineStyle(2, color, 0.8);
            bg.drawRoundedRect(0, 0, w, h, 8);
        });

        return cont;
    }

    showTooltip(x, y, lines) {
        this.tooltipContainer.removeChildren();

        const padding = 8;
        const lineHeight = 16;
        const w = 190;
        const h = lines.length * lineHeight + padding * 2;

        // Clamp position to screen
        let tx = x + 20;
        let ty = y - h / 2;
        if (tx + w > GAME_W - 10) tx = x - w - 20;
        if (ty < 10) ty = 10;
        if (ty + h > GAME_H - 60) ty = GAME_H - 60 - h;

        const bg = new PIXI.Graphics();
        bg.beginFill(0x1a1a3a, 0.95);
        bg.drawRoundedRect(tx, ty, w, h, 6);
        bg.endFill();
        bg.lineStyle(1, 0x667eea, 0.5);
        bg.drawRoundedRect(tx, ty, w, h, 6);
        this.tooltipContainer.addChild(bg);

        lines.forEach((line, i) => {
            const t = new PIXI.Text(line, {
                fontFamily: 'Segoe UI',
                fontSize: 11,
                fill: i === 0 ? '#ffffff' : '#aaaaaa',
                fontWeight: i === 0 ? 'bold' : 'normal',
            });
            t.x = tx + padding;
            t.y = ty + padding + i * lineHeight;
            this.tooltipContainer.addChild(t);
        });
    }

    hideTooltip() {
        this.tooltipContainer.removeChildren();
    }

    update() {
        this.currencyValue.text = this.state.currency.toString();
        this.livesValue.text = this.state.lives.toString();
        this.waveValue.text = `${this.state.wave}/${TOTAL_WAVES}`;
        this.scoreValue.text = this.state.score.toString();
        this.hiScoreText.text = `Best: ${this.state.highScore}`;

        // Update tower button affordability
        this.towerButtons.forEach(btn => {
            const cost = TOWER_TYPES[btn.towerType].cost;
            const canAfford = this.state.canAfford(cost);
            btn.alpha = canAfford ? 1 : 0.4;
            btn.interactive = canAfford;
        });

        // Build timer
        if (this.state.phase === 'build' && this.state.buildTimer > 0) {
            this.buildTimerText.visible = true;
            this.buildTimerText.text = `Next wave in ${Math.ceil(this.state.buildTimer)}s`;
        } else {
            this.buildTimerText.visible = false;
        }

        // Start wave button visibility
        this.startWaveBtn.visible = (this.state.phase === 'build');

        // Wave preview
        this.updateWavePreview();
    }
}
