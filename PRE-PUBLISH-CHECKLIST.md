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

## 8. SEO & crawl integrity (automated)

Each command should produce no output (or exit 0). Anything else is a blocker. Run from the repo root.

- [ ] **Sitemap is valid XML**
  ```sh
  xmllint --noout sitemap.xml
  ```
- [ ] **No leftover `example.com` placeholder URLs**
  ```sh
  ! grep -rn "example.com" --include="*.html" --include="*.xml" --include="*.txt" --include="*.json" .
  ```
- [ ] **No leftover stale brand `Arcade Game Hub`**
  ```sh
  ! grep -rn "Arcade Game Hub" --include="*.html" --include="*.json" .
  ```
- [ ] **No leftover `tdpetersen82.github.io` URLs in published files**
  ```sh
  ! grep -rn "tdpetersen82.github.io" --include="*.html" --include="*.xml" --include="*.json" .
  ```
- [ ] **Every URL in `sitemap.xml` corresponds to a real file on disk**
  ```sh
  python3 -c '
  import re, os, sys
  with open("sitemap.xml") as f: urls = re.findall(r"<loc>https://limestonegames\.com(/[^<]*)</loc>", f.read())
  bad = []
  for u in urls:
      p = u.lstrip("/")
      if p == "" or p.endswith("/"):
          if not os.path.isfile(os.path.join(p, "index.html")): bad.append(u)
      else:
          if not os.path.isfile(p): bad.append(u)
  print("\n".join(bad)) if bad else print("OK")
  sys.exit(1 if bad else 0)'
  ```
- [ ] **`robots.txt` points at the production sitemap URL**
  ```sh
  grep -q "Sitemap: https://limestonegames.com/sitemap.xml" robots.txt
  ```
- [ ] **Image assets referenced from manifest/OG/Twitter exist on disk** (any `MISSING:` line is a blocker)
  ```sh
  for ref in $(grep -rhoE '/(og-image|icon-[0-9]+)\.png' --include="*.html" --include="*.json" . | sort -u); do
    f="${ref#/}"
    [ -f "$f" ] || echo "MISSING: $f"
  done
  ```

## 9. Per-page SEO meta sweep (automated)

Every published HTML page must contain `<title>`, `<meta name="description">`, `<link rel="canonical">`, `og:title`, `og:url`, `twitter:card`, and at least one `application/ld+json` block.

- [ ] **Run the sweep — no output means all pages pass**
  ```sh
  { find . -maxdepth 2 -name "index.html" -not -path "./node_modules/*" -not -path "./.claude/*"; echo "./privacy.html"; } | while read -r p; do
    for tag in '<title>' 'name="description"' 'rel="canonical"' 'og:title' 'og:url' 'twitter:card' 'application/ld+json'; do
      grep -qF "$tag" "$p" || echo "$p missing: $tag"
    done
  done
  ```

## 10. Schema validation (manual, browser)

Paste each URL into the **Google Rich Results Test** (https://search.google.com/test/rich-results). Schemas must validate without errors.

- [ ] Homepage `https://limestonegames.com/` — expects `Organization`, `ItemList`.
- [ ] One category, e.g. `https://limestonegames.com/casino/` — expects `BreadcrumbList`.
- [ ] One game, e.g. `https://limestonegames.com/snake/` — expects `VideoGame`, `BreadcrumbList`.

## 11. Open Graph & social preview (manual, browser)

For each of the three URLs above:

- [ ] **Facebook Sharing Debugger** (https://developers.facebook.com/tools/debug/) — title, description, and image render.
- [ ] **Twitter Card Validator** (https://cards-dev.twitter.com/validator) — same expectation.

If `og-image.png` is still missing on the production server, the preview image won't render — see §12.

## 12. Known blockers (must resolve before going live)

These items are flagged but not fixed in code; they need assets or external decisions:

- [ ] **`og-image.png` exists at the repo root** (1200×630). Until then, social shares show no preview image.
- [ ] **AdSense publisher ID** — `ca-pub-XXXXXXXXXXXXXXXX` is still a placeholder site-wide. Replace with the real ID, or remove the `<script>` tag.
- [ ] **DNS canonical confirmed** — every page declares `https://limestonegames.com` (apex) as canonical. If your hosting actually serves `www.limestonegames.com` as canonical, swap apex → www in every page and 301-redirect apex → www.
- [ ] **PWA icons (optional)** — `manifest.json` no longer references icons. If you want the PWA install banner, add `icon-192.png` and `icon-512.png` and put them in the `icons` array.

## 13. After deploy

- [ ] **Resubmit sitemap to Google Search Console** — triggers a recrawl and clears stale URLs (e.g. the phantom games we just removed) from the index over time.
- [ ] `curl -I https://limestonegames.com/robots.txt` returns 200 and the body contains the production sitemap URL.
