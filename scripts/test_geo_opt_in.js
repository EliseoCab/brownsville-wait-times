#!/usr/bin/env node
"use strict";

var assert = require("assert");
var geo = require("../geo-opt-in.js");

function plan(partial) {
  return geo.planGeoRequest(Object.assign({ available: true, cached: null, choice: null, permission: null, manual: false }, partial));
}

var cache = { lat: 25.882, lng: -97.478, acc: 30, heading: null, t: 1 };

assert.deepStrictEqual(plan({ available: false }).action, "skip");
assert.strictEqual(plan({ available: false }).showOptIn, false);

assert.strictEqual(plan({ manual: true, choice: "denied" }).action, "prompt");
assert.strictEqual(plan({ manual: true, choice: "denied" }).persist, "asked");
assert.strictEqual(plan({ manual: true, choice: "granted" }).persist, null);
assert.strictEqual(plan({ manual: true, permission: "granted" }).action, "silent");

assert.strictEqual(plan({ permission: "granted", choice: "denied" }).action, "silent");
assert.strictEqual(plan({ permission: "granted", choice: "granted", cached: cache }).action, "silent");

assert.strictEqual(plan({ permission: "denied" }).action, "skip");
assert.strictEqual(plan({ permission: "denied" }).persist, "denied");
assert.strictEqual(plan({ permission: "denied" }).showOptIn, true);

assert.strictEqual(plan({ permission: "prompt" }).action, "prompt");
assert.strictEqual(plan({ permission: "prompt" }).persist, "asked");
assert.strictEqual(plan({ permission: "prompt" }).reason, "first-visit");
assert.strictEqual(plan({ permission: null }).reason, "first-visit");

assert.strictEqual(plan({ permission: "prompt", choice: "denied" }).action, "skip");
assert.strictEqual(plan({ permission: null, choice: "asked" }).action, "skip");
assert.strictEqual(plan({ permission: null, choice: "asked" }).showOptIn, true);
assert.strictEqual(plan({ permission: "prompt", choice: "denied" }).persist, null);

assert.strictEqual(plan({ permission: null, choice: "granted", cached: cache }).action, "use-cache");
assert.strictEqual(plan({ permission: "prompt", choice: "granted", cached: cache }).action, "use-cache");
assert.strictEqual(plan({ permission: null, choice: "granted", cached: cache }).showOptIn, false);
assert.strictEqual(plan({ permission: null, choice: "granted" }).action, "skip");
assert.strictEqual(plan({ permission: null, choice: "granted" }).showOptIn, true);

assert.strictEqual(geo.outcomeFromError({ code: 1 }, "asked"), "denied");
assert.strictEqual(geo.outcomeFromError({ code: 1 }, "granted"), "denied");
assert.strictEqual(geo.outcomeFromError({ code: 3 }, "granted"), "granted");
assert.strictEqual(geo.outcomeFromError({ code: 3 }, "asked"), "asked");
assert.strictEqual(geo.outcomeFromError({ code: 2 }, null), "asked");

var mem = {};
var store = geo.createStore({
  getItem: function (k) { return Object.prototype.hasOwnProperty.call(mem, k) ? mem[k] : null; },
  setItem: function (k, v) { mem[k] = String(v); }
});
assert.strictEqual(store.readChoice(), null);
store.writeChoice("granted");
assert.strictEqual(store.readChoice(), "granted");
store.writeChoice("nope");
assert.strictEqual(store.readChoice(), "granted");
store.writeCache({ lat: 25.882, lng: -97.478, acc: 42, heading: 90, t: 5 });
var read = store.readCache();
assert.strictEqual(read.lat, 25.882);
assert.strictEqual(read.acc, 42);
assert.strictEqual(read.heading, 90);
store.writeCache({ lat: 999, lng: 0 });
assert.strictEqual(store.readCache().lat, 25.882);

var fix = geo.fixFromPosition({ coords: { latitude: 26, longitude: -97.5, accuracy: 12, heading: 0 } });
assert.strictEqual(fix.lat, 26);
assert.strictEqual(fix.acc, 12);
assert.strictEqual(fix.heading, 0);
assert.strictEqual(geo.fixFromPosition(null), null);
assert.strictEqual(geo.normalizeFix({ lat: "nope", lng: 1 }), null);

console.log("geo-opt-in: ok");
