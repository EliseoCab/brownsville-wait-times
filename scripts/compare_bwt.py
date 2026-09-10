#!/usr/bin/env python3
"""Compare CBP RSS vs the GitHub Pages mirror (and optional Worker feed).

Evaluates EACH Brownsville bridge separately (B&M, Gateway, Veterans,
Los Indios). Operating hours come from that item's CBP `Hours:` line
(America/Chicago). Closed bridges (plus a short post-close grace) are
skipped. Update Pending on an in-hours bridge is stale.

Writes GitHub Actions outputs:
  lagging, reason, lag_minutes, lagging_bridges, still_lagging

Usage:
  python3 scripts/compare_bwt.py --cbp /tmp/cbp.xml --site /tmp/site.xml \\
      [--worker /tmp/worker.xml] [--max-lag 75] [--grace 45] \\
      [--mode compare|recheck]
"""

from __future__ import annotations

import argparse
import html
import os
import re
import sys
from dataclasses import dataclass, field
from datetime import datetime, timezone
from email.utils import parsedate_to_datetime
from zoneinfo import ZoneInfo

CHICAGO = ZoneInfo("America/Chicago")
DAY_MINUTES = 24 * 60

# Display order matches the four Brownsville crossings on the site.
BRIDGES = (
    {
        "id": "bm",
        "short": "B&M",
        "match": re.compile(r"b\s*&\s*m", re.I),
        "default_hours": "24 hrs/day",
    },
    {
        "id": "gateway",
        "short": "Gateway",
        "match": re.compile(r"gateway", re.I),
        "default_hours": "24 hrs/day",
    },
    {
        "id": "veterans",
        "short": "Veterans",
        "match": re.compile(r"veterans", re.I),
        "default_hours": "6 am-Midnight",
    },
    {
        "id": "los_indios",
        "short": "Los Indios",
        "match": re.compile(r"los\s*indios", re.I),
        "default_hours": "6 am-10 pm",
    },
)

CLOCK_TOKEN = r"(?:noon|midnight|\d{1,2}(?::\d{2})?\s*(?:a\.?m\.?|p\.?m\.?))"
HOURS_24_RE = re.compile(
    r"24\s*(?:hrs?|hours)\s*/?\s*day|24\s*/\s*7|open\s*24|24\s*hours",
    re.I,
)
HOURS_RANGE_RE = re.compile(
    rf"({CLOCK_TOKEN})\s*(?:[-–—]|to)\s*({CLOCK_TOKEN})",
    re.I,
)
HOURS_LINE_RE = re.compile(r"Hours:\s*(.+?)(?=\s+Date:|$)", re.I)
DATE_RE = re.compile(r"Date:\s*(\d{1,2})/(\d{1,2})/(\d{4})")
DELAY_RE = re.compile(r"\d+\s*min(?:ute)?s?\s*delay", re.I)
PENDING_RE = re.compile(r"Update\s*Pending", re.I)
# CBP uses "At 3:00 pm CDT", "At 3 pm CDT", "At Noon CDT", "At Midnight CDT".
STAMP_RE = re.compile(
    r"At\s+(?:(noon|midnight)|(\d{1,2})(?::(\d{2}))?\s*(am|pm))\s*C[DS]T",
    re.I,
)


@dataclass
class HoursWindow:
    """Operating window in minutes since midnight (America/Chicago)."""

    always: bool = False
    force_closed: bool = False
    open_min: int = 0
    close_min: int = 0  # midnight-as-close is 0 (end of day via wrap)

    def label(self) -> str:
        if self.force_closed:
            return "closed"
        if self.always:
            return "24 hrs"
        return f"{_minutes_to_clock(self.open_min)}–{_minutes_to_clock(self.close_min, close=True)}"


@dataclass
class BridgeItem:
    bridge_id: str
    title: str
    hours_text: str
    date: tuple[int, int, int] | None
    stamps: list[datetime] = field(default_factory=list)
    pending_only: bool = False
    present: bool = False

    @property
    def newest(self) -> datetime | None:
        return max(self.stamps) if self.stamps else None


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


def read(path: str) -> str:
    try:
        with open(path, "r", encoding="utf-8", errors="replace") as f:
            return f.read()
    except FileNotFoundError:
        return ""


def _plain(text: str) -> str:
    text = html.unescape(text or "")
    text = re.sub(r"<[^>]+>", " ", text)
    return re.sub(r"\s+", " ", text).strip()


def _minutes_to_clock(minutes: int, close: bool = False) -> str:
    minutes = minutes % DAY_MINUTES
    if close and minutes == 0:
        return "midnight"
    hour24, minute = divmod(minutes, 60)
    if hour24 == 0:
        return f"12:{minute:02d} am" if minute else "midnight"
    if hour24 == 12:
        return f"12:{minute:02d} pm" if minute else "noon"
    ampm = "am" if hour24 < 12 else "pm"
    hour12 = hour24 if hour24 <= 12 else hour24 - 12
    if hour12 > 12:
        hour12 -= 12
    return f"{hour12}:{minute:02d} {ampm}"


def parse_clock_to_minutes(text: str) -> int | None:
    t = html.unescape(text or "").strip().lower().replace(".", "")
    t = re.sub(r"\s+", " ", t)
    if t == "noon":
        return 12 * 60
    if t == "midnight":
        return 0
    m = re.match(r"(\d{1,2})(?::(\d{2}))?\s*(am|pm)$", t)
    if not m:
        return None
    hour = int(m.group(1)) % 12
    minute = int(m.group(2) or 0)
    if m.group(3) == "pm":
        hour += 12
    return hour * 60 + minute


def parse_hours(text: str) -> HoursWindow | None:
    raw = _plain(text or "")
    if not raw:
        return None
    if re.search(r"\bclosed\b", raw, re.I) and not HOURS_RANGE_RE.search(raw):
        return HoursWindow(force_closed=True)
    if HOURS_24_RE.search(raw):
        return HoursWindow(always=True)
    m = HOURS_RANGE_RE.search(raw)
    if not m:
        return None
    open_min = parse_clock_to_minutes(m.group(1))
    close_min = parse_clock_to_minutes(m.group(2))
    if open_min is None or close_min is None:
        return None
    if open_min == close_min:
        return HoursWindow(always=True)
    return HoursWindow(always=False, open_min=open_min, close_min=close_min)


def _in_span(start: int, end: int, t: int) -> bool:
    """True if t is in [start, end). Midnight-as-close (end==0) wraps."""
    if start == end:
        return True
    if start < end:
        return start <= t < end
    return t >= start or t < end


def minutes_since_midnight(dt: datetime) -> int:
    local = dt.astimezone(CHICAGO)
    return local.hour * 60 + local.minute


def minutes_after(start: int, t: int) -> int:
    if t >= start:
        return t - start
    return t + DAY_MINUTES - start


def hours_status(
    window: HoursWindow,
    now: datetime,
    grace_min: int,
) -> str:
    """Return open, grace (post-close), or closed."""
    if window.force_closed:
        return "closed"
    if window.always:
        return "open"
    now_m = minutes_since_midnight(now)
    if _in_span(window.open_min, window.close_min, now_m):
        return "open"
    if grace_min > 0 and minutes_after(window.close_min, now_m) < grace_min:
        return "grace"
    return "closed"


def minutes_open_so_far(window: HoursWindow, now: datetime) -> int | None:
    """Minutes since today's open, or None if 24h (always open)."""
    if window.always or window.force_closed:
        return None
    now_m = minutes_since_midnight(now)
    if not _in_span(window.open_min, window.close_min, now_m):
        return 0
    return minutes_after(window.open_min, now_m)


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


def parse_stamps(plain: str, day: tuple[int, int, int] | None, now: datetime) -> list[datetime]:
    """Parse CBP 'At 3:00 pm CDT' / 'At Noon CDT' stamps in America/Chicago."""
    stamps: list[datetime] = []
    for m in STAMP_RE.finditer(plain):
        if m.group(1):
            token = m.group(1).lower()
            if token == "noon":
                hour, minute = 12, 0
            else:
                hour, minute = 0, 0
        else:
            hour = int(m.group(2)) % 12
            minute = int(m.group(3) or 0)
            if m.group(4).lower() == "pm":
                hour += 12
        if day:
            year, month, day_n = day
            local = datetime(year, month, day_n, hour, minute, tzinfo=CHICAGO)
        else:
            now_local = now.astimezone(CHICAGO)
            local = now_local.replace(hour=hour, minute=minute, second=0, microsecond=0)
        stamps.append(local.astimezone(timezone.utc))
    return stamps


def match_bridge(title: str) -> dict | None:
    title = html.unescape(title or "")
    title = re.sub(r"\s+", " ", title).strip()
    if not re.search(r"Brownsville", title, re.I):
        return None
    for spec in BRIDGES:
        if spec["match"].search(title):
            return spec
    return None


def pending_only(plain: str) -> bool:
    """True when the item has Update Pending and no published delay times."""
    return bool(PENDING_RE.search(plain)) and not bool(DELAY_RE.search(plain))


def parse_bridge_items(xml: str, now: datetime) -> dict[str, BridgeItem]:
    items: dict[str, BridgeItem] = {}
    for m in re.finditer(r"<item>(.*?)</item>", xml or "", flags=re.I | re.S):
        block = m.group(1)
        title_m = re.search(r"<title>\s*([^<]+)", block, flags=re.I)
        if not title_m:
            continue
        title = html.unescape(title_m.group(1))
        title = re.sub(r"\s+", " ", title).strip()
        spec = match_bridge(title)
        if not spec:
            continue
        desc_m = re.search(r"<description>(.*?)</description>", block, flags=re.I | re.S)
        plain = _plain(desc_m.group(1) if desc_m else block)
        hours_m = HOURS_LINE_RE.search(plain)
        hours_text = hours_m.group(1).strip() if hours_m else ""
        dm = DATE_RE.search(plain)
        day = None
        if dm:
            month, day_n, year = int(dm.group(1)), int(dm.group(2)), int(dm.group(3))
            day = (year, month, day_n)
        items[spec["id"]] = BridgeItem(
            bridge_id=spec["id"],
            title=title,
            hours_text=hours_text,
            date=day,
            stamps=parse_stamps(plain, day, now),
            pending_only=pending_only(plain),
            present=True,
        )
    return items


def empty_item(spec: dict) -> BridgeItem:
    return BridgeItem(
        bridge_id=spec["id"],
        title=f"Brownsville - {spec['short']}",
        hours_text="",
        date=None,
        present=False,
    )


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

        # CBP-not-updating checks wait until the port has been open long enough
        # for the first hourly post (24h bridges: always eligible).
        cbp_self_ready = window.always or (open_for is not None and open_for >= max_lag)

        if cbp_self_ready:
            if cbp.pending_only:
                check.problems.append("cbp_pending")
            elif not cbp.present:
                check.problems.append("cbp_missing")
            elif cbp.newest is None:
                check.problems.append("cbp_missing_stamp")
            elif check.cbp_age_minutes is not None and check.cbp_age_minutes > max_lag:
                check.problems.append("cbp_stuck")

        if site.pending_only:
            # Open + Update Pending means the mirror has not received times.
            # During the first hour after open, matching CBP pending is expected.
            if not (cbp.pending_only and not cbp_self_ready):
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


def write_out(**kwargs):
    out_path = os.environ.get("GITHUB_OUTPUT")
    if not out_path:
        return
    with open(out_path, "a") as out:
        for k, v in kwargs.items():
            out.write(f"{k}={v}\n")


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
