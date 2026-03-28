const Strategy = (() => {
    // Optimal strategy for 3-card poker: Play with Q-6-4 or better, fold otherwise.
    // Compare: rank first, then highest card, second, third.

    // Returns true if the hand is Q-6-4 or better (should play)
    function shouldPlay(cards) {
        const ev = Hand.evaluate(cards);

        // Any pair or better: always play
        if (ev.rank >= Hand.RANKS.PAIR) return true;

        // High card hands: need Q-6-4 or better
        const sorted = Hand.sortCards(cards);
        const vals = sorted.map(c => Deck.rankValue(c));

        // Must have at least Queen high
        if (vals[0] < 12) return false; // less than Queen high
        if (vals[0] > 12) return true;  // King or Ace high

        // Exactly Queen high — check second card
        if (vals[1] < 6) return false;
        if (vals[1] > 6) return true;

        // Queen-6-X — check third card
        if (vals[2] < 4) return false;
        return true; // Q-6-4 or better
    }

    // Estimate approximate win probability for the current hand
    function estimateWinRate(cards) {
        const ev = Hand.evaluate(cards);
        const sorted = Hand.sortCards(cards);
        const highVal = Deck.rankValue(sorted[0]);

        switch (ev.rank) {
            case Hand.RANKS.STRAIGHT_FLUSH: return 97;
            case Hand.RANKS.THREE_OF_A_KIND: return 95;
            case Hand.RANKS.STRAIGHT: return 80;
            case Hand.RANKS.FLUSH: return 72;
            case Hand.RANKS.PAIR:
                if (highVal >= 12) return 68;
                if (highVal >= 8) return 62;
                return 58;
            default:
                // High card
                if (highVal >= 14) return 52; // Ace high
                if (highVal >= 13) return 48; // King high
                if (highVal >= 12) return 44; // Queen high
                return 35; // below threshold
        }
    }

    function getRecommendation(cards) {
        const play = shouldPlay(cards);
        const winRate = estimateWinRate(cards);
        const handDesc = Hand.describe(cards);
        const ev = Hand.evaluate(cards);

        const action = play ? 'PLAY' : 'FOLD';
        const riskClass = play ? 'risk-good' : 'risk-bad';
        const riskLabel = 'Win rate \u2248' + winRate + '%';

        let explanation;
        let detailedExplanation;

        if (play) {
            if (ev.rank >= Hand.RANKS.PAIR) {
                explanation = 'You have ' + handDesc + ' \u2014 a strong hand. Always play with a pair or better.';
                detailedExplanation = buildDetailPlay(cards, ev, handDesc);
            } else {
                explanation = 'Your ' + handDesc + ' meets or exceeds the Q-6-4 threshold. Optimal strategy says play.';
                detailedExplanation = buildDetailThreshold(cards, ev, handDesc);
            }
        } else {
            explanation = 'Your ' + handDesc + ' is below Q-6-4. Optimal strategy says fold to minimize losses.';
            detailedExplanation = buildDetailFold(cards, ev, handDesc);
        }

        return { action, explanation, riskLabel, riskClass, detailedExplanation };
    }

    function buildDetailPlay(cards, ev, handDesc) {
        const parts = [];
        parts.push('With ' + handDesc + ', you have a hand that beats a large portion of possible dealer hands.');

        if (ev.rank >= Hand.RANKS.STRAIGHT) {
            parts.push('This hand also earns an Ante Bonus regardless of whether the dealer qualifies or not.');
        }

        parts.push('\n\nKey concepts:');
        parts.push('\u2022 The Q-6-4 threshold is the mathematically optimal dividing line between playing and folding.');
        parts.push('\u2022 In 3-card poker, straights rank HIGHER than flushes because there are fewer 3-card straight combinations than flush combinations.');
        parts.push('\u2022 The dealer must have Queen-high or better to "qualify." If the dealer doesn\'t qualify, your Ante pays 1:1 but your Play bet is returned (push).');
        parts.push('\u2022 The Ante/Play game has a house edge of about 3.4%, while Pair Plus has about 7.3%.');

        return parts.join('\n');
    }

    function buildDetailThreshold(cards, ev, handDesc) {
        const sorted = Hand.sortCards(cards);
        const parts = [];

        parts.push('Your hand (' + sorted.map(c => c.rank + c.symbol).join(' ') + ') is at or above the Q-6-4 optimal threshold.');
        parts.push('\n\nWhy Q-6-4 specifically?');
        parts.push('\u2022 Mathematical analysis shows that Q-6-4 is the exact break-even point. Hands at or above this win often enough that the Play bet has positive expected value.');
        parts.push('\u2022 Below Q-6-4, you lose more from the Play bet than you gain, so folding (losing just the Ante) is cheaper.');
        parts.push('\n\nHow the threshold works:');
        parts.push('\u2022 First compare hand rank (pair > high card, etc.)');
        parts.push('\u2022 For high-card hands: compare highest card, then second, then third');
        parts.push('\u2022 Any pair or better always exceeds the threshold');
        parts.push('\n\nDealer qualification:');
        parts.push('\u2022 The dealer needs Queen-high or better to qualify');
        parts.push('\u2022 If the dealer doesn\'t qualify: Ante pays 1:1, Play pushes');
        parts.push('\u2022 If the dealer qualifies and you win: both Ante and Play pay 1:1');

        return parts.join('\n');
    }

    function buildDetailFold(cards, ev, handDesc) {
        const sorted = Hand.sortCards(cards);
        const parts = [];

        parts.push('Your hand (' + sorted.map(c => c.rank + c.symbol).join(' ') + ') falls below the Q-6-4 threshold.');
        parts.push('\n\nWhy fold?');
        parts.push('\u2022 By folding, you lose only your Ante bet. By playing, you\'d add an equal Play bet and lose both more often than you win.');
        parts.push('\u2022 The math: below Q-6-4, your expected loss from playing is greater than just forfeiting the Ante.');
        parts.push('\n\nCommon misconceptions:');
        parts.push('\u2022 "But the dealer might not qualify!" \u2014 True, but even accounting for that, sub-Q-6-4 hands lose too often when the dealer does qualify.');
        parts.push('\u2022 "I might get lucky!" \u2014 Over time, playing weak hands costs more than folding them.');
        parts.push('\n\n3-card poker hand rankings (high to low):');
        parts.push('\u2022 Straight Flush > Three of a Kind > Straight > Flush > Pair > High Card');
        parts.push('\u2022 Note: Straights beat flushes in 3-card poker (opposite of 5-card poker) because there are fewer 3-card straight combinations.');

        return parts.join('\n');
    }

    return { shouldPlay, estimateWinRate, getRecommendation };
})();
