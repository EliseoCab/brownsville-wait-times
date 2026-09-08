(function () {
  "use strict";

  var FEED_PROXY = "https://brownsville-bwt.borderwait.workers.dev";
  var PREFS_KEY = "bwt-all-ports-prefs";
  var LANG_KEY = "bwt-lang";
  var THEME_KEY = "bwt-theme";
  var NEAREST_DEFAULT = 12;

  var STR = {
    en: {
      checking: "Loading all ports…",
      geoPrompt: "Using your location to show nearest crossings…",
      geoOff: "Location off — browse with filters, or enable location for nearest.",
      geoDenied: "Location permission denied — use Border / State / Port filters.",
      empty: "No crossings match these filters.",
      showMore: "Show more",
      showLess: "Show fewer",
      mi: "mi",
      gen: "Gen",
      ready: "Ready",
      sentri: "SENTRI",
      nexus: "NEXUS",
      fast: "FAST",
      open: "open",
      closed: "Closed",
      pending: "Pending",
      na: "—",
      borderAll: "All borders",
      borderMx: "Mexico",
      borderCa: "Northern",
      stateAll: "All states",
      portAll: "All ports",
      viewNearest: "Nearest",
      viewBrowse: "Browse",
      trafficAll: "All",
      trafficVeh: "Vehicles",
      trafficPed: "Pedestrian",
      trafficComm: "Commercial",
      back: "← Brownsville wait times",
      title: "All U.S. land ports",
      sub: "Live CBP wait times · nearest to you, with optional filters",
      latest: "Latest report:",
      hours: "Hours",
      hours24: "24 hours",
      midnight: "midnight",
      updated: "Updated",
      countLabel: "Showing"
    },
    es: {
      checking: "Cargando todos los puertos…",
      geoPrompt: "Usando su ubicación para mostrar los cruces más cercanos…",
      geoOff: "Ubicación desactivada — use los filtros, o actívela para ver los más cercanos.",
      geoDenied: "Permiso de ubicación denegado — use Borde / Estado / Puerto.",
      empty: "Ningún cruce coincide con estos filtros.",
      showMore: "Mostrar más",
      showLess: "Mostrar menos",
      mi: "mi",
      gen: "Gen",
      ready: "Ready",
      sentri: "SENTRI",
      nexus: "NEXUS",
      fast: "FAST",
      open: "abiertos",
      closed: "Cerrado",
      pending: "Pendiente",
      na: "—",
      borderAll: "Todos los bordes",
      borderMx: "México",
      borderCa: "Norte",
      stateAll: "Todos los estados",
      portAll: "Todos los puertos",
      viewNearest: "Cercanos",
      viewBrowse: "Explorar",
      trafficAll: "Todos",
      trafficVeh: "Vehículos",
      trafficPed: "Peatonal",
      trafficComm: "Comercial",
      back: "← Tiempos en Brownsville",
      title: "Todos los puertos terrestres de EE. UU.",
      sub: "Tiempos CBP en vivo · más cercanos a usted, con filtros opcionales",
      latest: "Último reporte:",
      hours: "Horario",
      hours24: "24 horas",
      midnight: "medianoche",
      updated: "Actualizado",
      countLabel: "Mostrando"
    }
  };

  var state = {
    lang: "en",
    items: [],
    feedDate: "",
    feedTime: "",
    userPos: null,
    geoStatus: "pending", // pending | ok | denied | unavailable
    prefs: {
      view: "nearest",
      border: "all",
      state: "all",
      port: "all",
      traffic: "all",
      nearestLimit: NEAREST_DEFAULT
    }
  };

  function t(key) {
    return (STR[state.lang] && STR[state.lang][key]) || (STR.en[key] || key);
  }

  function loadPrefs() {
    try {
      var raw = localStorage.getItem(PREFS_KEY);
      if (!raw) return;
      var p = JSON.parse(raw);
      if (p && typeof p === "object") {
        ["view", "border", "state", "port", "traffic"].forEach(function (k) {
          if (typeof p[k] === "string") state.prefs[k] = p[k];
        });
        if (typeof p.nearestLimit === "number" && p.nearestLimit >= 6) {
          state.prefs.nearestLimit = p.nearestLimit;
        }
      }
    } catch (_) { /* ignore */ }
  }

  function savePrefs() {
    try {
      localStorage.setItem(PREFS_KEY, JSON.stringify(state.prefs));
    } catch (_) { /* ignore */ }
  }

  function applyChrome() {
    document.documentElement.lang = state.lang === "es" ? "es" : "en";
    var title = document.getElementById("pageTitle");
    var sub = document.getElementById("pageSub");
    var back = document.getElementById("backLink");
    if (title) title.textContent = t("title");
    if (sub) sub.textContent = t("sub");
    if (back) back.textContent = t("back");
    document.title = t("title") + " · BWT";
    var en = document.getElementById("langEn");
    var es = document.getElementById("langEs");
    if (en) en.classList.toggle("active", state.lang !== "es");
    if (es) es.classList.toggle("active", state.lang === "es");
  }

  function haversineMi(lat1, lon1, lat2, lon2) {
    var R = 3958.8;
    var toRad = Math.PI / 180;
    var dLat = (lat2 - lat1) * toRad;
    var dLon = (lon2 - lon1) * toRad;
    var a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * toRad) * Math.cos(lat2 * toRad) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  function textOf(el, tag) {
    if (!el) return "";
    var n = el.getElementsByTagName(tag)[0];
    return n && n.textContent ? n.textContent.trim() : "";
  }

  function parseLane(node, name, trustedLabel) {
    if (!node) {
      return { name: name, wait: { pending: true, closed: false, minutes: null, lanesOpenCount: null } };
    }
    var status = textOf(node, "operational_status");
    var minsRaw = textOf(node, "delay_minutes");
    var openRaw = textOf(node, "lanes_open");
    var when = textOf(node, "update_time");
    var closed = /closed/i.test(status);
    var na = !status || /^n\/?a$/i.test(status);
    var pending = /pending/i.test(status) || (!closed && !na && minsRaw === "" && openRaw === "");
    var minutes = minsRaw !== "" && !isNaN(Number(minsRaw)) ? Number(minsRaw) : null;
    var lanesOpenCount = openRaw !== "" && !isNaN(Number(openRaw)) ? Number(openRaw) : null;
    if (na) {
      return { name: name, wait: { pending: true, closed: false, minutes: null, lanesOpenCount: null, when: when, rawStatus: status } };
    }
    return {
      name: name,
      wait: {
        pending: pending && !closed,
        closed: closed,
        minutes: minutes,
        lanesOpenCount: lanesOpenCount,
        when: when,
        rawStatus: status
      }
    };
  }

  function parsePortXml(xmlText) {
    var doc = new DOMParser().parseFromString(xmlText, "application/xml");
    var ports = Array.prototype.slice.call(doc.getElementsByTagName("port"));
    var metaRoot = window.BWT_PORT_META || {};
    var items = [];

    ports.forEach(function (portEl) {
      var portNumber = textOf(portEl, "port_number");
      var borderRaw = textOf(portEl, "border");
      var portName = textOf(portEl, "port_name").replace(/&amp;/g, "&");
      var crossing = textOf(portEl, "crossing_name").replace(/&amp;/g, "&");
      var hours = textOf(portEl, "hours");
      var date = textOf(portEl, "date");
      var status = textOf(portEl, "port_status");
      var border = /canadian/i.test(borderRaw) ? "canadian" : "mexican";
      var trustedName = border === "canadian" ? "NEXUS" : "SENTRI";

      var pass = portEl.getElementsByTagName("passenger_vehicle_lanes")[0];
      var ped = portEl.getElementsByTagName("pedestrian_lanes")[0];
      var comm = portEl.getElementsByTagName("commercial_vehicle_lanes")[0];

      function section(groupEl, key, label) {
        if (!groupEl) return null;
        var max = textOf(groupEl, "maximum_lanes");
        var lanes = [];
        if (key === "passenger") {
          lanes.push(parseLane(groupEl.getElementsByTagName("standard_lanes")[0], "General Lane"));
          lanes.push(parseLane(groupEl.getElementsByTagName("NEXUS_SENTRI_lanes")[0], trustedName + " Lane", trustedName));
          lanes.push(parseLane(groupEl.getElementsByTagName("ready_lanes")[0], "Ready Lane"));
        } else if (key === "pedestrian") {
          lanes.push(parseLane(groupEl.getElementsByTagName("standard_lanes")[0], "General Lane"));
          lanes.push(parseLane(groupEl.getElementsByTagName("ready_lanes")[0], "Ready Lane"));
        } else {
          lanes.push(parseLane(groupEl.getElementsByTagName("standard_lanes")[0], "General Lane"));
          lanes.push(parseLane(groupEl.getElementsByTagName("FAST_lanes")[0], "FAST Lane"));
        }
        return {
          key: key,
          label: label,
          maxLanes: max && !isNaN(Number(max)) ? Number(max) : null,
          lanes: lanes
        };
      }

      var meta = metaRoot[portNumber] || {};
      var short = crossing || portName;
      var title = crossing && crossing !== portName ? portName + " · " + crossing : portName;

      items.push({
        id: portNumber,
        title: title,
        border: border,
        state: meta.state || "XX",
        timeZone: ianaForState(meta.state || ""),
        portName: portName,
        crossingName: crossing,
        hours: hours || "—",
        date: date,
        portStatus: status,
        lat: meta.lat,
        lng: meta.lng,
        meta: { short: short, mapsQuery: (crossing || portName) + " border crossing" },
        sections: [
          section(pass, "passenger", "Passenger"),
          section(ped, "pedestrian", "Pedestrian"),
          section(comm, "commercial", "Commercial")
        ].filter(Boolean),
        distanceMi: null
      });
    });

    return {
      feedDate: textOf(doc.documentElement, "last_updated_date"),
      feedTime: textOf(doc.documentElement, "last_updated_time"),
      items: dedupePendingAliases(items)
    };
  }

  /** "2026-9-7" + "18:55:46" → "Sep 7, 2026 · 6:55 pm" (es-US when Spanish). */
  function formatFeedUpdated(dateStr, timeStr) {
    var dm = String(dateStr || "").trim().match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    var tm = String(timeStr || "").trim().match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
    if (!dm) {
      var raw = [dateStr, timeStr].filter(Boolean).join(" ").trim();
      return raw || "—";
    }
    var d = new Date(Number(dm[1]), Number(dm[2]) - 1, Number(dm[3]));
    if (isNaN(d.getTime())) {
      return [dateStr, timeStr].filter(Boolean).join(" ").trim() || "—";
    }
    var locale = state.lang === "es" ? "es-US" : "en-US";
    var datePart = d.toLocaleDateString(locale, {
      month: "short",
      day: "numeric",
      year: "numeric"
    });
    if (!tm) return datePart;
    var h = Number(tm[1]);
    var min = tm[2];
    if (h < 0 || h > 23) return datePart;
    var ampm = h >= 12 ? "pm" : "am";
    var h12 = h % 12;
    if (h12 === 0) h12 = 12;
    return datePart + " · " + h12 + ":" + min + " " + ampm;
  }

  var TZ_OFFSET_H = {
    EDT: -4, EST: -5,
    CDT: -5, CST: -6,
    MDT: -6, MST: -7,
    PDT: -7, PST: -8,
    AKDT: -8, AKST: -9,
    HADT: -9, HST: -10,
    GMT: 0, UTC: 0
  };

  var STATE_IANA = {
    ME: "America/New_York",
    VT: "America/New_York",
    NY: "America/New_York",
    MI: "America/Detroit",
    MN: "America/Chicago",
    ND: "America/Chicago",
    TX: "America/Chicago",
    MT: "America/Denver",
    NM: "America/Denver",
    AZ: "America/Phoenix",
    CA: "America/Los_Angeles",
    WA: "America/Los_Angeles"
  };

  function ianaForState(state) {
    return STATE_IANA[state] || "";
  }

  function stripAtPrefix(s) {
    return String(s || "").replace(/^At\s+/i, "").trim();
  }

  function parseCbpDateParts(dateStr) {
    var s = String(dateStr || "").trim();
    var m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (m) return { y: Number(m[3]), mo: Number(m[1]), d: Number(m[2]) };
    m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if (m) return { y: Number(m[1]), mo: Number(m[2]), d: Number(m[3]) };
    return null;
  }

  function parseCbpWhen(when) {
    var s = stripAtPrefix(when);
    if (!s) return null;
    var tzTail = s.match(/\b([A-Z]{2,4})\s*$/i);
    var tz = tzTail ? tzTail[1].toUpperCase() : "";
    var h;
    var min;
    if (/^noon\b/i.test(s) || /^12:00\s*pm/i.test(s)) {
      h = 12;
      min = 0;
    } else if (/^midnight\b/i.test(s) || /^12:00\s*am/i.test(s)) {
      h = 0;
      min = 0;
    } else {
      var m = s.match(/^(\d{1,2}):(\d{2})\s*(am|pm)\b/i);
      if (!m) return null;
      h = Number(m[1]) % 12;
      if (String(m[3]).toLowerCase() === "pm") h += 12;
      min = Number(m[2]);
    }
    var off = Object.prototype.hasOwnProperty.call(TZ_OFFSET_H, tz) ? TZ_OFFSET_H[tz] : null;
    return { h: h, min: min, tz: tz, offsetH: off, display: s };
  }

  function asOfUtcMs(when, dateStr) {
    var p = parseCbpWhen(when);
    if (!p) return null;
    var d = parseCbpDateParts(dateStr);
    var y;
    var mo;
    var day;
    if (d) {
      y = d.y;
      mo = d.mo;
      day = d.d;
    } else {
      var now = new Date();
      y = now.getFullYear();
      mo = now.getMonth() + 1;
      day = now.getDate();
    }
    if (p.offsetH == null) {
      return localClockAsUtcMs(y, mo, day, p.h, p.min, 0, "America/Chicago");
    }
    var asUtc = Date.UTC(y, mo - 1, day, p.h, p.min, 0);
    return asUtc - p.offsetH * 3600 * 1000;
  }

  function tzOffsetMinutes(ms, timeZone) {
    var d = new Date(ms);
    var parts = new Intl.DateTimeFormat("en-US", {
      timeZone: timeZone,
      hour12: false,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit"
    }).formatToParts(d);
    function num(type) {
      for (var i = 0; i < parts.length; i++) {
        if (parts[i].type === type) return Number(parts[i].value);
      }
      return 0;
    }
    var hour = num("hour");
    if (hour === 24) hour = 0;
    var asUtc = Date.UTC(num("year"), num("month") - 1, num("day"), hour, num("minute"), num("second"));
    return (asUtc - ms) / 60000;
  }

  function localClockAsUtcMs(y, mo, day, h, min, sec, timeZone) {
    var guess = Date.UTC(y, mo - 1, day, h, min, sec || 0);
    var off = tzOffsetMinutes(guess, timeZone);
    var ms = guess - off * 60000;
    var off2 = tzOffsetMinutes(ms, timeZone);
    if (off2 !== off) ms = guess - off2 * 60000;
    return ms;
  }

  function feedEasternUtcMs(dateStr, timeStr) {
    var d = parseCbpDateParts(dateStr);
    var tm = String(timeStr || "").trim().match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
    if (!d || !tm) return null;
    return localClockAsUtcMs(
      d.y, d.mo, d.d,
      Number(tm[1]), Number(tm[2]), Number(tm[3] || 0),
      "America/New_York"
    );
  }

  function isUsDst(ms) {
    var y = new Date(ms).getUTCFullYear();
    var jan = tzOffsetMinutes(Date.UTC(y, 0, 1, 12, 0, 0), "America/New_York");
    var now = tzOffsetMinutes(ms, "America/New_York");
    return now !== jan;
  }

  function abbrevForIana(iana, ms) {
    if (iana === "America/Phoenix") return "MST";
    var dst = isUsDst(ms);
    if (iana === "America/Chicago") return dst ? "CDT" : "CST";
    if (iana === "America/New_York" || iana === "America/Detroit") return dst ? "EDT" : "EST";
    if (iana === "America/Denver") return dst ? "MDT" : "MST";
    if (iana === "America/Los_Angeles") return dst ? "PDT" : "PST";
    return "";
  }

  function clockPartsInZone(ms, timeZone) {
    if (ms == null || isNaN(Number(ms)) || !timeZone) return null;
    var d = new Date(ms);
    var locale = state.lang === "es" ? "es-US" : "en-US";
    var parts = new Intl.DateTimeFormat(locale, {
      timeZone: timeZone,
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
      timeZoneName: "short"
    }).formatToParts(d);
    function val(type) {
      for (var i = 0; i < parts.length; i++) {
        if (parts[i].type === type) return parts[i].value;
      }
      return "";
    }
    var ampm = val("dayPeriod").replace(/\./g, "").replace(/\s/g, "").toLowerCase();
    if (ampm !== "am" && ampm !== "pm") ampm = /p/i.test(val("dayPeriod")) ? "pm" : "am";
    var tz = val("timeZoneName");
    if (!/^[ECMP][DS]T$/i.test(tz) && tz !== "MST") {
      tz = abbrevForIana(timeZone, ms) || tz;
    }
    return {
      date: d.toLocaleDateString(locale, {
        timeZone: timeZone,
        month: "short",
        day: "numeric",
        year: "numeric"
      }),
      hour: val("hour"),
      minute: val("minute"),
      ampm: ampm,
      tz: String(tz || "").toUpperCase()
    };
  }

  function formatClockInZone(ms, timeZone) {
    var p = clockPartsInZone(ms, timeZone);
    if (!p) return "";
    return p.hour + ":" + p.minute + " " + p.ampm + " " + p.tz;
  }

  function formatChicagoStamp(ms) {
    var p = clockPartsInZone(ms, "America/Chicago");
    if (!p) return "—";
    return p.date + " · " + p.hour + ":" + p.minute + " " + p.ampm + " " + p.tz;
  }

  function formatReportDate(dateStr) {
    var d = parseCbpDateParts(dateStr);
    if (!d) return "";
    var dt = new Date(d.y, d.mo - 1, d.d);
    if (isNaN(dt.getTime())) return "";
    var locale = state.lang === "es" ? "es-US" : "en-US";
    return dt.toLocaleDateString(locale, { month: "short", day: "numeric", year: "numeric" });
  }

  function displayStampClock(stamp, timeZone) {
    if (!stamp) return "";
    if (stamp.ms != null && timeZone) {
      var clock = formatClockInZone(stamp.ms, timeZone);
      if (clock) return clock;
    }
    var parsed = parseCbpWhen(stamp.time);
    if (!parsed) return stamp.time || "";
    var h12 = parsed.h % 12;
    if (h12 === 0) h12 = 12;
    var ampm = parsed.h >= 12 ? "pm" : "am";
    var min = parsed.min < 10 ? "0" + parsed.min : String(parsed.min);
    var tz = parsed.tz || "";
    return tz ? h12 + ":" + min + " " + ampm + " " + tz : h12 + ":" + min + " " + ampm;
  }

  /** Home-page stamp: "Sep 7, 2026 · 7:00 pm CDT" */
  function formatReportStamp(stamp, timeZone) {
    if (!stamp) return "—";
    var clock = displayStampClock(stamp, timeZone);
    if (!clock) return "—";
    var datePart = formatReportDate(stamp.date);
    if (datePart) return datePart + " · " + clock;
    return clock;
  }

  function portZoneAbbrev(item, stamp) {
    if (!item || !item.timeZone) {
      var parsed = stamp && stamp.time ? parseCbpWhen(stamp.time) : null;
      return parsed && parsed.tz ? parsed.tz : "";
    }
    var ms = stamp && stamp.ms != null ? stamp.ms : Date.now();
    return abbrevForIana(item.timeZone, ms) || "";
  }

  function formatHoursOfOperation(hours) {
    if (!hours || hours === "—") return "—";
    var h = String(hours).replace(/\s+/g, " ").trim();
    h = h.replace(/24\s*hrs?\/day/i, t("hours24"));
    h = h.replace(/24 hours/i, t("hours24"));
    h = h.replace(/Midnight/gi, t("midnight"));
    h = h.replace(/medianoche/gi, t("midnight"));
    h = h.replace(/\b(\d{1,2})\s*am\b/gi, function (_, n) { return n + " a.m."; });
    h = h.replace(/\b(\d{1,2})\s*pm\b/gi, function (_, n) { return n + " p.m."; });
    h = h.replace(/\s*-\s*/g, "–");
    return h;
  }

  function normName(s) {
    return String(s || "")
      .toLowerCase()
      .replace(/&amp;/g, "&")
      .replace(/[^a-z0-9]+/g, "");
  }

  /** True if any lane has a real delay/no-delay reading or closed status (not only Update Pending / N/A). */
  function crossingHasLiveData(item) {
    var sections = item.sections || [];
    for (var i = 0; i < sections.length; i++) {
      var lanes = sections[i].lanes || [];
      for (var j = 0; j < lanes.length; j++) {
        var w = lanes[j].wait;
        if (!w) continue;
        if (w.closed) return true;
        if (!w.pending && w.minutes != null) return true;
        if (!w.pending && w.lanesOpenCount != null) return true;
        var st = w.rawStatus || "";
        if (/no delay|delay/i.test(st) && !/pending/i.test(st)) return true;
      }
    }
    return false;
  }

  function looseName(s) {
    return normName(
      String(s || "")
        .replace(/\([^)]*\)/g, "")
        .replace(/international/gi, "")
        .replace(/bridge/gi, "")
        .replace(/port of entry/gi, "")
    );
  }

  /** Exact match, or one identity contains the other (min length 4) — "bm"↔"bm", "roma"↔"romatexas". */
  function namesOverlap(a, b) {
    if (!a || !b) return false;
    if (a === b) return true;
    if (a.length >= 4 && b.length >= 4 && (a.indexOf(b) >= 0 || b.indexOf(a) >= 0)) return true;
    return false;
  }

  function hitsLiveId(id, liveIds) {
    if (!id) return false;
    for (var i = 0; i < liveIds.length; i++) {
      if (namesOverlap(id, liveIds[i])) return true;
    }
    return false;
  }

  /**
   * CBP's national feed often includes stub rows (e.g. port_name "Gateway" or "B&M Bridge")
   * stuck on "Update Pending" alongside the real Brownsville/El Paso crossings that have data.
   * Drop only those alias stubs — keep real pending crossings like Point Roberts.
   */
  function dedupePendingAliases(items) {
    var liveIds = [];
    var liveIdSet = {};
    var livePortNames = {};

    function addLiveId(id) {
      if (!id || liveIdSet[id]) return;
      liveIdSet[id] = true;
      liveIds.push(id);
    }

    items.forEach(function (it) {
      if (!crossingHasLiveData(it)) return;
      livePortNames[normName(it.portName)] = true;
      livePortNames[looseName(it.portName)] = true;
      // Index port + crossing identities so stubs like "B&M Bridge", "Paso Del Norte",
      // and "Otay Mesa Port of Entry" match the live Brownsville/El Paso/Otay rows.
      addLiveId(normName(it.portName));
      addLiveId(looseName(it.portName));
      if (it.crossingName) {
        addLiveId(normName(it.crossingName));
        addLiveId(looseName(it.crossingName));
      }
    });

    return items.filter(function (it) {
      if (crossingHasLiveData(it)) return true;

      var port = normName(it.portName);
      var portLoose = looseName(it.portName);
      var cross = normName(it.crossingName);
      var crossLoose = looseName(it.crossingName);
      var stubLike = !it.crossingName || cross === port || crossLoose === portLoose;

      // Empty / self-named stub that duplicates a live crossing identity
      // e.g. "Gateway", "B&M Bridge", "YSLETA", "Paso Del Norte", empty "El Paso"
      if (stubLike) {
        if (hitsLiveId(port, liveIds) || hitsLiveId(portLoose, liveIds)) return false;
        if (cross && (hitsLiveId(cross, liveIds) || hitsLiveId(crossLoose, liveIds))) return false;
        // Parent city stub with no crossing while siblings under same port_name have data
        if (!it.crossingName && (livePortNames[port] || livePortNames[portLoose])) return false;
      }

      // Keep distinct pending crossings under a multi-crossing port (Point Roberts, etc.)
      return true;
    });
  }

  function isActiveWait(w) {
    return w && !w.pending && !w.closed && w.minutes != null;
  }

  /** Newest CBP lane stamp for one crossing. */
  function collectStampFromLanes(lanes, date) {
    var best = null;
    var bestMs = -1;
    var list = lanes || [];
    for (var i = 0; i < list.length; i++) {
      var w = list[i] && list[i].wait;
      if (!w || !w.when) continue;
      var ms = asOfUtcMs(w.when, date);
      var time = stripAtPrefix(w.when);
      if (!time) continue;
      if (ms == null) {
        if (!best) best = { date: date || "", time: time, ms: null };
        continue;
      }
      if (ms >= bestMs) {
        bestMs = ms;
        best = { date: date || "", time: time, ms: ms };
      }
    }
    return best;
  }

  function collectPortAsOf(item) {
    if (!item) return null;
    var lanes = [];
    var sections = item.sections || [];
    for (var i = 0; i < sections.length; i++) {
      var secLanes = sections[i].lanes || [];
      for (var j = 0; j < secLanes.length; j++) lanes.push(secLanes[j]);
    }
    return collectStampFromLanes(lanes, item.date);
  }

  function collectSectionAsOf(section, date) {
    if (!section) return null;
    return collectStampFromLanes(section.lanes, date);
  }

  function newestAsOf(items) {
    var best = null;
    var list = items || [];
    for (var i = 0; i < list.length; i++) {
      var stamp = collectPortAsOf(list[i]);
      if (!stamp || stamp.ms == null) continue;
      if (!best || stamp.ms >= best.ms) best = stamp;
    }
    return best;
  }

  function newestAsOfByTz(items) {
    var map = {};
    var list = items || [];
    for (var i = 0; i < list.length; i++) {
      var stamp = collectPortAsOf(list[i]);
      if (!stamp || stamp.ms == null) continue;
      var tz = portZoneAbbrev(list[i], stamp) || "_";
      if (!map[tz] || stamp.ms >= map[tz].ms) map[tz] = stamp;
    }
    return map;
  }

  function isShowableWait(w) {
    return w && (isActiveWait(w) || w.pending || w.closed);
  }

  function waitHtml(w) {
    if (!w || (!isShowableWait(w) && w.minutes == null && !w.pending && !w.closed)) {
      return '<span class="wait-empty">' + t("na") + "</span>";
    }
    if (w.closed) return '<span class="wait closed">' + t("closed") + "</span>";
    if (w.pending || w.minutes == null) return '<span class="wait pending">' + t("pending") + "</span>";
    var cls = "wait";
    if (w.minutes <= 15) cls += " good";
    else if (w.minutes <= 45) cls += " warn";
    else cls += " bad";
    return '<span class="' + cls + '">' + w.minutes + " min</span>";
  }

  function openBits(section, border) {
    if (!section) return "";
    var bits = [];
    section.lanes.forEach(function (lane) {
      if (!lane.wait || lane.wait.pending) return;
      if (lane.wait.closed) return;
      if (lane.wait.lanesOpenCount == null) return;
      var label = /ready/i.test(lane.name)
        ? t("ready")
        : /fast/i.test(lane.name)
          ? t("fast")
          : /nexus/i.test(lane.name)
            ? t("nexus")
            : /sentri/i.test(lane.name)
              ? t("sentri")
              : t("gen");
      bits.push(lane.wait.lanesOpenCount + " " + label);
    });
    return bits.join(" · ");
  }

  function modeCell(section, border, date, timeZone) {
    if (!section) return '<span class="wait-empty">' + t("na") + "</span>";
    var general = section.lanes.find(function (l) { return /general/i.test(l.name); });
    var special = section.lanes.find(function (l) {
      return /sentri|nexus|fast|ready/i.test(l.name) && isShowableWait(l.wait);
    });
    var primary = general && isShowableWait(general.wait) ? general.wait : (section.lanes[0] && section.lanes[0].wait);
    var html = waitHtml(primary);
    var open = openBits(section, border);
    if (special && special !== general && isActiveWait(special.wait) && primary && isActiveWait(primary) && special.wait.minutes !== primary.minutes) {
      var lab = /ready/i.test(special.name) ? t("ready") : /fast/i.test(special.name) ? t("fast") : /nexus/i.test(special.name) ? t("nexus") : t("sentri");
      html = '<div class="compact-waits"><span class="compact-pair"><span class="dual-label">' + t("gen") + "</span> " + waitHtml(primary) +
        '</span><span class="compact-pair"><span class="dual-label">' + lab + "</span> " + waitHtml(special.wait) + "</span></div>";
    }
    var clock = displayStampClock(collectSectionAsOf(section, date), timeZone);
    if (clock) html += '<div class="cell-asof">' + escapeHtml(clock) + "</div>";
    if (open) html += '<div class="open-line">' + open + "</div>";
    return html;
  }

  function filteredItems() {
    var prefs = state.prefs;
    var list = state.items.slice();

    if (prefs.border === "mexican" || prefs.border === "canadian") {
      list = list.filter(function (it) { return it.border === prefs.border; });
    }
    if (prefs.state && prefs.state !== "all") {
      list = list.filter(function (it) { return it.state === prefs.state; });
    }
    if (prefs.port && prefs.port !== "all") {
      list = list.filter(function (it) { return it.portName === prefs.port; });
    }

    if (state.userPos) {
      list.forEach(function (it) {
        if (it.lat != null && it.lng != null) {
          it.distanceMi = haversineMi(state.userPos.lat, state.userPos.lng, it.lat, it.lng);
        } else {
          it.distanceMi = null;
        }
      });
    }

    if (prefs.view === "nearest" && state.userPos) {
      list.sort(function (a, b) {
        var da = a.distanceMi == null ? Number.POSITIVE_INFINITY : a.distanceMi;
        var db = b.distanceMi == null ? Number.POSITIVE_INFINITY : b.distanceMi;
        return da - db;
      });
    } else {
      list.sort(function (a, b) {
        return (a.state + a.portName + a.title).localeCompare(b.state + b.portName + b.title);
      });
    }
    return list;
  }

  function populateFilterOptions(items) {
    var border = state.prefs.border;
    var stateSel = document.getElementById("filterState");
    var portSel = document.getElementById("filterPort");
    if (!stateSel || !portSel) return;

    var states = {};
    var ports = {};
    items.forEach(function (it) {
      if (border !== "all" && it.border !== border) return;
      if (it.state && it.state !== "XX") states[it.state] = true;
    });
    var stateList = Object.keys(states).sort();
    var prevState = state.prefs.state;
    stateSel.innerHTML = "";
    var optAll = document.createElement("option");
    optAll.value = "all";
    optAll.textContent = t("stateAll");
    stateSel.appendChild(optAll);
    stateList.forEach(function (s) {
      var o = document.createElement("option");
      o.value = s;
      o.textContent = s;
      stateSel.appendChild(o);
    });
    if (prevState !== "all" && states[prevState]) stateSel.value = prevState;
    else {
      stateSel.value = "all";
      state.prefs.state = "all";
    }

    items.forEach(function (it) {
      if (border !== "all" && it.border !== border) return;
      if (state.prefs.state !== "all" && it.state !== state.prefs.state) return;
      ports[it.portName] = true;
    });
    var portList = Object.keys(ports).sort();
    var prevPort = state.prefs.port;
    portSel.innerHTML = "";
    var pAll = document.createElement("option");
    pAll.value = "all";
    pAll.textContent = t("portAll");
    portSel.appendChild(pAll);
    portList.forEach(function (p) {
      var o = document.createElement("option");
      o.value = p;
      o.textContent = p;
      portSel.appendChild(o);
    });
    if (prevPort !== "all" && ports[prevPort]) portSel.value = prevPort;
    else {
      portSel.value = "all";
      state.prefs.port = "all";
    }
  }

  function render() {
    var host = document.getElementById("portGrid");
    var status = document.getElementById("statusLine");
    var countEl = document.getElementById("resultCount");
    var moreBtn = document.getElementById("showMoreBtn");
    if (!host) return;

    populateFilterOptions(state.items);
    var list = filteredItems();
    var limit = state.prefs.view === "nearest" && state.userPos
      ? state.prefs.nearestLimit
      : list.length;
    var shown = list.slice(0, limit);

    if (status) {
      if (state.geoStatus === "pending") status.textContent = t("geoPrompt");
      else if (state.geoStatus === "denied") status.textContent = t("geoDenied");
      else if (state.geoStatus === "unavailable" && state.prefs.view === "nearest") status.textContent = t("geoOff");
      else status.textContent = "";
    }

    if (countEl) {
      countEl.textContent = t("countLabel") + " " + shown.length + " / " + list.length;
    }

    if (moreBtn) {
      if (state.prefs.view === "nearest" && state.userPos && list.length > NEAREST_DEFAULT) {
        moreBtn.hidden = false;
        moreBtn.textContent = state.prefs.nearestLimit < list.length ? t("showMore") : t("showLess");
      } else {
        moreBtn.hidden = true;
      }
    }

    var traffic = state.prefs.traffic;
    refreshAsOfStamp(list);
    if (!shown.length) {
      host.innerHTML = '<p class="empty">' + t("empty") + "</p>";
      return;
    }

    var newestByTz = newestAsOfByTz(state.items);
    var LAG_MS = 60 * 60 * 1000;

    host.innerHTML = shown.map(function (it) {
      var pass = it.sections.find(function (s) { return s.key === "passenger"; });
      var ped = it.sections.find(function (s) { return s.key === "pedestrian"; });
      var comm = it.sections.find(function (s) { return s.key === "commercial"; });
      var dist = it.distanceMi != null ? ("~" + Math.round(it.distanceMi) + " " + t("mi")) : "";
      var mapsQ = encodeURIComponent(it.meta.mapsQuery || it.title);
      var mapsHref = /iPhone|iPad|iPod/i.test(navigator.userAgent || "")
        ? "https://maps.apple.com/?q=" + mapsQ
        : "https://www.google.com/maps/search/?api=1&query=" + mapsQ;
      var hoursLabel = formatHoursOfOperation(it.hours);
      var portStamp = collectPortAsOf(it);
      var updatedLabel = displayStampClock(portStamp, it.timeZone);
      var tz = portZoneAbbrev(it, portStamp) || "_";
      var newestSameTz = newestByTz[tz];
      var lag = !!(newestSameTz && portStamp && portStamp.ms != null && (newestSameTz.ms - portStamp.ms) >= LAG_MS);
      var hoursHtml =
        '<div class="port-hours"><strong>' + escapeHtml(t("hours")) + "</strong> " +
        escapeHtml(hoursLabel) +
        "</div>";
      var updatedHtml = updatedLabel
        ? '<div class="port-updated' + (lag ? " lag" : "") + '"><strong>' +
          escapeHtml(t("updated")) + "</strong> " +
          (lag ? '<span class="lag-time">' : "") +
          escapeHtml(updatedLabel) +
          (lag ? "</span>" : "") +
          "</div>"
        : "";
      var tzPill = tz !== "_"
        ? '<span class="pill tz">' + escapeHtml(tz) + "</span>"
        : "";

      function col(section, key) {
        if (traffic !== "all" && traffic !== key) return "";
        return '<div class="cell"><div class="cell-kicker">' +
          (key === "passenger" ? t("trafficVeh") : key === "pedestrian" ? t("trafficPed") : t("trafficComm")) +
          "</div>" + modeCell(section, it.border, it.date, it.timeZone) + "</div>";
      }

      return (
        '<article class="port-card">' +
          '<div class="port-head">' +
            '<div class="port-title">' + escapeHtml(it.title) + "</div>" +
            '<div class="port-meta">' +
              '<span class="pill">' + escapeHtml(it.state) + "</span>" +
              '<span class="pill">' + (it.border === "mexican" ? "MX" : "CA") + "</span>" +
              tzPill +
              (dist ? '<span class="pill dist">' + dist + "</span>" : "") +
              '<a class="maps" href="' + mapsHref + '" target="_blank" rel="noopener">Maps</a>' +
            "</div>" +
            hoursHtml +
            updatedHtml +
          "</div>" +
          '<div class="port-grid">' +
            col(pass, "passenger") +
            col(ped, "pedestrian") +
            col(comm, "commercial") +
          "</div>" +
        "</article>"
      );
    }).join("");
  }

  function escapeHtml(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  async function loadFeed() {
    var status = document.getElementById("statusLine");
    if (status) status.textContent = t("checking");
    var url = FEED_PROXY.replace(/\/$/, "") + "/all";
    var res = await fetch(url, { credentials: "omit" });
    if (!res.ok) throw new Error("HTTP " + res.status);
    var xml = await res.text();
    var parsed = parsePortXml(xml);
    state.items = parsed.items;
    state.feedDate = parsed.feedDate || "";
    state.feedTime = parsed.feedTime || "";
    refreshAsOfStamp();
    render();
  }

  function refreshAsOfStamp(items) {
    var stamp = document.getElementById("asofStamp");
    if (!stamp) return;
    var list = items && items.length ? items : state.items;
    var newest = newestAsOf(list);
    if (newest && newest.ms != null) {
      stamp.textContent = formatChicagoStamp(newest.ms);
      return;
    }
    var feedMs = feedEasternUtcMs(state.feedDate, state.feedTime);
    if (feedMs != null) {
      stamp.textContent = formatChicagoStamp(feedMs);
      return;
    }
    stamp.textContent = "—";
  }

  function requestGeo() {
    if (!navigator.geolocation) {
      state.geoStatus = "unavailable";
      if (state.prefs.view === "nearest") state.prefs.view = "browse";
      syncViewButtons();
      render();
      return;
    }
    state.geoStatus = "pending";
    navigator.geolocation.getCurrentPosition(
      function (pos) {
        state.userPos = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        state.geoStatus = "ok";
        render();
      },
      function () {
        state.geoStatus = "denied";
        if (state.prefs.view === "nearest") state.prefs.view = "browse";
        savePrefs();
        syncViewButtons();
        render();
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 }
    );
  }

  function syncViewButtons() {
    document.querySelectorAll("[data-view]").forEach(function (btn) {
      btn.classList.toggle("active", btn.getAttribute("data-view") === state.prefs.view);
    });
    document.querySelectorAll("[data-traffic]").forEach(function (btn) {
      btn.classList.toggle("active", btn.getAttribute("data-traffic") === state.prefs.traffic);
    });
    var border = document.getElementById("filterBorder");
    if (border) border.value = state.prefs.border;
  }

  function bindUi() {
    document.querySelectorAll("[data-view]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        state.prefs.view = btn.getAttribute("data-view");
        if (state.prefs.view === "nearest" && !state.userPos && state.geoStatus !== "pending") {
          requestGeo();
        }
        savePrefs();
        syncViewButtons();
        render();
      });
    });
    document.querySelectorAll("[data-traffic]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        state.prefs.traffic = btn.getAttribute("data-traffic");
        savePrefs();
        syncViewButtons();
        render();
      });
    });
    var border = document.getElementById("filterBorder");
    var st = document.getElementById("filterState");
    var port = document.getElementById("filterPort");
    if (border) {
      border.addEventListener("change", function () {
        state.prefs.border = border.value;
        state.prefs.state = "all";
        state.prefs.port = "all";
        savePrefs();
        render();
      });
    }
    if (st) {
      st.addEventListener("change", function () {
        state.prefs.state = st.value;
        state.prefs.port = "all";
        savePrefs();
        render();
      });
    }
    if (port) {
      port.addEventListener("change", function () {
        state.prefs.port = port.value;
        savePrefs();
        render();
      });
    }
    var more = document.getElementById("showMoreBtn");
    if (more) {
      more.addEventListener("click", function () {
        if (state.prefs.nearestLimit < state.items.length) {
          state.prefs.nearestLimit = Math.min(state.items.length, state.prefs.nearestLimit + 12);
        } else {
          state.prefs.nearestLimit = NEAREST_DEFAULT;
        }
        savePrefs();
        render();
      });
    }
    var en = document.getElementById("langEn");
    var es = document.getElementById("langEs");
    if (en) en.addEventListener("click", function () { setLang("en"); });
    if (es) es.addEventListener("click", function () { setLang("es"); });
    var themeBtn = document.getElementById("themeToggle");
    if (themeBtn) themeBtn.addEventListener("click", toggleTheme);
  }

  function setLang(lang) {
    state.lang = lang === "es" ? "es" : "en";
    try { localStorage.setItem(LANG_KEY, state.lang); } catch (_) {}
    applyChrome();
    syncFilterLabels();
    refreshAsOfStamp();
    render();
  }

  function syncFilterLabels() {
    var border = document.getElementById("filterBorder");
    if (border) {
      var cur = border.value;
      border.innerHTML =
        '<option value="all">' + t("borderAll") + "</option>" +
        '<option value="mexican">' + t("borderMx") + "</option>" +
        '<option value="canadian">' + t("borderCa") + "</option>";
      border.value = cur;
    }
    document.querySelectorAll("[data-view]").forEach(function (btn) {
      var v = btn.getAttribute("data-view");
      btn.textContent = v === "nearest" ? t("viewNearest") : t("viewBrowse");
    });
    document.querySelectorAll("[data-traffic]").forEach(function (btn) {
      var v = btn.getAttribute("data-traffic");
      btn.textContent =
        v === "all" ? t("trafficAll") :
        v === "passenger" ? t("trafficVeh") :
        v === "pedestrian" ? t("trafficPed") : t("trafficComm");
    });
    var latest = document.getElementById("latestLabel");
    if (latest) latest.textContent = t("latest");
  }

  function toggleTheme() {
    var next = document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    try { localStorage.setItem(THEME_KEY, next); } catch (_) {}
  }

  function bootThemeLang() {
    try {
      var lang = localStorage.getItem(LANG_KEY);
      if (lang === "es" || lang === "en") state.lang = lang;
      var theme = localStorage.getItem(THEME_KEY);
      if (theme !== "light" && theme !== "dark") {
        theme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
      }
      document.documentElement.setAttribute("data-theme", theme);
    } catch (_) {}
  }

  bootThemeLang();
  loadPrefs();
  applyChrome();
  syncFilterLabels();
  syncViewButtons();
  bindUi();
  loadFeed().catch(function (err) {
    var status = document.getElementById("statusLine");
    if (status) status.textContent = String(err && err.message ? err.message : err);
  });
  if (state.prefs.view === "nearest") requestGeo();
  else {
    state.geoStatus = "unavailable";
  }
})();
