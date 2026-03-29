// SpaceX Lander - Sky Entity (Space-to-Atmosphere transition)

class Sky {
    constructor(scene) {
        this.scene = scene;
        this.atmosphereBlend = 0; // 0 = space, 1 = full atmosphere

        // Pre-generate stars (in world-relative offsets, spread across a large area)
        this.stars = [];
        const starArea = 6000; // spread stars across a large world area
        CONFIG.VFX.STAR_LAYERS.forEach(layer => {
            for (let i = 0; i < layer.count; i++) {
                this.stars.push({
                    x: (Math.random() - 0.5) * starArea,
                    y: -5000 + Math.random() * starArea,
                    size: layer.sizeMin + Math.random() * (layer.sizeMax - layer.sizeMin),
                    alpha: layer.alphaMin + Math.random() * (layer.alphaMax - layer.alphaMin),
                    speed: layer.speed
                });
            }
        });

        // Shooting stars
        this.shootingStars = [];
        this._shootingStarTimer = 0;

        // Pre-generate clouds (positioned near the ocean surface)
        this.clouds = [];
        const oceanY = CONFIG.OCEAN.WATER_LEVEL;
        for (let i = 0; i < 8; i++) {
            this.clouds.push({
                x: -200 + Math.random() * (CONFIG.WIDTH + 400),
                y: oceanY - 300 - Math.random() * 400, // clouds 300-700px above ocean
                width: 60 + Math.random() * 80,
                height: 20 + Math.random() * 15,
                speed: 0.1 + Math.random() * 0.2,
                blobs: this._generateCloudBlobs()
            });
        }
    }

    _generateCloudBlobs() {
        const blobs = [];
        const count = 3 + Math.floor(Math.random() * 3);
        for (let i = 0; i < count; i++) {
            blobs.push({
                ox: (Math.random() - 0.5) * 50,
                oy: (Math.random() - 0.5) * 12,
                rx: 15 + Math.random() * 25,
                ry: 8 + Math.random() * 10
            });
        }
        return blobs;
    }

    update(delta, altitude) {
        // Blend based on altitude — smooth transition over the descent range
        if (altitude > 4000) {
            this.atmosphereBlend = 0;
        } else if (altitude > 1500) {
            this.atmosphereBlend = 1 - (altitude - 1500) / 2500;
        } else {
            this.atmosphereBlend = 1;
        }

        // Drift stars slowly
        for (const s of this.stars) {
            s.x -= s.speed;
        }

        // Drift clouds
        for (const c of this.clouds) {
            c.x -= c.speed;
            if (c.x < -200) c.x = CONFIG.WIDTH + 200;
        }

        // Shooting stars (only in space)
        const dt = delta / 1000;
        if (this.atmosphereBlend < 0.5) {
            this._shootingStarTimer -= dt;
            if (this._shootingStarTimer <= 0) {
                this._shootingStarTimer = 3 + Math.random() * 5;
                const cam = this.scene.cameras.main;
                const wv = cam.worldView;
                this.shootingStars.push({
                    x: wv.x + Math.random() * wv.width,
                    y: wv.y + Math.random() * wv.height * 0.6,
                    vx: -(120 + Math.random() * 80),
                    vy: 60 + Math.random() * 40,
                    life: 0.6 + Math.random() * 0.4,
                    maxLife: 0.6 + Math.random() * 0.4
                });
            }
        }
        for (let i = this.shootingStars.length - 1; i >= 0; i--) {
            const ss = this.shootingStars[i];
            ss.x += ss.vx * dt;
            ss.y += ss.vy * dt;
            ss.life -= dt;
            if (ss.life <= 0) this.shootingStars.splice(i, 1);
        }
    }

    draw(graphics) {
        const cam = this.scene.cameras.main;
        const wv = cam.worldView;
        const w = wv.width;
        const h = wv.height;
        const ox = wv.x;
        const oy = wv.y;
        const blend = this.atmosphereBlend;

        graphics.clear();

        // Space background (fades out as atmosphere increases)
        if (blend < 1) {
            const spaceAlpha = 1 - blend;
            graphics.fillStyle(CONFIG.COLORS.SPACE, spaceAlpha);
            graphics.fillRect(ox - 100, oy - 100, w + 200, h + 200);

            // Stars — drawn at world positions, only those visible in camera view
            for (const s of this.stars) {
                if (s.x >= ox - 10 && s.x <= ox + w + 10 &&
                    s.y >= oy - 10 && s.y <= oy + h + 10) {
                    graphics.fillStyle(0xffffff, s.alpha * spaceAlpha);
                    graphics.fillCircle(s.x, s.y, s.size);
                }
            }

            // Shooting stars
            for (const ss of this.shootingStars) {
                const alpha = (ss.life / ss.maxLife) * spaceAlpha;
                const tailLen = 18;
                const speed = Math.sqrt(ss.vx * ss.vx + ss.vy * ss.vy);
                const nx = ss.vx / speed;
                const ny = ss.vy / speed;
                graphics.lineStyle(1.5, 0xffffff, alpha * 0.9);
                graphics.beginPath();
                graphics.moveTo(ss.x, ss.y);
                graphics.lineTo(ss.x - nx * tailLen, ss.y - ny * tailLen);
                graphics.strokePath();
                graphics.fillStyle(0xffffff, alpha);
                graphics.fillCircle(ss.x, ss.y, 1.5);
            }

            // --- EARTH CURVATURE at high altitude ---
            if (blend < 0.6) {
                const curveFade = 1 - blend / 0.6;
                const curveY = oy + h * 0.85;
                const curveRadius = 2000;
                const centerX = ox + w / 2;

                const hazeColors = [
                    { r: 10, g: 40, b: 100, a: 0.5 },
                    { r: 30, g: 80, b: 160, a: 0.35 },
                    { r: 60, g: 130, b: 200, a: 0.2 },
                    { r: 100, g: 170, b: 230, a: 0.1 }
                ];

                for (let i = hazeColors.length - 1; i >= 0; i--) {
                    const haze = hazeColors[i];
                    const bandOffset = i * 12;
                    const color = Phaser.Display.Color.GetColor(haze.r, haze.g, haze.b);
                    graphics.fillStyle(color, haze.a * curveFade);
                    graphics.beginPath();
                    for (let x = ox - 100; x <= ox + w + 100; x += 8) {
                        const dx = x - centerX;
                        const curveOffset = (dx * dx) / (curveRadius * 2);
                        const py = curveY - bandOffset + curveOffset;
                        if (x === ox - 100) graphics.moveTo(x, py);
                        else graphics.lineTo(x, py);
                    }
                    graphics.lineTo(ox + w + 100, oy + h + 100);
                    graphics.lineTo(ox - 100, oy + h + 100);
                    graphics.closePath();
                    graphics.fillPath();
                }

                graphics.lineStyle(2, 0x4499dd, 0.6 * curveFade);
                graphics.beginPath();
                for (let x = ox - 100; x <= ox + w + 100; x += 8) {
                    const dx = x - centerX;
                    const curveOffset = (dx * dx) / (curveRadius * 2);
                    const py = curveY + curveOffset;
                    if (x === ox - 100) graphics.moveTo(x, py);
                    else graphics.lineTo(x, py);
                }
                graphics.strokePath();
            }
        }

        // Atmosphere gradient (fades in)
        if (blend > 0) {
            const steps = 60;
            for (let i = 0; i < steps; i++) {
                const t = i / steps;
                const y = oy + t * h;
                const segH = h / steps + 2;

                const r = Math.floor(this._lerp(10, 106, t));
                const g = Math.floor(this._lerp(40, 170, t));
                const b = Math.floor(this._lerp(80, 232, t));
                const color = Phaser.Display.Color.GetColor(r, g, b);

                graphics.fillStyle(color, blend * 0.85);
                graphics.fillRect(ox - 100, y, w + 200, segH);
            }

            // Clouds — drawn at world positions near the ocean
            if (blend > 0.3) {
                const cloudAlpha = Math.min(1, (blend - 0.3) / 0.7) * 0.35;
                for (const cloud of this.clouds) {
                    // Only draw clouds visible in the camera view
                    if (cloud.y >= oy - 50 && cloud.y <= oy + h + 50) {
                        for (const blob of cloud.blobs) {
                            graphics.fillStyle(0xffffff, cloudAlpha * 0.6);
                            graphics.fillEllipse(
                                cloud.x + blob.ox,
                                cloud.y + blob.oy,
                                blob.rx * 2,
                                blob.ry * 2
                            );
                        }
                    }
                }
            }

            // Horizon glow — warm orange/pink bands near bottom
            if (blend > 0.5) {
                const glowAlpha = (blend - 0.5) * 2;
                const glowY = oy + h * 0.82;
                const glowH = h * 0.18;
                const glowBands = [
                    { offset: 0, color: Phaser.Display.Color.GetColor(255, 160, 80), a: 0.06 },
                    { offset: 0.3, color: Phaser.Display.Color.GetColor(255, 120, 70), a: 0.04 },
                    { offset: 0.6, color: Phaser.Display.Color.GetColor(220, 100, 80), a: 0.03 }
                ];
                for (const band of glowBands) {
                    graphics.fillStyle(band.color, band.a * glowAlpha);
                    graphics.fillRect(ox - 100, glowY + band.offset * glowH, w + 200, glowH * (1 - band.offset));
                }
            }
        }
    }

    _lerp(a, b, t) {
        return a + (b - a) * t;
    }
}
