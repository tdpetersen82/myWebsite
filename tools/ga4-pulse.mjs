#!/usr/bin/env node
// GA4 pulse — the real-people daily view the 90-day seo-report does not print:
// sessions/users by day, sources this week vs last, custom events, JS errors by page/browser.
// Host-filtered to limestonegames.com (my localhost tests never count).
//   node tools/ga4-pulse.mjs            last 16 days
//   node tools/ga4-pulse.mjs /daily-orbit   + one page's daily line
import { createSign } from 'node:crypto'; import { readFileSync } from 'node:fs'; import { homedir } from 'node:os'; import { join } from 'node:path';
const KEY = join(homedir(), '.config', 'limestone', 'google-service-account.json'), PROP = '530341809';
const b64url = b => Buffer.from(b).toString('base64').replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
async function token(c){ const now=Math.floor(Date.now()/1000); const h=b64url(JSON.stringify({alg:'RS256',typ:'JWT'})); const cl=b64url(JSON.stringify({iss:c.client_email,scope:'https://www.googleapis.com/auth/analytics.readonly',aud:'https://oauth2.googleapis.com/token',exp:now+3600,iat:now})); const s=createSign('RSA-SHA256'); s.update(`${h}.${cl}`); const jwt=`${h}.${cl}.${b64url(s.sign(c.private_key))}`; const r=await fetch('https://oauth2.googleapis.com/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({grant_type:'urn:ietf:params:oauth:grant-type:jwt-bearer',assertion:jwt})}); const b=await r.json(); if(!r.ok) throw new Error(JSON.stringify(b)); return b.access_token; }
const HOST={filter:{fieldName:'hostName',stringFilter:{matchType:'ENDS_WITH',value:'limestonegames.com'}}};
async function rep(tok, dims, mets, start, end, extra={}){ const body={dateRanges:[{startDate:start,endDate:end}],dimensions:dims.map(name=>({name})),metrics:mets.map(name=>({name})),limit:100,dimensionFilter:HOST,...extra}; const r=await fetch(`https://analyticsdata.googleapis.com/v1beta/properties/${PROP}:runReport`,{method:'POST',headers:{Authorization:`Bearer ${tok}`,'Content-Type':'application/json'},body:JSON.stringify(body)}); const b=await r.json(); if(!r.ok) throw new Error(JSON.stringify(b)); return (b.rows||[]).map(row=>{const o={};dims.forEach((d,i)=>o[d]=row.dimensionValues[i].value);mets.forEach((m,i)=>o[m]=Number(row.metricValues[i].value));return o;}); }
const tok = await token(JSON.parse(readFileSync(KEY,'utf8')));

const page = process.argv[2];
const days = await rep(tok, ['date'], ['sessions','totalUsers','screenPageViews','userEngagementDuration'], '16daysAgo', 'today', { orderBys:[{dimension:{dimensionName:'date'}}] });
console.log('GA4 by day (real host): sessions · users · views · engaged time');
for (const r of days) console.log(`  ${r.date.slice(0,4)}-${r.date.slice(4,6)}-${r.date.slice(6)}  sess ${String(r.sessions).padStart(3)}  users ${String(r.totalUsers).padStart(3)}  views ${String(r.screenPageViews).padStart(4)}  ${(r.userEngagementDuration/3600).toFixed(1)} h`);
const full = days.filter(r => r !== days[days.length-1]);
const s = (a,k) => a.reduce((t,r) => t + r[k], 0), l7 = full.slice(-7), p7 = full.slice(-14,-7);
console.log(`  last 7 full days: ${(s(l7,'totalUsers')/7).toFixed(1)} users/day (prior 7: ${(s(p7,'totalUsers')/7).toFixed(1)}) · engaged ${(s(l7,'userEngagementDuration')/3600).toFixed(1)} h (prior ${(s(p7,'userEngagementDuration')/3600).toFixed(1)} h)`);
const srcNow = await rep(tok, ['sessionSource'], ['sessions'], '7daysAgo', 'yesterday', { orderBys:[{metric:{metricName:'sessions'},desc:true}], limit: 12 });
const srcPrev = await rep(tok, ['sessionSource'], ['sessions'], '14daysAgo', '8daysAgo');
const prev = Object.fromEntries(srcPrev.map(r => [r.sessionSource, r.sessions]));
console.log('\nSessions by source — last 7 full days vs the 7 before:');
for (const r of srcNow) console.log(`  ${r.sessionSource.slice(0,28).padEnd(28)} ${String(r.sessions).padStart(4)}   (prior: ${prev[r.sessionSource] || 0})`);
const ev = await rep(tok, ['eventName'], ['eventCount','totalUsers'], '7daysAgo', 'today', { orderBys:[{metric:{metricName:'eventCount'},desc:true}], limit: 40 });
const skip = new Set(['page_view','session_start','first_visit','user_engagement','scroll','click','form_start','form_submit','view_search_results','file_download']);
console.log('\nCustom events, last 7 days:');
for (const r of ev) if (!skip.has(r.eventName)) console.log(`  ${r.eventName.padEnd(18)} ${String(r.eventCount).padStart(5)} events · ${String(r.totalUsers).padStart(3)} users`);
const je = await rep(tok, ['date','pagePath','browser','operatingSystem'], ['eventCount','totalUsers'], '7daysAgo', 'today', { dimensionFilter:{andGroup:{expressions:[HOST,{filter:{fieldName:'eventName',stringFilter:{matchType:'EXACT',value:'js_error'}}}]}}, orderBys:[{dimension:{dimensionName:'date'}}] });
console.log('\njs_error by day/page/browser:');
for (const r of je) console.log(`  ${r.date.slice(4,6)}-${r.date.slice(6)} ${r.pagePath.padEnd(22)} ${(r.browser+'/'+r.operatingSystem).padEnd(22)} ${r.eventCount} ev · ${r.totalUsers} u`);
if (page) {
  const P = {filter:{fieldName:'pagePath',stringFilter:{matchType:'BEGINS_WITH',value:page}}};
  const d = await rep(tok, ['date'], ['totalUsers','sessions','userEngagementDuration'], '16daysAgo', 'today', { dimensionFilter:{andGroup:{expressions:[HOST,P]}}, orderBys:[{dimension:{dimensionName:'date'}}] });
  console.log(`\n${page} by day:`); for (const r of d) console.log(`  ${r.date.slice(4,6)}-${r.date.slice(6)} users ${String(r.totalUsers).padStart(3)} · sess ${String(r.sessions).padStart(3)} · ${Math.round(r.userEngagementDuration/Math.max(1,r.totalUsers))} s/user`);
}
