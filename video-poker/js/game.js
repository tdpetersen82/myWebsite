const Game = (() => {
    // State machine
    const STATES = { BETTING: 0, DEALING: 1, HOLDING: 2, DRAWING: 3, RESOLUTION: 4 };
    let state = STATES.BETTING;

    let bankroll = CONFIG.STARTING_BANKROLL;
    let coinsBet = CONFIG.DEFAULT_COINS;
    let hintsOn = false;

    // Current hand
    let cards = []; // array of 5 card objects
    let held = [false, false, false, false, false];

    // Stats
    let stats = { handsPlayed: 0, handsWon: 0, royalFlushes: 0, biggestBankroll: CONFIG.STARTING_BANKROLL };

    function init() {
        UI.init();
        loadState();
        bindEvents();
        updateHintsButton();
        enterBetting();
    }

    function loadState() {
        try {
            const saved = JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEY));
            if (saved) {
                bankroll = saved.bankroll ?? CONFIG.STARTING_BANKROLL;
                stats = { ...stats, ...saved.stats };
                coinsBet = saved.coinsBet ?? CONFIG.DEFAULT_COINS;
            }
        } catch (e) {}
        hintsOn = localStorage.getItem(CONFIG.HINT_KEY) === 'true';
    }

    function saveState() {
        localStorage.setItem(CONFIG.STORAGE_KEY, JSON.stringify({ bankroll, stats, coinsBet }));
    }

    function bindEvents() {
        const els = UI.els();

        // Coin selector
        els.coinSelector.addEventListener('click', (e) => {
            const btn = e.target.closest('.coin-btn');
            if (!btn || state !== STATES.BETTING) return;
            coinsBet = parseInt(btn.dataset.coins);
            UI.setActiveCoin(coinsBet);
            UI.highlightPaytable(null, coinsBet);
            Audio.coinSelect();
        });

        // Bet Max
        els.btnBetMax.addEventListener('click', () => {
            if (state !== STATES.BETTING) return;
            coinsBet = Math.min(CONFIG.MAX_COINS, bankroll);
            UI.setActiveCoin(coinsBet);
            UI.highlightPaytable(null, coinsBet);
            Audio.coinSelect();
            // Auto-deal on bet max
            startDeal();
        });

        // Deal
        els.btnDeal.addEventListener('click', () => {
            if (state !== STATES.BETTING) return;
            startDeal();
        });

        // Draw
        els.btnDraw.addEventListener('click', () => {
            if (state !== STATES.HOLDING) return;
            startDraw();
        });

        // Card slot clicks (toggle hold)
        for (let i = 0; i < 5; i++) {
            els.slots[i].addEventListener('click', () => {
                if (state !== STATES.HOLDING) return;
                toggleHold(i);
            });
        }

        // Hints toggle
        els.hintsBtn.addEventListener('click', () => {
            hintsOn = !hintsOn;
            localStorage.setItem(CONFIG.HINT_KEY, hintsOn);
            updateHintsButton();
            if (state === STATES.HOLDING) updateHint();
            else UI.hideHint();
        });
    }

    function updateHintsButton() {
        const btn = UI.els().hintsBtn;
        btn.textContent = hintsOn ? 'Hints: ON' : 'Hints: OFF';
        btn.classList.toggle('active', hintsOn);
    }

    // ── BETTING ───────────────────────────────────────

    function enterBetting() {
        state = STATES.BETTING;
        UI.setMessage('Place your bet and deal');
        UI.clearSlots();
        UI.clearWinningCards();
        UI.clearAllHolds();
        UI.showDealMode();
        UI.hideHint();
        UI.updateBankroll(bankroll);
        UI.updateStats(stats);
        UI.setActiveCoin(coinsBet);
        UI.highlightPaytable(null, coinsBet);
        UI.enableDeal(bankroll >= 1);
        UI.enableBetMax(bankroll >= 1);

        // Bankruptcy reset
        if (bankroll < 1) {
            UI.setMessage('Out of chips! Bankroll reset.');
            bankroll = CONFIG.STARTING_BANKROLL;
            UI.updateBankroll(bankroll);
            saveState();
        }
    }

    // ── DEALING ───────────────────────────────────────

    function startDeal() {
        if (bankroll < coinsBet) {
            coinsBet = Math.max(1, bankroll);
            UI.setActiveCoin(coinsBet);
        }

        state = STATES.DEALING;
        bankroll -= coinsBet;
        UI.updateBankroll(bankroll);
        UI.clearSlots();
        UI.clearAllHolds();
        UI.clearWinningCards();
        UI.hideHint();
        UI.setMessage('');

        // Fresh deck each hand
        Deck.build();
        cards = Deck.dealHand(5);
        held = [false, false, false, false, false];

        // Deal cards with staggered animation
        for (let i = 0; i < 5; i++) {
            setTimeout(() => {
                UI.placeCardInSlot(cards[i], i);
                if (i === 4) {
                    // All cards dealt, enter holding phase
                    setTimeout(() => enterHolding(), 200);
                }
            }, i * CONFIG.DEAL_DELAY);
        }
    }

    // ── HOLDING ───────────────────────────────────────

    function enterHolding() {
        state = STATES.HOLDING;
        UI.showDrawMode();
        UI.enableDraw(true);
        UI.setMessage('Select cards to HOLD, then Draw');
        updateHint();
    }

    function toggleHold(index) {
        held[index] = !held[index];
        UI.setHold(index, held[index]);
        Audio.holdToggle();
    }

    function updateHint() {
        if (!hintsOn || state !== STATES.HOLDING) {
            UI.hideHint();
            return;
        }
        const rec = Strategy.getRecommendation(cards);
        UI.showHint(rec.action, rec.explanation, rec.riskLabel, rec.riskClass, rec.detailedExplanation);
    }

    // ── DRAWING ───────────────────────────────────────

    function startDraw() {
        state = STATES.DRAWING;
        UI.enableDraw(false);
        UI.hideHint();
        UI.setMessage('');

        // Find indices to replace
        const replaceIndices = [];
        for (let i = 0; i < 5; i++) {
            if (!held[i]) replaceIndices.push(i);
        }

        if (replaceIndices.length === 0) {
            // All held, go straight to resolution
            resolve();
            return;
        }

        // Replace non-held cards with animation
        let completed = 0;
        replaceIndices.forEach((idx, seqIdx) => {
            setTimeout(() => {
                const newCard = Deck.deal();
                cards[idx] = newCard;
                UI.replaceCardInSlot(newCard, idx, () => {
                    completed++;
                    if (completed === replaceIndices.length) {
                        setTimeout(() => resolve(), 300);
                    }
                });
            }, seqIdx * CONFIG.DRAW_DELAY);
        });
    }

    // ── RESOLUTION ────────────────────────────────────

    function resolve() {
        state = STATES.RESOLUTION;
        UI.clearAllHolds();

        const result = Hand.evaluate(cards);
        const payout = Hand.getPayout(result.key, coinsBet);

        // Highlight paytable
        UI.highlightPaytable(result.key, coinsBet);

        // Highlight winning cards
        if (result.key) {
            UI.setWinningCards([0, 1, 2, 3, 4]);
        }

        stats.handsPlayed++;

        if (payout > 0) {
            bankroll += payout;
            stats.handsWon++;
            stats.biggestBankroll = Math.max(stats.biggestBankroll, bankroll);

            if (result.key === 'royal-flush') {
                stats.royalFlushes++;
                UI.showResult('ROYAL FLUSH! +$' + payout, '#f1c40f');
                Animations.royalFlushEffect(UI.els().cardsArea);
                Audio.winRoyal();
            } else if (result.key === 'straight-flush' || result.key === 'four-of-a-kind') {
                UI.showResult(result.name + '! +$' + payout, '#f1c40f');
                Animations.bigWinEffect(UI.els().cardsArea);
                Audio.winBig();
            } else if (result.key === 'full-house' || result.key === 'flush' || result.key === 'straight') {
                UI.showResult(result.name + '! +$' + payout, '#2ecc71');
                Animations.winEffect(UI.els().cardsArea);
                Audio.winMedium();
            } else {
                UI.showResult(result.name + ' +$' + payout, '#2ecc71');
                Audio.winSmall();
            }
            UI.setMessage(result.name + ' - Win $' + payout);
        } else {
            UI.setMessage(result.name);
            Audio.lose();
        }

        UI.updateBankroll(bankroll);
        saveState();

        setTimeout(() => {
            enterBetting();
        }, CONFIG.RESULT_DISPLAY);
    }

    return { init };
})();

// Boot
document.addEventListener('DOMContentLoaded', Game.init);
