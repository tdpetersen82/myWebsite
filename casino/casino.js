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

    // Bankroll amount
    const amtEl = document.getElementById('cas-bank-amount');
    if (amtEl) amtEl.textContent = fmt(bankroll);

    // Greeting line
    const deltaEl = document.getElementById('cas-bank-greeting');
    if (deltaEl) deltaEl.textContent = name ? `Welcome back, ${name}` : 'Pull up a seat — chips on the house.';

    // Cross-game stats
    const rl = readJson('rouletteStats') || {};
    const vp = readJson('videoPokerStats') || {};
    const th = readJson('texasHoldemStats') || {};
    const rlStats = rl.stats || {};
    const vpStats = vp.stats || {};

    const totalHands = (rlStats.spinsPlayed || 0) + (vpStats.handsPlayed || 0) + (th.handsPlayed || 0);
    const totalWins  = (rlStats.spinsWon   || 0) + (vpStats.handsWon   || 0) + (th.handsWon || 0);
    const winRate    = totalHands > 0 ? Math.round((totalWins / totalHands) * 100) : null;

    // "Biggest pot" — best single roulette win, best video-poker bankroll above
    // $1000, or the biggest hold'em pot a player has won.
    const biggestRoulette = rlStats.biggestWin || 0;
    const biggestVP       = Math.max(0, (vpStats.biggestBankroll || 1000) - 1000);
    const biggestTH       = th.biggestWin || 0;
    const biggestPot      = Math.max(biggestRoulette, biggestVP, biggestTH);

    // Per-game tile stats for hold'em.
    const thHandsEl = document.getElementById('cas-th-hands');
    if (thHandsEl) thHandsEl.textContent = (th.handsPlayed || 0) > 0
      ? `${th.handsPlayed.toLocaleString()} hand${th.handsPlayed === 1 ? '' : 's'}`
      : 'New table';
    const thBestEl = document.getElementById('cas-th-best');
    if (thBestEl) thBestEl.textContent = (th.biggestWin || 0) > 0 ? `+$${th.biggestWin.toLocaleString()}` : '—';

    setStat('cas-stat-biggest', biggestPot > 0 ? fmt(biggestPot) : '—', biggestPot > 0 ? 'Single best win' : 'No wins yet');
    setStat('cas-stat-hands',   totalHands.toLocaleString(),
            winRate != null ? `${totalWins} W · ${winRate}%` : 'No hands yet');

    // Reload button — emphasized when below MIN_PLAYABLE
    const reload = document.getElementById('cas-reload');
    if (reload) {
      const broke = bankroll < window.CASINO_BANKROLL.MIN_PLAYABLE;
      reload.classList.toggle('broke', broke);
      reload.textContent = broke ? 'Reload — Out of chips!' : 'Reload $1,000';
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

  function bindReload() {
    const btn = document.getElementById('cas-reload');
    if (!btn) return;
    btn.addEventListener('click', function () {
      window.CASINO_BANKROLL.reload();
      update();
    });
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
    update();
    bindReload();
    // Refresh whenever another tab updates the bankroll.
    window.addEventListener('storage', function (e) {
      if (e.key === window.CASINO_BANKROLL.KEY || e.key === window.CASINO_PLAYER.KEY || e.key === 'rouletteStats' || e.key === 'videoPokerStats' || e.key === 'texasHoldemStats') {
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
