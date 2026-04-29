// DebugOverlay: visualizers + slow-mo + step + perf graph.
// Owned by SimScene. Toggles with F1, F3, F6, F7, F9. F10 toggles all.

class DebugOverlay {
    constructor(scene) {
        this.scene = scene;
        this.flags = {
            flow: false, vision: false, perf: false,
        };
        this.paused = false;
        this.slow = false;
        this.simMs = 0;
        this.renderMs = 0;
        this.frameLog = [];   // ring buffer of last 60 frames

        // Agent inspector
        this.inspectMode = false;
        this.inspectedAgent = null;
        this._inspectPanel = null;

        const kbd = scene.input.keyboard;
        kbd.on('keydown-F1',  () => this._tog('flow'));
        kbd.on('keydown-F3',  () => this._tog('vision'));
        kbd.on('keydown-F6',  () => { this.slow = !this.slow; });
        kbd.on('keydown-F7',  () => { this.paused = !this.paused; });
        kbd.on('keydown-F8',  () => this._toggleInspect());
        kbd.on('keydown-F9',  () => this._tog('perf'));
        kbd.on('keydown-F10', () => this._togAll());
        kbd.on('keydown-PERIOD', () => {
            if (this.paused) {
                // single-frame step: advance one sim tick
                this.scene.crowd.tick(this.scene.simStep);
                this.scene.simTime += this.scene.simStep;
            }
        });

        // Click handler — when in inspect mode, clicking near an agent inspects it
        scene.input.on('pointerdown', (p) => {
            if (!this.inspectMode) return;
            // Don't catch clicks on the panel itself
            if (this._inspectPanel && p.x > CFG.CANVAS_W - 240) return;
            const wx = (p.x - this.scene.offsetX) / CFG.PIXELS_PER_METER;
            const wy = (p.y - this.scene.offsetY) / CFG.PIXELS_PER_METER;
            let nearest = null, bestD2 = 1.5;   // 1.5m radius
            for (const a of this.scene.agents) {
                if (a.state === 'ESCAPED') continue;
                const dx = a.x - wx, dy = a.y - wy;
                const d2 = dx * dx + dy * dy;
                if (d2 < bestD2) { bestD2 = d2; nearest = a; }
            }
            this.inspectedAgent = nearest;
        });
    }

    _toggleInspect() {
        this.inspectMode = !this.inspectMode;
        if (!this.inspectMode) {
            this.inspectedAgent = null;
            if (this._inspectPanel) {
                this._inspectPanel.bg?.destroy();
                this._inspectPanel.txt?.destroy();
                this._inspectPanel = null;
            }
        }
    }

    _tog(k)    { this.flags[k] = !this.flags[k]; }
    _togAll()  {
        const any = Object.values(this.flags).some(v => v);
        const target = !any;
        for (const k of Object.keys(this.flags)) this.flags[k] = target;
    }

    speedScale() { return this.slow ? 0.25 : 1; }

    recordPerf(simMs, renderMs) {
        this.simMs = simMs; this.renderMs = renderMs;
        this.frameLog.push({ s: simMs, r: renderMs });
        if (this.frameLog.length > 60) this.frameLog.shift();
    }

    draw() {
        const g = this.scene.debugLayer;
        g.clear();
        const cs = CFG.CELL_M, px = CFG.PIXELS_PER_METER;
        const ox = this.scene.offsetX, oy = this.scene.offsetY;
        const grid = this.scene.grid;
        const ff = this.scene.crowd?.flowField;

        // F1 — flow field arrows
        if (this.flags.flow && ff) {
            g.lineStyle(1, 0x00ffff, 0.7);
            for (let y = 0; y < grid.h; y += 1) {
                for (let x = 0; x < grid.w; x += 1) {
                    if (!grid.walkable(x, y)) continue;
                    const i = y * grid.w + x;
                    const fx = ff.fx[i], fy = ff.fy[i];
                    if (fx === 0 && fy === 0) continue;
                    const cxp = ox + (x + 0.5) * cs * px;
                    const cyp = oy + (y + 0.5) * cs * px;
                    const ax = cxp + fx * 7;
                    const ay = cyp + fy * 7;
                    g.lineBetween(cxp, cyp, ax, ay);
                    g.fillStyle(0x00ffff, 0.7);
                    g.fillCircle(ax, ay, 2);
                }
            }
        }

        // F3 — vision cones (stroke only — fill would stack to a yellow flood)
        if (this.flags.vision) {
            g.lineStyle(1, 0xffff00, 0.45);
            for (const a of this.scene.agents) {
                if (a.state === 'ESCAPED' || a.state === 'INJURED') continue;
                const sx = ox + a.x * px;
                const sy = oy + a.y * px;
                g.strokeCircle(sx, sy, a.visionRange * px);
            }
        }

        // F9 — perf graph (top-right corner)
        if (this.flags.perf) {
            const W = 160, H = 60, x0 = CFG.CANVAS_W - W - 10, y0 = CFG.HUD_HEIGHT + 4;
            g.fillStyle(0x000000, 0.6);
            g.fillRect(x0, y0, W, H);
            g.lineStyle(1, 0xffffff, 0.4);
            g.strokeRect(x0, y0, W, H);
            // y axis: 0..16ms
            const maxMs = 20;
            for (let i = 0; i < this.frameLog.length; i++) {
                const f = this.frameLog[i];
                const px2 = x0 + (i / 60) * W;
                const wpx = W / 60;
                const sH = (f.s / maxMs) * H;
                const rH = (f.r / maxMs) * H;
                g.fillStyle(0x4ade80, 0.8); g.fillRect(px2, y0 + H - sH, wpx, sH);
                g.fillStyle(0xfbbf24, 0.5); g.fillRect(px2, y0 + H - sH - rH, wpx, rH);
            }
            // labels
            this._perfTextRefresh(x0, y0);
        } else {
            if (this._perfText) { this._perfText.destroy(); this._perfText = null; }
        }

        // Pause / slow indicator
        if (this.paused || this.slow) {
            this._stateTextRefresh();
        } else if (this._stateText) {
            this._stateText.destroy(); this._stateText = null;
        }

        // F8 — agent inspector
        if (this.inspectMode) {
            this._inspectorRefresh();
            // ring around inspected agent
            if (this.inspectedAgent && this.inspectedAgent.state !== 'ESCAPED') {
                const a = this.inspectedAgent;
                const sx = ox + a.x * px;
                const sy = oy + a.y * px;
                g.lineStyle(2, 0xffd700, 1);
                g.strokeCircle(sx, sy, 12);
            }
        } else if (this._inspectPanel) {
            this._inspectPanel.bg?.destroy();
            this._inspectPanel.txt?.destroy();
            this._inspectPanel = null;
        }
    }

    _inspectorRefresh() {
        const a = this.inspectedAgent;
        const W = 220, H = 230;
        const x0 = CFG.CANVAS_W - W - 8;
        const y0 = CFG.HUD_HEIGHT + 8;
        let body;
        if (!a) {
            body = 'F8 INSPECT MODE\n\nclick on an agent to inspect.\n(F8 to exit)';
        } else {
            const groupCount = a.group >= 0
                ? this.scene.agents.filter(o => o.group === a.group && o.state !== 'ESCAPED').length
                : 0;
            body =
                `Agent #${a.id}\n` +
                `Type:     ${a.type}\n` +
                `State:    ${a.state}\n` +
                `Pos:      (${a.x.toFixed(1)}, ${a.y.toFixed(1)})\n` +
                `Vel:      (${a.vx.toFixed(2)}, ${a.vy.toFixed(2)})\n` +
                `Speed:    ${Math.hypot(a.vx, a.vy).toFixed(2)} m/s\n` +
                `Panic:    ${a.panic.toFixed(2)}\n` +
                `Vision:   ${a.visionRange.toFixed(1)} m\n` +
                `Mobility: ${a.mobility.toFixed(2)}\n` +
                `Awareness:${a.awareness.toFixed(2)}\n` +
                `Group:    ${a.group >= 0 ? `#${a.group} (${groupCount} alive)` : 'solo'}\n` +
                `Bias:     ${this.scene.simTime < a.biasUntil ? `(${a.biasX.toFixed(1)},${a.biasY.toFixed(1)})` : 'none'}`;
        }
        if (!this._inspectPanel) {
            const bg = this.scene.add.rectangle(x0 + W / 2, y0 + H / 2, W, H, 0x000000, 0.78)
                .setStrokeStyle(2, 0xffd700)
                .setDepth(22);
            const txt = this.scene.add.text(x0 + 8, y0 + 8, body, {
                fontFamily: 'monospace', fontSize: '11px', color: '#fff',
            }).setDepth(23);
            this._inspectPanel = { bg, txt };
        } else {
            this._inspectPanel.txt.setText(body);
            this._inspectPanel.bg.setPosition(x0 + W / 2, y0 + H / 2);
            this._inspectPanel.txt.setPosition(x0 + 8, y0 + 8);
        }
    }

    _perfTextRefresh(x, y) {
        const txt = `sim ${this.simMs.toFixed(1)}ms · render ${this.renderMs.toFixed(1)}ms · fps ${this.scene.game.loop.actualFps.toFixed(0)}`;
        if (!this._perfText) {
            this._perfText = this.scene.add.text(x + 4, y + 4, txt, {
                fontFamily: 'monospace', fontSize: '10px', color: '#fff',
            }).setDepth(21);
        } else {
            this._perfText.setText(txt);
            this._perfText.setPosition(x + 4, y + 4);
        }
    }

    _stateTextRefresh() {
        const label =
            this.paused ? '⏸ PAUSED  (F7 resume · . step)' :
            this.slow   ? '⏪ SLOW-MO 0.25×  (F6 toggle)' : '';
        if (!this._stateText) {
            this._stateText = this.scene.add.text(CFG.CANVAS_W / 2, CFG.CANVAS_H - 20, label, {
                fontFamily: 'Arial Black', fontSize: '14px', color: '#fbbf24',
                backgroundColor: '#000', padding: { x: 8, y: 4 },
            }).setOrigin(0.5).setDepth(21);
        } else {
            this._stateText.setText(label);
        }
    }
}
