# Plan: Add Texas Hold'em (4-handed cash game)

## Context

Add a 7th casino game — **Texas Hold'em** — to the Limestone Games hub. The user confirmed:

- **4-handed cash game**: player + 3 AI opponents, single shared dealer who deals (no avatar interaction).
- **Cash game w/ fixed blinds**, blinds **tiered to the buy-in** the player picks at the lobby.
- **Buy-in flow**: player picks a buy-in tier from their casino bankroll → that amount becomes the table stack → rebuy when busted → leave-table cashes out remaining stack back to bankroll.
- **Distinct AI personalities** (e.g. Tight Tom, Loose Lucy, Maniac Mike), each with **new custom character art** (separate from the existing dealer pool).
- **AI opponents talk** with short personality lines via the existing `pickLine` pattern.
- **Casino dealer character** (the one running the table) reuses the existing dealer art from `blackjack/assets/dealers/{female,male}/` — same Melissa/Marcus pool. The dealer has no game-mechanical role beyond dealing; they react to action through expression and voice (mirroring Blackjack).
- **Full equity-driven hint panel**: Monte Carlo equity vs. live opponents' estimated ranges, pot odds, position-aware fold/check/call/raise recommendation with a sizing suggestion. Mirrors Blackjack's right-side hint panel.

The codebase already provides: shared bankroll/player layer (`casino/casino-bankroll.js`, `casino/casino-player.js`), 5-card hand evaluator (`video-poker/vp-hand.js`), card rendering pattern (`video-poker/vp-cards.jsx`, `blackjack/bj-card.jsx`), state-machine + dealer panel pattern (`blackjack/bj-app.jsx`, `blackjack/bj-dealer.jsx`), themed CSS variables, animations, chip rack, hint panel. The **new** work is: best-of-7 hand evaluator, multi-seat layout, 4-phase betting state machine, AI decision engine with personalities, Monte Carlo equity simulator, buy-in lobby + cash-out flow.

## Directory & File Layout

```
texas-holdem/
├── index.html              # Shell: viewport scaler, font preconnect, React/Babel CDN, casino-bankroll/player, then th-* JSX in order
├── th-deck.js              # 52-card deck builder, Fisher-Yates shuffle, deal helpers
├── th-hand.js              # 5-card evaluator + best-of-7 evaluator + comparator + made-hand label
├── th-equity.js            # Monte Carlo equity simulator (board + opponent range vs. player hole)
├── th-ai.js                # AI decision engine: personality archetypes → preflop/flop/turn/river action choice
├── th-personality.js       # AI archetype definitions (range tightness, aggression, bluff freq, voice lines)
├── th-cards.jsx            # PlayingCard component (face/back/corner) — adapted from vp-cards.jsx
├── th-table.jsx            # Table layout, chip rack, pot display, community-card row, seat components, hint panel, lobby/buy-in modal
├── th-dealer.jsx           # Dealer portrait + speech bubble (reuses blackjack/assets/dealers/ images)
├── th-app.jsx              # Main app: phase machine, dispatch loop, persistence, audio, modals
├── th-sfx.js               # Sound effects: chip, card, fold, call, raise, win, showdown
├── tweaks-panel.jsx        # Dev panel: player name, dealer choice, hints toggle, sound, starting bankroll, AI difficulty
└── assets/
    └── opponents/
        ├── tight-tom/      # idle.png, think.png, fold.png, raise.png, win.png, lose.png
        ├── loose-lucy/
        └── maniac-mike/
```

Notes on assets: the casino dealer images are reused as-is (no new dealer art). The 3 AI portraits are **new** and need to be generated/sourced. Until art is supplied, render an SVG monogram placeholder (initials + archetype color) so the game is fully playable without the art.

## Game Design

### Stakes / Buy-In Tiers
| Buy-in | Small / Big Blind | Min raise |
|--------|-------------------|-----------|
| $100   | $1 / $2           | $2        |
| $500   | $5 / $10          | $10       |
| $1,000 | $10 / $20         | $20       |

Buy-in must be ≥ 50 BB. Player rebuys for the same tier when busted (deducted from bankroll). On leave-table, remaining stack is returned to bankroll.

### Phase Machine (`th-app.jsx`)
`'lobby'` (pick buy-in) → `'seat'` (sit down, post first blind) → `'preflop'` → `'flop'` → `'turn'` → `'river'` → `'showdown'` → next hand (`'preflop'`) ↺ → `'leave'` (cashout) → `'lobby'`.

Within each betting phase: a sub-loop iterates seats clockwise from the first-to-act, each seat in turn either folds, checks, calls, or raises. Phase advances when (a) all live seats have acted **and** (b) all live bets are equal. Hand ends early if only one seat remains live.

### Seat State
```
{ id, name, archetype, stack, hole: [c1,c2], bet, totalBet, status: 'live'|'folded'|'allin'|'sittingout', isPlayer, isButton, isSB, isBB }
```

Button rotates clockwise each hand. With 4 seats, position matters: button → SB → BB → UTG (UTG = first preflop, last postflop). Heads-up exception unused (always 4-handed).

### Round Mechanics
- Standard no-limit Hold'em rules: blinds posted, hole cards dealt, betting round, community cards revealed (3 / 1 / 1), final betting round, showdown.
- Min raise = previous raise size (initially BB).
- Side pots created when an all-in occurs and another seat continues betting beyond.
- Showdown: every still-live seat's best 5-of-7 evaluated; best wins pot; ties split.

## Reuse Map

| New file | Pulls from | What's reused |
|----------|-----------|---------------|
| `th-deck.js` | `video-poker/vp-deck.js` | Same shape ({rank,suit,id}), Fisher-Yates pattern; convert to module exports for clarity |
| `th-hand.js` | `video-poker/vp-hand.js:50-74` (5-card eval), `three-card-poker/tcp-hand.js:86-96` (compare) | 5-card eval with rank order Royal/Straight-Flush/Quads/Boat/Flush/Straight/Trips/2P/Pair/High; **NEW**: `evalBest5From7(seven)` enumerating all C(7,5)=21 subsets, returns highest-ranked 5 + tiebreak kickers |
| `th-cards.jsx` | `video-poker/vp-cards.jsx:79-130`, `blackjack/bj-card.jsx` | CardFace, CardBack, CardCorner, deal-in animation, 3D flip; resize to community vs. hole sizes |
| `th-table.jsx` chips/buttons | `blackjack/bj-table.jsx:4-10` (CHIP_DEFS), ActionButton, FeltBackdrop | Same chip rack ($1/$5/$25/$100/$500/$1K — extend low end for $1/$2 tier), same brass/felt theming, chip 3D radial gradients |
| Hint panel | `blackjack/bj-table.jsx:HintPanel` | Right-side overlay layout, brass border, Playfair action header, odds bar — replace BJ basic-strategy with poker hint output |
| Dealer panel | `blackjack/bj-dealer.jsx` | DealerPanel component, expression image swap, mood filter, typing speech bubble, voice picker — reuses `blackjack/assets/dealers/{female,male}/*.png` directly via relative path |
| Bankroll/player | `casino/casino-bankroll.js`, `casino/casino-player.js` | `window.CASINO_BANKROLL.read/write/reload`, `window.CASINO_PLAYER.read/write` |
| Tweaks panel | `blackjack/tweaks-panel.jsx` | EDITMODE block + `useTweaks` hook — add `aiDifficulty` |
| Animations | `blackjack/index.html` keyframes | `dealIn`, `chipPlace`, `glowPulse`, `bannerIn`, `breathe` — copy verbatim |
| Result banner | `blackjack/bj-table.jsx:ResultBanner` | Banner kinds adapted: `win` (you win pot), `lose` (someone else wins), `chop` (split), `fold-win` (everyone folded to you), `fold-lose` (you folded) |

## New Logic (the load-bearing pieces)

### `th-hand.js` — Best-of-7 Evaluator
```
HAND_RANK = { HIGH:0, PAIR:1, TWO_PAIR:2, TRIPS:3, STRAIGHT:4, FLUSH:5, FULL:6, QUADS:7, STRAIGHT_FLUSH:8, ROYAL:9 }

evaluate5(cards) → { rank, kickers: number[] }   // canonical 5-card eval, returns rank + ordered tiebreak values
evalBest5From7(cards) → { rank, kickers, best5 } // tries all 21 combinations, returns highest
compare(a, b) → -1|0|1                            // by rank, then kickers
labelOf(eval) → string                            // e.g. "Top pair, weak kicker", "Flush, ace-high"
```

Wheel-straight (A-2-3-4-5) handled by detecting the special low-A run. Kickers are sorted descending by rank; pair-rank is primary, then kickers.

### `th-equity.js` — Monte Carlo Equity
```
estimateEquity({ playerHole, board, oppRanges, iters=2000 }) → { win, tie, lose }
```
For each iteration: sample missing board cards from remaining deck (excluding `playerHole`, `board`, opponents' assigned ranges), sample one hand per opponent from their range (weighted), evaluate everyone's best-of-7, increment counters.

`oppRanges` is a per-opponent weighted preflop range. Defaults derived from archetype + their actions so far this hand (an opponent who 3-bet preflop has a tighter, stronger range than one who limped).

Performance budget: 2000 iters × ~80 evals/sec ≈ < 100ms on modern browsers — runs in `requestIdleCallback` between actions, cached until next card revealed.

### `th-ai.js` — AI Decision Engine
Inputs: seat's archetype, hole cards, board, pot, bet to call, position, history this hand.
Output: action ∈ {fold, check, call, raise(amount), allin}.

Decision pipeline:
1. **Hand strength** = `evalBest5From7` against current board (or hole-only preflop).
2. **Equity vs. range** = same Monte Carlo as the hint panel (smaller iter count, ~500).
3. **Pot odds** = bet to call / (pot + bet to call).
4. **Personality modifier** = archetype tightness/aggression skews thresholds.
5. **Final**: pick action by comparing equity vs. pot-odds threshold + bluff probability.

Archetypes (`th-personality.js`):

| Archetype | VPIP | PFR | Aggression | Bluff% | Voice flavor |
|-----------|------|-----|------------|--------|--------------|
| Tight Tom | 18% | 14% | low | 5% | Stoic/grumpy |
| Loose Lucy | 38% | 12% | passive | 10% | Chatty/cheerful |
| Maniac Mike | 55% | 35% | very high | 30% | Brash/over-the-top |

VPIP = % of hands voluntarily put money in pot. PFR = preflop raise %. These feed into preflop range selection (top X% of hands by Sklansky chart).

### Hint Panel Output
Driven by the same equity engine. Shows:
- **Hand label** (e.g. "Top pair, A-kicker")
- **Equity %** vs. live opponents' implied ranges
- **Pot odds** ratio
- **Recommendation**: Fold / Check / Call / Raise $X — with one-line explanation
- **Position note**: "In position" / "Out of position" tag

## Integration Points (outside `texas-holdem/`)

1. **`hub.js`** (top-level catalog at `/Users/trevor/Source/myWebsite/hub.js`):
   - Add `{ id: 'texas-holdem', name: "Texas Hold'em", cat: 'casino', desc: '4-handed cash game with hint mode.', color: '#E8B05B', plays: '0', isNew: true }` to the `GAMES` array (after `three-card-poker`).
   - Add a glyph entry to `GLYPH_PATHS` (e.g. two cards forming a "TH" or stylized AK).
   - Optionally add a placeholder to `HIGH_SCORES`.
2. **`/index.html`** schema.org `numberOfItems`: bump 25 → 26 (line 48). Also append a `ListItem` at position 26 in the `itemListElement` array.
3. **`/casino/index.html`**: add a 7th `<a class="cas-card-game">` tile in the `.cas-grid` (after `three-card-poker`, mirror its markup with new copy and glyph color). Update `<span class="sub">6 games · live odds</span>` → `7 games · live odds` on line 144, and `<!-- All 6 tables -->` → `All 7 tables`.
4. **`/casino/casino.js`**: if it tracks per-game stats (it does for roulette and video-poker), wire a new `texasHoldemStats` localStorage entry — schema `{ handsPlayed, biggestPot, biggestWin }`.

## Persistence

- `casinoBankroll` (existing) — bumped on cashout, deducted on buy-in/rebuy.
- `casinoPlayerName` (existing).
- `texasHoldemStats` (new) — `{ handsPlayed, handsWon, biggestPot, biggestWin, bestHand }`. Hydrated and rendered on the casino landing card and tweaks panel.
- Table state is **session-only** (closing the tab forfeits your seat — same as Blackjack mid-shoe). The user is warned before exiting mid-hand.

## Auto-Scaling

Same IIFE pattern as Blackjack (`blackjack/index.html:138-148`). Inner stage **1380 × 860**, scale to fit, never upscale. 4-handed layout fits comfortably:
- **Top row**: 3 opponent seats spread across (avatar, name + stack + bet, hole-card outline)
- **Middle**: pot display + community cards (5 slots) + dealer portrait on the left
- **Bottom**: player's own seat (large hole cards face-up, stack, bet)
- **Right**: hint panel (toggleable)
- **Bottom controls**: chip rack + Fold/Check/Call/Raise buttons + slider for raise sizing

## Verification

End-to-end testing per the codebase's playtest convention:
1. **Static checks**: open `texas-holdem/index.html` directly in the browser — confirm zero JS console errors, fonts load, scaling math fits the viewport.
2. **Lobby flow**: pick each buy-in tier; verify bankroll deducts correctly, blind labels match the table, leaving the lobby refunds nothing.
3. **One full hand**: deal preflop, exercise fold/check/call/raise on each street, verify pot math (including SB/BB), advance through flop/turn/river, reach showdown, verify payouts.
4. **Side pot**: trigger an all-in scenario where a short stack is all-in for less than another raise, confirm a side pot is built and the short stack only wins the main pot.
5. **AI behavior**: each archetype must produce visibly different lines over ~20 hands (record VPIP/PFR observed; Maniac Mike should over-bet, Tight Tom should fold > 70% preflop).
6. **Equity + hint panel**: against a known board, manually verify a few equity readouts (e.g. AhKh on KdQs2c — equity vs. random range should be ~85%; the hint should recommend a value bet).
7. **Cashout**: leave table mid-session, verify the remaining table stack returns to `casinoBankroll`. Verify `texasHoldemStats` updates.
8. **Browser rendering**: use `preview_*` MCP tools per CLAUDE.md to start a local server, confirm visuals match the Blackjack chrome, check responsive scaling at narrow widths, screenshot the table.
9. **Cross-game continuity**: leave to `casino/index.html`, see Texas Hold'em as the 7th tile with correct stats, navigate to other games and back.

## Out of Scope

- Tournaments (eliminated as a path in the answers).
- Side bets / AA Bonus.
- Multi-table / multi-tabling.
- Real account auth, online play, leaderboards beyond the per-game `bestHand` stat.
- Run-it-twice, rabbit hunt, time-bank features.
- Dynamic AI personalities that learn over time (archetypes are static).

## Critical Files to Edit / Create

**New** (all under `texas-holdem/`): `index.html`, `th-deck.js`, `th-hand.js`, `th-equity.js`, `th-ai.js`, `th-personality.js`, `th-cards.jsx`, `th-table.jsx`, `th-dealer.jsx`, `th-app.jsx`, `th-sfx.js`, `tweaks-panel.jsx`, plus `assets/opponents/{tight-tom,loose-lucy,maniac-mike}/*.png` (or SVG monogram fallbacks until real art ships).

**Modified**:
- `/Users/trevor/Source/myWebsite/hub.js` — add to `GAMES`, `GLYPH_PATHS`, optional `HIGH_SCORES`
- `/Users/trevor/Source/myWebsite/index.html` — schema.org `numberOfItems` and `itemListElement`
- `/Users/trevor/Source/myWebsite/casino/index.html` — add the 7th game tile, update count
- `/Users/trevor/Source/myWebsite/casino/casino.js` — add `texasHoldemStats` rendering on the casino landing card
