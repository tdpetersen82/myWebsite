// Fantastic Contraption — Game Orchestrator
class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.wrapper = document.getElementById('game-wrapper');

        this.physics = new PhysicsEngine();
        this.renderer = new Renderer(this.canvas);
        this.input = new InputManager(this.canvas, () => this._getScale());
        this.build = new BuildSystem(this.physics);
        this.levels = new LevelManager(this.physics);
        this.ui = new UIManager();
        this.audio = new AudioManager();

        this.state = CONFIG.STATE_LEVEL_SELECT;
        this.currentTool = CONFIG.PART_CW_WHEEL;
        this.ghostPos = null;
        this.dragStart = null;

        this._setupCallbacks();
        this._setupCollisions();
        this._setupKeyboard();
        this._autoScale();
        window.addEventListener('resize', () => this._autoScale());

        this.ui.updateMuteBtn(this.audio.muted);
        this.showLevelSelect();

        requestAnimationFrame(() => this._loop());
    }

    _getScale() {
        const rect = this.canvas.getBoundingClientRect();
        return rect.width / CONFIG.CANVAS_WIDTH;
    }

    _autoScale() {
        const navH = 50;
        const maxW = window.innerWidth - 20;
        const maxH = window.innerHeight - navH - 20;
        const scaleW = maxW / CONFIG.CANVAS_WIDTH;
        const scaleH = maxH / CONFIG.CANVAS_HEIGHT;
        const scale = Math.min(scaleW, scaleH, 1);
        this.wrapper.style.transform = `scale(${scale})`;
        this.wrapper.style.transformOrigin = 'top left';
        // Center horizontally by setting left margin
        const scaledW = CONFIG.CANVAS_WIDTH * scale;
        const left = Math.max(0, (window.innerWidth - scaledW) / 2);
        this.wrapper.style.position = 'fixed';
        this.wrapper.style.left = left + 'px';
        this.wrapper.style.top = navH + 'px';
    }

    _setupCallbacks() {
        // Input
        this.input.onClick = (pos) => this._handleClick(pos);
        this.input.onDragStart = (pos) => this._handleDragStart(pos);
        this.input.onDragMove = (pos) => this._handleDragMove(pos);
        this.input.onDragEnd = (pos) => this._handleDragEnd(pos);
        this.input.onRightClick = (pos) => this._handleRightClick(pos);

        // UI
        this.ui.onToolSelect = (type) => { this.currentTool = type; };
        this.ui.onPlay = () => this._toggleSimulation();
        this.ui.onReset = () => this._resetSimulation();
        this.ui.onUndo = () => { this.build.undo(); this.audio.playClick(); };
        this.ui.onRedo = () => { this.build.redo(); this.audio.playClick(); };
        this.ui.onClear = () => { this.build.clearAll(); this.audio.playDelete(); };
        this.ui.onLevelSelect = (level) => this._startLevel(level);
        this.ui.onBackToMenu = () => this.showLevelSelect();
        this.ui.onToggleMute = () => {
            const muted = this.audio.toggleMute();
            this.ui.updateMuteBtn(muted);
        };
    }

    _setupCollisions() {
        this.physics.onCollisionStart((event) => {
            if (this.state === CONFIG.STATE_SIMULATE) {
                this.levels.handleCollisionStart(event.pairs);
            }
        });
        this.physics.onCollisionEnd((event) => {
            if (this.state === CONFIG.STATE_SIMULATE) {
                this.levels.handleCollisionEnd(event.pairs);
            }
        });
    }

    _setupKeyboard() {
        document.addEventListener('keydown', (e) => {
            if (this.state === CONFIG.STATE_LEVEL_SELECT) return;
            switch (e.key) {
                case ' ':
                    e.preventDefault();
                    this._toggleSimulation();
                    break;
                case 'r':
                    this._resetSimulation();
                    break;
                case 'z':
                    if (e.ctrlKey || e.metaKey) {
                        e.preventDefault();
                        if (e.shiftKey) this.build.redo();
                        else this.build.undo();
                    }
                    break;
                case 'y':
                    if (e.ctrlKey || e.metaKey) {
                        e.preventDefault();
                        this.build.redo();
                    }
                    break;
                case '1': this.ui.selectTool(CONFIG.PART_CW_WHEEL); break;
                case '2': this.ui.selectTool(CONFIG.PART_CCW_WHEEL); break;
                case '3': this.ui.selectTool(CONFIG.PART_FREE_WHEEL); break;
                case '4': this.ui.selectTool(CONFIG.PART_ROD); break;
                case '5': this.ui.selectTool(CONFIG.PART_WATER_ROD); break;
                case 'd': this.ui.selectTool(CONFIG.TOOL_DELETE); break;
                case 'Escape': this.showLevelSelect(); break;
                case 'm':
                    const muted = this.audio.toggleMute();
                    this.ui.updateMuteBtn(muted);
                    break;
            }
        });
    }

    showLevelSelect() {
        if (this.state === CONFIG.STATE_SIMULATE) {
            this._resetSimulation();
        }
        this.state = CONFIG.STATE_LEVEL_SELECT;
        this.ui.hideBuildUI();
        this.ui.showLevelSelect(LEVELS, this.levels.completedLevels);
    }

    _startLevel(levelDef) {
        this.build.clearAll();
        this.levels.loadLevel(levelDef);
        this.state = CONFIG.STATE_BUILD;
        this.ui.hideLevelSelect();
        this.ui.hideLevelComplete();
        this.ui.showBuildUI();
        this.ui.setLevelName(`${levelDef.id}. ${levelDef.name}`);
        this.ui.setSimulating(false);
    }

    _toggleSimulation() {
        if (this.state === CONFIG.STATE_BUILD) {
            this.state = CONFIG.STATE_SIMULATE;
            this.build.startSimulation();
            this.levels.startSimulation();
            this.physics.start();
            this.ui.setSimulating(true);
            this.audio.playStart();
        } else if (this.state === CONFIG.STATE_SIMULATE) {
            this._resetSimulation();
        }
    }

    _resetSimulation() {
        if (this.state === CONFIG.STATE_SIMULATE || this.state === CONFIG.STATE_COMPLETE) {
            this.physics.stop();
            this.build.stopSimulation();
            this.levels.stopSimulation();
            this.state = CONFIG.STATE_BUILD;
            this.ui.setSimulating(false);
            this.audio.playStop();
        }
    }

    _handleClick(pos) {
        if (this.state !== CONFIG.STATE_BUILD) return;

        if (this.currentTool === CONFIG.TOOL_DELETE) {
            const deleted = this.build.deletePartAtPoint(pos);
            if (deleted) this.audio.playDelete();
            return;
        }

        if (PartFactory.isWheelType(this.currentTool)) {
            // Allow placing in build zone or snapping to existing parts
            if (this.levels.isInBuildZone(pos.x, pos.y) || this.build.findSnap(pos)) {
                const part = this.build.placeWheel(pos.x, pos.y, this.currentTool);
                if (part) {
                    const snap = this.build.findSnap(pos);
                    if (snap) this.audio.playSnap();
                    else this.audio.playPlace();
                }
            }
        }
    }

    _handleDragStart(pos) {
        if (this.state !== CONFIG.STATE_BUILD) return;
        if (PartFactory.isRodType(this.currentTool)) {
            if (this.levels.isInBuildZone(pos.x, pos.y) || this.build.findSnap(pos)) {
                this.dragStart = { x: pos.x, y: pos.y };
                const snap = this.build.findSnap(pos);
                if (snap) {
                    this.dragStart = { x: snap.worldPos.x, y: snap.worldPos.y };
                }
            }
        }
    }

    _handleDragMove(pos) {
        if (this.state !== CONFIG.STATE_BUILD) return;
        this.ghostPos = pos;
    }

    _handleDragEnd(pos) {
        if (this.state !== CONFIG.STATE_BUILD) return;
        this.ghostPos = null;

        if (this.dragStart && PartFactory.isRodType(this.currentTool)) {
            const isWater = this.currentTool === CONFIG.PART_WATER_ROD;
            const part = this.build.placeRod(
                this.dragStart.x, this.dragStart.y,
                pos.x, pos.y, isWater
            );
            if (part) this.audio.playPlace();
        }
        this.dragStart = null;
    }

    _handleRightClick(pos) {
        if (this.state !== CONFIG.STATE_BUILD) return;
        const deleted = this.build.deletePartAtPoint(pos);
        if (deleted) this.audio.playDelete();
    }

    _loop() {
        // Physics step
        if (this.state === CONFIG.STATE_SIMULATE) {
            this.physics.step();
            this.build.applyMotors();

            // Check goal
            if (this.levels.checkCompletion()) {
                this._onLevelComplete();
            }

            // Check if payload fell off
            if (this.levels.isPayloadLost()) {
                this._resetSimulation();
            }
        }

        // Render
        this._render();

        requestAnimationFrame(() => this._loop());
    }

    _render() {
        this.renderer.clear();

        if (this.state === CONFIG.STATE_LEVEL_SELECT) {
            this._renderTitle();
            return;
        }

        // Draw zones
        if (this.levels.buildZone) {
            this.renderer.drawZone(
                this.levels.buildZone,
                CONFIG.COLOR_BUILD_ZONE,
                CONFIG.COLOR_BUILD_ZONE_BORDER,
                'BUILD ZONE'
            );
            if (this.state === CONFIG.STATE_BUILD) {
                this.renderer.drawGrid(this.levels.buildZone);
            }
        }
        if (this.levels.goalZone) {
            this.renderer.drawZone(
                this.levels.goalZone,
                CONFIG.COLOR_GOAL_ZONE,
                CONFIG.COLOR_GOAL_ZONE_BORDER,
                'GOAL'
            );
        }

        // Terrain
        this.renderer.drawTerrain(this.levels.terrainBodies);

        // Parts
        for (const part of this.build.parts) {
            this.renderer.drawPart(part);
        }
        this.renderer.drawJoints(this.build.parts);

        // Payload
        if (this.levels.payloadBody) {
            this.renderer.drawPayload(this.levels.payloadBody);
        }

        // Ghost preview (build mode only)
        if (this.state === CONFIG.STATE_BUILD) {
            const mousePos = this.input.mousePos;

            // Show snap indicator
            const snap = this.build.findSnap(mousePos);
            if (snap) {
                this.renderer.drawSnapIndicator(snap.worldPos);
            }

            // Ghost for wheels
            if (PartFactory.isWheelType(this.currentTool) && !this.input.isDragging) {
                const gPos = snap ? snap.worldPos : mousePos;
                this.renderer.drawGhostWheel(gPos, this.currentTool);
            }

            // Ghost for rods while dragging
            if (this.dragStart && this.ghostPos && PartFactory.isRodType(this.currentTool)) {
                const endSnap = this.build.findSnap(this.ghostPos);
                const endPos = endSnap ? endSnap.worldPos : this.ghostPos;
                this.renderer.drawGhostRod(
                    this.dragStart, endPos,
                    this.currentTool === CONFIG.PART_WATER_ROD
                );
                if (endSnap) {
                    this.renderer.drawSnapIndicator(endSnap.worldPos);
                }
            }
        }
    }

    _renderTitle() {
        const ctx = this.renderer.ctx;
        ctx.fillStyle = '#2d3436';
        ctx.font = 'bold 48px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Fantastic Contraption', CONFIG.CANVAS_WIDTH / 2, 200);
        ctx.font = '20px sans-serif';
        ctx.fillStyle = '#636e72';
        ctx.fillText('Build machines to move the pink ball to the goal!', CONFIG.CANVAS_WIDTH / 2, 260);
    }

    _onLevelComplete() {
        this.physics.stop();
        this.state = CONFIG.STATE_COMPLETE;
        this.audio.playComplete();

        const levelDef = this.levels.currentLevel;
        this.levels.markComplete(levelDef.id);

        const nextLevel = LEVELS.find(l => l.id === levelDef.id + 1);
        this.ui.showLevelComplete(
            levelDef.name,
            nextLevel ? () => this._startLevel(nextLevel) : null
        );

        if (!nextLevel) {
            this.ui.nextLevelBtn.style.display = 'none';
        } else {
            this.ui.nextLevelBtn.style.display = '';
        }
    }
}

// Boot
window.addEventListener('DOMContentLoaded', () => {
    window.game = new Game();
});
