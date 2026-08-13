// Sources one lead photo per breed from Wikipedia/Wikimedia Commons, keeping
// only freely-licensed images, and records attribution for every one.
//
//   node tools/fetch-breed-photos.js --manifest   # metadata only, no downloads
//   node tools/fetch-breed-photos.js --download   # fetch + encode + write credits
//
// Encoding note: this machine has no webp encoder (no cwebp/ffmpeg/magick, and
// sips reads webp but cannot write it), so photos ship as JPEG via sips.
'use strict';

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const DOGS = path.join(ROOT, 'dogs');
const PHOTOS = path.join(DOGS, 'photos');
const MANIFEST = path.join(__dirname, 'breed-photos.manifest.json');
const CREDITS = path.join(DOGS, 'photo-credits.json');

const UA = 'LimestoneGames-BreedFinder/1.0 (https://limestonegames.com; contact via site) node-fetch';
const WIDTH = 900;

const win = {};
new Function('window', fs.readFileSync(path.join(DOGS, 'breeds.js'), 'utf8'))(win); // eslint-disable-line
const BREEDS = win.DOG_BREEDS;

// Bare breed names collide with places and people all over Wikipedia — the
// first run pulled the FLAG OF NEWFOUNDLAND for the Newfoundland dog, and
// "Boxer", "Chihuahua", "Akita", "Dalmatian", "Maltese", "Pomeranian" and
// "Samoyed" all resolve to something that is not a dog.
const TITLE = {
  'german-shepherd-dog': 'German Shepherd',
  'chinese-shar-pei': 'Shar Pei',
  'plott': 'Plott Hound',
  'russell-terrier': 'Russell Terrier',
  'collie': 'Rough Collie',
  'pointer': 'Pointer (dog breed)',
  'mastiff': 'English Mastiff',
  'brussels-griffon': 'Griffon Bruxellois',
  'newfoundland': 'Newfoundland dog',
  'boxer': 'Boxer (dog)',
  'saint-bernard': 'St. Bernard (dog)',
  'samoyed': 'Samoyed dog',
  'akita': 'Akita (dog)',
  'chihuahua': 'Chihuahua (dog)',
  'pomeranian': 'Pomeranian dog',
  'maltese': 'Maltese dog',
  'papillon': 'Papillon dog',
  'dalmatian': 'Dalmatian (dog)',
  'puli': 'Puli dog',
  'standard-poodle': 'Poodle',
  'brittany': 'Brittany dog',
};

// The three poodle sizes share one article, so they'd otherwise share one
// photo. These two get an explicit Commons search term instead.
const SEARCH_OVERRIDE = {
  'miniature-poodle': 'Miniature Poodle dog',
};

// Hand-picked, because no title heuristic can judge what's actually in the
// frame: the auto-picked Pug was a macro shot of fur and the auto-picked Toy
// Poodle was mostly the handler's arms. Both filenames looked perfectly fine.
const FILE_OVERRIDE = {
  'pug': 'File:Mops oct09 cropped2.jpg',
  'toy-poodle': 'File:White Toy poodle.jpg',
};

// Free licences we accept. GPL and GFDL are technically free but carry
// source/full-licence-text obligations that don't fit a photo credit line, so
// those fall through to the Commons search for a cleaner alternative.
const FREE = [
  /^cc0/i, /^cc[ -]by([ -]sa)?[ -]?\d?/i, /^public domain/i, /^pd([ -]|$)/i,
  /^no restrictions$/i, /^copyrighted free use/i,
];
const NONFREE = [
  /nc\b/i, /noncommercial/i, /nd\b/i, /noderiv/i, /fair use/i,
  /^gpl/i, /^lgpl/i, /^gfdl/i, /^copyrighted$/i,
];

function isFree(license) {
  if (!license) return false;
  if (NONFREE.some((re) => re.test(license))) return false;
  return FREE.some((re) => re.test(license));
}

// Guards against the flag-of-Newfoundland failure mode: the file has to look
// like it depicts this breed. Checked against the file name and description.
const DOG_WORDS = /\b(dog|dogs|puppy|pup|hound|terrier|spaniel|retriever|setter|shepherd|collie|mastiff|poodle|canine|canis|hund|hunde|chien|perro|cane|inu|breed)\b/i;

// Every breed's own names, for the "is this actually a different breed?" test.
const ALL_NAMES = BREEDS.map(function (b) {
  return { slug: b.slug, names: [b.name].concat(b.aka || []).map(function (n) { return n.toLowerCase(); }) };
});

// Several breed names are also place names, and the article for the place wins.
// "Brittany" returned a NASA satellite photo of the French region; the breed
// name appearing in the filename was not enough to catch it.
const NOT_A_DOG = /\b(satellite|aerial|map|maps|region|flag|coat of arms|emblem|seal|banner|province|county|municipality|location|topograph|orthophoto|nasa|landsat)\b/i;

function looksLikeTheBreed(breed, info) {
  var hay = [info.file, info.objectName, info.description].join(' ').toLowerCase();
  var mine = [breed.name].concat(breed.aka || []).map(function (n) { return n.toLowerCase(); });

  if (NOT_A_DOG.test(hay)) return false;

  // A word match alone let "File:French bulldog in life jacket.jpg" through for
  // the (English) Bulldog. If the text names a DIFFERENT breed, and that name
  // isn't just a longer form of this one, it's the wrong dog.
  var wrongBreed = ALL_NAMES.some(function (other) {
    if (other.slug === breed.slug) return false;
    return other.names.some(function (n) {
      if (n.length < 5 || hay.indexOf(n) === -1) return false;
      return !mine.some(function (m) { return m.indexOf(n) !== -1; });
    });
  });
  if (wrongBreed) return false;

  var words = breed.name.toLowerCase().split(/[\s()-]+/).filter(function (w) { return w.length > 3; });
  var akaWords = (breed.aka || []).join(' ').toLowerCase().split(/[\s()-]+/).filter(function (w) { return w.length > 3; });
  var named = words.concat(akaWords).some(function (w) { return hay.indexOf(w) !== -1; });
  return named || DOG_WORDS.test(hay);
}

// Search hits are ranked, not taken first-come — the first valid hit was
// often a puppy, a 1935 show photo, a collage, or a close-up of one eye.
const BAD_SUBJECT = [
  [/\bpupp(y|ies)\b/i, 6], [/\b(collage|varieties|comparison|montage)\b/i, 14], [/\bshow\b/i, 3],
  [/\b(statue|sculpture|skull|x-ray|skeleton|drawing|painting|cartoon|logo|sign|stamp|silhouette|icon)\b/i, 12],
  [/\b(eye|nose|paw|teeth|tail|ear)s?\b/i, 6], [/\b(wearing|costume|clothes|hat|jacket)\b/i, 5],
  [/\b(mix|cross|hybrid)\b/i, 8], [/\b1[89]\d\d\b/i, 6], [/\b19[0-7]\d\b/i, 5],
  [/\b(group|litter|pair|quartet|two|three)\b/i, 3],
  // Props and extreme crops: a teddy bear filled the Samoyed frame, and the
  // Pug was a macro shot of fur.
  [/\b(teddy|bear|toy(?!\s*poodle)|doll|blanket|sofa|bed)\b/i, 7],
  [/\b(close ?-?up|macro|detail|fur|wrinkle|sleeping|asleep)\b/i, 7],
];

function subjectScore(breed, info) {
  var hay = [info.file, info.objectName].join(' ');
  var score = 0;
  if (hay.toLowerCase().indexOf(breed.name.toLowerCase()) !== -1) score += 10;
  if (info.mime === 'image/jpeg') score += 2;
  BAD_SUBJECT.forEach(function (pair) { if (pair[0].test(hay)) score -= pair[1]; });
  return score;
}

// Commons author fields are free text and arrive in every shape: bare profile
// URLs, "No machine-readable author provided...", derivative-work chains, wiki
// markup. Reduce them to something a human credit line can actually print.
function cleanArtist(raw) {
  var s = stripHtml(raw || '').trim();
  if (!s) return '';
  s = s.replace(/No machine-readable author provided\.?\s*/i, '')
       .replace(/\s*assumed \(based on copyright claims?\)\.?/i, '')
       .replace(/\[\[[^\]|]*\|?([^\]]*)\]\]/g, '$1')     // wiki links → label
       .replace(/^[^:]+\.(jpe?g|png):\s*/i, '')          // "Foo.jpg: " prefixes
       .replace(/\bderivative work:?/i, '')
       .replace(/https?:\/\/\S+/g, function (u) {         // bare URL → username
         var m = u.replace(/\/+$/, '').split('/').pop();
         return /^[\w.~-]{2,}$/.test(m) ? m : '';
       })
       .replace(/~commonswiki\b/g, '')
       .replace(/\s{2,}/g, ' ')
       .replace(/^[\s,;:.-]+|[\s,;:.-]+$/g, '')
       .trim();
  if (s.length > 60) s = s.slice(0, 57).replace(/\s+\S*$/, '') + '…';
  return s;
}

function stripHtml(s) {
  return String(s == null ? '' : s)
    .replace(/<[^>]*>/g, '')
    .replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ').trim();
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Wikimedia throttles hard on bursts, and a throttled response is HTML, not
// JSON — so back off and retry rather than crashing on a parse error.
async function api(params, host) {
  const base = 'https://' + (host || 'en.wikipedia.org') + '/w/api.php?format=json&';
  const url = base + Object.entries(params)
    .map(([k, v]) => k + '=' + encodeURIComponent(v)).join('&');
  for (let attempt = 0; attempt < 4; attempt++) {
    const res = await fetch(url, { headers: { 'User-Agent': UA } });
    const text = await res.text();
    if (res.ok) {
      try { return JSON.parse(text); } catch (e) { /* throttle page, retry */ }
    }
    await sleep(1200 * (attempt + 1));
  }
  throw new Error('API unavailable after retries: ' + (params.titles || params.srsearch));
}

async function leadFile(title) {
  const j = await api({ action: 'query', prop: 'pageimages', piprop: 'name', titles: title, redirects: 1 });
  const pages = j.query && j.query.pages;
  if (!pages) return null;
  const page = Object.values(pages)[0];
  if (!page || page.missing !== undefined || !page.pageimage) return null;
  return 'File:' + page.pageimage;
}

async function fileInfo(fileTitle, host) {
  const j = await api({
    action: 'query', prop: 'imageinfo', titles: fileTitle,
    iiprop: 'extmetadata|url|mime|user', iiurlwidth: WIDTH,
  }, host);
  const pages = j.query && j.query.pages;
  if (!pages) return null;
  const page = Object.values(pages)[0];
  if (!page || !page.imageinfo || !page.imageinfo.length) return null;
  const info = page.imageinfo[0];
  const m = info.extmetadata || {};
  const val = (k) => (m[k] && m[k].value != null ? stripHtml(m[k].value) : '');
  const artist = cleanArtist(val('Artist')) || cleanArtist(val('Credit'));
  return {
    file: fileTitle,
    mime: info.mime,
    thumb: info.thumburl || info.url,
    descriptionUrl: info.descriptionurl,
    license: val('LicenseShortName') || val('License'),
    licenseUrl: val('LicenseUrl'),
    // CC-BY-SA needs an attribution even when the uploader left the author
    // field blank — the uploading account is the accepted fallback.
    artist: artist || (info.user ? info.user + ' (Wikimedia Commons)' : ''),
    credit: val('Credit'),
    objectName: val('ObjectName'),
    description: val('ImageDescription').slice(0, 200),
    usageTerms: val('UsageTerms'),
  };
}

// Used when the article's own lead image is missing, non-free, or not a photo
// of the dog. Returns the first search hit that passes every check.
async function searchCommons(breed, term) {
  const j = await api({
    action: 'query', list: 'search', srnamespace: 6, srlimit: 8, srsearch: term,
  }, 'commons.wikimedia.org');
  const hits = (j.query && j.query.search) || [];
  const candidates = [];
  for (const hit of hits) {
    await sleep(250);
    let info;
    try { info = await fileInfo(hit.title, 'commons.wikimedia.org'); } catch (e) { continue; }
    if (!info) continue;
    if (!/^image\/(jpeg|png)$/.test(info.mime || '')) continue;
    if (!isFree(info.license)) continue;
    if (!info.artist) continue;
    if (!looksLikeTheBreed(breed, info)) continue;
    info.viaSearch = term;
    info.subjectScore = subjectScore(breed, info);
    candidates.push(info);
  }
  if (!candidates.length) return null;
  candidates.sort((a, b) => b.subjectScore - a.subjectScore);
  return candidates[0];
}

async function buildManifest(onlySlugs) {
  // Re-deriving one breed shouldn't mean re-querying 120, so a refresh merges
  // into the existing manifest and drops that breed's stale photo.
  const existing = (onlySlugs && fs.existsSync(MANIFEST))
    ? JSON.parse(fs.readFileSync(MANIFEST, 'utf8')) : null;
  const todo = onlySlugs ? BREEDS.filter((b) => onlySlugs.includes(b.slug)) : BREEDS;
  if (onlySlugs) {
    const unknown = onlySlugs.filter((s) => !BREEDS.some((b) => b.slug === s));
    if (unknown.length) { console.error('Unknown slug(s): ' + unknown.join(', ')); process.exit(1); }
  }

  const out = [];
  for (let i = 0; i < todo.length; i++) {
    const b = todo[i];
    const title = TITLE[b.slug] || b.name;
    let rec = { slug: b.slug, name: b.name, title };
    try {
      let info = null, why = '';
      if (FILE_OVERRIDE[b.slug]) {
        info = await fileInfo(FILE_OVERRIDE[b.slug], 'commons.wikimedia.org');
        if (info && !isFree(info.license)) { why = 'override licence ' + info.license; info = null; }
        if (info) rec.handPicked = true;
      } else if (!SEARCH_OVERRIDE[b.slug]) {
        const file = await leadFile(title);
        if (!file) why = 'no lead image';
        else {
          info = await fileInfo(file);
          if (!info) { why = 'no imageinfo'; }
          else if (!/^image\/(jpeg|png)$/.test(info.mime || '')) { why = 'not a photo (' + info.mime + ')'; info = null; }
          else if (!isFree(info.license)) { why = 'licence ' + info.license; info = null; }
          else if (!looksLikeTheBreed(b, info)) { why = 'subject check failed'; info = null; }
          // The quality screen used to run only on search results, so an
          // article's own lead image could be a collage or a macro shot of fur
          // and sail straight through. Gate it here too.
          else if (subjectScore(b, info) < 0) { why = 'poor lead image'; info = null; }
        }
      }
      // Fall back to a Commons search for anything the article couldn't supply.
      if (!info) {
        await sleep(250);
        info = await searchCommons(b, SEARCH_OVERRIDE[b.slug] || (b.name + ' dog'));
        if (info) rec.fallback = why || 'search override';
      }
      if (!info) { rec.status = 'none'; rec.reason = why || 'no free image found'; }
      else {
        Object.assign(rec, info);
        rec.status = info.artist ? 'ok' : 'no-attribution';
      }
    } catch (e) {
      rec.status = 'error';
      rec.error = e.message;
    }
    out.push(rec);
    process.stdout.write(`\r${i + 1}/${todo.length} ${rec.status.padEnd(16)} ${b.name.slice(0, 34).padEnd(34)}`);
    await sleep(300); // be polite to the API
  }
  process.stdout.write('\n');

  let final = out;
  if (existing) {
    final = existing.map((r) => out.find((n) => n.slug === r.slug) || r);
    out.forEach((r) => {
      const jpg = path.join(PHOTOS, r.slug + '.jpg');
      const prev = existing.find((e) => e.slug === r.slug);
      if (prev && prev.file !== r.file && fs.existsSync(jpg)) {
        fs.unlinkSync(jpg);
        console.log(`  replaced ${r.slug}: ${(prev.file || '').replace('File:', '')} → ${(r.file || '').replace('File:', '')}`);
      }
    });
  }
  fs.writeFileSync(MANIFEST, JSON.stringify(final, null, 2));
  if (existing) { console.log(`\nRefreshed ${out.length} of ${final.length}. Run --download to fetch replacements.`); return; }

  const by = {};
  out.forEach((r) => { by[r.status] = (by[r.status] || 0) + 1; });
  console.log('\nStatus:', Object.entries(by).map(([k, v]) => `${k} ${v}`).join(', '));
  const bad = out.filter((r) => r.status !== 'ok');
  if (bad.length) {
    console.log('\nNeeds attention:');
    bad.forEach((r) => console.log(`  ${r.status.padEnd(16)} ${r.name}  ${r.license || ''} ${r.error || ''}`));
  }
  console.log(`\nManifest → ${path.relative(ROOT, MANIFEST)}`);
}

async function download() {
  if (!fs.existsSync(MANIFEST)) { console.error('Run --manifest first.'); process.exit(1); }
  const manifest = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));
  fs.mkdirSync(PHOTOS, { recursive: true });

  const credits = {};
  let done = 0, have = 0, noImage = 0;
  const failed = [];

  for (const rec of manifest) {
    if (rec.status !== 'ok') { noImage++; continue; }
    const jpg = path.join(PHOTOS, rec.slug + '.jpg');
    const tmp = path.join(PHOTOS, rec.slug + '.download');
    // Resumable: a completed file is left alone, so a rate-limited run can
    // simply be repeated until everything is present.
    const already = fs.existsSync(jpg) && fs.statSync(jpg).size > 1000;
    if (already) {
      have++;
      credits[rec.slug] = { artist: rec.artist, license: rec.license, licenseUrl: rec.licenseUrl, source: rec.descriptionUrl };
      continue;
    }
    try {
      let res = null;
      // upload.wikimedia.org rate-limits bursts with a 429; back off and retry
      // rather than recording the breed as having no free photo.
      for (let attempt = 0; attempt < 5; attempt++) {
        res = await fetch(rec.thumb, { headers: { 'User-Agent': UA } });
        if (res.ok) break;
        if (res.status !== 429 && res.status < 500) break;
        await sleep(2000 * (attempt + 1));
      }
      if (!res || !res.ok) throw new Error('HTTP ' + (res ? res.status : '?'));
      fs.writeFileSync(tmp, Buffer.from(await res.arrayBuffer()));
      // Normalize to JPEG and cap the long edge; sips is the only encoder here.
      execFileSync('/usr/bin/sips', ['-s', 'format', 'jpeg', '-s', 'formatOptions', '70',
        '-Z', '800', tmp, '--out', jpg], { stdio: 'ignore' });
      fs.unlinkSync(tmp);
      credits[rec.slug] = {
        artist: rec.artist,
        license: rec.license,
        licenseUrl: rec.licenseUrl,
        source: rec.descriptionUrl,
      };
      done++;
      process.stdout.write(`\r${done} new, ${have} already had  ${rec.name.slice(0, 30).padEnd(30)}`);
    } catch (e) {
      failed.push(`${rec.slug}: ${e.message}`);
      if (fs.existsSync(tmp)) fs.unlinkSync(tmp);
    }
    await sleep(400);
  }
  process.stdout.write('\n');
  fs.writeFileSync(CREDITS, JSON.stringify(credits, null, 2));
  // Also emit a plain script so the page can show credits without a fetch —
  // this site has no build step and pages are opened directly.
  fs.writeFileSync(path.join(DOGS, 'photo-credits.js'),
    '// Generated by tools/fetch-breed-photos.js — do not edit by hand.\n' +
    '// Every photo is used under the free licence recorded here.\n' +
    'window.DOG_PHOTO_CREDITS = ' + JSON.stringify(credits, null, 2) + ';\n');
  console.log(`\n${done + have} photos on disk (${done} new this run) → dogs/photos/`);
  console.log(`${Object.keys(credits).length} credits → dogs/photo-credits.json`);
  if (noImage) console.log(`${noImage} breeds have no usable free image in the manifest.`);
  if (failed.length) {
    console.log(`\n${failed.length} download failure(s) — re-run --download to retry just these:`);
    failed.forEach((f) => console.log('  ' + f));
  }
}

// Tidies attribution strings already in the manifest. Deliberately does NOT
// re-query: a fresh search could pick a different file for a photo that's
// already on disk, and then the credit wouldn't match the image.
function reclean() {
  const manifest = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));
  let changed = 0;
  manifest.forEach((r) => {
    const before = r.artist || '';
    const after = cleanArtist(before);
    if (after && after !== before) { r.artist = after; changed++; }
  });
  fs.writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2));
  console.log(`Re-cleaned ${changed} attribution string(s). Run --download to rewrite credits.`);
}

const mode = process.argv[2];
if (mode === '--manifest') buildManifest();
else if (mode === '--reclean') reclean();
else if (mode === '--refresh') {
  const slugs = (process.argv[3] || '').split(',').map((s) => s.trim()).filter(Boolean);
  if (!slugs.length) { console.error('Usage: --refresh slug1,slug2'); process.exit(1); }
  buildManifest(slugs);
} else if (mode === '--download') download();
else { console.log('Usage: node tools/fetch-breed-photos.js --manifest | --refresh <slugs> | --download'); process.exit(1); }
