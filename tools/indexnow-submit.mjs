#!/usr/bin/env node
// Push URLs to IndexNow (Bing + all participating engines). Quota-free and
// instant, unlike the Bing Submit API's 100/day — use this on every deploy.
//
//   node tools/indexnow-submit.mjs <url> [url...]   ping specific URLs
//   node tools/indexnow-submit.mjs --all            ping every sitemap.xml URL
//
// The key file (<key>.txt in the site root) must be deployed and publicly
// fetchable BEFORE pinging, or engines treat the ping as unverified.

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const HOST = 'limestonegames.com';
const KEY = '6de73cf70d46ae9a5bb81375a1c82adc';
const ENDPOINT = 'https://api.indexnow.org/indexnow';

let urls = process.argv.slice(2);
if (urls[0] === '--all') {
    const sm = readFileSync(join(ROOT, 'sitemap.xml'), 'utf8');
    urls = [...sm.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]);
} else if (urls.length === 0) {
    console.error('usage: indexnow-submit.mjs <url> [url...] | --all');
    process.exit(1);
}

const bad = urls.filter(u => !u.startsWith(`https://${HOST}/`));
if (bad.length) {
    console.error('not this host, refusing:', bad.join(', '));
    process.exit(1);
}

// Guard: the key file must actually be live, or every ping is wasted.
const keyUrl = `https://${HOST}/${KEY}.txt`;
const check = await fetch(keyUrl);
if (!check.ok || (await check.text()).trim() !== KEY) {
    console.error(`ERROR: key file not live at ${keyUrl} — deploy first, then ping.`);
    process.exit(1);
}

const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify({ host: HOST, key: KEY, keyLocation: keyUrl, urlList: urls }),
});

// 200 = ok, 202 = accepted (key validation pending) — both are success.
if (res.status === 200 || res.status === 202) {
    console.log(`IndexNow accepted ${urls.length} URL(s) (HTTP ${res.status}).`);
} else {
    console.error(`IndexNow rejected: HTTP ${res.status} ${await res.text()}`);
    process.exit(1);
}
