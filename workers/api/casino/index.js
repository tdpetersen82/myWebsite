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
const MAX_CONTACT_BYTES = 8 * 1024;

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

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/api/casino/stats') {
      return handleStats(request, env);
    }
    if (url.pathname === '/api/contact') {
      return handleContact(request, env);
    }
    if (url.pathname.startsWith('/api/')) {
      return json({ error: 'not found' }, { status: 404 });
    }
    return env.ASSETS.fetch(request);
  },
};
