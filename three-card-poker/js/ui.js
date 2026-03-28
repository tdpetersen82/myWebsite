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
            btnPlay: document.getElementById('btn-play'),
            btnFold: document.getElementById('btn-fold'),

            hintPanel: document.getElementById('hint-panel'),
            hintAction: document.getElementById('hint-action'),
            hintRisk: document.getElementById('hint-risk'),
            hintExplanation: document.getElementById('hint-explanation'),
            hintDetailToggle: document.getElementById('hint-detail-toggle'),
            hintDetail: document.getElementById('hint-detail'),

            bettingArea: document.getElementById('betting-area'),
            chipRack: document.getElementById('chip-rack'),
            betAnteDisplay: document.getElementById('bet-ante-display'),
            betPPDisplay: document.getElementById('bet-pp-display'),
            btnDeal: document.getElementById('btn-deal'),
            btnClear: document.getElementById('btn-clear'),
            btnRebet: document.getElementById('btn-rebet'),
            targetAnte: document.getElementById('target-ante'),
            targetPairPlus: document.getElementById('target-pair-plus'),

            circleAnte: document.getElementById('circle-ante'),
            circlePlay: document.getElementById('circle-play'),
            circlePairPlus: document.getElementById('circle-pair-plus'),
            anteAmount: document.getElementById('ante-amount'),
            playAmount: document.getElementById('play-amount'),
            pairPlusAmount: document.getElementById('pair-plus-amount'),

            statsBar: document.getElementById('stats-bar'),
            message: document.getElementById('message'),
            resultBanner: document.getElementById('result-banner'),
        };
    }

    function createCardEl(card, faceDown) {
        faceDown = faceDown || false;
        var div = document.createElement('div');
        div.className = 'card';
        var inner = document.createElement('div');
        inner.className = 'card-inner';

        // Face
        var face = document.createElement('div');
        var isRed = Deck.isRed(card);
        face.className = 'card-face ' + (isRed ? 'red' : 'black');

        var rank = document.createElement('div');
        rank.className = 'card-rank';
        rank.textContent = Deck.displayRank(card);
        var suit = document.createElement('div');
        suit.className = 'card-suit';
        suit.textContent = card.symbol;

        var cornerTop = document.createElement('div');
        cornerTop.className = 'card-corner top';
        cornerTop.innerHTML = Deck.displayRank(card) + '<br>' + card.symbol;
        var cornerBot = document.createElement('div');
        cornerBot.className = 'card-corner bottom';
        cornerBot.innerHTML = Deck.displayRank(card) + '<br>' + card.symbol;

        face.appendChild(cornerTop);
        face.appendChild(rank);
        face.appendChild(suit);
        face.appendChild(cornerBot);

        // Back
        var back = document.createElement('div');
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
        Animations.flipCard(cardEl.querySelector('.card-inner'), function() {
            var face = cardEl.querySelector('.card-face');
            var back = cardEl.querySelector('.card-back');
            face.style.display = 'flex';
            back.style.display = 'none';
            cardEl._faceDown = false;
            Audio.cardFlip();
            if (callback) callback();
        });
    }

    function dealCardToArea(card, container, faceDown) {
        faceDown = faceDown || false;
        var cardEl = createCardEl(card, faceDown);
        container.appendChild(cardEl);
        Animations.dealCard(cardEl);
        Audio.cardDeal();
        return cardEl;
    }

    function clearCards() {
        els.dealerCards.innerHTML = '';
        els.playerCards.innerHTML = '';
    }

    function updateBankroll(amount) {
        els.bankroll.textContent = '$' + amount.toLocaleString();
    }

    function updateBetDisplays(ante, pairPlus) {
        els.betAnteDisplay.textContent = '$' + ante;
        els.betPPDisplay.textContent = '$' + pairPlus;
    }

    function updateCircles(ante, play, pairPlus) {
        els.anteAmount.textContent = ante > 0 ? '$' + ante : '';
        els.playAmount.textContent = play > 0 ? '$' + play : '';
        els.pairPlusAmount.textContent = pairPlus > 0 ? '$' + pairPlus : '';

        els.circleAnte.classList.toggle('has-bet', ante > 0);
        els.circlePlay.classList.toggle('has-bet', play > 0);
        els.circlePairPlus.classList.toggle('has-bet', pairPlus > 0);
    }

    function highlightTargetCircle(target) {
        els.circleAnte.classList.toggle('active-target', target === 'ante');
        els.circlePairPlus.classList.toggle('active-target', target === 'pairplus');
        els.circlePlay.classList.remove('active-target');
    }

    function showActions(show) {
        els.actionBar.style.display = show ? 'flex' : 'none';
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
        els.hintDetail.innerHTML = (detailedExplanation || '').replace(/\n/g, '<br>');
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
        setTimeout(function() { els.resultBanner.className = 'result-banner'; }, 1600);
    }

    function updateStats(stats) {
        els.statsBar.innerHTML =
            '<span>Played: ' + stats.handsPlayed + '</span>' +
            '<span>Wins: ' + stats.handsWon + '</span>' +
            '<span>Bonuses: ' + stats.anteBonuses + '</span>' +
            '<span>Best: $' + stats.biggestBankroll.toLocaleString() + '</span>';
    }

    function showPayoutToast(text, x, y) {
        var toast = document.createElement('div');
        toast.className = 'payout-toast';
        toast.textContent = text;
        toast.style.left = x + 'px';
        toast.style.top = y + 'px';
        els.wrapper.appendChild(toast);
        setTimeout(function() { toast.remove(); }, 1300);
    }

    function setHandValue(el, text) {
        el.textContent = text;
    }

    return {
        init, els: function() { return els; },
        createCardEl, revealCard, dealCardToArea, clearCards,
        updateBankroll, updateBetDisplays, updateCircles, highlightTargetCircle,
        showActions, hideActions, showBetting, enableDeal,
        showHint, hideHint, setMessage, showResult, updateStats,
        showPayoutToast, setHandValue,
    };
})();
