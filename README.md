# Brownsville Port of Entry · Wait Times

A clean viewer for CBP border wait times at Brownsville, Texas bridges:

- B&M  
- Gateway  
- Los Indios  
- Veterans  

## Live site

**https://eliseocab.github.io/brownsville-wait-times/**

## How data stays fresh

Browsers cannot always call `bwt.cbp.gov` directly (CORS). This repo:

1. Stores a mirror of the CBP RSS feed in [`data/bwt.xml`](data/bwt.xml)
2. **Update CBP wait times** workflow fetches CBP and deploys Pages about every **5 minutes**
3. Serves the page from the same origin so the table loads reliably

Manual refresh anytime:

**Actions → Update CBP wait times → Run workflow**

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

This project is an independent public-data viewer and is **not** affiliated with CBP or DHS.
