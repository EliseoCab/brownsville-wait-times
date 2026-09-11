#!/usr/bin/env python3
"""Compare CBP RSS vs the GitHub Pages mirror (and optional Worker feed).

Evaluates EACH Brownsville bridge separately (B&M, Gateway, Veterans,
Los Indios). Operating hours come from that item's CBP `Hours:` line
(America/Chicago). Closed bridges (plus a short post-close grace) are
skipped. Update Pending: 24h bridges wait 15 minutes into the current
hour; limited-hours bridges (Veterans, Los Indios) wait 15 minutes
after official open.

Writes GitHub Actions outputs:
  lagging, reason, lag_minutes, lagging_bridges, still_lagging

Usage:
  python3 scripts/compare_bwt.py --cbp /tmp/cbp.xml --site /tmp/site.xml \\
      [--worker /tmp/worker.xml] [--max-lag 75] [--grace 45] \\
      [--mode compare|recheck]
"""

from __future__ import annotations

import argparse
import sys
from dataclasses import dataclass, field
from datetime import datetime, timezone

from bwt_rss import (
    BRIDGES,
    CHICAGO,
    HoursWindow,
    channel_pubdate,
    empty_item,
    hours_status,
    minutes_open_so_far,
    parse_bridge_items,
    parse_clock_to_minutes,
    parse_hours,
    parse_stamps,
    pending_only,
    read,
    write_out,
)

# Re-export helpers so existing tests can import compare_bwt as before.
__all__ = [
    "BRIDGES",
    "CHICAGO",
    "HoursWindow",
    "HOUR_PENDING_GRACE_MIN",
    "evaluate_bridges",
    "hours_status",
    "parse_bridge_items",
    "parse_clock_to_minutes",
    "parse_hours",
    "pending_only",
    "summarize",
]

# Minutes to wait before Update Pending / first-post checks are stale:
# 24h — into the current clock hour; limited-hours — after official open.
HOUR_PENDING_GRACE_MIN = 15


def pending_ready(window: HoursWindow, now: datetime, open_for: int | None) -> bool:
    """When Update Pending is stale for this bridge.

    Limited-hours: 15 minutes after official open.
    24h: 15 minutes into the current clock hour.
    """
    if window.always:
        return now.astimezone(CHICAGO).minute >= HOUR_PENDING_GRACE_MIN
    return open_for is not None and open_for >= HOUR_PENDING_GRACE_MIN


@dataclass
class BridgeCheck:
    bridge_id: str
    name: str
    hours_text: str
    status: str  # open | grace | closed
    minutes_open: int | None
    cbp_stamp: datetime | None
    site_stamp: datetime | None
    worker_stamp: datetime | None
    cbp_pending: bool
    site_pending: bool
    worker_pending: bool
    lag_minutes: float | None
    cbp_age_minutes: float | None
    problems: list[str] = field(default_factory=list)
    skipped: bool = False
    skip_reason: str = ""

    @property
    def ok(self) -> bool:
        return not self.problems


def lag_minutes(cbp_t, site_t):
    if cbp_t is None or site_t is None:
        return None
    return (cbp_t - site_t).total_seconds() / 60.0


def _fmt_dt(dt: datetime | None) -> str:
    if dt is None:
        return "—"
    local = dt.astimezone(CHICAGO)
    return local.strftime("%Y-%m-%d %I:%M %p %Z").replace(" 0", " ")


def evaluate_bridges(
    cbp_xml: str,
    site_xml: str,
    worker_xml: str,
    max_lag: int,
    grace_min: int,
    now: datetime | None = None,
) -> list[BridgeCheck]:
    now = now or datetime.now(CHICAGO)
    if now.tzinfo is None:
        now = now.replace(tzinfo=CHICAGO)
    else:
        now = now.astimezone(CHICAGO)

    cbp_items = parse_bridge_items(cbp_xml, now)
    site_items = parse_bridge_items(site_xml, now)
    worker_items = parse_bridge_items(worker_xml, now) if worker_xml else {}

    results: list[BridgeCheck] = []
    for spec in BRIDGES:
        bid = spec["id"]
        cbp = cbp_items.get(bid) or empty_item(spec)
        site = site_items.get(bid) or empty_item(spec)
        worker = worker_items.get(bid) or empty_item(spec)

        hours_text = cbp.hours_text or site.hours_text or spec["default_hours"]
        window = parse_hours(hours_text) or parse_hours(spec["default_hours"])
        if window is None:
            window = HoursWindow(always=True)

        status = hours_status(window, now, grace_min)
        open_for = minutes_open_so_far(window, now) if status == "open" else 0

        check = BridgeCheck(
            bridge_id=bid,
            name=spec["short"],
            hours_text=hours_text or spec["default_hours"],
            status=status,
            minutes_open=open_for,
            cbp_stamp=cbp.newest,
            site_stamp=site.newest,
            worker_stamp=worker.newest if worker.present else None,
            cbp_pending=cbp.pending_only,
            site_pending=site.pending_only,
            worker_pending=worker.pending_only,
            lag_minutes=lag_minutes(cbp.newest, site.newest),
            cbp_age_minutes=(
                (now.astimezone(timezone.utc) - cbp.newest).total_seconds() / 60.0
                if cbp.newest
                else None
            ),
        )

        if status in ("closed", "grace"):
            check.skipped = True
            check.skip_reason = (
                "post-close grace" if status == "grace" else "outside operating hours"
            )
            results.append(check)
            continue

        # Stuck/missing: 24h always eligible; limited-hours wait 15 min after open.
        cbp_self_ready = window.always or (
            open_for is not None and open_for >= HOUR_PENDING_GRACE_MIN
        )
        # Pending: 24h waits 15 min into the current hour; limited-hours wait 15 min after open.
        pending_ok_to_flag = pending_ready(window, now, open_for)

        if cbp.pending_only:
            if pending_ok_to_flag:
                check.problems.append("cbp_pending")
        elif cbp_self_ready:
            if not cbp.present:
                check.problems.append("cbp_missing")
            elif cbp.newest is None:
                check.problems.append("cbp_missing_stamp")
            elif check.cbp_age_minutes is not None and check.cbp_age_minutes > max_lag:
                check.problems.append("cbp_stuck")

        if site.pending_only:
            # Open + Update Pending means the mirror has not received times.
            # Matching CBP pending during the pending grace is expected.
            if not (cbp.pending_only and not pending_ok_to_flag):
                check.problems.append("site_pending")
        elif not site.present:
            check.problems.append("site_missing")
        elif site.newest is None:
            if cbp.newest is not None or cbp_self_ready:
                check.problems.append("site_missing_stamp")
        elif (
            cbp.newest is not None
            and site.newest is not None
            and check.lag_minutes is not None
            and check.lag_minutes > max_lag
        ):
            check.problems.append("site_behind")

        results.append(check)
    return results


def _problem_phrase(code: str) -> str:
    return {
        "cbp_pending": "CBP Update Pending while open",
        "cbp_missing": "CBP item missing while open",
        "cbp_missing_stamp": "CBP missing stamp while open",
        "cbp_stuck": "CBP stamp stuck while open",
        "site_pending": "site Update Pending while open",
        "site_missing": "site item missing while open",
        "site_missing_stamp": "site missing stamp while open",
        "site_behind": "site behind CBP",
    }.get(code, code)


def summarize(results: list[BridgeCheck]) -> tuple[bool, str, str, str]:
    """Return (lagging, reason, lag_minutes, lagging_bridges)."""
    bad = [r for r in results if r.problems]
    if not bad:
        lags = [int(r.lag_minutes) for r in results if r.lag_minutes is not None]
        lag_s = str(max(lags)) if lags else "0"
        return False, "fresh", lag_s, ""

    names = ",".join(r.name.replace(" ", "_") for r in bad)
    reasons = []
    seen = set()
    for r in bad:
        for p in r.problems:
            if p not in seen:
                seen.add(p)
                reasons.append(p)
    reason = "+".join(reasons)

    lag_candidates = []
    for r in bad:
        if r.lag_minutes is not None and r.lag_minutes > 0:
            lag_candidates.append(r.lag_minutes)
        if r.cbp_age_minutes is not None and "cbp_stuck" in r.problems:
            lag_candidates.append(r.cbp_age_minutes)
    lag_s = str(int(max(lag_candidates))) if lag_candidates else "0"
    return True, reason, lag_s, names


def print_report(
    results: list[BridgeCheck],
    now: datetime,
    max_lag: int,
    grace_min: int,
    title: str,
    worker_present: bool,
    feed_pubdate=None,
) -> None:
    print(title)
    print(f"Now (America/Chicago): {now.astimezone(CHICAGO).strftime('%Y-%m-%d %I:%M %p %Z')}")
    if feed_pubdate:
        print(f"CBP channel pubDate:   {_fmt_dt(feed_pubdate)}")
    print(f"Max allowed lag:       {max_lag} minutes")
    print(f"Post-close grace:      {grace_min} minutes")
    print()
    header = (
        f"{'Bridge':<12} {'Hours':<16} {'Status':<8} "
        f"{'CBP stamp':<22} {'Site stamp':<22} {'Lag':>7}  Result"
    )
    print(header)
    print("-" * len(header))
    for r in results:
        hours = (r.hours_text or "—")[:16]
        cbp_s = "Update Pending" if r.cbp_pending and r.cbp_stamp is None else _fmt_dt(r.cbp_stamp)
        site_s = "Update Pending" if r.site_pending and r.site_stamp is None else _fmt_dt(r.site_stamp)
        if r.cbp_pending and r.cbp_stamp is not None:
            cbp_s = "Pending"
        if r.site_pending and r.site_stamp is not None:
            site_s = "Pending"
        lag_s = "—" if r.lag_minutes is None else f"{r.lag_minutes:.0f}m"
        if r.skipped:
            result = f"SKIP ({r.skip_reason})"
        elif r.ok:
            result = "OK"
        else:
            result = "STALE: " + ", ".join(_problem_phrase(p) for p in r.problems)
        print(
            f"{r.name:<12} {hours:<16} {r.status:<8} "
            f"{cbp_s:<22} {site_s:<22} {lag_s:>7}  {result}"
        )

    if worker_present:
        print()
        print("=== Worker feed (informational; not pass/fail) ===")
        for r in results:
            w = "Update Pending" if r.worker_pending and r.worker_stamp is None else _fmt_dt(r.worker_stamp)
            wlag = lag_minutes(r.cbp_stamp, r.worker_stamp)
            wlag_s = "—" if wlag is None else f"{wlag:.0f}m"
            note = ""
            if r.skipped:
                note = " (bridge skipped for pass/fail)"
            elif r.worker_pending and r.status == "open":
                note = " (worker Update Pending while open)"
            elif wlag is not None and wlag > max_lag:
                note = " (worker behind CBP)"
            print(f"  {r.name:<12} worker={w:<22} vs CBP lag={wlag_s}{note}")


def compare(
    cbp: str,
    site: str,
    worker: str,
    max_lag: int,
    grace_min: int,
    now: datetime | None = None,
) -> int:
    now = now or datetime.now(CHICAGO)
    results = evaluate_bridges(cbp, site, worker, max_lag, grace_min, now=now)
    print_report(
        results,
        now,
        max_lag,
        grace_min,
        "=== Per-bridge lag check (GitHub Pages mirror vs CBP) ===",
        worker_present=bool(worker.strip()),
        feed_pubdate=channel_pubdate(cbp),
    )
    lagging, reason, lag_s, names = summarize(results)
    print()
    if not lagging:
        print("OK: every in-hours Brownsville bridge is fresh enough.")
        write_out(
            lagging="false",
            reason=reason,
            lag_minutes=lag_s,
            lagging_bridges="",
        )
        return 0

    print(
        f"STALE: in-hours bridge(s) failing: {names.replace(',', ', ')} "
        f"({reason}). Will try auto-refresh."
    )
    write_out(
        lagging="true",
        reason=reason,
        lag_minutes=lag_s,
        lagging_bridges=names,
    )
    return 0


def recheck(
    cbp: str,
    site: str,
    max_lag: int,
    grace_min: int,
    now: datetime | None = None,
    worker: str = "",
) -> int:
    now = now or datetime.now(CHICAGO)
    results = evaluate_bridges(cbp, site, worker, max_lag, grace_min, now=now)
    print_report(
        results,
        now,
        max_lag,
        grace_min,
        "=== Re-check after auto-refresh (per bridge) ===",
        worker_present=False,
        feed_pubdate=channel_pubdate(cbp),
    )
    lagging, reason, lag_s, names = summarize(results)
    print()
    if not lagging:
        write_out(
            still_lagging="false",
            reason=reason,
            lag_minutes=lag_s,
            lagging_bridges="",
        )
        print("OK: mirror recovered after auto-refresh.")
    else:
        write_out(
            still_lagging="true",
            reason=reason,
            lag_minutes=lag_s,
            lagging_bridges=names,
        )
        print(
            f"STILL STALE after auto-refresh: {names.replace(',', ', ')} ({reason})."
        )
    return 0


def main() -> int:
    p = argparse.ArgumentParser()
    p.add_argument("--cbp", required=True)
    p.add_argument("--site", required=True)
    p.add_argument("--worker", default="")
    p.add_argument("--max-lag", type=int, default=75)
    p.add_argument(
        "--grace",
        type=int,
        default=45,
        help="Minutes after official close to keep skipping freshness (default 45).",
    )
    p.add_argument("--mode", choices=("compare", "recheck"), default="compare")
    p.add_argument(
        "--now",
        default="",
        help="ISO datetime override (America/Chicago if naive) for tests.",
    )
    args = p.parse_args()

    now = None
    if args.now:
        now = datetime.fromisoformat(args.now)
        if now.tzinfo is None:
            now = now.replace(tzinfo=CHICAGO)

    cbp = read(args.cbp)
    site = read(args.site)
    worker = read(args.worker) if args.worker else ""

    if args.mode == "recheck":
        return recheck(cbp, site, args.max_lag, args.grace, now=now, worker=worker)
    return compare(cbp, site, worker, args.max_lag, args.grace, now=now)


if __name__ == "__main__":
    sys.exit(main())
