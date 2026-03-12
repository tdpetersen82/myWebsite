// Dig Dug - Menu Scene

class MenuScene extends Phaser.Scene {
    constructor() {
        super({ key: 'MenuScene' });
    }

    create() {
        this.audio = new AudioManager();
        this.cameras.main.setBackgroundColor('#000000');

        const cx = CONFIG.WIDTH / 2;
        const cy = CONFIG.HEIGHT / 2;

        // Background dirt pattern
        const bg = this.add.graphics();
        bg.fillStyle(0x8B4513, 0.3);
        for (let r = 0; r < CONFIG.GRID_ROWS; r++) {
            for (let c = 0; c < CONFIG.GRID_COLS; c++) {
                if ((r + c) % 3 !== 0) {
                    bg.fillRect(c * CONFIG.CELL_WIDTH, r * CONFIG.CELL_HEIGHT,
                        CONFIG.CELL_WIDTH - 1, CONFIG.CELL_HEIGHT - 1);
                }
            }
        }

        // Title - "DIG DUG"
        const titleStyle = {
            fontFamily: 'Arial Black, Arial, sans-serif',
            fontSize: '72px',
            color: '#4169E1',
            stroke: '#FFFFFF',
            strokeThickness: 4,
            shadow: { offsetX: 3, offsetY: 3, color: '#000000', blur: 5, fill: true }
        };
        const title = this.add.text(cx, 100, 'DIG DUG', titleStyle).setOrigin(0.5);

        // Subtitle
        this.add.text(cx, 165, 'A Classic Arcade Game', {
            fontFamily: 'Arial, sans-serif',
            fontSize: '18px',
            color: '#AAAAAA'
        }).setOrigin(0.5);

        // Animated characters on title screen
        this.drawTitleCharacters();

        // Difficulty selection
        this.difficulty = 1;
        const diffLabel = this.add.text(cx, 280, 'Starting Level:', {
            fontFamily: 'Arial, sans-serif',
            fontSize: '22px',
            color: '#FFFFFF'
        }).setOrigin(0.5);

        this.diffText = this.add.text(cx, 315, '1', {
            fontFamily: 'Arial Black, Arial, sans-serif',
            fontSize: '36px',
            color: '#FFCC00'
        }).setOrigin(0.5);

        // Left/Right arrows for difficulty
        const leftArrow = this.add.text(cx - 60, 315, '<', {
            fontFamily: 'Arial, sans-serif',
            fontSize: '36px',
            color: '#FFFFFF'
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });

        const rightArrow = this.add.text(cx + 60, 315, '>', {
            fontFamily: 'Arial, sans-serif',
            fontSize: '36px',
            color: '#FFFFFF'
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });

        leftArrow.on('pointerdown', () => {
            this.difficulty = Math.max(1, this.difficulty - 1);
            this.diffText.setText(this.difficulty.toString());
            this.audio.playSelect();
        });

        rightArrow.on('pointerdown', () => {
            this.difficulty = Math.min(20, this.difficulty + 1);
            this.diffText.setText(this.difficulty.toString());
            this.audio.playSelect();
        });

        // Start button
        const startBtn = this.add.text(cx, 390, 'START GAME', {
            fontFamily: 'Arial Black, Arial, sans-serif',
            fontSize: '32px',
            color: '#00FF00',
            stroke: '#003300',
            strokeThickness: 2
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });

        startBtn.on('pointerover', () => startBtn.setColor('#88FF88'));
        startBtn.on('pointerout', () => startBtn.setColor('#00FF00'));
        startBtn.on('pointerdown', () => this.startGame());

        // High score display
        const highScore = localStorage.getItem(CONFIG.STORAGE_KEY) || 0;
        this.add.text(cx, 445, `High Score: ${highScore}`, {
            fontFamily: 'Arial, sans-serif',
            fontSize: '20px',
            color: '#FFD700'
        }).setOrigin(0.5);

        // Controls info
        const controlsY = 500;
        this.add.text(cx, controlsY, 'CONTROLS', {
            fontFamily: 'Arial Black, Arial, sans-serif',
            fontSize: '18px',
            color: '#4169E1'
        }).setOrigin(0.5);

        const controlLines = [
            'Arrow Keys: Move & Dig    |    Space: Pump Attack',
            'P/ESC: Pause    |    M: Mute Sound'
        ];
        controlLines.forEach((line, i) => {
            this.add.text(cx, controlsY + 25 + i * 22, line, {
                fontFamily: 'Arial, sans-serif',
                fontSize: '14px',
                color: '#888888'
            }).setOrigin(0.5);
        });

        // Keyboard controls
        this.input.keyboard.on('keydown-ENTER', () => this.startGame());
        this.input.keyboard.on('keydown-SPACE', () => this.startGame());
        this.input.keyboard.on('keydown-LEFT', () => {
            this.difficulty = Math.max(1, this.difficulty - 1);
            this.diffText.setText(this.difficulty.toString());
        });
        this.input.keyboard.on('keydown-RIGHT', () => {
            this.difficulty = Math.min(20, this.difficulty + 1);
            this.diffText.setText(this.difficulty.toString());
        });

        // Pulse animation on start text
        this.tweens.add({
            targets: startBtn,
            scaleX: 1.1,
            scaleY: 1.1,
            duration: 800,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });
    }

    drawTitleCharacters() {
        const g = this.add.graphics();
        const y = 220;

        // Dig Dug character (left)
        g.fillStyle(CONFIG.COLORS.PLAYER_SUIT, 1);
        g.fillRoundedRect(200 - 12, y - 14, 24, 28, 4);
        g.fillStyle(CONFIG.COLORS.PLAYER, 1);
        g.fillCircle(200, y - 8, 9);
        g.fillStyle(CONFIG.COLORS.PLAYER_VISOR, 1);
        g.fillRoundedRect(201, y - 12, 10, 5, 2);

        // Pooka (center-left)
        g.fillStyle(CONFIG.COLORS.POOKA, 1);
        g.fillCircle(320, y, 14);
        g.fillStyle(CONFIG.COLORS.POOKA_GOGGLE, 1);
        g.fillCircle(316, y - 3, 4);
        g.fillCircle(324, y - 3, 4);
        g.fillStyle(0x000000, 1);
        g.fillCircle(317, y - 3, 1.5);
        g.fillCircle(325, y - 3, 1.5);

        // Fygar (center-right)
        g.fillStyle(CONFIG.COLORS.FYGAR, 1);
        g.fillRoundedRect(480 - 14, y - 10, 28, 20, 5);
        g.fillStyle(CONFIG.COLORS.FYGAR_WING, 1);
        g.fillTriangle(475, y - 5, 465, y - 14, 475, y + 2);
        g.fillTriangle(485, y - 5, 495, y - 14, 485, y + 2);
        g.fillStyle(0xFFFFFF, 1);
        g.fillCircle(478, y - 4, 3);
        g.fillCircle(486, y - 4, 3);

        // Rock (right)
        g.fillStyle(CONFIG.COLORS.ROCK, 1);
        g.fillRoundedRect(600 - 14, y - 12, 28, 24, 5);
        g.fillStyle(CONFIG.COLORS.ROCK_DARK, 1);
        g.fillRoundedRect(600 - 10, y - 7, 10, 6, 2);
        g.fillRoundedRect(600 + 2, y + 1, 8, 5, 2);
    }

    startGame() {
        this.audio.playSelect();
        this.scene.start('GameScene', { level: this.difficulty, audio: this.audio });
    }
}
