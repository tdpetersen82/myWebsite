// ============================================================
// Tempest — Tube Entity
// Generates the geometric tube structure with lane positions
// ============================================================

class Tube {
    constructor(tubeDef, centerX, centerY, outerRadius, innerRadius) {
        this.def = tubeDef;
        this.cx = centerX;
        this.cy = centerY;
        this.outerR = outerRadius;
        this.innerR = innerRadius;
        this.lanes = tubeDef.lanes;
        this.open = tubeDef.open || false;

        // Each lane has: outerLeft, outerRight, innerLeft, innerRight
        // Points on the rim and corresponding points at the center
        this.rimPoints = [];    // array of {x, y} — one per lane vertex
        this.centerPoints = []; // corresponding inner points
        this.laneAngles = [];   // angle at each rim point

        this._generate();
    }

    _generate() {
        const def = this.def;
        const n = def.lanes + (def.open ? 1 : 0); // vertices needed

        switch (def.type) {
            case 'circle':
                this._generateCircle(n);
                break;
            case 'polygon':
                this._generatePolygon(n, def.sides, def.rotation || 0);
                break;
            case 'plus':
                this._generatePlus(n);
                break;
            case 'flat':
                this._generateFlat(n);
                break;
            case 'vshape':
                this._generateVShape(n);
                break;
            case 'star':
                this._generateStar(n, def.points || 5);
                break;
            case 'wshape':
                this._generateWShape(n);
                break;
            case 'figure8':
                this._generateFigure8(n);
                break;
            case 'cross':
                this._generateCross(n);
                break;
            case 'ushape':
                this._generateUShape(n);
                break;
            case 'clover':
                this._generateClover(n);
                break;
            default:
                this._generateCircle(n);
        }

        // Generate center points (scaled toward center)
        this.centerPoints = this.rimPoints.map(p => {
            const dx = p.x - this.cx;
            const dy = p.y - this.cy;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist === 0) return { x: this.cx, y: this.cy };
            const scale = this.innerR / dist;
            return {
                x: this.cx + dx * scale,
                y: this.cy + dy * scale
            };
        });

        // Calculate lane angles
        this.laneAngles = this.rimPoints.map(p => {
            return Math.atan2(p.y - this.cy, p.x - this.cx);
        });
    }

    _generateCircle(n) {
        const startAngle = -Math.PI / 2;
        for (let i = 0; i < n; i++) {
            const angle = startAngle + (i / this.lanes) * Math.PI * 2;
            this.rimPoints.push({
                x: this.cx + Math.cos(angle) * this.outerR,
                y: this.cy + Math.sin(angle) * this.outerR
            });
        }
    }

    _generatePolygon(n, sides, rotation) {
        // Distribute n points evenly along the polygon perimeter
        const verts = [];
        for (let i = 0; i < sides; i++) {
            const angle = rotation - Math.PI / 2 + (i / sides) * Math.PI * 2;
            verts.push({
                x: this.cx + Math.cos(angle) * this.outerR,
                y: this.cy + Math.sin(angle) * this.outerR
            });
        }

        // Distribute n points along polygon edges
        const totalPerimeter = this._polygonPerimeter(verts);
        const segmentLen = totalPerimeter / this.lanes;

        let currentDist = 0;
        let vertIdx = 0;
        let edgeProgress = 0;

        for (let i = 0; i < n; i++) {
            const targetDist = i * segmentLen;
            while (currentDist + this._edgeRemaining(verts, vertIdx, edgeProgress) < targetDist && vertIdx < sides) {
                currentDist += this._edgeRemaining(verts, vertIdx, edgeProgress);
                vertIdx = (vertIdx + 1) % sides;
                edgeProgress = 0;
            }
            const remaining = targetDist - currentDist;
            const v1 = verts[vertIdx % sides];
            const v2 = verts[(vertIdx + 1) % sides];
            const edgeLen = this._dist(v1, v2);
            const t = edgeLen > 0 ? (edgeProgress + remaining) / edgeLen : 0;
            this.rimPoints.push({
                x: v1.x + (v2.x - v1.x) * t,
                y: v1.y + (v2.y - v1.y) * t
            });
        }
    }

    _generatePlus(n) {
        // Plus shape: indented square
        const r = this.outerR;
        const inset = r * 0.4;
        const arm = r * 0.35;
        // Define plus vertices (12 vertices for the shape)
        const pts = [
            { x: -arm, y: -r }, { x: arm, y: -r },
            { x: arm, y: -inset }, { x: r, y: -inset },
            { x: r, y: inset }, { x: arm, y: inset },
            { x: arm, y: r }, { x: -arm, y: r },
            { x: -arm, y: inset }, { x: -r, y: inset },
            { x: -r, y: -inset }, { x: -arm, y: -inset },
        ].map(p => ({ x: this.cx + p.x, y: this.cy + p.y }));

        this._distributeAlongPath(pts, n, false);
    }

    _generateFlat(n) {
        const width = this.outerR * 2;
        for (let i = 0; i < n; i++) {
            const t = i / (n - 1);
            this.rimPoints.push({
                x: this.cx - width / 2 + t * width,
                y: this.cy + 100
            });
        }
    }

    _generateVShape(n) {
        const width = this.outerR * 1.6;
        const depth = this.outerR * 0.8;
        const half = Math.floor(n / 2);
        for (let i = 0; i < n; i++) {
            let t, x, y;
            if (i <= half) {
                t = i / half;
                x = this.cx - width / 2 + t * width / 2;
                y = this.cy + 120 - t * depth;
            } else {
                t = (i - half) / (n - 1 - half);
                x = this.cx + t * width / 2;
                y = this.cy + 120 - depth + t * depth;
            }
            this.rimPoints.push({ x, y });
        }
    }

    _generateStar(n, points) {
        const outerR = this.outerR;
        const innerStarR = this.outerR * 0.5;
        const starVerts = [];
        for (let i = 0; i < points * 2; i++) {
            const angle = -Math.PI / 2 + (i / (points * 2)) * Math.PI * 2;
            const r = i % 2 === 0 ? outerR : innerStarR;
            starVerts.push({
                x: this.cx + Math.cos(angle) * r,
                y: this.cy + Math.sin(angle) * r
            });
        }
        this._distributeAlongPath(starVerts, n, false);
    }

    _generateWShape(n) {
        const w = this.outerR * 2;
        const h = this.outerR * 0.8;
        const pts = [];
        const segments = 4;
        for (let i = 0; i <= segments; i++) {
            const t = i / segments;
            const x = this.cx - w / 2 + t * w;
            const y = i % 2 === 0 ? this.cy + 120 : this.cy + 120 - h;
            pts.push({ x, y });
        }
        // Distribute n points along this open path
        this._distributeAlongOpenPath(pts, n);
    }

    _generateFigure8(n) {
        for (let i = 0; i < n; i++) {
            const t = (i / n) * Math.PI * 2;
            const x = this.cx + this.outerR * 0.7 * Math.sin(t);
            const y = this.cy + this.outerR * Math.sin(t) * Math.cos(t);
            this.rimPoints.push({ x, y });
        }
    }

    _generateCross(n) {
        const r = this.outerR;
        const arm = r * 0.25;
        const pts = [
            { x: -arm, y: -r }, { x: arm, y: -r },
            { x: arm, y: -arm }, { x: r, y: -arm },
            { x: r, y: arm }, { x: arm, y: arm },
            { x: arm, y: r }, { x: -arm, y: r },
            { x: -arm, y: arm }, { x: -r, y: arm },
            { x: -r, y: -arm }, { x: -arm, y: -arm },
        ].map(p => ({ x: this.cx + p.x, y: this.cy + p.y }));

        this._distributeAlongPath(pts, n, false);
    }

    _generateUShape(n) {
        const pts = [];
        const steps = 20;
        for (let i = 0; i <= steps; i++) {
            const t = i / steps;
            let x, y;
            if (t < 0.2) {
                // Left arm going down
                const lt = t / 0.2;
                x = this.cx - this.outerR;
                y = this.cy - this.outerR * 0.6 + lt * this.outerR * 1.2;
            } else if (t > 0.8) {
                // Right arm going up
                const lt = (t - 0.8) / 0.2;
                x = this.cx + this.outerR;
                y = this.cy + this.outerR * 0.6 - lt * this.outerR * 1.2;
            } else {
                // Bottom curve
                const lt = (t - 0.2) / 0.6;
                const angle = Math.PI - lt * Math.PI;
                x = this.cx + Math.cos(angle) * this.outerR;
                y = this.cy + Math.sin(angle) * this.outerR * 0.6 + this.outerR * 0.4;
            }
            pts.push({ x, y });
        }
        this._distributeAlongOpenPath(pts, n);
    }

    _generateClover(n) {
        const lobes = 4;
        for (let i = 0; i < n; i++) {
            const t = (i / n) * Math.PI * 2;
            const r = this.outerR * (0.5 + 0.5 * Math.abs(Math.cos(lobes / 2 * t)));
            this.rimPoints.push({
                x: this.cx + Math.cos(t) * r,
                y: this.cy + Math.sin(t) * r
            });
        }
    }

    _distributeAlongPath(verts, n, open) {
        const totalPerimeter = this._pathLength(verts, !open);
        const segmentLen = totalPerimeter / (open ? n - 1 : this.lanes);

        for (let i = 0; i < n; i++) {
            const targetDist = i * segmentLen;
            let accumulated = 0;
            let found = false;
            for (let j = 0; j < verts.length; j++) {
                const next = open ? j + 1 : (j + 1) % verts.length;
                if (next >= verts.length && open) break;
                const edgeLen = this._dist(verts[j], verts[next]);
                if (accumulated + edgeLen >= targetDist - 0.001) {
                    const t = edgeLen > 0 ? (targetDist - accumulated) / edgeLen : 0;
                    this.rimPoints.push({
                        x: verts[j].x + (verts[next].x - verts[j].x) * Math.min(t, 1),
                        y: verts[j].y + (verts[next].y - verts[j].y) * Math.min(t, 1)
                    });
                    found = true;
                    break;
                }
                accumulated += edgeLen;
            }
            if (!found) {
                this.rimPoints.push(verts[verts.length - 1]);
            }
        }
    }

    _distributeAlongOpenPath(pts, n) {
        const totalLen = this._pathLength(pts, false);
        for (let i = 0; i < n; i++) {
            const targetDist = (i / (n - 1)) * totalLen;
            let accumulated = 0;
            let found = false;
            for (let j = 0; j < pts.length - 1; j++) {
                const edgeLen = this._dist(pts[j], pts[j + 1]);
                if (accumulated + edgeLen >= targetDist - 0.001) {
                    const t = edgeLen > 0 ? (targetDist - accumulated) / edgeLen : 0;
                    this.rimPoints.push({
                        x: pts[j].x + (pts[j + 1].x - pts[j].x) * Math.min(t, 1),
                        y: pts[j].y + (pts[j + 1].y - pts[j].y) * Math.min(t, 1)
                    });
                    found = true;
                    break;
                }
                accumulated += edgeLen;
            }
            if (!found) {
                this.rimPoints.push(pts[pts.length - 1]);
            }
        }
    }

    _polygonPerimeter(verts) {
        let total = 0;
        for (let i = 0; i < verts.length; i++) {
            total += this._dist(verts[i], verts[(i + 1) % verts.length]);
        }
        return total;
    }

    _pathLength(pts, closed) {
        let total = 0;
        const len = closed ? pts.length : pts.length - 1;
        for (let i = 0; i < len; i++) {
            total += this._dist(pts[i], pts[(i + 1) % pts.length]);
        }
        return total;
    }

    _edgeRemaining(verts, idx, progress) {
        const v1 = verts[idx % verts.length];
        const v2 = verts[(idx + 1) % verts.length];
        return this._dist(v1, v2) - progress;
    }

    _dist(a, b) {
        return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
    }

    // Get the rim position for a lane index (center of lane edge)
    getLaneRimPos(laneIdx) {
        const i1 = laneIdx % this.rimPoints.length;
        const i2 = (laneIdx + 1) % this.rimPoints.length;
        if (this.open && laneIdx >= this.lanes) {
            return this.rimPoints[this.rimPoints.length - 1];
        }
        const p1 = this.rimPoints[i1];
        const p2 = this.rimPoints[i2];
        return {
            x: (p1.x + p2.x) / 2,
            y: (p1.y + p2.y) / 2
        };
    }

    // Get the center position for a lane
    getLaneCenterPos(laneIdx) {
        const i1 = laneIdx % this.centerPoints.length;
        const i2 = (laneIdx + 1) % this.centerPoints.length;
        if (this.open && laneIdx >= this.lanes) {
            return this.centerPoints[this.centerPoints.length - 1];
        }
        const p1 = this.centerPoints[i1];
        const p2 = this.centerPoints[i2];
        return {
            x: (p1.x + p2.x) / 2,
            y: (p1.y + p2.y) / 2
        };
    }

    // Get position along a lane at a given depth (0 = center, 1 = rim)
    getLanePosition(laneIdx, depth) {
        const rim = this.getLaneRimPos(laneIdx);
        const center = this.getLaneCenterPos(laneIdx);
        return {
            x: center.x + (rim.x - center.x) * depth,
            y: center.y + (rim.y - center.y) * depth
        };
    }

    // Get the angle of the lane at the rim (for drawing the player)
    getLaneAngle(laneIdx) {
        const rim = this.getLaneRimPos(laneIdx);
        const center = this.getLaneCenterPos(laneIdx);
        return Math.atan2(rim.y - center.y, rim.x - center.x);
    }

    // Get adjacent lane index
    getAdjacentLane(laneIdx, direction) {
        if (this.open) {
            const next = laneIdx + direction;
            if (next < 0 || next >= this.lanes) return laneIdx;
            return next;
        }
        return (laneIdx + direction + this.lanes) % this.lanes;
    }
}
