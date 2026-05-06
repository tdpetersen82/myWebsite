/* eslint-disable */
// Shared casino bankroll — single source of truth across blackjack, roulette,
// and video poker. Stored in localStorage under "casinoBankroll" (number).
//
// One-shot migration: if no casinoBankroll is present but a legacy per-game
// bankroll exists in rouletteStats or videoPokerStats, seed the shared key
// from the max of those values so a returning player keeps their progress.
(function () {
  const KEY = 'casinoBankroll';
  const STARTING = 1000;
  const MIN_PLAYABLE = 5; // smallest chip at any table
  let migrated = false;

  function migrateIfNeeded() {
    if (migrated) return;
    migrated = true;
    if (localStorage.getItem(KEY) != null) return;

    // Take the highest legacy bankroll across the two games that used to
    // persist their own. If neither has one, fall back to STARTING.
    let legacy = 0;
    try {
      const rl = JSON.parse(localStorage.getItem('rouletteStats') || 'null');
      if (rl && typeof rl.bankroll === 'number' && rl.bankroll > 0) {
        legacy = Math.max(legacy, rl.bankroll);
      }
    } catch (e) {}
    try {
      const vp = JSON.parse(localStorage.getItem('videoPokerStats') || 'null');
      if (vp && typeof vp.bankroll === 'number' && vp.bankroll > 0) {
        legacy = Math.max(legacy, vp.bankroll);
      }
    } catch (e) {}

    const candidate = legacy > 0 ? legacy : STARTING;
    localStorage.setItem(KEY, String(candidate));
  }

  function read() {
    migrateIfNeeded();
    const raw = localStorage.getItem(KEY);
    const n = raw == null ? STARTING : Number(raw);
    if (!isFinite(n) || n < 0) return STARTING;
    return Math.floor(n);
  }

  function write(n) {
    const v = Math.max(0, Math.floor(Number(n) || 0));
    localStorage.setItem(KEY, String(v));
    return v;
  }

  function reload() {
    return write(STARTING);
  }

  window.CASINO_BANKROLL = { STARTING, MIN_PLAYABLE, read, write, reload, KEY };
})();
