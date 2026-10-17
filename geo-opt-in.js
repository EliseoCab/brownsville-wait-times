/* Shared geolocation choice for the BWT pages.
   Ask the browser at most once. Remember grant / deny / dismiss in localStorage.
   Where Permissions API supports geolocation, a "granted" state refreshes silently. */
(function (root, factory) {
  var api = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.BwtGeo = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  var CHOICE_KEY = "bwt-geo-choice";
  var CACHE_KEY = "bwt-geo-cache";

  function queryPermission() {
    return new Promise(function (resolve) {
      var settled = false;
      function finish(value) {
        if (settled) return;
        settled = true;
        resolve(value);
      }
      // Some Safari builds expose permissions.query but never settle geolocation.
      setTimeout(function () { finish(null); }, 1500);
      try {
        if (typeof navigator === "undefined" || !navigator.permissions ||
            typeof navigator.permissions.query !== "function") {
          finish(null);
          return;
        }
        Promise.resolve(navigator.permissions.query({ name: "geolocation" })).then(function (status) {
          var state = status && status.state;
          if (state === "granted" || state === "denied" || state === "prompt") finish(state);
          else finish(null);
        }, function () { finish(null); });
      } catch (e) {
        finish(null);
      }
    });
  }

  function usableCache(cached) {
    return !!(cached && isFinite(cached.lat) && isFinite(cached.lng));
  }

  /**
   * Decide how a page may touch geolocation.
   * permission: "granted" | "denied" | "prompt" | null (API missing, typical on iOS Safari)
   * choice: "granted" | "denied" | "asked" | null
   * manual: user tapped an explicit location control
   */
  function planGeoRequest(input) {
    var permission = input && input.permission;
    var choice = input && input.choice;
    var manual = !!(input && input.manual);
    var available = !input || input.available !== false;
    var cached = input && input.cached;

    if (!available) {
      return { action: "skip", persist: null, showOptIn: false, reason: "unavailable" };
    }
    if (manual) {
      if (permission === "granted") {
        return { action: "silent", persist: null, showOptIn: false, reason: "manual-granted" };
      }
      return {
        action: "prompt",
        persist: choice === "granted" ? null : "asked",
        showOptIn: false,
        reason: "manual"
      };
    }
    if (permission === "granted") {
      return { action: "silent", persist: null, showOptIn: false, reason: "permission-granted" };
    }
    if (permission === "denied") {
      return { action: "skip", persist: "denied", showOptIn: true, reason: "permission-denied" };
    }
    if (choice === "denied" || choice === "asked") {
      return { action: "skip", persist: null, showOptIn: true, reason: "saved-" + choice };
    }
    if (choice === "granted") {
      if (usableCache(cached)) {
        return { action: "use-cache", persist: null, showOptIn: false, reason: "reuse-grant" };
      }
      return { action: "skip", persist: null, showOptIn: true, reason: "grant-without-cache" };
    }
    return { action: "prompt", persist: "asked", showOptIn: false, reason: "first-visit" };
  }

  function outcomeFromError(err, previousChoice) {
    if (err && Number(err.code) === 1) return "denied";
    if (previousChoice === "granted") return "granted";
    return "asked";
  }

  function normalizeFix(fix) {
    if (!fix) return null;
    var lat = Number(fix.lat);
    var lng = Number(fix.lng);
    if (!isFinite(lat) || !isFinite(lng)) return null;
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
    var acc = fix.acc == null ? null : Number(fix.acc);
    var heading = fix.heading == null ? null : Number(fix.heading);
    var t = Number(fix.t);
    return {
      lat: lat,
      lng: lng,
      acc: acc != null && isFinite(acc) ? acc : null,
      heading: heading != null && isFinite(heading) ? heading : null,
      t: isFinite(t) ? t : Date.now()
    };
  }

  function fixFromPosition(pos) {
    var coords = pos && pos.coords;
    if (!coords) return null;
    return normalizeFix({
      lat: coords.latitude,
      lng: coords.longitude,
      acc: coords.accuracy,
      heading: coords.heading,
      t: Date.now()
    });
  }

  function createStore(storage) {
    return {
      readChoice: function () {
        try {
          var v = storage.getItem(CHOICE_KEY);
          if (v === "granted" || v === "denied" || v === "asked") return v;
        } catch (e) { /* private mode */ }
        return null;
      },
      writeChoice: function (v) {
        if (v !== "granted" && v !== "denied" && v !== "asked") return;
        try { storage.setItem(CHOICE_KEY, v); } catch (e) { /* private mode */ }
      },
      readCache: function () {
        try {
          var raw = storage.getItem(CACHE_KEY);
          if (!raw) return null;
          return normalizeFix(JSON.parse(raw));
        } catch (e) { return null; }
      },
      writeCache: function (fix) {
        var norm = normalizeFix(fix);
        if (!norm) return;
        try { storage.setItem(CACHE_KEY, JSON.stringify(norm)); } catch (e) { /* private mode */ }
      }
    };
  }

  return {
    CHOICE_KEY: CHOICE_KEY,
    CACHE_KEY: CACHE_KEY,
    queryPermission: queryPermission,
    planGeoRequest: planGeoRequest,
    outcomeFromError: outcomeFromError,
    normalizeFix: normalizeFix,
    fixFromPosition: fixFromPosition,
    createStore: createStore
  };
});
