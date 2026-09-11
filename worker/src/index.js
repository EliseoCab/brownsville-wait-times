/**
 * Brownsville wait times — CBP RSS edge proxy + @DFOLaredo X posts API
 *
 * Deploy:  cd worker && npx wrangler deploy
 * Secret:  npx wrangler secret put X_BEARER_TOKEN
 * Cron:    every 5 minutes warms the CBP cache
 *
 * Security: CORS allowlist, security headers, per-IP rate limits (Cache API).
 */

const CBP_URL =
  "https://bwt.cbp.gov/api/bwtRss/HTML/44,43/42,45,44,43/42,45,43";
const CBP_ALL_URL = "https://bwt.cbp.gov/xml/bwt.xml";

/** Stable cache key (not the browser request URL). */
const CACHE_KEY = "https://brownsville-bwt.internal/feed/bwt.xml";
const ALL_CACHE_KEY = "https://brownsville-bwt.internal/feed/bwt-all.xml";
const X_CACHE_KEY = "https://brownsville-bwt.internal/x/dfolaredo.json";
const CACHE_TTL_SECONDS = 120;
/** Keep a longer copy in the Cache API so we can serve it if CBP is down. */
const STALE_TTL_SECONDS = 1800;
const ALL_CACHE_TTL_SECONDS = 180; // 3 min for national feed
const X_CACHE_TTL_SECONDS = 300; // 5 min
const X_SCREEN_NAME = "DFOLaredo";
const X_POST_COUNT = 5;

/** Allowed browser Origins for CORS (GitHub Pages + local preview). */
const ALLOWED_ORIGINS = [
  "https://eliseocab.github.io",
  "http://localhost",
  "http://127.0.0.1",
];

/** Per-IP limits: { limit, windowSeconds } */
const RATE_LIMITS = {
  xFresh: { limit: 8, windowSeconds: 60 }, // ?fresh=1 hits X API
  x: { limit: 45, windowSeconds: 60 },
  feedFresh: { limit: 20, windowSeconds: 60 },
  feed: { limit: 90, windowSeconds: 60 },
  allFresh: { limit: 12, windowSeconds: 60 },
  all: { limit: 60, windowSeconds: 60 },
  health: { limit: 60, windowSeconds: 60 },
  checkin: { limit: 6, windowSeconds: 3600 },
  checkinGet: { limit: 60, windowSeconds: 60 },
};

function isAllowedOrigin(origin) {
  if (!origin) return false;
  if (ALLOWED_ORIGINS.indexOf(origin) !== -1) return true;
  // Any localhost / 127.0.0.1 port for local python/http.server previews
  return /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin);
}

function corsOrigin(request) {
  const origin = request && request.headers ? request.headers.get("Origin") : null;
  if (origin && isAllowedOrigin(origin)) return origin;
  // Non-browser clients (curl) have no Origin — allow read
  if (!origin) return "*";
  // Unknown browser Origin: do not reflect it
  return "https://eliseocab.github.io";
}

function securityHeaders() {
  return {
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "no-referrer",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=()",
    "X-Frame-Options": "DENY",
    "Cross-Origin-Resource-Policy": "cross-origin",
  };
}

function corsHeaders(request, extra) {
  return Object.assign(
    {
      "Access-Control-Allow-Origin": corsOrigin(request),
      "Access-Control-Allow-Methods": "GET, HEAD, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Accept, Content-Type",
      "Access-Control-Max-Age": "86400",
      Vary: "Origin",
    },
    securityHeaders(),
    extra || {}
  );
}

function clientIp(request) {
  return (
    request.headers.get("CF-Connecting-IP") ||
    request.headers.get("X-Forwarded-For") ||
    "unknown"
  );
}

/**
 * Best-effort per-IP rate limit using the Cache API (edge-local, free-tier friendly).
 * Returns null if allowed, or a 429 Response if blocked.
 */
async function enforceRateLimit(request, bucket) {
  const cfg = RATE_LIMITS[bucket] || RATE_LIMITS.feed;
  const ip = clientIp(request);
  const windowId = Math.floor(Date.now() / (cfg.windowSeconds * 1000));
  const keyUrl =
    "https://brownsville-bwt.internal/ratelimit/" +
    bucket +
    "/" +
    encodeURIComponent(ip) +
    "/" +
    windowId;
  const cacheReq = new Request(keyUrl);
  const cache = caches.default;

  let count = 0;
  try {
    const hit = await cache.match(cacheReq);
    if (hit) {
      const body = await hit.text();
      count = parseInt(body, 10) || 0;
    }
  } catch (_) {
    /* ignore cache read errors */
  }

  count += 1;

  try {
    await cache.put(
      cacheReq,
      new Response(String(count), {
        headers: {
          "Cache-Control": "max-age=" + cfg.windowSeconds,
          "Content-Type": "text/plain",
        },
      })
    );
  } catch (_) {
    /* ignore cache write errors — fail open */
  }

  const remaining = Math.max(0, cfg.limit - count);
  const headers = {
    "X-RateLimit-Limit": String(cfg.limit),
    "X-RateLimit-Remaining": String(remaining),
    "X-RateLimit-Window": String(cfg.windowSeconds),
  };

  if (count > cfg.limit) {
    return new Response(
      JSON.stringify({
        ok: false,
        error: "Rate limit exceeded. Try again shortly.",
        bucket: bucket,
        retryAfterSeconds: cfg.windowSeconds,
      }),
      {
        status: 429,
        headers: corsHeaders(request, {
          "Content-Type": "application/json; charset=utf-8",
          "Cache-Control": "no-store",
          "Retry-After": String(cfg.windowSeconds),
          ...headers,
        }),
      }
    );
  }

  return { allowed: true, headers: headers };
}

function withRateHeaders(response, rateMeta) {
  if (!rateMeta || !rateMeta.headers) return response;
  const headers = new Headers(response.headers);
  Object.keys(rateMeta.headers).forEach(function (k) {
    headers.set(k, rateMeta.headers[k]);
  });
  return new Response(response.body, { status: response.status, headers: headers });
}

function jsonResponse(request, obj, status, maxAge) {
  const age = typeof maxAge === "number" ? maxAge : 60;
  return new Response(JSON.stringify(obj), {
    status: status || 200,
    headers: corsHeaders(request, {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control":
        age === 0
          ? "no-store"
          : "public, max-age=" + age + ", s-maxage=" + age,
    }),
  });
}

async function fetchCbpFeed() {
  const res = await fetch(CBP_URL, {
    headers: {
      Accept: "application/xml, text/xml, */*",
      "User-Agent":
        "brownsville-wait-times-worker/1.0 (+https://eliseocab.github.io/brownsville-wait-times/)",
    },
  });
  if (!res.ok) {
    throw new Error("CBP HTTP " + res.status);
  }
  const text = await res.text();
  if (!text || text.indexOf("<item>") === -1) {
    throw new Error("CBP feed missing <item> entries");
  }
  return text;
}

async function fetchCbpAllFeed() {
  const res = await fetch(CBP_ALL_URL, {
    headers: {
      Accept: "application/xml, text/xml, */*",
      "User-Agent":
        "brownsville-wait-times-worker/1.0 (+https://eliseocab.github.io/brownsville-wait-times/)",
    },
  });
  if (!res.ok) {
    throw new Error("CBP all-ports HTTP " + res.status);
  }
  const text = await res.text();
  if (!text || text.indexOf("<port>") === -1) {
    throw new Error("CBP all-ports feed missing <port> entries");
  }
  return text;
}

async function putCachedAllFeed(text, source) {
  const stored = new Response(text, {
    status: 200,
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=" + STALE_TTL_SECONDS,
      "X-BWT-Source": source,
      "X-BWT-Stored-At": new Date().toISOString(),
    },
  });
  await caches.default.put(new Request(ALL_CACHE_KEY), stored);
}

async function matchCachedAllFeed() {
  return (await caches.default.match(new Request(ALL_CACHE_KEY))) || null;
}

async function cachedAllFeed(request, ctx, fresh) {
  const hit = await matchCachedAllFeed();
  if (!fresh && hit && cacheAgeSeconds(hit) < ALL_CACHE_TTL_SECONDS) {
    return withSource(request, hit, "all-cache", ALL_CACHE_TTL_SECONDS);
  }
  try {
    const text = await fetchCbpAllFeed();
    if (ctx && ctx.waitUntil) {
      ctx.waitUntil(putCachedAllFeed(text, "cbp-all-live"));
    } else {
      await putCachedAllFeed(text, "cbp-all-live");
    }
    return xmlResponse(request, text, fresh ? "cbp-all-fresh" : "cbp-all-live", fresh ? 0 : ALL_CACHE_TTL_SECONDS);
  } catch (err) {
    if (hit) return withSource(request, hit, "all-stale", 30);
    throw err;
  }
}

function xmlResponse(request, text, source, maxAge) {
  return new Response(text, {
    status: 200,
    headers: corsHeaders(request, {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control":
        maxAge === 0
          ? "no-store"
          : "public, max-age=" + maxAge + ", s-maxage=" + maxAge,
      "X-BWT-Source": source,
      "X-BWT-Stored-At": new Date().toISOString(),
    }),
  });
}

function withSource(request, response, source, clientMaxAge) {
  const headers = new Headers(response.headers);
  const age =
    typeof clientMaxAge === "number" ? clientMaxAge : CACHE_TTL_SECONDS;
  const cors = corsHeaders(request, {
    "X-BWT-Source": source,
    "Cache-Control":
      age === 0
        ? "no-store"
        : "public, max-age=" + age + ", s-maxage=" + age,
  });
  Object.keys(cors).forEach(function (k) {
    headers.set(k, cors[k]);
  });
  return new Response(response.body, { status: response.status, headers: headers });
}

async function putCachedFeed(text, source) {
  const cacheReq = new Request(CACHE_KEY);
  // Internal cache entry — request object not needed for CORS
  const stored = new Response(text, {
    status: 200,
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=" + STALE_TTL_SECONDS,
      "X-BWT-Source": source,
      "X-BWT-Stored-At": new Date().toISOString(),
    },
  });
  await caches.default.put(cacheReq, stored);
}

async function matchCachedFeed() {
  const hit = await caches.default.match(new Request(CACHE_KEY));
  return hit || null;
}

function cacheAgeSeconds(response) {
  const raw = response.headers.get("X-BWT-Stored-At");
  if (!raw) return Number.POSITIVE_INFINITY;
  const ms = Date.now() - Date.parse(raw);
  return Number.isFinite(ms) ? ms / 1000 : Number.POSITIVE_INFINITY;
}

async function cachedFeed(request, ctx) {
  const hit = await matchCachedFeed();
  if (hit && cacheAgeSeconds(hit) < CACHE_TTL_SECONDS) {
    return withSource(request, hit, "cache", CACHE_TTL_SECONDS);
  }

  try {
    const text = await fetchCbpFeed();
    if (ctx && ctx.waitUntil) {
      ctx.waitUntil(putCachedFeed(text, "cbp-live"));
    } else {
      await putCachedFeed(text, "cbp-live");
    }
    return xmlResponse(request, text, "cbp-live", CACHE_TTL_SECONDS);
  } catch (err) {
    if (hit) {
      return withSource(request, hit, "stale", 30);
    }
    throw err;
  }
}

async function fetchDfoLaredoPosts(env) {
  const token = env && env.X_BEARER_TOKEN;
  if (!token) {
    throw new Error("X_BEARER_TOKEN secret is not configured");
  }

  const userRes = await fetch(
    "https://api.twitter.com/2/users/by/username/" +
      encodeURIComponent(X_SCREEN_NAME) +
      "?user.fields=name,username,profile_image_url",
    {
      headers: {
        Authorization: "Bearer " + token,
        Accept: "application/json",
      },
    }
  );
  if (!userRes.ok) {
    const errBody = await userRes.text();
    throw new Error("X user lookup HTTP " + userRes.status + ": " + errBody.slice(0, 200));
  }
  const userJson = await userRes.json();
  const user = userJson && userJson.data;
  if (!user || !user.id) {
    throw new Error("X user lookup returned no user");
  }

  const tweetsUrl =
    "https://api.twitter.com/2/users/" +
    user.id +
    "/tweets?max_results=" +
    X_POST_COUNT +
    "&exclude=retweets,replies" +
    "&tweet.fields=created_at,public_metrics,entities" +
    "&expansions=attachments.media_keys" +
    "&media.fields=url,preview_image_url,type";

  const tweetsRes = await fetch(tweetsUrl, {
    headers: {
      Authorization: "Bearer " + token,
      Accept: "application/json",
    },
  });
  if (!tweetsRes.ok) {
    const errBody = await tweetsRes.text();
    throw new Error("X tweets HTTP " + tweetsRes.status + ": " + errBody.slice(0, 200));
  }
  const tweetsJson = await tweetsRes.json();
  const mediaByKey = {};
  const media = (((tweetsJson || {}).includes || {}).media) || [];
  for (let i = 0; i < media.length; i++) {
    const m = media[i];
    if (m && m.media_key) mediaByKey[m.media_key] = m;
  }

  const posts = ((tweetsJson && tweetsJson.data) || []).map(function (tw) {
    const keys = (tw.attachments && tw.attachments.media_keys) || [];
    const images = [];
    for (let i = 0; i < keys.length; i++) {
      const m = mediaByKey[keys[i]];
      if (!m) continue;
      const src = m.url || m.preview_image_url;
      if (src) images.push({ type: m.type || "photo", url: src });
    }
    return {
      id: tw.id,
      text: tw.text || "",
      createdAt: tw.created_at || null,
      url: "https://x.com/" + user.username + "/status/" + tw.id,
      metrics: tw.public_metrics || null,
      images: images,
    };
  });

  return {
    ok: true,
    user: {
      id: user.id,
      name: user.name,
      username: user.username,
      avatar: user.profile_image_url
        ? String(user.profile_image_url).replace("_normal", "_bigger")
        : null,
      profileUrl: "https://x.com/" + user.username,
    },
    posts: posts,
    fetchedAt: new Date().toISOString(),
  };
}

async function cachedDfoPosts(request, env, ctx, fresh) {
  const cache = caches.default;
  const cacheReq = new Request(X_CACHE_KEY);

  if (!fresh) {
    const hit = await cache.match(cacheReq);
    if (hit) {
      const ageHdr = hit.headers.get("X-BWT-Stored-At");
      const age = ageHdr
        ? (Date.now() - Date.parse(ageHdr)) / 1000
        : Number.POSITIVE_INFINITY;
      if (Number.isFinite(age) && age < X_CACHE_TTL_SECONDS) {
        const headers = new Headers(hit.headers);
        Object.keys(corsHeaders(request)).forEach(function (k) {
          headers.set(k, corsHeaders(request)[k]);
        });
        headers.set("X-BWT-Source", "x-cache");
        return new Response(hit.body, { status: hit.status, headers: headers });
      }
    }
  }

  const payload = await fetchDfoLaredoPosts(env);
  const res = new Response(JSON.stringify(payload), {
    status: 200,
    headers: corsHeaders(request, {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "public, max-age=" + X_CACHE_TTL_SECONDS,
      "X-BWT-Source": "x-live",
      "X-BWT-Stored-At": new Date().toISOString(),
    }),
  });
  if (ctx && ctx.waitUntil) {
    ctx.waitUntil(cache.put(cacheReq, res.clone()));
  } else {
    await cache.put(cacheReq, res.clone());
  }
  return res;
}

const CHECKIN_BRIDGES = {
  bm: { lat: 25.899, lng: -97.497 },
  gateway: { lat: 25.9017, lng: -97.4975 },
  veterans: { lat: 25.882, lng: -97.478 },
  "los-indios": { lat: 26.048, lng: -97.738 }
};
const CHECKIN_LANES = {
  vehicle_gen: true,
  vehicle_sentri: true,
  ped_gen: true,
  ped_ready: true
};
const CHECKIN_WINDOW_MS = 45 * 60 * 1000;
const CHECKIN_COOLDOWN_MS = 10 * 60 * 1000;
const CHECKIN_TTL_MS = 24 * 60 * 60 * 1000;

function checkinMiles(a, b) {
  const toRad = function (d) { return (d * Math.PI) / 180; };
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const s =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return 2 * 3958.8 * Math.asin(Math.min(1, Math.sqrt(s)));
}

function roundCoord(n) {
  return Math.round(Number(n) * 10000) / 10000;
}

function median(nums) {
  if (!nums.length) return null;
  const s = nums.slice().sort(function (a, b) { return a - b; });
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : Math.round((s[mid - 1] + s[mid]) / 2);
}

async function hashIpDay(ip) {
  const day = new Date().toISOString().slice(0, 10);
  const buf = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(String(ip || "unknown") + "|" + day)
  );
  return Array.from(new Uint8Array(buf))
    .map(function (b) { return b.toString(16).padStart(2, "0"); })
    .join("")
    .slice(0, 16);
}

function laneAllowed(bridge, lane) {
  if (!CHECKIN_LANES[lane]) return false;
  if (lane === "vehicle_sentri") return bridge === "veterans";
  if (lane === "ped_ready") return bridge === "gateway";
  if (lane === "ped_gen") return bridge !== "los-indios";
  return true;
}

async function handleCheckinPost(request, env) {
  if (!env || !env.DB) {
    return jsonResponse(request, { ok: false, error: "Check-ins not configured" }, 503, 0);
  }
  const origin = request.headers.get("Origin");
  if (origin && !isAllowedOrigin(origin)) {
    return jsonResponse(request, { ok: false, error: "Forbidden" }, 403, 0);
  }
  let body;
  try {
    body = await request.json();
  } catch (_) {
    return jsonResponse(request, { ok: false, error: "Invalid JSON" }, 400, 0);
  }
  const bridge = String(body.bridge || "").toLowerCase();
  const lane = String(body.lane || "");
  const waitMin = Number(body.wait_min);
  const status = body.status === "en_route" ? "en_route" : "in_queue";
  if (!CHECKIN_BRIDGES[bridge] || !laneAllowed(bridge, lane)) {
    return jsonResponse(request, { ok: false, error: "Unknown bridge or lane" }, 400, 0);
  }
  if (!Number.isFinite(waitMin) || waitMin < 0 || waitMin > 180) {
    return jsonResponse(request, { ok: false, error: "Wait must be 0–180" }, 400, 0);
  }
  const lat = body.lat == null ? null : Number(body.lat);
  const lng = body.lng == null ? null : Number(body.lng);
  const acc = body.acc_m == null ? null : Number(body.acc_m);
  const heading = body.heading == null ? null : Number(body.heading);
  const cbpMin = body.cbp_min == null ? null : Number(body.cbp_min);
  let lowAcc = 0;
  if (lat != null && lng != null && Number.isFinite(lat) && Number.isFinite(lng)) {
    const miles = checkinMiles({ lat: lat, lng: lng }, CHECKIN_BRIDGES[bridge]);
    if (status !== "en_route" && miles > 3) {
      return jsonResponse(request, { ok: false, error: "Too far from that bridge" }, 400, 0);
    }
    if (acc != null && Number.isFinite(acc) && acc > 150) lowAcc = 1;
  }
  const ipHash = await hashIpDay(clientIp(request));
  const now = Date.now();
  const recent = await env.DB.prepare(
    "SELECT created_at FROM checkins WHERE ip_hash = ? AND bridge = ? AND lane = ? AND created_at > ? LIMIT 1"
  ).bind(ipHash, bridge, lane, now - CHECKIN_COOLDOWN_MS).first();
  if (recent) {
    return jsonResponse(request, { ok: false, error: "Already reported this lane. Try again in 10 minutes." }, 429, 0);
  }
  await env.DB.prepare(
    "INSERT INTO checkins (created_at, bridge, lane, wait_min, status, lat, lng, acc_m, heading, cbp_min, low_acc, ip_hash) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
  ).bind(
    now,
    bridge,
    lane,
    Math.round(waitMin),
    status,
    lat != null && Number.isFinite(lat) ? roundCoord(lat) : null,
    lng != null && Number.isFinite(lng) ? roundCoord(lng) : null,
    acc != null && Number.isFinite(acc) ? Math.round(acc) : null,
    heading != null && Number.isFinite(heading) ? Math.round(heading) : null,
    cbpMin != null && Number.isFinite(cbpMin) ? Math.round(cbpMin) : null,
    lowAcc,
    ipHash
  ).run();
  return jsonResponse(request, { ok: true }, 200, 0);
}

async function handleCheckinSummary(request, env) {
  if (!env || !env.DB) {
    return jsonResponse(request, { ok: true, windowMin: 45, rows: [] }, 200, 60);
  }
  const since = Date.now() - CHECKIN_WINDOW_MS;
  const res = await env.DB.prepare(
    "SELECT bridge, lane, wait_min, created_at FROM checkins WHERE created_at > ? AND status = 'in_queue'"
  ).bind(since).all();
  const groups = {};
  (res && res.results ? res.results : []).forEach(function (row) {
    const key = row.bridge + "|" + row.lane;
    if (!groups[key]) {
      groups[key] = { bridge: row.bridge, lane: row.lane, waits: [], latest: 0 };
    }
    groups[key].waits.push(Number(row.wait_min));
    if (row.created_at > groups[key].latest) groups[key].latest = row.created_at;
  });
  const rows = Object.keys(groups).map(function (key) {
    const g = groups[key];
    return {
      bridge: g.bridge,
      lane: g.lane,
      median: median(g.waits),
      n: g.waits.length,
      latest: g.latest
    };
  });
  return jsonResponse(request, { ok: true, windowMin: 45, rows: rows }, 200, 60);
}

async function purgeOldCheckins(env) {
  if (!env || !env.DB) return;
  await env.DB.prepare("DELETE FROM checkins WHERE created_at < ?")
    .bind(Date.now() - CHECKIN_TTL_MS)
    .run();
}

export default {
  async fetch(request, env, ctx) {
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders(request) });
    }

    try {
      const url = new URL(request.url);
      const path = url.pathname.replace(/\/+$/, "") || "/";
      const fresh = url.searchParams.get("fresh") === "1";

      if (path === "/checkins" && request.method === "POST") {
        const rate = await enforceRateLimit(request, "checkin");
        if (rate instanceof Response) return rate;
        return withRateHeaders(await handleCheckinPost(request, env), rate);
      }
      if (path === "/checkins/summary" && (request.method === "GET" || request.method === "HEAD")) {
        const rate = await enforceRateLimit(request, "checkinGet");
        if (rate instanceof Response) return rate;
        return withRateHeaders(await handleCheckinSummary(request, env), rate);
      }

    if (request.method !== "GET" && request.method !== "HEAD") {
      return new Response("Method not allowed", {
        status: 405,
        headers: corsHeaders(request, { "Content-Type": "text/plain; charset=utf-8" }),
      });
    }

      if (path === "/health") {
        const rate = await enforceRateLimit(request, "health");
        if (rate instanceof Response) return rate;
        return withRateHeaders(
          jsonResponse(
            request,
            {
              ok: true,
              service: "brownsville-bwt",
              cbp: CBP_URL,
              cbpAll: CBP_ALL_URL,
              all: "/all",
              x: "/x/dfolaredo",
              hasXBearer: !!(env && env.X_BEARER_TOKEN),
              cacheTtlSeconds: CACHE_TTL_SECONDS,
              rateLimits: {
                x: RATE_LIMITS.x,
                xFresh: RATE_LIMITS.xFresh,
                feed: RATE_LIMITS.feed,
                feedFresh: RATE_LIMITS.feedFresh,
                all: RATE_LIMITS.all,
                allFresh: RATE_LIMITS.allFresh,
              },
            },
            200,
            60
          ),
          rate
        );
      }

      if (path === "/all") {
        const rate = await enforceRateLimit(request, fresh ? "allFresh" : "all");
        if (rate instanceof Response) return rate;
        return withRateHeaders(await cachedAllFeed(request, ctx, fresh), rate);
      }

      if (path === "/x/dfolaredo") {
        const rate = await enforceRateLimit(request, fresh ? "xFresh" : "x");
        if (rate instanceof Response) return rate;
        try {
          const res = await cachedDfoPosts(request, env, ctx, fresh);
          return withRateHeaders(res, rate);
        } catch (xErr) {
          const message = xErr && xErr.message ? xErr.message : String(xErr);
          return withRateHeaders(jsonResponse(request, { ok: false, error: message }, 502, 0), rate);
        }
      }

      // Default: CBP Brownsville RSS (existing behavior for FEED_PROXY_URL root)
      if (fresh) {
        const rate = await enforceRateLimit(request, "feedFresh");
        if (rate instanceof Response) return rate;
        try {
          const text = await fetchCbpFeed();
          ctx.waitUntil(putCachedFeed(text, "cbp-live-fresh"));
          return withRateHeaders(xmlResponse(request, text, "cbp-live-fresh", 0), rate);
        } catch (freshErr) {
          const stale = await matchCachedFeed();
          if (stale) {
            return withRateHeaders(withSource(request, stale, "stale", 30), rate);
          }
          throw freshErr;
        }
      }

      const rate = await enforceRateLimit(request, "feed");
      if (rate instanceof Response) return rate;
      return withRateHeaders(await cachedFeed(request, ctx), rate);
    } catch (err) {
      const stale = await matchCachedFeed();
      if (stale) {
        return withSource(request, stale, "stale", 30);
      }
      const message = err && err.message ? err.message : String(err);
      return new Response(JSON.stringify({ error: message }), {
        status: 502,
        headers: corsHeaders(request, { "Content-Type": "application/json; charset=utf-8" }),
      });
    }
  },

  async scheduled(event, env, ctx) {
    ctx.waitUntil(
      (async function () {
        try {
          const text = await fetchCbpFeed();
          await putCachedFeed(text, "cbp-cron");
        } catch (_) {
          // Keep the last good cache if CBP blips during cron.
        }
        try {
          const allText = await fetchCbpAllFeed();
          await putCachedAllFeed(allText, "cbp-all-cron");
        } catch (_) {
          // Keep last good national feed if CBP blips.
        }
        try {
          // Cron warm — synthetic request for CORS/header helpers
          const fakeReq = new Request("https://brownsville-bwt.internal/x/dfolaredo?fresh=1");
          await cachedDfoPosts(fakeReq, env, null, true);
        } catch (_) {
          // X warm is best-effort
        }
        try {
          await purgeOldCheckins(env);
        } catch (_) {
          // Check-in TTL is best-effort
        }
      })()
    );
  },
};
