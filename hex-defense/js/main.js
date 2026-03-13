// main.js — Game initialization, loop, and orchestration

import { HexGridRenderer, hexToPixel, pixelToHex, hexKey, hexDistance, ENEMY_PATH, HEX_SIZE, GRID_COLS, GRID_ROWS } from './HexGrid.js';
import { GameState } from './GameState.js';
import { AudioManager } from './AudioManager.js';
import { ParticleSystem } from './ParticleSystem.js';
import { Enemy, ENEMY_TYPES } from './Enemy.js';
import { Tower, TOWER_TYPES } from './Tower.js';
import { Projectile } from './Projectile.js';
import { WaveManager, TOTAL_WAVES, BUILD_PHASE_DURATION } from './WaveManager.js';
import { HUD } from './HUD.js';

const GAME_W = 960;
const GAME_H = 680;

class Game {
    constructor() {
        this.app = new PIXI.Application({
            width: GAME_W,
            height: GAME_H,
            backgroundColor: 0x0a0a1a,
            antialias: true,
            resolution: window.devicePixelRatio || 1,
            autoDensity: true,
        });

        document.getElementById('game-container').appendChild(this.app.view);

        // Layer ordering
        this.gameLayer = new PIXI.Container();
        this.entityLayer = new PIXI.Container();
        this.projectileLayer = new PIXI.Container();
        this.towerLayer = new PIXI.Container();

        this.app.stage.addChild(this.gameLayer);

        // Systems
        this.state = new GameState();
        this.audio = new AudioManager();
        this.waveManager = new WaveManager();

        // Hex grid (added to gameLayer)
        this.hexGrid = new HexGridRenderer(this.gameLayer);

        // Entity layers
        this.gameLayer.addChild(this.towerLayer);
        this.gameLayer.addChild(this.entityLayer);
        this.gameLayer.addChild(this.projectileLayer);

        // Particles (above entities)
        this.particles = new ParticleSystem(this.gameLayer);

        // HUD (on top of everything)
        this.hud = new HUD(this.app.stage, this.state);
        this.hud.waveManager = this.waveManager;

        // Game collections
        this.enemies = [];
        this.towers = [];
        this.projectiles = [];
        this.selectedPlacedTower = null;

        // Input
        this.setupInput();
        this.setupHUDCallbacks();

        // Draw background decoration
        this.drawBackground();

        // Start with menu
        this.showMenu();

        // Game loop
        this.app.ticker.add((delta) => this.update(delta));
    }

    drawBackground() {
        // Subtle vignette / atmosphere
        const bg = new PIXI.Graphics();

        // Subtle grid glow at edges
        bg.beginFill(0x0f0c29, 0.3);
        bg.drawRect(0, 0, GAME_W, GAME_H);
        bg.endFill();

        // Corner decorations
        const cornerSize = 60;
        const corners = [
            [0, 0], [GAME_W, 0], [0, GAME_H], [GAME_W, GAME_H]
        ];
        corners.forEach(([cx, cy]) => {
            bg.lineStyle(1, 0x667eea, 0.1);
            bg.drawCircle(cx, cy, cornerSize);
        });

        this.gameLayer.addChildAt(bg, 0);
    }

    setupInput() {
        const stage = this.app.stage;
        stage.interactive = true;
        stage.hitArea = new PIXI.Rectangle(0, 0, GAME_W, GAME_H);

        stage.on('pointermove', (e) => {
            if (this.state.phase !== 'build' && this.state.phase !== 'wave') return;

            const pos = e.data.getLocalPosition(this.gameLayer);
            const hex = pixelToHex(pos.x, pos.y);

            if (hex.q >= 0 && hex.q < GRID_COLS && hex.r >= 0 && hex.r < GRID_ROWS) {
                const canBuild = this.hexGrid.canBuild(hex.q, hex.r);
                this.hexGrid.showHover(hex.q, hex.r, canBuild && this.hud.selectedType !== null);

                // Show tower info tooltip on hover over placed tower
                const key = hexKey(hex.q, hex.r);
                const tower = this.towers.find(t => hexKey(t.q, t.r) === key);
                if (tower) {
                    const def = TOWER_TYPES[tower.type];
                    const lines = [
                        `${def.name} Lv.${tower.level + 1}`,
                        `Damage: ${tower.damage}`,
                        `Range: ${tower.range.toFixed(1)}`,
                        `Fire Rate: ${tower.fireRate.toFixed(1)}/s`,
                    ];
                    const upgCost = tower.getUpgradeCost();
                    if (upgCost !== null) lines.push(`Upgrade: ${upgCost}g`);
                    lines.push(`Sell: ${tower.getSellValue()}g`);
                    this.hud.showTooltip(pos.x, pos.y, lines);
                } else if (this.hud.selectedType) {
                    const def = TOWER_TYPES[this.hud.selectedType];
                    const lines = [
                        def.name,
                        def.description,
                        `Cost: ${def.cost}`,
                        `Damage: ${def.damage}`,
                        `Range: ${def.range}`,
                    ];
                    this.hud.showTooltip(pos.x, pos.y, lines);
                } else {
                    this.hud.hideTooltip();
                }
            } else {
                this.hexGrid.clearHover();
                this.hud.hideTooltip();
            }
        });

        stage.on('pointerdown', (e) => {
            if (this.state.phase !== 'build' && this.state.phase !== 'wave') return;

            const pos = e.data.getLocalPosition(this.gameLayer);

            // Check if clicking in bottom bar area
            if (pos.y > GAME_H - 65) return;

            const hex = pixelToHex(pos.x, pos.y);
            if (hex.q < 0 || hex.q >= GRID_COLS || hex.r < 0 || hex.r >= GRID_ROWS) return;

            const key = hexKey(hex.q, hex.r);

            // Check if clicking on existing tower
            const existingTower = this.towers.find(t => hexKey(t.q, t.r) === key);
            if (existingTower) {
                this.selectPlacedTower(existingTower);
                return;
            }

            // Try to place tower
            if (this.hud.selectedType && this.hexGrid.canBuild(hex.q, hex.r)) {
                const cost = TOWER_TYPES[this.hud.selectedType].cost;
                if (this.state.canAfford(cost)) {
                    this.placeTower(this.hud.selectedType, hex.q, hex.r);
                }
            } else {
                // Deselect
                this.deselectPlacedTower();
            }
        });
    }

    setupHUDCallbacks() {
        this.hud.onTowerSelect = (type) => {
            this.deselectPlacedTower();
            this.audio.buttonClick();
        };

        this.hud.onStartWave = () => {
            this.startNextWave();
        };

        this.hud.onSellTower = () => {
            if (this.selectedPlacedTower) {
                this.sellTower(this.selectedPlacedTower);
            }
        };

        this.hud.onUpgradeTower = () => {
            if (this.selectedPlacedTower) {
                this.upgradeTower(this.selectedPlacedTower);
            }
        };

        this.hud.onStartGame = () => {
            this.startGame();
        };

        this.hud.onRestart = () => {
            this.restart();
        };
    }

    showMenu() {
        this.state.phase = 'menu';
        this.hud.showMenu();
    }

    startGame() {
        this.state.reset();
        this.state.phase = 'build';
        this.state.wave = 0;
        this.state.buildTimer = BUILD_PHASE_DURATION;
        this.clearEntities();
        this.hud.deselectTower();
        this.hud.selectTower('laser'); // default selection
        this.hud.onTowerSelect('laser');
    }

    restart() {
        this.clearEntities();
        this.hexGrid.initGrid();
        this.hexGrid.drawGrid();
        this.startGame();
    }

    clearEntities() {
        this.enemies.forEach(e => e.destroy());
        this.enemies = [];
        this.towers.forEach(t => t.destroy());
        this.towers = [];
        this.projectiles.forEach(p => p.destroy());
        this.projectiles = [];
        this.selectedPlacedTower = null;
    }

    placeTower(type, q, r) {
        const cost = TOWER_TYPES[type].cost;
        this.state.spend(cost);
        this.hexGrid.placeTower(q, r);

        const tower = new Tower(type, q, r, this.towerLayer);
        this.towers.push(tower);

        const pos = hexToPixel(q, r);
        this.particles.placeFlash(pos.x, pos.y);
        this.audio.placeTower();

        this.hexGrid.drawGrid();
    }

    selectPlacedTower(tower) {
        this.selectedPlacedTower = tower;
        this.hud.deselectTower();
        this.hud.showSellUpgrade(tower);
        this.hexGrid.showRange(tower.q, tower.r, tower.range);
    }

    deselectPlacedTower() {
        this.selectedPlacedTower = null;
        this.hud.hideSellUpgrade();
        this.hexGrid.clearRange();
    }

    sellTower(tower) {
        const value = tower.getSellValue();
        this.state.currency += value;
        this.hexGrid.removeTower(tower.q, tower.r);
        this.hexGrid.drawGrid();

        const idx = this.towers.indexOf(tower);
        if (idx >= 0) this.towers.splice(idx, 1);
        tower.destroy();

        this.audio.sellTower();
        this.deselectPlacedTower();
    }

    upgradeTower(tower) {
        const cost = tower.getUpgradeCost();
        if (cost === null || !this.state.canAfford(cost)) return;

        this.state.spend(cost);
        tower.upgrade();
        this.audio.upgradeTower();

        const pos = hexToPixel(tower.q, tower.r);
        this.particles.placeFlash(pos.x, pos.y);

        // Refresh UI
        this.hud.showSellUpgrade(tower);
        this.hexGrid.showRange(tower.q, tower.r, tower.range);
    }

    startNextWave() {
        this.state.wave++;
        if (this.state.wave > TOTAL_WAVES) {
            this.state.phase = 'victory';
            this.state.saveHighScore();
            this.audio.victory();
            this.hud.showVictory();
            return;
        }

        this.state.phase = 'wave';
        this.waveManager.startWave(this.state.wave);

        const isBoss = this.waveManager.isBossWave(this.state.wave);
        this.hud.showWaveAnnouncement(this.state.wave, isBoss);
        this.audio.waveStart();

        this.deselectPlacedTower();
    }

    spawnEnemy(type) {
        const enemy = new Enemy(type, this.entityLayer, this.state.wave);
        this.enemies.push(enemy);
    }

    createProjectile(data) {
        const proj = new Projectile(data, this.projectileLayer);
        this.projectiles.push(proj);

        // Handle instant effects
        if (proj.instant) {
            if (proj.type === 'pulse') {
                // AoE damage
                for (const enemy of this.enemies) {
                    if (!enemy.alive) continue;
                    const dx = enemy.x - proj.x;
                    const dy = enemy.y - proj.y;
                    if (Math.sqrt(dx * dx + dy * dy) <= proj.aoeRadius) {
                        const killed = enemy.takeDamage(proj.damage);
                        if (killed) {
                            this.onEnemyKilled(enemy);
                        }
                    }
                }
            } else if (proj.type === 'slow') {
                // Area slow
                for (const enemy of this.enemies) {
                    if (!enemy.alive) continue;
                    const dx = enemy.x - proj.x;
                    const dy = enemy.y - proj.y;
                    if (Math.sqrt(dx * dx + dy * dy) <= proj.range) {
                        enemy.applySlow(proj.slowFactor, proj.slowDuration);
                    }
                }
            } else if (proj.type === 'sniper') {
                // Instant hit on target
                if (proj.target && proj.target.alive) {
                    const killed = proj.target.takeDamage(proj.damage);
                    if (killed) {
                        this.onEnemyKilled(proj.target);
                    }
                }
            }
            proj.alive = false;
        }
    }

    onEnemyKilled(enemy) {
        this.state.earn(enemy.reward);
        this.particles.enemyDeath(enemy.x, enemy.y, enemy.color);
        this.particles.floatText(enemy.x, enemy.y - 15, `+${enemy.reward}`);
        this.audio.enemyDeath();

        // Splitter spawns 2 scouts
        if (enemy.type === 'splitter') {
            for (let i = 0; i < 2; i++) {
                const scout = new Enemy('scout', this.entityLayer, this.state.wave);
                scout.pathIndex = Math.max(0, enemy.pathIndex - 1);
                scout.pathProgress = enemy.pathProgress;
                scout.x = enemy.x + (Math.random() - 0.5) * 20;
                scout.y = enemy.y + (Math.random() - 0.5) * 20;
                this.enemies.push(scout);
            }
        }
    }

    update(delta) {
        const dt = delta / 60; // Convert to seconds (Pixi ticker delta is in frames at 60fps)

        if (this.state.phase === 'menu' || this.state.phase === 'gameover' || this.state.phase === 'victory') {
            this.particles.update(dt);
            return;
        }

        // Build phase timer
        if (this.state.phase === 'build') {
            this.state.buildTimer -= dt;
            if (this.state.buildTimer <= 0) {
                this.startNextWave();
            }
        }

        // Wave spawning
        if (this.state.phase === 'wave') {
            const spawnType = this.waveManager.update(dt);
            if (spawnType) {
                this.spawnEnemy(spawnType);
            }
        }

        // Update enemies
        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const enemy = this.enemies[i];
            enemy.update(dt);

            if (!enemy.alive) {
                if (enemy.reachedEnd) {
                    this.state.loseLife();
                    this.audio.enemyReachEnd();
                    this.particles.floatText(enemy.x, enemy.y, '-1', 0xff4444);
                }
                enemy.destroy();
                this.enemies.splice(i, 1);
            }
        }

        // Update towers
        for (const tower of this.towers) {
            tower.update(dt, this.enemies, (data) => this.createProjectile(data), this.particles, this.audio);
        }

        // Update projectiles
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const proj = this.projectiles[i];
            proj.update(dt);

            // Laser projectile collision
            if (proj.type === 'laser' && proj.alive) {
                for (const enemy of this.enemies) {
                    if (!enemy.alive) continue;
                    const dx = enemy.x - proj.x;
                    const dy = enemy.y - proj.y;
                    if (Math.sqrt(dx * dx + dy * dy) < enemy.size + 5) {
                        const killed = enemy.takeDamage(proj.damage);
                        if (killed) this.onEnemyKilled(enemy);
                        else this.audio.enemyHit();
                        proj.alive = false;
                        break;
                    }
                }
            }

            if (!proj.alive) {
                proj.destroy();
                this.projectiles.splice(i, 1);
            }
        }

        // Update particles
        this.particles.update(dt);

        // Check wave complete
        if (this.state.phase === 'wave' && this.waveManager.isWaveComplete(this.enemies.length)) {
            this.onWaveComplete();
        }

        // Check game over
        if (this.state.phase === 'gameover') {
            this.audio.gameOver();
            this.hud.showGameOver();
        }

        // Update HUD
        this.hud.update();
    }

    onWaveComplete() {
        this.audio.waveComplete();

        // Apply interest
        const interest = this.state.applyInterest();
        if (interest > 0) {
            this.particles.floatText(GAME_W / 2, 60, `+${interest} interest`, 0x88ffaa);
        }

        // Check victory
        if (this.state.wave >= TOTAL_WAVES) {
            this.state.phase = 'victory';
            this.state.saveHighScore();
            this.audio.victory();
            this.hud.showVictory();
            return;
        }

        // Enter build phase
        this.state.phase = 'build';
        this.state.buildTimer = BUILD_PHASE_DURATION;
        this.state.saveHighScore();
    }
}

// Boot
const game = new Game();
