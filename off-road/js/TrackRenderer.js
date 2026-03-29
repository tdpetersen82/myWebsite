class TrackRenderer {
    constructor(scene, trackIndex) {
        this.scene = scene;
        this.trackIndex = trackIndex || 0;
        this.trackData = CONFIG.TRACKS[this.trackIndex];
        this.theme = this.trackData.theme;

        this.centerPoints = [];
        this.leftEdge = [];
        this.rightEdge = [];
        this.edgeSegments = [];

        this.trackMask = null;
        this.terrainMap = null;
        this.maskResolution = 4;

        this.worldWidth = CONFIG.WORLD_WIDTH || CONFIG.WIDTH;
        this.worldHeight = CONFIG.WORLD_HEIGHT || CONFIG.HEIGHT;

        this.groundGfx = null;
        this.trackGfx = null;
        this.decorGfx = null;
        this.overlayGfx = null;

        this._buildTrack();
    }

    // === TRACK GEOMETRY (unchanged) ===

    _buildTrack() {
        this._sampleCenterLine();
        this._generateEdges();
        this._buildTrackMask();
        this._buildTerrainMap();
        this._buildEdgeSegments();
    }

    _sampleCenterLine() {
        const pts = this.trackData.centerLine;
        const n = pts.length;
        const samplesPerSegment = 20;
        this.centerPoints = [];
        for (let i = 0; i < n; i++) {
            const p0 = pts[(i - 1 + n) % n];
            const p1 = pts[i];
            const p2 = pts[(i + 1) % n];
            const p3 = pts[(i + 2) % n];
            for (let t = 0; t < samplesPerSegment; t++) {
                this.centerPoints.push(this._catmullRom(p0, p1, p2, p3, t / samplesPerSegment));
            }
        }
    }

    _catmullRom(p0, p1, p2, p3, t) {
        const t2 = t * t, t3 = t2 * t;
        return {
            x: 0.5 * ((2*p1.x) + (-p0.x+p2.x)*t + (2*p0.x-5*p1.x+4*p2.x-p3.x)*t2 + (-p0.x+3*p1.x-3*p2.x+p3.x)*t3),
            y: 0.5 * ((2*p1.y) + (-p0.y+p2.y)*t + (2*p0.y-5*p1.y+4*p2.y-p3.y)*t2 + (-p0.y+3*p1.y-3*p2.y+p3.y)*t3),
        };
    }

    _generateEdges() {
        const halfWidth = this.trackData.trackWidth / 2;
        this.leftEdge = [];
        this.rightEdge = [];
        const n = this.centerPoints.length;
        for (let i = 0; i < n; i++) {
            const prev = this.centerPoints[(i - 1 + n) % n];
            const curr = this.centerPoints[i];
            const next = this.centerPoints[(i + 1) % n];
            const tx = next.x - prev.x, ty = next.y - prev.y;
            const len = Math.hypot(tx, ty) || 1;
            const nx = -ty / len, ny = tx / len;
            this.leftEdge.push({ x: curr.x + nx * halfWidth, y: curr.y + ny * halfWidth });
            this.rightEdge.push({ x: curr.x - nx * halfWidth, y: curr.y - ny * halfWidth });
        }
    }

    _buildEdgeSegments() {
        this.edgeSegments = [];
        const n = this.leftEdge.length;
        for (let i = 0; i < n; i++) {
            const j = (i + 1) % n;
            const lx1=this.leftEdge[i].x, ly1=this.leftEdge[i].y, lx2=this.leftEdge[j].x, ly2=this.leftEdge[j].y;
            const ldx=lx2-lx1, ldy=ly2-ly1, llen=Math.hypot(ldx,ldy)||1;
            this.edgeSegments.push({x1:lx1,y1:ly1,x2:lx2,y2:ly2,nx:ldx/llen,ny:ldy/llen});
            const rx1=this.rightEdge[i].x, ry1=this.rightEdge[i].y, rx2=this.rightEdge[j].x, ry2=this.rightEdge[j].y;
            const rdx=rx2-rx1, rdy=ry2-ry1, rlen=Math.hypot(rdx,rdy)||1;
            this.edgeSegments.push({x1:rx1,y1:ry1,x2:rx2,y2:ry2,nx:rdx/rlen,ny:rdy/rlen});
        }
    }

    _buildTrackMask() {
        const res = this.maskResolution;
        const w = Math.ceil(this.worldWidth / res);
        const h = Math.ceil(this.worldHeight / res);
        this.trackMask = new Uint8Array(w * h);
        for (let cy = 0; cy < h; cy++) {
            for (let cx = 0; cx < w; cx++) {
                if (this._isPointInTrack(cx * res + res / 2, cy * res + res / 2)) {
                    this.trackMask[cy * w + cx] = 1;
                }
            }
        }
        this.maskWidth = w;
        this.maskHeight = h;
    }

    _isPointInTrack(px, py) {
        let minDist = Infinity;
        for (let i = 0; i < this.centerPoints.length; i += 2) {
            const d = Math.hypot(px - this.centerPoints[i].x, py - this.centerPoints[i].y);
            if (d < minDist) minDist = d;
        }
        return minDist < this.trackData.trackWidth * 0.55;
    }

    _buildTerrainMap() {
        this.terrainZones = (this.trackData.terrainZones || []).map(z => ({
            type: z.type, cx: z.center.x, cy: z.center.y,
            radius: z.radius, radiusSq: z.radius * z.radius, direction: z.direction || 0,
        }));
    }

    isOnTrack(x, y) {
        const cx = Math.floor(x / this.maskResolution), cy = Math.floor(y / this.maskResolution);
        if (cx < 0 || cx >= this.maskWidth || cy < 0 || cy >= this.maskHeight) return false;
        return this.trackMask[cy * this.maskWidth + cx] === 1;
    }

    getTerrainAt(x, y) {
        for (const zone of this.terrainZones) {
            const dx = x - zone.cx, dy = y - zone.cy;
            if (dx * dx + dy * dy < zone.radiusSq) return CONFIG.TERRAIN[zone.type] || CONFIG.TERRAIN.DIRT;
        }
        return this.isOnTrack(x, y) ? CONFIG.TERRAIN.DIRT : CONFIG.TERRAIN.GRASS;
    }

    getTrackBoundary() { return { left: this.leftEdge, right: this.rightEdge }; }

    // Compute the track tangent angle at a given center point index
    getTangentAngle(index) {
        const n = this.centerPoints.length;
        const prev = this.centerPoints[(index - 1 + n) % n];
        const next = this.centerPoints[(index + 1) % n];
        return Math.atan2(next.y - prev.y, next.x - prev.x);
    }

    // Get the start angle for vehicles at the start/finish line
    getStartAngle() {
        // Find the center point nearest to checkpoint 0
        const cp0 = this.trackData.checkpoints[0];
        let bestIdx = 0, bestDist = Infinity;
        for (let i = 0; i < this.centerPoints.length; i++) {
            const d = Math.hypot(this.centerPoints[i].x - cp0.x, this.centerPoints[i].y - cp0.y);
            if (d < bestDist) { bestDist = d; bestIdx = i; }
        }
        return this.getTangentAngle(bestIdx);
    }

    // Find the nearest center line index to a world position
    getNearestCenterIndex(x, y) {
        let bestIdx = 0, bestDist = Infinity;
        // Sample every 2nd point for speed
        for (let i = 0; i < this.centerPoints.length; i += 2) {
            const d = Math.hypot(this.centerPoints[i].x - x, this.centerPoints[i].y - y);
            if (d < bestDist) { bestDist = d; bestIdx = i; }
        }
        return bestIdx;
    }

    // Get a point ahead on the center line from a given index
    getPointAhead(index, distance) {
        const n = this.centerPoints.length;
        let accumulated = 0;
        let i = index;
        while (accumulated < distance) {
            const next = (i + 1) % n;
            const dx = this.centerPoints[next].x - this.centerPoints[i].x;
            const dy = this.centerPoints[next].y - this.centerPoints[i].y;
            accumulated += Math.hypot(dx, dy);
            i = next;
        }
        return this.centerPoints[i];
    }

    // =============================================
    // === RENDERING (sprite-based with fallback) ===
    // =============================================

    render() {
        const trackKey = `track_${this.trackIndex}`;
        const hasTrackImage = this.scene.textures.exists(trackKey);

        if (hasTrackImage) {
            this._renderWithSprites(trackKey);
        } else {
            this._renderProcedural();
        }
    }

    // --- Sprite-based rendering (uses pre-generated track images) ---
    _renderWithSprites(trackKey) {
        // Single pre-rendered track image replaces ~10 procedural methods
        this.trackImage = this.scene.add.image(
            this.worldWidth / 2, this.worldHeight / 2, trackKey
        ).setDepth(0);

        // Place decoration sprites from atlas (allows depth sorting)
        this._placeDecorationSprites();

        // Tire marks layer (remains procedural for dynamic marks)
        this.tireMarkGfx = this.scene.add.graphics().setDepth(1.5);
    }

    _placeDecorationSprites() {
        const themeNames = ['desert', 'arctic', 'jungle'];
        const atlasKey = `decor_${themeNames[this.trackIndex]}`;
        if (!this.scene.textures.exists(atlasKey)) return;

        this.decorSprites = [];
        for (const dec of this.trackData.decorations) {
            try {
                const sprite = this.scene.add.sprite(dec.x, dec.y, atlasKey, dec.type);
                sprite.setDepth(4);
                this.decorSprites.push(sprite);
            } catch (e) {
                // Frame not found — skip silently
            }
        }
    }

    // --- Procedural fallback (original rendering code) ---
    _renderProcedural() {
        this._renderGround();
        this._renderTrackShadow();
        this._renderTrackSurface();
        this._renderRacingLine();
        this._renderTerrainOverlays();
        this._renderCurbing();
        this._renderCheckpoints();
        this._renderFinishLine();
        this._renderDecorations();
        this._renderGroundDetails();
    }

    _renderGround() {
        const g = this.scene.add.graphics().setDepth(0);
        const W = this.worldWidth, H = this.worldHeight;
        const base = this.theme.ground;
        g.fillStyle(base, 1);
        g.fillRect(0, 0, W, H);
        const seed = this.trackIndex * 1000;
        for (let i = 0; i < 600; i++) {
            const x = this._hash(seed + i) * W;
            const y = this._hash(seed + i + 9999) * H;
            const s = 1 + this._hash(seed + i + 5555) * 3;
            const dark = this._hash(seed + i + 3333) > 0.5;
            g.fillStyle(dark ? this._darken(base, 0.15) : this._lighten(base, 0.1), 0.3);
            g.fillCircle(x, y, s);
        }
        for (let i = 0; i < 200; i++) {
            const x = this._hash(seed + i + 7777) * W;
            const y = this._hash(seed + i + 8888) * H;
            if (!this.isOnTrack(x, y)) {
                const shade = this._hash(seed + i + 1111) > 0.5 ? 0x3D6B35 : 0x4A7C3F;
                g.fillStyle(shade, 0.4);
                g.fillCircle(x, y - 1, 2);
                g.fillCircle(x - 1.5, y + 1, 1.5);
                g.fillCircle(x + 1.5, y + 1, 1.5);
            }
        }
    }

    _renderTrackShadow() {
        const g = this.scene.add.graphics().setDepth(0.5);
        const n = this.centerPoints.length;
        const expand = 6;
        g.fillStyle(0x000000, 0.2);
        g.beginPath();
        for (let i = 0; i < n; i++) {
            const c = this.centerPoints[i];
            const prev = this.centerPoints[(i - 1 + n) % n];
            const next = this.centerPoints[(i + 1) % n];
            const tx = next.x - prev.x, ty = next.y - prev.y;
            const len = Math.hypot(tx, ty) || 1;
            const nx = -ty / len, ny = tx / len;
            const hw = this.trackData.trackWidth / 2 + expand;
            const px = c.x + nx * hw + 3, py = c.y + ny * hw + 3;
            if (i === 0) g.moveTo(px, py); else g.lineTo(px, py);
        }
        for (let i = n - 1; i >= 0; i--) {
            const c = this.centerPoints[i];
            const prev = this.centerPoints[(i - 1 + n) % n];
            const next = this.centerPoints[(i + 1) % n];
            const tx = next.x - prev.x, ty = next.y - prev.y;
            const len = Math.hypot(tx, ty) || 1;
            const nx = -ty / len, ny = tx / len;
            const hw = this.trackData.trackWidth / 2 + expand;
            g.lineTo(c.x - nx * hw + 3, c.y - ny * hw + 3);
        }
        g.closePath();
        g.fillPath();
    }

    _renderTrackSurface() {
        this.trackGfx = this.scene.add.graphics().setDepth(1);
        const surf = this.theme.trackSurface;
        this.trackGfx.fillStyle(surf, 1);
        this._fillTrackPolygon(this.trackGfx, 1.0);
        const innerGfx = this.scene.add.graphics().setDepth(1.1);
        innerGfx.fillStyle(this._lighten(surf, 0.08), 1);
        this._fillTrackPolygonScaled(innerGfx, 0.75);
        const lineGfx = this.scene.add.graphics().setDepth(1.2);
        lineGfx.fillStyle(this._lighten(surf, 0.15), 1);
        this._fillTrackPolygonScaled(lineGfx, 0.15);
    }

    _fillTrackPolygon(gfx) {
        const n = this.centerPoints.length;
        gfx.beginPath();
        for (let i = 0; i < n; i++) {
            if (i === 0) gfx.moveTo(this.leftEdge[i].x, this.leftEdge[i].y);
            else gfx.lineTo(this.leftEdge[i].x, this.leftEdge[i].y);
        }
        gfx.lineTo(this.leftEdge[0].x, this.leftEdge[0].y);
        for (let i = n - 1; i >= 0; i--) gfx.lineTo(this.rightEdge[i].x, this.rightEdge[i].y);
        gfx.closePath();
        gfx.fillPath();
    }

    _fillTrackPolygonScaled(gfx, widthFraction) {
        const n = this.centerPoints.length;
        const hw = this.trackData.trackWidth / 2 * widthFraction;
        gfx.beginPath();
        for (let i = 0; i < n; i++) {
            const c = this.centerPoints[i];
            const prev = this.centerPoints[(i - 1 + n) % n];
            const next = this.centerPoints[(i + 1) % n];
            const tx = next.x - prev.x, ty = next.y - prev.y;
            const len = Math.hypot(tx, ty) || 1;
            const nx = -ty / len, ny = tx / len;
            if (i === 0) gfx.moveTo(c.x + nx * hw, c.y + ny * hw);
            else gfx.lineTo(c.x + nx * hw, c.y + ny * hw);
        }
        const c0 = this.centerPoints[0], prev0 = this.centerPoints[n - 1], next0 = this.centerPoints[1];
        const tx0 = next0.x - prev0.x, ty0 = next0.y - prev0.y, len0 = Math.hypot(tx0, ty0) || 1;
        gfx.lineTo(c0.x + (-ty0/len0) * hw, c0.y + (tx0/len0) * hw);
        for (let i = n - 1; i >= 0; i--) {
            const c = this.centerPoints[i];
            const prev = this.centerPoints[(i - 1 + n) % n];
            const next = this.centerPoints[(i + 1) % n];
            const tx = next.x - prev.x, ty = next.y - prev.y;
            const len = Math.hypot(tx, ty) || 1;
            gfx.lineTo(c.x + (ty / len) * hw, c.y + (-tx / len) * hw);
        }
        gfx.closePath();
        gfx.fillPath();
    }

    _renderRacingLine() {
        const g = this.scene.add.graphics().setDepth(1.4);
        const n = this.centerPoints.length;
        g.lineStyle(2, 0x000000, 0.08);
        for (let offset = -6; offset <= 6; offset += 12) {
            g.beginPath();
            for (let i = 0; i < n; i++) {
                const c = this.centerPoints[i];
                const prev = this.centerPoints[(i - 1 + n) % n];
                const next = this.centerPoints[(i + 1) % n];
                const tx = next.x - prev.x, ty = next.y - prev.y;
                const len = Math.hypot(tx, ty) || 1;
                const px = c.x + (-ty / len) * offset, py = c.y + (tx / len) * offset;
                if (i === 0) g.moveTo(px, py); else g.lineTo(px, py);
            }
            g.closePath();
            g.strokePath();
        }
    }

    _renderCurbing() {
        const g = this.scene.add.graphics().setDepth(3);
        const n = this.leftEdge.length;
        const curbWidth = 10, segLen = 14;
        let accumulated = 0, isAlt = false;
        const colorA = this.theme.trackEdge;
        const colorB = CONFIG.COLORS.TRACK_EDGE_ALT;
        for (let i = 0; i < n; i++) {
            const j = (i + 1) % n;
            accumulated += Math.hypot(this.leftEdge[j].x - this.leftEdge[i].x, this.leftEdge[j].y - this.leftEdge[i].y);
            if (accumulated > segLen) { accumulated = 0; isAlt = !isAlt; }
            const c = this.centerPoints[i];
            const nx = this.leftEdge[i].x - c.x, ny = this.leftEdge[i].y - c.y;
            const nlen = Math.hypot(nx, ny) || 1;
            const ux = nx / nlen, uy = ny / nlen;
            const x1 = this.leftEdge[i].x, y1 = this.leftEdge[i].y;
            const x2 = x1 + ux * curbWidth, y2 = y1 + uy * curbWidth;
            const x3 = this.leftEdge[j].x + ux * curbWidth, y3 = this.leftEdge[j].y + uy * curbWidth;
            const x4 = this.leftEdge[j].x, y4 = this.leftEdge[j].y;
            const color = isAlt ? colorA : colorB;
            g.fillStyle(0x000000, 0.25);
            g.fillTriangle(x1+2,y1+2,x2+2,y2+2,x3+2,y3+2);
            g.fillTriangle(x1+2,y1+2,x3+2,y3+2,x4+2,y4+2);
            g.fillStyle(color, 1);
            g.fillTriangle(x1,y1,x2,y2,x3,y3);
            g.fillTriangle(x1,y1,x3,y3,x4,y4);
        }
        accumulated = 0; isAlt = false;
        for (let i = 0; i < n; i++) {
            const j = (i + 1) % n;
            accumulated += Math.hypot(this.rightEdge[j].x - this.rightEdge[i].x, this.rightEdge[j].y - this.rightEdge[i].y);
            if (accumulated > segLen) { accumulated = 0; isAlt = !isAlt; }
            const c = this.centerPoints[i];
            const nx = this.rightEdge[i].x - c.x, ny = this.rightEdge[i].y - c.y;
            const nlen = Math.hypot(nx, ny) || 1;
            const ux = nx / nlen, uy = ny / nlen;
            const x1 = this.rightEdge[i].x, y1 = this.rightEdge[i].y;
            const x2 = x1 + ux * curbWidth, y2 = y1 + uy * curbWidth;
            const x3 = this.rightEdge[j].x + ux * curbWidth, y3 = this.rightEdge[j].y + uy * curbWidth;
            const x4 = this.rightEdge[j].x, y4 = this.rightEdge[j].y;
            const color = isAlt ? colorA : colorB;
            g.fillStyle(0x000000, 0.25);
            g.fillTriangle(x1+2,y1+2,x2+2,y2+2,x3+2,y3+2);
            g.fillTriangle(x1+2,y1+2,x3+2,y3+2,x4+2,y4+2);
            g.fillStyle(color, 1);
            g.fillTriangle(x1,y1,x2,y2,x3,y3);
            g.fillTriangle(x1,y1,x3,y3,x4,y4);
        }
    }

    _renderTerrainOverlays() {
        const g = this.scene.add.graphics().setDepth(2);
        for (const zone of this.terrainZones) {
            const terrain = CONFIG.TERRAIN[zone.type];
            if (!terrain) continue;
            const cx = zone.cx, cy = zone.cy, r = zone.radius;
            if (zone.type === 'WATER') {
                g.fillStyle(0x1A5276, 0.7); g.fillEllipse(cx, cy, r*2.1, r*1.7);
                g.fillStyle(terrain.color, 0.6); g.fillEllipse(cx-2, cy-2, r*1.9, r*1.5);
                g.fillStyle(0xAED6F1, 0.2); g.fillEllipse(cx-r*0.2, cy-r*0.25, r, r*0.7);
                g.lineStyle(1, 0xFFFFFF, 0.15);
                for (let rv = 8; rv < r; rv += 10) g.strokeEllipse(cx+Math.sin(rv)*3, cy, rv*1.8, rv*1.4);
            } else if (zone.type === 'MUD') {
                g.fillStyle(0x3E2723, 0.7); g.fillEllipse(cx, cy, r*2.2, r*1.8);
                g.fillStyle(terrain.color, 0.6); g.fillEllipse(cx+3, cy+2, r*1.9, r*1.5);
                for (let i = 0; i < 12; i++) {
                    const a = (i/12)*Math.PI*2;
                    const d = r*(0.2+this._hash(i*7+zone.cx)*0.5);
                    const bx = cx+Math.cos(a)*d, by = cy+Math.sin(a)*d;
                    const bs = 3+this._hash(i*13+zone.cy)*5;
                    g.fillStyle(0x2C1A0E, 0.5); g.fillCircle(bx, by, bs);
                }
            } else if (zone.type === 'ICE') {
                g.fillStyle(0xD6EAF8, 0.6); g.fillEllipse(cx, cy, r*2.1, r*1.7);
                g.fillStyle(terrain.color, 0.5); g.fillEllipse(cx, cy, r*1.8, r*1.5);
                g.fillStyle(0xFFFFFF, 0.3); g.fillEllipse(cx-r*0.3, cy-r*0.2, r*0.8, r*0.5);
                g.lineStyle(1, 0xFFFFFF, 0.2);
                for (let i = 0; i < 5; i++) {
                    const a = this._hash(i*11+zone.cx)*Math.PI*2;
                    const l = r*(0.3+this._hash(i*17)*0.5);
                    g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx+Math.cos(a)*l, cy+Math.sin(a)*l); g.strokePath();
                }
            } else if (zone.type === 'RAMP') {
                g.fillStyle(0x8B6914, 0.8); g.fillEllipse(cx, cy, r*2, r*1.6);
                g.fillStyle(terrain.color, 0.9); g.fillEllipse(cx, cy, r*1.7, r*1.3);
                const dir = zone.direction;
                g.lineStyle(2, 0x6B4F12, 0.5);
                for (let i = -2; i <= 2; i++) {
                    const perpX = Math.cos(dir+Math.PI/2)*i*6, perpY = Math.sin(dir+Math.PI/2)*i*6;
                    g.beginPath();
                    g.moveTo(cx+perpX-Math.cos(dir)*r*0.5, cy+perpY-Math.sin(dir)*r*0.5);
                    g.lineTo(cx+perpX+Math.cos(dir)*r*0.5, cy+perpY+Math.sin(dir)*r*0.5);
                    g.strokePath();
                }
                g.fillStyle(0xFFFFFF, 0.6);
                for (let i = -1; i <= 1; i++) {
                    const tipX = cx+Math.cos(dir)*(i*10+8), tipY = cy+Math.sin(dir)*(i*10+8);
                    const lx = cx+Math.cos(dir+2.5)*5.6+Math.cos(dir)*i*10, ly = cy+Math.sin(dir+2.5)*5.6+Math.sin(dir)*i*10;
                    const rx = cx+Math.cos(dir-2.5)*5.6+Math.cos(dir)*i*10, ry = cy+Math.sin(dir-2.5)*5.6+Math.sin(dir)*i*10;
                    g.fillTriangle(tipX, tipY, lx, ly, rx, ry);
                }
            }
        }
    }

    _renderCheckpoints() {
        const g = this.scene.add.graphics().setDepth(2);
        const cps = this.trackData.checkpoints;
        for (let i = 1; i < cps.length; i++) {
            const cp = cps[i];
            const perpAngle = cp.angle + Math.PI / 2;
            const len = this.trackData.trackWidth * 0.4;
            for (let s = 0; s < 8; s += 2) {
                const t0 = s/8, t1 = (s+1)/8;
                g.lineStyle(2, 0xFFFF00, 0.25);
                g.beginPath();
                g.moveTo(cp.x+Math.cos(perpAngle)*len*(1-2*t0), cp.y+Math.sin(perpAngle)*len*(1-2*t0));
                g.lineTo(cp.x+Math.cos(perpAngle)*len*(1-2*t1), cp.y+Math.sin(perpAngle)*len*(1-2*t1));
                g.strokePath();
            }
        }
    }

    _renderFinishLine() {
        const g = this.scene.add.graphics().setDepth(3.5);
        const cp = this.trackData.checkpoints[0];
        const perpAngle = cp.angle + Math.PI / 2;
        const halfWidth = this.trackData.trackWidth * 0.48;
        const checkerSize = 12;
        const startX = cp.x+Math.cos(perpAngle)*halfWidth, startY = cp.y+Math.sin(perpAngle)*halfWidth;
        const endX = cp.x-Math.cos(perpAngle)*halfWidth, endY = cp.y-Math.sin(perpAngle)*halfWidth;
        const dx = endX-startX, dy = endY-startY;
        const totalLen = Math.hypot(dx, dy);
        const steps = Math.floor(totalLen / checkerSize);
        const nx = dx/totalLen, ny = dy/totalLen;
        const px = -ny, py = nx;
        g.fillStyle(0xFFFFFF, 0.08);
        for (let r = 3; r > 0; r--) {
            g.fillRoundedRect(Math.min(startX,endX)-r*4, Math.min(startY,endY)-checkerSize*1.5-r*4, totalLen+r*8, checkerSize*3+r*8, 4);
        }
        for (let i = 0; i < steps; i++) {
            for (let j = 0; j < 3; j++) {
                const isWhite = (i+j) % 2 === 0;
                const bx = startX+nx*i*checkerSize+px*j*checkerSize;
                const by = startY+ny*i*checkerSize+py*j*checkerSize;
                g.fillStyle(0x000000, 0.3); g.fillRect(bx+1, by+1, checkerSize-1, checkerSize-1);
                g.fillStyle(isWhite ? 0xF0F0F0 : 0x1A1A1A, 1); g.fillRect(bx, by, checkerSize-1, checkerSize-1);
                if (isWhite) { g.fillStyle(0xFFFFFF, 0.3); g.fillRect(bx, by, checkerSize-1, 2); }
            }
        }
    }

    _renderGroundDetails() {
        const g = this.scene.add.graphics().setDepth(0.8);
        const n = this.centerPoints.length;
        const seed = this.trackIndex * 5000;
        for (let i = 0; i < 150; i++) {
            const idx = Math.floor(this._hash(seed+i)*n);
            const cp = this.centerPoints[idx];
            if (!cp) continue;
            const prev = this.centerPoints[(idx-1+n)%n], next = this.centerPoints[(idx+1)%n];
            const tx = next.x-prev.x, ty = next.y-prev.y, len = Math.hypot(tx,ty)||1;
            const ux = -ty/len, uy = tx/len;
            const side = this._hash(seed+i+100) > 0.5 ? 1 : -1;
            const dist = this.trackData.trackWidth/2+10+this._hash(seed+i+200)*25;
            const px = cp.x+ux*dist*side, py = cp.y+uy*dist*side;
            const size = 1.5+this._hash(seed+i+300)*2.5;
            g.fillStyle(this._darken(this.theme.ground, 0.2), 0.4); g.fillCircle(px+0.5, py+0.5, size);
            g.fillStyle(this._lighten(this.theme.ground, 0.15), 0.5); g.fillCircle(px, py, size*0.8);
        }
    }

    _renderDecorations() {
        this.decorGfx = this.scene.add.graphics().setDepth(4);
        for (const dec of this.trackData.decorations) {
            switch (dec.type) {
                case 'cactus': this._drawCactus(dec.x, dec.y); break;
                case 'rock': this._drawRock(dec.x, dec.y); break;
                case 'tireStack': this._drawTireStack(dec.x, dec.y); break;
                case 'spectatorStand': this._drawSpectatorStand(dec.x, dec.y, dec.width); break;
                case 'pine': this._drawPine(dec.x, dec.y); break;
                case 'snowman': this._drawSnowman(dec.x, dec.y); break;
                case 'palm': this._drawPalm(dec.x, dec.y); break;
                case 'bush': this._drawBush(dec.x, dec.y); break;
            }
        }
    }

    _drawCactus(x, y) {
        const g = this.decorGfx;
        g.fillStyle(0x000000, 0.15); g.fillEllipse(x+2, y+3, 20, 8);
        g.fillStyle(0x1B6B1B, 1); g.fillRoundedRect(x-4, y-28, 8, 30, 3);
        g.fillStyle(0x2D8B2D, 1); g.fillRoundedRect(x-3, y-27, 6, 28, 2);
        g.fillStyle(0x1B6B1B, 1); g.fillRoundedRect(x-16, y-22, 13, 6, 2);
        g.fillStyle(0x1B6B1B, 1); g.fillRoundedRect(x-16, y-30, 6, 14, 2);
        g.fillStyle(0x2D8B2D, 1); g.fillRoundedRect(x-15, y-21, 11, 4, 1);
        g.fillStyle(0x2D8B2D, 1); g.fillRoundedRect(x-15, y-29, 4, 12, 1);
        g.fillStyle(0x1B6B1B, 1); g.fillRoundedRect(x+4, y-16, 12, 6, 2);
        g.fillStyle(0x1B6B1B, 1); g.fillRoundedRect(x+10, y-26, 6, 16, 2);
        g.fillStyle(0x2D8B2D, 1); g.fillRoundedRect(x+5, y-15, 10, 4, 1);
        g.fillStyle(0x2D8B2D, 1); g.fillRoundedRect(x+11, y-25, 4, 14, 1);
        g.fillStyle(0x4CAF50, 0.3); g.fillRect(x-1, y-26, 2, 24);
    }

    _drawRock(x, y) {
        const g = this.decorGfx;
        g.fillStyle(0x000000, 0.15); g.fillEllipse(x+2, y+4, 28, 12);
        g.fillStyle(0x5C5C5C, 1); g.fillEllipse(x, y, 26, 18);
        g.fillStyle(0x707070, 1); g.fillEllipse(x-1, y-1, 22, 15);
        g.fillStyle(0x858585, 1); g.fillEllipse(x-3, y-3, 14, 10);
    }

    _drawTireStack(x, y) {
        const g = this.decorGfx;
        g.fillStyle(0x000000, 0.2); g.fillEllipse(x+2, y+5, 32, 14);
        const drawTire = (tx, ty) => {
            g.fillStyle(0x1A1A1A, 1); g.fillCircle(tx, ty, 11);
            g.fillStyle(0x2A2A2A, 1); g.fillCircle(tx, ty, 9);
            g.fillStyle(0x444444, 1); g.fillCircle(tx, ty, 4);
        };
        drawTire(x, y+2); drawTire(x+10, y); drawTire(x+5, y-10);
    }

    _drawSpectatorStand(x, y, width) {
        const g = this.decorGfx;
        g.fillStyle(0x000000, 0.15); g.fillEllipse(x, y+8, width+10, 12);
        g.fillStyle(0x5D4037, 1); g.fillRoundedRect(x-width/2, y-3, width, 14, 3);
        g.fillStyle(0x795548, 1); g.fillRoundedRect(x-width/2+1, y-2, width-2, 5, 2);
        g.fillStyle(0x4E342E, 1);
        g.fillRect(x-width/2+5, y+5, 4, 8);
        g.fillRect(x+width/2-9, y+5, 4, 8);
        const colors = [0xFF3333, 0x3388FF, 0x33CC33, 0xFFCC00, 0xFF66AA, 0xFFFFFF, 0xFF8833];
        const count = Math.floor(width / 14);
        for (let i = 0; i < count; i++) {
            const sx = x-width/2+10+i*14;
            g.fillStyle(colors[i%colors.length], 0.8); g.fillRoundedRect(sx-3, y-12, 6, 10, 2);
            g.fillStyle(0xFFDBB5, 1); g.fillCircle(sx, y-16, 4);
        }
        g.fillStyle(0x37474F, 0.8); g.fillRoundedRect(x-width/2-5, y-24, width+10, 4, 2);
    }

    _drawPine(x, y) {
        const g = this.decorGfx;
        g.fillStyle(0x000000, 0.12); g.fillEllipse(x+2, y+5, 20, 8);
        g.fillStyle(0x4E342E, 1); g.fillRoundedRect(x-3, y-5, 6, 14, 2);
        const layers = [{w:26,h:14,yOff:-8},{w:22,h:13,yOff:-16},{w:16,h:12,yOff:-24},{w:10,h:10,yOff:-30}];
        for (const l of layers) {
            g.fillStyle(0x1B5E20, 1);
            g.fillTriangle(x, y+l.yOff-l.h, x-l.w/2, y+l.yOff, x+l.w/2, y+l.yOff);
            g.fillStyle(0x2E7D32, 0.6);
            g.fillTriangle(x, y+l.yOff-l.h+2, x-l.w/2+3, y+l.yOff, x, y+l.yOff);
        }
        if (this.theme.ground === 0xD6EAF8) {
            g.fillStyle(0xFFFFFF, 0.7);
            g.fillTriangle(x, y-40, x-4, y-34, x+4, y-34);
        }
    }

    _drawSnowman(x, y) {
        const g = this.decorGfx;
        g.fillStyle(0x000000, 0.1); g.fillEllipse(x+1, y+4, 18, 8);
        g.fillStyle(0xE0E0E0, 1); g.fillCircle(x, y, 10);
        g.fillStyle(0xF5F5F5, 1); g.fillCircle(x-1, y-1, 8);
        g.fillStyle(0xE0E0E0, 1); g.fillCircle(x, y-13, 7);
        g.fillStyle(0xE0E0E0, 1); g.fillCircle(x, y-22, 5);
        g.fillStyle(0xFF7043, 1); g.fillTriangle(x, y-22, x+8, y-21, x+1, y-20);
        g.fillStyle(0x212121, 1); g.fillCircle(x-2, y-24, 1.2); g.fillCircle(x+2, y-24, 1.2);
        g.fillStyle(0x212121, 1); g.fillRect(x-6, y-28, 12, 2); g.fillRect(x-4, y-35, 8, 7);
        g.fillStyle(0xE53935, 1); g.fillRoundedRect(x-5, y-17, 10, 3, 1);
    }

    _drawPalm(x, y) {
        const g = this.decorGfx;
        g.fillStyle(0x000000, 0.12); g.fillEllipse(x+3, y+4, 30, 10);
        g.fillStyle(0x6D4C41, 1); g.fillRoundedRect(x-4, y-32, 8, 34, 3);
        const frondColors = [0x1B5E20, 0x2E7D32, 0x388E3C, 0x43A047];
        for (let i = 0; i < 7; i++) {
            const angle = (i/7)*Math.PI*2+0.3;
            const len = 20+Math.sin(i*2.1)*6;
            const fx = x+Math.cos(angle)*len;
            const fy = y-32+Math.sin(angle)*8+Math.abs(Math.cos(angle))*4;
            g.fillStyle(frondColors[i%frondColors.length], 1);
            g.fillTriangle(x, y-32, x+Math.cos(angle)*len*0.4-2, y-34+Math.sin(angle)*3, fx, fy);
        }
        g.fillStyle(0x5D4037, 1); g.fillCircle(x-3, y-30, 3); g.fillCircle(x+2, y-29, 2.5);
    }

    _drawBush(x, y) {
        const g = this.decorGfx;
        g.fillStyle(0x000000, 0.1); g.fillEllipse(x, y+4, 22, 8);
        g.fillStyle(0x1B5E20, 1); g.fillEllipse(x, y, 20, 14);
        g.fillStyle(0x2E7D32, 1); g.fillEllipse(x+4, y-1, 16, 11);
        g.fillStyle(0x388E3C, 1); g.fillEllipse(x-3, y-2, 14, 10);
        g.fillStyle(0x43A047, 1); g.fillEllipse(x+1, y-3, 10, 7);
    }

    // --- MINIMAP ---
    renderMinimap(gfx, x, y, w, h, vehicles) {
        const scaleX = w / this.worldWidth, scaleY = h / this.worldHeight;

        // Panel background
        gfx.fillStyle(0x0D0D1A, 0.85);
        gfx.fillRoundedRect(x - 4, y - 4, w + 8, h + 8, 6);
        gfx.lineStyle(1, 0x3388FF, 0.4);
        gfx.strokeRoundedRect(x - 4, y - 4, w + 8, h + 8, 6);

        // Track fill (not just outline)
        gfx.fillStyle(0x444466, 0.5);
        gfx.beginPath();
        const step = 3;
        for (let i = 0; i < this.centerPoints.length; i += step) {
            const lp = this.leftEdge[i];
            const mx = x + lp.x * scaleX, my = y + lp.y * scaleY;
            if (i === 0) gfx.moveTo(mx, my); else gfx.lineTo(mx, my);
        }
        for (let i = this.centerPoints.length - 1; i >= 0; i -= step) {
            const rp = this.rightEdge[i];
            gfx.lineTo(x + rp.x * scaleX, y + rp.y * scaleY);
        }
        gfx.closePath();
        gfx.fillPath();

        // Track outline
        gfx.lineStyle(1, 0x6688AA, 0.6);
        gfx.beginPath();
        for (let i = 0; i < this.centerPoints.length; i += step) {
            const p = this.centerPoints[i];
            const mx = x + p.x * scaleX, my = y + p.y * scaleY;
            if (i === 0) gfx.moveTo(mx, my); else gfx.lineTo(mx, my);
        }
        gfx.closePath();
        gfx.strokePath();

        // Vehicle dots with direction arrows
        if (vehicles) {
            for (const v of vehicles) {
                const vx = x + v.x * scaleX, vy = y + v.y * scaleY;
                const vc = CONFIG.VEHICLES[v.colorIndex || 0];
                // Glow
                gfx.fillStyle(vc ? vc.color : 0xFFFFFF, 0.3);
                gfx.fillCircle(vx, vy, 5);
                // Dot
                gfx.fillStyle(vc ? vc.color : 0xFFFFFF, 1);
                gfx.fillCircle(vx, vy, 3);
            }
        }
    }

    // === UTILITY ===
    _hash(n) {
        let x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
        return x - Math.floor(x);
    }
    _darken(color, amount) {
        const r = Math.max(0, ((color >> 16) & 0xFF) * (1 - amount));
        const g = Math.max(0, ((color >> 8) & 0xFF) * (1 - amount));
        const b = Math.max(0, (color & 0xFF) * (1 - amount));
        return (Math.floor(r) << 16) | (Math.floor(g) << 8) | Math.floor(b);
    }
    _lighten(color, amount) {
        const r = Math.min(255, ((color >> 16) & 0xFF) + 255 * amount);
        const g = Math.min(255, ((color >> 8) & 0xFF) + 255 * amount);
        const b = Math.min(255, (color & 0xFF) + 255 * amount);
        return (Math.floor(r) << 16) | (Math.floor(g) << 8) | Math.floor(b);
    }
}
