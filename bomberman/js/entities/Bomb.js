// Bomberman Bomb Entity
class Bomb {
    constructor(scene, gridRow, gridCol, range, ownerId) {
        this.scene = scene;
        this.gridRow = gridRow;
        this.gridCol = gridCol;
        this.range = range;
        this.ownerId = ownerId;
        this.fuseTime = CONFIG.BOMB.FUSE_TIME;
        this.elapsed = 0;
        this.exploded = false;
        this.graphics = null;

        this._createGraphics();
    }

    _createGraphics() {
        this.graphics = this.scene.add.graphics();
        this.graphics.setDepth(3);
    }

    update(delta) {
        if (this.exploded) return;

        this.elapsed += delta;

        // Pulsing animation
        const pulse = 1 + 0.15 * Math.sin(this.elapsed * 0.01);
        const urgency = Math.min(this.elapsed / this.fuseTime, 1);
        const pulseSpeed = 1 + urgency * 4;
        const pulseFinal = 1 + 0.1 * Math.sin(this.elapsed * 0.01 * pulseSpeed);

        this._draw(pulseFinal, urgency);

        // Check fuse
        if (this.elapsed >= this.fuseTime) {
            this.detonate();
        }
    }

    _draw(scale, urgency) {
        this.graphics.clear();
        if (this.exploded) return;

        const pos = this.scene.grid.toPixel(this.gridRow, this.gridCol);
        const ts = CONFIG.TILE_SIZE;
        const r = ts * 0.35 * scale;

        // Bomb body
        const bodyColor = Phaser.Display.Color.Interpolate.ColorWithColor(
            new Phaser.Display.Color(33, 33, 33),
            new Phaser.Display.Color(139, 0, 0),
            100,
            urgency * 100
        );
        const colorInt = Phaser.Display.Color.GetColor(bodyColor.r, bodyColor.g, bodyColor.b);
        this.graphics.fillStyle(colorInt, 1);
        this.graphics.fillCircle(pos.x, pos.y, r);

        // Highlight
        this.graphics.fillStyle(0x666666, 0.5);
        this.graphics.fillCircle(pos.x - r * 0.25, pos.y - r * 0.25, r * 0.3);

        // Fuse
        this.graphics.lineStyle(2, CONFIG.COLORS.BOMB_FUSE, 1);
        this.graphics.lineBetween(
            pos.x, pos.y - r * 0.7,
            pos.x + r * 0.4, pos.y - r * 1.1
        );

        // Fuse spark
        if (Math.random() > 0.3) {
            this.graphics.fillStyle(0xFFFF00, 1);
            this.graphics.fillCircle(
                pos.x + r * 0.4 + (Math.random() - 0.5) * 4,
                pos.y - r * 1.1 + (Math.random() - 0.5) * 4,
                2
            );
        }
    }

    detonate() {
        if (this.exploded) return;
        this.exploded = true;
        this.graphics.clear();
        this.scene.createExplosion(this.gridRow, this.gridCol, this.range);
        this.scene.audio.explosion();
    }

    destroy() {
        if (this.graphics) this.graphics.destroy();
    }
}
