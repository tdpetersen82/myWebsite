#!/usr/bin/env node
// Search-index drift check: every printable/utility page in sitemap.xml must
// have an LG_EXTRAS entry in games-catalog.js (and vice versa), or site search
// silently can't find it. Run after adding a printable, tool, or game.
//
//   node tools/check-search-index.mjs      exits 1 on drift

import { readFileSync } from 'node:fs';

const sitemap = readFileSync(new URL('../sitemap.xml', import.meta.url), 'utf8');
const catalog = readFileSync(new URL('../games-catalog.js', import.meta.url), 'utf8');

const w = {};
new Function('window', catalog)(w);

const siteUrls = [...sitemap.matchAll(/<loc>https:\/\/limestonegames\.com(\/[^<]*)<\/loc>/g)].map(m => m[1]);
const sitePages = new Set(siteUrls);

// Sub-pages of the two hubs are what LG_EXTRAS must cover; the hubs themselves
// are nav chrome, and /feedback/ is noindexed by design.
const wantExtras = siteUrls.filter(u =>
  /^\/(printables|utilities)\/.+/.test(u));

const extras = new Set((w.LG_EXTRAS || []).map(x => x.url));
const games = new Set((w.LG_GAMES || []).map(g => g.url || `/${g.id}/`));

let bad = 0;
for (const u of wantExtras) {
  if (!extras.has(u)) { console.log(`MISSING from LG_EXTRAS: ${u}`); bad++; }
}
for (const u of extras) {
  if (u === '/feedback/') continue;
  if (!sitePages.has(u)) { console.log(`STALE in LG_EXTRAS (not in sitemap): ${u}`); bad++; }
}
for (const u of games) {
  // sitemap lists clean URLs, so /dogs/play.html appears there as /dogs/play
  const page = u.endsWith('.html') ? u : u.replace(/\/?$/, '/');
  if (!sitePages.has(page) && !sitePages.has(page.replace(/\.html$/, ''))) {
    console.log(`note: game not in sitemap: ${u}`);
  }
}

if (bad) {
  console.error(`\n${bad} drift issue(s) — update LG_EXTRAS in games-catalog.js.`);
  process.exit(1);
}
console.log(`OK — ${wantExtras.length} hub sub-pages all indexed, ${extras.size} extras entries all live.`);
