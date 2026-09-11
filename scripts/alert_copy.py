#!/usr/bin/env python3
"""One-line alert copy: bottom line first, no fluff."""

from __future__ import annotations

from collections import OrderedDict


def lag_headline(check) -> str:
    ps = getattr(check, "problems", None) or []
    if "cbp_pending" in ps:
        return "Update Pending"
    if "cbp_stuck" in ps:
        return "CBP times not updated"
    if "cbp_missing" in ps or "cbp_missing_stamp" in ps:
        return "CBP has no wait times"
    if "site_behind" in ps:
        lag = getattr(check, "lag_minutes", None)
        if lag is not None and lag > 0:
            return f"site {int(lag)} min behind CBP"
        return "site behind CBP"
    if "site_pending" in ps:
        return "site Update Pending"
    if ps:
        return str(ps[0]).replace("_", " ")
    return "wait times not updated"


def format_lag_alert(results) -> tuple[str, str]:
    """Subject + body for wait-times lag. Empty if nothing is failing."""
    bad = [r for r in results if getattr(r, "problems", None)]
    if not bad:
        return "", ""
    groups: OrderedDict[str, list[str]] = OrderedDict()
    for r in bad:
        groups.setdefault(lag_headline(r), []).append(r.name)
    clauses = [f"{', '.join(names)}: {phrase}" for phrase, names in groups.items()]
    body = ". ".join(clauses) + "."
    subject = body[:-1]
    if len(subject) > 90:
        subject = ", ".join(r.name for r in bad) + ": wait times not updated"
    return subject, body


def format_sentri_alert(
    delay_minutes: int | None,
    lanes_open: int | None,
    delay_min: int = 30,
    min_open_lanes: int = 4,
) -> tuple[str, str]:
    d = "—" if delay_minutes is None else str(delay_minutes)
    n = lanes_open
    if n is None:
        lane_bit = "— lanes"
    elif n == 1:
        lane_bit = "1 lane"
    else:
        lane_bit = f"{n} lanes"
    subject = f"Veterans SENTRI: {d} min, {lane_bit}"
    body = (
        f"Veterans SENTRI: {d} min, {lane_bit} open. "
        f"Need <{delay_min} min or >={min_open_lanes} lanes."
    )
    return subject, body
