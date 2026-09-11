#!/usr/bin/env python3
"""Shared CBP Brownsville RSS helpers (hours, items, passenger SENTRI lanes)."""

from __future__ import annotations

import html
import os
import re
from dataclasses import dataclass, field
from datetime import datetime, timezone
from email.utils import parsedate_to_datetime
from zoneinfo import ZoneInfo

CHICAGO = ZoneInfo("America/Chicago")
DAY_MINUTES = 24 * 60

BRIDGES = (
    {
        "id": "bm",
        "short": "B&M",
        "match": re.compile(r"b\s*&\s*m", re.I),
        "default_hours": "24 hrs/day",
    },
    {
        "id": "gateway",
        "short": "Gateway",
        "match": re.compile(r"gateway", re.I),
        "default_hours": "24 hrs/day",
    },
    {
        "id": "veterans",
        "short": "Veterans",
        "match": re.compile(r"veterans", re.I),
        "default_hours": "6 am-Midnight",
    },
    {
        "id": "los_indios",
        "short": "Los Indios",
        "match": re.compile(r"los\s*indios", re.I),
        "default_hours": "6 am-10 pm",
    },
)

CLOCK_TOKEN = r"(?:noon|midnight|\d{1,2}(?::\d{2})?\s*(?:a\.?m\.?|p\.?m\.?))"
HOURS_24_RE = re.compile(
    r"24\s*(?:hrs?|hours)\s*/?\s*day|24\s*/\s*7|open\s*24|24\s*hours",
    re.I,
)
HOURS_RANGE_RE = re.compile(
    rf"({CLOCK_TOKEN})\s*(?:[-–—]|to)\s*({CLOCK_TOKEN})",
    re.I,
)
HOURS_LINE_RE = re.compile(r"Hours:\s*(.+?)(?=\s+Date:|$)", re.I)
DATE_RE = re.compile(r"Date:\s*(\d{1,2})/(\d{1,2})/(\d{4})")
DELAY_RE = re.compile(r"(\d+)\s*min(?:ute)?s?\s*delay", re.I)
PENDING_RE = re.compile(r"Update\s*Pending", re.I)
LANES_OPEN_RE = re.compile(r"(\d+)\s*lane(?:s|\(s\))?\s*open", re.I)
LANES_CLOSED_RE = re.compile(r"lanes?\s*closed", re.I)
NA_RE = re.compile(r"\bN\s*/\s*A\b", re.I)
STAMP_RE = re.compile(
    r"At\s+(?:(noon|midnight)|(\d{1,2})(?::(\d{2}))?\s*(am|pm))\s*C[DS]T",
    re.I,
)
SECTION_SPLIT_RE = re.compile(r"<h4(?:\s[^>]*)?><b>\s*", re.I)
SECTION_TITLE_END_RE = re.compile(r"</b>\s*</h4>", re.I)
SECTION_PLAIN_RE = re.compile(
    r"(Passenger Vehicles|Pedestrian|Commercial Vehicles)\s*(.*?)(?=(?:Passenger Vehicles|Pedestrian|Commercial Vehicles|Border Notice:)|$)",
    re.I | re.S,
)
LANE_RE = re.compile(
    r"(General Lanes|Sentri Lanes|Ready Lanes|Fast Lanes)\s*:\s*(.*?)(?=(?:General|Sentri|Ready|Fast) Lanes\s*:|Maximum Lanes|Passenger Vehicles|Pedestrian|Commercial Vehicles|Border Notice|$)",
    re.I | re.S,
)


@dataclass
class HoursWindow:
    """Operating window in minutes since midnight (America/Chicago)."""

    always: bool = False
    force_closed: bool = False
    open_min: int = 0
    close_min: int = 0

    def label(self) -> str:
        if self.force_closed:
            return "closed"
        if self.always:
            return "24 hrs"
        return f"{_minutes_to_clock(self.open_min)}–{_minutes_to_clock(self.close_min, close=True)}"


@dataclass
class BridgeItem:
    bridge_id: str
    title: str
    hours_text: str
    date: tuple[int, int, int] | None
    stamps: list[datetime] = field(default_factory=list)
    pending_only: bool = False
    present: bool = False
    description: str = ""
    plain: str = ""

    @property
    def newest(self) -> datetime | None:
        return max(self.stamps) if self.stamps else None


@dataclass
class LaneReading:
    name: str
    raw: str
    delay_minutes: int | None = None
    lanes_open: int | None = None
    pending: bool = False
    closed: bool = False
    na: bool = False


def read(path: str) -> str:
    try:
        with open(path, "r", encoding="utf-8", errors="replace") as f:
            return f.read()
    except FileNotFoundError:
        return ""


def write_out(**kwargs) -> None:
    out_path = os.environ.get("GITHUB_OUTPUT")
    if not out_path:
        return
    with open(out_path, "a") as out:
        for k, v in kwargs.items():
            text = "" if v is None else str(v)
            if "\n" in text or "\r" in text:
                out.write(f"{k}<<BWTALERT\n{text}\nBWTALERT\n")
            else:
                out.write(f"{k}={text}\n")


def plain_text(text: str) -> str:
    text = html.unescape(text or "")
    text = re.sub(r"<[^>]+>", " ", text)
    return re.sub(r"\s+", " ", text).strip()


def _minutes_to_clock(minutes: int, close: bool = False) -> str:
    minutes = minutes % DAY_MINUTES
    if close and minutes == 0:
        return "midnight"
    hour24, minute = divmod(minutes, 60)
    if hour24 == 0:
        return f"12:{minute:02d} am" if minute else "midnight"
    if hour24 == 12:
        return f"12:{minute:02d} pm" if minute else "noon"
    ampm = "am" if hour24 < 12 else "pm"
    hour12 = hour24 if hour24 <= 12 else hour24 - 12
    if hour12 > 12:
        hour12 -= 12
    return f"{hour12}:{minute:02d} {ampm}"


def parse_clock_to_minutes(text: str) -> int | None:
    t = html.unescape(text or "").strip().lower().replace(".", "")
    t = re.sub(r"\s+", " ", t)
    if t == "noon":
        return 12 * 60
    if t == "midnight":
        return 0
    m = re.match(r"(\d{1,2})(?::(\d{2}))?\s*(am|pm)$", t)
    if not m:
        return None
    hour = int(m.group(1)) % 12
    minute = int(m.group(2) or 0)
    if m.group(3) == "pm":
        hour += 12
    return hour * 60 + minute


def parse_hours(text: str) -> HoursWindow | None:
    raw = plain_text(text or "")
    if not raw:
        return None
    if re.search(r"\bclosed\b", raw, re.I) and not HOURS_RANGE_RE.search(raw):
        return HoursWindow(force_closed=True)
    if HOURS_24_RE.search(raw):
        return HoursWindow(always=True)
    m = HOURS_RANGE_RE.search(raw)
    if not m:
        return None
    open_min = parse_clock_to_minutes(m.group(1))
    close_min = parse_clock_to_minutes(m.group(2))
    if open_min is None or close_min is None:
        return None
    if open_min == close_min:
        return HoursWindow(always=True)
    return HoursWindow(always=False, open_min=open_min, close_min=close_min)


def _in_span(start: int, end: int, t: int) -> bool:
    if start == end:
        return True
    if start < end:
        return start <= t < end
    return t >= start or t < end


def minutes_since_midnight(dt: datetime) -> int:
    local = dt.astimezone(CHICAGO)
    return local.hour * 60 + local.minute


def minutes_after(start: int, t: int) -> int:
    if t >= start:
        return t - start
    return t + DAY_MINUTES - start


def hours_status(window: HoursWindow, now: datetime, grace_min: int = 0) -> str:
    """Return open, grace (post-close), or closed."""
    if window.force_closed:
        return "closed"
    if window.always:
        return "open"
    now_m = minutes_since_midnight(now)
    if _in_span(window.open_min, window.close_min, now_m):
        return "open"
    if grace_min > 0 and minutes_after(window.close_min, now_m) < grace_min:
        return "grace"
    return "closed"


def minutes_open_so_far(window: HoursWindow, now: datetime) -> int | None:
    if window.always or window.force_closed:
        return None
    now_m = minutes_since_midnight(now)
    if not _in_span(window.open_min, window.close_min, now_m):
        return 0
    return minutes_after(window.open_min, now_m)


def channel_pubdate(xml: str):
    m = re.search(r"<pubDate>\s*([^<]+?)\s*</pubDate>", xml, re.I)
    if not m:
        return None
    try:
        dt = parsedate_to_datetime(m.group(1).strip())
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt.astimezone(timezone.utc)
    except Exception:
        return None


def parse_stamps(plain: str, day: tuple[int, int, int] | None, now: datetime) -> list[datetime]:
    stamps: list[datetime] = []
    for m in STAMP_RE.finditer(plain):
        if m.group(1):
            token = m.group(1).lower()
            hour, minute = (12, 0) if token == "noon" else (0, 0)
        else:
            hour = int(m.group(2)) % 12
            minute = int(m.group(3) or 0)
            if m.group(4).lower() == "pm":
                hour += 12
        if day:
            year, month, day_n = day
            local = datetime(year, month, day_n, hour, minute, tzinfo=CHICAGO)
        else:
            now_local = now.astimezone(CHICAGO)
            local = now_local.replace(hour=hour, minute=minute, second=0, microsecond=0)
        stamps.append(local.astimezone(timezone.utc))
    return stamps


def match_bridge(title: str) -> dict | None:
    title = html.unescape(title or "")
    title = re.sub(r"\s+", " ", title).strip()
    if not re.search(r"Brownsville", title, re.I):
        return None
    for spec in BRIDGES:
        if spec["match"].search(title):
            return spec
    return None


def pending_only(plain: str) -> bool:
    return bool(PENDING_RE.search(plain)) and not bool(DELAY_RE.search(plain))


def parse_bridge_items(xml: str, now: datetime) -> dict[str, BridgeItem]:
    items: dict[str, BridgeItem] = {}
    for m in re.finditer(r"<item>(.*?)</item>", xml or "", flags=re.I | re.S):
        block = m.group(1)
        title_m = re.search(r"<title>\s*([^<]+)", block, flags=re.I)
        if not title_m:
            continue
        title = html.unescape(title_m.group(1))
        title = re.sub(r"\s+", " ", title).strip()
        spec = match_bridge(title)
        if not spec:
            continue
        desc_m = re.search(r"<description>(.*?)</description>", block, flags=re.I | re.S)
        description = desc_m.group(1) if desc_m else block
        plain = plain_text(description)
        hours_m = HOURS_LINE_RE.search(plain)
        hours_text = hours_m.group(1).strip() if hours_m else ""
        dm = DATE_RE.search(plain)
        day = None
        if dm:
            month, day_n, year = int(dm.group(1)), int(dm.group(2)), int(dm.group(3))
            day = (year, month, day_n)
        items[spec["id"]] = BridgeItem(
            bridge_id=spec["id"],
            title=title,
            hours_text=hours_text,
            date=day,
            stamps=parse_stamps(plain, day, now),
            pending_only=pending_only(plain),
            present=True,
            description=description,
            plain=plain,
        )
    return items


def empty_item(spec: dict) -> BridgeItem:
    return BridgeItem(
        bridge_id=spec["id"],
        title=f"Brownsville - {spec['short']}",
        hours_text="",
        date=None,
        present=False,
    )


def section_body(description: str, section_name: str) -> str:
    """Passenger Vehicles / Commercial / Pedestrian body, HTML sections first."""
    markup = html.unescape(description or "")
    parts = SECTION_SPLIT_RE.split(markup)
    if len(parts) > 1:
        for part in parts[1:]:
            title_end = SECTION_TITLE_END_RE.search(part)
            if not title_end:
                continue
            title = plain_text(part[: title_end.start()])
            if re.search(section_name, title, re.I):
                body = part[title_end.end() :]
                body = re.split(r"Border Notice:", body, flags=re.I)[0]
                return plain_text(body)
    plain = plain_text(markup)
    for m in SECTION_PLAIN_RE.finditer(plain):
        if re.search(section_name, m.group(1), re.I):
            return re.sub(r"\s+", " ", m.group(2)).strip()
    return ""


def parse_lane_body(name: str, raw: str) -> LaneReading:
    raw = re.sub(r"\s+", " ", raw or "").strip()
    delay_m = DELAY_RE.search(raw)
    lanes_m = LANES_OPEN_RE.search(raw)
    return LaneReading(
        name=name,
        raw=raw,
        delay_minutes=int(delay_m.group(1)) if delay_m else None,
        lanes_open=int(lanes_m.group(1)) if lanes_m else None,
        pending=bool(PENDING_RE.search(raw)),
        closed=bool(LANES_CLOSED_RE.search(raw)),
        na=bool(NA_RE.search(raw)),
    )


def lanes_in_section(section_plain: str) -> list[LaneReading]:
    seen = set()
    out: list[LaneReading] = []
    for m in LANE_RE.finditer(section_plain or ""):
        name = re.sub(r"\s+", " ", m.group(1)).strip()
        key = name.lower()
        if key in seen:
            continue
        seen.add(key)
        out.append(parse_lane_body(name, m.group(2)))
    return out


def passenger_sentri(description: str) -> LaneReading | None:
    """SENTRI under Passenger Vehicles only — never commercial Fast Lanes."""
    body = section_body(description, r"Passenger\s+Vehicles")
    if not body:
        return None
    for lane in lanes_in_section(body):
        if re.search(r"sentri", lane.name, re.I):
            return lane
    return None
