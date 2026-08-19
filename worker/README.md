# CBP feed proxy (Cloudflare Worker)

Part of the **hybrid** data path:

| Priority | Source | Role |
|----------|--------|------|
| 1 | **This Worker** | Live CBP XML with CORS + ~2 min cache; last-good feed if CBP blips |
| 2 | GitHub Pages `data/bwt.xml` | Actions mirror (fast backup) |
| 3 | Free CORS proxies | Last resort if Worker and mirror both fail |

## Deploy (one-time, ~5 minutes)

1. Free account: https://dash.cloudflare.com/sign-up  
2. From this folder:

```bash
cd worker
npm install
npx wrangler login
npx wrangler deploy
```

3. Wrangler prints a URL like:

```text
https://brownsville-bwt.<your-subdomain>.workers.dev
```

4. Paste that URL into the site root `index.html`:

```js
const FEED_PROXY_URL = "https://brownsville-bwt.<your-subdomain>.workers.dev";
```

5. Commit and push `index.html` so GitHub Pages picks it up.

## Check it works

```bash
# Should return CBP RSS XML
curl -sS "https://brownsville-bwt.<your-subdomain>.workers.dev" | head -c 400

# JSON health
curl -sS "https://brownsville-bwt.<your-subdomain>.workers.dev/health"

# Bypass edge cache
curl -sS "https://brownsville-bwt.<your-subdomain>.workers.dev?fresh=1" | head -c 200
```

On the live page, after hard-refresh, **Refresh times** should show **Live · CBP proxy**.

## What the Worker does

- `GET /` — CBP Brownsville RSS (cached ~2 minutes at the edge)
- `GET /?fresh=1` — skip edge cache, hit CBP now
- `GET /health` — small JSON status
- `GET /queues` — Google vehicle-queue estimates (needs `GOOGLE_MAPS_API_KEY` secret)
- `OPTIONS` — CORS preflight
- **Cron every 5 min** — re-fetch CBP so the cache stays warm
- If CBP is down, serves the last good feed (up to ~30 minutes old) instead of failing

### Google road-queue number (optional)

Store the Routes API key as a Worker secret (never in `index.html`):

```bash
cd worker
npx wrangler secret put GOOGLE_MAPS_API_KEY
```

Paste the key when prompted. Wrangler deploys again. Then:

```bash
curl -sS "https://brownsville-bwt.borderwait.workers.dev/health"
curl -sS "https://brownsville-bwt.borderwait.workers.dev/queues"
```

`queuesConfigured` should be `true`. The page shows **Road ~N min** under vehicle waits.

## Redeploy after code changes

```bash
cd worker
npx wrangler deploy
```

No need to change `FEED_PROXY_URL` unless the workers.dev hostname changes.
