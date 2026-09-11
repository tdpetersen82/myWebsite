#!/usr/bin/env python3
# Draws the Daily Orbit tile (assets/thumbs/daily-orbit-arcade-20260911.png + daily-orbit.png for the OG
# card) with PIL only: a dark illuminated scene in the spirit of the 2026-09-09 arcade artwork.
# Usage: python3 tools/daily-orbit-tile.py   (then tools/make-og-images.py or its build() for the OG card)
import math, os
from PIL import Image, ImageDraw, ImageFilter
S = 1200
ROOT = '/Users/trevor/Source/myWebsite'
img = Image.new('RGBA', (S, S), (10, 13, 28, 255))
# vignette + faint blue nebula
px = img.load()
for y in range(S):
    for x in range(S):
        d = math.hypot(x - S*0.5, y - S*0.5) / (S*0.72)
        k = max(0.0, 1 - d*d)
        px[x, y] = (int(10 + 10*k), int(13 + 14*k), int(28 + 30*k), 255)
def layer(): return Image.new('RGBA', (S, S), (0, 0, 0, 0))
def glow(cx, cy, r, color, blur, alpha=255):
    L = layer(); d = ImageDraw.Draw(L)
    d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=color + (alpha,))
    return L.filter(ImageFilter.GaussianBlur(blur))
def sphere(cx, cy, r, base, light, dark, lx=-0.55, ly=-0.6):
    L = layer(); p = L.load()
    for y in range(int(cy - r) - 1, int(cy + r) + 2):
        for x in range(int(cx - r) - 1, int(cx + r) + 2):
            dx, dy = (x - cx) / r, (y - cy) / r
            d2 = dx*dx + dy*dy
            if d2 > 1.0: continue
            nz = math.sqrt(1 - d2)
            lam = max(0.0, dx*lx + dy*ly + nz*0.6)
            t = min(1.0, lam * 1.15)
            c = [int(dark[i] + (base[i] - dark[i]) * min(1, t*1.4) + (light[i] - base[i]) * max(0, t - 0.55) * 2.2) for i in range(3)]
            edge = min(1.0, (1 - d2) * 14)     # antialiased rim
            p[x, y] = (c[0], c[1], c[2], int(255 * edge))
    return L
# stars
d = ImageDraw.Draw(img); seed = 11
for i in range(260):
    seed = (seed * 16807) % 2147483647; x = seed % S
    seed = (seed * 16807) % 2147483647; y = seed % S
    seed = (seed * 16807) % 2147483647; rr = 0.8 + (seed % 100) / 60
    a = 90 + (seed % 120)
    d.ellipse([x - rr, y - rr, x + rr, y + rr], fill=(200, 215, 255, a))
# orbits: tilted ellipses around the Sun
SUN = (600, 640)
TILT = -18
SQ = 0.51   # orbit-plane squash
def plane(u, v):   # orbit-plane coords → screen
    ca, sa = math.cos(math.radians(TILT)), math.sin(math.radians(TILT)); v = v*SQ
    return (SUN[0] + u*ca - v*sa, SUN[1] + u*sa + v*ca)
def orbit(rx, ry, color, w, blur, alpha, tilt=-18):
    L = layer(); dd = ImageDraw.Draw(L)
    pts = [plane(rx*math.cos(math.radians(i)), rx*math.sin(math.radians(i))) for i in range(361)]
    dd.line(pts, fill=color + (alpha,), width=w, joint='curve')
    return L.filter(ImageFilter.GaussianBlur(blur)) if blur else L
for (rx, ry, col) in [(175, 0, (120, 150, 255)), (470, 0, (150, 110, 255)), (300, 0, (110, 170, 240))]:
    img.alpha_composite(orbit(rx, ry, col, 10, 9, 110))
    img.alpha_composite(orbit(rx, ry, col, 3, 0, 170))
# sun
img.alpha_composite(glow(*SUN, 150, (255, 150, 40), 80, 200))
img.alpha_composite(glow(*SUN, 96, (255, 200, 80), 26, 255))
img.alpha_composite(sphere(SUN[0], SUN[1], 78, (255, 190, 60), (255, 245, 190), (240, 110, 30), lx=-0.2, ly=-0.3))
# earth on the inner orbit (lower left) and jupiter on the outer (upper right)
RE, RJ, TH_E = 300, 470, 145                      # Earth's radius/angle; Jupiter sits at the far end of the transfer
E = plane(RE*math.cos(math.radians(TH_E)), RE*math.sin(math.radians(TH_E)))
J = plane(RJ*math.cos(math.radians(TH_E + 180)), RJ*math.sin(math.radians(TH_E + 180)))
# launch arc: the Hohmann half-ellipse from Earth's radius to Jupiter's, drawn in the orbit plane
a_t = (RE + RJ) / 2; e_t = (RJ - RE) / (RJ + RE)
arc = []
for i in range(0, 121):
    th = math.radians(TH_E + 180 * i / 120)
    r = a_t*(1 - e_t*e_t) / (1 + e_t*math.cos(th - math.radians(TH_E)))
    arc.append(plane(r*math.cos(th), r*math.sin(th)))
L = layer(); dd = ImageDraw.Draw(L)
dd.line(arc, fill=(110, 255, 150, 200), width=14, joint='curve')
img.alpha_composite(L.filter(ImageFilter.GaussianBlur(14)))
L = layer(); dd = ImageDraw.Draw(L)
for i in range(0, 116, 5):                                          # dashed core
    dd.line(arc[i:i+4], fill=(190, 255, 205, 255), width=5, joint='curve')
img.alpha_composite(L)
# probe near the end of the arc
P = arc[96]
img.alpha_composite(glow(P[0], P[1], 22, (255, 255, 255), 12, 220))
img.alpha_composite(sphere(P[0], P[1], 9, (240, 245, 255), (255, 255, 255), (150, 160, 200)))
# earth
img.alpha_composite(glow(E[0], E[1], 70, (80, 150, 255), 30, 170))
img.alpha_composite(sphere(E[0], E[1], 52, (60, 140, 235), (170, 230, 255), (15, 40, 110)))
# a couple of green-ish continents
L = layer(); dd = ImageDraw.Draw(L)
for (ox, oy, w, h) in [(-16, -18, 30, 22), (8, 4, 26, 30), (-6, 20, 20, 12)]:
    dd.ellipse([E[0]+ox-w/2, E[1]+oy-h/2, E[0]+ox+w/2, E[1]+oy+h/2], fill=(90, 190, 120, 200))
mask = sphere(E[0], E[1], 50, (255,255,255), (255,255,255), (255,255,255)).split()[3]
L.putalpha(Image.composite(L.split()[3], Image.new('L', (S, S), 0), mask))
img.alpha_composite(L.filter(ImageFilter.GaussianBlur(1.2)))
# jupiter with bands + gold capture ring
img.alpha_composite(glow(J[0], J[1], 110, (255, 200, 120), 40, 150))
img.alpha_composite(sphere(J[0], J[1], 84, (222, 178, 120), (255, 235, 200), (120, 70, 40)))
L = layer(); dd = ImageDraw.Draw(L)
for (oy, h, col) in [(-40, 14, (190, 130, 90, 120)), (-10, 10, (250, 225, 190, 120)), (18, 16, (200, 140, 95, 130)), (46, 10, (170, 115, 80, 110))]:
    dd.ellipse([J[0]-84, J[1]+oy-h/2, J[0]+84, J[1]+oy+h/2], fill=col)
maskJ = sphere(J[0], J[1], 82, (255,255,255), (255,255,255), (255,255,255)).split()[3]
L.putalpha(Image.composite(L.split()[3], Image.new('L', (S, S), 0), maskJ))
img.alpha_composite(L.filter(ImageFilter.GaussianBlur(2)))
L = layer(); dd = ImageDraw.Draw(L)
R = 118
for i in range(0, 360, 12):
    a0, a1 = i, i + 6
    dd.arc([J[0]-R, J[1]-R, J[0]+R, J[1]+R], a0, a1, fill=(255, 211, 90, 230), width=5)
img.alpha_composite(L.filter(ImageFilter.GaussianBlur(0.8)))
out = img.convert('RGB').resize((600, 600), Image.LANCZOS)
out.save(os.path.join(ROOT, 'assets/thumbs/daily-orbit-arcade-20260911.png'), optimize=True)
out.save(os.path.join(ROOT, 'assets/thumbs/daily-orbit.png'), optimize=True)
print('tile written')
