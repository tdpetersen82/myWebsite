/* eslint-disable */
// Shared casino player profile — single source of truth for the player's name
// and cross-game preferences (showHints, soundOn) across blackjack, roulette,
// video poker, craps, three card poker, and solitaire. Stored in localStorage
// as a JSON object under "casinoPlayer".
//
// One-shot migration: if no profile exists but a legacy name key does, seed
// profile.name from the first non-empty legacy key in priority order
// (casinoPlayerName → bj → cr → tcp → sol). Legacy keys are left in place so a
// tab on stale code still works mid-rollout.
(function () {
  const KEY = 'casinoPlayer';
  const NAME_LEGACY_KEYS = ['casinoPlayerName', 'bjPlayerName', 'crPlayerName', 'tcpPlayerName', 'solitairePlayerName', 'thPlayerName'];
  const MAX_NAME_LEN = 20;
  let migrated = false;

  function readProfile() {
    try {
      const raw = localStorage.getItem(KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (e) {
      return {};
    }
  }

  function writeProfile(p) {
    try { localStorage.setItem(KEY, JSON.stringify(p)); } catch (e) {}
  }

  function migrateIfNeeded() {
    if (migrated) return;
    migrated = true;
    const profile = readProfile();
    if (profile.name) return;
    for (const k of NAME_LEGACY_KEYS) {
      const v = (localStorage.getItem(k) || '').trim();
      if (v) {
        profile.name = v.slice(0, MAX_NAME_LEN);
        writeProfile(profile);
        return;
      }
    }
  }

  function get(field, fallback) {
    migrateIfNeeded();
    const p = readProfile();
    return field in p ? p[field] : fallback;
  }

  function set(field, value) {
    migrateIfNeeded();
    const p = readProfile();
    p[field] = value;
    writeProfile(p);
  }

  function readName() {
    return (get('name') || '').trim();
  }

  function writeName(name) {
    const trimmed = (name || '').trim().slice(0, MAX_NAME_LEN);
    if (!trimmed) return '';
    set('name', trimmed);
    return trimmed;
  }

  window.CASINO_PLAYER = { KEY, read: readName, write: writeName, get, set };
})();
