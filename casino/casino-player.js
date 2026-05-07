/* eslint-disable */
// Shared casino player name — single source of truth across blackjack,
// roulette, video poker, craps, three card poker, and solitaire. Stored in
// localStorage under "casinoPlayerName" (string).
//
// One-shot migration: if no casinoPlayerName is present but a legacy per-game
// name exists, seed the shared key from the first non-empty legacy value in
// priority order. Legacy keys are left in place so a tab on stale code still
// works mid-rollout.
(function () {
  const KEY = 'casinoPlayerName';
  const MAX_LEN = 20;
  const LEGACY_KEYS = ['bjPlayerName', 'crPlayerName', 'tcpPlayerName', 'solitairePlayerName'];
  let migrated = false;

  function migrateIfNeeded() {
    if (migrated) return;
    migrated = true;
    const existing = (localStorage.getItem(KEY) || '').trim();
    if (existing) return;

    for (const k of LEGACY_KEYS) {
      const v = (localStorage.getItem(k) || '').trim();
      if (v) {
        localStorage.setItem(KEY, v.slice(0, MAX_LEN));
        return;
      }
    }
  }

  function read() {
    migrateIfNeeded();
    return (localStorage.getItem(KEY) || '').trim();
  }

  function write(name) {
    const trimmed = (name || '').trim().slice(0, MAX_LEN);
    if (trimmed) localStorage.setItem(KEY, trimmed);
    return trimmed;
  }

  window.CASINO_PLAYER = { KEY, read, write };
})();
