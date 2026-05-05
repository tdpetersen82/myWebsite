const Achievements = (() => {
    const KEY = 'blackjackAchievements';

    const DEFS = [
        { id: 'first_bj',       icon: '♠', title: 'First Blackjack',       desc: 'Got your first natural 21.' },
        { id: 'five_streak',    icon: '🔥', title: 'Hot Streak',            desc: 'Won 5 hands in a row.' },
        { id: 'ten_streak',     icon: '⚡', title: 'On Fire',               desc: 'Won 10 hands in a row.' },
        { id: 'high_roller',    icon: '💎', title: 'High Roller',           desc: 'Bankroll reached $5,000.' },
        { id: 'rich_one',       icon: '👑', title: 'House Bank',            desc: 'Bankroll reached $10,000.' },
        { id: 'comeback',       icon: '🔄', title: 'Comeback',              desc: 'Recovered from under $200 to over $1,500.' },
        { id: 'dealer_bust_win',icon: '💥', title: 'Dealer Buster',         desc: 'Won a hand by dealer bust.' },
        { id: 'survived_split', icon: '✂️', title: 'Splitter',              desc: 'Won at least one hand from a split.' },
        { id: 'quick_learner',  icon: '🎯', title: 'Quick Learner',         desc: 'Strategy accuracy ≥ 90% over 20 decisions.' },
        { id: 'quiz_perfect',   icon: '🧠', title: 'Quiz Master',           desc: 'Got 10 quiz answers right in a row.' },
        { id: 'count_perfect',  icon: '🔢', title: 'Counting Apprentice',   desc: 'Perfect score on a 20-card counting drill.' },
        { id: 'count_master',   icon: '🎓', title: 'Counting Master',       desc: 'Perfect score on a 40-card counting drill.' },
    ];

    let state = { unlocked: {} };
    let lowPoint = null;

    function load() {
        try {
            const raw = JSON.parse(localStorage.getItem(KEY));
            if (raw) state = { unlocked: raw.unlocked || {} };
        } catch (e) {}
    }
    function save() { localStorage.setItem(KEY, JSON.stringify(state)); }

    function isUnlocked(id) { return !!state.unlocked[id]; }
    function unlockedCount() { return Object.keys(state.unlocked).length; }
    function totalCount() { return DEFS.length; }

    function unlock(id) {
        if (state.unlocked[id]) return false;
        const def = DEFS.find(d => d.id === id);
        if (!def) return false;
        state.unlocked[id] = Date.now();
        save();
        showToast(def);
        updateBadge();
        return true;
    }

    function showToast(def) {
        let host = document.getElementById('ach-toast-host');
        if (!host) {
            host = document.createElement('div');
            host.id = 'ach-toast-host';
            host.className = 'ach-toast-host';
            document.body.appendChild(host);
        }
        const toast = document.createElement('div');
        toast.className = 'ach-toast';
        toast.innerHTML =
            '<div class="ach-toast-icon">' + def.icon + '</div>' +
            '<div class="ach-toast-body">' +
                '<div class="ach-toast-label">Achievement Unlocked</div>' +
                '<div class="ach-toast-title">' + def.title + '</div>' +
                '<div class="ach-toast-desc">' + def.desc + '</div>' +
            '</div>';
        host.appendChild(toast);
        requestAnimationFrame(() => toast.classList.add('visible'));
        setTimeout(() => {
            toast.classList.remove('visible');
            setTimeout(() => toast.remove(), 400);
        }, 3800);
    }

    // Badge in header showing unlocked / total
    function ensureBadge() {
        const host = document.querySelector('.header-buttons');
        if (!host || document.getElementById('ach-badge')) return;
        const badge = document.createElement('button');
        badge.id = 'ach-badge';
        badge.className = 'ach-badge';
        badge.title = 'Achievements';
        badge.innerHTML = '🏆 <span id="ach-badge-count">0</span>/<span id="ach-badge-total">0</span>';
        badge.addEventListener('click', showAllModal);
        host.insertBefore(badge, host.firstChild);
    }
    function updateBadge() {
        ensureBadge();
        const c = document.getElementById('ach-badge-count');
        const t = document.getElementById('ach-badge-total');
        if (c) c.textContent = unlockedCount();
        if (t) t.textContent = totalCount();
    }

    function showAllModal() {
        let modal = document.getElementById('ach-modal');
        if (modal) { modal.classList.add('visible'); renderList(); return; }
        modal = document.createElement('div');
        modal.id = 'ach-modal';
        modal.className = 'ach-modal';
        modal.innerHTML = `
            <div class="ach-modal-card">
                <div class="ach-modal-header">
                    <h2>🏆 Achievements</h2>
                    <button class="ach-modal-close">×</button>
                </div>
                <div class="ach-modal-content" id="ach-modal-list"></div>
            </div>
        `;
        document.body.appendChild(modal);
        modal.querySelector('.ach-modal-close').addEventListener('click', () => modal.classList.remove('visible'));
        modal.addEventListener('click', (e) => { if (e.target === modal) modal.classList.remove('visible'); });
        renderList();
        modal.classList.add('visible');
    }

    function renderList() {
        const list = document.getElementById('ach-modal-list');
        if (!list) return;
        list.innerHTML = DEFS.map(def => {
            const unlocked = isUnlocked(def.id);
            return '<div class="ach-row ' + (unlocked ? 'unlocked' : 'locked') + '">' +
                '<div class="ach-row-icon">' + def.icon + '</div>' +
                '<div class="ach-row-body">' +
                    '<div class="ach-row-title">' + def.title + '</div>' +
                    '<div class="ach-row-desc">' + def.desc + '</div>' +
                '</div>' +
                '<div class="ach-row-status">' + (unlocked ? '✓' : '·') + '</div>' +
            '</div>';
        }).join('');
    }

    // ────── Event hooks called from game / quiz / counting ──────
    function onBlackjack() { unlock('first_bj'); }
    function onStreak(n) {
        if (n >= 5) unlock('five_streak');
        if (n >= 10) unlock('ten_streak');
    }
    function onBankroll(value) {
        if (value >= 5000) unlock('high_roller');
        if (value >= 10000) unlock('rich_one');
        if (value < 200) lowPoint = value;
        else if (lowPoint !== null && value > 1500) {
            unlock('comeback');
            lowPoint = null;
        }
    }
    function onDealerBust() { unlock('dealer_bust_win'); }
    function onSplitWin() { unlock('survived_split'); }
    function onAccuracyCheck() {
        if (typeof Analytics === 'undefined') return;
        const s = Analytics.getStats();
        if (s.totalDecisions >= 20 && s.accuracy >= 90) unlock('quick_learner');
    }
    function onQuizStreak(n) {
        if (n >= 10) unlock('quiz_perfect');
    }
    function onCountingPerfect(numCards) {
        if (numCards >= 20) unlock('count_perfect');
        if (numCards >= 40) unlock('count_master');
    }

    // Init
    load();
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', updateBadge);
    } else {
        updateBadge();
    }

    return {
        onBlackjack, onStreak, onBankroll, onDealerBust, onSplitWin,
        onAccuracyCheck, onQuizStreak, onCountingPerfect,
        showAllModal, isUnlocked, unlockedCount, totalCount,
        // For dev/testing
        _unlock: unlock,
    };
})();
