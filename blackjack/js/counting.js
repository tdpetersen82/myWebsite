const Counting = (() => {
    // Hi-Lo: 2-6 = +1, 7-9 = 0, 10-A = -1
    function hiLoValue(rank) {
        if (rank === 'A' || rank === '10' || rank === 'J' || rank === 'Q' || rank === 'K') return -1;
        if (parseInt(rank) >= 7) return 0;
        return 1;
    }

    const RANKS = ['A','2','3','4','5','6','7','8','9','10','J','Q','K'];
    const SUITS = [
        { name: 'spades',   symbol: '♠', color: 'black' },
        { name: 'hearts',   symbol: '♥', color: 'red' },
        { name: 'diamonds', symbol: '♦', color: 'red' },
        { name: 'clubs',    symbol: '♣', color: 'black' },
    ];

    let drillTimer = null;
    let runningCount = 0;
    let cardsShown = 0;
    let drillSpeed = 1200; // ms per card
    let drillActive = false;
    let drillRoot = null;
    let drillCardCount = 20;

    function render(root) {
        drillRoot = root;
        // Reset state when re-rendering
        stopDrill();
        root.innerHTML = `
            <div class="learn-pad counting-pad">
                <h3>Hi-Lo Counting Trainer</h3>
                <div class="counting-explainer">
                    Track the running count using the Hi-Lo system:<br>
                    <span class="hi-lo-card hi-lo-pos">2–6 = +1</span>
                    <span class="hi-lo-card hi-lo-zero">7–9 = 0</span>
                    <span class="hi-lo-card hi-lo-neg">10–A = −1</span>
                </div>
                <div class="counting-controls">
                    <label>Speed:
                        <select id="count-speed">
                            <option value="2000">Slow (2s)</option>
                            <option value="1200" selected>Medium (1.2s)</option>
                            <option value="700">Fast (0.7s)</option>
                            <option value="350">Expert (0.35s)</option>
                        </select>
                    </label>
                    <label>Cards:
                        <select id="count-num">
                            <option value="10">10</option>
                            <option value="20" selected>20</option>
                            <option value="40">40</option>
                            <option value="80">80</option>
                        </select>
                    </label>
                    <button class="learn-mini" id="count-start">Start Drill</button>
                </div>
                <div class="counting-display" id="count-display">
                    <div class="count-card-area" id="count-card-area">
                        <span class="count-idle">Press Start to begin.</span>
                    </div>
                    <div class="count-progress" id="count-progress"></div>
                </div>
                <div class="counting-answer" id="count-answer" style="display:none">
                    <label>What is the running count?
                        <input type="number" id="count-input" autofocus>
                    </label>
                    <button class="learn-mini" id="count-submit">Submit</button>
                </div>
                <div class="count-result" id="count-result"></div>
            </div>
        `;
        root.querySelector('#count-start').addEventListener('click', () => {
            const speed = parseInt(root.querySelector('#count-speed').value);
            const num = parseInt(root.querySelector('#count-num').value);
            startDrill(speed, num);
        });
        root.querySelector('#count-submit').addEventListener('click', submitAnswer);
        root.querySelector('#count-input').addEventListener('keydown', (e) => {
            if (e.key === 'Enter') submitAnswer();
        });
    }

    function startDrill(speed, numCards) {
        stopDrill();
        drillSpeed = speed;
        drillCardCount = numCards;
        runningCount = 0;
        cardsShown = 0;
        drillActive = true;
        drillRoot.querySelector('#count-result').textContent = '';
        drillRoot.querySelector('#count-answer').style.display = 'none';
        drillRoot.querySelector('#count-progress').textContent = '0 / ' + numCards;
        showNextCard();
    }

    function showNextCard() {
        if (!drillActive) return;
        if (cardsShown >= drillCardCount) {
            finishDrill();
            return;
        }
        const rank = RANKS[Math.floor(Math.random() * RANKS.length)];
        const suit = SUITS[Math.floor(Math.random() * SUITS.length)];
        runningCount += hiLoValue(rank);
        cardsShown++;

        const area = drillRoot.querySelector('#count-card-area');
        area.innerHTML = '<div class="count-card ' + suit.color + '"><div class="count-card-rank">' + rank + '</div><div class="count-card-suit">' + suit.symbol + '</div></div>';
        drillRoot.querySelector('#count-progress').textContent = cardsShown + ' / ' + drillCardCount;

        drillTimer = setTimeout(showNextCard, drillSpeed);
    }

    function finishDrill() {
        drillActive = false;
        if (drillTimer) { clearTimeout(drillTimer); drillTimer = null; }
        const area = drillRoot.querySelector('#count-card-area');
        area.innerHTML = '<span class="count-idle">All cards shown.</span>';
        const ans = drillRoot.querySelector('#count-answer');
        ans.style.display = 'block';
        const input = drillRoot.querySelector('#count-input');
        input.value = '';
        input.focus();
    }

    function submitAnswer() {
        if (!drillRoot) return;
        const input = drillRoot.querySelector('#count-input');
        const val = parseInt(input.value);
        const result = drillRoot.querySelector('#count-result');
        if (isNaN(val)) {
            result.innerHTML = '<span class="count-wrong">Enter a number.</span>';
            return;
        }
        if (val === runningCount) {
            result.innerHTML = '<span class="count-correct">✓ Correct! Running count was ' + runningCount + '.</span>';
            if (typeof Achievements !== 'undefined') Achievements.onCountingPerfect(drillCardCount);
        } else {
            result.innerHTML = '<span class="count-wrong">✗ Off by ' + Math.abs(val - runningCount) + '. Actual: ' + runningCount + '.</span>';
        }
        drillRoot.querySelector('#count-answer').style.display = 'none';
    }

    function stopDrill() {
        drillActive = false;
        if (drillTimer) { clearTimeout(drillTimer); drillTimer = null; }
    }

    return { render, hiLoValue, stopDrill };
})();
