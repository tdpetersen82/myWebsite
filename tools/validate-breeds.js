// Validates dogs/breeds.js against the schema documented at the top of that
// file. Run: node tools/validate-breeds.js
'use strict';

const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '..', 'dogs', 'breeds.js');
const src = fs.readFileSync(file, 'utf8');
const window = {};
// eslint-disable-next-line no-new-func
new Function('window', src)(window);
const breeds = window.DOG_BREEDS;

const ENUMS = {
  group: ['sporting', 'hound', 'working', 'terrier', 'toy', 'non-sporting', 'herding', 'crossbreed'],
  size: ['toy', 'small', 'medium', 'large', 'giant'],
  coat: ['short', 'medium', 'long', 'curly', 'wire', 'hairless'],
  coatTexture: ['double', 'single', 'silky', 'wiry', 'curly', 'corded', 'none'],
  ears: ['erect', 'floppy', 'semi-erect'],
  tail: ['straight', 'curled', 'feathered', 'bobbed', 'docked'],
  muzzle: ['short', 'medium', 'long'],
};
const SCALES = ['shedding', 'grooming', 'drooling', 'energy', 'trainability',
  'barking', 'strangers', 'withKids', 'withDogs', 'aloneTolerance', 'preyDrive', 'fame'];
const RANGES = ['heightIn', 'weightLb', 'lifespan'];
const JOBS = ['herding', 'guarding', 'retrieving', 'ratting', 'scenting',
  'coursing', 'sledding', 'lap', 'companion', 'water-rescue', 'drafting'];
const TEXT = ['blurb', 'fact'];

const errors = [];
const warnings = [];
const seenSlug = new Set();
const seenName = new Map();   // lowercased name/alias -> slug, for autocomplete collisions

breeds.forEach((b, i) => {
  const at = b.slug || `index ${i}`;
  const err = (m) => errors.push(`${at}: ${m}`);
  const warn = (m) => warnings.push(`${at}: ${m}`);

  if (!b.slug || !/^[a-z0-9-]+$/.test(b.slug)) err('slug missing or not kebab-case');
  if (seenSlug.has(b.slug)) err('duplicate slug');
  seenSlug.add(b.slug);
  if (!b.name) err('name missing');
  if (!Array.isArray(b.aka)) err('aka must be an array');

  // Autocomplete namespace: every name and alias must resolve to one breed.
  [b.name, ...(b.aka || [])].filter(Boolean).forEach((n) => {
    const key = n.toLowerCase();
    if (seenName.has(key) && seenName.get(key) !== b.slug) {
      err(`name/alias "${n}" collides with ${seenName.get(key)}`);
    }
    seenName.set(key, b.slug);
  });

  Object.keys(ENUMS).forEach((k) => {
    if (!ENUMS[k].includes(b[k])) err(`${k} = ${JSON.stringify(b[k])} is not one of ${ENUMS[k].join('|')}`);
  });

  SCALES.forEach((k) => {
    if (!Number.isInteger(b[k]) || b[k] < 1 || b[k] > 5) err(`${k} = ${JSON.stringify(b[k])}, expected integer 1–5`);
  });

  RANGES.forEach((k) => {
    const v = b[k];
    if (!Array.isArray(v) || v.length !== 2 || v.some((n) => typeof n !== 'number')) {
      err(`${k} must be [min, max] numbers`);
    } else if (v[0] > v[1]) {
      err(`${k} min ${v[0]} > max ${v[1]}`);
    } else if (v[0] <= 0) {
      err(`${k} min must be positive`);
    }
  });

  if (typeof b.hypoallergenic !== 'boolean') err('hypoallergenic must be a boolean');
  if (typeof b.firstTimeOwner !== 'boolean') err('firstTimeOwner must be a boolean');
  if ('inGame' in b && b.inGame !== false) err('inGame may only be omitted or false');
  if (!Array.isArray(b.colors) || !b.colors.length) err('colors must be a non-empty array');
  if (!Array.isArray(b.jobs) || !b.jobs.length) err('jobs must be a non-empty array');
  (b.jobs || []).forEach((j) => { if (!JOBS.includes(j)) err(`unknown job "${j}"`); });

  TEXT.forEach((k) => {
    const v = b[k];
    if (typeof v !== 'string' || v.length < 20) err(`${k} missing or too short`);
    else if (!/[.!?]$/.test(v.trim())) err(`${k} should end in punctuation`);
    else if (v.length > 190) warn(`${k} is ${v.length} chars — may wrap badly on a card`);
  });

  // The final clue must not contain the answer. Pup Quiz shows `fact` last,
  // so a breed's own name (or any distinctive word from it) gives the game away.
  if (typeof b.fact === 'string' && b.name) {
    const STOP = new Set(['dog', 'the', 'and', 'of']);
    const words = b.name.toLowerCase().split(/[\s-]+/).filter((w) => w.length > 2 && !STOP.has(w));
    const leaked = words.filter((w) => b.fact.toLowerCase().includes(w));
    if (leaked.length) warn(`fact leaks the name: "${leaked.join(', ')}"`);
  }

  // Cross-field sanity.
  if (b.coat === 'hairless' && b.coatTexture !== 'none') err('hairless coat needs coatTexture "none"');
  if (b.coat !== 'hairless' && b.coatTexture === 'none') err('coatTexture "none" on a coated breed');
  if (b.hypoallergenic && b.shedding > 2) err(`hypoallergenic but shedding = ${b.shedding}`);
  if (b.size === 'giant' && b.weightLb[1] < 90) warn(`size giant but tops out at ${b.weightLb[1]} lb`);
  if (b.size === 'toy' && b.weightLb[1] > 20) warn(`size toy but tops out at ${b.weightLb[1]} lb`);
  if (b.group === 'crossbreed' && b.inGame !== false) err('crossbreeds must set inGame: false');
});

// Both game modes need enough material to work with.
const playable = breeds.filter((b) => b.inGame !== false);
const byGroup = {};
playable.forEach((b) => { byGroup[b.group] = (byGroup[b.group] || 0) + 1; });
Object.entries(byGroup).forEach(([g, n]) => {
  if (n < 4) warnings.push(`group "${g}" has only ${n} playable breeds — Odd One Out needs 4`);
});

console.log(`${breeds.length} breeds (${playable.length} playable, ${breeds.length - playable.length} finder-only)`);
console.log('by group:', Object.entries(byGroup).map(([g, n]) => `${g} ${n}`).join(', '));

if (warnings.length) {
  console.log(`\n${warnings.length} warning(s):`);
  warnings.forEach((w) => console.log('  ! ' + w));
}
if (errors.length) {
  console.log(`\n${errors.length} error(s):`);
  errors.forEach((e) => console.log('  ✗ ' + e));
  process.exit(1);
}
console.log('\nNo errors.');
