// ============================================================
// Joust — Game Over Scene
// ============================================================

class GameOverScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameOverScene' });
    }

    init(data) {
        this.finalScore = data.score || 0;
        this.finalWave = data.wave || 1;
        this.enemiesDefeated = data.enemiesDefeated || 0;
        this.eggsCollected = data.eggsCollected || 0;
        this.isNewHigh = data.isNewHigh || false;
    }

    create() {
        this.audio = new AudioManager();
        this.cameras.main.setBackgroundColor(CONFIG.BG_COLOR);

        const cx = CONFIG.WIDTH / 2;

        // Lava at bottom
        this.lavaGraphics = this.add.graphics();
        this.lavaPhase = 0;

        // Game Over title
        this.add.text(cx, 80, 'GAME OVER', {
            fontFamily: 'monospace',
            fontSize: '56px',
            fontStyle: 'bold',
            color: '#FF4444',
            stroke: '#440000',
            strokeThickness: 4
        }).setOrigin(0.5);

        // New high score
        if (this.isNewHigh) {
            this.newHighText = this.add.text(cx, 130, 'NEW HIGH SCORE!', {
                fontFamily: 'monospace',
                fontSize: '24px',
                fontStyle: 'bold',
                color: '#FFD700'
            }).setOrigin(0.5);
            this.flashTimer = 0;
        }

        // Stats box background
        const boxY = 180;
        const boxH = 220;
        this.add.graphics()
            .fillStyle(0x1a1a3e, 0.8)
            .fillRoundedRect(cx - 160, boxY, 320, boxH, 12)
            .lineStyle(2, 0x4444AA, 1)
            .strokeRoundedRect(cx - 160, boxY, 320, boxH, 12);

        // Stats
        const statStyle = {
            fontFamily: 'monospace',
            fontSize: '18px',
            color: '#CCCCEE'
        };
        const valStyle = {
            fontFamily: 'monospace',
            fontSize: '22px',
            fontStyle: 'bold',
            color: '#FFD700'
        };

        let sy = boxY + 25;
        const statSpacing = 45;

        this.add.text(cx - 130, sy, 'FINAL SCORE', statStyle);
        this.add.text(cx + 130, sy, String(this.finalScore), valStyle).setOrigin(1, 0);
        sy += statSpacing;

        this.add.text(cx - 130, sy, 'WAVE REACHED', statStyle);
        this.add.text(cx + 130, sy, String(this.finalWave), valStyle).setOrigin(1, 0);
        sy += statSpacing;

        this.add.text(cx - 130, sy, 'ENEMIES SLAIN', statStyle);
        this.add.text(cx + 130, sy, String(this.enemiesDefeated), valStyle).setOrigin(1, 0);
        sy += statSpacing;

        this.add.text(cx - 130, sy, 'EGGS COLLECTED', statStyle);
        this.add.text(cx + 130, sy, String(this.eggsCollected), valStyle).setOrigin(1, 0);

        // High score display
        const highScore = localStorage.getItem(CONFIG.HIGH_SCORE_KEY) || 0;
        this.add.text(cx, 425, `Best Score: ${highScore}`, {
            fontFamily: 'monospace',
            fontSize: '18px',
            color: '#AAAACC'
        }).setOrigin(0.5);

        // Restart prompt
        this.restartText = this.add.text(cx, 480, 'Press SPACE to Play Again', {
            fontFamily: 'monospace',
            fontSize: '22px',
            color: '#FFFFFF'
        }).setOrigin(0.5);

        this.menuText = this.add.text(cx, 520, 'Press M for Menu', {
            fontFamily: 'monospace',
            fontSize: '16px',
            color: '#888899'
        }).setOrigin(0.5);

        this.restartFlash = 0;

        // Input
        this.input.keyboard.on('keydown-SPACE', () => {
            this.audio.playMenuSelect();
            this.scene.start('GameScene');
        });
        this.input.keyboard.on('keydown-ENTER', () => {
            this.audio.playMenuSelect();
            this.scene.start('GameScene');
        });
        this.input.keyboard.on('keydown-M', () => {
            this.audio.playMenuSelect();
            this.scene.start('MenuScene');
        });
        this.input.on('pointerdown', () => {
            this.audio.playMenuSelect();
            this.scene.start('GameScene');
        });
    }

    update(time, delta) {
        // Flash restart text
        this.restartFlash += delta;
        this.restartText.setAlpha(Math.sin(this.restartFlash * 0.004) * 0.4 + 0.6);

        // Flash new high score text
        if (this.isNewHigh && this.newHighText) {
            this.flashTimer += delta;
            this.newHighText.setAlpha(Math.sin(this.flashTimer * 0.006) * 0.3 + 0.7);
        }

        // Animate lava
        this.lavaPhase += delta * 0.002;
        this.drawLava();
    }

    drawLava() {
        const g = this.lavaGraphics;
        g.clear();

        g.fillStyle(0xFF6A00, 0.1);
        g.fillRect(0, CONFIG.LAVA_Y - 15, CONFIG.WIDTH, 15);

        g.fillStyle(CONFIG.LAVA_COLOR, 1);
        g.fillRect(0, CONFIG.LAVA_Y, CONFIG.WIDTH, CONFIG.LAVA_HEIGHT);

        g.fillStyle(0xFF6A00, 1);
        for (let x = 0; x < CONFIG.WIDTH; x += 4) {
            const wy = Math.sin(x * 0.03 + this.lavaPhase) * 3;
            g.fillRect(x, CONFIG.LAVA_Y + wy - 1, 4, 3);
        }
    }
}
