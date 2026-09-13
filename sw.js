const CACHE = "bwt-shell-v28";
const PRECACHE = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/apple-touch-icon.png",
  "./amenities.css?v=11",
  "./amenities.js?v=8",
  "./gateway/index.html",
  "./bm/index.html",
  "./veterans/index.html",
  "./los-indios/index.html"
];

function isHomepagePath(url) {
  const base = new URL("./", self.location.href);
  const home = base.pathname;
  const homeIndex = new URL("index.html", base).pathname;
  return url.pathname === home || url.pathname === homeIndex;
}

function cacheLookup(request, url) {
  return caches.match(request).then((hit) => {
    if (hit) return hit;
    if (url.pathname.endsWith("/")) {
      return caches.match(new URL("index.html", url).href);
    }
    return undefined;
  });
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(PRECACHE)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;
  if (
    url.pathname.endsWith("/data/bwt.xml") ||
    url.pathname.endsWith("/data/bwt-all.xml") ||
    url.searchParams.has("t")
  ) {
    event.respondWith(fetch(event.request).catch(() => caches.match(event.request)));
    return;
  }
  event.respondWith(
    fetch(event.request)
      .then((res) => {
        if (res && res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((cache) => cache.put(event.request, copy));
        }
        return res;
      })
      .catch(() =>
        cacheLookup(event.request, url).then((hit) => {
          if (hit) return hit;
          // HTML shell only for the homepage. CSS/JS/images/other pages cache-or-fail.
          if (isHomepagePath(url)) return caches.match("./index.html");
          return Response.error();
        })
      )
  );
});
