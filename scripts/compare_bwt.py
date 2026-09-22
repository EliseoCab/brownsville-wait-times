#!/usr/bin/env python3
"""Compare CBP RSS vs the GitHub Pages mirror (and optional Worker feed).

Evaluates EACH Brownsville bridge separately (B&M, Gateway, Veterans,
Los Indios). Operating hours come from that item's CBP `Hours:` line
(America/Chicago). Closed bridges (plus a short post-close grace) are
skipped. Update Pending / missing hourly post: 24h bridges wait 10
minutes into the current hour when the last post was last hour; pending
that already carried over the hour boundary is stale immediately.
Limited-hours bridges (Veterans, Los Indios) wait 10 minutes after
official open.

Writes GitHub Actions outputs:
  lagging, reason, lag_minutes, lagging_bridges, still_lagging

Usage:
  python3 scripts/compare_bwt.py --cbp /tmp/cbp.xml --site /tmp/site.xml \\
      [--worker /tmp/worker.xml] [--max-lag 75] [--grace 45] \\
      [--mode compare|recheck]
"""

from __future__ import annotations

import argparse
import os
import sys
from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone

from alert_copy import format_lag_alert, lagging_text_source
from bwt_rss import (
    BRIDGES,
    CHICAGO,
    HoursWindow,
    channel_pubdate,
    empty_item,
    hours_status,
    is_fully_lanes_closed,
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
    "hourly_post_overdue",
    "pending_ready",
    "waiting_for_new_hourly_post",
    "hours_status",
    "parse_bridge_items",
    "parse_clock_to_minutes",
    "parse_hours",
    "pending_only",
    "summarize",
    "is_fully_lanes_closed",
]

# Minutes to wait before Update Pending / first-post checks are stale:
# 24h — into the current clock hour, only while waiting for that hour's
# first post; limited-hours — after official open.
HOUR_PENDING_GRACE_MIN = 10


def _chicago_hour(dt: datetime) -> datetime:
    local = dt.astimezone(CHICAGO)
    return local.replace(minute=0, second=0, microsecond=0)


def waiting_for_new_hourly_post(now: datetime, last_stamp: datetime | None) -> bool:
    """True if pending looks like a wait for this hour's first post.

    That is distinguishable when the newest lane stamp is from the current
    clock hour or the hour immediately before. No stamp, or a stamp older
    than last hour, means pending already spanned the hour boundary.
    """
    if last_stamp is None:
        return False
    now_hour = _chicago_hour(now)
    stamp_hour = _chicago_hour(last_stamp)
    return stamp_hour in (now_hour, now_hour - timedelta(hours=1))


def hourly_post_overdue(now: datetime, last_stamp: datetime | None) -> bool:
    """True 10+ minutes into the hour when the newest stamp is still last hour or older.

    Example: 11:00 am wait still showing at 12:10 pm.
    """
    local = now.astimezone(CHICAGO)
    if local.minute < HOUR_PENDING_GRACE_MIN:
        return False
    if last_stamp is None:
        return True
    return _chicago_hour(last_stamp) < _chicago_hour(local)


def pending_ready(
    window: HoursWindow,
    now: datetime,
    open_for: int | None,
    last_stamp: datetime | None = None,
) -> bool:
    """When Update Pending is stale for this bridge.

    Limited-hours: 10 minutes after official open.
    24h: 10 minutes into the current clock hour when waiting for a
    brand-new hourly post; stale immediately if pending already carried
    over from an earlier hour (or there is no usable stamp).
    """
    if not window.always:
        return open_for is not None and open_for >= HOUR_PENDING_GRACE_MIN
    local = now.astimezone(CHICAGO)
    if local.minute >= HOUR_PENDING_GRACE_MIN:
        return True
    return not waiting_for_new_hourly_post(local, last_stamp)


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
    cbp_closed: bool = False
    site_closed: bool = False
    problems: list[str] = field(default_factory=list)
    skipped: bool = False
    skip_reason: str = ""
    # Description of the feed whose stamp the lag email calls "last posted".
    # Used only to build the no-XML verify log (lane excerpts, no links).
    lane_description: str = ""

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
            cbp_closed=is_fully_lanes_closed(cbp.plain),
            site_closed=is_fully_lanes_closed(site.plain),
        )

        if status in ("closed", "grace"):
            check.skipped = True
            check.skip_reason = (
                "post-close grace" if status == "grace" else "outside operating hours"
            )
            results.append(check)
            continue

        # Stuck/missing: 24h always eligible; limited-hours wait 10 min after open.
        cbp_self_ready = window.always or (
            open_for is not None and open_for >= HOUR_PENDING_GRACE_MIN
        )
        # Pending: 24h waits 10 min into the hour only for a new hourly post;
        # carry-over / no-stamp pending is stale immediately. Limited-hours
        # wait 10 min after open.
        pending_ok_to_flag = pending_ready(window, now, open_for, last_stamp=cbp.newest)

        if cbp.pending_only:
            if pending_ok_to_flag:
                check.problems.append("cbp_pending")
        elif cbp_self_ready:
            if not cbp.present:
                check.problems.append("cbp_missing")
            elif cbp.newest is None:
                # Do not treat as missing stamp if the feed shows Lanes Closed
                # (common for limited-hours bridges like Los Indios near/after close,
                # even if the nominal Hours window is still "open").
                if not is_fully_lanes_closed(cbp.plain):
                    check.problems.append("cbp_missing_stamp")
            elif hourly_post_overdue(now, cbp.newest):
                check.problems.append("cbp_stuck")
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
                if not is_fully_lanes_closed(site.plain):
                    check.problems.append("site_missing_stamp")
        elif (
            cbp.newest is not None
            and site.newest is not None
            and check.lag_minutes is not None
            and check.lag_minutes > max_lag
        ):
            check.problems.append("site_behind")

        source = site if lagging_text_source(check) == "site" else cbp
        check.lane_description = getattr(source, "description", "") or ""
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
        if (not r.cbp_stamp and not r.cbp_pending) and r.cbp_closed:
            cbp_s = "Lanes Closed"
        if (not r.site_stamp and not r.site_pending) and r.site_closed:
            site_s = "Lanes Closed"
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
    cbp_http = os.environ.get("CBP_HTTP", "")
    site_http = os.environ.get("SITE_HTTP", "")
    cbp_pub = os.environ.get("CBP_PUBDATE", "")
    subject, body = format_lag_alert(results, now=now, cbp_http=cbp_http, site_http=site_http, cbp_pubdate=cbp_pub, raw_feed=cbp, lag_minutes=lag_s)
    print()
    if not lagging:
        print("OK: every in-hours Brownsville bridge is fresh enough.")
        write_out(
            lagging="false",
            reason=reason,
            lag_minutes=lag_s,
            lagging_bridges="",
            alert_subject="",
            alert_body="",
        )
        return 0

    print(body)
    write_out(
        lagging="true",
        reason=reason,
        lag_minutes=lag_s,
        lagging_bridges=names,
        alert_subject=subject,
        alert_body=body,
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
    cbp_http = os.environ.get("CBP_HTTP", "")
    site_http = os.environ.get("SITE_HTTP", "")
    cbp_pub = os.environ.get("CBP_PUBDATE", "")
    subject, body = format_lag_alert(results, now=now, cbp_http=cbp_http, site_http=site_http, cbp_pubdate=cbp_pub, raw_feed=cbp, lag_minutes=lag_s)
    print()
    if not lagging:
        write_out(
            still_lagging="false",
            reason=reason,
            lag_minutes=lag_s,
            lagging_bridges="",
            alert_subject="",
            alert_body="",
        )
        print("OK: mirror recovered after auto-refresh.")
    else:
        write_out(
            still_lagging="true",
            reason=reason,
            lag_minutes=lag_s,
            lagging_bridges=names,
            alert_subject=subject,
            alert_body=body,
        )
        print(body)
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
