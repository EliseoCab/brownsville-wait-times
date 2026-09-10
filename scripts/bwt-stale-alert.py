#!/usr/bin/env python3
"""Decide whether to email that Brownsville CBP wait times missed the current hour.

Exit 0 always. Prints one JSON object to stdout:
  action: "send" | "skip"
  reason, subject, body (body only when send)
"""
from __future__ import annotations

import json
import os
import re
import subprocess
import sys
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo

TZ = ZoneInfo("America/Chicago")
STATE_PATH = Path.home() / ".grok" / "bwt-stale-alert-state.json"
FEEDS = [
    "https://brownsville-bwt.borderwait.workers.dev",
    "https://bwt.cbp.gov/xml/bwt.xml",
    "https://raw.githubusercontent.com/EliseoCab/brownsville-wait-times/main/data/bwt.xml",
]
TO = "eliseo.cabrera@cbp.dhs.gov"
SITE = "https://eliseocab.github.io/brownsville-wait-times/"
GRACE_MIN = 15


def fetch_xml() -> tuple[str, str]:
    for url in FEEDS:
        try:
            out = subprocess.run(
                ["curl", "-fsSL", "-A", "Mozilla/5.0", "--max-time", "20", url],
                capture_output=True,
                text=True,
                check=False,
            )
            if out.returncode == 0 and "Brownsville" in out.stdout:
                return out.stdout, url
        except OSError:
            continue
    raise RuntimeError("Could not fetch CBP Brownsville wait-times feed")


def brownsville_blocks(xml: str) -> list[str]:
    blocks = []
    for m in re.finditer(
        r"<item>(.*?)</item>",
        xml,
        flags=re.I | re.S,
    ):
        block = m.group(1)
        title_m = re.search(r"<title>\s*([^<]+)", block, flags=re.I)
        title = (title_m.group(1) if title_m else "").replace("&amp;", "&")
        if re.search(r"Brownsville", title, flags=re.I):
            blocks.append(re.sub(r"<[^>]+>", " ", block))
    return blocks


def parse_stamp(text: str) -> datetime | None:
    """Newest At h:mm am/pm C[DS]T plus Date: M/D/YYYY in the Brownsville blocks."""
    best = None
    date_m = re.search(r"Date:\s*(\d{1,2})/(\d{1,2})/(\d{4})", text)
    clocks = list(
        re.finditer(
            r"(?:At\s+)?(\d{1,2}):(\d{2})\s*(am|pm)\s*(C[DS]T)",
            text,
            flags=re.I,
        )
    )
    if not clocks:
        return None
    month = day = year = None
    if date_m:
        month, day, year = (int(date_m.group(i)) for i in (1, 2, 3))
    now = datetime.now(TZ)
    for m in clocks:
        hour = int(m.group(1)) % 12
        minute = int(m.group(2))
        if m.group(3).lower() == "pm":
            hour += 12
        if month and day and year:
            dt = datetime(year, month, day, hour, minute, tzinfo=TZ)
        else:
            dt = now.replace(hour=hour, minute=minute, second=0, microsecond=0)
        if best is None or dt > best:
            best = dt
    return best


def fmt_hour(dt: datetime) -> str:
    h = dt.strftime("%I").lstrip("0") or "12"
    ampm = dt.strftime("%p").lower().replace("am", "a.m.").replace("pm", "p.m.")
    tz = dt.strftime("%Z") or "CDT"
    return f"{h}:00 {ampm} {tz}"


def fmt_clock(dt: datetime) -> str:
    h = dt.strftime("%I").lstrip("0") or "12"
    ampm = dt.strftime("%p").lower().replace("am", "a.m.").replace("pm", "p.m.")
    tz = dt.strftime("%Z") or "CDT"
    return f"{h}:{dt.strftime('%M')} {ampm} {tz}"


def fmt_date(dt: datetime) -> str:
    return dt.strftime("%b %-d, %Y") if sys.platform != "win32" else dt.strftime("%b %d, %Y").replace(" 0", " ")


def greeting(now: datetime) -> str:
    h = now.hour
    if h < 12:
        return "Good morning"
    if h < 17:
        return "Good afternoon"
    return "Good evening"


def slot_minute(minute: int) -> int:
    if minute < 15:
        return 0
    if minute < 30:
        return 15
    if minute < 45:
        return 30
    return 45


def load_state() -> dict:
    try:
        return json.loads(STATE_PATH.read_text())
    except (OSError, json.JSONDecodeError):
        return {}


def save_state(state: dict) -> None:
    STATE_PATH.parent.mkdir(parents=True, exist_ok=True)
    tmp = STATE_PATH.with_suffix(".tmp")
    tmp.write_text(json.dumps(state, indent=2) + "\n")
    tmp.replace(STATE_PATH)


def skip(reason: str, **extra) -> None:
    payload = {"action": "skip", "reason": reason}
    payload.update(extra)
    print(json.dumps(payload, indent=2))


def main() -> int:
    now = datetime.now(TZ)
    hour_start = now.replace(minute=0, second=0, microsecond=0)
    xml, source = fetch_xml()
    blocks = brownsville_blocks(xml)
    if not blocks:
        skip("no Brownsville items in feed", source=source)
        return 0
    stamp = parse_stamp(" ".join(blocks))
    pending_only = stamp is None and re.search(r"Update Pending", " ".join(blocks), re.I)

    extra = {
        "checkedAt": fmt_clock(now),
        "source": source,
        "lastStamp": fmt_clock(stamp) if stamp else ("Update pending (no clock)" if pending_only else None),
        "currentHour": fmt_hour(hour_start),
    }

    if now.minute < GRACE_MIN:
        skip(
            f"within {GRACE_MIN}-minute grace of {fmt_hour(hour_start)}",
            **extra,
        )
        return 0

    current = True
    if stamp is not None:
        current = stamp >= hour_start
    else:
        # No clock in the feed (all pending / N/A) → treat as not updated this hour.
        current = False

    if current:
        state = load_state()
        if state.get("missingHourKey") == hour_start.isoformat():
            state["resolvedAt"] = now.isoformat()
            save_state(state)
        skip("CBP stamp is for the current hour", **extra)
        return 0

    slot = slot_minute(now.minute)
    alert_key = f"{hour_start.strftime('%Y-%m-%dT%H')}:{slot:02d}"
    state = load_state()
    if state.get("lastAlertKey") == alert_key:
        skip("already emailed this 15-minute slot", **extra, alertKey=alert_key)
        return 0

    follow_up = state.get("missingHourKey") == hour_start.isoformat()
    last_pub = extra["lastStamp"] or "not published"
    last_date = fmt_date(stamp) if stamp else fmt_date(now)
    missing = fmt_hour(hour_start)
    greet = greeting(now)
    subject_core = f"Brownsville Port of Entry — CBP wait times not updated for {missing}"
    subject = ("Follow-up: " if follow_up else "") + subject_core

    body = f"""{greet},

This is an automated notice from the Brownsville Border Wait Times monitor.

U.S. Customs and Border Protection (CBP) wait times for the Brownsville Port of Entry have not been updated for the {missing} hour.

Details
- Port: Brownsville, Texas (U.S.–Mexico land border)
- Crossings monitored: B&M (Puente Viejo), Gateway (Puente Nuevo), Veterans International (Puente Los Tomates), and Los Indios (Free Trade Bridge / Puente Lucio Blanco)
- Hour with no new report: {missing}
- Latest published CBP stamp: {last_pub} ({last_date})
- Checked at: {extra["checkedAt"]}
- Source: Public CBP Border Wait Times feed (bwt.cbp.gov)

CBP typically posts land-border wait estimates about once an hour. As of this check, the public feed still reflects the previous hour.

Please disregard this message if wait times for {missing} have already been updated and the public feed has not yet caught up.

This notice is for operational awareness only.

If an update is still missing, a follow-up reminder will be sent in 15 minutes.

Respectfully,
Brownsville Border Wait Times monitor
{SITE}
"""

    state.update(
        {
            "lastAlertKey": alert_key,
            "missingHourKey": hour_start.isoformat(),
            "missingHour": missing,
            "lastSentAt": now.isoformat(),
            "followUp": follow_up,
        }
    )
    save_state(state)

    print(
        json.dumps(
            {
                "action": "send",
                "to": TO,
                "subject": subject,
                "body": body.strip() + "\n",
                "reason": "stale hour after grace",
                "followUp": follow_up,
                "alertKey": alert_key,
                **extra,
            },
            indent=2,
        )
    )
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as e:
        skip(f"checker error: {e}")
        raise SystemExit(0)
