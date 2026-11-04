import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {
  NORTHBOUND_ANCHORS,
  NORTHBOUND_GAP_MI,
  nearestNorthboundBridge,
  northboundIntoUs
} from "./northbound.js";

describe("northboundIntoUs", () => {
  it("accepts the Mexican side of each Brownsville bridge", () => {
    assert.equal(northboundIntoUs(NORTHBOUND_ANCHORS.veterans, { lat: 25.87217, lng: -97.47561 }), true);
    assert.equal(northboundIntoUs(NORTHBOUND_ANCHORS.gateway, { lat: 25.896694, lng: -97.497972 }), true);
    assert.equal(northboundIntoUs(NORTHBOUND_ANCHORS.bm, { lat: 25.887493, lng: -97.505497 }), true);
    assert.equal(northboundIntoUs(NORTHBOUND_ANCHORS["los-indios"], { lat: 26.022, lng: -97.739 }), true);
  });

  it("accepts a fix at the U.S. booth", () => {
    const booth = NORTHBOUND_ANCHORS.veterans;
    assert.equal(northboundIntoUs(booth, booth), true);
  });

  it("rejects a fix already north of the booth in the U.S.", () => {
    assert.equal(northboundIntoUs(NORTHBOUND_ANCHORS.veterans, { lat: 25.91, lng: -97.476 }), false);
    assert.equal(northboundIntoUs(NORTHBOUND_ANCHORS.bm, { lat: 25.901986, lng: -97.505497 }), false);
    assert.equal(northboundIntoUs(NORTHBOUND_ANCHORS["los-indios"], { lat: 26.048, lng: -97.738 }), false);
  });

  it("rejects a southbound heading on the Mexican approach", () => {
    const mx = { lat: 25.87217, lng: -97.47561 };
    assert.equal(northboundIntoUs(NORTHBOUND_ANCHORS.veterans, mx, 180), false);
    assert.equal(northboundIntoUs(NORTHBOUND_ANCHORS.veterans, mx, 10), true);
    assert.equal(northboundIntoUs(NORTHBOUND_ANCHORS.veterans, mx, null), true);
  });

  it("rejects a missing fix or a fix too coarse to trust the side of the river", () => {
    assert.equal(northboundIntoUs(NORTHBOUND_ANCHORS.gateway, null), false);
    assert.equal(northboundIntoUs(NORTHBOUND_ANCHORS.gateway, { lat: 25.896694, lng: -97.497972, acc: 800 }), false);
  });
});

describe("nearestNorthboundBridge", () => {
  it("picks the booth the phone is actually approaching", () => {
    assert.equal(nearestNorthboundBridge({ lat: 25.896694, lng: -97.497972, acc: 20 }).id, "gateway");
    assert.equal(nearestNorthboundBridge({ lat: 25.887493, lng: -97.505497, acc: 20 }).id, "bm");
    assert.equal(nearestNorthboundBridge({ lat: 25.87217, lng: -97.47561, acc: 20 }).id, "veterans");
    assert.equal(nearestNorthboundBridge({ lat: 26.022, lng: -97.739, acc: 20 }).id, "los-indios");
  });

  it("does not pick a bridge on the U.S. side or when two booths are too close to call", () => {
    assert.equal(nearestNorthboundBridge({ lat: 25.91, lng: -97.48, acc: 20 }), null);
    // Mexican approach equidistant from the B&M and Gateway booths.
    const tie = { lat: 25.88775, lng: -97.49405, acc: 20 };
    const pick = nearestNorthboundBridge(tie);
    assert.equal(pick && pick.ambiguous, true);
    assert.equal(pick.id, "");
    assert.equal(NORTHBOUND_GAP_MI, 0.05);
  });

  it("keeps a clear nearer booth unless the phone accuracy covers the gap", () => {
    const point = { lat: 25.886, lng: -97.4949 };
    const clear = nearestNorthboundBridge(Object.assign({ acc: 20 }, point));
    assert.equal(clear.id, "bm");
    assert.equal(clear.ambiguous, false);
    const wide = nearestNorthboundBridge(Object.assign({ acc: 200 }, point));
    assert.equal(wide.ambiguous, true);
    assert.equal(wide.id, "");
  });
});

describe("homepage copies the same booth anchors", () => {
  it("keeps the page filter on the same U.S. booths", () => {
    const html = fs.readFileSync(new URL("../../index.html", import.meta.url), "utf8");
    for (const point of Object.values(NORTHBOUND_ANCHORS)) {
      assert.match(html, new RegExp(String(point.lat)));
      assert.match(html, new RegExp(String(point.lng).replace("-", "\\-")));
    }
    assert.match(html, /NORTHBOUND_GAP_MI = 0\.05/);
  });
});
