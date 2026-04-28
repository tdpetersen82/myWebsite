// Scoring formula. See SPEC.md §15 (Scoring).

const Scoring = (function () {
    function compute(result) {
        // result: { totalAgents, evacuated, injured, timeRemaining, timeLimit, budgetUnspent, budgetTotal }
        const evacRatio = result.totalAgents > 0 ? result.evacuated / result.totalAgents : 0;
        const injRatio  = result.totalAgents > 0 ? result.injured / result.totalAgents : 0;
        const timeRatio = result.timeLimit > 0
            ? Math.max(0, result.timeRemaining / result.timeLimit) : 0;
        const budgetRatio = result.budgetTotal > 0
            ? Math.max(0, result.budgetUnspent / result.budgetTotal) : 0;

        const score =
            CFG.SCORE_EVAC_WEIGHT     * evacRatio
            - CFG.SCORE_INJURED_PENALTY * injRatio
            + CFG.SCORE_TIME_BONUS    * timeRatio
            + CFG.SCORE_BUDGET_BONUS  * budgetRatio;

        const rounded = Math.max(0, Math.round(score));
        const stars =
            rounded >= CFG.STAR_THRESHOLDS[2] ? 3 :
            rounded >= CFG.STAR_THRESHOLDS[1] ? 2 :
            rounded >= CFG.STAR_THRESHOLDS[0] ? 1 : 0;

        return {
            score: rounded,
            stars,
            breakdown: {
                evac:    Math.round(CFG.SCORE_EVAC_WEIGHT * evacRatio),
                injured: -Math.round(CFG.SCORE_INJURED_PENALTY * injRatio),
                time:    Math.round(CFG.SCORE_TIME_BONUS * timeRatio),
                budget:  Math.round(CFG.SCORE_BUDGET_BONUS * budgetRatio),
            },
        };
    }

    return { compute };
})();
