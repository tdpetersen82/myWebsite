# Limestone Games — TODO

Tracking work remaining after the design handoff integration. Last updated 2026-05-04.

## From the design handoff (still unbuilt)

- [ ] **Game detail page template** — `snake-detail.jsx` in [_design_handoff](_design_handoff/design_handoff_limestone_games/). Three-column layout: left rail (controls + 160×600 ad), center stage (canvas + HUD), right rail (leaderboard + 300×250 ad). Designed to be applied to all 20 game pages, each of which currently has a one-off layout.

## Wire real data (everything below is currently mocked to match the design)

- [ ] **High scores** — localStorage per game ID. Each existing game already saves its own; need a unified read so the homepage tiles, sidebar trending, category cards, and hall of fame can pull from one source.
- [ ] **Plays counts** — homepage tiles show `12.4k` etc. as fixed mocks. Increment on game launch (or pull from analytics).
- [ ] **Streak** — "11-day streak" on homepage stats card and arcade landing. Needs a daily-login tracker in localStorage.
- [ ] **Casino bankroll** — `$2,840` on `/casino/` is hardcoded. Replace with chip total across casino games.
- [ ] **Win rate / biggest pot** — same.
- [ ] **Hall of fame names** — `velvetdealer`, `pixel.eight`, `starcaster`, `minimax`, etc. across all 4 landings are placeholders. Decide: hand-curated, leaderboard from actual play, or remove entirely.
- [ ] **Daily challenge / tournament state** — `/casino/`, `/arcade/`, `/retro/`, `/puzzles/` each show a "live now" challenge with player counts and prize pools. Currently static. Decide: drop the section, fake but rotating, or build a real challenge backend.
- [ ] **"You" row in hall of fame** — currently hardcoded as last row. Should reflect the real user once auth/identity exists (or remove if anonymous-only).

## Production housekeeping

- [ ] **AdSense placeholders** — every page uses `data-ad-client="ca-pub-XXXXXXXXXXXXXXXX"` and `data-ad-slot="XXXXXXXXXX"`. Drop in real IDs to actually serve ads.
- [ ] **Update [sitemap.xml](sitemap.xml)** — add `/casino/`, `/arcade/`, `/retro/`, `/puzzles/` URLs.
- [ ] **Privacy page branding** — [privacy.html](privacy.html) likely still says "Arcade Game Hub" (pre-rebrand).
- [ ] **`nav.js` branding** — the persistent top-nav loaded on game pages still calls itself "Arcade Hub". Either update to "Limestone Games" or replace with the new homepage's nav style.
- [ ] **`og-image.png`** — referenced in `<meta>` tags but the file doesn't seem to exist. Generate an OG image.
- [ ] **Game pages still use old `styles.css`** — purple/dark gradient hub theme. Each game page has its own internal UI but the wrapper container/header/footer styles come from the legacy CSS. Decide whether to bring game-page chrome in line with Limestone tokens.

## Polish

- [ ] **Mobile/tablet testing** — only verified homepage and `/casino/` at narrow widths. Verify `/arcade/`, `/retro/`, `/puzzles/` on real devices.
- [ ] **A11y pass** — focus rings on hero card buttons, `aria-label` on icon-only links (chip stack, decorative motifs), keyboard navigability of the mosaic, color contrast on the gold-on-felt casino combos.
- [ ] **⌘K shortcut** — works on homepage; not wired on category landings (none of them have a search input though, so maybe not needed).
- [ ] **Refactor `casino.css` to use `category.css`** — the 3 new landings share `category.css` via `.cat-*` classes; casino still has its own standalone CSS with `.cas-*` prefix from before the shared file existed. ~700 lines of duplication.
- [ ] **Animated tile preview perf** — runs a `setInterval` on hover. Fine for 20 tiles but watch on lower-end devices.

## Decisions / cleanup

- [ ] **`_design_handoff/` folder** — gitignored, still on disk for reference. Delete when no longer needed.
- [ ] **`package.json` / `package-lock.json`** — untracked at repo root, references `@tensorflow/tfjs-node`. Not part of the design redesign and the CLAUDE.md says "no build step, no dependencies." Decide: commit, delete, or keep untracked.
- [ ] **CLAUDE.md says default branch is `master`** — actual default is `main`. Fix the doc.
- [ ] **Pending blackjack file changes outside this session** — `blackjack/css/styles.css`, `blackjack/index.html`, `blackjack/js/dealer.js`, `blackjack/js/settings.js` had uncommitted modifications during this work. Owned by you; review and commit when ready.

## Nice-to-have (not from the handoff)

- [ ] Sub-category index inside each landing — e.g. `/casino/blackjack/` could be a deeper detail page with rules, strategy chart, and the actual game embed.
- [ ] Consolidate game IDs — design uses `space-invaders`, existing folder matches. Other game folders match too. ✓ no action.
- [ ] Wire actual user identity (auth) so "Your stats" / "Your bankroll" / "You" rows mean something.
- [ ] Search expansion — currently filters by name/desc/category. Could add tag-based search ("strategy", "single-player", etc.).
- [ ] Per-game page rebrand — apply Limestone tokens to the inside of each game (background, font, button styles).
