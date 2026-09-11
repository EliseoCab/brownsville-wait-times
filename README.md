# Brownsville Port of Entry · Wait Times

A clean viewer for CBP border wait times at Brownsville, Texas bridges:

- B&M — Brownsville & Matamoros Bridge (México: Puente Viejo)
- Gateway — International Gateway Bridge (México: Puente Nuevo)
- Los Indios — Free Trade Bridge (México: Puente Los Indios / Lucio Blanco)
- Veterans — Veterans Bridge at Los Tomates (México: Puente Los Tomates)

## Live site

**https://eliseocab.github.io/brownsville-wait-times/**

[All U.S. land ports](https://eliseocab.github.io/brownsville-wait-times/all-ports/) — live CBP times for every land crossing, nearest first, with Mexico / Northern filters.

Nearby amenities (static community guides, not CBP) for B&M, Gateway, Veterans International, and Los Indios:

- [B&amp;M](https://eliseocab.github.io/brownsville-wait-times/bm/)
- [Gateway](https://eliseocab.github.io/brownsville-wait-times/gateway/)
- [Los Indios](https://eliseocab.github.io/brownsville-wait-times/los-indios/)
- [Veterans](https://eliseocab.github.io/brownsville-wait-times/veterans/)

## How data stays fresh (hybrid)

Browsers cannot call `bwt.cbp.gov` directly (**CORS**). This project uses two layers:

| Priority | Source | Role |
|----------|--------|------|
| **1** | **Cloudflare Worker** ([`worker/`](worker/)) | Live CBP XML with CORS + ~2 min cache; last-good feed if CBP blips |
| **2** | **GitHub Actions** → [`data/bwt.xml`](data/bwt.xml) + [`data/bwt-all.xml`](data/bwt-all.xml) | Same-origin mirrors on Pages (fast backup) |
| **3** | Public CORS proxies | Last resort only (Brownsville homepage) |

```text
Browser  →  Cloudflare Worker  →  bwt.cbp.gov RSS  (homepage)
         →  Cloudflare Worker /all → bwt.cbp.gov/xml/bwt.xml  (all-ports)
   │
   └────→  GitHub Pages data/bwt.xml + data/bwt-all.xml  (Actions backup)
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

- Fetches Brownsville RSS and the national all-ports XML about every **10 minutes**
- Commits and redeploys Pages **only when wait times actually change**
- Manual: **Actions → Update CBP wait times → Run workflow**
- GitHub sometimes **skips or delays** schedules; the lag check self-heals when that happens

This keeps `data/bwt.xml` (homepage) and `data/bwt-all.xml` (all-ports) usable if the Worker is down or not configured yet. The lag alarm compares the Brownsville RSS mirror only.

## Lag check (email alarm)

Workflow: **Check data freshness (lag alarm)**

- Runs about every **15 minutes**
- Compares **live CBP** vs **GitHub Pages** `data/bwt.xml` **per Brownsville bridge** (B&M, Gateway, Veterans, Los Indios)
- Uses each item’s CBP `Hours:` line in **America/Chicago**; Veterans / Los Indios are skipped when closed, plus a **45-minute post-close grace** so a frozen last-open stamp does not alert
- **Update Pending** on Veterans / Los Indios is **stale** **15 minutes after official open**. 24h bridges (B&M, Gateway) wait **15 minutes into the current hour** so overnight Pending does not fail all night
- Also flags CBP itself if an open bridge is missing a stamp or stuck beyond 75 minutes (limited-hours bridges start those checks 15 minutes after open)
- Also logs the **Cloudflare Worker** per-bridge times (informational; not pass/fail)
- If any in-hours bridge is **~75+ minutes** behind (or pending/stuck):
  1. Automatically runs **Update CBP wait times**
  2. Waits for deploy and re-checks
  3. **Emails only if still lagging** after that
  4. If auto-refresh fixed it → job **succeeds** (no email)

Alert mail is one line, bottom line first, e.g. `B&M, Gateway: Update Pending.`

Set repo secret **GMAIL** (Gmail app password) so Actions can send from `eliseocab@gmail.com`. Optional: **ALERT_SMTP_USER**, **ALERT_TO**, **ALERT_FROM**. Turn off GitHub Actions failure emails if you only want this custom mail.

> The open page uses the Worker first (`Live · CBP proxy`). A lag email is about the **GitHub backup mirror**, not necessarily a broken page.  

### Manual lag check

**Actions → Check data freshness (lag alarm) → Run workflow**

## Veterans SENTRI staffing alarm

Workflow: **Veterans SENTRI lane staffing** (`.github/workflows/check-veterans-sentri.yml`)

- Runs at **:15, :20, and :45** past every hour (`15,20,45 * * * *`) plus manual dispatch — extra slots so a skipped GitHub cron is less likely to miss the hour
- Reads the **same live CBP Brownsville RSS** as the lag alarm (`Brownsville - Veterans International`)
- Looks at **Passenger Vehicles → Sentri Lanes** only (not commercial Fast Lanes)
- **Emails** when Veterans is in hours and SENTRI **delay ≥ 30 min** and **open lanes < 4**, e.g. `Veterans SENTRI: 30 min, 2 lanes open. Need <30 min or >=4 lanes.`
- Uses the item’s `Hours:` line (typically `6 am-Midnight` America/Chicago). Outside hours: no alert
- **Update Pending** with no delay number: log WARN, do not invent lane counts, do not fail. If delay ≥ 30 and lanes < 4 are still parseable, fail.

**Actions → Veterans SENTRI lane staffing → Run workflow**

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

National land-border XML (all-ports):  
https://bwt.cbp.gov/xml/bwt.xml

This project is an independent public-data viewer and is **not** affiliated with CBP or DHS.
