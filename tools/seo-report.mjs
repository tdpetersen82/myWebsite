#!/usr/bin/env node
/**
 * Pulls Search Console + GA4 data via service-account auth. No npm deps.
 *
 * Setup (one time):
 *   1. Drop the service-account JSON key at ~/.config/limestone/google-service-account.json
 *      (outside the repo on purpose: tools/ is git-tracked and the repo root is
 *      served as Cloudflare assets, so a key in here would be public.)
 *   2. Add the service account's client_email as a user in Search Console
 *      and in GA4 Admin > Property Access Management (Viewer is enough).
 *   3. The GA4 property ID is discovered automatically via the Admin API. Only
 *      set it by hand if that lookup can't reach the right property:
 *      export GA4_PROPERTY_ID=123456789   (numeric, NOT the G-XXXX measurement ID)
 *
 * Requires these APIs enabled on the GCP project:
 *   searchconsole.googleapis.com, analyticsdata.googleapis.com,
 *   analyticsadmin.googleapis.com (the last only for property auto-discovery)
 *
 * Usage:
 *   node tools/seo-report.mjs                 # last 90 days
 *   node tools/seo-report.mjs --days 180
 *   node tools/seo-report.mjs --site sc-domain:limestonegames.com
 *   node tools/seo-report.mjs --out /some/dir
 */

import { createSign } from 'node:crypto';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const DEFAULT_KEY = join(homedir(), '.config', 'limestone', 'google-service-account.json');
const DEFAULT_OUT = join(homedir(), '.config', 'limestone', 'seo-data');

const SCOPES = [
    'https://www.googleapis.com/auth/webmasters.readonly',
    'https://www.googleapis.com/auth/analytics.readonly',
].join(' ');

// ---------------------------------------------------------------- args

function parseArgs(argv) {
    const args = { days: 90, key: process.env.GOOGLE_APPLICATION_CREDENTIALS || DEFAULT_KEY, out: DEFAULT_OUT, site: null, property: process.env.GA4_PROPERTY_ID || null };
    for (let i = 0; i < argv.length; i++) {
        const next = () => {
            const v = argv[i + 1];
            if (v === undefined || v.startsWith('--')) throw new Error(`${argv[i]} needs a value`);
            i++;
            return v;
        };
        switch (argv[i]) {
            case '--days': args.days = Number(next()); break;
            case '--key': args.key = next(); break;
            case '--out': args.out = next(); break;
            case '--site': args.site = next(); break;
            case '--property': args.property = next(); break;
            case '--help': case '-h': args.help = true; break;
            default: throw new Error(`unknown flag: ${argv[i]}`);
        }
    }
    if (!Number.isFinite(args.days) || args.days < 1) throw new Error('--days must be a positive number');
    return args;
}

// ---------------------------------------------------------------- auth

const b64url = (buf) => Buffer.from(buf).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

/** Mints a signed JWT and trades it for an OAuth access token. */
async function getAccessToken(creds) {
    const now = Math.floor(Date.now() / 1000);
    const header = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
    const claims = b64url(JSON.stringify({
        iss: creds.client_email,
        scope: SCOPES,
        aud: 'https://oauth2.googleapis.com/token',
        exp: now + 3600,
        iat: now,
    }));

    const signer = createSign('RSA-SHA256');
    signer.update(`${header}.${claims}`);
    const signature = b64url(signer.sign(creds.private_key));
    const assertion = `${header}.${claims}.${signature}`;

    const res = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion }),
    });
    const body = await res.json();
    if (!res.ok) throw new Error(`token exchange failed (${res.status}): ${JSON.stringify(body)}`);
    return body.access_token;
}

async function api(token, url, payload) {
    const res = await fetch(url, {
        method: payload ? 'POST' : 'GET',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: payload ? JSON.stringify(payload) : undefined,
    });
    const body = await res.json();
    if (!res.ok) {
        const msg = body?.error?.message || JSON.stringify(body);
        throw new Error(`${res.status} ${url.split('/').slice(-1)[0]}: ${msg}`);
    }
    return body;
}

// ---------------------------------------------------------------- dates

function dateRange(days) {
    // GSC data lags ~2 days; starting "today" would return empty tail rows.
    const end = new Date(Date.now() - 2 * 86400000);
    const start = new Date(end.getTime() - days * 86400000);
    const iso = (d) => d.toISOString().slice(0, 10);
    return { startDate: iso(start), endDate: iso(end) };
}

// ---------------------------------------------------------------- search console

async function listSites(token) {
    const body = await api(token, 'https://searchconsole.googleapis.com/webmasters/v3/sites');
    return body.siteEntry || [];
}

async function gscQuery(token, siteUrl, range, dimensions, rowLimit = 1000) {
    const body = await api(
        token,
        `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`,
        { ...range, dimensions, rowLimit, dataState: 'final' },
    );
    return (body.rows || []).map((r) => {
        const out = { clicks: r.clicks, impressions: r.impressions, ctr: r.ctr, position: r.position };
        dimensions.forEach((d, i) => { out[d] = r.keys[i]; });
        return out;
    });
}

// ---------------------------------------------------------------- ga4

/**
 * Resolves the numeric GA4 property ID via the Admin API, so nobody has to go
 * dig it out of the GA4 settings screen. Returns null if it can't be determined.
 */
async function discoverGa4Property(token) {
    const body = await api(token, 'https://analyticsadmin.googleapis.com/v1beta/accountSummaries');
    const props = (body.accountSummaries || []).flatMap((a) => (a.propertySummaries || []).map((p) => ({
        id: p.property.replace('properties/', ''),
        name: p.displayName,
        account: a.displayName,
    })));
    if (!props.length) return null;
    if (props.length > 1) {
        console.log('Multiple GA4 properties visible:');
        props.forEach((p) => console.log(`  ${p.id}  ${p.name} (${p.account})`));
        const match = props.find((p) => /limestone/i.test(p.name));
        if (match) {
            console.log(`Using ${match.id} (${match.name}); override with --property.\n`);
            return match.id;
        }
        console.log(`Using the first one; override with --property.\n`);
    }
    return props[0].id;
}

async function ga4Report(token, propertyId, range, dimensions, metrics, limit = 500) {
    const body = await api(token, `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`, {
        dateRanges: [{ startDate: range.startDate, endDate: range.endDate }],
        dimensions: dimensions.map((name) => ({ name })),
        metrics: metrics.map((name) => ({ name })),
        limit,
    });
    return (body.rows || []).map((r) => {
        const out = {};
        dimensions.forEach((d, i) => { out[d] = r.dimensionValues[i].value; });
        metrics.forEach((m, i) => { out[m] = Number(r.metricValues[i].value); });
        return out;
    });
}

// ---------------------------------------------------------------- reporting

const pct = (n) => `${(n * 100).toFixed(1)}%`;

function table(rows, cols, limit = 20) {
    if (!rows.length) return '  (no rows)';
    const shown = rows.slice(0, limit);
    const widths = cols.map((c) => Math.max(c.label.length, ...shown.map((r) => String(c.get(r)).length)));
    const line = (cells) => '  ' + cells.map((c, i) => (i === 0 ? String(c).padEnd(widths[i]) : String(c).padStart(widths[i]))).join('  ');
    return [
        line(cols.map((c) => c.label)),
        line(widths.map((w) => '-'.repeat(w))),
        ...shown.map((r) => line(cols.map((c) => c.get(r)))),
    ].join('\n');
}

const GSC_COLS = (key) => [
    { label: key, get: (r) => r[key] },
    { label: 'clicks', get: (r) => r.clicks },
    { label: 'impr', get: (r) => r.impressions },
    { label: 'ctr', get: (r) => pct(r.ctr) },
    { label: 'pos', get: (r) => r.position.toFixed(1) },
];

// ---------------------------------------------------------------- main

async function main() {
    const args = parseArgs(process.argv.slice(2));
    if (args.help) {
        console.log(readFileSync(new URL(import.meta.url)).toString().split('*/')[0].replace('#!/usr/bin/env node', '').trim());
        return;
    }

    let creds;
    try {
        creds = JSON.parse(readFileSync(args.key, 'utf8'));
    } catch (err) {
        console.error(`\nCould not read the service-account key at:\n  ${args.key}\n`);
        console.error('Place the JSON key there (or pass --key / set GOOGLE_APPLICATION_CREDENTIALS).');
        console.error(`Underlying error: ${err.message}\n`);
        process.exit(1);
    }
    if (!creds.client_email || !creds.private_key) {
        console.error('That JSON does not look like a service-account key (no client_email / private_key).');
        process.exit(1);
    }

    const range = dateRange(args.days);
    console.log(`\nService account: ${creds.client_email}`);
    console.log(`Range: ${range.startDate} -> ${range.endDate} (${args.days} days)\n`);

    const token = await getAccessToken(creds);
    mkdirSync(args.out, { recursive: true });
    const stamp = range.endDate;
    const save = (name, data) => {
        const path = join(args.out, `${name}-${stamp}.json`);
        writeFileSync(path, JSON.stringify(data, null, 2));
        return path;
    };

    const written = [];

    // ---- Search Console ----
    let sites = [];
    try {
        sites = await listSites(token);
    } catch (err) {
        console.error(`Search Console access failed: ${err.message}`);
        console.error(`Add ${creds.client_email} as a user in Search Console, then retry.\n`);
    }

    if (sites.length) {
        console.log('Search Console properties visible to this service account:');
        sites.forEach((s) => console.log(`  ${s.siteUrl}  (${s.permissionLevel})`));
        console.log();
    } else {
        // HTTP 200 with no sites means auth worked but nothing is shared with us.
        // (A disabled API would have thrown a 403 above instead.)
        console.log('Search Console returned 0 properties for this service account.');
        console.log('Auth is fine — the account just has not been granted access yet:');
        console.log(`  Search Console > Settings > Users and permissions > Add user`);
        console.log(`  ${creds.client_email}  (Restricted is enough)\n`);
    }

    const site = args.site
        || sites.find((s) => s.siteUrl.includes('limestonegames'))?.siteUrl
        || sites[0]?.siteUrl;

    if (site) {
        console.log(`=== SEARCH CONSOLE: ${site} ===\n`);
        const [queries, pages, dates, countries, devices] = await Promise.all([
            gscQuery(token, site, range, ['query']),
            gscQuery(token, site, range, ['page']),
            gscQuery(token, site, range, ['date']),
            gscQuery(token, site, range, ['country']),
            gscQuery(token, site, range, ['device']),
        ]);

        const totals = queries.reduce((a, r) => ({ clicks: a.clicks + r.clicks, impressions: a.impressions + r.impressions }), { clicks: 0, impressions: 0 });
        console.log(`Totals: ${totals.clicks} clicks, ${totals.impressions} impressions across ${queries.length} queries\n`);

        console.log('Top queries by impressions:');
        console.log(table([...queries].sort((a, b) => b.impressions - a.impressions), GSC_COLS('query')));

        console.log('\nStriking distance (position 5-25, ranked by impressions):');
        const striking = queries.filter((r) => r.position >= 5 && r.position <= 25).sort((a, b) => b.impressions - a.impressions);
        console.log(table(striking, GSC_COLS('query')));

        console.log('\nTop pages by impressions:');
        console.log(table([...pages].sort((a, b) => b.impressions - a.impressions), GSC_COLS('page')));

        console.log('\nTop countries:');
        console.log(table([...countries].sort((a, b) => b.impressions - a.impressions), GSC_COLS('country'), 8));

        console.log('\nDevices:');
        console.log(table(devices, GSC_COLS('device'), 5));

        written.push(save('gsc', { site, range, queries, pages, dates, countries, devices }));
    }

    // ---- GA4 ----
    if (!args.property) {
        try {
            args.property = await discoverGa4Property(token);
        } catch (err) {
            console.error(`\nCould not auto-discover the GA4 property: ${err.message}`);
            console.error('Pass --property <numeric id> explicitly, or enable the Analytics Admin API.');
        }
    }

    if (args.property) {
        console.log(`\n=== GA4: property ${args.property} ===\n`);
        try {
            const [byDate, byPage, byChannel] = await Promise.all([
                ga4Report(token, args.property, range, ['date'], ['sessions', 'totalUsers', 'screenPageViews']),
                ga4Report(token, args.property, range, ['pagePath'], ['screenPageViews', 'sessions', 'userEngagementDuration']),
                ga4Report(token, args.property, range, ['sessionDefaultChannelGroup'], ['sessions', 'totalUsers']),
            ]);

            const totals = byDate.reduce((a, r) => ({ sessions: a.sessions + r.sessions, users: a.users + r.totalUsers }), { sessions: 0, users: 0 });
            console.log(`Totals: ${totals.sessions} sessions, ${totals.users} users\n`);

            console.log('Traffic by channel:');
            console.log(table([...byChannel].sort((a, b) => b.sessions - a.sessions), [
                { label: 'channel', get: (r) => r.sessionDefaultChannelGroup },
                { label: 'sessions', get: (r) => r.sessions },
                { label: 'users', get: (r) => r.totalUsers },
            ], 12));

            console.log('\nTop pages by views:');
            console.log(table([...byPage].sort((a, b) => b.screenPageViews - a.screenPageViews), [
                { label: 'page', get: (r) => r.pagePath },
                { label: 'views', get: (r) => r.screenPageViews },
                { label: 'sessions', get: (r) => r.sessions },
                { label: 'avg sec', get: (r) => (r.sessions ? (r.userEngagementDuration / r.sessions).toFixed(0) : '0') },
            ]));

            written.push(save('ga4', { property: args.property, range, byDate, byPage, byChannel }));
        } catch (err) {
            console.error(`GA4 pull failed: ${err.message}`);
            console.error(`Add ${creds.client_email} as a Viewer in GA4 Admin > Property Access Management.`);
            console.error('Also confirm GA4_PROPERTY_ID is the numeric property ID, not the G-XXXX measurement ID.\n');
        }
    } else {
        console.log('\n(GA4 skipped: no property found. Pass --property <numeric id> or grant the');
        console.log(' service account Viewer access in GA4 Admin > Property Access Management.)');
    }

    if (written.length) {
        console.log(`\nRaw JSON written to:\n${written.map((p) => `  ${p}`).join('\n')}\n`);
    }
}

main().catch((err) => {
    console.error(`\nError: ${err.message}\n`);
    process.exit(1);
});
