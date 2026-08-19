/**
 * Brownsville wait times — CBP RSS edge proxy
 *
 * Fetches official CBP XML server-side (no browser CORS), caches ~2 minutes,
 * and returns it with open CORS so GitHub Pages can call it directly.
 *
 * Deploy:  cd worker && npx wrangler deploy
 * Cron:    every 5 minutes (wrangler.toml) warms the cache
 */

const CBP_URL =
  "https://bwt.cbp.gov/api/bwtRss/HTML/44,43/42,45,44,43/42,45,43";

/** Stable cache key (not the browser request URL). */
const CACHE_KEY = "https://brownsville-bwt.internal/feed/bwt.xml";
const QUEUES_CACHE_KEY = "https://brownsville-bwt.internal/queues.json";
const CACHE_TTL_SECONDS = 120;
const QUEUES_TTL_SECONDS = 180;
/** Keep a longer copy in the Cache API so we can serve it if CBP is down. */
const STALE_TTL_SECONDS = 1800;

/**
 * Short northbound stretches (Mexico approach → US plaza) so live minus
 * typical drive time approximates the vehicle queue. Not SENTRI/pedestrian.
 */
const BRIDGE_ROUTES = [
  {
    id: "bm",
    label: "B&M",
    origin: { lat: 25.8908, lng: -97.505 },
    dest: { lat: 25.895, lng: -97.5058 },
  },
  {
    id: "gateway",
    label: "Gateway",
    origin: { lat: 25.8962, lng: -97.4978 },
    dest: { lat: 25.9012, lng: -97.4968 },
  },
  {
    id: "losIndios",
    label: "Los Indios",
    origin: { lat: 26.0265, lng: -97.738 },
    dest: { lat: 26.032, lng: -97.7395 },
  },
  {
    id: "veterans",
    label: "Veterans",
    origin: { lat: 25.881, lng: -97.477 },
    dest: { lat: 25.8875, lng: -97.4758 },
  },
];

function corsHeaders(extra) {
  return Object.assign(
    {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
      "Access-Control-Allow-Headers": "*",
      "Access-Control-Max-Age": "86400",
    },
    extra || {}
  );
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

function xmlResponse(text, source, maxAge) {
  return new Response(text, {
    status: 200,
    headers: corsHeaders({
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

function withSource(response, source) {
  const headers = new Headers(response.headers);
  const cors = corsHeaders({ "X-BWT-Source": source });
  Object.keys(cors).forEach(function (k) {
    headers.set(k, cors[k]);
  });
  return new Response(response.body, { status: response.status, headers: headers });
}

async function putCachedFeed(text, source) {
  const cacheReq = new Request(CACHE_KEY);
  const stored = xmlResponse(text, source, STALE_TTL_SECONDS);
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

function parseDurationSeconds(value) {
  if (value == null) return null;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const m = String(value).match(/^([\d.]+)s$/);
  if (!m) return null;
  return parseFloat(m[1]);
}

async function computeBridgeQueue(apiKey, bridge) {
  const res = await fetch("https://routes.googleapis.com/directions/v2:computeRoutes", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": "routes.duration,routes.staticDuration,routes.distanceMeters",
    },
    body: JSON.stringify({
      origin: {
        location: {
          latLng: { latitude: bridge.origin.lat, longitude: bridge.origin.lng },
        },
      },
      destination: {
        location: {
          latLng: { latitude: bridge.dest.lat, longitude: bridge.dest.lng },
        },
      },
      travelMode: "DRIVE",
      routingPreference: "TRAFFIC_AWARE",
    }),
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error("Routes HTTP " + res.status + (errText ? ": " + errText.slice(0, 180) : ""));
  }
  const data = await res.json();
  const route = data && data.routes && data.routes[0];
  if (!route) {
    return { id: bridge.id, label: bridge.label, minutes: null, ok: false, error: "no route" };
  }
  const live = parseDurationSeconds(route.duration);
  const typical = parseDurationSeconds(route.staticDuration);
  if (live == null || typical == null) {
    return { id: bridge.id, label: bridge.label, minutes: null, ok: false, error: "no duration" };
  }
  const delayMin = Math.max(0, Math.round((live - typical) / 60));
  return {
    id: bridge.id,
    label: bridge.label,
    minutes: delayMin,
    liveSeconds: Math.round(live),
    typicalSeconds: Math.round(typical),
    distanceMeters: route.distanceMeters || null,
    ok: true,
  };
}

function queuesJsonResponse(payload, maxAge) {
  return new Response(JSON.stringify(payload), {
    status: 200,
    headers: corsHeaders({
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control":
        maxAge === 0
          ? "no-store"
          : "public, max-age=" + maxAge + ", s-maxage=" + maxAge,
      "X-BWT-Source": payload.source || "queues",
    }),
  });
}

async function buildQueues(apiKey) {
  const results = await Promise.all(
    BRIDGE_ROUTES.map(function (bridge) {
      return computeBridgeQueue(apiKey, bridge).catch(function (err) {
        return {
          id: bridge.id,
          label: bridge.label,
          minutes: null,
          ok: false,
          error: err && err.message ? err.message : String(err),
        };
      });
    })
  );
  const bridges = {};
  results.forEach(function (row) {
    bridges[row.id] = row;
  });
  return {
    ok: true,
    configured: true,
    source: "google-routes",
    updatedAt: new Date().toISOString(),
    bridges: bridges,
  };
}

async function matchCachedQueues() {
  const hit = await caches.default.match(new Request(QUEUES_CACHE_KEY));
  return hit || null;
}

async function putCachedQueues(payload) {
  const stored = queuesJsonResponse(payload, QUEUES_TTL_SECONDS);
  stored.headers.set("X-BWT-Stored-At", payload.updatedAt || new Date().toISOString());
  await caches.default.put(new Request(QUEUES_CACHE_KEY), stored);
}

async function cachedQueues(apiKey, ctx, forceFresh) {
  if (!apiKey) {
    return queuesJsonResponse(
      { ok: true, configured: false, bridges: {}, source: "unconfigured" },
      60
    );
  }
  if (!forceFresh) {
    const hit = await matchCachedQueues();
    if (hit && cacheAgeSeconds(hit) < QUEUES_TTL_SECONDS) {
      return withSource(hit, "cache");
    }
  }
  const payload = await buildQueues(apiKey);
  if (ctx && ctx.waitUntil) {
    ctx.waitUntil(putCachedQueues(payload));
  } else {
    await putCachedQueues(payload);
  }
  return queuesJsonResponse(payload, QUEUES_TTL_SECONDS);
}

async function cachedFeed(ctx) {
  const hit = await matchCachedFeed();
  if (hit && cacheAgeSeconds(hit) < CACHE_TTL_SECONDS) {
    return withSource(hit, "cache");
  }

  try {
    const text = await fetchCbpFeed();
    if (ctx && ctx.waitUntil) {
      ctx.waitUntil(putCachedFeed(text, "cbp-live"));
    } else {
      await putCachedFeed(text, "cbp-live");
    }
    return xmlResponse(text, "cbp-live", CACHE_TTL_SECONDS);
  } catch (err) {
    if (hit) {
      return withSource(hit, "stale");
    }
    throw err;
  }
}

export default {
  async fetch(request, env, ctx) {
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders() });
    }
    if (request.method !== "GET" && request.method !== "HEAD") {
      return new Response("Method not allowed", {
        status: 405,
        headers: corsHeaders({ "Content-Type": "text/plain; charset=utf-8" }),
      });
    }

    try {
      const url = new URL(request.url);
      // Health / identity for debugging
      if (url.pathname === "/health") {
        return new Response(
          JSON.stringify({
            ok: true,
            service: "brownsville-bwt",
            cbp: CBP_URL,
            cacheTtlSeconds: CACHE_TTL_SECONDS,
            queuesConfigured: !!(env && env.GOOGLE_MAPS_API_KEY),
          }),
          {
            headers: corsHeaders({ "Content-Type": "application/json" }),
          }
        );
      }

      if (url.pathname === "/queues") {
        const forceFresh = url.searchParams.get("fresh") === "1";
        return await cachedQueues(env && env.GOOGLE_MAPS_API_KEY, ctx, forceFresh);
      }

      // Force a fresh pull past the edge cache
      if (url.searchParams.get("fresh") === "1") {
        try {
          const text = await fetchCbpFeed();
          ctx.waitUntil(putCachedFeed(text, "cbp-live-fresh"));
          return xmlResponse(text, "cbp-live-fresh", 0);
        } catch (freshErr) {
          const stale = await matchCachedFeed();
          if (stale) {
            return withSource(stale, "stale");
          }
          throw freshErr;
        }
      }

      return await cachedFeed(ctx);
    } catch (err) {
      const stale = await matchCachedFeed();
      if (stale) {
        return withSource(stale, "stale");
      }
      const message = err && err.message ? err.message : String(err);
      return new Response(JSON.stringify({ error: message }), {
        status: 502,
        headers: corsHeaders({ "Content-Type": "application/json" }),
      });
    }
  },

  /** Cron: warm the cache so visitors rarely wait on CBP. */
  async scheduled(event, env, ctx) {
    ctx.waitUntil(
      (async function () {
        try {
          const text = await fetchCbpFeed();
          await putCachedFeed(text, "cbp-cron");
        } catch (_) {
          // Keep the last good cache if CBP blips during cron.
        }
        if (env && env.GOOGLE_MAPS_API_KEY) {
          try {
            const payload = await buildQueues(env.GOOGLE_MAPS_API_KEY);
            await putCachedQueues(payload);
          } catch (_) {
            // Keep last Google snapshot if Routes blips.
          }
        }
      })()
    );
  },
};
