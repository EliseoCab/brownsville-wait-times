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

- Runs at :10 past the hour (and :25, :40, :55) (`10,25,40,55`) so pending at the 10-min mark triggers alert. GitHub can skip that schedule for hours; the Cloudflare Worker also `workflow_dispatch`es this workflow at **:17 and :47 UTC** when `GITHUB_DISPATCH_TOKEN` is set (see [worker/README.md](worker/README.md)). Actions cron stays primary; the Worker is only a backup kick.
- Compares **live CBP** vs **GitHub Pages** `data/bwt.xml` **per Brownsville bridge** (B&M, Gateway, Veterans, Los Indios)
- Uses each item’s CBP `Hours:` line in **America/Chicago**; Veterans / Los Indios are skipped when closed, plus a **45-minute post-close grace** so a frozen last-open stamp does not alert
- **Update Pending** on Veterans / Los Indios is **stale** **10 minutes after official open**. 24h bridges (B&M, Gateway) wait **10 minutes into the current hour** when the last post was last hour (example: 11:00 am wait, 12:10 still Update Pending or still showing 11:00). Overnight or carry-over Pending with no usable stamp is stale immediately
- Also flags CBP itself if an open bridge has no new hourly post **10 minutes after the hour**, or a stamp older than **75 minutes** (limited-hours bridges start those checks 10 minutes after open)
- Also logs the **Cloudflare Worker** per-bridge times (informational; not pass/fail)
- If any in-hours bridge is **~75+ minutes** behind (or pending/stuck):
  1. Automatically runs **Update CBP wait times**
  2. Waits for deploy and re-checks
  3. **Emails only if still lagging** after that
  4. If auto-refresh fixed it → job **succeeds** (no email)

Alert mail tells employees what to do in plain language (update wait times, or contact the duty supervisor for SENTRI). Disregard if already handled.

Set repo secret **GMAIL** (Gmail app password) so Actions can send from `eliseocab@gmail.com`. 

### Email visibility setup (recommended)

To control what recipients see:

- **ALERT_TO** — Emails that will be visible in the **To:** field (recipients can see these).
- **ALERT_BCC** — Emails that receive the alert but are **hidden** (they won't appear in the To field).

**Recommended configuration for this repo:**

- `ALERT_TO`: `eliseo.cabrera@cbp.dhs.gov`
- `ALERT_BCC`: `eliseocab@gmail.com`

This way:
- Recipients only see the official CBP address in the To field.
- Your personal Gmail receives the alert but does not show up.

Optional: **ALERT_SMTP_USER**, **ALERT_FROM**.

Turn off GitHub Actions failure emails if you only want this custom mail. Alert mail **expires 90 days** after the secret date in `scripts/send_alert_email.py` (currently 2026-09-11 → 2026-12-10); rotate **GMAIL** and bump `SECRET_SET_ON` to extend.

### Manual SMTP test

**Actions → Test alert email → Run workflow**

Sends a one-off mail (does not wait for lag). Use this after rotating **GMAIL** / **ALERT_SMTP_PASSWORD**. The job fails if SMTP skips, the secret is expired, or login/send fails.

> The open page uses the Worker first (`Live · CBP proxy`). A lag email is about the **GitHub backup mirror**, not necessarily a broken page.  

### Manual lag check

**Actions → Check data freshness (lag alarm) → Run workflow**

## Veterans SENTRI staffing alarm

Workflow: **Veterans SENTRI lane staffing** (`.github/workflows/check-veterans-sentri.yml`)

- Runs **15 minutes after the hour and half hour** (`15,45 * * * *`) plus manual dispatch
- Reads the **same live CBP Brownsville RSS** as the lag alarm (`Brownsville - Veterans International`)
- Looks at **Passenger Vehicles → Sentri Lanes** only (not commercial Fast Lanes)
- **Emails** when Veterans is in hours and SENTRI **delay ≥ 30 min** and **open lanes < 4**: contact the duty supervisor unless the reason is already known
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
