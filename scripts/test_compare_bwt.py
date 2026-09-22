#!/usr/bin/env python3
"""Unit tests for per-bridge lag checks in compare_bwt.py."""

from __future__ import annotations

import os
import sys
import tempfile
import unittest
from datetime import datetime
from pathlib import Path
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parent))
import compare_bwt as c

CHICAGO = c.CHICAGO


def chicago(y, mo, d, h, mi=0):
    return datetime(y, mo, d, h, mi, tzinfo=CHICAGO)


def item(title: str, hours: str, date: str, body: str) -> str:
    return (
        f"<item><title>{title}</title>"
        f"<description>Hours: {hours} &lt;br/&gt; Date: {date} &lt;br/&gt; {body}"
        f"</description></item>"
    )


def feed(*items: str, pub="Thu, 10 Sep 2026 16:00:00 EST") -> str:
    return (
        "<?xml version='1.0' encoding='UTF-8'?>"
        "<rss version='2.0'><channel>"
        "<title>CBP Border Wait Times</title>"
        f"<pubDate>{pub}</pubDate>"
        + "".join(items)
        + "</channel></rss>"
    )


BM = "Brownsville - B&amp;M"
GW = "Brownsville - Gateway"
VA = "Brownsville - Veterans International"
LI = "Brownsville - Los Indios"

FRESH = "General Lanes: At 2:00 pm CDT 10 min delay 1 lane(s) open"
NOON = "General Lanes: At Noon CDT 5 min delay 1 lane(s) open"
PENDING = "General Lanes: Update Pending"
OLD = "General Lanes: At 11:00 am CDT 10 min delay 1 lane(s) open"


def four_bridges(bm=FRESH, gw=FRESH, va=FRESH, li=FRESH, date="9/10/2026"):
    return feed(
        item(BM, "24 hrs/day", date, bm),
        item(GW, "24 hrs/day", date, gw),
        item(VA, "6 am-Midnight", date, va),
        item(LI, "6 am-10 pm", date, li),
    )


AFTERNOON = chicago(2026, 9, 10, 14, 30)  # all four open
EVENING = chicago(2026, 9, 10, 22, 20)  # Los Indios in post-close grace (10pm + 45)
NIGHT = chicago(2026, 9, 10, 23, 10)  # Los Indios closed; Veterans still open
AFTER_MID = chicago(2026, 9, 11, 0, 20)  # Veterans in post-close grace
PREDWN = chicago(2026, 9, 11, 2, 0)  # Veterans + Los Indios closed
JUST_OPEN = chicago(2026, 9, 10, 6, 9)  # 9 min after 6am — still in 10 min grace
OPEN_10 = chicago(2026, 9, 10, 6, 10)  # 10 min after 6am — first-post checks start
OPEN_15 = chicago(2026, 9, 10, 6, 15)  # well after first-post checks start
OPEN_LONG = chicago(2026, 9, 10, 7, 30)  # well after first hourly post


class HoursParsingTests(unittest.TestCase):
    def test_24_hours(self):
        w = c.parse_hours("24 hrs/day")
        self.assertTrue(w.always)
        self.assertEqual(c.hours_status(w, AFTERNOON, 45), "open")
        self.assertEqual(c.hours_status(w, PREDWN, 45), "open")

    def test_los_indios_range(self):
        w = c.parse_hours("6 am-10 pm")
        self.assertFalse(w.always)
        self.assertEqual(w.open_min, 6 * 60)
        self.assertEqual(w.close_min, 22 * 60)
        self.assertEqual(c.hours_status(w, chicago(2026, 9, 10, 6, 0), 45), "open")
        self.assertEqual(c.hours_status(w, chicago(2026, 9, 10, 21, 59), 45), "open")
        self.assertEqual(c.hours_status(w, chicago(2026, 9, 10, 22, 0), 45), "grace")
        self.assertEqual(c.hours_status(w, chicago(2026, 9, 10, 22, 44), 45), "grace")
        self.assertEqual(c.hours_status(w, chicago(2026, 9, 10, 22, 45), 45), "closed")
        self.assertEqual(c.hours_status(w, chicago(2026, 9, 10, 5, 59), 45), "closed")

    def test_veterans_midnight(self):
        w = c.parse_hours("6 am-Midnight")
        self.assertEqual(w.open_min, 6 * 60)
        self.assertEqual(w.close_min, 0)
        self.assertEqual(c.hours_status(w, chicago(2026, 9, 10, 23, 59), 45), "open")
        self.assertEqual(c.hours_status(w, chicago(2026, 9, 11, 0, 0), 45), "grace")
        self.assertEqual(c.hours_status(w, chicago(2026, 9, 11, 0, 44), 45), "grace")
        self.assertEqual(c.hours_status(w, chicago(2026, 9, 11, 0, 45), 45), "closed")
        self.assertEqual(c.hours_status(w, chicago(2026, 9, 11, 2, 0), 45), "closed")
        self.assertEqual(c.hours_status(w, chicago(2026, 9, 11, 6, 0), 45), "open")

    def test_clock_variants(self):
        self.assertEqual(c.parse_clock_to_minutes("Noon"), 12 * 60)
        self.assertEqual(c.parse_clock_to_minutes("midnight"), 0)
        self.assertEqual(c.parse_clock_to_minutes("6:00 am"), 6 * 60)
        self.assertEqual(c.parse_clock_to_minutes("10 p.m."), 22 * 60)
        w = c.parse_hours("6:00 AM to 10:00 PM")
        self.assertEqual((w.open_min, w.close_min), (6 * 60, 22 * 60))


class PendingReadyHelperTests(unittest.TestCase):
    def test_24h_no_stamp_early_hour_is_ready(self):
        w = c.parse_hours("24 hrs/day")
        now = chicago(2026, 9, 11, 1, 0)
        self.assertTrue(c.pending_ready(w, now, None, last_stamp=None))
        self.assertFalse(c.waiting_for_new_hourly_post(now, None))

    def test_24h_previous_hour_stamp_keeps_grace(self):
        w = c.parse_hours("24 hrs/day")
        now = chicago(2026, 9, 11, 1, 5)
        stamp = chicago(2026, 9, 11, 0, 0)
        self.assertFalse(c.pending_ready(w, now, None, last_stamp=stamp))
        self.assertTrue(c.waiting_for_new_hourly_post(now, stamp))

    def test_24h_after_10_is_ready_even_with_previous_stamp(self):
        w = c.parse_hours("24 hrs/day")
        now = chicago(2026, 9, 11, 1, 10)
        stamp = chicago(2026, 9, 11, 0, 0)
        self.assertTrue(c.pending_ready(w, now, None, last_stamp=stamp))

    def test_hourly_post_overdue_at_10_past(self):
        now = chicago(2026, 9, 10, 12, 10)
        stamp = chicago(2026, 9, 10, 11, 0)
        self.assertTrue(c.hourly_post_overdue(now, stamp))
        self.assertFalse(c.hourly_post_overdue(chicago(2026, 9, 10, 12, 9), stamp))
        self.assertFalse(c.hourly_post_overdue(now, chicago(2026, 9, 10, 12, 0)))


class StampAndPendingTests(unittest.TestCase):
    def test_noon_and_numeric_stamps(self):
        xml = four_bridges(bm=NOON, date="9/10/2026")
        items = c.parse_bridge_items(xml, AFTERNOON)
        stamp = items["bm"].newest.astimezone(CHICAGO)
        self.assertEqual(stamp.hour, 12)
        self.assertEqual(stamp.minute, 0)

    def test_pending_only(self):
        xml = four_bridges(li=PENDING)
        items = c.parse_bridge_items(xml, AFTERNOON)
        self.assertTrue(items["los_indios"].pending_only)
        self.assertFalse(items["bm"].pending_only)

    def test_pending_plus_delay_is_not_pending_only(self):
        body = "General Lanes: At 2:00 pm CDT 10 min delay 1 lane(s) open Ready: Update Pending"
        xml = four_bridges(li=body)
        items = c.parse_bridge_items(xml, AFTERNOON)
        self.assertFalse(items["los_indios"].pending_only)

    def test_no_channel_pubdate_fallback_per_item(self):
        xml = four_bridges(li=PENDING)
        items = c.parse_bridge_items(xml, AFTERNOON)
        self.assertIsNone(items["los_indios"].newest)


class PerBridgeEvaluateTests(unittest.TestCase):
    def checks(self, cbp, site, now, worker="", max_lag=75, grace=45):
        return c.evaluate_bridges(cbp, site, worker, max_lag, grace, now=now)

    def by_id(self, results):
        return {r.bridge_id: r for r in results}

    def test_all_fresh_afternoon(self):
        xml = four_bridges()
        results = self.checks(xml, xml, AFTERNOON)
        self.assertTrue(all(r.ok for r in results))
        self.assertTrue(all(r.status == "open" for r in results))
        lagging, reason, _, names = c.summarize(results)
        self.assertFalse(lagging)
        self.assertEqual(reason, "fresh")
        self.assertEqual(names, "")

    def test_one_bridge_behind_fails(self):
        cbp = four_bridges()
        site = four_bridges(va=OLD)
        results = self.by_id(self.checks(cbp, site, AFTERNOON))
        self.assertIn("site_behind", results["veterans"].problems)
        self.assertTrue(results["bm"].ok)
        self.assertTrue(results["gateway"].ok)
        self.assertTrue(results["los_indios"].ok)
        ordered = self.checks(cbp, site, AFTERNOON)
        lagging, reason, _, names = c.summarize(ordered)
        self.assertTrue(lagging)
        self.assertIn("site_behind", reason)
        self.assertEqual(names, "Veterans")

    def test_site_pending_while_open_is_stale(self):
        cbp = four_bridges()
        site = four_bridges(li=PENDING)
        ordered = self.checks(cbp, site, AFTERNOON)
        li = self.by_id(ordered)["los_indios"]
        self.assertIn("site_pending", li.problems)
        lagging, reason, _, names = c.summarize(ordered)
        self.assertTrue(lagging)
        self.assertIn("site_pending", reason)
        self.assertEqual(names, "Los_Indios")

    def test_both_pending_while_open_is_stale(self):
        """Old global checker treated matching Update Pending as OK. Not anymore."""
        xml = four_bridges(bm=PENDING, gw=PENDING, va=PENDING, li=PENDING)
        ordered = self.checks(xml, xml, AFTERNOON)
        self.assertTrue(all("cbp_pending" in r.problems for r in ordered))
        lagging, reason, _, _ = c.summarize(ordered)
        self.assertTrue(lagging)
        self.assertIn("cbp_pending", reason)

    def test_pending_while_closed_is_skipped(self):
        night = "General Lanes: At 1:00 am CDT 5 min delay 1 lane(s) open"
        xml = feed(
            item(BM, "24 hrs/day", "9/11/2026", night),
            item(GW, "24 hrs/day", "9/11/2026", PENDING),
            item(VA, "6 am-Midnight", "9/10/2026", PENDING),
            item(LI, "6 am-10 pm", "9/10/2026", PENDING),
        )
        ordered = self.checks(xml, xml, PREDWN, grace=45)
        by = self.by_id(ordered)
        self.assertEqual(by["los_indios"].status, "closed")
        self.assertTrue(by["los_indios"].skipped)
        self.assertFalse(by["los_indios"].problems)
        self.assertEqual(by["veterans"].status, "closed")
        self.assertTrue(by["veterans"].skipped)
        self.assertEqual(by["bm"].status, "open")
        self.assertFalse(by["bm"].problems)
        self.assertEqual(by["gateway"].status, "open")
        # No current-hour stamp: overnight Pending is stale at :00, not re-graced.
        self.assertIn("cbp_pending", by["gateway"].problems)

    def test_post_close_grace_skips_frozen_stamp(self):
        # Last-open 10pm stamp, now 10:20pm — would look stale if still "open".
        body = "General Lanes: At 9:00 pm CDT 5 min delay 1 lane(s) open"
        xml = four_bridges(li=body, date="9/10/2026")
        ordered = self.checks(xml, xml, EVENING, grace=45)
        li = self.by_id(ordered)["los_indios"]
        self.assertEqual(li.status, "grace")
        self.assertTrue(li.skipped)
        self.assertFalse(li.problems)
        va = self.by_id(ordered)["veterans"]
        self.assertEqual(va.status, "open")

    def test_veterans_grace_after_midnight(self):
        body = "General Lanes: At 11:00 pm CDT 5 min delay 1 lane(s) open"
        xml = four_bridges(va=body, date="9/10/2026")
        ordered = self.checks(xml, xml, AFTER_MID, grace=45)
        va = self.by_id(ordered)["veterans"]
        self.assertEqual(va.status, "grace")
        self.assertTrue(va.skipped)

    def test_cbp_stuck_while_open(self):
        xml = four_bridges(gw="General Lanes: At 11:00 am CDT 10 min delay 1 lane(s) open")
        ordered = self.checks(xml, xml, AFTERNOON)
        gw = self.by_id(ordered)["gateway"]
        self.assertIn("cbp_stuck", gw.problems)
        lagging, reason, _, names = c.summarize(ordered)
        self.assertTrue(lagging)
        self.assertEqual(names, "Gateway")

    def test_early_open_does_not_flag_overnight_stamp(self):
        overnight = "General Lanes: At 10:00 pm CDT 5 min delay 1 lane(s) open"
        xml = four_bridges(va=overnight, li=overnight, date="9/9/2026")
        # Need today's 24h stamps so B&M/Gateway are not stuck.
        xml = feed(
            item(BM, "24 hrs/day", "9/10/2026", "General Lanes: At 6:00 am CDT 5 min delay 1 lane(s) open"),
            item(GW, "24 hrs/day", "9/10/2026", "General Lanes: At 6:00 am CDT 5 min delay 1 lane(s) open"),
            item(VA, "6 am-Midnight", "9/9/2026", overnight),
            item(LI, "6 am-10 pm", "9/9/2026", overnight),
        )
        ordered = self.checks(xml, xml, JUST_OPEN)
        by = self.by_id(ordered)
        self.assertEqual(by["veterans"].status, "open")
        self.assertFalse(by["veterans"].problems)
        self.assertFalse(by["los_indios"].problems)

    def test_early_open_pending_on_both_is_ok(self):
        xml = feed(
            item(BM, "24 hrs/day", "9/10/2026", FRESH.replace("2:00 pm", "6:00 am")),
            item(GW, "24 hrs/day", "9/10/2026", FRESH.replace("2:00 pm", "6:00 am")),
            item(VA, "6 am-Midnight", "9/10/2026", PENDING),
            item(LI, "6 am-10 pm", "9/10/2026", PENDING),
        )
        ordered = self.checks(xml, xml, JUST_OPEN)
        by = self.by_id(ordered)
        self.assertFalse(by["veterans"].problems)
        self.assertFalse(by["los_indios"].problems)

    def test_limited_hours_pending_10_min_after_open_is_stale(self):
        xml = feed(
            item(BM, "24 hrs/day", "9/10/2026", FRESH.replace("2:00 pm", "6:00 am")),
            item(GW, "24 hrs/day", "9/10/2026", FRESH.replace("2:00 pm", "6:00 am")),
            item(VA, "6 am-Midnight", "9/10/2026", PENDING),
            item(LI, "6 am-10 pm", "9/10/2026", PENDING),
        )
        ordered = self.checks(xml, xml, OPEN_10)
        by = self.by_id(ordered)
        self.assertIn("cbp_pending", by["veterans"].problems)
        self.assertIn("cbp_pending", by["los_indios"].problems)

    def test_limited_hours_overnight_stamp_10_min_after_open_is_stuck(self):
        overnight = "General Lanes: At 10:00 pm CDT 5 min delay 1 lane(s) open"
        xml = feed(
            item(BM, "24 hrs/day", "9/10/2026", "General Lanes: At 6:00 am CDT 5 min delay 1 lane(s) open"),
            item(GW, "24 hrs/day", "9/10/2026", "General Lanes: At 6:00 am CDT 5 min delay 1 lane(s) open"),
            item(VA, "6 am-Midnight", "9/9/2026", overnight),
            item(LI, "6 am-10 pm", "9/9/2026", overnight),
        )
        ordered = self.checks(xml, xml, OPEN_10)
        by = self.by_id(ordered)
        self.assertIn("cbp_stuck", by["veterans"].problems)
        self.assertIn("cbp_stuck", by["los_indios"].problems)

    def test_after_open_grace_pending_is_stale(self):
        xml = feed(
            item(BM, "24 hrs/day", "9/10/2026", FRESH.replace("2:00 pm", "7:00 am")),
            item(GW, "24 hrs/day", "9/10/2026", FRESH.replace("2:00 pm", "7:00 am")),
            item(VA, "6 am-Midnight", "9/10/2026", PENDING),
            item(LI, "6 am-10 pm", "9/10/2026", PENDING),
        )
        ordered = self.checks(xml, xml, OPEN_LONG)
        by = self.by_id(ordered)
        self.assertIn("cbp_pending", by["veterans"].problems)
        self.assertIn("cbp_pending", by["los_indios"].problems)

    def test_24h_pending_carryover_at_1am_is_stale(self):
        """1:00 AM + Update Pending with no current-hour stamp is carry-over."""
        xml = four_bridges(bm=PENDING, gw=PENDING, date="9/11/2026")
        now = chicago(2026, 9, 11, 1, 0)
        ordered = self.checks(xml, xml, now)
        by = self.by_id(ordered)
        self.assertIn("cbp_pending", by["bm"].problems)
        self.assertIn("cbp_pending", by["gateway"].problems)
        self.assertIn("site_pending", by["bm"].problems)
        self.assertIn("site_pending", by["gateway"].problems)
        lagging, reason, _, names = c.summarize(ordered)
        self.assertTrue(lagging)
        self.assertIn("cbp_pending", reason)
        self.assertIn("B&M", names)
        self.assertIn("Gateway", names)

    def test_24h_pending_no_stamp_early_in_hour_is_stale(self):
        """Grace no longer resets every clock hour when there is no usable stamp."""
        xml = four_bridges(bm=PENDING, gw=PENDING, date="9/11/2026")
        now = chicago(2026, 9, 11, 2, 5)
        ordered = self.checks(xml, xml, now)
        by = self.by_id(ordered)
        self.assertIn("cbp_pending", by["bm"].problems)
        self.assertIn("cbp_pending", by["gateway"].problems)
        lagging, reason, _, _ = c.summarize(ordered)
        self.assertTrue(lagging)
        self.assertIn("cbp_pending", reason)

    def test_24h_pending_after_fresh_previous_hour_stamp_keeps_grace(self):
        """Just after the hour: last post was last hour, waiting for this hour's post."""
        prev = "General Lanes: At 12:00 am CDT Update Pending"
        xml = four_bridges(bm=prev, gw=prev, date="9/11/2026")
        now = chicago(2026, 9, 11, 1, 5)
        ordered = self.checks(xml, xml, now)
        by = self.by_id(ordered)
        self.assertTrue(by["bm"].cbp_pending)
        self.assertIsNotNone(by["bm"].cbp_stamp)
        self.assertEqual(by["bm"].cbp_stamp.astimezone(CHICAGO).hour, 0)
        self.assertFalse(by["bm"].problems)
        self.assertFalse(by["gateway"].problems)
        lagging, reason, _, _ = c.summarize(ordered)
        self.assertFalse(lagging)
        self.assertEqual(reason, "fresh")

    def test_24h_pending_current_hour_stamp_keeps_grace(self):
        """Current-hour stamp + Pending at :05 is still waiting for this hour's post."""
        cur = "General Lanes: At 1:00 am CDT Update Pending"
        xml = four_bridges(gw=cur, date="9/11/2026")
        now = chicago(2026, 9, 11, 1, 5)
        gw = self.by_id(self.checks(xml, xml, now))["gateway"]
        self.assertTrue(gw.cbp_pending)
        self.assertEqual(gw.cbp_stamp.astimezone(CHICAGO).hour, 1)
        self.assertFalse(gw.problems)

    def test_24h_pending_older_than_previous_hour_is_stale_in_grace(self):
        """Stamp from two hours ago is carry-over, not a wait for this hour's post."""
        older = "General Lanes: At 11:00 pm CDT Update Pending"
        xml = four_bridges(gw=older, date="9/10/2026")
        now = chicago(2026, 9, 11, 1, 5)
        gw = self.by_id(self.checks(xml, xml, now))["gateway"]
        self.assertTrue(gw.cbp_pending)
        self.assertIn("cbp_pending", gw.problems)

    def test_24h_pending_after_hour_grace_is_stale(self):
        xml = four_bridges(bm=PENDING, gw=PENDING, date="9/11/2026")
        now = chicago(2026, 9, 11, 2, 20)
        ordered = self.checks(xml, xml, now)
        by = self.by_id(ordered)
        self.assertIn("cbp_pending", by["bm"].problems)
        self.assertIn("cbp_pending", by["gateway"].problems)
        self.assertIn("site_pending", by["bm"].problems)
        lagging, reason, _, names = c.summarize(ordered)
        self.assertTrue(lagging)
        self.assertIn("cbp_pending", reason)
        self.assertIn("B&M", names)
        self.assertIn("Gateway", names)

    def test_24h_pending_at_exactly_10_is_stale(self):
        xml = four_bridges(gw=PENDING, date="9/11/2026")
        now = chicago(2026, 9, 11, 2, 10)
        gw = self.by_id(self.checks(xml, xml, now))["gateway"]
        self.assertIn("cbp_pending", gw.problems)

    def test_24h_pending_after_10_with_previous_hour_stamp_is_stale(self):
        """After :10, even a fresh previous-hour stamp no longer gets grace."""
        prev = "General Lanes: At 1:00 am CDT Update Pending"
        xml = four_bridges(gw=prev, date="9/11/2026")
        now = chicago(2026, 9, 11, 2, 10)
        gw = self.by_id(self.checks(xml, xml, now))["gateway"]
        self.assertTrue(gw.cbp_pending)
        self.assertIn("cbp_pending", gw.problems)

    def test_11am_wait_still_ok_nine_minutes_past_noon(self):
        """11:00 am wait at 12:09 pm is still inside the 10-minute hourly grace."""
        wait = "General Lanes: At 11:00 am CDT 20 min delay 1 lane(s) open"
        xml = four_bridges(bm=wait, gw=wait, date="9/10/2026")
        now = chicago(2026, 9, 10, 12, 9)
        ordered = self.checks(xml, xml, now)
        by = self.by_id(ordered)
        self.assertFalse(by["bm"].problems)
        self.assertFalse(by["gateway"].problems)
        lagging, reason, _, _ = c.summarize(ordered)
        self.assertFalse(lagging)
        self.assertEqual(reason, "fresh")

    def test_11am_wait_stuck_ten_minutes_past_noon(self):
        """11:00 am wait still showing at 12:10 pm — no new hourly post."""
        wait = "General Lanes: At 11:00 am CDT 20 min delay 1 lane(s) open"
        xml = four_bridges(bm=wait, gw=wait, date="9/10/2026")
        now = chicago(2026, 9, 10, 12, 10)
        ordered = self.checks(xml, xml, now)
        by = self.by_id(ordered)
        self.assertIn("cbp_stuck", by["bm"].problems)
        self.assertIn("cbp_stuck", by["gateway"].problems)
        lagging, reason, _, names = c.summarize(ordered)
        self.assertTrue(lagging)
        self.assertIn("B&M", names)
        self.assertIn("Gateway", names)

    def test_11am_wait_then_pending_stale_ten_minutes_past_noon(self):
        """11:00 am had times; 12:10 pm is Update Pending → alert."""
        prev = "General Lanes: At 11:00 am CDT Update Pending"
        xml = four_bridges(bm=prev, gw=prev, date="9/10/2026")
        now = chicago(2026, 9, 10, 12, 10)
        ordered = self.checks(xml, xml, now)
        by = self.by_id(ordered)
        self.assertIn("cbp_pending", by["bm"].problems)
        self.assertIn("cbp_pending", by["gateway"].problems)
        lagging, reason, _, _ = c.summarize(ordered)
        self.assertTrue(lagging)
        self.assertIn("cbp_pending", reason)

    def test_24h_site_pending_while_cbp_has_times_is_stale_in_hour_grace(self):
        cbp = four_bridges(
            bm="General Lanes: At 2:00 am CDT 5 min delay 1 lane(s) open",
            gw="General Lanes: At 2:00 am CDT 5 min delay 1 lane(s) open",
            date="9/11/2026",
        )
        site = four_bridges(gw=PENDING, date="9/11/2026")
        now = chicago(2026, 9, 11, 2, 5)
        gw = self.by_id(self.checks(cbp, site, now))["gateway"]
        self.assertIn("site_pending", gw.problems)

    def test_site_pending_flagged_when_cbp_has_times(self):
        cbp = four_bridges()
        site = four_bridges(va=PENDING)
        ordered = self.checks(cbp, site, AFTERNOON)
        self.assertIn("site_pending", self.by_id(ordered)["veterans"].problems)

    def test_worker_does_not_affect_pass_fail(self):
        cbp = four_bridges()
        site = four_bridges()
        worker = four_bridges(va=OLD, li=PENDING)
        ordered = self.checks(cbp, site, AFTERNOON, worker=worker)
        self.assertTrue(all(r.ok for r in ordered))
        self.assertIsNotNone(self.by_id(ordered)["veterans"].worker_stamp)


def _assert_verify_log_has_no_rss(test, body: str):
    lowered = body.lower()
    test.assertNotIn("<item", lowered)
    test.assertNotIn("<link", lowered)
    test.assertNotIn("</item>", lowered)
    test.assertNotIn("http", lowered)
    test.assertNotIn("raw rss", lowered)
    test.assertNotIn("http:", body.lower())
    head, sep, log = body.partition("\n\n---\n")
    test.assertTrue(sep)
    test.assertNotIn("---", head)
    test.assertIn("Automated Alert:", head)
    test.assertNotIn("Checked:", head)
    test.assertTrue(log.startswith("Checked:"))
    test.assertIn("CBP pubDate:", log)
    test.assertNotIn("HTTP:", log)


def _rss_item(title: str, hours: str, inner: str, date: str = "9/22/2026") -> str:
    return (
        f"<item><title>{title}</title>"
        "<link>https://bwt.cbp.gov/detail</link>"
        f"<description>Hours: {hours} <br/> Date: {date} <br/> {inner}</description>"
        "</item>"
    )


def _linked_feed(*items: str, pub: str = "Tue, 22 Sep 2026 17:00:53 EST") -> str:
    return (
        "<?xml version='1.0' encoding='UTF-8'?>"
        "<rss version='2.0'><channel>"
        "<title>CBP Border Wait Times</title>"
        "<link>https://bwt.cbp.gov</link>"
        f"<pubDate>{pub}</pubDate>"
        + "".join(items)
        + "</channel></rss>"
    )


class AlertCopyTests(unittest.TestCase):
    def test_pending_groups_24h_bridges(self):
        xml = four_bridges(bm=PENDING, gw=PENDING, date="9/11/2026")
        results = c.evaluate_bridges(xml, xml, "", 75, 45, now=chicago(2026, 9, 11, 2, 20))
        from alert_copy import format_lag_alert
        subject, body = format_lag_alert(
            results,
            now=chicago(2026, 9, 11, 2, 20),
            cbp_http="200",
            site_http="200",
            raw_feed=xml,
        )
        self.assertEqual(
            subject,
            "Brownsville Wait Times Alert — Update Pending (B&M, Gateway) as of 2:00 am CDT",
        )
        self.assertIn("As of 2:20 am CDT, CBP is still showing 'Update Pending'", body)
        self.assertIn("B&M, Gateway", body)
        self.assertIn("If the data has already been updated, you may disregard this notification.", body)
        _assert_verify_log_has_no_rss(self, body)
        self.assertIn("Checked: 2:20 am CDT", body)
        self.assertIn("Overall lag: ? min", body)
        self.assertIn("CBP pubDate: —", body)
        self.assertIn("B&M — Update Pending", body)
        self.assertIn("Gateway — Update Pending", body)

    def test_stale_uses_update_template(self):
        from alert_copy import format_lag_alert
        cbp = four_bridges()
        site = four_bridges(gw=OLD)
        results = c.evaluate_bridges(cbp, site, "", 75, 45, now=AFTERNOON)
        subject, body = format_lag_alert(
            results,
            now=AFTERNOON,
            cbp_http="200",
            site_http="304",
            cbp_pubdate="Thu, 10 Sep 2026 16:00:00 EST",
            raw_feed=cbp,
            lag_minutes="180",
        )
        self.assertEqual(
            subject,
            "Brownsville Wait Times Alert — No New Data Since 11:00 am CDT (Gateway)",
        )
        self.assertIn("the latest published data is still from 11:00 am CDT", body)
        self.assertIn("If the data has already been updated, you may disregard this notification.", body)
        _assert_verify_log_has_no_rss(self, body)
        self.assertIn("Checked: 2:30 pm CDT", body)
        self.assertIn("Overall lag: 180 min", body)
        self.assertIn("CBP pubDate: Thu, 10 Sep 2026 16:00:00 EST", body)
        self.assertIn("Gateway — last posted 11:00 am CDT (210 min behind)", body)
        self.assertNotIn("B&M —", body)
        self.assertNotIn("Veterans —", body)

    def test_verify_log_lists_only_lagging_bridges_without_links(self):
        from alert_copy import format_lag_alert
        bm = (
            "<h4><b> Passenger Vehicles </b></h4> Maximum Lanes: 4 <br/>"
            "General Lanes: At 3:00 pm CDT 60 min delay 1 lane(s) open <br/>"
            "Sentri Lanes: N/A <br/>"
            "Ready Lanes: At 3:00 pm CDT 60 min delay 3 lane(s) open <br/>"
            "<h4><b> Pedestrian </b></h4> Maximum Lanes: 2 <br/>"
            "General Lanes: At 3:00 pm CDT 0 min delay 1 lane(s) open <br/>"
            "Ready Lanes: N/A <br/>"
        )
        gw = (
            "<h4><b> Passenger Vehicles </b></h4> Maximum Lanes: 5 <br/>"
            "General Lanes: At 3:00 pm CDT 75 min delay 1 lane(s) open <br/>"
            "Sentri Lanes: N/A <br/>"
            "Ready Lanes: At 3:00 pm CDT 75 min delay 3 lane(s) open <br/>"
            "<h4><b> Pedestrian </b></h4> Maximum Lanes: 4 <br/>"
            "General Lanes: At 3:00 pm CDT 15 min delay 3 lane(s) open <br/>"
            "Ready Lanes: At 3:00 pm CDT 5 min delay 1 lane(s) open <br/>"
        )
        fresh = "General Lanes: At 4:00 pm CDT 10 min delay 1 lane(s) open"
        xml = _linked_feed(
            _rss_item(BM, "24 hrs/day", bm),
            _rss_item(GW, "24 hrs/day", gw),
            _rss_item(VA, "6 am-Midnight", fresh),
            _rss_item(LI, "6 am-10 pm", fresh),
        )
        now = chicago(2026, 9, 22, 16, 11)
        results = c.evaluate_bridges(xml, xml, "", 75, 45, now=now)
        subject, body = format_lag_alert(
            results,
            now=now,
            cbp_http="200",
            site_http="200",
            cbp_pubdate="Tue, 22 Sep 2026 17:00:53 EST",
            raw_feed=xml,
            lag_minutes="71",
        )
        self.assertIn("Brownsville Wait Times Alert", subject)
        self.assertIn("B&M", subject)
        self.assertIn("Gateway", subject)
        self.assertNotIn("Veterans", subject)
        _assert_verify_log_has_no_rss(self, body)
        log = body.split("\n\n---\n", 1)[1]
        self.assertEqual(
            log,
            "\n".join(
                [
                    "Checked: 4:11 pm CDT",
                    "Overall lag: 71 min",
                    "CBP pubDate: Tue, 22 Sep 2026 17:00:53 EST",
                    "",
                    "B&M — last posted 3:00 pm CDT (71 min behind)",
                    "  Passenger: Gen 60 min / 1 lane · Ready 60 min / 3 lanes",
                    "  Pedestrian: Gen 0 min / 1 lane",
                    "",
                    "Gateway — last posted 3:00 pm CDT (71 min behind)",
                    "  Passenger: Gen 75 min / 1 lane · Ready 75 min / 3 lanes",
                    "  Pedestrian: Gen 15 min / 3 lanes · Ready 5 min / 1 lane",
                    "",
                ]
            ),
        )
        self.assertNotIn("Veterans", log)
        self.assertNotIn("Los Indios", log)
        self.assertNotIn("bwt.cbp.gov", body)
        for r in results:
            r.lane_description = ""
        _subject, fallback = format_lag_alert(
            results,
            now=now,
            cbp_http="200",
            site_http="200",
            cbp_pubdate="Tue, 22 Sep 2026 17:00:53 EST",
            raw_feed=xml,
            lag_minutes="71",
        )
        self.assertEqual(fallback.split("\n\n---\n", 1)[1], log)
        _assert_verify_log_has_no_rss(self, fallback)

    def test_sentri_excerpt_skips_closed_ready_and_commercial(self):
        from alert_copy import format_lag_alert
        veterans = (
            "<h4><b> Commercial Vehicles </b></h4> "
            "Fast Lanes: At 3:00 pm CDT 90 min delay 1 lane(s) open <br/>"
            "<h4><b> Passenger Vehicles </b></h4> "
            "General Lanes: At 3:00 pm CDT 120 min delay 1 lane(s) open <br/>"
            "Sentri Lanes: At 3:00 pm CDT 15 min delay 2 lane(s) open <br/>"
            "Ready Lanes: Lanes Closed <br/>"
            "<h4><b> Pedestrian </b></h4> "
            "General Lanes: At 3:00 pm CDT 0 min delay 1 lane(s) open <br/>"
            "Ready Lanes: N/A <br/>"
        )
        fresh = "General Lanes: At 4:00 pm CDT 10 min delay 1 lane(s) open"
        xml = _linked_feed(
            _rss_item(BM, "24 hrs/day", fresh),
            _rss_item(GW, "24 hrs/day", fresh),
            _rss_item(VA, "6 am-Midnight", veterans),
            _rss_item(LI, "6 am-10 pm", fresh),
        )
        now = chicago(2026, 9, 22, 16, 11)
        results = c.evaluate_bridges(xml, xml, "", 75, 45, now=now)
        _subject, body = format_lag_alert(
            results,
            now=now,
            cbp_http="200",
            site_http="200",
            cbp_pubdate="Tue, 22 Sep 2026 17:00:53 EST",
            raw_feed=xml,
            lag_minutes="71",
        )
        _assert_verify_log_has_no_rss(self, body)
        log = body.split("\n\n---\n", 1)[1]
        self.assertIn("Veterans — last posted 3:00 pm CDT (71 min behind)", log)
        self.assertIn("  Passenger: Gen 120 min / 1 lane · SENTRI 15 min / 2 lanes", log)
        self.assertIn("  Pedestrian: Gen 0 min / 1 lane", log)
        self.assertNotIn("Ready", log)
        self.assertNotIn("90 min", log)
        self.assertNotIn("Fast", log)
        self.assertNotIn("B&M —", log)

    def test_site_behind_uses_mirror_lanes_not_cbp_item(self):
        from alert_copy import format_lag_alert
        cbp_gw = (
            "<h4><b> Passenger Vehicles </b></h4> "
            "General Lanes: At 2:00 pm CDT 5 min delay 1 lane(s) open <br/>"
            "Ready Lanes: At 2:00 pm CDT 5 min delay 2 lane(s) open <br/>"
        )
        site_gw = (
            "<h4><b> Passenger Vehicles </b></h4> "
            "General Lanes: At 11:00 am CDT 99 min delay 2 lane(s) open <br/>"
            "Ready Lanes: At 11:00 am CDT 40 min delay 1 lane(s) open <br/>"
            "<link>https://bwt.cbp.gov/should-not-appear</link>"
        )
        fresh = FRESH
        day = "9/10/2026"
        cbp = _linked_feed(
            _rss_item(BM, "24 hrs/day", fresh, day),
            _rss_item(GW, "24 hrs/day", cbp_gw, day),
            _rss_item(VA, "6 am-Midnight", fresh, day),
            _rss_item(LI, "6 am-10 pm", fresh, day),
            pub="Thu, 10 Sep 2026 16:00:00 EST",
        )
        site = _linked_feed(
            _rss_item(BM, "24 hrs/day", fresh, day),
            _rss_item(GW, "24 hrs/day", site_gw, day),
            _rss_item(VA, "6 am-Midnight", fresh, day),
            _rss_item(LI, "6 am-10 pm", fresh, day),
        )
        results = c.evaluate_bridges(cbp, site, "", 75, 45, now=AFTERNOON)
        _subject, body = format_lag_alert(
            results,
            now=AFTERNOON,
            cbp_http="200",
            site_http="200",
            cbp_pubdate="Thu, 10 Sep 2026 16:00:00 EST",
            raw_feed=cbp,
            lag_minutes="180",
        )
        _assert_verify_log_has_no_rss(self, body)
        log = body.split("\n\n---\n", 1)[1]
        self.assertIn("Gateway — last posted 11:00 am CDT (210 min behind)", log)
        self.assertIn("  Passenger: Gen 99 min / 2 lanes · Ready 40 min / 1 lane", log)
        self.assertNotIn("5 min", log)
        self.assertNotIn("B&M —", log)
        for r in results:
            r.lane_description = ""
        _subject, stripped = format_lag_alert(
            results,
            now=AFTERNOON,
            cbp_http="200",
            site_http="200",
            cbp_pubdate="Thu, 10 Sep 2026 16:00:00 EST",
            raw_feed=cbp,
            lag_minutes="180",
        )
        stripped_log = stripped.split("\n\n---\n", 1)[1]
        self.assertIn("Gateway — last posted 11:00 am CDT (210 min behind)", stripped_log)
        self.assertNotIn("99 min", stripped_log)
        self.assertNotIn("5 min", stripped_log)
        _assert_verify_log_has_no_rss(self, stripped)

    def test_sentri_copy(self):
        from alert_copy import format_sentri_alert
        subject, body = format_sentri_alert(
            30, 2, now=AFTERNOON, raw="At 2:00 pm CDT 30 min delay 2 lane(s) open"
        )
        self.assertEqual(subject, "SENTRI 2:30 pm CDT — Veterans, 30 min, 2 lanes")
        self.assertIn("Action: Contact duty supervisor", body)
        self.assertIn("Time: 2:30 pm CDT", body)
        self.assertIn("SENTRI wait: 30 minutes", body)
        self.assertIn("Lanes open: 2", body)
        self.assertIn("Required: 4 lanes if wait is 30 minutes or more", body)
        self.assertIn("Ask why 4 SENTRI lanes are not open.", body)
        self.assertIn("If reason is already known: disregard", body)


class CliOutputTests(unittest.TestCase):
    def test_compare_and_recheck_outputs(self):
        cbp = four_bridges()
        site_bad = four_bridges(gw=OLD)
        with tempfile.TemporaryDirectory() as td:
            out = Path(td) / "github_output"
            env = {"GITHUB_OUTPUT": str(out)}
            with patch.dict(os.environ, env, clear=False):
                if out.exists():
                    out.unlink()
                c.compare(cbp, site_bad, "", 75, 45, now=AFTERNOON)
                text = out.read_text()
                self.assertIn("lagging=true", text)
                self.assertIn("lagging_bridges=Gateway", text)
                self.assertIn("reason=site_behind", text)

                out.write_text("")
                c.recheck(cbp, cbp, 75, 45, now=AFTERNOON)
                text = out.read_text()
                self.assertIn("still_lagging=false", text)

                out.write_text("")
                c.recheck(cbp, site_bad, 75, 45, now=AFTERNOON)
                text = out.read_text()
                self.assertIn("still_lagging=true", text)
                self.assertIn("lagging_bridges=Gateway", text)

    def test_live_repo_mirror_parses_four_bridges(self):
        xml = Path(__file__).resolve().parents[1].joinpath("data", "bwt.xml").read_text()
        items = c.parse_bridge_items(xml, AFTERNOON)
        self.assertEqual(set(items), {"bm", "gateway", "veterans", "los_indios"})
        for spec in c.BRIDGES:
            it = items[spec["id"]]
            self.assertTrue(it.hours_text)
            self.assertTrue(it.stamps or it.pending_only)


if __name__ == "__main__":
    unittest.main()
