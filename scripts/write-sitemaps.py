#!/usr/bin/env python3
"""Write Google-friendly sitemap.xml + sitemap.txt (UTF-8, no BOM).

GitHub Pages serves ``.xml`` as ``application/xml`` with no charset. GSC has
historically reported “Sitemap could not be read” for valid github.io XML
sitemaps. Pages serves ``.txt`` as ``text/plain; charset=utf-8``, which is why
we also emit a Google-supported URL-list sitemap.

Both deploy workflows publish whatever this script writes into ``_site/``.
"""

from __future__ import annotations

import argparse
import sys
from datetime import datetime, timezone
from pathlib import Path
from xml.etree import ElementTree as ET

BASE = "https://eliseocab.github.io/brownsville-wait-times"
PATHS = ("/", "/bm/", "/gateway/", "/veterans/", "/los-indios/")
NS = "http://www.sitemaps.org/schemas/sitemap/0.9"
XML_DECL = b'<?xml version="1.0" encoding="UTF-8"?>\n'


def urls() -> list[str]:
    return [BASE + path for path in PATHS]


def normalize_lastmod(raw: str) -> str:
    """Return a W3C datetime (UTC, explicit offset)."""
    text = raw.strip()
    if text.endswith("Z"):
        text = text[:-1] + "+00:00"
    dt = datetime.fromisoformat(text)
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    dt = dt.astimezone(timezone.utc)
    return dt.replace(microsecond=0).isoformat()


def resolve_lastmod(lastmod: str | None, lastmod_file: Path | None) -> str:
    if lastmod:
        return normalize_lastmod(lastmod)
    if lastmod_file and lastmod_file.is_file():
        return normalize_lastmod(lastmod_file.read_text(encoding="utf-8"))
    return normalize_lastmod(datetime.now(timezone.utc).isoformat())


def xml_bytes(lastmod: str) -> bytes:
    # ElementTree serializes with the default namespace so Google sees a
    # plain <urlset xmlns="..."> document, not ns0: prefixes.
    ET.register_namespace("", NS)
    urlset = ET.Element("{%s}urlset" % NS)
    for loc in urls():
        url = ET.SubElement(urlset, "{%s}url" % NS)
        ET.SubElement(url, "{%s}loc" % NS).text = loc
        ET.SubElement(url, "{%s}lastmod" % NS).text = lastmod
    body = ET.tostring(urlset, encoding="utf-8", xml_declaration=False)
    # Pretty-print with 2-space indent without adding a BOM or HTML wrapper.
    parsed = ET.fromstring(body)
    ET.indent(parsed, space="  ")
    pretty = ET.tostring(parsed, encoding="utf-8", xml_declaration=False)
    return XML_DECL + pretty + b"\n"


def txt_bytes() -> bytes:
    return ("\n".join(urls()) + "\n").encode("utf-8")


def write_utf8(path: Path, data: bytes) -> None:
    if data.startswith(b"\xef\xbb\xbf"):
        raise SystemExit(f"{path}: refused to write a UTF-8 BOM")
    path.write_bytes(data)


def check_dir(out_dir: Path) -> None:
    xml_path = out_dir / "sitemap.xml"
    txt_path = out_dir / "sitemap.txt"
    raw = xml_path.read_bytes()
    if raw.startswith(b"\xef\xbb\xbf"):
        raise SystemExit(f"{xml_path}: UTF-8 BOM present")
    if not raw.startswith(XML_DECL.strip()):
        raise SystemExit(f"{xml_path}: must start with XML declaration, not HTML")
    if b"<html" in raw.lower():
        raise SystemExit(f"{xml_path}: HTML wrapper detected")
    root = ET.fromstring(raw)
    if root.tag != f"{{{NS}}}urlset":
        raise SystemExit(f"{xml_path}: root must be urlset with sitemap 0.9 xmlns")
    locs = [el.text.strip() for el in root.findall(f"{{{NS}}}url/{{{NS}}}loc") if el.text]
    expected = urls()
    if locs != expected:
        raise SystemExit(f"{xml_path}: unexpected <loc> list:\n{locs}\n!=\n{expected}")
    lastmods = [el.text for el in root.findall(f"{{{NS}}}url/{{{NS}}}lastmod")]
    if len(lastmods) != len(expected) or any(not v for v in lastmods):
        raise SystemExit(f"{xml_path}: every URL needs a <lastmod>")
    for value in lastmods:
        normalize_lastmod(value)

    txt = txt_path.read_bytes()
    if txt.startswith(b"\xef\xbb\xbf"):
        raise SystemExit(f"{txt_path}: UTF-8 BOM present")
    lines = txt.decode("utf-8").splitlines()
    if lines != expected:
        raise SystemExit(f"{txt_path}: unexpected URL list:\n{lines}")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--outdir", type=Path, required=True, help="Directory to write sitemap files")
    parser.add_argument("--lastmod", help="W3C datetime override (UTC)")
    parser.add_argument("--lastmod-file", type=Path, help="File containing a W3C datetime (e.g. data/last-fetch.txt)")
    args = parser.parse_args()

    args.outdir.mkdir(parents=True, exist_ok=True)
    lastmod = resolve_lastmod(args.lastmod, args.lastmod_file)
    write_utf8(args.outdir / "sitemap.xml", xml_bytes(lastmod))
    write_utf8(args.outdir / "sitemap.txt", txt_bytes())
    check_dir(args.outdir)
    print(f"Wrote {args.outdir / 'sitemap.xml'} and {args.outdir / 'sitemap.txt'} (lastmod={lastmod})")
    return 0


if __name__ == "__main__":
    sys.exit(main())
