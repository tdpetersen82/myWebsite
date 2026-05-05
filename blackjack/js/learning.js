const Learning = (() => {
    let modalEl, contentEl, tabsEl;
    let activeTab = 'hints';
    let onHintsToggle = null;
    let getHintsState = () => false;

    const TABS = [
        { id: 'hints',    label: '📋 Hints',     render: renderHintsTab },
        { id: 'chart',    label: '📊 Strategy',  render: renderChartTab },
        { id: 'quiz',     label: '🃏 Quiz',      render: renderQuizTab },
        { id: 'counting', label: '🔢 Counting',  render: renderCountingTab },
        { id: 'stats',    label: '📈 Stats',     render: renderStatsTab },
    ];

    function init(opts) {
        opts = opts || {};
        onHintsToggle = opts.onHintsToggle || (() => {});
        getHintsState = opts.getHintsState || (() => false);
        buildModal();
    }

    function buildModal() {
        modalEl = document.createElement('div');
        modalEl.className = 'learn-modal';
        modalEl.innerHTML = `
            <div class="learn-card">
                <div class="learn-header">
                    <h2>🎓 Learning Center</h2>
                    <button class="learn-close" aria-label="Close">×</button>
                </div>
                <div class="learn-tabs"></div>
                <div class="learn-content"></div>
            </div>
        `;
        document.body.appendChild(modalEl);

        contentEl = modalEl.querySelector('.learn-content');
        tabsEl = modalEl.querySelector('.learn-tabs');

        for (const t of TABS) {
            const btn = document.createElement('button');
            btn.className = 'learn-tab';
            btn.dataset.tab = t.id;
            btn.textContent = t.label;
            btn.addEventListener('click', () => setTab(t.id));
            tabsEl.appendChild(btn);
        }

        modalEl.querySelector('.learn-close').addEventListener('click', close);
        modalEl.addEventListener('click', (e) => { if (e.target === modalEl) close(); });
    }

    function open() {
        modalEl.classList.add('visible');
        setTab(activeTab);
    }
    function close() {
        modalEl.classList.remove('visible');
    }
    function isOpen() { return modalEl && modalEl.classList.contains('visible'); }

    function setTab(id) {
        activeTab = id;
        for (const btn of tabsEl.querySelectorAll('.learn-tab')) {
            btn.classList.toggle('active', btn.dataset.tab === id);
        }
        const tab = TABS.find(t => t.id === id);
        contentEl.innerHTML = '';
        if (tab) tab.render(contentEl);
    }

    // ──────────── Tab: Hints ────────────
    function renderHintsTab(root) {
        const on = getHintsState();
        root.innerHTML = `
            <div class="learn-pad">
                <h3>Real-Time Strategy Hints</h3>
                <p>When hints are <strong>ON</strong>, a recommendation appears during your turn telling you the basic-strategy play (Hit, Stand, Double, Split, or Surrender) along with an explanation of why.</p>
                <p>This is the fastest way to learn. Play with hints on for a few sessions, then turn them off and check your accuracy in the <strong>Stats</strong> tab.</p>
                <button class="learn-toggle ${on ? 'on' : ''}" id="learn-hints-toggle">
                    Hints: <strong>${on ? 'ON' : 'OFF'}</strong>
                </button>
                <div class="learn-note">
                    <strong>Tip:</strong> The hint also shows a <em>risk label</em> (good/ok/bad) and a <em>"Learn More"</em> expansion with the full statistical reasoning.
                </div>
            </div>
        `;
        root.querySelector('#learn-hints-toggle').addEventListener('click', () => {
            onHintsToggle();
            setTab('hints'); // re-render
        });
    }

    // ──────────── Tab: Strategy Chart ────────────
    function renderChartTab(root) {
        root.innerHTML = `
            <div class="learn-pad">
                <div class="chart-tabs">
                    <button class="chart-tab active" data-chart="hard">Hard Totals</button>
                    <button class="chart-tab" data-chart="soft">Soft Totals</button>
                    <button class="chart-tab" data-chart="pairs">Pairs</button>
                </div>
                <div class="chart-legend">
                    <span class="cl cl-H">H Hit</span>
                    <span class="cl cl-S">S Stand</span>
                    <span class="cl cl-D">D Double</span>
                    <span class="cl cl-P">P Split</span>
                    <span class="cl cl-R">R Surrender</span>
                </div>
                <div class="chart-grid-wrap" id="chart-grid"></div>
                <div class="chart-explainer" id="chart-explainer">
                    <em>Click any cell to see the explanation.</em>
                </div>
            </div>
        `;
        for (const btn of root.querySelectorAll('.chart-tab')) {
            btn.addEventListener('click', () => {
                root.querySelectorAll('.chart-tab').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                drawChart(btn.dataset.chart, root);
            });
        }
        drawChart('hard', root);
    }

    function drawChart(which, root) {
        const tables = Strategy.getTables();
        const dealerCols = ['2','3','4','5','6','7','8','9','10','A'];
        let table, rowKeys, rowLabel;
        if (which === 'hard') {
            table = tables.HARD;
            rowKeys = Object.keys(table).map(Number).sort((a,b) => b - a); // descending
            rowLabel = (k) => k;
        } else if (which === 'soft') {
            table = tables.SOFT;
            rowKeys = Object.keys(table).map(Number).sort((a,b) => b - a);
            rowLabel = (k) => 'A,' + (k - 11);
        } else {
            table = tables.PAIRS;
            rowKeys = Object.keys(table);
            // Sort: A first, then 10..2
            rowKeys.sort((a, b) => {
                if (a === 'A') return -1;
                if (b === 'A') return 1;
                return parseInt(b) - parseInt(a);
            });
            rowLabel = (k) => k + ',' + k;
        }

        const grid = root.querySelector('#chart-grid');
        let html = '<table class="chart-grid"><thead><tr><th></th>';
        for (const d of dealerCols) html += '<th>' + d + '</th>';
        html += '</tr></thead><tbody>';

        for (const k of rowKeys) {
            html += '<tr><th>' + rowLabel(k) + '</th>';
            const codes = table[k];
            for (let i = 0; i < codes.length; i++) {
                const code = codes[i];
                const baseAction = code[0]; // H, S, D, P, R, Ds, Rh, Rs
                html += '<td class="cell-' + baseAction + '" data-code="' + code + '" data-row="' + k + '" data-col="' + dealerCols[i] + '" data-cat="' + which + '">' + baseAction + '</td>';
            }
            html += '</tr>';
        }
        html += '</tbody></table>';
        grid.innerHTML = html;

        const expl = root.querySelector('#chart-explainer');
        for (const cell of grid.querySelectorAll('td')) {
            cell.addEventListener('click', () => {
                const r = cell.dataset.row, c = cell.dataset.col, code = cell.dataset.code, cat = cell.dataset.cat;
                expl.innerHTML = chartExplain(cat, r, c, code);
            });
        }
    }

    function chartExplain(cat, row, col, code) {
        const actionName = ({ H: 'Hit', S: 'Stand', D: 'Double down (or hit if not allowed)', P: 'Split', R: 'Surrender (or hit)' })[code[0]];
        let situation;
        if (cat === 'hard') situation = 'Hard ' + row;
        else if (cat === 'soft') situation = 'Soft ' + row + ' (Ace + ' + (row - 11) + ')';
        else situation = 'Pair of ' + row + 's';

        // Try to derive a richer explanation by simulating a hand and using getRecommendation
        let detail = '';
        try {
            const playerCards = simulateHand(cat, row);
            const dealerCard = { rank: col, symbol: '?' };
            const rec = Strategy.getRecommendation(playerCards, dealerCard, cat === 'pairs', true, true);
            detail = rec.explanation || '';
        } catch (e) {}

        return `<div class="explain-line"><strong>${situation}</strong> vs dealer <strong>${col}</strong>: <span class="explain-action">${actionName}</span></div><p>${detail}</p>`;
    }

    function simulateHand(cat, row) {
        // Build a representative hand for the row
        if (cat === 'pairs') {
            return [{ rank: row, suit: '♠', symbol: '♠' }, { rank: row, suit: '♥', symbol: '♥' }];
        }
        if (cat === 'soft') {
            const other = String(row - 11);
            return [{ rank: 'A', suit: '♠', symbol: '♠' }, { rank: other, suit: '♥', symbol: '♥' }];
        }
        // Hard total: pick two non-ace, non-pair cards summing to row
        const total = parseInt(row);
        const a = Math.max(2, Math.min(10, total - 7));
        const b = total - a;
        return [
            { rank: String(a), suit: '♠', symbol: '♠' },
            { rank: String(b), suit: '♥', symbol: '♥' },
        ];
    }

    // ──────────── Tab: Quiz ────────────
    let quizState = null;
    function renderQuizTab(root) {
        root.innerHTML = `
            <div class="learn-pad quiz-pad">
                <div class="quiz-score">
                    <span>Score: <strong id="quiz-score-val">0</strong> / <strong id="quiz-total-val">0</strong></span>
                    <span class="quiz-streak">Streak: <strong id="quiz-streak-val">0</strong></span>
                    <button class="learn-mini" id="quiz-reset">Reset</button>
                </div>
                <div class="quiz-question" id="quiz-question"></div>
                <div class="quiz-options" id="quiz-options"></div>
                <div class="quiz-feedback" id="quiz-feedback"></div>
            </div>
        `;
        if (!quizState) quizState = { score: 0, total: 0, streak: 0, current: null };
        renderQuizScore();
        nextQuiz();
        root.querySelector('#quiz-reset').addEventListener('click', () => {
            quizState = { score: 0, total: 0, streak: 0, current: null };
            renderQuizScore();
            nextQuiz();
        });
    }

    function renderQuizScore() {
        if (!modalEl) return;
        const sv = modalEl.querySelector('#quiz-score-val');
        const tv = modalEl.querySelector('#quiz-total-val');
        const sk = modalEl.querySelector('#quiz-streak-val');
        if (sv) sv.textContent = quizState.score;
        if (tv) tv.textContent = quizState.total;
        if (sk) sk.textContent = quizState.streak;
    }

    function generateQuizScenario() {
        const types = ['hard', 'soft', 'pair'];
        const type = types[Math.floor(Math.random() * types.length)];
        const dealerCards = ['2','3','4','5','6','7','8','9','10','A'];
        const dupc = dealerCards[Math.floor(Math.random() * dealerCards.length)];
        let playerCards, label;
        if (type === 'pair') {
            const ranks = ['A','2','3','4','5','6','7','8','9','10'];
            const r = ranks[Math.floor(Math.random() * ranks.length)];
            playerCards = [{ rank: r, suit: '♠', symbol: '♠' }, { rank: r, suit: '♥', symbol: '♥' }];
            label = 'Pair of ' + r + 's';
        } else if (type === 'soft') {
            const other = String(Math.floor(Math.random() * 7) + 2); // A,2 through A,8
            playerCards = [{ rank: 'A', suit: '♠', symbol: '♠' }, { rank: other, suit: '♥', symbol: '♥' }];
            label = 'A,' + other + ' (soft ' + (parseInt(other) + 11) + ')';
        } else {
            const total = Math.floor(Math.random() * 8) + 9; // 9-16
            const a = Math.max(2, Math.min(10, total - 7));
            const b = total - a;
            playerCards = [{ rank: String(a), suit: '♠', symbol: '♠' }, { rank: String(b), suit: '♥', symbol: '♥' }];
            label = 'Hard ' + total + ' (' + a + '+' + b + ')';
        }
        const dealerCard = { rank: dupc, symbol: '?' };
        const rec = Strategy.getRecommendation(playerCards, dealerCard, type === 'pair', true, true);
        return { playerCards, dealerCard, label, dupc, recommended: rec.action, explanation: rec.explanation };
    }

    function nextQuiz() {
        if (!modalEl) return;
        const scenario = generateQuizScenario();
        quizState.current = scenario;
        modalEl.querySelector('#quiz-question').innerHTML =
            '<div class="quiz-prompt">You have <strong>' + scenario.label + '</strong></div>' +
            '<div class="quiz-prompt">Dealer shows <strong>' + scenario.dupc + '</strong></div>' +
            '<div class="quiz-ask">What should you do?</div>';
        const opts = ['HIT','STAND','DOUBLE','SPLIT','SURRENDER'];
        const optsEl = modalEl.querySelector('#quiz-options');
        optsEl.innerHTML = '';
        for (const o of opts) {
            const btn = document.createElement('button');
            btn.className = 'quiz-option';
            btn.textContent = o;
            btn.addEventListener('click', () => answerQuiz(o));
            optsEl.appendChild(btn);
        }
        modalEl.querySelector('#quiz-feedback').textContent = '';
    }

    function answerQuiz(answer) {
        const sc = quizState.current;
        if (!sc) return;
        quizState.total++;
        const correct = answer === sc.recommended;
        if (correct) {
            quizState.score++;
            quizState.streak++;
            if (typeof Achievements !== 'undefined') Achievements.onQuizStreak(quizState.streak);
        } else {
            quizState.streak = 0;
        }
        renderQuizScore();
        // Mark buttons
        const optsEl = modalEl.querySelector('#quiz-options');
        for (const btn of optsEl.querySelectorAll('.quiz-option')) {
            if (btn.textContent === sc.recommended) btn.classList.add('correct');
            else if (btn.textContent === answer) btn.classList.add('wrong');
            btn.disabled = true;
        }
        const feedback = modalEl.querySelector('#quiz-feedback');
        feedback.innerHTML = (correct
            ? '<div class="quiz-correct">✓ Correct!</div>'
            : '<div class="quiz-wrong">✗ Best play: <strong>' + sc.recommended + '</strong></div>')
            + '<p>' + sc.explanation + '</p>'
            + '<button class="learn-mini" id="quiz-next">Next →</button>';
        modalEl.querySelector('#quiz-next').addEventListener('click', nextQuiz);
    }

    // ──────────── Tab: Counting ────────────
    function renderCountingTab(root) {
        Counting.render(root);
    }

    // ──────────── Tab: Stats ────────────
    function renderStatsTab(root) {
        const s = Analytics.getStats();
        const accuracyHTML = s.accuracy === null
            ? '<em>Play a few hands to see your accuracy.</em>'
            : '<div class="big-stat">' + s.accuracy + '%</div><div class="stat-sub">' + s.correctDecisions + ' / ' + s.totalDecisions + ' decisions</div>';

        let weakHTML;
        if (s.weakSpots.length === 0) {
            weakHTML = '<em>No weak spots yet — play more hands.</em>';
        } else {
            weakHTML = '<ul class="weak-list">' +
                s.weakSpots.map(w => '<li><span class="weak-sit">' + w.situation + '</span><span class="weak-acc">' + w.accuracy + '% (' + w.count + ' plays)</span></li>').join('') +
                '</ul>';
        }

        root.innerHTML = `
            <div class="learn-pad stats-pad">
                <div class="stats-grid">
                    <div class="stats-card">
                        <h4>Strategy Accuracy</h4>
                        ${accuracyHTML}
                    </div>
                    <div class="stats-card">
                        <h4>Bankroll</h4>
                        <canvas id="stats-chart" width="380" height="120"></canvas>
                    </div>
                </div>
                <div class="stats-card stats-weak">
                    <h4>Where You Need Practice</h4>
                    ${weakHTML}
                </div>
                <div class="stats-actions">
                    <button class="learn-mini learn-mini-danger" id="stats-reset">Reset Analytics</button>
                </div>
            </div>
        `;
        drawBankrollChart(s.bankrollHistory);
        root.querySelector('#stats-reset').addEventListener('click', () => {
            if (confirm('Clear analytics history?')) {
                Analytics.reset();
                setTab('stats');
            }
        });
    }

    function drawBankrollChart(history) {
        const c = modalEl.querySelector('#stats-chart');
        if (!c) return;
        const ctx = c.getContext('2d');
        ctx.clearRect(0, 0, c.width, c.height);
        if (history.length < 2) {
            ctx.fillStyle = '#888';
            ctx.font = '13px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('Need a few hands of history…', c.width / 2, c.height / 2);
            return;
        }
        const values = history.map(h => h.value);
        const minV = Math.min(...values);
        const maxV = Math.max(...values);
        const range = Math.max(1, maxV - minV);
        const startV = values[0];
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#3498db';
        ctx.beginPath();
        for (let i = 0; i < values.length; i++) {
            const x = (i / (values.length - 1)) * (c.width - 20) + 10;
            const y = c.height - 10 - ((values[i] - minV) / range) * (c.height - 20);
            if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.stroke();
        // Start line for reference
        ctx.strokeStyle = 'rgba(150,150,150,0.4)';
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        const startY = c.height - 10 - ((startV - minV) / range) * (c.height - 20);
        ctx.beginPath();
        ctx.moveTo(10, startY);
        ctx.lineTo(c.width - 10, startY);
        ctx.stroke();
        ctx.setLineDash([]);
        // Min/max labels
        ctx.fillStyle = '#666';
        ctx.font = '11px sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText('$' + maxV, c.width - 4, 12);
        ctx.fillText('$' + minV, c.width - 4, c.height - 2);
    }

    return { init, open, close, isOpen };
})();
