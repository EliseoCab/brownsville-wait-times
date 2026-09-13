#!/usr/bin/env python3
"""Regression checks for the first modern-web assessment slice."""

from __future__ import annotations

from pathlib import Path
import re
import sys
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parents[1]
AMENITY_PAGES = [
    ROOT / "gateway" / "index.html",
    ROOT / "bm" / "index.html",
    ROOT / "veterans" / "index.html",
    ROOT / "los-indios" / "index.html",
]


def fail(msg: str) -> None:
    print(f"FAIL: {msg}")
    sys.exit(1)


def is_homepage_path(pathname: str, sw_href: str) -> bool:
    """Mirror sw.js isHomepagePath() using a synthetic SW URL."""
    base = urlparse(sw_href)
    home = str(Path(base.path).parent)
    if not home.endswith("/"):
        home += "/"
    if home == "//":
        home = "/"
    home_index = home + "index.html"
    return pathname == home or pathname == home_index


def test_sw_homepage_paths() -> None:
    cases = [
        ("https://eliseocab.github.io/brownsville-wait-times/sw.js", "/brownsville-wait-times/", True),
        ("https://eliseocab.github.io/brownsville-wait-times/sw.js", "/brownsville-wait-times/index.html", True),
        ("https://eliseocab.github.io/brownsville-wait-times/sw.js", "/brownsville-wait-times/amenities.css", False),
        ("https://eliseocab.github.io/brownsville-wait-times/sw.js", "/brownsville-wait-times/gateway/", False),
        ("https://eliseocab.github.io/brownsville-wait-times/sw.js", "/brownsville-wait-times/gateway/index.html", False),
        ("http://127.0.0.1:4173/sw.js", "/", True),
        ("http://127.0.0.1:4173/sw.js", "/index.html", True),
        ("http://127.0.0.1:4173/sw.js", "/amenities.js", False),
    ]
    for sw_href, pathname, expect in cases:
        got = is_homepage_path(pathname, sw_href)
        if got != expect:
            fail(f"is_homepage_path({pathname!r}, {sw_href!r}) -> {got}, expected {expect}")


def test_sw_source() -> None:
    text = (ROOT / "sw.js").read_text()
    if "bwt-shell-v28" not in text:
        fail("sw.js must bump CACHE to bwt-shell-v28")
    if 'hit || caches.match("./index.html")' in text:
        fail("sw.js still falls back to homepage HTML for every failed GET")
    if "amenities.css?v=11" not in text or "amenities.js?v=8" not in text:
        fail("sw.js must precache amenity CSS/JS")
    for name in ("gateway", "bm", "veterans", "los-indios"):
        if f"./{name}/index.html" not in text:
            fail(f"sw.js must precache {name}/index.html")
    if "Response.error()" not in text:
        fail("sw.js must cache-or-fail non-homepage assets")


def test_amenities_no_ga() -> None:
    for page in AMENITY_PAGES:
        text = page.read_text()
        if "gtag" in text or "googletagmanager" in text:
            fail(f"{page.relative_to(ROOT)} still loads Google Analytics")
        if 'amenities.css?v=11' not in text or 'amenities.js?v=8' not in text:
            fail(f"{page.relative_to(ROOT)} must pin amenities.css?v=11 and amenities.js?v=8")
        if 'class="skip-link"' not in text:
            fail(f"{page.relative_to(ROOT)} missing skip link")


def test_homepage_a11y_and_leaflet() -> None:
    text = (ROOT / "index.html").read_text()
    if 'role="tablist"' in text:
        fail("homepage still uses a fake tablist")
    if 'id="leaveNowBtn"' not in text:
        fail("homepage missing Leave Now <button>")
    if 'class="skip-link"' not in text:
        fail("homepage missing skip link")
    if 'id="portGrid" aria-live' in text or 'id="dfoTimeline" class="x-carousel" aria-live' in text:
        fail("portGrid or X carousel still a live region")
    if re.search(r'<link[^>]+href="vendor/leaflet/leaflet\.css"', text):
        fail("homepage still eagerly loads Leaflet CSS")
    if re.search(r'<script[^>]+src="vendor/leaflet/leaflet\.js"', text):
        fail("homepage still eagerly loads Leaflet JS")
    if "outline: none" in text and ".bridge-map" in text:
        # Only fail if bridge-map still clears the outline
        if re.search(r"\.bridge-map:focus-visible[^{]*\{[^}]*outline:\s*none", text):
            fail(".bridge-map:focus-visible still removes the outline")
    if ":where(a, button):focus-visible" not in text:
        fail("homepage missing global :focus-visible token")
    if 'aria-pressed="true"' not in text:
        fail("filter buttons missing aria-pressed")


def test_lightbox() -> None:
    js = (ROOT / "amenities.js").read_text()
    css = (ROOT / "amenities.css").read_text()
    if "showModal" not in js or 'closedby' not in js:
        fail("amenities.js must use <dialog closedby> + showModal()")
    if "closedBy" not in js:
        fail("amenities.js must include the closedby light-dismiss fallback")
    if "photo-lightbox::backdrop" not in css:
        fail("amenities.css must style dialog::backdrop")
    if ":where(a, button):focus-visible" not in css:
        fail("amenities.css missing global :focus-visible token")


def main() -> None:
    test_sw_homepage_paths()
    test_sw_source()
    test_amenities_no_ga()
    test_homepage_a11y_and_leaflet()
    test_lightbox()
    print("ok: modern-web slice 1 checks passed")


if __name__ == "__main__":
    main()
