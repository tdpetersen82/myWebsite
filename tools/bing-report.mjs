#!/usr/bin/env node
/**
 * Pulls Bing Webmaster Tools data. Companion to seo-report.mjs — Bing is the
 * search engine actually sending this site traffic (~6x Google's users as of
 * 2026-08), so this is the more useful of the two reports.
 *
 * Setup (one time):
 *   1. Bing Webmaster Tools > gear icon > API Access > API Key > Generate.
 *   2. Store it WITHOUT pasting it anywhere it gets logged:
 *        read -s -p "Bing API key: " k \
 *          && printf '%s' "$k" > ~/.config/limestone/bing-api-key.txt \
 *          && chmod 600 ~/.config/limestone/bing-api-key.txt \
 *          && unset k && echo saved
 *
 * Usage:
 *   node tools/bing-report.mjs
 *   node tools/bing-report.mjs --site https://limestonegames.com
 *
 * Uses the JSON/REST endpoints (/api.svc/json/). The legacy SOAP and POX
 * endpoints retire 2026-08-31; the key and method names are unchanged.
 */

import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const DEFAULT_KEY_FILE = join(homedir(), '.config', 'limestone', 'bing-api-key.txt');
const DEFAULT_OUT = join(homedir(), '.config', 'limestone', 'seo-data');
const BASE = 'https://ssl.bing.com/webmaster/api.svc/json';

function parseArgs(argv) {
    const args = {
        site: 'https://limestonegames.com',
        keyFile: process.env.BING_API_KEY_FILE || DEFAULT_KEY_FILE,
        out: DEFAULT_OUT,
    };
    for (let i = 0; i < argv.length; i++) {
        const next = () => {
            const v = argv[i + 1];
            if (v === undefined || v.startsWith('--')) throw new Error(`${argv[i]} needs a value`);
            i++;
            return v;
        };
        switch (argv[i]) {
            case '--site': args.site = next(); break;
            case '--key-file': args.keyFile = next(); break;
            case '--out': args.out = next(); break;
            case '--help': case '-h': args.help = true; break;
            default: throw new Error(`unknown flag: ${argv[i]}`);
        }
    }
    return args;
}

/** WCF serialises dates as "/Date(1755561600000)/" and wraps payloads in "d". */
const wcfDate = (s) => {
    const m = /\/Date\((-?\d+)/.exec(s || '');
    return m ? new Date(Number(m[1])).toISOString().slice(0, 10) : null;
};

async function call(apikey, method, params = {}) {
    const qs = new URLSearchParams({ apikey, ...params });
    const res = await fetch(`${BASE}/${method}?${qs}`, { headers: { Accept: 'application/json' } });
    const text = await res.text();
    let body;
    try {
        body = JSON.parse(text);
    } catch {
        throw new Error(`${method}: non-JSON response (${res.status}): ${text.slice(0, 200)}`);
    }
    if (!res.ok || body.ErrorCode) {
        throw new Error(`${method}: ${body.Message || body.ErrorCode || res.status}`);
    }
    return body.d ?? body;
}

const table = (rows, cols, limit = 25) => {
    if (!rows.length) return '  (no rows)';
    const shown = rows.slice(0, limit);
    const w = cols.map((c) => Math.max(c.label.length, ...shown.map((r) => String(c.get(r)).length)));
    const line = (cells) => '  ' + cells.map((c, i) => (i === 0 ? String(c).padEnd(w[i]) : String(c).padStart(w[i]))).join('  ');
    return [
        line(cols.map((c) => c.label)),
        line(w.map((n) => '-'.repeat(n))),
        ...shown.map((r) => line(cols.map((c) => c.get(r)))),
    ].join('\n');
};

async function main() {
    const args = parseArgs(process.argv.slice(2));
    if (args.help) {
        console.log(readFileSync(new URL(import.meta.url)).toString().split('*/')[0].replace('#!/usr/bin/env node', '').trim());
        return;
    }

    let apikey;
    try {
        apikey = readFileSync(args.keyFile, 'utf8').trim();
    } catch {
        console.error(`\nNo Bing API key at:\n  ${args.keyFile}\n`);
        console.error('Get one from Bing Webmaster Tools > gear > API Access > API Key, then:');
        console.error(`  read -s -p "Bing API key: " k && printf '%s' "$k" > ${args.keyFile} && chmod 600 ${args.keyFile} && unset k\n`);
        process.exit(1);
    }
    if (!apikey) {
        console.error(`Key file ${args.keyFile} is empty.`);
        process.exit(1);
    }

    console.log(`\nSite: ${args.site}\n`);

    // Confirm the key works and the site is actually in this account.
    let sites;
    try {
        sites = await call(apikey, 'GetUserSites');
    } catch (err) {
        console.error(`Could not list sites: ${err.message}`);
        console.error('Check the API key, and that the site is verified in this Bing account.\n');
        process.exit(1);
    }
    const urls = (sites || []).map((s) => s.Url);
    console.log(`Sites in this account: ${urls.join(', ') || '(none)'}`);
    if (urls.length && !urls.some((u) => u.replace(/\/$/, '') === args.site.replace(/\/$/, ''))) {
        console.log(`\nWARNING: ${args.site} is not in that list. Pass --site with one of the above.`);
    }
    console.log();

    mkdirSync(args.out, { recursive: true });
    const collected = {};
    const soft = async (label, fn) => {
        try {
            return await fn();
        } catch (err) {
            console.log(`${label}: unavailable (${err.message})`);
            return null;
        }
    };

    // ---- traffic over time ----
    const traffic = await soft('Rank & traffic', () => call(apikey, 'GetRankAndTrafficStats', { siteUrl: args.site }));
    if (traffic?.length) {
        const rows = traffic.map((r) => ({ date: wcfDate(r.Date), clicks: r.Clicks, impressions: r.Impressions })).filter((r) => r.date);
        rows.sort((a, b) => a.date.localeCompare(b.date));
        const months = {};
        for (const r of rows) {
            const k = r.date.slice(0, 7);
            (months[k] ??= { clicks: 0, impressions: 0 });
            months[k].clicks += r.clicks;
            months[k].impressions += r.impressions;
        }
        console.log('=== BING TRAFFIC BY MONTH ===');
        console.log(table(Object.entries(months).map(([month, v]) => ({ month, ...v })), [
            { label: 'month', get: (r) => r.month },
            { label: 'clicks', get: (r) => r.clicks },
            { label: 'impressions', get: (r) => r.impressions },
            { label: 'ctr', get: (r) => (r.impressions ? `${((r.clicks / r.impressions) * 100).toFixed(1)}%` : '-') },
        ], 24));
        const tot = rows.reduce((a, r) => ({ c: a.c + r.clicks, i: a.i + r.impressions }), { c: 0, i: 0 });
        console.log(`\nTotal: ${tot.c} clicks, ${tot.i} impressions\n`);
        collected.traffic = rows;
    }

    // ---- queries ----
    const queries = await soft('Query stats', () => call(apikey, 'GetQueryStats', { siteUrl: args.site }));
    if (queries?.length) {
        const rows = queries.map((r) => ({
            query: r.Query,
            clicks: r.Clicks,
            impressions: r.Impressions,
            avgPos: r.AvgImpressionPosition,
            avgClickPos: r.AvgClickPosition,
        }));
        console.log('=== TOP BING QUERIES (by impressions) ===');
        console.log(table([...rows].sort((a, b) => b.impressions - a.impressions), [
            { label: 'query', get: (r) => r.query },
            { label: 'clicks', get: (r) => r.clicks },
            { label: 'impr', get: (r) => r.impressions },
            { label: 'pos', get: (r) => (r.avgPos ?? 0).toFixed(1) },
        ]));

        // The band worth acting on: close enough to page 1 that effort pays.
        const striking = rows.filter((r) => r.avgPos >= 4 && r.avgPos <= 25).sort((a, b) => b.impressions - a.impressions);
        console.log('\n=== BING STRIKING DISTANCE (pos 4-25) ===');
        console.log(table(striking, [
            { label: 'query', get: (r) => r.query },
            { label: 'clicks', get: (r) => r.clicks },
            { label: 'impr', get: (r) => r.impressions },
            { label: 'pos', get: (r) => (r.avgPos ?? 0).toFixed(1) },
        ]));
        console.log();
        collected.queries = rows;
    }

    // ---- pages ----
    const pages = await soft('Page stats', () => call(apikey, 'GetPageStats', { siteUrl: args.site }));
    if (pages?.length) {
        const rows = pages.map((r) => ({ page: r.Query || r.Url, clicks: r.Clicks, impressions: r.Impressions, avgPos: r.AvgImpressionPosition }));
        console.log('=== TOP BING PAGES ===');
        console.log(table([...rows].sort((a, b) => b.impressions - a.impressions), [
            { label: 'page', get: (r) => r.page },
            { label: 'clicks', get: (r) => r.clicks },
            { label: 'impr', get: (r) => r.impressions },
            { label: 'pos', get: (r) => (r.avgPos ?? 0).toFixed(1) },
        ]));
        console.log();
        collected.pages = rows;
    }

    // ---- crawl / index health ----
    const crawl = await soft('Crawl stats', () => call(apikey, 'GetCrawlStats', { siteUrl: args.site }));
    if (crawl?.length) {
        const recent = crawl.map((r) => ({ date: wcfDate(r.Date), crawled: r.CrawledPages, inIndex: r.InIndex, blocked: r.BlockedByRobotsTxt, errors: r.CrawlErrors, notFound: r.CodeNotFound }))
            .filter((r) => r.date).sort((a, b) => b.date.localeCompare(a.date));
        console.log('=== CRAWL / INDEX (most recent days) ===');
        console.log(table(recent, [
            { label: 'date', get: (r) => r.date },
            { label: 'crawled', get: (r) => r.crawled ?? 0 },
            { label: 'in index', get: (r) => r.inIndex ?? 0 },
            { label: '404s', get: (r) => r.notFound ?? 0 },
            { label: 'blocked', get: (r) => r.blocked ?? 0 },
        ], 10));
        console.log();
        collected.crawl = recent;
    }

    if (Object.keys(collected).length) {
        const stamp = new Date().toISOString().slice(0, 10);
        const path = join(args.out, `bing-${stamp}.json`);
        writeFileSync(path, JSON.stringify({ site: args.site, ...collected }, null, 2));
        console.log(`Raw JSON written to:\n  ${path}\n`);
    } else {
        console.log('No data returned yet. Bing needs time to populate after verification —');
        console.log('typically a few days before query and traffic reports appear.\n');
    }
}

main().catch((err) => {
    console.error(`\nError: ${err.message}\n`);
    process.exit(1);
});
