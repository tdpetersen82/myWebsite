class UIOverlay {
    constructor() {
        this.timerEl = document.getElementById('timer');
        this.livesEl = document.getElementById('lives');
        this.levelEl = document.getElementById('level');
        this.bestEl = document.getElementById('bestTime');

        this.menuOverlay = document.getElementById('menu-overlay');
        this.winOverlay = document.getElementById('win-overlay');
        this.gameoverOverlay = document.getElementById('gameover-overlay');

        this.winTimeEl = document.getElementById('win-time');
        this.winBestEl = document.getElementById('win-best');
        this.newBestEl = document.getElementById('new-best');
    }

    showMenu() { this.menuOverlay.style.display = 'flex'; this.winOverlay.style.display = 'none'; this.gameoverOverlay.style.display = 'none'; }
    hideMenu() { this.menuOverlay.style.display = 'none'; }

    showWin(time, bestTime, isNewBest) {
        this.winOverlay.style.display = 'flex';
        this.winTimeEl.textContent = time.toFixed(2) + 's';
        this.winBestEl.textContent = bestTime.toFixed(2) + 's';
        this.newBestEl.style.display = isNewBest ? 'block' : 'none';
    }
    hideWin() { this.winOverlay.style.display = 'none'; }

    showGameOver() { this.gameoverOverlay.style.display = 'flex'; }
    hideGameOver() { this.gameoverOverlay.style.display = 'none'; }

    updateTimer(time) { this.timerEl.textContent = time.toFixed(1) + 's'; }
    updateLives(lives) { this.livesEl.textContent = '♥'.repeat(lives) + '♡'.repeat(CONFIG.LIVES - lives); }
    updateLevel(name) { this.levelEl.textContent = name; }

    updateBest(levelIndex) {
        const key = CONFIG.LS_PREFIX + 'best_level_' + levelIndex;
        const best = localStorage.getItem(key);
        this.bestEl.textContent = best ? parseFloat(best).toFixed(2) + 's' : '--';
    }
}
