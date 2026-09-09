#!/usr/bin/env bash
# "Pull the numbers": every live source in one go, in reading order.
#   1. Google Search Console (fresh daily first, then 90-day final) + GA4 + index canaries
#   2. Bing Webmaster (daily rows; the month table is a rolling window — don't quote it as a month)
#   3. Cloudflare edge traffic (needs ~/.config/limestone/cloudflare-token.txt)
#   4. Feedback inbox count
cd "$(dirname "$0")/.." || exit 1
DAYS="${1:-90}"
echo "################ GOOGLE (GSC + GA4), ${DAYS}-day window ################"
node tools/seo-report.mjs --days "$DAYS" || echo "seo-report failed"
echo; echo "################ BING ################"
node tools/bing-report.mjs || echo "bing-report failed"
echo; echo "################ CLOUDFLARE ################"
node tools/cf-report.mjs || true
echo; echo "################ FEEDBACK ################"
node tools/feedback-read.mjs --count || echo "feedback-read failed"
