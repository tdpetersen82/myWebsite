// ============================================================
// Q*bert — Flying Disc Entity
// Floating disc at pyramid edges that transports Q*bert to top
// ============================================================

class FlyingDisc {
    constructor(scene, pyramid, side, position) {
        this.scene = scene;
        this.pyramid = pyramid;
        this.graphics = scene.add.graphics();

        // side: 'left' or 'right'
        // position: which row the disc is adjacent to
        this.side = side;
        this.adjacentRow = position;

        // Trigger position: the cube Q*bert must be on and jump off from
        if (side === 'left') {
            this.triggerRow = position;
            this.triggerCol = -1; // off left edge - triggered from col 0
            // Actually: Q*bert is at (position, 0) and jumps up-left
            this.triggerCol = 0;
        } else {
            this.triggerRow = position;
            this.triggerCol = position; // rightmost column of that row
        }

        this.active = true;
        this.bobOffset = Math.random() * Math.PI * 2;

        // Calculate screen position (floating beside the pyramid)
        this._calcPosition();
    }

    _calcPosition() {
        const cubePos = this.pyramid.getCubeScreenPos(this.adjacentRow, this.side === 'left' ? 0 : this.adjacentRow);

        if (this.side === 'left') {
            this.x = cubePos.x - CONFIG.CUBE_WIDTH * 0.8;
            this.y = cubePos.y - CONFIG.CUBE_HEIGHT;
        } else {
            this.x = cubePos.x + CONFIG.CUBE_WIDTH * 0.8;
            this.y = cubePos.y - CONFIG.CUBE_HEIGHT;
        }
    }

    // Check if Q*bert should ride this disc
    // Q*bert is at (row, col) and trying to jump in direction (dRow, dCol)
    canRide(qbertRow, qbertCol, dRow, dCol) {
        if (!this.active) return false;

        if (this.side === 'left') {
            // Q*bert is at leftmost column (col 0) of this row, jumping up-left
            return qbertRow === this.adjacentRow && qbertCol === 0 && dRow === -1 && dCol === -1;
        } else {
            // Q*bert is at rightmost column of this row, jumping up-right
            return qbertRow === this.adjacentRow && qbertCol === this.adjacentRow && dRow === -1 && dCol === 0;
        }
    }

    use() {
        this.active = false;
    }

    draw(time) {
        this.graphics.clear();
        if (!this.active) return;

        const bob = Math.sin((time / 500) + this.bobOffset) * 4;
        const drawX = this.x;
        const drawY = this.y + bob;
        const g = this.graphics;

        // Spinning disc - ellipse with colors
        g.fillStyle(0xff4444, 1);
        g.fillEllipse(drawX, drawY, 28, 10);

        // Highlight ring
        g.lineStyle(2, 0xffaa44, 1);
        g.strokeEllipse(drawX, drawY, 28, 10);

        // Center dot
        g.fillStyle(0xffff00, 1);
        g.fillCircle(drawX, drawY, 3);

        // Sparkle effect
        const sparkle = Math.sin(time / 200) > 0.5;
        if (sparkle) {
            g.fillStyle(0xffffff, 0.8);
            g.fillCircle(drawX - 8, drawY - 2, 2);
            g.fillCircle(drawX + 8, drawY + 2, 2);
        }
    }

    destroy() {
        if (this.graphics) this.graphics.destroy();
    }
}
