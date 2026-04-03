// Fantastic Contraption — Renderer
class Renderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.canvas.width = CONFIG.CANVAS_WIDTH;
        this.canvas.height = CONFIG.CANVAS_HEIGHT;
    }

    clear() {
        const ctx = this.ctx;
        // Background gradient
        const grad = ctx.createLinearGradient(0, 0, 0, CONFIG.CANVAS_HEIGHT);
        grad.addColorStop(0, '#dfe6e9');
        grad.addColorStop(1, CONFIG.COLOR_BG);
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT);
    }

    drawZone(zone, fillColor, borderColor, label) {
        const ctx = this.ctx;
        ctx.fillStyle = fillColor;
        ctx.fillRect(zone.x, zone.y, zone.w, zone.h);
        ctx.strokeStyle = borderColor;
        ctx.lineWidth = 2;
        ctx.setLineDash([8, 4]);
        ctx.strokeRect(zone.x, zone.y, zone.w, zone.h);
        ctx.setLineDash([]);

        if (label) {
            ctx.fillStyle = borderColor;
            ctx.font = 'bold 14px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(label, zone.x + zone.w / 2, zone.y + 18);
        }
    }

    drawGrid(zone) {
        const ctx = this.ctx;
        ctx.fillStyle = CONFIG.COLOR_GRID_DOT;
        const spacing = CONFIG.GRID_SPACING;
        for (let x = zone.x + spacing; x < zone.x + zone.w; x += spacing) {
            for (let y = zone.y + spacing; y < zone.y + zone.h; y += spacing) {
                ctx.beginPath();
                ctx.arc(x, y, 1.5, 0, Math.PI * 2);
                ctx.fill();
            }
        }
    }

    drawTerrain(bodies) {
        const ctx = this.ctx;
        for (const body of bodies) {
            const verts = body.vertices;
            ctx.beginPath();
            ctx.moveTo(verts[0].x, verts[0].y);
            for (let i = 1; i < verts.length; i++) {
                ctx.lineTo(verts[i].x, verts[i].y);
            }
            ctx.closePath();
            ctx.fillStyle = CONFIG.COLOR_TERRAIN;
            ctx.fill();

            // Top edge highlight
            ctx.beginPath();
            ctx.moveTo(verts[0].x, verts[0].y);
            ctx.lineTo(verts[1].x, verts[1].y);
            ctx.strokeStyle = CONFIG.COLOR_TERRAIN_TOP;
            ctx.lineWidth = 3;
            ctx.stroke();
        }
    }

    drawPayload(body) {
        const ctx = this.ctx;
        const pos = body.position;
        const r = CONFIG.PAYLOAD_RADIUS;

        // Glow
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, r + 8, 0, Math.PI * 2);
        ctx.fillStyle = CONFIG.COLOR_PAYLOAD_GLOW;
        ctx.fill();

        // Body
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, r, 0, Math.PI * 2);
        ctx.fillStyle = CONFIG.COLOR_PAYLOAD;
        ctx.fill();

        // Shine
        ctx.beginPath();
        ctx.arc(pos.x - r * 0.3, pos.y - r * 0.3, r * 0.35, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255,255,255,0.4)';
        ctx.fill();
    }

    drawPart(part) {
        if (PartFactory.isWheelType(part.type)) {
            this._drawWheel(part);
        } else {
            this._drawRod(part);
        }
    }

    _drawWheel(part) {
        const ctx = this.ctx;
        const body = part.body;
        const pos = body.position;
        const r = CONFIG.WHEEL_RADIUS;
        const angle = body.angle;

        let color;
        if (part.type === CONFIG.PART_CW_WHEEL) color = CONFIG.COLOR_CW_WHEEL;
        else if (part.type === CONFIG.PART_CCW_WHEEL) color = CONFIG.COLOR_CCW_WHEEL;
        else color = CONFIG.COLOR_FREE_WHEEL;

        // Outer ring
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, r, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
        ctx.strokeStyle = 'rgba(0,0,0,0.2)';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Spokes (rotate with body)
        ctx.strokeStyle = 'rgba(255,255,255,0.5)';
        ctx.lineWidth = 2;
        for (let i = 0; i < 4; i++) {
            const a = angle + (i * Math.PI / 2);
            ctx.beginPath();
            ctx.moveTo(pos.x, pos.y);
            ctx.lineTo(pos.x + Math.cos(a) * r * 0.8, pos.y + Math.sin(a) * r * 0.8);
            ctx.stroke();
        }

        // Center hub
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, 5, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255,255,255,0.7)';
        ctx.fill();

        // Direction arrow for powered wheels
        if (part.motorDir !== 0) {
            ctx.save();
            ctx.translate(pos.x, pos.y);
            ctx.rotate(angle);
            ctx.strokeStyle = 'rgba(255,255,255,0.8)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            const dir = part.motorDir;
            const arrowR = r * 0.55;
            // Arc arrow
            ctx.arc(0, 0, arrowR, -0.5 * dir, 1.5 * dir, dir < 0);
            ctx.stroke();
            // Arrowhead
            const endAngle = 1.5 * dir;
            const tipX = Math.cos(endAngle) * arrowR;
            const tipY = Math.sin(endAngle) * arrowR;
            const headLen = 6;
            const perpAngle = endAngle + (dir > 0 ? Math.PI / 2 : -Math.PI / 2);
            ctx.beginPath();
            ctx.moveTo(tipX, tipY);
            ctx.lineTo(
                tipX + Math.cos(perpAngle + 0.5) * headLen,
                tipY + Math.sin(perpAngle + 0.5) * headLen
            );
            ctx.moveTo(tipX, tipY);
            ctx.lineTo(
                tipX + Math.cos(perpAngle - 0.5) * headLen,
                tipY + Math.sin(perpAngle - 0.5) * headLen
            );
            ctx.stroke();
            ctx.restore();
        }
    }

    _drawRod(part) {
        const ctx = this.ctx;
        const body = part.body;
        const pos = body.position;
        const angle = body.angle;
        const halfLen = part.length / 2;
        const isWater = part.type === CONFIG.PART_WATER_ROD;

        const x1 = pos.x + Math.cos(angle) * (-halfLen);
        const y1 = pos.y + Math.sin(angle) * (-halfLen);
        const x2 = pos.x + Math.cos(angle) * halfLen;
        const y2 = pos.y + Math.sin(angle) * halfLen;

        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.strokeStyle = isWater ? CONFIG.COLOR_WATER_ROD_STROKE : CONFIG.COLOR_ROD;
        ctx.lineWidth = CONFIG.ROD_THICKNESS;
        ctx.lineCap = 'round';
        if (isWater) {
            ctx.globalAlpha = 0.6;
        }
        ctx.stroke();
        ctx.globalAlpha = 1;

        // Endpoint dots
        ctx.fillStyle = CONFIG.COLOR_JOINT;
        ctx.beginPath();
        ctx.arc(x1, y1, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(x2, y2, 4, 0, Math.PI * 2);
        ctx.fill();
    }

    drawJoints(parts) {
        const ctx = this.ctx;
        const drawnPositions = new Set();

        for (const part of parts) {
            for (const c of part.constraints) {
                // Draw joint at constraint point
                const posA = c.bodyA.position;
                const pA = c.pointA;
                const cosA = Math.cos(c.bodyA.angle);
                const sinA = Math.sin(c.bodyA.angle);
                const wx = posA.x + pA.x * cosA - pA.y * sinA;
                const wy = posA.y + pA.x * sinA + pA.y * cosA;
                const key = Math.round(wx) + ',' + Math.round(wy);
                if (!drawnPositions.has(key)) {
                    drawnPositions.add(key);
                    ctx.beginPath();
                    ctx.arc(wx, wy, 5, 0, Math.PI * 2);
                    ctx.fillStyle = CONFIG.COLOR_SNAP;
                    ctx.fill();
                    ctx.strokeStyle = 'rgba(0,0,0,0.2)';
                    ctx.lineWidth = 1;
                    ctx.stroke();
                }
            }
        }
    }

    drawGhostWheel(pos, type) {
        const ctx = this.ctx;
        const r = CONFIG.WHEEL_RADIUS;
        ctx.globalAlpha = 0.35;
        let color;
        if (type === CONFIG.PART_CW_WHEEL) color = CONFIG.COLOR_CW_WHEEL;
        else if (type === CONFIG.PART_CCW_WHEEL) color = CONFIG.COLOR_CCW_WHEEL;
        else color = CONFIG.COLOR_FREE_WHEEL;

        ctx.beginPath();
        ctx.arc(pos.x, pos.y, r, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
        ctx.globalAlpha = 1;
    }

    drawGhostRod(start, end, isWater) {
        const ctx = this.ctx;
        ctx.globalAlpha = 0.35;
        ctx.beginPath();
        ctx.moveTo(start.x, start.y);
        ctx.lineTo(end.x, end.y);
        ctx.strokeStyle = isWater ? CONFIG.COLOR_WATER_ROD_STROKE : CONFIG.COLOR_ROD;
        ctx.lineWidth = CONFIG.ROD_THICKNESS;
        ctx.lineCap = 'round';
        ctx.stroke();
        ctx.globalAlpha = 1;
    }

    drawSnapIndicator(pos) {
        const ctx = this.ctx;
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, CONFIG.SNAP_RADIUS * 0.6, 0, Math.PI * 2);
        ctx.fillStyle = CONFIG.COLOR_SNAP_GLOW;
        ctx.fill();
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, 6, 0, Math.PI * 2);
        ctx.fillStyle = CONFIG.COLOR_SNAP;
        ctx.fill();
    }
}
