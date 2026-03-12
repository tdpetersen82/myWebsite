// Dig Dug - Game Over Scene

class GameOverScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameOverScene' });
    }

    init(data) {
        this.finalScore = data.score || 0;
        this.finalLevel = data.level || 1;
        this.enemiesKilled = data.enemiesKilled || 0;
        this.rocksDropped = data.rocksDropped || 0;
        this.audio = data.audio || new AudioManager();
    }

    create() {
        this.cameras.main.setBackgroundColor('#000000');

        const cx = CONFIG.WIDTH / 2;

        // Background
        const bg = this.add.graphics();
        bg.fillStyle(0x8B4513, 0.15);
        for (let r = 0; r < CONFIG.GRID_ROWS; r++) {
            for (let c = 0; c < CONFIG.GRID_COLS; c++) {
                if ((r + c) % 2 === 0) {
                    bg.fillRect(c * CONFIG.CELL_WIDTH, r * CONFIG.CELL_HEIGHT,
                        CONFIG.CELL_WIDTH - 1, CONFIG.CELL_HEIGHT - 1);
                }
            }
        }

        // Game Over title
        this.add.text(cx, 80, 'GAME OVER', {
            fontFamily: 'Arial Black, Arial, sans-serif',
            fontSize: '56px',
            color: '#FF4444',
            stroke: '#440000',
            strokeThickness: 4,
            shadow: { offsetX: 3, offsetY: 3, color: '#000000', blur: 5, fill: true }
        }).setOrigin(0.5);

        // Final score
        this.add.text(cx, 160, `Final Score: ${this.finalScore}`, {
            fontFamily: 'Arial Black, Arial, sans-serif',
            fontSize: '36px',
            color: '#FFD700'
        }).setOrigin(0.5);

        // High score check
        const highScore = parseInt(localStorage.getItem(CONFIG.STORAGE_KEY) || '0');
        const isNewHigh = this.finalScore >= highScore && this.finalScore > 0;

        if (isNewHigh) {
            localStorage.setItem(CONFIG.STORAGE_KEY, this.finalScore.toString());

            const newHighText = this.add.text(cx, 200, 'NEW HIGH SCORE!', {
                fontFamily: 'Arial Black, Arial, sans-serif',
                fontSize: '24px',
                color: '#FF8800'
            }).setOrigin(0.5);

            this.tweens.add({
                targets: newHighText,
                alpha: 0.3,
                duration: 500,
                yoyo: true,
                repeat: -1
            });
        } else {
            this.add.text(cx, 200, `High Score: ${highScore}`, {
                fontFamily: 'Arial, sans-serif',
                fontSize: '20px',
                color: '#888888'
            }).setOrigin(0.5);
        }

        // Stats
        const statsY = 260;
        const statsStyle = {
            fontFamily: 'Arial, sans-serif',
            fontSize: '20px',
            color: '#CCCCCC'
        };

        this.add.text(cx, statsY, `Level Reached: ${this.finalLevel}`, statsStyle).setOrigin(0.5);
        this.add.text(cx, statsY + 35, `Enemies Defeated: ${this.enemiesKilled}`, statsStyle).setOrigin(0.5);
        this.add.text(cx, statsY + 70, `Rocks Dropped: ${this.rocksDropped}`, statsStyle).setOrigin(0.5);

        // Score breakdown visual
        this.drawStatsGraphic(cx, statsY + 130);

        // Play Again button
        const playBtn = this.add.text(cx, 480, 'PLAY AGAIN', {
            fontFamily: 'Arial Black, Arial, sans-serif',
            fontSize: '32px',
            color: '#00FF00',
            stroke: '#003300',
            strokeThickness: 2
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });

        playBtn.on('pointerover', () => playBtn.setColor('#88FF88'));
        playBtn.on('pointerout', () => playBtn.setColor('#00FF00'));
        playBtn.on('pointerdown', () => {
            this.audio.playSelect();
            this.scene.start('MenuScene');
        });

        // Menu button
        const menuBtn = this.add.text(cx, 530, 'MAIN MENU', {
            fontFamily: 'Arial, sans-serif',
            fontSize: '22px',
            color: '#4169E1'
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });

        menuBtn.on('pointerover', () => menuBtn.setColor('#6189FF'));
        menuBtn.on('pointerout', () => menuBtn.setColor('#4169E1'));
        menuBtn.on('pointerdown', () => {
            this.audio.playSelect();
            this.scene.start('MenuScene');
        });

        // Keyboard
        this.input.keyboard.on('keydown-ENTER', () => {
            this.audio.playSelect();
            this.scene.start('MenuScene');
        });
        this.input.keyboard.on('keydown-SPACE', () => {
            this.audio.playSelect();
            this.scene.start('MenuScene');
        });

        // Pulse play button
        this.tweens.add({
            targets: playBtn,
            scaleX: 1.05,
            scaleY: 1.05,
            duration: 600,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });
    }

    drawStatsGraphic(cx, y) {
        const g = this.add.graphics();

        // Draw small icons next to stats
        // Pooka icon
        g.fillStyle(CONFIG.COLORS.POOKA, 1);
        g.fillCircle(cx - 120, y, 12);
        g.fillStyle(CONFIG.COLORS.POOKA_GOGGLE, 1);
        g.fillCircle(cx - 123, y - 3, 3);
        g.fillCircle(cx - 117, y - 3, 3);

        // x count
        this.add.text(cx - 100, y, `x ${this.enemiesKilled}`, {
            fontFamily: 'Arial, sans-serif',
            fontSize: '18px',
            color: '#FF4444'
        }).setOrigin(0, 0.5);

        // Rock icon
        g.fillStyle(CONFIG.COLORS.ROCK, 1);
        g.fillRoundedRect(cx + 30, y - 10, 20, 20, 4);
        g.fillStyle(CONFIG.COLORS.ROCK_DARK, 1);
        g.fillRoundedRect(cx + 33, y - 6, 8, 5, 2);

        // x count
        this.add.text(cx + 60, y, `x ${this.rocksDropped}`, {
            fontFamily: 'Arial, sans-serif',
            fontSize: '18px',
            color: '#888888'
        }).setOrigin(0, 0.5);
    }
}
