#!/usr/bin/env python3
"""Static wait-time HTML bake and crowdsource toggle contract."""

from __future__ import annotations

import sys
import tempfile
import unittest
from datetime import datetime
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

import bake_static_waits as bake
import bwt_rss as rss

ROOT = Path(__file__).resolve().parents[1]
CHICAGO = rss.CHICAGO


def item(title: str, hours: str, date: str, body: str) -> str:
    return (
        f"<item><title>{title}</title>"
        f"<description>Hours: {hours} <br/> Date: {date} <br/> {body}</description>"
        "</item>"
    )


def feed(*items: str, pub: str = "Mon, 09 Nov 2026 10:05:00 CST") -> str:
    return (
        "<?xml version='1.0' encoding='UTF-8'?>"
        "<rss version='2.0'><channel><title>CBP Border Wait Times</title>"
        f"<pubDate>{pub}</pubDate>"
        + "".join(items)
        + "</channel></rss>"
    )


FIXTURE = feed(
    item(
        "Brownsville - B&amp;M",
        "24 hrs/day",
        "11/9/2026",
        "<h4><b>Passenger Vehicles</b></h4> "
        "General Lanes: At 9:00 am CST 17 min delay 2 lane(s) open "
        "Sentri Lanes: N/A "
        "Ready Lanes: At 9:00 am CST 19 min delay 1 lane(s) open "
        "<h4><b>Pedestrian</b></h4> "
        "General Lanes: At 9:00 am CST 3 min delay 1 lane(s) open "
        "Ready Lanes: N/A",
    ),
    item(
        "Brownsville - Gateway",
        "24 hrs/day",
        "11/9/2026",
        "<h4><b>Passenger Vehicles</b></h4> "
        "General Lanes: At 9:00 am CST 23 min delay 3 lane(s) open "
        "Ready Lanes: Lanes Closed "
        "Sentri Lanes: N/A",
    ),
    item(
        "Brownsville - Veterans International",
        "6 am-Midnight",
        "11/9/2026",
        "<h4><b>Passenger Vehicles</b></h4> "
        "General Lanes: At 9:00 am CST 41 min delay 3 lane(s) open "
        "Sentri Lanes: At 9:00 am CST 5 min delay 2 lane(s) open "
        "<h4><b>Commercial Vehicles</b></h4> "
        "General Lanes: At 9:00 am CST 11 min delay 1 lane(s) open "
        "Fast Lanes: Update Pending",
    ),
    item(
        "Brownsville - Los Indios",
        "6 am-10 pm",
        "11/9/2026",
        "<h4><b>Passenger Vehicles</b></h4> "
        "General Lanes: At 9:00 am CST 8 min delay 1 lane(s) open "
        "Ready Lanes: At 9:00 am CST 8 min delay 1 lane(s) open",
    ),
)


class BakeStaticWaitsTest(unittest.TestCase):
    def setUp(self) -> None:
        self.page = (ROOT / "index.html").read_text(encoding="utf-8")
        self.now = datetime(2026, 11, 9, 15, 30, tzinfo=CHICAGO)

    def test_markers_exist_in_source(self) -> None:
        for name in bake.MARKERS:
            self.assertIn(f"<!--bwt:{name}-->", self.page)
            self.assertIn(f"<!--/bwt:{name}-->", self.page)
        grid = self.page.split('id="portGrid"', 1)[1].split("</div>", 1)[0]
        self.assertNotIn("17 min", grid)

    def test_bake_writes_numbers_and_timestamp(self) -> None:
        baked = bake.bake(self.page, FIXTURE, self.now)
        grid = baked.split('id="portGrid"', 1)[1].split("<script", 1)[0]
        self.assertIn('class="static-waits"', grid)
        self.assertIn("B&amp;M", grid)
        self.assertIn("Puente Viejo", grid)
        self.assertIn("Vehicles 17 min (2 lanes open)", grid)
        self.assertIn("Ready 19 min", grid)
        self.assertIn("Pedestrian 3 min", grid)
        self.assertNotIn("SENTRI N/A", grid)
        self.assertIn("Gateway", grid)
        self.assertIn("Vehicles 23 min", grid)
        self.assertIn("Ready closed", grid)
        self.assertIn("Veterans", grid)
        self.assertIn("Vehicles 41 min", grid)
        self.assertIn("SENTRI 5 min", grid)
        self.assertIn("Commercial 11 min", grid)
        self.assertIn("FAST update pending", grid)
        self.assertIn("Los Indios", grid)
        self.assertIn("Vehicles 8 min", grid)
        self.assertIn("Updated Nov 9, 2026 · 9:00 am CST", grid)
        self.assertIn('datetime="2026-11-09T09:00-06:00"', grid)
        self.assertLess(baked.find("Vehicles 17 min"), baked.find("FALLBACK_RSS"))

        asof = baked.split('id="asofStamp"', 1)[1].split("</strong>", 1)[0]
        self.assertIn("Nov 9, 2026 · 9:00 am CST", asof)
        short = baked.split('id="statShort"', 1)[1].split("</div>", 1)[0]
        long = baked.split('id="statLong"', 1)[1].split("</div>", 1)[0]
        self.assertIn("8 min", short)
        self.assertIn("41 min", long)
        self.assertIn("Los Indios · general lanes", baked)
        self.assertIn("Veterans · general lanes", baked)

        again = bake.bake(baked, FIXTURE, self.now)
        self.assertEqual(again, baked)

    def test_bake_roundtrip_file(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            html_path = Path(tmp) / "index.html"
            xml_path = Path(tmp) / "bwt.xml"
            html_path.write_text(self.page, encoding="utf-8")
            xml_path.write_text(FIXTURE, encoding="utf-8")
            self.assertEqual(bake.main(["bake", str(html_path), str(xml_path)]), 0)
            text = html_path.read_text(encoding="utf-8")
            self.assertIn("Vehicles 17 min", text)
            self.assertLess(text.find("Vehicles 17 min"), text.find("FALLBACK_RSS"))

    def test_committed_mirror_bakes_four_bridges(self) -> None:
        xml = (ROOT / "data" / "bwt.xml").read_text(encoding="utf-8")
        fields = bake.build_fields(xml, self.now)
        for name in ("B&amp;M", "Gateway", "Veterans", "Los Indios"):
            self.assertIn(name, fields["ports"])
        self.assertRegex(fields["ports"], r"\d+ min")
        self.assertIn("Updated", fields["ports"])
        self.assertRegex(fields["asof"], r"\d{4}")

    def test_missing_marker_fails(self) -> None:
        with self.assertRaises(SystemExit):
            bake.bake("<html></html>", FIXTURE, self.now)

    def test_deploy_does_not_commit_html(self) -> None:
        stage = (ROOT / "scripts" / "stage-site.sh").read_text(encoding="utf-8")
        workflow = (ROOT / ".github" / "workflows" / "update-wait-times.yml").read_text(encoding="utf-8")
        deploy = (ROOT / ".github" / "workflows" / "deploy-pages.yml").read_text(encoding="utf-8")
        self.assertIn("bake_static_waits.py", stage)
        self.assertIn("workflow_dispatch", workflow)
        self.assertIn("10,25,40 * * * *", workflow)
        self.assertIn("actions/deploy-pages@", workflow)
        self.assertNotIn("git add index.html", workflow)
        self.assertNotIn("index.html", workflow.split("git add", 1)[1].split("\n", 1)[0])
        self.assertIn("stage-site.sh", deploy)

    def test_crowd_toggle_contract(self) -> None:
        html = self.page
        summary = html.split("function crowdSectionHtml()", 1)[1].split("function ensureCrowdSection", 1)[0]
        summary_open = summary.split("<summary", 1)[1].split("</summary>", 1)[0]
        self.assertNotIn("crowd-collapse", summary_open)
        self.assertIn('class="crowd-collapse"', summary)
        self.assertIn("aria-expanded", summary)
        self.assertIn("aria-controls", summary)
        toggle = html.split("function openCrowdReport(", 1)[1].split("function driveWaitTone", 1)[0]
        self.assertIn("willOpen", toggle)
        self.assertIn("box.open = willOpen", toggle)
        self.assertIn("function openCrowdFromHash(", toggle)
        self.assertIn("syncCrowdAria", html)
        self.assertIn('aria-controls="crowdSource"', html)
        self.assertIn("crowdCollapse", html)
        self.assertIn("Contraer", html)
        self.assertIn(".crowd-source:not([open]) > .crowd-collapse { display: none; }", html)


if __name__ == "__main__":
    unittest.main()
