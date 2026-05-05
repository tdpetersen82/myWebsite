const UI = (() => {
    // Cached DOM elements (populated on init)
    let els = {};

    function init() {
        els = {
            wrapper: document.getElementById('game-wrapper'),
            bankroll: document.getElementById('bankroll-value'),
            hintsBtn: document.getElementById('btn-hints'),

            dealerArea: document.getElementById('dealer-area'),
            dealerCards: document.getElementById('dealer-cards'),
            dealerValue: document.getElementById('dealer-value'),

            playerArea: document.getElementById('player-area'),
            playerCards: document.getElementById('player-cards'),
            playerValue: document.getElementById('player-value'),

            actionBar: document.getElementById('action-bar'),
            btnHit: document.getElementById('btn-hit'),
            btnStand: document.getElementById('btn-stand'),
            btnDouble: document.getElementById('btn-double'),
            btnSplit: document.getElementById('btn-split'),
            btnInsurance: document.getElementById('btn-insurance'),
            btnSurrender: document.getElementById('btn-surrender'),

            hintPanel: document.getElementById('hint-panel'),
            hintAction: document.getElementById('hint-action'),
            hintRisk: document.getElementById('hint-risk'),
            hintExplanation: document.getElementById('hint-explanation'),
            hintDetailToggle: document.getElementById('hint-detail-toggle'),
            hintDetail: document.getElementById('hint-detail'),

            bettingArea: document.getElementById('betting-area'),
            chipRack: document.getElementById('chip-rack'),
            betAmount: document.getElementById('bet-amount'),
            btnDeal: document.getElementById('btn-deal'),
            btnClear: document.getElementById('btn-clear'),
            btnRebet: document.getElementById('btn-rebet'),

            statsBar: document.getElementById('stats-bar'),
            message: document.getElementById('message'),
            resultBanner: document.getElementById('result-banner'),
            streakBadge: document.getElementById('streak-badge'),
            betStack: document.getElementById('bet-stack'),
            learnBtn: document.getElementById('btn-learn'),
        };
    }

    function createCardEl(card, faceDown = false) {
        const div = document.createElement('div');
        div.className = 'card';
        const inner = document.createElement('div');
        inner.className = 'card-inner';

        // Face
        const face = document.createElement('div');
        const isRed = Deck.isRed(card);
        face.className = 'card-face ' + (isRed ? 'red' : 'black');

        const rank = document.createElement('div');
        rank.className = 'card-rank';
        rank.textContent = Deck.displayRank(card);
        const suit = document.createElement('div');
        suit.className = 'card-suit';
        suit.textContent = card.symbol;

        const cornerTop = document.createElement('div');
        cornerTop.className = 'card-corner top';
        cornerTop.innerHTML = Deck.displayRank(card) + '<br>' + card.symbol;
        const cornerBot = document.createElement('div');
        cornerBot.className = 'card-corner bottom';
        cornerBot.innerHTML = Deck.displayRank(card) + '<br>' + card.symbol;

        face.appendChild(cornerTop);
        face.appendChild(rank);
        face.appendChild(suit);
        face.appendChild(cornerBot);

        // Back
        const back = document.createElement('div');
        back.className = 'card-back';

        inner.appendChild(face);
        inner.appendChild(back);
        div.appendChild(inner);

        if (faceDown) {
            face.style.display = 'none';
            back.style.display = 'flex';
        } else {
            face.style.display = 'flex';
            back.style.display = 'none';
        }

        div._card = card;
        div._faceDown = faceDown;
        return div;
    }

    function revealCard(cardEl, callback) {
        Animations.flipCard(cardEl.querySelector('.card-inner'), () => {
            const face = cardEl.querySelector('.card-face');
            const back = cardEl.querySelector('.card-back');
            face.style.display = 'flex';
            back.style.display = 'none';
            cardEl._faceDown = false;
            Audio.cardFlip();
            if (callback) callback();
        });
    }

    function dealCardToArea(card, container, faceDown = false) {
        const cardEl = createCardEl(card, faceDown);
        container.appendChild(cardEl);
        Animations.dealCard(cardEl);
        Audio.cardDeal();
        return cardEl;
    }

    function clearCards() {
        els.dealerCards.innerHTML = '';
        els.playerCards.innerHTML = '';
        els.playerArea.querySelector('.split-hands')?.remove();
    }

    function updateBankroll(amount) {
        els.bankroll.textContent = '$' + amount.toLocaleString();
    }

    function updateBet(amount) {
        els.betAmount.textContent = '$' + amount;
        renderBetStack(amount);
    }

    // Break a bet down to standard chip denoms and render visual stack.
    function renderBetStack(amount) {
        if (!els.betStack) return;
        els.betStack.innerHTML = '';
        if (amount <= 0) return;

        const denoms = [
            { v: 500, bg: '#8e44ad', border: '#6c3483' },
            { v: 100, bg: '#2980b9', border: '#1f6fa5' },
            { v: 25,  bg: '#27ae60', border: '#1e8449' },
            { v: 5,   bg: '#e74c3c', border: '#c0392b' },
        ];
        let remaining = amount;
        let total = 0;
        const MAX_CHIPS = 8;
        for (const d of denoms) {
            while (remaining >= d.v && total < MAX_CHIPS) {
                const chip = document.createElement('div');
                chip.className = 'bet-stack-chip';
                chip.style.background = d.bg;
                chip.style.borderColor = d.border;
                els.betStack.appendChild(chip);
                remaining -= d.v;
                total++;
            }
            if (total >= MAX_CHIPS) break;
        }
    }

    function updateStreak(wins) {
        if (!els.streakBadge) return;
        if (wins >= 2) {
            els.streakBadge.textContent = '🔥 ' + wins + ' wins!';
            els.streakBadge.classList.add('visible');
            els.streakBadge.classList.toggle('hot', wins >= 4);
        } else {
            els.streakBadge.classList.remove('visible', 'hot');
        }
    }

    function updateHandValue(el, value, soft) {
        if (value === 0) {
            el.textContent = '';
        } else {
            el.textContent = (soft ? 'Soft ' : '') + value;
        }
    }

    function showActions(actions) {
        els.actionBar.style.display = 'flex';
        els.btnHit.style.display = actions.hit ? 'inline-block' : 'none';
        els.btnStand.style.display = actions.stand ? 'inline-block' : 'none';
        els.btnDouble.style.display = actions.double ? 'inline-block' : 'none';
        els.btnSplit.style.display = actions.split ? 'inline-block' : 'none';
        els.btnInsurance.style.display = actions.insurance ? 'inline-block' : 'none';
        els.btnSurrender.style.display = actions.surrender ? 'inline-block' : 'none';
    }

    function hideActions() {
        els.actionBar.style.display = 'none';
    }

    function showBetting(show) {
        els.bettingArea.style.display = show ? 'block' : 'none';
    }

    function enableDeal(enabled) {
        els.btnDeal.disabled = !enabled;
    }

    function showHint(action, explanation, riskLabel, riskClass, detailedExplanation) {
        els.hintAction.textContent = action;
        els.hintRisk.textContent = riskLabel || '';
        els.hintRisk.className = 'hint-risk ' + (riskClass || 'risk-ok');
        els.hintExplanation.textContent = explanation;
        els.hintDetail.textContent = detailedExplanation || '';
        els.hintDetail.classList.remove('visible');
        els.hintDetailToggle.textContent = 'Learn More \u25B8';
        els.hintDetailToggle.onclick = function() {
            var open = els.hintDetail.classList.toggle('visible');
            els.hintDetailToggle.textContent = open ? 'Show Less \u25BE' : 'Learn More \u25B8';
        };
        els.hintPanel.classList.add('visible');
    }

    function hideHint() {
        els.hintPanel.classList.remove('visible');
        els.hintDetail.classList.remove('visible');
    }

    function setMessage(msg) {
        els.message.textContent = msg;
    }

    function showResult(text, color) {
        els.resultBanner.textContent = text;
        els.resultBanner.style.color = color || '#fff';
        els.resultBanner.className = 'result-banner show';
        setTimeout(() => { els.resultBanner.className = 'result-banner'; }, 1400);
    }

    function updateStats(stats) {
        els.statsBar.innerHTML =
            '<span>Played: ' + stats.handsPlayed + '</span>' +
            '<span>Won: ' + stats.handsWon + '</span>' +
            '<span>BJ: ' + stats.blackjacks + '</span>' +
            '<span>Best: $' + stats.biggestBankroll.toLocaleString() + '</span>';
    }

    // Create split hand containers
    function createSplitLayout(handCount) {
        // Remove existing player cards row and replace with split layout
        const existing = els.playerArea.querySelector('.split-hands');
        if (existing) existing.remove();

        const splitDiv = document.createElement('div');
        splitDiv.className = 'split-hands';
        for (let i = 0; i < handCount; i++) {
            const hand = document.createElement('div');
            hand.className = 'split-hand';
            hand.dataset.handIndex = i;

            const val = document.createElement('div');
            val.className = 'hand-value split-value';
            const row = document.createElement('div');
            row.className = 'cards-row';

            hand.appendChild(val);
            hand.appendChild(row);
            splitDiv.appendChild(hand);
        }

        // Insert after player-value, before player-cards
        els.playerCards.style.display = 'none';
        els.playerArea.appendChild(splitDiv);
        return splitDiv;
    }

    function removeSplitLayout() {
        const existing = els.playerArea.querySelector('.split-hands');
        if (existing) existing.remove();
        els.playerCards.style.display = 'flex';
    }

    return {
        init, els: () => els,
        createCardEl, revealCard, dealCardToArea, clearCards,
        updateBankroll, updateBet, updateHandValue,
        showActions, hideActions, showBetting, enableDeal,
        showHint, hideHint, setMessage, showResult, updateStats,
        createSplitLayout, removeSplitLayout,
        updateStreak, renderBetStack,
    };
})();
