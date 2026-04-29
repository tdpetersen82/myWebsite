// DailyChallenge: picks today's level deterministically by UTC date hash,
// gates each player to one attempt per day. Score is stored in localStorage.

const DailyChallenge = (function () {
    function todayKey() {
        const d = new Date();
        const y = d.getUTCFullYear();
        const m = (d.getUTCMonth() + 1).toString().padStart(2, '0');
        const dd = d.getUTCDate().toString().padStart(2, '0');
        return `${y}-${m}-${dd}`;
    }

    function _hash(str) {
        let h = 2166136261;
        for (let i = 0; i < str.length; i++) {
            h ^= str.charCodeAt(i);
            h = Math.imul(h, 16777619);
        }
        return h >>> 0;
    }

    function pickLevel() {
        if (!LEVELS || LEVELS.length === 0) return null;
        // Skip the tutorial in daily — pick from real levels only.
        const pool = LEVELS.filter(L => L.id !== '00-tutorial');
        if (pool.length === 0) return LEVELS[0];
        const idx = _hash(todayKey()) % pool.length;
        return pool[idx];
    }

    function getAttempt() {
        return Storage.getDailyAttempt(todayKey());
    }

    function recordAttempt(result, score) {
        Storage.setDailyAttempt(todayKey(), {
            levelId: result.levelId,
            score: score.score,
            stars: score.stars,
            evacuated: result.evacuated,
            injured: result.injured,
            ts: Date.now(),
        });
    }

    function alreadyPlayed() {
        return getAttempt() != null;
    }

    return { todayKey, pickLevel, getAttempt, recordAttempt, alreadyPlayed };
})();
