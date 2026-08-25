#!/bin/sh
# Generate a per-printable OG card (1200x630 jpg in assets/og/) by
# screenshotting each sheet with headless Chrome via tools/og-capture.html.
#
# Unlike the game cards (tools/make-og-images.py, composited from tile art),
# printables have no tile art — but they ARE a visual artifact, so the card
# is a screenshot of the actual sheet. Rerun after adding a printable, then
# point the new page's og:image/twitter:image at assets/og/<slug>.jpg.
#
# Usage: local server on :8091 (launch.json "website"), then
#   sh tools/make-printable-og.sh [slug ...]     # no args = all printables
set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
BASE="http://localhost:8091"

# A dead server produces valid-looking 25KB blanks — fail fast instead.
curl -sf -o /dev/null --max-time 4 "$BASE/printables/" || {
  echo "ERROR: no server at $BASE — start the 'website' preview first." >&2; exit 1; }

slugs="$*"
[ -z "$slugs" ] && slugs=$(cd "$ROOT/printables" && ls -d */ | tr -d '/' )

for slug in $slugs; do
  [ -f "$ROOT/printables/$slug/index.html" ] || continue
  png="$ROOT/assets/og/$slug.png"
  "$CHROME" --headless=new --screenshot="$png" --window-size=1200,630 \
    --hide-scrollbars --virtual-time-budget=8000 \
    "$BASE/tools/og-capture.html?slug=$slug" 2>/dev/null
  python3 - "$png" <<'PY'
import sys, os
from PIL import Image
png = sys.argv[1]
img = Image.open(png).convert("RGB")
assert img.size == (1200, 630), f"{png}: {img.size}"
jpg = png[:-4] + ".jpg"
img.save(jpg, "JPEG", quality=88)
os.remove(png)
print(f"  {os.path.basename(jpg)}  {os.path.getsize(jpg)//1024}KB")
PY
done
