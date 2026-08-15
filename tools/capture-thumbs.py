#!/usr/bin/env python3
"""Capture 600x600 tile art for game pages using headless Chrome.

STATUS: scaffold, not a turn-key batch job. It reliably drives a page inside a
same-origin iframe and frames a chosen element, which is the fiddly part — but
the per-game RECIPES below still need tuning one game at a time. As of the last
run most arcade games stop on their "press start" screen (their key handlers are
bound to the game window, not the iframe document) and the casino tables stop on
the name prompt. Only blackjack has been driven to a good frame and shipped;
everything else falls back to the icon medallion on purpose, which looks
deliberate, whereas a menu screenshot does not.

To add a game: give it a RECIPES entry that reaches a representative frame and a
TARGETS selector for the element the tile should frame, run it, and eyeball the
PNG before converting to assets/thumbs/<id>.webp at quality 88.

Usage:  python3 tools/capture-thumbs.py <out-dir> <id> [<id> ...]
        (needs the dev server on http://localhost:8091)
"""
import base64
import json
import os
import subprocess
import sys
import time

CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
ORIGIN = "http://localhost:8091"
SIDE = 900

# Per-game recipes. Each is JS run against the iframe document `d`, with
# helpers btn(re), click(re), until(fn) and sleep(ms) in scope.
# Per game: JS recipe to reach a good frame, and a CSS selector for the element
# the tile should frame (the page is scaled so that element fills the shot).
RECIPES = {
    "_default":       "await click(/^(play|start|new game|begin|deal)/i); await sleep(1200);",
    "asteroids":      "await click(/start|play/i); await sleep(1500);",
    "defender":       "await click(/start|play/i); await sleep(1800);",
    "frogger":        "await click(/start|play/i); await sleep(1200);",
    "lunar-lander":   "await click(/start|play/i); await sleep(1200);",
    "missile-command":"await click(/start|play/i); await sleep(1500);",
    "spacex-lander":  "await click(/start|play/i); await sleep(1200);",
    "simon":          "await click(/start|play/i); await sleep(1400);",
    "block-puzzle":   "await sleep(1200);",
    "memory-match":   "await sleep(900); await click(/^$/);",
    "solitaire":      "await seat(); await sleep(1600);",
    "freecell":       "await sleep(1400);",
    "spider-solitaire":"await sleep(1400);",
    "hearts":         "await sleep(1600);",
    "spades":         "await sleep(1600);",
    "euchre":         "await sleep(1600);",
    "go-fish":        "await sleep(1400);",
    "crazy-eights":   "await sleep(1400);",
    "tic-tac-toe":    "await sleep(900);",
    "craps":          "await seat(); await sleep(1600);",
    "roulette":       "await seat(); await sleep(1600);",
    "video-poker":    "await seat(); await sleep(800); await click(/^deal/i); await sleep(1500);",
    "three-card-poker":"await seat(); await sleep(1500);",
    "texas-holdem":   "await seat(); await sleep(2000);",
    "slot-machine":   "await sleep(1000); await click(/^spin/i); await sleep(2500);",
}

# What the tile should frame. Falls back to the largest <canvas>, then to the
# biggest plausible board container, then to the whole viewport.
TARGETS = {
    "memory-match":   ".board, #board, .cards",
    "counting-critters": ".board, #board",
    "shape-sorter":   ".board, #board",
    "tic-tac-toe":    ".board, #board",
    "solitaire":      ".sol-table, .table, [class*=table]",
    "freecell":       "[class*=table], [class*=board]",
    "spider-solitaire": "[class*=table], [class*=board]",
    "hearts":         "[class*=table]",
    "spades":         "[class*=table]",
    "euchre":         "[class*=table]",
    "go-fish":        "[class*=table], [class*=board]",
    "crazy-eights":   "[class*=table], [class*=board]",
    "craps":          "[class*=table]",
    "roulette":       "[class*=table]",
    "video-poker":    "[class*=table]",
    "three-card-poker": "[class*=table]",
    "texas-holdem":   "[class*=table]",
    "slot-machine":   "[class*=machine], [class*=reels], [class*=cabinet]",
}

PAGE = """<!doctype html><meta charset="utf-8">
<style>html,body{{margin:0;background:#000;overflow:hidden}}
#w{{width:{side}px;height:{side}px;overflow:hidden;position:relative}}
#f{{width:1400px;height:1000px;border:0;display:block;position:absolute;top:0;left:0;transform-origin:0 0}}</style>
<div id="w"><iframe id="f" src="{origin}/{gid}/"></iframe></div>
<script>
localStorage.setItem('casinoPlayer', JSON.stringify({{name:'Alex'}}));
localStorage.setItem('casinoBankroll', '1000');
const f = document.getElementById('f');
const sleep = ms => new Promise(r => setTimeout(r, ms));
f.addEventListener('load', async () => {{
  const d = f.contentDocument;
  const btn = re => [...d.querySelectorAll('button,a.play-button,[role=button]')]
      .find(b => re.test((b.textContent||'').trim()) && !b.disabled);
  const click = async re => {{ for (let i=0;i<25;i++) {{ const b = btn(re); if (b) {{ b.click(); return true; }} await sleep(120); }} return false; }};
  const seat = async () => {{
    const inp = d.querySelector('input');
    if (inp) {{ inp.value='Alex'; inp.dispatchEvent(new Event('input',{{bubbles:true}})); }}
    await sleep(150); await click(/take a seat|continue|play/i);
  }};
  const key = k => {{
    for (const type of ['keydown','keypress','keyup'])
      d.dispatchEvent(new KeyboardEvent(type, {{key:k, code:k===' '?'Space':k, keyCode:k===' '?32:13, bubbles:true}}));
  }};
  const canvasClick = () => {{
    const c = d.querySelector('canvas'); if (!c) return;
    const r = c.getBoundingClientRect();
    for (const type of ['pointerdown','mousedown','mouseup','click'])
      c.dispatchEvent(new MouseEvent(type, {{clientX:r.left+r.width/2, clientY:r.top+r.height/2, bubbles:true}}));
  }};
  await sleep(1400);
  try {{ {recipe} }} catch (e) {{}}
  // Generic "press start" for canvas games that wait on a key or a click.
  key(' '); canvasClick(); await sleep(1400);
  // Frame the tile on the game itself rather than the whole page.
  const pick = () => {{
    const sel = {target!r};
    if (sel) {{ const e = d.querySelector(sel); if (e) return e; }}
    const cs = [...d.querySelectorAll('canvas')]
      .map(c => [c, c.getBoundingClientRect()])
      .filter(([, r]) => r.width > 120 && r.height > 120)
      .sort((a, b) => b[1].width * b[1].height - a[1].width * a[1].height);
    return cs.length ? cs[0][0] : null;
  }};
  const el = pick();
  if (el) {{
    const r = el.getBoundingClientRect();
    const side = Math.max(r.width, r.height);
    const s = {side} / side;
    const ox = r.left - (side - r.width) / 2;
    const oy = r.top - (side - r.height) / 2;
    f.style.transform = 'scale(' + s + ') translate(' + (-ox) + 'px,' + (-oy) + 'px)';
  }}
  await sleep(500);
  document.title = 'READY';
}});
</script>
"""


def capture(gid, out_dir):
    recipe = RECIPES.get(gid, RECIPES["_default"])
    target = TARGETS.get(gid)
    scratch = os.path.join(ROOT, "_capture.html")
    with open(scratch, "w") as fh:
        fh.write(PAGE.format(side=SIDE, origin=ORIGIN, gid=gid, recipe=recipe, target=target))
    png = os.path.join(out_dir, f"{gid}.png")
    subprocess.run([
        CHROME, "--headless", "--disable-gpu", "--hide-scrollbars",
        "--force-device-scale-factor=2", f"--window-size={SIDE},{SIDE}",
        "--virtual-time-budget=22000", f"--screenshot={png}",
        f"{ORIGIN}/_capture.html",
    ], capture_output=True)
    os.remove(scratch)
    return png if os.path.exists(png) else None


if __name__ == "__main__":
    out = sys.argv[1]
    os.makedirs(out, exist_ok=True)
    for gid in sys.argv[2:]:
        p = capture(gid, out)
        print(f"{'ok  ' if p else 'FAIL'} {gid}")
