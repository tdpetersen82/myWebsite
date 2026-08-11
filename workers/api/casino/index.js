// Cloudflare Worker: API + static asset fallthrough.
//
// Routes:
//   GET    /api/casino/stats   → return blob at casino:{deviceId} or empty
//   PUT    /api/casino/stats   → store blob, stamp updatedAt
//   DELETE /api/casino/stats   → delete blob (used by future "wipe cloud" UI)
//   POST   /api/contact        → store a contact-form submission
//   *      /api/journal/*      → private single-user journal (see below)
// Anything else → static assets via env.ASSETS.
//
// Auth model: caller sends Authorization: Bearer {deviceId}. The deviceId is a
// 128-bit UUID generated client-side. It's a capability — anyone with it can
// read/write that device's stats. Stats are anonymous game scores, no PII.
//
// The journal routes are different: they're single-user and private, gated by a
// shared secret in env.JOURNAL_TOKEN (wrangler secret put JOURNAL_TOKEN). Put
// Cloudflare Access in front of /journal* and /api/journal* for a second layer.

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_BLOB_BYTES = 64 * 1024;
const MAX_CONTACT_BYTES = 8 * 1024;

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const JOURNAL_ENTRY_PREFIX = 'journal:entry:';
const JOURNAL_PHOTO_PREFIX = 'journal:photo:';
const MAX_ENTRY_BYTES = 256 * 1024;
const MAX_PHOTO_BYTES = 8 * 1024 * 1024;
const PHOTO_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

function json(body, init = {}) {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: { 'content-type': 'application/json', ...(init.headers || {}) },
  });
}

function deviceIdFrom(request) {
  const h = request.headers.get('authorization') || '';
  const m = h.match(/^Bearer\s+(.+)$/i);
  if (!m) return null;
  const id = m[1].trim();
  return UUID_RE.test(id) ? id : null;
}

async function handleStats(request, env) {
  const deviceId = deviceIdFrom(request);
  if (!deviceId) return json({ error: 'invalid device id' }, { status: 401 });

  const key = `casino:${deviceId}`;

  if (request.method === 'GET') {
    const raw = await env.LIMESTONE_KV.get(key);
    if (!raw) return json({});
    try { return json(JSON.parse(raw)); }
    catch { return json({}); }
  }

  if (request.method === 'PUT') {
    const text = await request.text();
    if (text.length > MAX_BLOB_BYTES) {
      return json({ error: 'blob too large' }, { status: 413 });
    }
    let body;
    try { body = JSON.parse(text); }
    catch { return json({ error: 'invalid json' }, { status: 400 }); }
    if (!body || typeof body !== 'object') {
      return json({ error: 'invalid blob' }, { status: 400 });
    }
    body.updatedAt = Date.now();
    await env.LIMESTONE_KV.put(key, JSON.stringify(body));
    return json(body);
  }

  if (request.method === 'DELETE') {
    await env.LIMESTONE_KV.delete(key);
    return json({ ok: true });
  }

  return json({ error: 'method not allowed' }, { status: 405 });
}

// Contact form: POST { name, email, message, website (honeypot) }.
// Each submission is stored under contact:{iso-timestamp}:{rand} in KV.
// Read them with: wrangler kv key list --binding LIMESTONE_KV --prefix contact:
async function handleContact(request, env) {
  if (request.method !== 'POST') {
    return json({ error: 'method not allowed' }, { status: 405 });
  }
  const text = await request.text();
  if (text.length > MAX_CONTACT_BYTES) {
    return json({ error: 'message too large' }, { status: 413 });
  }
  let body;
  try { body = JSON.parse(text); }
  catch { return json({ error: 'invalid json' }, { status: 400 }); }
  if (!body || typeof body !== 'object') {
    return json({ error: 'invalid request' }, { status: 400 });
  }
  // Honeypot: humans leave "website" blank; bots fill it. Accept silently, store nothing.
  if (body.website) return json({ ok: true });

  const name = String(body.name || '').trim().slice(0, 200);
  const email = String(body.email || '').trim().slice(0, 200);
  const message = String(body.message || '').trim().slice(0, 5000);
  if (!message) return json({ error: 'message is required' }, { status: 400 });

  const ts = new Date().toISOString();
  const key = `contact:${ts}:${crypto.randomUUID().slice(0, 8)}`;
  await env.LIMESTONE_KV.put(key, JSON.stringify({
    name, email, message, ts,
    ip: request.headers.get('cf-connecting-ip') || '',
    ua: request.headers.get('user-agent') || '',
  }));
  return json({ ok: true });
}

// ---------------------------------------------------------------------------
// Journal — private, single user.
//
// Entries live in KV under journal:entry:{YYYY-MM-DD} as
//   { date, text, photos: [photoId], updatedAt, deleted? }
// Photo bytes live in KV too, under journal:photo:{uuid}, with the mime type in
// KV metadata. R2 would be the natural home but needs an account-level opt-in
// this account doesn't have; a downscaled photo is far under KV's 25MB limit.
//
// Deletes are tombstones (deleted: true) rather than real removals so a phone
// that was offline during the delete doesn't resurrect the entry on next sync.
//
//   GET    /api/journal/entries          → { entries: [...] }, ?since=ms to filter
//   PUT    /api/journal/entries/{date}   → store entry, returns stored copy
//   DELETE /api/journal/entries/{date}   → tombstone the entry
//   PUT    /api/journal/photos/{id}      → raw image body, client-supplied UUID
//   GET    /api/journal/photos/{id}      → image bytes
//   DELETE /api/journal/photos/{id}      → remove image
//
// Photo ids come from the client so an entry can reference a photo before it
// has finished uploading, and so a retried upload overwrites rather than
// duplicating.

// Compares in time proportional to the longer string rather than bailing at the
// first mismatched byte, so response latency doesn't leak a prefix of the token.
function safeEqual(a, b) {
  const enc = new TextEncoder();
  const ab = enc.encode(a);
  const bb = enc.encode(b);
  let diff = ab.length ^ bb.length;
  const n = Math.max(ab.length, bb.length);
  for (let i = 0; i < n; i++) diff |= (ab[i] || 0) ^ (bb[i] || 0);
  return diff === 0;
}

function journalAuthed(request, env) {
  const secret = env.JOURNAL_TOKEN;
  if (!secret) return false;
  const m = (request.headers.get('authorization') || '').match(/^Bearer\s+(.+)$/i);
  if (!m) return false;
  return safeEqual(m[1].trim(), secret);
}

function normalizeEntry(date, body) {
  const photos = Array.isArray(body.photos)
    ? body.photos.filter((id) => UUID_RE.test(id)).slice(0, 50)
    : [];
  return {
    date,
    text: String(body.text || '').slice(0, 100000),
    photos,
    deleted: body.deleted === true,
    updatedAt: Date.now(),
  };
}

async function listEntries(env, since) {
  const keys = [];
  let cursor;
  do {
    const page = await env.LIMESTONE_KV.list({ prefix: JOURNAL_ENTRY_PREFIX, cursor });
    for (const k of page.keys) keys.push(k.name);
    cursor = page.list_complete ? null : page.cursor;
  } while (cursor);

  const entries = [];
  // KV has no bulk get; batch the reads so a few hundred entries don't open a
  // few hundred concurrent subrequests.
  for (let i = 0; i < keys.length; i += 25) {
    const chunk = await Promise.all(
      keys.slice(i, i + 25).map((k) => env.LIMESTONE_KV.get(k, 'json').catch(() => null))
    );
    for (const e of chunk) {
      // >= rather than >: an entry written in the same millisecond the cursor
      // was stamped must not fall through the gap. Re-sending a boundary entry
      // is harmless — the merge is idempotent.
      if (e && (!since || (e.updatedAt || 0) >= since)) entries.push(e);
    }
  }
  entries.sort((a, b) => (a.date < b.date ? 1 : -1));
  return entries;
}

async function handleJournal(request, env, url) {
  if (!journalAuthed(request, env)) {
    return json({ error: 'unauthorized' }, { status: 401 });
  }

  const rest = url.pathname.slice('/api/journal/'.length);
  const [section, id] = rest.split('/');

  if (section === 'entries') {
    if (!id) {
      if (request.method !== 'GET') {
        return json({ error: 'method not allowed' }, { status: 405 });
      }
      const since = Number(url.searchParams.get('since')) || 0;
      // Stamped before the read and handed back so the client's cursor comes
      // from this clock, not the device's. A device-stamped cursor compared
      // against server-stamped updatedAt silently skips every entry written
      // while the phone's clock ran ahead, and never asks for them again.
      // Anything written during the read lands at >= listedAt and so is picked
      // up on the next pull.
      const listedAt = Date.now();
      return json({ entries: await listEntries(env, since), now: listedAt });
    }

    if (!DATE_RE.test(id)) return json({ error: 'invalid date' }, { status: 400 });
    const key = JOURNAL_ENTRY_PREFIX + id;

    if (request.method === 'GET') {
      const e = await env.LIMESTONE_KV.get(key, 'json');
      return e ? json(e) : json({ error: 'not found' }, { status: 404 });
    }

    if (request.method === 'PUT') {
      const text = await request.text();
      if (text.length > MAX_ENTRY_BYTES) {
        return json({ error: 'entry too large' }, { status: 413 });
      }
      let body;
      try { body = JSON.parse(text); }
      catch { return json({ error: 'invalid json' }, { status: 400 }); }
      if (!body || typeof body !== 'object') {
        return json({ error: 'invalid entry' }, { status: 400 });
      }
      const entry = normalizeEntry(id, body);
      await env.LIMESTONE_KV.put(key, JSON.stringify(entry));
      return json(entry);
    }

    if (request.method === 'DELETE') {
      const entry = { date: id, text: '', photos: [], deleted: true, updatedAt: Date.now() };
      await env.LIMESTONE_KV.put(key, JSON.stringify(entry));
      return json(entry);
    }

    return json({ error: 'method not allowed' }, { status: 405 });
  }

  if (section === 'photos') {
    if (!id || !UUID_RE.test(id)) {
      return json({ error: 'invalid photo id' }, { status: 400 });
    }
    const photoKey = JOURNAL_PHOTO_PREFIX + id;

    if (request.method === 'PUT') {
      const type = request.headers.get('content-type') || '';
      if (!PHOTO_TYPES.has(type)) {
        return json({ error: 'unsupported image type' }, { status: 415 });
      }
      const bytes = await request.arrayBuffer();
      if (bytes.byteLength === 0) return json({ error: 'empty body' }, { status: 400 });
      if (bytes.byteLength > MAX_PHOTO_BYTES) {
        return json({ error: 'photo too large' }, { status: 413 });
      }
      // Photos live in KV rather than R2: R2 needs an account-level opt-in this
      // account doesn't have, and a downscaled journal photo (~20-200KB) is far
      // under KV's 25MB per-value ceiling. Mime type rides along as metadata.
      await env.LIMESTONE_KV.put(photoKey, bytes, { metadata: { type } });
      return json({ id, type, bytes: bytes.byteLength });
    }

    if (request.method === 'GET') {
      const hit = await env.LIMESTONE_KV.getWithMetadata(photoKey, { type: 'arrayBuffer' });
      if (!hit || !hit.value) return json({ error: 'not found' }, { status: 404 });
      return new Response(hit.value, {
        headers: {
          'content-type': (hit.metadata && hit.metadata.type) || 'application/octet-stream',
          'cache-control': 'private, max-age=31536000, immutable',
        },
      });
    }

    if (request.method === 'DELETE') {
      await env.LIMESTONE_KV.delete(photoKey);
      return json({ ok: true });
    }

    return json({ error: 'method not allowed' }, { status: 405 });
  }

  return json({ error: 'not found' }, { status: 404 });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/api/casino/stats') {
      return handleStats(request, env);
    }
    if (url.pathname === '/api/contact') {
      return handleContact(request, env);
    }
    if (url.pathname.startsWith('/api/journal/')) {
      return handleJournal(request, env, url);
    }
    if (url.pathname.startsWith('/api/')) {
      return json({ error: 'not found' }, { status: 404 });
    }
    return env.ASSETS.fetch(request);
  },
};
