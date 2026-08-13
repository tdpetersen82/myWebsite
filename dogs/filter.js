// Dog Breed Finder — scoring and filtering engine.
// Shared by the Finder (dogs/index.html) and, later, Pup Quiz's clue and
// Odd-One-Out generators, so that "what a trait means" is defined exactly once.
//
// Reads window.DOG_BREEDS. Exposes window.DOG_FINDER.
(function () {
  'use strict';

  // ── Criteria ──────────────────────────────────────────────────────────
  // kind:
  //   max     breed[field] above the value is penalized  (shedding ≤ 2)
  //   min     breed[field] below the value is penalized  (withKids ≥ 4)
  //   target  distance from the value is penalized       (energy ≈ 3)
  //   flag    value true requires breed[field] true      (hypoallergenic)
  //   set     breed[field] must be in the chosen Set     (size, group, coat)
  // weight scales the penalty. `hard` is per-filter, not per-criterion: the
  // quiz decides that allergies are non-negotiable but barking is a
  // preference, and the results panel lets you change your mind.
  //
  // A filter may also carry a `floor` (min kinds) — breeds below it are
  // excluded outright while `value` stays a soft preference above it. A nine-
  // hour workday should rule out the dogs that genuinely can't be left, and
  // still rank the most independent breeds first, without collapsing the
  // result list to a single dog.
  var CRITERIA = [
    { id: 'size',     kind: 'set',    field: 'size',           label: 'Size',                weight: 1.0 },
    { id: 'group',    kind: 'set',    field: 'group',          label: 'Breed group',         weight: 1.0 },
    { id: 'coat',     kind: 'set',    field: 'coat',           label: 'Coat',                weight: 1.0 },
    { id: 'hypo',     kind: 'flag',   field: 'hypoallergenic', label: 'Low-allergen coat',   weight: 3.0 },
    { id: 'novice',   kind: 'flag',   field: 'firstTimeOwner', label: 'Good first dog',      weight: 2.0 },
    { id: 'kids',     kind: 'min',    field: 'withKids',       label: 'Good with kids',      weight: 2.0 },
    { id: 'alone',    kind: 'min',    field: 'aloneTolerance', label: 'Copes alone',         weight: 2.0 },
    { id: 'dogs',     kind: 'min',    field: 'withDogs',       label: 'Good with dogs',      weight: 1.0 },
    { id: 'energy',   kind: 'target', field: 'energy',         label: 'Energy',              weight: 1.6 },
    { id: 'shedding', kind: 'max',    field: 'shedding',       label: 'Shedding',            weight: 1.4 },
    { id: 'grooming', kind: 'max',    field: 'grooming',       label: 'Grooming',            weight: 1.2 },
    { id: 'barking',  kind: 'max',    field: 'barking',        label: 'Barking',             weight: 1.0 },
    { id: 'drooling', kind: 'max',    field: 'drooling',       label: 'Drooling',            weight: 0.8 },
  ];

  var BY_ID = {};
  CRITERIA.forEach(function (c) { BY_ID[c.id] = c; });

  // ── Quiz ──────────────────────────────────────────────────────────────
  // Each option contributes filter entries. `hard: true` excludes rather than
  // penalizes — reserved for the things that genuinely rule a dog out.
  var QUESTIONS = [
    {
      id: 'home', q: 'Where do you live?',
      options: [
        { id: 'apartment', label: 'An apartment',        sets: { size: { value: ['toy', 'small', 'medium'] }, barking: { value: 3 } } },
        { id: 'house',     label: 'A house, no yard',    sets: { size: { value: ['toy', 'small', 'medium', 'large'] } } },
        { id: 'yard',      label: 'A house with a yard', sets: {} },
      ],
    },
    {
      id: 'alone', q: 'On a normal workday, how long is the dog alone?',
      options: [
        { id: 'rarely', label: 'Rarely — someone is home', sets: {} },
        { id: 'short',  label: 'Up to about four hours',   sets: { alone: { value: 2 } } },
        { id: 'long',   label: 'Six to nine hours',        sets: { alone: { value: 4, floor: 3 } } },
      ],
    },
    {
      id: 'allergies', q: 'Does anyone in the household have dog allergies?',
      options: [
        { id: 'no',  label: 'No',                              sets: {} },
        { id: 'mild', label: 'Mild — prefer a low-shed coat',  sets: { shedding: { value: 2 } } },
        { id: 'yes', label: 'Yes — it has to be low-allergen', sets: { hypo: { value: true, hard: true } } },
      ],
    },
    {
      id: 'activity', q: 'How much exercise will the dog actually get?',
      options: [
        { id: 'low',  label: 'Short walks, mostly indoors',   sets: { energy: { value: 2 } } },
        { id: 'mid',  label: 'A decent walk or two a day',    sets: { energy: { value: 3 } } },
        { id: 'high', label: 'Long hikes, running, dog sport', sets: { energy: { value: 5 } } },
      ],
    },
    {
      id: 'kids', q: 'Are there children at home?',
      options: [
        { id: 'none',   label: 'No children',            sets: {} },
        { id: 'school', label: 'School-age children',    sets: { kids: { value: 4 } } },
        { id: 'small',  label: 'Toddlers or babies',     sets: { kids: { value: 4, hard: true } } },
      ],
    },
    {
      id: 'experience', q: 'Have you had a dog before?',
      options: [
        { id: 'first', label: 'This would be my first', sets: { novice: { value: true } } },
        { id: 'some',  label: "I've had dogs before",   sets: {} },
        { id: 'lots',  label: "I've handled working breeds", sets: {} },
      ],
    },
    {
      id: 'grooming', q: 'How much grooming are you up for?',
      options: [
        { id: 'min',  label: 'As little as possible',   sets: { grooming: { value: 2 }, drooling: { value: 3 } } },
        { id: 'some', label: 'A brush a few times a week', sets: { grooming: { value: 3 } } },
        { id: 'lots', label: "Daily brushing is fine",  sets: {} },
      ],
    },
    {
      id: 'noise', q: 'How much barking can you live with?',
      options: [
        { id: 'quiet', label: 'It needs to be quiet',   sets: { barking: { value: 2 } } },
        { id: 'some',  label: 'Some barking is fine',   sets: { barking: { value: 4 } } },
        { id: 'any',   label: "Doesn't bother me",      sets: {} },
      ],
    },
  ];

  // ── Filters ───────────────────────────────────────────────────────────
  // A filter set is { criterionId: { value, hard } }. Absent or null = unset.
  function answersToFilters(answers) {
    var filters = {};
    QUESTIONS.forEach(function (q) {
      var chosen = answers[q.id];
      if (!chosen) return;
      var opt = null;
      q.options.forEach(function (o) { if (o.id === chosen) opt = o; });
      if (!opt) return;
      Object.keys(opt.sets).forEach(function (key) {
        var spec = opt.sets[key];
        if (!spec) return;
        // Later answers tighten rather than replace: keep the stricter of the two.
        var existing = filters[key];
        if (existing) {
          filters[key] = tighten(BY_ID[key], existing, spec);
        } else {
          filters[key] = { value: spec.value, hard: !!spec.hard, floor: spec.floor == null ? null : spec.floor };
        }
      });
    });
    return filters;
  }

  function tighten(criterion, a, b) {
    var hard = a.hard || b.hard;
    // Keep the strictest floor either answer asked for.
    var floor = (a.floor == null) ? (b.floor == null ? null : b.floor)
              : (b.floor == null ? a.floor : Math.max(a.floor, b.floor));
    if (!criterion) return { value: b.value, hard: hard, floor: floor };
    switch (criterion.kind) {
      case 'max': return { value: Math.min(a.value, b.value), hard: hard, floor: floor };
      case 'min': return { value: Math.max(a.value, b.value), hard: hard, floor: floor };
      case 'set': {
        // Intersect, but never down to nothing.
        var setA = a.value, setB = b.value;
        var both = setA.filter(function (v) { return setB.indexOf(v) !== -1; });
        return { value: both.length ? both : setB, hard: hard, floor: floor };
      }
      default: return { value: b.value, hard: hard, floor: floor };
    }
  }

  // Penalty for one criterion. 0 means the breed satisfies it.
  function penaltyFor(criterion, value, breed) {
    var v = breed[criterion.field];
    switch (criterion.kind) {
      case 'max':    return Math.max(0, v - value);
      case 'min':    return Math.max(0, value - v);
      case 'target': return Math.abs(v - value);
      case 'flag':   return value && !v ? 1 : 0;
      case 'set':    return (value && value.length && value.indexOf(v) === -1) ? 1 : 0;
      default:       return 0;
    }
  }

  function evaluate(breed, filters) {
    var penalty = 0, met = [], missed = [], excludedBy = null;
    for (var i = 0; i < CRITERIA.length; i++) {
      var c = CRITERIA[i];
      var f = filters[c.id];
      if (!f || f.value == null) continue;
      // A floor excludes outright; `value` remains a soft preference above it.
      if (f.floor != null && penaltyFor(c, f.floor, breed) > 0) { excludedBy = c.id; break; }
      var p = penaltyFor(c, f.value, breed);
      if (p > 0 && f.hard) { excludedBy = c.id; break; }
      if (p === 0) met.push(c.id);
      else { penalty += p * c.weight; missed.push({ id: c.id, by: p }); }
    }
    return {
      excludedBy: excludedBy,
      penalty: penalty,
      score: excludedBy ? 0 : Math.max(0, Math.round(100 - penalty * 6)),
      met: met,
      missed: missed,
    };
  }

  // ── Ranking ───────────────────────────────────────────────────────────
  function rank(breeds, filters, opts) {
    opts = opts || {};
    var out = [];
    breeds.forEach(function (b) {
      if (!opts.includeCrossbreeds && b.group === 'crossbreed') return;
      var r = evaluate(b, filters);
      if (r.excludedBy) return;
      out.push({ breed: b, score: r.score, met: r.met, missed: r.missed });
    });
    out.sort(function (x, y) {
      if (y.score !== x.score) return y.score - x.score;
      if (y.breed.fame !== x.breed.fame) return y.breed.fame - x.breed.fame;
      return x.breed.name.localeCompare(y.breed.name);
    });
    return out;
  }

  // ── Near misses ───────────────────────────────────────────────────────
  // "3 more breeds if you allow moderate shedding." Only reports relaxations
  // that would actually add results, biggest first.
  function nearMisses(breeds, filters, opts) {
    var base = rank(breeds, filters, opts).length;
    var out = [];

    Object.keys(filters).forEach(function (id) {
      var c = BY_ID[id], f = filters[id];
      if (!c || !f || f.value == null) return;

      var relaxed = null, label = null;
      if (c.kind === 'min' && f.floor != null && f.floor > 1) {
        // Exclusion comes from the floor, so that's what has to move.
        relaxed = { value: f.value, hard: f.hard, floor: f.floor - 1 };
        label = 'accept ' + c.label.toLowerCase() + ' of ' + (f.floor - 1);
      } else if (c.kind === 'max' && f.value < 5) {
        relaxed = { value: f.value + 1, hard: f.hard, floor: f.floor };
        label = 'allow ' + c.label.toLowerCase() + ' up to ' + (f.value + 1);
      } else if (c.kind === 'min' && f.value > 1) {
        relaxed = { value: f.value - 1, hard: f.hard, floor: f.floor };
        label = 'accept ' + c.label.toLowerCase() + ' of ' + (f.value - 1);
      } else if (c.kind === 'flag' && f.value) {
        relaxed = { value: null, hard: false };
        label = 'drop the ' + c.label.toLowerCase() + ' requirement';
      } else if (c.kind === 'target') {
        return; // relaxing a target isn't a single direction — skip.
      } else if (c.kind === 'set') {
        return; // handled below, per omitted option.
      }
      if (!relaxed) return;

      var trial = Object.assign({}, filters);
      trial[id] = relaxed;
      var n = rank(breeds, trial, opts).length - base;
      if (n > 0) out.push({ id: id, label: label, count: n, relaxed: relaxed });
    });

    // For set filters, report the single omitted option that would add most.
    ['size', 'group', 'coat'].forEach(function (id) {
      var f = filters[id];
      if (!f || !f.value || !f.value.length) return;
      var c = BY_ID[id];
      var allValues = {};
      breeds.forEach(function (b) { allValues[b[c.field]] = true; });
      var best = null;
      Object.keys(allValues).forEach(function (v) {
        if (f.value.indexOf(v) !== -1) return;
        var trial = Object.assign({}, filters);
        trial[id] = { value: f.value.concat([v]), hard: f.hard };
        var n = rank(breeds, trial, opts).length - base;
        if (n > 0 && (!best || n > best.count)) {
          best = { id: id, label: 'include ' + v + ' breeds', count: n, relaxed: trial[id] };
        }
      });
      if (best) out.push(best);
    });

    out.sort(function (a, b) { return b.count - a.count; });
    return out.slice(0, 3);
  }

  // ── Phrasing ──────────────────────────────────────────────────────────
  // Describes what a breed actually is, for the "why it matched" line. Only
  // ever says things the record supports.
  var PHRASE = {
    shedding: function (b) { return b.shedding <= 1 ? 'barely sheds' : b.shedding <= 2 ? 'sheds very little' : null; },
    grooming: function (b) { return b.grooming <= 2 ? 'easy to groom' : null; },
    barking:  function (b) { return b.barking <= 2 ? 'quiet' : null; },
    drooling: function (b) { return b.drooling <= 1 ? "doesn't drool" : null; },
    energy:   function (b) { return b.energy >= 5 ? 'very high energy' : b.energy <= 2 ? 'low energy' : 'moderate energy'; },
    kids:     function (b) { return b.withKids >= 5 ? 'great with kids' : b.withKids >= 4 ? 'good with kids' : null; },
    dogs:     function (b) { return b.withDogs >= 4 ? 'good with other dogs' : null; },
    alone:    function (b) { return b.aloneTolerance >= 4 ? 'copes well alone' : b.aloneTolerance >= 3 ? 'tolerates being alone' : null; },
    hypo:     function (b) { return b.hypoallergenic ? 'low-allergen coat' : null; },
    novice:   function (b) { return b.firstTimeOwner ? 'good first dog' : null; },
    // size, group and coat are deliberately absent: they're already printed
    // under the breed name, and "medium size" is a fact, not a reason.
    size:     null,
    group:    null,
    coat:     null,
  };

  function reasons(result, limit) {
    var out = [];
    result.met.forEach(function (id) {
      var fn = PHRASE[id];
      if (!fn) return;
      var text = fn(result.breed);
      if (text && out.indexOf(text) === -1) out.push(text);
    });
    return out.slice(0, limit || 3);
  }

  // What the breed asks of you that you said you'd rather avoid.
  function caveats(result, limit) {
    var out = [];
    result.missed.forEach(function (m) {
      var c = BY_ID[m.id], b = result.breed;
      if (!c) return;
      if (c.kind === 'max') out.push(c.label.toLowerCase() + ' is ' + b[c.field] + ' of 5');
      else if (c.kind === 'min') out.push(c.label.toLowerCase() + ' is only ' + b[c.field] + ' of 5');
      else if (c.kind === 'target') out.push(c.label.toLowerCase() + ' is ' + b[c.field] + ' of 5');
      else if (c.id === 'novice') out.push('not usually a first dog');
      else if (c.id === 'hypo') out.push('not low-allergen');
    });
    return out.slice(0, limit || 2);
  }

  window.DOG_FINDER = {
    CRITERIA: CRITERIA,
    QUESTIONS: QUESTIONS,
    byId: BY_ID,
    answersToFilters: answersToFilters,
    evaluate: evaluate,
    rank: rank,
    nearMisses: nearMisses,
    reasons: reasons,
    caveats: caveats,
  };
})();
