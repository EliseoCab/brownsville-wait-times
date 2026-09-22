#!/usr/bin/env python3
"""Professional alert copy for Brownsville Wait Times monitoring.

Messages are designed to be clear, actionable, and clearly marked as automated."""

from __future__ import annotations

import html
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


def _extract_lagging_rss(raw_feed: str, bad: list) -> str:
    """Return only the <item>...</item> blocks for the lagging bridges.
    This trims the RSS to just the bridge(s) that are lagging so the email
    log is short and easy to read. Preserves the original raw XML structure
    for those items only.
    """
    if not raw_feed or not bad:
        return (raw_feed or "").strip()
    bad_names = [getattr(r, "name", "") for r in bad if getattr(r, "name", "")]
    if not bad_names:
        raw = raw_feed.strip()
        if len(raw) > 8000:
            raw = raw[:4000] + "\n... [trimmed] ...\n" + raw[-2000:]
        return raw

    items: list[str] = []
    for m in re.finditer(r"<item>(.*?)</item>", raw_feed, flags=re.I | re.S):
        block = "<item>" + m.group(1) + "</item>"
        title_m = re.search(r"<title>\s*([^<]+)", block, flags=re.I)
        if not title_m:
            continue
        title = html.unescape(title_m.group(1)).lower()
        for name in bad_names:
            n = name.lower()
            # tolerant match for "B&M", "Gateway", "Veterans", "Los Indios"
            if (
                n in title
                or n.replace("&", "and") in title
                or n.replace(" ", "") in title.replace(" ", "").replace("-", "")
            ):
                items.append(block)
                break
    if items:
        return "\n".join(items)
    # fallback to trimmed full
    raw = raw_feed.strip()
    if len(raw) > 8000:
        raw = raw[:4000] + "\n... [trimmed] ...\n" + raw[-2000:]
    return raw


def format_lag_alert(results, now: datetime | None = None, cbp_http: str = "", site_http: str = "", cbp_pubdate: str = "", raw_feed: str = "", lag_minutes: str = "") -> tuple[str, str]:
    """Subject + body for wait-times alerts. Empty if nothing is failing."""
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

    # Append diagnostic log (no source URLs in mail)
    # RSS is now trimmed to *only* the lagging bridge(s) for easy reading.
    ts = checked_at_label(now)
    lag = lag_minutes or "?"
    http = f"CBP={cbp_http or '—'} Site={site_http or '—'}"
    pub = cbp_pubdate or "—"
    raw = _extract_lagging_rss(raw_feed, bad)
    log = (
        "\n\n---\n"
        f"Timestamp: {ts}\n"
        f"Lag: {lag} min\n"
        f"HTTP: {http}\n"
        f"CBP pubDate: {pub}\n"
        "Raw RSS (lagging bridge only):\n"
        f"{raw}\n"
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
