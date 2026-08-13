# Dog Breeds — Finder + Pup Quiz (plan)

Decisions locked 2026-08-12: self-hosted Wikimedia photos · three game modes
(Pup Quiz, Higher/Lower, Odd One Out) · v1 = Finder + the game, breed detail
pages deferred.

---

## 1. Shape

One directory, one shared database, two entry points:

```
dogs/
  index.html        Breed Finder   (quiz → adjustable filtered results)
  play.html         Pup Quiz       (3 modes + daily)
  breeds.js         the database   (~120 breeds)
  filter.js         scoring + filtering engine   (shared)
  clues.js          trait → clue-sentence renderer (game only)
  photo-credits.json
  photos/           <slug>.jpg     (~120, self-hosted)
```

`filter.js` is shared on purpose: the Finder uses it to rank breeds against a
person, the game uses the same predicates to build clues and to pick
Odd-One-Out sets. One source of truth for what a trait *means*.

Catalog placement (settled 2026-08-13): two entries, not one. Pup Quiz is
`cat: 'kids'`; the Finder is `cat: 'puzzle'` (→ Strategy). See §6.

## 2. Database (`breeds.js`) — **built**

120 breeds (113 playable + 7 finder-only crossbreeds). Not the full AKC ~200:
the tail end is unrecognizable to normal people, which makes clues unguessable
and finder results useless. Curated to breeds a person could plausibly name or
meet. Spread: sporting 17, hound 17, working 19, terrier 16, toy 15,
non-sporting 14, herding 15, crossbreed 7.

```js
{
  slug: "border-collie", name: "Border Collie", aka: [],
  group: "herding",            // sporting|hound|working|terrier|toy|non-sporting|herding|crossbreed
  origin: "Scotland / England",
  fame: 5,                     // 1–5 editorial familiarity, for weighting the daily
  size: "medium",              // toy|small|medium|large|giant
  heightIn: [18, 22], weightLb: [30, 55], lifespan: [12, 15],
  coat: "medium",              // short|medium|long|curly|wire|hairless
  coatTexture: "double", colors: ["black-white", "merle"],
  ears: "semi-erect",          // erect|floppy|semi-erect
  tail: "feathered",           // straight|curled|feathered|bobbed
  muzzle: "long",              // short|medium|long  (short ⇒ brachycephalic)
  shedding: 4, grooming: 3, drooling: 1, hypoallergenic: false,
  energy: 5, trainability: 5, barking: 3, strangers: 3,
  withKids: 4, withDogs: 4, aloneTolerance: 2, preyDrive: 4,
  jobs: ["herding"],           // herding|guarding|retrieving|ratting|sledding|scenting|
                               // coursing|lap|companion|water-rescue|drafting
  firstTimeOwner: false,
  // inGame: false             // finder-only; crossbreeds have no fair quiz answer
  blurb: "…", fact: "…"
}
```

Two schema changes from the original sketch:

- **`popularityRank` → `fame` (1–5).** Exact AKC registration ranks for 120
  breeds would have meant approximating numbers and presenting them as data.
  The field only feeds daily-weighting and tie-breaks, which need buckets, not
  precision.
- **`inGame: false`** for the crossbreeds. Doodles are a large share of what
  people search a breed finder for, so excluding them would make the Finder
  feel broken — but they have no standard, so they'd be unfair quiz answers.

`tools/validate-breeds.js` checks the whole file: enums, 1–5 ranges,
min ≤ max, duplicate slugs, autocomplete-name collisions across names and
aliases, cross-field sanity (hairless ⇒ `coatTexture: none`, hypoallergenic ⇒
low shedding), per-group counts against Odd One Out's need for four, and — the
one that mattered most — whether a breed's `fact` leaks its own name, since
that string is Pup Quiz's final clue. Run it after any edit to the database:

```bash
node tools/validate-breeds.js
```

Every field is an enum, a range, or a 1–5 scale, so both products read the same
records with no per-mode special-casing.

**Honesty rule.** Size, weight, lifespan, group, and country of origin are
verifiable and must be right (AKC breed standards). The 1–5 temperament scales
are editorial by nature — the page says so once, plainly ("typical tendencies,
not a promise about any individual dog"), and the Finder never phrases a match
as a guarantee. No health-condition claims in v1.

## 3. Photo pipeline (self-hosted Wikimedia) — **built**

120 photos in `dogs/photos/` (~17 MB), every one free-licensed and credited.
`tools/fetch-breed-photos.js` has four modes: `--manifest` (metadata only),
`--refresh <slugs>` (re-derive a few), `--download` (resumable), `--reclean`
(tidy attribution strings without re-querying).

What the run actually taught us, all of it caught by checks rather than luck:

- **An article's lead image is not necessarily the breed.** "Newfoundland"
  returned the *flag of Newfoundland and Labrador*; "Brittany" returned a NASA
  satellite photo of the French region. Bare breed names collide with places
  all over Wikipedia — Boxer, Akita, Chihuahua, Dalmatian, Maltese, Pomeranian,
  Samoyed and Puli all resolve to something that isn't a dog. Fixed with an
  explicit title map plus a `NOT_A_DOG` block on flag/map/satellite imagery.
- **A name match isn't a breed match.** The Bulldog got "French bulldog in a
  life jacket" because "bulldog" appeared in the filename. Now a file naming a
  *different* breed is rejected unless that name is a longer form of this one.
- **Quality screening has to run on lead images too**, not just search results
  — that's how a four-way Akita collage and an all-four-varieties Belgian
  shepherd collage got through the first pass.
- **Title heuristics can't see the picture.** The auto-picked Pug was a macro
  shot of fur and the Toy Poodle was mostly the handler's arms; both filenames
  looked perfectly reasonable. Those two are hand-picked via `FILE_OVERRIDE`,
  and the only way to find them was looking at a contact sheet of all 120.

GPL and GFDL are rejected despite being free — their source/full-text
obligations don't fit a photo credit line, so those fall through to the
Commons search for a cleaner alternative. Licences used: CC BY-SA (75),
public domain / CC0 / PD (20), CC BY (21), Copyrighted free use (2).

## 3b. Original photo plan (for reference)

Per breed: Wikipedia article → `pageimages` for the lead image → `imageinfo`
with `extmetadata` for `LicenseShortName`, `Artist`, `LicenseUrl`.

- **Accept** CC0 / public domain / CC-BY / CC-BY-SA only. Anything else, or
  anything with missing license metadata, gets skipped and hand-sourced from
  Commons — never guessed.
- **Encode**: there is no webp CLI on this machine (no cwebp/ffmpeg/magick;
  `sips` reads webp but cannot write it). So photos ship as **JPEG** —
  `sips` resize to 800px wide, quality ~70. Universally supported, no tooling
  dance. The one webp asset (the 600×600 Strategy tile) still uses the
  Chrome-canvas trick from the existing thumbnail workflow.
- **Attribution**: `photo-credits.json` keyed by slug (`artist`, `license`,
  `licenseUrl`, `sourceUrl`), rendered as a small credit line under each photo
  plus a full credits list at the bottom of the Finder. CC-BY-SA covers the
  image itself, not the page it sits on — resized/cropped copies stay
  CC-BY-SA and are labelled as such.
- Budget ~120 images to source, verify, crop, and credit. This is its own pass
  and should not be hand-waved into the build step.

## 4. Breed Finder (`dogs/index.html`) — **built**

Two halves of one screen, not two features.

**Quiz — 8 questions about the person**, not the dog: home (apartment /
house / house with yard), hours alone on a workday, allergies in the household,
weekly activity level, kids at home (and ages), first dog or not, grooming
tolerance, barking tolerance.

**Results = a live filter browser.** The quiz's answers arrive as pre-set
filters that stay visible and adjustable — sliders and chips over the same
fields. Every result card shows *why* it matched ("low shedding · calm ·
tolerates being alone"), and the panel surfaces near-misses ("3 more breeds if
you allow moderate shedding"), which is what turns it from a one-shot quiz into
something people fiddle with.

Scoring: weighted distance over the trait vector, with hard filters for the
non-negotiables (allergies → hypoallergenic; toddler in the house → floor on
`withKids`). Ties broken by `fame` so the familiar breed surfaces first.

Only three answers exclude rather than rank — allergies, toddlers, and a long
workday. Everything else scores, which is why a Greyhound still shows up for an
apartment: a hard size filter would have hidden the correct answer.

One refinement fell out of testing. A nine-hour workday first excluded anything
below `aloneTolerance` 4, which left an allergic apartment dweller with exactly
one breed. Filters now support a **`floor`** separate from their preferred
`value`: the floor excludes (dogs that genuinely can't be left), the value
still ranks (the most independent breeds first). The honest answer to that
persona is four breeds — most low-allergen breeds are companion breeds that
hate solitude — so the near-miss row carries the weight: "+36 if you drop the
low-allergen requirement".

Shareable result: "My match: Border Collie" with the top three, using the
existing `share.js` bar.

## 5. Pup Quiz (`dogs/play.html`) — **built**

One page, a mode picker, three modes. Only Pup Quiz gets a daily.

**Pup Quiz — clue ladder.** Five clues, revealed one at a time:

1. Group + country of origin
2. Size + typical lifespan
3. Coat, ears, tail
4. What it was bred to *do*
5. The giveaway fun fact

Guess at any point via autocomplete over the breed names (accepts `aka`
aliases). Wrong guess → next clue. Score = clues used; a win on clue 1 is worth
5, on clue 5 worth 1. Photo reveals on resolution, with credit line.

- **Daily**: date-seeded, same breed for everyone, shareable emoji row
  (🟩⬜⬜⬜⬜), localStorage streak + best streak. A finished daily can't be
  replayed. Rolls over at the player's local midnight, not UTC.
- **Endless**: random breeds from all 113, running score, localStorage best.

**The daily pool is 81 breeds, not 120** — it's drawn from `fame >= 3` so the
puzzle stays gettable, which means it wraps after 81 days. That's the concrete
version of the caveat in §6. Extending it means either lowering the fame floor
(and making some days unguessable) or rotating the daily across all three
modes.

**Higher/Lower.** Two breed cards, one question ("which sheds more?", "which
lives longer?", "which weighs more?"), one tap. Streak-based, endless.
Near-free once the database exists and the best of the three on a phone. Ties
and near-ties are excluded when generating pairs so no round is unfair.

**Odd One Out.** Four breeds, three share a group or a country of origin. The
generator must verify the odd one is odd on *exactly* the stated axis, and that
no unintended second grouping makes another answer equally defensible —
otherwise it's a coin flip dressed as a puzzle.

localStorage keys follow the existing card/dice convention
(`{wins, games, best, streak}`), so `profile/profile.js` can pick it up.

## 6. Honest caveat on "the daily"

This is a trivia daily, not the original logic-puzzle flagship from the July
plan. Two consequences worth naming up front:

- **~120 breeds = ~120 unique dailies** before repeats. Extending it means
  rotating the daily across all three modes, or generating clue-sets rather
  than picking breeds.
- Trivia dailies are shareable but not *linkable* the way a novel mechanic is.
  This is a good return-visit hook and a strong SEO play through the Finder; it
  does not replace the flagship puzzle concept, and shouldn't be sold as one.

The Finder is the real growth asset here — "what dog breed is right for me" is
a fat query, and a genuinely good free tool earns links in a way a game does
not.

## 7. Registration surface

Per the established checklist:

1. `dogs/index.html` + `dogs/play.html` — self-contained, auto-scaling,
   localStorage scores.
2. `.cat-card` on `strategy/index.html` (model on a sibling; static stat cells,
   no live streak IDs) — plus the page's meta description / keywords.
3. `games-catalog.js` → `LG_GAMES` entry (`{id:'dogs', name:'Pup Quiz',
   cat:'puzzle', …}`); `hub.js` → `GLYPH_PATHS`, `THUMBS`, `SCORE_KEYS`.
4. `assets/thumbs/dogs.webp` — 600×600, required for the Strategy card.
5. Hub `index.html` JSON-LD `ItemList` (+ `numberOfItems`).
6. `sitemap.xml` (+ `lastmod` bumps), `?v=YYYYMMDD` bumps on every page that
   loads a changed `games-catalog.js` / `hub.js` / CSS.
7. `profile/profile.js` — add the row, or it silently never appears.

Open question for registration: the Finder is a *utility* sharing a directory
with a game. Simplest is one catalog entry pointing at `dogs/play.html` with
the Finder cross-linked from it, plus a Finder link from `utilities/`. Worth a
decision before wiring.

## 8. Suggested order of work

1. ~~`breeds.js` — the 120 records.~~ **Done**, with `tools/validate-breeds.js`
   passing clean. Not yet reviewed by a human for factual accuracy.
2. ~~`filter.js` + Finder.~~ **Done.** `tools/test-finder.js` covers four
   personas plus engine invariants; verified in the browser at desktop and
   375px. Not yet linked from anywhere — see the registration question in §7.
3. ~~Photo pass.~~ **Done** — 120 free-licensed, credited, visually verified.
4. ~~Pup Quiz clue ladder + daily + share.~~ **Done.**
5. ~~Higher/Lower, Odd One Out.~~ **Done** — both in `play.html`.
6. ~~Registration surface.~~ **Done.** Placement settled 2026-08-13: the two
   halves are registered as separate catalog entries, because they serve
   different people.
   - **Pup Quiz** → `cat: 'kids'`, card on `kids/index.html`, tile + profile
     row under Kids. Its clues use breed groups and height ranges, so the card
     carries a "Reading: Needed" cell rather than pretending it suits age 4.
   - **Dog Breed Finder** → `cat: 'puzzle'`, card on `strategy/index.html`,
     its own homepage tile. Precedent: Crossword Maker is also a tool rather
     than a game and lives in Strategy.
   Both use the `url` override since they share the `/dogs/` directory.
7. ~~Fact-check of `breeds.js`.~~ **Done** via `tools/check-breed-facts.js`
   (`--online`): country of origin cross-checked against Wikidata P495, and
   every `fact` string checked for corroboration in its Wikipedia article.
   99/120 origins agreed; 10 claims were corrected or replaced with sourced
   ones; 116/120 facts now corroborate. The four that don't are AKC
   registration statistics Wikipedia doesn't cover, or phrasing mismatches
   verified by hand. **The 1–5 behavioural scales remain editorial and
   unverifiable by any source** — they're labelled as such in the UI.

Deferred to v2: ~120 generated static breed detail pages (the long-tail SEO
surface), photo-ID as a fourth mode.
