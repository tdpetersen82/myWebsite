# Pre-publish checklist

Run through this before merging any user-visible change. Anything here that fails is a release blocker.

## 1. Dev server, every page in the browser

- [ ] `python3 -m http.server 8080` from repo root, open every page below at desktop width (≥1280px) and at narrow width (≤700px):
  - `/` (homepage)
  - `/arcade/` `/retro/` `/puzzles/` `/casino/`
  - The specific game(s) you touched
- [ ] DevTools console: zero errors. Warnings limited to the standard babel-standalone "in-browser transformer" notice. No 404s in Network tab.

## 2. Top nav consistency

The four section navs (`hub-nav`, `cat-nav`, `cas-nav`) must be visually interchangeable — clicking from one to another should not shift the row.

- [ ] All four pages: nav anchored at `top: 0`, total height ~83px, links at the same X coordinates.
- [ ] Same four links in the same order on every page: **Arcade · Retro · Puzzles · Casino**. No "Games" link anywhere.
- [ ] Current section is the only `.active` link. Homepage has no active link.
- [ ] Breadcrumbs read "Home / Section Name" (never "Games / …").
- [ ] Logo + wordmark unchanged across pages and clicks back to `/`.

## 3. Hero + stats/bankroll layout

- [ ] Stats / bankroll widget sits **above** the hero on all four section pages, with 24px gap from the breadcrumb.
- [ ] Hero size feels balanced — `min-height: 400px`, `padding: 40px 40px 0`, h1 `64px`. Not the old 480/56/88.

## 4. Games — auto-scale + persistence

Per `CLAUDE.md`:

- [ ] Every game fits the viewport at any size (CSS `transform: scale()` IIFE for vanilla, `Phaser.Scale.FIT` for Phaser).
- [ ] High scores survive a page reload (localStorage).

## 5. Casino specifics

- [ ] Bankroll widget visible at the top of `/casino/`, persists across table visits.
- [ ] Each table loads, plays through one round, returns to the lobby without bankroll desync.
- [ ] Blackjack only:
  - [ ] Bet → Deal → resolve a hand → **Rebet & Deal** button actually deals cards (not just rebet).
  - [ ] Surrender shows the "SURRENDER · Half back" banner (no React error boundary fallback).
  - [ ] Hints panel shows `Suggested bet` (bet phase), `Basic strategy says` + odds footer (player phase), and `Insurance offered` (insurance phase). Toggling `✦ Hints` hides it.

## 6. JSX/JS cache busting

If you edited any `*.jsx` or `*.js` referenced from an `index.html` via `?v=...`:

- [ ] Bump the version suffix (e.g. `v=20260507e` → `v=20260507f`) on **every** `<script>` tag in that page's HTML. Otherwise visitors see a stale browser cache.

## 7. Git hygiene

- [ ] No accidentally committed `.env`, credentials, or large binary blobs.
- [ ] `git status` clean. Branch up to date with `origin/main` after merge.
