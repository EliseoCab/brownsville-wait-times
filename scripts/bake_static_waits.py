#!/usr/bin/env python3
"""Bake Brownsville CBP wait times into index.html for crawlers.

The live page script still replaces #portGrid and the summary stats after
load. This only fills HTML comments so the published page has real numbers
and an updated timestamp without JavaScript. It does not commit anything.
"""

from __future__ import annotations

import html
import re
import sys
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

import bwt_rss as rss

MARKERS = ("asof", "short", "short-hint", "long", "long-hint", "ports")

BRIDGE_LABELS = {
    "bm": ("B&M", "Puente Viejo"),
    "gateway": ("Gateway", "Puente Nuevo"),
    "veterans": ("Veterans", "Puente Los Tomates"),
    "los_indios": ("Los Indios", "Puente Lucio Blanco"),
}

# section name, lane name pattern, visible label, stat role
LANE_SPECS = (
    ("Passenger Vehicles", r"general", "Vehicles", "passenger-general"),
    ("Passenger Vehicles", r"ready", "Ready", None),
    ("Passenger Vehicles", r"sentri", "SENTRI", None),
    ("Pedestrian", r"general", "Pedestrian", None),
    ("Pedestrian", r"ready", "Pedestrian Ready", None),
    ("Commercial Vehicles", r"general", "Commercial", None),
    ("Commercial Vehicles", r"fast", "FAST", None),
)

MONTHS = (
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
)


def replace_marker(page: str, name: str, content: str) -> str:
    pattern = re.compile(
        rf"<!--bwt:{re.escape(name)}-->.*?<!--/bwt:{re.escape(name)}-->",
        re.S,
    )

    def _repl(_match: re.Match[str]) -> str:
        return f"<!--bwt:{name}-->{content}<!--/bwt:{name}-->"

    updated, count = pattern.subn(_repl, page, count=1)
    if count != 1:
        raise SystemExit(f"marker <!--bwt:{name}--> missing from HTML")
    return updated


def format_stamp(moment: datetime) -> tuple[str, str, str]:
    """Return (full label, clock label, ISO timestamp) in America/Chicago."""
    local = moment.astimezone(rss.CHICAGO)
    clock = f"{local.hour % 12 or 12}:{local.minute:02d} {local.strftime('%p').lower()}"
    tz = local.tzname() or "CT"
    full = f"{MONTHS[local.month - 1]} {local.day}, {local.year} · {clock} {tz}"
    return full, f"{clock} {tz}", local.isoformat(timespec="minutes")


def lane_phrase(label: str, lane: rss.LaneReading) -> str | None:
    if lane.delay_minutes is not None:
        text = f"{label} {lane.delay_minutes} min"
        if lane.lanes_open is not None:
            noun = "lane" if lane.lanes_open == 1 else "lanes"
            text += f" ({lane.lanes_open} {noun} open)"
        return text
    if lane.closed:
        return f"{label} closed"
    if lane.pending:
        return f"{label} update pending"
    return None


def bridge_phrases(item: rss.BridgeItem) -> tuple[list[str], int | None]:
    phrases: list[str] = []
    general: int | None = None
    if not item.present:
        return phrases, general
    for section_name, lane_re, label, role in LANE_SPECS:
        body = rss.section_body(item.description, section_name)
        chosen = None
        for lane in rss.lanes_in_section(body):
            if re.search(lane_re, lane.name, re.I):
                chosen = lane
                break
        if chosen is None:
            continue
        phrase = lane_phrase(label, chosen)
        if phrase:
            phrases.append(phrase)
        if role == "passenger-general" and chosen.delay_minutes is not None:
            general = chosen.delay_minutes
    return phrases, general


def build_fields(xml: str, now: datetime | None = None) -> dict[str, str]:
    now = now or datetime.now(timezone.utc)
    items = rss.parse_bridge_items(xml, now)
    parts: list[str] = []
    generals: list[tuple[int, str]] = []
    newest: datetime | None = None

    for spec in rss.BRIDGES:
        item = items.get(spec["id"]) or rss.empty_item(spec)
        short, mexico = BRIDGE_LABELS[spec["id"]]
        phrases, general = bridge_phrases(item)
        if general is not None:
            generals.append((general, short))
        if item.newest and (newest is None or item.newest > newest):
            newest = item.newest
        if item.newest:
            _full, clock, _iso = format_stamp(item.newest)
            phrases.append(f"Updated {clock}")
        elif not phrases:
            phrases.append("No report in the latest CBP feed")
        bits = "".join(f"<span>{html.escape(phrase)}</span>" for phrase in phrases)
        hours = f"<span>{html.escape('Hours ' + item.hours_text)}</span>" if item.hours_text else ""
        parts.append(
            "<li>"
            f"<strong>{html.escape(short)}</strong>"
            f"<span>{html.escape(mexico)}</span>"
            f"{hours}{bits}"
            "</li>"
        )

    if newest is None:
        newest = rss.channel_pubdate(xml)
    if newest is None:
        full, iso = "—", ""
    else:
        full, _clock, iso = format_stamp(newest)

    if generals:
        ordered = sorted(generals, key=lambda pair: pair[0])
        short_mins, short_name = ordered[0]
        long_mins, long_name = ordered[-1]
        short_text = f"{short_mins} min"
        long_text = f"{long_mins} min"
        short_hint = f"{short_name} · general lanes"
        long_hint = f"{long_name} · general lanes"
    else:
        short_text = long_text = "—"
        short_hint = "Across open general lanes"
        long_hint = "Plan extra time if needed"

    time_attr = f' datetime="{html.escape(iso, quote=True)}"' if iso else ""
    ports = (
        '<section class="static-waits" id="staticWaits">'
        f'<p class="static-waits-updated"><time{time_attr}>Updated {html.escape(full)}</time></p>'
        f'<ul class="static-waits-list">{"".join(parts)}</ul>'
        "</section>"
    )
    return {
        "asof": html.escape(full),
        "short": html.escape(short_text),
        "short-hint": html.escape(short_hint),
        "long": html.escape(long_text),
        "long-hint": html.escape(long_hint),
        "ports": ports,
    }


def bake(page: str, xml: str, now: datetime | None = None) -> str:
    if "<item>" not in (xml or ""):
        raise SystemExit("CBP feed has no items")
    fields = build_fields(xml, now)
    for name in MARKERS:
        page = replace_marker(page, name, fields[name])
    return page


def main(argv: list[str]) -> int:
    html_path = Path(argv[1] if len(argv) > 1 else "index.html")
    xml_path = Path(argv[2] if len(argv) > 2 else "data/bwt.xml")
    page = html_path.read_text(encoding="utf-8")
    xml = xml_path.read_text(encoding="utf-8")
    html_path.write_text(bake(page, xml), encoding="utf-8")
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
