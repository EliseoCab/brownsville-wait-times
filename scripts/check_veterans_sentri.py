#!/usr/bin/env python3
"""Veterans passenger SENTRI staffing alarm.

Fails (via GitHub Actions outputs) when Veterans International is in hours
and passenger SENTRI delay is >= 30 minutes with fewer than 4 lanes open.

Update Pending with no parseable delay: WARN only — do not invent lane counts.
Closed / N/A / outside hours: no alert.

Usage:
  python3 scripts/check_veterans_sentri.py --cbp /tmp/cbp.xml \\
      [--delay-min 30] [--min-open-lanes 4]
"""

from __future__ import annotations

import argparse
import sys
from dataclasses import dataclass
from datetime import datetime

from alert_copy import format_sentri_alert
from bwt_rss import (
    BRIDGES,
    CHICAGO,
    HoursWindow,
    hours_status,
    parse_bridge_items,
    parse_hours,
    passenger_sentri,
    read,
    write_out,
)

VETERANS_SPEC = next(s for s in BRIDGES if s["id"] == "veterans")


@dataclass
class SentriCheck:
    alert: bool
    reason: str
    hours_status: str
    hours_text: str
    delay_minutes: int | None
    lanes_open: int | None
    pending: bool
    closed: bool
    na: bool
    raw: str
    message: str


def evaluate_veterans_sentri(
    xml: str,
    now: datetime | None = None,
    delay_min: int = 30,
    min_open_lanes: int = 4,
) -> SentriCheck:
    now = now or datetime.now(CHICAGO)
    if now.tzinfo is None:
        now = now.replace(tzinfo=CHICAGO)
    else:
        now = now.astimezone(CHICAGO)

    items = parse_bridge_items(xml, now)
    item = items.get("veterans")
    hours_text = (item.hours_text if item else "") or VETERANS_SPEC["default_hours"]
    window = parse_hours(hours_text) or parse_hours(VETERANS_SPEC["default_hours"])
    if window is None:
        window = HoursWindow(always=False, open_min=6 * 60, close_min=0)
    status = hours_status(window, now, grace_min=0)

    empty = SentriCheck(
        alert=False,
        reason="ok",
        hours_status=status,
        hours_text=hours_text,
        delay_minutes=None,
        lanes_open=None,
        pending=False,
        closed=False,
        na=False,
        raw="",
        message="",
    )

    if not item or not item.present:
        empty.reason = "missing_item"
        empty.message = (
            "WARN: Brownsville - Veterans International item not in feed; "
            "not alerting (cannot invent SENTRI counts)."
        )
        return empty

    if status != "open":
        empty.reason = "closed_hours"
        empty.message = (
            f"SKIP: Veterans is {status} ({hours_text}, America/Chicago). "
            "No SENTRI staffing alert outside operating hours."
        )
        return empty

    lane = passenger_sentri(item.description)
    if lane is None:
        empty.reason = "no_sentri_lane"
        empty.message = (
            "WARN: no Passenger Vehicles → Sentri Lanes line on Veterans; "
            "not alerting (cannot invent lane counts)."
        )
        return empty

    empty.delay_minutes = lane.delay_minutes
    empty.lanes_open = lane.lanes_open
    empty.pending = lane.pending
    empty.closed = lane.closed
    empty.na = lane.na
    empty.raw = lane.raw

    if lane.delay_minutes is not None and lane.lanes_open is not None:
        if lane.delay_minutes >= delay_min and lane.lanes_open < min_open_lanes:
            empty.alert = True
            empty.reason = "understaffed"
            empty.message = (
                f"ALERT: Veterans passenger SENTRI is {lane.delay_minutes} min delay "
                f"with {lane.lanes_open} lane(s) open "
                f"(threshold {delay_min} min and < {min_open_lanes} open)."
            )
            return empty
        empty.reason = "ok"
        empty.message = (
            f"OK: Veterans passenger SENTRI {lane.delay_minutes} min delay, "
            f"{lane.lanes_open} lane(s) open."
        )
        return empty

    if lane.pending and lane.delay_minutes is None:
        empty.reason = "pending"
        empty.message = (
            "WARN: Veterans passenger SENTRI is Update Pending while the bridge "
            "is in hours; no delay number — not inventing lane counts, no alert."
        )
        return empty

    if lane.closed or lane.na:
        empty.reason = "sentri_unavailable"
        empty.message = (
            f"OK: Veterans passenger SENTRI is "
            f"{'Lanes Closed' if lane.closed else 'N/A'} while the bridge is open; "
            "no delay+lane counts to evaluate."
        )
        return empty

    empty.reason = "unparseable"
    empty.message = (
        f"WARN: Veterans passenger SENTRI in hours but delay/lanes not fully "
        f"parseable ({lane.raw!r}); not inventing values, no alert."
    )
    return empty


def print_report(check: SentriCheck, now: datetime, delay_min: int, min_open_lanes: int) -> None:
    print("=== Veterans SENTRI lane staffing ===")
    print(f"Now (America/Chicago): {now.astimezone(CHICAGO).strftime('%Y-%m-%d %I:%M %p %Z')}")
    print(f"Veterans hours:        {check.hours_text} ({check.hours_status})")
    print(f"Threshold:             delay ≥ {delay_min} min AND open lanes < {min_open_lanes}")
    delay_s = "—" if check.delay_minutes is None else f"{check.delay_minutes} min"
    lanes_s = "—" if check.lanes_open is None else str(check.lanes_open)
    print(f"Passenger SENTRI:      delay={delay_s}  lanes_open={lanes_s}")
    flags = []
    if check.pending:
        flags.append("Update Pending")
    if check.closed:
        flags.append("Lanes Closed")
    if check.na:
        flags.append("N/A")
    if flags:
        print(f"Flags:                 {', '.join(flags)}")
    if check.raw:
        print(f"Raw lane text:         {check.raw}")
    print(check.message)


def main() -> int:
    p = argparse.ArgumentParser()
    p.add_argument("--cbp", required=True, help="Path to live CBP Brownsville RSS XML")
    p.add_argument("--delay-min", type=int, default=30)
    p.add_argument("--min-open-lanes", type=int, default=4)
    p.add_argument(
        "--now",
        default="",
        help="ISO datetime override (America/Chicago if naive) for tests.",
    )
    args = p.parse_args()

    now = datetime.now(CHICAGO)
    if args.now:
        now = datetime.fromisoformat(args.now)
        if now.tzinfo is None:
            now = now.replace(tzinfo=CHICAGO)

    xml = read(args.cbp)
    check = evaluate_veterans_sentri(
        xml, now=now, delay_min=args.delay_min, min_open_lanes=args.min_open_lanes
    )
    print_report(check, now, args.delay_min, args.min_open_lanes)
    subject, body = ("", "")
    if check.alert:
        subject, body = format_sentri_alert(
            check.delay_minutes,
            check.lanes_open,
            delay_min=args.delay_min,
            min_open_lanes=args.min_open_lanes,
        )
        print(body)
    write_out(
        alert="true" if check.alert else "false",
        reason=check.reason,
        delay_minutes="" if check.delay_minutes is None else str(check.delay_minutes),
        lanes_open="" if check.lanes_open is None else str(check.lanes_open),
        hours_status=check.hours_status,
        alert_subject=subject,
        alert_body=body,
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
