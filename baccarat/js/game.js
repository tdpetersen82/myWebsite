const Game = (() => {
    const STATES = { BETTING: 0, DEALING: 1, DRAWING: 2, RESOLUTION: 3 };
    let state = STATES.BETTING;

    let bankroll = CONFIG.STARTING_BANKROLL;
    let currentBet = 0;
    let lastBet = 0;
    let betType = null;    // 'player', 'banker', 'tie'
    let lastBetType = null;
    let hintsOn = false;
    let totalCommission = 0;

    // Cards
    let playerCards = [];
    let bankerCards = [];

    // Stats
    let stats = { handsPlayed: 0, playerWins: 0, bankerWins: 0, biggestBankroll: CONFIG.STARTING_BANKROLL };

    function init() {
        UI.init();
        loadState();
        Deck.buildShoe();
        bindEvents();
        updateHintsButton();
        enterBetting();
    }

    function loadState() {
        try {
            const saved = JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEY));
            if (saved) {
                bankroll = saved.bankroll ?? CONFIG.STARTING_BANKROLL;
                totalCommission = saved.totalCommission ?? 0;
                stats = { ...stats, ...saved.stats };
            }
        } catch (e) {}
        hintsOn = localStorage.getItem(CONFIG.HINT_KEY) === 'true';
    }

    function saveState() {
        localStorage.setItem(CONFIG.STORAGE_KEY, JSON.stringify({ bankroll, totalCommission, stats }));
    }

    function bindEvents() {
        const els = UI.els();

        // Bet zones
        els.zonePlayer.addEventListener('click', () => selectBetType('player'));
        els.zoneTie.addEventListener('click', () => selectBetType('tie'));
        els.zoneBanker.addEventListener('click', () => selectBetType('banker'));

        // Chips
        els.chipRack.addEventListener('click', (e) => {
            const chip = e.target.closest('.chip');
            if (!chip || state !== STATES.BETTING) return;
            const val = parseInt(chip.dataset.value);
            if (currentBet + val <= CONFIG.MAX_BET && currentBet + val <= bankroll) {
                currentBet += val;
                UI.updateBet(currentBet);
                UI.enableDeal(currentBet >= CONFIG.MIN_BET && betType !== null);
                Audio.chipPlace();
                Animations.chipBounce(chip);
            }
        });

        els.btnClear.addEventListener('click', () => {
            if (state !== STATES.BETTING) return;
            currentBet = 0;
            betType = null;
            UI.updateBet(0);
            UI.enableDeal(false);
            UI.clearBetZones();
            if (hintsOn) updateHint();
        });

        els.btnRebet.addEventListener('click', () => {
            if (state !== STATES.BETTING || lastBet === 0 || !lastBetType) return;
            const bet = Math.min(lastBet, bankroll, CONFIG.MAX_BET);
            if (bet >= CONFIG.MIN_BET) {
                currentBet = bet;
                betType = lastBetType;
                UI.updateBet(currentBet);
                UI.highlightBetZone(betType);
                UI.enableDeal(true);
                Audio.chipPlace();
                if (hintsOn) updateHint();
            }
        });

        els.btnDeal.addEventListener('click', () => {
            if (state !== STATES.BETTING || currentBet < CONFIG.MIN_BET || !betType) return;
            startDeal();
        });

        // Hints toggle
        els.hintsBtn.addEventListener('click', () => {
            hintsOn = !hintsOn;
            localStorage.setItem(CONFIG.HINT_KEY, hintsOn);
            updateHintsButton();
            if (state === STATES.BETTING) updateHint();
            else UI.hideHint();
        });
    }

    function selectBetType(type) {
        if (state !== STATES.BETTING) return;
        betType = type;
        UI.highlightBetZone(type);
        UI.enableDeal(currentBet >= CONFIG.MIN_BET && betType !== null);
        if (hintsOn) updateHint();
    }

    function updateHintsButton() {
        const btn = UI.els().hintsBtn;
        btn.textContent = hintsOn ? 'Hints: ON' : 'Hints: OFF';
        btn.classList.toggle('active', hintsOn);
    }

    function updateHint() {
        if (!hintsOn) {
            UI.hideHint();
            return;
        }
        const rec = Strategy.getRecommendation(betType);
        UI.showHint(rec.action, rec.explanation, rec.riskLabel, rec.riskClass, rec.detailedExplanation);
    }

    // ── BETTING ───────────────────────────────────────

    function enterBetting() {
        state = STATES.BETTING;
        if (Deck.needsReshuffle()) {
            Deck.buildShoe();
            UI.setMessage('Shuffling new shoe...');
            setTimeout(() => UI.setMessage('Place your bet'), 800);
        } else {
            UI.setMessage('Place your bet');
        }

        UI.clearCards();
        UI.showBetting(true);
        UI.hideHint();
        UI.updateBankroll(bankroll);
        UI.updateCommission(totalCommission);
        UI.updateStats(stats);
        UI.clearBetZones();
        UI.enableDeal(currentBet >= CONFIG.MIN_BET && betType !== null);

        UI.updateHandValue(UI.els().playerValue, null);
        UI.updateHandValue(UI.els().bankerValue, null);

        // Reset for bankruptcy
        if (bankroll < CONFIG.MIN_BET) {
            UI.setMessage('Out of chips! Bankroll reset.');
            bankroll = CONFIG.STARTING_BANKROLL;
            totalCommission = 0;
            UI.updateBankroll(bankroll);
            UI.updateCommission(totalCommission);
            saveState();
        }

        if (hintsOn) updateHint();
    }

    // ── DEALING ───────────────────────────────────────

    function startDeal() {
        state = STATES.DEALING;
        lastBet = currentBet;
        lastBetType = betType;
        bankroll -= currentBet;
        UI.updateBankroll(bankroll);
        UI.showBetting(false);
        UI.hideHint();
        UI.setMessage('');

        playerCards = [];
        bankerCards = [];

        const playerContainer = UI.els().playerCards;
        const bankerContainer = UI.els().bankerCards;

        // Deal sequence: Player, Banker, Player, Banker (all face up)
        const delays = [0, 300, 600, 900];

        setTimeout(() => {
            const c = Deck.deal();
            playerCards.push(c);
            UI.dealCardToArea(c, playerContainer);
        }, delays[0]);

        setTimeout(() => {
            const c = Deck.deal();
            bankerCards.push(c);
            UI.dealCardToArea(c, bankerContainer);
        }, delays[1]);

        setTimeout(() => {
            const c = Deck.deal();
            playerCards.push(c);
            UI.dealCardToArea(c, playerContainer);
        }, delays[2]);

        setTimeout(() => {
            const c = Deck.deal();
            bankerCards.push(c);
            UI.dealCardToArea(c, bankerContainer);
        }, delays[3]);

        setTimeout(() => afterDeal(), 1200);
    }

    function afterDeal() {
        // Update displayed values
        updateDisplayedValues();

        const playerNatural = Rules.isNatural(playerCards);
        const bankerNatural = Rules.isNatural(bankerCards);

        // If either has a natural, go straight to resolution
        if (playerNatural || bankerNatural) {
            UI.setMessage(playerNatural && bankerNatural ? 'Both Naturals!' :
                          playerNatural ? 'Player Natural!' : 'Banker Natural!');
            Audio.natural();
            setTimeout(() => resolve(), 1000);
            return;
        }

        // Enter drawing phase
        enterDrawing();
    }

    // ── DRAWING ───────────────────────────────────────

    function enterDrawing() {
        state = STATES.DRAWING;
        let playerThirdCard = null;

        // Player draws first
        if (Rules.playerDraws(playerCards)) {
            setTimeout(() => {
                const c = Deck.deal();
                playerCards.push(c);
                playerThirdCard = c;
                UI.dealCardToArea(c, UI.els().playerCards);
                updateDisplayedValues();
                UI.setMessage('Player draws: ' + Deck.displayRank(c) + c.symbol);

                // Now check banker draw
                checkBankerDraw(playerThirdCard);
            }, CONFIG.DRAW_DELAY);
        } else {
            UI.setMessage('Player stands on ' + Rules.handValue(playerCards));
            // Player stood, check banker draw (no player third card)
            checkBankerDraw(null);
        }
    }

    function checkBankerDraw(playerThirdCard) {
        const delay = playerThirdCard ? CONFIG.DRAW_DELAY : CONFIG.DRAW_DELAY;

        if (Rules.bankerDraws(bankerCards, playerThirdCard)) {
            setTimeout(() => {
                const c = Deck.deal();
                bankerCards.push(c);
                UI.dealCardToArea(c, UI.els().bankerCards);
                updateDisplayedValues();
                UI.setMessage('Banker draws: ' + Deck.displayRank(c) + c.symbol);

                setTimeout(() => resolve(), 800);
            }, delay);
        } else {
            setTimeout(() => {
                UI.setMessage('Banker stands on ' + Rules.handValue(bankerCards));
                setTimeout(() => resolve(), 800);
            }, delay);
        }
    }

    // ── RESOLUTION ────────────────────────────────────

    function resolve() {
        state = STATES.RESOLUTION;

        const winner = Rules.determineWinner(playerCards, bankerCards);
        const pv = Rules.handValue(playerCards);
        const bv = Rules.handValue(bankerCards);

        let netResult = 0;
        let resultText = '';
        let resultColor = '#fff';

        if (winner === 'tie') {
            if (betType === 'tie') {
                // Tie bet wins: pays 8:1
                const payout = currentBet + currentBet * CONFIG.TIE_PAYOUT;
                bankroll += payout;
                netResult = payout - currentBet;
                resultText = 'Tie! You Win $' + netResult + '!';
                resultColor = '#f1c40f';
                Animations.winEffect(UI.els().playerArea);
                Audio.win();
            } else {
                // Tie: return bet
                bankroll += currentBet;
                netResult = 0;
                resultText = 'Tie! Bet Returned';
                resultColor = '#f1c40f';
                Animations.tieEffect(UI.els().playerArea);
            }
        } else if (winner === 'player') {
            stats.playerWins++;
            if (betType === 'player') {
                const payout = currentBet + currentBet * CONFIG.PLAYER_PAYOUT;
                bankroll += payout;
                netResult = payout - currentBet;
                resultText = 'Player Wins! +$' + netResult;
                resultColor = '#2ecc71';
                Animations.winEffect(UI.els().playerArea);
                Audio.win();
            } else {
                netResult = -currentBet;
                resultText = 'Player Wins! You Lose $' + currentBet;
                resultColor = '#e74c3c';
                Audio.lose();
            }
        } else {
            // banker wins
            stats.bankerWins++;
            if (betType === 'banker') {
                const commission = Math.floor(currentBet * CONFIG.BANKER_COMMISSION);
                const payout = currentBet + currentBet - commission;
                totalCommission += commission;
                bankroll += payout;
                netResult = payout - currentBet;
                resultText = 'Banker Wins! +$' + netResult + ' (-$' + commission + ' comm.)';
                resultColor = '#2ecc71';
                Animations.winEffect(UI.els().bankerArea);
                Audio.win();
            } else {
                netResult = -currentBet;
                resultText = 'Banker Wins! You Lose $' + currentBet;
                resultColor = '#e74c3c';
                Audio.lose();
            }
        }

        stats.handsPlayed++;
        stats.biggestBankroll = Math.max(stats.biggestBankroll, bankroll);

        UI.updateBankroll(bankroll);
        UI.updateCommission(totalCommission);
        UI.showResult(resultText, resultColor);
        UI.setMessage('Player: ' + pv + ' | Banker: ' + bv);
        saveState();

        setTimeout(() => {
            currentBet = 0;
            betType = null;
            UI.updateBet(0);
            enterBetting();
        }, 2000);
    }

    // ── HELPERS ───────────────────────────────────────

    function updateDisplayedValues() {
        const pv = Rules.handValue(playerCards);
        const bv = Rules.handValue(bankerCards);
        UI.updateHandValue(UI.els().playerValue, pv);
        UI.updateHandValue(UI.els().bankerValue, bv);
    }

    return { init };
})();

// Boot
document.addEventListener('DOMContentLoaded', Game.init);
