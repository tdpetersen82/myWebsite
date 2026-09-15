#!/usr/bin/env node
// Zero-dependency static server for local testing: node tools/serve.mjs [port]
// (python3 -m http.server is unusable whenever Xcode wants its license re-accepted.)
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(new URL('..', import.meta.url).pathname);
const port = Number(process.argv[2] || process.env.PORT || 8099);
const types = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript',
  '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.webp': 'image/webp', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.xml': 'application/xml',
  '.txt': 'text/plain', '.woff2': 'font/woff2', '.mp3': 'audio/mpeg', '.wasm': 'application/wasm',
};

http.createServer((req, res) => {
  // Dev-only: POST /__save {path, dataUrl} writes a browser-rendered asset
  // under assets/ (how the Dynamine tile + OG card are produced without PIL).
  if (req.method === 'POST' && req.url === '/__save') {
    let body = '';
    req.on('data', c => { body += c; });
    req.on('end', () => {
      try {
        const { path: rel, dataUrl } = JSON.parse(body);
        const out = path.join(root, rel);
        if (!out.startsWith(path.join(root, 'assets')) && !out.startsWith(path.join(root, 'tools'))) throw new Error('path must be under assets/ or tools/');
        fs.mkdirSync(path.dirname(out), { recursive: true });
        fs.writeFileSync(out, Buffer.from(dataUrl.split(',')[1], 'base64'));
        res.writeHead(200, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ ok: true, bytes: fs.statSync(out).size }));
      } catch (e) { res.writeHead(400); res.end(String(e.message)); }
    });
    return;
  }
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (p.endsWith('/')) p += 'index.html';
  const file = path.join(root, p);
  if (!file.startsWith(root)) { res.writeHead(403); return res.end(); }
  fs.stat(file, (err, st) => {
    if (!err && st.isDirectory()) { res.writeHead(301, { Location: p + '/' }); return res.end(); }
    if (err) { res.writeHead(404, { 'Content-Type': 'text/plain' }); return res.end('404 ' + p); }
    res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    fs.createReadStream(file).pipe(res);
  });
}).listen(port, () => console.log(`serving ${root} on http://localhost:${port}/`));
