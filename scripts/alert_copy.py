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


def hour_label(now: datetime | None) -> str:
    """Floor to the current Chicago hour, CBP style: '2:00 pm CDT'."""
    if now is None:
        now = datetime.now(CHICAGO)
    elif now.tzinfo is None:
        now = now.replace(tzinfo=CHICAGO)
    else:
        now = now.astimezone(CHICAGO)
    hour12 = now.hour % 12 or 12
    ampm = "am" if now.hour < 12 else "pm"
    tz = now.tzname() or "CT"
    return f"{hour12}:00 {ampm} {tz}"


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
    subject = f"{who}: please update {when} wait times"
    body = (
        f"Please update wait times for {when}.\n"
        "\n"
        f"Bridges: {who}\n"
        f"Time flagged: {when}\n"
        f"Problem: Times for {when} are not posted yet (the system shows Update Pending).\n"
        "\n"
        "What you need to do:\n"
        f"Update the wait times for these bridges for {when}.\n"
        "\n"
        "If the times are already updated, disregard this message."
    )
    return subject, body


def template_wait_stale(
    bridges: list[str],
    when: str,
    last_posted: str = "",
) -> tuple[str, str]:
    who = _names(bridges)
    subject = f"{who}: please update {when} wait times"
    last_line = f"Last posted: {last_posted}\n" if last_posted else ""
    body = (
        f"Please update wait times for {when}.\n"
        "\n"
        f"Bridges: {who}\n"
        f"Time flagged: {when}\n"
        f"{last_line}"
        f"Problem: Wait times for {when} are old or missing and have not been updated.\n"
        "\n"
        "What you need to do:\n"
        f"Update the wait times for these bridges for {when}.\n"
        "\n"
        "If the times are already updated, disregard this message."
    )
    return subject, body


def template_sentri(
    delay_minutes: int | None,
    lanes_open: int | None,
    delay_min: int = 30,
    min_open_lanes: int = 4,
    when: str = "",
) -> tuple[str, str]:
    d = "unknown" if delay_minutes is None else f"{delay_minutes} minutes"
    if lanes_open is None:
        lanes = "unknown"
    elif lanes_open == 1:
        lanes = "1 lane"
    else:
        lanes = f"{lanes_open} lanes"
    when = when or "this hour"
    subject = f"Veterans SENTRI {when}: contact duty supervisor ({d}, {lanes} open)"
    body = (
        f"Please contact the duty supervisor ({when}).\n"
        "\n"
        "Bridge: Veterans International\n"
        f"Time flagged: {when}\n"
        f"SENTRI wait: {d}\n"
        f"SENTRI lanes open: {lanes}\n"
        f"Rule: When SENTRI wait is {delay_min} minutes or more, at least "
        f"{min_open_lanes} SENTRI lanes should be open.\n"
        "\n"
        "What you need to do:\n"
        f"Contact the duty supervisor and ask why {min_open_lanes} SENTRI lanes are not open.\n"
        "\n"
        "If the reason is already known, disregard this message."
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
    subject = f"{who}: please update {when} wait times"
    parts = [f"Please update wait times for {when}.", ""]
    if pending:
        parts.append(f"Bridges: {_names(pending)}")
        parts.append(f"Time flagged: {when}")
        parts.append(
            f"Problem: Times for {when} are not posted yet (the system shows Update Pending)."
        )
        parts.append("")
    if stale:
        parts.append(f"Bridges: {_names(stale)}")
        parts.append(f"Time flagged: {when}")
        if last_posted:
            parts.append(f"Last posted: {last_posted}")
        parts.append(
            f"Problem: Wait times for {when} are old or missing and have not been updated."
        )
        parts.append("")
    parts.extend(
        [
            "What you need to do:",
            f"Update the wait times for these bridges for {when}.",
            "",
            "If the times are already updated, disregard this message.",
        ]
    )
    return subject, "\n".join(parts)


def format_sentri_alert(
    delay_minutes: int | None,
    lanes_open: int | None,
    delay_min: int = 30,
    min_open_lanes: int = 4,
    now: datetime | None = None,
    raw: str = "",
) -> tuple[str, str]:
    when = time_from_raw(raw, now)
    return template_sentri(
        delay_minutes,
        lanes_open,
        delay_min,
        min_open_lanes,
        when=when,
    )
