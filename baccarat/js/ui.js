const UI = (() => {
    let els = {};

    function init() {
        els = {
            wrapper: document.getElementById('game-wrapper'),
            bankroll: document.getElementById('bankroll-value'),
            hintsBtn: document.getElementById('btn-hints'),
            commission: document.getElementById('commission-value'),

            playerArea: document.getElementById('player-area'),
            playerCards: document.getElementById('player-cards'),
            playerValue: document.getElementById('player-value'),

            bankerArea: document.getElementById('banker-area'),
            bankerCards: document.getElementById('banker-cards'),
            bankerValue: document.getElementById('banker-value'),

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

            betZones: document.getElementById('bet-zones'),
            zonePlayer: document.getElementById('zone-player'),
            zoneTie: document.getElementById('zone-tie'),
            zoneBanker: document.getElementById('zone-banker'),

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

        const back = document.createElement('div');
        back.className = 'card-back';

        inner.appendChild(face);
        inner.appendChild(back);
        div.appendChild(inner);

        face.style.display = 'flex';
        back.style.display = 'none';

        div._card = card;
        return div;
    }

    function dealCardToArea(card, container) {
        const cardEl = createCardEl(card);
        container.appendChild(cardEl);
        Animations.dealCard(cardEl);
        Audio.cardDeal();
        return cardEl;
    }

    function clearCards() {
        els.playerCards.innerHTML = '';
        els.bankerCards.innerHTML = '';
    }

    function updateBankroll(amount) {
        els.bankroll.textContent = '$' + amount.toLocaleString();
    }

    function updateCommission(amount) {
        els.commission.textContent = '$' + amount.toLocaleString();
    }

    function updateBet(amount) {
        els.betAmount.textContent = '$' + amount;
    }

    function updateHandValue(el, value) {
        el.textContent = value === null ? '' : value;
    }

    function showBetting(show) {
        els.bettingArea.style.display = show ? 'block' : 'none';
    }

    function enableDeal(enabled) {
        els.btnDeal.disabled = !enabled;
    }

    function highlightBetZone(type) {
        els.zonePlayer.classList.toggle('active', type === 'player');
        els.zoneTie.classList.toggle('active', type === 'tie');
        els.zoneBanker.classList.toggle('active', type === 'banker');
    }

    function clearBetZones() {
        els.zonePlayer.classList.remove('active');
        els.zoneTie.classList.remove('active');
        els.zoneBanker.classList.remove('active');
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
            '<span>Player: ' + stats.playerWins + '</span>' +
            '<span>Banker: ' + stats.bankerWins + '</span>' +
            '<span>Best: $' + stats.biggestBankroll.toLocaleString() + '</span>';
    }

    return {
        init, els: () => els,
        createCardEl, dealCardToArea, clearCards,
        updateBankroll, updateCommission, updateBet, updateHandValue,
        showBetting, enableDeal,
        highlightBetZone, clearBetZones,
        showHint, hideHint, setMessage, showResult, updateStats,
    };
})();
