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
            hintExplanation: document.getElementById('hint-explanation'),

            bettingArea: document.getElementById('betting-area'),
            chipRack: document.getElementById('chip-rack'),
            betAmount: document.getElementById('bet-amount'),
            btnDeal: document.getElementById('btn-deal'),
            btnClear: document.getElementById('btn-clear'),
            btnRebet: document.getElementById('btn-rebet'),

            statsBar: document.getElementById('stats-bar'),
            message: document.getElementById('message'),
            resultBanner: document.getElementById('result-banner'),
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

    function showHint(action, explanation) {
        els.hintAction.textContent = action;
        els.hintExplanation.textContent = explanation;
        els.hintPanel.classList.add('visible');
    }

    function hideHint() {
        els.hintPanel.classList.remove('visible');
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
    };
})();
