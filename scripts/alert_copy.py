#!/usr/bin/env python3
"""Employee-facing alert copy. Bottom line first. Plain language."""

from __future__ import annotations


def _names(items: list[str]) -> str:
    return ", ".join(items)


def template_wait_pending(bridges: list[str]) -> tuple[str, str]:
    who = _names(bridges)
    subject = f"{who}: please update wait times"
    body = (
        "Please update wait times.\n"
        "\n"
        f"Bridges: {who}\n"
        "Problem: Times for this hour are not posted yet (the system shows Update Pending).\n"
        "\n"
        "What you need to do:\n"
        "Update the wait times for these bridges.\n"
        "\n"
        "If the times are already updated, disregard this message."
    )
    return subject, body


def template_wait_stale(bridges: list[str]) -> tuple[str, str]:
    who = _names(bridges)
    subject = f"{who}: please update wait times"
    body = (
        "Please update wait times.\n"
        "\n"
        f"Bridges: {who}\n"
        "Problem: The posted wait times are old or missing and have not been updated.\n"
        "\n"
        "What you need to do:\n"
        "Update the wait times for these bridges.\n"
        "\n"
        "If the times are already updated, disregard this message."
    )
    return subject, body


def template_sentri(
    delay_minutes: int | None,
    lanes_open: int | None,
    delay_min: int = 30,
    min_open_lanes: int = 4,
) -> tuple[str, str]:
    d = "unknown" if delay_minutes is None else f"{delay_minutes} minutes"
    if lanes_open is None:
        lanes = "unknown"
    elif lanes_open == 1:
        lanes = "1 lane"
    else:
        lanes = f"{lanes_open} lanes"
    subject = f"Veterans SENTRI: contact duty supervisor ({d}, {lanes} open)"
    body = (
        "Please contact the duty supervisor.\n"
        "\n"
        "Bridge: Veterans International\n"
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


def format_lag_alert(results) -> tuple[str, str]:
    """Subject + body for wait-times alerts. Empty if nothing is failing."""
    bad = [r for r in results if getattr(r, "problems", None)]
    if not bad:
        return "", ""
    pending: list[str] = []
    stale: list[str] = []
    for r in bad:
        (pending if _is_pending(r) else stale).append(r.name)

    if pending and not stale:
        return template_wait_pending(pending)
    if stale and not pending:
        return template_wait_stale(stale)

    who = _names([r.name for r in bad])
    subject = f"{who}: please update wait times"
    parts = ["Please update wait times.", ""]
    if pending:
        parts.append(f"Bridges: {_names(pending)}")
        parts.append(
            "Problem: Times for this hour are not posted yet (the system shows Update Pending)."
        )
        parts.append("")
    if stale:
        parts.append(f"Bridges: {_names(stale)}")
        parts.append(
            "Problem: The posted wait times are old or missing and have not been updated."
        )
        parts.append("")
    parts.extend(
        [
            "What you need to do:",
            "Update the wait times for these bridges.",
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
) -> tuple[str, str]:
    return template_sentri(delay_minutes, lanes_open, delay_min, min_open_lanes)
