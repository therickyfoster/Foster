// Basic PWA cache with stale-while-revalidate for CDN scripts
const CACHE = "foster-impact-v1";
const PRECACHE = [
  "./",
  "./index.html",
  "./app.js",
  "./manifest.json",
  "./data/events.json"
];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(PRECACHE)).then(self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (url.origin === location.origin) {
    // Local assets: cache-first
    event.respondWith(
      caches.match(event.request).then((cached) => cached || fetch(event.request).then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(event.request, copy));
        return res;
      }))
    );
  } else {
    // Cross-origin (CDN libs): stale-while-revalidate
    event.respondWith((async () => {
      const cache = await caches.open(CACHE);
      const cached = await cache.match(event.request);
      const networkPromise = fetch(event.request).then((res) => {
        cache.put(event.request, res.clone());
        return res;
      }).catch(()=> cached);
      return cached || networkPromise;
    })());
  }
});
