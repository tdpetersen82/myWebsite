/* eslint-disable */
// Cloud sync layer for casino stats. Mirrors the three localStorage keys
// (casinoBankroll, casinoPlayer, casinoStats) to a Cloudflare Worker keyed by
// a per-device UUID stored as casinoDeviceId. localStorage stays the on-device
// source of truth; the cloud blob is a mirror.
//
// Load order: casino-config.js → casino-sync.js → casino-bankroll.js →
// casino-player.js → casino-stats.js.  Sync wraps localStorage.setItem before
// any casino module runs, so migration writes are caught too.
//
// Status events fired on `window`: casino:sync-status with detail.state in
// 'idle' | 'syncing' | 'synced' | 'offline'.
(function () {
  const CFG = window.CASINO_CONFIG || {};
  const API = (CFG.apiBase || '/api/casino').replace(/\/+$/, '');
  const DEBOUNCE_MS = Number(CFG.syncDebounceMs) || 5000;
  const TRACKED_KEYS = new Set(['casinoBankroll', 'casinoPlayer', 'casinoStats']);
  const DEVICE_KEY = 'casinoDeviceId';
  const META_KEY = 'casinoSyncMeta';
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  const wasFresh =
    localStorage.getItem('casinoStats') === null &&
    localStorage.getItem('casinoBankroll') === null;

  let suppressTracking = false;
  let pullDone = false;
  let pushTimer = null;
  let inflight = null;
  let dirty = false;

  // Capture original setItem so we can write without re-triggering sync.
  const origSetItem = Storage.prototype.setItem;

  Storage.prototype.setItem = function (key, value) {
    origSetItem.call(this, key, value);
    if (suppressTracking) return;
    if (this !== window.localStorage) return;
    if (!TRACKED_KEYS.has(key)) return;
    stampLocalMeta();
    dirty = true;
    schedulePush();
  };

  function stampLocalMeta() {
    suppressTracking = true;
    try { origSetItem.call(localStorage, META_KEY, JSON.stringify({ updatedAt: Date.now() })); }
    finally { suppressTracking = false; }
  }

  function readLocalMeta() {
    try {
      const raw = localStorage.getItem(META_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  }

  function getDeviceId() {
    let id = localStorage.getItem(DEVICE_KEY) || '';
    if (!UUID_RE.test(id)) {
      id = (crypto.randomUUID && crypto.randomUUID()) || fallbackUUID();
      suppressTracking = true;
      try { origSetItem.call(localStorage, DEVICE_KEY, id); }
      finally { suppressTracking = false; }
    }
    return id;
  }

  function fallbackUUID() {
    const b = new Uint8Array(16);
    crypto.getRandomValues(b);
    b[6] = (b[6] & 0x0f) | 0x40;
    b[8] = (b[8] & 0x3f) | 0x80;
    const h = Array.from(b, x => x.toString(16).padStart(2, '0'));
    return `${h.slice(0,4).join('')}-${h.slice(4,6).join('')}-${h.slice(6,8).join('')}-${h.slice(8,10).join('')}-${h.slice(10,16).join('')}`;
  }

  function emit(state, extra) {
    window.dispatchEvent(new CustomEvent('casino:sync-status', {
      detail: Object.assign({ state }, extra || {}),
    }));
  }

  function buildBlob() {
    return {
      bankroll: readKey('casinoBankroll'),
      player:   readKey('casinoPlayer'),
      stats:    readKey('casinoStats'),
      meta:     readLocalMeta() || { updatedAt: Date.now() },
    };
  }

  function readKey(k) {
    const raw = localStorage.getItem(k);
    if (raw == null) return null;
    if (k === 'casinoBankroll') {
      const n = Number(raw);
      return isFinite(n) ? n : null;
    }
    try { return JSON.parse(raw); } catch (e) { return null; }
  }

  function writeKeyRaw(k, value) {
    suppressTracking = true;
    try {
      if (value == null) { localStorage.removeItem(k); return; }
      const str = (k === 'casinoBankroll') ? String(value) : JSON.stringify(value);
      origSetItem.call(localStorage, k, str);
    } finally { suppressTracking = false; }
  }

  function hydrateFromCloud(cloud) {
    if (!cloud) return;
    if (cloud.bankroll != null) writeKeyRaw('casinoBankroll', cloud.bankroll);
    if (cloud.player   != null) writeKeyRaw('casinoPlayer',   cloud.player);
    if (cloud.stats    != null) writeKeyRaw('casinoStats',    cloud.stats);
    suppressTracking = true;
    try {
      const ts = (cloud.meta && cloud.meta.updatedAt) || cloud.updatedAt || Date.now();
      origSetItem.call(localStorage, META_KEY, JSON.stringify({ updatedAt: ts }));
    } finally { suppressTracking = false; }
  }

  async function pull() {
    const id = getDeviceId();
    emit('syncing', { op: 'pull' });
    try {
      const res = await fetch(`${API}/stats`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${id}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const cloud = await res.json();
      const cloudHasData = cloud && (cloud.bankroll != null || cloud.player != null || cloud.stats != null);

      if (cloudHasData && wasFresh) {
        hydrateFromCloud(cloud);
        dirty = false;
        window.dispatchEvent(new CustomEvent('casino:hydrated'));
      } else if (!cloudHasData) {
        // Fresh cloud — push whatever we have now (or will have once modules init).
        dirty = true;
        schedulePush(0);
      }
      pullDone = true;
      emit('synced');
    } catch (e) {
      pullDone = true;
      emit('offline', { error: String(e) });
    }
  }

  function schedulePush(delay) {
    if (pushTimer) { clearTimeout(pushTimer); pushTimer = null; }
    const ms = delay == null ? DEBOUNCE_MS : delay;
    pushTimer = setTimeout(() => { pushTimer = null; flushPush(); }, ms);
  }

  async function flushPush() {
    if (!pullDone) { schedulePush(250); return; }
    if (!dirty) return; // nothing changed since last successful push
    if (inflight) return; // a flush is already running; the next setItem will reschedule
    if (pushTimer) { clearTimeout(pushTimer); pushTimer = null; }
    const id = getDeviceId();
    const blob = buildBlob();
    dirty = false;
    emit('syncing', { op: 'push' });
    inflight = (async () => {
      try {
        const res = await fetch(`${API}/stats`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${id}`,
            'content-type': 'application/json',
          },
          body: JSON.stringify(blob),
          keepalive: true,
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        emit('synced');
      } catch (e) {
        dirty = true; // retry on next trigger
        emit('offline', { error: String(e) });
      } finally {
        inflight = null;
      }
    })();
  }

  function flushImmediate() {
    if (pushTimer) { clearTimeout(pushTimer); pushTimer = null; }
    flushPush();
  }

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flushImmediate();
  });
  window.addEventListener('pagehide', flushImmediate);

  // Public API for UI / debugging.
  window.CASINO_SYNC = {
    deviceId: getDeviceId,
    pull,
    push: flushImmediate,
    apiBase: API,
  };

  // Kick off initial pull. Modules' IIFEs run synchronously between this point
  // and microtask resolution; their migration writes will queue a debounced
  // push that waits for pullDone before firing.
  pull();
})();
