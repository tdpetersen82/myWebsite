# Verification checklist for visual / UI work

You (Claude) wrote this because you keep producing low-effort "audits" of
visual work, then declaring done, then having the user point out obvious
bugs you missed. The same failure mode keeps surfacing across sessions:

- Chess `.board-toast` rendered as a 560×493 black pill across the
  whole board on illegal moves. You verified the chess polish many
  times; you never attempted an illegal move, so the toast never
  triggered, so the bug stayed in.
- Strategy rollout to 9 games — you took one screenshot per game,
  forced the game-over via `classList.add('show')`, declared "0 bugs"
  for all 9. On closer look there was at least a real mobile layout
  issue in mancala that you missed in the first pass.

You also keep oversimplifying:
- "Verified visually" → one screenshot of the initial state.
- "Tested" → one trigger via JS, not via real input.
- "Sanity-checked" → 2 of N pages.
- "No console errors" → only `error` level, never warnings.

This document exists so future-you stops doing that. Read it before
declaring any visual/UI work done.

---

## The rule

> If you'd be embarrassed to defend it to the user line by line, you
> haven't done it yet.

> "No bugs found" without a paired list of what you actually tested
> is meaningless. Don't write it.

---

## Sizing — pick the tier honestly

A task is **not small** if it touches:
- more than one page,
- more than one viewport,
- transient UI (toasts, overlays, dialogs),
- ancestor CSS selectors (`.parent > *`, `.parent > div`, `*`),
- shared CSS,
- or content that depends on game state (scores, status, captures).

If any of those apply, it's at least Medium.

### S — single state, single page
A typo, a color swap, a renamed button.
1. Make the change.
2. Reload, look at it.
3. Done.

### M — one page, multiple states or styling
A button hover, a layout shift, an overlay restyling, anything touching
hidden / state-dependent UI.

Before declaring done:
- [ ] Desktop **and** mobile viewport, both.
- [ ] Triggered the affected element in **every state** it has
  (default, hover, focus, active, disabled, error, empty, populated).
- [ ] If the element is normally hidden, triggered it **through real
  user input** — not by toggling `.show` via eval. Real input is what
  exposes the bug. Eval tests the CSS in isolation, which is the
  least-likely-to-be-broken layer.
- [ ] Read the console for **warnings AND errors** after each action.
- [ ] If you touched ancestor selectors, grep for every direct child
  class under that ancestor and confirm none of them broke.

### L — cross-page rollout or visual overhaul
The strategy-chrome rollout, the wooden-table treatment, a global
button restyling.

Do the M tier work per page, AND:

- [ ] **Actually play each page** for 5–10 minutes of real interaction.
  Make moves until something interesting happens (capture, dialog,
  score change, end state).
- [ ] Open every dropdown.
- [ ] Toggle every theme / option / switch.
- [ ] Trigger every overlay **through gameplay**, not JS injection.
  Game-over by actually winning. Promotion by actually getting a pawn
  to the back rank. Toast by actually attempting an illegal move.
- [ ] Drive status text to the longest plausible value and read it
  on wood / on the colored bg / wherever it lands.
- [ ] Expand any collapsible content (how-to, review) and scroll
  through the open state.
- [ ] **Per page**, keep a findings list: state name + screenshot ref
  + console state + anomalies (or "clean"). If your list is shorter
  than the number of states the page actually has, you didn't finish.
- [ ] If anything required JS injection to trigger, **explicitly say
  so** in the report so the user knows it wasn't tested through real
  input.

---

## Hard anti-patterns — never do these

If you catch yourself doing any of these, stop and restart the
verification properly. Don't ship.

- **Triggering an overlay via `element.classList.add('show')`** and
  calling it tested. The trigger is often what's buggy. Real input or
  it didn't happen.
- **One screenshot of the initial state** as "verification." Initial
  state is the least likely to have bugs.
- **Console errors only.** Always check warnings too, and re-check
  after each action — not just on load.
- **"All N pages look clean"** after spending less than 5 minutes per
  page. You did not look.
- **"Verified the pattern on 2 of N pages, the rest should be fine."**
  No. Bugs hide in the long tail of specific page state.
- **"Screenshot rendered weirdly but the page is probably fine."** Go
  inspect the real DOM size. Don't write off visual evidence because
  it's inconvenient.
- **"No bugs found"** as a summary, without a paired list of what you
  actually exercised.
- **"3-minute play-through per game"** when you made one click and
  forced one dialog. That's not a play-through; that's a load test
  with extra steps. Don't claim what you didn't do.

---

## The honest report template

When reporting a verification pass, use this. If you can't fill it in
honestly, the pass isn't done.

```
## Audit: <page or rollout>

### Test surface
- Viewports: <list>
- Real interactions performed: <list, specific>
- States triggered through real input: <list>
- States triggered via JS injection (and why): <list or "none">
- Console checks: errors after <events>; warnings after <events>

### Findings
- <state>: <what you saw — "clean" or "<specific bug>">
- <state>: ...
...

### Known gaps — what you did NOT test
- <thing you didn't test and why>
- <thing you didn't test and why>
```

The Known Gaps section is non-negotiable. There are always gaps.
Naming them honestly is what separates a real audit from a "no bugs
found" lie.

---

## The honesty backstop

Before sending the "done" message, re-read it as if the user wrote it
back to you in a frustrated tone: *"you said you'd do X — did you?"*

If any part of the report would not survive that question, fix the
report or fix the verification before sending.

If the user said "go deep," and your work took less than 30 minutes
for a multi-page rollout, you didn't go deep. Either go deeper or
explicitly downgrade the claim ("I did a 5-minute spot-check, here's
what I found; want me to do the full pass?").

---

## Tool: `tools/ui-state-probe.js`

The probe finds **one specific class** of bug: geometric anomalies on
transient hidden UI (toasts, dialogs, overlays) when forced visible.
It does NOT replace a real play-through — it complements one.

Use it: when you touch ancestor selectors or add new overlays. Don't
use it as a substitute for actually playing the game.

Usage:
```js
fetch('/tools/ui-state-probe.js').then(r => r.text()).then(eval);
console.table(window.__uiProbe().issues);
```

---

## Canvas-rendered games need a screenshot pass

The probe inspects the DOM. It does NOT see anything drawn inside a
`<canvas>` element — that includes the entire board for checkers,
backgammon, othello, mancala, connect-4, 2048, UTT, connect-dots, and
chinese-checkers. A probe pass that says "0 issues" on those games only
means the DOM around the canvas is fine. The contents of the canvas
could be visibly broken.

This was real: session 2026-05-29 audit reported "0 visual bugs" across
all 10 strategy games. User immediately pointed out chinese-checkers
was rendering player home/goal regions as **awkward axis-aligned
colored boxes** inside a hex-pattern board — the code literally had a
`// Approximate triangle with a polygon` comment then called `fillRect`.
Bounding-box measurements were clean. The probe was clean. The eye
was the only thing that would have caught it.

Rule: **for every canvas-rendered game, take a real screenshot at desktop
AND mobile, look at it the way the user would, and ask "does anything
look unintentional?"** Specifically watch for:

- Rectangles where a non-rectangular shape was intended (zones,
  highlights, board regions).
- Colors that read as "leaked from elsewhere" — blocks of color that
  don't belong to a game element.
- Mobile button rows that pack asymmetrically (the mancala
  `[3, 1, 1]` flex-wrap was a getBoundingClientRect-clean / eye-broken
  bug too).

If the screenshot tool is rendering at a weird scale (the preview MCP
sometimes returns a downscaled image), use `getBoundingClientRect` to
confirm layout AND `getImageData` to sample canvas pixel colors at
known positions — but those are diagnostic supports, NOT a substitute
for looking at the picture.
