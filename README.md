# Brownsville Port of Entry · Wait Times

A clean viewer for CBP border wait times at Brownsville, Texas bridges:

- B&M Bridge  
- Gateway Bridge  
- Los Indios (Free Trade Bridge)  
- Veterans International  

## Live site (GitHub Pages)

After you enable Pages, the site is available at:

`https://<your-username>.github.io/brownsville-wait-times/`

## How data stays fresh

Browsers cannot always call `bwt.cbp.gov` directly (CORS). This repo:

1. Stores a mirror of the CBP RSS feed in [`data/bwt.xml`](data/bwt.xml)
2. Updates that file with GitHub Actions at **:05 past every hour** (UTC)
3. Serves the page from the same origin so the table loads reliably

You can also trigger **Actions → Update CBP wait times → Run workflow** anytime.

## Local use

Open `index.html` in a browser, or serve the folder:

```bash
cd brownsville-wait-times
python3 -m http.server 8080
# http://localhost:8080
```

## Source

Official data: [bwt.cbp.gov](https://bwt.cbp.gov)

This project is an independent public-data viewer and is **not** affiliated with CBP or DHS.
