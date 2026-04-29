// DesignScene: tool-based editor.
// Tools: marshal (M), barrier (B, drag), sign (S, R rotates), pa (P).
// Press ALARM (button or Enter) to commit and start sim.

const ToolKind = Object.freeze({
    CURSOR: 'cursor',
    MARSHAL: 'marshal',
    BARRIER: 'barrier',
    SIGN: 'sign',
    PA: 'pa',
});

class DesignScene extends Phaser.Scene {
    constructor() { super('DesignScene'); }

    init(data) {
        this.level = data.level;
        this.placements = new Placements();
        this.tool = ToolKind.MARSHAL;
        this.signOrientation = 'S';   // current sign rotation when placing
        this.dragStart = null;        // for barrier drag
    }

    create() {
        const W = CFG.CANVAS_W, H = CFG.CANVAS_H;
        this.cameras.main.setBackgroundColor('#0f0c29');

        // Title strip
        this.add.text(20, 8, this.level.displayName, {
            fontFamily: 'Arial Black', fontSize: '16px', color: '#fff',
        });
        this.statusText = this.add.text(20, 28, '', {
            fontFamily: 'Arial', fontSize: '10px', color: '#aaa',
        });

        // Build grid
        this.grid = buildGridFromLevel(this.level);
        this.gridLayer = this.add.graphics();
        this.placementLayer = this.add.graphics();
        this.previewLayer = this.add.graphics();
        this._computeOffsets();
        this._drawGrid();

        // Spawn-region indicator
        this.spawnLayer = this.add.graphics();
        this._drawSpawnRegion();

        // Toolbar
        this._buildToolbar();

        // Budget readout
        this.budgetText = this.add.text(W - 20, 12, '', {
            fontFamily: 'Arial', fontSize: '11px', color: '#9ad', align: 'right',
        }).setOrigin(1, 0);

        // ALARM button
        const btnX = W - 110, btnY = H - 38;
        this.alarmBtn = this.add.rectangle(btnX, btnY, 180, 50, 0xff4444, 1)
            .setStrokeStyle(3, 0x880000)
            .setInteractive({ useHandCursor: true });
        this.alarmText = this.add.text(btnX, btnY, 'ALARM', {
            fontFamily: 'Arial Black', fontSize: '22px', color: '#fff',
        }).setOrigin(0.5);
        this.alarmBtn.on('pointerover', () => this.alarmBtn.setFillStyle(0xff6666));
        this.alarmBtn.on('pointerout',  () => this.alarmBtn.setFillStyle(0xff4444));
        this.alarmBtn.on('pointerdown', () => this._tryAlarm());

        // Back button
        this.add.text(20, H - 22, '← back', {
            fontFamily: 'Arial', fontSize: '13px', color: '#aaa',
        }).setInteractive({ useHandCursor: true })
          .on('pointerdown', () => this.scene.start('MenuScene'));

        // Input
        this.input.on('pointerdown', (p) => this._onPointerDown(p));
        this.input.on('pointermove', (p) => this._onPointerMove(p));
        this.input.on('pointerup',   (p) => this._onPointerUp(p));

        // Keys
        this.input.keyboard.on('keydown-ENTER', () => this._tryAlarm());
        this.input.keyboard.on('keydown-ONE',   () => this._setTool(ToolKind.MARSHAL));
        this.input.keyboard.on('keydown-TWO',   () => this._setTool(ToolKind.BARRIER));
        this.input.keyboard.on('keydown-THREE', () => this._setTool(ToolKind.SIGN));
        this.input.keyboard.on('keydown-FOUR',  () => this._setTool(ToolKind.PA));
        this.input.keyboard.on('keydown-R',     () => {
            this.signOrientation = rotateSignDir(this.signOrientation);
            this._drawAll();
            this._updateStatus();
        });

        this._drawAll();
        this._updateStatus();

        // Tutorial intro banner (if level has one).
        if (this.level.tutorial && this.level.tutorial.intro) {
            this._showTutorialBanner(this.level.tutorial.intro);
        }
    }

    _showTutorialBanner(text) {
        const W = CFG.CANVAS_W, H = CFG.CANVAS_H;
        const overlay = this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.75)
            .setDepth(50).setInteractive({ useHandCursor: true });
        const panel = this.add.rectangle(W / 2, H / 2, 560, 280, 0x1a1a3a, 1)
            .setStrokeStyle(2, 0xfbbf24).setDepth(51);
        const heading = this.add.text(W / 2, H / 2 - 110, 'Tutorial', {
            fontFamily: 'Arial Black', fontSize: '22px', color: '#fbbf24',
        }).setOrigin(0.5).setDepth(52);
        const body = this.add.text(W / 2, H / 2 - 10, text, {
            fontFamily: 'Arial', fontSize: '14px', color: '#fff',
            align: 'center', wordWrap: { width: 520 },
        }).setOrigin(0.5).setDepth(52);
        const dismiss = this.add.text(W / 2, H / 2 + 100, 'click to begin', {
            fontFamily: 'Arial Black', fontSize: '13px', color: '#7dd3fc',
        }).setOrigin(0.5).setDepth(52);
        const dismissAll = () => {
            overlay.destroy(); panel.destroy(); heading.destroy(); body.destroy(); dismiss.destroy();
        };
        overlay.on('pointerdown', dismissAll);
    }

    _computeOffsets() {
        const cs = CFG.CELL_M, px = CFG.PIXELS_PER_METER;
        const gridW = this.level.grid.w * cs * px;
        const gridH = this.level.grid.h * cs * px;
        this.offsetX = (CFG.CANVAS_W - gridW) / 2;
        this.offsetY = CFG.HUD_HEIGHT + 16;
    }

    _buildToolbar() {
        const tools = [
            { key: ToolKind.MARSHAL, label: '1 Marshal', color: 0x60a5fa },
            { key: ToolKind.BARRIER, label: '2 Barrier', color: 0xa78bfa },
            { key: ToolKind.SIGN,    label: '3 Sign',    color: 0x4ade80 },
            { key: ToolKind.PA,      label: '4 PA',      color: 0xfbbf24 },
        ];
        this.toolButtons = [];
        const baseX = CFG.CANVAS_W / 2 - (tools.length * 90) / 2;
        const y = CFG.HUD_HEIGHT - 8;
        tools.forEach((t, i) => {
            const x = baseX + i * 90 + 40;
            const r = this.add.rectangle(x, y, 84, 24, 0x1a1a3a, 1)
                .setStrokeStyle(2, t.color)
                .setInteractive({ useHandCursor: true });
            const txt = this.add.text(x, y, t.label, {
                fontFamily: 'Arial', fontSize: '12px', color: '#fff',
            }).setOrigin(0.5);
            r.on('pointerdown', () => this._setTool(t.key));
            this.toolButtons.push({ key: t.key, rect: r, color: t.color });
        });
        this._updateToolbarHighlight();
    }

    _setTool(tool) {
        this.tool = tool;
        this.dragStart = null;
        this._updateToolbarHighlight();
        this._updateStatus();
        this._drawAll();
    }

    _updateToolbarHighlight() {
        for (const tb of this.toolButtons) {
            if (tb.key === this.tool) {
                tb.rect.setFillStyle(tb.color, 0.3);
            } else {
                tb.rect.setFillStyle(0x1a1a3a, 1);
            }
        }
    }

    _drawGrid() {
        const g = this.gridLayer;
        g.clear();
        const cs = CFG.CELL_M;
        const px = CFG.PIXELS_PER_METER;
        for (let y = 0; y < this.level.grid.h; y++) {
            for (let x = 0; x < this.level.grid.w; x++) {
                const t = this.grid.getTile(x, y);
                let color;
                if (t === Tile.WALL)      color = 0x2a2a3a;
                else if (t === Tile.EXIT) color = 0x4ade80;
                else                      color = 0xddd5c8;
                g.fillStyle(color, 1);
                g.fillRect(this.offsetX + x * cs * px, this.offsetY + y * cs * px, cs * px, cs * px);
            }
        }
        // grid lines
        g.lineStyle(1, 0x000000, 0.08);
        for (let x = 0; x <= this.level.grid.w; x++) {
            g.lineBetween(
                this.offsetX + x * cs * px, this.offsetY,
                this.offsetX + x * cs * px, this.offsetY + this.level.grid.h * cs * px);
        }
        for (let y = 0; y <= this.level.grid.h; y++) {
            g.lineBetween(
                this.offsetX, this.offsetY + y * cs * px,
                this.offsetX + this.level.grid.w * cs * px, this.offsetY + y * cs * px);
        }
    }

    _drawSpawnRegion() {
        const sp = this.level.spawn.rect;
        const cs = CFG.CELL_M, px = CFG.PIXELS_PER_METER;
        this.spawnLayer.clear();
        this.spawnLayer.lineStyle(2, 0x60a5fa, 0.5);
        this.spawnLayer.strokeRect(
            this.offsetX + sp.x0 * cs * px,
            this.offsetY + sp.y0 * cs * px,
            (sp.x1 - sp.x0) * cs * px,
            (sp.y1 - sp.y0) * cs * px
        );
    }

    _drawAll() {
        const g = this.placementLayer;
        g.clear();
        const px = CFG.PIXELS_PER_METER, cs = CFG.CELL_M;

        // Barriers — thick magenta lines along cells
        for (const b of this.placements.barriers) {
            this._drawBarrierCells(g, b);
        }
        // Marshals
        for (const m of this.placements.marshals) {
            const sx = this.offsetX + m.x * px, sy = this.offsetY + m.y * px;
            g.fillStyle(0x60a5fa, 0.12);
            g.fillCircle(sx, sy, CFG.MARSHAL_RADIUS_M * px);
            g.fillStyle(0x60a5fa, 1);
            g.fillCircle(sx, sy, 9);
            g.lineStyle(2, 0xffffff, 1);
            g.strokeCircle(sx, sy, 9);
        }
        // PA speakers
        for (const p of this.placements.pas) {
            const sx = this.offsetX + p.x * px, sy = this.offsetY + p.y * px;
            g.fillStyle(0xfbbf24, 0.10);
            g.fillCircle(sx, sy, CFG.PA_RADIUS_M * px);
            g.fillStyle(0xfbbf24, 1);
            g.fillRect(sx - 7, sy - 7, 14, 14);
            g.lineStyle(2, 0x000000, 0.6);
            g.strokeRect(sx - 7, sy - 7, 14, 14);
        }
        // Signs (with arrow indicating direction)
        for (const s of this.placements.signs) {
            this._drawSign(g, s.x, s.y, s.dir, 1.0);
        }
    }

    _drawBarrierCells(g, b) {
        const px = CFG.PIXELS_PER_METER, cs = CFG.CELL_M;
        const dx = Math.sign(b.x1 - b.x0);
        const dy = Math.sign(b.y1 - b.y0);
        let x = b.x0, y = b.y0;
        const cells = [{ x, y }];
        while (x !== b.x1 || y !== b.y1) {
            x += dx; y += dy;
            cells.push({ x, y });
        }
        g.fillStyle(0xa78bfa, 1);
        for (const c of cells) {
            g.fillRect(this.offsetX + c.x * cs * px, this.offsetY + c.y * cs * px, cs * px, cs * px);
        }
    }

    _drawSign(g, mx, my, dir, alpha) {
        const px = CFG.PIXELS_PER_METER;
        const sx = this.offsetX + mx * px, sy = this.offsetY + my * px;
        const v = SignDirVec[dir];
        // sign body
        g.fillStyle(0x4ade80, alpha);
        g.fillCircle(sx, sy, 9);
        g.lineStyle(2, 0xffffff, alpha);
        g.strokeCircle(sx, sy, 9);
        // arrow
        g.lineStyle(3, 0x064e3b, alpha);
        g.lineBetween(sx, sy, sx + v.x * 10, sy + v.y * 10);
        g.fillStyle(0x064e3b, alpha);
        // little arrowhead at the tip
        const tipX = sx + v.x * 12, tipY = sy + v.y * 12;
        g.fillTriangle(
            tipX, tipY,
            tipX - v.x * 5 + v.y * 4, tipY - v.y * 5 - v.x * 4,
            tipX - v.x * 5 - v.y * 4, tipY - v.y * 5 + v.x * 4,
        );
    }

    _onPointerDown(p) {
        // Ignore clicks on UI (alarm button area)
        if (this._isOnAlarm(p)) return;
        if (p.y < CFG.HUD_HEIGHT) return;   // toolbar area

        const wx = (p.x - this.offsetX) / CFG.PIXELS_PER_METER;
        const wy = (p.y - this.offsetY) / CFG.PIXELS_PER_METER;
        if (!this._inBounds(wx, wy)) return;

        // Try removing existing item under cursor first
        if (this._tryRemoveAt(wx, wy)) {
            window.exodusAudio?.remove();
            this._drawAll(); this._updateStatus(); return;
        }

        // Tool-specific placement
        const cx = Math.floor(wx / CFG.CELL_M);
        const cy = Math.floor(wy / CFG.CELL_M);
        let placed = false;
        switch (this.tool) {
            case ToolKind.MARSHAL:
                if (this.grid.walkable(cx, cy) && this._underBudget('marshals')) {
                    this.placements.marshals.push({ x: wx, y: wy });
                    placed = true;
                }
                break;
            case ToolKind.PA:
                if (this.grid.walkable(cx, cy) && this._underBudget('pa')) {
                    this.placements.pas.push({ x: wx, y: wy });
                    placed = true;
                }
                break;
            case ToolKind.SIGN:
                if (this._underBudget('signs')) {
                    this.placements.signs.push({ x: wx, y: wy, dir: this.signOrientation });
                    placed = true;
                }
                break;
            case ToolKind.BARRIER:
                this.dragStart = { cx, cy };
                break;
        }
        if (placed) window.exodusAudio?.place();
        else if (this.tool !== ToolKind.BARRIER) window.exodusAudio?.error();
        this._drawAll(); this._updateStatus();
    }

    _onPointerMove(p) {
        // Only matters when actively dragging a barrier
        const g = this.previewLayer;
        g.clear();
        if (this.tool === ToolKind.BARRIER && this.dragStart) {
            const wx = (p.x - this.offsetX) / CFG.PIXELS_PER_METER;
            const wy = (p.y - this.offsetY) / CFG.PIXELS_PER_METER;
            const cx = Math.floor(wx / CFG.CELL_M);
            const cy = Math.floor(wy / CFG.CELL_M);
            const seg = this._snapBarrier(this.dragStart.cx, this.dragStart.cy, cx, cy);
            if (seg) {
                g.fillStyle(0xa78bfa, 0.5);
                const cs = CFG.CELL_M, px = CFG.PIXELS_PER_METER;
                const dx = Math.sign(seg.x1 - seg.x0);
                const dy = Math.sign(seg.y1 - seg.y0);
                let x = seg.x0, y = seg.y0;
                while (true) {
                    g.fillRect(this.offsetX + x * cs * px, this.offsetY + y * cs * px, cs * px, cs * px);
                    if (x === seg.x1 && y === seg.y1) break;
                    x += dx; y += dy;
                }
            }
        } else if (this.tool === ToolKind.SIGN) {
            // Live preview of sign at cursor
            const wx = (p.x - this.offsetX) / CFG.PIXELS_PER_METER;
            const wy = (p.y - this.offsetY) / CFG.PIXELS_PER_METER;
            if (this._inBounds(wx, wy)) this._drawSign(g, wx, wy, this.signOrientation, 0.5);
        }
    }

    _onPointerUp(p) {
        if (this.tool === ToolKind.BARRIER && this.dragStart) {
            const wx = (p.x - this.offsetX) / CFG.PIXELS_PER_METER;
            const wy = (p.y - this.offsetY) / CFG.PIXELS_PER_METER;
            const cx = Math.floor(wx / CFG.CELL_M);
            const cy = Math.floor(wy / CFG.CELL_M);
            const seg = this._snapBarrier(this.dragStart.cx, this.dragStart.cy, cx, cy);
            if (seg) {
                const len = Math.max(Math.abs(seg.x1 - seg.x0), Math.abs(seg.y1 - seg.y0)) + 1;
                if (this._underBudget('barrier_units', len)) {
                    // verify all cells walkable currently
                    const dx = Math.sign(seg.x1 - seg.x0);
                    const dy = Math.sign(seg.y1 - seg.y0);
                    let x = seg.x0, y = seg.y0, ok = true;
                    while (true) {
                        if (!this.grid.walkable(x, y)) { ok = false; break; }
                        if (x === seg.x1 && y === seg.y1) break;
                        x += dx; y += dy;
                    }
                    if (ok) {
                        this.placements.barriers.push(seg);
                        window.exodusAudio?.place();
                    } else {
                        window.exodusAudio?.error();
                    }
                }
            }
            this.dragStart = null;
            this.previewLayer.clear();
            this._drawAll();
            this._updateStatus();
        }
    }

    _snapBarrier(x0, y0, x1, y1) {
        // Snap to axis-aligned: keep the dimension with the larger delta.
        const dx = Math.abs(x1 - x0);
        const dy = Math.abs(y1 - y0);
        if (dx === 0 && dy === 0) return null;
        if (dx >= dy) return { x0, y0, x1, y1: y0 };
        return { x0, y0, x1: x0, y1 };
    }

    _isOnAlarm(p) {
        return p.x > CFG.CANVAS_W - 200 && p.y > CFG.CANVAS_H - 64;
    }

    _inBounds(wx, wy) {
        return wx >= 0 && wy >= 0
            && wx <= this.level.grid.w * CFG.CELL_M
            && wy <= this.level.grid.h * CFG.CELL_M;
    }

    _tryRemoveAt(wx, wy) {
        // Marshals
        for (let i = this.placements.marshals.length - 1; i >= 0; i--) {
            const m = this.placements.marshals[i];
            if (Math.hypot(m.x - wx, m.y - wy) < 0.6) {
                this.placements.marshals.splice(i, 1); return true;
            }
        }
        // PAs
        for (let i = this.placements.pas.length - 1; i >= 0; i--) {
            const p = this.placements.pas[i];
            if (Math.hypot(p.x - wx, p.y - wy) < 0.6) {
                this.placements.pas.splice(i, 1); return true;
            }
        }
        // Signs
        for (let i = this.placements.signs.length - 1; i >= 0; i--) {
            const s = this.placements.signs[i];
            if (Math.hypot(s.x - wx, s.y - wy) < 0.6) {
                this.placements.signs.splice(i, 1); return true;
            }
        }
        // Barriers — check if cursor lands on any barrier cell
        const cx = Math.floor(wx / CFG.CELL_M);
        const cy = Math.floor(wy / CFG.CELL_M);
        for (let i = this.placements.barriers.length - 1; i >= 0; i--) {
            const b = this.placements.barriers[i];
            const dx = Math.sign(b.x1 - b.x0);
            const dy = Math.sign(b.y1 - b.y0);
            let x = b.x0, y = b.y0, hit = false;
            while (true) {
                if (x === cx && y === cy) { hit = true; break; }
                if (x === b.x1 && y === b.y1) break;
                x += dx; y += dy;
            }
            if (hit) {
                this.placements.barriers.splice(i, 1); return true;
            }
        }
        return false;
    }

    _underBudget(key, qty = 1) {
        const cap = this.level.budget[key] || 0;
        const used = this.placements.cost()[key] || 0;
        return used + qty <= cap;
    }

    _updateStatus() {
        const cost = this.placements.cost();
        const b = this.level.budget;
        const hint = this.tool === ToolKind.BARRIER ? 'drag to place a wall'
                   : this.tool === ToolKind.SIGN    ? 'click to place — R rotates ▸ ' + this.signOrientation
                                                    : 'click to place — click on item to remove';
        this.statusText.setText(`Tool: ${this.tool.toUpperCase()}  ·  ${hint}`);
        this.budgetText.setText(
            `marshal ${cost.marshals}/${b.marshals}   ` +
            `barrier ${cost.barrier_units}/${b.barrier_units}   ` +
            `sign ${cost.signs}/${b.signs}   ` +
            `PA ${cost.pa}/${b.pa}`
        );
    }

    _tryAlarm() {
        // Apply barriers to a temp grid clone for validation
        const tempGrid = buildGridFromLevel(this.level);
        this.placements.applyBarriersToGrid(tempGrid);

        const sp = this.level.spawn.rect;
        const cs = CFG.CELL_M;
        const cx = ((sp.x0 + sp.x1) / 2) * cs;
        const cy = ((sp.y0 + sp.y1) / 2) * cs;
        if (!tempGrid.reachableFrom(cx, cy)) {
            this.statusText.setColor('#ff8080');
            this.statusText.setText('INVALID: barriers have orphaned the spawn region. Remove some.');
            return;
        }

        this.scene.start('SimScene', {
            level: this.level,
            placements: this.placements,
            offsetX: this.offsetX,
            offsetY: this.offsetY,
        });
    }
}
