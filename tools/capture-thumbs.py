#!/usr/bin/env python3
"""Capture 600x600 tile art for game pages using headless Chrome.

Each game loads inside a same-origin iframe on a scratch page, so a per-game
recipe can drive it (press start, seat a player, deal a hand) before the shot.
After the recipe runs, the page is scaled so the game's own board fills the
frame — that keeps page chrome (nav, "how to play" prose) out of the tile.

Two things that are easy to get wrong and cost the most time here:
  * Synthetic key events must be built with the IFRAME's KeyboardEvent and
    dispatched on its window. Using the parent realm's constructor silently
    does nothing, which is why the arcade games all sat on "press start".
  * Many boards only exist after the game starts, so the framing element is
    resolved after the recipe, not before.

Usage:  python3 tools/capture-thumbs.py <out-dir> <id> [<id> ...]
        (needs the dev server on http://localhost:8091)
"""
import os
import subprocess
import sys

CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
ORIGIN = "http://localhost:8091"
SIDE = 900

# JS run against the iframe. Helpers in scope: click(re), key(k), tap(),
# seat(), sleep(ms), d (document), w (window).
RECIPES = {
    "_default":         "await click(/^(play|start|new game|begin|deal)/i); await sleep(1200);",

    # Arcade — retry the start input until the prompt clears, then let a few
    # frames of actual gameplay accumulate so the tile is not an empty field.
    "asteroids":        "await keyUntil(' ', /INSERT COIN|Press SPACE/i); await sleep(2600); key('ArrowUp'); await sleep(900);",
    "defender":         "await keyUntil(' ', /INSERT COIN|Press/i); await sleep(5000);",
    "frogger":          "await keyUntil('ArrowUp', /Press any arrow/i); await sleep(1800); key('ArrowUp'); await sleep(700); key('ArrowUp'); await sleep(900);",
    "lunar-lander":     "await keyUntil(' ', /Press|START/i); await sleep(2600);",
    "missile-command":  "await keyUntil(' ', /INSERT COIN/i); for (let i=0;i<8;i++){ tap(); await sleep(700); } await sleep(1800);",
    "spacex-lander":    "await keyUntil(' ', /Press|START/i); await sleep(2600);",
    "simon":            "await keyUntil(' ', /INSERT COIN/i); await sleep(900); key('Enter'); tap(); await sleep(2600);",
    "block-puzzle":     "const b=d.querySelector('.ch-start'); if(b) b.click(); await sleep(1000); for (let i=0;i<6;i++){ key('ArrowDown'); await sleep(500); } await sleep(2600);",
    "bubble-pop":       "await sleep(4200);",

    # Kids — DOM boards, mostly ready on load.
    "animal-detective": "await click(/start|play|begin/i); await sleep(1800);",
    "counting-critters":"await sleep(3200);",
    "memory-match":     "await sleep(1000); await flip();",
    "shape-sorter":     "await sleep(5200);",
    "tic-tac-toe":      "await sleep(900); await cell(4); await sleep(1000);",

    # Casino / cards — some gate on a name prompt, some on a deal.
    "solitaire":        "await seat(); await sleep(1800);",
    "freecell":         "await seat(); await sleep(1600);",
    "spider-solitaire": "await seat(); await sleep(1600);",
    "hearts":           "await seat(); await sleep(2000);",
    "spades":           "await seat(); await sleep(2200);",
    "euchre":           "await seat(); await sleep(2200);",
    "go-fish":          "await seat(); await sleep(1800);",
    "crazy-eights":     "await seat(); await sleep(1800);",
    "craps":            "await seat(); await sleep(1200); await click(/^\\$25$/); await sleep(400); await click(/roll|shoot/i); await sleep(2200);",
    "roulette":         "await seat(); await sleep(1200); await click(/^\\$25$/); await sleep(600); await click(/^spin/i); await sleep(2800);",
    "video-poker":      "await seat(); await sleep(1000); await click(/^deal/i); await sleep(1800);",
    "three-card-poker": "await seat(); await sleep(1000); await click(/^\\$25$/); await sleep(400); await click(/^deal/i); await sleep(1800);",
    "texas-holdem":     "await click(/\\$500 buy-in/i); await sleep(500); await click(/take a seat/i); await sleep(3000);",
    "slot-machine":     "await sleep(1000); await click(/^spin/i); await sleep(2600);",
    "dog-breed-finder": "await sleep(1600);",
}

# Element the tile frames. Resolved after the recipe; falls back to the
# largest canvas, then to the densest block-level element.
# A few catalog ids do not live at /<id>/ (see `url` in games-catalog.js).
URLS = {"dog-breed-finder": "/dogs/"}

FITS = {"block-puzzle": "contain", "dog-breed-finder": "contain"}

TARGETS = {
    "memory-match":     ".board-wrap, .board",
    "counting-critters": ".stage",
    "shape-sorter":     "canvas",
    "tic-tac-toe":      ".board-wrap, .board",
    "animal-detective": ".main-grid",
    "solitaire":        "[class*=sol-table], [class*=table]",
    "freecell":         "[class*=table], [class*=board]",
    "spider-solitaire": "[class*=table], [class*=board]",
    "hearts":           "[class*=table]",
    "spades":           "[class*=table]",
    "euchre":           "[class*=table]",
    "go-fish":          "[class*=table], [class*=board]",
    "crazy-eights":     "[class*=table], [class*=board]",
    "slot-machine":     "[class*=cabinet], [class*=reels], [class*=machine]",
    "dog-breed-finder": ".dq-grid",
    # Selecting the felt by geometry was tried and abandoned: it framed empty
    # table on every casino game. The game-stage section includes the dealer
    # portrait, which is fine — it reads as "a table with a dealer".
    "craps":            ".game-stage",
    "roulette":         ".game-stage",
    "video-poker":      ".game-stage",
    "three-card-poker": ".game-stage",
    "texas-holdem":     ".game-stage",
}



PAGE = r"""<!doctype html><meta charset="utf-8">
<style>html,body{margin:0;background:#000;overflow:hidden}
#w{width:__SIDE__px;height:__SIDE__px;overflow:hidden;position:relative}
#f{width:1400px;height:1050px;border:0;display:block;position:absolute;top:0;left:0;transform-origin:0 0}</style>
<div id="w"><iframe id="f" src="__ORIGIN____PATH__"></iframe></div>
<script>
localStorage.setItem('casinoPlayer', JSON.stringify({name:'Alex'}));
localStorage.setItem('casinoBankroll', '1000');
const f = document.getElementById('f');
const sleep = ms => new Promise(r => setTimeout(r, ms));
f.addEventListener('load', async () => {
  const d = f.contentDocument, w = f.contentWindow;

  const btn = re => [...d.querySelectorAll('button,a.play-button,[role=button],.btn')]
      .find(b => re.test((b.textContent||'').trim()) && !b.disabled &&
                 b.getBoundingClientRect().width > 0);
  const click = async re => { for (let i=0;i<30;i++){ const b=btn(re); if(b){b.click(); return true;} await sleep(120);} return false; };

  // Key events MUST come from the iframe realm and land on its window.
  const KEYCODES = {' ':32, Enter:13, ArrowLeft:37, ArrowUp:38, ArrowRight:39, ArrowDown:40};
  const key = k => {
    const kc = KEYCODES[k] || k.charCodeAt(0);
    const opts = {key:k, code:(k===' '?'Space':k), keyCode:kc, which:kc,
                  bubbles:true, cancelable:true};
    for (const t of ['keydown','keypress','keyup']) {
      try { w.dispatchEvent(new w.KeyboardEvent(t, opts)); } catch(e){}
      try { d.dispatchEvent(new w.KeyboardEvent(t, opts)); } catch(e){}
    }
  };
  // Under --virtual-time-budget every sleep() collapses, so a recipe that
  // "presses start then waits" can run before the game has bound its handler.
  // These retry until the start prompt actually goes away.
  const gone = re => !re.test(d.body.innerText||'');
  const keyUntil = async (k, re, tries=40) => {
    for (let i=0;i<tries;i++){ key(k); tap(); if (gone(re)) return true; await sleep(200); }
    return gone(re);
  };
  const clickUntil = async (btnRe, re, tries=40) => {
    for (let i=0;i<tries;i++){ const b=btn(btnRe); if(b) b.click(); tap(); if (gone(re)) return true; await sleep(200); }
    return gone(re);
  };
  const tap = () => {
    const c = d.querySelector('canvas') || d.body;
    const r = c.getBoundingClientRect();
    const o = {clientX:r.left+r.width/2, clientY:r.top+r.height/2, bubbles:true, cancelable:true};
    for (const t of ['pointerdown','mousedown','mouseup','click'])
      { try { c.dispatchEvent(new w.MouseEvent(t, o)); } catch(e){} }
  };
  const seat = async () => {
    for (let i=0;i<25;i++){
      const inp = [...d.querySelectorAll('input[type=text],input:not([type])')]
          .find(x => x.getBoundingClientRect().width > 0);
      if (inp) {
        const set = Object.getOwnPropertyDescriptor(w.HTMLInputElement.prototype,'value').set;
        set.call(inp, 'Alex');
        inp.dispatchEvent(new w.Event('input', {bubbles:true}));
        await sleep(150);
        await click(/take a seat|start|continue|play|ok|go/i);
        return true;
      }
      await sleep(120);
    }
    return false;
  };
  const flip = async () => {
    const cs = [...d.querySelectorAll('.card,[class*=card],[class*=tile]')]
        .filter(e => e.getBoundingClientRect().width > 30);
    if (cs[0]) cs[0].click(); await sleep(400);
    if (cs[3]) cs[3].click(); await sleep(500);
  };
  const cell = async i => {
    const cs = [...d.querySelectorAll('.cell,[class*=cell],[class*=square],button')]
        .filter(e => { const r=e.getBoundingClientRect(); return r.width>40 && Math.abs(r.width-r.height)<14; });
    if (cs[i]) cs[i].click();
  };

  await sleep(1500);
  try { __RECIPE__ } catch (e) {}
  await sleep(700);

  // Frame on the game itself.
  // A target is either a CSS selector list or, for layouts with no usable
  // class on the interesting node, a "js:" expression returning an element.
  const bySel = () => { const s = __TARGET__; if (!s) return null;
    if (s.startsWith('js:')) { try { return eval(s.slice(3)) || null; } catch(e) { return null; } }
    for (const one of s.split(',')) { const e = d.querySelector(one.trim());
      if (e) { const r = e.getBoundingClientRect(); if (r.width>150 && r.height>120) return e; } }
    return null; };
  const byCanvas = () => [...d.querySelectorAll('canvas')]
      .map(c => [c, c.getBoundingClientRect()])
      .filter(([,r]) => r.width>150 && r.height>150)
      .sort((a,b)=>b[1].width*b[1].height - a[1].width*a[1].height).map(x=>x[0])[0] || null;
  const el = bySel() || byCanvas();
  if (el) {
    // Cover, not contain: fit the SHORTER edge so the tile is filled with the
    // game. Containing a 4:3 canvas in a square letterboxes it and the page
    // chrome above and below leaks into the shot.
    const r = el.getBoundingClientRect();
    const side = __FIT__ === 'contain' ? Math.max(r.width, r.height) * 1.03
                                       : Math.min(r.width, r.height);
    const s = __SIDE__ / side;
    const ox = r.left + (r.width - side)/2, oy = r.top + (r.height - side)/2;
    f.style.transform = 'scale('+s+') translate('+(-ox)+'px,'+(-oy)+'px)';
  }
  await sleep(600);
  document.title = 'READY';
});
</script>
"""


def capture(gid, out_dir):
    target = TARGETS.get(gid)
    page = (PAGE.replace("__SIDE__", str(SIDE))
                .replace("__ORIGIN__", ORIGIN)
                .replace("__PATH__", URLS.get(gid, "/" + gid + "/"))
                .replace("__RECIPE__", RECIPES.get(gid, RECIPES["_default"]))
                .replace("__TARGET__", repr(target) if target else "null")
                .replace("__FIT__", repr(FITS.get(gid, "cover"))))
    scratch = os.path.join(ROOT, "_capture.html")
    with open(scratch, "w") as fh:
        fh.write(page)
    png = os.path.join(out_dir, f"{gid}.png")
    if os.path.exists(png):
        os.remove(png)
    subprocess.run([
        CHROME, "--headless", "--disable-gpu", "--hide-scrollbars",
        "--force-device-scale-factor=2", f"--window-size={SIDE},{SIDE}",
        "--virtual-time-budget=26000", f"--screenshot={png}",
        f"{ORIGIN}/_capture.html",
    ], capture_output=True)
    os.remove(scratch)
    return png if os.path.exists(png) else None


if __name__ == "__main__":
    out = sys.argv[1]
    os.makedirs(out, exist_ok=True)
    for gid in sys.argv[2:]:
        print(f"{'ok  ' if capture(gid, out) else 'FAIL'} {gid}", flush=True)
