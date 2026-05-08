# Player Profile + Centralized Casino Reload — Plan

## Context

Today every casino game has its own "Reload $1,000" button (in a `BrokeModal` and in the dev tweaks panel). That makes reloading too cheap and lets a player ride out a bad run by clicking reload mid-game. Reloading should feel like *cashing out*: you have to leave the game, and your run-scoped stats reset — but lifetime stats (total $ won, peak bankroll ever, biggest payout, rare events, per-game volume) stay forever as a trophy case.

Bankroll is *already* shared across all 8 casino games via `casino/casino-bankroll.js` (`localStorage.casinoBankroll`). Per-game stats are siloed in keys like `rouletteStats`, `videoPokerStats`, etc. Blackjack and Slot Machine track no stats at all. The casino landing aggregates only 3 games' stats.

The Player Profile is **site-wide** — it can host all 4 categories (Casino, Arcade, Kids, Strategy & Puzzles), not just casino. Casino is full-featured; the other three are skeleton sections that aggregate existing high-score localStorage keys, extensible later.

## Approach

1. New shared stats module `casino/casino-stats.js` (sibling to `casino-bankroll.js`).
2. New site-wide page at `/profile/` — the only place reload happens.
3. Each game replaces its in-game `Reload $1,000` UI with a "Cash out & start over" link to `/profile/`, and routes its existing per-hand/per-spin stat writes through the new module.
4. Top-nav "Profile" link added on landing pages and `nav.js`.
5. Blackjack and Slot Machine get fresh stat hooks (currently track nothing).

## Files

**New:**
- `profile/index.html` — page shell + top nav, matches casino styling
- `profile/profile.js` — page controller; reads `CASINO_STATS` + `CASINO_BANKROLL` + `CASINO_PLAYER`; wires confirm-reload; `storage`/`focus` listeners for cross-tab + tab-return refresh
- `profile/profile.css` — styles, cribbed from `casino/casino.css`
- `casino/casino-stats.js` — shared stats module

**Edited:**
- All 8 casino game `index.html` files — add `<script src="../casino/casino-stats.js">` before `casino-bankroll.js`
- All 8 casino game `*-app.jsx` files — replace `BrokeModal` reload handler; wire `CASINO_STATS.recordEvent(...)` at existing stats sites; add `CASINO_STATS.recordPeak(bankroll)` next to bankroll writes
- `casino/casino.js` — switch tile aggregations to `CASINO_STATS.read()`; replace landing reload button with a link to `/profile/`
- `nav.js` — add "Profile" entry to the right-side tools cluster, using existing `basePath` logic so the link resolves from any subfolder
- Landing pages (`index.html`, `casino/index.html`, `arcade/index.html`, `kids/index.html`, `strategy/index.html`) — add a Profile link in their hand-rolled nav

## `casino-stats.js` API

Single localStorage key: `casinoStats` (one JSON blob, atomic writes, single `storage` event for cross-tab).

```
{
  schemaVersion: 1,
  lifetime: {
    netWon: 0,                          // cumulative (final − $1000) per banked run
    peakBankrollEver: 1000,
    biggestPayout: { amount, game, when },
    runsPlayed: 0,
    bestRunPeak: 0,
    rare: { royalFlushes, blackjacks, straightFlushes, slotJackpots, pointsMade },
    perGame: {
      blackjack:      { handsPlayed, handsWon, biggestWin },
      roulette:       { spinsPlayed, spinsWon, biggestWin },
      videoPoker:     { handsPlayed, handsWon, biggestWin },
      solitaire:      { gamesPlayed, gamesWon },
      craps:          { rollsPlayed, passWins, biggestWin },
      threeCardPoker: { handsPlayed, handsWon, biggestWin, biggestPP },
      texasHoldem:    { handsPlayed, handsWon, biggestPot, biggestWin },
      slotMachine:    { spinsPlayed, biggestWin }
    }
  },
  run: { peakBankroll: 1000, handsPlayed: 0, winStreak: 0, startedAt: <ts> }
}
```

`window.CASINO_STATS`:
- `recordEvent(game, { kind, won, payout, rare })` — read-modify-write the blob; update perGame counters, lifetime peaks/biggestPayout, rare counters, run.handsPlayed/winStreak. Caller passes `payout`; module does **not** read bankroll.
- `recordPeak(bankroll)` — cheap; only writes when strictly above `lifetime.peakBankrollEver` or `run.peakBankroll`. Call alongside `CASINO_BANKROLL.write(...)`.
- `bankRun(finalBankroll)` — fold run into lifetime: `netWon += finalBankroll − 1000`; `runsPlayed += 1`; `bestRunPeak = max(bestRunPeak, run.peakBankroll)`; reset `run` to defaults.
- `read()` — deep copy for the profile page.
- `resetAll()` — destructive, dev-only; replaces existing per-game tweaks-panel resets.

**Migration**: one-shot `migrateIfNeeded()` (same pattern as `casino-bankroll.js` legacy migration). Seeds `lifetime.perGame` from existing keys (`rouletteStats.stats`, `videoPokerStats.stats`, `crapsStats`, `threeCardPokerStats`, `texasHoldemStats`, `solitaireStats`); seeds `peakBankrollEver` from current `casinoBankroll`; sets `runsPlayed = 0` (no history). Guards on `schemaVersion`. Legacy keys stay in place so a stale tab keeps working mid-rollout.

## Reload semantics (profile page only)

User clicks "Cash out & start over" → confirm dialog ("This ends your run and resets bankroll to $1,000. Lifetime stats are kept.") → on confirm:

1. `final = CASINO_BANKROLL.read()`
2. `CASINO_STATS.bankRun(final)` — banks net delta into `lifetime.netWon`, bumps `runsPlayed`, captures `bestRunPeak`, zeros `run`
3. `CASINO_BANKROLL.reload()` — bankroll → $1000
4. Re-render

**Untouched by reload**: `netWon` (just bumped), `peakBankrollEver`, `biggestPayout`, `runsPlayed`, `bestRunPeak`, `rare.*`, `perGame.*`, player name. **Zeroed**: bankroll → 1000, `run.peakBankroll` → 1000, `run.handsPlayed` → 0, `run.winStreak` → 0, `run.startedAt` → now.

## Per-game integration

Pattern per game: (a) replace BrokeModal "Reload $1,000" with a "Cash out & start over" link to `/profile/?from=<game>`; (b) add `CASINO_STATS.recordEvent(...)` at the existing `setStats(...)` site; (c) add `CASINO_STATS.recordPeak(bankroll)` next to the bankroll-write.

| Game | Stats site | Rare event | Notes |
|---|---|---|---|
| Blackjack | `bj-app.jsx:601`, modal at `bj-app.jsx:884` | `'blackjack'` when `bjDelta>0` | new persistence — stats are in-memory today |
| Roulette | `rl-app.jsx:238` | none | drop legacy `rouletteStats` write at line 69 after one release |
| Video Poker | `vp-app.jsx:253`, modal at `vp-app.jsx:474` | `'royalFlush'` when `result.key==='royal-flush'` | |
| Craps | `cr-app.jsx:327` | `'pointMade'` when `result.bannerKind==='point_made'` | |
| Three Card Poker | `tcp-app.jsx:290` | `'straightFlush'` for SF/mini-royal | special-case `biggestPP` |
| Texas Hold'em | `th-app.jsx:783` | `'straightFlush'` | leave existing in-table rebuy as-is — it's a transfer, not a reload, so don't call `bankRun` |
| Solitaire | `sol-app.jsx:546` | none | `kind:'game'`, `payout:0` |
| Slot Machine | `slot-app.jsx:57-63` | `'slotJackpot'` when `result.kind==='jackpot'` | new persistence — also remove standalone Reload button at `slot-app.jsx:93-94` |

Tweaks panels keep their dev "reset" affordances but route through `CASINO_STATS.resetAll()`.

## Profile page layout

- **Top nav** (Profile is active link)
- **Header card**: player name (inline-editable via `CASINO_PLAYER`) · "Cash out & reset run" button (with confirm)
- **Hero strip** (4 tiles): current bankroll · peak bankroll ever · net $ won lifetime · runs played
- **Casino — The Floor**:
  - Run-scope row: peak this run · hands this run · win streak
  - Lifetime row: biggest single payout (with game) · best-run peak
  - Rare-event chips: royal flushes · blackjacks · straight flushes · slot jackpots · points made
  - 8 per-game cards with `lifetime.perGame[*]` counters and "Take a seat →" link
- **Arcade** (skeleton): registry-driven; reads existing high-score keys (`pongHighScore`, `asteroidsHighScore`, `snakeHighScore`, `defenderHighScore`, `froggerHighScore`, `missileCommandHighScore`, plus `CONFIG.HIGH_SCORE_KEY` for lunar-lander / spacex-lander, `SIMON_CONFIG.HIGH_SCORE_KEY`, `2048` HS_KEY). Games without persistence today render `—`.
- **Kids** (skeleton): bubble-pop, memory-match (`KEY_BEST` — lower is better), counting-critters, shape-sorter
- **Strategy & Puzzles** (skeleton): connect-dots `dotsBoxesStats` (W/L/T); Connect 4, Hex Defense, Exodus → `—`
- **Footer**: "Play money only" disclaimer

`profile.js` mirrors `casino/casino.js`'s `update()` + `storage` listener + `focus` listener pattern.

## Nav integration

- **Landing pages** (hand-rolled nav): add `<a href="/profile/">Profile</a>` to each `*-nav-links` block.
- **`nav.js`**: add a Profile entry in the right-side tools cluster (around line 200), using the existing `basePath` resolution (lines 137–154) so the href works from any subfolder.

## Edge cases

- **Migration runs once** — guarded by `schemaVersion`. Re-runs are no-ops.
- **Multi-tab divergence** — `recordEvent` is read-modify-write. Worst case: simultaneous events in two tabs double-count by one. Profile listens to `storage` to refresh in real time.
- **Reload mid-bet** — naturally avoided: profile is a separate URL; if a player hits the broke modal mid-hand, navigating to profile cancels the round.
- **Texas Hold'em rebuy** — that's a bankroll → table-stack transfer, not a session end. Don't call `bankRun`.
- **Empty / new player** — `migrateIfNeeded` writes default blob; UI must render `—` placeholders, never `NaN`.
- **Pre-migration tabs** — legacy writes are no-ops to `casinoStats`; nothing is lost on next load. Acceptable.
- **Footnote on tiles** — show "since this update" on `runsPlayed` and `netWon` so the user understands those started at zero.

## Verification

Static site, no build. Open files in browser, inspect `localStorage` after each step:

1. **Migration**: clear `casinoStats`; set `casinoBankroll = 2500`; populate `rouletteStats` with sample data; load `/profile/`. Confirm `casinoStats.lifetime.peakBankrollEver === 2500` and `perGame.roulette` filled.
2. **Live recording**: play 5 Blackjack hands mixed W/L. Reload page. Profile shows `handsPlayed = 5`, correct `handsWon`, `peakBankrollEver` updated, `biggestPayout.game === 'blackjack'` if any meaningful win.
3. **Broke flow**: get to broke in Video Poker. BrokeModal shows no Reload button; "Cash out & start over" navigates to `/profile/`. Confirm dialog there → bankroll back to $1000, `runsPlayed === 1`, `netWon` reflects the run, per-game lifetime stats preserved, `run.handsPlayed === 0`.
4. **Slot jackpot**: temporarily lower jackpot threshold in `slot-engine.js`, hit one. Confirm `lifetime.rare.slotJackpots++` and `biggestPayout.game === 'slotMachine'`.
5. **Cross-tab**: open Blackjack in tab A, Profile in tab B. Play a hand in A; profile in B updates within ~1s via `storage` event.
6. **Skeleton sections**: in DevTools set `pongHighScore = 9999`; reload profile; arcade section shows it.
7. **Empty state**: clear all localStorage; load profile; every section renders `—` placeholders, no console errors.
8. **Browser sanity**: load profile in Safari, Firefox, Chrome — page is plain HTML+JS, no Babel standalone needed.
