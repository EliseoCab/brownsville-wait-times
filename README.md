# Brownsville Port of Entry · Wait Times

A clean viewer for CBP border wait times at Brownsville, Texas bridges:

- B&M  
- Gateway  
- Los Indios  
- Veterans  

## Live site

**https://eliseocab.github.io/brownsville-wait-times/**

## How data stays fresh (hybrid)

Browsers cannot call `bwt.cbp.gov` directly (**CORS**). This project uses two layers:

| Priority | Source | Role |
|----------|--------|------|
| **1** | **Cloudflare Worker** ([`worker/`](worker/)) | Live CBP XML with CORS + ~2 min edge cache + 5‑min cron warm |
| **2** | Public CORS proxies | Temporary fallback |
| **3** | **GitHub Actions** → [`data/bwt.xml`](data/bwt.xml) | Same-origin mirror on Pages (backup / first paint) |

```text
Browser  →  Cloudflare Worker  →  bwt.cbp.gov RSS
   │
   └────→  GitHub Pages data/bwt.xml  (Actions backup)
```

### One-time: deploy the Worker (recommended)

Full steps: **[worker/README.md](worker/README.md)**

```bash
cd worker
npm install
npx wrangler login
npx wrangler deploy
```

Then set the printed `*.workers.dev` URL in `index.html`:

```js
const FEED_PROXY_URL = "https://brownsville-bwt.YOUR_SUBDOMAIN.workers.dev";
```

Commit & push. After deploy, **Refresh times** should show **Live · CBP proxy**.

### GitHub Actions backup

Workflow **Update CBP wait times**:

- Fetches the same CBP RSS and deploys Pages on a schedule (~every 15 min, dual crons)
- Manual: **Actions → Update CBP wait times → Run workflow**

This keeps `data/bwt.xml` usable if the Worker is down or not configured yet.

## Lag check (email alarm)

Workflow: **Check data freshness (lag alarm)**

- Runs about every **15 minutes**
- Compares **live CBP** vs **your site’s** `data/bwt.xml`
- **Fails** if the site is more than **~75 minutes** behind CBP
- On failure, it also tries to start **Update CBP wait times**

### Turn on GitHub email when it fails

1. Open https://github.com/settings/notifications  
2. Find **Actions** (or **GitHub Actions**)  
3. Enable notifications for **failed** workflows  
4. Use an email you actually check  

You’ll get an email when the lag check fails (red X in **Actions**).

### Manual lag check

**Actions → Check data freshness (lag alarm) → Run workflow**

## Local use

```bash
cd brownsville-wait-times
python3 -m http.server 8080
# http://localhost:8080
```

## Source

Official data: [bwt.cbp.gov](https://bwt.cbp.gov)

Raw RSS (Brownsville ports):  
https://bwt.cbp.gov/api/bwtRss/HTML/44,43/42,45,44,43/42,45,43

This project is an independent public-data viewer and is **not** affiliated with CBP or DHS.
