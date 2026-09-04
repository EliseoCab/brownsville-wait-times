#!/usr/bin/env bash
# Copy the static GitHub Pages tree into _site/ (used by both deploy workflows).
set -euo pipefail
cd "$(dirname "$0")/.."

mkdir -p _site/data _site/icons
cp index.html README.md manifest.webmanifest sw.js amenities.css amenities.js _site/
cp -R gateway bm veterans los-indios _site/
cp icons/icon-192.png icons/icon-512.png icons/apple-touch-icon.png _site/icons/
cp data/bwt.xml _site/data/bwt.xml
if [[ -f data/last-fetch.txt ]]; then
  cp data/last-fetch.txt _site/data/last-fetch.txt
fi
touch _site/.nojekyll
