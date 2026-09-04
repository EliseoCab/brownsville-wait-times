# Brownsville Port of Entry · Wait Times

A clean viewer for CBP border wait times at Brownsville, Texas bridges:

- B&M  
- Gateway  
- Los Indios  
- Veterans  

## Live site

**https://eliseocab.github.io/brownsville-wait-times/**

Nearby amenities (static community guides, not CBP):

- [Gateway](https://eliseocab.github.io/brownsville-wait-times/gateway/)
- [B&amp;M](https://eliseocab.github.io/brownsville-wait-times/bm/)
- [Veterans](https://eliseocab.github.io/brownsville-wait-times/veterans/)
- [Los Indios](https://eliseocab.github.io/brownsville-wait-times/los-indios/)

## How data stays fresh (hybrid)

Browsers cannot call `bwt.cbp.gov` directly (**CORS**). This project uses two layers:

| Priority | Source | Role |
|----------|--------|------|
| **1** | **Cloudflare Worker** ([`worker/`](worker/)) | Live CBP XML with CORS + ~2 min cache; last-good feed if CBP blips |
| **2** | **GitHub Actions** → [`data/bwt.xml`](data/bwt.xml) | Same-origin mirror on Pages (fast backup) |
| **3** | Public CORS proxies | Last resort only |

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

- Fetches the same CBP RSS about every **10 minutes**
- Commits and redeploys Pages **only when wait times actually change**
- Manual: **Actions → Update CBP wait times → Run workflow**
- GitHub sometimes **skips or delays** schedules; the lag check self-heals when that happens

This keeps `data/bwt.xml` usable if the Worker is down or not configured yet.

## Lag check (email alarm)

Workflow: **Check data freshness (lag alarm)**

- Runs about every **15 minutes**
- Compares **live CBP** vs **GitHub Pages** `data/bwt.xml` (the Actions mirror)
- Also logs the **Cloudflare Worker** report time (page primary path)
- If the mirror is **~75+ minutes** behind:
  1. Automatically runs **Update CBP wait times**
  2. Waits for deploy and re-checks
  3. **Emails only if still lagging** after that (job fails)
  4. If auto-refresh fixed it → job **succeeds** (notice only, no failure email)

> The open page uses the Worker first (`Live · CBP proxy`). A lag email is about the **GitHub backup mirror**, not necessarily a broken page.

### Turn on GitHub email when it fails

1. Open https://github.com/settings/notifications  
2. Find **Actions** (or **GitHub Actions**)  
3. Enable notifications for **failed** workflows  
4. Use an email you actually check  

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
