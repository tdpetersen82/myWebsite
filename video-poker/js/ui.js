const UI = (() => {
    let els = {};

    function init() {
        els = {
            wrapper: document.getElementById('game-wrapper'),
            bankroll: document.getElementById('bankroll-value'),
            hintsBtn: document.getElementById('btn-hints'),

            paytable: document.getElementById('paytable'),
            cardsArea: document.getElementById('cards-area'),
            playerCards: document.getElementById('player-cards'),

            slots: [
                document.getElementById('slot-0'),
                document.getElementById('slot-1'),
                document.getElementById('slot-2'),
                document.getElementById('slot-3'),
                document.getElementById('slot-4'),
            ],
            holdBadges: [
                document.getElementById('hold-0'),
                document.getElementById('hold-1'),
                document.getElementById('hold-2'),
                document.getElementById('hold-3'),
                document.getElementById('hold-4'),
            ],

            hintPanel: document.getElementById('hint-panel'),
            hintAction: document.getElementById('hint-action'),
            hintRisk: document.getElementById('hint-risk'),
            hintExplanation: document.getElementById('hint-explanation'),
            hintDetailToggle: document.getElementById('hint-detail-toggle'),
            hintDetail: document.getElementById('hint-detail'),

            coinSelector: document.getElementById('coin-selector'),
            btnDeal: document.getElementById('btn-deal'),
            btnDraw: document.getElementById('btn-draw'),
            btnBetMax: document.getElementById('btn-bet-max'),

            statsBar: document.getElementById('stats-bar'),
            message: document.getElementById('message'),
            resultBanner: document.getElementById('result-banner'),
        };
    }

    function createCardEl(card) {
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

        // Start face up
        face.style.display = 'flex';
        back.style.display = 'none';

        div._card = card;
        return div;
    }

    function placeCardInSlot(card, slotIndex) {
        const slot = els.slots[slotIndex];
        slot.innerHTML = '';
        const cardEl = createCardEl(card);
        slot.appendChild(cardEl);
        slot.classList.add('has-card');
        Animations.dealCard(cardEl);
        Audio.cardDeal();
        return cardEl;
    }

    function replaceCardInSlot(card, slotIndex, callback) {
        const slot = els.slots[slotIndex];
        const oldCard = slot.querySelector('.card');
        if (oldCard) {
            const inner = oldCard.querySelector('.card-inner');
            // Flip to back
            Animations.flipCard(inner, () => {
                // Replace with new card
                slot.innerHTML = '';
                const cardEl = createCardEl(card);
                slot.appendChild(cardEl);
                Animations.dealCard(cardEl);
                Audio.draw();
                if (callback) callback();
            });
        } else {
            placeCardInSlot(card, slotIndex);
            if (callback) callback();
        }
    }

    function clearSlots() {
        for (let i = 0; i < 5; i++) {
            els.slots[i].innerHTML = '';
            els.slots[i].classList.remove('has-card', 'held');
            els.holdBadges[i].classList.remove('visible');
        }
    }

    function setHold(index, held) {
        if (held) {
            els.slots[index].classList.add('held');
            els.holdBadges[index].classList.add('visible');
            Animations.holdBounce(els.slots[index]);
        } else {
            els.slots[index].classList.remove('held');
            els.holdBadges[index].classList.remove('visible');
            Animations.unholdBounce(els.slots[index]);
        }
    }

    function clearAllHolds() {
        for (let i = 0; i < 5; i++) {
            els.slots[i].classList.remove('held');
            els.slots[i].style.transform = '';
            els.slots[i].style.transition = '';
            els.holdBadges[i].classList.remove('visible');
        }
    }

    function setWinningCards(indices) {
        for (let i = 0; i < 5; i++) {
            const card = els.slots[i].querySelector('.card');
            if (card) {
                if (indices.includes(i)) {
                    card.classList.add('winning');
                } else {
                    card.classList.remove('winning');
                }
            }
        }
    }

    function clearWinningCards() {
        for (let i = 0; i < 5; i++) {
            const card = els.slots[i].querySelector('.card');
            if (card) card.classList.remove('winning');
        }
    }

    function updateBankroll(amount) {
        els.bankroll.textContent = '$' + amount.toLocaleString();
    }

    function highlightPaytable(handKey, coins) {
        // Remove old highlights
        const rows = els.paytable.querySelectorAll('.paytable-row');
        rows.forEach(row => row.classList.remove('highlight'));

        // Highlight active coin column
        els.paytable.querySelectorAll('.paytable-pay').forEach(pay => {
            pay.classList.toggle('active-coin', parseInt(pay.dataset.coins) === coins);
        });

        // Highlight winning hand row
        if (handKey) {
            const row = els.paytable.querySelector('[data-hand="' + handKey + '"]');
            if (row) row.classList.add('highlight');
        }
    }

    function setActiveCoin(coins) {
        els.coinSelector.querySelectorAll('.coin-btn').forEach(btn => {
            btn.classList.toggle('active', parseInt(btn.dataset.coins) === coins);
        });
        // Update paytable column highlight
        els.paytable.querySelectorAll('.paytable-pay').forEach(pay => {
            pay.classList.toggle('active-coin', parseInt(pay.dataset.coins) === coins);
        });
    }

    function showDealMode() {
        els.btnDeal.style.display = 'inline-block';
        els.btnDraw.style.display = 'none';
        els.btnBetMax.style.display = 'inline-block';
        enableCoinSelector(true);
    }

    function showDrawMode() {
        els.btnDeal.style.display = 'none';
        els.btnDraw.style.display = 'inline-block';
        els.btnBetMax.style.display = 'none';
        enableCoinSelector(false);
    }

    function enableDeal(enabled) {
        els.btnDeal.disabled = !enabled;
    }

    function enableDraw(enabled) {
        els.btnDraw.disabled = !enabled;
    }

    function enableBetMax(enabled) {
        els.btnBetMax.disabled = !enabled;
    }

    function enableCoinSelector(enabled) {
        els.coinSelector.querySelectorAll('.coin-btn').forEach(btn => {
            btn.disabled = !enabled;
            btn.style.opacity = enabled ? '1' : '0.5';
            btn.style.cursor = enabled ? 'pointer' : 'default';
        });
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
            '<span>Hands: ' + stats.handsPlayed + '</span>' +
            '<span>Wins: ' + stats.handsWon + '</span>' +
            '<span>Royals: ' + stats.royalFlushes + '</span>' +
            '<span>Best: $' + stats.biggestBankroll.toLocaleString() + '</span>';
    }

    return {
        init, els: () => els,
        createCardEl, placeCardInSlot, replaceCardInSlot, clearSlots,
        setHold, clearAllHolds, setWinningCards, clearWinningCards,
        updateBankroll, highlightPaytable, setActiveCoin,
        showDealMode, showDrawMode, enableDeal, enableDraw, enableBetMax, enableCoinSelector,
        showHint, hideHint, setMessage, showResult, updateStats,
    };
})();
