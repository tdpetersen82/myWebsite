// DesignScene: shows the venue. Player places marshals (up to budget).
// Press ALARM (button or Enter) to commit and start sim.

class DesignScene extends Phaser.Scene {
    constructor() { super('DesignScene'); }

    init(data) {
        this.level = data.level;
        this.marshals = [];          // [{x, y}] in meters
    }

    create() {
        const W = CFG.CANVAS_W, H = CFG.CANVAS_H;
        this.cameras.main.setBackgroundColor('#0f0c29');

        // Title strip
        this.add.text(20, 16, this.level.displayName, {
            fontFamily: 'Arial Black', fontSize: '20px', color: '#fff',
        });
        this.statusText = this.add.text(20, 40, '', {
            fontFamily: 'Arial', fontSize: '12px', color: '#aaa',
        });

        // Build grid + level layer
        this.grid = buildGridFromLevel(this.level);
        this.gridLayer = this.add.graphics();
        this.marshalLayer = this.add.graphics();
        this._drawGrid();

        // Spawn-region indicator (so player knows where people start)
        this.spawnLayer = this.add.graphics();
        this._drawSpawnRegion();

        // ALARM button
        const btnX = W - 120, btnY = H - 50;
        this.alarmBtn = this.add.rectangle(btnX, btnY, 200, 60, 0xff4444, 1)
            .setStrokeStyle(3, 0x880000)
            .setInteractive({ useHandCursor: true });
        this.alarmText = this.add.text(btnX, btnY, 'ALARM', {
            fontFamily: 'Arial Black', fontSize: '24px', color: '#fff',
        }).setOrigin(0.5);
        this.alarmBtn.on('pointerover', () => this.alarmBtn.setFillStyle(0xff6666));
        this.alarmBtn.on('pointerout',  () => this.alarmBtn.setFillStyle(0xff4444));
        this.alarmBtn.on('pointerdown', () => this._tryAlarm());

        // Back button
        this.add.text(20, H - 30, '← back', {
            fontFamily: 'Arial', fontSize: '14px', color: '#aaa',
        }).setInteractive({ useHandCursor: true })
          .on('pointerdown', () => this.scene.start('MenuScene'));

        // Click handler — place / remove marshals
        this.input.on('pointerdown', (pointer) => {
            if (pointer.x > btnX - 100 && pointer.x < btnX + 100 &&
                pointer.y > btnY - 30 && pointer.y < btnY + 30) return; // ignore clicks on alarm
            this._handleClick(pointer);
        });

        // Enter to alarm
        this.input.keyboard.on('keydown-ENTER', () => this._tryAlarm());

        this._updateStatus();
    }

    _drawGrid() {
        const g = this.gridLayer;
        g.clear();
        const cs = CFG.CELL_M;
        const px = CFG.PIXELS_PER_METER;
        const offsetX = (CFG.CANVAS_W - this.level.grid.w * cs * px) / 2;
        const offsetY = CFG.HUD_HEIGHT + 20;
        this.offsetX = offsetX;
        this.offsetY = offsetY;

        for (let y = 0; y < this.level.grid.h; y++) {
            for (let x = 0; x < this.level.grid.w; x++) {
                const t = this.grid.getTile(x, y);
                let color;
                if (t === Tile.WALL)      color = 0x2a2a3a;
                else if (t === Tile.EXIT) color = 0x4ade80;
                else                      color = 0xddd5c8;
                g.fillStyle(color, 1);
                g.fillRect(offsetX + x * cs * px, offsetY + y * cs * px, cs * px, cs * px);
            }
        }
        // grid lines
        g.lineStyle(1, 0x000000, 0.08);
        for (let x = 0; x <= this.level.grid.w; x++) {
            g.lineBetween(offsetX + x * cs * px, offsetY, offsetX + x * cs * px, offsetY + this.level.grid.h * cs * px);
        }
        for (let y = 0; y <= this.level.grid.h; y++) {
            g.lineBetween(offsetX, offsetY + y * cs * px, offsetX + this.level.grid.w * cs * px, offsetY + y * cs * px);
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

    _drawMarshals() {
        const g = this.marshalLayer;
        g.clear();
        const px = CFG.PIXELS_PER_METER;
        for (const m of this.marshals) {
            const sx = this.offsetX + m.x * px;
            const sy = this.offsetY + m.y * px;
            // radius indicator
            g.fillStyle(0x60a5fa, 0.12);
            g.fillCircle(sx, sy, CFG.MARSHAL_RADIUS_M * px);
            // marshal body
            g.fillStyle(0x60a5fa, 1);
            g.fillCircle(sx, sy, 10);
            g.lineStyle(2, 0xffffff, 1);
            g.strokeCircle(sx, sy, 10);
        }
    }

    _handleClick(pointer) {
        const px = CFG.PIXELS_PER_METER;
        const wx = (pointer.x - this.offsetX) / px;
        const wy = (pointer.y - this.offsetY) / px;

        // out of grid?
        if (wx < 0 || wy < 0 || wx > this.level.grid.w * CFG.CELL_M || wy > this.level.grid.h * CFG.CELL_M) return;

        // remove if clicking near existing marshal
        for (let i = this.marshals.length - 1; i >= 0; i--) {
            const m = this.marshals[i];
            if (Math.hypot(m.x - wx, m.y - wy) < 0.6) {
                this.marshals.splice(i, 1);
                this._drawMarshals();
                this._updateStatus();
                return;
            }
        }

        // can't place on wall
        const cx = Math.floor(wx / CFG.CELL_M);
        const cy = Math.floor(wy / CFG.CELL_M);
        if (!this.grid.walkable(cx, cy)) return;

        if (this.marshals.length >= this.level.budget.marshals) return;

        this.marshals.push({ x: wx, y: wy });
        this._drawMarshals();
        this._updateStatus();
    }

    _updateStatus() {
        const remain = this.level.budget.marshals - this.marshals.length;
        this.statusText.setText(
            `Marshals placed: ${this.marshals.length}/${this.level.budget.marshals} ` +
            `(${remain} remaining) · click to place, click on a marshal to remove`
        );
    }

    _tryAlarm() {
        // basic validation: spawn region must reach exit (always true in v0.1; check anyway)
        const sp = this.level.spawn.rect;
        const cs = CFG.CELL_M;
        const cx = ((sp.x0 + sp.x1) / 2) * cs;
        const cy = ((sp.y0 + sp.y1) / 2) * cs;
        if (!this.grid.reachableFrom(cx, cy)) {
            this.statusText.setColor('#ff8080');
            this.statusText.setText('Spawn region cannot reach an exit. Aborting.');
            return;
        }
        this.scene.start('SimScene', {
            level: this.level,
            marshals: this.marshals.slice(),
            grid: this.grid,
            offsetX: this.offsetX,
            offsetY: this.offsetY,
        });
    }
}
