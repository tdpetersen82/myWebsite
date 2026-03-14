// GameState.js — Currency, lives, score, wave tracking

export class GameState {
    constructor() {
        this.reset();
        this.highScore = parseInt(localStorage.getItem('hexDefenseHighScore')) || 0;
        this.bestWave = parseInt(localStorage.getItem('hexDefenseBestWave')) || 0;
    }

    reset() {
        this.currency = 125;
        this.lives = 15;
        this.score = 0;
        this.wave = 0;
        this.phase = 'menu'; // menu, build, wave, gameover, victory
        this.selectedTower = null;
        this.selectedPlacedTower = null; // for upgrade/sell
        this.buildTimer = 0;
        this.gameSpeed = 1;
    }

    canAfford(cost) {
        return this.currency >= cost;
    }

    spend(amount) {
        this.currency -= amount;
    }

    earn(amount) {
        this.currency += amount;
        this.score += amount;
    }

    loseLife(count = 1) {
        this.lives = Math.max(0, this.lives - count);
        if (this.lives <= 0) {
            this.phase = 'gameover';
            this.saveHighScore();
        }
    }

    applyInterest() {
        const interest = Math.floor(this.currency * 0.03);
        this.currency += interest;
        return interest;
    }

    saveHighScore() {
        if (this.score > this.highScore) {
            this.highScore = this.score;
            localStorage.setItem('hexDefenseHighScore', this.highScore);
        }
        if (this.wave > this.bestWave) {
            this.bestWave = this.wave;
            localStorage.setItem('hexDefenseBestWave', this.bestWave);
        }
    }
}
