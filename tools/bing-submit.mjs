#!/usr/bin/env node
// Push URLs into Bing's crawl queue via the URL Submission API.
// Bing indexes submitted URLs within hours, vs days-weeks for organic crawl —
// run this for every new page at publish time. Quota: 100/day for this site.
//
//   node tools/bing-submit.mjs https://limestonegames.com/printables/foo/ [...]
//   node tools/bing-submit.mjs --quota          # just show remaining quota
import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const KEY = readFileSync(join(homedir(), '.config', 'limestone', 'bing-api-key.txt'), 'utf8').trim();
const SITE = 'https://limestonegames.com/';
const BASE = 'https://ssl.bing.com/webmaster/api.svc/json';

async function call(method, { body, params } = {}) {
    const qs = new URLSearchParams({ apikey: KEY, ...(body ? {} : { siteUrl: SITE }), ...params });
    const res = await fetch(`${BASE}/${method}?${qs}`, body
        ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
        : { headers: { Accept: 'application/json' } });
    const text = await res.text();
    let json;
    try { json = JSON.parse(text); } catch { throw new Error(`${method}: HTTP ${res.status} — ${text.slice(0, 200)}`); }
    if (json.ErrorCode) throw new Error(`${method}: ${json.Message || json.ErrorCode}`);
    return json.d ?? json;
}

const args = process.argv.slice(2);
const quota = await call('GetUrlSubmissionQuota');
if (args[0] === '--quota' || !args.length) {
    console.log(`Bing URL submission quota — today: ${quota.DailyQuota}, this month: ${quota.MonthlyQuota}`);
    if (!args.length) console.log('Pass URLs to submit them.');
    process.exit(0);
}
const bad = args.filter((u) => !u.startsWith(SITE));
if (bad.length) {
    console.error(`Not under ${SITE}:\n  ${bad.join('\n  ')}`);
    process.exit(1);
}
if (args.length > quota.DailyQuota) {
    console.error(`${args.length} URLs but only ${quota.DailyQuota} quota left today.`);
    process.exit(1);
}
await call('SubmitUrlBatch', { body: { siteUrl: SITE, urlList: args } });
console.log(`${args.length} URL(s) submitted to Bing. Quota left today: ${quota.DailyQuota - args.length}.`);
