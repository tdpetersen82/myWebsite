# Printables build plan — harvest #6 (2026-08-25)

46 demand-verified pages in 3 waves, from 928 Google+Bing autocomplete pulls, GSC mining,
and Bing SERP field-checks. Catalog today: 52 live printables. This file is the to-do;
check items off as they ship. Waves fire on the owner's go — **do not build unprompted.**

Strategy note: this is "high-volume with the demand gate kept on," NOT bulk spam —
Google's scaled-content-abuse policy is site-wide, and printables are the only lane
that ranks. Every page below has observed demand behind it. Steady batches beat one
46-page dump (healthier crawl pattern, keeps the quality bar).

## Per-page pipeline (the standard — every page, no exceptions)

1. **Exactness gate**: every number/rule sourced from shipping game code or published
   rules at build time; where folk variants conflict, state the variant note instead of
   asserting (frustration-rummy precedent). Pagat.com is the reference for folk card games.
2. **Trademark note** (`.sheet-note`, Yahtzee-page pattern) for branded games.
3. **How to play** section on every page (standing owner directive), linking the on-site
   game where one exists.
4. **Print-measure** `.sheet` at 720×960 in the iframe harness before shipping — node
   validation is not enough; `line-height` is the shrink lever, td height is min-only.
5. **OG card** per page: local :8091 server up, `sh tools/make-printable-og.sh <slug>`,
   point og:image/twitter:image at `assets/og/<slug>.jpg` (25KB uniform files = blank-card
   failure signature).
6. **Reciprocal links**: printable is the FIRST related item on its game page; printable
   links back. Cross-link within each family (all rummy pages link each other + the hub page).
7. Hub card on `/printables/`, sitemap entry, deploy (`npx wrangler deploy`), then
   `node tools/bing-submit.mjs <urls>` same day.

## Wave 1 — card & dice classics (16) — SHIPPED 2026-08-26 (+ pitch promoted from wave 3)

Rummy family (cross-link the whole set; competitor watch: **ruleskit.com** runs our exact
one-page-HTML playbook in this space — only real incumbent):
- [x] rummy-score-sheet — generic family HUB page; links all below + gin + frustration
- [x] rummy-500-score-sheet — top rummy query; scoring: cards played minus deadwood, verify point values
- [x] shanghai-rummy-score-sheet — include the 10-round contract list (the list IS the content); variant note
- [x] liverpool-rummy-score-sheet — include hands/rounds list; variant note
- [x] contract-rummy-score-sheet — rounds list; variant note (7 rounds standard)
- [x] progressive-rummy-score-sheet — flagged since batch 4, reconfirmed

Trick-takers & bridge:
- [x] oh-hell-score-sheet — title covers Oh Hell / Up and Down the River / Oh Heck (all
      confirmed names); bid/made grid; scoring variants (10+tricks vs 1-per-trick+bonus) → variant note
- [x] whist-score-sheets — whist DRIVE scorecards (UK demand, rotation like euchre charts)
      + bid whist tally (US); cross-link euchre-rotation-charts
- [x] bridge-score-sheet — rubber/Chicago pad (WE/THEY above-below line) + contract-value
      reference; scoring is standardized, source it properly
- [x] bridge-tally-cards — 2/3/4-table party-bridge tallies, cut-out format (white-elephant
      slips precedent); hyper-specific queries, empty field

Dice:
- [x] yardzee-score-card — field-checked WIDE OPEN; large-print yahtzee-style card + yard
      dice rules; frame as "Yardzee / yard dice" (name is contested — generic-trademark note);
      links yahtzee + triple-yahtzee + farkle. Seasonal: backyard season is NOW.
- [x] kismet-score-sheet — blind-seed discovery, both engines; verify categories from
      published rules (colored combos differ from Yahtzee); confirm current publisher for note
- [x] 10000-dice-score-sheet — aka Ten Thousand; tally + scoring chart; folk variants
      (5000 variant gets a mention) → variant note; links farkle
- [x] shut-the-box-score-sheet — sheet + rules card; 1-9 vs 1-12 tile variants noted
- [x] ship-captain-crew-score-sheet — round tally + rules (6-5-4 is stable)
- [x] skip-bo-score-sheet — Mattel trademark note; verify scoring variant (points per card
      in opponents' stock, 500-point game) from official rules before printing

## Wave 2 — new hotness + party (14)

Trend games (blind-seed discoveries; cheap tally sheets, trademark notes all):
- [ ] flip-7-score-sheet — The Op; target-200 tally + bust/Flip-7-bonus reference; young
      exact-match incumbent exists (flip7score.com) → tempered expectations, still cheap
- [ ] skyjo-score-sheet — Magilano; round tally, game ends when someone crosses 100, lowest wins
- [ ] qwirkle-score-sheet — MindWare; tally + Qwirkle-bonus (12) reference
- [ ] play-nine-score-sheet — 9-hole golf-card-game pad; verify hole-in-one bonus from
      official rules; links golf-card-game-score-sheet

Party & trivia (peaks Oct–Dec — ship before then):
- [ ] trivia-answer-sheets — field-checked winnable (scattered small sites, no wall);
      10-Q and 20-Q team answer slips + host score grid; US Letter is our edge (top rival is A4/UK)
- [ ] game-night-score-sheets — generic multi-game round-tally pads (4/6/8 players) + leaderboard
- [ ] pictionary-word-lists — GENERIC word lists (easy/kids/adult/Christmas sets — Christmas
      variant is the holiday hook); "works with Pictionary®-style drawing games" framing, Mattel note
- [ ] charades-cards — cut-out cards, same generic-words framing

Compounders & classics:
- [ ] chess-score-sheet — notation sheet (numbered move pairs, event header) + brief
      "how to write algebraic notation" teaching angle (that long-tail is open; chess.com owns
      the head term); links chess game + chess-board template
- [ ] darts-score-sheets — cricket scoreboard + 501 tally + killer sheet on one page
- [ ] left-center-right-rules — rules card + regular-dice conversion chart (L/C/R faces);
      LCR is a registered trademark (George & Co.) → note
- [ ] pig-dice-score-sheet — race-to-100 tally + rules; classroom audience; links kids section
- [ ] mini-golf-scorecard — 9/18-hole cards; backyard + bucket-golf mention
- [ ] poker-run-score-sheet — our one Tier-A GSC signal (earned an impression with no page);
      rider info + 5 checkpoint boxes + hand-ranking footer; links poker-hand-rankings

## Wave 3 — boards, bar games, niche cards (16)

Boards (print-format risk: measure early; chess/checkers needed cell-shrinks at 974px):
- [ ] snakes-and-ladders-board — design OUR OWN snake/ladder positions (don't copy the
      Milton Bradley layout); kids link
- [ ] ludo-board — generic pachisi family; Jamaican-ludo variant gets a mention
- [ ] go-boards — 9×9 + 13×13 (19×19 only if legible at Letter); zero competition, evergreen
- [ ] connect-four-grids — 7×6 blank grids for paper play; Hasbro note; links connect-4 game
- [ ] chinese-checkers-board — star of 121 holes (hex geometry is the build risk); links our game
- [ ] backgammon-board — two-half/fold layout for Letter; links game + rules card
- [ ] boggle-grids — blank 4×4 + 5×5 + word-length tally; teacher demand; Hasbro note

Bar & backyard:
- [ ] shuffleboard-score-cards — table vs floor scoring differs → variant note
- [ ] bocce-score-cards — frames to 12/13/16 w/ variant note

Niche cards (thin-to-zero competition):
- [ ] rook-score-sheet — bid/score columns + point-card values (verify); trademark note
- [x] pitch-score-sheet — Pitch/Setback; 4-point standard (high/low/jack/game), 10-point variant
      noted. **Promoted: Tier-A** — GSC-observed miss "pitch card game score sheet" pos 39
      (2026-08-24 pull); build with the next batch regardless of wave
- [ ] nertz-score-sheet — tally to 100 (−2/card left, verify); links solitaire game
- [ ] sheepshead-score-sheet — Wisconsin standard scoring, leasters/doublers variant note
- [ ] garbage-rules-card — Garbage/Trash both names in title; kids link
- [ ] kings-in-the-corner-rules — rules card
- [ ] tripoley-layout — Tripoley/Michigan Rummy layout mat + rules; verify 9-section layout;
      trademark note

## New candidates from report runs (verify at build time)

- **printable parlay cards** — GSC-observed (pos 28, no page, 2026-08-24 pull). Sports-betting
  parlay sheets; casino-family adjacent (football-squares audience). Run the autocomplete +
  thin-field checks before building — office-pool sites may own it.
- **poker run score sheet** — second GSC sighting (already wave 2); signal strengthening.

## Canary-gated (do NOT build until the canary reports)

**Update 2026-08-25: /utilities/tournament-generator/ shipped** — an interactive
single/double-elim + round-robin builder (2–32 entrants, click-to-advance, print-ready,
`?format=` deep links). It targets the *generator/maker/creator*-intent half of the
bracket cluster, which printyourbrackets' static PDFs don't serve. The static printable
PAGES below stay canary-gated; if they get built, they must cross-link the tool and
vice versa.

Brackets + round-robin had the BIGGEST raw demand (82/62/62/50) but printyourbrackets.com
owns both spaces with full sitelinks. Our **football-squares page competes with that exact
site** — it is the live canary:
- **Test**: next report runs (Bing ~Aug 28, GSC ~Sep 8) — does football-squares get
  impressions/position against printyourbrackets?
- If YES → build: 8-team bracket (single+double elim), 16-team bracket (single+double),
  round-robin schedules 4–8 teams (reuse the asserted circle-method code from euchre
  rotations), cornhole-bracket variant mentions, beer-pong bracket.
- If NO → the wall is real; drop the cluster and stop reconsidering it.

## Free tweaks (do with any next deploy, no new pages)

- [ ] five-crowns-score-sheet: mention "5 Crowns" digit spelling in prose
- [ ] dominoes-score-sheet: mention Spinner dominoes variant
- [ ] hand-and-foot-score-sheet: add "Hand, Knee and Foot" variant section (3 dealt piles) —
      surprising blind-seed demand on both engines

## Skips — decided, don't re-litigate

- **Blank sudoku grids**: SERP-confirmed — the sudoku-site wall extends to blank-grid sub-queries.
- **Sports officiating sheets** (volleyball/baseball/basketball/bowling/badminton/…): off-brand,
  governing-body + template-mill walls.
- **Hobby board-game pads** (Wingspan/7 Wonders/Agricola/Terraforming Mars): publishers give
  official sheets free (field not thin), IP-sensitive, zero compounding.
- **Clue detective sheets, Cover Your Assets card list, Scrabble board/tiles**: reproduce game
  CONTENT rather than score structure — the line held since Quiddler letter values.
- **Printable card decks** (Old Maid, Go Fish): real demand but needs art + multi-page format —
  a future designed kids project, not a batch item.
- **Mahjong score sheet**: majority of demand is the NMJL annual card (copyrighted, cannot serve);
  generic-tally slice too small. Hold.
- Axe throwing, table tennis/ping pong, real-golf scorecards, pickleball standalone, molkky,
  horseshoes, ladder golf, washers: weak/off-brand/sports-drift. Hold.

## Byproducts — game demand observed (for the games roadmap, not printables)

People searching to PLAY online: shut the box, spite & malice, bid whist, oh hell, rummy 500,
kings in the corner, nertz, dutch blitz, garbage. (Games rank at ~62, so this is future-shelf
material, not a priority.)

## Data

Raw harvest: scratchpad `harvest-6-raw.json` / `harvest-6-report.txt` (session-ephemeral;
this file + memory carry the conclusions). Field checks were Bing SERPs (Bing sends ~6x
Google). Competitor watch: **ruleskit.com**.
