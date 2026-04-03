// Fantastic Contraption — Input Manager
class InputManager {
    constructor(canvas, getScale) {
        this.canvas = canvas;
        this.getScale = getScale;
        this.mousePos = { x: 0, y: 0 };
        this.isDragging = false;
        this.dragStart = null;

        this.onDragStart = null;
        this.onDragMove = null;
        this.onDragEnd = null;
        this.onClick = null;
        this.onRightClick = null;

        this._dragThreshold = 5;
        this._mouseDown = false;
        this._mouseDownPos = null;
        this._hasDragged = false;

        this._bindEvents();
    }

    _toWorld(e) {
        const rect = this.canvas.getBoundingClientRect();
        const scale = this.getScale();
        let clientX, clientY;
        if (e.touches) {
            clientX = e.touches[0].clientX;
            clientY = e.touches[0].clientY;
        } else if (e.changedTouches) {
            clientX = e.changedTouches[0].clientX;
            clientY = e.changedTouches[0].clientY;
        } else {
            clientX = e.clientX;
            clientY = e.clientY;
        }
        return {
            x: (clientX - rect.left) / scale,
            y: (clientY - rect.top) / scale
        };
    }

    _bindEvents() {
        // Mouse events
        this.canvas.addEventListener('mousedown', (e) => {
            if (e.button === 2) return;
            this._handleDown(e);
        });
        this.canvas.addEventListener('mousemove', (e) => this._handleMove(e));
        this.canvas.addEventListener('mouseup', (e) => {
            if (e.button === 2) return;
            this._handleUp(e);
        });
        this.canvas.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            const pos = this._toWorld(e);
            if (this.onRightClick) this.onRightClick(pos);
        });

        // Touch events
        this.canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this._handleDown(e);
        }, { passive: false });
        this.canvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
            this._handleMove(e);
        }, { passive: false });
        this.canvas.addEventListener('touchend', (e) => {
            e.preventDefault();
            this._handleUp(e);
        }, { passive: false });
    }

    _handleDown(e) {
        const pos = this._toWorld(e);
        this.mousePos = pos;
        this._mouseDown = true;
        this._mouseDownPos = { x: pos.x, y: pos.y };
        this._hasDragged = false;
    }

    _handleMove(e) {
        const pos = this._toWorld(e);
        this.mousePos = pos;

        if (this._mouseDown) {
            const dx = pos.x - this._mouseDownPos.x;
            const dy = pos.y - this._mouseDownPos.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (!this._hasDragged && dist > this._dragThreshold) {
                this._hasDragged = true;
                this.isDragging = true;
                this.dragStart = { x: this._mouseDownPos.x, y: this._mouseDownPos.y };
                if (this.onDragStart) this.onDragStart(this.dragStart);
            }

            if (this._hasDragged && this.onDragMove) {
                this.onDragMove(pos);
            }
        }
    }

    _handleUp(e) {
        const pos = (e.changedTouches) ? this._toWorld(e) : this._toWorld(e);
        this.mousePos = pos;

        if (this._mouseDown) {
            if (this._hasDragged) {
                if (this.onDragEnd) this.onDragEnd(pos);
            } else {
                if (this.onClick) this.onClick(pos);
            }
        }

        this._mouseDown = false;
        this._hasDragged = false;
        this.isDragging = false;
        this.dragStart = null;
    }
}
