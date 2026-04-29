// Achievements: definitions + unlock detection + toast notifications.
// Persisted via Storage. Checked at end-of-level in ResultsScene.

const ACHIEVEMENTS = [
    { id: 'first_steps',     title: 'First Steps',         desc: 'Clear any level.' },
    { id: 'star_collector',  title: 'Star Collector',      desc: 'Earn 5 stars total across all levels.' },
    { id: 'perfectionist',   title: 'Perfectionist',       desc: 'Three-star any level.' },
    { id: 'lifesaver',       title: 'Lifesaver',           desc: 'Evacuate 100% of agents on any level.' },
    { id: 'nobody_left',     title: 'Nobody Left Behind',  desc: 'Clear a level with zero injuries.' },
    { id: 'frugal',          title: 'Frugal',              desc: 'Clear a level using 50% or less of the budget.' },
    { id: 'whole_toolkit',   title: 'The Whole Toolkit',   desc: 'Place at least one of every tool type before sounding the alarm.' },
    { id: 'drill_sergeant',  title: 'Drill Sergeant',      desc: 'Clear every non-tutorial level at least once.' },
];

const Achievements = (function () {
    function unlocked() {
        return Storage.getAchievements();
    }

    function isUnlocked(id) {
        return !!unlocked()[id];
    }

    function _markUnlocked(id) {
        const u = unlocked();
        if (u[id]) return false;
        u[id] = { ts: Date.now() };
        Storage.setAchievements(u);
        return true;
    }

    // Check end-of-level conditions, return list of newly unlocked definitions.
    function checkAfterLevel({ level, result, score, placementsUsed }) {
        const newly = [];
        const tryUnlock = (id) => { if (_markUnlocked(id)) newly.push(id); };

        // first_steps — any clear (≥1 star)
        if (score.stars >= 1) tryUnlock('first_steps');

        // perfectionist — three-star
        if (score.stars >= 3) tryUnlock('perfectionist');

        // lifesaver — 100% evacuation
        if (result.totalAgents > 0 && result.evacuated === result.totalAgents) {
            tryUnlock('lifesaver');
        }

        // nobody_left — zero injuries AND a clear
        if (score.stars >= 1 && result.injured === 0) tryUnlock('nobody_left');

        // frugal — used ≤50% of total budget AND a clear
        if (score.stars >= 1 && result.budgetTotal > 0) {
            const used = result.budgetTotal - result.budgetUnspent;
            if (used / result.budgetTotal <= 0.5) tryUnlock('frugal');
        }

        // whole_toolkit — placed at least one of every tool kind
        if (placementsUsed?.marshal && placementsUsed?.barrier && placementsUsed?.sign && placementsUsed?.pa) {
            tryUnlock('whole_toolkit');
        }

        // star_collector — total stars across all levels ≥ 5
        const allScores = Storage.getAllScores();
        let totalStars = 0;
        for (const k of Object.keys(allScores)) totalStars += (allScores[k].stars || 0);
        if (totalStars >= 5) tryUnlock('star_collector');

        // drill_sergeant — every non-tutorial level cleared
        const nonTut = LEVELS.filter(L => L.id !== '00-tutorial');
        const allCleared = nonTut.every(L => (allScores[L.id]?.stars || 0) >= 1);
        if (allCleared && nonTut.length > 0) tryUnlock('drill_sergeant');

        return newly.map(id => ACHIEVEMENTS.find(a => a.id === id)).filter(Boolean);
    }

    function totalUnlocked() {
        return Object.keys(unlocked()).length;
    }

    function spawnToast(scene, ach) {
        const W = CFG.CANVAS_W;
        const y = 90;
        const bg = scene.add.rectangle(W / 2, y, 360, 50, 0x000000, 0.9)
            .setStrokeStyle(2, 0xfbbf24).setDepth(95);
        const txt = scene.add.text(W / 2, y - 6, '🏆 Achievement unlocked', {
            fontFamily: 'Arial Black', fontSize: '12px', color: '#fbbf24',
        }).setOrigin(0.5).setDepth(96);
        const sub = scene.add.text(W / 2, y + 10, ach.title, {
            fontFamily: 'Arial', fontSize: '14px', color: '#fff',
        }).setOrigin(0.5).setDepth(96);

        bg.setAlpha(0); txt.setAlpha(0); sub.setAlpha(0);
        scene.tweens.add({ targets: [bg, txt, sub], alpha: 1, duration: 300 });
        scene.tweens.add({
            targets: [bg, txt, sub], alpha: 0, duration: 400, delay: 3500,
            onComplete: () => { bg.destroy(); txt.destroy(); sub.destroy(); },
        });
    }

    return { ACHIEVEMENTS, checkAfterLevel, isUnlocked, totalUnlocked, spawnToast };
})();
