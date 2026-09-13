# Brownsville Wait Times — Modern Web Guidance assessment

**Scope:** GitHub Pages front end only (homepage wait tiles, amenities pages, service worker / PWA, mobile, EN/ES, a11y, client performance, client security).  
**Out of scope:** Cloudflare Worker feed, GitHub Actions alarms, CBP XML parsing — except where a front-end issue clearly depends on them.  
**Method:** Chrome team [Modern Web Guidance](https://github.com/GoogleChrome/modern-web-guidance) workflow (`search` then `retrieve`). Guides used: `accessibility`, `html`, `performance`, `css`, `css-layout`, `dark-mode`, `optimize-image-priority`, `optimize-preload-priority`, `defer-rendering-heavy-content`, `visually-stable-font-fallbacks`, `light-dismiss-a-dialog`, `declarative-dialog-popover-control`, `size-aware-styling`.  
**Chrome Extensions skill:** Skimmed only to confirm the site does **not** use extension APIs.  
**Skill freshness:** The installed `modern-web-guidance` skill pin is `2026_05_16-c5e7870`. The CLI reports a newer skill (`2026_09_04-7de96777`). Update the plugin skill before the next implementation pass.

Live site: https://eliseocab.github.io/brownsville-wait-times/

This document is a prioritized recommendation list, not a rewrite plan. Each item is a small, concrete change that helps people checking Brownsville–Matamoros waits on a phone (often on the approach, on cellular, in bright sun or at night, in English or Spanish).

---

## What is already in good shape

Do not throw this out in a modernization pass.

- **Mobile chrome:** `viewport-fit=cover`, `100dvh`, `env(safe-area-inset-*)`, `viewport` does not lock zoom.
- **Theme:** Blocking inline script sets `data-theme` from `localStorage` or `prefers-color-scheme` before first paint. `color-scheme` flips with the theme. `theme-color` updates in JS.
- **Motion:** `@media (prefers-reduced-motion: reduce)` disables pulse, toast, and lightbox transitions.
- **i18n:** Homepage `STR.en` / `STR.es` plus `?lang=` / `localStorage`. Amenities use `lang-en` / `lang-es` CSS plus `data-i18n-*`.
- **Security hygiene:** CSP, `X-Content-Type-Options: nosniff`, `referrer=no-referrer`, `escapeHtml()` on rendered waits, `rel="noopener"` on outbound links.
- **PWA basics:** Manifest, install button + `beforeinstallprompt`, SW `skipWaiting` + `clients.claim`, live XML bypassed via pathname / `?t=`.
- **Share:** `navigator.share` with iOS Mail subject workaround; clipboard / mailto fallback.
- **Amenities images:** `width` / `height`, `loading="lazy"`, `decoding="async"` on most POI photos.
- **Landmarks:** Homepage has `<header>`, `<main>`, `<footer>`. Amenities have `<main>` and a bridge `<nav>`.
- **Visibility-aware refresh:** Auto-refresh skips hidden tabs (`document.visibilityState`).

The rest of this file is about gaps against Modern Web Guidance — not a claim that the current UI is unusable.

---

## 1. Critical / fix soon

Broken or misleading UX, accessibility blockers, or major mobile-performance / cache hazards for people at the plaza.

### 1.1 Service worker treats every failed same-origin GET as the homepage

**What’s wrong:** `sw.js` is network-first (good for wait freshness), then cache, then `caches.match("./index.html")` for **any** failed same-origin GET. Precache is only the homepage shell + icons — not `amenities.css`, `amenities.js`, gateway/bm/veterans/los-indios HTML, or `all-ports/`.

```25:47:sw.js
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;
  // … live XML bypass …
  event.respondWith(
    fetch(event.request)
      .then((res) => { /* cache-on-success */ return res; })
      .catch(() => caches.match(event.request).then((hit) => hit || caches.match("./index.html")))
  );
});
```

**Why it matters for BWT:** Border cellular drops mid-navigation. A failed `amenities.css` or `gateway/index.html` can be answered with homepage HTML. The browser then tries to parse a 270KB wait-times document as CSS/JS, or the user sees the homepage when they tapped “Gateway amenities.” That is worse than a clean offline message.

**Suggested approach (small):**

1. Navigation requests (`Accept: text/html` or `mode === "navigate"`): fallback to a tiny `offline.html` (“Wait times unavailable — pull to refresh”) **or** cached `index.html` only for `/` and `/index.html`.
2. Asset requests (`.css`, `.js`, images): cache-or-fail. Never return HTML.
3. Add amenities CSS/JS + the four amenity `index.html` files to precache (or a second cache) the next time you bump `bwt-shell-v*`.
4. Keep the live XML bypass as-is.

Guidance: `performance` (don’t serve the wrong resource); `html` (correct document for the URL).

### 1.2 Amenities pages load Google Analytics that CSP immediately blocks

**What’s wrong:** `gateway/`, `bm/`, `veterans/`, and `los-indios/` copy the homepage gtag snippet, but their CSP is `script-src 'self' 'unsafe-inline'` and `connect-src 'self'`. `https://www.googletagmanager.com/gtag/js` is refused. Even if the script were allowed, beacons would fail `connect-src`.

**Why it matters for BWT:** Every amenities visit on a phone opens a failed third-party request (and a console error) before the gas/food list paints. Users in the queue do not need a tracker that cannot run.

**Suggested approach:** Remove the gtag block from amenities pages **or** align CSP + load GA only after first paint / idle (`requestIdleCallback` / `type="module" defer`) if you truly need amenity analytics. Prefer removing it. Homepage GA can stay, but demote it (see 2.3).

Guidance: `performance` (`fetchpriority="low"` / don’t compete with LCP); `html` resource prioritization.

### 1.3 Filter “tabs” are not tabs; Leave Now is not a control

**What’s wrong (homepage):**

- `.filters` has `role="tablist"` but the buttons have no `role="tab"`, `aria-selected`, `tabindex` roving, or arrow-key behavior. Modern Web Guidance: *match ARIA to actual behavior*. A styled button group is a `role="group"` (amenities chips already do this with `aria-pressed`).
- `#leaveCard` is a `<div>` that becomes clickable (`.is-action`) to request geolocation. No `button`, no `tabindex`, no keyboard handler, no accessible name that says “Allow location.”
- `#installHelp` is `role="dialog"` without `aria-modal`, focus trap, or restore-focus. Photo lightbox in `amenities.js` is a custom overlay with the same gap.
- No skip link. Keyboard users hit language, theme, nearby chips, cameras, then the wait table.
- `#portGrid` and `#dfoTimeline` are `aria-live="polite"`. Every filter change and X-carousel render re-announces a large subtree. Guidance: one polite + one assertive announcer; don’t live-region “Loading…” or full tables.

**Why it matters for BWT:** VoiceOver / TalkBack users in the car or on the sidewalk need the wait table and “Leave Now” without fighting fake tabs or a silent location card. A full-table live region after every refresh is speech spam while the 5-minute auto-refresh runs.

**Suggested approach:**

1. Drop `role="tablist"`; keep buttons + `aria-pressed` (copy amenities chips). Or implement the full tab pattern.
2. When Leave Now needs a tap, render a real `<button type="button">` inside the card (or make the card a button).
3. Replace install help + photo lightbox with `<dialog closedby="any">` + `.showModal()` (Baseline widely available). Native focus trap, Esc, backdrop, light-dismiss. See `light-dismiss-a-dialog` and `html` § Native Overlays.
4. Add a visually-hidden skip link to `#ports` or `<main>`.
5. Remove `aria-live` from `#portGrid` / `#dfoTimeline`. Keep `#refreshToast` and `#alertBox` (`role="status"`). Optionally add one hidden polite announcer: “Times updated · Gateway 12 min.”

Guidance: `accessibility` §§ 2, 5, 8; `html` §§ 1, 4, 6.

### 1.4 Homepage is a 270KB+ single document; Leaflet and fonts compete with wait times

**What’s wrong:** `index.html` is ~272 KB / ~7,300 lines: ~3,200 lines of CSS, ~3,700 lines of JS, an embedded `FALLBACK_RSS` snapshot, plus:

- Render-blocking Google Fonts (`DM Sans` many weights + `Instrument Serif`) in `<head>`.
- `vendor/leaflet/leaflet.css` (15 KB) in `<head>` even though the map exists only inside Crowd source (Drive/Walking).
- `vendor/leaflet/leaflet.js` (148 KB) loaded at the bottom of every homepage visit **and** again via `crowdEnsureLeaflet()`.
- gtag.js is the first script in `<head>` (async, but still a high-priority third party).

LCP on this page is almost certainly the hero title / first wait tiles — text — so fonts + HTML parse + CSS are the bottleneck, not a hero image. Guidance: don’t let trackers and unused CSS/JS delay first paint.

**Why it matters for BWT:** Someone opening the bookmark on LTE while approaching Veterans needs the four wait numbers in the first second. Parsing 270 KB of HTML + 148 KB of Leaflet they never open is the opposite of that.

**Suggested approach (no architecture rewrite):**

1. Move CSS to `bwt.css` and JS to `bwt.js` (cacheable, parallel). Keep a tiny inline FOUC/theme script.
2. Load Leaflet CSS/JS only when `#crowdSource` opens (`crowdEnsureLeaflet` already exists — delete the eager `<script src="vendor/leaflet/leaflet.js">` and the head CSS).
3. Cut font request: system-ui stack is already in `--font`. Either drop Google Fonts on mobile (`@media (max-width: …)` / `media` on the stylesheet) or subset to 2–3 weights and add `size-adjust` / `ascent-override` fallbacks (`visually-stable-font-fallbacks`) to kill CLS.
4. Give gtag `fetchpriority="low"` or inject it after first wait render.

Guidance: `performance` (LCP, fetch priority); `html` § Resource Prioritization; `optimize-preload-priority`; `visually-stable-font-fallbacks`.

### 1.5 Incomplete focus styles (homepage map pin + entire amenities sheet)

**What’s wrong:**

- `.bridge-map:focus-visible { outline: none; }` uses only a background change. CSS guide: *do not remove default focus rings without a visible `outline` alternative*; prefer `outline` + `outline-offset` (forced-colors / high contrast).
- `amenities.css` has **no** `:focus-visible` rules. Language, theme, chips, maps links, and lightbox close rely on the UA default — often invisible on the glass / navy chips.
- Nearby chips on the homepage *do* have a 2px outline. Copy that token site-wide.

**Why it matters for BWT:** External keyboard / Voice Control / switch users on iPhone need to see which bridge map link or amenity chip is active. Glassmorphism makes a missing ring worse.

**Suggested approach:** One global rule, both stylesheets:

```css
:where(a, button):focus-visible {
  outline: 3px solid var(--sky);
  outline-offset: 3px;
}
```

Remove `outline: none` from `.bridge-map`. Add the same to `.photo-lightbox-close` and `.chip`.

Guidance: `css` Focus management; `accessibility` § 5.

---

## 2. High value

Modern API upgrades, mobile / SEO / perf wins that are not blockers today.

### 2.1 Native `<dialog>` for lightbox and install help

Covered as a11y in 1.3; this is the implementation shape.

`amenities.js` already handles Esc, backdrop click, and `overflow: hidden`. Replacing the custom `div.photo-lightbox` with:

```html
<dialog class="photo-lightbox" closedby="any" aria-label="…">
  <form method="dialog"><button value="close" aria-label="Close">×</button></form>
  <img alt="" />
</dialog>
```

…and `lightbox.showModal()` / `lightbox.close()` removes the reflow hack, the 200ms `hidden` timeout, and the missing focus return. Same swap for `#installHelp`.

`closedby` is newer than `<dialog>` itself; if you need older iOS, keep the existing backdrop click + Esc as the documented fallback (`light-dismiss-a-dialog`).

### 2.2 Don’t lazy-load the amenities LCP image; add `srcset`

**What’s wrong:** Gateway (and siblings) mark the Starbase hero `loading="lazy"`. HTML + performance guides: *never lazy-load the LCP candidate*. Food thumbs (Whataburger 189 KB JPEG, Jolie 193 KB) have no `srcset` / WebP.

**Why it matters:** Amenities are opened from the homepage chips on a phone. The first paint should be the title + first card, not a late Starbase decode.

**Suggested approach:** Remove `loading="lazy"` from `.poi-hero img` (or the first in-viewport image). Add `fetchpriority="high"` on that one image only. Keep lazy on the rest. Optionally add a 640w WebP in `srcset`. Do not convert the lightbox full-res until someone taps.

Guidance: `optimize-image-priority`; `html` § 3; `performance` LCP.

### 2.3 Demote third parties on the homepage (GA, live cams, X carousel)

**What’s wrong:**

- gtag is first in `<head>`.
- `setupLiveCams()` runs on every load: probes `g3.ipcamlive.com` snapshots, may inject iframes. Camera `<img class="live-cam-shot" alt="">` is empty even when a still is shown.
- `loadDfoTimeline()` fetches X posts and images from `pbs.twimg.com` on every visit.
- Commercial filter already hides cameras (`html[data-view="commercial"] .live-cams`) — good. Drive view also hides nearby. Extend that thinking to *load* time, not just display.

**Why it matters:** Wait tiles are the product. Cameras and @DFOLaredo are extras. On a weak cell they steal bandwidth from `brownsville-bwt.borderwait.workers.dev`.

**Suggested approach:**

1. `fetchpriority="low"` on gtag; or load after `loadData()` resolves.
2. Defer camera probes until `#liveCams` is near the viewport (`IntersectionObserver`) or the user taps “Show cameras.”
3. Give camera stills real alt: “Still of B&M plaza” / Spanish equivalent.
4. Load the X carousel the same way (idle or in-view). Keep the `@DFOLaredo` link in HTML so the section is useful without JS.
5. `content-visibility: auto` + `contain-intrinsic-size` on `#liveCams`, `.x-updates`, and amenity cards below the first row (`defer-rendering-heavy-content`). Homepage is large enough that this is worth it; amenities grids of ~8 cards are optional.

Guidance: `performance`; `optimize-preload-priority`; `defer-rendering-heavy-content`; `accessibility` § 6 (alt).

### 2.4 i18n and SEO gaps for EN/ES

**What’s wrong:**

- Language buttons have no `aria-pressed` (homepage toggles `.active` only).
- No `<link rel="canonical">`, no `hreflang="en"` / `hreflang="es"` (you already support `?lang=es`).
- No `og:image` / `twitter:card` — shares from the Share button are text-only, which is fine; link previews in WhatsApp/iMessage are unbranded.
- Manifest `"lang": "en"` only. Spanish install users get an English name/description.
- Amenities `<title>` is bilingual via JS; JSON-LD stays English.
- Two i18n systems (homepage `STR` vs amenities `data-i18n-en/es` + CSS classes) will drift (already different theme `aria-label` quality).

**Why it matters:** A large share of BWT users think in Spanish first (Puente Nuevo / Viejo / Los Tomates). Search and the installed PWA should not look English-only.

**Suggested approach:** Add `aria-pressed` on EN/ES. Add canonical + `hreflang` pairs (`/` and `/?lang=es`). One 1200×630 share PNG as `og:image`. Duplicate short_name in the manifest or use `lang_dir` later. When touching copy, prefer one helper used by both homepage and amenities.

Guidance: `accessibility` § 4 (document language, unique titles); `html` lang.

### 2.5 Theme: honor OS changes and use `light-dark()` for new tokens

**What’s wrong:** First visit follows `prefers-color-scheme`. After a manual toggle, OS changes are ignored (stored `bwt-theme`). Tokens are duplicated under `html[data-theme="dark"]` instead of `light-dark()`. `theme-color` is navy in both modes (`#0b1f3a` / `#07101c`) so iOS chrome barely changes. Amenities `toggleTheme` `aria-label` is English-only.

**Why it matters:** Night crossing vs midday glare is a real BWT split. Safari toolbar should match. Listening to `matchMedia('(prefers-color-scheme: dark)')` when the user has **not** overridden is the dark-mode guide’s default.

**Suggested approach:** Distinguish `theme=auto|light|dark`. Default `auto`. Use `color-scheme: light dark` on `:root` in auto. New colors via `light-dark()`. Add `<meta name="theme-color" media="(prefers-color-scheme: dark)">` for the no-JS case. Translate amenity theme labels.

Guidance: `dark-mode`.

### 2.6 Responsive wait tiles: container queries over viewport-only breakpoints

**What’s wrong:** Homepage and amenities switch layout at 860px / 560px viewport. The wait table already has a “cards vs tight table” split by filter. Guidance prefers **container** queries so a tile packed into a narrow column (or a wide phone in landscape) can reflow without another global breakpoint.

**Why it matters:** Landscape iPhone + “Add to Home Screen” standalone is a common BWT layout that is neither 560 nor 860.

**Suggested approach:** `container-type: inline-size` on `.table-wrap`, `.ports`, `.grid`. Move the 1-col / 2-col amenity grid and the mobile `.m-row` card switch to `@container` (`size-aware-styling`, `css-layout`). Keep one viewport query for the topbar.

### 2.7 Client security follow-ups (no Worker rewrite)

**What’s wrong:**

- Homepage CSP allows `'unsafe-inline'` for all script (required today because JS is inline). After extracting `bwt.js`, switch to hashes or a nonce.
- CSP `connect-src` still allows `https://proxy.cors.sh` and `https://api.allorigins.win`. `dataSources()` still tries those after Worker + GitHub mirrors. Public CORS proxies can see the user’s IP and the CBP URL, and they fail often (8s timeouts).
- Amenities CSP allows `frame-src` ipcamlive even though those pages have no cameras.

**Why it matters:** If the Worker is up (it is, per README), the public proxies are unused attack / privacy surface on every page that ships that CSP. Border users on captive Wi‑Fi should not send the CBP URL through a random proxy.

**Suggested approach:** After confirming Worker + `data/bwt.xml` cover real outages, delete the cors.sh / allorigins entries from both `dataSources()` and CSP. Tighten amenities `frame-src` to `'none'`. Move inline JS out and drop `'unsafe-inline'` (keep a tiny theme hash).

Do **not** rebuild the Worker for this.

### 2.8 Crowd form semantics and geolocation timing

**What’s wrong:** Crowd chips are unlabeled button groups (`<span class="crowd-label">` not associated). No `<fieldset>` / `role="radiogroup"`. `requestUserGeo(false)` runs on every homepage load — may prompt on first visit before the user understands “Leave Now.” `setInterval(updateCountdown, 1000)` runs while the tab is visible.

**Why it matters:** Location is sensitive at a port of entry. Prompting on load feels like tracking. A 1 Hz timer is minor battery drain next to camera probes, but easy to drop.

**Suggested approach:** Wrap chip rows in `<fieldset><legend>`. Request geo only from Leave Now / Check in. Drive the countdown from the existing refresh `setTimeout` plus one `setInterval` that is cleared on `visibilitychange` → hidden (you already pause fetch).

Guidance: `forms`; `accessibility` § 7; `html` buttons vs links.

### 2.9 PWA completeness

**What’s wrong:** Manifest `purpose: "maskable"` reuses the same 512 PNG as `any` (icons are ~4–6 KB; likely no safe zone). Amenities / all-ports do not link `manifest.webmanifest`. SW is registered only from the homepage. Spanish `lang` missing (2.4).

**Why it matters:** “Install” is aimed at daily commuters. Android maskable crop can clip the icon. Deep-linking into `/gateway/` as a standalone window without a manifest is a degraded install.

**Suggested approach:** Dedicated maskable icon with padding. `<link rel="manifest">` on amenity + all-ports pages (`start_url` can stay `./` at the site root). Register the SW from a 10-line shared snippet on every page, or from the manifest’s scope alone after first homepage visit (today’s behavior) — pick one and document it.

---

## 3. Nice to have

Polish. Do these after 1.x / 2.x, not instead of them.

### 3.1 View Transitions for filter and language

`document.startViewTransition(() => { setFilter(...); })` would morph wait tiles instead of an instant innerHTML swap. Same for EN↔ES. Feature-detect; no polyfill. Guidance: `same-document-transitions` (retrieve when implementing). Respect `prefers-reduced-motion` (already a hook).

### 3.2 `content-visibility` on long all-ports lists

Out of primary scope, but `all-ports/` is the one page where `content-visibility: auto` on rows is an obvious win (`defer-rendering-heavy-content`).

### 3.3 Interest-triggered tooltips for lane “as of” / hours

Replace `title` on map pins with `popover="hint"` + anchor positioning when you next touch that markup (`interest-triggered-tooltips`). `title` is an a11y anti-pattern in the accessibility guide.

### 3.4 `light-dark()` + `@layer` as you extract CSS

When CSS leaves `index.html`, wrap reset / tokens / components in `@layer` and express paired colors with `light-dark()` (`css`, `dark-mode`). Don’t restyle the glass look unless contrast fails (check muted text on glass: `--muted` `#64748b` on translucent white can be close to 4.5:1 — spot-check in DevTools).

### 3.5 `prefers-contrast: more`

Glass borders (`--glass-border`) are subtle by design. A contrast media query that solidifies chip/table borders would help outdoor glare. Accessibility guide: use only when the design is actually low-contrast.

### 3.6 Reduce `backdrop-filter` on low-end

`backdrop-filter: blur(20px) saturate(1.55)` on every card is GPU-heavy. `@media (update: slow)` or a `save-data` / `prefers-reduced-motion` fallback to opaque backgrounds would help older Androids in the line.

### 3.7 Table caption and heading outline

Wait table should get `<caption class="visually-hidden">` (“Brownsville crossing times, minutes to primary booth”). Nearby section uses `<h2>`; cameras `<h2>`; crossing times `<h2>` — good. Topbar is a `<div>`, not a landmark — fine if you add the skip link (1.3). Avoid extra `aria-label` on every `<section>` (guidance: don’t overuse region landmarks). You already have several labeled sections; when editing, prefer the visible `<h2>` as the name (`aria-labelledby`) instead of a duplicate `aria-label`.

### 3.8 Share / social meta

`og:image` (2.4). Optional `twitter:card=summary`. Sitemap already lists amenities + all-ports. Add `/?lang=es` only if you want Search Console language splits.

### 3.9 Built-in Translator API

Do **not** replace the curated EN/ES strings with the on-device Translator API. The `translator` guide is for user-generated text. Keep human Spanish for bridge names (Puente Viejo / Nuevo).

### 3.10 WebMCP / agentic forms

Not useful for this public wait viewer. Skip.

---

## Suggested first implementation slice

If a follow-up PR should stay small and user-visible:

1. Fix SW fallback + precache amenities assets (1.1).
2. Delete dead gtag on amenities (1.2).
3. Global `:focus-visible` + Leave Now `<button>` + drop fake `tablist` (1.3, 1.5).
4. Stop eager Leaflet; lazy-load cameras/X (1.4, 2.3).
5. `<dialog>` lightbox (2.1) as a contained amenities.js change.

Do not extract all of `index.html` in the same PR as the SW change.

---

## Inventory (front end)

| Surface | Files | Notes |
|---|---|---|
| Homepage | `index.html` (~272 KB, 7.3k lines) | Inline CSS/JS, gtag, Leaflet, CSP, i18n, crowd, cams, X |
| Amenities | `gateway/`, `bm/`, `veterans/`, `los-indios/` + `amenities.css` + `amenities.js` | Shared chips, lightbox, Apple Maps rewrite |
| PWA | `sw.js` (`bwt-shell-v27`), `manifest.webmanifest` | Homepage-only precache |
| All ports | `all-ports/` | Sibling viewer; same font/theme patterns; not fully audited |
| Vendor | `vendor/leaflet/*` | Crowd map only |

No Chrome extension surface.
