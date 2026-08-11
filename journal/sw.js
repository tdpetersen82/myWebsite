// Journal service worker.
//
// Caches only the app shell so the page opens with no signal. Entry data is
// never cached here — it lives in IndexedDB, and /api/ requests always go to
// the network so a stale response can't masquerade as synced data.
//
// Bump CACHE when the shell changes; the old cache is dropped on activate.

const CACHE = 'journal-shell-v1';
const SHELL = [
  '/journal/',
  '/journal/index.html',
  '/journal/manifest.webmanifest',
  '/journal/icon-192.png',
  '/journal/icon-512.png',
  '/journal/apple-touch-icon.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE)
      .then((cache) => cache.addAll(SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api/')) return;
  if (!url.pathname.startsWith('/journal/')) return;

  // Network-first so a deploy is picked up on the next online load, with the
  // cache as the offline fallback.
  event.respondWith(
    fetch(req)
      .then((res) => {
        if (res && res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((cache) => cache.put(req, copy));
        }
        return res;
      })
      .catch(() => caches.match(req).then((hit) => hit || caches.match('/journal/')))
  );
});
