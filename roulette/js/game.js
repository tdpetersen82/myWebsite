const Game = (() => {
    // State
    const STATES = { BETTING: 0, SPINNING: 1, RESULT: 2 };
    let state = STATES.BETTING;

    let bankroll = CONFIG.STARTING_BANKROLL;
    let selectedChipValue = 5;
    let hintsOn = false;

    // Current bets: array of { type, numbers, amount, cell }
    let bets = [];

    // Stats
    let stats = { spinsPlayed: 0, spinsWon: 0, biggestWin: 0, biggestBankroll: CONFIG.STARTING_BANKROLL };

    function init() {
        UI.init();
        loadState();
        Wheel.init(UI.els().wheelCanvas);
        UI.buildBettingTable(onBetClick);
        bindEvents();
        updateHintsButton();
        enterBetting();
    }

    function loadState() {
        try {
            var saved = JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEY));
            if (saved) {
                bankroll = saved.bankroll != null ? saved.bankroll : CONFIG.STARTING_BANKROLL;
                stats = Object.assign({}, stats, saved.stats);
            }
        } catch (e) {}
        hintsOn = localStorage.getItem(CONFIG.HINT_KEY) === 'true';
    }

    function saveState() {
        localStorage.setItem(CONFIG.STORAGE_KEY, JSON.stringify({ bankroll: bankroll, stats: stats }));
    }

    function bindEvents() {
        var chipEls = UI.els().chipRack;

        // Chip selection
        chipEls.addEventListener('click', function(e) {
            var chip = e.target.closest('.chip');
            if (!chip) return;
            selectedChipValue = parseInt(chip.dataset.value);
            UI.setSelectedChip(selectedChipValue);
            Audio.chipPlace();
        });

        // Clear bets
        UI.els().btnClear.addEventListener('click', function() {
            if (state !== STATES.BETTING) return;
            clearBets();
        });

        // Spin
        UI.els().btnSpin.addEventListener('click', function() {
            if (state !== STATES.BETTING || bets.length === 0) return;
            startSpin();
        });

        // Hints toggle
        UI.els().hintsBtn.addEventListener('click', function() {
            hintsOn = !hintsOn;
            localStorage.setItem(CONFIG.HINT_KEY, hintsOn);
            updateHintsButton();
            if (hintsOn) updateHint();
            else UI.hideHint();
        });

        // Select first chip by default
        UI.setSelectedChip(selectedChipValue);
    }

    function updateHintsButton() {
        var btn = UI.els().hintsBtn;
        btn.textContent = hintsOn ? 'Hints: ON' : 'Hints: OFF';
        btn.classList.toggle('active', hintsOn);
    }

    // ── BETTING ───────────────────────────────────────

    function enterBetting() {
        state = STATES.BETTING;
        UI.setMessage('Place your bets');
        UI.clearResultDisplay();
        UI.clearWinningHighlights();
        UI.clearAllTableChips();
        UI.enableSpin(false);
        UI.setSpinning(false);
        UI.updateBankroll(bankroll);
        UI.updateStats(stats);
        bets = [];
        UI.updateTotalBet(0);

        // Reset for bankruptcy
        if (bankroll < CONFIG.MIN_BET) {
            UI.setMessage('Out of chips! Bankroll reset.');
            bankroll = CONFIG.STARTING_BANKROLL;
            UI.updateBankroll(bankroll);
            saveState();
        }

        if (hintsOn) updateHint();
        else UI.hideHint();
    }

    function onBetClick(betType, numbers, cell) {
        if (state !== STATES.BETTING) return;
        if (selectedChipValue > bankroll - getTotalBet()) return;

        // Check if there's already a bet on this exact cell
        var existing = null;
        for (var i = 0; i < bets.length; i++) {
            if (bets[i].cell === cell) {
                existing = bets[i];
                break;
            }
        }

        if (existing) {
            // Add to existing bet
            if (selectedChipValue > bankroll - getTotalBet()) return;
            existing.amount += selectedChipValue;
            UI.placeChipOnCell(cell, existing.amount);
        } else {
            // New bet
            bets.push({
                type: betType,
                numbers: numbers,
                amount: selectedChipValue,
                cell: cell,
            });
            UI.placeChipOnCell(cell, selectedChipValue);
        }

        Audio.chipPlace();
        Animations.flashBetSpot(cell);
        UI.updateTotalBet(getTotalBet());
        UI.enableSpin(getTotalBet() >= CONFIG.MIN_BET);

        if (hintsOn) updateHint();
    }

    function getTotalBet() {
        var total = 0;
        for (var i = 0; i < bets.length; i++) {
            total += bets[i].amount;
        }
        return total;
    }

    function clearBets() {
        bets = [];
        UI.clearAllTableChips();
        UI.updateTotalBet(0);
        UI.enableSpin(false);
        Audio.chipRemove();
        if (hintsOn) updateHint();
    }

    function updateHint() {
        if (!hintsOn) {
            UI.hideHint();
            return;
        }
        var hint = Strategy.getHint(bets);
        UI.showHint(hint.action, hint.explanation, hint.riskLabel, hint.riskClass, hint.detailedExplanation);
    }

    // ── SPINNING ──────────────────────────────────────

    function startSpin() {
        state = STATES.SPINNING;
        var totalBet = getTotalBet();
        bankroll -= totalBet;
        UI.updateBankroll(bankroll);
        UI.setSpinning(true);
        UI.setMessage('Spinning...');
        UI.hideHint();
        UI.clearWinningHighlights();

        // Generate result
        var result = Wheel.generateResult();

        Audio.spinStart();
        Audio.startSpinTicks(CONFIG.SPIN_DURATION);

        Wheel.spin(result, function() {
            Audio.stopSpinTicks();
            Audio.ballDrop();
            onResult(result);
        });
    }

    // ── RESULT ────────────────────────────────────────

    function onResult(result) {
        state = STATES.RESULT;
        UI.updateResultDisplay(result);
        UI.highlightWinningCells(result);

        // Calculate winnings
        var totalWinnings = 0;
        bets.forEach(function(bet) {
            if (bet.numbers.includes(result)) {
                var payout = CONFIG.PAYOUTS[bet.type];
                // Winnings = bet amount * payout + original bet back
                var win = bet.amount * payout + bet.amount;
                totalWinnings += win;
            }
        });

        var netWin = totalWinnings - getTotalBet();

        if (totalWinnings > 0) {
            bankroll += totalWinnings;
            stats.spinsWon++;
            var profit = totalWinnings - getTotalBet();
            stats.biggestWin = Math.max(stats.biggestWin, profit);

            if (profit >= getTotalBet() * 10) {
                // Big win (e.g., straight up hit)
                UI.showResult('BIG WIN! +$' + profit, '#f1c40f');
                Animations.bigWinEffect(UI.els().wrapper);
                Audio.bigWin();
            } else {
                UI.showResult('Win! +$' + profit, '#2ecc71');
                Animations.winEffect(UI.els().wrapper);
                Audio.win();
            }
            UI.setMessage('Won $' + totalWinnings + '!');
        } else {
            UI.showResult('No win', '#e74c3c');
            Animations.loseEffect(UI.els().wrapper);
            Audio.lose();
            UI.setMessage('Ball landed on ' + result);
        }

        stats.spinsPlayed++;
        stats.biggestBankroll = Math.max(stats.biggestBankroll, bankroll);
        UI.updateBankroll(bankroll);
        UI.updateStats(stats);
        saveState();

        // Show result hint
        if (hintsOn) {
            var hint = Strategy.getResultHint(result, bets, totalWinnings > 0 ? totalWinnings - getTotalBet() : 0);
            UI.showHint(hint.action, hint.explanation, hint.riskLabel, hint.riskClass, hint.detailedExplanation);
        }

        // Return to betting after delay
        setTimeout(function() {
            enterBetting();
        }, 2500);
    }

    return { init: init };
})();

// Boot
document.addEventListener('DOMContentLoaded', Game.init);
