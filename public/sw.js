// Service Worker — Wyceny PRO PWA
const CACHE_NAME = "wyceny-pro-v2";
const STATIC_ASSETS = [
  "/",
  "/manifest.json",
  "/hydraulika",
  "/elektryka",
  "/wyceny",
  "/klienci",
  "/uslugi",
  "/ustawienia",
];

// Install — cache shell
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      await Promise.allSettled(
        STATIC_ASSETS.map(async (url) => {
          try {
            const response = await fetch(url);
            if (response.ok) {
              await cache.put(url, response);
            }
          } catch (err) {
            // Ignore single route fetch failure during SW install
          }
        })
      );
    })
  );
  self.skipWaiting();
});

// Activate — clean old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch — network first, fallback to cache
self.addEventListener("fetch", (event) => {
  // Skip non-GET and chrome-extension requests
  if (event.request.method !== "GET") return;
  if (event.request.url.startsWith("chrome-extension://")) return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Cache successful responses
        if (response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, clone);
          });
        }
        return response;
      })
      .catch(() => {
        // Offline — serve from cache
        return caches.match(event.request).then((cached) => {
          if (cached) return cached;
          // For navigation requests, fallback to cached root
          if (event.request.mode === "navigate") {
            return caches.match("/").then((rootCached) => {
              if (rootCached) return rootCached;
              return new Response(
                "<!DOCTYPE html><html><head><meta charset='utf-8'><title>Wyceny PRO Offline</title></head><body style='font-family:sans-serif;text-align:center;padding:40px;'><h2>Jesteś offline</h2><p>Połącz się z internetem, aby odświeżyć dane.</p></body></html>",
                { status: 200, headers: { "Content-Type": "text/html; charset=utf-8" } }
              );
            });
          }
          return new Response("Offline", { status: 503 });
        });
      })
  );
});
