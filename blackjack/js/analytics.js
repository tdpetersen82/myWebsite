const Analytics = (() => {
    const KEY = 'blackjackAnalytics';
    const MAX_DECISIONS = 500; // ring-buffer cap
    const MAX_BANKROLL_POINTS = 200;

    let data = {
        decisions: [],   // { ts, pv, soft, pair, dupc, action, recommended, correct }
        bankrollHistory: [], // { ts, value }
    };

    function load() {
        try {
            const raw = JSON.parse(localStorage.getItem(KEY));
            if (raw) data = { decisions: raw.decisions || [], bankrollHistory: raw.bankrollHistory || [] };
        } catch (e) {}
    }

    function save() {
        // Cap arrays
        if (data.decisions.length > MAX_DECISIONS) {
            data.decisions = data.decisions.slice(-MAX_DECISIONS);
        }
        if (data.bankrollHistory.length > MAX_BANKROLL_POINTS) {
            data.bankrollHistory = data.bankrollHistory.slice(-MAX_BANKROLL_POINTS);
        }
        localStorage.setItem(KEY, JSON.stringify(data));
    }

    // Record a decision the player made and what was recommended.
    // playerCards: array of card objects, dealerUpcard: card object, action: 'HIT'|'STAND'|...
    function recordDecision(playerCards, dealerUpcard, action, canSplit, canDouble, canSurrender) {
        if (typeof Strategy === 'undefined' || typeof Hand === 'undefined') return;
        const rec = Strategy.getRecommendation(playerCards, dealerUpcard, canSplit, canDouble, canSurrender);
        const pv = Hand.value(playerCards);
        const soft = Hand.isSoft(playerCards);
        const pair = Hand.isPair(playerCards);
        const dupc = (dealerUpcard.rank === 'J' || dealerUpcard.rank === 'Q' || dealerUpcard.rank === 'K') ? '10' : dealerUpcard.rank;
        const correct = action === rec.action;
        data.decisions.push({
            ts: Date.now(),
            pv, soft, pair, dupc, action,
            recommended: rec.action,
            correct
        });
        save();
    }

    function recordBankroll(value) {
        const last = data.bankrollHistory[data.bankrollHistory.length - 1];
        // Skip duplicates within 1s
        if (last && last.value === value && Date.now() - last.ts < 1000) return;
        data.bankrollHistory.push({ ts: Date.now(), value });
        save();
    }

    function getStats() {
        const total = data.decisions.length;
        const correct = data.decisions.filter(d => d.correct).length;
        const accuracy = total > 0 ? Math.round((correct / total) * 100) : null;

        // Worst situations: situations played 3+ times where accuracy < 70%
        const buckets = {};
        for (const d of data.decisions) {
            const key = (d.pair ? 'Pair ' + d.pv : (d.soft ? 'Soft ' + d.pv : 'Hard ' + d.pv)) + ' vs ' + d.dupc;
            if (!buckets[key]) buckets[key] = { total: 0, correct: 0 };
            buckets[key].total++;
            if (d.correct) buckets[key].correct++;
        }
        const weakSpots = Object.keys(buckets)
            .filter(k => buckets[k].total >= 3 && buckets[k].correct / buckets[k].total < 0.7)
            .map(k => ({
                situation: k,
                accuracy: Math.round((buckets[k].correct / buckets[k].total) * 100),
                count: buckets[k].total
            }))
            .sort((a, b) => a.accuracy - b.accuracy)
            .slice(0, 5);

        return {
            totalDecisions: total,
            correctDecisions: correct,
            accuracy,
            weakSpots,
            bankrollHistory: data.bankrollHistory.slice(),
        };
    }

    function reset() {
        data = { decisions: [], bankrollHistory: [] };
        localStorage.removeItem(KEY);
    }

    load();

    return { recordDecision, recordBankroll, getStats, reset };
})();
