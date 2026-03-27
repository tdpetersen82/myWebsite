const Game = (() => {
    // State
    const STATES = { BETTING: 0, DEALING: 1, PLAYER_TURN: 2, DEALER_TURN: 3, RESOLUTION: 4 };
    let state = STATES.BETTING;

    let bankroll = CONFIG.STARTING_BANKROLL;
    let currentBet = 0;
    let lastBet = 0;
    let hintsOn = false;

    // Hands
    let dealerCards = [];
    let dealerHoleCardEl = null; // the face-down card element

    // Player can have multiple hands (splits)
    let playerHands = []; // each: { cards: [], bet: number, cardEls: [], done: false, doubled: false, surrendered: false, isFromSplit: false }
    let activeHandIndex = 0;
    let splitCount = 0;
    let splitLayout = null;

    // Insurance
    let insuranceBet = 0;

    // Stats
    let stats = { handsPlayed: 0, handsWon: 0, blackjacks: 0, biggestWin: 0, biggestBankroll: CONFIG.STARTING_BANKROLL };

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
                stats = { ...stats, ...saved.stats };
            }
        } catch (e) {}
        hintsOn = localStorage.getItem(CONFIG.HINT_KEY) === 'true';
    }

    function saveState() {
        localStorage.setItem(CONFIG.STORAGE_KEY, JSON.stringify({ bankroll, stats }));
    }

    function bindEvents() {
        const els = UI.els();

        // Chips
        els.chipRack.addEventListener('click', (e) => {
            const chip = e.target.closest('.chip');
            if (!chip || state !== STATES.BETTING) return;
            const val = parseInt(chip.dataset.value);
            if (currentBet + val <= CONFIG.MAX_BET && currentBet + val <= bankroll) {
                currentBet += val;
                UI.updateBet(currentBet);
                UI.enableDeal(currentBet >= CONFIG.MIN_BET);
                Audio.chipPlace();
                Animations.chipBounce(chip);
            }
        });

        els.btnClear.addEventListener('click', () => {
            if (state !== STATES.BETTING) return;
            currentBet = 0;
            UI.updateBet(0);
            UI.enableDeal(false);
        });

        els.btnRebet.addEventListener('click', () => {
            if (state !== STATES.BETTING || lastBet === 0) return;
            const bet = Math.min(lastBet, bankroll, CONFIG.MAX_BET);
            if (bet >= CONFIG.MIN_BET) {
                currentBet = bet;
                UI.updateBet(currentBet);
                UI.enableDeal(true);
                Audio.chipPlace();
            }
        });

        els.btnDeal.addEventListener('click', () => {
            if (state !== STATES.BETTING || currentBet < CONFIG.MIN_BET) return;
            startDeal();
        });

        // Actions
        els.btnHit.addEventListener('click', () => playerHit());
        els.btnStand.addEventListener('click', () => playerStand());
        els.btnDouble.addEventListener('click', () => playerDouble());
        els.btnSplit.addEventListener('click', () => playerSplit());
        els.btnInsurance.addEventListener('click', () => playerInsurance());
        els.btnSurrender.addEventListener('click', () => playerSurrender());

        // Hints toggle
        els.hintsBtn.addEventListener('click', () => {
            hintsOn = !hintsOn;
            localStorage.setItem(CONFIG.HINT_KEY, hintsOn);
            updateHintsButton();
            if (state === STATES.PLAYER_TURN) updateHint();
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
        if (Deck.needsReshuffle()) {
            Deck.buildShoe();
            UI.setMessage('Shuffling new shoe...');
            setTimeout(() => UI.setMessage('Place your bet'), 800);
        } else {
            UI.setMessage('Place your bet');
        }

        UI.clearCards();
        UI.removeSplitLayout();
        UI.hideActions();
        UI.showBetting(true);
        UI.hideHint();
        UI.updateBankroll(bankroll);
        UI.updateStats(stats);
        UI.enableDeal(currentBet >= CONFIG.MIN_BET);

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
        lastBet = currentBet;
        bankroll -= currentBet;
        UI.updateBankroll(bankroll);
        UI.showBetting(false);
        UI.setMessage('');

        dealerCards = [];
        playerHands = [{ cards: [], bet: currentBet, done: false, doubled: false, surrendered: false, isFromSplit: false }];
        activeHandIndex = 0;
        splitCount = 0;
        splitLayout = null;
        insuranceBet = 0;
        dealerHoleCardEl = null;

        const dealerContainer = UI.els().dealerCards;
        const playerContainer = UI.els().playerCards;

        // Deal sequence: player, dealer, player, dealer(hole)
        const delays = [0, 250, 500, 750];

        setTimeout(() => {
            const c = Deck.deal();
            playerHands[0].cards.push(c);
            UI.dealCardToArea(c, playerContainer);
        }, delays[0]);

        setTimeout(() => {
            const c = Deck.deal();
            dealerCards.push(c);
            UI.dealCardToArea(c, dealerContainer);
        }, delays[1]);

        setTimeout(() => {
            const c = Deck.deal();
            playerHands[0].cards.push(c);
            UI.dealCardToArea(c, playerContainer);
        }, delays[2]);

        setTimeout(() => {
            const c = Deck.deal();
            dealerCards.push(c);
            dealerHoleCardEl = UI.dealCardToArea(c, dealerContainer, true);
        }, delays[3]);

        setTimeout(() => afterDeal(), 1100);
    }

    function afterDeal() {
        // Update values
        updateDisplayedValues();

        const playerBJ = Hand.isBlackjack(playerHands[0].cards);
        const dealerShowsAce = dealerCards[0].rank === 'A';

        // Check for player blackjack
        if (playerBJ) {
            // Reveal dealer hole card
            revealDealerHole(() => {
                const dealerBJ = Hand.isBlackjack(dealerCards);
                if (dealerBJ) {
                    // Push
                    bankroll += playerHands[0].bet;
                    UI.showResult('Push!', '#f1c40f');
                    Animations.pushEffect(UI.els().playerArea);
                    stats.handsPlayed++;
                    stats.blackjacks++;
                } else {
                    // Player wins 3:2
                    const payout = playerHands[0].bet + Math.floor(playerHands[0].bet * 1.5);
                    bankroll += payout;
                    UI.showResult('Blackjack!', '#f1c40f');
                    Animations.blackjackEffect(UI.els().playerArea);
                    Audio.blackjack();
                    stats.handsPlayed++;
                    stats.handsWon++;
                    stats.blackjacks++;
                    stats.biggestWin = Math.max(stats.biggestWin, payout - playerHands[0].bet);
                }
                stats.biggestBankroll = Math.max(stats.biggestBankroll, bankroll);
                UI.updateBankroll(bankroll);
                saveState();
                setTimeout(() => {
                    currentBet = 0;
                    UI.updateBet(0);
                    enterBetting();
                }, 1600);
            });
            return;
        }

        // Insurance offer if dealer shows ace
        if (dealerShowsAce && bankroll >= Math.floor(currentBet / 2)) {
            state = STATES.PLAYER_TURN;
            UI.showActions({ hit: true, stand: true, double: Hand.canDouble(playerHands[0].cards), split: Hand.canSplit(playerHands[0].cards, splitCount), insurance: true, surrender: true });
            UI.setMessage('Insurance?');
            if (hintsOn) {
                UI.showHint('DECLINE INSURANCE', 'Insurance has a high house edge. Basic strategy says to never take insurance.');
            }
        } else {
            enterPlayerTurn();
        }
    }

    // ── PLAYER TURN ───────────────────────────────────

    function enterPlayerTurn() {
        state = STATES.PLAYER_TURN;
        showCurrentActions();
        updateHint();
    }

    function showCurrentActions() {
        const hand = playerHands[activeHandIndex];
        const canDbl = Hand.canDouble(hand.cards) && bankroll >= hand.bet && !hand.isFromSplit;
        // Allow double after split if they have exactly 2 cards
        const canDblSplit = hand.isFromSplit && hand.cards.length === 2 && bankroll >= hand.bet;
        const canSpl = Hand.canSplit(hand.cards, splitCount) && bankroll >= hand.bet;
        const canSurr = hand.cards.length === 2 && !hand.isFromSplit;

        UI.showActions({
            hit: true,
            stand: true,
            double: canDbl || canDblSplit,
            split: canSpl,
            insurance: false,
            surrender: canSurr,
        });
    }

    function updateHint() {
        if (!hintsOn || state !== STATES.PLAYER_TURN) {
            UI.hideHint();
            return;
        }
        const hand = playerHands[activeHandIndex];
        const canDbl = Hand.canDouble(hand.cards) && bankroll >= hand.bet;
        const canSpl = Hand.canSplit(hand.cards, splitCount) && bankroll >= hand.bet;
        const canSurr = hand.cards.length === 2 && !hand.isFromSplit;

        const rec = Strategy.getRecommendation(hand.cards, dealerCards[0], canSpl, canDbl, canSurr);
        UI.showHint(rec.action, rec.explanation);
    }

    function getActiveCardContainer() {
        if (splitLayout) {
            return splitLayout.querySelector('[data-hand-index="' + activeHandIndex + '"] .cards-row');
        }
        return UI.els().playerCards;
    }

    function getActiveValueEl() {
        if (splitLayout) {
            return splitLayout.querySelector('[data-hand-index="' + activeHandIndex + '"] .split-value');
        }
        return UI.els().playerValue;
    }

    function playerHit() {
        if (state !== STATES.PLAYER_TURN) return;
        const hand = playerHands[activeHandIndex];
        const card = Deck.deal();
        hand.cards.push(card);
        UI.dealCardToArea(card, getActiveCardContainer());
        updateDisplayedValues();

        if (Hand.isBust(hand.cards)) {
            hand.done = true;
            UI.setMessage('Bust!');
            Animations.bustEffect(getActiveCardContainer().parentElement || UI.els().playerArea);
            Audio.lose();
            advanceHand();
        } else if (Hand.value(hand.cards) === 21) {
            hand.done = true;
            advanceHand();
        } else {
            showCurrentActions();
            updateHint();
        }
    }

    function playerStand() {
        if (state !== STATES.PLAYER_TURN) return;
        playerHands[activeHandIndex].done = true;
        advanceHand();
    }

    function playerDouble() {
        if (state !== STATES.PLAYER_TURN) return;
        const hand = playerHands[activeHandIndex];
        if (!Hand.canDouble(hand.cards) || bankroll < hand.bet) return;

        bankroll -= hand.bet;
        hand.bet *= 2;
        hand.doubled = true;
        UI.updateBankroll(bankroll);

        const card = Deck.deal();
        hand.cards.push(card);
        UI.dealCardToArea(card, getActiveCardContainer());
        updateDisplayedValues();

        hand.done = true;
        if (Hand.isBust(hand.cards)) {
            UI.setMessage('Bust!');
            Animations.bustEffect(getActiveCardContainer().parentElement || UI.els().playerArea);
            Audio.lose();
        }
        advanceHand();
    }

    function playerSplit() {
        if (state !== STATES.PLAYER_TURN) return;
        const hand = playerHands[activeHandIndex];
        if (!Hand.canSplit(hand.cards, splitCount) || bankroll < hand.bet) return;

        splitCount++;
        bankroll -= hand.bet;
        UI.updateBankroll(bankroll);

        // Remove second card from current hand
        const secondCard = hand.cards.pop();

        // Create new hand with the second card
        const newHand = { cards: [secondCard], bet: hand.bet, done: false, doubled: false, surrendered: false, isFromSplit: true };
        hand.isFromSplit = true;

        // Insert new hand right after current
        playerHands.splice(activeHandIndex + 1, 0, newHand);

        // Deal one card to each split hand
        const card1 = Deck.deal();
        hand.cards.push(card1);
        const card2 = Deck.deal();
        newHand.cards.push(card2);

        // Rebuild visual layout
        rebuildSplitLayout();
        updateDisplayedValues();

        // If split aces, each gets only one card — mark done
        if (secondCard.rank === 'A') {
            hand.done = true;
            newHand.done = true;
            advanceHand();
        } else {
            showCurrentActions();
            updateHint();
        }
    }

    function rebuildSplitLayout() {
        UI.els().playerCards.innerHTML = '';
        UI.els().playerCards.style.display = 'none';
        UI.els().playerValue.textContent = '';

        const existing = UI.els().playerArea.querySelector('.split-hands');
        if (existing) existing.remove();

        splitLayout = UI.createSplitLayout(playerHands.length);

        // Populate cards
        playerHands.forEach((hand, i) => {
            const row = splitLayout.querySelector('[data-hand-index="' + i + '"] .cards-row');
            hand.cards.forEach(card => {
                UI.dealCardToArea(card, row);
            });
        });

        highlightActiveHand();
    }

    function highlightActiveHand() {
        if (!splitLayout) return;
        splitLayout.querySelectorAll('.split-hand').forEach((el, i) => {
            el.classList.toggle('active-hand', i === activeHandIndex);
        });
    }

    function playerInsurance() {
        if (state !== STATES.PLAYER_TURN) return;
        const cost = Math.floor(currentBet / 2);
        if (bankroll < cost) return;

        insuranceBet = cost;
        bankroll -= cost;
        UI.updateBankroll(bankroll);

        // Now continue to normal player actions (remove insurance button)
        showCurrentActions();
        updateHint();
    }

    function playerSurrender() {
        if (state !== STATES.PLAYER_TURN) return;
        const hand = playerHands[activeHandIndex];
        hand.surrendered = true;
        hand.done = true;

        // Return half the bet
        bankroll += Math.floor(hand.bet / 2);
        UI.updateBankroll(bankroll);
        UI.setMessage('Surrendered');

        advanceHand();
    }

    function advanceHand() {
        UI.hideHint();
        // Find next unfinished hand
        for (let i = activeHandIndex + 1; i < playerHands.length; i++) {
            if (!playerHands[i].done) {
                activeHandIndex = i;
                highlightActiveHand();
                UI.setMessage('Hand ' + (i + 1));
                showCurrentActions();
                updateHint();
                return;
            }
        }
        // All hands done — dealer turn
        enterDealerTurn();
    }

    // ── DEALER TURN ───────────────────────────────────

    function enterDealerTurn() {
        state = STATES.DEALER_TURN;
        UI.hideActions();
        UI.hideHint();

        // Check if all player hands busted or surrendered
        const allBustedOrSurrendered = playerHands.every(h => Hand.isBust(h.cards) || h.surrendered);

        revealDealerHole(() => {
            if (allBustedOrSurrendered) {
                // Settle insurance if any
                settleInsurance();
                resolve();
                return;
            }
            dealerDraw();
        });
    }

    function revealDealerHole(callback) {
        if (dealerHoleCardEl && dealerHoleCardEl._faceDown) {
            UI.revealCard(dealerHoleCardEl, () => {
                updateDisplayedValues();
                if (callback) callback();
            });
        } else {
            updateDisplayedValues();
            if (callback) callback();
        }
    }

    function dealerDraw() {
        const dv = Hand.value(dealerCards);
        if (dv < 17) {
            setTimeout(() => {
                const card = Deck.deal();
                dealerCards.push(card);
                UI.dealCardToArea(card, UI.els().dealerCards);
                updateDisplayedValues();
                dealerDraw();
            }, 500);
        } else {
            settleInsurance();
            setTimeout(() => resolve(), 400);
        }
    }

    function settleInsurance() {
        if (insuranceBet > 0) {
            if (Hand.isBlackjack(dealerCards)) {
                bankroll += insuranceBet * 3; // original bet + 2:1 payout
                UI.setMessage('Insurance pays!');
            }
            // else insurance lost (already deducted)
            insuranceBet = 0;
        }
    }

    // ── RESOLUTION ────────────────────────────────────

    function resolve() {
        state = STATES.RESOLUTION;
        const dealerBJ = Hand.isBlackjack(dealerCards);

        let totalResult = 0; // net win/loss across all hands

        playerHands.forEach((hand, i) => {
            if (hand.surrendered) {
                stats.handsPlayed++;
                return; // already settled
            }

            const playerBJ = Hand.isBlackjack(hand.cards) && !hand.isFromSplit;
            const mult = Hand.compare(hand.cards, dealerCards, playerBJ, dealerBJ);

            if (mult > 0) {
                const payout = hand.bet + Math.floor(hand.bet * mult);
                bankroll += payout;
                totalResult += payout - hand.bet;
                stats.handsWon++;
                if (playerBJ) stats.blackjacks++;
            } else if (mult === 0) {
                bankroll += hand.bet; // push
            }
            // loss: bet already deducted

            stats.handsPlayed++;
        });

        stats.biggestBankroll = Math.max(stats.biggestBankroll, bankroll);
        if (totalResult > 0) stats.biggestWin = Math.max(stats.biggestWin, totalResult);

        UI.updateBankroll(bankroll);
        saveState();

        // Show result
        if (totalResult > 0) {
            const anyBJ = playerHands.some(h => Hand.isBlackjack(h.cards) && !h.isFromSplit);
            if (anyBJ) {
                UI.showResult('Blackjack! +$' + totalResult, '#f1c40f');
                Animations.blackjackEffect(UI.els().playerArea);
                Audio.blackjack();
            } else {
                UI.showResult('Win! +$' + totalResult, '#2ecc71');
                Animations.winEffect(UI.els().playerArea);
                Audio.win();
            }
        } else if (totalResult < 0) {
            UI.showResult('Lose $' + Math.abs(totalResult), '#e74c3c');
            Audio.lose();
        } else {
            UI.showResult('Push', '#f1c40f');
            Animations.pushEffect(UI.els().playerArea);
        }

        setTimeout(() => {
            currentBet = 0;
            UI.updateBet(0);
            enterBetting();
        }, 1800);
    }

    // ── HELPERS ───────────────────────────────────────

    function updateDisplayedValues() {
        // Dealer
        const dealerHidden = dealerHoleCardEl && dealerHoleCardEl._faceDown;
        if (dealerHidden) {
            const visibleCard = dealerCards[0];
            UI.updateHandValue(UI.els().dealerValue, Deck.cardValue(visibleCard), false);
        } else {
            const dv = Hand.value(dealerCards);
            UI.updateHandValue(UI.els().dealerValue, dv, Hand.isSoft(dealerCards));
        }

        // Player
        if (splitLayout) {
            playerHands.forEach((hand, i) => {
                const valEl = splitLayout.querySelector('[data-hand-index="' + i + '"] .split-value');
                if (valEl) {
                    const v = Hand.value(hand.cards);
                    UI.updateHandValue(valEl, v, Hand.isSoft(hand.cards));
                }
            });
        } else if (playerHands.length > 0) {
            const pv = Hand.value(playerHands[0].cards);
            UI.updateHandValue(UI.els().playerValue, pv, Hand.isSoft(playerHands[0].cards));
        }
    }

    return { init };
})();

// Boot
document.addEventListener('DOMContentLoaded', Game.init);
