const UI = (() => {
    let els = {};

    function init() {
        els = {
            wrapper: document.getElementById('game-wrapper'),
            bankroll: document.getElementById('bankroll-value'),
            hintsBtn: document.getElementById('btn-hints'),

            table: document.getElementById('craps-table'),
            diceArea: document.getElementById('dice-area'),

            // Bet zones
            passZone: document.getElementById('zone-pass'),
            dontPassZone: document.getElementById('zone-dontpass'),
            fieldZone: document.getElementById('zone-field'),
            oddsZone: document.getElementById('zone-odds'),
            place6Zone: document.getElementById('zone-place-6'),
            place8Zone: document.getElementById('zone-place-8'),

            // Point number cells
            point4: document.getElementById('point-4'),
            point5: document.getElementById('point-5'),
            point6: document.getElementById('zone-place-6'),
            point8: document.getElementById('zone-place-8'),
            point9: document.getElementById('point-9'),
            point10: document.getElementById('point-10'),

            // Puck
            puck: document.getElementById('puck'),

            // Bet displays
            passBet: document.getElementById('pass-bet'),
            dontPassBet: document.getElementById('dontpass-bet'),
            oddsBet: document.getElementById('odds-bet'),
            fieldBet: document.getElementById('field-bet'),
            place6Bet: document.getElementById('place6-bet'),
            place8Bet: document.getElementById('place8-bet'),

            // Buttons
            btnRoll: document.getElementById('btn-roll'),
            btnClearBets: document.getElementById('btn-clear-bets'),

            // Chip rack
            chipRack: document.getElementById('chip-rack'),

            // Bet amount selector
            selectedChip: document.getElementById('selected-chip'),

            // Hint
            hintPanel: document.getElementById('hint-panel'),
            hintAction: document.getElementById('hint-action'),
            hintRisk: document.getElementById('hint-risk'),
            hintExplanation: document.getElementById('hint-explanation'),
            hintDetailToggle: document.getElementById('hint-detail-toggle'),
            hintDetail: document.getElementById('hint-detail'),

            // Stats
            statsBar: document.getElementById('stats-bar'),

            // Message
            message: document.getElementById('message'),
            resultBanner: document.getElementById('result-banner'),
        };
    }

    function updateBankroll(amount) {
        els.bankroll.textContent = '$' + amount.toLocaleString();
    }

    function updateBetDisplay(id, amount) {
        var el = els[id];
        if (!el) return;
        if (amount > 0) {
            el.textContent = '$' + amount;
            el.style.display = 'block';
        } else {
            el.textContent = '';
            el.style.display = 'none';
        }
    }

    function setMessage(msg) {
        els.message.textContent = msg;
    }

    function showResult(text, color) {
        els.resultBanner.textContent = text;
        els.resultBanner.style.color = color || '#fff';
        els.resultBanner.className = 'result-banner show';
        setTimeout(function() { els.resultBanner.className = 'result-banner'; }, 1400);
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

    function updateStats(stats) {
        els.statsBar.innerHTML =
            '<span>Rolls: ' + stats.rolls + '</span>' +
            '<span>Pass Wins: ' + stats.passWins + '</span>' +
            '<span>Don\'t Pass Wins: ' + stats.dontPassWins + '</span>' +
            '<span>Best: $' + stats.bestBankroll.toLocaleString() + '</span>';
    }

    function enableRoll(enabled) {
        els.btnRoll.disabled = !enabled;
    }

    function showOddsZone(show) {
        els.oddsZone.style.display = show ? 'flex' : 'none';
    }

    function setPuck(point) {
        if (!point) {
            els.puck.textContent = 'OFF';
            els.puck.className = 'puck puck-off';
            els.puck.style.left = '';
            els.puck.style.top = '';
            els.puck.style.position = 'static';
            els.puck.style.transition = '';
            // Put puck in its home
            var home = document.getElementById('puck-home');
            if (home) home.appendChild(els.puck);
            return;
        }
        els.puck.textContent = 'ON';
        els.puck.className = 'puck puck-on';
        // Move puck to the point number
        var pointEl = els['point' + point];
        if (pointEl) {
            pointEl.appendChild(els.puck);
            els.puck.style.position = 'absolute';
            els.puck.style.left = '50%';
            els.puck.style.top = '-14px';
            els.puck.style.transform = 'translateX(-50%)';
        }
    }

    function highlightZone(zoneEl, active) {
        if (!zoneEl) return;
        if (active) {
            zoneEl.classList.add('zone-active');
        } else {
            zoneEl.classList.remove('zone-active');
        }
    }

    function highlightClickableZones(phase, point) {
        // Reset all
        var zones = [els.passZone, els.dontPassZone, els.fieldZone, els.oddsZone, els.place6Zone, els.place8Zone];
        zones.forEach(function(z) { if (z) highlightZone(z, false); });

        if (phase === 'COME_OUT') {
            highlightZone(els.passZone, true);
            highlightZone(els.dontPassZone, true);
            highlightZone(els.fieldZone, true);
        } else if (phase === 'POINT') {
            highlightZone(els.fieldZone, true);
            highlightZone(els.oddsZone, true);
            highlightZone(els.place6Zone, true);
            highlightZone(els.place8Zone, true);
        }
    }

    function flashZone(zoneEl, color) {
        if (!zoneEl) return;
        var orig = zoneEl.style.backgroundColor;
        zoneEl.style.backgroundColor = color;
        zoneEl.style.transition = 'background-color 0.3s';
        setTimeout(function() {
            zoneEl.style.backgroundColor = orig || '';
            setTimeout(function() { zoneEl.style.transition = ''; }, 300);
        }, 400);
    }

    return {
        init, els: function() { return els; },
        updateBankroll, updateBetDisplay, setMessage, showResult,
        showHint, hideHint, updateStats, enableRoll,
        showOddsZone, setPuck, highlightZone, highlightClickableZones,
        flashZone,
    };
})();
