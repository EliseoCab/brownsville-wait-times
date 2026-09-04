/**
 * Brownsville wait times — CBP RSS edge proxy + @DFOLaredo X posts API
 *
 * Deploy:  cd worker && npx wrangler deploy
 * Secret:  npx wrangler secret put X_BEARER_TOKEN
 * Cron:    every 5 minutes warms the CBP cache
 */

const CBP_URL =
  "https://bwt.cbp.gov/api/bwtRss/HTML/44,43/42,45,44,43/42,45,43";

/** Stable cache key (not the browser request URL). */
const CACHE_KEY = "https://brownsville-bwt.internal/feed/bwt.xml";
const X_CACHE_KEY = "https://brownsville-bwt.internal/x/dfolaredo.json";
const CACHE_TTL_SECONDS = 120;
/** Keep a longer copy in the Cache API so we can serve it if CBP is down. */
const STALE_TTL_SECONDS = 1800;
const X_CACHE_TTL_SECONDS = 300; // 5 min
const X_SCREEN_NAME = "DFOLaredo";
const X_POST_COUNT = 5;

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

function jsonResponse(obj, status, maxAge) {
  const age = typeof maxAge === "number" ? maxAge : 60;
  return new Response(JSON.stringify(obj), {
    status: status || 200,
    headers: corsHeaders({
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

function withSource(response, source, clientMaxAge) {
  const headers = new Headers(response.headers);
  const age =
    typeof clientMaxAge === "number" ? clientMaxAge : CACHE_TTL_SECONDS;
  const cors = corsHeaders({
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
    return withSource(hit, "cache", CACHE_TTL_SECONDS);
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
      return withSource(hit, "stale", 30);
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

async function cachedDfoPosts(env, ctx, fresh) {
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
        Object.keys(corsHeaders()).forEach(function (k) {
          headers.set(k, corsHeaders()[k]);
        });
        headers.set("X-BWT-Source", "x-cache");
        return new Response(hit.body, { status: hit.status, headers: headers });
      }
    }
  }

  const payload = await fetchDfoLaredoPosts(env);
  const res = new Response(JSON.stringify(payload), {
    status: 200,
    headers: corsHeaders({
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
      const path = url.pathname.replace(/\/+$/, "") || "/";

      if (path === "/health") {
        return jsonResponse(
          {
            ok: true,
            service: "brownsville-bwt",
            cbp: CBP_URL,
            x: "/x/dfolaredo",
            hasXBearer: !!(env && env.X_BEARER_TOKEN),
            cacheTtlSeconds: CACHE_TTL_SECONDS,
          },
          200,
          60
        );
      }

      if (path === "/x/dfolaredo") {
        try {
          return await cachedDfoPosts(env, ctx, url.searchParams.get("fresh") === "1");
        } catch (xErr) {
          const message = xErr && xErr.message ? xErr.message : String(xErr);
          return jsonResponse({ ok: false, error: message }, 502, 0);
        }
      }

      // Default: CBP Brownsville RSS (existing behavior for FEED_PROXY_URL root)
      if (url.searchParams.get("fresh") === "1") {
        try {
          const text = await fetchCbpFeed();
          ctx.waitUntil(putCachedFeed(text, "cbp-live-fresh"));
          return xmlResponse(text, "cbp-live-fresh", 0);
        } catch (freshErr) {
          const stale = await matchCachedFeed();
          if (stale) {
            return withSource(stale, "stale", 30);
          }
          throw freshErr;
        }
      }

      return await cachedFeed(ctx);
    } catch (err) {
      const stale = await matchCachedFeed();
      if (stale) {
        return withSource(stale, "stale", 30);
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
        try {
          await cachedDfoPosts(env, null, true);
        } catch (_) {
          // X warm is best-effort
        }
      })()
    );
  },
};
