#!/usr/bin/env bash
# Copy the static GitHub Pages tree into _site/ (used by both deploy workflows).
set -euo pipefail
cd "$(dirname "$0")/.."

mkdir -p _site/data _site/icons
cp index.html README.md manifest.webmanifest sw.js amenities.css amenities.js robots.txt _site/
cp -R gateway bm veterans los-indios _site/
cp icons/icon-192.png icons/icon-512.png icons/apple-touch-icon.png _site/icons/
cp data/bwt.xml _site/data/bwt.xml
if [[ -f data/last-fetch.txt ]]; then
  cp data/last-fetch.txt _site/data/last-fetch.txt
fi
# Amenity hero images (e.g. Starbase photo)
if [[ -d images ]]; then
  mkdir -p _site/images
  cp -R images/. _site/images/
fi
# Google Search Console HTML verification files (must be at site root)
shopt -s nullglob
for f in google*.html; do
  cp "$f" _site/
done
shopt -u nullglob
touch _site/.nojekyll

# Sitemaps must be raw files at the Pages artifact root (not nested, not HTML).
# GitHub Pages MIME types we cannot override:
#   sitemap.xml -> application/xml          (no charset)
#   sitemap.txt -> text/plain; charset=utf-8
# GSC sometimes fails to parse github.io application/xml; sitemap.txt is the
# charset-friendly fallback. See scripts/write-sitemaps.py.
python3 scripts/write-sitemaps.py --outdir _site --lastmod-file data/last-fetch.txt

# Fail the deploy if anything wrapped or relocated the discovery files.
test -f _site/sitemap.xml
test -f _site/sitemap.txt
test -f _site/robots.txt
test -f _site/.nojekyll
test ! -d _site/sitemap.xml
if grep -qi '<html' _site/sitemap.xml; then
  echo "sitemap.xml looks like HTML; refusing to publish" >&2
  exit 1
fi
