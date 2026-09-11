#!/usr/bin/env python3
"""Employee-facing alert copy. Bottom line first. Plain language."""

from __future__ import annotations

import re
from datetime import datetime
from zoneinfo import ZoneInfo

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


def template_wait_pending(bridges: list[str], when: str) -> tuple[str, str]:
    who = _names(bridges)
    subject = f"{when} — update wait times ({who})"
    body = (
        f"{when} — {who} wait times not posted (Update Pending).\n"
        "\n"
        "Update them now.\n"
        "If already updated, disregard."
    )
    return subject, body


def template_wait_stale(
    bridges: list[str],
    when: str,
    last_posted: str = "",
) -> tuple[str, str]:
    who = _names(bridges)
    subject = f"{when} — update wait times ({who})"
    last = f" (last posted {last_posted})" if last_posted else ""
    body = (
        f"{when} — {who} wait times are old or missing{last}.\n"
        "\n"
        "Update them now.\n"
        "If already updated, disregard."
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


def format_lag_alert(results, now: datetime | None = None) -> tuple[str, str]:
    """Subject + body for wait-times alerts. Empty if nothing is failing."""
    bad = [r for r in results if getattr(r, "problems", None)]
    if not bad:
        return "", ""
    when = hour_label(now)
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
        return template_wait_pending(pending, when)
    if stale and not pending:
        return template_wait_stale(stale, when, last_posted=last_posted)

    who = _names([r.name for r in bad])
    subject = f"{when} — update wait times ({who})"
    bits = []
    if pending:
        bits.append(f"{_names(pending)} wait times not posted (Update Pending)")
    if stale:
        last = f", last posted {last_posted}" if last_posted else ""
        bits.append(f"{_names(stale)} wait times are old or missing{last}")
    body = (
        f"{when} — " + "; ".join(bits) + ".\n"
        "\n"
        "Update them now.\n"
        "If already updated, disregard."
    )
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
