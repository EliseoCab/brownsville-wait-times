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
const CACHE_TTL_SECONDS = 120;
/** Keep a longer copy in the Cache API so we can serve it if CBP is down. */
const STALE_TTL_SECONDS = 1800;

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
      if (url.pathname === "/health") {
        return new Response(
          JSON.stringify({
            ok: true,
            service: "brownsville-bwt",
            cbp: CBP_URL,
            cacheTtlSeconds: CACHE_TTL_SECONDS,
          }),
          {
            headers: corsHeaders({ "Content-Type": "application/json" }),
          }
        );
      }

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

  async scheduled(event, env, ctx) {
    ctx.waitUntil(
      (async function () {
        try {
          const text = await fetchCbpFeed();
          await putCachedFeed(text, "cbp-cron");
        } catch (_) {
          // Keep the last good cache if CBP blips during cron.
        }
      })()
    );
  },
};
