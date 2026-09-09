#!/usr/bin/env node
// Cloudflare's own traffic numbers for limestonegames.com — every request the
// edge served, not just the visitors who let GA4 load. Daily requests, page
// views, unique visitors, cache ratio and blocked threats for the last 14 days,
// then the most-requested HTML paths of the last 7 days.
//
//   node tools/cf-report.mjs            # last 14 days
//   node tools/cf-report.mjs --days 30
//
// Needs an API token (wrangler's OAuth login has no analytics scope):
//   Cloudflare dashboard → My Profile → API Tokens → Create Token → "Create Custom Token"
//   Permissions: Zone · Zone · Read   +   Zone · Analytics · Read
//   Zone Resources: Include · Specific zone · limestonegames.com
//   Save the token text (one line) to ~/.config/limestone/cloudflare-token.txt, mode 600.
// Raw JSON is written beside the GSC/GA4 snapshots in ~/.config/limestone/seo-data/.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const ZONE_NAME = 'limestonegames.com';
const TOKEN_PATH = join(homedir(), '.config', 'limestone', 'cloudflare-token.txt');
const OUT = join(homedir(), '.config', 'limestone', 'seo-data');
const dIdx = process.argv.indexOf('--days');
const days = Math.max(1, Math.min(90, (dIdx > 0 && +process.argv[dIdx + 1]) || 14));

if (!existsSync(TOKEN_PATH)) {
    console.log(`Cloudflare analytics: no token at ${TOKEN_PATH}`);
    console.log('Create one (dashboard → My Profile → API Tokens → Create Custom Token) with');
    console.log('  Zone · Zone · Read  +  Zone · Analytics · Read, scoped to limestonegames.com,');
    console.log('and save the token text to that file (chmod 600). Then rerun.');
    process.exit(2);
}
const token = readFileSync(TOKEN_PATH, 'utf8').trim();
const H = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

async function rest(path) {
    const r = await fetch('https://api.cloudflare.com/client/v4' + path, { headers: H });
    const b = await r.json();
    if (!r.ok || !b.success) throw new Error(`${path}: ${r.status} ${JSON.stringify(b.errors || b).slice(0, 300)}`);
    return b.result;
}
async function gql(query, variables) {
    const r = await fetch('https://api.cloudflare.com/client/v4/graphql', { method: 'POST', headers: H, body: JSON.stringify({ query, variables }) });
    const b = await r.json();
    if (b.errors && b.errors.length) throw new Error(b.errors.map((e) => e.message).join('; ').slice(0, 400));
    return b.data;
}
const iso = (d) => d.toISOString().slice(0, 10);
const pad = (s, n) => String(s).padStart(n);

const zones = await rest(`/zones?name=${ZONE_NAME}`);
if (!zones.length) { console.error(`The token can see no zone named ${ZONE_NAME} — check its Zone Resources.`); process.exit(1); }
const zone = zones[0].id;
const now = new Date(), since = new Date(now.getTime() - days * 86400000);
console.log(`\n=== CLOUDFLARE: ${ZONE_NAME} (zone ${zone.slice(0, 8)}…) — every request at the edge, GA4 consent or not ===\n`);

// ---- daily totals ----
const dailyQ = `query($zone:String!,$since:Date!,$until:Date!){ viewer { zones(filter:{zoneTag:$zone}) {
  daily: httpRequests1dGroups(limit:100, filter:{date_geq:$since, date_leq:$until}, orderBy:[date_ASC]) {
    dimensions { date } sum { requests pageViews bytes threats cachedRequests } uniq { uniques } } } } }`;
let daily = [];
try {
    const d = await gql(dailyQ, { zone, since: iso(since), until: iso(now) });
    daily = (d.viewer.zones[0] || {}).daily || [];
    console.log(`Last ${days} days by day (Cloudflare edge — the last day is partial):`);
    console.log(`  ${'date'.padEnd(10)} ${pad('requests', 9)} ${pad('pageviews', 9)} ${pad('uniques', 8)} ${pad('cached', 7)} ${pad('threats', 7)} ${pad('MB', 7)}`);
    for (const r of daily) {
        const s = r.sum, cached = s.requests ? Math.round(100 * s.cachedRequests / s.requests) + '%' : '—';
        console.log(`  ${r.dimensions.date} ${pad(s.requests, 9)} ${pad(s.pageViews, 9)} ${pad(r.uniq.uniques, 8)} ${pad(cached, 7)} ${pad(s.threats, 7)} ${pad((s.bytes / 1048576).toFixed(0), 7)}`);
    }
    const tot = daily.reduce((a, r) => ({ req: a.req + r.sum.requests, pv: a.pv + r.sum.pageViews, u: a.u + r.uniq.uniques }), { req: 0, pv: 0, u: 0 });
    console.log(`  total: ${tot.req} requests · ${tot.pv} page views · ${tot.u} daily-unique visitor-days (uniques do not add across days)\n`);
} catch (err) {
    console.log(`daily totals failed: ${err.message}\n`);
}

// ---- top HTML paths, last 7 days (adaptive groups are sampled, so treat counts as proportions).
// The free plan caps each adaptive query at a one-day range, so ask day by day and merge.
// Status 200 only: scanners probing /wp-login.php and .env files over plain http show up
// as 301 redirect hops and 403 blocks, not as pages we served.
const pathsQ = `query($zone:String!,$since:Time!,$until:Time!){ viewer { zones(filter:{zoneTag:$zone}) {
  paths: httpRequestsAdaptiveGroups(limit:60, filter:{datetime_geq:$since, datetime_lt:$until, requestSource:"eyeball", edgeResponseStatus:200, edgeResponseContentTypeName:"html"}, orderBy:[count_DESC]) {
    count dimensions { clientRequestPath } } } } }`;
let paths = [];
try {
    const byPath = new Map();
    for (let k = 7; k >= 1; k--) {
        const a = new Date(now.getTime() - k * 86400000), b = new Date(now.getTime() - (k - 1) * 86400000);
        const d = await gql(pathsQ, { zone, since: a.toISOString(), until: b.toISOString() });
        for (const p of (d.viewer.zones[0] || {}).paths || []) byPath.set(p.dimensions.clientRequestPath, (byPath.get(p.dimensions.clientRequestPath) || 0) + p.count);
    }
    paths = [...byPath.entries()].map(([path, count]) => ({ path, count })).sort((x, y) => y.count - x.count);
    console.log('Top HTML paths, last 7 days (browser requests at the edge, sampled — read as proportions):');
    for (const p of paths.slice(0, 30)) console.log(`  ${pad(p.count, 7)}  ${p.path}`);
    console.log();
} catch (err) {
    console.log(`top paths failed: ${err.message}\n`);
}

mkdirSync(OUT, { recursive: true });
const out = join(OUT, `cf-${iso(now)}.json`);
writeFileSync(out, JSON.stringify({ zone, days, daily, paths }, null, 2));
console.log(`Raw JSON written to: ${out}\n`);
