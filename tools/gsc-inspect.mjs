#!/usr/bin/env node
// Ask Google's URL Inspection API what it thinks of specific pages — index
// verdict, coverage state, last crawl time, whether it's in a sitemap, and how
// many referring URLs Google knows. Uses the same service account as
// seo-report.mjs. This is the fastest way to tell "not ranking" from
// "never crawled" — which on this domain is usually the answer.
//
//   node tools/gsc-inspect.mjs /roulette/ /solar-system/ /printables/football-squares/
//
import { createSign } from 'node:crypto'; import { readFileSync } from 'node:fs'; import { homedir } from 'node:os'; import { join } from 'node:path';
const KEY = join(homedir(), '.config', 'limestone', 'google-service-account.json'), SITE = 'sc-domain:limestonegames.com';
const b64url = b => Buffer.from(b).toString('base64').replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
async function token(c){ const now=Math.floor(Date.now()/1000); const h=b64url(JSON.stringify({alg:'RS256',typ:'JWT'})); const cl=b64url(JSON.stringify({iss:c.client_email,scope:'https://www.googleapis.com/auth/webmasters.readonly',aud:'https://oauth2.googleapis.com/token',exp:now+3600,iat:now})); const s=createSign('RSA-SHA256'); s.update(`${h}.${cl}`); const jwt=`${h}.${cl}.${b64url(s.sign(c.private_key))}`; const r=await fetch('https://oauth2.googleapis.com/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({grant_type:'urn:ietf:params:oauth:grant-type:jwt-bearer',assertion:jwt})}); const b=await r.json(); if(!r.ok) throw new Error(JSON.stringify(b)); return b.access_token; }
const tok = await token(JSON.parse(readFileSync(KEY,'utf8')));
const urls = process.argv.slice(2).map(p => 'https://limestonegames.com' + p);
for (const u of urls){
  const r = await fetch('https://searchconsole.googleapis.com/v1/urlInspection/index:inspect',{method:'POST',headers:{Authorization:`Bearer ${tok}`,'Content-Type':'application/json'},body:JSON.stringify({inspectionUrl:u, siteUrl:SITE, languageCode:'en-US'})});
  const b = await r.json();
  if (!r.ok){ console.log(u.replace('https://limestonegames.com',''), '→ API error', r.status, (b.error&&b.error.message||'').slice(0,140)); continue; }
  const i = b.inspectionResult.indexStatusResult || {};
  console.log(`${u.replace('https://limestonegames.com','').padEnd(36)} verdict=${i.verdict} · ${i.coverageState} · indexing=${i.indexingState} · robots=${i.robotsTxtState} · fetch=${i.pageFetchState} · lastCrawl=${i.lastCrawlTime||'never'} · sitemaps=${(i.sitemap||[]).length} · referring=${(i.referringUrls||[]).length}`);
}
