// Storage: thin wrapper around localStorage. Versioned keys.
// All hub games conventionally also keep a top-level "<game>HighScore" key.

const Storage = (function () {
    const PREFIX = CFG.STORAGE_PREFIX;

    function _safeGet(key) {
        try { return localStorage.getItem(key); } catch (_) { return null; }
    }
    function _safeSet(key, val) {
        try { localStorage.setItem(key, val); return true; } catch (_) { return false; }
    }

    function getScore(levelId) {
        const raw = _safeGet(PREFIX + 'scores');
        if (!raw) return null;
        try { return JSON.parse(raw)[levelId] || null; } catch (_) { return null; }
    }

    function setScore(levelId, record) {
        const raw = _safeGet(PREFIX + 'scores');
        let scores = {};
        if (raw) { try { scores = JSON.parse(raw); } catch (_) { scores = {}; } }
        const prev = scores[levelId];
        if (!prev || record.score > prev.score) {
            scores[levelId] = record;
            _safeSet(PREFIX + 'scores', JSON.stringify(scores));
        }
        // also write hub-convention key with best score across levels
        const allScores = Object.values(scores).map(r => r.score);
        const best = allScores.length ? Math.max(...allScores) : 0;
        _safeSet(CFG.HIGH_SCORE_KEY, String(best));
        return scores[levelId];
    }

    function getBest() {
        return parseInt(_safeGet(CFG.HIGH_SCORE_KEY) || '0', 10);
    }

    function getSettings() {
        const raw = _safeGet(PREFIX + 'settings');
        if (!raw) return { sfx: 0.8, music: 0.6, master: 1.0 };
        try { return JSON.parse(raw); } catch (_) { return {}; }
    }

    function setSettings(partial) {
        const cur = getSettings();
        const next = Object.assign({}, cur, partial);
        _safeSet(PREFIX + 'settings', JSON.stringify(next));
    }

    function getAllScores() {
        const raw = _safeGet(PREFIX + 'scores');
        if (!raw) return {};
        try { return JSON.parse(raw); } catch (_) { return {}; }
    }

    function getDailyAttempt(dayKey) {
        const raw = _safeGet(PREFIX + 'daily');
        if (!raw) return null;
        try { return JSON.parse(raw)[dayKey] || null; } catch (_) { return null; }
    }

    function setDailyAttempt(dayKey, record) {
        const raw = _safeGet(PREFIX + 'daily');
        let map = {};
        if (raw) { try { map = JSON.parse(raw); } catch (_) { map = {}; } }
        map[dayKey] = record;
        _safeSet(PREFIX + 'daily', JSON.stringify(map));
    }

    function getAchievements() {
        const raw = _safeGet(PREFIX + 'achievements');
        if (!raw) return {};
        try { return JSON.parse(raw); } catch (_) { return {}; }
    }

    function setAchievements(map) {
        _safeSet(PREFIX + 'achievements', JSON.stringify(map));
    }

    return {
        getScore, setScore, getBest, getAllScores,
        getSettings, setSettings,
        getDailyAttempt, setDailyAttempt,
        getAchievements, setAchievements,
    };
})();
