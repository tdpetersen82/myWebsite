// SpaceX Lander - Sky Entity (Space-to-Atmosphere transition)

class Sky {
    constructor(scene) {
        this.scene = scene;
        this.atmosphereBlend = 0; // 0 = space, 1 = full atmosphere

        // Pre-generate stars
        this.stars = [];
        CONFIG.VFX.STAR_LAYERS.forEach(layer => {
            for (let i = 0; i < layer.count; i++) {
                this.stars.push({
                    x: Math.random() * CONFIG.WIDTH,
                    y: Math.random() * CONFIG.HEIGHT,
                    size: layer.sizeMin + Math.random() * (layer.sizeMax - layer.sizeMin),
                    alpha: layer.alphaMin + Math.random() * (layer.alphaMax - layer.alphaMin),
                    speed: layer.speed
                });
            }
        });

        // Pre-generate clouds
        this.clouds = [];
        for (let i = 0; i < 5; i++) {
            this.clouds.push({
                x: Math.random() * CONFIG.WIDTH,
                y: 200 + Math.random() * 250,
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
        // Blend based on altitude
        if (altitude > 3000) {
            this.atmosphereBlend = 0;
        } else if (altitude > 1000) {
            this.atmosphereBlend = 1 - (altitude - 1000) / 2000;
        } else {
            this.atmosphereBlend = 1;
        }

        // Drift stars slowly
        for (const s of this.stars) {
            s.x -= s.speed;
            if (s.x < -5) s.x = CONFIG.WIDTH + 5;
        }

        // Drift clouds
        for (const c of this.clouds) {
            c.x -= c.speed;
            if (c.x < -100) c.x = CONFIG.WIDTH + 100;
        }
    }

    draw(graphics) {
        const w = CONFIG.WIDTH;
        const h = CONFIG.HEIGHT;
        const blend = this.atmosphereBlend;

        graphics.clear();

        // Space background (fades out as atmosphere increases)
        if (blend < 1) {
            const spaceAlpha = 1 - blend;
            graphics.fillStyle(CONFIG.COLORS.SPACE, spaceAlpha);
            graphics.fillRect(0, 0, w, h);

            // Stars
            for (const s of this.stars) {
                graphics.fillStyle(0xffffff, s.alpha * spaceAlpha);
                graphics.fillCircle(s.x, s.y, s.size);
            }
        }

        // Atmosphere gradient (fades in)
        if (blend > 0) {
            const steps = 60;
            for (let i = 0; i < steps; i++) {
                const t = i / steps;
                const y = t * h;
                const segH = h / steps + 1;

                // Interpolate from top color to bottom color
                const r = Math.floor(this._lerp(10, 106, t));
                const g = Math.floor(this._lerp(40, 170, t));
                const b = Math.floor(this._lerp(80, 232, t));
                const color = Phaser.Display.Color.GetColor(r, g, b);

                graphics.fillStyle(color, blend * 0.85);
                graphics.fillRect(0, y, w, segH);
            }

            // Clouds
            if (blend > 0.3) {
                const cloudAlpha = Math.min(1, (blend - 0.3) / 0.7) * 0.35;
                for (const cloud of this.clouds) {
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
    }

    _lerp(a, b, t) {
        return a + (b - a) * t;
    }
}
