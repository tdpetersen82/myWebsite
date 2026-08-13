// Exercises dogs/filter.js against the real breed data.
// Run: node tools/test-finder.js
'use strict';

const fs = require('fs');
const path = require('path');

const win = {};
['breeds.js', 'filter.js'].forEach((f) => {
  const src = fs.readFileSync(path.join(__dirname, '..', 'dogs', f), 'utf8');
  new Function('window', src)(win); // eslint-disable-line no-new-func
});
const BREEDS = win.DOG_BREEDS;
const F = win.DOG_FINDER;

let failed = 0;
function check(name, cond, detail) {
  if (cond) { console.log(`  ok   ${name}`); return; }
  failed++;
  console.log(`  FAIL ${name}${detail ? ' — ' + detail : ''}`);
}

// Personas: a full set of quiz answers and what must be true of the results.
const PERSONAS = [
  {
    name: 'Allergic apartment dweller, long workday',
    answers: { home: 'apartment', alone: 'long', allergies: 'yes', activity: 'low',
      kids: 'none', experience: 'first', grooming: 'some', noise: 'quiet' },
    must: [
      ['every result is hypoallergenic', (r) => r.breed.hypoallergenic],
      ['nothing that genuinely cannot be left alone', (r) => r.breed.aloneTolerance >= 3],
    ],
    topMust: [['no giant breeds near the top', (r) => r.breed.size !== 'giant']],
  },
  {
    name: 'Family with toddlers, house and yard, active',
    answers: { home: 'yard', alone: 'rarely', allergies: 'no', activity: 'high',
      kids: 'small', experience: 'some', grooming: 'lots', noise: 'any' },
    must: [
      ['every result is good with kids (>= 4)', (r) => r.breed.withKids >= 4],
    ],
  },
  {
    name: 'First-time owner, no yard, minimal grooming',
    answers: { home: 'house', alone: 'short', allergies: 'no', activity: 'mid',
      kids: 'none', experience: 'first', grooming: 'min', noise: 'some' },
    must: [],
    // Size is a soft preference, not an exclusion — a Greyhound really is a
    // fine flat dog. What matters is that giants don't rank near the top.
    topMust: [['no giant breeds near the top', (r) => r.breed.size !== 'giant']],
  },
  {
    name: 'Experienced handler, wants a working dog',
    answers: { home: 'yard', alone: 'rarely', allergies: 'no', activity: 'high',
      kids: 'none', experience: 'lots', grooming: 'lots', noise: 'any' },
    must: [],
  },
];

console.log('Personas\n');
PERSONAS.forEach((p) => {
  console.log(p.name);
  const filters = F.answersToFilters(p.answers);
  const results = F.rank(BREEDS, filters);

  check('returns at least one breed', results.length > 0, `got ${results.length}`);
  // The real invariant isn't "lots of results" — some honest answers are
  // genuinely short. It's that a short list is never a dead end: there must
  // always be a stated way to widen it.
  if (results.length < 8) {
    check('a short result list offers a way to widen it',
      F.nearMisses(BREEDS, filters).length > 0, `${results.length} results, no relaxations`);
  }
  check('returns fewer than everything', results.length < BREEDS.length,
    `got ${results.length} of ${BREEDS.length}`);

  const unsorted = results.findIndex((r, i) => i > 0 && results[i - 1].score < r.score);
  check('sorted by score, descending', unsorted === -1, `broke at index ${unsorted}`);

  check('no crossbreeds by default', results.every((r) => r.breed.group !== 'crossbreed'));

  p.must.forEach(([label, fn]) => {
    const bad = results.filter((r) => !fn(r));
    check(label, bad.length === 0,
      bad.length ? `${bad.length} violations, e.g. ${bad[0].breed.name}` : '');
  });
  (p.topMust || []).forEach(([label, fn]) => {
    const bad = results.slice(0, 10).filter((r) => !fn(r));
    check(label, bad.length === 0,
      bad.length ? `${bad.length} in top 10, e.g. ${bad[0].breed.name}` : '');
  });

  // Reasons must be non-empty for the top result, and caveats must not
  // duplicate reasons (that would read as self-contradiction on the card).
  const top = results[0];
  const reasons = F.reasons(top);
  check('top result has a "why it matched" line', reasons.length > 0, top.breed.name);
  const caveats = F.caveats(top);
  check('no reason is also a caveat', !reasons.some((x) => caveats.includes(x)));

  console.log(`       top 5: ${results.slice(0, 5).map((r) => `${r.breed.name} (${r.score})`).join(', ')}`);
  console.log('');
});

// ── Near misses must be arithmetically true, not decorative ──────────────
console.log('Near misses\n');
PERSONAS.forEach((p) => {
  const filters = F.answersToFilters(p.answers);
  const base = F.rank(BREEDS, filters).length;
  const misses = F.nearMisses(BREEDS, filters);
  misses.forEach((m) => {
    const trial = Object.assign({}, filters);
    trial[m.id] = m.relaxed;
    const actual = F.rank(BREEDS, trial).length - base;
    check(`"${m.label}" really adds ${m.count}`, actual === m.count, `actually adds ${actual}`);
  });
  if (!misses.length) console.log(`  --   ${p.name}: no relaxations offered`);
});

// ── Engine invariants ────────────────────────────────────────────────────
console.log('\nInvariants\n');

const empty = F.rank(BREEDS, {});
check('no filters returns every non-crossbreed', empty.length === BREEDS.filter((b) => b.group !== 'crossbreed').length,
  `got ${empty.length}`);
check('no filters gives everything a perfect score', empty.every((r) => r.score === 100));

const withCross = F.rank(BREEDS, {}, { includeCrossbreeds: true });
check('crossbreeds included on request', withCross.length === BREEDS.length, `got ${withCross.length}`);

// A hard filter must exclude; the same filter soft must only penalize.
const hardFilters = { hypo: { value: true, hard: true } };
const softFilters = { hypo: { value: true, hard: false } };
const hard = F.rank(BREEDS, hardFilters);
const soft = F.rank(BREEDS, softFilters);
check('hard filter excludes', hard.every((r) => r.breed.hypoallergenic));
check('soft filter keeps everyone', soft.length === empty.length, `got ${soft.length}`);
check('soft filter still ranks matches first', soft[0].breed.hypoallergenic);
check('soft filter penalizes non-matches', soft[soft.length - 1].score < 100);

// Tightening: two answers touching the same criterion must keep the stricter.
const tightened = F.answersToFilters({ allergies: 'mild', grooming: 'min' });
check('overlapping answers tighten rather than overwrite',
  tightened.shedding.value === 2 && tightened.grooming.value === 2,
  JSON.stringify(tightened));

// Every quiz option must reference criteria that actually exist.
let badRef = null;
F.QUESTIONS.forEach((q) => q.options.forEach((o) => {
  Object.keys(o.sets).forEach((k) => { if (!F.byId[k]) badRef = `${q.id}/${o.id} → ${k}`; });
}));
check('every quiz option maps to a real criterion', !badRef, badRef);

console.log('');
if (failed) { console.log(`${failed} failure(s).`); process.exit(1); }
console.log('All checks passed.');
