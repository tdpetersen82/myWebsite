// Pup Quiz — clue generation, daily selection, and round builders for the
// Higher/Lower and Odd One Out modes.
//
// Reads window.DOG_BREEDS. Exposes window.DOG_QUIZ.
(function () {
  'use strict';

  var ALL = window.DOG_BREEDS || [];
  // Crossbreeds have no standard, so there's no defensible right answer.
  var PLAYABLE = ALL.filter(function (b) { return b.inGame !== false; });

  var GROUP_LABEL = {
    sporting: 'sporting', hound: 'hound', working: 'working', terrier: 'terrier',
    toy: 'toy', 'non-sporting': 'non-sporting', herding: 'herding',
  };
  var SIZE_LABEL = {
    toy: 'A toy-sized dog', small: 'A small dog', medium: 'A medium-sized dog',
    large: 'A large dog', giant: 'A giant breed',
  };
  var JOB_LABEL = {
    herding: 'move livestock', guarding: 'guard property or people',
    retrieving: 'retrieve shot game', ratting: 'kill vermin',
    scenting: 'follow a scent trail', coursing: 'run down game by sight',
    sledding: 'pull sleds', lap: 'sit on laps', companion: 'be company',
    'water-rescue': 'work in the water', drafting: 'pull carts',
  };

  function a(n) { return /^[aeiou]/i.test(n) ? 'an ' + n : 'a ' + n; }
  function range(r, unit) { return r[0] === r[1] ? r[0] + ' ' + unit : r[0] + '–' + r[1] + ' ' + unit; }

  // Five clues, hardest first. None may name the breed — `fact` is checked for
  // that by tools/validate-breeds.js, and the rest are built from enum fields.
  function clues(b) {
    var jobs = (b.jobs || []).map(function (j) { return JOB_LABEL[j]; }).filter(Boolean);
    var jobText = jobs.length
      ? 'It was bred to ' + (jobs.length > 1 ? jobs[0] + ' and ' + jobs[1] : jobs[0]) + '.'
      : 'It was bred as a companion.';

    var earTail = [];
    if (b.ears) earTail.push(b.ears === 'semi-erect' ? 'semi-erect ears' : b.ears + ' ears');
    if (b.tail) earTail.push(b.tail === 'bobbed' ? 'a naturally short tail' : 'a ' + b.tail + ' tail');

    return [
      'It belongs to the ' + (GROUP_LABEL[b.group] || b.group) + ' group, and was developed in ' + b.origin + '.',
      SIZE_LABEL[b.size] + ' — typically ' + range(b.heightIn, 'inches') + ' tall and ' +
        range(b.weightLb, 'lb'), // sentence finished below
      'It has ' + a(b.coat === 'hairless' ? 'hairless coat' : b.coat + ' coat') +
        (earTail.length ? ', ' + earTail.join(' and ') : '') + '.',
      jobText,
      b.fact,
    ].map(function (s, i) {
      // Clue 2 needs its lifespan tail appended before punctuation.
      if (i === 1) return s + ', living ' + range(b.lifespan, 'years') + '.';
      return s;
    });
  }

  // ── Deterministic RNG, so the daily is the same for everyone ────────────
  function xmur3(str) {
    var h = 1779033703 ^ str.length;
    for (var i = 0; i < str.length; i++) {
      h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
      h = (h << 13) | (h >>> 19);
    }
    return function () {
      h = Math.imul(h ^ (h >>> 16), 2246822507);
      h = Math.imul(h ^ (h >>> 13), 3266489909);
      h ^= h >>> 16;
      return h >>> 0;
    };
  }
  function mulberry32(seed) {
    return function () {
      seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
      var t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function rngFrom(str) { return mulberry32(xmur3(str)()); }

  function shuffled(list, rand) {
    var out = list.slice();
    for (var i = out.length - 1; i > 0; i--) {
      var j = Math.floor(rand() * (i + 1));
      var t = out[i]; out[i] = out[j]; out[j] = t;
    }
    return out;
  }

  // ── Daily ───────────────────────────────────────────────────────────────
  // A fixed shuffle of the gettable breeds, walked one per day. Nothing
  // repeats until the whole pool has been used.
  var DAILY_POOL = (function () {
    var pool = PLAYABLE.filter(function (b) { return b.fame >= 3; });
    pool.sort(function (x, y) { return x.slug < y.slug ? -1 : 1; });   // stable input
    return shuffled(pool, rngFrom('limestone-pup-quiz-v1'));
  })();

  var EPOCH = Date.UTC(2026, 0, 1);

  function dayNumber(date) {
    var d = date || new Date();
    // Local calendar date, so the puzzle turns over at the player's midnight.
    var local = Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
    return Math.floor((local - EPOCH) / 86400000);
  }

  function dailyBreed(date) {
    var n = dayNumber(date);
    var i = ((n % DAILY_POOL.length) + DAILY_POOL.length) % DAILY_POOL.length;
    return DAILY_POOL[i];
  }

  function dailyKey(date) {
    var d = date || new Date();
    var m = String(d.getMonth() + 1).padStart(2, '0');
    var day = String(d.getDate()).padStart(2, '0');
    return d.getFullYear() + '-' + m + '-' + day;
  }

  function randomBreed(rand) {
    var r = rand || Math.random;
    return PLAYABLE[Math.floor(r() * PLAYABLE.length)];
  }

  // ── Answer matching ─────────────────────────────────────────────────────
  function normalize(s) {
    return String(s).toLowerCase()
      .normalize('NFD').replace(/[̀-ͯ]/g, '')   // strip accents
      .replace(/[^a-z0-9]+/g, ' ').trim();
  }

  var LOOKUP = (function () {
    var map = {};
    ALL.forEach(function (b) {
      [b.name].concat(b.aka || []).forEach(function (n) { map[normalize(n)] = b.slug; });
    });
    return map;
  })();

  function resolveGuess(text) { return LOOKUP[normalize(text)] || null; }

  function suggest(text, limit) {
    var q = normalize(text);
    if (!q) return [];
    var starts = [], contains = [];
    PLAYABLE.forEach(function (b) {
      var names = [b.name].concat(b.aka || []);
      var hit = null;
      for (var i = 0; i < names.length; i++) {
        var n = normalize(names[i]);
        if (n.indexOf(q) === 0) { hit = 'start'; break; }
        if (n.indexOf(q) !== -1) hit = 'contain';
      }
      if (hit === 'start') starts.push(b);
      else if (hit === 'contain') contains.push(b);
    });
    var byFame = function (x, y) { return y.fame - x.fame || x.name.localeCompare(y.name); };
    starts.sort(byFame); contains.sort(byFame);
    return starts.concat(contains).slice(0, limit || 8);
  }

  // ── Higher / Lower ──────────────────────────────────────────────────────
  // Only traits with an unambiguous answer, and pairs far enough apart that
  // the question is fair.
  var HL_TRAITS = [
    { id: 'weight',   label: 'weighs more',     get: function (b) { return (b.weightLb[0] + b.weightLb[1]) / 2; }, gap: 8,
      show: function (b) { return range(b.weightLb, 'lb'); } },
    { id: 'height',   label: 'is taller',       get: function (b) { return (b.heightIn[0] + b.heightIn[1]) / 2; }, gap: 2.5,
      show: function (b) { return range(b.heightIn, 'in'); } },
    { id: 'lifespan', label: 'lives longer',    get: function (b) { return (b.lifespan[0] + b.lifespan[1]) / 2; }, gap: 2,
      show: function (b) { return range(b.lifespan, 'yrs'); } },
    { id: 'shedding', label: 'sheds more',      get: function (b) { return b.shedding; }, gap: 2,
      show: function (b) { return b.shedding + '/5'; } },
    { id: 'energy',   label: 'has more energy', get: function (b) { return b.energy; }, gap: 2,
      show: function (b) { return b.energy + '/5'; } },
    { id: 'barking',  label: 'barks more',      get: function (b) { return b.barking; }, gap: 2,
      show: function (b) { return b.barking + '/5'; } },
    { id: 'grooming', label: 'needs more grooming', get: function (b) { return b.grooming; }, gap: 2,
      show: function (b) { return b.grooming + '/5'; } },
  ];

  function higherLowerRound(rand) {
    var r = rand || Math.random;
    for (var tries = 0; tries < 200; tries++) {
      var trait = HL_TRAITS[Math.floor(r() * HL_TRAITS.length)];
      var a1 = randomBreed(r), b1 = randomBreed(r);
      if (a1.slug === b1.slug) continue;
      var va = trait.get(a1), vb = trait.get(b1);
      if (Math.abs(va - vb) < trait.gap) continue;   // too close to be fair
      return { trait: trait, left: a1, right: b1, answer: va > vb ? a1.slug : b1.slug,
        values: { left: trait.show(a1), right: trait.show(b1) } };
    }
    return null;
  }

  // ── Odd One Out ─────────────────────────────────────────────────────────
  // The axis is stated in the question. A "which doesn't belong?" with no
  // stated axis has several defensible answers, which makes it a coin flip
  // dressed up as a puzzle.
  function oddOneOutRound(rand) {
    var r = rand || Math.random;
    var axes = ['group', 'origin'];

    for (var tries = 0; tries < 400; tries++) {
      var axis = axes[Math.floor(r() * axes.length)];
      var buckets = {};
      PLAYABLE.forEach(function (b) {
        var k = b[axis];
        (buckets[k] = buckets[k] || []).push(b);
      });
      var keys = Object.keys(buckets).filter(function (k) { return buckets[k].length >= 3; });
      if (!keys.length) continue;

      var key = keys[Math.floor(r() * keys.length)];
      var inGroup = shuffled(buckets[key], r).slice(0, 3);
      var outsiders = PLAYABLE.filter(function (b) { return b[axis] !== key; });
      if (outsiders.length < 1) continue;
      var odd = outsiders[Math.floor(r() * outsiders.length)];

      // The three must not accidentally share the OTHER axis with each other
      // while the outsider differs — that would make the outsider odd twice
      // over and the stated reason ambiguous.
      var other = axis === 'group' ? 'origin' : 'group';
      var sharedOther = inGroup.every(function (b) { return b[other] === inGroup[0][other]; });
      if (sharedOther && odd[other] !== inGroup[0][other]) continue;

      var options = shuffled(inGroup.concat([odd]), r);
      return {
        axis: axis,
        key: key,
        question: axis === 'group'
          ? 'Three of these belong to the ' + (GROUP_LABEL[key] || key) + ' group. Which one does not?'
          : 'Three of these were developed in ' + key + '. Which one was not?',
        options: options,
        answer: odd.slug,
        because: axis === 'group'
          ? 'It is a ' + (GROUP_LABEL[odd.group] || odd.group) + ' breed.'
          : 'It comes from ' + odd.origin + '.',
      };
    }
    return null;
  }

  window.DOG_QUIZ = {
    PLAYABLE: PLAYABLE,
    DAILY_POOL: DAILY_POOL,
    clues: clues,
    dailyBreed: dailyBreed,
    dailyKey: dailyKey,
    dayNumber: dayNumber,
    randomBreed: randomBreed,
    resolveGuess: resolveGuess,
    suggest: suggest,
    higherLowerRound: higherLowerRound,
    oddOneOutRound: oddOneOutRound,
    rngFrom: rngFrom,
  };
})();
