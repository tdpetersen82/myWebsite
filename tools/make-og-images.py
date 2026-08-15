#!/usr/bin/env python3
"""Generate a per-game Open Graph card for every game that has tile art.

Every page used to share one generic og-image.png, so each link previewed
identically. This composites the game's own tile art onto the same dark card
the site-wide image uses, so a shared link actually shows the game.

Games without tile art keep the generic image — a card with a blank slot would
look worse than the house one.

Usage:  python3 tools/make-og-images.py
"""
import os
import re

from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
THUMBS = os.path.join(ROOT, "assets", "thumbs")
OUT = os.path.join(ROOT, "assets", "og")
W, H = 1200, 630

BOLD = "/System/Library/Fonts/Supplemental/Arial Bold.ttf"
REG = "/System/Library/Fonts/Supplemental/Arial.ttf"


def catalog():
    """id -> display name, read straight from the shared catalog."""
    src = open(os.path.join(ROOT, "games-catalog.js")).read()
    src = src[src.index("window.LG_GAMES"):src.index("window.LG_CATEGORIES")]
    return dict(re.findall(r"id: '([a-z0-9-]+)',\s*name: '([^']*)'", src)
                + re.findall(r'id: \'([a-z0-9-]+)\',\s*name: "([^"]*)"', src))


def background():
    """Dark navy gradient with the corner brackets used by og-image.png."""
    bg = Image.new("RGB", (W, H), (14, 14, 33))
    px = bg.load()
    for y in range(H):
        for x in range(0, W, 2):
            t = ((x / W) * 0.6 + (y / H) * 0.4)
            c = (int(14 + 26 * t), int(14 + 22 * t), int(33 + 42 * t))
            px[x, y] = c
            if x + 1 < W:
                px[x + 1, y] = c
    d = ImageDraw.Draw(bg)
    m, ln, wdt = 52, 150, 3
    d.line([(m, m + ln), (m, m), (m + ln, m)], fill=(255, 255, 255), width=wdt)
    d.line([(W - m - ln, H - m), (W - m, H - m), (W - m, H - m - ln)],
           fill=(255, 255, 255), width=wdt)
    return bg


def fit(draw, text, font_path, max_w, start, floor=34):
    size = start
    while size > floor:
        f = ImageFont.truetype(font_path, size)
        if draw.textlength(text, font=f) <= max_w:
            return f
        size -= 2
    return ImageFont.truetype(font_path, floor)


def build(gid, name, art_path):
    bg = background()
    d = ImageDraw.Draw(bg)

    art = Image.open(art_path).convert("RGB")
    side = 430
    art = art.resize((side, side), Image.LANCZOS)
    frame = Image.new("RGB", (side + 8, side + 8), (255, 255, 255))
    frame.paste(art, (4, 4))
    bg.paste(frame, (W - side - 8 - 90, (H - side - 8) // 2))

    left = 96
    max_w = W - side - 8 - 90 - left - 48
    fname = fit(d, name, BOLD, max_w, 86)
    d.text((left, 236), name, font=fname, fill=(255, 255, 255))

    ftag = ImageFont.truetype(REG, 27)
    d.text((left, 236 + fname.size + 26), "Free browser game — no installs",
           font=ftag, fill=(176, 180, 205))
    fbrand = ImageFont.truetype(BOLD, 23)
    d.text((left, H - 104), "LIMESTONE GAMES", font=fbrand, fill=(255, 255, 255))
    d.line([(left, H - 118), (left + 250, H - 118)], fill=(108, 106, 210), width=3)

    out = os.path.join(OUT, f"{gid}.png")
    bg.save(out, "PNG", optimize=True)
    return out


if __name__ == "__main__":
    os.makedirs(OUT, exist_ok=True)
    names = catalog()
    made = 0
    for f in sorted(os.listdir(THUMBS)):
        gid, ext = os.path.splitext(f)
        if gid not in names:
            continue
        if ext.lower() == ".svg":
            # No rasteriser available here; these keep the generic card.
            print(f"  {gid:22s} -- skipped (svg tile art)")
            continue
        out = build(gid, names[gid], os.path.join(THUMBS, f))
        made += 1
        print(f"  {gid:22s} -> {os.path.relpath(out, ROOT)} ({os.path.getsize(out)//1024} KB)")
    print(f"{made} cards written")
