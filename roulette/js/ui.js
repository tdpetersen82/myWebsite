const UI = (() => {
    let els = {};

    function init() {
        els = {
            wrapper: document.getElementById('game-wrapper'),
            bankroll: document.getElementById('bankroll-value'),
            hintsBtn: document.getElementById('btn-hints'),
            wheelCanvas: document.getElementById('wheel-canvas'),
            resultDisplay: document.getElementById('result-display'),
            bettingTable: document.getElementById('betting-table'),
            chipRack: document.getElementById('chip-rack'),
            totalBet: document.getElementById('total-bet'),
            btnClear: document.getElementById('btn-clear'),
            btnSpin: document.getElementById('btn-spin'),
            hintPanel: document.getElementById('hint-panel'),
            hintAction: document.getElementById('hint-action'),
            hintRisk: document.getElementById('hint-risk'),
            hintExplanation: document.getElementById('hint-explanation'),
            hintDetailToggle: document.getElementById('hint-detail-toggle'),
            hintDetail: document.getElementById('hint-detail'),
            statsBar: document.getElementById('stats-bar'),
            message: document.getElementById('message'),
            resultBanner: document.getElementById('result-banner'),
        };
    }

    // ── Betting Table Builder ──────────────────────────

    function buildBettingTable(onBetClick) {
        const table = els.bettingTable;
        table.innerHTML = '';

        // Table layout: numbers grid + outside bets
        const grid = document.createElement('div');
        grid.className = 'bt-grid';

        // Zero cell (spans top)
        const zeroCell = document.createElement('div');
        zeroCell.className = 'bt-cell bt-zero';
        zeroCell.textContent = '0';
        zeroCell.dataset.bet = 'straight';
        zeroCell.dataset.numbers = '0';
        zeroCell.style.backgroundColor = '#27ae60';
        grid.appendChild(zeroCell);

        // Numbers 1-36 in 3 columns, 12 rows
        // Layout: row 1 = [3,6,9,...,36], row 2 = [2,5,8,...,35], row 3 = [1,4,7,...,34]
        // Actually standard roulette table: 1-3 on first row, 4-6 on second, etc.
        // Columns: col1 = 1,4,7,...,34  col2 = 2,5,8,...,35  col3 = 3,6,9,...,36
        // But displayed as rows of 3: [1,2,3], [4,5,6], ... [34,35,36]
        // Standard layout: top row is 1,2,3 with 3 on top in column 3

        const numbersGrid = document.createElement('div');
        numbersGrid.className = 'bt-numbers';

        for (let row = 0; row < 12; row++) {
            for (let col = 0; col < 3; col++) {
                const num = row * 3 + col + 1;
                const cell = document.createElement('div');
                cell.className = 'bt-cell bt-number';
                cell.textContent = num;
                cell.dataset.bet = 'straight';
                cell.dataset.numbers = num.toString();
                cell.dataset.num = num;

                if (CONFIG.RED_NUMBERS.includes(num)) {
                    cell.classList.add('bt-red');
                } else {
                    cell.classList.add('bt-black');
                }

                numbersGrid.appendChild(cell);
            }
        }

        grid.appendChild(numbersGrid);

        // Column bets (2:1) at the bottom of each column
        const colBets = document.createElement('div');
        colBets.className = 'bt-col-bets';
        for (let c = 0; c < 3; c++) {
            const colNums = [];
            for (let r = 0; r < 12; r++) {
                colNums.push(r * 3 + c + 1);
            }
            const cell = document.createElement('div');
            cell.className = 'bt-cell bt-col-bet';
            cell.textContent = '2:1';
            cell.dataset.bet = 'column';
            cell.dataset.numbers = colNums.join(',');
            cell.dataset.col = (c + 1).toString();
            colBets.appendChild(cell);
        }
        grid.appendChild(colBets);

        table.appendChild(grid);

        // Outside bets
        const outside = document.createElement('div');
        outside.className = 'bt-outside';

        // Dozens
        const dozensRow = document.createElement('div');
        dozensRow.className = 'bt-outside-row';
        const dozenLabels = ['1st 12', '2nd 12', '3rd 12'];
        const dozenNums = [
            [1,2,3,4,5,6,7,8,9,10,11,12],
            [13,14,15,16,17,18,19,20,21,22,23,24],
            [25,26,27,28,29,30,31,32,33,34,35,36],
        ];
        for (let d = 0; d < 3; d++) {
            const cell = document.createElement('div');
            cell.className = 'bt-cell bt-dozen';
            cell.textContent = dozenLabels[d];
            cell.dataset.bet = 'dozen';
            cell.dataset.numbers = dozenNums[d].join(',');
            dozensRow.appendChild(cell);
        }
        outside.appendChild(dozensRow);

        // Even-money bets: Low, Even, Red, Black, Odd, High
        const evenRow = document.createElement('div');
        evenRow.className = 'bt-outside-row';

        const evenBets = [
            { label: '1-18', type: 'low', nums: Array.from({length:18}, function(_,i){return i+1;}) },
            { label: 'EVEN', type: 'even', nums: Array.from({length:18}, function(_,i){return (i+1)*2;}) },
            { label: '\u25C6 RED', type: 'red', nums: CONFIG.RED_NUMBERS, cls: 'bt-red-bet' },
            { label: '\u25C6 BLK', type: 'black', nums: Array.from({length:36}, function(_,i){return i+1;}).filter(function(n){return !CONFIG.RED_NUMBERS.includes(n);}), cls: 'bt-black-bet' },
            { label: 'ODD', type: 'odd', nums: Array.from({length:18}, function(_,i){return i*2+1;}) },
            { label: '19-36', type: 'high', nums: Array.from({length:18}, function(_,i){return i+19;}) },
        ];

        evenBets.forEach(function(b) {
            const cell = document.createElement('div');
            cell.className = 'bt-cell bt-even ' + (b.cls || '');
            cell.textContent = b.label;
            cell.dataset.bet = b.type;
            cell.dataset.numbers = b.nums.join(',');
            evenRow.appendChild(cell);
        });
        outside.appendChild(evenRow);

        table.appendChild(outside);

        // Attach click handler
        table.addEventListener('click', function(e) {
            const cell = e.target.closest('.bt-cell');
            if (!cell) return;
            const betType = cell.dataset.bet;
            const numbers = cell.dataset.numbers.split(',').map(Number);
            onBetClick(betType, numbers, cell);
        });
    }

    // ── Chip on table ──────────────────────────────────

    function placeChipOnCell(cell, amount) {
        let chipEl = cell.querySelector('.table-chip');
        if (!chipEl) {
            chipEl = document.createElement('div');
            chipEl.className = 'table-chip';
            cell.style.position = 'relative';
            cell.appendChild(chipEl);
            Animations.chipBounce(chipEl);
        }
        chipEl.textContent = '$' + amount;
    }

    function removeChipFromCell(cell) {
        const chipEl = cell.querySelector('.table-chip');
        if (chipEl) chipEl.remove();
    }

    function clearAllTableChips() {
        var chips = els.bettingTable.querySelectorAll('.table-chip');
        chips.forEach(function(c) { c.remove(); });
    }

    function highlightWinningCells(winningNumber) {
        var cells = els.bettingTable.querySelectorAll('.bt-cell');
        cells.forEach(function(cell) {
            if (cell.dataset.numbers) {
                var nums = cell.dataset.numbers.split(',').map(Number);
                if (nums.includes(winningNumber)) {
                    cell.classList.add('winning-cell');
                }
            }
        });
    }

    function clearWinningHighlights() {
        var cells = els.bettingTable.querySelectorAll('.winning-cell');
        cells.forEach(function(c) { c.classList.remove('winning-cell'); });
    }

    // ── UI Updates ─────────────────────────────────────

    function updateBankroll(amount) {
        els.bankroll.textContent = '$' + amount.toLocaleString();
    }

    function updateTotalBet(amount) {
        els.totalBet.textContent = '$' + amount;
    }

    function enableSpin(enabled) {
        els.btnSpin.disabled = !enabled;
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

    function updateResultDisplay(number) {
        const display = els.resultDisplay;
        display.textContent = number;
        display.className = 'result-num';
        if (number === 0) {
            display.classList.add('result-green');
        } else if (CONFIG.RED_NUMBERS.includes(number)) {
            display.classList.add('result-red');
        } else {
            display.classList.add('result-black');
        }
    }

    function clearResultDisplay() {
        els.resultDisplay.textContent = '\u2013';
        els.resultDisplay.className = 'result-num';
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
            '<span>Spins: ' + stats.spinsPlayed + '</span>' +
            '<span>Wins: ' + stats.spinsWon + '</span>' +
            '<span>Biggest: $' + stats.biggestWin.toLocaleString() + '</span>' +
            '<span>Best: $' + stats.biggestBankroll.toLocaleString() + '</span>';
    }

    function setSelectedChip(value) {
        var chips = els.chipRack.querySelectorAll('.chip');
        chips.forEach(function(c) {
            c.classList.toggle('selected', parseInt(c.dataset.value) === value);
        });
    }

    function setSpinning(isSpinning) {
        if (isSpinning) {
            els.btnSpin.textContent = 'Spinning...';
            els.btnSpin.disabled = true;
            els.btnClear.disabled = true;
            // Disable chip clicking
            els.chipRack.style.pointerEvents = 'none';
            els.bettingTable.style.pointerEvents = 'none';
        } else {
            els.btnSpin.textContent = 'Spin';
            els.btnClear.disabled = false;
            els.chipRack.style.pointerEvents = '';
            els.bettingTable.style.pointerEvents = '';
        }
    }

    return {
        init, els: function() { return els; },
        buildBettingTable,
        placeChipOnCell, removeChipFromCell, clearAllTableChips,
        highlightWinningCells, clearWinningHighlights,
        updateBankroll, updateTotalBet, enableSpin, setMessage, showResult,
        updateResultDisplay, clearResultDisplay,
        showHint, hideHint, updateStats, setSelectedChip, setSpinning,
    };
})();
