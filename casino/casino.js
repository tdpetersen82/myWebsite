/* eslint-disable */
// Casino landing page — bind the bankroll widget to live localStorage data,
// wire the reload button, and replace the stat tiles with honest cross-game
// numbers.
(function () {
  function fmt(n) { return '$' + Number(n || 0).toLocaleString(); }

  function readJson(key) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  }

  function update() {
    const bankroll = window.CASINO_BANKROLL.read();
    const name = window.CASINO_PLAYER.read();
    const stats = window.CASINO_STATS ? window.CASINO_STATS.read() : null;

    // Bankroll amount
    const amtEl = document.getElementById('cas-bank-amount');
    if (amtEl) amtEl.textContent = fmt(bankroll);

    // Greeting line
    const deltaEl = document.getElementById('cas-bank-greeting');
    if (deltaEl) deltaEl.textContent = name ? `Welcome back, ${name}` : 'Pull up a seat — chips on the house.';

    // Cross-game stats from CASINO_STATS (with legacy fallback so the page
    // still works on a stale tab without the new module).
    let totalHands = 0, totalWins = 0, biggestPot = 0;
    let thHands = 0, thBiggestWin = 0;
    if (stats) {
      const pg = stats.lifetime.perGame;
      const sumPlayed =
        (pg.blackjack.handsPlayed       || 0) +
        (pg.roulette.spinsPlayed        || 0) +
        (pg.videoPoker.handsPlayed      || 0) +
        (pg.solitaire.gamesPlayed       || 0) +
        (pg.craps.rollsPlayed           || 0) +
        (pg.threeCardPoker.handsPlayed  || 0) +
        (pg.texasHoldem.handsPlayed     || 0) +
        (pg.slotMachine.spinsPlayed     || 0);
      const sumWon =
        (pg.blackjack.handsWon       || 0) +
        (pg.roulette.spinsWon        || 0) +
        (pg.videoPoker.handsWon      || 0) +
        (pg.solitaire.gamesWon       || 0) +
        (pg.craps.passWins           || 0) +
        (pg.threeCardPoker.handsWon  || 0) +
        (pg.texasHoldem.handsWon     || 0);
      totalHands = sumPlayed;
      totalWins  = sumWon;
      biggestPot = stats.lifetime.biggestPayout.amount || 0;
      thHands = pg.texasHoldem.handsPlayed || 0;
      thBiggestWin = pg.texasHoldem.biggestWin || 0;
    } else {
      // Legacy fallback
      const rl = readJson('rouletteStats') || {};
      const vp = readJson('videoPokerStats') || {};
      const th = readJson('texasHoldemStats') || {};
      const rlStats = rl.stats || {}; const vpStats = vp.stats || {};
      totalHands = (rlStats.spinsPlayed || 0) + (vpStats.handsPlayed || 0) + (th.handsPlayed || 0);
      totalWins  = (rlStats.spinsWon   || 0) + (vpStats.handsWon   || 0) + (th.handsWon || 0);
      biggestPot = Math.max(rlStats.biggestWin || 0, Math.max(0, (vpStats.biggestBankroll || 1000) - 1000), th.biggestWin || 0);
      thHands = th.handsPlayed || 0;
      thBiggestWin = th.biggestWin || 0;
    }
    const winRate = totalHands > 0 ? Math.round((totalWins / totalHands) * 100) : null;

    // Per-game tile stats for hold'em.
    const thHandsEl = document.getElementById('cas-th-hands');
    if (thHandsEl) thHandsEl.textContent = thHands > 0
      ? `${thHands.toLocaleString()} hand${thHands === 1 ? '' : 's'}`
      : 'New table';
    const thBestEl = document.getElementById('cas-th-best');
    if (thBestEl) thBestEl.textContent = thBiggestWin > 0 ? `+$${thBiggestWin.toLocaleString()}` : '—';

    setStat('cas-stat-biggest', biggestPot > 0 ? fmt(biggestPot) : '—', biggestPot > 0 ? 'Single best win' : 'No wins yet');
    setStat('cas-stat-hands',   totalHands.toLocaleString(),
            winRate != null ? `${totalWins} W · ${winRate}%` : 'No hands yet');

    // Reload link — emphasized when below MIN_PLAYABLE
    const reload = document.getElementById('cas-reload');
    if (reload) {
      const broke = bankroll < window.CASINO_BANKROLL.MIN_PLAYABLE;
      reload.classList.toggle('broke', broke);
      reload.textContent = broke ? 'Out of chips · Cash out →' : 'Cash out · profile';
    }
  }

  function setStat(id, value, sub) {
    const el = document.getElementById(id);
    if (!el) return;
    const n = el.querySelector('.n');
    const s = el.querySelector('.s');
    if (n) n.textContent = value;
    if (s) s.textContent = sub;
  }

  function init() {
    if (!window.CASINO_BANKROLL) {
      console.warn('[casino] casino-bankroll.js not loaded');
      return;
    }
    if (!window.CASINO_PLAYER) {
      console.warn('[casino] casino-player.js not loaded');
      return;
    }
    if (!window.CASINO_STATS) {
      console.warn('[casino] casino-stats.js not loaded — using legacy fallback');
    }
    update();
    // Refresh whenever another tab updates relevant storage.
    window.addEventListener('storage', function (e) {
      if (!e.key) return;
      if (e.key === window.CASINO_BANKROLL.KEY ||
          e.key === window.CASINO_PLAYER.KEY ||
          (window.CASINO_STATS && e.key === window.CASINO_STATS.KEY)) {
        update();
      }
    });
    // Also refresh on focus, in case a sibling tab moved.
    window.addEventListener('focus', update);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
