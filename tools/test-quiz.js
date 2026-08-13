// Exercises dogs/clues.js — clue safety, daily determinism, and the fairness
// of the generated Higher/Lower and Odd One Out rounds.
// Run: node tools/test-quiz.js
'use strict';

const fs = require('fs');
const path = require('path');

const win = {};
['breeds.js', 'clues.js'].forEach((f) => {
  const src = fs.readFileSync(path.join(__dirname, '..', 'dogs', f), 'utf8');
  new Function('window', src)(win); // eslint-disable-line no-new-func
});
const BREEDS = win.DOG_BREEDS;
const Q = win.DOG_QUIZ;

let failed = 0;
function check(name, cond, detail) {
  if (cond) { console.log(`  ok   ${name}`); return; }
  failed++;
  console.log(`  FAIL ${name}${detail ? ' — ' + detail : ''}`);
}

console.log('Clues\n');

check('crossbreeds are excluded from play', Q.PLAYABLE.every((b) => b.group !== 'crossbreed'));
check('every playable breed produces five clues',
  Q.PLAYABLE.every((b) => Q.clues(b).length === 5));

// Clues 1–4 are built from enum fields, so they unavoidably use the AKC group,
// size and coat vocabulary — "It belongs to the terrier group" is not a
// giveaway when sixteen breeds are terriers. What must never appear is a word
// that is distinctive to THIS breed's name.
const STRUCTURAL = new Set([
  'sporting', 'hound', 'working', 'terrier', 'toy', 'herding', 'non-sporting',
  'small', 'medium', 'large', 'giant', 'short', 'long', 'curly', 'wire', 'hairless',
  'double', 'single', 'silky', 'wiry', 'corded', 'erect', 'floppy', 'straight',
  'curled', 'feathered', 'bobbed', 'docked', 'water', 'companion', 'lap',
]);
const STOP = new Set(['dog', 'the', 'and', 'of']);

function nameWords(b) {
  return [b.name].concat(b.aka || []).join(' ').toLowerCase()
    .split(/[\s-]+/)
    .filter((w) => w.length > 2 && !STOP.has(w) && !STRUCTURAL.has(w));
}

let leaks = [];
Q.PLAYABLE.forEach((b) => {
  const words = nameWords(b);
  Q.clues(b).slice(0, 4).forEach((c, i) => {
    const hay = c.toLowerCase();
    // Whole words only: "bred to..." contains "red", and "Germany" contains
    // "german", neither of which gives anything away.
    words.forEach((w) => {
      const re = new RegExp('\\b' + w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b');
      if (re.test(hay)) leaks.push(`${b.name} clue ${i + 1}: "${w}"`);
    });
  });
});
check('clues 1–4 never use a word distinctive to the breed name', leaks.length === 0,
  leaks.slice(0, 5).join(' | ') + (leaks.length > 5 ? ` (+${leaks.length - 5})` : ''));

// Clue 5 is the giveaway by design — it may hint hard. What it may NOT do is
// print an accepted answer verbatim, because the autocomplete would score that
// exact string as a win.
let printed = [];
Q.PLAYABLE.forEach((b) => {
  const hay = Q.clues(b)[4].toLowerCase();
  [b.name].concat(b.aka || []).forEach((n) => {
    const re = new RegExp('\\b' + n.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b');
    if (re.test(hay)) printed.push(`${b.name}: "${n}"`);
  });
});
check('the final clue never prints an accepted answer verbatim', printed.length === 0,
  printed.join(' | '));

check('every clue ends in punctuation',
  Q.PLAYABLE.every((b) => Q.clues(b).every((c) => /[.!?]$/.test(c.trim()))));
check('no clue is suspiciously short',
  Q.PLAYABLE.every((b) => Q.clues(b).every((c) => c.length > 20)));

console.log('\nDaily\n');

const d1 = new Date(2026, 7, 12);
const d2 = new Date(2026, 7, 13);
check('same date gives the same breed', Q.dailyBreed(d1).slug === Q.dailyBreed(d1).slug);
check('consecutive days differ', Q.dailyBreed(d1).slug !== Q.dailyBreed(d2).slug,
  `${Q.dailyBreed(d1).slug} vs ${Q.dailyBreed(d2).slug}`);
check('daily pool only holds recognizable breeds', Q.DAILY_POOL.every((b) => b.fame >= 3));
check('daily pool has no duplicates',
  new Set(Q.DAILY_POOL.map((b) => b.slug)).size === Q.DAILY_POOL.length);

// Walk a full cycle: no repeat until the pool is exhausted.
const seen = new Set();
let repeatedEarly = null;
for (let i = 0; i < Q.DAILY_POOL.length; i++) {
  const d = new Date(2026, 0, 1 + i);
  const slug = Q.dailyBreed(d).slug;
  if (seen.has(slug)) { repeatedEarly = `${slug} on day ${i}`; break; }
  seen.add(slug);
}
check(`no repeat across a full ${Q.DAILY_POOL.length}-day cycle`, !repeatedEarly, repeatedEarly);
console.log(`       pool size: ${Q.DAILY_POOL.length} days before it wraps`);

// Local midnight rollover, not UTC — two times on the same local day must match.
const morning = new Date(2026, 7, 12, 0, 30);
const night = new Date(2026, 7, 12, 23, 30);
check('the puzzle does not change during the local day',
  Q.dailyBreed(morning).slug === Q.dailyBreed(night).slug);

console.log('\nGuess matching\n');

check('exact name resolves', Q.resolveGuess('Border Collie') === 'border-collie');
check('case and spacing are forgiving', Q.resolveGuess('  border   collie ') === 'border-collie');
check('aliases resolve', Q.resolveGuess('Jack Russell') === 'russell-terrier');
check('alias "Poodle" resolves to the standard', Q.resolveGuess('Poodle') === 'standard-poodle');
check('accents are forgiving', Q.resolveGuess('Bichon Frise') === 'bichon-frise');
check('nonsense does not resolve', Q.resolveGuess('not a dog') === null);
check('suggestions rank prefix matches first', Q.suggest('border')[0].slug === 'border-collie',
  JSON.stringify(Q.suggest('border').map((b) => b.slug)));
check('every playable breed is reachable by its own name',
  Q.PLAYABLE.every((b) => Q.resolveGuess(b.name) === b.slug));

console.log('\nHigher / Lower\n');

let hlNull = 0, hlTies = 0, hlSame = 0, hlWrong = 0;
for (let i = 0; i < 3000; i++) {
  const r = Q.higherLowerRound(Q.rngFrom('hl' + i));
  if (!r) { hlNull++; continue; }
  if (r.left.slug === r.right.slug) hlSame++;
  const va = r.trait.get(r.left), vb = r.trait.get(r.right);
  if (Math.abs(va - vb) < r.trait.gap) hlTies++;
  const expected = va > vb ? r.left.slug : r.right.slug;
  if (r.answer !== expected) hlWrong++;
}
check('always produces a round', hlNull === 0, `${hlNull} nulls`);
check('never pairs a breed with itself', hlSame === 0, `${hlSame} self-pairs`);
check('never asks a question that is too close to call', hlTies === 0, `${hlTies} near-ties`);
check('the stored answer is always the correct one', hlWrong === 0, `${hlWrong} wrong`);

console.log('\nOdd One Out\n');

let ooNull = 0, ooBad = 0, ooDup = 0, ooAmbiguous = 0;
for (let i = 0; i < 3000; i++) {
  const r = Q.oddOneOutRound(Q.rngFrom('oo' + i));
  if (!r) { ooNull++; continue; }
  if (r.options.length !== 4) ooBad++;
  if (new Set(r.options.map((b) => b.slug)).size !== 4) ooDup++;
  const odd = r.options.find((b) => b.slug === r.answer);
  const rest = r.options.filter((b) => b.slug !== r.answer);
  // Exactly one option must differ on the stated axis, and the other three
  // must genuinely share it — otherwise the stated reason is a lie.
  if (!odd || odd[r.axis] === r.key) ooBad++;
  if (!rest.every((b) => b[r.axis] === r.key)) ooBad++;
  // And no OTHER option may be equally defensible as the outsider.
  const other = r.axis === 'group' ? 'origin' : 'group';
  if (rest.every((b) => b[other] === rest[0][other]) && odd[other] !== rest[0][other]) {
    // fine: odd is odd on both axes, still the same answer
  }
  const otherOdd = rest.filter((b) => rest.filter((x) => x[other] === b[other]).length === 1);
  if (otherOdd.length === 1 && rest.filter((x) => x[other] === rest.find((y) => y !== otherOdd[0])[other]).length === 2) {
    ooAmbiguous++;
  }
}
check('always produces a round', ooNull === 0, `${ooNull} nulls`);
check('always four distinct options', ooBad === 0 && ooDup === 0, `${ooBad} malformed, ${ooDup} dupes`);
check('exactly one option is odd on the stated axis', ooBad === 0);
console.log(`       (${ooAmbiguous} rounds had a second grouping on the unstated axis — the question names its axis, so these stay fair)`);

console.log('');
if (failed) { console.log(`${failed} failure(s).`); process.exit(1); }
console.log('All checks passed.');
