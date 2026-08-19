#!/usr/bin/env python3
"""Compare CBP RSS vs the GitHub Pages mirror (and optional Worker feed).

Writes GitHub Actions outputs:
  lagging, reason, lag_minutes, still_lagging

Usage:
  python3 scripts/compare_bwt.py --cbp /tmp/cbp.xml --site /tmp/site.xml \\
      [--worker /tmp/worker.xml] [--max-lag 75] [--mode compare|recheck]
"""

from __future__ import annotations

import argparse
import os
import re
import sys
from datetime import datetime, timezone
from email.utils import parsedate_to_datetime
from zoneinfo import ZoneInfo

CHICAGO = ZoneInfo("America/Chicago")


def read(path: str) -> str:
    try:
        with open(path, "r", encoding="utf-8", errors="replace") as f:
            return f.read()
    except FileNotFoundError:
        return ""


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


def report_stamps(xml: str):
    """Parse CBP 'At 3:00 pm CDT' stamps using America/Chicago (CDT/CST)."""
    day = None
    dm = re.search(r"Date:\s*(\d{1,2})/(\d{1,2})/(\d{4})", xml)
    if dm:
        month, day_n, year = int(dm.group(1)), int(dm.group(2)), int(dm.group(3))
        day = (year, month, day_n)

    stamps = []
    for m in re.finditer(
        r"At\s+(\d{1,2}):(\d{2})\s*(am|pm)\s*C[DS]T",
        xml,
        re.I,
    ):
        hour = int(m.group(1)) % 12
        minute = int(m.group(2))
        if m.group(3).lower() == "pm":
            hour += 12
        if day:
            y, mo, d = day
            local = datetime(y, mo, d, hour, minute, tzinfo=CHICAGO)
        else:
            now_local = datetime.now(CHICAGO)
            local = now_local.replace(hour=hour, minute=minute, second=0, microsecond=0)
        stamps.append(local.astimezone(timezone.utc))
    return stamps


def newest_stamp(xml: str):
    stamps = report_stamps(xml)
    if stamps:
        return max(stamps)
    return channel_pubdate(xml)


def pending_only(xml: str) -> bool:
    has_pending = bool(re.search(r"Update\s*Pending", xml, re.I))
    has_delay = bool(re.search(r"\d+\s*min\s*delay", xml, re.I))
    return has_pending and not has_delay


def lag_minutes(cbp_t, site_t):
    if cbp_t is None or site_t is None:
        return None
    return (cbp_t - site_t).total_seconds() / 60.0


def write_out(**kwargs):
    out_path = os.environ.get("GITHUB_OUTPUT")
    if not out_path:
        return
    with open(out_path, "a") as out:
        for k, v in kwargs.items():
            out.write(f"{k}={v}\n")


def compare(cbp: str, site: str, worker: str, max_lag: int) -> int:
    cbp_pending = pending_only(cbp)
    site_pending = pending_only(site)
    cbp_t = newest_stamp(cbp)
    site_t = newest_stamp(site)
    worker_t = newest_stamp(worker) if worker else None

    print("=== Lag check (GitHub Pages mirror) ===")
    print(f"CBP newest report:     {cbp_t}")
    print(f"Site newest report:    {site_t}")
    print(f"Worker newest report:  {worker_t}")
    print(f"CBP pending-only:      {cbp_pending}")
    print(f"Site pending-only:     {site_pending}")
    print(f"Max allowed lag:       {max_lag} minutes")

    if cbp_pending and site_pending:
        print("OK: both CBP and site are Update Pending.")
        write_out(lagging="false", reason="pending")
        return 0

    if cbp_t is None:
        print("WARN: could not parse CBP report time; skipping fail.")
        write_out(lagging="false", reason="cbp_unparseable")
        return 0

    if site_t is None:
        print("SITE STALE: site feed has no parseable report time while CBP does.")
        write_out(lagging="true", reason="site_unparseable")
        return 0

    lag = lag_minutes(cbp_t, site_t)
    print(f"Lag (CBP - site):      {lag:.1f} minutes")
    if worker_t is not None:
        wlag = lag_minutes(cbp_t, worker_t)
        print(f"Lag (CBP - worker):    {wlag:.1f} minutes")

    if lag is not None and lag <= max_lag:
        print("OK: site mirror is fresh enough.")
        write_out(lagging="false", reason="fresh", lag_minutes=str(int(lag)))
        return 0

    print(
        f"STALE: site mirror is lagging CBP by {lag:.0f} minutes "
        f"(threshold {max_lag} min). Will try auto-refresh."
    )
    write_out(lagging="true", reason="behind", lag_minutes=str(int(lag)))
    return 0


def recheck(cbp: str, site: str, max_lag: int) -> int:
    cbp_t = newest_stamp(cbp)
    site_t = newest_stamp(site)
    print("=== Re-check after auto-refresh ===")
    print(f"CBP newest report:  {cbp_t}")
    print(f"Site newest report: {site_t}")

    if cbp_t is None or site_t is None:
        print("Still cannot parse times after refresh.")
        write_out(still_lagging="true")
        return 0

    lag = (cbp_t - site_t).total_seconds() / 60.0
    print(f"Lag (CBP - site):   {lag:.1f} minutes")
    if lag <= max_lag:
        write_out(still_lagging="false", lag_minutes=str(int(lag)))
        print("OK: mirror recovered after auto-refresh.")
    else:
        write_out(still_lagging="true", lag_minutes=str(int(lag)))
        print("STILL STALE after auto-refresh.")
    return 0


def main() -> int:
    p = argparse.ArgumentParser()
    p.add_argument("--cbp", required=True)
    p.add_argument("--site", required=True)
    p.add_argument("--worker", default="")
    p.add_argument("--max-lag", type=int, default=75)
    p.add_argument("--mode", choices=("compare", "recheck"), default="compare")
    args = p.parse_args()

    cbp = read(args.cbp)
    site = read(args.site)
    worker = read(args.worker) if args.worker else ""

    if args.mode == "recheck":
        return recheck(cbp, site, args.max_lag)
    return compare(cbp, site, worker, args.max_lag)


if __name__ == "__main__":
    sys.exit(main())
