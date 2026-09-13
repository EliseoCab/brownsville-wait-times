# CBP feed proxy (Cloudflare Worker)

Part of the **hybrid** data path:

| Priority | Source | Role |
|----------|--------|------|
| 1 | **This Worker** | Live CBP XML with CORS + ~2 min cache; last-good feed if CBP blips |
| 2 | GitHub Pages `data/bwt.xml` + `data/bwt-all.xml` | Actions mirrors (fast backup) |
| 3 | Free CORS proxies | Last resort if Worker and mirror both fail (homepage only) |

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

5. Commit and push `index.html` (and `all-ports/all-ports.js`, which uses the same Worker + `/all`) so GitHub Pages picks it up.

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
- `GET /all` — national land-border XML (`bwt.cbp.gov/xml/bwt.xml`, cached ~3 minutes; used by `all-ports/`)
- `GET /all?fresh=1` — skip edge cache for the national feed
- `GET /health` — small JSON status (includes rate-limit config)
- `POST /checkins` — `kind: wait` (minutes report) or `kind: pin` (location for the line map)
- `GET /checkins/summary` — 45-minute wait medians by bridge + lane
- `GET /checkins/heat` — recent location pins for the queue heatmap
- `OPTIONS` — CORS preflight
- **Cron every 5 min** — re-fetch CBP so the cache stays warm
- **Cron at :17 and :47 UTC** — backup `workflow_dispatch` of **Check data freshness (lag alarm)** (see below)
- If CBP is down, serves the last good feed (up to ~30 minutes old) instead of failing

## Security

- **Secret hygiene:** `X_BEARER_TOKEN` and `GITHUB_DISPATCH_TOKEN` stay in Wrangler secrets only (never in git / Pages JS)
- **CORS allowlist:** `https://eliseocab.github.io` + localhost preview origins (unknown Origins are not reflected)
- **Security headers** on every response: `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, `X-Frame-Options`, `Cross-Origin-Resource-Policy`
- **Per-IP rate limits** (Cache API, best-effort per edge):

| Route | Limit |
|-------|--------|
| `GET /x/dfolaredo?fresh=1` | 8 / minute |
| `GET /x/dfolaredo` | 45 / minute |
| `GET /?fresh=1` | 20 / minute |
| `GET /` (cached feed) | 90 / minute |
| `GET /all?fresh=1` | 12 / minute |
| `GET /all` (cached national feed) | 60 / minute |
| `GET /health` | 60 / minute |
| `POST /checkins` | 6 / hour |
| `GET /checkins/summary` | 60 / minute |

Over-limit requests return **429** with `Retry-After` and `X-RateLimit-*` headers.

## Redeploy after code changes

```bash
cd worker
npx wrangler deploy
```

No need to change `FEED_PROXY_URL` unless the workers.dev hostname changes.

## @DFOLaredo posts (`/x/dfolaredo`)

The Worker exposes latest posts for the page carousel:

```text
GET https://brownsville-bwt.borderwait.workers.dev/x/dfolaredo
```

### Secret (required)

Use an **X API Bearer Token** (not the API Key / API Key Secret):

1. https://developer.x.com/en/portal/dashboard  
2. Your App → **Keys and tokens** → **Bearer Token** → copy  
3. Store it:

```bash
cd worker
npx wrangler secret put X_BEARER_TOKEN
# paste the Bearer Token when prompted (no quotes)
npx wrangler secret list   # should show X_BEARER_TOKEN
npx wrangler deploy
```

### Check

```bash
curl -sS "https://brownsville-bwt.borderwait.workers.dev/health"
# hasXBearer should be true

curl -sS "https://brownsville-bwt.borderwait.workers.dev/x/dfolaredo?fresh=1" | head -c 400
# should return JSON with ok:true and posts[]
```

If you see `401 Unauthorized`, the secret name is fine but the token value is wrong or the app lacks read access.

## Lag-alarm backup kick (`GITHUB_DISPATCH_TOKEN`)

GitHub Actions cron for **Check data freshness (lag alarm)** (`7,22,37,52 * * * *`) is still the **primary** schedule. It can stall for hours, which leaves overnight B&M / Gateway **Update Pending** unalerted until someone runs the workflow by hand.

This Worker is the **backup kick**: at **:17 and :47 UTC** (offset from the Actions minutes) it POSTs GitHub `workflow_dispatch` for `.github/workflows/check-data-freshness.yml` on `EliseoCab/brownsville-wait-times` (`ref: main`). The lag workflow’s email path is unchanged — this only starts a run. If a lag-alarm job is already queued or in progress, the Worker skips the POST so it does not cancel that run (`cancel-in-progress: true`).

### Secret (required for the backup kick)

Do **not** commit a token. Store a **fine-grained personal access token** as a Wrangler secret:

1. GitHub → **Settings → Developer settings → Fine-grained tokens → Generate new token**
2. Resource owner: **EliseoCab**
3. Repository access: **Only select repositories** → `brownsville-wait-times` only
4. Permissions:
   - **Actions: Read and write** (list recent runs + create a `workflow_dispatch`)
   - **Contents: Read** (resolve the workflow file on `main`)
5. Store it on the Worker (never in git / Pages JS):

```bash
cd worker
npx wrangler secret put GITHUB_DISPATCH_TOKEN
# paste the fine-grained PAT when prompted (no quotes)
npx wrangler secret list   # should show GITHUB_DISPATCH_TOKEN and X_BEARER_TOKEN
npx wrangler deploy        # pick up the :17 / :47 cron triggers if not deployed yet
```

`/health` reports `hasGithubDispatchToken` (boolean only) and `lagAlarmKickCrons`. If the secret is missing, cache warming still runs; the kick is skipped.

Redeploy after this code lands so Cloudflare installs the extra cron triggers (propagation can take several minutes). Then confirm in the Worker dashboard: **Settings → Triggers** shows `*/5 * * * *`, `17 * * * *`, and `47 * * * *`. Past cron events / `wrangler tail` should log `lag-kick dispatched check-data-freshness.yml` around :17 or :47 UTC (or `lag-kick skipped: already-running` if Actions already has a job).
