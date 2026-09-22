#!/usr/bin/env python3
"""Professional alert copy for Brownsville Wait Times monitoring.

Messages are designed to be clear, actionable, and clearly marked as automated."""

from __future__ import annotations

import re
from datetime import datetime
from zoneinfo import ZoneInfo

from bwt_rss import lanes_in_section, parse_bridge_items, section_body

CHICAGO = ZoneInfo("America/Chicago")
AT_CLOCK_RE = re.compile(
    r"At\s+(\d{1,2}:\d{2}\s*[ap]\.?m\.?\s*C[DS]T)",
    re.I,
)


def _names(items: list[str]) -> str:
    return ", ".join(items)


def _chicago(now: datetime | None) -> datetime:
    if now is None:
        now = datetime.now(CHICAGO)
    elif now.tzinfo is None:
        now = now.replace(tzinfo=CHICAGO)
    else:
        now = now.astimezone(CHICAGO)
    return now


def _clock(hour: int, minute: int, tz: str) -> str:
    hour12 = hour % 12 or 12
    ampm = "am" if hour < 12 else "pm"
    return f"{hour12}:{minute:02d} {ampm} {tz}"


def hour_label(now: datetime | None) -> str:
    """Floor to the current Chicago hour, CBP style: '2:00 pm CDT'."""
    now = _chicago(now)
    return _clock(now.hour, 0, now.tzname() or "CT")


def checked_at_label(now: datetime | None) -> str:
    """More precise time for alerts: '1:13 pm CDT'."""
    now = _chicago(now)
    hour12 = now.hour % 12 or 12
    ampm = "am" if now.hour < 12 else "pm"
    tz = now.tzname() or "CT"
    return f"{hour12}:{now.minute:02d} {ampm} {tz}"


def slot_label(now: datetime | None) -> str:
    """Hour or half-hour slot: '2:00 pm CDT' or '2:30 pm CDT'."""
    now = _chicago(now)
    minute = 0 if now.minute < 30 else 30
    return _clock(now.hour, minute, now.tzname() or "CT")


def stamp_label(dt: datetime | None) -> str:
    if dt is None:
        return ""
    local = dt.replace(tzinfo=CHICAGO) if dt.tzinfo is None else dt.astimezone(CHICAGO)
    hour12 = local.hour % 12 or 12
    ampm = "am" if local.hour < 12 else "pm"
    tz = local.tzname() or "CT"
    return f"{hour12}:{local.minute:02d} {ampm} {tz}"


def time_from_raw(raw: str, now: datetime | None = None) -> str:
    m = AT_CLOCK_RE.search(raw or "")
    if not m:
        return hour_label(now)
    s = re.sub(r"\s+", " ", m.group(1)).strip().replace(".", "")
    s = re.sub(r"\bAM\b", "am", s, flags=re.I)
    s = re.sub(r"\bPM\b", "pm", s, flags=re.I)
    s = re.sub(r"\bCDT\b", "CDT", s, flags=re.I)
    s = re.sub(r"\bCST\b", "CST", s, flags=re.I)
    return s


def template_wait_pending(bridges: list[str], when: str, checked_at: str = "") -> tuple[str, str]:
    who = _names(bridges)
    as_of = checked_at or when
    subject = f"Brownsville Wait Times Alert — Update Pending ({who}) as of {when}"
    body = (
        "Automated Alert: Brownsville Border Wait Times\n\n"
        f"As of {as_of}, CBP is still showing 'Update Pending' for the current hour. "
        f"The following bridge(s) have not yet posted updated wait times:\n\n"
        f"{who}\n\n"
        "Please update the wait times at the earliest opportunity.\n\n"
        "This is an automated message from the Brownsville Wait Times monitoring system. "
        "If the data has already been updated, you may disregard this notification.\n\n"
        "This report is based on public information from the Border Wait Times official CBP website."
    )
    return subject, body


def template_wait_stale(
    bridges: list[str],
    when: str,
    last_posted: str = "",
    checked_at: str = "",
) -> tuple[str, str]:
    who = _names(bridges)
    as_of = checked_at or when
    subject = f"Brownsville Wait Times Alert — No New Data Since {last_posted} ({who})" if last_posted else f"Brownsville Wait Times Alert — Data Out of Date ({who}) as of {when}"
    last_clause = f", the latest published data is still from {last_posted}." if last_posted else ""
    body = (
        "Automated Alert: Brownsville Border Wait Times\n\n"
        f"As of {as_of}{last_clause} No newer hourly update has appeared yet for the following bridge(s):\n\n"
        f"{who}\n\n"
        "Please publish the next update at the earliest opportunity.\n\n"
        "This is an automated message from the Brownsville Wait Times monitoring system. "
        "If the data has already been updated, you may disregard this notification.\n\n"
        "This report is based on public information from the Border Wait Times official CBP website."
    )
    return subject, body


def template_sentri(
    delay_minutes: int | None,
    lanes_open: int | None,
    delay_min: int = 30,
    min_open_lanes: int = 4,
    when: str = "",
) -> tuple[str, str]:
    d = "unknown" if delay_minutes is None else f"{delay_minutes} min"
    if lanes_open is None:
        lanes = "unknown"
        lanes_short = "unknown"
    elif lanes_open == 1:
        lanes = "1"
        lanes_short = "1 lane"
    else:
        lanes = str(lanes_open)
        lanes_short = f"{lanes_open} lanes"
    when = when or "this hour"
    subject = f"SENTRI {when} — Veterans, {d}, {lanes_short}"
    body = (
        "Action: Contact duty supervisor\n"
        f"Time: {when}\n"
        "Bridge: Veterans International\n"
        f"SENTRI wait: {d if delay_minutes is None else str(delay_minutes) + ' minutes'}\n"
        f"Lanes open: {lanes}\n"
        f"Required: {min_open_lanes} lanes if wait is {delay_min} minutes or more\n"
        "\n"
        f"Ask why {min_open_lanes} SENTRI lanes are not open.\n"
        "If reason is already known: disregard"
    )
    return subject, body


def _is_pending(check) -> bool:
    return "cbp_pending" in (getattr(check, "problems", None) or [])


_LANE_ORDER = (
    ("general lanes", "Gen"),
    ("sentri lanes", "SENTRI"),
    ("ready lanes", "Ready"),
)
_VERIFY_SECTIONS = (
    ("Passenger", r"Passenger\s+Vehicles"),
    ("Pedestrian", r"Pedestrian"),
)


def lagging_text_source(check) -> str:
    """Which feed's text matches the stamp the verify log calls last posted.

    Site text when the mirror is behind CBP (that stamp is last posted).
    Otherwise the CBP item, including Update Pending with no stamp.
    """
    ps = set(getattr(check, "problems", None) or [])
    if "site_behind" in ps and getattr(check, "site_stamp", None):
        return "site"
    if getattr(check, "cbp_stamp", None) or any(p.startswith("cbp_") for p in ps):
        return "cbp"
    if any(p.startswith("site_") for p in ps):
        return "site"
    return "cbp"


def _lagging_stamp(check) -> datetime | None:
    ps = set(getattr(check, "problems", None) or [])
    if "site_behind" in ps and getattr(check, "site_stamp", None):
        return check.site_stamp
    if getattr(check, "cbp_stamp", None):
        return check.cbp_stamp
    if getattr(check, "site_stamp", None):
        return check.site_stamp
    return None


def _minutes_behind(stamp: datetime | None, now: datetime | None) -> int | None:
    if stamp is None:
        return None
    now_c = _chicago(now).replace(second=0, microsecond=0)
    local = stamp.replace(tzinfo=CHICAGO) if stamp.tzinfo is None else stamp.astimezone(CHICAGO)
    local = local.replace(second=0, microsecond=0)
    return int((now_c - local).total_seconds() // 60)


def _lane_bit(lane) -> str | None:
    label = dict(_LANE_ORDER).get((lane.name or "").lower())
    if not label or lane.na:
        return None
    if lane.delay_minutes is None:
        if lane.pending and not lane.closed:
            return f"{label} Update Pending"
        return None
    if lane.lanes_open is None:
        return f"{label} {lane.delay_minutes} min"
    word = "lane" if lane.lanes_open == 1 else "lanes"
    return f"{label} {lane.delay_minutes} min / {lane.lanes_open} {word}"


def _section_excerpt(description: str, title: str, pattern: str) -> str | None:
    body = section_body(description, pattern)
    if not body:
        return None
    by_name: dict[str, object] = {}
    for lane in lanes_in_section(body):
        by_name.setdefault(lane.name.lower(), lane)
    bits = []
    for key, _short in _LANE_ORDER:
        lane = by_name.get(key)
        if lane is None:
            continue
        bit = _lane_bit(lane)
        if bit:
            bits.append(bit)
    if not bits:
        return None
    return f"  {title}: " + " · ".join(bits)


def _description_for(check, raw_feed: str, now: datetime | None) -> str:
    stored = getattr(check, "lane_description", "") or ""
    if stored:
        return stored
    # Raw CBP XML is only a fallback for the CBP stamp. Never pair a site
    # stamp with the CBP item, and never paste the XML itself.
    if lagging_text_source(check) != "cbp" or not raw_feed:
        return ""
    items = parse_bridge_items(raw_feed, _chicago(now))
    item = items.get(getattr(check, "bridge_id", ""))
    if item is None:
        return ""
    return item.description or ""


def _bridge_verify_block(check, description: str, now: datetime | None) -> tuple[str, int | None]:
    name = getattr(check, "name", "") or "Bridge"
    stamp = _lagging_stamp(check)
    behind = _minutes_behind(stamp, now)
    ps = set(getattr(check, "problems", None) or [])
    if stamp is None and ({"cbp_pending", "site_pending"} & ps):
        lines = [f"{name} — Update Pending"]
    elif stamp is None:
        lines = [f"{name} — last posted unavailable"]
    elif behind is None:
        lines = [f"{name} — last posted {stamp_label(stamp)}"]
    else:
        lines = [f"{name} — last posted {stamp_label(stamp)} ({behind} min behind)"]
    if description:
        for title, pattern in _VERIFY_SECTIONS:
            excerpt = _section_excerpt(description, title, pattern)
            if excerpt:
                lines.append(excerpt)
    return "\n".join(lines), behind


def format_lag_alert(results, now: datetime | None = None, cbp_http: str = "", site_http: str = "", cbp_pubdate: str = "", raw_feed: str = "", lag_minutes: str = "") -> tuple[str, str]:
    """Subject + body for wait-times alerts. Empty if nothing is failing.

    cbp_http and site_http stay in the signature for callers. They are not
    written into the mail; the verify log has no HTTP lines and no links.
    """
    del cbp_http, site_http
    bad = [r for r in results if getattr(r, "problems", None)]
    if not bad:
        return "", ""
    when = hour_label(now)
    checked_at = checked_at_label(now)
    pending: list[str] = []
    stale: list[str] = []
    stale_checks = []
    for r in bad:
        if _is_pending(r):
            pending.append(r.name)
        else:
            stale.append(r.name)
            stale_checks.append(r)

    last_posted = ""
    stamps = []
    for c in stale_checks:
        ps = getattr(c, "problems", None) or []
        if "site_behind" in ps and getattr(c, "site_stamp", None):
            stamps.append(c.site_stamp)
        elif getattr(c, "cbp_stamp", None):
            stamps.append(c.cbp_stamp)
    if stamps:
        last_posted = stamp_label(min(stamps))
        if last_posted == when:
            last_posted = ""

    if pending and not stale:
        subject, body = template_wait_pending(pending, when, checked_at=checked_at)
    elif stale and not pending:
        subject, body = template_wait_stale(stale, when, last_posted=last_posted, checked_at=checked_at)
    else:
        who = _names([r.name for r in bad])
        subject = f"Brownsville Wait Times Alert — Action Required ({who}) as of {when}"
        bits = []
        if pending:
            bits.append(f"{_names(pending)} show 'Update Pending'")
        if stale:
            last = f" (latest published still {last_posted})" if last_posted else ""
            bits.append(f"{_names(stale)} have no newer data{last}")
        body = (
            "Automated Alert: Brownsville Border Wait Times\n\n"
            f"As of {checked_at}: " + "; ".join(bits) + ".\n\n"
            "Please update the wait times at the earliest opportunity.\n\n"
            "This is an automated message from the Brownsville Wait Times monitoring system. "
            "If the data has already been updated, you may disregard this notification.\n\n"
            "This report is based on public information from the Border Wait Times official CBP website."
        )

    # Verify log under --- only. No raw RSS, no <link>, no HTTP status.
    pub = (cbp_pubdate or "").strip() or "—"
    blocks: list[str] = []
    behinds: list[int] = []
    for r in bad:
        block, behind = _bridge_verify_block(r, _description_for(r, raw_feed, now), now)
        blocks.append(block)
        if behind is not None:
            behinds.append(behind)
    lag = (lag_minutes or "").strip() or (str(max(behinds)) if behinds else "?")
    log = (
        "\n\n---\n"
        f"Checked: {checked_at}\n"
        f"Overall lag: {lag} min\n"
        f"CBP pubDate: {pub}\n"
        "\n"
        + "\n\n".join(blocks)
        + "\n"
    )
    body = body + log
    return subject, body


def format_sentri_alert(
    delay_minutes: int | None,
    lanes_open: int | None,
    delay_min: int = 30,
    min_open_lanes: int = 4,
    now: datetime | None = None,
    raw: str = "",
) -> tuple[str, str]:
    when = slot_label(now)
    return template_sentri(
        delay_minutes,
        lanes_open,
        delay_min,
        min_open_lanes,
        when=when,
    )
