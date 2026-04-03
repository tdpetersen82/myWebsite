// Fantastic Contraption — UI Manager
class UIManager {
    constructor() {
        this.selectedTool = CONFIG.PART_CW_WHEEL;
        this.onToolSelect = null;
        this.onPlay = null;
        this.onReset = null;
        this.onUndo = null;
        this.onRedo = null;
        this.onClear = null;
        this.onLevelSelect = null;
        this.onBackToMenu = null;
        this.onToggleMute = null;

        this._buildPalette();
        this._buildToolbar();
        this._buildLevelSelect();
        this._buildLevelComplete();
    }

    _buildPalette() {
        this.palette = document.getElementById('part-palette');
        const tools = [
            { type: CONFIG.PART_CW_WHEEL, label: 'CW Wheel', icon: '⟳', color: CONFIG.COLOR_CW_WHEEL },
            { type: CONFIG.PART_CCW_WHEEL, label: 'CCW Wheel', icon: '⟲', color: CONFIG.COLOR_CCW_WHEEL },
            { type: CONFIG.PART_FREE_WHEEL, label: 'Wheel', icon: '○', color: CONFIG.COLOR_FREE_WHEEL },
            { type: CONFIG.PART_ROD, label: 'Rod', icon: '─', color: CONFIG.COLOR_ROD },
            { type: CONFIG.PART_WATER_ROD, label: 'Water Rod', icon: '~', color: '#74b9ff' },
            { type: CONFIG.TOOL_DELETE, label: 'Delete', icon: '✕', color: '#d63031' }
        ];

        for (const tool of tools) {
            const btn = document.createElement('button');
            btn.className = 'palette-btn';
            btn.dataset.tool = tool.type;
            btn.innerHTML = `<span class="palette-icon" style="color:${tool.color}">${tool.icon}</span><span class="palette-label">${tool.label}</span>`;
            btn.addEventListener('click', () => {
                this.selectTool(tool.type);
            });
            this.palette.appendChild(btn);
        }

        this.selectTool(this.selectedTool);
    }

    _buildToolbar() {
        this.playBtn = document.getElementById('btn-play');
        this.resetBtn = document.getElementById('btn-reset');
        this.undoBtn = document.getElementById('btn-undo');
        this.redoBtn = document.getElementById('btn-redo');
        this.clearBtn = document.getElementById('btn-clear');
        this.muteBtn = document.getElementById('btn-mute');
        this.backBtn = document.getElementById('btn-back');
        this.levelNameEl = document.getElementById('level-name');

        this.playBtn.addEventListener('click', () => { if (this.onPlay) this.onPlay(); });
        this.resetBtn.addEventListener('click', () => { if (this.onReset) this.onReset(); });
        this.undoBtn.addEventListener('click', () => { if (this.onUndo) this.onUndo(); });
        this.redoBtn.addEventListener('click', () => { if (this.onRedo) this.onRedo(); });
        this.clearBtn.addEventListener('click', () => { if (this.onClear) this.onClear(); });
        this.muteBtn.addEventListener('click', () => { if (this.onToggleMute) this.onToggleMute(); });
        this.backBtn.addEventListener('click', () => { if (this.onBackToMenu) this.onBackToMenu(); });
    }

    _buildLevelSelect() {
        this.levelSelectOverlay = document.getElementById('level-select-overlay');
        this.levelGrid = document.getElementById('level-grid');
    }

    _buildLevelComplete() {
        this.levelCompleteOverlay = document.getElementById('level-complete-overlay');
        this.completeTitle = document.getElementById('complete-title');
        this.nextLevelBtn = document.getElementById('btn-next-level');
        this.backToLevelsBtn = document.getElementById('btn-back-to-levels');

        this.nextLevelBtn.addEventListener('click', () => {
            this.hideLevelComplete();
            if (this._nextLevelCallback) this._nextLevelCallback();
        });
        this.backToLevelsBtn.addEventListener('click', () => {
            this.hideLevelComplete();
            if (this.onBackToMenu) this.onBackToMenu();
        });
    }

    selectTool(type) {
        this.selectedTool = type;
        const btns = this.palette.querySelectorAll('.palette-btn');
        btns.forEach(b => b.classList.toggle('active', b.dataset.tool === type));
        if (this.onToolSelect) this.onToolSelect(type);
    }

    setSimulating(isSimulating) {
        this.playBtn.textContent = isSimulating ? '⏸ Pause' : '▶ Play';
        this.palette.classList.toggle('disabled', isSimulating);
        this.undoBtn.disabled = isSimulating;
        this.redoBtn.disabled = isSimulating;
        this.clearBtn.disabled = isSimulating;
    }

    setLevelName(name) {
        this.levelNameEl.textContent = name;
    }

    showLevelSelect(levels, completedLevels) {
        this.levelGrid.innerHTML = '';
        for (const level of levels) {
            const btn = document.createElement('button');
            btn.className = 'level-btn';
            if (completedLevels.includes(level.id)) {
                btn.classList.add('completed');
            }
            btn.innerHTML = `<span class="level-num">${level.id}</span><span class="level-title">${level.name}</span>`;
            btn.addEventListener('click', () => {
                if (this.onLevelSelect) this.onLevelSelect(level);
            });
            this.levelGrid.appendChild(btn);
        }
        this.levelSelectOverlay.classList.add('visible');
    }

    hideLevelSelect() {
        this.levelSelectOverlay.classList.remove('visible');
    }

    showLevelComplete(levelName, nextCallback) {
        this.completeTitle.textContent = `${levelName} Complete!`;
        this._nextLevelCallback = nextCallback;
        this.levelCompleteOverlay.classList.add('visible');
    }

    hideLevelComplete() {
        this.levelCompleteOverlay.classList.remove('visible');
    }

    showBuildUI() {
        document.getElementById('game-ui').classList.add('visible');
    }

    hideBuildUI() {
        document.getElementById('game-ui').classList.remove('visible');
    }

    updateMuteBtn(muted) {
        this.muteBtn.textContent = muted ? '🔇' : '🔊';
    }
}
