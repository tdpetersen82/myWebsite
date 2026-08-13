// Cross-checks dogs/breeds.js against outside sources and internal logic.
// This is the fact-check the test suites deliberately do NOT do: they verify
// schema and behaviour, this verifies the claims.
//
//   node tools/check-breed-facts.js            # internal checks only (offline)
//   node tools/check-breed-facts.js --online   # + Wikidata country of origin
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const win = {};
new Function('window', fs.readFileSync(path.join(ROOT, 'dogs', 'breeds.js'), 'utf8'))(win); // eslint-disable-line
const BREEDS = win.DOG_BREEDS;

const UA = 'LimestoneGames-BreedFinder/1.0 (https://limestonegames.com) fact-check';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const flags = [];
function flag(severity, breed, msg) { flags.push({ severity, breed, msg }); }

// ── Internal consistency ─────────────────────────────────────────────────
// These catch transcription slips: a weight that contradicts the size class,
// a giant breed shorter than a terrier, a lifespan outside anything real.
console.log('Internal consistency\n');

const SIZE_WEIGHT = {           // plausible mid-weight window per size class
  toy: [2, 20], small: [8, 40], medium: [20, 70], large: [40, 130], giant: [80, 240],
};
const SIZE_HEIGHT = {
  toy: [5, 16], small: [8, 20], medium: [12, 24], large: [17, 32], giant: [24, 36],
};

BREEDS.forEach((b) => {
  const [wLo, wHi] = SIZE_WEIGHT[b.size];
  const [hLo, hHi] = SIZE_HEIGHT[b.size];
  const midW = (b.weightLb[0] + b.weightLb[1]) / 2;
  const midH = (b.heightIn[0] + b.heightIn[1]) / 2;

  if (midW < wLo || midW > wHi) {
    flag('check', b.name, `size "${b.size}" but mid-weight ${midW} lb (expected ~${wLo}–${wHi})`);
  }
  if (midH < hLo || midH > hHi) {
    flag('check', b.name, `size "${b.size}" but mid-height ${midH}" (expected ~${hLo}–${hHi})`);
  }
  if (b.lifespan[0] < 5 || b.lifespan[1] > 20) {
    flag('check', b.name, `lifespan ${b.lifespan.join('–')} yrs looks out of range`);
  }
  if (b.lifespan[1] - b.lifespan[0] > 8) {
    flag('check', b.name, `lifespan span ${b.lifespan.join('–')} is suspiciously wide`);
  }
  if (b.weightLb[1] / b.weightLb[0] > 6) {
    flag('check', b.name, `weight range ${b.weightLb.join('–')} lb is suspiciously wide`);
  }
  // Giant breeds are the ones with genuinely short lives; a giant listed as
  // long-lived is usually a copy error.
  if (b.size === 'giant' && b.lifespan[1] > 14) {
    flag('check', b.name, `giant breed with lifespan up to ${b.lifespan[1]} yrs`);
  }
  if (b.coat === 'hairless' && b.shedding > 1) {
    flag('check', b.name, `hairless but shedding ${b.shedding}`);
  }
  if (b.hypoallergenic && b.coat === 'short' && b.coatTexture === 'double') {
    flag('check', b.name, 'hypoallergenic with a short double coat is contradictory');
  }
});

const internalCount = flags.length;
console.log(`  ${BREEDS.length} breeds checked, ${internalCount} to review\n`);

// ── Wikidata country of origin ───────────────────────────────────────────
// P495 is well-populated for dog breeds and is the single most checkable
// field in the database.
const TITLE_OVERRIDE = JSON.parse(fs.readFileSync(path.join(__dirname, 'breed-photos.manifest.json'), 'utf8'))
  .reduce((acc, r) => { acc[r.slug] = r.title; return acc; }, {});

// My origin strings are prose ("Scotland / England"); Wikidata gives modern
// states. Treat constituent countries as matching their sovereign state.
const EQUIV = {
  'united kingdom': ['england', 'scotland', 'wales', 'northern ireland', 'great britain', 'britain'],
  'england': ['united kingdom', 'great britain', 'britain'],
  'scotland': ['united kingdom', 'great britain', 'britain'],
  'wales': ['united kingdom', 'great britain', 'britain'],
  'russia': ['soviet union', 'russian empire', 'siberia'],
  'soviet union': ['russia', 'siberia'],
  'russian empire': ['russia', 'siberia'],
  'siberia': ['russia', 'soviet union', 'russian empire'],
  'united states': ['united states of america', 'usa', 'alaska'],
  'united states of america': ['united states', 'usa', 'alaska'],
  'china': ['tibet', "people's republic of china", 'qing dynasty'],
  'tibet': ['china'],
  'germany': ['prussia', 'german empire', 'kingdom of prussia', 'weimar republic'],
  'mexico': ['aztec empire'],
  'democratic republic of the congo': ['central africa', 'congo'],
  'zimbabwe': ['southern africa', 'south africa', 'rhodesia'],
  'south africa': ['southern africa', 'zimbabwe'],
  'malta': ['mediterranean'],
  'croatia': ['dalmatia'],
  'hungary': ['austria-hungary'],
  'czech republic': ['czechoslovakia', 'bohemia'],
  'ireland': ['united kingdom'],
  'france': ['kingdom of france'],
  'japan': ['empire of japan'],
  'canada': ['newfoundland', 'nova scotia', 'newfoundland and labrador'],
  'belgium': ['flanders'],
  'netherlands': ['holland'],
  'afghanistan': ['central asia'],
  'turkey': ['anatolia', 'ottoman empire'],
  'iran': ['persia', 'middle east', 'fertile crescent'],
};

function tokens(s) {
  return String(s).toLowerCase().split(/[/,()]|\band\b|\bor\b/).map((t) => t.trim()).filter(Boolean);
}
function originMatches(mine, theirs) {
  const a = tokens(mine), b = theirs.map((t) => t.toLowerCase().trim());
  for (const x of a) {
    for (const y of b) {
      if (x === y || x.includes(y) || y.includes(x)) return true;
      if ((EQUIV[x] || []).some((e) => e === y || y.includes(e))) return true;
      if ((EQUIV[y] || []).some((e) => e === x || x.includes(e))) return true;
    }
  }
  return false;
}

async function api(url) {
  for (let i = 0; i < 4; i++) {
    const res = await fetch(url, { headers: { 'User-Agent': UA } });
    const text = await res.text();
    if (res.ok) { try { return JSON.parse(text); } catch (e) { /* throttled */ } }
    await sleep(1200 * (i + 1));
  }
  throw new Error('API unavailable: ' + url);
}

function chunk(arr, n) {
  const out = [];
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n));
  return out;
}

async function checkOrigins() {
  console.log('Wikidata country of origin (P495)\n');

  // Wikipedia title → Wikidata item id
  const titleFor = {};
  BREEDS.forEach((b) => { titleFor[b.slug] = TITLE_OVERRIDE[b.slug] || b.name; });
  const byTitle = {};
  for (const group of chunk(BREEDS, 40)) {
    const titles = group.map((b) => titleFor[b.slug]).join('|');
    const j = await api('https://en.wikipedia.org/w/api.php?format=json&action=query&redirects=1&prop=pageprops&ppprop=wikibase_item&titles=' + encodeURIComponent(titles));
    Object.values(j.query.pages || {}).forEach((p) => {
      if (p.pageprops && p.pageprops.wikibase_item) byTitle[p.title] = p.pageprops.wikibase_item;
    });
    // Follow redirects back to the requested title.
    (j.query.redirects || []).forEach((r) => { if (byTitle[r.to]) byTitle[r.from] = byTitle[r.to]; });
    (j.query.normalized || []).forEach((r) => { if (byTitle[r.to]) byTitle[r.from] = byTitle[r.to]; });
    await sleep(400);
  }

  const ids = [...new Set(Object.values(byTitle))];
  const claims = {};
  const labelIds = new Set();
  for (const group of chunk(ids, 40)) {
    const j = await api('https://www.wikidata.org/w/api.php?format=json&action=wbgetentities&props=claims&ids=' + group.join('|'));
    Object.entries(j.entities || {}).forEach(([id, ent]) => {
      const p495 = (ent.claims && ent.claims.P495) || [];
      claims[id] = p495
        .map((c) => c.mainsnak && c.mainsnak.datavalue && c.mainsnak.datavalue.value && c.mainsnak.datavalue.value.id)
        .filter(Boolean);
      claims[id].forEach((q) => labelIds.add(q));
    });
    await sleep(400);
  }

  const labels = {};
  for (const group of chunk([...labelIds], 40)) {
    const j = await api('https://www.wikidata.org/w/api.php?format=json&action=wbgetentities&props=labels&languages=en&ids=' + group.join('|'));
    Object.entries(j.entities || {}).forEach(([id, ent]) => {
      labels[id] = (ent.labels && ent.labels.en && ent.labels.en.value) || id;
    });
    await sleep(400);
  }

  let matched = 0, noData = 0, mismatched = 0;
  const unverified = [];
  BREEDS.forEach((b) => {
    const qid = byTitle[titleFor[b.slug]];
    const countries = ((qid && claims[qid]) || []).map((q) => labels[q]).filter(Boolean);
    if (!countries.length) { noData++; unverified.push(`${b.name} (${b.origin})`); return; }
    if (originMatches(b.origin, countries)) matched++;
    else {
      mismatched++;
      flag('MISMATCH', b.name, `origin "${b.origin}" vs Wikidata "${countries.join(', ')}"`);
    }
  });

  console.log(`  ${matched} agree, ${mismatched} disagree, ${noData} had no P495 to compare\n`);
  if (unverified.length) {
    console.log('  Not verifiable against Wikidata (no country claim) — these remain unchecked:');
    unverified.forEach((u) => console.log('    ' + u));
    console.log('');
  }
}

// ── Fact claims ──────────────────────────────────────────────────────────
// `fact` is the highest-risk field: specific, checkable assertions. Pull each
// breed's Wikipedia article and look for corroborating tokens. A miss is not
// proof of error — it's a prompt to go read the sentence.
const NUMWORD = {
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9,
  ten: 10, eleven: 11, twelve: 12, fifteen: 15, twenty: 20, thirty: 30, forty: 40,
  fifty: 50, hundred: 100, thousand: 1000,
};

function claimTokens(fact) {
  const out = new Set();
  (fact.match(/\b\d[\d,]*\b/g) || []).forEach((n) => {
    const bare = n.replace(/,/g, '');
    out.add(bare);
    // Articles write "14,000"; stripping the comma loses the match.
    if (bare.length > 3) out.add(Number(bare).toLocaleString('en-US'));
  });
  Object.keys(NUMWORD).forEach((w) => {
    if (new RegExp('\\b' + w + '\\b', 'i').test(fact)) {
      out.add(String(NUMWORD[w]));
      out.add(w);
    }
  });
  // Proper nouns, minus the sentence-initial word.
  (fact.match(/\b[A-Z][a-z]{3,}\b/g) || []).forEach((w) => {
    if (fact.indexOf(w) === 0) return;
    out.add(w);
    // "Germans" in my prose vs "German" in the article, and vice versa.
    if (w.endsWith('s')) out.add(w.slice(0, -1));
    if (w.endsWith('ish')) out.add(w.slice(0, -3));
  });
  return [...out];
}

function corroborates(text, tok) {
  // Case-insensitive so "Latin"/"latin" and "Roman"/"roman" both count.
  return text.toLowerCase().includes(String(tok).toLowerCase());
}

// Numbers and proper nouns only reach about 60% of the facts — the rest are
// plain prose ("the sound it makes instead is a yodel"). For those, check the
// distinctive content words instead, and require more than one to land so a
// single common word can't pass a claim on its own.
const COMMON = new Set([
  'about', 'after', 'against', 'almost', 'along', 'another', 'anyone', 'around',
  'because', 'before', 'below', 'between', 'breed', 'breeds', 'brought', 'called',
  'comes', 'could', 'dogs', 'during', 'every', 'first', 'found', 'instead',
  'into', 'itself', 'known', 'later', 'little', 'looks', 'makes', 'means', 'might',
  'more', 'most', 'much', 'name', 'named', 'never', 'other', 'others', 'over',
  'own', 'people', 'rather', 'right', 'same', 'several', 'since', 'small',
  'still', 'take', 'takes', 'than', 'that', 'their', 'them', 'then', 'there',
  'these', 'they', 'thing', 'this', 'those', 'through', 'time', 'until', 'used',
  'using', 'very', 'were', 'what', 'when', 'where', 'which', 'while', 'whole',
  'with', 'without', 'would', 'years', 'your',
]);

function keywordTokens(fact) {
  return [...new Set(
    fact.toLowerCase().replace(/[^a-z\s-]/g, ' ').split(/\s+/)
      .filter((w) => w.length > 4 && !COMMON.has(w))
  )];
}

async function checkFacts() {
  console.log('Fact claims vs Wikipedia article text\n');
  const titleFor = {};
  BREEDS.forEach((b) => { titleFor[b.slug] = TITLE_OVERRIDE[b.slug] || b.name; });

  // Cache the article text so re-runs (and reviewing individual claims) don't
  // re-hammer the API. Lives outside the repo — it's ~5 MB of scratch.
  const CACHE = path.join(process.env.TMPDIR || '/tmp', 'breed-extracts.json');
  let extracts = {};
  if (fs.existsSync(CACHE) && !process.argv.includes('--refetch')) {
    extracts = JSON.parse(fs.readFileSync(CACHE, 'utf8'));
    if (Object.keys(extracts).length >= BREEDS.length) {
      console.log('  (using cached article text; --refetch to renew)\n');
      return finishFacts(extracts);
    }
  }
  // Whole-article extracts are hard-capped at ONE title per request — the API
  // silently lowers exlimit to 1 and returns empty extracts for the rest,
  // which reads as "unsupported" for every breed but the first in a batch.
  for (let i = 0; i < BREEDS.length; i++) {
    const b = BREEDS[i];
    const j = await api('https://en.wikipedia.org/w/api.php?format=json&action=query&redirects=1&prop=extracts&explaintext=1&exsectionformat=plain&titles=' + encodeURIComponent(titleFor[b.slug]));
    const page = Object.values((j.query && j.query.pages) || {})[0];
    extracts[b.slug] = (page && page.extract) || '';
    process.stdout.write(`\r  fetching articles ${i + 1}/${BREEDS.length}`);
    await sleep(250);
  }
  process.stdout.write('\r' + ' '.repeat(40) + '\r');
  fs.writeFileSync(CACHE, JSON.stringify(extracts));
  return finishFacts(extracts);
}

function finishFacts(extracts) {

  let corroborated = 0, noTokens = 0;
  const unsupported = [];
  BREEDS.forEach((b) => {
    const text = extracts[b.slug];
    if (!text) { unsupported.push({ name: b.name, why: 'no article text', fact: b.fact }); return; }
    const toks = claimTokens(b.fact);
    if (toks.length) {
      const hits = toks.filter((t) => corroborates(text, t));
      if (hits.length) { corroborated++; return; }
      unsupported.push({ name: b.name, why: 'no token found: ' + toks.slice(0, 5).join(', '), fact: b.fact });
      return;
    }
    // Fall back to keyword overlap for prose-only facts.
    const kw = keywordTokens(b.fact);
    if (!kw.length) { noTokens++; return; }
    const kwHits = kw.filter((t) => corroborates(text, t));
    if (kwHits.length >= 2) { corroborated++; return; }
    unsupported.push({
      name: b.name,
      why: `only ${kwHits.length}/${kw.length} keywords matched` + (kwHits.length ? ` (${kwHits.join(', ')})` : ''),
      fact: b.fact,
    });
  });

  console.log(`  ${corroborated} facts corroborated, ${unsupported.length} unsupported, ${noTokens} had no checkable token\n`);
  if (unsupported.length) {
    console.log(`  Facts with no corroboration in the article (${unsupported.length}) — read these:`);
    unsupported.forEach((u) => {
      console.log(`    ${u.name}  [${u.why}]`);
      console.log(`      "${u.fact}"`);
    });
    console.log('');
  }
}

(async () => {
  if (process.argv.includes('--online')) {
    try { await checkOrigins(); }
    catch (e) { console.log('  origin check failed: ' + e.message + '\n'); }
    try { await checkFacts(); }
    catch (e) { console.log('  fact check failed: ' + e.message + '\n'); }
  }

  const mismatches = flags.filter((f) => f.severity === 'MISMATCH');
  const reviews = flags.filter((f) => f.severity === 'check');

  if (mismatches.length) {
    console.log(`Disagreements with Wikidata (${mismatches.length}) — each needs a human decision:`);
    mismatches.forEach((f) => console.log(`  ${f.breed.padEnd(30)} ${f.msg}`));
    console.log('');
  }
  if (reviews.length) {
    console.log(`Internal figures worth re-reading (${reviews.length}):`);
    reviews.forEach((f) => console.log(`  ${f.breed.padEnd(30)} ${f.msg}`));
    console.log('');
  }
  if (!flags.length) console.log('Nothing flagged.');
})();
