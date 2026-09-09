// ============================================================
// Simon — ColorPad Entity
// A colored quadrant arc that lights up and can be clicked.
// ============================================================

class ColorPad {
    /**
     * @param {Phaser.Scene} scene
     * @param {object} padConfig - one of SIMON_CONFIG.PADS entries
     * @param {number} startAngle - start angle in radians
     * @param {number} endAngle - end angle in radians
     */
    constructor(scene, padConfig, startAngle, endAngle) {
        this.scene = scene;
        this.config = padConfig;
        this.index = padConfig.index;
        this.normalColor = padConfig.normal;
        this.litColor = padConfig.lit;
        this.startAngle = startAngle;
        this.endAngle = endAngle;
        this.isLit = false;
        this.enabled = false;

        const cx = SIMON_CONFIG.CENTER_X;
        const cy = SIMON_CONFIG.CENTER_Y;
        const outer = SIMON_CONFIG.PAD_RADIUS;
        const inner = SIMON_CONFIG.PAD_INNER_RADIUS;

        // Create the arc shape using Phaser Graphics
        this.graphics = scene.add.graphics();
        this.draw(this.normalColor);

        // Create an invisible hit zone for click detection
        this.hitZone = scene.add.zone(cx, cy, outer * 2, outer * 2);
        this.hitZone.setInteractive(
            new Phaser.Geom.Circle(0, 0, outer),
            (hitArea, x, y) => {
                // Transform x,y relative to center
                const relX = x - outer;
                const relY = y - outer;
                const dist = Math.sqrt(relX * relX + relY * relY);
                if (dist < inner || dist > outer) return false;

                let angle = Math.atan2(relY, relX);
                if (angle < 0) angle += Math.PI * 2;

                // Handle wrap-around for angles crossing 0
                let start = this.startAngle;
                let end = this.endAngle;
                if (start < 0) start += Math.PI * 2;
                if (end < 0) end += Math.PI * 2;

                if (start < end) {
                    return angle >= start && angle <= end;
                } else {
                    return angle >= start || angle <= end;
                }
            }
        );

        this.hitZone.on('pointerdown', () => {
            if (this.enabled) {
                this.scene.events.emit('padPressed', this.index);
            }
        });

        // Draw key label on the pad
        const midAngle = (startAngle + endAngle) / 2;
        const labelRadius = (inner + outer) / 2;
        const labelX = cx + Math.cos(midAngle) * labelRadius;
        const labelY = cy + Math.sin(midAngle) * labelRadius;

        this.label = scene.add.text(labelX, labelY, padConfig.label, {
            fontFamily: 'Arial, sans-serif',
            fontSize: '23px',
            fontStyle: 'bold',
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 2,
        }).setOrigin(0.5).setAlpha(0.6).setDepth(2);
    }

    draw(color) {
        const g = this.graphics;
        g.clear();
        const cx = SIMON_CONFIG.CENTER_X, cy = SIMON_CONFIG.CENTER_Y;
        const outer = SIMON_CONFIG.PAD_RADIUS, inner = SIMON_CONFIG.PAD_INNER_RADIUS;
        const lit = color === this.litColor;
        const mix = (a,b,t) => {
            const channel = shift => Math.round(((a>>shift)&255)*(1-t)+((b>>shift)&255)*t);
            return (channel(16)<<16)|(channel(8)<<8)|channel(0);
        };
        const arc = (r1,r2,fill,alpha=1) => {
            g.fillStyle(fill,alpha);g.beginPath();
            g.arc(cx,cy,r1,this.startAngle,this.endAngle,false);
            g.lineTo(cx+Math.cos(this.endAngle)*r2,cy+Math.sin(this.endAngle)*r2);
            g.arc(cx,cy,r2,this.endAngle,this.startAngle,true);
            g.closePath();g.fillPath();
        };
        if(lit) {
            arc(outer+9,inner-5,color,.08);
            arc(outer+5,inner-3,color,.18);
        }
        arc(outer,inner,0x080e19);
        // Concentric molded plastic bands: bright shoulder, saturated face, dark lip.
        for(let i=0;i<30;i++) {
            const t=i/30, r1=outer-3-t*(outer-inner-6),r2=r1-(outer-inner-6)/30-1;
            const shade=t<.16 ? mix(color,0xffffff,(.16-t)*1.9) : mix(color,0x07142a,.08+t*.3);
            arc(r1,Math.max(inner+3,r2),shade);
        }
        g.lineStyle(lit?3:1.5,lit?0xf5ffe6:mix(color,0xffffff,.45),lit?.95:.55);
        g.beginPath();g.arc(cx,cy,outer-5,this.startAngle+.03,this.endAngle-.03);g.strokePath();
        // A soft curved highlight makes the surface read as polished plastic.
        arc(outer-12,outer-25,0xffffff,lit?.19:.09);
        g.lineStyle(2,0x040912,.6);g.beginPath();g.arc(cx,cy,inner+4,this.startAngle,this.endAngle);g.strokePath();
        const mid=(this.startAngle+this.endAngle)/2;
        const ledR=outer-35, x=cx+Math.cos(mid)*ledR,y=cy+Math.sin(mid)*ledR;
        g.fillStyle(0x0b1721,.75);g.fillCircle(x,y,5);
        g.fillStyle(lit?0xffffff:mix(color,0xffffff,.35),lit?1:.45);g.fillCircle(x,y,2.5);
        g.setDepth(1);

    }

    /**
     * Light up the pad (visual + audio).
     * @param {number} duration - ms to stay lit
     * @param {boolean} playSound - whether to play tone
     * @returns {Promise} resolves when flash completes
     */
    flash(duration = 400, playSound = true) {
        return new Promise(resolve => {
            this.isLit = true;
            this.draw(this.litColor);
            this.label.setAlpha(1);

            if (playSound) {
                audioManager.playTone(this.index, duration / 1000);
            }

            this.scene.time.delayedCall(duration, () => {
                this.isLit = false;
                this.draw(this.normalColor);
                this.label.setAlpha(0.6);
                resolve();
            });
        });
    }

    /**
     * Quick flash for player input feedback.
     */
    quickFlash() {
        this.draw(this.litColor);
        this.label.setAlpha(1);
        audioManager.playTone(this.index, 0.2);

        this.scene.time.delayedCall(200, () => {
            this.draw(this.normalColor);
            this.label.setAlpha(0.6);
        });
    }

    setEnabled(enabled) {
        this.enabled = enabled;
    }

    destroy() {
        this.graphics.destroy();
        this.hitZone.destroy();
        this.label.destroy();
    }
}
