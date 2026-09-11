#!/usr/bin/env bash
# Copy the static GitHub Pages tree into _site/ (used by both deploy workflows).
set -euo pipefail
cd "$(dirname "$0")/.."

mkdir -p _site/data _site/icons
cp index.html README.md manifest.webmanifest sw.js amenities.css amenities.js sitemap.xml robots.txt _site/
cp -R gateway bm veterans los-indios all-ports _site/
cp icons/icon-192.png icons/icon-512.png icons/apple-touch-icon.png _site/icons/
cp data/bwt.xml _site/data/bwt.xml
if [[ -f data/bwt-all.xml ]]; then
  cp data/bwt-all.xml _site/data/bwt-all.xml
fi
if [[ -f data/last-fetch.txt ]]; then
  cp data/last-fetch.txt _site/data/last-fetch.txt
fi
# Amenity hero images (e.g. Starbase photo)
if [[ -d images ]]; then
  mkdir -p _site/images
  cp -R images/. _site/images/
fi
# Same-origin Leaflet for Crowd source map (CSP blocks CDNs)
if [[ -d vendor ]]; then
  mkdir -p _site/vendor
  cp -R vendor/. _site/vendor/
fi
# Google Search Console HTML verification files (must be at site root)
shopt -s nullglob
for f in google*.html; do
  cp "$f" _site/
done
shopt -u nullglob
touch _site/.nojekyll
