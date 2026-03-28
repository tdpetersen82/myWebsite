const Game = (() => {
    const PHASES = { COME_OUT: 'COME_OUT', POINT: 'POINT' };
    const STATES = { BETTING: 0, ROLLING: 1, RESOLVING: 2 };

    let gameState = STATES.BETTING;
    let phase = PHASES.COME_OUT;
    let point = 0;

    let bankroll = CONFIG.STARTING_BANKROLL;
    let selectedChipValue = 5;
    let hintsOn = false;

    // Active bets
    let bets = {
        pass: 0,
        dontPass: 0,
        odds: 0,
        field: 0,
        place6: 0,
        place8: 0,
    };

    let lastBets = {};

    // Stats
    let stats = { rolls: 0, passWins: 0, dontPassWins: 0, bestBankroll: CONFIG.STARTING_BANKROLL };

    function init() {
        UI.init();
        loadState();
        bindEvents();
        updateHintsButton();
        enterBetting();
    }

    function loadState() {
        try {
            var saved = JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEY));
            if (saved) {
                bankroll = saved.bankroll != null ? saved.bankroll : CONFIG.STARTING_BANKROLL;
                stats = Object.assign({}, stats, saved.stats || {});
            }
        } catch (e) {}
        hintsOn = localStorage.getItem(CONFIG.HINT_KEY) === 'true';
    }

    function saveState() {
        localStorage.setItem(CONFIG.STORAGE_KEY, JSON.stringify({ bankroll: bankroll, stats: stats }));
    }

    function bindEvents() {
        var e = UI.els();

        // Chip selection
        e.chipRack.addEventListener('click', function(ev) {
            var chip = ev.target.closest('.chip');
            if (!chip) return;
            selectedChipValue = parseInt(chip.dataset.value);
            updateChipSelection();
            Audio.chipPlace();
        });

        // Bet zone clicks
        e.passZone.addEventListener('click', function() { placeBet('pass'); });
        e.dontPassZone.addEventListener('click', function() { placeBet('dontPass'); });
        e.fieldZone.addEventListener('click', function() { placeBet('field'); });
        e.oddsZone.addEventListener('click', function() { placeBet('odds'); });
        e.place6Zone.addEventListener('click', function() { placeBet('place6'); });
        e.place8Zone.addEventListener('click', function() { placeBet('place8'); });

        // Roll
        e.btnRoll.addEventListener('click', function() { rollDice(); });

        // Clear bets
        e.btnClearBets.addEventListener('click', function() { clearAllBets(); });

        // Hints toggle
        e.hintsBtn.addEventListener('click', function() {
            hintsOn = !hintsOn;
            localStorage.setItem(CONFIG.HINT_KEY, hintsOn);
            updateHintsButton();
            updateHint();
        });
    }

    function updateChipSelection() {
        var chips = UI.els().chipRack.querySelectorAll('.chip');
        chips.forEach(function(c) {
            if (parseInt(c.dataset.value) === selectedChipValue) {
                c.classList.add('chip-selected');
            } else {
                c.classList.remove('chip-selected');
            }
        });
        UI.els().selectedChip.textContent = '$' + selectedChipValue;
    }

    function updateHintsButton() {
        var btn = UI.els().hintsBtn;
        btn.textContent = hintsOn ? 'Hints: ON' : 'Hints: OFF';
        btn.classList.toggle('active', hintsOn);
    }

    // ── BETTING ─────────────────────────────────────

    function placeBet(type) {
        if (gameState !== STATES.BETTING) return;
        var amount = selectedChipValue;

        // Validate bet placement
        if (type === 'pass') {
            if (phase !== PHASES.COME_OUT) return; // pass line only on come-out
            if (bets.dontPass > 0) return; // can't bet both
        }
        if (type === 'dontPass') {
            if (phase !== PHASES.COME_OUT) return;
            if (bets.pass > 0) return;
        }
        if (type === 'odds') {
            if (phase !== PHASES.POINT) return;
            if (!bets.pass && !bets.dontPass) return;
            var baseBet = bets.pass || bets.dontPass;
            var maxOdds = baseBet * CONFIG.MAX_ODDS_MULTIPLE;
            if (bets.odds + amount > maxOdds) {
                amount = maxOdds - bets.odds;
                if (amount <= 0) return;
            }
        }
        if (type === 'place6' || type === 'place8') {
            if (phase !== PHASES.POINT) return;
        }

        if (amount > bankroll) return;
        if (bets[type] + amount > CONFIG.MAX_BET && type !== 'odds') return;

        bankroll -= amount;
        bets[type] += amount;

        UI.updateBankroll(bankroll);
        updateBetDisplays();
        UI.enableRoll(hasBets());
        Audio.chipPlace();
        updateHint();
    }

    function clearAllBets() {
        if (gameState !== STATES.BETTING) return;
        // Return all bets to bankroll
        Object.keys(bets).forEach(function(k) {
            bankroll += bets[k];
            bets[k] = 0;
        });
        UI.updateBankroll(bankroll);
        updateBetDisplays();
        UI.enableRoll(false);
        updateHint();
    }

    function hasBets() {
        return bets.pass > 0 || bets.dontPass > 0 || bets.field > 0 || bets.place6 > 0 || bets.place8 > 0;
    }

    function updateBetDisplays() {
        UI.updateBetDisplay('passBet', bets.pass);
        UI.updateBetDisplay('dontPassBet', bets.dontPass);
        UI.updateBetDisplay('oddsBet', bets.odds);
        UI.updateBetDisplay('fieldBet', bets.field);
        UI.updateBetDisplay('place6Bet', bets.place6);
        UI.updateBetDisplay('place8Bet', bets.place8);
    }

    function enterBetting() {
        gameState = STATES.BETTING;

        if (bankroll < CONFIG.MIN_BET && !hasBets()) {
            UI.setMessage('Out of chips! Bankroll reset.');
            bankroll = CONFIG.STARTING_BANKROLL;
            bets = { pass: 0, dontPass: 0, odds: 0, field: 0, place6: 0, place8: 0 };
            point = 0;
            phase = PHASES.COME_OUT;
            saveState();
        }

        UI.updateBankroll(bankroll);
        UI.updateStats(stats);
        updateBetDisplays();
        UI.enableRoll(hasBets());
        UI.showOddsZone(phase === PHASES.POINT);
        UI.setPuck(phase === PHASES.POINT ? point : 0);
        UI.highlightClickableZones(phase, point);

        if (phase === PHASES.COME_OUT) {
            UI.setMessage('Come-Out Roll \u2014 Place your bets!');
        } else {
            UI.setMessage('Point is ' + point + ' \u2014 Place additional bets or roll');
        }

        updateChipSelection();
        updateHint();
    }

    // ── ROLLING ─────────────────────────────────────

    function rollDice() {
        if (gameState !== STATES.BETTING || !hasBets()) return;

        gameState = STATES.ROLLING;
        UI.enableRoll(false);
        UI.highlightClickableZones(null); // remove highlights
        UI.setMessage('Rolling...');

        // Save bets for reuse
        lastBets = Object.assign({}, bets);

        Audio.diceShake();

        var result = Dice.roll();
        var diceArea = UI.els().diceArea;

        Animations.rollDice(diceArea, result.die1, result.die2, function() {
            Audio.diceLand();
            stats.rolls++;
            resolveRoll(result);
        });
    }

    // ── RESOLUTION ──────────────────────────────────

    function resolveRoll(result) {
        gameState = STATES.RESOLVING;
        var total = result.total;
        var winnings = 0;
        var messages = [];

        // ── FIELD BET (one-roll, resolves every roll) ──
        if (bets.field > 0) {
            if (Dice.isFieldNumber(total)) {
                var fieldPay;
                if (total === 2) {
                    fieldPay = bets.field * CONFIG.FIELD_PAYOUTS[2];
                } else if (total === 12) {
                    fieldPay = bets.field * CONFIG.FIELD_PAYOUTS[12];
                } else {
                    fieldPay = bets.field * CONFIG.FIELD_PAYOUTS.default;
                }
                winnings += fieldPay;
                bankroll += fieldPay;
                messages.push('Field wins! +$' + (fieldPay - bets.field));
                UI.flashZone(UI.els().fieldZone, 'rgba(46,204,113,0.5)');
            } else {
                messages.push('Field loses');
                UI.flashZone(UI.els().fieldZone, 'rgba(231,76,60,0.4)');
            }
            bets.field = 0;
        }

        // ── PLACE BETS ──
        if (phase === PHASES.POINT) {
            // Place 6
            if (bets.place6 > 0) {
                if (total === 6) {
                    var p6 = Math.floor(bets.place6 * CONFIG.PLACE_PAYOUTS[6].pays / CONFIG.PLACE_PAYOUTS[6].for) + bets.place6;
                    winnings += p6;
                    bankroll += p6;
                    messages.push('Place 6 wins! +$' + (p6 - bets.place6));
                    bets.place6 = 0;
                    UI.flashZone(UI.els().place6Zone, 'rgba(46,204,113,0.5)');
                } else if (total === 7) {
                    messages.push('Place 6 loses');
                    bets.place6 = 0;
                }
            }
            // Place 8
            if (bets.place8 > 0) {
                if (total === 8) {
                    var p8 = Math.floor(bets.place8 * CONFIG.PLACE_PAYOUTS[8].pays / CONFIG.PLACE_PAYOUTS[8].for) + bets.place8;
                    winnings += p8;
                    bankroll += p8;
                    messages.push('Place 8 wins! +$' + (p8 - bets.place8));
                    bets.place8 = 0;
                    UI.flashZone(UI.els().place8Zone, 'rgba(46,204,113,0.5)');
                } else if (total === 7) {
                    messages.push('Place 8 loses');
                    bets.place8 = 0;
                }
            }
        }

        // ── COME-OUT PHASE ──
        if (phase === PHASES.COME_OUT) {
            if (Dice.isNatural(total)) {
                // 7 or 11: pass wins, don't pass loses
                if (bets.pass > 0) {
                    var passWin = bets.pass * 2;
                    winnings += passWin;
                    bankroll += passWin;
                    messages.push('Natural ' + total + '! Pass Line wins +$' + bets.pass);
                    stats.passWins++;
                    bets.pass = 0;
                    UI.flashZone(UI.els().passZone, 'rgba(46,204,113,0.5)');
                }
                if (bets.dontPass > 0) {
                    messages.push("Don't Pass loses");
                    bets.dontPass = 0;
                    UI.flashZone(UI.els().dontPassZone, 'rgba(231,76,60,0.4)');
                }
                showRollResult(total, messages, winnings > 0);
                if (winnings > 0) Audio.win(); else Audio.lose();
            } else if (Dice.isCraps(total)) {
                // 2, 3, or 12: pass loses
                if (bets.pass > 0) {
                    messages.push('Craps ' + total + '! Pass Line loses');
                    bets.pass = 0;
                    UI.flashZone(UI.els().passZone, 'rgba(231,76,60,0.4)');
                }
                if (bets.dontPass > 0) {
                    if (total === 12) {
                        // Push on 12
                        bankroll += bets.dontPass;
                        messages.push("Don't Pass pushes on 12");
                        bets.dontPass = 0;
                        UI.flashZone(UI.els().dontPassZone, 'rgba(241,196,15,0.4)');
                    } else {
                        var dpWin = bets.dontPass * 2;
                        winnings += dpWin;
                        bankroll += dpWin;
                        messages.push("Don't Pass wins +$" + bets.dontPass);
                        stats.dontPassWins++;
                        bets.dontPass = 0;
                        UI.flashZone(UI.els().dontPassZone, 'rgba(46,204,113,0.5)');
                    }
                }
                showRollResult(total, messages, winnings > 0);
                if (winnings > 0) Audio.win(); else Audio.lose();
            } else {
                // Point is set
                point = total;
                phase = PHASES.POINT;
                messages.push('Point is ' + point + '!');
                Audio.pointSet();
                showRollResult(total, messages, null);
                UI.setPuck(point);
                UI.showOddsZone(true);
                Animations.pointSetEffect(UI.els()['point' + point]);
            }
        }
        // ── POINT PHASE ──
        else if (phase === PHASES.POINT) {
            // Track which line bet the player had before clearing
            var hadPass = bets.pass > 0;
            var hadDontPass = bets.dontPass > 0;

            if (total === point) {
                // Point hit! Pass wins
                if (hadPass) {
                    var pw = bets.pass * 2;
                    winnings += pw;
                    bankroll += pw;
                    messages.push('Point ' + point + ' hit! Pass Line wins +$' + bets.pass);
                    stats.passWins++;
                    bets.pass = 0;
                    UI.flashZone(UI.els().passZone, 'rgba(46,204,113,0.5)');
                }
                if (hadDontPass) {
                    messages.push("Don't Pass loses");
                    bets.dontPass = 0;
                    UI.flashZone(UI.els().dontPassZone, 'rgba(231,76,60,0.4)');
                }
                // Odds bet
                if (bets.odds > 0) {
                    if (hadPass) {
                        // Pass odds win
                        var oddsInfo = CONFIG.ODDS_PAYOUTS[point];
                        var oddsPay = Math.floor(bets.odds * oddsInfo.pays / oddsInfo.for) + bets.odds;
                        winnings += oddsPay;
                        bankroll += oddsPay;
                        messages.push('Odds wins +$' + (oddsPay - bets.odds));
                    } else {
                        // Don't pass odds lose when point is hit
                        messages.push('Odds bet loses');
                    }
                    bets.odds = 0;
                }
                // Reset to come-out
                point = 0;
                phase = PHASES.COME_OUT;
                if (winnings > 0) {
                    Audio.win();
                    showRollResult(total, messages, true);
                } else {
                    Audio.lose();
                    showRollResult(total, messages, false);
                }
                UI.setPuck(0);
                UI.showOddsZone(false);
            } else if (total === 7) {
                // Seven out! Pass loses, Don't Pass wins
                if (hadPass) {
                    messages.push('Seven out! Pass Line loses');
                    bets.pass = 0;
                    UI.flashZone(UI.els().passZone, 'rgba(231,76,60,0.4)');
                }
                if (hadDontPass) {
                    var dpw = bets.dontPass * 2;
                    winnings += dpw;
                    bankroll += dpw;
                    messages.push("Don't Pass wins +$" + bets.dontPass);
                    stats.dontPassWins++;
                    bets.dontPass = 0;
                    UI.flashZone(UI.els().dontPassZone, 'rgba(46,204,113,0.5)');
                }
                // Odds bet
                if (bets.odds > 0) {
                    if (hadDontPass) {
                        // Don't pass odds win on seven out
                        var dontOdds = CONFIG.DONT_ODDS_PAYOUTS[point];
                        var dOddsPay = Math.floor(bets.odds * dontOdds.pays / dontOdds.for) + bets.odds;
                        winnings += dOddsPay;
                        bankroll += dOddsPay;
                        messages.push('Odds wins +$' + (dOddsPay - bets.odds));
                    } else {
                        // Pass odds lose on seven out
                        messages.push('Odds bet loses');
                    }
                    bets.odds = 0;
                }
                // Reset
                point = 0;
                phase = PHASES.COME_OUT;
                if (winnings > 0) {
                    Audio.win();
                } else {
                    Audio.sevenOut();
                }
                showRollResult(total, messages, winnings > 0 ? true : false);
                UI.setPuck(0);
                UI.showOddsZone(false);
            } else {
                // Neither point nor 7 — neutral for pass/dontPass
                if (messages.length === 0) {
                    messages.push('Rolled ' + total + ' \u2014 no effect on Pass Line');
                }
                showRollResult(total, messages, winnings > 0 ? true : null);
            }
        }

        stats.bestBankroll = Math.max(stats.bestBankroll, bankroll);
        UI.updateBankroll(bankroll);
        updateBetDisplays();
        saveState();

        // Re-enter betting after delay
        setTimeout(function() {
            enterBetting();
        }, 1600);
    }

    function showRollResult(total, messages, isWin) {
        var msg = messages.join(' | ');
        UI.setMessage(msg);

        if (isWin === true) {
            UI.showResult('Rolled ' + total + '!', '#2ecc71');
        } else if (isWin === false) {
            UI.showResult('Rolled ' + total, '#e74c3c');
        } else {
            UI.showResult('Rolled ' + total, '#f1c40f');
        }
    }

    function updateHint() {
        if (!hintsOn) {
            UI.hideHint();
            return;
        }
        var hint = Strategy.getBettingHint({
            phase: phase,
            point: point,
            bets: bets,
        });
        if (hint) {
            UI.showHint(hint.action, hint.explanation, hint.riskLabel, hint.riskClass, hint.detail);
        } else {
            UI.hideHint();
        }
    }

    return { init: init };
})();

// Boot
document.addEventListener('DOMContentLoaded', Game.init);
