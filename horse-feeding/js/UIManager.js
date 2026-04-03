export class UIManager {
    constructor() {
        this.happinessFill = document.getElementById('happiness-fill');
        this.feedCountEl = document.getElementById('feed-count');
        this.loadingOverlay = document.getElementById('loading-overlay');
        this.loadingProgress = document.getElementById('loading-progress');
        this.foodTray = document.getElementById('food-tray');
        this.foodButtons = document.querySelectorAll('.food-btn');

        this.selectedFood = 'apple';
        this.onFeedCallback = null;
        this.cooldown = false;

        this.setupFoodButtons();
        this.loadState();
    }

    setupFoodButtons() {
        this.foodButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                if (this.cooldown) return;

                const food = btn.dataset.food;

                if (food === this.selectedFood) {
                    // Clicking selected food = feed
                    this.triggerFeed();
                } else {
                    // Select this food
                    this.foodButtons.forEach(b => b.classList.remove('selected'));
                    btn.classList.add('selected');
                    this.selectedFood = food;
                }
            });
        });
    }

    triggerFeed() {
        if (this.cooldown || !this.onFeedCallback) return;
        this.onFeedCallback(this.selectedFood);
    }

    startCooldown() {
        this.cooldown = true;
        this.foodButtons.forEach(b => b.classList.add('cooldown'));

        setTimeout(() => {
            this.cooldown = false;
            this.foodButtons.forEach(b => b.classList.remove('cooldown'));
        }, CONFIG.FEED_COOLDOWN_MS);
    }

    updateHappiness(value) {
        const pct = Math.max(0, Math.min(100, value));
        this.happinessFill.style.width = pct + '%';

        // Color shift: red -> yellow -> green
        if (pct < 33) {
            this.happinessFill.style.backgroundColor = '#e74c3c';
        } else if (pct < 66) {
            this.happinessFill.style.backgroundColor = '#f39c12';
        } else {
            this.happinessFill.style.backgroundColor = '#4CAF50';
        }
    }

    updateFeedCount(count) {
        this.feedCountEl.textContent = count;
    }

    setLoadingProgress(pct) {
        this.loadingProgress.style.width = (pct * 100) + '%';
    }

    hideLoading() {
        this.loadingOverlay.style.opacity = '0';
        this.loadingOverlay.style.transition = 'opacity 0.5s';
        setTimeout(() => {
            this.loadingOverlay.style.display = 'none';
        }, 500);
    }

    loadState() {
        this.feedCount = parseInt(localStorage.getItem(CONFIG.LS_FEED_COUNT)) || 0;
        this.happiness = parseFloat(localStorage.getItem(CONFIG.LS_HAPPINESS)) || CONFIG.INITIAL_HAPPINESS;
        this.updateFeedCount(this.feedCount);
        this.updateHappiness(this.happiness);
    }

    saveState() {
        localStorage.setItem(CONFIG.LS_FEED_COUNT, this.feedCount);
        localStorage.setItem(CONFIG.LS_HAPPINESS, Math.round(this.happiness * 10) / 10);
    }

    addFeed(foodType) {
        const foodDef = CONFIG.FOODS[foodType];
        this.feedCount++;
        this.happiness = Math.min(CONFIG.MAX_HAPPINESS, this.happiness + foodDef.happiness);
        this.updateFeedCount(this.feedCount);
        this.updateHappiness(this.happiness);
        this.saveState();
    }

    decayHappiness(delta) {
        if (this.happiness > 0) {
            this.happiness = Math.max(0, this.happiness - CONFIG.HAPPINESS_DECAY * delta);
            this.updateHappiness(this.happiness);
            // Save periodically (every ~5 seconds worth of decay)
        }
    }
}
