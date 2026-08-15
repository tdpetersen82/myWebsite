#!/usr/bin/env python3
"""Strip the baked-in "transparency checkerboard" from the slot sprite sheet.

assets/slot.png shipped with a grey/white checker pattern rasterised behind
every symbol, so the reels rendered that pattern instead of the reel felt.
This removes it and writes the WebP the page actually loads.

Two passes:
  1. flood inward from each cell's border through checker-toned pixels, which
     clears the bulk without touching highlights enclosed by a symbol outline;
  2. clear leftover enclosed components that contain BOTH checker tones — an
     unambiguous checkerboard signature. Flat single-tone blobs are left alone
     because those can legitimately be artwork highlights.

Usage: python3 tools/strip-slot-checkerboard.py <source.png> <out.webp>
"""
import sys
from collections import deque

import numpy as np
from PIL import Image

CELL = 296          # sprite cell size, px
GREY_MIN = 232      # checker tones are ~241 (grey) and ~254 (white)
NEUTRAL = 8         # max channel spread for "neutral grey"
WHITE_CUT = 248     # splits the two checker tones


def strip(src_path, out_path):
    img = Image.open(src_path).convert('RGBA')
    a = np.array(img)
    h, w = a.shape[:2]
    rgb, alpha = a[:, :, :3].astype(np.int16), a[:, :, 3]

    spread = rgb.max(axis=2) - rgb.min(axis=2)
    checker = (alpha > 0) & (spread <= NEUTRAL) & (rgb.min(axis=2) >= GREY_MIN)

    # Pass 1 — flood in from every cell border, and from existing transparency.
    seed = np.zeros((h, w), bool)
    for cy in range(0, h, CELL):
        for cx in range(0, w, CELL):
            sl = (slice(cy, min(cy + CELL, h)), slice(cx, min(cx + CELL, w)))
            blk = checker[sl]
            edge = np.zeros_like(blk)
            edge[0, :], edge[-1, :] = blk[0, :], blk[-1, :]
            edge[:, 0], edge[:, -1] = blk[:, 0], blk[:, -1]
            seed[sl] = edge
    transparent = alpha == 0
    for shift, axis in ((1, 0), (-1, 0), (1, 1), (-1, 1)):
        seed |= checker & np.roll(transparent, shift, axis=axis)

    filled = seed.copy()
    while True:
        nxt = filled.copy()
        for shift, axis in ((1, 0), (-1, 0), (1, 1), (-1, 1)):
            nxt |= np.roll(filled, shift, axis=axis)
        nxt &= checker
        if nxt.sum() == filled.sum():
            break
        filled = nxt

    # Pass 2 — enclosed components showing both tones are checkerboard too.
    leftover = checker & ~filled
    seen = np.zeros((h, w), bool)
    extra = 0
    for y0, x0 in zip(*np.where(leftover)):
        if seen[y0, x0]:
            continue
        queue, pixels = deque([(y0, x0)]), []
        seen[y0, x0] = True
        while queue:
            y, x = queue.popleft()
            pixels.append((y, x))
            for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                ny, nx = y + dy, x + dx
                if 0 <= ny < h and 0 <= nx < w and leftover[ny, nx] and not seen[ny, nx]:
                    seen[ny, nx] = True
                    queue.append((ny, nx))
        vals = np.array([rgb[y, x, 0] for y, x in pixels])
        if (vals <= WHITE_CUT).any() and (vals > WHITE_CUT).any():
            for y, x in pixels:
                filled[y, x] = True
            extra += len(pixels)

    out = np.array(img)
    out[filled, 3] = 0
    Image.fromarray(out).save(out_path, 'WEBP', quality=90, method=6)
    print(f"cleared {int(filled.sum())} px ({extra} from enclosed regions) -> {out_path}")


if __name__ == '__main__':
    strip(sys.argv[1], sys.argv[2])
