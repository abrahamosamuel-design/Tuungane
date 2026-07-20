// Tuungane app service worker.
// Provides basic static-asset caching, safe update semantics, and an offline
// fallback page. Sensitive data (messages, API responses, user info) is never
// cached — only static shell assets and the offline page.

const VERSION = "tuungane-v1";
const STATIC_CACHE = `${VERSION}-static`;
const RUNTIME_CACHE = `${VERSION}-runtime`;
const OFFLINE_URL = "/offline.html";

const PRECACHE_URLS = [
  OFFLINE_URL,
  "/manifest.webmanifest",
  "/icon-192.png",
  "/icon-512.png",
  "/apple-touch-icon.png",
  "/favicon.ico",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(STATIC_CACHE);
      await Promise.allSettled(PRECACHE_URLS.map((u) => cache.add(u)));
      self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(
        names
          .filter((n) => n.startsWith("tuungane-") && !n.startsWith(VERSION))
          .map((n) => caches.delete(n)),
      );
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") self.skipWaiting();
});

// Never touch these paths in the cache — always go straight to network.
function isSensitive(url) {
  const p = url.pathname;
  return (
    p.startsWith("/api/") ||
    p.startsWith("/_serverFn/") ||
    p.includes("/rest/v1/") ||
    p.includes("/auth/v1/") ||
    p.includes("/realtime/") ||
    p.includes("/storage/v1/") ||
    p.includes("supabase.co")
  );
}

function isStaticAsset(url) {
  return /\.(?:js|css|woff2?|ttf|otf|png|jpg|jpeg|svg|webp|ico|gif)$/i.test(url.pathname);
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (isSensitive(url)) return;

  // Navigations: network-first, fall back to offline page.
  if (req.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          const fresh = await fetch(req);
          return fresh;
        } catch {
          const cache = await caches.open(STATIC_CACHE);
          const offline = await cache.match(OFFLINE_URL);
          return (
            offline ||
            new Response("You're offline.", {
              status: 503,
              headers: { "content-type": "text/plain" },
            })
          );
        }
      })(),
    );
    return;
  }

  // Static same-origin assets: cache-first with background refresh.
  if (isStaticAsset(url)) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(RUNTIME_CACHE);
        const cached = await cache.match(req);
        const network = fetch(req)
          .then((res) => {
            if (res && res.ok) cache.put(req, res.clone());
            return res;
          })
          .catch(() => null);
        return cached || (await network) || new Response("", { status: 504 });
      })(),
    );
  }
});
