// Cloudflare Worker: API + static asset fallthrough.
//
// Routes:
//   GET    /api/casino/stats   → return blob at casino:{deviceId} or empty
//   PUT    /api/casino/stats   → store blob, stamp updatedAt
//   DELETE /api/casino/stats   → delete blob (used by future "wipe cloud" UI)
// Anything else → static assets via env.ASSETS.
//
// Auth model: caller sends Authorization: Bearer {deviceId}. The deviceId is a
// 128-bit UUID generated client-side. It's a capability — anyone with it can
// read/write that device's stats. Stats are anonymous game scores, no PII.

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_BLOB_BYTES = 64 * 1024;

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

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/api/casino/stats') {
      return handleStats(request, env);
    }
    if (url.pathname.startsWith('/api/')) {
      return json({ error: 'not found' }, { status: 404 });
    }
    return env.ASSETS.fetch(request);
  },
};
