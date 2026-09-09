// SpaceX Lander - Ocean Entity (Animated wave surface + water body)

class Ocean {
    constructor(scene, level) {
        this.scene = scene;
        this.waterLevel = CONFIG.OCEAN.WATER_LEVEL;
        this.waveOffset = 0;

        // Sea state for this landing index
        this.waveAmplitude = CONFIG.getLevelDef(level).waveAmp;
        this.waveFreq = CONFIG.OCEAN.WAVE_FREQ;
        this.waveSpeed = CONFIG.OCEAN.WAVE_SPEED;
        this.swellAmplitude = this.waveAmplitude * CONFIG.OCEAN.SWELL_RATIO;
        this.chopAmplitude = this.waveAmplitude * CONFIG.OCEAN.CHOP_RATIO;
    }

    update(delta) {
        const dt = delta / 1000;
        this.waveOffset += this.waveSpeed * dt;
    }

    getHeightAt(x) {
        const t = this.waveOffset;
        const f = this.waveFreq;

        return this.waterLevel
            - Math.sin(x * f + t) * this.waveAmplitude
            - Math.sin(x * f * 0.3 + t * 0.7) * this.swellAmplitude
            - Math.sin(x * f * 2.1 + t * 1.3) * this.chopAmplitude;
    }

    draw(graphics) {
        const cam = this.scene.cameras.main;
        const wv = cam.worldView;
        const left = wv.x - 100;
        const right = wv.x + wv.width + 100;
        const bottom = wv.y + wv.height + 100;
        const step = 4;

        // Draw only below the real wave silhouette, keeping troughs free of flat seams.
        if (bottom < this.waterLevel - 50) return;
        graphics.fillStyle(0x123b50, 1);
        graphics.beginPath(); graphics.moveTo(left,bottom);
        for(let x=left;x<=right;x+=step) graphics.lineTo(x,this.getHeightAt(x));
        graphics.lineTo(right,bottom);graphics.closePath();graphics.fillPath();
        // Depth bands follow the surface, with darker water below.
        for(let band=0;band<20;band++) {
            graphics.fillStyle(0x031321,.045);
            graphics.beginPath();graphics.moveTo(left,bottom);
            for(let x=left;x<=right;x+=8) graphics.lineTo(x,this.getHeightAt(x)+5+band*6);
            graphics.lineTo(right,bottom);graphics.closePath();graphics.fillPath();
        }
        // Broken, gently moving reflections, distributed in world coordinates.
        for(let row=0;row<18;row++) {
            const depth=7+row*9;
            for(let x=Math.floor(left/42)*42;x<right;x+=42) {
                const drift=Math.sin(this.waveOffset*.7+row+x*.013)*7;
                const px=x+drift;
                const y=this.getHeightAt(px)+depth;
                const shimmer=.04+.09*(.5+.5*Math.sin(x*.08+row+this.waveOffset));
                graphics.lineStyle(row<4?1:.6,0x92cbd7,shimmer);
                graphics.lineBetween(px,y,px+8+row*.7,y-1);
            }
        }

        // Wave highlights / foam
        if (this.waveAmplitude > CONFIG.OCEAN.FOAM_THRESHOLD) {
            graphics.lineStyle(1, CONFIG.COLORS.OCEAN_FOAM, 0.3);
            for (let x = left; x <= right; x += step) {
                const y = this.getHeightAt(x);
                const nextY = this.getHeightAt(x + step);
                const prevY = this.getHeightAt(x - step);
                if (y < nextY && y < prevY) {
                    // Foam line at wave peak
                    graphics.beginPath();
                    graphics.moveTo(x - 3, y + 1);
                    graphics.lineTo(x + 3, y + 1);
                    graphics.strokePath();

                    // Scattered foam dots near peaks
                    graphics.fillStyle(CONFIG.COLORS.OCEAN_FOAM, 0.2);
                    graphics.fillCircle(x + 5, y + 2.5, 1);
                    graphics.fillCircle(x - 4, y + 3, 0.8);
                } else if (y > nextY) {
                    // Specular highlight on rising wave face
                    graphics.lineStyle(0.5, CONFIG.COLORS.OCEAN_HIGHLIGHT, 0.12);
                    graphics.beginPath();
                    graphics.moveTo(x, y);
                    graphics.lineTo(x + step, nextY);
                    graphics.strokePath();
                    graphics.lineStyle(1, CONFIG.COLORS.OCEAN_FOAM, 0.3);
                }
            }
        }

        // Horizon line glow
        graphics.lineStyle(1, CONFIG.COLORS.OCEAN_HIGHLIGHT, 0.15);
        graphics.beginPath();
        for (let x = left; x <= right; x += step) {
            const y = this.getHeightAt(x);
            if (x === left) graphics.moveTo(x, y);
            else graphics.lineTo(x, y);
        }
        graphics.strokePath();
    }
}
