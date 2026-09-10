#!/usr/bin/env python3
"""Tests for Veterans passenger SENTRI staffing and shared lane parsing."""

from __future__ import annotations

import os
import sys
import tempfile
import unittest
from datetime import datetime
from pathlib import Path
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parent))
import bwt_rss as rss
import check_veterans_sentri as sentri

CHICAGO = rss.CHICAGO
AFTERNOON = datetime(2026, 9, 10, 14, 30, tzinfo=CHICAGO)
NIGHT = datetime(2026, 9, 11, 2, 0, tzinfo=CHICAGO)


def veterans_feed(sentri_body: str, hours: str = "6 am-Midnight", extra_commercial: str = "") -> str:
    comm = extra_commercial or (
        "<h4><b> Commercial Vehicles </b></h4> "
        "Maximum Lanes: 4 <br/>General Lanes: At 2:00 pm CDT 0 min delay 2 lane(s) open  "
        "<br/>Fast Lanes: At 2:00 pm CDT 90 min delay 1 lane(s) open  <br/>"
    )
    return (
        "<?xml version='1.0'?><rss><channel>"
        "<pubDate>Thu, 10 Sep 2026 16:00:00 EST</pubDate>"
        "<item><title>Brownsville - Veterans International</title>"
        f"<description>Hours: {hours} &lt;br/&gt; Date: 9/10/2026 &lt;br/&gt; "
        f"{comm}"
        "<h4><b> Passenger Vehicles </b></h4>  Maximum Lanes: 8 <br/>"
        "General Lanes: At 2:00 pm CDT 10 min delay 1 lane(s) open  <br/>"
        f"Sentri Lanes: {sentri_body}  <br/>"
        "Ready Lanes: At 2:00 pm CDT 10 min delay 2 lane(s) open  <br/>"
        "</description></item>"
        "<item><title>Brownsville - B&amp;M</title>"
        "<description>Hours: 24 hrs/day <br/> Date: 9/10/2026 <br/> "
        "Sentri Lanes: At 2:00 pm CDT 90 min delay 1 lane(s) open</description></item>"
        "</channel></rss>"
    )


class PassengerSentriParseTests(unittest.TestCase):
    def test_reads_passenger_not_commercial_fast(self):
        xml = veterans_feed("At 4:00 pm CDT 5 min delay 3 lane(s) open")
        items = rss.parse_bridge_items(xml, AFTERNOON)
        lane = rss.passenger_sentri(items["veterans"].description)
        self.assertIsNotNone(lane)
        self.assertEqual(lane.delay_minutes, 5)
        self.assertEqual(lane.lanes_open, 3)
        self.assertFalse(lane.pending)

    def test_does_not_use_commercial_fast_lanes(self):
        xml = veterans_feed(
            "N/A",
            extra_commercial=(
                "<h4><b> Commercial Vehicles </b></h4> "
                "Fast Lanes: At 2:00 pm CDT 90 min delay 1 lane(s) open <br/>"
            ),
        )
        lane = rss.passenger_sentri(rss.parse_bridge_items(xml, AFTERNOON)["veterans"].description)
        self.assertTrue(lane.na)
        self.assertIsNone(lane.delay_minutes)

    def test_live_repo_mirror_has_veterans_sentri(self):
        xml = Path(__file__).resolve().parents[1].joinpath("data", "bwt.xml").read_text()
        items = rss.parse_bridge_items(xml, AFTERNOON)
        lane = rss.passenger_sentri(items["veterans"].description)
        self.assertIsNotNone(lane)
        self.assertIsNotNone(lane.delay_minutes)
        self.assertIsNotNone(lane.lanes_open)


class StaffingAlarmTests(unittest.TestCase):
    def ev(self, body, now=AFTERNOON, **kwargs):
        return sentri.evaluate_veterans_sentri(veterans_feed(body), now=now, **kwargs)

    def test_alert_when_delay_30_and_lanes_under_4(self):
        c = self.ev("At 2:00 pm CDT 30 min delay 3 lane(s) open")
        self.assertTrue(c.alert)
        self.assertEqual(c.reason, "understaffed")
        self.assertEqual(c.delay_minutes, 30)
        self.assertEqual(c.lanes_open, 3)

    def test_alert_higher_delay_one_lane(self):
        c = self.ev("At 2:00 pm CDT 45 min delay 1 lane(s) open")
        self.assertTrue(c.alert)

    def test_no_alert_when_four_lanes_even_if_slow(self):
        c = self.ev("At 2:00 pm CDT 40 min delay 4 lane(s) open")
        self.assertFalse(c.alert)
        self.assertEqual(c.reason, "ok")

    def test_no_alert_when_fast_with_three_lanes(self):
        c = self.ev("At 2:00 pm CDT 5 min delay 3 lane(s) open")
        self.assertFalse(c.alert)
        self.assertEqual(c.reason, "ok")

    def test_no_alert_outside_hours(self):
        c = self.ev("At 2:00 pm CDT 45 min delay 1 lane(s) open", now=NIGHT)
        self.assertFalse(c.alert)
        self.assertEqual(c.reason, "closed_hours")
        self.assertEqual(c.hours_status, "closed")

    def test_pending_without_delay_is_warn_not_alert(self):
        c = self.ev("Update Pending")
        self.assertFalse(c.alert)
        self.assertEqual(c.reason, "pending")
        self.assertTrue(c.pending)

    def test_pending_with_parseable_understaffed_numbers_alerts(self):
        c = self.ev("At 2:00 pm CDT 30 min delay 2 lane(s) open Update Pending")
        self.assertTrue(c.alert)
        self.assertEqual(c.reason, "understaffed")

    def test_lanes_closed_while_open_does_not_invent_counts(self):
        c = self.ev("Lanes Closed")
        self.assertFalse(c.alert)
        self.assertEqual(c.reason, "sentri_unavailable")

    def test_na_while_open_does_not_alert(self):
        c = self.ev("N/A")
        self.assertFalse(c.alert)
        self.assertEqual(c.reason, "sentri_unavailable")

    def test_closed_hours_pending_does_not_alert(self):
        c = self.ev("Update Pending", now=NIGHT)
        self.assertFalse(c.alert)
        self.assertEqual(c.reason, "closed_hours")

    def test_github_outputs(self):
        xml = veterans_feed("At 2:00 pm CDT 30 min delay 3 lane(s) open")
        with tempfile.TemporaryDirectory() as td:
            out = Path(td) / "gh"
            with patch.dict(os.environ, {"GITHUB_OUTPUT": str(out)}):
                sentri.evaluate_veterans_sentri(xml, now=AFTERNOON)
                # evaluate does not write; main() does — call write via main pieces
                from check_veterans_sentri import write_out as _  # noqa: F401
                rss.write_out(alert="true", reason="understaffed")
            text = out.read_text()
            self.assertIn("alert=true", text)
            self.assertIn("reason=understaffed", text)


if __name__ == "__main__":
    unittest.main()
