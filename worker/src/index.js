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
    }),
  });
}

async function cachedFeed(ctx) {
  const cache = caches.default;
  const cacheReq = new Request(CACHE_KEY);
  const hit = await cache.match(cacheReq);
  if (hit) {
    // Re-apply CORS in case an older object was stored without full headers
    const headers = new Headers(hit.headers);
    const cors = corsHeaders({ "X-BWT-Source": "cache" });
    Object.keys(cors).forEach(function (k) {
      headers.set(k, cors[k]);
    });
    return new Response(hit.body, { status: hit.status, headers: headers });
  }

  const text = await fetchCbpFeed();
  const response = xmlResponse(text, "cbp-live", CACHE_TTL_SECONDS);
  if (ctx && ctx.waitUntil) {
    ctx.waitUntil(cache.put(cacheReq, response.clone()));
  } else {
    await cache.put(cacheReq, response.clone());
  }
  return response;
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
          }),
          {
            headers: corsHeaders({ "Content-Type": "application/json" }),
          }
        );
      }

      // Force a fresh pull past the edge cache
      if (url.searchParams.get("fresh") === "1") {
        const text = await fetchCbpFeed();
        return xmlResponse(text, "cbp-live-fresh", 0);
      }

      return await cachedFeed(ctx);
    } catch (err) {
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
        const text = await fetchCbpFeed();
        const response = xmlResponse(text, "cbp-cron", CACHE_TTL_SECONDS);
        await caches.default.put(new Request(CACHE_KEY), response);
      })()
    );
  },
};
