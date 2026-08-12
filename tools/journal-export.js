#!/usr/bin/env node
// Dumps the journal out of Cloudflare into plain files you own.
//
//   JOURNAL_TOKEN=... node tools/journal-export.js
//   JOURNAL_TOKEN=... node tools/journal-export.js --out ~/Library/Mobile\ Documents/com~apple~CloudDocs/Journal
//
// Produces one Markdown file per day plus a photos/ folder of real .jpgs:
//
//   journal-export/
//     2026-08-11.md
//     photos/2026-08-11-1.jpg
//
// Nothing proprietary, no format to reverse-engineer. Point --out at a folder
// inside iCloud Drive and the export syncs to your phone as ordinary files.
//
// This talks to the journal HTTP API rather than to KV/R2 directly, so one
// request fetches every entry instead of one wrangler spawn per day.

const fs = require('fs');
const path = require('path');

const TOKEN = process.env.JOURNAL_TOKEN;
const args = process.argv.slice(2);

function argValue(flag, fallback) {
  const i = args.indexOf(flag);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
}

const BASE = argValue('--base', 'https://limestonegames.com').replace(/\/$/, '');
const OUT = path.resolve(argValue('--out', 'journal-export'));

if (!TOKEN) {
  console.error('Set JOURNAL_TOKEN (the same passphrase the app uses).');
  console.error('  JOURNAL_TOKEN=... node tools/journal-export.js');
  process.exit(1);
}

function api(pathname) {
  return fetch(BASE + '/api/journal' + pathname, {
    headers: { Authorization: 'Bearer ' + TOKEN },
  }).then((res) => {
    if (res.status === 401) throw new Error('Unauthorized — wrong JOURNAL_TOKEN.');
    if (!res.ok) throw new Error(pathname + ' → HTTP ' + res.status);
    return res;
  });
}

function longDate(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });
}

// Mirrors the app: an entry's text is its items, one per line. Entries written
// before the list UI are a single line of comma-separated things, so those get
// split on commas; anything stamped format:'items' splits on newlines only, so
// a comma inside one item survives.
function itemsOf(entry) {
  const text = entry.text || '';
  if (!text.trim()) return [];
  let parts;
  if (entry.format === 'items' || text.includes('\n')) parts = text.split('\n');
  else if (text.includes(',')) parts = text.split(',');
  else parts = [text];
  return parts.map((s) => s.trim()).filter(Boolean);
}

function extFor(contentType) {
  if (contentType.includes('png')) return '.png';
  if (contentType.includes('webp')) return '.webp';
  return '.jpg';
}

async function main() {
  const { entries } = await api('/entries').then((r) => r.json());
  const live = entries.filter((e) => !e.deleted && (e.text.trim() || e.photos.length));

  if (!live.length) {
    console.log('No entries to export.');
    return;
  }

  fs.mkdirSync(OUT, { recursive: true });
  const photoDir = path.join(OUT, 'photos');

  let photoCount = 0;
  let photoFailures = 0;

  for (const entry of live) {
    const lines = ['# ' + longDate(entry.date), ''];
    const items = itemsOf(entry);
    if (items.length) {
      for (const item of items) lines.push('- ' + item);
      lines.push('');
    }

    for (let i = 0; i < entry.photos.length; i++) {
      const id = entry.photos[i];
      try {
        const res = await api('/photos/' + id);
        const type = res.headers.get('content-type') || 'image/jpeg';
        const name = entry.date + '-' + (i + 1) + extFor(type);
        fs.mkdirSync(photoDir, { recursive: true });
        fs.writeFileSync(
          path.join(photoDir, name),
          Buffer.from(await res.arrayBuffer())
        );
        lines.push('![](photos/' + name + ')', '');
        photoCount++;
      } catch (err) {
        // A missing photo shouldn't cost you the day's text.
        console.warn('  ! photo ' + id + ' on ' + entry.date + ': ' + err.message);
        lines.push('<!-- missing photo ' + id + ' -->', '');
        photoFailures++;
      }
    }

    fs.writeFileSync(path.join(OUT, entry.date + '.md'), lines.join('\n'));
    console.log(entry.date + '.md' + (entry.photos.length ? '  (' + entry.photos.length + ' photo' + (entry.photos.length === 1 ? '' : 's') + ')' : ''));
  }

  console.log(
    '\n' + live.length + ' entries, ' + photoCount + ' photos → ' + OUT +
    (photoFailures ? '\n' + photoFailures + ' photo(s) could not be downloaded (see warnings above).' : '')
  );
}

main().catch((err) => {
  console.error('\n' + err.message);
  process.exit(1);
});
