const Game = (() => {
    // State machine
    const STATES = { BETTING: 0, DEALING: 1, DECISION: 2, REVEAL: 3, RESOLUTION: 4 };
    var state = STATES.BETTING;

    var bankroll = CONFIG.STARTING_BANKROLL;
    var anteBet = 0;
    var pairPlusBet = 0;
    var playBet = 0;
    var lastAnte = 0;
    var lastPairPlus = 0;
    var betTarget = 'ante'; // 'ante' or 'pairplus'
    var hintsOn = false;

    // Cards
    var dealerCards = [];
    var playerCards = [];
    var dealerCardEls = [];

    // Stats
    var stats = {
        handsPlayed: 0,
        handsWon: 0,
        anteBonuses: 0,
        biggestBankroll: CONFIG.STARTING_BANKROLL,
    };

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
            var saved = JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEY));
            if (saved) {
                bankroll = saved.bankroll != null ? saved.bankroll : CONFIG.STARTING_BANKROLL;
                if (saved.stats) {
                    stats.handsPlayed = saved.stats.handsPlayed || 0;
                    stats.handsWon = saved.stats.handsWon || 0;
                    stats.anteBonuses = saved.stats.anteBonuses || 0;
                    stats.biggestBankroll = saved.stats.biggestBankroll || CONFIG.STARTING_BANKROLL;
                }
            }
        } catch (e) {}
        hintsOn = localStorage.getItem(CONFIG.HINT_KEY) === 'true';
    }

    function saveState() {
        localStorage.setItem(CONFIG.STORAGE_KEY, JSON.stringify({ bankroll: bankroll, stats: stats }));
    }

    function bindEvents() {
        var els = UI.els();

        // Bet target selector
        els.targetAnte.addEventListener('click', function() {
            betTarget = 'ante';
            els.targetAnte.classList.add('active');
            els.targetPairPlus.classList.remove('active');
            UI.highlightTargetCircle('ante');
        });
        els.targetPairPlus.addEventListener('click', function() {
            betTarget = 'pairplus';
            els.targetPairPlus.classList.add('active');
            els.targetAnte.classList.remove('active');
            UI.highlightTargetCircle('pairplus');
        });

        // Chips
        els.chipRack.addEventListener('click', function(e) {
            var chip = e.target.closest('.chip');
            if (!chip || state !== STATES.BETTING) return;
            var val = parseInt(chip.dataset.value);

            if (betTarget === 'ante') {
                // Reserve bankroll for play bet (equal to ante)
                var newAnte = anteBet + val;
                if (newAnte <= CONFIG.MAX_BET && newAnte + newAnte + pairPlusBet <= bankroll) {
                    anteBet = newAnte;
                }
            } else {
                // Reserve bankroll for play bet (equal to ante)
                if (pairPlusBet + val <= CONFIG.MAX_BET && anteBet + anteBet + pairPlusBet + val <= bankroll) {
                    pairPlusBet += val;
                }
            }
            UI.updateBetDisplays(anteBet, pairPlusBet);
            UI.updateCircles(anteBet, 0, pairPlusBet);
            UI.enableDeal(anteBet >= CONFIG.MIN_BET);
            Audio.chipPlace();
            Animations.chipBounce(chip);
        });

        els.btnClear.addEventListener('click', function() {
            if (state !== STATES.BETTING) return;
            anteBet = 0;
            pairPlusBet = 0;
            UI.updateBetDisplays(0, 0);
            UI.updateCircles(0, 0, 0);
            UI.enableDeal(false);
        });

        els.btnRebet.addEventListener('click', function() {
            if (state !== STATES.BETTING) return;
            if (lastAnte === 0 && lastPairPlus === 0) return;
            var totalNeeded = lastAnte + lastPairPlus + lastAnte; // ante + PP + play bet reserve
            if (totalNeeded <= bankroll && lastAnte >= CONFIG.MIN_BET) {
                anteBet = lastAnte;
                pairPlusBet = lastPairPlus;
                UI.updateBetDisplays(anteBet, pairPlusBet);
                UI.updateCircles(anteBet, 0, pairPlusBet);
                UI.enableDeal(true);
                Audio.chipPlace();
            }
        });

        els.btnDeal.addEventListener('click', function() {
            if (state !== STATES.BETTING || anteBet < CONFIG.MIN_BET) return;
            startDeal();
        });

        // Play / Fold actions
        els.btnPlay.addEventListener('click', function() { playerPlay(); });
        els.btnFold.addEventListener('click', function() { playerFold(); });

        // Hints toggle
        els.hintsBtn.addEventListener('click', function() {
            hintsOn = !hintsOn;
            localStorage.setItem(CONFIG.HINT_KEY, hintsOn);
            updateHintsButton();
            if (state === STATES.DECISION) updateHint();
            else UI.hideHint();
        });
    }

    function updateHintsButton() {
        var btn = UI.els().hintsBtn;
        btn.textContent = hintsOn ? 'Hints: ON' : 'Hints: OFF';
        btn.classList.toggle('active', hintsOn);
    }

    // ── BETTING ───────────────────────────────────────

    function enterBetting() {
        state = STATES.BETTING;
        UI.clearCards();
        UI.hideActions();
        UI.showBetting(true);
        UI.hideHint();
        UI.updateBankroll(bankroll);
        UI.updateStats(stats);
        UI.updateCircles(anteBet, 0, pairPlusBet);
        UI.enableDeal(anteBet >= CONFIG.MIN_BET);
        UI.setMessage('Place your bets');
        UI.setHandValue(UI.els().dealerValue, '');
        UI.setHandValue(UI.els().playerValue, '');
        UI.highlightTargetCircle(betTarget);

        // Reset for bankruptcy
        if (bankroll < CONFIG.MIN_BET) {
            UI.setMessage('Out of chips! Bankroll reset.');
            bankroll = CONFIG.STARTING_BANKROLL;
            UI.updateBankroll(bankroll);
            saveState();
        }
    }

    // ── DEALING ───────────────────────────────────────

    function startDeal() {
        state = STATES.DEALING;
        lastAnte = anteBet;
        lastPairPlus = pairPlusBet;

        // Deduct bets
        bankroll -= (anteBet + pairPlusBet);
        UI.updateBankroll(bankroll);
        UI.showBetting(false);
        UI.setMessage('');

        dealerCards = [];
        playerCards = [];
        dealerCardEls = [];
        playBet = 0;

        UI.updateCircles(anteBet, 0, pairPlusBet);

        var dealerContainer = UI.els().dealerCards;
        var playerContainer = UI.els().playerCards;

        // Deal 3 cards to player (face up), 3 to dealer (face down)
        var delays = [0, 200, 400, 600, 800, 1000];

        // Player card 1
        setTimeout(function() {
            var c = Deck.deal();
            playerCards.push(c);
            UI.dealCardToArea(c, playerContainer);
        }, delays[0]);

        // Dealer card 1
        setTimeout(function() {
            var c = Deck.deal();
            dealerCards.push(c);
            dealerCardEls.push(UI.dealCardToArea(c, dealerContainer, true));
        }, delays[1]);

        // Player card 2
        setTimeout(function() {
            var c = Deck.deal();
            playerCards.push(c);
            UI.dealCardToArea(c, playerContainer);
        }, delays[2]);

        // Dealer card 2
        setTimeout(function() {
            var c = Deck.deal();
            dealerCards.push(c);
            dealerCardEls.push(UI.dealCardToArea(c, dealerContainer, true));
        }, delays[3]);

        // Player card 3
        setTimeout(function() {
            var c = Deck.deal();
            playerCards.push(c);
            UI.dealCardToArea(c, playerContainer);
        }, delays[4]);

        // Dealer card 3
        setTimeout(function() {
            var c = Deck.deal();
            dealerCards.push(c);
            dealerCardEls.push(UI.dealCardToArea(c, dealerContainer, true));
        }, delays[5]);

        setTimeout(function() { afterDeal(); }, 1300);
    }

    function afterDeal() {
        // Show player hand description
        var desc = Hand.describe(playerCards);
        UI.setHandValue(UI.els().playerValue, desc);
        UI.setHandValue(UI.els().dealerValue, '? ? ?');

        // Enter decision phase
        state = STATES.DECISION;
        UI.showActions(true);
        UI.setMessage('Play or Fold?');
        updateHint();
    }

    // ── DECISION ──────────────────────────────────────

    function updateHint() {
        if (!hintsOn || state !== STATES.DECISION) {
            UI.hideHint();
            return;
        }
        var rec = Strategy.getRecommendation(playerCards);
        UI.showHint(rec.action, rec.explanation, rec.riskLabel, rec.riskClass, rec.detailedExplanation);
    }

    function playerPlay() {
        if (state !== STATES.DECISION) return;
        state = STATES.REVEAL; // lock state immediately to prevent double-click

        // Place Play bet equal to Ante
        playBet = anteBet;
        if (bankroll < playBet) {
            // Not enough for play bet — should not happen since play = ante,
            // but handle gracefully
            playBet = bankroll;
        }
        bankroll -= playBet;
        UI.updateBankroll(bankroll);
        UI.updateCircles(anteBet, playBet, pairPlusBet);
        UI.hideActions();
        UI.hideHint();
        UI.setMessage('Revealing dealer hand...');
        Audio.chipPlace();

        revealDealer();
    }

    function playerFold() {
        if (state !== STATES.DECISION) return;
        state = STATES.RESOLUTION; // lock state immediately to prevent double-click

        UI.hideActions();
        UI.hideHint();
        Audio.fold();

        // Lose ante bet (already deducted). Pair Plus still pays if applicable.

        // Check Pair Plus before resolving
        var ppPayout = 0;
        if (pairPlusBet > 0) {
            var ppMult = Hand.getPairPlusPayout(playerCards);
            if (ppMult > 0) {
                ppPayout = pairPlusBet + pairPlusBet * ppMult;
                bankroll += ppPayout;
            }
            // else pair plus lost (already deducted)
        }

        UI.updateBankroll(bankroll);

        if (ppPayout > 0) {
            UI.setMessage('Folded \u2014 Pair Plus pays $' + ppPayout + '!');
            UI.showResult('Fold \u2014 PP +$' + ppPayout, '#f39c12');
            UI.showPayoutToast('+$' + ppPayout + ' PP', 350, 250);
            Audio.bonus();
        } else {
            UI.setMessage('Folded \u2014 Ante lost');
            UI.showResult('Fold', '#e74c3c');
        }

        stats.handsPlayed++;
        stats.biggestBankroll = Math.max(stats.biggestBankroll, bankroll);
        saveState();

        setTimeout(function() {
            anteBet = 0;
            pairPlusBet = 0;
            playBet = 0;
            UI.updateBetDisplays(0, 0);
            UI.updateCircles(0, 0, 0);
            enterBetting();
        }, 2000);
    }

    // ── REVEAL ────────────────────────────────────────

    function revealDealer() {
        state = STATES.REVEAL;

        // Reveal dealer cards one by one
        var idx = 0;
        function revealNext() {
            if (idx >= dealerCardEls.length) {
                // All revealed
                var dealerDesc = Hand.describe(dealerCards);
                UI.setHandValue(UI.els().dealerValue, dealerDesc);
                setTimeout(function() { resolve(); }, 500);
                return;
            }
            var cardEl = dealerCardEls[idx];
            idx++;
            UI.revealCard(cardEl, function() {
                setTimeout(revealNext, 250);
            });
        }
        revealNext();
    }

    // ── RESOLUTION ────────────────────────────────────

    function resolve() {
        state = STATES.RESOLUTION;

        var qualifies = Hand.dealerQualifies(dealerCards);
        var comparison = Hand.compare(playerCards, dealerCards);
        var anteBonus = Hand.getAnteBonus(playerCards);
        var ppMult = pairPlusBet > 0 ? Hand.getPairPlusPayout(playerCards) : 0;

        var totalPayout = 0;
        var messages = [];

        // ── Ante Bonus (paid regardless of dealer hand or outcome) ──
        if (anteBonus > 0) {
            var abPay = anteBet * anteBonus;
            totalPayout += abPay;
            messages.push('Ante Bonus: +$' + abPay);
            stats.anteBonuses++;
            UI.showPayoutToast('+$' + abPay + ' Bonus', 430, 220);
        }

        // ── Pair Plus (paid on player hand regardless of dealer) ──
        if (ppMult > 0) {
            var ppPay = pairPlusBet + pairPlusBet * ppMult;
            totalPayout += ppPay;
            messages.push('Pair Plus: +$' + ppPay);
            UI.showPayoutToast('+$' + ppPay + ' PP', 350, 250);
        } else if (pairPlusBet > 0) {
            // Pair plus lost — already deducted
            messages.push('Pair Plus: lost');
        }

        // ── Ante / Play resolution ──
        if (!qualifies) {
            // Dealer doesn't qualify
            // Ante pays 1:1, Play pushes (returned)
            var antePay = anteBet * 2; // original + 1:1
            var playReturn = playBet; // push
            totalPayout += antePay + playReturn;
            messages.push('Dealer does not qualify \u2014 Ante wins 1:1, Play pushes');
            stats.handsWon++;
        } else {
            // Dealer qualifies
            if (comparison > 0) {
                // Player wins
                var antePay = anteBet * 2; // original + 1:1
                var playPay = playBet * 2; // original + 1:1
                totalPayout += antePay + playPay;
                messages.push('Player wins! Ante and Play pay 1:1');
                stats.handsWon++;
            } else if (comparison === 0) {
                // Tie — push both
                totalPayout += anteBet + playBet;
                messages.push('Tie \u2014 Ante and Play push');
            } else {
                // Dealer wins
                // Bets already deducted
                messages.push('Dealer wins');
            }
        }

        bankroll += totalPayout;
        stats.handsPlayed++;
        stats.biggestBankroll = Math.max(stats.biggestBankroll, bankroll);
        UI.updateBankroll(bankroll);
        saveState();

        // Determine net result
        var totalBets = anteBet + playBet + pairPlusBet;
        var netResult = totalPayout - totalBets;

        UI.setMessage(messages.join(' | '));

        // Show result banner and effects
        if (netResult > 0) {
            if (anteBonus > 0) {
                UI.showResult('Win +$' + netResult + ' (Bonus!)', '#f1c40f');
                Animations.bonusEffect(UI.els().playerArea);
                Audio.bonus();
            } else {
                UI.showResult('Win +$' + netResult, '#2ecc71');
                Animations.winEffect(UI.els().playerArea);
                Audio.win();
            }
        } else if (netResult < 0) {
            UI.showResult('Lose $' + Math.abs(netResult), '#e74c3c');
            Animations.loseEffect(UI.els().playerArea);
            Audio.lose();
        } else {
            UI.showResult('Push', '#f1c40f');
            Animations.pushEffect(UI.els().playerArea);
        }

        setTimeout(function() {
            anteBet = 0;
            pairPlusBet = 0;
            playBet = 0;
            UI.updateBetDisplays(0, 0);
            UI.updateCircles(0, 0, 0);
            enterBetting();
        }, 2200);
    }

    return { init: init };
})();

// Boot
document.addEventListener('DOMContentLoaded', Game.init);
